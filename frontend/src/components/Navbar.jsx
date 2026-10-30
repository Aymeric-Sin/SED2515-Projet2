/**
 * MiseEnPlace (frontend) — Barre de navigation fixe en haut de la page.
 * Le bouton burger ouvre / ferme les liens :
 *   - sur ordinateur (768 px et plus) : les liens apparaissent / disparaissent de la barre
 *     (ouverts par défaut) ;
 *   - sur mobile : les liens s'ouvrent dans un panneau sous la barre (fermé par défaut).
 */

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks.js';

const LINKS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/recettes', label: 'Recettes' },
  { to: '/stock', label: 'Stock' },
];

const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

export default function Navbar() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(isDesktop);
  const location = useLocation();

  // Quand on passe de mobile à ordinateur (ou l'inverse), on revient à l'état par défaut.
  useEffect(() => {
    setOpen(isDesktop);
  }, [isDesktop]);

  // Sur mobile, le panneau se referme après un changement de page.
  useEffect(() => {
    if (!isDesktop) setOpen(false);
  }, [location.pathname, isDesktop]);

  // Sur mobile, la touche Échap referme le panneau.
  useEffect(() => {
    if (isDesktop || !open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDesktop, open]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          <svg className="brand-logo" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#b4411c" />
            <circle cx="32" cy="17" r="3.5" fill="#fff" />
            <path d="M13 44a19 19 0 0 1 38 0z" fill="#fff" />
            <rect x="9" y="47" width="46" height="5" rx="2.5" fill="#fff" />
          </svg>
          MiseEnPlace
        </Link>

        <div className="header-right">
          <nav id="main-nav" className={`main-nav${open ? ' open' : ''}`} aria-label="Navigation principale">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className={`burger${open ? ' open' : ''}`}
            aria-expanded={open}
            aria-controls="main-nav"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
