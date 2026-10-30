/**
 * MiseEnPlace (backend) — Module M5 : routes des ingrédients (CRUD, gestion du stock).
 *
 *   GET    /api/ingredients       liste (recherche, catégorie, stock bas facultatifs ; la recherche
 *                                 accepte un nom d'ingrédient ou un nom de recette : voir searchIngredients)
 *   POST   /api/ingredients       ajout (201)
 *   PUT    /api/ingredients/:id   modification, complète ou partielle (200)
 *   DELETE /api/ingredients/:id   suppression, refusée (409) si une recette l'utilise
 */

const express = require('express');
const { readDb, writeDb, nextIngredientId } = require('../dataService');
const { stockStatus, normalizeText, parseSearchTerms, searchIngredients } = require('../calculations');
const { validateIngredient } = require('../validation');
const { HttpError } = require('../errors');

const router = express.Router();

function recipesUsing(db, ingredientId) {
  return db.recipes.filter((recipe) =>
    recipe.ingredients.some((line) => line.ingredientId === ingredientId)
  );
}

// Ingrédient + informations calculées (statut du stock, nombre de recettes qui l'utilisent).
function present(db, ingredient) {
  return {
    ...ingredient,
    status: stockStatus(ingredient),
    recipeCount: recipesUsing(db, ingredient.id).length,
  };
}

function isNameTaken(db, name, exceptId) {
  const wanted = normalizeText(name);
  return db.ingredients.some(
    (ingredient) => ingredient.id !== exceptId && normalizeText(ingredient.name) === wanted
  );
}

router.get('/', (req, res) => {
  const { search, category, lowStock } = req.query;
  const db = readDb();

  // La recherche porte sur le nom de l'ingrédient, ou sur le nom d'une recette (on obtient alors
  // tous les ingrédients de cette recette ; `matchedRecipes` dit quelle recette les a fait trouver).
  const found = searchIngredients(db.ingredients, db.recipes, parseSearchTerms(search));
  let ingredients = found.map(({ ingredient, matchedRecipes }) => ({
    ...present(db, ingredient),
    matchedRecipes,
  }));

  if (category) {
    ingredients = ingredients.filter((ingredient) => ingredient.category === category);
  }
  if (lowStock === 'true') {
    ingredients = ingredients.filter((ingredient) => ingredient.status !== 'ok');
  }

  res.json(ingredients);
});

router.post('/', (req, res) => {
  const { isValid, errors, value } = validateIngredient(req.body);
  if (!isValid) {
    throw new HttpError(400, 'Données invalides.', errors);
  }

  const db = readDb();
  if (isNameTaken(db, value.name)) {
    throw new HttpError(400, 'Données invalides.', { name: 'Un ingrédient porte déjà ce nom.' });
  }

  const ingredient = { id: nextIngredientId(db.ingredients), ...value };
  db.ingredients.push(ingredient);
  writeDb(db);

  res.status(201).json(present(db, ingredient));
});

router.put('/:id', (req, res) => {
  const db = readDb();
  const index = db.ingredients.findIndex((ingredient) => ingredient.id === req.params.id);
  if (index === -1) {
    throw new HttpError(404, `Ingrédient introuvable : ${req.params.id}`);
  }

  const { isValid, errors, value } = validateIngredient(req.body, { partial: true });
  if (!isValid) {
    throw new HttpError(400, 'Données invalides.', errors);
  }
  if (value.name && isNameTaken(db, value.name, req.params.id)) {
    throw new HttpError(400, 'Données invalides.', { name: 'Un ingrédient porte déjà ce nom.' });
  }

  db.ingredients[index] = { ...db.ingredients[index], ...value };
  writeDb(db);

  res.json(present(db, db.ingredients[index]));
});

router.delete('/:id', (req, res) => {
  const db = readDb();
  const index = db.ingredients.findIndex((ingredient) => ingredient.id === req.params.id);
  if (index === -1) {
    throw new HttpError(404, `Ingrédient introuvable : ${req.params.id}`);
  }

  const ingredient = db.ingredients[index];
  const usedBy = recipesUsing(db, ingredient.id);
  if (usedBy.length > 0) {
    const names = usedBy.map((recipe) => recipe.name);
    throw new HttpError(
      409,
      `Impossible de supprimer « ${ingredient.name} » : cet ingrédient est utilisé dans ${names.length} recette(s).`,
      { recipes: names }
    );
  }

  db.ingredients.splice(index, 1);
  writeDb(db);

  res.json({ message: `Ingrédient « ${ingredient.name} » supprimé.`, id: ingredient.id });
});

module.exports = router;
