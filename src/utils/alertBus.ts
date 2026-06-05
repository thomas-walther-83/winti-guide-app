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
    } else {
      // Wenn der Host (noch) nicht gemountet ist (sollte nicht vorkommen),
      // wenigstens window.alert als Fallback.
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        // eslint-disable-next-line no-alert
        window.alert(`${req.title}${req.message ? '\n\n' + req.message : ''}`);
        // OK-Button (default oder erster non-cancel) trotzdem feuern,
        // damit Aktionen nicht verloren gehen.
        const fallback =
          req.buttons.find((b) => b.style !== 'cancel') ?? req.buttons[req.buttons.length - 1];
        fallback?.onPress?.();
      }
    }
  },
  setListener(l: Listener | null): void {
    activeListener = l;
  },
};
