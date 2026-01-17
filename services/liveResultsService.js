// services/liveResultsService.js
// Service para lógica de resultados ao vivo
import LiveMatch from '../models/LiveMatch.js';

const liveResultsService = {
  async obterStatusLiga(liga_id) {
    // Exemplo: retorna status agregado das partidas ao vivo
    const partidas = await LiveMatch.find({ liga_id }).lean();
    const total = partidas.length;
    const emAndamento = partidas.filter(p => p.status === 'em-andamento').length;
    const finalizados = partidas.filter(p => p.status === 'finalizado').length;
    return { total, emAndamento, finalizados };
  }
};

export default liveResultsService;
