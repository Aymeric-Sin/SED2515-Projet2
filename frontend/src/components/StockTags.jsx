/**
 * MiseEnPlace (frontend) — Infobulles et étiquettes de stock : « Impossible », triangle
 * d'alerte (stock bas) et détail de l'ingrédient limitant.
 */

import { useEffect, useId, useState } from 'react';
import { useStockFormat } from '../units.jsx';

const TIP_HALF_WIDTH = 190; // moitié de la largeur maximale de l'infobulle (380 px)

/**
 * Infobulle qui s'affiche au survol (souris), au focus (clavier) ou au toucher (mobile).
 * Elle est positionnée avec « position: fixed » pour ne jamais être coupée par un tableau
 * qui défile.
 *
 * @param content    contenu de l'infobulle
 * @param focusable  false si l'enfant est déjà focusable (ex. un lien)
 */
export function Tooltip({ content, children, focusable = true }) {
  const id = useId();
  const [anchor, setAnchor] = useState(null);

  function show(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  }
  const hide = () => setAnchor(null);

  // L'infobulle se ferme si on fait défiler ou redimensionne la page.
  useEffect(() => {
    if (!anchor) return undefined;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [anchor]);

  let style;
  let below = false;
  if (anchor) {
    below = anchor.top < 190; // pas assez de place au-dessus : on affiche en dessous
    const half = Math.min(TIP_HALF_WIDTH, window.innerWidth / 2 - 8); // petit écran : l'infobulle rétrécit
    const left = Math.min(Math.max(anchor.x, half + 8), window.innerWidth - half - 8);
    style = { left, top: below ? anchor.bottom + 8 : anchor.top - 8 };
  }

  return (
    <span
      className="tip"
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={id}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(event) => event.key === 'Escape' && hide()}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={`tip-box${anchor ? ' visible' : ''}${below ? ' below' : ''}`}
        style={style}
      >
        {content}
      </span>
    </span>
  );
}

export function WarningIcon({ size = 20 }) {
  return (
    <svg className="warning-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2.8 1.8 20.8h20.4L12 2.8z" fill="#f4b81f" stroke="#8a5a00" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="11" y="9" width="2" height="6" rx="1" fill="#2b2118" />
      <circle cx="12" cy="17.6" r="1.2" fill="#2b2118" />
    </svg>
  );
}

// Texte d'explication : quels ingrédients manquent (impossible) ou sont bas.
// `item` : { availability, missingIngredients, lowIngredients } (renvoyé par l'API).
export function StockDetails({ item }) {
  const { quantity: formatQuantity } = useStockFormat();
  const missing = item.missingIngredients ?? [];
  const missingIds = new Set(missing.map((m) => m.ingredientId));
  const others = item.lowIngredients.filter((low) => !missingIds.has(low.ingredientId));

  if (item.availability === 'impossible') {
    return (
      <>
        <strong>Impossible à préparer</strong>
        {missing.length > 0 ? (
          <>
            <span className="tip-line">Il manque au moins un ingrédient :</span>
            <ul className="tip-list">
              {missing.map((m) => (
                <li key={m.ingredientId}>
                  <b>{m.name}</b> : {m.status === 'rupture' ? 'en rupture' : `${formatQuantity(m.stock, m.unit)} en stock`},{' '}
                  {formatQuantity(m.neededPerPortion, m.unit)} requis par portion
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span className="tip-line">Cette recette n'a aucun ingrédient.</span>
        )}
        {others.length > 0 && (
          <span className="tip-line">Aussi bas : {others.map((low) => low.name).join(', ')}</span>
        )}
      </>
    );
  }

  return (
    <>
      <strong>Stock bas</strong>
      <ul className="tip-list">
        {item.lowIngredients.map((low) => (
          <li key={low.ingredientId}>
            <b>{low.name}</b> : {formatQuantity(low.stock, low.unit)} (seuil {formatQuantity(low.threshold, low.unit)})
          </li>
        ))}
      </ul>
    </>
  );
}

// Étiquette rouge « Impossible » avec l'ingrédient limitant au survol.
export function ImpossibleTag({ item }) {
  return (
    <Tooltip content={<StockDetails item={item} />}>
      <span className="badge badge-rupture">Impossible</span>
    </Tooltip>
  );
}

// Triangle jaune : au moins un ingrédient de la recette est bas (détail au survol).
export function StockWarning({ item }) {
  return (
    <Tooltip content={<StockDetails item={item} />}>
      <span className="warning-wrap" role="img" aria-label="Stock bas pour un ingrédient de cette recette">
        <WarningIcon />
      </span>
    </Tooltip>
  );
}
