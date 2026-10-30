/**
 * MiseEnPlace (frontend) — Bouton à deux positions : quantités en g/ml ou en kg/L.
 */

import { useUnits } from '../units.jsx';

const OPTIONS = [
  { value: 'base', label: 'g / ml' },
  { value: 'large', label: 'kg / L' },
];

export default function UnitToggle() {
  const { mode, setMode } = useUnits();
  return (
    <div className="unit-toggle" role="group" aria-label="Unités d'affichage des quantités">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={mode === option.value ? 'active' : ''}
          aria-pressed={mode === option.value}
          onClick={() => setMode(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
