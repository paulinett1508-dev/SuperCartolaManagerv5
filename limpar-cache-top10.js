// =====================================================================
// SCRIPT: LIMPAR CACHE TOP10 CORROMPIDO
// Execute: node limpar-cache-top10.js
// =====================================================================

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/supercartola";

async function limparCacheTop10() {
    try {
        console.log("🔌 Conectando ao MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Conectado!\n");

        // Verificar coleção de cache do TOP10
        const collections = await mongoose.connection.db
            .listCollections()
            .toArray();
        const cacheCollections = collections.filter(
            (c) =>
                c.name.includes("top10") ||
                c.name.includes("cache") ||
                c.name.includes("Top10"),
        );

        console.log("📋 Coleções encontradas relacionadas a cache/top10:");
        cacheCollections.forEach((c) => console.log(`   - ${c.name}`));

        // Tentar limpar caches conhecidos
        const possibleCaches = [
            "top10caches",
            "top10_caches",
            "Top10Cache",
            "caches",
        ];

        for (const collName of possibleCaches) {
            try {
                const collection = mongoose.connection.db.collection(collName);
                const count = await collection.countDocuments();

                if (count > 0) {
                    console.log(
                        `\n🗑️  Limpando coleção "${collName}" (${count} documentos)...`,
                    );

                    // Deletar documentos relacionados ao TOP10
                    const result = await collection.deleteMany({
                        $or: [
                            { mitos: { $exists: true } },
                            { micos: { $exists: true } },
                            { tipo: "top10" },
                            { modulo: "top10" },
                        ],
                    });

                    console.log(
                        `   ✅ Removidos ${result.deletedCount} documentos de cache TOP10`,
                    );
                }
            } catch (e) {
                // Coleção não existe, ignorar
            }
        }

        // Verificar se existe modelo específico
        try {
            const Top10Cache = mongoose.connection.db.collection("top10caches");
            const total = await Top10Cache.countDocuments();
            console.log(`\n📊 Total de caches TOP10 restantes: ${total}`);
        } catch (e) {
            console.log("\n📊 Coleção top10caches não encontrada");
        }

        console.log("\n✅ Limpeza de cache TOP10 concluída!");
        console.log(
            "💡 Agora atualize a página do admin para recalcular o TOP10",
        );
    } catch (error) {
        console.error("❌ Erro:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Desconectado do MongoDB");
    }
}

limparCacheTop10();
