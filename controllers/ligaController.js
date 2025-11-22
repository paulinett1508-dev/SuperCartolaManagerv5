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

// --- Funções de Fluxo Financeiro (Simplificadas, precisam de revisão) ---
const atualizarFluxoFinanceiro = async (req, res) => {
  // ... (Código original precisa de validação de ID e revisão da lógica)
  res.status(501).json({ erro: "Função não implementada completamente" });
};

const consultarFluxoFinanceiro = async (req, res) => {
  // ... (Código original precisa de validação de ID e revisão da lógica)
  res.status(501).json({ erro: "Função não implementada completamente" });
};
// --- Fim Funções de Fluxo Financeiro ---

// Busca os times COMPLETOS da liga (usando o array "times" da coleção "ligas")
const buscarTimesDaLiga = async (req, res) => {
  const ligaIdParam = req.params.id;

  // --- CORREÇÃO: Validar ID da liga ---
  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    console.log(`[TIMES] ID de liga inválido recebido: "${ligaIdParam}"`);
    return res.status(400).json({
      erro: "ID de liga inválido",
      recebido: ligaIdParam,
      dica: "Verifique se o ligaId está sendo passado corretamente da sessão"
    });
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
  const rodadaNumParam = req.params.rodadaNum;
  const { rodada, inicio, fim } = req.query;

  // Validar ID da liga
  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    console.log(`[RODADAS] ID de liga inválido recebido: "${ligaIdParam}"`);
    return res.status(400).json({
      erro: "ID de liga inválido",
      recebido: ligaIdParam,
      dica: "Certifique-se de que está usando o ID correto da liga, não o nome do arquivo"
    });
  }

  try {
    const ligaExiste = await Liga.findById(ligaIdParam);
    if (!ligaExiste) {
      console.log(`Liga com ID ${ligaIdParam} não encontrada`);
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
      console.log(
        `Buscando dados da rodada específica: ${numRodada} para liga ${ligaIdParam}`,
      );
      console.log("Query para buscar dados da rodada:", JSON.stringify(query));

      const dadosRodada = await Rodada.find(query).lean();
      console.log(
        `Encontrados ${dadosRodada.length} documentos para a rodada ${numRodada}`,
      );
      res.json(dadosRodada);
    } else {
      console.log(
        `Buscando números de rodadas distintas para liga ${ligaIdParam}`,
      );
      const queryDistinct = {
        ligaId: new mongoose.Types.ObjectId(ligaIdParam),
      };
      console.log(
        "Query para buscar rodadas distintas:",
        JSON.stringify(queryDistinct),
      );

      const numerosRodadas = await Rodada.distinct("rodada", queryDistinct);
      console.log(
        `Encontradas ${numerosRodadas.length} rodadas distintas:`,
        numerosRodadas,
      );
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

// Função auxiliar para gerar confrontos todos contra todos
function gerarConfrontos(times) {
  const n = times.length;
  const rodadas = [];
  const lista = [...times];
  if (n % 2 !== 0) lista.push(null); // adiciona bye se ímpar

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
    lista.splice(1, 0, lista.pop()); // rotaciona times
  }
  return rodadas;
}

// Novo controlador para buscar confrontos da Liga Pontos Corridos
const buscarConfrontosPontosCorridos = async (req, res) => {
  const ligaIdParam = req.params.id;

  // Validar ID da liga
  if (!mongoose.Types.ObjectId.isValid(ligaIdParam)) {
    console.log(`ID de liga inválido para buscar confrontos: ${ligaIdParam}`);
    return res.status(400).json({ erro: "ID de liga inválido" });
  }

  try {
    console.log(
      `Buscando confrontos da Liga Pontos Corridos para liga ${ligaIdParam}...`,
    );

    // Verificar se a liga existe
    const liga = await Liga.findById(ligaIdParam).lean();
    if (!liga) {
      console.log(`Liga com ID ${ligaIdParam} não encontrada`);
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    // Buscar times da liga
    const times = await Time.find({ id: { $in: liga.times } }).lean();
    if (!times || times.length === 0) {
      console.log(`Nenhum time encontrado para a liga ${ligaIdParam}`);
      return res.json([]); // Retorna array vazio se não houver times
    }

    console.log(
      `Gerando confrontos para ${times.length} times da liga ${ligaIdParam}`,
    );

    // Gerar confrontos todos contra todos
    const confrontosBase = gerarConfrontos(times);

    // Buscar status do mercado para determinar rodada atual
    let rodadaAtual = 1;
    try {
      // CORRIGIDO: Usar a rota correta /api/mercado/status
      const resStatus = await axios.get(
        "http://localhost:5000/api/mercado/status",
      ); // Ajustar URL se necessário
      if (resStatus.data && resStatus.data.rodada_atual) {
        rodadaAtual = resStatus.data.rodada_atual;
      }
    } catch (err) {
      console.warn(
        "Erro ao buscar status do mercado para confrontos, usando rodada 1:",
        err.message,
      );
    }

    const ultimaRodadaCompleta = rodadaAtual - 1;
    const confrontosComPontos = [];

    // Para cada rodada de confrontos
    for (let i = 0; i < confrontosBase.length; i++) {
      const rodadaNum = i + 1;
      const rodadaCartola = 7 + i; // RODADA_INICIAL = 7
      const jogosDaRodada = confrontosBase[i];

      // Buscar pontuações da rodada se já foi disputada
      let pontuacoesRodada = {};
      if (rodadaCartola <= ultimaRodadaCompleta) {
        try {
          // Buscar dados da rodada
          const queryRodada = {
            ligaId: new mongoose.Types.ObjectId(ligaIdParam),
            rodada: rodadaCartola,
          };

          const dadosRodada = await Rodada.find(queryRodada).lean();

          // Montar mapa de pontuações por time
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

      // Adicionar pontuações aos jogos
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

    console.log(
      `Confrontos gerados e pontuações (parciais) adicionadas para liga ${ligaIdParam}`,
    );
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

// Buscar módulos ativos/configurados da liga
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

    console.log(`[LIGAS] 🔍 Buscando módulos ativos para liga ${ligaIdParam}`);

    // ✅ NOVO SISTEMA: Usar campo modulos_ativos se existir, senão usar detecção automática
    let modulosAtivos;

    if (liga.modulos_ativos && Object.keys(liga.modulos_ativos).length > 0) {
      // Usar configuração explícita
      modulosAtivos = liga.modulos_ativos;
      console.log(`[LIGAS] ✅ Usando configuração explícita de módulos`);
    } else {
      // Fallback: Detecção automática pela presença de configurações
      const config = liga.configuracoes || {};
      
      modulosAtivos = {
        // Módulos base (sempre ativos por padrão)
        extrato: true,
        ranking: true,
        rodadas: true,

        // Módulos condicionais
        top10: !!config.top10,
        melhorMes: !!config.melhor_mes,
        pontosCorridos: !!config.pontos_corridos,
        mataMata: !!config.mata_mata,
        artilheiro: !!config.artilheiro,
        luvaOuro: !!config.luva_ouro
      };
      console.log(`[LIGAS] ⚠️ Usando detecção automática (fallback)`);
    }

    console.log(`[LIGAS] 📋 Módulos ativos:`, modulosAtivos);
    res.json({ modulos: modulosAtivos });

  } catch (err) {
    console.error("[LIGAS] ❌ Erro ao buscar módulos ativos:", err);
    res.status(500).json({ erro: "Erro ao buscar módulos ativos" });
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
};