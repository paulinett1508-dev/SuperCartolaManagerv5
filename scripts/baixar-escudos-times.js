#!/usr/bin/env node

/**
 * Script para baixar escudos dos times da Série A do Brasileirão
 * 
 * Funcionalidades:
 * - Busca todos os clubes via API Cartola FC (/clubes)
 * - Baixa escudos no formato 60x60 (melhor resolução disponível)
 * - Salva em public/escudos/{clube_id}.png
 * - Verifica arquivos existentes (não sobrescreve por padrão)
 * - Log detalhado do processo
 * 
 * Uso:
 *   node scripts/baixar-escudos-times.js              # Download normal
 *   node scripts/baixar-escudos-times.js --force      # Força re-download de todos
 *   node scripts/baixar-escudos-times.js --dry-run    # Simula sem baixar
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const API_BASE = 'https://api.cartola.globo.com';
const ESCUDOS_DIR = path.join(__dirname, '..', 'public', 'escudos');
const TIMEOUT = 15000;

// Parse dos argumentos CLI
const args = process.argv.slice(2);
const FLAGS = {
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Logger colorido
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg, data = '') => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`, data),
  success: (msg, data = '') => console.log(`${colors.green}✓${colors.reset} ${msg}`, data),
  warn: (msg, data = '') => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`, data),
  error: (msg, data = '') => console.error(`${colors.red}✗${colors.reset} ${msg}`, data),
  debug: (msg, data = '') => FLAGS.verbose && console.log(`${colors.cyan}➜${colors.reset} ${msg}`, data),
  header: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`)
};

// Estatísticas do processo
const stats = {
  total: 0,
  baixados: 0,
  existentes: 0,
  erros: 0,
  inicio: Date.now()
};

/**
 * Busca todos os clubes da API Cartola FC
 */
async function buscarClubes() {
  log.info('Buscando clubes da API Cartola FC...');
  
  try {
    const response = await axios.get(`${API_BASE}/clubes`, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Super-Cartola-Manager/1.0.0',
        'Accept': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Status HTTP ${response.status}`);
    }

    // API retorna objeto indexado por clube_id, não array
    const clubes = Object.values(response.data);
    
    log.success(`${clubes.length} clubes encontrados`);
    
    if (FLAGS.verbose) {
      clubes.forEach(clube => {
        log.debug(`  ${clube.id} - ${clube.nome} (${clube.abreviacao})`);
      });
    }

    return clubes;

  } catch (error) {
    log.error('Erro ao buscar clubes:', error.message);
    
    if (error.response) {
      log.error(`  Status: ${error.response.status}`);
      log.error(`  URL: ${error.config.url}`);
    }
    
    throw error;
  }
}

/**
 * Verifica se arquivo já existe
 */
async function arquivoExiste(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Baixa uma imagem via HTTP e salva em disco
 */
async function baixarImagem(url, destino) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'Super-Cartola-Manager/1.0.0'
    }
  });

  if (response.status !== 200) {
    throw new Error(`Status HTTP ${response.status}`);
  }

  await fs.writeFile(destino, response.data);
}

/**
 * Processa o download de um escudo
 */
async function processarEscudo(clube) {
  const clubeId = clube.id;
  const clubeNome = clube.nome;
  const escudoUrl = clube.escudos['60x60']; // Melhor resolução disponível
  
  if (!escudoUrl) {
    log.warn(`Clube ${clubeId} (${clubeNome}) não tem URL de escudo`);
    stats.erros++;
    return;
  }

  const destino = path.join(ESCUDOS_DIR, `${clubeId}.png`);

  // Verifica se arquivo já existe
  if (!FLAGS.force && await arquivoExiste(destino)) {
    log.debug(`Escudo ${clubeId} (${clubeNome}) já existe - pulando`);
    stats.existentes++;
    return;
  }

  // Modo dry-run apenas simula
  if (FLAGS.dryRun) {
    log.info(`[DRY-RUN] Baixaria ${clubeNome} (ID: ${clubeId})`);
    log.debug(`  URL: ${escudoUrl}`);
    log.debug(`  Destino: ${destino}`);
    stats.baixados++;
    return;
  }

  // Download real
  try {
    await baixarImagem(escudoUrl, destino);
    log.success(`${clubeNome} (ID: ${clubeId})`);
    stats.baixados++;

  } catch (error) {
    log.error(`Erro ao baixar ${clubeNome} (ID: ${clubeId}):`, error.message);
    stats.erros++;
  }
}

/**
 * Cria diretório de escudos se não existir
 */
async function garantirDiretorioEscudos() {
  try {
    await fs.mkdir(ESCUDOS_DIR, { recursive: true });
    log.debug(`Diretório verificado: ${ESCUDOS_DIR}`);
  } catch (error) {
    log.error('Erro ao criar diretório de escudos:', error.message);
    throw error;
  }
}

/**
 * Exibe resumo final das estatísticas
 */
function exibirResumo() {
  const duracao = ((Date.now() - stats.inicio) / 1000).toFixed(2);
  
  log.header('📊 RESUMO DA EXECUÇÃO');
  
  console.log(`Total de clubes:    ${stats.total}`);
  console.log(`${colors.green}Baixados:           ${stats.baixados}${colors.reset}`);
  console.log(`${colors.yellow}Já existentes:      ${stats.existentes}${colors.reset}`);
  console.log(`${colors.red}Erros:              ${stats.erros}${colors.reset}`);
  console.log(`Tempo de execução:  ${duracao}s`);
  
  if (FLAGS.dryRun) {
    console.log(`\n${colors.yellow}⚠ Modo DRY-RUN ativado - nenhum arquivo foi baixado${colors.reset}`);
  }
  
  if (FLAGS.force) {
    console.log(`\n${colors.cyan}ℹ Modo FORCE ativado - arquivos existentes foram sobrescritos${colors.reset}`);
  }
  
  console.log(`\n📁 Diretório de destino: ${ESCUDOS_DIR}\n`);
}

/**
 * Função principal
 */
async function main() {
  try {
    log.header('⚽ DOWNLOAD DE ESCUDOS DOS TIMES - SÉRIE A DO BRASILEIRÃO');
    
    // Mostra configuração
    if (FLAGS.dryRun) log.warn('Modo DRY-RUN ativado (simulação)');
    if (FLAGS.force) log.warn('Modo FORCE ativado (sobrescrever existentes)');
    if (FLAGS.verbose) log.info('Modo VERBOSE ativado');
    
    // 1. Garante que diretório existe
    await garantirDiretorioEscudos();
    
    // 2. Busca clubes da API
    const clubes = await buscarClubes();
    stats.total = clubes.length;
    
    // 3. Processa downloads
    log.header('📥 Processando downloads...');
    
    for (const clube of clubes) {
      await processarEscudo(clube);
    }
    
    // 4. Exibe resumo
    exibirResumo();
    
    // 5. Exit code baseado em erros
    if (stats.erros > 0) {
      log.warn(`Processo finalizado com ${stats.erros} erro(s)`);
      process.exit(1);
    }
    
    log.success('Processo concluído com sucesso!');
    process.exit(0);

  } catch (error) {
    log.error('Erro fatal na execução:', error.message);
    
    if (FLAGS.verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Executa
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buscarClubes, baixarImagem, ESCUDOS_DIR };
