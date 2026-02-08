import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function query() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const ligaId = '684cb1c8af923da7c7df51de';
    const ligaObjId = new mongoose.Types.ObjectId(ligaId);
    
    // 1. Liga configuracoes
    const liga = await db.collection('ligas').findOne({ _id: ligaObjId });
    console.log('=== LIGA.configuracoes ===');
    console.log(JSON.stringify(liga.configuracoes, null, 2));
    console.log('\n=== LIGA.modulos_ativos ===');
    console.log(JSON.stringify(liga.modulos_ativos, null, 2));
    
    // 2. Check PC cache
    console.log('\n=== pontoscorridoscaches 2026 ===');
    const pcCache = await db.collection('pontoscorridoscaches').findOne({
        liga_id: ligaId,
        temporada: 2026
    });
    if (pcCache) {
        console.log('Exists: YES');
        console.log('rodada_atual:', pcCache.rodada_atual);
        console.log('confrontos count:', (pcCache.confrontos || []).length);
        console.log('classificacao count:', (pcCache.classificacao || []).length);
    } else {
        // Try ObjectId
        const pcCache2 = await db.collection('pontoscorridoscaches').findOne({
            liga_id: ligaObjId,
            temporada: 2026
        });
        if (pcCache2) {
            console.log('Exists: YES (ObjectId)');
        } else {
            console.log('Exists: NO');
        }
    }
    
    // 3. Check PC cache 2025 for reference
    console.log('\n=== pontoscorridoscaches 2025 ===');
    const pcCache2025 = await db.collection('pontoscorridoscaches').findOne({
        liga_id: ligaId,
        temporada: 2025
    });
    if (pcCache2025) {
        console.log('Exists: YES');
        console.log('rodada_atual:', pcCache2025.rodada_atual);
        console.log('confrontos count:', (pcCache2025.confrontos || []).length);
    } else {
        console.log('Exists: NO');
    }
    
    // 4. Check consolidacao snapshots for R1 and R2 2026
    console.log('\n=== Snapshots 2026 (confrontos_pontos_corridos) ===');
    const snapshots = await db.collection('consolidacaosnapshots').find({
        liga_id: ligaObjId,
        temporada: 2026,
        rodada: { $in: [1, 2] }
    }).toArray();
    
    for (const snap of snapshots) {
        const pc = snap.dados_consolidados?.confrontos_pontos_corridos || [];
        console.log(`R${snap.rodada}: confrontos_pontos_corridos = ${pc.length} confrontos`);
        if (pc.length > 0) {
            console.log('  Exemplo:', JSON.stringify(pc[0]));
        }
    }
    
    // Also check without ObjectId
    if (snapshots.length === 0) {
        const snapshots2 = await db.collection('consolidacaosnapshots').find({
            liga_id: ligaId,
            temporada: 2026,
            rodada: { $in: [1, 2] }
        }).toArray();
        console.log(`(string query): ${snapshots2.length} snapshots`);
        for (const snap of snapshots2) {
            const pc = snap.dados_consolidados?.confrontos_pontos_corridos || [];
            console.log(`R${snap.rodada}: confrontos_pontos_corridos = ${pc.length} confrontos`);
        }
    }
    
    await mongoose.disconnect();
}

query();
