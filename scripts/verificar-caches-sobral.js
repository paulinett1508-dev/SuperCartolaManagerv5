/**
 * Script para verificar quais times da liga Sobral têm/faltam cache de extrato
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const SOBRAL_ID = "684d821cf1a7ae16d1f89572";

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log("[CHECK-SOBRAL] ✅ Conectado ao MongoDB");

        const db = mongoose.connection.db;

        // Times que TÊM cache para Sobral
        const caches = await db.collection("extratofinanceirocaches").find({liga_id: SOBRAL_ID}).toArray();
        const cacheTimeIds = caches.map(c => c.time_id);
        console.log(`[CHECK-SOBRAL] Times COM cache: ${cacheTimeIds.length}`);
        console.log("  ", cacheTimeIds.join(", "));

        // Buscar liga para ver todos os participantes
        const { ObjectId } = mongoose.Types;
        const liga = await db.collection("ligas").findOne({_id: new ObjectId(SOBRAL_ID)});

        if (liga && liga.participantes) {
            console.log(`\n[CHECK-SOBRAL] Total participantes: ${liga.participantes.length}`);

            const participantesInfo = liga.participantes.map(p => ({
                time_id: p.time_id,
                nome: p.nome_time
            }));

            // Times SEM cache
            const timesSemCache = participantesInfo.filter(p => {
                return cacheTimeIds.indexOf(p.time_id) === -1;
            });

            console.log(`\n[CHECK-SOBRAL] ❌ Times SEM cache: ${timesSemCache.length}`);
            timesSemCache.forEach(t => {
                console.log(`  - ${t.time_id}: ${t.nome}`);
            });

            // Times COM cache
            const timesComCache = participantesInfo.filter(p => {
                return cacheTimeIds.indexOf(p.time_id) !== -1;
            });

            console.log(`\n[CHECK-SOBRAL] ✅ Times COM cache: ${timesComCache.length}`);
            timesComCache.forEach(t => {
                console.log(`  - ${t.time_id}: ${t.nome}`);
            });
        }

        await mongoose.disconnect();
        console.log("\n[CHECK-SOBRAL] 🔌 Desconectado");

    } catch (error) {
        console.error("[CHECK-SOBRAL] ❌ Erro:", error);
        process.exit(1);
    }
}

main();
