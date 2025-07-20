// controllers/rodadaController.js
import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import fetch from "node-fetch"; // Adicione esta importação se necessário
import mongoose from "mongoose";

export async function buscarRodadas(req, res) {
  const { ligaId } = req.params;
  const { inicio, fim } = req.query;

  try {
    const inicioNum = parseInt(inicio);
    const fimNum = parseInt(fim);

    if (isNaN(inicioNum) || isNaN(fimNum)) {
      return res
        .status(400)
        .json({ error: "Parâmetros inicio e fim devem ser números válidos" });
    }

    // Validação do ObjectId
    if (!mongoose.Types.ObjectId.isValid(ligaId)) {
      return res.status(400).json({ error: "ID de liga inválido" });
    }
    const ligaObjectId = new mongoose.Types.ObjectId(ligaId);

    let queryMongo;
    if (inicioNum === fimNum) {
      queryMongo = {
        ligaId: ligaObjectId,
        rodada: inicioNum,
      };
    } else {
      queryMongo = {
        ligaId: ligaObjectId,
        rodada: { $gte: inicioNum, $lte: fimNum },
      };
    }

    const rodadas = await Rodada.find(queryMongo).lean();

    // Log para depuração: verificar se o campo 'rodada' está presente
    console.log("Rodadas encontradas:", rodadas);

    return res.status(200).json(rodadas);
  } catch (err) {
    console.error("Erro ao buscar rodadas:", err.message);
    return res.status(500).json({ error: "Erro ao buscar rodadas" });
  }
}

// Função auxiliar para buscar pontos da API do Cartola
async function buscarPontosRodada(timeId, rodada) {
  try {
    const res = await fetch(
      `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`,
    );
    if (!res.ok) {
      console.warn(
        `API retornou status ${res.status} para time ${timeId} na rodada ${rodada}`,
      );
      return 0;
    }
    const data = await res.json();
    return data.pontos || 0;
  } catch (err) {
    console.warn(
      `Erro ao buscar pontos do time ${timeId} na rodada ${rodada}:`,
      err.message,
    );
    return 0;
  }
}

