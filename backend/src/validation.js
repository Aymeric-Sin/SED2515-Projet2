/**
 * MiseEnPlace (backend) — Module M6 : validation des données reçues.
 *
 * validateIngredient retourne les erreurs champ par champ, pour que le frontend puisse
 * indiquer exactement quel champ du formulaire est fautif.
 */

const UNITS = ['g', 'ml', 'unité'];

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// Règles de chaque champ : retourne un message d'erreur, ou null si la valeur est valide.
const RULES = {
  name: (v) => {
    if (!isText(v)) return 'Le nom est obligatoire.';
    if (v.trim().length > 80) return 'Le nom ne doit pas dépasser 80 caractères.';
    return null;
  },
  category: (v) => {
    if (!isText(v)) return 'La catégorie est obligatoire.';
    if (v.trim().length > 60) return 'La catégorie ne doit pas dépasser 60 caractères.';
    return null;
  },
  unit: (v) => (UNITS.includes(v) ? null : `L'unité doit être : ${UNITS.join(', ')}.`),
  costPerUnit: (v) => {
    if (!isNumber(v)) return 'Le coût par unité doit être un nombre.';
    if (v <= 0) return 'Le coût par unité doit être supérieur à 0.';
    if (v > 100000) return 'Le coût par unité est trop élevé.';
    return null;
  },
  stock: (v) => {
    if (!isNumber(v)) return 'Le stock doit être un nombre.';
    if (v < 0) return 'Le stock ne peut pas être négatif.';
    return null;
  },
  threshold: (v) => {
    if (!isNumber(v)) return "Le seuil d'alerte doit être un nombre.";
    if (v < 0) return "Le seuil d'alerte ne peut pas être négatif.";
    return null;
  },
  supplier: (v) => {
    if (!isText(v)) return 'Le fournisseur est obligatoire.';
    if (v.trim().length > 80) return 'Le fournisseur ne doit pas dépasser 80 caractères.';
    return null;
  },
};

const INGREDIENT_FIELDS = Object.keys(RULES);

/**
 * @param {object} input corps de la requête
 * @param {{partial?: boolean}} options partial = true pour un PUT : seuls les champs
 *        présents sont vérifiés (on peut modifier juste le stock).
 * @returns {{isValid: boolean, errors: object, value: object}} value = champs nettoyés
 */
function validateIngredient(input, { partial = false } = {}) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = {};
  const value = {};

  for (const field of INGREDIENT_FIELDS) {
    const provided = body[field] !== undefined;
    if (!provided) {
      if (!partial) errors[field] = 'Ce champ est obligatoire.';
      continue;
    }
    const message = RULES[field](body[field]);
    if (message) {
      errors[field] = message;
    } else {
      value[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }

  if (partial && Object.keys(value).length === 0 && Object.keys(errors).length === 0) {
    errors.body = 'Aucun champ à modifier.';
  }

  return { isValid: Object.keys(errors).length === 0, errors, value };
}

const RECIPE_CATEGORIES = ['Entrée', 'Plat', 'Dessert', 'Boisson'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Valide une recette à ajouter : { name, category, price, portions, ingredients: [{ ingredientId, quantity }] }.
 * Les quantités sont celles de la recette ENTIÈRE (400 g pour 4 portions).
 *
 * @param {object} input corps de la requête
 * @param {object[]} ingredients ingrédients existants (un ingrédient doit exister et n'être utilisé qu'une fois)
 * @returns {{isValid: boolean, errors: object, value: object}} errors.lines = { "0": { ingredientId, quantity } }
 *          donne les erreurs ligne par ligne (index de la ligne dans la liste).
 */
function validateRecipe(input, ingredients) {
  const body = isPlainObject(input) ? input : {};
  const errors = {};
  const value = {};

  if (!isText(body.name)) errors.name = 'Le nom est obligatoire.';
  else if (body.name.trim().length > 80) errors.name = 'Le nom ne doit pas dépasser 80 caractères.';
  else value.name = body.name.trim();

  if (!RECIPE_CATEGORIES.includes(body.category)) {
    errors.category = `La catégorie doit être : ${RECIPE_CATEGORIES.join(', ')}.`;
  } else {
    value.category = body.category;
  }

  if (!isNumber(body.price)) errors.price = 'Le prix de vente doit être un nombre.';
  else if (body.price <= 0) errors.price = 'Le prix de vente doit être supérieur à 0.';
  else if (body.price > 10000) errors.price = 'Le prix de vente est trop élevé.';
  else value.price = body.price;

  if (!isNumber(body.portions) || !Number.isInteger(body.portions)) {
    errors.portions = 'Le nombre de portions doit être un nombre entier.';
  } else if (body.portions < 1) {
    errors.portions = 'La recette doit donner au moins 1 portion.';
  } else if (body.portions > 1000) {
    errors.portions = 'Le nombre de portions est trop élevé.';
  } else {
    value.portions = body.portions;
  }

  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    errors.ingredients = 'Ajoutez au moins un ingrédient.';
  } else if (body.ingredients.length > 50) {
    errors.ingredients = 'Une recette ne peut pas avoir plus de 50 ingrédients.';
  } else {
    const known = new Set(ingredients.map((ingredient) => ingredient.id));
    const seen = new Set();
    const lineErrors = {};
    const lines = [];

    body.ingredients.forEach((line, index) => {
      const item = isPlainObject(line) ? line : {};
      const lineError = {};

      if (!isText(item.ingredientId) || !known.has(item.ingredientId)) {
        lineError.ingredientId = 'Choisissez un ingrédient de la liste.';
      } else if (seen.has(item.ingredientId)) {
        lineError.ingredientId = 'Cet ingrédient est déjà dans la recette.';
      } else {
        seen.add(item.ingredientId);
      }

      if (!isNumber(item.quantity)) lineError.quantity = 'La quantité doit être un nombre.';
      else if (item.quantity <= 0) lineError.quantity = 'La quantité doit être supérieure à 0.';
      else if (item.quantity > 1000000) lineError.quantity = 'La quantité est trop élevée.';

      if (Object.keys(lineError).length > 0) lineErrors[index] = lineError;
      else lines.push({ ingredientId: item.ingredientId, quantity: item.quantity });
    });

    if (Object.keys(lineErrors).length > 0) errors.lines = lineErrors;
    else value.ingredients = lines;
  }

  return { isValid: Object.keys(errors).length === 0, errors, value };
}

module.exports = { UNITS, INGREDIENT_FIELDS, RECIPE_CATEGORIES, validateIngredient, validateRecipe };
