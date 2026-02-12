#!/usr/bin/env node

/**
 * Orquestrador de Validações
 *
 * Executa todas as validações do projeto:
 * - Frontmatter (skills YAML)
 * - Markdown (formatação)
 * - ESLint (código JavaScript)
 *
 * Uso:
 *   node scripts/validation/run-all.js
 *   npm run validate
 *
 * Exit codes:
 *   0 - Todas validações passaram
 *   1 - Uma ou mais validações falharam
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Configuração de validações
const VALIDATIONS = [
  {
    name: 'Frontmatter',
    command: 'node',
    args: ['scripts/validation/frontmatter-check.js'],
    icon: '📋',
    critical: true,
  },
  {
    name: 'Markdown',
    command: 'node',
    args: ['scripts/validation/markdown-lint.js'],
    icon: '📝',
    critical: false, // Avisos não bloqueiam
  },
  {
    name: 'ESLint',
    command: 'npx',
    args: ['eslint', '.', '--ext', '.js'],
    icon: '🔍',
    critical: true,
  },
];

// Resultados
const results = [];

/**
 * Executa uma validação
 */
function runValidation(validation) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    console.log(`${colors.cyan}${validation.icon} Executando: ${colors.bright}${validation.name}${colors.reset}`);
    console.log(`${colors.dim}   Comando: ${validation.command} ${validation.args.join(' ')}${colors.reset}\n`);

    const child = spawn(validation.command, validation.args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const success = code === 0;

      const result = {
        name: validation.name,
        success,
        code,
        duration,
        critical: validation.critical,
      };

      results.push(result);

      // Feedback visual
      if (success) {
        console.log(`\n${colors.green}✅ ${validation.name} passou em ${duration}s${colors.reset}`);
      } else {
        const severity = validation.critical ? 'FALHOU' : 'AVISOS';
        const color = validation.critical ? colors.red : colors.yellow;
        console.log(`\n${color}${validation.critical ? '❌' : '⚠️'} ${validation.name} ${severity} (exit code: ${code})${colors.reset}`);
      }

      console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}\n`);

      resolve(result);
    });

    child.on('error', (err) => {
      console.error(`${colors.red}❌ Erro ao executar ${validation.name}:${colors.reset}`, err);
      results.push({
        name: validation.name,
        success: false,
        error: err.message,
        critical: validation.critical,
      });
      resolve();
    });
  });
}

/**
 * Imprime resumo final
 */
function printSummary() {
  console.log(`\n${colors.bright}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}           RESUMO DAS VALIDAÇÕES${colors.reset}`);
  console.log(`${colors.bright}${'═'.repeat(60)}${colors.reset}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;

  results.forEach((result) => {
    const icon = result.success ? '✅' : (result.critical ? '❌' : '⚠️');
    const color = result.success ? colors.green : (result.critical ? colors.red : colors.yellow);
    const status = result.success ? 'PASSOU' : (result.critical ? 'FALHOU' : 'AVISOS');

    console.log(`  ${color}${icon} ${result.name.padEnd(20)} ${status}${colors.reset}`);

    if (result.duration) {
      console.log(`     ${colors.dim}Tempo: ${result.duration}s${colors.reset}`);
    }

    if (result.success) {
      totalPassed++;
    } else if (result.critical) {
      totalFailed++;
    } else {
      totalWarnings++;
    }
  });

  console.log(`\n${colors.bright}${'─'.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ Passaram: ${totalPassed}${colors.reset}`);
  console.log(`${colors.red}❌ Falharam: ${totalFailed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Avisos: ${totalWarnings}${colors.reset}`);
  console.log(`${colors.bright}${'═'.repeat(60)}${colors.reset}\n`);

  // Mensagem final
  if (totalFailed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 Todas as validações críticas passaram!${colors.reset}\n`);
    if (totalWarnings > 0) {
      console.log(`${colors.yellow}ℹ️  Há ${totalWarnings} validação(ões) com avisos (não bloqueiam)${colors.reset}\n`);
    }
    return 0;
  } else {
    console.log(`${colors.red}${colors.bright}❌ ${totalFailed} validação(ões) crítica(s) falharam!${colors.reset}\n`);
    return 1;
  }
}

/**
 * Main
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🚀 SUPER CARTOLA MANAGER                        ║
║              Sistema de Validações                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  const startTime = Date.now();

  // Executar validações sequencialmente (para output legível)
  for (const validation of VALIDATIONS) {
    await runValidation(validation);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`${colors.dim}Tempo total: ${totalDuration}s${colors.reset}\n`);

  // Resumo e exit code
  const exitCode = printSummary();
  process.exit(exitCode);
}

// Executar
main().catch((err) => {
  console.error(`${colors.red}❌ Erro fatal:${colors.reset}`, err);
  process.exit(1);
});
