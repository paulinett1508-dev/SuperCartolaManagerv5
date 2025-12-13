/**
 * Script para limpar caches do Mata-Mata após correção de configuração
 * Executa: node scripts/limpar-cache-mata-mata.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const LIGA_SUPERCARTOLA = "684cb1c8af923da7c7df51de";

async function limparCaches() {
    try {
        console.log("[LIMPAR-CACHE] Conectando ao MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("[LIMPAR-CACHE] Conectado!");

        const db = mongoose.connection.db;

        // 1. Limpar matamatacaches da liga SuperCartola
        console.log("\n[LIMPAR-CACHE] Limpando matamatacaches...");
        const resultMM = await db.collection("matamatacaches").deleteMany({
            liga_id: LIGA_SUPERCARTOLA,
        });
        console.log(`[LIMPAR-CACHE] Removidos ${resultMM.deletedCount} documentos de matamatacaches`);

        // 2. Limpar extratofinanceirocaches da liga SuperCartola
        // Nota: liga_id é armazenado como ObjectId no MongoDB
        console.log("\n[LIMPAR-CACHE] Limpando extratofinanceirocaches...");
        const resultExtrato = await db.collection("extratofinanceirocaches").deleteMany({
            liga_id: new mongoose.Types.ObjectId(LIGA_SUPERCARTOLA),
        });
        console.log(`[LIMPAR-CACHE] Removidos ${resultExtrato.deletedCount} documentos de extratofinanceirocaches`);

        console.log("\n[LIMPAR-CACHE] Limpeza concluída com sucesso!");
        console.log("[LIMPAR-CACHE] Os caches serão recalculados automaticamente na próxima requisição.");

    } catch (error) {
        console.error("[LIMPAR-CACHE] Erro:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("[LIMPAR-CACHE] Desconectado do MongoDB.");
    }
}

limparCaches();
