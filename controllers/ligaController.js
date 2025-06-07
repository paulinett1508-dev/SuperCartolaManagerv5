import mongoose from "mongoose"; // Import mongoose
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import Rodada from "../models/Rodada.js";
import axios from "axios"; // Ensure axios is imported if used

const buscarCartoleiroPorId = async (req, res) => {
  const { id } = req.params;

  try {
    // Use HTTPS for Cartola API
    const { data } = await axios.get(
      `https://api.cartola.globo.com/time/id/${id}`,
    );
    res.json({
      nome_time: data.time?.nome || "N/D", // Safer access
      nome_cartoleiro: data.time?.nome_cartola || "N/D", // Safer access
      escudo_url: data.time?.url_escudo_png || "", // Safer access
    });
  } catch (error) {
    console.error(`Erro ao buscar time ${id}:`, error.message);
    res.status(404).json({ erro: "Time não encontrado na API" });
  }
};

const listarLigas = async (req, res) => {
  try {
    console.log("Iniciando listagem de ligas...");

    // Verificar se a coleção existe e tem documentos
    const colecoes = await mongoose.connection.db.listCollections().toArray();
    const colecaoLigas = colecoes.find((col) => col.name === "ligas");
    console.log("Coleção de ligas existe:", !!colecaoLigas);

    const ligas = await Liga.find().lean();
    if (!ligas || ligas.length === 0) {
      console.log("Nenhuma liga encontrada no banco de dados.");
      return res.status(200).json([]);
    }
    console.log("Ligas encontradas:", ligas.length);
    console.log("Primeira liga:", JSON.stringify(ligas[0]));
    res.status(200).json(ligas);
  } catch (err) {
    console.error("Erro ao listar ligas:", err.message);
    res.status(500).json({ erro: "Erro ao listar ligas: " + err.message });
  }
};

const buscarLigaPorId = async (req, res) => {
  const { id } = req.params;

  // --- CORREÇÃO: Validar se o ID é um ObjectId válido ---
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`ID de liga inválido: ${id}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }
  // --- FIM CORREÇÃO ---

  try {
    console.log(`Buscando liga com ID: ${id}`);

    // Verificar se a coleção existe
    const colecoes = await mongoose.connection.db.listCollections().toArray();
    const colecaoLigas = colecoes.find((col) => col.name === "ligas");
    console.log("Coleção de ligas existe:", !!colecaoLigas);

    const liga = await Liga.findById(id).lean();
    if (!liga) {
      console.log(`Liga com ID ${id} não encontrada`);
      return res.status(404).json({ erro: "Liga não encontrada" });
    }
    console.log(`Liga encontrada: ${liga.nome}`);
    console.log("Detalhes da liga:", JSON.stringify(liga));
    res.status(200).json(liga);
  } catch (err) {
    console.error(`Erro ao buscar liga ${id}:`, err.message);
    // Retornar 400 para CastError (embora a validação deva prevenir)
    if (err.name === "CastError") {
      return res.status(400).json({ erro: `ID de liga inválido: ${id}` });
    }
    res.status(500).json({ erro: "Erro ao buscar liga: " + err.message });
  }
};

const criarLiga = async (req, res) => {
  try {
    // Extrai nome e times do corpo da requisição
    const { nome, times } = req.body;

    // Garante que times será um array de números (IDs)
    const timesIds = Array.isArray(times)
      ? times.map((t) => Number(t.id)).filter((id) => !isNaN(id))
      : [];

    // Cria a nova liga com o nome e os IDs dos times
    const novaLiga = new Liga({ nome, times: timesIds });
    const ligaSalva = await novaLiga.save();
    console.log("Nova liga criada:", ligaSalva._id);
    res.status(201).json(ligaSalva);
  } catch (err) {
    console.error("Erro ao criar liga:", err.message);
    res.status(500).json({ erro: "Erro ao criar liga: " + err.message });
  }
};

const excluirLiga = async (req, res) => {
  const { id } = req.params;

  // --- CORREÇÃO: Validar se o ID é um ObjectId válido ---
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`ID de liga inválido para exclusão: ${id}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }
  // --- FIM CORREÇÃO ---

  try {
    const liga = await Liga.findByIdAndDelete(id);
    if (!liga) {
      console.log(`Liga com ID ${id} não encontrada para exclusão`);
      return res.status(404).json({ erro: "Liga não encontrada" });
    }
    console.log(`Liga com ID ${id} excluída com sucesso`);
    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir liga:", err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ erro: `ID de liga inválido: ${id}` });
    }
    res.status(500).json({ erro: "Erro ao excluir liga: " + err.message });
  }
};

// Função auxiliar (se não existir em outro lugar)
async function salvarTime(timeId) {
  // Implementar lógica para buscar dados do time na API Cartola e salvar/atualizar no DB
  // Exemplo básico:
  try {
    const timeExistente = await Time.findOne({ id: timeId });
    if (!timeExistente) {
      // Busca na API e salva
      console.log(`Salvando time ${timeId}... (lógica a implementar)`);
    }
  } catch (error) {
    console.error(`Erro ao tentar salvar time ${timeId}:`, error);
  }
}

