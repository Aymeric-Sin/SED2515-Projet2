import { describe, expect, it } from 'vitest';
import { canConvertUnit, formatQuantityIn, formatUnitCostIn } from './format.js';

describe('unités g/ml <-> kg/L', () => {
  it('convertit g en kg et ml en L', () => {
    expect(formatQuantityIn(1500, 'g', 'large').replace(/\s/g, ' ')).toBe('1,5 kg');
    expect(formatQuantityIn(250, 'ml', 'large')).toBe('0,25 L');
  });
  it('ne change pas le mode de base ni les « unité »', () => {
    expect(formatQuantityIn(1500, 'g', 'base').replace(/\s/g, ' ')).toBe('1 500 g');
    expect(formatQuantityIn(12, 'unité', 'large')).toBe('12 unité');
    expect(canConvertUnit('unité')).toBe(false);
  });
  it('convertit le coût par unité', () => {
    expect(formatUnitCostIn(0.0045, 'g', 'large')).toContain('/ kg');
    expect(formatUnitCostIn(0.0045, 'g', 'large')).toContain('4,50');
    expect(formatUnitCostIn(0.0045, 'g', 'base')).toContain('/ g');
  });
});
