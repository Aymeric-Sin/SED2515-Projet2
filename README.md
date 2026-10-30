# MiseEnPlace

Application web pour un restaurateur : consulter les recettes, voir le **coût de revient** et la **marge** de chaque plat, et suivre le **stock** d'ingrédients pour savoir quoi commander.

Projet 2 du cours **SED2515** (réalisé seul). Frontend **React** (Vite), backend **Node.js / Express**, API REST en JSON, et un **fichier JSON** (`backend/data/db.json`) comme seule source de données (aucune base de données).

## Pourcentage de code écrit par l'étudiant

**15 % du code écrit par l'étudiant — 85 % par Claude (Anthropic). Idées et suggestions implémentées : 100% par l'étudiant — 0% par Claude (Anthropic). Commentaire et en-tête écrit par : 0% étudiant — 100% Claude (Anthropic)**. Les bibliothèques (React, Express, Axios, etc.) sont des dépendances installées avec npm et ne sont pas comptées dans le code du projet.

## Contenu du dépôt

```
backend/
  server.js                 démarre le serveur (port 3001)
  data/db.json              données : 41 ingrédients, 23 recettes
  scripts/validateData.js   vérifie la cohérence de db.json
  src/                      app Express, routes, calculs, validation, dataService
  tests/                    tests Jest + Supertest (91 tests)
frontend/
  src/                      pages React, composants, api.js (Axios), CSS
  (tests Vitest)            fonctions d'affichage, formulaire, barre de navigation, infobulles (28 tests)
docs/                       collection Postman, scénarios de tests manuels
```

## Installation

Prérequis : **Node.js 20 ou plus** (testé avec Node 22) et npm.

```bash
git clone https://github.com/Aymeric-Sin/SED2515-Projet2.git
cd miseenplace
npm run install:all        # installe backend/ et frontend/
```

(équivalent : `cd backend && npm install`, puis `cd ../frontend && npm install`)

## Lancement

Ouvrir **deux terminaux**.

