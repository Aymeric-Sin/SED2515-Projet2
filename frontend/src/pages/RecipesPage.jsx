/**
 * MiseEnPlace (frontend) — Module M8 : page des recettes (liste, recherche, filtre, tri).
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getRecipes } from '../api.js';
import { useApi, useDebounced, useDelayedFlag } from '../hooks.js';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';
import { ImpossibleTag, StockWarning, WarningIcon } from '../components/StockTags.jsx';
import { formatMoney, formatPercent, marginTone } from '../utils/format.js';

const CATEGORIES = ['Entrée', 'Plat', 'Dessert', 'Boisson'];

const SORTS = [
  { value: '', label: 'Ordre de la carte' },
  { value: 'name:asc', label: 'Nom (A → Z)' },
  { value: 'margin:desc', label: 'Marge la plus haute' },
  { value: 'margin:asc', label: 'Marge la plus basse' },
  { value: 'cost:desc', label: 'Coût le plus élevé' },
  { value: 'cost:asc', label: 'Coût le plus bas' },
  { value: 'foodCost:desc', label: 'Coût matière le plus élevé' },
  { value: 'price:desc', label: 'Prix le plus élevé' },
];

export default function RecipesPage() {
  // La recherche peut venir de l'adresse (ex. /recettes?search="Tomate" depuis la page Stock).
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const debouncedSearch = useDebounced(search);
  const notice = useLocation().state?.notice; // ex. « Recette ajoutée » après la création

  const { data: recipes, error, loading, reload } = useApi(() => {
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (category) params.category = category;
    if (sort) {
      const [field, order] = sort.split(':');
      params.sort = field;
      params.order = order;
    }
    return getRecipes(params);
  }, [debouncedSearch, category, sort]);

  const busy = useDelayedFlag(loading);
  const hasFilters = Boolean(search || category || sort);

  return (
    <div className="page">
      <h1>Recettes</h1>

      {notice && (
        <div className="alert alert-success" role="status">
          <span>{notice}</span>
        </div>
      )}

      <form className="filters" onSubmit={(event) => event.preventDefault()} role="search">
        <label>
          Rechercher
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Recette ou ingrédient"
            size={32}
          />
        </label>
        <label>
          Catégorie
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Toutes</option>
            {CATEGORIES.map((name) => (
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
            setSort('');
          }}
        >
          Réinitialiser
        </button>
        <Link to="/recettes/nouvelle" className="btn btn-add">
          Ajouter une recette
        </Link>
      </form>

      <p className="hint">
        Astuce : cherchez par nom de recette ou d'ingrédient. Séparez plusieurs ingrédients par une virgule
        (ex. : tomate, basilic) ; un nom entre guillemets (ex. "Tomate") cherche le nom exact.
      </p>

      {error && <ErrorMessage message={error} onRetry={reload} />}
      {loading && !recipes && <Loading label="Chargement des recettes…" />}

      {recipes && (
        <>
          <div className="list-meta">
            <p className="hint" aria-live="polite">
              {recipes.length} recette{recipes.length > 1 ? 's' : ''}
            </p>
            <p className="hint legend">
              <span className="badge badge-rupture">Impossible</span> au moins un ingrédient manque ·{' '}
              <WarningIcon size={16} /> au moins un ingrédient est bas. Survolez pour voir lequel.
            </p>
          </div>
          {recipes.length === 0 ? (
            <p className="empty">Aucune recette ne correspond à votre recherche.</p>
          ) : (
            <div className={`table-wrap${busy ? ' is-busy' : ''}`}>
              <table className="fixed-table">
                <colgroup>
                  <col style={{ width: '27%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '4%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Recette</th>
                    <th scope="col">Catégorie</th>
                    <th scope="col" className="num">Prix</th>
                    <th scope="col" className="num">Coût / portion</th>
                    <th scope="col" className="num">Marge</th>
                    <th scope="col" className="num">Coût matière</th>
                    <th scope="col" className="num">Portions possibles</th>
                    <th scope="col" className="alert-col">
                      <span className="sr-only">Alerte de stock</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => (
                    <tr key={recipe.id}>
                      <th scope="row">
                        <Link to={`/recettes/${recipe.id}`}>{recipe.name}</Link>
                        {recipe.matchedIngredients?.length > 0 && (
                          <span className="match-hint">Contient : {recipe.matchedIngredients.join(', ')}</span>
                        )}
                      </th>
                      <td>{recipe.category}</td>
                      <td className="num">{formatMoney(recipe.price)}</td>
                      <td className="num">{formatMoney(recipe.costPerPortion)}</td>
                      <td className={`num tone-${marginTone(recipe.marginPercent)}`}>
                        {formatMoney(recipe.margin)} ({formatPercent(recipe.marginPercent)})
                      </td>
                      <td className="num">{formatPercent(recipe.foodCostPercent)}</td>
                      <td className="num">
                        {recipe.availability === 'impossible' ? <ImpossibleTag item={recipe} /> : recipe.possiblePortions}
                      </td>
                      <td className="alert-col">
                        {recipe.availability === 'bas' && <StockWarning item={recipe} />}
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
