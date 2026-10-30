/**
 * MiseEnPlace (backend) — Tests unitaires Jest : validation des ingrédients (module M6)
 * et vérification de la base de données (script M12).
 */

const path = require('path');
const { validateIngredient, validateRecipe, RECIPE_CATEGORIES } = require('../src/validation');
const { validateDatabase } = require('../scripts/validateData');

const valid = {
  name: 'Farine',
  category: 'Épicerie',
  unit: 'g',
  costPerUnit: 0.002,
  stock: 1000,
  threshold: 200,
  supplier: 'Grossiste',
};

describe('validateIngredient', () => {
  test('accepte un ingrédient complet et nettoie les textes', () => {
    const result = validateIngredient({ ...valid, name: '  Farine  ' });
    expect(result.isValid).toBe(true);
    expect(result.value.name).toBe('Farine');
  });

  test('signale chaque champ manquant', () => {
    const result = validateIngredient({});
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(
      ['category', 'costPerUnit', 'name', 'stock', 'supplier', 'threshold', 'unit']
    );
  });

  test('refuse les valeurs invalides', () => {
    const result = validateIngredient({ ...valid, unit: 'kg', costPerUnit: 0, stock: -1, threshold: 'abc', name: '   ' });
    expect(result.errors).toHaveProperty('unit');
    expect(result.errors).toHaveProperty('costPerUnit');
    expect(result.errors).toHaveProperty('stock');
    expect(result.errors).toHaveProperty('threshold');
    expect(result.errors).toHaveProperty('name');
  });

  test('refuse les nombres sous forme de texte et NaN', () => {
    expect(validateIngredient({ ...valid, stock: '10' }).errors).toHaveProperty('stock');
    expect(validateIngredient({ ...valid, stock: NaN }).errors).toHaveProperty('stock');
  });

  test('un corps absent ou non objet est refusé', () => {
    expect(validateIngredient(undefined).isValid).toBe(false);
    expect(validateIngredient([]).isValid).toBe(false);
  });

  test('mode partiel : on peut modifier seulement le stock', () => {
    const result = validateIngredient({ stock: 50 }, { partial: true });
    expect(result.isValid).toBe(true);
    expect(result.value).toEqual({ stock: 50 });
  });

  test('mode partiel : un corps vide est refusé', () => {
    const result = validateIngredient({}, { partial: true });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('body');
  });

  test('mode partiel : une valeur invalide est refusée', () => {
    expect(validateIngredient({ stock: -5 }, { partial: true }).isValid).toBe(false);
  });
});

