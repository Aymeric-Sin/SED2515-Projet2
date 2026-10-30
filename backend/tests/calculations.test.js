/**
 * MiseEnPlace (backend) — Tests unitaires Jest : calculs (modules M2 et M3).
 */

const {
  round2,
  normalizeText,
  stockStatus,
  analyzeStock,
  possiblePortions,
  computeRecipe,
  recipesAtRisk,
  lowStockAlerts,
  buildStats,
  parseSearchTerms,
  matchRecipeSearch,
  searchIngredients,
  indexById,
} = require('../src/calculations');

const ingredients = [
  { id: 'a', name: 'Spaghetti', category: 'Épicerie', unit: 'g', costPerUnit: 0.01, stock: 1000, threshold: 200, supplier: 'X' },
  { id: 'b', name: 'Sauce', category: 'Épicerie', unit: 'ml', costPerUnit: 0.02, stock: 500, threshold: 100, supplier: 'X' },
  { id: 'c', name: 'Parmesan', category: 'Laitier', unit: 'g', costPerUnit: 0.05, stock: 50, threshold: 100, supplier: 'Y' },
  { id: 'd', name: 'Basilic', category: 'Légumes', unit: 'g', costPerUnit: 0.04, stock: 0, threshold: 20, supplier: 'Y' },
];

// 400 g de pâtes + 200 ml de sauce + 40 g de parmesan pour 4 portions.
const recipe = {
  id: 'r1',
  name: 'Pâtes',
  category: 'Plat',
  price: 10,
  portions: 4,
  ingredients: [
    { ingredientId: 'a', quantity: 400 },
    { ingredientId: 'b', quantity: 200 },
    { ingredientId: 'c', quantity: 40 },
  ],
};

describe('round2 et normalizeText', () => {
  test('arrondit à deux décimales', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.5)).toBe(2.5);
  });

  test('retire les accents et les majuscules', () => {
    expect(normalizeText('  Épinards ')).toBe('epinards');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('stockStatus', () => {
  test('ok, bas et rupture', () => {
    expect(stockStatus(ingredients[0])).toBe('ok');
    expect(stockStatus(ingredients[2])).toBe('bas');
    expect(stockStatus(ingredients[3])).toBe('rupture');
  });

  test('un stock égal au seuil est encore « ok »', () => {
    expect(stockStatus({ stock: 100, threshold: 100 })).toBe('ok');
  });
});

describe('computeRecipe', () => {
  test('calcule coût total, coût par portion, marge et % de coût matière', () => {
    // 400*0,01 + 200*0,02 + 40*0,05 = 4 + 4 + 2 = 10 $ ; 2,50 $ par portion
    const result = computeRecipe(recipe, ingredients);
    expect(result.totalCost).toBe(10);
    expect(result.costPerPortion).toBe(2.5);
    expect(result.margin).toBe(7.5);
    expect(result.marginPercent).toBe(75);
    expect(result.foodCostPercent).toBe(25);
  });

  test('détaille chaque ligne avec son coût et l\'état du stock', () => {
    const { lines } = computeRecipe(recipe, ingredients);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ name: 'Spaghetti', lineCost: 4, stockStatus: 'ok' });
    expect(lines[2]).toMatchObject({ name: 'Parmesan', lineCost: 2, stockStatus: 'bas' });
  });

  test('accepte une Map d\'ingrédients', () => {
    const map = new Map(ingredients.map((i) => [i.id, i]));
    expect(computeRecipe(recipe, map).totalCost).toBe(10);
  });

  test('un prix de vente de 0 ne provoque pas de division par zéro', () => {
    const result = computeRecipe({ ...recipe, price: 0 }, ingredients);
    expect(result.marginPercent).toBe(0);
    expect(result.foodCostPercent).toBe(0);
    expect(result.margin).toBe(-2.5);
  });

  test('une marge négative est possible', () => {
    const result = computeRecipe({ ...recipe, price: 2 }, ingredients);
    expect(result.margin).toBe(-0.5);
  });

  test('un ingrédient manquant lève une erreur', () => {
    const broken = { ...recipe, ingredients: [{ ingredientId: 'zzz', quantity: 5 }] };
    expect(() => computeRecipe(broken, ingredients)).toThrow(/introuvable/);
  });
});

