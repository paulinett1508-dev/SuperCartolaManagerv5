/**
 * Script para corrigir acertos com tipo errado
 * Acertos com descrição contendo "pagamento" mas tipo="recebimento"
 * devem ser corrigidos para tipo="pagamento"
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI_DEV || process.env.MONGO_URI;

async function fixAcertos() {
    console.log('🔧 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado!');

    const db = mongoose.connection.db;
    const collection = db.collection('acertofinanceiros');

    // Buscar acertos do time 3300583 com tipo errado
    const acertos = await collection.find({
        timeId: "3300583",
        tipo: "recebimento"
    }).toArray();

    console.log(`\n📋 Encontrados ${acertos.length} acertos do time 3300583:`);
    acertos.forEach(a => {
        console.log(`  - ${a._id}: ${a.descricao} (tipo: ${a.tipo}, valor: R$${a.valor})`);
    });

    // Corrigir tipo de recebimento para pagamento (para acertos que são pagamentos de dívida)
    const result = await collection.updateMany(
        {
            timeId: "3300583",
            tipo: "recebimento"
        },
        { $set: { tipo: "pagamento" } }
    );
    console.log(`\n✅ ${result.modifiedCount} acertos corrigidos de "recebimento" para "pagamento"!`);

    // Verificar resultado
    const acertosCorrigidos = await collection.find({
        timeId: "3300583"
    }).toArray();

    console.log(`\n📋 Estado final dos acertos:`);
    acertosCorrigidos.forEach(a => {
        console.log(`  - ${a._id}: ${a.descricao} (tipo: ${a.tipo}, valor: R$${a.valor})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
}

fixAcertos().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
