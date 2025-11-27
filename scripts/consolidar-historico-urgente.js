
#!/usr/bin/env node

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de'; // Super Cartola 2025
const RODADA_INICIO = 1;
const RODADA_FIM = 35;
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function executarConsolidacao() {
    try {
        console.log('🚀 [CONSOLIDAÇÃO-HISTÓRICO] Iniciando processo...\n');
        
        // Conectar ao MongoDB para verificar conexão
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');
        
        console.log(`📊 Configuração:`);
        console.log(`   - Liga ID: ${LIGA_ID}`);
        console.log(`   - Rodadas: ${RODADA_INICIO} até ${RODADA_FIM}`);
        console.log(`   - API URL: ${BASE_URL}\n`);
        
        console.log(`🔄 Consolidando rodadas ${RODADA_INICIO}-${RODADA_FIM}...`);
        
        const response = await fetch(
            `${BASE_URL}/api/consolidacao/ligas/${LIGA_ID}/consolidar-historico?rodadaInicio=${RODADA_INICIO}&rodadaFim=${RODADA_FIM}`,
            { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTADO DA CONSOLIDAÇÃO');
        console.log('='.repeat(60));
        console.log(`\n✅ Sucessos: ${resultado.sucessos}/${resultado.total} rodadas`);
        console.log(`❌ Falhas: ${resultado.falhas}/${resultado.total} rodadas`);
        
        if (resultado.falhas > 0) {
            console.log('\n⚠️ Rodadas com erro:');
            resultado.detalhes.filter(d => !d.success).forEach(d => {
                console.log(`  • Rodada ${d.rodada}: ${d.error}`);
            });
        } else {
            console.log('\n🎉 Todas as rodadas foram consolidadas com sucesso!');
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        await mongoose.disconnect();
        console.log('👋 Desconectado do MongoDB');
        
        process.exit(resultado.falhas > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ ERRO FATAL:', error.message);
        console.error('\nStack trace:', error.stack);
        
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        
        process.exit(1);
    }
}

// Executar
executarConsolidacao();
