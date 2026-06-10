import { jsonEmbed } from '../../utils/jsonEmbed';

describe('jsonEmbed', () => {
  it('produces parseable JSON identical to the input', () => {
    const value = { name: 'Café d\'Or "Spezial"', n: 3, list: [1, 2] };
    expect(JSON.parse(jsonEmbed(value))).toEqual(value);
  });

  it('blocks </script> breakout payloads', () => {
    const evil = { name: '</script><script>alert(1)//' };
    const out = jsonEmbed(evil);
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    expect(JSON.parse(out)).toEqual(evil);
  });

  it('escapes every < occurrence, also nested', () => {
    const out = jsonEmbed(['a<b', { x: '<<' }]);
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual(['a<b', { x: '<<' }]);
  });
});
