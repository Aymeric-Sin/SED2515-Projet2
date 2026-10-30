/**
 * MiseEnPlace (frontend) — Tests Vitest des fonctions d'affichage.
 */

import { describe, expect, test } from 'vitest';
import { formatPercent, formatQuantity, formatUnitCost, marginTone, statusLabel } from './format.js';

describe('format', () => {
  test('formatPercent ajoute le signe %', () => {
    expect(formatPercent(75)).toMatch(/^75\s%$/);
    expect(formatPercent(NaN)).toMatch(/^0\s%$/);
  });

  test('formatQuantity ajoute l\'unité', () => {
    expect(formatQuantity(400, 'g')).toMatch(/400\sg$/);
  });

  test('formatUnitCost garde les décimales d\'un petit coût', () => {
    expect(formatUnitCost(0.0045)).toContain('0,0045');
    expect(formatUnitCost(undefined)).toBe('—');
  });

  test('statusLabel traduit les statuts', () => {
    expect(statusLabel('bas')).toBe('Stock bas');
    expect(statusLabel('rupture')).toBe('Rupture');
    expect(statusLabel('ok')).toBe('OK');
  });

  test('marginTone classe la marge', () => {
    expect(marginTone(70)).toBe('good');
    expect(marginTone(55)).toBe('warn');
    expect(marginTone(20)).toBe('bad');
  });
});