**Backend** (API sur http://localhost:3001) :

```bash
cd backend
npm start                  # ou « npm run dev » pour relancer à chaque changement (nodemon)
```

**Frontend** (application sur http://localhost:5173) :

```bash
cd frontend
npm run dev
```

Vite redirige automatiquement les appels `/api` vers le port 3001. Ouvrir http://localhost:5173.

### Option : un seul serveur (version compilée)

```bash
npm run build              # compile le frontend dans frontend/dist
npm start                  # Express sert l'API et les pages sur http://localhost:3001
```

Variables facultatives : `PORT` (backend, défaut 3001), `DB_PATH` (autre fichier de données), `VITE_API_URL` (frontend, autre adresse d'API).

## Endpoints de l'API

Base : `http://localhost:3001/api` — toutes les réponses sont en JSON. Les erreurs ont la forme `{ "error": "message", "details": {...} }`.

| Méthode | Route | Description | Codes |
| --- | --- | --- | --- |
| GET | `/recipes` | Liste des recettes avec coût, marge, portions possibles, `availability` (`ok`, `bas`, `impossible`), ingrédient limitant (`bottleneck`) et ingrédients bas (`lowIngredients`). Paramètres facultatifs : `search` (nom de recette **ou d'ingrédient** ; plusieurs termes séparés par une virgule, ex. `tomate, basilic`, doivent tous correspondre ; un nom entre guillemets, ex. `"Tomate"`, cherche le nom exact d'un ingrédient), `category`, `sort` (`name`, `price`, `cost`, `margin`, `marginPercent`, `foodCost`), `order` (`asc`, `desc`) | 200, 400 |
| GET | `/recipes/:id` | Détail d'une recette, coûts ligne par ligne | 200, 404 |
| GET | `/ingredients` | Liste des ingrédients avec stock et statut (`ok`, `bas`, `rupture`). Paramètres facultatifs : `search`, `category`, `lowStock=true` | 200 |
| POST | `/ingredients` | Ajoute un ingrédient (tous les champs vérifiés) | 201, 400 |
| PUT | `/ingredients/:id` | Modifie un ingrédient (champs partiels acceptés, ex. `{ "stock": 2500 }`) | 200, 400, 404 |
| DELETE | `/ingredients/:id` | Supprime un ingrédient, refusé s'il est utilisé dans une recette | 200, 404, 409 |
| GET | `/stats` | Chiffres du tableau de bord : meilleures marges, coût matière, alertes de stock, recettes à surveiller (`recipesAtRisk`), etc. | 200 |
| GET | `/health` | Vérification que le serveur répond | 200 |

Exemple : `GET /api/recipes/rec_004`

```json
{
  "id": "rec_004",
  "name": "Bruschetta tomate et basilic",
  "category": "Entrée",
  "price": 9.5,
  "portions": 4,
  "totalCost": 6.13,
  "costPerPortion": 1.53,
  "margin": 7.97,
  "marginPercent": 83.87,
  "foodCostPercent": 16.13,
  "possiblePortions": 16,
  "availability": "bas",
  "missingIngredients": [],
  "bottleneck": { "ingredientId": "ing_008", "name": "Basilic frais", "unit": "g",
                  "stock": 60, "neededPerPortion": 3.75, "status": "bas" },
  "lowIngredients": [
    { "ingredientId": "ing_008", "name": "Basilic frais", "unit": "g",
      "stock": 60, "threshold": 100, "status": "bas" }
  ],
  "lines": [
    { "ingredientId": "ing_040", "name": "Baguette", "unit": "unité", "quantity": 1,
      "costPerUnit": 1.2, "lineCost": 1.2, "stock": 14, "stockStatus": "ok" }
  ]
}
```

`availability` vaut `impossible` quand le stock ne permet de préparer aucune portion, `bas` quand au moins un ingrédient de la recette est sous son seuil, et `ok` sinon. `matchedIngredients` donne les ingrédients trouvés par la recherche. `missingIngredients` liste **tous** les ingrédients dont le stock ne suffit pas pour une portion (plusieurs peuvent manquer), `lowIngredients` ceux qui sont sous leur seuil, et `bottleneck` l'ingrédient qui limite le nombre de portions.

Exemple : `POST /api/ingredients`

```json
{ "name": "Paprika fumé", "category": "Épicerie", "unit": "g",
  "costPerUnit": 0.05, "stock": 300, "threshold": 100, "supplier": "Grossiste Gatineau" }
```

Unités permises : `g`, `ml`, `unité`. Une collection Postman est dans `docs/MiseEnPlace.postman_collection.json`.

## Interface

- **Barre de navigation fixe** en haut de la page, avec un bouton burger : sur ordinateur, il fait apparaître / disparaître les liens dans la barre ; sur mobile, il ouvre un panneau sous la barre.
- **Page Recettes** : l'étiquette rouge « Impossible » et le triangle jaune (stock bas) affichent au survol l'ingrédient en cause. Au clavier, ils s'ouvrent avec Tab ; au toucher, en appuyant dessus.
- **Recherche par ingrédient** : la barre de recherche de la page Recettes trouve les recettes par leur nom ou par un de leurs ingrédients (« Contient : … » s'affiche sous le nom). Sur la page Stock, le nombre de la colonne « Recettes » est un lien vers cette recherche pour l'ingrédient exact.
- **Nombres** : dans les formulaires, le point et la virgule sont acceptés comme séparateur décimal (1.05 = 1,05).
- **Tableau de bord** : la section « Recettes à surveiller » regroupe les recettes impossibles (rouge) et à stock bas (jaune), avec la même infobulle.
- Icône du site : `frontend/public/favicon.svg`.

## Les données (`backend/data/db.json`)

Deux listes : `ingredients` (nom, catégorie, unité, coût par unité, stock, seuil d'alerte, fournisseur) et `recipes` (nom, catégorie, prix de vente, portions, liste `{ ingredientId, quantity }`). Une recette ne recopie pas les ingrédients : elle garde leur identifiant, donc le coût de chaque recette se met à jour quand le prix d'un ingrédient change.

- La quantité d'un ingrédient dans une recette est celle de la **recette entière** (400 g pour 4 portions = 100 g par portion).
- Les montants sont en dollars canadiens. Le coût d'un ingrédient est un coût **par unité** (par gramme, par ml) : il peut donc avoir plus de deux décimales (0,0045 $/g). Les prix de vente et les coûts calculés sont arrondis à deux décimales.
- Les données sont **fictives** (prix et fournisseurs inventés).
- Vérification : `npm run validate-data` (identifiants uniques, ingrédients existants, quantités positives, unités permises). À lancer avant chaque commit.
- L'API réécrit ce fichier quand on ajoute, modifie ou supprime un ingrédient. Pour repartir des données d'origine : `git checkout backend/data/db.json`.

## Tests

```bash
npm test                   # backend (Jest + Supertest) puis frontend (Vitest)
```

- **Backend** (`backend/tests/`, 91 tests) : calculs de coût, marge et portions, validation, vérification de `db.json`, et chaque route de l'API (codes HTTP, format JSON, erreurs 400/404/409/500). Les tests travaillent sur une **copie** de `db.json` : vos données ne sont pas modifiées.
- **Frontend** (Vitest, 28 tests) : fonctions d'affichage, lecture des nombres (point ou virgule), formulaire d'ingrédient, barre de navigation (burger), infobulles de stock, recherche de la page Recettes et lien de la page Stock.
- **Tests manuels** : collection Postman et scénarios utilisateurs dans `docs/TESTS-MANUELS.md`.
