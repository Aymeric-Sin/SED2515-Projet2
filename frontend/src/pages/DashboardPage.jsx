/**
 * MiseEnPlace (frontend) — Module M10 : tableau de bord (cartes et barres faites en CSS).
 */

import { Link } from 'react-router-dom';
import { getStats } from '../api.js';
import { useApi } from '../hooks.js';
import { ErrorMessage, Loading, StatusBadge } from '../components/Feedback.jsx';
import { StockDetails, Tooltip } from '../components/StockTags.jsx';
import UnitToggle from '../components/UnitToggle.jsx';
import { useStockFormat } from '../units.jsx';
import { formatMoney, formatPercent, marginTone } from '../utils/format.js';

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card${tone ? ` stat-${tone}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Barre horizontale : la largeur est la valeur en pourcentage du maximum.
function Bar({ label, to, value, max, text, tone }) {
  const width = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <li className="bar-row">
      <Link to={to} className="bar-label link-pill">
        {label}
      </Link>
      <div className="bar-track" aria-hidden="true">
        <div className={`bar-fill bar-${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span className="bar-text">{text}</span>
    </li>
  );
}

export default function DashboardPage() {
  const { data: stats, error, loading, reload } = useApi(getStats);
  const { quantity: formatQuantity } = useStockFormat();

  if (loading && !stats) return <Loading label="Chargement du tableau de bord…" />;
  if (error && !stats) return <ErrorMessage message={error} onRetry={reload} />;

  const maxMargin = Math.max(...stats.topRecipes.map((r) => r.margin), 0);

  return (
    <div className="page">
      <h1>Tableau de bord</h1>
      {error && <ErrorMessage message={error} onRetry={reload} />}

      <section className="stat-grid" aria-label="Chiffres clés">
        <StatCard label="Recettes" value={stats.recipeCount} />
        <StatCard label="Ingrédients" value={stats.ingredientCount} />
        <StatCard
          label="À commander"
          value={stats.lowStockCount}
          tone={stats.lowStockCount > 0 ? 'warn' : 'good'}
        />
        <StatCard
          label="En rupture"
          value={stats.outOfStockCount}
          tone={stats.outOfStockCount > 0 ? 'bad' : 'good'}
        />
        <StatCard label="Marge moyenne" value={formatPercent(stats.averageMarginPercent)} />
        <StatCard label="Valeur du stock" value={formatMoney(stats.stockValue)} />
      </section>

      <div className="dash-row">
        <section className="card">
          <h2>Recettes les plus rentables</h2>
          <p className="hint">Marge par portion (prix de vente moins coût de revient).</p>
          <ul className="bars">
            {stats.topRecipes.map((recipe) => (
              <Bar
                key={recipe.id}
                label={recipe.name}
                to={`/recettes/${recipe.id}`}
                value={recipe.margin}
                max={maxMargin}
                text={`${formatMoney(recipe.margin)} (${formatPercent(recipe.marginPercent)})`}
                tone="good"
              />
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Coût matière le plus élevé</h2>
          <p className="hint">Part du prix de vente qui sert à payer les ingrédients.</p>
          <ul className="bars">
            {stats.highestFoodCost.map((recipe) => (
              <Bar
                key={recipe.id}
                label={recipe.name}
                to={`/recettes/${recipe.id}`}
                value={recipe.foodCostPercent}
                max={100}
                text={formatPercent(recipe.foodCostPercent)}
                tone={marginTone(recipe.marginPercent) === 'good' ? 'warn' : 'bad'}
              />
            ))}
          </ul>
        </section>
      </div>


      <div className="dash-row dash-row-bottom">
      <section className="card">
        <div className="card-header">
          <h2>Ingrédients à commander</h2>
          <span className="card-tools">
            <UnitToggle />
            <Link to="/stock" className="link-pill">
              Voir le stock
            </Link>
          </span>
        </div>
        {stats.alerts.length === 0 ? (
          <p>Aucune alerte : tous les stocks sont au-dessus de leur seuil.</p>
        ) : (
          <div className="table-wrap">
            <table className="fixed-table alerts-table">
              <colgroup>
                <col style={{ width: '29%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '24%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Ingrédient</th>
                  <th scope="col">Statut</th>
                  <th scope="col" className="num">Stock</th>
                  <th scope="col" className="num">Seuil</th>
                  <th scope="col">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {stats.alerts.map((alert) => (
                  <tr key={alert.id}>
                    <th scope="row">{alert.name}</th>
                    <td><StatusBadge status={alert.status} /></td>
                    <td className="num">{formatQuantity(alert.stock, alert.unit)}</td>
                    <td className="num">{formatQuantity(alert.threshold, alert.unit)}</td>
                    <td>{alert.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

        <div className="stack">
      <section className="card">
        <h2>Recettes à surveiller</h2>
        {stats.recipesAtRisk.length === 0 ? (
          <p>Toutes les recettes peuvent être préparées avec un stock suffisant.</p>
        ) : (
          <>
            <p className="hint legend">
              <span className="legend-item">
                <span className="chip-dot chip-impossible" /> Impossible à préparer (au moins un ingrédient manque)
              </span>
              <span className="legend-item">
                <span className="chip-dot chip-bas" /> Stock bas pour au moins un ingrédient
              </span>
              <span>Survolez une recette pour voir l'ingrédient en cause.</span>
            </p>
            <ul className="chip-list">
              {stats.recipesAtRisk.map((recipe) => (
                <li key={recipe.id}>
                  <Tooltip focusable={false} content={<StockDetails item={recipe} />}>
                    <Link to={`/recettes/${recipe.id}`} className={`chip chip-${recipe.availability}`}>
                      {recipe.name}
                    </Link>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

        <section className="card">
          <h2>Marge moyenne par catégorie</h2>
          <ul className="bars bars-compact">
            {stats.byCategory.map((group) => (
              <li className="bar-row" key={group.category}>
                <span className="bar-label">
                  {group.category} ({group.count})
                </span>
                <div className="bar-track" aria-hidden="true">
                  <div
                    className={`bar-fill bar-${marginTone(group.averageMarginPercent)}`}
                    style={{ width: `${Math.min(100, group.averageMarginPercent)}%` }}
                  />
                </div>
                <span className="bar-text">{formatPercent(group.averageMarginPercent)}</span>
              </li>
            ))}
          </ul>
        </section>

        </div>
      </div>
    </div>
  );
}
