const { MongoClient, ObjectId } = require('mongodb');
const golsBackup = require('../data/backups/pre-wipe-2026-01-01T22-52-14/golsconsolidados.json');

const SOBRAL_ID = '684d821cf1a7ae16d1f89572';

async function restaurarGolsConsolidados() {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // Filtrar documentos da SOBRAL
    const sobralGols = golsBackup.filter(g => g.ligaId === SOBRAL_ID);

    console.log('Documentos SOBRAL encontrados no backup:', sobralGols.length);

    if (sobralGols.length === 0) {
        console.log('Nenhum documento encontrado');
        client.close();
        return;
    }

    // Mostrar estatisticas do backup
    const totalGols = sobralGols.reduce((sum, g) => sum + (g.golsPro || 0), 0);
    const rodadasUnicas = [...new Set(sobralGols.map(g => g.rodada))];
    console.log('Total de gols pro no backup:', totalGols);
    console.log('Rodadas unicas:', rodadasUnicas.sort((a,b) => a-b).join(', '));

    // Limpar documentos atuais da SOBRAL (zerados pelo turn_key)
    const deleted = await db.collection('golsconsolidados').deleteMany({ ligaId: SOBRAL_ID });
    console.log('Documentos zerados removidos:', deleted.deletedCount);

    // Preparar documentos para inserir (sem _id para gerar novos)
    const docsParaInserir = sobralGols.map(g => {
        const { _id, ...docSemId } = g;

        // Converter datas se necessario
        if (docSemId.createdAt) docSemId.createdAt = new Date(docSemId.createdAt);
        if (docSemId.updatedAt) docSemId.updatedAt = new Date(docSemId.updatedAt);
        if (docSemId.dataColeta) docSemId.dataColeta = new Date(docSemId.dataColeta);

        docSemId.restaurado_em = new Date();
        docSemId.fonte = 'backup_pre_wipe_2026_01_01';

        return docSemId;
    });

    // Inserir documentos restaurados
    const result = await db.collection('golsconsolidados').insertMany(docsParaInserir);
    console.log('Documentos inseridos:', result.insertedCount);

    // Verificar
    const count = await db.collection('golsconsolidados').countDocuments({ ligaId: SOBRAL_ID });
    console.log('Total documentos SOBRAL agora:', count);

    // Mostrar amostra
    const amostra = await db.collection('golsconsolidados')
        .find({ ligaId: SOBRAL_ID, golsPro: { $gt: 0 } })
        .limit(5)
        .toArray();

    console.log('\nAmostra de documentos com gols:');
    amostra.forEach(g => {
        console.log(`  R${g.rodada} Time ${g.timeId}: ${g.golsPro} GP, ${g.golsContra} GC`);
    });

    client.close();
    console.log('\nConcluido!');
}

restaurarGolsConsolidados().catch(console.error);
