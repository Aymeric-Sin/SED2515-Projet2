/**
 * MiseEnPlace (frontend) — Lecture des nombres tapés dans les formulaires.
 *
 * Le point et la virgule sont acceptés comme séparateur décimal (1.05 = 1,05), et les espaces
 * sont ignorés (« 1 000,5 »). Tout le reste (lettres, « 1,2,3 », « 1e3 ») est refusé.
 */

// Retourne un nombre, undefined si le champ est vide, ou NaN si le texte n'est pas un nombre.
export function parseDecimal(text) {
  const cleaned = String(text ?? '').replace(/[\s  ]/g, '');
  if (cleaned === '') return undefined;
  const normalized = cleaned.replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

// Nombre -> texte pour un champ de formulaire, avec la virgule décimale (0.0045 -> « 0,0045 »).
export function toInputText(value) {
  return String(value).replace('.', ',');
}
