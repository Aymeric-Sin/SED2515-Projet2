/**
 * MiseEnPlace (backend) — Point d'entrée : démarre le serveur Express (port 3001 par défaut).
 */

const app = require('./src/app');
const { getDbPath } = require('./src/dataService');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`MiseEnPlace : API prête sur http://localhost:${PORT}/api`);
  console.log(`Fichier de données : ${getDbPath()}`);
});
