// Web-Fallback für Alert.alert – `react-native-web` liefert ein No-Op,
// d. h. ohne diesen Shim feuert auf Web KEIN Button (Bestätigung-Dialoge
// wie „Tour löschen" tun nichts).
//
// Vertrag: gleiche Signatur wie `Alert.alert` aus React Native.
//   Alert.alert(title, message?, buttons?, options?)
//
// Web-Verhalten:
//  - 0/1 Button: window.alert; onPress feuert nach dem OK
//  - 2+ Buttons: window.confirm; OK = non-cancel-Button, Cancel = cancel-Button

interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

function joinTitle(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    const text = joinTitle(title, message);
    if (!buttons || buttons.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert(text);
      return;
    }
    if (buttons.length === 1) {
      // eslint-disable-next-line no-alert
      window.alert(text);
      buttons[0]?.onPress?.();
      return;
    }
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    // Non-Cancel-Action: vorzugsweise destructive/default, sonst der letzte.
    const actionBtn =
      buttons.find((b) => b.style === 'destructive') ??
      buttons.find((b) => b.style !== 'cancel') ??
      buttons[buttons.length - 1];
    // eslint-disable-next-line no-alert
    const ok = window.confirm(text);
    if (ok) actionBtn?.onPress?.();
    else cancelBtn?.onPress?.();
  },
};
