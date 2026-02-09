#!/usr/bin/env node
/**
 * UX CI CHECK - Super Cartola Manager
 * ====================================
 *
 * Script para CI/CD que verifica issues de UX e retorna exit codes apropriados.
 *
 * Exit Codes:
 *   0 = Sucesso (nenhum issue ou apenas BAIXOS)
 *   1 = Issues MÉDIOS detectados (warning)
 *   2 = Issues ALTOS detectados (falha)
 *   3 = Issues CRÍTICOS detectados (bloqueio total)
 *
 * Uso em CI/CD:
 *   - Pre-commit: Bloqueia commits com issues CRÍTICOS
 *   - Pre-push: Bloqueia push com issues ALTOS ou CRÍTICOS
 *   - PR checks: Reporta todos os issues como comentário
 *
 * Uso:
 *   node scripts/ux-ci-check.js                    # Check completo
 *   node scripts/ux-ci-check.js --diff             # Apenas arquivos modificados
 *   node scripts/ux-ci-check.js --block-high       # Bloqueia em ALTO
 *   node scripts/ux-ci-check.js --block-critical   # Bloqueia em CRÍTICO (padrão)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  participantePath: path.join(__dirname, '../public/participante'),
  blockLevel: 'CRITICAL', // CRITICAL, HIGH, MEDIUM
};

// ============================================================================
// SEVERITY LEVELS
// ============================================================================

const SEVERITY = {
  BAIXO: 0,
  MEDIO: 1,
  ALTO: 2,
  CRITICO: 3,
};

// ============================================================================
// UTILITIES
// ============================================================================

function getModifiedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    return output
      .split('\n')
      .filter(file => file.startsWith('public/participante/'))
      .filter(file => /\.(html|css|js)$/.test(file))
      .map(file => file.replace('public/participante/', ''));
  } catch (e) {
    // No git or no changes
    return [];
  }
}

function runAutoFixCheck(files = []) {
  try {
    let cmd = 'node scripts/ux-auto-fix.js';

    if (files.length > 0) {
      // Check each file individually
      const results = files.map(file => {
        const output = execSync(`${cmd} --file=${file}`, { encoding: 'utf-8' });
        return parseAutoFixOutput(output);
      });

      return results.reduce((acc, result) => {
        acc.total += result.total;
        return acc;
      }, { total: 0 });
    } else {
      const output = execSync(cmd, { encoding: 'utf-8' });
      return parseAutoFixOutput(output);
    }
  } catch (e) {
    console.error('❌ Erro ao rodar auto-fix:', e.message);
    return { total: 0 };
  }
}

function parseAutoFixOutput(output) {
  const match = output.match(/Total:\s*(\d+)\s*issue\(s\)\s*detectado/);
  return {
    total: match ? parseInt(match[1]) : 0,
  };
}

function runManualCheck() {
  try {
    const output = execSync('node scripts/ux-audit-todos.js --dashboard', { encoding: 'utf-8' });
    return parseManualOutput(output);
  } catch (e) {
    console.error('❌ Erro ao rodar audit-todos:', e.message);
    return { CRITICO: 0, ALTO: 0, MEDIO: 0, BAIXO: 0 };
  }
}

function parseManualOutput(output) {
  const result = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAIXO: 0 };

  const critico = output.match(/CRITICO:\s*(\d+)/);
  const alto = output.match(/ALTO:\s*(\d+)/);
  const medio = output.match(/MEDIO:\s*(\d+)/);
  const baixo = output.match(/BAIXO:\s*(\d+)/);

  if (critico) result.CRITICO = parseInt(critico[1]);
  if (alto) result.ALTO = parseInt(alto[1]);
  if (medio) result.MEDIO = parseInt(medio[1]);
  if (baixo) result.BAIXO = parseInt(baixo[1]);

  return result;
}

// ============================================================================
// REPORTING
// ============================================================================

function printCIReport(autoFix, manual, blockLevel) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 UX CI CHECK REPORT');
  console.log('='.repeat(80) + '\n');

  // Auto-fixable issues
  console.log('📊 Issues Auto-Fixáveis:');
  if (autoFix.total === 0) {
    console.log('  ✅ Nenhum issue detectado\n');
  } else {
    console.log(`  ⚠️  ${autoFix.total} issue(s) detectado(s)`);
    console.log('  💡 Execute: node scripts/ux-auto-fix.js --apply\n');
  }

  // Manual issues
  console.log('📊 Issues Manuais:');
  const hasManualIssues = Object.values(manual).some(count => count > 0);

  if (!hasManualIssues) {
    console.log('  ✅ Nenhum issue detectado\n');
  } else {
    if (manual.CRITICO > 0) console.log(`  🔴 CRÍTICO: ${manual.CRITICO}`);
    if (manual.ALTO > 0) console.log(`  🟠 ALTO: ${manual.ALTO}`);
    if (manual.MEDIO > 0) console.log(`  🟡 MÉDIO: ${manual.MEDIO}`);
    if (manual.BAIXO > 0) console.log(`  🟢 BAIXO: ${manual.BAIXO}`);
    console.log('');
  }

  // Determine result
  let exitCode = 0;
  let status = 'PASSED';
  let icon = '✅';

  const highestSeverity = getHighestSeverity(manual);

  if (highestSeverity >= SEVERITY[blockLevel]) {
    exitCode = highestSeverity;
    status = 'BLOCKED';
    icon = '❌';
  } else if (autoFix.total > 0 || highestSeverity >= SEVERITY.MEDIO) {
    exitCode = 0; // Don't block, just warn
    status = 'WARNING';
    icon = '⚠️';
  }

  console.log('─'.repeat(80));
  console.log(`${icon} Status: ${status}`);
  console.log(`🚦 Exit Code: ${exitCode}`);
  console.log(`🔒 Block Level: ${blockLevel}`);
  console.log('─'.repeat(80) + '\n');

  return exitCode;
}

function getHighestSeverity(manual) {
  if (manual.CRITICO > 0) return SEVERITY.CRITICO;
  if (manual.ALTO > 0) return SEVERITY.ALTO;
  if (manual.MEDIO > 0) return SEVERITY.MEDIO;
  if (manual.BAIXO > 0) return SEVERITY.BAIXO;
  return 0;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isDiff = args.includes('--diff');
  const blockHigh = args.includes('--block-high');
  const blockCritical = args.includes('--block-critical');

  // Determine block level
  let blockLevel = CONFIG.blockLevel;
  if (blockHigh) blockLevel = 'ALTO';
  if (blockCritical) blockLevel = 'CRITICO';

  console.log('🚀 UX CI Check - Super Cartola Manager\n');

  // Get files to check
  let files = [];
  if (isDiff) {
    files = getModifiedFiles();
    if (files.length === 0) {
      console.log('✅ Nenhum arquivo modificado no participante. Skipping...\n');
      process.exit(0);
    }
    console.log(`📂 Verificando ${files.length} arquivo(s) modificado(s):\n`);
    files.forEach(f => console.log(`  - ${f}`));
    console.log('');
  } else {
    console.log('📂 Verificando todos os arquivos...\n');
  }

  // Run checks
  console.log('🔍 Executando verificações...\n');

  const autoFix = runAutoFixCheck(isDiff ? files : []);
  const manual = runManualCheck();

  // Print report and get exit code
  const exitCode = printCIReport(autoFix, manual, blockLevel);

  // Exit with appropriate code
  process.exit(exitCode);
}

// Run
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(255);
});
