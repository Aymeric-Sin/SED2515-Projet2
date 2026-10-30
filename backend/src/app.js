/**
 * MiseEnPlace (backend) — Application Express (sans écoute du port, pour pouvoir la tester).
 *
 * Le démarrage du serveur se fait dans server.js.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const recipesRouter = require('./routes/recipes');
const ingredientsRouter = require('./routes/ingredients');
const statsRouter = require('./routes/stats');
const { HttpError } = require('./errors');

const app = express();

// cors : le frontend (Vite, port 5173) et le backend (port 3001) n'ont pas la même origine.
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/recipes', recipesRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/stats', statsRouter);

// Toute autre route /api répond en JSON (et non avec la page d'erreur HTML d'Express).
app.use('/api', (req, res, next) => {
  next(new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));
});

// Hébergement en un seul service : si le frontend a été compilé (npm run build dans
// frontend/), Express sert aussi les pages. Sinon, cette partie ne fait rien.
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Gestion centralisée des erreurs : toujours une réponse JSON { error, details? }.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Le corps de la requête n\'est pas un JSON valide.' });
  }
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  return res.status(500).json({ error: 'Erreur interne du serveur.' });
});

module.exports = app;
