/**
 * MiseEnPlace (frontend) — Champ texte avec propositions par ressemblance de prononciation
 * (catégorie, fournisseur). Motif ARIA « combobox » : flèches + Entrée au clavier.
 */

import { useId, useMemo, useState } from 'react';
import { bestCorrection, suggest } from '../utils/phonetic.js';

export default function PhoneticInput({ id, name, value, options, onChange, error, ...rest }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const suggestions = useMemo(() => suggest(value, options, 6), [value, options]);
  const correction = useMemo(() => (value.trim() ? bestCorrection(value, options) : null), [value, options]);
  // Pas de liste quand le texte est déjà exactement une valeur existante.
  const showList = open && suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].kind === 'exact');

  function choose(text) {
    onChange(text);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' && showList && active >= 0) {
      event.preventDefault();
      choose(suggestions[active].text);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="phonetic">
      <input
        id={id}
        name={name}
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? 'true' : undefined}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        {...rest}
      />
      {showList && (
        <ul className="suggestions" id={listId} role="listbox">
          {suggestions.map((item, index) => (
            <li
              key={item.text}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'active' : undefined}
              onMouseDown={(event) => {
                event.preventDefault(); // garde le focus dans le champ
                choose(item.text);
              }}
            >
              {item.text}
              {(item.kind === 'phonetique' || item.kind === 'proche') && <span className="sounds-like">sonne comme</span>}
            </li>
          ))}
        </ul>
      )}
      {correction && (
        <span className="field-hint">
          Vouliez-vous dire{' '}
          <button type="button" className="link-button" onClick={() => choose(correction)}>
            « {correction} »
          </button>{' '}
          ?
        </span>
      )}
    </div>
  );
}
