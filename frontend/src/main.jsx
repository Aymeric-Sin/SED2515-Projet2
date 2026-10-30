/**
 * MiseEnPlace (frontend) — Point d'entrée de l'application React.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { UnitsProvider } from './units.jsx';
import './App.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UnitsProvider>
        <App />
      </UnitsProvider>
    </BrowserRouter>
  </StrictMode>
);
