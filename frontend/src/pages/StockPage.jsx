/**
 * MiseEnPlace (frontend) — Module M9 : page du stock (tableau, ajout, modification,
 * suppression, alertes de stock bas).
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createIngredient,
  deleteIngredient,
  getErrorMessage,
  getFieldErrors,
  getIngredients,
  updateIngredient,
} from '../api.js';
import { useApi, useDebounced, useDelayedFlag } from '../hooks.js';
import IngredientForm from '../components/IngredientForm.jsx';
import { ErrorMessage, Loading, StatusBadge } from '../components/Feedback.jsx';
import UnitToggle from '../components/UnitToggle.jsx';
import { useStockFormat } from '../units.jsx';

const STATUS_ORDER = { rupture: 0, bas: 1, ok: 2 };
const byText = (key) => (a, b) => a[key].localeCompare(b[key], 'fr') || a.name.localeCompare(b.name, 'fr');
const SORTS = [
  { value: '', label: 'Ordre de la liste', compare: null },
  { value: 'name:asc', label: 'Nom (A → Z)', compare: byText('name') },
  { value: 'name:desc', label: 'Nom (Z → A)', compare: (a, b) => byText('name')(b, a) },
  { value: 'status', label: 'Ruptures et stocks bas', compare: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, 'fr') },
  { value: 'category', label: 'Catégorie', compare: byText('category') },
  { value: 'supplier', label: 'Fournisseur', compare: byText('supplier') },
  { value: 'cost:desc', label: 'Coût unitaire le plus élevé', compare: (a, b) => b.costPerUnit - a.costPerUnit },
  { value: 'recipes:desc', label: 'Les plus utilisés en recettes', compare: (a, b) => b.recipeCount - a.recipeCount || a.name.localeCompare(b.name, 'fr') },
];

export default function StockPage() {
  const { quantity: formatQuantity, unitCost: formatUnitCost } = useStockFormat();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState('');
  const hasFilters = Boolean(search || category || lowOnly || sort);
  const debouncedSearch = useDebounced(search);

  // formMode : null (fermé), 'new' ou l'ingrédient en cours de modification
  const [formMode, setFormMode] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  // Seule la recherche (ingrédient OU recette) interroge le serveur. La catégorie et « stock bas
  // seulement » filtrent la liste déjà reçue : changement instantané, sans clignotement.
  const { data: found, error, loading, reload } = useApi(() => {
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    return getIngredients(params);
  }, [debouncedSearch]);
  const busy = useDelayedFlag(loading);
  const ingredients = useMemo(() => {
    if (!found) return null;
    const list = found.filter((item) => (!category || item.category === category) && (!lowOnly || item.status !== 'ok'));
    const compare = SORTS.find((option) => option.value === sort)?.compare;
    return compare ? [...list].sort(compare) : list;
  }, [found, category, lowOnly, sort]);

  // Les catégories proposées viennent de la liste complète (sans filtre), chargée une fois.
  const { data: allIngredients, reload: reloadAll } = useApi(() => getIngredients(), []);
  const categories = useMemo(
    () => [...new Set((allIngredients ?? []).map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'fr')),
    [allIngredients]
  );
  const suppliers = useMemo(
    () => [...new Set((allIngredients ?? []).map((item) => item.supplier))].sort((a, b) => a.localeCompare(b, 'fr')),
    [allIngredients]
  );

  function refresh() {
    reload();
    reloadAll();
  }

  function closeForm() {
    setFormMode(null);
    setFormErrors({});
  }

  async function handleSubmit(values) {
    setSaving(true);
    setFormErrors({});
    try {
      if (formMode === 'new') {
        const created = await createIngredient(values);
        setMessage({ type: 'success', text: `Ingrédient « ${created.name} » ajouté.` });
      } else {
        const updated = await updateIngredient(formMode.id, values);
        setMessage({ type: 'success', text: `Ingrédient « ${updated.name} » modifié.` });
      }
      closeForm();
      refresh();
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length > 0) {
        setFormErrors(fields);
      } else {
        setMessage({ type: 'error', text: getErrorMessage(err) });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ingredient) {
    if (!window.confirm(`Supprimer « ${ingredient.name} » ?`)) return;
    try {
      const result = await deleteIngredient(ingredient.id);
      setMessage({ type: 'success', text: result.message });
      refresh();
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    }
  }

  return (
    <div className="page">
      <h1>Stock</h1>

      {message && (
        <div className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`} role={message.type === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => setMessage(null)}>
            Fermer
          </button>
        </div>
      )}

      {formMode && (
        <IngredientForm
          key={formMode === 'new' ? 'new' : formMode.id}
          ingredient={formMode === 'new' ? null : formMode}
          categories={categories}
          suppliers={suppliers}
          serverErrors={formErrors}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <form className="filters" onSubmit={(event) => event.preventDefault()} role="search">
        <label>
          Rechercher
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ingrédient ou recette"
            size={28}
          />
        </label>
        <label>
          Catégorie
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Toutes</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trier par
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!hasFilters}
          onClick={() => {
            setSearch('');
            setCategory('');
            setLowOnly(false);
            setSort('');
          }}
        >
          Réinitialiser
        </button>
        <button
          type="button"
          className="btn btn-add"
          disabled={Boolean(formMode)}
          onClick={() => {
            setMessage(null);
            setFormMode('new');
          }}
        >
          Ajouter un ingrédient
        </button>
      </form>

      <p className="hint">
        Astuce : tapez un ingrédient, ou le nom d'une recette pour voir tous les ingrédients qu'elle utilise.
        Plusieurs recherches possibles, séparées par une virgule.
      </p>

      {error && <ErrorMessage message={error} onRetry={reload} />}
      {loading && !found && <Loading label="Chargement du stock…" />}

      {ingredients && (
        <>
          <div className="list-meta">
            <p className="hint" aria-live="polite">
              {ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''}
            </p>
            <label className="checkbox-inline">
              <input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} />
              Stock bas seulement
            </label>
            <UnitToggle />
          </div>
          {ingredients.length === 0 ? (
            <p className="empty">Aucun ingrédient ne correspond à votre recherche.</p>
          ) : (
            <div className={`table-wrap${busy ? ' is-busy' : ''}`}>
              <table className="fixed-table stock-table">
                <colgroup>
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Ingrédient</th>
                    <th scope="col">Catégorie</th>
                    <th scope="col">Statut</th>
                    <th scope="col" className="num">Stock</th>
                    <th scope="col" className="num">Seuil</th>
                    <th scope="col" className="num">Coût unitaire</th>
                    <th scope="col">Fournisseur</th>
                    <th scope="col" className="num">Recettes</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr key={ingredient.id} className={ingredient.status !== 'ok' ? `row-${ingredient.status}` : undefined}>
                      <th scope="row">
                        {ingredient.name}
                        {ingredient.matchedRecipes?.length > 0 && (
                          <span className="match-hint">Utilisé dans : {ingredient.matchedRecipes.join(', ')}</span>
                        )}
                      </th>
                      <td>{ingredient.category}</td>
                      <td><StatusBadge status={ingredient.status} /></td>
                      <td className="num">{formatQuantity(ingredient.stock, ingredient.unit)}</td>
                      <td className="num">{formatQuantity(ingredient.threshold, ingredient.unit)}</td>
                      <td className="num">{formatUnitCost(ingredient.costPerUnit, ingredient.unit)}</td>
                      <td>{ingredient.supplier}</td>
                      <td className="num">
                        {ingredient.recipeCount > 0 ? (
                          <Link
                            to={`/recettes?search=${encodeURIComponent(`"${ingredient.name}"`)}`}
                            aria-label={`Voir les ${ingredient.recipeCount} recette${ingredient.recipeCount > 1 ? 's' : ''} qui utilisent ${ingredient.name}`}
                            title={`Voir les recettes qui utilisent ${ingredient.name}`}
                          >
                            {ingredient.recipeCount}
                          </Link>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-small btn-secondary"
                          aria-label={`Modifier ${ingredient.name}`}
                          onClick={() => {
                            setMessage(null);
                            setFormErrors({});
                            setFormMode(ingredient);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          aria-label={`Supprimer ${ingredient.name}`}
                          onClick={() => handleDelete(ingredient)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
