import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // Todos os times
    const allTimes = await db.collection('times').find({}).toArray();
    const timeIds = allTimes.map(t => t.id);

    // Times no data-lake
    const timesNoDL = await db.collection('cartola_oficial_dumps').distinct('time_id');

    // Faltando
    const faltando = timeIds.filter(id => {
        return timesNoDL.indexOf(id) === -1;
    });

    console.log('=== COBERTURA DATA LAKE ===\n');
    console.log('Total times cadastrados:', allTimes.length);
    console.log('Times COM dados no Data Lake:', timesNoDL.length);
    console.log('Times SEM dados:', faltando.length);

    if (faltando.length > 0) {
        console.log('\n=== TIMES FALTANDO ===');
        faltando.forEach(id => {
            const t = allTimes.find(x => x.id === id);
            console.log('  ID', id, '-', t?.nome_cartoleiro || t?.nome_time);
        });
    }

    // Verificar o time 14747183 que deu erro
    const time14747183 = await db.collection('cartola_oficial_dumps').findOne({ time_id: 14747183 });
    console.log('\n=== TIME 14747183 (erro 404) ===');
    console.log('Tem dados?', time14747183 ? 'SIM' : 'NÃO');

    await client.close();
}
check();
