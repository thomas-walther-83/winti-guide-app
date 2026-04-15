import { askAiGuide } from '../../services/aiGuideService';

// No API key is set in the test environment, so askAiGuide uses getOfflineResponse.
// This allows us to test the offline response logic without any network calls.

describe('aiGuideService – offline mode (no API key)', () => {
  describe('identity / name questions', () => {
    it('responds to "name" query', async () => {
      const reply = await askAiGuide('What is your name?');
      expect(reply).toContain('Thomas');
    });

    it('responds to "wer bist" query', async () => {
      const reply = await askAiGuide('Wer bist du?');
      expect(reply).toContain('Thomas');
    });

    it('responds to "wer du" query', async () => {
      const reply = await askAiGuide('Sag mir wer du bist');
      expect(reply).toContain('Thomas');
    });
  });

  describe('arrival / newcomer questions', () => {
    it('responds to "ankommen" query', async () => {
      const reply = await askAiGuide('Ich bin gerade angekommen');
      expect(reply).toContain('Winterthur');
    });

    it('responds to "neu" query with welcome message', async () => {
      const reply = await askAiGuide('Ich bin neu hier');
      expect(reply).toContain('Winterthur');
    });

    it('responds to "angekommen" query', async () => {
      const reply = await askAiGuide('Ich bin gerade angekommen in der Stadt');
      expect(reply).toContain('Winterthur');
    });
  });

  describe('sightseeing / highlights questions', () => {
    it('responds to "highlight" query', async () => {
      const reply = await askAiGuide('Was sind die highlights?');
      expect(reply).toContain('Winterthur');
    });

    it('responds to "sehenswürdigkeit" query', async () => {
      const reply = await askAiGuide('Welche Sehenswürdigkeiten gibt es?');
      expect(reply).toContain('Kunstmuseum');
    });

    it('responds to "sehen" query', async () => {
      const reply = await askAiGuide('Was kann ich sehen?');
      expect(reply).toContain('Kunstmuseum');
    });
  });

  describe('food / restaurant questions', () => {
    it('responds to "essen" query', async () => {
      const reply = await askAiGuide('Wo kann ich gut essen?');
      expect(reply).toContain('Gastronomie');
    });

    it('responds to "restaurant" query', async () => {
      const reply = await askAiGuide('Gibt es ein gutes Restaurant?');
      expect(reply).toContain('Winterthur');
    });

    it('responds to "speisen" query', async () => {
      const reply = await askAiGuide('Wo kann ich speisen?');
      expect(reply).toContain('Gastronomie');
    });
  });

  describe('cafe / coffee questions', () => {
    it('responds to "café" query', async () => {
      const reply = await askAiGuide('Wo gibt es ein schönes Café?');
      expect(reply).toContain('Kaffee');
    });

    it('responds to "cafe" query', async () => {
      const reply = await askAiGuide('Ich suche ein gemütliches cafe');
      expect(reply).toContain('Kaffee');
    });

    it('responds to "kaffee" query', async () => {
      const reply = await askAiGuide('Wo bekomme ich guten Kaffee?');
      expect(reply).toContain('Kaffee');
    });
  });

  describe('nightlife questions', () => {
    it('responds to "nacht" query', async () => {
      const reply = await askAiGuide('Was gibt es nachts zu tun?');
      expect(reply).toContain('Nachtleben');
    });

    it('responds to "bar" query', async () => {
      const reply = await askAiGuide('Empfehle mir eine Bar');
      expect(reply).toContain('Bars');
    });

    it('responds to "abend" query', async () => {
      const reply = await askAiGuide('Was kann ich am Abend machen?');
      expect(reply).toContain('Winterthur');
    });
  });

  describe('off-topic detection', () => {
    const OFF_TOPIC_SNIPPET = 'Als Reiseführer Thomas';

    it('rejects app-related questions', async () => {
      const reply = await askAiGuide('Wie funktioniert die app?');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects coding questions', async () => {
      const reply = await askAiGuide('Erkläre mir Programmierung');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects software questions', async () => {
      const reply = await askAiGuide('Was ist software engineering?');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects programming language questions', async () => {
      const reply = await askAiGuide('Erkläre mir JavaScript');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects TypeScript questions', async () => {
      const reply = await askAiGuide('Wie benutze ich TypeScript?');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects React questions', async () => {
      const reply = await askAiGuide('Was ist react?');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects database questions', async () => {
      const reply = await askAiGuide('Was ist eine Datenbank?');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects math questions', async () => {
      const reply = await askAiGuide('Löse diese Mathematik-Aufgabe');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects politics questions', async () => {
      const reply = await askAiGuide('Erkläre mir Politik');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });

    it('rejects GitHub questions', async () => {
      const reply = await askAiGuide('Was ist github?');
      expect(reply).toContain(OFF_TOPIC_SNIPPET);
    });
  });

  describe('generic / fallback response', () => {
    it('returns a generic Winterthur response for unmatched questions', async () => {
      const reply = await askAiGuide('Irgendeine andere Frage ohne spezifisches Keyword');
      expect(reply).toContain('Winterthur');
    });

    it('includes Thomas in generic response', async () => {
      const reply = await askAiGuide('Eine sehr ungewöhnliche Frage ohne bekannte Keywords');
      expect(reply).toContain('Thomas');
    });
  });

  describe('history parameter', () => {
    it('uses offline mode regardless of history when no API key', async () => {
      const history = [
        { role: 'user' as const, text: 'Hallo' },
        { role: 'assistant' as const, text: 'Hallo! Ich bin Thomas.' },
      ];
      const reply = await askAiGuide('Wo gibt es ein Restaurant?', history);
      expect(reply).toContain('Winterthur');
    });
  });
});
