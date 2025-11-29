import mongoose from "mongoose";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import axios from "axios";

const buscarCartoleiroPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data } = await axios.get(
      `https://api.cartola.globo.com/time/id/${id}`,
    );
    res.json({
      nome_time: data.time?.nome || "N/D",
      nome_cartoleiro: data.time?.nome_cartola || "N/D",
      escudo_url: data.time?.url_escudo_png || "",
    });
  } catch (error) {
    console.error(`Erro ao buscar time ${id}:`, error.message);
    res.status(404).json({ erro: "Time não encontrado na API" });
  }
};

const listarLigas = async (req, res) => {
  try {
    const ligas = await Liga.find().lean();
    if (!ligas || ligas.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(ligas);
  } catch (err) {
    console.error("Erro ao listar ligas:", err.message);
    res.status(500).json({ erro: "Erro ao listar ligas: " + err.message });
  }
};

// ==============================
// SINCRONIZAÇÃO DE PARTICIPANTES
// ==============================
async function sincronizarParticipantesInterno(liga) {
  if (!liga.times || liga.times.length === 0) {
    return liga;
  }

  // Buscar dados completos dos times na coleção times
  const timesCompletos = await Time.find({ id: { $in: liga.times } }).lean();

  // Criar mapa para lookup rápido
  const timesMap = {};
  timesCompletos.forEach((t) => {
    timesMap[t.id] = t;
  });

  // Atualizar participantes com dados da coleção times
  const participantesAtualizados = liga.times.map((timeId) => {
    const timeData = timesMap[timeId];

    // Buscar participante existente para preservar dados como senha_acesso
    const participanteExistente =
      liga.participantes?.find((p) => p.time_id === timeId) || {};

    return {
      time_id: timeId,
      nome_cartola:
        timeData?.nome_cartoleiro ||
        participanteExistente.nome_cartola ||
        "N/D",
      nome_time:
        timeData?.nome_time || participanteExistente.nome_time || "N/D",
      clube_id: timeData?.clube_id || participanteExistente.clube_id || null,
      foto_perfil:
        timeData?.foto_perfil || participanteExistente.foto_perfil || "",
      foto_time:
        timeData?.url_escudo_png || participanteExistente.foto_time || "",
      assinante:
        timeData?.assinante || participanteExistente.assinante || false,
      rodada_time_id:
        timeData?.rodada_time_id ||
        participanteExistente.rodada_time_id ||
        null,
      senha_acesso: participanteExistente.senha_acesso || null, // Preservar senha existente
    };
  });

  return participantesAtualizados;
}

// Rota para sincronização manual
const sincronizarParticipantesLiga = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    const liga = await Liga.findById(id);
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    console.log(`[SYNC] Sincronizando participantes da liga ${liga.nome}...`);

    const participantesAtualizados =
      await sincronizarParticipantesInterno(liga);

    // Atualizar no banco
    liga.participantes = participantesAtualizados;
    liga.atualizadaEm = new Date();
    await liga.save();

    console.log(
      `[SYNC] ✅ ${participantesAtualizados.length} participantes sincronizados`,
    );

    res.json({
      success: true,
      mensagem: `${participantesAtualizados.length} participantes sincronizados`,
      participantes: participantesAtualizados,
    });
  } catch (err) {
    console.error("[SYNC] Erro ao sincronizar:", err);
    res.status(500).json({ erro: "Erro ao sincronizar participantes" });
  }
};

// Sincronizar TODAS as ligas
const sincronizarTodasLigas = async (req, res) => {
  try {
    const ligas = await Liga.find();
    let totalSincronizados = 0;

    for (const liga of ligas) {
      const participantesAtualizados =
        await sincronizarParticipantesInterno(liga);
      liga.participantes = participantesAtualizados;
      liga.atualizadaEm = new Date();
      await liga.save();
      totalSincronizados += participantesAtualizados.length;
    }

    console.log(
      `[SYNC] ✅ ${ligas.length} ligas sincronizadas, ${totalSincronizados} participantes`,
    );

    res.json({
      success: true,
      mensagem: `${ligas.length} ligas sincronizadas`,
      total_participantes: totalSincronizados,
    });
  } catch (err) {
    console.error("[SYNC] Erro ao sincronizar todas:", err);
    res.status(500).json({ erro: "Erro ao sincronizar ligas" });
  }
};

