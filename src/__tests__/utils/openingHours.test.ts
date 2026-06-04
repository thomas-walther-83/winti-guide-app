import { isOpenNow } from '../../utils/openingHours';

// Hilfen: fester Wochentag/Uhrzeit. JS getDay: 0=So..6=Sa.
const at = (dayOfWeek: number, h: number, m = 0) => {
  // 2026-06-01 ist ein Montag (getDay()==1). Offset zum gewünschten Tag.
  const base = new Date(2026, 5, 1, h, m, 0); // Mo
  base.setDate(base.getDate() + ((dayOfWeek + 6) % 7)); // Mo→0 … So→6 Tage weiter
  return base;
};

describe('isOpenNow', () => {
  it('null bei leer/unbekannt', () => {
    expect(isOpenNow('')).toBeNull();
    expect(isOpenNow(undefined)).toBeNull();
    expect(isOpenNow('nach Vereinbarung')).toBeNull();
  });

  it('Mo-Sa 11:00-21:00', () => {
    expect(isOpenNow('Mo-Sa 11:00-21:00', at(2, 14))).toBe(true); // Di 14:00
    expect(isOpenNow('Mo-Sa 11:00-21:00', at(2, 22))).toBe(false); // Di 22:00
    expect(isOpenNow('Mo-Sa 11:00-21:00', at(0, 14))).toBe(false); // So
  });

  it('Täglich 9-18 Uhr', () => {
    expect(isOpenNow('Täglich 9-18 Uhr', at(0, 10))).toBe(true);
    expect(isOpenNow('Täglich 9-18 Uhr', at(3, 8))).toBe(false);
  });

  it('Mittagspause: Mo-Fr 8:00-12:00, 14:00-18:00', () => {
    expect(isOpenNow('Mo-Fr 8:00-12:00, 14:00-18:00', at(3, 9))).toBe(true);
    expect(isOpenNow('Mo-Fr 8:00-12:00, 14:00-18:00', at(3, 13))).toBe(false);
    expect(isOpenNow('Mo-Fr 8:00-12:00, 14:00-18:00', at(6, 9))).toBe(false); // Sa
  });

  it('Mehrere Tagesregeln: Mo-Fr 8-12, Sa 9-13', () => {
    expect(isOpenNow('Mo-Fr 8-12, Sa 9-13', at(6, 10))).toBe(true); // Sa 10
    expect(isOpenNow('Mo-Fr 8-12, Sa 9-13', at(6, 14))).toBe(false); // Sa 14
    expect(isOpenNow('Mo-Fr 8-12, Sa 9-13', at(1, 9))).toBe(true); // Mo 9
  });

  it('über Mitternacht: Fr-Sa 20:00-02:00', () => {
    expect(isOpenNow('Fr-Sa 20:00-02:00', at(5, 23))).toBe(true); // Fr 23:00
    expect(isOpenNow('Fr-Sa 20:00-02:00', at(5, 1))).toBe(true); // Fr 01:00 (Nacht)
    expect(isOpenNow('Fr-Sa 20:00-02:00', at(2, 23))).toBe(false); // Di
  });
});
