/**
 * Script para invalidar cache de extrato de um time específico
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI_DEV || process.env.MONGO_URI;
const TIME_ID = parseInt(process.argv[2]) || 3300583;

async function invalidarCache() {
    console.log('🔧 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado!');

    const db = mongoose.connection.db;

    // Deletar cache do extrato para forçar recálculo
    const result = await db.collection('extratofinanceirocaches').deleteOne({
        time_id: TIME_ID
    });

    console.log(`✅ Cache do time ${TIME_ID} deletado: ${result.deletedCount} documento(s)`);
    await mongoose.disconnect();
}

invalidarCache().catch(console.error);
