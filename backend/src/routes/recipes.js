/**
 * MiseEnPlace (backend) — Module M4 : routes des recettes (lecture, ajout et suppression).
 *
 *   GET /api/recipes       liste (recherche par nom de recette ou d'ingrédient, filtre et tri
 *                          facultatifs ; ?search=tomate, basilic = recettes avec les deux)
 *   GET /api/recipes/:id   détail avec les coûts calculés ligne par ligne
 *   POST /api/recipes      ajout d'une recette (201), champs vérifiés ligne par ligne (400)
 *   DELETE /api/recipes/:id suppression d'une recette (200, ou 404)
 */

const express = require('express');
const { readDb, writeDb, nextRecipeId } = require('../dataService');
const {
  computeRecipe,
  indexById,
  matchRecipeSearch,
  normalizeText,
  parseSearchTerms,
  toRecipeSummary,
} = require('../calculations');
const { validateRecipe } = require('../validation');
const { HttpError } = require('../errors');

const router = express.Router();

// Paramètre ?sort= accepté, et champ de la recette qu'il désigne.
const SORT_FIELDS = {
  name: 'name',
  price: 'price',
  cost: 'costPerPortion',
  margin: 'margin',
  marginPercent: 'marginPercent',
  foodCost: 'foodCostPercent',
};

router.get('/', (req, res) => {
  const { search, category, sort, order } = req.query;

  if (sort !== undefined && !SORT_FIELDS[sort]) {
    throw new HttpError(400, `Tri invalide. Valeurs possibles : ${Object.keys(SORT_FIELDS).join(', ')}.`);
  }
  if (order !== undefined && order !== 'asc' && order !== 'desc') {
    throw new HttpError(400, "Ordre invalide. Valeurs possibles : asc, desc.");
  }

  const db = readDb();
  const ingredientsById = indexById(db.ingredients);

  const terms = parseSearchTerms(search);

  // La recherche porte sur le nom de la recette ET sur les noms de ses ingrédients.
  let recipes = [];
  for (const recipe of db.recipes) {
    const { matches, matchedIngredients } = matchRecipeSearch(recipe, ingredientsById, terms);
    if (!matches) continue;
    const computed = computeRecipe(recipe, ingredientsById);
    recipes.push({
      ...toRecipeSummary(computed),
      possiblePortions: computed.possiblePortions,
      availability: computed.availability,
      bottleneck: computed.bottleneck,
      lowIngredients: computed.lowIngredients,
      missingIngredients: computed.missingIngredients,
      matchedIngredients,
    });
  }

  if (category) {
    recipes = recipes.filter((recipe) => recipe.category === category);
  }
  if (sort) {
    const field = SORT_FIELDS[sort];
    const direction = order === 'desc' ? -1 : 1;
    recipes.sort((a, b) =>
      field === 'name' ? direction * a.name.localeCompare(b.name, 'fr') : direction * (a[field] - b[field])
    );
  }

  res.json(recipes);
});

router.get('/:id', (req, res) => {
  const db = readDb();
  const recipe = db.recipes.find((item) => item.id === req.params.id);
  if (!recipe) {
    throw new HttpError(404, `Recette introuvable : ${req.params.id}`);
  }
  res.json(computeRecipe(recipe, indexById(db.ingredients)));
});

router.post('/', (req, res) => {
  const db = readDb();
  const { errors, value } = validateRecipe(req.body, db.ingredients);

  // Deux recettes ne peuvent pas porter le même nom (sans tenir compte des accents ni des majuscules).
  if (value.name) {
    const wanted = normalizeText(value.name);
    if (db.recipes.some((recipe) => normalizeText(recipe.name) === wanted)) {
      errors.name = 'Une recette porte déjà ce nom.';
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, 'Données invalides.', errors);
  }

  const recipe = { id: nextRecipeId(db.recipes), ...value };
  db.recipes.push(recipe);
  writeDb(db);

  res.status(201).json(computeRecipe(recipe, indexById(db.ingredients)));
});

router.delete('/:id', (req, res) => {
  const db = readDb();
  const index = db.recipes.findIndex((recipe) => recipe.id === req.params.id);
  if (index === -1) {
    throw new HttpError(404, `Recette introuvable : ${req.params.id}`);
  }

  const [removed] = db.recipes.splice(index, 1);
  writeDb(db);

  res.json({ message: `Recette « ${removed.name} » supprimée.`, id: removed.id });
});

module.exports = router;
