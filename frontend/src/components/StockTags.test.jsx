/**
 * MiseEnPlace (frontend) — Tests Vitest des infobulles de stock (ingrédient limitant).
 */

import { describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImpossibleTag, StockDetails, StockWarning } from './StockTags.jsx';

const impossible = {
  availability: 'impossible',
  possiblePortions: 0,
  bottleneck: { ingredientId: 'ing_031', name: 'Biscuits boudoirs', unit: 'g', stock: 0, neededPerPortion: 33.33, status: 'rupture' },
  missingIngredients: [
    { ingredientId: 'ing_031', name: 'Biscuits boudoirs', unit: 'g', stock: 0, neededPerPortion: 33.33, status: 'rupture' },
    { ingredientId: 'ing_099', name: 'Cacao', unit: 'g', stock: 5, neededPerPortion: 20, status: 'ok' },
  ],
  lowIngredients: [
    { ingredientId: 'ing_024', name: 'Mascarpone', unit: 'g', stock: 400, threshold: 500, status: 'bas' },
    { ingredientId: 'ing_031', name: 'Biscuits boudoirs', unit: 'g', stock: 0, threshold: 300, status: 'rupture' },
  ],
};

const low = {
  availability: 'bas',
  possiblePortions: 12,
  bottleneck: { ingredientId: 'ing_006', name: 'Champignon blanc', unit: 'g', stock: 1500, neededPerPortion: 125, status: 'bas' },
  lowIngredients: [{ ingredientId: 'ing_006', name: 'Champignon blanc', unit: 'g', stock: 1500, threshold: 2000, status: 'bas' }],
};

describe('StockDetails', () => {
  test('impossible : liste tous les ingrédients manquants et les autres ingrédients bas', () => {
    render(<StockDetails item={impossible} />);
    expect(screen.getByText('Impossible à préparer')).toBeInTheDocument();
    expect(screen.getByText('Il manque au moins un ingrédient :')).toBeInTheDocument();
    expect(screen.getByText('Biscuits boudoirs')).toBeInTheDocument();
    expect(screen.getByText('Cacao')).toBeInTheDocument();
    expect(screen.getByText(/en rupture/)).toBeInTheDocument();
    expect(screen.getByText(/Aussi bas : Mascarpone/)).toBeInTheDocument();
  });

  test('stock bas : liste chaque ingrédient bas avec son seuil', () => {
    render(<StockDetails item={low} />);
    expect(screen.getByText('Stock bas')).toBeInTheDocument();
    expect(screen.getByText('Champignon blanc')).toBeInTheDocument();
    expect(screen.getByText(/seuil/)).toBeInTheDocument();
  });
});

describe('ImpossibleTag et StockWarning', () => {
  test('l\'infobulle « Impossible » s\'affiche au survol et se ferme à la sortie', () => {
    render(<ImpossibleTag item={impossible} />);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).not.toHaveClass('visible');

    const trigger = screen.getByText('Impossible').parentElement;
    fireEvent.mouseEnter(trigger);
    expect(tooltip).toHaveClass('visible');
    expect(tooltip).toHaveTextContent('Il manque au moins un ingrédient');

    fireEvent.mouseLeave(trigger);
    expect(tooltip).not.toHaveClass('visible');
  });

  test('le triangle d\'alerte est accessible au clavier et affiche le détail au focus', () => {
    render(<StockWarning item={low} />);
    const trigger = screen.getByRole('img', { name: /Stock bas/ }).parentElement;
    expect(trigger).toHaveAttribute('tabindex', '0');
    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip')).toHaveClass('visible');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.getByRole('tooltip')).not.toHaveClass('visible');
  });
});
