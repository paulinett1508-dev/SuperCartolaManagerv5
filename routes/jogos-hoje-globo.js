// routes/jogos-hoje-globo.js
// Rota para servir jogos do dia extraídos do Globo Esporte
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const CACHE_PATH = path.join(process.cwd(), 'data', 'jogos-globo.json');

// GET /api/jogos-hoje-globo
router.get('/', async (req, res) => {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    const jogos = JSON.parse(raw);
    res.json({ jogos, fonte: 'globo' });
  } catch (err) {
    res.status(200).json({ jogos: [], fonte: 'globo', erro: 'Sem dados de jogos do Globo Esporte.' });
  }
});

export default router;
