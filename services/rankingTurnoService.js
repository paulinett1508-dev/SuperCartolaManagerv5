// services/rankingTurnoService.js
import RankingTurno from "../models/RankingTurno.js";
import Rodada from "../models/Rodada.js";
import mongoose from "mongoose";

const LOG_PREFIX = "[RANKING-TURNO-SERVICE]";

/**
 * Busca ranking de um turno específico
 * Se não existir ou estiver desatualizado, consolida automaticamente
 */
export async function buscarRankingTurno(ligaId, turno) {
    console.log(
        `${LOG_PREFIX} Buscando ranking turno ${turno} para liga ${ligaId}`,
    );

    // Validar turno
    if (!["1", "2", "geral"].includes(turno)) {
        throw new Error("Turno inválido. Use: 1, 2 ou geral");
    }

    // Converter ligaId para ObjectId se necessário
    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    // Buscar snapshot existente
    let snapshot = await RankingTurno.findOne({ ligaId: ligaObjectId, turno });

    // Se já está consolidado, retorna direto (imutável)
    if (snapshot && snapshot.status === "consolidado") {
        console.log(`${LOG_PREFIX} ✅ Retornando snapshot consolidado`);
        return snapshot;
    }

    // Se não existe ou está em andamento, verificar se precisa atualizar
    const { inicio, fim } = RankingTurno.getRodadasTurno(turno);

    // Buscar última rodada processada da liga
    const ultimaRodada = await Rodada.findOne({ ligaId: ligaObjectId })
        .sort({ rodada: -1 })
        .select("rodada")
        .lean();

    const rodadaAtual = ultimaRodada?.rodada || 0;

    // Verificar se precisa consolidar
    const precisaConsolidar =
        !snapshot ||
        snapshot.rodada_atual < rodadaAtual ||
        (rodadaAtual >= fim && snapshot.status !== "consolidado");

    if (precisaConsolidar) {
        console.log(`${LOG_PREFIX} 🔄 Consolidando ranking turno ${turno}...`);
        snapshot = await consolidarRankingTurno(
            ligaObjectId,
            turno,
            rodadaAtual,
        );
    }

    return snapshot;
}

/**
 * Consolida ranking de um turno calculando pontos das rodadas
 */
export async function consolidarRankingTurno(ligaId, turno, rodadaAtualGeral) {
    const { inicio, fim } = RankingTurno.getRodadasTurno(turno);

    console.log(
        `${LOG_PREFIX} Consolidando turno ${turno} (rodadas ${inicio}-${fim})`,
    );

    // Buscar todas as rodadas do turno
    const rodadas = await Rodada.find({
        ligaId,
        rodada: { $gte: inicio, $lte: fim },
    }).lean();

    if (!rodadas || rodadas.length === 0) {
        console.log(
            `${LOG_PREFIX} ⚠️ Nenhuma rodada encontrada para turno ${turno}`,
        );
        return null;
    }

    console.log(`${LOG_PREFIX} 📊 Processando ${rodadas.length} registros`);

    // Agrupar por timeId e somar pontos
    const timesPontos = {};

    rodadas.forEach((registro) => {
        const timeId = registro.timeId;
        const pontos = registro.rodadaNaoJogada ? 0 : registro.pontos || 0;

        if (!timesPontos[timeId]) {
            timesPontos[timeId] = {
                timeId,
                nome_time: registro.nome_time || "N/D",
                nome_cartola: registro.nome_cartola || "N/D",
                escudo: registro.escudo || "",
                clube_id: registro.clube_id,
                pontos: 0,
                rodadas_jogadas: 0,
            };
        }

        timesPontos[timeId].pontos += pontos;
        if (!registro.rodadaNaoJogada && pontos > 0) {
            timesPontos[timeId].rodadas_jogadas++;
        }
    });

    // Converter para array e ordenar por pontos
    const ranking = Object.values(timesPontos)
        .sort((a, b) => b.pontos - a.pontos)
        .map((time, index) => ({
            posicao: index + 1,
            ...time,
        }));

    // Determinar rodada atual do turno
    const rodadaAtualTurno = Math.min(
        Math.max(...rodadas.map((r) => r.rodada)),
        fim,
    );

    // Determinar status
    const deveConsolidar = rodadaAtualGeral >= fim;
    const status = deveConsolidar ? "consolidado" : "em_andamento";

    // Salvar snapshot (upsert)
    const snapshot = await RankingTurno.findOneAndUpdate(
        { ligaId, turno },
        {
            ligaId,
            turno,
            status,
            rodada_inicio: inicio,
            rodada_fim: fim,
            rodada_atual: rodadaAtualTurno,
            ranking,
            consolidado_em: deveConsolidar ? new Date() : null,
            atualizado_em: new Date(),
        },
        { upsert: true, new: true },
    );

    console.log(
        `${LOG_PREFIX} ✅ Turno ${turno} ${status} - ${ranking.length} times`,
    );

    return snapshot;
}

/**
 * Força reconsolidação de todos os turnos de uma liga
 */
export async function reconsolidarTodosOsTurnos(ligaId) {
    console.log(
        `${LOG_PREFIX} 🔄 Reconsolidando todos os turnos para liga ${ligaId}`,
    );

    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    // Buscar última rodada
    const ultimaRodada = await Rodada.findOne({ ligaId: ligaObjectId })
        .sort({ rodada: -1 })
        .select("rodada")
        .lean();

    const rodadaAtual = ultimaRodada?.rodada || 0;

    // Consolidar cada turno
    const resultados = {
        turno1: await consolidarRankingTurno(ligaObjectId, "1", rodadaAtual),
        turno2: await consolidarRankingTurno(ligaObjectId, "2", rodadaAtual),
        geral: await consolidarRankingTurno(ligaObjectId, "geral", rodadaAtual),
    };

    return resultados;
}

/**
 * Invalida cache de um turno (força recálculo na próxima busca)
 */
export async function invalidarCacheTurno(ligaId, turno = null) {
    const ligaObjectId =
        typeof ligaId === "string"
            ? new mongoose.Types.ObjectId(ligaId)
            : ligaId;

    const filtro = { ligaId: ligaObjectId };

    // Se turno específico e NÃO consolidado, pode invalidar
    if (turno) {
        filtro.turno = turno;
        filtro.status = { $ne: "consolidado" }; // Não invalida consolidados
    } else {
        filtro.status = { $ne: "consolidado" };
    }

    const resultado = await RankingTurno.deleteMany(filtro);

    console.log(
        `${LOG_PREFIX} 🗑️ Cache invalidado: ${resultado.deletedCount} registros`,
    );

    return resultado;
}

export default {
    buscarRankingTurno,
    consolidarRankingTurno,
    reconsolidarTodosOsTurnos,
    invalidarCacheTurno,
};