describe('possiblePortions', () => {
  test('l\'ingrédient qui manque en premier décide', () => {
    // pâtes : 1000/100 = 10 ; sauce : 500/50 = 10 ; parmesan : 50/10 = 5  => 5
    expect(possiblePortions(recipe, ingredients)).toBe(5);
  });

  test('retourne 0 si un ingrédient est en rupture', () => {
    const withBasil = { ...recipe, ingredients: [...recipe.ingredients, { ingredientId: 'd', quantity: 8 }] };
    expect(possiblePortions(withBasil, ingredients)).toBe(0);
  });

  test('une quantité de 0 ne limite rien', () => {
    const r = { ...recipe, ingredients: [{ ingredientId: 'a', quantity: 0 }, { ingredientId: 'b', quantity: 100 }] };
    expect(possiblePortions(r, ingredients)).toBe(20);
  });

  test('une recette sans ingrédient donne 0', () => {
    expect(possiblePortions({ ...recipe, ingredients: [] }, ingredients)).toBe(0);
  });

  test('un ingrédient inconnu lève une erreur', () => {
    const broken = { ...recipe, ingredients: [{ ingredientId: 'zzz', quantity: 1 }] };
    expect(() => possiblePortions(broken, ingredients)).toThrow();
  });
});

describe('analyzeStock (ingrédient limitant et stock bas)', () => {
  test('repère l\'ingrédient limitant et les ingrédients bas', () => {
    const result = analyzeStock(recipe, ingredients);
    expect(result.possiblePortions).toBe(5);
    expect(result.availability).toBe('bas');
    expect(result.bottleneck).toMatchObject({ ingredientId: 'c', name: 'Parmesan', stock: 50, neededPerPortion: 10 });
    expect(result.lowIngredients.map((i) => i.ingredientId)).toEqual(['c']);
  });

  test('« impossible » quand un ingrédient est en rupture', () => {
    const withBasil = { ...recipe, ingredients: [...recipe.ingredients, { ingredientId: 'd', quantity: 8 }] };
    const result = analyzeStock(withBasil, ingredients);
    expect(result.availability).toBe('impossible');
    expect(result.bottleneck).toMatchObject({ ingredientId: 'd', status: 'rupture', stock: 0 });
    expect(result.missingIngredients.map((i) => i.ingredientId)).toEqual(['d']);
  });

  test('plusieurs ingrédients peuvent manquer en même temps', () => {
    const many = {
      ...recipe,
      ingredients: [
        { ingredientId: 'd', quantity: 8 }, // en rupture
        { ingredientId: 'c', quantity: 400 }, // 50 g en stock pour 100 g par portion
        { ingredientId: 'a', quantity: 400 }, // suffisant
      ],
    };
    const result = analyzeStock(many, ingredients);
    expect(result.availability).toBe('impossible');
    expect(result.missingIngredients.map((i) => i.ingredientId)).toEqual(['d', 'c']);
    expect(result.missingIngredients[0]).not.toHaveProperty('ratio');
  });

  test('aucun ingrédient manquant quand la recette est faisable', () => {
    expect(analyzeStock(recipe, ingredients).missingIngredients).toEqual([]);
  });

  test('« ok » quand aucun ingrédient n\'est bas', () => {
    const ok = { ...recipe, ingredients: [recipe.ingredients[0], recipe.ingredients[1]] };
    const result = analyzeStock(ok, ingredients);
    expect(result.availability).toBe('ok');
    expect(result.lowIngredients).toEqual([]);
  });

  test('un stock insuffisant pour une portion est « impossible » même au-dessus du seuil', () => {
    const big = { ...recipe, portions: 1, ingredients: [{ ingredientId: 'a', quantity: 2000 }] };
    const result = analyzeStock(big, ingredients);
    expect(result.availability).toBe('impossible');
    expect(result.missingIngredients.map((i) => i.ingredientId)).toEqual(['a']);
  });

  test('une recette sans ingrédient est impossible, sans goulot', () => {
    const result = analyzeStock({ ...recipe, ingredients: [] }, ingredients);
    expect(result.availability).toBe('impossible');
    expect(result.bottleneck).toBeNull();
  });

  test('computeRecipe expose ces informations', () => {
    const computed = computeRecipe(recipe, ingredients);
    expect(computed.availability).toBe('bas');
    expect(computed.bottleneck.name).toBe('Parmesan');
  });

  test('recipesAtRisk : impossibles d\'abord, recettes « ok » exclues', () => {
    const withBasil = { ...recipe, id: 'r3', name: 'Pâtes au basilic', ingredients: [{ ingredientId: 'd', quantity: 8 }] };
    const fine = { ...recipe, id: 'r4', name: 'Pâtes simples', ingredients: [recipe.ingredients[0]] };
    const computed = [recipe, withBasil, fine].map((r) => computeRecipe(r, ingredients));
    const risky = recipesAtRisk(computed);
    expect(risky.map((r) => r.id)).toEqual(['r3', 'r1']);
    expect(risky[0].availability).toBe('impossible');
  });
});

