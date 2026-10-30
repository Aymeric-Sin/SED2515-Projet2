/**
 * MiseEnPlace (frontend) — Choix d'affichage des quantités : g/ml ou kg/L.
 *
 * Le choix est gardé dans le navigateur (localStorage) et partagé par toutes les pages
 * grâce à un contexte React. Les données du serveur restent toujours en g / ml.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { formatQuantityIn, formatUnitCostIn } from './utils/format.js';

const KEY = 'miseenplace-units';
const UnitsContext = createContext({ mode: 'base', setMode: () => {} });

function readStoredMode() {
  try {
    return localStorage.getItem(KEY) === 'large' ? 'large' : 'base';
  } catch {
    return 'base';
  }
}

export function UnitsProvider({ children, initialMode }) {
  const [mode, setModeState] = useState(initialMode ?? readStoredMode);
  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite seulement */
    }
  }, []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export const useUnits = () => useContext(UnitsContext);

// Fonctions d'affichage déjà réglées sur le mode choisi.
export function useStockFormat() {
  const { mode } = useUnits();
  return useMemo(
    () => ({
      quantity: (value, unit) => formatQuantityIn(value, unit, mode),
      unitCost: (value, unit) => formatUnitCostIn(value, unit, mode),
    }),
    [mode]
  );
}
