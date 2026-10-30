/**
 * MiseEnPlace (frontend) — Module M9 : formulaire d'ajout / modification d'un ingrédient
 * (composant contrôlé : chaque champ est lu et écrit dans un état React).
 */

import { useState } from 'react';
import { parseDecimal, toInputText } from '../utils/number.js';
import { canonicalize } from '../utils/phonetic.js';
import PhoneticInput from './PhoneticInput.jsx';

export const UNITS = ['g', 'ml', 'unité'];

const EMPTY = {
  name: '',
  category: '',
  unit: 'g',
  costPerUnit: '',
  stock: '',
  threshold: '',
  supplier: '',
};

// Les champs numériques restent du texte dans le formulaire ; on les convertit à l'envoi
// (point ou virgule acceptés : 1.05 = 1,05).
function toPayload(values) {
  const number = parseDecimal;
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    unit: values.unit,
    costPerUnit: number(values.costPerUnit),
    stock: number(values.stock),
    threshold: number(values.threshold),
    supplier: values.supplier.trim(),
  };
}

function fromIngredient(ingredient) {
  if (!ingredient) return EMPTY;
  return {
    name: ingredient.name,
    category: ingredient.category,
    unit: ingredient.unit,
    costPerUnit: toInputText(ingredient.costPerUnit),
    stock: toInputText(ingredient.stock),
    threshold: toInputText(ingredient.threshold),
    supplier: ingredient.supplier,
  };
}

/**
 * @param ingredient     ingrédient à modifier (absent = ajout)
 * @param categories     catégories existantes (propositions par ressemblance de prononciation)
 * @param suppliers      fournisseurs existants (idem)
 * @param serverErrors   erreurs champ par champ renvoyées par l'API
 * @param onSubmit       reçoit les valeurs nettoyées
 */
export default function IngredientForm({ ingredient, categories = [], suppliers = [], serverErrors = {}, saving, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => fromIngredient(ingredient));
  const [localErrors, setLocalErrors] = useState({});
  const errors = { ...serverErrors, ...localErrors };

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setLocalErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = toPayload(values);
    // « epicerie » devient « Épicerie » si elle existe déjà (pas de doublon à cause d'un accent).
    payload.category = canonicalize(payload.category, categories);
    payload.supplier = canonicalize(payload.supplier, suppliers);
    const found = {};
    for (const [field, label] of [['name', 'Le nom'], ['category', 'La catégorie'], ['supplier', 'Le fournisseur']]) {
      if (!payload[field]) found[field] = `${label} est obligatoire.`;
    }
    for (const field of ['costPerUnit', 'stock', 'threshold']) {
      if (payload[field] === undefined || Number.isNaN(payload[field])) found[field] = 'Entrez un nombre.';
    }
    setLocalErrors(found);
    if (Object.keys(found).length === 0) onSubmit(payload);
  }

  function field(name, label, props = {}) {
    const error = errors[name];
    return (
      <div className={`form-field${error ? ' has-error' : ''}`}>
        <label htmlFor={`ing-${name}`}>{label}</label>
        <input
          id={`ing-${name}`}
          name={name}
          value={values[name]}
          onChange={handleChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `ing-${name}-error` : undefined}
          {...props}
        />
        {error && (
          <span className="field-error" id={`ing-${name}-error`}>
            {error}
          </span>
        )}
      </div>
    );
  }

  // Champ avec propositions par prononciation (« Gatino » propose « Gatineau »).
  function phonetic(name, label, options, maxLength) {
    const error = errors[name];
    return (
      <div className={`form-field${error ? ' has-error' : ''}`}>
        <label htmlFor={`ing-${name}`}>{label}</label>
        <PhoneticInput
          id={`ing-${name}`}
          name={name}
          value={values[name]}
          options={options}
          error={error}
          maxLength={maxLength}
          aria-describedby={error ? `ing-${name}-error` : undefined}
          onChange={(text) => {
            setValues((current) => ({ ...current, [name]: text }));
            setLocalErrors((current) => ({ ...current, [name]: undefined }));
          }}
        />
        {error && (
          <span className="field-error" id={`ing-${name}-error`}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <form className="card ingredient-form" onSubmit={handleSubmit} noValidate aria-label={ingredient ? "Modifier l'ingrédient" : 'Ajouter un ingrédient'}>
      <h2>{ingredient ? `Modifier « ${ingredient.name} »` : 'Ajouter un ingrédient'}</h2>
      <div className="form-grid">
        {field('name', 'Nom', { type: 'text', maxLength: 80, autoFocus: true })}
        {phonetic('category', 'Catégorie', categories, 60)}

        <div className={`form-field${errors.unit ? ' has-error' : ''}`}>
          <label htmlFor="ing-unit">Unité</label>
          <select id="ing-unit" name="unit" value={values.unit} onChange={handleChange}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {errors.unit && <span className="field-error">{errors.unit}</span>}
          <span className="field-hint">Quantités et coût saisis dans cette unité (g, ml ou unité).</span>
        </div>

        {field('costPerUnit', 'Coût par unité ($)', { type: 'text', inputMode: 'decimal', placeholder: 'Ex. : 0,0045 ou 0.0045' })}
        {field('stock', 'Quantité en stock', { type: 'text', inputMode: 'decimal' })}
        {field('threshold', "Seuil d'alerte", { type: 'text', inputMode: 'decimal' })}
        {phonetic('supplier', 'Fournisseur', suppliers, 80)}
      </div>

      {errors.body && <p className="field-error">{errors.body}</p>}

      <div className="form-actions">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