describe('parseSearchTerms', () => {
  test('sépare les termes par des virgules, sans accents ni majuscules', () => {
    expect(parseSearchTerms(' Épinards, BASILIC ,, ')).toEqual([
      { text: 'epinards', exact: false },
      { text: 'basilic', exact: false },
    ]);
  });

  test('un terme entre guillemets est exact et garde ses virgules', () => {
    expect(parseSearchTerms('"Lait 3,25 %", tomate')).toEqual([
      { text: 'lait 3,25 %', exact: true },
      { text: 'tomate', exact: false },
    ]);
  });

  test('une recherche vide ne donne aucun terme', () => {
    expect(parseSearchTerms('')).toEqual([]);
    expect(parseSearchTerms(undefined)).toEqual([]);
    expect(parseSearchTerms(' , , ')).toEqual([]);
  });
});

describe('matchRecipeSearch (recherche par nom de recette ou d\'ingrédient)', () => {
  const byId = indexById(ingredients);
  const terms = (text) => parseSearchTerms(text);

  test('sans terme, toutes les recettes correspondent', () => {
    expect(matchRecipeSearch(recipe, byId, [])).toEqual({ matches: true, matchedIngredients: [] });
  });

  test('trouve une recette par le nom de l\'un de ses ingrédients', () => {
    const result = matchRecipeSearch(recipe, byId, terms('parmesan'));
    expect(result.matches).toBe(true);
    expect(result.matchedIngredients).toEqual(['Parmesan']);
  });

  test('trouve une recette par son propre nom', () => {
    expect(matchRecipeSearch(recipe, byId, terms('pâtes')).matches).toBe(true);
  });

  test('tous les termes doivent correspondre', () => {
    expect(matchRecipeSearch(recipe, byId, terms('parmesan, sauce')).matches).toBe(true);
    expect(matchRecipeSearch(recipe, byId, terms('parmesan, basilic')).matches).toBe(false);
  });

  test('un ingrédient absent de la recette ne correspond pas', () => {
    expect(matchRecipeSearch(recipe, byId, terms('basilic')).matches).toBe(false);
  });

  test('un terme entre guillemets cherche le nom exact d\'un ingrédient', () => {
    expect(matchRecipeSearch(recipe, byId, terms('"Sauce"')).matches).toBe(true);
    expect(matchRecipeSearch(recipe, byId, terms('"Sauc"')).matches).toBe(false);
    // le nom de la recette n'est pas utilisé pour un terme exact
    expect(matchRecipeSearch(recipe, byId, terms('"Pâtes"')).matches).toBe(false);
  });
});

