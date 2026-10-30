/**
 * MiseEnPlace (frontend) — Correspondance phonétique (français) pour les champs
 * « Catégorie » et « Fournisseur » du formulaire d'ingrédient.
 *
 * Idée : deux écritures qui se prononcent presque pareil (« Gatino » et « Gatineau »,
 * « Ferm du Lak » et « Ferme du Lac ») donnent la même « clé phonétique ». On compare donc les
 * sons plutôt que l'orthographe, ce qui évite de créer une nouvelle catégorie ou un nouveau
 * fournisseur à cause d'une faute de frappe.
 *
 * L'algorithme est volontairement simple (dans l'esprit de Soundex / Phonex, adapté au français) :
 *   1. on enlève les lettres finales muettes (s, t, d, p, x, z, e) ;
 *   2. on remplace les groupes de lettres par un seul son (ch, ph, eau, ou, gn, qu, ...) ;
 *   3. on repère les voyelles nasales (an, on, in) ;
 *   4. on garde la première lettre puis seulement les consonnes (les voyelles sont les plus
 *      variables à l'écrit).
 */

// Minuscules, sans accents, ponctuation remplacée par des espaces : « Saint-Louis » -> « saint louis ».
export function normalizeForSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ç/g, 's') // avant la suppression des accents, sinon « ç » deviendrait « c » (son « k »)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Clé phonétique d'UN mot déjà normalisé (voir normalizeForSearch).
export function phoneticWord(word) {
  let w = String(word ?? '');
  if (w === '') return '';
  if (/^\d+$/.test(w)) return w; // les nombres restent tels quels

  // 1. Lettres finales muettes (« gros », « lait », « petit », « ferme »). Les mots très courts
  //    (3 lettres ou moins) sont laissés intacts.
  while (w.length > 3 && /[eszxtdp]$/.test(w)) w = w.slice(0, -1);

  // 2. Lettres doubles : « poisson » = « poison » à l'oreille.
  w = w.replace(/(.)\1+/g, '$1');

  // 3. Groupes de lettres qui font un seul son.
  w = w
    .replace(/sch|ch/g, 's')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/gn/g, 'n')
    .replace(/h/g, '') // « h » muet
    .replace(/oeu|oe/g, 'e')
    .replace(/eau|au/g, 'o')
    .replace(/ou/g, 'u')
    .replace(/y/g, 'i');

  // 4. Consonnes : un son = une lettre.
  w = w
    .replace(/qu|q|ck|k/g, 'k')
    .replace(/gu(?=[ei])/g, 'g')
    .replace(/g(?=[ei])/g, 'j')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/w/g, 'v');

  // 5. Voyelles nasales : « an/en » = @, « on » = §, « in/ain/un » = 5. Seulement si la voyelle
  //    n'est pas suivie d'une autre voyelle (« gatino » : le « n » se prononce, ce n'est pas nasal).
  w = w
    .replace(/(?:ain|aim|ein|eim|in|im|un|um)(?![aeiouy])/g, '5')
    .replace(/(?:an|am|en|em)(?![aeiouy])/g, '@')
    .replace(/(?:on|om)(?![aeiouy])/g, '§');

  // 6. Squelette : première lettre, puis seulement les consonnes et les nasales.
  return w.slice(0, 1) + w.slice(1).replace(/[aeiou]/g, '');
}

// Clé phonétique d'un texte : une clé par mot, séparées par des espaces.
export function phoneticKey(text) {
  return normalizeForSearch(text)
    .split(' ')
    .map(phoneticWord)
    .filter(Boolean)
    .join(' ');
}

// Nombre de modifications (ajout, retrait, remplacement d'une lettre) pour passer de a à b.
export function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

/**
 * Propositions pour ce qui est tapé, parmi les valeurs existantes (les mieux classées d'abord) :
 *   exact (100) > début du texte (90) > début d'un mot (80) > contient (70)
 *   > même prononciation (65 : mots entiers, 55 : début d'un mot) > prononciation proche (40).
 * `kind` vaut 'exact', 'ecriture', 'phonetique' ou 'proche'.
 * Sans texte, retourne la liste complète par ordre alphabétique.
 */
export function suggest(query, options, limit = 6) {
  const unique = [...new Set((options ?? []).filter((option) => typeof option === 'string' && option.trim()))];
  const q = normalizeForSearch(query);

  if (!q) {
    return unique
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .slice(0, limit)
      .map((text) => ({ text, score: 0, kind: 'liste' }));
  }

  const queryKeys = q.split(' ').map(phoneticWord);
  const results = [];

  for (const text of unique) {
    const normalized = normalizeForSearch(text);
    const words = normalized.split(' ');
    const keys = words.map(phoneticWord);
    let score = 0;
    let kind = '';

    if (normalized === q) {
      score = 100;
      kind = 'exact';
    } else if (normalized.startsWith(q)) {
      score = 90;
      kind = 'ecriture';
    } else if (words.some((_, index) => words.slice(index).join(' ').startsWith(q))) {
      score = 80;
      kind = 'ecriture';
    } else if (normalized.includes(q)) {
      score = 70;
      kind = 'ecriture';
    } else if (queryKeys.every((key) => key && keys.some((k) => k === key || (key.length >= 2 && k.startsWith(key))))) {
      score = queryKeys.every((key) => keys.includes(key)) ? 65 : 55;
      kind = 'phonetique';
    } else if (queryKeys.every((key) => key.length >= 3 && keys.some((k) => levenshtein(k, key) <= 1))) {
      score = 40;
      kind = 'proche';
    }

    if (score > 0) results.push({ text, score, kind });
  }

  return results.sort((a, b) => b.score - a.score || a.text.localeCompare(b.text, 'fr')).slice(0, limit);
}

// « Vouliez-vous dire … ? » : la valeur existante qui SONNE comme ce qui est tapé (pas un simple
// début de mot), ou null si le texte est déjà une valeur existante ou n'y ressemble pas.
export function bestCorrection(query, options) {
  const [best] = suggest(query, options, 1);
  return best && (best.kind === 'phonetique' || best.kind === 'proche') ? best.text : null;
}

// Si le texte est une valeur existante à l'accent ou à la majuscule près (« epicerie » pour
// « Épicerie »), on réutilise l'écriture existante au lieu de créer un doublon.
export function canonicalize(value, options) {
  const text = String(value ?? '').trim();
  const normalized = normalizeForSearch(text);
  if (!normalized) return text;
  const existing = (options ?? []).find((option) => normalizeForSearch(option) === normalized);
  return existing ?? text;
}
