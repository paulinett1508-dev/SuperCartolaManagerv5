#!/usr/bin/env node
// Script rápido para testar correção do bug PC

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from './models/ExtratoFinanceiroCache.js';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TIME_ID = 13935277;
const TEMPORADA = 2026;

async function main() {
    try {
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            console.error('❌ MONGO_URI não configurado');
            process.exit(1);
        }

        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado\n');

        // Buscar cache atual
        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: LIGA_ID,
            time_id: TIME_ID,
            temporada: TEMPORADA
        });

        if (!cache) {
            console.log('⚠️  Cache não encontrado - será criado no próximo acesso');
        } else {
            console.log('📊 Cache encontrado:');
            console.log(`   Rodadas consolidadas: ${cache.ultima_rodada_consolidada}`);
            console.log(`   Saldo: R$ ${(cache.saldo_consolidado || 0).toFixed(2)}`);
            console.log(`   Transações: ${cache.historico_transacoes?.length || 0}`);

            // Verificar se tem PC
            const temPC = cache.historico_transacoes?.some(t => t.tipo === 'PONTOS_CORRIDOS');
            console.log(`   Tem PC: ${temPC ? '✅ SIM' : '❌ NÃO'}\n`);

            // Deletar cache
            console.log('🗑️  Deletando cache...');
            await ExtratoFinanceiroCache.deleteOne({ _id: cache._id });
            console.log('✅ Cache deletado!\n');
        }

        console.log('💡 Agora acesse o extrato via API para recalcular:');
        console.log(`   GET /api/fluxo-financeiro/${LIGA_ID}/extrato/${TIME_ID}?temporada=${TEMPORADA}\n`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado');
    }
}

main();
