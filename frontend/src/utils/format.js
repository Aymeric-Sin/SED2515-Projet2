/**
 * MiseEnPlace (frontend) — Fonctions d'affichage (argent, pourcentages, quantités, statuts).
 */

const money = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
const number = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 });

export function formatMoney(value) {
  return money.format(Number.isFinite(value) ? value : 0);
}

// Un coût par gramme comme 0,0045 $ doit garder ses décimales.
export function formatUnitCost(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatPercent(value) {
  return `${number.format(Number.isFinite(value) ? value : 0)} %`;
}

export function formatQuantity(value, unit) {
  return `${number.format(value)} ${unit}`;
}

/**
 * Affichage des quantités en « petites » unités (g, ml) ou en « grandes » (kg, L).
 * mode : 'base' (g, ml) ou 'large' (kg, L). Les unités (« unité ») ne changent jamais.
 */
const LARGE_UNIT = { g: 'kg', ml: 'L' };
const largeNumber = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 3 });

export function canConvertUnit(unit) {
  return unit in LARGE_UNIT;
}

export function formatQuantityIn(value, unit, mode = 'base') {
  if (mode === 'large' && canConvertUnit(unit)) {
    return `${largeNumber.format(value / 1000)} ${LARGE_UNIT[unit]}`;
  }
  return formatQuantity(value, unit);
}

// Coût par unité : 0,0045 $ / g devient 4,50 $ / kg en mode « grandes unités ».
export function formatUnitCostIn(value, unit, mode = 'base') {
  if (mode === 'large' && canConvertUnit(unit)) return `${formatUnitCost(value * 1000)} / ${LARGE_UNIT[unit]}`;
  return `${formatUnitCost(value)} / ${unit}`;
}

const STATUS_LABELS = { ok: 'OK', bas: 'Stock bas', rupture: 'Rupture' };

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

// Couleur de la marge : vert au-dessus de 65 %, orange jusqu'à 50 %, rouge en dessous.
export function marginTone(marginPercent) {
  if (marginPercent >= 65) return 'good';
  if (marginPercent >= 50) return 'warn';
  return 'bad';
}
