// limpar-duplicados-rodadas.js
// Remove registros duplicados de times inativos nas rodadas 36-38

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const LIGA_ID = "684d821cf1a7ae16d1f89572"; // Cartoleiros do Sobral
const RODADAS = [36, 37, 38];
const TIMES_INATIVOS = [49149388, 50180257]; // JBMENGO94 e Senhores Da Escuridão

async function limparDuplicados() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Conectado ao MongoDB");

        const db = mongoose.connection.db;
        const colRodadas = db.collection("rodadas");

        // Buscar e deletar registros de inativos nas rodadas 36-38
        for (const rodada of RODADAS) {
            for (const timeId of TIMES_INATIVOS) {
                const result = await colRodadas.deleteMany({
                    ligaId: new mongoose.Types.ObjectId(LIGA_ID),
                    rodada: rodada,
                    timeId: timeId,
                });

                if (result.deletedCount > 0) {
                    console.log(
                        `🗑️ Removidos ${result.deletedCount} registro(s) do time ${timeId} na rodada ${rodada}`,
                    );
                }
            }
        }

        // Verificar resultado
        for (const rodada of RODADAS) {
            const count = await colRodadas.countDocuments({
                ligaId: new mongoose.Types.ObjectId(LIGA_ID),
                rodada: rodada,
            });
            console.log(`📊 Rodada ${rodada}: ${count} registros`);
        }

        // Limpar cache do extrato para forçar recálculo
        const colCache = db.collection("extratocaches");
        const cacheResult = await colCache.deleteMany({
            ligaId: LIGA_ID,
        });
        console.log(
            `🗑️ Cache de extratos limpo: ${cacheResult.deletedCount} registro(s)`,
        );

        console.log("\n✅ Limpeza concluída!");
        console.log(
            "Agora acesse o Fluxo Financeiro novamente para ver os dados corretos.",
        );
    } catch (error) {
        console.error("❌ Erro:", error);
    } finally {
        await mongoose.disconnect();
    }
}

limparDuplicados();
