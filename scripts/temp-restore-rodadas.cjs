const { MongoClient, ObjectId } = require('mongodb');
const rodadasBackup = require('../data/backups/pre-wipe-2026-01-01T22-52-14/rodadas.json');

const SOBRAL = '684d821cf1a7ae16d1f89572';

async function restaurarRodadas() {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // Filtrar rodadas da SOBRAL
    const sobralRodadas = rodadasBackup.filter(r => {
        const lid = r.ligaId;
        if (typeof lid === 'string') return lid === SOBRAL;
        if (lid && lid['$oid']) return lid['$oid'] === SOBRAL;
        return false;
    });

    console.log('Rodadas SOBRAL encontradas:', sobralRodadas.length);

    if (sobralRodadas.length === 0) {
        console.log('Nenhuma rodada encontrada');
        client.close();
        return;
    }

    // Preparar documentos para inserção
    const docsParaInserir = sobralRodadas.map(r => {
        const { _id, ...docSemId } = r;

        // Converter ligaId para ObjectId
        if (typeof docSemId.ligaId === 'string') {
            docSemId.ligaId = new ObjectId(docSemId.ligaId);
        } else if (docSemId.ligaId && docSemId.ligaId['$oid']) {
            docSemId.ligaId = new ObjectId(docSemId.ligaId['$oid']);
        }

        docSemId.restaurado_em = new Date();
        docSemId.fonte = 'backup_pre_wipe_2026_01_01';

        return docSemId;
    });

    // Limpar rodadas existentes da SOBRAL (se houver)
    const deleted = await db.collection('rodadas').deleteMany({ ligaId: new ObjectId(SOBRAL) });
    console.log('Rodadas antigas removidas:', deleted.deletedCount);

    // Inserir rodadas restauradas
    const result = await db.collection('rodadas').insertMany(docsParaInserir);
    console.log('Rodadas inseridas:', result.insertedCount);

    // Verificar
    const count = await db.collection('rodadas').countDocuments({ ligaId: new ObjectId(SOBRAL) });
    console.log('Total rodadas SOBRAL agora:', count);

    client.close();
    console.log('Concluido!');
}

restaurarRodadas().catch(console.error);
