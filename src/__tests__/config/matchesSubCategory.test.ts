import { matchesSubCategory, matchesSubType } from '../../config/subcategories';

describe('matchesSubCategory', () => {
  it('matches via sub_type like matchesSubType', () => {
    expect(matchesSubCategory({ sub_type: 'italian' }, 'Italienisch')).toBe(true);
    expect(matchesSubType('italian', 'Italienisch')).toBe(true);
  });

  it('additionally matches via editorial tags (exact label)', () => {
    expect(matchesSubCategory({ sub_type: 'restaurant', tags: ['Italienisch'] }, 'Italienisch')).toBe(true);
    expect(matchesSubCategory({ sub_type: '', tags: ['Pizza'] }, 'Pizza')).toBe(true);
  });

  it('matches tags case-insensitively against aliases', () => {
    expect(matchesSubCategory({ tags: ['sushi'] }, 'Sushi')).toBe(true);
    expect(matchesSubCategory({ tags: ['Vegan'] }, 'Vegetarisch')).toBe(true);
  });

  it('does not match unrelated tags', () => {
    expect(matchesSubCategory({ sub_type: 'kebab', tags: ['Türkisch'] }, 'Italienisch')).toBe(false);
  });

  it('"all" matches everything', () => {
    expect(matchesSubCategory({ sub_type: null, tags: [] }, 'all')).toBe(true);
  });
});
