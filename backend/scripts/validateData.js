/**
 * MiseEnPlace (backend) — Module M12 : script de vérification de db.json.
 *
 * Utilisation (à lancer avant chaque commit) :
 *   npm run validate-data                 vérifie data/db.json
 *   node scripts/validateData.js fichier  vérifie un autre fichier
 *
 * Vérifie : identifiants uniques, champs non vides, unités permises, valeurs positives,
 * et que chaque ingrédient d'une recette existe vraiment dans la liste des ingrédients.
 * Code de sortie 0 = données correctes, 1 = au moins une erreur.
 */

const fs = require('fs');
const path = require('path');
const { validateIngredient } = require('../src/validation');
const { computeRecipe, indexById, normalizeText } = require('../src/calculations');

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateDatabase(db) {
  const errors = [];
  const warnings = [];

  if (!db || !Array.isArray(db.ingredients) || !Array.isArray(db.recipes)) {
    errors.push('Le fichier doit contenir les listes "ingredients" et "recipes".');
    return { errors, warnings };
  }

  // --- Ingrédients ---
  const ingredientIds = new Set();
  const ingredientNames = new Set();
  for (const ingredient of db.ingredients) {
    const label = `Ingrédient ${ingredient.id ?? '(sans id)'}`;

    if (!isText(ingredient.id)) {
      errors.push(`${label} : identifiant manquant.`);
    } else if (ingredientIds.has(ingredient.id)) {
      errors.push(`${label} : identifiant en double.`);
    }
    ingredientIds.add(ingredient.id);

    const { errors: fieldErrors } = validateIngredient(ingredient);
    for (const [field, message] of Object.entries(fieldErrors)) {
      errors.push(`${label} (${field}) : ${message}`);
    }

    const normalizedName = normalizeText(ingredient.name);
    if (normalizedName && ingredientNames.has(normalizedName)) {
      errors.push(`${label} : le nom « ${ingredient.name} » existe déjà.`);
    }
    ingredientNames.add(normalizedName);
  }

  // --- Recettes ---
  const recipeIds = new Set();
  const usedIngredientIds = new Set();
  for (const recipe of db.recipes) {
    const label = `Recette ${recipe.id ?? '(sans id)'}`;

    if (!isText(recipe.id)) {
      errors.push(`${label} : identifiant manquant.`);
    } else if (recipeIds.has(recipe.id)) {
      errors.push(`${label} : identifiant en double.`);
    }
    recipeIds.add(recipe.id);

    if (!isText(recipe.name)) errors.push(`${label} : nom manquant.`);
    if (!isText(recipe.category)) errors.push(`${label} : catégorie manquante.`);
    if (typeof recipe.price !== 'number' || !(recipe.price > 0)) {
      errors.push(`${label} : le prix de vente doit être un nombre positif.`);
    }
    if (!Number.isInteger(recipe.portions) || recipe.portions < 1) {
      errors.push(`${label} : le nombre de portions doit être un entier d'au moins 1.`);
    }

    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      errors.push(`${label} : la recette doit avoir au moins un ingrédient.`);
      continue;
    }

    const seenInRecipe = new Set();
    for (const line of recipe.ingredients) {
      if (!ingredientIds.has(line.ingredientId)) {
        errors.push(`${label} : l'ingrédient « ${line.ingredientId} » n'existe pas.`);
      }
      if (seenInRecipe.has(line.ingredientId)) {
        errors.push(`${label} : l'ingrédient « ${line.ingredientId} » est répété.`);
      }
      seenInRecipe.add(line.ingredientId);
      usedIngredientIds.add(line.ingredientId);

      if (typeof line.quantity !== 'number' || !(line.quantity > 0)) {
        errors.push(`${label} : la quantité de « ${line.ingredientId} » doit être positive.`);
      }
    }
  }

  // --- Avertissements (ne bloquent pas) ---
  for (const ingredient of db.ingredients) {
    if (!usedIngredientIds.has(ingredient.id)) {
      warnings.push(`Ingrédient « ${ingredient.name} » : utilisé dans aucune recette.`);
    }
  }
  if (errors.length === 0) {
    const byId = indexById(db.ingredients);
    for (const recipe of db.recipes) {
      const computed = computeRecipe(recipe, byId);
      if (computed.margin < 0) {
        warnings.push(`Recette « ${recipe.name} » : le coût dépasse le prix de vente.`);
      }
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  const file = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, '..', 'data', 'db.json');

  let db;
  try {
    db = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    console.error(`Impossible de lire ${file} : ${error.message}`);
    process.exit(1);
  }

  const { errors, warnings } = validateDatabase(db);
  warnings.forEach((message) => console.warn(`Avertissement : ${message}`));
  errors.forEach((message) => console.error(`Erreur : ${message}`));

  if (errors.length > 0) {
    console.error(`\n${errors.length} erreur(s) dans ${file}`);
    process.exit(1);
  }
  console.log(
    `OK : ${db.ingredients.length} ingrédients et ${db.recipes.length} recettes vérifiés (${warnings.length} avertissement(s)).`
  );
}

module.exports = { validateDatabase };
