/**
 * MiseEnPlace (frontend) — Tests Vitest de la lecture des nombres (point ou virgule).
 */

import { describe, expect, test } from 'vitest';
import { parseDecimal, toInputText } from './number.js';

describe('parseDecimal', () => {
  test('accepte le point ou la virgule comme séparateur décimal', () => {
    expect(parseDecimal('1.05')).toBe(1.05);
    expect(parseDecimal('1,05')).toBe(1.05);
    expect(parseDecimal('0,0045')).toBe(0.0045);
    expect(parseDecimal('0.0045')).toBe(0.0045);
  });

  test('accepte les entiers, les décimales sans zéro et les nombres avec espaces', () => {
    expect(parseDecimal('300')).toBe(300);
    expect(parseDecimal('.5')).toBe(0.5);
    expect(parseDecimal('2.')).toBe(2);
    expect(parseDecimal(' 1 000,5 ')).toBe(1000.5);
    expect(parseDecimal('1 000')).toBe(1000);
  });

  test('un champ vide donne undefined', () => {
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('   ')).toBeUndefined();
    expect(parseDecimal(undefined)).toBeUndefined();
  });

  test('refuse ce qui n\'est pas un nombre', () => {
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('1,2,3')).toBeNaN();
    expect(parseDecimal('1.2.3')).toBeNaN();
    expect(parseDecimal('1e3')).toBeNaN();
    expect(parseDecimal('12 $')).toBeNaN();
    expect(parseDecimal('.')).toBeNaN();
    expect(parseDecimal('--1')).toBeNaN();
  });
});

describe('toInputText', () => {
  test('affiche la virgule décimale', () => {
    expect(toInputText(0.0045)).toBe('0,0045');
    expect(toInputText(300)).toBe('300');
  });
});
