/**
 * MiseEnPlace (frontend) — Tests Vitest du formulaire d'ajout de recette.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Simulation du serveur : une fonction ordinaire (un vi.fn qui échoue fait signaler l'erreur à Vitest).
const server = vi.hoisted(() => ({ calls: [], respond: null }));

vi.mock('../api.js', () => ({
  getIngredients: vi.fn().mockResolvedValue([
    { id: 'ing_001', name: 'Tomate', unit: 'g' },
    { id: 'ing_002', name: 'Basilic', unit: 'g' },
  ]),
  createRecipe: (data) => {
    server.calls.push(data);
    return server.respond(data);
  },
  getErrorMessage: (error) => error.message,
  getFieldErrors: (error) => error.fields ?? {},
}));

import RecipeFormPage from './RecipeFormPage.jsx';

function setup() {
  render(
    <MemoryRouter initialEntries={['/recettes/nouvelle']}>
      <Routes>
        <Route path="/recettes/nouvelle" element={<RecipeFormPage />} />
        <Route path="/recettes" element={<p>Liste des recettes</p>} />
      </Routes>
    </MemoryRouter>
  );
}
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('RecipeFormPage', () => {
  beforeEach(() => {
    server.calls = [];
    server.respond = () => Promise.resolve({ id: 'rec_099', name: 'Salade caprese' });
  });

  test('refuse un formulaire vide sans appeler le serveur', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer la recette' }));
    expect(await screen.findByText('Le nom est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Entrez un prix.')).toBeInTheDocument();
    expect(screen.getByText('Choisissez un ingrédient.')).toBeInTheDocument();
    expect(server.calls).toHaveLength(0);
  });

  test('envoie la recette (prix avec virgule accepté) puis revient à la liste', async () => {
    setup();
    await screen.findByLabelText('Nom de la recette');
    type('Nom de la recette', ' Salade caprese ');
    type('Prix de vente par portion ($)', '12,5');
    type('Nombre de portions', '2');
    type('Ingrédient 1', 'ing_001');
    type(/Quantité/, '300');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la recette' }));
    await waitFor(() => expect(server.calls).toHaveLength(1));
    expect(server.calls[0]).toEqual({
      name: 'Salade caprese',
      category: 'Plat',
      price: 12.5,
      portions: 2,
      ingredients: [{ ingredientId: 'ing_001', quantity: 300 }],
    });
    expect(await screen.findByText('Liste des recettes')).toBeInTheDocument();
  });

  test('affiche les erreurs du serveur par champ et par ligne', async () => {
    const failure = Object.assign(new Error('x'), { fields: { name: 'Une recette porte déjà ce nom.', lines: { 0: { quantity: 'La quantité est trop élevée.' } } } });
    server.respond = () => Promise.reject(failure);
    setup();
    await screen.findByLabelText('Nom de la recette');
    type('Nom de la recette', 'Pizza');
    type('Prix de vente par portion ($)', '10');
    type('Ingrédient 1', 'ing_001');
    type(/Quantité/, '5');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la recette' }));
    expect(await screen.findByText('Une recette porte déjà ce nom.')).toBeInTheDocument();
    expect(screen.getByText('La quantité est trop élevée.')).toBeInTheDocument();
  });

  test('ajoute et retire des lignes d’ingrédients', async () => {
    setup();
    await screen.findByLabelText('Ingrédient 1');
    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter un ingrédient' }));
    expect(screen.getByLabelText('Ingrédient 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Retirer l'ingrédient 2" }));
    expect(screen.queryByLabelText('Ingrédient 2')).not.toBeInTheDocument();
  });
});
