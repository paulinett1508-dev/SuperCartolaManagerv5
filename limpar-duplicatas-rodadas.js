// =====================================================================
// SCRIPT: LIMPAR DUPLICATAS DE RODADAS
// Execute: node limpar-duplicatas-rodadas.js
// =====================================================================

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/supercartola";

// Schema simplificado
const rodadaSchema = new mongoose.Schema(
    {
        ligaId: mongoose.Schema.Types.Mixed,
        rodada: Number,
        timeId: Number,
        pontos: Number,
        nome_time: String,
        nome_cartola: String,
    },
    { collection: "rodadas" },
);

const Rodada = mongoose.model("Rodada", rodadaSchema);

async function limparDuplicatas() {
    try {
        console.log("🔌 Conectando ao MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Conectado!\n");

        // 1. Identificar duplicatas
        console.log("🔍 Buscando duplicatas...\n");

        const duplicatas = await Rodada.aggregate([
            {
                $group: {
                    _id: {
                        ligaId: "$ligaId",
                        rodada: "$rodada",
                        timeId: "$timeId",
                    },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" },
                    pontos: { $first: "$pontos" },
                },
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { "_id.rodada": 1, "_id.timeId": 1 } },
        ]);

        if (duplicatas.length === 0) {
            console.log("✅ Nenhuma duplicata encontrada! Banco está limpo.");
            return;
        }

        console.log(
            `⚠️  Encontradas ${duplicatas.length} combinações duplicadas\n`,
        );

        // 2. Mostrar resumo por rodada
        const resumoPorRodada = {};
        duplicatas.forEach((d) => {
            const rod = d._id.rodada;
            if (!resumoPorRodada[rod]) resumoPorRodada[rod] = 0;
            resumoPorRodada[rod] += d.count - 1; // Excesso
        });

        console.log("📊 Resumo de duplicatas por rodada:");
        Object.entries(resumoPorRodada).forEach(([rod, qtd]) => {
            console.log(`   Rodada ${rod}: ${qtd} registros duplicados`);
        });
        console.log("");

        // 3. Remover duplicatas (manter apenas o primeiro)
        console.log("🗑️  Removendo duplicatas...\n");

        let totalRemovidos = 0;

        for (const dup of duplicatas) {
            // Manter o primeiro ID, remover os demais
            const idsParaRemover = dup.ids.slice(1);

            const resultado = await Rodada.deleteMany({
                _id: { $in: idsParaRemover },
            });

            totalRemovidos += resultado.deletedCount;

            console.log(
                `   Rodada ${dup._id.rodada} | Time ${dup._id.timeId}: removidos ${resultado.deletedCount} duplicados`,
            );
        }

        console.log(
            `\n✅ Total removido: ${totalRemovidos} registros duplicados`,
        );

        // 4. Verificar resultado
        console.log("\n🔍 Verificando resultado...");

        const verificacao = await Rodada.aggregate([
            {
                $group: {
                    _id: {
                        ligaId: "$ligaId",
                        rodada: "$rodada",
                        timeId: "$timeId",
                    },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gt: 1 } } },
        ]);

        if (verificacao.length === 0) {
            console.log("✅ Banco limpo! Todas as duplicatas foram removidas.");
        } else {
            console.log(
                `⚠️  Ainda existem ${verificacao.length} duplicatas. Execute novamente.`,
            );
        }

        // 5. Contagem final
        const totalRegistros = await Rodada.countDocuments();
        const totalPorRodada = await Rodada.aggregate([
            { $group: { _id: "$rodada", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        console.log(`\n📊 Total de registros no banco: ${totalRegistros}`);
        console.log("📊 Registros por rodada:");
        totalPorRodada.forEach((r) => {
            console.log(`   Rodada ${r._id}: ${r.count} participantes`);
        });
    } catch (error) {
        console.error("❌ Erro:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Desconectado do MongoDB");
    }
}

limparDuplicatas();
