/**
 * JSON-Serialisierung für die Einbettung in <script>-Blöcke von
 * WebView-/iframe-HTML.
 *
 * `JSON.stringify` allein ist dort NICHT sicher: enthält ein String
 * die Zeichenfolge "</" + "script>", beendet der Browser das
 * Script-Element mitten im Literal (Stored XSS, z. B. über einen
 * präparierten Listing-Namen aus einer gescrapten Quelle). Das
 * Kleiner-Zeichen wird daher als Unicode-Escape (Backslash-u003c)
 * serialisiert — innerhalb von JSON identisch, im HTML wirkungslos.
 */
export function jsonEmbed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
