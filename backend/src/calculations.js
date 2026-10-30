/**
 * MiseEnPlace (backend) — Modules M2 et M3 : calculs (coût de revient, marge, % de coût
 * matière, portions possibles, ingrédient limitant, alertes de stock) et statistiques du tableau de bord.
 *
 * Toutes les fonctions sont « pures » : elles reçoivent des données et retournent un
 * résultat, sans lire ni écrire de fichier. C'est ce qui permet de les tester avec Jest.
 *
 * Convention : la quantité d'un ingrédient dans une recette est la quantité pour la
 * recette ENTIÈRE (ex. 400 g de spaghetti pour 4 portions = 100 g par portion).
 */

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Minuscules et sans accents, pour que « epinards » trouve « Épinards ».
function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// « tomate, basilic » -> deux termes, séparés par des virgules (sans accents ni majuscules).
// Un terme entre guillemets, comme "Tomate", désigne un ingrédient au nom EXACT : il ne
// trouve pas « Sauce tomate ». Les guillemets protègent aussi une virgule du nom (« Lait 3,25 % »).
// Retourne une liste de { text, exact }.
function parseSearchTerms(search) {
  const tokens = String(search ?? '').match(/\s*"[^"]*"?|[^,]+/g) ?? [];
  return tokens
    .map((token) => token.trim())
    .map((token) =>
      token.startsWith('"')
        ? { text: normalizeText(token.replace(/^"|"$/g, '')), exact: true }
        : { text: normalizeText(token), exact: false }
    )
    .filter((term) => term.text !== '');
}

function indexById(list) {
  return new Map(list.map((item) => [item.id, item]));
}

// Recherche d'une recette : CHAQUE terme doit se trouver dans le nom de la recette ou dans
// le nom d'un de ses ingrédients (nom exact pour un terme entre guillemets, voir
// parseSearchTerms). Retourne aussi les ingrédients trouvés, pour l'affichage.
function matchRecipeSearch(recipe, ingredientsById, terms) {
  if (terms.length === 0) return { matches: true, matchedIngredients: [] };

  const recipeName = normalizeText(recipe.name);
  const ingredientNames = recipe.ingredients
    .map((line) => ingredientsById.get(line.ingredientId)?.name)
    .filter(Boolean)
    .map((name) => ({ name, normalized: normalizeText(name) }));

  const ingredientMatches = (item, term) =>
    term.exact ? item.normalized === term.text : item.normalized.includes(term.text);

  const matches = terms.every(
    (term) =>
      (!term.exact && recipeName.includes(term.text)) || ingredientNames.some((item) => ingredientMatches(item, term))
  );
  const matchedIngredients = ingredientNames
    .filter((item) => terms.some((term) => ingredientMatches(item, term)))
    .map((item) => item.name);

  return { matches, matchedIngredients };
}

// Recherche dans la page Stock : un terme peut être un nom d'ingrédient OU un nom de recette.
//   - si au moins un ingrédient porte ce nom (« tomate »), on affiche ces ingrédients ;
//   - sinon, on cherche une recette de ce nom (« tiramisu ») et on affiche TOUS ses ingrédients.
// Un nom d'ingrédient est donc prioritaire : « tomate » ne ramène pas toute la bruschetta.
// Plusieurs termes (séparés par des virgules) s'additionnent : on garde l'union des résultats.
// Retourne, dans l'ordre des ingrédients, { ingredient, matchedRecipes } où matchedRecipes
// donne les recettes qui ont fait trouver l'ingrédient (vide pour une recherche par nom d'ingrédient).
function searchIngredients(ingredients, recipes, terms) {
  const entries = ingredients.map((ingredient) => ({ ingredient, matchedRecipes: [] }));
  if (terms.length === 0) return entries;

  const entryById = new Map(entries.map((entry) => [entry.ingredient.id, entry]));
  const nameMatches = (name, term) =>
    term.exact ? normalizeText(name) === term.text : normalizeText(name).includes(term.text);
  const kept = new Set();

  for (const term of terms) {
    const byIngredientName = ingredients.filter((ingredient) => nameMatches(ingredient.name, term));
    if (byIngredientName.length > 0) {
      byIngredientName.forEach((ingredient) => kept.add(ingredient.id));
      continue;
    }
    for (const recipe of recipes.filter((item) => nameMatches(item.name, term))) {
      for (const line of recipe.ingredients) {
        const entry = entryById.get(line.ingredientId);
        if (!entry) continue; // ingrédient inconnu : ignoré
        kept.add(line.ingredientId);
        if (!entry.matchedRecipes.includes(recipe.name)) entry.matchedRecipes.push(recipe.name);
      }
    }
  }

  return entries.filter((entry) => kept.has(entry.ingredient.id));
}