describe('searchIngredients (page Stock : par ingrédient ou par recette)', () => {
  const salad = {
    id: 'r2',
    name: 'Salade au basilic',
    category: 'Entrée',
    price: 8,
    portions: 2,
    ingredients: [
      { ingredientId: 'd', quantity: 10 },
      { ingredientId: 'a', quantity: 50 },
    ],
  };
  const recipes = [recipe, salad];
  const names = (text, list = recipes) =>
    searchIngredients(ingredients, list, parseSearchTerms(text)).map((entry) => entry.ingredient.name);
  const entry = (text, name) =>
    searchIngredients(ingredients, recipes, parseSearchTerms(text)).find((item) => item.ingredient.name === name);

  test('sans terme, tous les ingrédients sont retournés, sans recette associée', () => {
    const all = searchIngredients(ingredients, recipes, []);
    expect(all).toHaveLength(4);
    expect(all.every((item) => item.matchedRecipes.length === 0)).toBe(true);
  });

  test('un nom d\'ingrédient retourne cet ingrédient seulement', () => {
    expect(names('parmesan')).toEqual(['Parmesan']);
    expect(entry('parmesan', 'Parmesan').matchedRecipes).toEqual([]);
  });

  test('un nom de recette retourne tous les ingrédients de cette recette', () => {
    expect(names('pâtes')).toEqual(['Spaghetti', 'Sauce', 'Parmesan']);
    expect(entry('pâtes', 'Sauce').matchedRecipes).toEqual(['Pâtes']);
  });

  test('un nom d\'ingrédient est prioritaire sur un nom de recette qui le contient', () => {
    // « basilic » est dans le nom de « Salade au basilic », mais aussi le nom d'un ingrédient
    expect(names('basilic')).toEqual(['Basilic']);
    expect(entry('basilic', 'Basilic').matchedRecipes).toEqual([]);
  });

  test('un nom de recette plus précis passe en recherche par recette', () => {
    expect(names('salade au basilic')).toEqual(['Spaghetti', 'Basilic']);
    expect(entry('salade au basilic', 'Basilic').matchedRecipes).toEqual(['Salade au basilic']);
  });

  test('plusieurs termes : union des résultats, avec toutes les recettes concernées', () => {
    expect(names('pâtes, salade au basilic')).toEqual(['Spaghetti', 'Sauce', 'Parmesan', 'Basilic']);
    expect(entry('pâtes, salade au basilic', 'Spaghetti').matchedRecipes).toEqual(['Pâtes', 'Salade au basilic']);
  });

  test('un terme entre guillemets cherche un nom exact', () => {
    expect(names('"Basilic"')).toEqual(['Basilic']);
    expect(names('"Parmes"')).toEqual([]);
    expect(names('"Pâtes"')).toEqual(['Spaghetti', 'Sauce', 'Parmesan']);
  });

  test('les accents et les majuscules sont ignorés', () => {
    expect(names('PATES')).toEqual(['Spaghetti', 'Sauce', 'Parmesan']);
  });

  test('aucun résultat pour un terme inconnu, et un ingrédient inconnu d\'une recette est ignoré', () => {
    expect(names('pizza')).toEqual([]);
    const broken = { ...recipe, ingredients: [{ ingredientId: 'zzz', quantity: 1 }, { ingredientId: 'a', quantity: 1 }] };
    expect(names('pâtes', [broken])).toEqual(['Spaghetti']);
  });
});

describe('lowStockAlerts', () => {
  test('liste les ruptures d\'abord, puis les stocks bas', () => {
    const alerts = lowStockAlerts(ingredients);
    expect(alerts.map((a) => a.id)).toEqual(['d', 'c']);
    expect(alerts[0].status).toBe('rupture');
    expect(alerts[1].status).toBe('bas');
  });

  test('aucune alerte si tout va bien', () => {
    expect(lowStockAlerts([ingredients[0], ingredients[1]])).toEqual([]);
  });
});

describe('buildStats', () => {
  const db = { ingredients, recipes: [recipe, { ...recipe, id: 'r2', name: 'Pâtes luxe', price: 20 }] };

  test('résume la base de données', () => {
    const stats = buildStats(db);
    expect(stats.recipeCount).toBe(2);
    expect(stats.ingredientCount).toBe(4);
    expect(stats.lowStockCount).toBe(2);
    expect(stats.outOfStockCount).toBe(1);
    // 1000*0,01 + 500*0,02 + 50*0,05 + 0 = 10 + 10 + 2,5
    expect(stats.stockValue).toBe(22.5);
  });

  test('classe les recettes par marge', () => {
    const stats = buildStats(db);
    expect(stats.topRecipes[0].id).toBe('r2');
    expect(stats.highestFoodCost[0].id).toBe('r1');
  });

  test('gère une base vide', () => {
    const stats = buildStats({ ingredients: [], recipes: [] });
    expect(stats.averageMarginPercent).toBe(0);
    expect(stats.topRecipes).toEqual([]);
  });
});
