import { googleMapsSearchUrl, googleMapsDirUrl } from '../../utils/maps';

describe('googleMapsSearchUrl', () => {
  it('prefers coordinates', () => {
    expect(googleMapsSearchUrl(47.5, 8.72)).toBe(
      'https://www.google.com/maps/search/?api=1&query=47.5,8.72',
    );
  });
  it('falls back to an encoded query', () => {
    expect(googleMapsSearchUrl(null, null, 'Schwimmbad Büel')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Schwimmbad%20B%C3%BCel',
    );
  });
  it('returns null without coords or query', () => {
    expect(googleMapsSearchUrl(null, null, '')).toBeNull();
  });
});

describe('googleMapsDirUrl', () => {
  it('builds a directions URL from coordinates', () => {
    expect(googleMapsDirUrl(47.5, 8.72)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=47.5,8.72',
    );
  });
});
