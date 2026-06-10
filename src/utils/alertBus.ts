/**
 * Mini-Event-Bus zwischen dem Web-Alert-Shim (`alert.web.ts`) und dem
 * React-Modal-Host (`GlobalAlertHost`). Der Shim muss frei von React sein
 * (wird aus utils importiert, läuft synchron in `onPress`), darum dieser
 * minimale Vermittler.
 */
export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type Listener = (req: AlertRequest) => void;

let activeListener: Listener | null = null;

export const alertBus = {
  request(req: AlertRequest): void {
    if (activeListener) {
      activeListener(req);
      return;
    }
    // Host (noch) nicht gemountet → Browser-Dialoge als Fallback.
    // Wichtig: bei einer echten Wahl (z. B. Löschen-Bestätigung) MUSS
    // window.confirm gefragt werden — die Aktion darf nie ungefragt
    // ausgeführt werden.
    if (typeof window === 'undefined') return;
    const text = `${req.title}${req.message ? '\n\n' + req.message : ''}`;
    const actionable = req.buttons.filter((b) => b.style !== 'cancel' && b.onPress);
    if (actionable.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert(text);
      return;
    }
    // eslint-disable-next-line no-alert
    const ok = window.confirm(text);
    if (ok) {
      actionable[0]?.onPress?.();
    } else {
      req.buttons.find((b) => b.style === 'cancel')?.onPress?.();
    }
  },
  setListener(l: Listener | null): void {
    activeListener = l;
  },
};
