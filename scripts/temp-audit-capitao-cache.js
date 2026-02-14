#!/usr/bin/env node
/**
 * AUDITORIA TEMPORÁRIA - Cache Capitão de Luxo Rodada 3
 * Verifica estado do cache para diagnosticar problema
 */

import mongoose from 'mongoose';
import CapitaoCaches from '../models/CapitaoCaches.js';
import '../config/database.js';

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2026;

async function waitForMongo() {
  console.log('⏳ Conectando ao MongoDB...');
  let attempts = 0;
  while (mongoose.connection.readyState !== 1 && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 200));
    attempts++;
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Timeout ao conectar MongoDB');
  }
  console.log('✅ Conectado ao MongoDB\n');
}

async function main() {
  try {
    await waitForMongo();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎖️  AUDITORIA CACHE - CAPITÃO DE LUXO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Liga:     ${LIGA_ID}`);
    console.log(`Temporada: ${TEMPORADA}`);
    console.log('───────────────────────────────────────────────────────────\n');

    // 1. Buscar todos os registros do cache
    const caches = await CapitaoCaches.find({
      ligaId: new mongoose.Types.ObjectId(LIGA_ID),
      temporada: TEMPORADA
    }).lean();

    if (caches.length === 0) {
      console.log('❌ CACHE VAZIO - Nenhum registro encontrado!');
      console.log('   → Módulo nunca foi consolidado ou cache foi limpo\n');
      process.exit(0);
    }

    console.log(`✅ Encontrados ${caches.length} participantes no cache\n`);

    // 2. Analisar histórico de rodadas
    console.log('📊 ANÁLISE DO HISTÓRICO DE RODADAS');
    console.log('───────────────────────────────────────────────────────────');

    const rodadasPorTime = {};
    const rodadasGlobais = new Set();

    caches.forEach(cache => {
      const historico = cache.historico_rodadas || [];
      rodadasPorTime[cache.timeId] = historico.map(h => h.rodada).sort((a,b) => a-b);
      historico.forEach(h => rodadasGlobais.add(h.rodada));
    });

    const rodadasArray = Array.from(rodadasGlobais).sort((a,b) => a-b);
    console.log(`Rodadas presentes no cache: ${rodadasArray.join(', ')}`);

    const temRodada3 = rodadasArray.includes(3);
    console.log(`\nRodada 3 existe? ${temRodada3 ? '✅ SIM' : '❌ NÃO'}\n`);

    if (!temRodada3) {
      console.log('🔍 DIAGNÓSTICO: Rodada 3 ausente do cache');
      console.log('   Possíveis causas:');
      console.log('   1. Script de consolidação não rodou após R3');
      console.log('   2. Auto-consolidação falhou');
      console.log('   3. Dados foram limpos por engano\n');
      process.exit(0);
    }

    // 3. Analisar flags parciais na rodada 3
    console.log('🔎 ANÁLISE DETALHADA DA RODADA 3');
    console.log('───────────────────────────────────────────────────────────');

    let totalComR3 = 0;
    let totalComParcial = 0;
    let totalComJogouFalse = 0;

    caches.forEach(cache => {
      const r3 = cache.historico_rodadas?.find(h => h.rodada === 3);
      if (r3) {
        totalComR3++;
        if (r3.parcial === true) totalComParcial++;
        if (r3.jogou === false) totalComJogouFalse++;
      }
    });

    console.log(`Times com dados da R3:    ${totalComR3}/${caches.length}`);
    console.log(`Times com parcial=true:   ${totalComParcial}/${totalComR3}`);
    console.log(`Times com jogou=false:    ${totalComJogouFalse}/${totalComR3}\n`);

    if (totalComParcial > 0) {
      console.log('⚠️  PROBLEMA DETECTADO: Flags "parcial: true" encontradas!');
      console.log('   → Rodada 3 foi marcada como em andamento mas nunca finalizou');
      console.log('   → Admin pode estar travado exibindo dados parciais\n');
    }

    // 4. Mostrar exemplo de um time
    const exemplo = caches[0];
    const r3Exemplo = exemplo.historico_rodadas?.find(h => h.rodada === 3);

    if (r3Exemplo) {
      console.log('📝 EXEMPLO - Dados da R3 de um participante:');
      console.log('───────────────────────────────────────────────────────────');
      console.log(`Time:         ${exemplo.nome_cartola} (${exemplo.timeId})`);
      console.log(`Capitão R3:   ${r3Exemplo.atleta_nome || 'N/A'}`);
      console.log(`Pontuação:    ${(r3Exemplo.pontuacao || 0).toFixed(2)}`);
      console.log(`parcial:      ${r3Exemplo.parcial === true ? '🔴 TRUE (STALE!)' : '✅ false'}`);
      console.log(`jogou:        ${r3Exemplo.jogou === false ? '⏳ FALSE (pendente)' : r3Exemplo.jogou === true ? '✅ TRUE' : '➖ null'}`);
      console.log(`updatedAt:    ${new Date(exemplo.updatedAt).toLocaleString('pt-BR')}\n`);
    }

    // 5. Recomendações
    console.log('💡 RECOMENDAÇÕES');
    console.log('───────────────────────────────────────────────────────────');
    if (totalComParcial > 0) {
      console.log('1. Re-consolidar dados até rodada 3:');
      console.log(`   node scripts/consolidar-capitao-luxo.js ${LIGA_ID} 3`);
      console.log('');
      console.log('2. Aplicar fix do app no admin (limpar flags stale)');
      console.log('   Ver: participante-capitao.js:181-193');
    } else {
      console.log('✅ Cache parece OK. Problema pode estar no frontend.');
      console.log('   Verificar console do navegador e auto-consolidação.');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro na auditoria:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
