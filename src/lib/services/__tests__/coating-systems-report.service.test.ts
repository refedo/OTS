import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ default: {} }));

import { parseCoats, sumMicrons } from '../projects/coating-systems-report.service';
import { getRalHex, getRalName, isKnownRal } from '@/lib/ral-colors';

describe('coating systems report helpers', () => {
  it('parses coats JSON with string microns and blank entries', () => {
    const coats = parseCoats([
      { coatName: 'Zinc Primer', microns: '75', ralNumber: '' },
      { coatName: 'Top Coat', microns: 60, ralNumber: 'RAL 7035' },
      { coatName: '', microns: '', ralNumber: '' },
      'junk',
    ]);
    expect(coats).toEqual([
      { coatName: 'Zinc Primer', microns: 75, ralNumber: null },
      { coatName: 'Top Coat', microns: 60, ralNumber: 'RAL 7035' },
    ]);
    expect(sumMicrons(coats)).toBe(135);
  });

  it('returns empty array for non-array input', () => {
    expect(parseCoats(null)).toEqual([]);
    expect(parseCoats({})).toEqual([]);
  });

  it('resolves RAL colours regardless of prefix', () => {
    expect(getRalHex('RAL 9010')).toBe('#FFFFFF');
    expect(getRalName('7035')).toBe('Light Grey');
    expect(isKnownRal('RAL-0000')).toBe(false);
  });
});
