/**
 * MiseEnPlace (backend) — Module M1 : lecture et écriture du fichier db.json.
 *
 * Le fichier JSON est la seule source de données. Le chemin peut être changé avec la
 * variable d'environnement DB_PATH (c'est ce que font les tests pour travailler sur
 * une copie du fichier).
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Lu à chaque appel (et non au chargement du module) pour que les tests puissent
// changer DB_PATH entre deux tests.
function getDbPath() {
  return process.env.DB_PATH || DEFAULT_DB_PATH;
}

function readDb() {
  const raw = fs.readFileSync(getDbPath(), 'utf-8');
  const db = JSON.parse(raw);
  if (!Array.isArray(db.ingredients) || !Array.isArray(db.recipes)) {
    throw new Error('db.json doit contenir les listes "ingredients" et "recipes".');
  }
  return db;
}

// Écriture synchrone dans un fichier temporaire, puis renommage : si le programme
// s'arrête en pleine écriture, db.json n'est jamais à moitié écrit.
function writeDb(db) {
  const target = getDbPath();
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2) + '\n', 'utf-8');
  fs.renameSync(temp, target);
}

// Prochain identifiant : ing_042 si le plus grand existant est ing_041 (même principe pour rec_).
function nextId(items, prefix) {
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  const max = items.reduce((highest, item) => {
    const match = pattern.exec(item.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}_${String(max + 1).padStart(3, '0')}`;
}

const nextIngredientId = (ingredients) => nextId(ingredients, 'ing');
const nextRecipeId = (recipes) => nextId(recipes, 'rec');

module.exports = { getDbPath, readDb, writeDb, nextIngredientId, nextRecipeId };
