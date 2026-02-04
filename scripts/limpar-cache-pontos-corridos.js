#!/usr/bin/env node
/**
 * SCRIPT: Limpar Cache Pontos Corridos no MongoDB
 *
 * Uso: node scripts/limpar-cache-pontos-corridos.js --ligaId=XXX
 */

import mongoose from 'mongoose';
import PontosCorridosCache from '../models/PontosCorridosCache.js';

const args = process.argv.slice(2);
const ligaIdArg = args.find(arg => arg.startsWith('--ligaId='));

if (!ligaIdArg) {
    console.error('\n❌ Erro: --ligaId é obrigatório');
    console.log('\n📖 Uso:');
    console.log('  node scripts/limpar-cache-pontos-corridos.js --ligaId=684cb1c8af923da7c7df51de\n');
    process.exit(1);
}

const ligaId = ligaIdArg.split('=')[1];

async function limparCache() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  🗑️  LIMPEZA DE CACHE - PONTOS CORRIDOS          ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');

        console.log(`📋 Liga ID: ${ligaId}\n`);

        // 1. Verificar quantos registros existem
        const total = await PontosCorridosCache.countDocuments({ liga_id: ligaId });
        console.log(`📊 Total de registros no cache: ${total}`);

        if (total === 0) {
            console.log('\n✅ Nenhum cache encontrado. Tudo limpo!\n');
            process.exit(0);
        }

        // 2. Verificar estrutura
        const amostra = await PontosCorridosCache.findOne({ liga_id: ligaId }).lean();
        console.log('\n📋 Estrutura de um registro:');
        console.log(`   Rodada: ${amostra.rodada_consolidada}`);
        console.log(`   Temporada: ${amostra.temporada || '❌ SEM CAMPO'}`);
        console.log(`   Confrontos: ${amostra.confrontos?.length || 0}`);
        console.log(`   Atualização: ${amostra.ultima_atualizacao}`);

        // 3. Contar por temporada
        const porTemporada = await PontosCorridosCache.aggregate([
            { $match: { liga_id: ligaId } },
            { $group: { _id: '$temporada', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n📊 Distribuição por temporada:');
        porTemporada.forEach(t => {
            console.log(`   ${t._id || 'SEM CAMPO'}: ${t.count} registros`);
        });

        // 4. Perguntar confirmação
        console.log('\n⚠️  ATENÇÃO: Esta operação irá deletar TODOS os registros desta liga.');
        console.log('   O cache será recriado automaticamente quando alguém acessar o módulo.\n');

        // Deletar todos
        console.log('🗑️  Deletando cache...');
        const resultado = await PontosCorridosCache.deleteMany({ liga_id: ligaId });

        console.log(`✅ ${resultado.deletedCount} registros removidos\n`);

        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║  ✅ LIMPEZA CONCLUÍDA                             ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        console.log('📋 Próximos passos:');
        console.log('  1. Acesse o módulo Pontos Corridos no app');
        console.log('  2. O cache será recriado automaticamente com temporada 2026');
        console.log('  3. Verifique se ano está correto\n');

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

limparCache();
