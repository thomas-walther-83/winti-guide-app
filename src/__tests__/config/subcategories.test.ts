import { matchesSubType, subTypeTokens } from '../../config/subcategories';

describe('subTypeTokens', () => {
  it('splits multi-value sub_type on ; , / |', () => {
    expect(subTypeTokens('swimming;volleyball;table_tennis')).toEqual([
      'swimming',
      'volleyball',
      'table_tennis',
    ]);
    expect(subTypeTokens('Museum, Gallery')).toEqual(['museum', 'gallery']);
    expect(subTypeTokens('')).toEqual([]);
    expect(subTypeTokens(undefined)).toEqual([]);
  });
});

describe('matchesSubType', () => {
  it('returns true for "all"', () => {
    expect(matchesSubType('swimming', 'all')).toBe(true);
  });

  it('matches a single-value pool', () => {
    expect(matchesSubType('swimming', 'Schwimmbad')).toBe(true);
    expect(matchesSubType('swimming_pool', 'Schwimmbad')).toBe(true);
    expect(matchesSubType('water_park', 'Schwimmbad')).toBe(true);
  });

  it('matches a multi-value pool (regression: Schwimmbad Büel)', () => {
    expect(matchesSubType('swimming;volleyball;table_tennis', 'Schwimmbad')).toBe(true);
  });

  it('does not match unrelated sub_types', () => {
    expect(matchesSubType('tennis', 'Schwimmbad')).toBe(false);
    expect(matchesSubType('volleyball;table_tennis', 'Schwimmbad')).toBe(false);
  });
});
