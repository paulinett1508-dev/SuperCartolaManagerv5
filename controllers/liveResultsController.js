// controllers/liveResultsController.js
// Controller para resultados ao vivo (Live Results)
// Padrão multi-tenant: todas queries com liga_id
import LiveMatch from '../models/LiveMatch.js';
import liveResultsService from '../services/liveResultsService.js';

export default {
  async listarPartidasAoVivo(req, res) {
    try {
      const { liga_id } = req.query;
      if (!liga_id) return res.status(400).json({ success: false, message: 'liga_id obrigatório' });
      const partidas = await LiveMatch.find({ liga_id }).lean();
      res.json({ success: true, partidas });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async atualizarPartida(req, res) {
    try {
      const { liga_id, matchId, dados } = req.body;
      if (!liga_id || !matchId) return res.status(400).json({ success: false, message: 'liga_id e matchId obrigatórios' });
      const partida = await LiveMatch.findOneAndUpdate(
        { liga_id, matchId },
        { $set: dados },
        { new: true, upsert: true }
      );
      res.json({ success: true, partida });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async obterStatus(req, res) {
    try {
      const { liga_id } = req.query;
      if (!liga_id) return res.status(400).json({ success: false, message: 'liga_id obrigatório' });
      const status = await liveResultsService.obterStatusLiga(liga_id);
      res.json({ success: true, status });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
