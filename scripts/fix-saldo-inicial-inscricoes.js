/**
 * FIX: Corrigir saldo_inicial_temporada com sinal errado
 *
 * Bug: A fórmula calculava (taxa - crédito) ao invés de (crédito - taxa)
 * Resultado: valores positivos quando deveriam ser negativos
 *
 * Registros a corrigir:
 * - Lúcio de Souza (19615809): 180 -> -180
 * - Eudes Pereira (621609): 68.46 -> -68.46
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function fix() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.log('❌ Use --dry-run para simular ou --force para executar');
        process.exit(1);
    }

    console.log(`\n🔧 FIX: Corrigir saldo_inicial_temporada (${isDryRun ? 'DRY-RUN' : 'EXECUTANDO'})\n`);

    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const inscricoes = db.collection('inscricoestemporada');

    // Registros a corrigir
    const correcoes = [
        {
            time_id: 19615809,
            nome: 'Lúcio de Souza (Bela Bosta)',
            valorAtual: 180,
            valorCorreto: -180,
            motivo: 'Novo cadastro sem pagamento = deve a taxa'
        },
        {
            time_id: 621609,
            nome: 'Eudes Pereira (Itaueira Mengão)',
            valorAtual: 68.46,
            valorCorreto: -68.46,
            motivo: 'Crédito 111.54 - Taxa 180 = -68.46'
        }
    ];

    for (const correcao of correcoes) {
        console.log(`📋 ${correcao.nome}`);
        console.log(`   Valor atual: ${correcao.valorAtual}`);
        console.log(`   Valor correto: ${correcao.valorCorreto}`);
        console.log(`   Motivo: ${correcao.motivo}`);

        if (!isDryRun) {
            const result = await inscricoes.updateOne(
                { time_id: correcao.time_id, temporada: 2026 },
                { $set: { saldo_inicial_temporada: correcao.valorCorreto } }
            );
            console.log(`   ✅ Atualizado: ${result.modifiedCount} documento(s)\n`);
        } else {
            console.log(`   ⏸️  Simulação - nenhuma alteração feita\n`);
        }
    }

    await mongoose.disconnect();
    console.log('✅ Concluído!\n');
}

fix().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
