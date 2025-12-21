import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const extrato = await db.collection('extratofinanceirocaches').findOne({ time_id: 3300583 });

    console.log('=== CACHE ATUALIZADO DO FIASCO VET FC ===');
    console.log('Total rodadas:', extrato?.historico_transacoes?.length);
    console.log('Saldo consolidado:', extrato?.saldo_consolidado);
    console.log('Regenerado via script:', extrato?.regenerado_via_script);

    console.log('\nPrimeiras 5 rodadas:');
    extrato?.historico_transacoes?.slice(0, 5).forEach(h => {
        console.log('  R' + String(h.rodada).padStart(2) + ': bonusOnus=' + String(h.bonusOnus).padStart(3) + ' | pos=' + String(h.posicao).padStart(2) + ' | saldoAcum=' + h.saldoAcumulado);
    });

    console.log('\nÚltimas 5 rodadas:');
    extrato?.historico_transacoes?.slice(-5).forEach(h => {
        console.log('  R' + String(h.rodada).padStart(2) + ': bonusOnus=' + String(h.bonusOnus).padStart(3) + ' | pos=' + String(h.posicao).padStart(2) + ' | saldoAcum=' + h.saldoAcumulado);
    });

    // Verificar diagnóstico novamente
    console.log('\n=== VERIFICAÇÃO PÓS-CORREÇÃO ===');
    const hist = extrato?.historico_transacoes || [];
    const totalBonusOnus = hist.reduce((sum, h) => sum + (h.bonusOnus || 0), 0);
    console.log('Total bonusOnus:', totalBonusOnus);
    console.log('Status:', totalBonusOnus !== 0 ? 'CORRIGIDO!' : 'Ainda zerado');

    await mongoose.disconnect();
}
main();
