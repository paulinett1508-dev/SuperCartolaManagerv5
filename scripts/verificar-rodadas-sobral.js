/**
 * Script para verificar quais times têm rodadas na liga Sobral
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const SOBRAL_ID = "684d821cf1a7ae16d1f89572";

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log("[RODADAS-SOBRAL] ✅ Conectado ao MongoDB");

        const db = mongoose.connection.db;
        const { ObjectId } = mongoose.Types;

        // Verificar times com rodadas em Sobral
        const timesComRodadas = await db.collection("rodadas").distinct("timeId", {
            ligaId: new ObjectId(SOBRAL_ID)
        });

        console.log(`[RODADAS-SOBRAL] Times COM rodadas: ${timesComRodadas.length}`);
        console.log("  " + timesComRodadas.join(", "));

        // Quantas rodadas por time
        console.log("\n[RODADAS-SOBRAL] Rodadas por time:");
        for (const tid of timesComRodadas) {
            const count = await db.collection("rodadas").countDocuments({
                ligaId: new ObjectId(SOBRAL_ID),
                timeId: tid
            });
            console.log(`  - ${tid}: ${count} rodadas`);
        }

        // Buscar liga para ver participantes
        const liga = await db.collection("ligas").findOne({_id: new ObjectId(SOBRAL_ID)});
        const participantes = liga?.participantes || [];

        console.log(`\n[RODADAS-SOBRAL] Participantes na liga: ${participantes.length}`);

        // Comparar
        const timeIds = participantes.map(p => p.time_id);
        const semRodadas = timeIds.filter(tid => {
            return timesComRodadas.indexOf(tid) === -1;
        });

        console.log(`\n[RODADAS-SOBRAL] ❌ Times SEM rodadas: ${semRodadas.length}`);
        semRodadas.forEach(tid => {
            const p = participantes.find(x => x.time_id === tid);
            console.log(`  - ${tid}: ${p?.nome_time || "?"}`);
        });

        const comRodadas = timeIds.filter(tid => {
            return timesComRodadas.indexOf(tid) !== -1;
        });

        console.log(`\n[RODADAS-SOBRAL] ✅ Times COM rodadas: ${comRodadas.length}`);
        comRodadas.forEach(tid => {
            const p = participantes.find(x => x.time_id === tid);
            console.log(`  - ${tid}: ${p?.nome_time || "?"}`);
        });

        await mongoose.disconnect();
        console.log("\n[RODADAS-SOBRAL] 🔌 Desconectado");

    } catch (error) {
        console.error("[RODADAS-SOBRAL] ❌ Erro:", error);
        process.exit(1);
    }
}

main();
