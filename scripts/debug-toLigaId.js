/**
 * Debug script para verificar a função toLigaId
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import RodadaSnapshot from '../models/RodadaSnapshot.js';

dotenv.config();

const SOBRAL_ID = "684d821cf1a7ae16d1f89572";
const TIME_ID = 13935277;

function toLigaId(ligaId) {
    if (mongoose.Types.ObjectId.isValid(ligaId)) {
        return new mongoose.Types.ObjectId(ligaId);
    }
    return ligaId;
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log("[DEBUG] ✅ Conectado ao MongoDB");

        // Testar a função toLigaId
        console.log("\n=== Testando toLigaId ===");
        const converted = toLigaId(SOBRAL_ID);
        console.log("Input:", SOBRAL_ID, typeof SOBRAL_ID);
        console.log("Output:", converted, typeof converted);
        console.log("Is ObjectId:", converted instanceof mongoose.Types.ObjectId);

        // Testar busca no Model ExtratoFinanceiroCache
        console.log("\n=== Testando ExtratoFinanceiroCache.findOne ===");
        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(SOBRAL_ID),
            time_id: Number(TIME_ID),
        }).lean();

        console.log("Cache encontrado:", cache ? "SIM" : "NÃO");
        if (cache) {
            console.log("  - historico_transacoes:", cache.historico_transacoes?.length);
            console.log("  - liga_id tipo:", typeof cache.liga_id);
        }

        // Testar busca direta no DB
        console.log("\n=== Testando busca direta no DB ===");
        const db = mongoose.connection.db;
        const { ObjectId } = mongoose.Types;
        const cacheDirect = await db.collection("extratofinanceirocaches").findOne({
            liga_id: new ObjectId(SOBRAL_ID),
            time_id: TIME_ID
        });
        console.log("Cache direto encontrado:", cacheDirect ? "SIM" : "NÃO");
        if (cacheDirect) {
            console.log("  - historico_transacoes:", cacheDirect.historico_transacoes?.length);
        }

        // Testar RodadaSnapshot
        console.log("\n=== Testando RodadaSnapshot ===");
        const snapshots = await RodadaSnapshot.find({
            liga_id: String(SOBRAL_ID)
        }).limit(3).lean();
        console.log("Snapshots com String:", snapshots.length);

        const snapshotsObj = await RodadaSnapshot.find({
            liga_id: toLigaId(SOBRAL_ID)
        }).limit(3).lean();
        console.log("Snapshots com ObjectId:", snapshotsObj.length);

        // Busca direta nos snapshots
        const snapshotsDirect = await db.collection("rodadasnapshots").find({
            liga_id: SOBRAL_ID
        }).limit(3).toArray();
        console.log("Snapshots direto (string):", snapshotsDirect.length);

        await mongoose.disconnect();
        console.log("\n[DEBUG] 🔌 Desconectado");

    } catch (error) {
        console.error("[DEBUG] ❌ Erro:", error);
        process.exit(1);
    }
}

main();
