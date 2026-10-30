/**
 * MiseEnPlace (frontend) — Test Vitest de la page Stock : le nombre de recettes est un lien
 * vers la page Recettes filtrée sur l'ingrédient.
 */

import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api.js', () => ({
  getIngredients: vi.fn().mockResolvedValue([
    { id: 'ing_001', name: 'Tomate', category: 'Légumes', unit: 'g', costPerUnit: 0.0045, stock: 6000, threshold: 2000, supplier: 'Ferme', status: 'ok', recipeCount: 3 },
    { id: 'ing_099', name: 'Paprika', category: 'Épicerie', unit: 'g', costPerUnit: 0.05, stock: 300, threshold: 100, supplier: 'X', status: 'ok', recipeCount: 0 },
  ]),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  getErrorMessage: (error) => error.message,
  getFieldErrors: () => ({}),
}));

import StockPage from './StockPage.jsx';

describe('StockPage', () => {
  test('le nombre de recettes mène à la page Recettes filtrée sur l\'ingrédient exact', async () => {
    render(
      <MemoryRouter>
        <StockPage />
      </MemoryRouter>
    );
    const link = await screen.findByRole('link', { name: /Voir les 3 recettes qui utilisent Tomate/ });
    expect(link).toHaveAttribute('href', '/recettes?search=%22Tomate%22');
    expect(link).toHaveTextContent('3');
  });

  test('un ingrédient utilisé nulle part affiche 0 sans lien', async () => {
    render(
      <MemoryRouter>
        <StockPage />
      </MemoryRouter>
    );
    await screen.findByText('Paprika');
    expect(screen.queryByRole('link', { name: /qui utilisent Paprika/ })).not.toBeInTheDocument();
  });
});
