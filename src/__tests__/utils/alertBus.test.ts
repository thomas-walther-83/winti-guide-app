import { alertBus, type AlertRequest } from '../../utils/alertBus';

/** Jest läuft im Node-Env (kein echtes window) — Browser-Dialoge stubben. */
function stubWindow(confirmResult: boolean) {
  const alertFn = jest.fn();
  const confirmFn = jest.fn(() => confirmResult);
  (globalThis as Record<string, unknown>).window = { alert: alertFn, confirm: confirmFn };
  return { alertFn, confirmFn };
}

describe('alertBus', () => {
  afterEach(() => {
    alertBus.setListener(null);
    delete (globalThis as Record<string, unknown>).window;
  });

  it('delivers requests to the registered listener', () => {
    const received: AlertRequest[] = [];
    alertBus.setListener((req) => received.push(req));
    alertBus.request({ title: 'Hallo', buttons: [{ text: 'OK' }] });
    expect(received).toHaveLength(1);
    expect(received[0].title).toBe('Hallo');
  });

  describe('fallback without listener', () => {
    it('uses window.alert for pure info alerts (no actionable button)', () => {
      const { alertFn, confirmFn } = stubWindow(true);
      alertBus.request({ title: 'Info', message: 'Nur Text', buttons: [{ text: 'OK' }] });
      expect(alertFn).toHaveBeenCalledWith('Info\n\nNur Text');
      expect(confirmFn).not.toHaveBeenCalled();
    });

    it('NEVER auto-executes a destructive action — asks via confirm', () => {
      const onDelete = jest.fn();
      stubWindow(false);
      alertBus.request({
        title: 'Löschen?',
        buttons: [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Löschen', style: 'destructive', onPress: onDelete },
        ],
      });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('executes the action when confirm is accepted', () => {
      const onDelete = jest.fn();
      stubWindow(true);
      alertBus.request({
        title: 'Löschen?',
        buttons: [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Löschen', style: 'destructive', onPress: onDelete },
        ],
      });
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('fires the cancel handler when confirm is dismissed', () => {
      const onCancel = jest.fn();
      stubWindow(false);
      alertBus.request({
        title: 'Löschen?',
        buttons: [
          { text: 'Abbrechen', style: 'cancel', onPress: onCancel },
          { text: 'Löschen', style: 'destructive', onPress: jest.fn() },
        ],
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
