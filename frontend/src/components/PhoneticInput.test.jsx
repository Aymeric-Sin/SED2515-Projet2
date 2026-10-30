import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhoneticInput from './PhoneticInput.jsx';

function Wrapper() {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="c">Catégorie</label>
      <PhoneticInput id="c" name="category" value={value} options={['Légumes', 'Viandes', 'Épicerie']} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('PhoneticInput', () => {
  it('propose une valeur existante qui sonne pareil et la choisit au clic', () => {
    render(<Wrapper />);
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'Legum' } });
    fireEvent.mouseDown(screen.getByRole('option', { name: /Légumes/ }));
    expect(screen.getByTestId('value')).toHaveTextContent('Légumes');
  });

  it('affiche « Vouliez-vous dire » pour une faute de prononciation', () => {
    render(<Wrapper />);
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'Vyandes' } });
    fireEvent.click(screen.getByRole('button', { name: /Viandes/ }));
    expect(screen.getByTestId('value')).toHaveTextContent('Viandes');
  });

  it('choisit au clavier (flèche bas + Entrée)', () => {
    render(<Wrapper />);
    const input = screen.getByLabelText('Catégorie');
    fireEvent.change(input, { target: { value: 'v' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('value')).toHaveTextContent('Viandes');
  });
});
