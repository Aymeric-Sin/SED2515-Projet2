/**
 * MiseEnPlace (backend) — Module M7 : route des statistiques du tableau de bord.
 *
 *   GET /api/stats   meilleures marges, coût matière élevé, alertes de stock, etc.
 */

const express = require('express');
const { readDb } = require('../dataService');
const { buildStats } = require('../calculations');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(buildStats(readDb()));
});

module.exports = router;
