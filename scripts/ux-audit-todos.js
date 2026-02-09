#!/usr/bin/env node
/**
 * UX AUDIT TODO GENERATOR - Super Cartola Manager
 * =================================================
 *
 * Detecta issues de UX que NÃO são auto-fixáveis e gera TODOs estruturados.
 *
 * Issues detectados:
 * - Estados visuais faltantes (loading, error, empty)
 * - Problemas de responsividade
 * - Issues de acessibilidade
 * - Navegação SPA
 * - Performance
 *
 * Uso:
 *   node scripts/ux-audit-todos.js                    # Detectar e listar
 *   node scripts/ux-audit-todos.js --generate         # Gerar TODOs no console
 *   node scripts/ux-audit-todos.js --dashboard        # Dashboard de progresso
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CONFIG = {
  participantePath: path.join(__dirname, '../public/participante'),
  extensions: ['.html', '.css', '.js'],
  excludeFiles: ['_app-tokens.css', 'service-worker.js'],
};

// ============================================================================
// DETECTION PATTERNS - Issues Não Auto-Fixáveis
// ============================================================================

const MANUAL_FIX_PATTERNS = {
  // Pattern 1: Estados de loading ausentes
  missingLoadingState: {
    name: 'Estado de loading ausente',
    severity: 'ALTO',
    category: 'Estados Visuais',
    regex: /fetch\(|\.get\(|\.post\(|axios\./g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.js')) return [];

      const hasFetch = /fetch\(|\.get\(|\.post\(|axios\./.test(content);
      const hasLoadingState = /loading|spinner|skeleton|isLoading/.test(content);

      if (hasFetch && !hasLoadingState) {
        return [{
          line: 1, // Simplificado - linha exata seria mais complexo
          context: 'API call sem estado de loading',
        }];
      }

      return [];
    },
    fix: null, // Não automatizável
    estimatedTime: '15min',
  },

  // Pattern 2: Estados de erro ausentes
  missingErrorState: {
    name: 'Estado de erro ausente',
    severity: 'ALTO',
    category: 'Estados Visuais',
    regex: /fetch\(|\.get\(|\.post\(|axios\./g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.js')) return [];

      const hasFetch = /fetch\(|\.get\(|\.post\(|axios\./.test(content);
      const hasErrorHandling = /catch\(|\.catch|try.*catch|showError|handleError/.test(content);

      if (hasFetch && !hasErrorHandling) {
        return [{
          line: 1,
          context: 'API call sem tratamento de erro',
        }];
      }

      return [];
    },
    fix: null,
    estimatedTime: '10min',
  },

  // Pattern 3: Estados vazios ausentes
  missingEmptyState: {
    name: 'Estado vazio ausente',
    severity: 'MEDIO',
    category: 'Estados Visuais',
    regex: /\.length\s*===\s*0|\.length\s*<\s*1|!.*\.length/g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.js')) return [];

      const hasEmptyCheck = /\.length\s*===\s*0|\.length\s*<\s*1/.test(content);
      const hasEmptyUI = /empty|vazio|sem.*dados|nenhum.*registro/i.test(content);

      if (hasEmptyCheck && !hasEmptyUI) {
        return [{
          line: 1,
          context: 'Check de array vazio sem UI correspondente',
        }];
      }

      return [];
    },
    fix: null,
    estimatedTime: '20min',
  },

  // Pattern 4: Inline styles complexos (não automatizáveis)
  complexInlineStyles: {
    name: 'Inline style complexo',
    severity: 'MEDIO',
    category: 'CSS',
    regex: /style="[^"]{100,}"/g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.html') && !filePath.endsWith('.js')) return [];

      const matches = [...content.matchAll(/style="[^"]{100,}"/g)];
      return matches.map(match => ({
        line: getLineNumber(content, match.index),
        context: `Inline style longo (${match[0].length} chars)`,
      }));
    },
    fix: null,
    estimatedTime: '15min',
  },

  // Pattern 5: Aria-labels faltantes em botões sem texto
  missingAriaLabel: {
    name: 'Aria-label ausente',
    severity: 'ALTO',
    category: 'Acessibilidade',
    regex: /<button[^>]*>[^<]*<(span|i)[^>]*class="material-icons"/g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.html')) return [];

      const matches = [...content.matchAll(/<button[^>]*>/g)];
      const issues = [];

      matches.forEach(match => {
        const buttonTag = match[0];
        const hasIcon = /material-icons|fa-/.test(buttonTag);
        const hasAriaLabel = /aria-label/.test(buttonTag);

        if (hasIcon && !hasAriaLabel) {
          issues.push({
            line: getLineNumber(content, match.index),
            context: 'Botão com ícone sem aria-label',
          });
        }
      });

      return issues;
    },
    fix: null,
    estimatedTime: '5min',
  },

  // Pattern 6: Touch targets pequenos
  smallTouchTarget: {
    name: 'Touch target pequeno',
    severity: 'MEDIO',
    category: 'Responsividade',
    regex: /height:\s*([0-9]{1,2})px|width:\s*([0-9]{1,2})px/g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.css')) return [];

      const matches = [...content.matchAll(/height:\s*([0-9]{1,2})px|width:\s*([0-9]{1,2})px/g)];
      const issues = [];

      matches.forEach(match => {
        const value = parseInt(match[1] || match[2]);

        // Touch target mínimo: 44px (WCAG)
        if (value < 44) {
          const context = content.substring(match.index - 100, match.index + 100);
          const isButton = /button|btn|click|tap|touch/.test(context);

          if (isButton) {
            issues.push({
              line: getLineNumber(content, match.index),
              context: `Touch target ${value}px (mínimo: 44px)`,
            });
          }
        }
      });

      return issues;
    },
    fix: null,
    estimatedTime: '10min',
  },

  // Pattern 7: Overflow horizontal potencial
  potentialOverflow: {
    name: 'Overflow horizontal potencial',
    severity: 'ALTO',
    category: 'Responsividade',
    regex: /width:\s*\d{4,}px|min-width:\s*\d{3,}px/g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.css')) return [];

      const matches = [...content.matchAll(/width:\s*(\d{3,})px|min-width:\s*(\d{3,})px/g)];
      const issues = [];

      matches.forEach(match => {
        const value = parseInt(match[1] || match[2]);

        // Width > 360px pode causar overflow em mobile
        if (value > 360) {
          issues.push({
            line: getLineNumber(content, match.index),
            context: `Width fixo ${value}px (mobile: 360px)`,
          });
        }
      });

      return issues;
    },
    fix: null,
    estimatedTime: '15min',
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      const shouldInclude = CONFIG.extensions.includes(ext);
      const shouldExclude = CONFIG.excludeFiles.some(excluded => file.includes(excluded));

      if (shouldInclude && !shouldExclude) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

// ============================================================================
// DETECTION ENGINE
// ============================================================================

function detectManualIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const [patternName, pattern] of Object.entries(MANUAL_FIX_PATTERNS)) {
    const detected = pattern.test(content, filePath);

    detected.forEach(detection => {
      issues.push({
        file: path.relative(CONFIG.participantePath, filePath),
        pattern: pattern.name,
        severity: pattern.severity,
        category: pattern.category,
        line: detection.line,
        context: detection.context,
        estimatedTime: pattern.estimatedTime,
      });
    });
  }

  return issues;
}

// ============================================================================
// TODO GENERATION
// ============================================================================

function generateTodos(allIssues) {
  const todos = [];

  // Agrupar por severidade
  const bySeverity = {
    CRITICO: [],
    ALTO: [],
    MEDIO: [],
    BAIXO: [],
  };

  allIssues.forEach(issue => {
    if (bySeverity[issue.severity]) {
      bySeverity[issue.severity].push(issue);
    }
  });

  // Gerar TODOs priorizados
  Object.entries(bySeverity).forEach(([severity, issues]) => {
    if (issues.length === 0) return;

    issues.forEach(issue => {
      const todoContent = `[${severity}] ${issue.file}:${issue.line} - ${issue.pattern}`;
      const todoActiveForm = `Corrigindo ${issue.pattern.toLowerCase()} (${issue.estimatedTime})`;

      todos.push({
        content: todoContent,
        activeForm: todoActiveForm,
        status: 'pending',
        category: issue.category,
        severity: issue.severity,
        estimatedTime: issue.estimatedTime,
        context: issue.context,
      });
    });
  });

  return todos;
}

// ============================================================================
// REPORTING
// ============================================================================

function printDashboard(allIssues) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 UX AUDIT DASHBOARD - Issues Manuais');
  console.log('='.repeat(80) + '\n');

  if (allIssues.length === 0) {
    console.log('✅ Nenhum issue manual detectado! Código está ótimo.\n');
    return;
  }

  // Agrupar por categoria
  const byCategory = {};
  allIssues.forEach(issue => {
    if (!byCategory[issue.category]) {
      byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
  });

  // Agrupar por severidade
  const bySeverity = {
    CRITICO: allIssues.filter(i => i.severity === 'CRITICO'),
    ALTO: allIssues.filter(i => i.severity === 'ALTO'),
    MEDIO: allIssues.filter(i => i.severity === 'MEDIO'),
    BAIXO: allIssues.filter(i => i.severity === 'BAIXO'),
  };

  // Summary
  console.log('📈 RESUMO GERAL\n');
  console.log(`  Total de issues: ${allIssues.length}`);
  console.log(`  Tempo estimado total: ${calculateTotalTime(allIssues)}\n`);

  console.log('🔴 Por Severidade:\n');
  Object.entries(bySeverity).forEach(([severity, issues]) => {
    if (issues.length > 0) {
      const icon = severity === 'CRITICO' ? '🔴' : severity === 'ALTO' ? '🟠' : severity === 'MEDIO' ? '🟡' : '🟢';
      console.log(`  ${icon} ${severity}: ${issues.length} issue(s)`);
    }
  });

  console.log('\n📁 Por Categoria:\n');
  Object.entries(byCategory).forEach(([category, issues]) => {
    console.log(`  ${category}: ${issues.length} issue(s)`);
  });

  console.log('\n📝 TOP 10 ISSUES PRIORITÁRIOS:\n');
  allIssues
    .sort((a, b) => {
      const severityOrder = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 10)
    .forEach((issue, i) => {
      const icon = issue.severity === 'CRITICO' ? '🔴' : issue.severity === 'ALTO' ? '🟠' : '🟡';
      console.log(`  ${i + 1}. ${icon} [${issue.severity}] ${issue.file}:${issue.line}`);
      console.log(`     ${issue.pattern} - ${issue.context}`);
      console.log(`     ⏱️  Estimado: ${issue.estimatedTime}\n`);
    });

  console.log('='.repeat(80) + '\n');
}

function calculateTotalTime(issues) {
  const totalMinutes = issues.reduce((sum, issue) => {
    const time = parseInt(issue.estimatedTime);
    return sum + time;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function printTodoList(todos) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TODO LIST GERADA - Copie e cole no TodoWrite');
  console.log('='.repeat(80) + '\n');

  console.log('```javascript');
  console.log(JSON.stringify(todos.slice(0, 20), null, 2)); // Limite 20 TODOs por vez
  console.log('```\n');

  if (todos.length > 20) {
    console.log(`💡 Mostrando 20 de ${todos.length} TODOs. Priorize os mais críticos primeiro.\n`);
  }

  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes('--generate');
  const showDashboard = args.includes('--dashboard');

  console.log('🔍 UX Audit - Detecção de Issues Manuais\n');

  // Get all files
  const files = getAllFiles(CONFIG.participantePath);
  console.log(`📂 Analisando ${files.length} arquivo(s)...\n`);

  // Detect issues
  const allIssues = [];
  files.forEach(file => {
    const issues = detectManualIssues(file);
    allIssues.push(...issues);
  });

  // Show dashboard
  if (showDashboard || !shouldGenerate) {
    printDashboard(allIssues);
  }

  // Generate TODOs
  if (shouldGenerate && allIssues.length > 0) {
    const todos = generateTodos(allIssues);
    printTodoList(todos);

    console.log('💡 Próximos passos:');
    console.log('   1. Copie o JSON acima');
    console.log('   2. Use TodoWrite para adicionar à sua lista');
    console.log('   3. Comece pelos issues CRÍTICOS\n');
  } else if (shouldGenerate && allIssues.length === 0) {
    console.log('✅ Nenhum TODO para gerar - código está excelente!\n');
  }
}

// Run
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
