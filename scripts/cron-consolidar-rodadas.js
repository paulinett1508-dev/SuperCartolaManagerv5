
#!/usr/bin/env node

/**
 * 🕐 SCRIPT DE CONSOLIDAÇÃO AUTOMÁTICA
 * 
 * Roda automaticamente via Scheduled Deployment do Replit
 * Agenda sugerida: "Toda segunda-feira às 9h" (cron: 0 9 * * 1)
 * 
 * Este script consolida a rodada anterior quando o mercado fecha
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = process.env.LIGA_ID_PRINCIPAL || '684cb1c8af923da7c7df51de';
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function detectarRodadaAnterior() {
    try {
        const response = await fetch('https://api.cartola.globo.com/mercado/status', {
            headers: { 'User-Agent': 'SuperCartolaManager/1.0' }
        });
        
        if (!response.ok) throw new Error('Falha ao obter status do mercado');
        
        const status = await response.json();
        const rodadaAtual = status.rodada_atual;
        const mercadoFechado = status.status_mercado === 2;
        
        // Se mercado fechado, consolida rodada atual
        // Se aberto, consolida rodada anterior
        const rodadaConsolidar = mercadoFechado ? rodadaAtual : rodadaAtual - 1;
        
        console.log(`📊 Mercado ${mercadoFechado ? 'FECHADO' : 'ABERTO'}`);
        console.log(`🎯 Rodada a consolidar: ${rodadaConsolidar}`);
        
        return rodadaConsolidar;
        
    } catch (error) {
        console.error('❌ Erro ao detectar rodada:', error.message);
        throw error;
    }
}

async function consolidarRodada(rodada) {
    try {
        const url = `${BASE_URL}/api/consolidacao/ligas/${LIGA_ID}/rodadas/${rodada}/consolidar`;
        
        console.log(`🔄 Consolidando rodada ${rodada}...`);
        
        const response = await fetch(url, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        
        console.log('✅ Consolidação concluída com sucesso!');
        console.log('📊 Resultado:', JSON.stringify(resultado, null, 2));
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro na consolidação:', error.message);
        throw error;
    }
}

async function executarConsolidacaoAutomatica() {
    try {
        console.log('🚀 [CRON-CONSOLIDAÇÃO] Iniciando execução automática...\n');
        
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');
        
        // Detectar rodada a consolidar
        const rodada = await detectarRodadaAnterior();
        
        // Executar consolidação
        await consolidarRodada(rodada);
        
        console.log('\n🎉 Processo concluído com sucesso!');
        
        await mongoose.disconnect();
        console.log('👋 Desconectado do MongoDB');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERRO FATAL:', error.message);
        
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        
        process.exit(1);
    }
}

// Executar
executarConsolidacaoAutomatica();
