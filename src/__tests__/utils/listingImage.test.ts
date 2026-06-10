import { primaryImage } from '../../utils/listingImage';

describe('primaryImage', () => {
  it('prefers the first gallery image', () => {
    expect(
      primaryImage({ image_urls: ['https://a.ch/1.jpg', 'https://a.ch/2.jpg'], image_url: 'https://a.ch/old.jpg' }),
    ).toBe('https://a.ch/1.jpg');
  });

  it('falls back to the legacy single image', () => {
    expect(primaryImage({ image_urls: [], image_url: 'https://a.ch/old.jpg' })).toBe('https://a.ch/old.jpg');
    expect(primaryImage({ image_url: 'https://a.ch/old.jpg' })).toBe('https://a.ch/old.jpg');
  });

  it('skips empty/whitespace gallery entries', () => {
    expect(primaryImage({ image_urls: ['  '], image_url: 'https://a.ch/old.jpg' })).toBe('https://a.ch/old.jpg');
  });

  it('returns null without any image', () => {
    expect(primaryImage({})).toBeNull();
    expect(primaryImage({ image_urls: [], image_url: '' })).toBeNull();
  });
});
