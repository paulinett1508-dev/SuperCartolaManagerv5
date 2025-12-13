/**
 * Script para limpar cache de extratos financeiros de TODOS os participantes
 * Executa: node scripts/refresh-extratos-todos.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function limparTodosExtratos() {
    try {
        console.log("[REFRESH-EXTRATOS] Conectando ao MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("[REFRESH-EXTRATOS] Conectado!");

        const db = mongoose.connection.db;

        // 1. Contar documentos antes
        const countAntes = await db.collection("extratofinanceirocaches").countDocuments();
        console.log(`\n[REFRESH-EXTRATOS] Documentos encontrados: ${countAntes}`);

        // 2. Limpar TODOS os caches de extrato financeiro
        console.log("[REFRESH-EXTRATOS] Limpando extratofinanceirocaches...");
        const result = await db.collection("extratofinanceirocaches").deleteMany({});
        console.log(`[REFRESH-EXTRATOS] Removidos ${result.deletedCount} documentos`);

        // 3. Limpar também matamatacaches para garantir consistência
        console.log("\n[REFRESH-EXTRATOS] Limpando matamatacaches...");
        const resultMM = await db.collection("matamatacaches").deleteMany({});
        console.log(`[REFRESH-EXTRATOS] Removidos ${resultMM.deletedCount} documentos de matamatacaches`);

        console.log("\n[REFRESH-EXTRATOS] ========================================");
        console.log("[REFRESH-EXTRATOS] Limpeza concluída com sucesso!");
        console.log("[REFRESH-EXTRATOS] Os extratos serão recalculados automaticamente");
        console.log("[REFRESH-EXTRATOS] quando cada participante acessar seu extrato.");
        console.log("[REFRESH-EXTRATOS] ========================================");

    } catch (error) {
        console.error("[REFRESH-EXTRATOS] Erro:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("[REFRESH-EXTRATOS] Desconectado do MongoDB.");
    }
}

limparTodosExtratos();