// Popular uma ou mais rodadas no MongoDB (com pontos reais do Cartola)
export async function popularRodadas(req, res) {
  const { ligaId } = req.params;
  const { inicio, fim, repopular } = req.body;
  const repopularBool = String(repopular) === "true";
  console.log(
    "Repopular recebido:",
    repopular,
    "Interpretado como:",
    repopularBool,
  );

  try {
    console.log(
      `[popularRodadas] Iniciando populacao para ligaId: ${ligaId}, inicio: ${inicio}, fim: ${fim}, repopular: ${repopularBool}`,
    );
    const inicioNum = parseInt(inicio);
    const fimNum = parseInt(fim);

    if (isNaN(inicioNum) || isNaN(fimNum)) {
      console.error("[popularRodadas] Parametros inicio ou fim invalidos.");
      return res
        .status(400)
        .json({ error: "Parâmetros inicio e fim devem ser números válidos" });
    }

    const liga = await Liga.findById(ligaId).lean();
    if (!liga) {
      console.error(`[popularRodadas] Liga ${ligaId} nao encontrada.`);
      return res.status(404).json({ error: "Liga não encontrada" });
    }
    console.log(`[popularRodadas] Liga encontrada: ${liga.nome}`);

    // Verificar se todos os times da liga existem na coleção Time
    console.log(
      `[popularRodadas] Liga ${ligaId} tem ${liga.times.length} times cadastrados:`,
      liga.times,
    );

    // Buscar todos os times da liga no banco de dados
    const times = await Time.find({ id: { $in: liga.times } }).lean();
    console.log(
      `Encontrados ${times.length} times no banco de dados para a liga ${ligaId}`,
    );

    // Verificar quais IDs estão faltando
    const timesEncontradosIds = times.map((t) => t.id);
    const timesFaltantes = liga.times.filter(
      (id) => !timesEncontradosIds.includes(id),
    );

    if (timesFaltantes.length > 0) {
      console.warn(
        `ATENÇÃO: ${timesFaltantes.length} times da liga não foram encontrados no banco de dados:`,
        timesFaltantes,
      );
    }

    if (!times.length)
      return res
        .status(404)
        .json({ error: "Nenhum time encontrado para a liga" });

    // Verifica status atual do mercado
    try {
      const statusRes = await fetch(
        "https://api.cartola.globo.com/mercado/status",
      );
      if (!statusRes.ok) throw new Error("Erro ao buscar status do mercado");
      const statusData = await statusRes.json();
      const rodadaAtual = statusData.rodada_atual;

      // Estatísticas para o relatório final
      let rodadasProcessadas = 0;
      let rodadasPuladas = 0;
      let registrosInseridos = 0;

      for (let rodada = inicioNum; rodada <= fimNum; rodada++) {
        // Se não for repopular e a rodada já existe, pula
        if (!repopularBool) {
          const jaExiste = await Rodada.exists({ ligaId, rodada });
          if (jaExiste) {
            console.log(
              `Pulando rodada ${rodada} - já existe e repopular não está marcado`,
            );
            rodadasPuladas++;
            continue;
          }
        }

        // Sempre remove rodadas existentes antes de inserir novas
        await Rodada.deleteMany({ ligaId, rodada });
        rodadasProcessadas++;

        // Se for rodada futura, marca como não jogada
        if (rodada > rodadaAtual) {
          console.log(`Rodada ${rodada} é futura - preenchendo com zeros`);
          const rodadasFuturas = times.map((time) => ({
            ligaId,
            rodada,
            timeId: time.id,
            nome_cartola: time.nome_cartoleiro || "N/D",
            nome_time: time.nome_time || "N/D",
            escudo: time.url_escudo_png || "",
            clube_id: time.clube_id || "",
            escudo_time_do_coracao: "",
            pontos: 0,
            rodadaNaoJogada: true,
          }));
          const resultado = await Rodada.insertMany(rodadasFuturas);
          registrosInseridos += resultado.length;
          console.log(
            `Inseridos ${resultado.length} registros para rodada futura ${rodada}`,
          );
          continue;
        }

        // Busca pontos reais para cada time na rodada
        console.log(`Buscando pontos da rodada ${rodada} na API do Cartola...`);
        const rodadasComPontos = await Promise.all(
          times.map(async (time) => {
            const pontos = await buscarPontosRodada(time.id, rodada);
            console.log(
              `Time ${time.id} (${time.nome_time}) - Rodada ${rodada} - Pontos: ${pontos}`,
            );
            return {
              ligaId,
              rodada,
              timeId: time.id,
              nome_cartola: time.nome_cartoleiro || "N/D",
              nome_time: time.nome_time || "N/D",
              escudo: time.url_escudo_png || "",
              clube_id: time.clube_id || "",
              escudo_time_do_coracao: "",
              pontos,
              rodadaNaoJogada: false,
            };
          }),
        );

        const resultado = await Rodada.insertMany(rodadasComPontos);
        registrosInseridos += resultado.length;
        console.log(
          `Rodada ${rodada} ${repopularBool ? "re" : ""}populada com sucesso. Inseridos ${resultado.length} registros.`,
        );
      }

      res.status(200).json({
        message: `Rodadas ${inicioNum} a ${fimNum} ${
          repopularBool ? "repopuladas" : "populadas"
        } com sucesso`,
        estatisticas: {
          rodadasProcessadas,
          rodadasPuladas,
          registrosInseridos,
          timesEncontrados: times.length,
          timesCadastrados: liga.times.length,
          timesFaltantes: timesFaltantes.length > 0 ? timesFaltantes : [],
        },
      });
    } catch (err) {
      console.error("Erro ao acessar API do Cartola:", err.message);
      return res.status(500).json({ error: "Erro ao acessar API do Cartola" });
    }
  } catch (err) {
    console.error("Erro ao popular rodadas:", err.message);
    res.status(500).json({ error: "Erro ao popular rodadas" });
  }
}
