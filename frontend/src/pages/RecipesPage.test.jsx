/**
 * MiseEnPlace (frontend) — Tests Vitest de la page Recettes (recherche par ingrédient).
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api.js', () => ({
  getRecipes: vi.fn(),
  getErrorMessage: (error) => error.message,
}));

import { getRecipes } from '../api.js';
import RecipesPage from './RecipesPage.jsx';

const recipe = {
  id: 'rec_004',
  name: 'Bruschetta tomate et basilic',
  category: 'Entrée',
  price: 9.5,
  costPerPortion: 1.53,
  margin: 7.97,
  marginPercent: 83.87,
  foodCostPercent: 16.13,
  possiblePortions: 16,
  availability: 'ok',
  bottleneck: null,
  missingIngredients: [],
  lowIngredients: [],
  matchedIngredients: ['Tomate'],
};

function renderPage(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <RecipesPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  getRecipes.mockReset();
  getRecipes.mockResolvedValue([recipe]);
});

describe('RecipesPage', () => {
  test('préremplit la recherche depuis l\'adresse (lien de la page Stock) et interroge l\'API', async () => {
    renderPage('/recettes?search=' + encodeURIComponent('"Tomate"'));
    expect(screen.getByLabelText('Rechercher')).toHaveValue('"Tomate"');
    await waitFor(() => expect(getRecipes).toHaveBeenCalledWith({ search: '"Tomate"' }));
  });

  test('affiche les ingrédients trouvés sous le nom de la recette', async () => {
    renderPage('/recettes?search=tomate');
    expect(await screen.findByText('Contient : Tomate')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bruschetta tomate et basilic' })).toBeInTheDocument();
  });

  test('sans recherche, n\'envoie aucun filtre', async () => {
    getRecipes.mockResolvedValue([{ ...recipe, matchedIngredients: [] }]);
    renderPage('/recettes');
    await waitFor(() => expect(getRecipes).toHaveBeenCalledWith({}));
    expect(screen.queryByText(/Contient :/)).not.toBeInTheDocument();
  });
});
