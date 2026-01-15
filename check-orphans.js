const { MongoClient } = require("mongodb");
require("dotenv").config();

async function verificarCachesOrfaos() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    
    // Buscar todos os caches 2026
    const caches2026 = await db.collection("extratofinanceirocaches")
        .find({ temporada: 2026 })
        .project({ time_id: 1 })
        .toArray();
    
    console.log("📊 Caches 2026 existentes:", caches2026.length);
    
    // Buscar todos os renovados 2026 (exceto nao_participa)
    const renovados = await db.collection("inscricoestemporada")
        .find({ temporada: 2026, status: { $ne: "nao_participa" } })
        .project({ time_id: 1 })
        .toArray();
    
    const timeIdsRenovados = new Set(renovados.map(r => r.time_id));
    console.log("✅ Times renovados 2026:", timeIdsRenovados.size);
    
    // Encontrar órfãos
    const orfaos = caches2026.filter(c => !timeIdsRenovados.has(c.time_id));
    
    if (orfaos.length > 0) {
        console.log("\n⚠️  Caches órfãos encontrados:");
        for (const orfao of orfaos) {
            const time = await db.collection("times").findOne({ id: orfao.time_id });
            console.log("   -", orfao.time_id, ":", time?.nome_time || "N/A", "by", time?.nome_cartoleiro || "N/A");
        }
    } else {
        console.log("\n✅ Nenhum cache órfão. Todos os caches 2026 pertencem a times renovados.");
    }
    
    await client.close();
}

verificarCachesOrfaos().catch(console.error);