describe('validateRecipe', () => {
  const ingredients = [
    { id: 'ing_001', ...valid },
    { id: 'ing_002', ...valid, name: 'Sucre' },
  ];
  const recipe = {
    name: '  Gâteau simple ',
    category: 'Dessert',
    price: 8.5,
    portions: 4,
    ingredients: [
      { ingredientId: 'ing_001', quantity: 300 },
      { ingredientId: 'ing_002', quantity: 120.5 },
    ],
  };

  test('accepte une recette complète et nettoie le nom', () => {
    const result = validateRecipe(recipe, ingredients);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.value).toEqual({ ...recipe, name: 'Gâteau simple' });
  });

  test('les catégories permises sont celles de la carte', () => {
    expect(RECIPE_CATEGORIES).toEqual(['Entrée', 'Plat', 'Dessert', 'Boisson']);
  });

  test('signale chaque champ manquant', () => {
    const result = validateRecipe({}, ingredients);
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['category', 'ingredients', 'name', 'portions', 'price']);
  });

  test('un corps absent ou non objet est refusé', () => {
    expect(validateRecipe(undefined, ingredients).isValid).toBe(false);
    expect(validateRecipe([], ingredients).isValid).toBe(false);
  });

  test('refuse une catégorie inconnue, un prix nul et des portions non entières', () => {
    const result = validateRecipe({ ...recipe, category: 'Apéro', price: 0, portions: 2.5 }, ingredients);
    expect(result.errors).toHaveProperty('category');
    expect(result.errors).toHaveProperty('price');
    expect(result.errors.portions).toMatch(/entier/);
  });

  test('refuse un prix ou des portions donnés sous forme de texte', () => {
    const result = validateRecipe({ ...recipe, price: '8.5', portions: '4' }, ingredients);
    expect(result.errors).toHaveProperty('price');
    expect(result.errors).toHaveProperty('portions');
  });

  test('refuse un nom vide ou trop long', () => {
    expect(validateRecipe({ ...recipe, name: '   ' }, ingredients).errors).toHaveProperty('name');
    expect(validateRecipe({ ...recipe, name: 'x'.repeat(81) }, ingredients).errors).toHaveProperty('name');
  });

  test('refuse une recette sans ingrédient', () => {
    expect(validateRecipe({ ...recipe, ingredients: [] }, ingredients).errors.ingredients).toMatch(/au moins un/);
    expect(validateRecipe({ ...recipe, ingredients: 'farine' }, ingredients).errors).toHaveProperty('ingredients');
  });

  test('indique les erreurs ligne par ligne (index de la ligne)', () => {
    const result = validateRecipe(
      {
        ...recipe,
        ingredients: [
          { ingredientId: 'ing_001', quantity: 10 },
          { ingredientId: 'ing_999', quantity: 5 }, // inconnu
          { ingredientId: 'ing_001', quantity: 5 }, // déjà utilisé
          { ingredientId: 'ing_002', quantity: 0 }, // quantité nulle
          { ingredientId: 'ing_002', quantity: '12' }, // quantité en texte
          'n\'importe quoi',
        ],
      },
      ingredients
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.lines[0]).toBeUndefined();
    expect(result.errors.lines[1]).toHaveProperty('ingredientId');
    expect(result.errors.lines[2].ingredientId).toMatch(/déjà/);
    expect(result.errors.lines[3].quantity).toMatch(/supérieure à 0/);
    expect(result.errors.lines[4].quantity).toMatch(/nombre/);
    expect(result.errors.lines[5]).toHaveProperty('ingredientId');
    expect(result.errors.lines[5]).toHaveProperty('quantity');
    expect(result.value.ingredients).toBeUndefined();
  });
});

describe('validateDatabase (script de vérification de db.json)', () => {
  const baseDb = () => ({
    ingredients: [{ id: 'ing_001', ...valid }],
    recipes: [
      { id: 'rec_001', name: 'Pain', category: 'Plat', price: 5, portions: 2, ingredients: [{ ingredientId: 'ing_001', quantity: 100 }] },
    ],
  });

  test('le vrai fichier db.json est valide', () => {
    const db = require(path.join('..', 'data', 'db.json'));
    expect(validateDatabase(db).errors).toEqual([]);
  });

  test('accepte une petite base correcte', () => {
    expect(validateDatabase(baseDb()).errors).toEqual([]);
  });

  test('détecte un ingrédient inexistant dans une recette', () => {
    const db = baseDb();
    db.recipes[0].ingredients[0].ingredientId = 'ing_999';
    expect(validateDatabase(db).errors.join(' ')).toMatch(/n'existe pas/);
  });

  test('détecte une quantité non positive', () => {
    const db = baseDb();
    db.recipes[0].ingredients[0].quantity = 0;
    expect(validateDatabase(db).errors.join(' ')).toMatch(/positive/);
  });

  test('détecte les identifiants et les noms en double', () => {
    const db = baseDb();
    db.ingredients.push({ id: 'ing_001', ...valid });
    const text = validateDatabase(db).errors.join(' ');
    expect(text).toMatch(/en double/);
    expect(text).toMatch(/existe déjà/);
  });

  test('détecte une recette sans ingrédient et des portions invalides', () => {
    const db = baseDb();
    db.recipes[0].ingredients = [];
    db.recipes[0].portions = 0;
    const text = validateDatabase(db).errors.join(' ');
    expect(text).toMatch(/au moins un ingrédient/);
    expect(text).toMatch(/portions/);
  });

  test('avertit (sans erreur) si un ingrédient n\'est utilisé nulle part', () => {
    const db = baseDb();
    db.ingredients.push({ id: 'ing_002', ...valid, name: 'Sucre' });
    const result = validateDatabase(db);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toMatch(/aucune recette/);
  });

  test('refuse un fichier sans les deux listes', () => {
    expect(validateDatabase({}).errors).toHaveLength(1);
  });
});
