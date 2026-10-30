/**
 * MiseEnPlace (frontend) — Module M8 : page de détail d'une recette (coûts ligne par ligne).
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteRecipe, getErrorMessage, getRecipe } from '../api.js';
import { useApi } from '../hooks.js';
import { ErrorMessage, Loading, StatusBadge } from '../components/Feedback.jsx';
import { StockDetails } from '../components/StockTags.jsx';
import UnitToggle from '../components/UnitToggle.jsx';
import { useStockFormat } from '../units.jsx';
import {
  formatMoney,
  formatPercent,
  marginTone,
} from '../utils/format.js';

// Repère, dans le tableau, l'ingrédient manquant ou celui qui limite les portions.
function LineBadge({ recipe, line }) {
  const isMissing = (recipe.missingIngredients ?? []).some((m) => m.ingredientId === line.ingredientId);
  if (recipe.availability === 'impossible' && isMissing) {
    return <span className="badge badge-rupture badge-inline">Manquant</span>;
  }
  if (recipe.availability === 'bas' && recipe.bottleneck?.ingredientId === line.ingredientId) {
    return <span className="badge badge-limit">Limite les portions</span>;
  }
  return null;
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState('');
  const { quantity: formatQuantity, unitCost: formatUnitCost } = useStockFormat();
  const { data: recipe, error, loading, reload } = useApi(() => getRecipe(id), [id]);

  async function handleDelete() {
    if (!window.confirm(`Supprimer la recette « ${recipe.name} » ?`)) return;
    try {
      await deleteRecipe(recipe.id);
      navigate('/recettes', { state: { notice: `Recette « ${recipe.name} » supprimée.` } });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <p>
        <Link to="/recettes" className="link-pill">← Retour aux recettes</Link>
      </p>
      {deleteError && <ErrorMessage message={deleteError} />}

      {loading && !recipe && <Loading label="Chargement de la recette…" />}
      {error && <ErrorMessage message={error} onRetry={reload} />}

      {recipe && (
        <>
          <div className="page-header">
            <h1>{recipe.name}</h1>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Supprimer la recette
            </button>
          </div>
          <p className="hint">
            {recipe.category} · recette pour {recipe.portions} portion{recipe.portions > 1 ? 's' : ''}
          </p>

          {recipe.availability === 'impossible' && (
            <div className="alert alert-error" role="status">
              <span>
                <StockDetails item={recipe} />
              </span>
            </div>
          )}
          {recipe.availability === 'bas' && (
            <div className="alert alert-warn" role="status">
              <span>
                <StockDetails item={recipe} />
              </span>
            </div>
          )}

          <section className="stat-grid" aria-label="Résumé financier">
            <div className="stat-card">
              <span className="stat-value">{formatMoney(recipe.price)}</span>
              <span className="stat-label">Prix de vente</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatMoney(recipe.costPerPortion)}</span>
              <span className="stat-label">Coût de revient / portion</span>
            </div>
            <div className={`stat-card stat-${marginTone(recipe.marginPercent)}`}>
              <span className="stat-value">{formatMoney(recipe.margin)}</span>
              <span className="stat-label">Marge / portion ({formatPercent(recipe.marginPercent)})</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatPercent(recipe.foodCostPercent)}</span>
              <span className="stat-label">Coût matière</span>
            </div>
            <div className={`stat-card${recipe.possiblePortions === 0 ? ' stat-bad' : ''}`}>
              <span className="stat-value">{recipe.possiblePortions}</span>
              <span className="stat-label">Portions possibles avec le stock</span>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h2>Ingrédients</h2>
              <UnitToggle />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Ingrédient</th>
                    <th scope="col" className="num">Quantité (recette)</th>
                    <th scope="col" className="num">Coût unitaire</th>
                    <th scope="col" className="num">Coût</th>
                    <th scope="col" className="num">En stock</th>
                    <th scope="col">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.lines.map((line) => (
                    <tr key={line.ingredientId}>
                      <th scope="row">
                        {line.name}
                        <LineBadge recipe={recipe} line={line} />
                      </th>
                      <td className="num">{formatQuantity(line.quantity, line.unit)}</td>
                      <td className="num">{formatUnitCost(line.costPerUnit, line.unit)}</td>
                      <td className="num">{formatMoney(line.lineCost)}</td>
                      <td className="num">{formatQuantity(line.stock, line.unit)}</td>
                      <td><StatusBadge status={line.stockStatus} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={3}>Coût total de la recette</th>
                    <td className="num">{formatMoney(recipe.totalCost)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