const buscarLigaPorId = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    const liga = await Liga.findById(id).lean();
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    // ✅ AUTO-SYNC: Se participantes estão vazios ou com N/D, sincronizar automaticamente
    const precisaSincronizar =
      !liga.participantes ||
      liga.participantes.length === 0 ||
      liga.participantes.some(
        (p) => p.nome_cartola === "N/D" || p.nome_time === "N/D",
      );

    if (precisaSincronizar && liga.times && liga.times.length > 0) {
      console.log(
        `[LIGA] Auto-sincronizando participantes da liga ${liga.nome}...`,
      );

      // Buscar dados completos dos times
      const timesCompletos = await Time.find({
        id: { $in: liga.times },
      }).lean();
      const timesMap = {};
      timesCompletos.forEach((t) => {
        timesMap[t.id] = t;
      });

      // Atualizar participantes
      const participantesAtualizados = liga.times.map((timeId) => {
        const timeData = timesMap[timeId];
        const participanteExistente =
          liga.participantes?.find((p) => p.time_id === timeId) || {};

        return {
          time_id: timeId,
          nome_cartola: timeData?.nome_cartoleiro || "N/D",
          nome_time: timeData?.nome_time || "N/D",
          clube_id: timeData?.clube_id || null,
          foto_perfil: timeData?.foto_perfil || "",
          foto_time: timeData?.url_escudo_png || "",
          assinante: timeData?.assinante || false,
          rodada_time_id: timeData?.rodada_time_id || null,
          senha_acesso: participanteExistente.senha_acesso || null,
        };
      });

      // Salvar atualização (fire and forget para não bloquear resposta)
      Liga.findByIdAndUpdate(id, {
        participantes: participantesAtualizados,
        atualizadaEm: new Date(),
      }).catch((err) => console.error("[LIGA] Erro ao auto-sincronizar:", err));

      // Retornar com dados atualizados
      liga.participantes = participantesAtualizados;
      console.log(
        `[LIGA] ✅ Auto-sync concluído para ${participantesAtualizados.length} participantes`,
      );
    }

    res.status(200).json(liga);
  } catch (err) {
    console.error(`Erro ao buscar liga ${id}:`, err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ erro: `ID de liga inválido: ${id}` });
    }
    res.status(500).json({ erro: "Erro ao buscar liga: " + err.message });
  }
};

const criarLiga = async (req, res) => {
  try {
    const { nome, times } = req.body;

    const timesIds = Array.isArray(times)
      ? times.map((t) => Number(t.id)).filter((id) => !isNaN(id))
      : [];

    const novaLiga = new Liga({ nome, times: timesIds });
    const ligaSalva = await novaLiga.save();
    res.status(201).json(ligaSalva);
  } catch (err) {
    console.error("Erro ao criar liga:", err.message);
    res.status(500).json({ erro: "Erro ao criar liga: " + err.message });
  }
};

const excluirLiga = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    const liga = await Liga.findByIdAndDelete(id);
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir liga:", err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ erro: `ID de liga inválido: ${id}` });
    }
    res.status(500).json({ erro: "Erro ao excluir liga: " + err.message });
  }
};

async function salvarTime(timeId) {
  try {
    const timeExistente = await Time.findOne({ id: timeId });
    if (!timeExistente) {
      console.log(`Salvando time ${timeId}...`);
    }
  } catch (error) {
    console.error(`Erro ao tentar salvar time ${timeId}:`, error);
  }
}

const atualizarTimesLiga = async (req, res) => {
  const { id } = req.params;
  const { times } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  if (!Array.isArray(times)) {
    return res.status(400).json({ erro: "'times' deve ser um array" });
  }

  try {
    const liga = await Liga.findById(id);
    if (!liga) return res.status(404).json({ erro: "Liga não encontrada" });

    const timesIdsNumericos = [
      ...new Set(times.map(Number).filter((num) => !isNaN(num))),
    ];

    liga.times = timesIdsNumericos;
    await liga.save();
    res.status(200).json(liga);
  } catch (err) {
    console.error(`Erro ao atualizar times da liga ${id}:`, err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ erro: `ID de liga inválido: ${id}` });
    }
    res
      .status(500)
      .json({ erro: "Erro ao atualizar times da liga: " + err.message });
  }
};

