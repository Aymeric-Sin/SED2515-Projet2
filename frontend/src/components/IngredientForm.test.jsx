/**
 * MiseEnPlace (frontend) — Tests Vitest du formulaire d'ingrédient (composant contrôlé).
 */

import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import IngredientForm from './IngredientForm.jsx';

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('IngredientForm', () => {
  test('affiche les erreurs et n\'envoie rien si des champs sont vides', () => {
    const onSubmit = vi.fn();
    render(<IngredientForm onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Le nom est obligatoire.')).toBeInTheDocument();
    expect(screen.getAllByText('Entrez un nombre.')).toHaveLength(3);
  });

  test('envoie des valeurs nettoyées et converties en nombres', () => {
    const onSubmit = vi.fn();
    render(<IngredientForm onSubmit={onSubmit} onCancel={() => {}} />);
    fill('Nom', '  Paprika  ');
    fill('Catégorie', 'Épicerie');
    fill('Coût par unité ($)', '0,05');
    fill('Quantité en stock', '300');
    fill("Seuil d'alerte", '100');
    fill('Fournisseur', 'Grossiste');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Paprika',
      category: 'Épicerie',
      unit: 'g',
      costPerUnit: 0.05,
      stock: 300,
      threshold: 100,
      supplier: 'Grossiste',
    });
  });

  test('accepte le point comme la virgule pour les décimales (1.05 = 1,05)', () => {
    for (const cost of ['1.05', '1,05']) {
      const onSubmit = vi.fn();
      const { unmount } = render(<IngredientForm onSubmit={onSubmit} onCancel={() => {}} />);
      fill('Nom', 'Test');
      fill('Catégorie', 'Épicerie');
      fill('Coût par unité ($)', cost);
      fill('Quantité en stock', '2.5');
      fill("Seuil d'alerte", '1 000,5');
      fill('Fournisseur', 'X');
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ costPerUnit: 1.05, stock: 2.5, threshold: 1000.5 }));
      unmount();
    }
  });

  test('refuse un texte qui n\'est pas un nombre', () => {
    const onSubmit = vi.fn();
    render(<IngredientForm onSubmit={onSubmit} onCancel={() => {}} />);
    fill('Nom', 'Test');
    fill('Catégorie', 'Épicerie');
    fill('Coût par unité ($)', '1,2,3');
    fill('Quantité en stock', '10');
    fill("Seuil d'alerte", '5');
    fill('Fournisseur', 'X');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Entrez un nombre.')).toBeInTheDocument();
  });

  test('préremplit les champs en mode modification', () => {
    const ingredient = { id: 'ing_001', name: 'Tomate', category: 'Légumes', unit: 'g', costPerUnit: 0.0045, stock: 6000, threshold: 2000, supplier: 'Ferme' };
    render(<IngredientForm ingredient={ingredient} onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText('Nom')).toHaveValue('Tomate');
    expect(screen.getByLabelText('Quantité en stock')).toHaveValue('6000');
    expect(screen.getByLabelText('Coût par unité (\$)')).toHaveValue('0,0045'); // virgule décimale
  });

  test('affiche les erreurs renvoyées par le serveur', () => {
    render(<IngredientForm serverErrors={{ name: 'Un ingrédient porte déjà ce nom.' }} onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Un ingrédient porte déjà ce nom.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toHaveAttribute('aria-invalid', 'true');
  });
});