// 'rupture' : plus rien en stock. 'bas' : sous le seuil d'alerte. 'ok' : sinon.
function stockStatus(ingredient) {
  if (ingredient.stock <= 0) return 'rupture';
  if (ingredient.stock < ingredient.threshold) return 'bas';
  return 'ok';
}

function findIngredient(byId, ingredientId) {
  const ingredient = byId.get(ingredientId);
  if (!ingredient) {
    throw new Error(`Ingrédient introuvable : ${ingredientId}`);
  }
  return ingredient;
}

// Analyse du stock d'une recette : combien de portions on peut encore préparer, quel
// ingrédient limite (le « goulot »), quels ingrédients manquent (stock insuffisant pour
// une portion) et quels ingrédients sont bas ou en rupture.
//   availability : 'impossible' (0 portion), 'bas' (au moins un ingrédient bas), 'ok'.
function analyzeStock(recipe, ingredients) {
  const byId = ingredients instanceof Map ? ingredients : indexById(ingredients);
  let limit = Infinity;
  let bottleneck = null;
  const lowIngredients = [];
  const missingIngredients = [];

  for (const line of recipe.ingredients) {
    const ingredient = findIngredient(byId, line.ingredientId);
    const status = stockStatus(ingredient);
    if (status !== 'ok') {
      lowIngredients.push({
        ingredientId: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock,
        threshold: ingredient.threshold,
        status,
      });
    }

    const perPortion = line.quantity / recipe.portions;
    if (perPortion <= 0) continue; // une quantité de 0 ne limite rien
    const portions = ingredient.stock / perPortion;
    const detail = {
      ingredientId: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      stock: ingredient.stock,
      neededPerPortion: round2(perPortion),
      status,
    };
    // Manquant : le stock ne suffit pas pour une seule portion (plusieurs ingrédients
    // peuvent manquer en même temps).
    if (Math.floor(portions + 1e-9) === 0) {
      missingIngredients.push({ ...detail, ratio: portions });
    }
    if (portions < limit) {
      limit = portions;
      bottleneck = detail;
    }
  }

  // Le 1e-9 évite qu'une erreur d'arrondi (2,9999999) fasse perdre une portion.
  const possiblePortions = Number.isFinite(limit) ? Math.floor(limit + 1e-9) : 0;
  let availability = 'ok';
  if (possiblePortions === 0) availability = 'impossible';
  else if (lowIngredients.length > 0) availability = 'bas';

  // Les plus manquants d'abord ; le champ interne « ratio » ne sort pas de cette fonction.
  missingIngredients.sort((a, b) => a.ratio - b.ratio);
  return {
    possiblePortions,
    availability,
    bottleneck,
    lowIngredients,
    missingIngredients: missingIngredients.map(({ ratio, ...detail }) => detail),
  };
}

// Nombre de portions qu'on peut encore préparer avec le stock actuel : l'ingrédient
// qui manque en premier décide.
function possiblePortions(recipe, ingredients) {
  return analyzeStock(recipe, ingredients).possiblePortions;
}

