import { describe, expect, it } from 'vitest';
import { bestCorrection, canonicalize, levenshtein, normalizeForSearch, phoneticKey, suggest } from './phonetic.js';

const CATS = ['Épicerie', 'Produits laitiers', 'Viandes', 'Légumes', 'Boulangerie'];
const SUPPLIERS = ['Ferme du Lac', 'Les Fromages Gatineau', 'Boucherie Saint-Louis'];

describe('phonétique française', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(normalizeForSearch('  Épicerie Saint-Louis ')).toBe('epicerie saint louis');
  });
  it('donne la même clé à des écritures qui sonnent pareil', () => {
    expect(phoneticKey('Ferm du Lak')).toBe(phoneticKey('Ferme du Lac'));
    expect(phoneticKey('Legume')).toBe(phoneticKey('Légumes'));
    expect(phoneticKey('Boulanjerie')).toBe(phoneticKey('Boulangerie'));
    expect(phoneticKey('Poisson')).toBe(phoneticKey('Poison'));
  });
  it('garde des clés différentes pour des mots différents', () => {
    expect(phoneticKey('Viandes')).not.toBe(phoneticKey('Légumes'));
  });
  it('calcule la distance de Levenshtein', () => {
    expect(levenshtein('chat', 'chats')).toBe(1);
    expect(levenshtein('abc', 'abc')).toBe(0);
  });
});

describe('suggest / bestCorrection / canonicalize', () => {
  it('propose par début d’écriture', () => {
    expect(suggest('prod', CATS)[0].text).toBe('Produits laitiers');
  });
  it('propose par prononciation quand l’orthographe est fausse', () => {
    expect(suggest('legum', CATS).map((s) => s.text)).toContain('Légumes');
    expect(suggest('Ferm du Lak', SUPPLIERS)[0].text).toBe('Ferme du Lac');
  });
  it('liste tout par ordre alphabétique sans texte', () => {
    expect(suggest('', CATS).map((s) => s.text)).toEqual(['Boulangerie', 'Épicerie', 'Légumes', 'Produits laitiers', 'Viandes']);
  });
  it('suggère une correction seulement pour une faute de prononciation', () => {
    expect(bestCorrection('Boulanjerie', CATS)).toBe('Boulangerie');
    expect(bestCorrection('Viandes', CATS)).toBeNull();
    expect(bestCorrection('xyz', CATS)).toBeNull();
  });
  it('réutilise l’écriture existante (accents / majuscules)', () => {
    expect(canonicalize('epicerie', CATS)).toBe('Épicerie');
    expect(canonicalize('Nouveau', CATS)).toBe('Nouveau');
  });
});
