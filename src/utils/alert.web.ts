// Web-Fallback für Alert.alert – `react-native-web` liefert ein No-Op,
// d. h. ohne diesen Shim feuert auf Web KEIN Button.
//
// Statt `window.confirm` (kann in PWAs/iOS-Safari blockiert sein) rendern
// wir ein React-Modal über den globalen `alertBus`. Der `GlobalAlertHost`
// muss dazu am App-Root gemountet sein.
import { alertBus, type AlertButton } from './alertBus';

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    alertBus.request({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  },
};
