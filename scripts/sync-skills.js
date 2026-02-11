#!/usr/bin/env node

/**
 * SYNC-SKILLS.JS - Sincronizador de Skills Multi-IDE
 *
 * Sincroniza skills de docs/skills/ (source of truth) para:
 * - .claude/ (VS Code + Claude Code)
 * - .agent/ (Cursor/Windsurf/Antigravity)
 *
 * Uso:
 *   node scripts/sync-skills.js [--force] [--ide=vscode|cursor|all]
 *
 * Flags:
 *   --force      Força re-sincronização mesmo sem mudanças
 *   --ide=X      Sincroniza apenas para IDE específico (default: all)
 *   --dry-run    Mostra o que seria feito sem executar
 *
 * Parte do Sistema Híbrido - Super Cartola Manager
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectIDE as detectIDEInternal, getDetectionScores } from './ide-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CONFIG = {
  skillsSource: path.join(__dirname, '../docs/skills'),
  targets: {
    vscode: path.join(__dirname, '../.claude'),
    cursor: path.join(__dirname, '../.agent'),
    antigravity: path.join(__dirname, '../.agent')
  }
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function log(message, level = 'info') {
  const prefix = '[HYBRID-SYSTEM]';
  const levels = {
    info: '📘',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    debug: '🔍'
  };

  console.log(`${levels[level]} ${prefix} ${message}`);
}

// ============================================================================
// FUNÇÕES PRINCIPAIS (A IMPLEMENTAR NOS PRÓXIMOS DIAS)
// ============================================================================

/**
 * Detecta qual IDE está sendo usado
 * @returns {string} 'vscode' | 'cursor' | 'antigravity' | 'windsurf' | 'unknown'
 */
function detectIDE() {
  const rootPath = path.join(__dirname, '..');
  const ide = detectIDEInternal(rootPath);
  const scores = getDetectionScores(rootPath);

  log(`IDE detectado: ${ide}`, 'success');
  log(`Scores de detecção: ${JSON.stringify(scores)}`, 'debug');

  return ide;
}

/**
 * Lê todas as skills de docs/skills/
 * @returns {Array} Lista de objetos skill
 */
function readAllSkills() {
  // TODO DIA 3: Implementar leitura recursiva
  log('Leitura de skills ainda não implementada', 'debug');
  return [];
}

/**
 * Sincroniza skills para formato do IDE especificado
 * @param {string} ide - IDE alvo
 * @param {Array} skills - Lista de skills
 */
function syncToIDE(ide, skills) {
  // TODO DIA 15: Implementar sincronização
  log(`Sincronização para ${ide} ainda não implementada`, 'debug');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const flags = {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    ide: args.find(a => a.startsWith('--ide='))?.split('=')[1] || 'all'
  };

  log('Sincronizador de Skills Multi-IDE', 'info');
  log(`Modo: ${flags.dryRun ? 'DRY-RUN' : 'EXECUÇÃO'}`, 'info');
  log(`IDE alvo: ${flags.ide}`, 'info');

  // Verificar se source existe
  if (!fs.existsSync(CONFIG.skillsSource)) {
    log(`Diretório ${CONFIG.skillsSource} não encontrado`, 'error');
    process.exit(1);
  }

  log('Estrutura base verificada', 'success');

  // Testar detecção de IDE
  const ideDetectado = detectIDE();

  log('', 'info');
  log('⚠️  IMPLEMENTAÇÃO PENDENTE:', 'warning');
  log('  ✅ DIA 2: detectIDE() - CONCLUÍDO', 'success');
  log('  - DIA 3: readAllSkills()', 'info');
  log('  - DIA 15: syncToIDE()', 'info');
  log('', 'info');
  log('Este script será completado nos próximos dias conforme o plano.', 'info');
}

// Exportar funções para testes
export {
  detectIDE,
  readAllSkills,
  syncToIDE
};

// Executar se chamado diretamente
main();