const atualizarTimesLiga = async (req, res) => {
  const { id } = req.params;
  const { times } = req.body; // Espera um array de IDs numéricos

  // --- CORREÇÃO: Validar ID da liga ---
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }
  // --- FIM CORREÇÃO ---

  if (!Array.isArray(times)) {
    return res.status(400).json({ erro: "'times' deve ser um array" });
  }

  try {
    const liga = await Liga.findById(id);
    if (!liga) return res.status(404).json({ erro: "Liga não encontrada" });

    // Converte IDs para número e remove duplicados/inválidos
    const timesIdsNumericos = [
      ...new Set(times.map(Number).filter((num) => !isNaN(num))),
    ];

    // Opcional: Salva/verifica cada time na coleção times antes de atualizar a liga
    // await Promise.all(timesIdsNumericos.map(timeId => salvarTime(timeId)));

    // Atualiza o array de times na liga (assumindo que o schema armazena números)
    liga.times = timesIdsNumericos;
    await liga.save();
    console.log(`Times atualizados para a liga ${id}:`, liga.times.length);
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

  // --- CORREÇÃO: Validar ID da liga ---
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ erro: "ID de liga inválido" });
  }
  // --- FIM CORREÇÃO ---

  const timeIdNum = Number(timeId);
  if (isNaN(timeIdNum)) {
    return res.status(400).json({ erro: "ID do time inválido" });
  }

  try {
    const liga = await Liga.findById(id);
    if (!liga) return res.status(404).json({ erro: "Liga não encontrada" });

    // Remove o time (assumindo que liga.times armazena números)
    const initialLength = liga.times.length;
    liga.times = liga.times.filter((t) => t !== timeIdNum);

    if (liga.times.length < initialLength) {
      await liga.save();
      console.log(`Time ${timeIdNum} removido da liga ${id}`);
      res.status(200).json({ mensagem: "Time removido com sucesso!" });
    } else {
      console.log(`Time ${timeIdNum} não encontrado na liga ${id}`);
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

// --- Funções de Fluxo Financeiro ---
const atualizarFluxoFinanceiro = async (req, res) => {
  const { id } = req.params; // ID da liga
  const { timeId, valores } = req.body; // ID do time e valores a atualizar

  // Validar ID da liga
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`ID de liga inválido para atualizar fluxo financeiro: ${id}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  // Validar timeId
  if (!timeId || isNaN(Number(timeId))) {
    return res
      .status(400)
      .json({ erro: "ID do time inválido ou não fornecido" });
  }

  // Validar valores
  if (!valores || typeof valores !== "object") {
    return res
      .status(400)
      .json({ erro: "Valores financeiros inválidos ou não fornecidos" });
  }

  try {
    // Verificar se a liga existe
    const liga = await Liga.findById(id);
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    // Verificar se o time pertence à liga
    if (!liga.times.includes(Number(timeId))) {
      return res.status(404).json({ erro: "Time não encontrado na liga" });
    }

    // Inicializar o campo fluxoFinanceiro se não existir
    if (!liga.fluxoFinanceiro) {
      liga.fluxoFinanceiro = {};
    }

    // Atualizar os valores financeiros do time
    liga.fluxoFinanceiro[timeId] = {
      ...liga.fluxoFinanceiro[timeId], // Manter valores existentes
      ...valores, // Sobrescrever com novos valores
      ultimaAtualizacao: new Date(),
    };

    await liga.save();
    console.log(
      `Fluxo financeiro atualizado para o time ${timeId} na liga ${id}`,
    );

    res.status(200).json({
      mensagem: "Fluxo financeiro atualizado com sucesso",
      timeId,
      valores: liga.fluxoFinanceiro[timeId],
    });
  } catch (err) {
    console.error(`Erro ao atualizar fluxo financeiro: ${err.message}`);
    res
      .status(500)
      .json({ erro: `Erro ao atualizar fluxo financeiro: ${err.message}` });
  }
};

const consultarFluxoFinanceiro = async (req, res) => {
  const { id } = req.params; // ID da liga
  const { timeId } = req.query; // ID do time (opcional)

  // Validar ID da liga
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`ID de liga inválido para consultar fluxo financeiro: ${id}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    // Verificar se a liga existe
    const liga = await Liga.findById(id).lean();
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    // Se não houver dados de fluxo financeiro
    if (!liga.fluxoFinanceiro) {
      return res.status(200).json({
        liga: liga.nome,
        fluxoFinanceiro: timeId ? {} : {},
      });
    }

    // Se um timeId específico foi solicitado
    if (timeId) {
      // Verificar se o time pertence à liga
      if (!liga.times.includes(Number(timeId))) {
        return res.status(404).json({ erro: "Time não encontrado na liga" });
      }

      const dadosTime = liga.fluxoFinanceiro[timeId] || {};
      return res.status(200).json({
        liga: liga.nome,
        timeId,
        fluxoFinanceiro: dadosTime,
      });
    }

    // Retornar dados de todos os times
    res.status(200).json({
      liga: liga.nome,
      fluxoFinanceiro: liga.fluxoFinanceiro,
    });
  } catch (err) {
    console.error(`Erro ao consultar fluxo financeiro: ${err.message}`);
    res
      .status(500)
      .json({ erro: `Erro ao consultar fluxo financeiro: ${err.message}` });
  }
};
// --- Fim Funções de Fluxo Financeiro ---

export {
  buscarCartoleiroPorId,
  listarLigas,
  buscarLigaPorId,
  criarLiga,
  excluirLiga,
  atualizarTimesLiga,
  removerTimeDaLiga,
  atualizarFluxoFinanceiro, // Manter exportação, mas função precisa de revisão
  consultarFluxoFinanceiro, // Manter exportação, mas função precisa de revisão
  buscarTimesDaLiga,
  buscarRodadasDaLiga,
};

// Busca os times COMPLETOS da liga (usando o array "times" da coleção "ligas")
const buscarTimesDaLiga = async (req, res) => {
  const ligaIdParam = req.params.id;

  // --- CORREÇÃO: Validar ID da liga ---
  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    console.log(`ID de liga inválido para buscar times: ${ligaIdParam}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }
  // --- FIM CORREÇÃO ---

  try {
    // Verificar se o ID é válido e a liga existe
    const liga = await Liga.findById(ligaIdParam).lean(); // Usar lean()
    if (!liga) {
      console.log(`Liga com ID ${ligaIdParam} não encontrada`);
      return res.status(404).json({ erro: "Liga não encontrada" });
    }
    console.log(`Liga encontrada: ${liga.nome}`);

    // Assumindo que liga.times contém IDs numéricos e o schema de Time usa 'id' numérico
    if (!Array.isArray(liga.times) || liga.times.length === 0) {
      console.log("Nenhum time encontrado na liga");
      return res.json([]); // Retorna array vazio se não houver times
    }

    console.log("IDs dos times na liga:", liga.times);
    const times = await Time.find({ id: { $in: liga.times } }).lean(); // Usar lean()
    console.log("Times encontrados:", times.length);
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

// Busca rodadas da liga (filtro opcional por rodada ou intervalo)
const buscarRodadasDaLiga = async (req, res) => {
  const ligaIdParam = req.params.id;
  const { rodada, inicio, fim } = req.query;

  // --- CORREÇÃO: Validar ID da liga ---
  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    console.log(`ID de liga inválido para buscar rodadas: ${ligaIdParam}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }
  // --- FIM CORREÇÃO ---

  try {
    // --- CORREÇÃO: Converter o ID para ObjectId ANTES da query ---
    const ligaObjectId = new mongoose.Types.ObjectId(ligaIdParam);
    // --- FIM CORREÇÃO ---

    // Verificar se a liga existe antes de buscar rodadas
    const ligaExiste = await Liga.findById(ligaIdParam);
    if (!ligaExiste) {
      console.log(`Liga com ID ${ligaIdParam} não encontrada`);
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    const query = { ligaId: ligaObjectId }; // Usa o ObjectId convertido

    // Lógica para buscar UMA rodada específica
    if (rodada) {
      const numRodada = Number(rodada);
      if (!isNaN(numRodada) && numRodada > 0) {
        query.rodada = numRodada;
        console.log(
          `Buscando rodada específica: ${numRodada} para liga ${ligaIdParam}`,
        );
      } else {
        return res.status(400).json({ erro: "Número da rodada inválido" });
      }
    }
    // Lógica para buscar um INTERVALO de rodadas
    else if (inicio && fim) {
      const numInicio = Number(inicio);
      const numFim = Number(fim);
      if (
        !isNaN(numInicio) &&
        !isNaN(numFim) &&
        numInicio > 0 &&
        numFim >= numInicio
      ) {
        query.rodada = { $gte: numInicio, $lte: numFim };
        console.log(
          `Buscando intervalo de rodadas: ${numInicio}-${numFim} para liga ${ligaIdParam}`,
        );
      } else {
        return res.status(400).json({ erro: "Intervalo de rodadas inválido" });
      }
    }
    // Se nenhum filtro for fornecido, busca TODAS as rodadas da liga
    else {
      console.log(`Buscando todas as rodadas para liga ${ligaIdParam}`);
    }

    console.log("Query para buscar rodadas:", JSON.stringify(query));
    const rodadas = await Rodada.find(query).lean(); // Adicionado .lean()
    console.log(`Encontradas ${rodadas.length} rodadas para a query.`);
    res.json(rodadas);
  } catch (err) {
    console.error("Erro ao buscar rodadas da liga:", err);
    // Captura específica de CastError (embora a validação deva prevenir)
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