const removerTimeDaLiga = async (req, res) => {
  const { id, timeId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  const timeIdNum = Number(timeId);
  if (isNaN(timeIdNum)) {
    return res.status(400).json({ erro: "ID do time inválido" });
  }

  try {
    const liga = await Liga.findById(id);
    if (!liga) return res.status(404).json({ erro: "Liga não encontrada" });

    const initialLength = liga.times.length;
    liga.times = liga.times.filter((t) => t !== timeIdNum);

    if (liga.times.length < initialLength) {
      await liga.save();
      res.status(200).json({ mensagem: "Time removido com sucesso!" });
    } else {
      res.status(404).json({ erro: "Time não encontrado na liga" });
    }
  } catch (err) {
    console.error("Erro ao remover time da liga:", err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ erro: `ID de liga inválido: ${id}` });
    }
    res
      .status(500)
      .json({ erro: "Erro ao remover time da liga: " + err.message });
  }
};

const atualizarFluxoFinanceiro = async (req, res) => {
  res.status(501).json({ erro: "Função não implementada completamente" });
};

const consultarFluxoFinanceiro = async (req, res) => {
  res.status(501).json({ erro: "Função não implementada completamente" });
};

const buscarTimesDaLiga = async (req, res) => {
  const ligaIdParam = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({
      erro: "ID de liga inválido",
      recebido: ligaIdParam,
    });
  }

  try {
    const liga = await Liga.findById(ligaIdParam).lean();
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    if (!Array.isArray(liga.times) || liga.times.length === 0) {
      return res.json([]);
    }

    const times = await Time.find({ id: { $in: liga.times } }).lean();
    res.json(times);
  } catch (err) {
    console.error("Erro ao buscar times da liga:", err);
    if (err.name === "CastError") {
      return res
        .status(400)
        .json({ erro: `ID de liga inválido: ${ligaIdParam}` });
    }
    res.status(500).json({ erro: "Erro interno do servidor ao buscar times" });
  }
};

const buscarRodadasDaLiga = async (req, res) => {
  const ligaIdParam = req.params.id;
  const rodadaNumParam = req.params.rodadaNum;
  const { rodada, inicio, fim } = req.query;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({
      erro: "ID de liga inválido",
      recebido: ligaIdParam,
    });
  }

  try {
    const ligaExiste = await Liga.findById(ligaIdParam);
    if (!ligaExiste) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    const rodadaEspecifica = rodadaNumParam || rodada;

    if (rodadaEspecifica) {
      const numRodada = Number(rodadaEspecifica);
      if (isNaN(numRodada) || numRodada < 1 || numRodada > 38) {
        return res.status(400).json({ erro: "Número da rodada inválido" });
      }

      const query = {
        ligaId: new mongoose.Types.ObjectId(ligaIdParam),
        rodada: numRodada,
      };

      const dadosRodada = await Rodada.find(query).lean();
      res.json(dadosRodada);
    } else {
      const queryDistinct = {
        ligaId: new mongoose.Types.ObjectId(ligaIdParam),
      };

      const numerosRodadas = await Rodada.distinct("rodada", queryDistinct);
      res.json(numerosRodadas.sort((a, b) => a - b));
    }
  } catch (err) {
    console.error("Erro ao buscar rodadas da liga:", err);
    if (err.name === "CastError") {
      return res
        .status(400)
        .json({ erro: `ID de liga ou parâmetro inválido: ${err.message}` });
    }
    res
      .status(500)
      .json({ erro: "Erro interno do servidor ao buscar rodadas" });
  }
};

function gerarConfrontos(times) {
  const n = times.length;
  const rodadas = [];
  const lista = [...times];
  if (n % 2 !== 0) lista.push(null);

  for (let rodada = 0; rodada < n - 1; rodada++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const timeA = lista[i];
      const timeB = lista[n - 1 - i];
      if (timeA && timeB) {
        jogos.push({ timeA, timeB });
      }
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop());
  }
  return rodadas;
}

