/**
 * MiseEnPlace (frontend) — Page d'ajout d'une recette (nom, catégorie, prix, portions et lignes
 * d'ingrédients). Les quantités sont pour toute la recette, dans l'unité de l'ingrédient.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRecipe, getErrorMessage, getFieldErrors, getIngredients } from '../api.js';
import { useApi } from '../hooks.js';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';
import { parseDecimal } from '../utils/number.js';

export const RECIPE_CATEGORIES = ['Entrée', 'Plat', 'Dessert', 'Boisson'];

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), ingredientId: '', quantity: '' });

export default function RecipeFormPage() {
  const navigate = useNavigate();
  const { data: ingredients, error: loadError, reload } = useApi(() => getIngredients(), []);

  const [values, setValues] = useState({ name: '', category: 'Plat', price: '', portions: '1' });
  const [lines, setLines] = useState(() => [emptyLine()]);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const sorted = [...(ingredients ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const unitOf = (id) => sorted.find((item) => item.id === id)?.unit ?? '';

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function setLine(index, patch) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    setLineErrors((current) => ({ ...current, [index]: undefined }));
    setErrors((current) => ({ ...current, ingredients: undefined }));
  }

  function removeLine(index) {
    setLines((current) => (current.length === 1 ? [emptyLine()] : current.filter((_, i) => i !== index)));
    setLineErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      name: values.name.trim(),
      category: values.category,
      price: parseDecimal(values.price),
      portions: parseDecimal(values.portions),
      ingredients: lines.map((line) => ({ ingredientId: line.ingredientId, quantity: parseDecimal(line.quantity) })),
    };

    // Vérifications simples côté navigateur ; le serveur revérifie tout.
    const found = {};
    const foundLines = {};
    if (!payload.name) found.name = 'Le nom est obligatoire.';
    if (payload.price === undefined || Number.isNaN(payload.price)) found.price = 'Entrez un prix.';
    if (payload.portions === undefined || Number.isNaN(payload.portions)) found.portions = 'Entrez un nombre de portions.';
    payload.ingredients.forEach((line, index) => {
      const problem = {};
      if (!line.ingredientId) problem.ingredientId = 'Choisissez un ingrédient.';
      if (line.quantity === undefined || Number.isNaN(line.quantity)) problem.quantity = 'Entrez une quantité.';
      if (Object.keys(problem).length > 0) foundLines[index] = problem;
    });
    setErrors(found);
    setLineErrors(foundLines);
    if (Object.keys(found).length > 0 || Object.keys(foundLines).length > 0) return;

    setSaving(true);
    try {
      const created = await createRecipe(payload);
      navigate('/recettes', { state: { notice: `Recette « ${created.name} » ajoutée.` } });
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length > 0) {
        const { lines: serverLines, ...rest } = fields;
        setErrors(rest);
        setLineErrors(serverLines ?? {});
      } else {
        setErrors({ body: getErrorMessage(err) });
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = (name) => `form-field${errors[name] ? ' has-error' : ''}`;
  const errorText = (name) => errors[name] && <span className="field-error">{errors[name]}</span>;

  return (
    <div className="page">
      <p>
        <Link to="/recettes" className="link-pill">← Retour aux recettes</Link>
      </p>
      <h1>Ajouter une recette</h1>

      {loadError && <ErrorMessage message={loadError} onRetry={reload} />}
      {!ingredients && !loadError && <Loading label="Chargement des ingrédients…" />}

      {ingredients && (
        <form className="card recipe-form" onSubmit={handleSubmit} noValidate aria-label="Ajouter une recette">
          <div className="form-grid">
            <div className={fieldClass('name')}>
              <label htmlFor="rec-name">Nom de la recette</label>
              <input id="rec-name" value={values.name} maxLength={80} autoFocus onChange={(e) => setValue('name', e.target.value)} />
              {errorText('name')}
            </div>
            <div className={fieldClass('category')}>
              <label htmlFor="rec-category">Catégorie</label>
              <select id="rec-category" value={values.category} onChange={(e) => setValue('category', e.target.value)}>
                {RECIPE_CATEGORIES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {errorText('category')}
            </div>
            <div className={fieldClass('price')}>
              <label htmlFor="rec-price">Prix de vente par portion ($)</label>
              <input id="rec-price" type="text" inputMode="decimal" value={values.price} onChange={(e) => setValue('price', e.target.value)} />
              {errorText('price')}
            </div>
            <div className={fieldClass('portions')}>
              <label htmlFor="rec-portions">Nombre de portions</label>
              <input id="rec-portions" type="text" inputMode="numeric" value={values.portions} onChange={(e) => setValue('portions', e.target.value)} />
              {errorText('portions')}
            </div>
          </div>

          <h2>Ingrédients</h2>
          <p className="hint">La quantité est pour toute la recette (ex. : 400 g pour 4 portions), dans l'unité de l'ingrédient.</p>
          <div className="line-rows">
            {lines.map((line, index) => {
              const problem = lineErrors[index] ?? {};
              return (
                <div className="line-row" key={line.key}>
                  <div className={`form-field${problem.ingredientId ? ' has-error' : ''}`}>
                    <label htmlFor={`rec-ing-${index}`}>Ingrédient {index + 1}</label>
                    <select id={`rec-ing-${index}`} value={line.ingredientId} onChange={(e) => setLine(index, { ingredientId: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {sorted.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                      ))}
                    </select>
                    {problem.ingredientId && <span className="field-error">{problem.ingredientId}</span>}
                  </div>
                  <div className={`form-field${problem.quantity ? ' has-error' : ''}`}>
                    <label htmlFor={`rec-qty-${index}`}>Quantité {unitOf(line.ingredientId) && `(${unitOf(line.ingredientId)})`}</label>
                    <input id={`rec-qty-${index}`} type="text" inputMode="decimal" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} />
                    {problem.quantity && <span className="field-error">{problem.quantity}</span>}
                  </div>
                  <button type="button" className="btn btn-small btn-danger" aria-label={`Retirer l'ingrédient ${index + 1}`} onClick={() => removeLine(index)}>
                    Retirer
                  </button>
                </div>
              );
            })}
          </div>
          {errors.ingredients && <p className="field-error">{errors.ingredients}</p>}
          <p>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setLines((current) => [...current, emptyLine()])}>
              + Ajouter un ingrédient
            </button>
          </p>

          {errors.body && <p className="field-error">{errors.body}</p>}
          <div className="form-actions">
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la recette'}</button>
            <Link to="/recettes" className="btn btn-secondary">Annuler</Link>
          </div>
        </form>
      )}
    </div>
  );
}
