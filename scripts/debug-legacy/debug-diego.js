import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TIME_ID = 1323370;

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Buscar cache do extrato
    const cache = await db.collection('extratofinanceirocaches').findOne({
        liga_id: LIGA_ID,
        time_id: TIME_ID
    });

    console.log('=== EXTRATO CACHE ===');
    if (cache) {
        console.log('Saldo consolidado:', cache.saldo_consolidado);
        console.log('Transacoes:', cache.historico_transacoes?.length || 0);
    } else {
        console.log('NAO EXISTE CACHE!');
    }

    // 2. Buscar campos manuais
    const campos = await db.collection('fluxofinanceirocampos').findOne({
        ligaId: LIGA_ID,
        timeId: String(TIME_ID)
    });

    console.log('\n=== CAMPOS MANUAIS ===');
    if (campos) {
        const total = campos.campos?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;
        campos.campos?.forEach(c => console.log('  ' + c.nome + ': ' + c.valor));
        console.log('Total campos:', total);
    } else {
        console.log('SEM CAMPOS');
    }

    // 3. Buscar acertos financeiros
    const acertos = await db.collection('acertofinanceiros').find({
        ligaId: LIGA_ID,
        timeId: String(TIME_ID),
        ativo: true
    }).toArray();

    console.log('\n=== ACERTOS FINANCEIROS ===');
    let saldoAcertos = 0;
    for (const a of acertos) {
        const valorEfetivo = a.tipo === 'pagamento' ? a.valor : -a.valor;
        saldoAcertos += valorEfetivo;
        console.log('  ' + a.tipo + ': R$ ' + a.valor + ' -> Efetivo: ' + (valorEfetivo > 0 ? '+' : '') + valorEfetivo);
    }
    console.log('Total acertos:', saldoAcertos);

    // 4. Calcular saldo final esperado
    const saldoTemporada = cache?.saldo_consolidado || 0;
    const saldoCampos = campos?.campos?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;

    console.log('\n=== CALCULO FINAL ===');
    console.log('Saldo Temporada (cache):', saldoTemporada);
    console.log('Saldo Campos:', saldoCampos);
    console.log('Saldo Acertos:', saldoAcertos);
    console.log('SALDO FINAL:', saldoTemporada + saldoCampos + saldoAcertos);

    await mongoose.disconnect();
}

debug().catch(console.error);