const buscarConfrontosPontosCorridos = async (req, res) => {
  const ligaIdParam = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    const liga = await Liga.findById(ligaIdParam).lean();
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    const times = await Time.find({ id: { $in: liga.times } }).lean();
    if (!times || times.length === 0) {
      return res.json([]);
    }

    const confrontosBase = gerarConfrontos(times);

    let rodadaAtual = 1;
    try {
      const resStatus = await axios.get(
        "http://localhost:5000/api/mercado/status",
      );
      if (resStatus.data && resStatus.data.rodada_atual) {
        rodadaAtual = resStatus.data.rodada_atual;
      }
    } catch (err) {
      // Silencioso
    }

    const ultimaRodadaCompleta = rodadaAtual - 1;
    const confrontosComPontos = [];

    for (let i = 0; i < confrontosBase.length; i++) {
      const rodadaNum = i + 1;
      const rodadaCartola = 7 + i;
      const jogosDaRodada = confrontosBase[i];

      let pontuacoesRodada = {};
      if (rodadaCartola <= ultimaRodadaCompleta) {
        try {
          const queryRodada = {
            ligaId: new mongoose.Types.ObjectId(ligaIdParam),
            rodada: rodadaCartola,
          };

          const dadosRodada = await Rodada.find(queryRodada).lean();

          pontuacoesRodada = dadosRodada.reduce((acc, item) => {
            if (item.time_id && item.pontuacao !== undefined) {
              acc[item.time_id] = item.pontuacao;
            }
            return acc;
          }, {});
        } catch (err) {
          console.error(
            `Erro ao buscar pontuações da rodada ${rodadaCartola}:`,
            err,
          );
        }
      }

      const jogosComPontos = jogosDaRodada.map((jogo) => ({
        ...jogo,
        pontosA: pontuacoesRodada[jogo.timeA.id] ?? null,
        pontosB: pontuacoesRodada[jogo.timeB.id] ?? null,
      }));

      confrontosComPontos.push({
        rodada: rodadaNum,
        rodadaCartola: rodadaCartola,
        jogos: jogosComPontos,
      });
    }

    res.json(confrontosComPontos);
  } catch (err) {
    console.error("Erro ao buscar confrontos da liga:", err);
    if (err.name === "CastError") {
      return res
        .status(400)
        .json({ erro: `ID de liga inválido: ${ligaIdParam}` });
    }
    res
      .status(500)
      .json({ erro: "Erro interno do servidor ao buscar confrontos" });
  }
};

const buscarModulosAtivos = async (req, res) => {
  const ligaIdParam = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    const liga = await Liga.findById(ligaIdParam).lean();
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    let modulosAtivos;

    if (liga.modulos_ativos && Object.keys(liga.modulos_ativos).length > 0) {
      modulosAtivos = liga.modulos_ativos;
    } else {
      const config = liga.configuracoes || {};

      modulosAtivos = {
        extrato: true,
        ranking: true,
        rodadas: true,
        top10: !!config.top10,
        melhorMes: !!config.melhor_mes,
        pontosCorridos: !!config.pontos_corridos,
        mataMata: !!config.mata_mata,
        artilheiro: !!config.artilheiro,
        luvaOuro: !!config.luva_ouro,
      };
    }

    res.json({ modulos: modulosAtivos });
  } catch (err) {
    console.error("[LIGAS] Erro ao buscar módulos ativos:", err);
    res.status(500).json({ erro: "Erro ao buscar módulos ativos" });
  }
};

const atualizarModulosAtivos = async (req, res) => {
  const ligaIdParam = req.params.id;
  const { modulos } = req.body;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  if (!modulos || typeof modulos !== "object") {
    return res.status(400).json({ erro: "Dados de módulos inválidos" });
  }

  try {
    const liga = await Liga.findById(ligaIdParam);
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    liga.modulos_ativos = modulos;
    liga.atualizadaEm = new Date();
    await liga.save();

    res.json({
      success: true,
      modulos: liga.modulos_ativos,
      mensagem: "Módulos atualizados com sucesso",
    });
  } catch (err) {
    console.error("[LIGAS] Erro ao atualizar módulos:", err);
    res.status(500).json({ erro: "Erro ao atualizar módulos ativos" });
  }
};

export {
  listarLigas,
  buscarLigaPorId,
  criarLiga,
  excluirLiga,
  atualizarTimesLiga,
  removerTimeDaLiga,
  atualizarFluxoFinanceiro,
  consultarFluxoFinanceiro,
  buscarTimesDaLiga,
  buscarRodadasDaLiga,
  buscarConfrontosPontosCorridos,
  buscarCartoleiroPorId,
  buscarModulosAtivos,
  atualizarModulosAtivos,
  sincronizarParticipantesLiga,
  sincronizarTodasLigas,
};
