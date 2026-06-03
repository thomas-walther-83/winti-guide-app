import { Platform, Share } from 'react-native';

/**
 * Plattformübergreifendes Teilen.
 * - Web: Web-Share-API (mobile Browser), sonst Zwischenablage als Fallback.
 * - Nativ: React-Native Share-Dialog.
 * Schlägt nie hart fehl (Abbruch durch Nutzer wird ignoriert).
 */
export async function shareItem(title: string, url?: string): Promise<void> {
  if (Platform.OS === 'web') {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) {
      try {
        await nav.share({ title, text: title, url });
      } catch {
        // Nutzer hat abgebrochen – ignorieren
      }
      return;
    }
    if (nav?.clipboard && url) {
      try {
        await nav.clipboard.writeText(url);
      } catch {
        // ignore
      }
    }
    return;
  }

  try {
    await Share.share({
      title,
      message: url ? `${title} – ${url}` : title,
    });
  } catch {
    // Nutzer hat abgebrochen – ignorieren
  }
}
