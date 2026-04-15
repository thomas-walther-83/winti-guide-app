// Supabase Edge Function: stripe-webhook
// Deploy with: supabase functions deploy stripe-webhook
//
// Required environment variables (set via supabase secrets):
//   STRIPE_WEBHOOK_SECRET  – your Stripe webhook signing secret
//   SUPABASE_URL           – your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY – service role key (bypasses RLS)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  // ── Verify Stripe webhook signature ───────────────────────────────────────
  let event: StripeEvent;
  try {
    event = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook Error: Invalid signature', { status: 400 });
  }

  console.log('Processing Stripe event:', event.type, event.id);

  try {
    switch (event.type) {
      // ── App user upgraded to Premium ───────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSession;
        if (session.metadata?.type !== 'app_premium') break;

        const userId = session.metadata?.user_id;
        if (!userId) {
          console.warn('checkout.session.completed: no user_id in metadata');
          break;
        }

        const expiresAt = session.metadata?.billing_cycle === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabase.rpc('activate_app_premium', {
          p_user_id: userId,
          p_stripe_sub: session.subscription ?? '',
          p_expires_at: expiresAt,
        });
        break;
      }

      // ── App Premium subscription renewed ──────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as StripeInvoice;

        // Handle app user renewal
        if (invoice.metadata?.type === 'app_premium') {
          const userId = invoice.metadata?.user_id;
          if (userId) {
            const expiresAt = new Date(
              (invoice.lines?.data?.[0]?.period?.end ?? 0) * 1000,
            ).toISOString();

            await supabase.rpc('activate_app_premium', {
              p_user_id: userId,
              p_stripe_sub: invoice.subscription ?? '',
              p_expires_at: expiresAt,
            });
          }
        }

        // Handle partner invoice payment
        const stripeInvoiceId = invoice.id;
        const partnerId = invoice.metadata?.partner_id;
        if (partnerId) {
          await supabase.rpc('record_partner_payment', {
            p_stripe_inv_id: stripeInvoiceId,
            p_partner_id: partnerId,
            p_amount_chf: (invoice.amount_paid ?? 0) / 100,
            p_paid_at: new Date().toISOString(),
          });
        }
        break;
      }

      // ── App Premium cancelled / expired ───────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSub;
        await supabase.rpc('deactivate_app_premium', { p_stripe_sub: sub.id });
        break;
      }

      // ── Partner subscription cancelled ────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as StripeSub;
        if (sub.status === 'canceled' || sub.status === 'unpaid') {
          const { error } = await supabase
            .from('partner_subscriptions')
            .update({ status: sub.status === 'canceled' ? 'cancelled' : 'overdue' })
            .eq('stripe_sub_id', sub.id);

          if (error) console.error('Error updating partner subscription:', error);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing webhook event:', err);
    return new Response('Internal server error', { status: 500 });
  }
});

// ── Stripe signature verification ─────────────────────────────────────────────
// Implements HMAC-SHA256 verification matching Stripe's algorithm.
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<StripeEvent> {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), v.trim()];
    }),
  );

  const timestamp = parts['t'];
  const signatures = header
    .split(',')
    .filter((p) => p.trim().startsWith('v1='))
    .map((p) => p.trim().slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Missing timestamp or signatures');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload),
  );
  const expected = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const valid = signatures.some((sig) => timingSafeEqual(sig, expected));
  if (!valid) throw new Error('Signature mismatch');

  // Reject events older than 5 minutes
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    throw new Error('Timestamp too old');
  }

  return JSON.parse(payload) as StripeEvent;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Minimal Stripe type stubs ─────────────────────────────────────────────────
interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}
interface StripeCheckoutSession {
  subscription?: string;
  metadata?: Record<string, string>;
}
interface StripeInvoice {
  id: string;
  subscription?: string;
  amount_paid?: number;
  metadata?: Record<string, string>;
  lines?: { data?: { period?: { end?: number } }[] };
}
interface StripeSub {
  id: string;
  status: string;
}
