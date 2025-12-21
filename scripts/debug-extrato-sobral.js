/**
 * Debug script para verificar por que o extrato Sobral retorna dados vazios
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';

dotenv.config();

const SOBRAL_ID = "684d821cf1a7ae16d1f89572";
const TIME_ID = 13935277;

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log("[DEBUG] ✅ Conectado ao MongoDB");

        // 1. Testar busca do Mongoose Model com string
        console.log("\n=== 1. Mongoose findOne com STRING ===");
        const cacheStr = await ExtratoFinanceiroCache.findOne({
            liga_id: SOBRAL_ID,
            time_id: TIME_ID
        });
        console.log("Resultado:", cacheStr ? "ENCONTRADO" : "NÃO ENCONTRADO");
        if (cacheStr) {
            console.log("  - historico_transacoes:", cacheStr.historico_transacoes?.length || 0);
            console.log("  - ultima_rodada_consolidada:", cacheStr.ultima_rodada_consolidada);
            console.log("  - saldo_consolidado:", cacheStr.saldo_consolidado);
        }

        // 2. Testar busca do Mongoose Model com ObjectId
        console.log("\n=== 2. Mongoose findOne com ObjectId ===");
        const { ObjectId } = mongoose.Types;
        const cacheObj = await ExtratoFinanceiroCache.findOne({
            liga_id: new ObjectId(SOBRAL_ID),
            time_id: TIME_ID
        });
        console.log("Resultado:", cacheObj ? "ENCONTRADO" : "NÃO ENCONTRADO");
        if (cacheObj) {
            console.log("  - historico_transacoes:", cacheObj.historico_transacoes?.length || 0);
            console.log("  - ultima_rodada_consolidada:", cacheObj.ultima_rodada_consolidada);
            console.log("  - saldo_consolidado:", cacheObj.saldo_consolidado);
        }

        // 3. Testar busca com time_id como string
        console.log("\n=== 3. Mongoose findOne com time_id STRING ===");
        const cacheTimeStr = await ExtratoFinanceiroCache.findOne({
            liga_id: SOBRAL_ID,
            time_id: String(TIME_ID)
        });
        console.log("Resultado:", cacheTimeStr ? "ENCONTRADO" : "NÃO ENCONTRADO");

        // 4. Testar busca com apenas time_id
        console.log("\n=== 4. Mongoose findOne com apenas time_id ===");
        const cacheTimeOnly = await ExtratoFinanceiroCache.find({
            time_id: TIME_ID
        });
        console.log("Total encontrados:", cacheTimeOnly.length);
        cacheTimeOnly.forEach(c => {
            console.log(`  - liga_id: ${c.liga_id}, historico: ${c.historico_transacoes?.length || 0} transações`);
        });

        // 5. Busca direta no DB para comparar
        console.log("\n=== 5. Busca direta no DB (sem Mongoose) ===");
        const db = mongoose.connection.db;
        const cacheDirect = await db.collection("extratofinanceirocaches").findOne({
            liga_id: new ObjectId(SOBRAL_ID),
            time_id: TIME_ID
        });
        console.log("Resultado:", cacheDirect ? "ENCONTRADO" : "NÃO ENCONTRADO");
        if (cacheDirect) {
            console.log("  - historico_transacoes:", cacheDirect.historico_transacoes?.length || 0);
            console.log("  - Primeiras 2 transações:");
            cacheDirect.historico_transacoes?.slice(0, 2).forEach((t, i) => {
                console.log(`    ${i+1}. R${t.rodada}: posicao=${t.posicao}, bonusOnus=${t.bonusOnus}, saldo=${t.saldo}`);
            });
        }

        await mongoose.disconnect();
        console.log("\n[DEBUG] 🔌 Desconectado");

    } catch (error) {
        console.error("[DEBUG] ❌ Erro:", error);
        process.exit(1);
    }
}

main();
