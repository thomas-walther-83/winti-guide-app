/**
 * E-Mail-Allowlist für Admin-Funktionen (Kuration öffentlicher Touren,
 * Featured-Listings). Spiegelt die Allowlist in der Postgres-Funktion
 * `public.is_admin()` – beim Hinzufügen neuer Admins **beide** Stellen
 * aktualisieren (Migration nachziehen).
 */
export const ADMIN_EMAILS: readonly string[] = ['twwinterthur@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
