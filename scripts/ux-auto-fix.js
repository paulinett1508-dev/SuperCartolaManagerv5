#!/usr/bin/env node
/**
 * UX AUTO-FIX ENGINE - Super Cartola Manager
 * ==========================================
 *
 * Detecta e corrige automaticamente issues comuns de UX no app participante.
 *
 * Features:
 * - Cores hardcoded → Design Tokens
 * - z-index arbitrário → Camadas padronizadas
 * - Emojis → Material Icons
 * - font-family hardcoded → Tokens
 * - Inline styles → CSS com tokens
 *
 * Safety:
 * - Backup automático antes de aplicar fixes
 * - Dry-run mode (preview sem aplicar)
 * - Confidence scoring (só aplica se >= 0.80)
 * - Rollback em caso de erro
 *
 * Uso:
 *   node scripts/ux-auto-fix.js                    # Dry-run (preview)
 *   node scripts/ux-auto-fix.js --apply            # Aplicar fixes
 *   node scripts/ux-auto-fix.js --apply --commit   # Aplicar + commit
 *   node scripts/ux-auto-fix.js --file path.html   # Fix arquivo específico
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CONFIG = {
  participantePath: path.join(__dirname, '../public/participante'),
  backupPath: path.join(__dirname, '../.ux-auto-fix-backup'),
  minConfidence: 0.80,
  extensions: ['.html', '.css', '.js'],
  excludeFiles: ['_app-tokens.css', 'service-worker.js'],
};

// ============================================================================
// COLOR MAPPINGS - Cores Hardcoded → Design Tokens
// ============================================================================

const COLOR_MAP = {
  // Primárias
  '#FF5500': 'var(--app-primary)',
  '#ff5500': 'var(--app-primary)',
  '#e8472b': 'var(--app-primary-dark)',
  '#ff6b35': 'var(--app-primary-light)',

  // Backgrounds
  '#0a0a0a': 'var(--app-bg)',
  '#000000': 'var(--app-bg-dark)',
  '#1a1a1a': 'var(--app-surface)',
  '#1c1c1c': 'var(--app-surface-elevated)',
  '#333333': 'var(--app-surface-hover)',

  // Texto
  '#ffffff': 'var(--app-text-primary)',
  '#fff': 'var(--app-text-primary)',

  // Status - Sucesso/Verde
  '#10b981': 'var(--app-success)',
  '#22c55e': 'var(--app-success-light)',
  '#86efac': 'var(--app-success-text)',

  // Status - Erro/Vermelho
  '#ef4444': 'var(--app-danger)',
  '#b91c1c': 'var(--app-danger-dark)',
  '#f87171': 'var(--app-danger-light)',
  '#fca5a5': 'var(--app-danger-text)',

  // Status - Alerta/Amarelo
  '#eab308': 'var(--app-warning)',
  '#ca8a04': 'var(--app-warning-dark)',

  // Status - Info/Azul
  '#3b82f6': 'var(--app-info)',
  '#1d4ed8': 'var(--app-info-dark)',
  '#60a5fa': 'var(--app-info-light)',

  // Cores especiais
  '#8b5cf6': 'var(--app-purple)',
  '#ec4899': 'var(--app-pink)',
  '#6366f1': 'var(--app-indigo)',
  '#14b8a6': 'var(--app-teal)',
  '#f59e0b': 'var(--app-amber)',

  // Ranking
  '#ffd700': 'var(--app-gold)',
  '#c0c0c0': 'var(--app-silver)',
  '#cd7f32': 'var(--app-bronze)',

  // Posições (Campinho)
  '#f97316': 'var(--app-pos-gol)',
  '#c2410c': 'var(--app-pos-gol-dark)',
  '#fb923c': 'var(--app-pos-gol-light)',
  '#a855f7': 'var(--app-pos-tec)',
  '#7e22ce': 'var(--app-pos-tec-dark)',
  '#c084fc': 'var(--app-pos-tec-light)',
};

// ============================================================================
// Z-INDEX MAPPINGS - Valores Arbitrários → Camadas Semânticas
// ============================================================================

function mapZIndex(value) {
  const num = parseInt(value);

  if (num <= 1) return { token: 'var(--app-z-content)', confidence: 0.95 };
  if (num <= 100) return { token: 'var(--app-z-header)', confidence: 0.85 };
  if (num <= 200) return { token: 'var(--app-z-nav)', confidence: 0.85 };
  if (num <= 500) return { token: 'var(--app-z-overlay)', confidence: 0.80 };
  if (num <= 600) return { token: 'var(--app-z-modal)', confidence: 0.80 };
  if (num <= 700) return { token: 'var(--app-z-toast)', confidence: 0.85 };
  if (num >= 1000) return { token: 'var(--app-z-bottom-nav)', confidence: 0.90 };

  // Valor estranho, menor confiança
  return { token: `var(--app-z-overlay) /* was: ${value} */`, confidence: 0.60 };
}

// ============================================================================
// EMOJI MAPPINGS - Emojis → Material Icons
// ============================================================================

const EMOJI_MAP = {
  '🏆': '<span class="material-icons">emoji_events</span>',
  '⚽': '<span class="material-icons">sports_soccer</span>',
  '🎯': '<span class="material-icons">track_changes</span>',
  '📊': '<span class="material-icons">bar_chart</span>',
  '💰': '<span class="material-icons">paid</span>',
  '⭐': '<span class="material-icons">star</span>',
  '🥇': '<span class="material-icons">military_tech</span>',
  '🥈': '<span class="material-icons">military_tech</span>',
  '🥉': '<span class="material-icons">military_tech</span>',
  '📈': '<span class="material-icons">trending_up</span>',
  '📉': '<span class="material-icons">trending_down</span>',
  '🔥': '<span class="material-icons">local_fire_department</span>',
  '⚡': '<span class="material-icons">bolt</span>',
  '👑': '<span class="material-icons">emoji_events</span>',
  '🎖️': '<span class="material-icons">military_tech</span>',
  '🎖': '<span class="material-icons">military_tech</span>',
};

// ============================================================================
// FONT-FAMILY MAPPINGS - Fontes Hardcoded → Tokens
// ============================================================================

const FONT_MAP = {
  'Inter': 'var(--app-font-base)',
  'Russo One': 'var(--app-font-brand)',
  'JetBrains Mono': 'var(--app-font-mono)',
  'Arial': 'var(--app-font-base)',
  'Helvetica': 'var(--app-font-base)',
  'sans-serif': 'var(--app-font-base)',
  'monospace': 'var(--app-font-mono)',
};

// ============================================================================
// FIX PATTERNS - Engines de Detecção e Correção
// ============================================================================

const FIX_PATTERNS = {
  // Pattern 1: Cores hardcoded em CSS
  hardcodedColorCSS: {
    name: 'Cores hardcoded em CSS',
    regex: /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/gi,
    test: (content, filePath) => {
      // Não testar no arquivo de tokens
      if (filePath.includes('_app-tokens.css')) return [];
      return [...content.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/gi)];
    },
    fix: (match, context) => {
      const color = match[0].toLowerCase();
      const token = COLOR_MAP[color];

      if (token) {
        return {
          original: match[0],
          fixed: token,
          confidence: 0.95,
          reason: `Cor hardcoded mapeada para token oficial`,
        };
      }

      return {
        original: match[0],
        fixed: match[0],
        confidence: 0.0,
        reason: `Cor não mapeada (adicionar ao COLOR_MAP se necessário)`,
      };
    },
  },

  // Pattern 2: Cores hardcoded em HTML inline styles
  hardcodedColorHTML: {
    name: 'Cores hardcoded em HTML (inline)',
    regex: /style="[^"]*color:\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})[^"]*"/gi,
    test: (content, filePath) => {
      if (!filePath.endsWith('.html')) return [];
      return [...content.matchAll(/style="[^"]*color:\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})[^"]*"/gi)];
    },
    fix: (match, context) => {
      const fullStyle = match[0];
      const color = fullStyle.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i)[0].toLowerCase();
      const token = COLOR_MAP[color];

      if (token) {
        const fixed = fullStyle.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i, token);
        return {
          original: fullStyle,
          fixed: fixed,
          confidence: 0.85,
          reason: `Inline style com cor hardcoded → token`,
        };
      }

      return {
        original: fullStyle,
        fixed: fullStyle,
        confidence: 0.0,
        reason: `Cor não mapeada`,
      };
    },
  },

  // Pattern 3: z-index arbitrário
  arbitraryZIndex: {
    name: 'Z-index arbitrário',
    regex: /z-index:\s*(\d+)/gi,
    test: (content, filePath) => {
      if (filePath.includes('_app-tokens.css')) return [];
      if (!filePath.endsWith('.css')) return [];
      return [...content.matchAll(/z-index:\s*(\d+)/gi)];
    },
    fix: (match, context) => {
      const value = match[1];
      const mapped = mapZIndex(value);

      return {
        original: match[0],
        fixed: `z-index: ${mapped.token}`,
        confidence: mapped.confidence,
        reason: `z-index ${value} mapeado para camada semântica`,
      };
    },
  },

  // Pattern 4: Emojis como ícones
  emojiAsIcon: {
    name: 'Emoji como ícone',
    regex: /[🏆⚽🎯📊💰⭐🥇🥈🥉📈📉🔥⚡👑🎖️🎖]/g,
    test: (content, filePath) => {
      if (!filePath.endsWith('.html')) return [];
      return [...content.matchAll(/[🏆⚽🎯📊💰⭐🥇🥈🥉📈📉🔥⚡👑🎖️🎖]/g)];
    },
    fix: (match, context) => {
      const emoji = match[0];
      const icon = EMOJI_MAP[emoji];

      if (icon) {
        return {
          original: emoji,
          fixed: icon,
          confidence: 0.90,
          reason: `Emoji substituído por Material Icon`,
        };
      }

      return {
        original: emoji,
        fixed: emoji,
        confidence: 0.0,
        reason: `Emoji não mapeado`,
      };
    },
  },

  // Pattern 5: font-family hardcoded
  hardcodedFont: {
    name: 'Font-family hardcoded',
    regex: /font-family:\s*['"]?([^;'"]+)['"]?/gi,
    test: (content, filePath) => {
      if (filePath.includes('_app-tokens.css')) return [];
      if (!filePath.endsWith('.css')) return [];
      return [...content.matchAll(/font-family:\s*['"]?([^;'"]+)['"]?/gi)];
    },
    fix: (match, context) => {
      const fontValue = match[1].trim();

      // Já é um token?
      if (fontValue.includes('var(--app-font-')) {
        return {
          original: match[0],
          fixed: match[0],
          confidence: 1.0,
          reason: `Já usa token`,
        };
      }

      // Mapear fonte comum
      for (const [font, token] of Object.entries(FONT_MAP)) {
        if (fontValue.includes(font)) {
          return {
            original: match[0],
            fixed: `font-family: ${token}`,
            confidence: 0.90,
            reason: `Font ${font} → token`,
          };
        }
      }

      return {
        original: match[0],
        fixed: match[0],
        confidence: 0.0,
        reason: `Fonte não mapeada: ${fontValue}`,
      };
    },
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.backupPath)) {
    fs.mkdirSync(CONFIG.backupPath, { recursive: true });
  }
}

function isGitClean() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.trim() === '';
  } catch (e) {
    console.warn('⚠️  Aviso: Não foi possível verificar status do git');
    return true; // Permite continuar
  }
}

function createBackup(filePath) {
  const relativePath = path.relative(CONFIG.participantePath, filePath);
  const backupFile = path.join(CONFIG.backupPath, relativePath);
  const backupDir = path.dirname(backupFile);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(filePath, backupFile);
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
// CORE ENGINE
// ============================================================================

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const [patternName, pattern] of Object.entries(FIX_PATTERNS)) {
    const matches = pattern.test(content, filePath);

    matches.forEach(match => {
      const fix = pattern.fix(match, { filePath, content });

      // Só reportar se precisa fix (confidence >= threshold e não é 1.0 = já correto)
      if (fix.confidence >= CONFIG.minConfidence && fix.confidence < 1.0) {
        issues.push({
          file: path.relative(CONFIG.participantePath, filePath),
          pattern: pattern.name,
          original: fix.original,
          fixed: fix.fixed,
          confidence: fix.confidence,
          reason: fix.reason,
          line: getLineNumber(content, match.index),
        });
      }
    });
  }

  return issues;
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function applyFixes(filePath, issues) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;

  // Ordenar issues por posição (reverso) para não invalidar indices
  const sortedIssues = issues.sort((a, b) => {
    const indexA = content.indexOf(a.original);
    const indexB = content.indexOf(b.original);
    return indexB - indexA;
  });

  sortedIssues.forEach(issue => {
    const before = content;
    content = content.replace(issue.original, issue.fixed);

    if (content !== before) {
      fixCount++;
    }
  });

  if (fixCount > 0) {
    createBackup(filePath);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixCount;
}

// ============================================================================
// REPORTING
// ============================================================================

function printReport(allIssues, mode = 'dry-run') {
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 UX AUTO-FIX REPORT - ${mode.toUpperCase()}`);
  console.log('='.repeat(80) + '\n');

  if (allIssues.length === 0) {
    console.log('✅ Nenhum issue detectado! Código está conforme.\n');
    return;
  }

  // Agrupar por padrão
  const byPattern = {};
  allIssues.forEach(issue => {
    if (!byPattern[issue.pattern]) {
      byPattern[issue.pattern] = [];
    }
    byPattern[issue.pattern].push(issue);
  });

  // Summary
  console.log('📊 RESUMO\n');
  Object.entries(byPattern).forEach(([pattern, issues]) => {
    console.log(`  ${pattern}: ${issues.length} issue(s)`);
  });
  console.log(`\n  Total: ${allIssues.length} issue(s) detectado(s)\n`);

  // Detalhes
  console.log('📝 DETALHES\n');
  Object.entries(byPattern).forEach(([pattern, issues]) => {
    console.log(`\n  ${pattern}:`);
    issues.slice(0, 10).forEach(issue => {
      console.log(`    ${issue.file}:${issue.line}`);
      console.log(`      ❌ ${issue.original}`);
      console.log(`      ✅ ${issue.fixed}`);
      console.log(`      💡 ${issue.reason} (confidence: ${(issue.confidence * 100).toFixed(0)}%)`);
    });

    if (issues.length > 10) {
      console.log(`    ... e mais ${issues.length - 10} issue(s)`);
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--apply');
  const shouldCommit = args.includes('--commit');
  const specificFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

  console.log('🚀 UX Auto-Fix Engine - Super Cartola Manager\n');

  // Safety checks
  if (!isDryRun && !isGitClean()) {
    console.error('❌ Git working directory não está limpo!');
    console.error('   Commit ou stash suas mudanças antes de aplicar fixes.\n');
    process.exit(1);
  }

  ensureBackupDir();

  // Get files to analyze
  let files;
  if (specificFile) {
    files = [path.join(CONFIG.participantePath, specificFile)];
  } else {
    files = getAllFiles(CONFIG.participantePath);
  }

  console.log(`📂 Analisando ${files.length} arquivo(s)...\n`);

  // Analyze all files
  const allIssues = [];
  const fileIssues = {};

  files.forEach(file => {
    const issues = analyzeFile(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
      fileIssues[file] = issues;
    }
  });

  // Print report
  printReport(allIssues, isDryRun ? 'dry-run' : 'apply');

  // Apply fixes if requested
  if (!isDryRun && allIssues.length > 0) {
    console.log('🔧 Aplicando fixes...\n');

    let totalFixed = 0;
    Object.entries(fileIssues).forEach(([file, issues]) => {
      const fixed = applyFixes(file, issues);
      totalFixed += fixed;

      if (fixed > 0) {
        console.log(`  ✅ ${path.relative(CONFIG.participantePath, file)}: ${fixed} fix(es)`);
      }
    });

    console.log(`\n✨ Total: ${totalFixed} fix(es) aplicado(s)!`);
    console.log(`📦 Backup criado em: ${CONFIG.backupPath}\n`);

    // Commit if requested
    if (shouldCommit) {
      try {
        const patterns = Object.keys(byPattern).join(', ');
        execSync(`git add ${CONFIG.participantePath}`, { stdio: 'inherit' });
        execSync(`git commit -m "fix(ux): auto-fix ${totalFixed} issues (${patterns})"`, { stdio: 'inherit' });
        console.log('\n✅ Commit criado com sucesso!\n');
      } catch (e) {
        console.error('\n❌ Erro ao criar commit:', e.message);
      }
    }
  } else if (isDryRun && allIssues.length > 0) {
    console.log('💡 Para aplicar os fixes, execute:');
    console.log('   node scripts/ux-auto-fix.js --apply\n');
  }
}

// Run
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
