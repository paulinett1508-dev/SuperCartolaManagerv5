import mongoose from "mongoose";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import axios from "axios";
import { hasAccessToLiga } from "../middleware/tenant.js";
import { CURRENT_SEASON } from "../config/seasons.js";

const safeAggregate = async (model, pipeline, label) => {
  try {
    return await model.aggregate(pipeline).allowDiskUse(true);
  } catch (error) {
    console.error(`[LIGAS] Erro ao agregar (${label}):`, error.message || error);
    return [];
  }
};

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
    // ✅ MULTI-TENANT: Aplica filtro de tenant (definido pelo middleware)
    const filtro = req.tenantFilter || {};

    // ✅ v2.0: Retorna ligas ativas E aposentadas para organização por temporada no sidebar
    const ligas = await Liga.find(filtro)
      .select('nome temporada ativa status times participantes historico')
      .sort({ temporada: -1, nome: 1 }) // Mais recentes primeiro
      .lean();

    if (!ligas || ligas.length === 0) {
      return res.status(200).json([]);
    }

    // ✅ v3.0: Buscar temporadas com dados para cada liga (multi-temporada no sidebar)
    // Agregação otimizada: normaliza liga_id para string (pode ser ObjectId ou String no banco)
    const temporadasPorLiga = await safeAggregate(ExtratoFinanceiroCache, [
      {
        // Normalizar liga_id para string antes de agrupar
        $addFields: {
          liga_id_str: { $toString: "$liga_id" }
        }
      },
      {
        $group: {
          _id: { liga_id: "$liga_id_str", temporada: "$temporada" }
        }
      },
      {
        $group: {
          _id: "$_id.liga_id",
          temporadas: { $addToSet: "$_id.temporada" }
        }
      }
    ]);

    // Criar mapa liga_id -> temporadas para lookup rápido
    const temporadasMap = {};
    temporadasPorLiga.forEach(item => {
      // _id já é string após a normalização
      temporadasMap[item._id] = item.temporadas.sort((a, b) => b - a);
    });

    // ✅ v4.2: Buscar contagem TOTAL de inscrições por liga/temporada (2026+)
    // Conta TODAS as inscrições (renovado, novo, nao_participa, pendente)
    // O sidebar mostra o total de participantes inscritos na temporada
    const inscricoesPorLiga = await safeAggregate(InscricaoTemporada, [
      {
        $group: {
          _id: { liga_id: "$liga_id", temporada: "$temporada" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Criar mapa liga_id + temporada -> contagem total
    const inscricoesTotalMap = {};
    inscricoesPorLiga.forEach(item => {
      const key = `${item._id.liga_id}_${item._id.temporada}`;
      inscricoesTotalMap[key] = item.count;
    });

    // ✅ v4.1: Buscar participantes NOVOS (que entraram em 2026+) por liga
    // Esses NÃO devem ser contados em temporadas históricas
    const novosPorLiga = await safeAggregate(InscricaoTemporada, [
      {
        $match: {
          status: 'novo',
          temporada: { $gte: 2026 }
        }
      },
      {
        $group: {
          _id: "$liga_id",
          count: { $sum: 1 }
        }
      }
    ]);

    // Criar mapa liga_id -> quantidade de novos
    const novosMap = {};
    novosPorLiga.forEach(item => {
      novosMap[String(item._id)] = item.count;
    });

    // ✅ v3.0: Enriquecer com contagem de times, flags úteis e temporadas_com_dados
    const ligasEnriquecidas = ligas.map(liga => {
      const ligaIdStr = String(liga._id);
      const temporadasExtrato = temporadasMap[ligaIdStr] || [];
      const temporadaAtual = liga.temporada || CURRENT_SEASON;

      // Combina temporada atual com temporadas dos extratos (sem duplicatas)
      const todasTemporadas = [...new Set([temporadaAtual, ...temporadasExtrato])].sort((a, b) => b - a);

      // ✅ v4.2: Criar mapa de contagem de times para cada temporada
      const timesCountPerSeason = {};
      todasTemporadas.forEach(temp => {
        if (temp >= 2026) {
          // Usa total de inscrições (inclui nao_participa, pendente, etc.)
          const key = `${ligaIdStr}_${temp}`;
          timesCountPerSeason[temp] = inscricoesTotalMap[key] || 0;
        } else {
          // ✅ v4.1: Para temporadas legadas, subtrai os "novos" de 2026+
          // Exemplo: Se liga.times tem 33 e 1 é "novo" em 2026, temporada 2025 = 32
          const totalTimes = liga.times?.length || 0;
          const novosNaLiga = novosMap[ligaIdStr] || 0;
          timesCountPerSeason[temp] = Math.max(0, totalTimes - novosNaLiga);
        }
      });

      return {
        _id: liga._id,
        nome: liga.nome,
        temporada: temporadaAtual,
        ativa: liga.ativa !== false, // Default true se não definido
        status: liga.status || (liga.ativa !== false ? 'ativa' : 'aposentada'),
        times: liga.times || [],
        // Manter para compatibilidade, usando a contagem da temporada principal da liga
        timesCount: timesCountPerSeason[temporadaAtual] ?? (liga.times?.length || 0),
        // ✅ NOVO: Objeto com contagem para cada temporada
        timesCountPerSeason,
        historico: liga.historico || {},
        // ✅ NOVO: Temporadas onde a liga tem dados (para multi-temporada no sidebar)
        temporadas_com_dados: todasTemporadas,
      };
    });

    console.log(`[LIGAS] Listando ${ligas.length} ligas para admin ${req.session?.admin?.email || "anônimo"}`);
    res.status(200).json(ligasEnriquecidas);
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

    // ✅ MULTI-TENANT: Verificar se admin tem acesso a esta liga
    if (req.session?.admin && !hasAccessToLiga(liga, req.session.admin)) {
      console.log(`[LIGA] Acesso negado: admin ${req.session.admin.email} tentou acessar liga ${liga.nome}`);
      return res.status(403).json({ erro: "Acesso negado a esta liga" });
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
    const { nome, descricao, times, modulos_ativos, configuracoes } = req.body;

    // Validar que admin está autenticado
    if (!req.session?.admin) {
      return res.status(401).json({ erro: "Autenticação necessária para criar liga" });
    }

    const admin = req.session.admin;
    const adminEmail = admin.email?.toLowerCase();

    // ✅ v2.2 FIX: Extrair adminId de forma segura (pode ser objeto, string, ou undefined)
    let rawAdminId = admin._id || admin.id;

    // Se for objeto com toString ou $oid, extrair o valor
    if (rawAdminId && typeof rawAdminId === 'object') {
      rawAdminId = rawAdminId.toString?.() || rawAdminId.$oid || rawAdminId._id || null;
    }

    console.log(`[LIGA] Criando liga "${nome}" - adminId raw: "${rawAdminId}" (tipo: ${typeof rawAdminId})`);

    const timesIds = Array.isArray(times)
      ? times.map((t) => Number(t.id || t)).filter((id) => !isNaN(id))
      : [];

    // ✅ MULTI-TENANT: Vincular liga ao admin que está criando
    const ligaData = {
      nome,
      descricao: descricao || "",
      times: timesIds,
      owner_email: adminEmail,
    };

    // Apenas adicionar admin_id se for string de 24 hex válida
    if (rawAdminId && typeof rawAdminId === 'string' && /^[a-f0-9]{24}$/i.test(rawAdminId)) {
      try {
        ligaData.admin_id = new mongoose.Types.ObjectId(rawAdminId);
        console.log(`[LIGA] admin_id definido: ${ligaData.admin_id}`);
      } catch (convErr) {
        console.warn(`[LIGA] Erro ao converter adminId: ${convErr.message}`);
      }
    } else if (rawAdminId) {
      console.warn(`[LIGA] adminId não é hex24: "${rawAdminId}" - usando apenas owner_email`);
    }

    // Adicionar campos opcionais se fornecidos
    if (modulos_ativos) ligaData.modulos_ativos = modulos_ativos;
    if (configuracoes) ligaData.configuracoes = configuracoes;

    const novaLiga = new Liga(ligaData);
    const ligaSalva = await novaLiga.save();

    console.log(`[LIGA] Nova liga "${nome}" criada por ${adminEmail} (id: ${ligaSalva._id})`);

    res.status(201).json(ligaSalva);
  } catch (err) {
    console.error("[LIGA] Erro ao criar liga:", err.message, err.stack);
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
    const timeExistente = await Time.findOne({ id: timeId }).lean();
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

    // =========================================================================
    // 1. Buscar times existentes (temporada atual/2025)
    // =========================================================================
    let timesExistentes = [];
    if (Array.isArray(liga.times) && liga.times.length > 0) {
      timesExistentes = await Time.find({ id: { $in: liga.times } }).lean();
    }

    // Criar mapa de clube_id a partir de liga.participantes
    const clubeIdMap = {};
    if (Array.isArray(liga.participantes)) {
      liga.participantes.forEach(p => {
        const timeId = p.time_id || p.id;
        if (timeId && p.clube_id) {
          clubeIdMap[String(timeId)] = p.clube_id;
        }
      });
    }

    // Enriquecer times existentes com clube_id
    const timesEnriquecidos = timesExistentes.map(t => ({
      ...t,
      clube_id: t.clube_id || clubeIdMap[String(t.id)] || null
    }));

    // Criar Set de IDs já presentes para evitar duplicatas
    const idsExistentes = new Set(timesEnriquecidos.map(t => String(t.id)));

    // =========================================================================
    // 2. Buscar novos participantes de 2026 (InscricaoTemporada)
    // =========================================================================
    const InscricaoTemporada = (await import("../models/InscricaoTemporada.js")).default;
    const inscricoes2026 = await InscricaoTemporada.find({
      liga_id: new mongoose.Types.ObjectId(ligaIdParam),
      temporada: 2026,
      status: { $in: ['novo', 'renovado', 'pendente'] }
    }).lean();

    // Converter inscrições para formato de time (apenas os que não existem)
    const novosParticipantes = inscricoes2026
      .filter(insc => !idsExistentes.has(String(insc.time_id)))
      .map(insc => ({
        id: insc.time_id,
        time_id: insc.time_id,
        nome_time: insc.dados_participante?.nome_time || 'Novo Participante',
        nome_cartoleiro: insc.dados_participante?.nome_cartoleiro || 'N/D',
        nome_cartola: insc.dados_participante?.nome_cartoleiro || 'N/D',
        url_escudo_png: insc.dados_participante?.escudo || '',
        escudo: insc.dados_participante?.escudo || '',
        clube_id: null,
        temporada_2026: true, // Flag para identificar origem
        status_inscricao: insc.status
      }));

    // Combinar listas
    const todosParticipantes = [...timesEnriquecidos, ...novosParticipantes];

    console.log(`[LIGAS] buscarTimesDaLiga: ${timesEnriquecidos.length} existentes + ${novosParticipantes.length} novos 2026 = ${todosParticipantes.length} total`);

    res.json(todosParticipantes);
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
    const ligaExiste = await Liga.findById(ligaIdParam).lean();
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

// =====================================================================
// ✅ v2.0: ENDPOINT DE CONFIGURAÇÕES DINÂMICAS (SaaS Multi-Tenant)
// GET /api/ligas/:id/configuracoes
// Retorna todas as configurações da liga para uso no frontend
// =====================================================================
const buscarConfiguracoes = async (req, res) => {
  const ligaIdParam = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    const liga = await Liga.findById(ligaIdParam)
      .select("nome configuracoes modulos_ativos times temporada atualizadaEm")
      .lean();

    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    const config = liga.configuracoes || {};

    // Montar resposta com todas as configurações necessárias para o frontend
    res.json({
      success: true,
      liga_id: ligaIdParam,
      liga_nome: liga.nome,
      temporada: liga.temporada || CURRENT_SEASON,
      total_participantes: liga.times?.length || 0,
      atualizado_em: liga.atualizadaEm,

      // Configurações completas
      configuracoes: config,

      // Módulos ativos (para compatibilidade)
      modulos_ativos: liga.modulos_ativos || {},

      // Configurações específicas para fácil acesso no frontend
      ranking_rodada: config.ranking_rodada || null,
      top10: config.top10 || null,
      pontos_corridos: config.pontos_corridos || null,
      mata_mata: config.mata_mata || null,
      melhor_mes: config.melhor_mes || null,
      artilheiro: config.artilheiro || null,
      luva_ouro: config.luva_ouro || null,

      // Cards desabilitados no frontend
      cards_desabilitados: config.cards_desabilitados || [],

      // Status da temporada
      temporada_config: config.temporada_2025 || {
        status: "ativa",
        rodada_inicial: 1,
        rodada_final: 38,
      },
    });
  } catch (err) {
    console.error("[LIGAS] Erro ao buscar configurações:", err);
    res.status(500).json({ erro: "Erro ao buscar configurações da liga" });
  }
};

// =====================================================================
// ✅ v2.0: ATUALIZAR CONFIGURAÇÕES DA LIGA (Admin)
// PUT /api/ligas/:id/configuracoes
// =====================================================================
const atualizarConfiguracoes = async (req, res) => {
  const ligaIdParam = req.params.id;
  const { configuracoes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  if (!configuracoes || typeof configuracoes !== "object") {
    return res.status(400).json({ erro: "Dados de configurações inválidos" });
  }

  try {
    const liga = await Liga.findById(ligaIdParam);
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    // Merge das configurações (preserva campos não enviados)
    liga.configuracoes = {
      ...liga.configuracoes,
      ...configuracoes,
    };
    liga.atualizadaEm = new Date();
    await liga.save();

    console.log(`[LIGAS] ✅ Configurações atualizadas para liga ${liga.nome}`);

    res.json({
      success: true,
      mensagem: "Configurações atualizadas com sucesso",
      configuracoes: liga.configuracoes,
    });
  } catch (err) {
    console.error("[LIGAS] Erro ao atualizar configurações:", err);
    res.status(500).json({ erro: "Erro ao atualizar configurações" });
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
  buscarConfiguracoes,
  atualizarConfiguracoes,
};
