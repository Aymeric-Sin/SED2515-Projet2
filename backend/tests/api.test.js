/**
 * MiseEnPlace (backend) — Tests de l'API avec Supertest : codes HTTP, format JSON, erreurs.
 *
 * Les tests travaillent sur une COPIE de db.json (dossier temporaire), jamais sur
 * les vraies données.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const REAL_DB = path.join(__dirname, '..', 'data', 'db.json');
let tempDir;
let app;

const newIngredient = {
  name: 'Paprika fumé',
  category: 'Épicerie',
  unit: 'g',
  costPerUnit: 0.05,
  stock: 300,
  threshold: 100,
  supplier: 'Grossiste Gatineau',
};

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miseenplace-'));
  process.env.DB_PATH = path.join(tempDir, 'db.json');
  process.env.NODE_ENV = 'test';
  fs.copyFileSync(REAL_DB, process.env.DB_PATH);
  app = require('../src/app');
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.DB_PATH;
});

describe('GET /api/health', () => {
  test('200 et statut ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/recipes', () => {
  test('200, JSON, avec coût et marge calculés', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.length).toBeGreaterThanOrEqual(20);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        costPerPortion: expect.any(Number),
        margin: expect.any(Number),
        marginPercent: expect.any(Number),
        possiblePortions: expect.any(Number),
      })
    );
  });

  test('indique la disponibilité et l\'ingrédient limitant de chaque recette', async () => {
    const res = await request(app).get('/api/recipes');
    const tiramisu = res.body.find((r) => r.name === 'Tiramisu');
    expect(tiramisu.availability).toBe('impossible');
    expect(tiramisu.possiblePortions).toBe(0);
    expect(tiramisu.bottleneck.name).toBe('Biscuits boudoirs');
    expect(tiramisu.missingIngredients.map((i) => i.name)).toEqual(['Biscuits boudoirs']);
    expect(tiramisu.lowIngredients.map((i) => i.name)).toContain('Mascarpone');

    const low = res.body.filter((r) => r.availability === 'bas');
    expect(low.length).toBeGreaterThan(0);
    expect(low.every((r) => r.lowIngredients.length > 0)).toBe(true);
    expect(res.body.every((r) => ['ok', 'bas', 'impossible'].includes(r.availability))).toBe(true);
  });

  test('la recherche trouve aussi les recettes par ingrédient', async () => {
    const res = await request(app).get('/api/recipes?search=basilic');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(1);
    expect(res.body.every((r) => r.matchedIngredients.some((name) => /basilic/i.test(name)))).toBe(true);
  });

  test('plusieurs ingrédients séparés par une virgule : la recette doit les contenir tous', async () => {
    const both = await request(app).get('/api/recipes?search=' + encodeURIComponent('tomate, basilic'));
    const one = await request(app).get('/api/recipes?search=basilic');
    expect(both.body.length).toBeGreaterThan(0);
    expect(both.body.length).toBeLessThan(one.body.length);
    for (const recipe of both.body) {
      const detail = (await request(app).get(`/api/recipes/${recipe.id}`)).body;
      const names = detail.lines.map((line) => line.name.toLowerCase());
      expect(names.some((n) => n.includes('tomate'))).toBe(true);
      expect(names.some((n) => n.includes('basilic'))).toBe(true);
    }
  });

  test('un nom entre guillemets donne exactement les recettes qui utilisent cet ingrédient', async () => {
    const ingredients = (await request(app).get('/api/ingredients')).body;
    for (const ingredient of ingredients.filter((i) => i.recipeCount > 0)) {
      const res = await request(app).get('/api/recipes?search=' + encodeURIComponent(`"${ingredient.name}"`));
      expect(res.body.length).toBe(ingredient.recipeCount);
    }
  });

  test('sans recherche, matchedIngredients est vide', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.body.every((r) => Array.isArray(r.matchedIngredients) && r.matchedIngredients.length === 0)).toBe(true);
  });

  test('recherche sans tenir compte des accents', async () => {
    const res = await request(app).get('/api/recipes?search=cesar');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every((r) => /c[ée]sar/i.test(r.name))).toBe(true);
  });

  test('filtre par catégorie', async () => {
    const res = await request(app).get('/api/recipes?category=Dessert');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r) => r.category === 'Dessert')).toBe(true);
  });

  test('tri par marge décroissante', async () => {
    const res = await request(app).get('/api/recipes?sort=margin&order=desc');
    const margins = res.body.map((r) => r.margin);
    expect(margins).toEqual([...margins].sort((a, b) => b - a));
  });

  test('tri par nom croissant', async () => {
    const res = await request(app).get('/api/recipes?sort=name');
    const names = res.body.map((r) => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  test('400 si le tri est invalide', async () => {
    const res = await request(app).get('/api/recipes?sort=couleur');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Tri invalide/);
  });

  test('400 si l\'ordre est invalide', async () => {
    const res = await request(app).get('/api/recipes?sort=name&order=haut');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/recipes/:id', () => {
  test('200 avec le détail ligne par ligne', async () => {
    const res = await request(app).get('/api/recipes/rec_001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('rec_001');
    expect(res.body.lines.length).toBeGreaterThan(0);
    expect(res.body.lines[0]).toEqual(
      expect.objectContaining({ name: expect.any(String), lineCost: expect.any(Number), stockStatus: expect.any(String) })
    );
    const sum = res.body.lines.reduce((total, line) => total + line.lineCost, 0);
    expect(Math.abs(sum - res.body.totalCost)).toBeLessThan(0.05);
  });

  test('404 si la recette n\'existe pas', async () => {
    const res = await request(app).get('/api/recipes/rec_999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/introuvable/);
  });
});

describe('GET /api/ingredients', () => {
  test('200 avec statut et nombre de recettes', async () => {
    const res = await request(app).get('/api/ingredients');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(40);
    expect(res.body[0]).toEqual(
      expect.objectContaining({ status: expect.stringMatching(/ok|bas|rupture/), recipeCount: expect.any(Number) })
    );
  });

  test('filtre lowStock=true : seulement les stocks bas ou en rupture', async () => {
    const res = await request(app).get('/api/ingredients?lowStock=true');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((i) => i.status !== 'ok')).toBe(true);
  });

  test('recherche et catégorie', async () => {
    const search = await request(app).get('/api/ingredients?search=epinard');
    expect(search.body.map((i) => i.name)).toContain('Épinards');
    const category = await request(app).get('/api/ingredients?category=Boulangerie');
    expect(category.body.every((i) => i.category === 'Boulangerie')).toBe(true);
  });
});

describe('GET /api/ingredients?search= (par ingrédient ou par recette)', () => {
  test('un nom de recette retourne tous les ingrédients de cette recette', async () => {
    const res = await request(app).get('/api/ingredients?search=tiramisu');
    expect(res.status).toBe(200);
    expect(res.body.map((i) => i.name).sort()).toEqual(
      ['Biscuits boudoirs', 'Café en grains', 'Mascarpone', 'Oeufs', 'Sucre']
    );
    expect(res.body.every((i) => i.matchedRecipes.length === 1 && i.matchedRecipes[0] === 'Tiramisu')).toBe(true);
    expect(res.body[0]).toEqual(expect.objectContaining({ status: expect.any(String), recipeCount: expect.any(Number) }));
  });

  test('un nom d\'ingrédient est prioritaire : « tomate » ne ramène pas toute la bruschetta', async () => {
    const res = await request(app).get('/api/ingredients?search=tomate');
    expect(res.body.map((i) => i.name)).toEqual(['Tomate', 'Sauce tomate']);
    expect(res.body.every((i) => i.matchedRecipes.length === 0)).toBe(true);
  });

  test('plusieurs recettes séparées par une virgule : union des ingrédients', async () => {
    const one = await request(app).get('/api/ingredients?search=tiramisu');
    const both = await request(app).get('/api/ingredients?search=' + encodeURIComponent('tiramisu, salade césar'));
    expect(both.body.length).toBeGreaterThan(one.body.length);
    const names = both.body.map((i) => i.name);
    expect(names).toContain('Mascarpone');
    expect(names).toContain('Laitue romaine');
  });

  test('l\'ingrédient reste filtrable par catégorie et stock bas avec une recherche par recette', async () => {
    const res = await request(app).get('/api/ingredients?search=tiramisu&lowStock=true');
    expect(res.body.map((i) => i.name).sort()).toEqual(['Biscuits boudoirs', 'Mascarpone']);
  });

  test('sans recherche, matchedRecipes est vide partout', async () => {
    const res = await request(app).get('/api/ingredients');
    expect(res.body.every((i) => Array.isArray(i.matchedRecipes) && i.matchedRecipes.length === 0)).toBe(true);
  });

  test('un nom inconnu ne retourne rien', async () => {
    const res = await request(app).get('/api/ingredients?search=zzzzz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/recipes', () => {
  const newRecipe = {
    name: 'Pâtes tomate',
    category: 'Plat',
    price: 14,
    portions: 2,
    ingredients: [
      { ingredientId: 'ing_027', quantity: 200 }, // spaghetti
      { ingredientId: 'ing_001', quantity: 300 }, // tomate
    ],
  };

  test('201 : crée la recette, calcule le coût et l\'écrit dans db.json', async () => {
    const res = await request(app).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'rec_024', name: 'Pâtes tomate', category: 'Plat', price: 14, portions: 2 });
    expect(res.body.totalCost).toBeCloseTo(1.95, 2); // 200 g × 0,003 $ + 300 g × 0,0045 $
    expect(res.body.costPerPortion).toBeCloseTo(0.98, 1);
    expect(res.body.lines).toHaveLength(2);
    expect(res.body.availability).toBe('ok');

    const saved = JSON.parse(fs.readFileSync(process.env.DB_PATH, 'utf-8'));
    expect(saved.recipes.find((r) => r.id === 'rec_024')).toEqual({ id: 'rec_024', ...newRecipe });
  });

  test('la nouvelle recette apparaît dans la liste, le détail, les stats et le nombre de recettes des ingrédients', async () => {
    const before = (await request(app).get('/api/ingredients')).body.find((i) => i.id === 'ing_027').recipeCount;
    await request(app).post('/api/recipes').send(newRecipe);

    const list = await request(app).get('/api/recipes?search=' + encodeURIComponent('"Spaghetti"'));
    expect(list.body.map((r) => r.name)).toContain('Pâtes tomate');
    expect((await request(app).get('/api/recipes/rec_024')).status).toBe(200);
    expect((await request(app).get('/api/stats')).body.recipeCount).toBe(24);
    const after = (await request(app).get('/api/ingredients')).body.find((i) => i.id === 'ing_027').recipeCount;
    expect(after).toBe(before + 1);
  });

  test('un ingrédient utilisé par la nouvelle recette ne peut plus être supprimé (409)', async () => {
    const extra = await request(app).post('/api/ingredients').send({
      name: 'Paprika fumé', category: 'Épicerie', unit: 'g', costPerUnit: 0.05, stock: 300, threshold: 100, supplier: 'X',
    });
    await request(app).post('/api/recipes').send({
      ...newRecipe, name: 'Poulet paprika', ingredients: [{ ingredientId: extra.body.id, quantity: 20 }],
    });
    const res = await request(app).delete(`/api/ingredients/${extra.body.id}`);
    expect(res.status).toBe(409);
    expect(res.body.details.recipes).toContain('Poulet paprika');
  });

  test('l\'identifiant envoyé par le client est ignoré', async () => {
    const res = await request(app).post('/api/recipes').send({ ...newRecipe, id: 'rec_001' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('rec_024');
  });

  test('400 avec les erreurs champ par champ pour un corps vide', async () => {
    const res = await request(app).post('/api/recipes').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Données invalides.');
    for (const field of ['name', 'category', 'price', 'portions', 'ingredients']) {
      expect(res.body.details).toHaveProperty(field);
    }
  });

  test('400 avec les erreurs ligne par ligne (ingrédient inconnu, répété, quantité nulle)', async () => {
    const res = await request(app).post('/api/recipes').send({
      ...newRecipe,
      ingredients: [
        { ingredientId: 'ing_027', quantity: 200 },
        { ingredientId: 'ing_027', quantity: 100 },
        { ingredientId: 'ing_999', quantity: 5 },
        { ingredientId: 'ing_001', quantity: 0 },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.details.lines['0']).toBeUndefined();
    expect(res.body.details.lines['1'].ingredientId).toMatch(/déjà/);
    expect(res.body.details.lines['2']).toHaveProperty('ingredientId');
    expect(res.body.details.lines['3']).toHaveProperty('quantity');
  });

  test('400 si le nom existe déjà (sans tenir compte des accents ni des majuscules)', async () => {
    const res = await request(app).post('/api/recipes').send({ ...newRecipe, name: 'TIRAMISU' });
    expect(res.status).toBe(400);
    expect(res.body.details.name).toMatch(/déjà/);
    const list = await request(app).get('/api/recipes');
    expect(list.body).toHaveLength(23); // rien n'a été ajouté
  });

  test('le nom déjà pris est signalé avec les autres erreurs', async () => {
    const res = await request(app).post('/api/recipes').send({ name: 'Tiramisu' });
    expect(res.status).toBe(400);
    expect(res.body.details.name).toMatch(/déjà/);
    expect(res.body.details).toHaveProperty('price');
  });

  test('400 si le JSON est mal formé', async () => {
    const res = await request(app).post('/api/recipes').set('Content-Type', 'application/json').send('{ non');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/recipes/:id', () => {
  test('200 : supprime la recette et met à jour le nombre de recettes des ingrédients', async () => {
    const before = (await request(app).get('/api/ingredients')).body.find((i) => i.id === 'ing_031').recipeCount;
    const res = await request(app).delete('/api/recipes/rec_019'); // Tiramisu
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Recette « Tiramisu » supprimée.', id: 'rec_019' });

    expect((await request(app).get('/api/recipes/rec_019')).status).toBe(404);
    expect((await request(app).get('/api/recipes')).body).toHaveLength(22);
    const after = (await request(app).get('/api/ingredients')).body.find((i) => i.id === 'ing_031').recipeCount;
    expect(after).toBe(before - 1);
    const saved = JSON.parse(fs.readFileSync(process.env.DB_PATH, 'utf-8'));
    expect(saved.recipes.some((r) => r.id === 'rec_019')).toBe(false);
  });

  test('l\'identifiant d\'une recette supprimée n\'est pas réutilisé tant qu\'il y a une recette plus récente', async () => {
    await request(app).delete('/api/recipes/rec_001');
    const res = await request(app).post('/api/recipes').send({
      name: 'Nouvelle', category: 'Plat', price: 10, portions: 1, ingredients: [{ ingredientId: 'ing_001', quantity: 100 }],
    });
    expect(res.body.id).toBe('rec_024');
  });

  test('404 si la recette n\'existe pas', async () => {
    const res = await request(app).delete('/api/recipes/rec_999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/introuvable/);
  });
});

describe('POST /api/ingredients', () => {
  test('201 : crée l\'ingrédient et l\'écrit dans db.json', async () => {
    const res = await request(app).post('/api/ingredients').send(newIngredient);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...newIngredient, recipeCount: 0, status: 'ok' });
    expect(res.body.id).toMatch(/^ing_\d{3}$/);

    const saved = JSON.parse(fs.readFileSync(process.env.DB_PATH, 'utf-8'));
    expect(saved.ingredients.some((i) => i.id === res.body.id)).toBe(true);
  });

  test('400 avec les erreurs champ par champ', async () => {
    const res = await request(app).post('/api/ingredients').send({ name: 'Test', unit: 'kg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Données invalides.');
    expect(res.body.details).toHaveProperty('unit');
    expect(res.body.details).toHaveProperty('costPerUnit');
  });

  test('400 si le nom existe déjà (sans tenir compte des accents)', async () => {
    const res = await request(app).post('/api/ingredients').send({ ...newIngredient, name: 'epinards' });
    expect(res.status).toBe(400);
    expect(res.body.details.name).toMatch(/déjà/);
  });

  test('400 si le JSON est mal formé', async () => {
    const res = await request(app)
      .post('/api/ingredients')
      .set('Content-Type', 'application/json')
      .send('{ pas du json');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON/);
  });
});

describe('PUT /api/ingredients/:id', () => {
  test('200 : modifie seulement le stock', async () => {
    const res = await request(app).put('/api/ingredients/ing_001').send({ stock: 1234 });
    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(1234);
    expect(res.body.name).toBe('Tomate');

    const saved = JSON.parse(fs.readFileSync(process.env.DB_PATH, 'utf-8'));
    expect(saved.ingredients.find((i) => i.id === 'ing_001').stock).toBe(1234);
  });

  test('le coût d\'une recette suit le nouveau prix de l\'ingrédient', async () => {
    const before = await request(app).get('/api/recipes/rec_001');
    const line = before.body.lines[0];
    await request(app).put(`/api/ingredients/${line.ingredientId}`).send({ costPerUnit: line.costPerUnit * 10 });
    const after = await request(app).get('/api/recipes/rec_001');
    expect(after.body.totalCost).toBeGreaterThan(before.body.totalCost);
  });

  test('400 si la valeur est invalide ou si le corps est vide', async () => {
    const invalid = await request(app).put('/api/ingredients/ing_001').send({ stock: -3 });
    expect(invalid.status).toBe(400);
    const empty = await request(app).put('/api/ingredients/ing_001').send({});
    expect(empty.status).toBe(400);
  });

  test('400 si le nouveau nom est déjà pris', async () => {
    const res = await request(app).put('/api/ingredients/ing_001').send({ name: 'Ail' });
    expect(res.status).toBe(400);
  });

  test('on peut garder son propre nom', async () => {
    const res = await request(app).put('/api/ingredients/ing_001').send({ name: 'Tomate' });
    expect(res.status).toBe(200);
  });

  test('404 si l\'ingrédient n\'existe pas', async () => {
    const res = await request(app).put('/api/ingredients/ing_999').send({ stock: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/ingredients/:id', () => {
  test('200 : supprime un ingrédient qu\'aucune recette n\'utilise', async () => {
    const created = await request(app).post('/api/ingredients').send(newIngredient);
    const res = await request(app).delete(`/api/ingredients/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);

    const list = await request(app).get('/api/ingredients');
    expect(list.body.some((i) => i.id === created.body.id)).toBe(false);
  });

  test('409 : refuse si une recette utilise l\'ingrédient', async () => {
    const res = await request(app).delete('/api/ingredients/ing_004');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/utilisé/);
    expect(res.body.details.recipes.length).toBeGreaterThan(0);
  });

  test('404 si l\'ingrédient n\'existe pas', async () => {
    const res = await request(app).delete('/api/ingredients/ing_999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/stats', () => {
  test('200 avec les chiffres du tableau de bord', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        recipeCount: expect.any(Number),
        lowStockCount: expect.any(Number),
        stockValue: expect.any(Number),
        topRecipes: expect.any(Array),
        alerts: expect.any(Array),
        byCategory: expect.any(Array),
      })
    );
    expect(res.body.topRecipes.length).toBeLessThanOrEqual(5);
  });

  test('recipesAtRisk liste les recettes impossibles puis celles à stock bas', async () => {
    const res = await request(app).get('/api/stats');
    const risky = res.body.recipesAtRisk;
    expect(risky[0]).toMatchObject({ name: 'Tiramisu', availability: 'impossible' });
    expect(risky[0].missingIngredients.length).toBeGreaterThan(0);
    expect(risky.some((r) => r.availability === 'bas')).toBe(true);
    const firstLow = risky.findIndex((r) => r.availability === 'bas');
    expect(risky.slice(0, firstLow).every((r) => r.availability === 'impossible')).toBe(true);
  });

  test('réapprovisionner un ingrédient retire la recette de la liste à risque', async () => {
    await request(app).put('/api/ingredients/ing_031').send({ stock: 1000 });
    await request(app).put('/api/ingredients/ing_024').send({ stock: 2000 });
    const res = await request(app).get('/api/stats');
    expect(res.body.recipesAtRisk.some((r) => r.name === 'Tiramisu')).toBe(false);
  });

  test('une rupture de stock apparaît dans les alertes', async () => {
    await request(app).put('/api/ingredients/ing_001').send({ stock: 0 });
    const res = await request(app).get('/api/stats');
    const alert = res.body.alerts.find((a) => a.id === 'ing_001');
    expect(alert.status).toBe('rupture');
  });
});

describe('Routes inconnues et erreurs', () => {
  test('404 JSON pour une route /api inconnue', async () => {
    const res = await request(app).get('/api/inconnue');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toMatch(/Route introuvable/);
  });

  test('500 JSON si db.json est illisible', async () => {
    fs.writeFileSync(process.env.DB_PATH, 'pas du json');
    const res = await request(app).get('/api/recipes');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Erreur interne du serveur.');
  });
});