// Coût de revient, marge et détail ligne par ligne d'une recette.
function computeRecipe(recipe, ingredients) {
  const byId = ingredients instanceof Map ? ingredients : indexById(ingredients);

  let totalCost = 0;
  const lines = recipe.ingredients.map((line) => {
    const ingredient = findIngredient(byId, line.ingredientId);
    const lineCost = line.quantity * ingredient.costPerUnit;
    totalCost += lineCost;
    return {
      ingredientId: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: line.quantity,
      costPerUnit: ingredient.costPerUnit,
      lineCost: round2(lineCost),
      stock: ingredient.stock,
      stockStatus: stockStatus(ingredient),
    };
  });

  const stock = analyzeStock(recipe, byId);
  const costPerPortion = totalCost / recipe.portions;
  const margin = recipe.price - costPerPortion;
  const hasPrice = recipe.price > 0;

  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    price: recipe.price,
    portions: recipe.portions,
    totalCost: round2(totalCost),
    costPerPortion: round2(costPerPortion),
    margin: round2(margin),
    marginPercent: hasPrice ? round2((margin / recipe.price) * 100) : 0,
    foodCostPercent: hasPrice ? round2((costPerPortion / recipe.price) * 100) : 0,
    possiblePortions: stock.possiblePortions,
    availability: stock.availability,
    bottleneck: stock.bottleneck,
    lowIngredients: stock.lowIngredients,
    missingIngredients: stock.missingIngredients,
    lines,
  };
}

// Ingrédients à surveiller (rupture ou stock bas), les plus urgents en premier.
function lowStockAlerts(ingredients) {
  return ingredients
    .map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      stock: ingredient.stock,
      threshold: ingredient.threshold,
      supplier: ingredient.supplier,
      status: stockStatus(ingredient),
    }))
    .filter((alert) => alert.status !== 'ok')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'rupture' ? -1 : 1;
      return a.stock / a.threshold - b.stock / b.threshold;
    });
}

function toRecipeSummary(computed) {
  return {
    id: computed.id,
    name: computed.name,
    category: computed.category,
    price: computed.price,
    costPerPortion: computed.costPerPortion,
    margin: computed.margin,
    marginPercent: computed.marginPercent,
    foodCostPercent: computed.foodCostPercent,
  };
}

// Recettes dont le stock pose problème : impossibles d'abord, puis stock bas.
function recipesAtRisk(computedRecipes) {
  const rank = { impossible: 0, bas: 1 };
  return computedRecipes
    .filter((recipe) => recipe.availability !== 'ok')
    .sort((a, b) => rank[a.availability] - rank[b.availability] || a.possiblePortions - b.possiblePortions)
    .map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      availability: recipe.availability,
      possiblePortions: recipe.possiblePortions,
      bottleneck: recipe.bottleneck,
      lowIngredients: recipe.lowIngredients,
      missingIngredients: recipe.missingIngredients,
    }));
}

// Chiffres du tableau de bord (route GET /api/stats).
function buildStats(db) {
  const byId = indexById(db.ingredients);
  const recipes = db.recipes.map((recipe) => computeRecipe(recipe, byId));
  const alerts = lowStockAlerts(db.ingredients);

  const averageMarginPercent = recipes.length
    ? round2(recipes.reduce((sum, recipe) => sum + recipe.marginPercent, 0) / recipes.length)
    : 0;

  const stockValue = round2(
    db.ingredients.reduce((sum, ingredient) => sum + ingredient.stock * ingredient.costPerUnit, 0)
  );

  const byCategory = [...new Set(recipes.map((recipe) => recipe.category))].map((category) => {
    const group = recipes.filter((recipe) => recipe.category === category);
    return {
      category,
      count: group.length,
      averageMarginPercent: round2(
        group.reduce((sum, recipe) => sum + recipe.marginPercent, 0) / group.length
      ),
    };
  });

  return {
    recipeCount: recipes.length,
    ingredientCount: db.ingredients.length,
    lowStockCount: alerts.length,
    outOfStockCount: alerts.filter((alert) => alert.status === 'rupture').length,
    stockValue,
    averageMarginPercent,
    topRecipes: [...recipes].sort((a, b) => b.margin - a.margin).slice(0, 5).map(toRecipeSummary),
    highestFoodCost: [...recipes]
      .sort((a, b) => b.foodCostPercent - a.foodCostPercent)
      .slice(0, 5)
      .map(toRecipeSummary),
    recipesAtRisk: recipesAtRisk(recipes),
    byCategory,
    alerts,
  };
}

module.exports = {
  round2,
  normalizeText,
  parseSearchTerms,
  matchRecipeSearch,
  searchIngredients,
  indexById,
  stockStatus,
  analyzeStock,
  possiblePortions,
  computeRecipe,
  recipesAtRisk,
  lowStockAlerts,
  toRecipeSummary,
  buildStats,
};
