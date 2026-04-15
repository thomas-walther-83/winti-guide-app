import { renderHook, act } from '@testing-library/react-native';
import { useTranslation } from '../../hooks/useTranslation';

describe('useTranslation', () => {
  it('defaults to German language', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('de');
  });

  it('returns all available languages', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.availableLanguages).toEqual(['de', 'en', 'fr', 'it']);
  });

  it('translates a key in German (default)', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('home')).toBe('Entdecken');
    expect(result.current.t('calendar')).toBe('Kalender');
    expect(result.current.t('restaurants')).toBe('Restaurants');
  });

  it('translates keys in English after setLanguage("en")', () => {
    const { result } = renderHook(() => useTranslation());

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
    expect(result.current.t('home')).toBe('Discover');
    expect(result.current.t('calendar')).toBe('Calendar');
    expect(result.current.t('search_placeholder')).toBe('Search...');
  });

  it('translates keys in French after setLanguage("fr")', () => {
    const { result } = renderHook(() => useTranslation());

    act(() => {
      result.current.setLanguage('fr');
    });

    expect(result.current.language).toBe('fr');
    expect(result.current.t('home')).toBe('Découvrir');
    expect(result.current.t('calendar')).toBe('Calendrier');
    expect(result.current.t('map')).toBe('Carte');
  });

  it('translates keys in Italian after setLanguage("it")', () => {
    const { result } = renderHook(() => useTranslation());

    act(() => {
      result.current.setLanguage('it');
    });

    expect(result.current.language).toBe('it');
    expect(result.current.t('home')).toBe('Scoprire');
    expect(result.current.t('calendar')).toBe('Calendario');
    expect(result.current.t('restaurants')).toBe('Ristoranti');
  });

  it('can switch between languages multiple times', () => {
    const { result } = renderHook(() => useTranslation());

    act(() => {
      result.current.setLanguage('en');
    });
    expect(result.current.t('home')).toBe('Discover');

    act(() => {
      result.current.setLanguage('de');
    });
    expect(result.current.t('home')).toBe('Entdecken');

    act(() => {
      result.current.setLanguage('it');
    });
    expect(result.current.t('home')).toBe('Scoprire');
  });

  it('returns key itself when key is not found in any language', () => {
    const { result } = renderHook(() => useTranslation());
    // Cast to any to test unknown key fallback
    const key = 'nonexistent_key_xyz' as any;
    expect(result.current.t(key)).toBe('nonexistent_key_xyz');
  });

  it('translates all category keys in German', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('restaurants')).toBe('Restaurants');
    expect(result.current.t('cafes')).toBe('Cafés');
    expect(result.current.t('bars')).toBe('Bars');
    expect(result.current.t('hotels')).toBe('Hotels');
    expect(result.current.t('sightseeing')).toBe('Sightseeing');
    expect(result.current.t('kultur')).toBe('Kultur');
    expect(result.current.t('geschaefte')).toBe('Geschäfte');
    expect(result.current.t('sport')).toBe('Sport');
    expect(result.current.t('touren')).toBe('Touren');
  });

  it('translates event categories in German', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('festival')).toBe('Festival');
    expect(result.current.t('musik')).toBe('Musik');
    expect(result.current.t('markt')).toBe('Markt');
    expect(result.current.t('theater')).toBe('Theater');
    expect(result.current.t('kulinarik')).toBe('Kulinarik');
  });

  it('translates UI keys in German', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('loading')).toBe('Laden...');
    expect(result.current.t('error_loading')).toBe('Fehler beim Laden');
    expect(result.current.t('no_results')).toBe('Keine Einträge gefunden');
    expect(result.current.t('retry')).toBe('Erneut versuchen');
    expect(result.current.t('save')).toBe('Speichern');
    expect(result.current.t('remove')).toBe('Entfernen');
  });

  it('translates shop-related keys in English', () => {
    const { result } = renderHook(() => useTranslation());

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.t('kultur')).toBe('Culture');
    expect(result.current.t('geschaefte')).toBe('Shops');
    expect(result.current.t('touren')).toBe('Tours');
    expect(result.current.t('no_results')).toBe('No listings found');
    expect(result.current.t('no_events')).toBe('No events found');
  });
});
