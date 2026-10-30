/**
 * MiseEnPlace (frontend) — Tests Vitest de la barre de navigation (bouton burger).
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar.jsx';

// jsdom n'a pas matchMedia : on simule un écran d'ordinateur ou de mobile.
function mockScreen(isDesktop) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: isDesktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

afterEach(() => {
  delete window.matchMedia;
});

describe('Navbar', () => {
  test('ordinateur : les liens sont ouverts par défaut et le burger les ferme', () => {
    mockScreen(true);
    renderNavbar();
    const burger = screen.getByRole('button', { name: 'Fermer le menu' });
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('main-nav')).toHaveClass('open');

    fireEvent.click(burger);
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('main-nav')).not.toHaveClass('open');
  });

  test('mobile : le menu est fermé par défaut, le burger l\'ouvre et Échap le ferme', () => {
    mockScreen(false);
    renderNavbar();
    const burger = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(burger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(burger);
    expect(document.getElementById('main-nav')).toHaveClass('open');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('main-nav')).not.toHaveClass('open');
  });

  test('contient les trois liens de navigation', () => {
    mockScreen(true);
    renderNavbar();
    for (const name of ['Tableau de bord', 'Recettes', 'Stock']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });
});
