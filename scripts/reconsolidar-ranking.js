#!/usr/bin/env node
// ========================================================================
// reconsolidar-ranking.js - Reconsolidar cache de ranking-turno
// ========================================================================
// Usage: node scripts/reconsolidar-ranking.js <ligaId>
// ========================================================================

import { reconsolidarTodosOsTurnos } from "../services/rankingTurnoService.js";
import mongoose from "mongoose";
import "../config/database.js";

const LOG_PREFIX = "[RECONSOLIDAR-RANKING]";

async function waitForMongo() {
    console.log(`${LOG_PREFIX} Aguardando conexão com MongoDB...`);
    while (mongoose.connection.readyState !== 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log(`${LOG_PREFIX} ✅ Conectado ao MongoDB`);
}

async function main() {
    const ligaId = process.argv[2];

    if (!ligaId) {
        console.error(`${LOG_PREFIX} ❌ Usage: node scripts/reconsolidar-ranking.js <ligaId>`);
        process.exit(1);
    }

    await waitForMongo();

    console.log(`${LOG_PREFIX} 🚀 Iniciando reconsolidação para liga ${ligaId}...`);

    try {
        const resultados = await reconsolidarTodosOsTurnos(ligaId);

        console.log(`${LOG_PREFIX} ✅ Reconsolidação concluída!`);
        console.log(`${LOG_PREFIX} Turno 1:`, resultados.turno1?.status || "N/A");
        console.log(`${LOG_PREFIX} Turno 2:`, resultados.turno2?.status || "N/A");
        console.log(`${LOG_PREFIX} Geral:`, resultados.geral?.status || "N/A");

        process.exit(0);
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Erro:`, error);
        process.exit(1);
    }
}

main();
