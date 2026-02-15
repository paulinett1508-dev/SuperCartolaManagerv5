#!/usr/bin/env node

/**
 * SCRIPT DE CONSOLIDAÇÃO - Capitão de Luxo
 * 
 * Consolida o ranking de capitães até a rodada atual (incremental).
 * DEVE ser executado após cada rodada finalizada.
 * 
 * Uso:
 *   node scripts/consolidar-capitao-luxo.js <ligaId> [rodadaFinal]
 *   node scripts/consolidar-capitao-luxo.js 684cb1c8af923da7c7df51de
 *   node scripts/consolidar-capitao-luxo.js 684cb1c8af923da7c7df51de 5
 * 
 * Flags:
 *   --dry-run        Simula execução sem salvar
 *   --force          Força consolidação mesmo se já existir
 *   --temporada=YYYY Especifica temporada (default: 2026)
 */

import mongoose from 'mongoose';
import Liga from '../models/Liga.js';
import capitaoService from '../services/capitaoService.js';
import connectDB from '../config/database.js';

const LOG_PREFIX = '[CONSOLIDAR-CAPITAO]';

// =============================================
// CORES PARA OUTPUT
// =============================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function success(msg) {
  log(`✅ ${msg}`, 'green');
}

function error(msg) {
  log(`❌ ${msg}`, 'red');
}

function info(msg) {
  log(`ℹ️  ${msg}`, 'cyan');
}

function warning(msg) {
  log(`⚠️  ${msg}`, 'yellow');
}

function header(msg) {
  console.log('');
  log('='.repeat(60), 'bright');
  log(msg, 'bright');
  log('='.repeat(60), 'bright');
}

// =============================================
// PARSE ARGS
// =============================================
const args = process.argv.slice(2);
const ligaId = args.find(a => !a.startsWith('--'));
const rodadaFinalArg = args.find(a => !a.startsWith('--') && a !== ligaId);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');
const temporadaArg = args.find(a => a.startsWith('--temporada='));
const temporada = temporadaArg ? parseInt(temporadaArg.split('=')[1]) : 2026;

// =============================================
// VALIDAÇÕES
// =============================================
if (!ligaId) {
  error('Uso: node scripts/consolidar-capitao-luxo.js <ligaId> [rodadaFinal]');
  error('Exemplo: node scripts/consolidar-capitao-luxo.js 684cb1c8af923da7c7df51de 5');
  process.exit(1);
}

// =============================================
// WAIT FOR MONGO
// =============================================
async function waitForMongo() {
  info('Aguardando conexão com MongoDB...');
  while (mongoose.connection.readyState !== 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  success('Conectado ao MongoDB');
}

// =============================================
// DETECTAR RODADA ATUAL
// =============================================
async function detectarRodadaAtual() {
  try {
    const response = await fetch('https://api.cartolafc.globo.com/mercado/status');
    const data = await response.json();
    return data.rodada_atual || 1;
  } catch (err) {
    warning(`Erro ao detectar rodada via API Cartola: ${err.message}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================
async function main() {
  header('CONSOLIDAÇÃO RANKING CAPITÃO DE LUXO');
  
  if (isDryRun) {
    warning('Modo DRY-RUN: Nenhuma alteração será salva');
  }
  
  info(`Liga ID: ${ligaId}`);
  info(`Temporada: ${temporada}`);

  // ✅ FIX: Conectar ao MongoDB antes de usar mongoose
  await connectDB();
  await waitForMongo();
  
  try {
    // 1. Buscar liga
    const liga = await Liga.findById(ligaId).lean();
    if (!liga) {
      error(`Liga não encontrada: ${ligaId}`);
      process.exit(1);
    }
    
    success(`Liga: ${liga.nome}`);
    info(`Participantes: ${liga.participantes?.length || 0}`);
    
    // 2. Verificar se módulo está ativo
    const moduloAtivo = liga.modulos_ativos?.capitaoLuxo === true || 
                        liga.modulos_ativos?.capitao_luxo === true;
    
    if (!moduloAtivo) {
      warning('Módulo Capitão de Luxo NÃO está ativo nesta liga');
      if (!isForced) {
        error('Use --force para consolidar mesmo assim');
        process.exit(1);
      }
    }
    
    // 3. Determinar rodada final
    let rodadaFinal = rodadaFinalArg ? parseInt(rodadaFinalArg) : null;
    
    if (!rodadaFinal) {
      info('Rodada final não especificada, detectando...');
      const rodadaAtual = await detectarRodadaAtual();
      
      if (rodadaAtual) {
        // Consolidar até rodada anterior (rodada atual pode estar em andamento)
        rodadaFinal = Math.max(1, rodadaAtual - 1);
        info(`Rodada atual: ${rodadaAtual}, consolidando até: ${rodadaFinal}`);
      } else {
        warning('Não foi possível detectar rodada, usando rodada 2');
        rodadaFinal = 2;
      }
    }
    
    if (rodadaFinal < 1 || rodadaFinal > 38) {
      error(`Rodada inválida: ${rodadaFinal}. Deve estar entre 1 e 38`);
      process.exit(1);
    }
    
    success(`Rodada final: ${rodadaFinal}`);
    
    // 4. Consolidar
    if (isDryRun) {
      warning('DRY-RUN: Simulando consolidação...');
      info('Comando real:');
      info(`  node scripts/consolidar-capitao-luxo.js ${ligaId} ${rodadaFinal} --temporada=${temporada}`);
    } else {
      header('INICIANDO CONSOLIDAÇÃO');
      
      const ranking = await capitaoService.consolidarRankingCapitao(
        ligaId,
        temporada,
        rodadaFinal
      );
      
      success(`Consolidado: ${ranking.length} participantes`);
      
      // Mostrar top 3
      if (ranking.length > 0) {
        console.log('');
        info('Top 3 Capitães:');
        ranking.slice(0, 3).forEach((p, i) => {
          const pontos = (p.pontuacao_total || 0).toFixed(2);
          const media = (p.media_capitao || 0).toFixed(2);
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
          console.log(`  ${medal} ${p.nome_cartola} - ${pontos} pts (média: ${media})`);
        });
      }
      
      console.log('');
      success('Consolidação concluída com sucesso!');
    }
    
  } catch (err) {
    error(`Erro na consolidação: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    info('Desconectado do MongoDB');
  }
}

// Executar
main().catch(err => {
  error(`Erro fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
