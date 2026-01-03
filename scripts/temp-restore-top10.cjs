const { MongoClient, ObjectId } = require('mongodb');
const top10Backup = require('../data/backups/pre-wipe-2026-01-01T22-52-14/top10caches.json');

const SOBRAL_ID = '684d821cf1a7ae16d1f89572';

async function restaurarTop10() {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // Filtrar documento da SOBRAL
    const docSobral = top10Backup.find(t => String(t.liga_id) === SOBRAL_ID);

    if (!docSobral) {
        console.log('Documento SOBRAL não encontrado no backup');
        client.close();
        return;
    }

    console.log('Documento encontrado:', {
        mitos: docSobral.mitos ? docSobral.mitos.length : 0,
        micos: docSobral.micos ? docSobral.micos.length : 0
    });

    // Remover _id do backup e converter liga_id para ObjectId
    const { _id, ...docSemId } = docSobral;
    docSemId.liga_id = new ObjectId(SOBRAL_ID);
    docSemId.restaurado_em = new Date();
    docSemId.fonte = 'backup_pre_wipe_2026_01_01';

    // Verificar se já existe
    const existente = await db.collection('top10caches').findOne({ liga_id: new ObjectId(SOBRAL_ID) });

    if (existente) {
        console.log('TOP10 SOBRAL já existe, atualizando...');
        await db.collection('top10caches').updateOne(
            { liga_id: new ObjectId(SOBRAL_ID) },
            { $set: docSemId }
        );
        console.log('Atualizado!');
    } else {
        console.log('Inserindo TOP10 SOBRAL...');
        await db.collection('top10caches').insertOne(docSemId);
        console.log('Inserido!');
    }

    // Verificar
    const verificar = await db.collection('top10caches').findOne({ liga_id: new ObjectId(SOBRAL_ID) });
    if (verificar) {
        console.log('Verificacao OK:', {
            mitos: verificar.mitos ? verificar.mitos.length : 0,
            micos: verificar.micos ? verificar.micos.length : 0
        });
    }

    client.close();
    console.log('Concluido!');
}

restaurarTop10().catch(console.error);
