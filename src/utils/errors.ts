/**
 * Extrahiert eine lesbare Fehlermeldung aus beliebigen Fehlerwerten.
 *
 * Wichtig: Supabase wirft `PostgrestError`-Objekte, die KEINE `Error`-Instanzen
 * sind (`err instanceof Error` ist also false). Ohne diese Behandlung würde die
 * eigentliche Ursache (z. B. "relation \"public.listings\" does not exist" oder
 * ein RLS-/Auth-Problem) verschluckt und nur ein generischer Text angezeigt.
 */
export function getErrorMessage(err: unknown, fallback = 'Ein Fehler ist aufgetreten'): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    // Supabase/PostgrestError: { message, details, hint, code }
    const parts = [obj.message, obj.details, obj.hint]
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (parts.length > 0) {
      const code = typeof obj.code === 'string' && obj.code ? ` (${obj.code})` : '';
      return parts.join(' – ') + code;
    }
  }

  if (typeof err === 'string' && err.length > 0) {
    return err;
  }

  return fallback;
}
