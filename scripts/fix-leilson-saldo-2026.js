/**
 * Script para ajustar o saldo inicial do Leilson em 2026
 * - Cria registro em fluxofinanceirocampos com "Saldo 2025" = 0.54
 * - Esse crédito é remanescente de 2025, NÃO é inscrição
 * 
 * Uso:
 *   node scripts/fix-leilson-saldo-2026.js --dry-run  # Simula
 *   node scripts/fix-leilson-saldo-2026.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

if (!isDryRun && !isForce) {
    console.log('❌ Uso: node scripts/fix-leilson-saldo-2026.js [--dry-run | --force]');
    process.exit(1);
}

const LEILSON = {
    timeId: '3300583',
    ligaId: '684cb1c8af923da7c7df51de',
    nome: 'Leilson Bezerra',
    saldo2025: 0.54
};

async function main() {
    console.log('🔧 Ajuste Saldo Leilson 2026');
    console.log(`   Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}\n`);

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const fluxoCampos = db.collection('fluxofinanceirocampos');

    // Verificar se já existe registro 2026
    const existente = await fluxoCampos.findOne({
        timeId: LEILSON.timeId,
        temporada: 2026
    });

    if (existente) {
        console.log('⚠️  Já existe registro para 2026:');
        console.log(JSON.stringify(existente.campos, null, 2));
        
        // Verificar se já tem Saldo 2025
        const temSaldo2025 = existente.campos.some(c => 
            c.nome.toLowerCase().includes('saldo 2025') || 
            c.nome.toLowerCase().includes('saldo 25')
        );
        
        if (temSaldo2025) {
            console.log('\n✅ Já possui campo de Saldo 2025. Nenhuma ação necessária.');
            await mongoose.disconnect();
            return;
        }

        // Atualizar o primeiro campo
        console.log('\n📝 Atualizando primeiro campo para "Saldo 2025"...');
        
        if (!isDryRun) {
            await fluxoCampos.updateOne(
                { _id: existente._id },
                { 
                    $set: { 
                        'campos.0.nome': 'Saldo 2025',
                        'campos.0.valor': LEILSON.saldo2025,
                        updatedAt: new Date()
                    }
                }
            );
            console.log('✅ Registro atualizado!');
        } else {
            console.log('   [DRY-RUN] Atualizaria campos.0 para { nome: "Saldo 2025", valor: 0.54 }');
        }
    } else {
        // Criar novo registro
        console.log('📝 Criando novo registro para 2026...');
        
        const novoRegistro = {
            ligaId: LEILSON.ligaId,
            timeId: LEILSON.timeId,
            temporada: 2026,
            campos: [
                { nome: 'Saldo 2025', valor: LEILSON.saldo2025 },
                { nome: 'Campo 2', valor: 0 },
                { nome: 'Campo 3', valor: 0 },
                { nome: 'Campo 4', valor: 0 }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('   Dados:', JSON.stringify(novoRegistro, null, 2));

        if (!isDryRun) {
            await fluxoCampos.insertOne(novoRegistro);
            console.log('✅ Registro criado!');
        } else {
            console.log('   [DRY-RUN] Criaria o registro acima');
        }
    }

    // Verificar resultado
    if (!isDryRun) {
        const verificacao = await fluxoCampos.findOne({
            timeId: LEILSON.timeId,
            temporada: 2026
        });
        console.log('\n📊 Registro final:');
        console.log(JSON.stringify(verificacao.campos, null, 2));
    }

    await mongoose.disconnect();
    console.log('\n✅ Concluído!');
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
