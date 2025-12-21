// Script para verificar dados da liga Cartoleiros do Sobral
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function buscar() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.log('URI não encontrada');
        return;
    }

    await mongoose.connect(uri);

    const ligaIdStr = '684d821cf1a7ae16d1f89572';
    const ligaIdObj = new mongoose.Types.ObjectId(ligaIdStr);

    console.log('=== VERIFICAÇÃO LIGA CARTOLEIROS DO SOBRAL ===\n');

    // Buscar snapshots com STRING
    const snapshotsStr = await mongoose.connection.db.collection('rodadasnapshots').find({liga_id: ligaIdStr}).toArray();
    console.log('Snapshots (busca por String):', snapshotsStr.length);
    if (snapshotsStr.length > 0) {
        console.log('  Rodadas:', snapshotsStr.map(s => s.rodada).join(', '));
        console.log('  Tipo de liga_id:', typeof snapshotsStr[0].liga_id);
    }

    // Buscar extratos com STRING
    const extratosStr = await mongoose.connection.db.collection('extratofinanceirocaches').find({liga_id: ligaIdStr}).toArray();
    console.log('\nExtratos (busca por String):', extratosStr.length);

    // Buscar extratos com ObjectId
    const extratosObj = await mongoose.connection.db.collection('extratofinanceirocaches').find({liga_id: ligaIdObj}).toArray();
    console.log('Extratos (busca por ObjectId):', extratosObj.length);

    if (extratosObj.length > 0) {
        console.log('  Times:', extratosObj.map(e => e.time_id).join(', '));
        console.log('  Tipo de liga_id:', typeof extratosObj[0].liga_id, extratosObj[0].liga_id instanceof mongoose.Types.ObjectId);
    }

    // Verificar um sample do snapshot
    if (snapshotsStr.length > 0) {
        const sample = snapshotsStr[0];
        console.log('\n=== SAMPLE SNAPSHOT ===');
        console.log('Rodada:', sample.rodada);
        console.log('liga_id:', sample.liga_id, '| Tipo:', typeof sample.liga_id);
        console.log('Tem dados_consolidados:', !!sample.dados_consolidados);
        if (sample.dados_consolidados) {
            console.log('  times_stats:', sample.dados_consolidados.times_stats?.length || 0);
            console.log('  extratos_financeiros:', sample.dados_consolidados.extratos_financeiros?.length || 0);
        }
    }

    await mongoose.disconnect();
}

buscar().catch(console.error);
