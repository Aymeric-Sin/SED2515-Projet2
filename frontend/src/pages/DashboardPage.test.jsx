/**
 * MiseEnPlace (frontend) — Test Vitest du tableau de bord (affichage de base et bascule kg/g).
 */

import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnitsProvider } from '../units.jsx';

vi.mock('../api.js', () => ({
  getStats: vi.fn().mockResolvedValue({
    recipeCount: 2, ingredientCount: 3, lowStockCount: 1, outOfStockCount: 0, averageMarginPercent: 70, stockValue: 100,
    topRecipes: [{ id: 'rec_1', name: 'Pizza', margin: 10, marginPercent: 70 }],
    highestFoodCost: [{ id: 'rec_1', name: 'Pizza', foodCostPercent: 30, marginPercent: 70 }],
    alerts: [{ id: 'ing_1', name: 'Farine', status: 'bas', stock: 1500, threshold: 2000, unit: 'g', supplier: 'Moulin' }],
    recipesAtRisk: [],
    byCategory: [{ category: 'Plat', count: 2, averageMarginPercent: 70 }],
  }),
  getErrorMessage: (error) => error.message,
}));

import DashboardPage from './DashboardPage.jsx';

describe('DashboardPage', () => {
  test('affiche les sections et convertit les quantités en kg', async () => {
    render(
      <MemoryRouter>
        <UnitsProvider initialMode="base">
          <DashboardPage />
        </UnitsProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('Recettes les plus rentables')).toBeInTheDocument();
    expect(screen.getByText('Coût matière le plus élevé')).toBeInTheDocument();
    expect(screen.getByText('Marge moyenne par catégorie')).toBeInTheDocument();
    expect(screen.getByText(/1\s500 g/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'kg / L' }));
    expect(screen.getByText(/1,5 kg/)).toBeInTheDocument();
  });
});
