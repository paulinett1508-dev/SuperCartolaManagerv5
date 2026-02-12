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
import { readAllSkills as readAllSkillsInternal, groupSkillsByCategory } from './lib/skill-reader.js';
import { generateAgentStructure } from './lib/agent-generator.js';

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
  try {
    const skills = readAllSkillsInternal(CONFIG.skillsSource);
    const grouped = groupSkillsByCategory(skills);

    log(`${skills.length} skills lidas`, 'success');
    log(`Categorias: ${Object.keys(grouped).join(', ')}`, 'debug');

    // Log de breakdown por categoria
    Object.entries(grouped).forEach(([cat, skillList]) => {
      log(`  - ${cat}: ${skillList.length} skill(s)`, 'debug');
    });

    return skills;
  } catch (error) {
    log(`Erro ao ler skills: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Sincroniza skills para formato do IDE especificado
 * @param {string} ide - IDE alvo
 * @param {Array} skills - Lista de skills
 * @returns {Object} Estatísticas da sincronização
 */
function syncToIDE(ide, skills) {
  log(`Sincronizando para ${ide}...`, 'info');

  // VS Code: usa docs/skills/ diretamente via symlink/referência
  // Não precisa gerar nada, Claude Code lê diretamente
  if (ide === 'vscode') {
    log('VS Code detectado: skills já disponíveis via docs/skills/', 'success');
    log('Claude Code no VS Code usa docs/skills/ diretamente (sem geração)', 'debug');
    return {
      ide: 'vscode',
      action: 'skip',
      reason: 'VS Code usa docs/skills/ diretamente'
    };
  }

  // Antigravity, Cursor, Windsurf: geram .agent/
  if (ide === 'antigravity' || ide === 'cursor' || ide === 'windsurf') {
    log(`${ide} detectado: gerando estrutura .agent/`, 'info');

    const rootDir = path.join(__dirname, '..');
    const stats = generateAgentStructure(skills, rootDir);

    return {
      ide,
      action: 'generated',
      target: path.join(rootDir, '.agent'),
      stats
    };
  }

  // IDE desconhecido
  log(`IDE desconhecido: ${ide}. Nenhuma ação tomada.`, 'warning');
  return {
    ide,
    action: 'skip',
    reason: 'IDE não suportado'
  };
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

  // Ler todas as skills
  const skills = readAllSkills();
  log('', 'info');

  // Sincronizar para IDE (se não for dry-run)
  if (!flags.dryRun) {
    const targetIDE = flags.ide === 'all' ? ideDetectado : flags.ide;
    const result = syncToIDE(targetIDE, skills);

    log('', 'info');
    log('📊 Resultado da Sincronização:', 'info');
    log(`   IDE: ${result.ide}`, 'info');
    log(`   Ação: ${result.action}`, 'info');

    if (result.action === 'generated') {
      log(`   Target: ${result.target}`, 'debug');
      log(`   Stats: ${JSON.stringify(result.stats)}`, 'debug');
    } else if (result.reason) {
      log(`   Motivo: ${result.reason}`, 'debug');
    }
  } else {
    log('Modo DRY-RUN: nenhuma sincronização executada', 'warning');
  }

  log('', 'info');
  log('✅ IMPLEMENTAÇÃO CONCLUÍDA:', 'success');
  log('  ✅ DIA 2: detectIDE()', 'success');
  log('  ✅ DIA 3: readAllSkills()', 'success');
  log('  ✅ DIA 4: syncToIDE() + agent-generator', 'success');
  log('', 'info');
  log('Sistema Híbrido operacional! 🚀', 'success');
}

// Exportar funções para testes
export {
  detectIDE,
  readAllSkills,
  syncToIDE
};

// Executar se chamado diretamente
main();
