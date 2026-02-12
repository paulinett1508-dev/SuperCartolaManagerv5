#!/usr/bin/env node

/**
 * Markdown Linter
 *
 * Valida formatação de arquivos Markdown em docs/skills/ e docs/
 * Usa regras permissivas focadas em erros graves.
 *
 * Uso:
 *   node scripts/validation/markdown-lint.js
 *   node scripts/validation/markdown-lint.js --fix  # Tenta corrigir automaticamente
 *
 * Exit codes:
 *   0 - Todos arquivos válidos
 *   1 - Erros encontrados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const DOCS_DIR = path.resolve(__dirname, '../../docs');
const CONFIG = {
  // Regras permissivas - apenas erros graves
  rules: {
    // Headings
    'no-duplicate-heading': true,              // Não duplicar títulos
    'heading-increment': true,                 // Incremento correto (h1 → h2, não h1 → h3)

    // Listas
    'list-marker-space': true,                 // Espaço após marcador de lista

    // Links
    'no-empty-links': true,                    // Links vazios [texto]()

    // Code
    'fenced-code-language': false,             // Não obrigar linguagem em code blocks

    // Espaçamento
    'no-trailing-spaces': true,                // Sem espaços no final das linhas
    'no-multiple-blanks': { maximum: 2 },      // Máximo 2 linhas em branco

    // YAML Frontmatter
    'no-bare-urls': false,                     // Permitir URLs sem <>
  },

  // Diretórios a validar
  include: [
    'docs/skills/**/*.md',
    'docs/*.md',
  ],

  // Ignorar
  ignore: [
    'node_modules/**',
    '.agent/**',
    '.husky/**',
    'docs/BACKLOG.md',                         // Pode ter formatação livre
  ],
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Estatísticas
const stats = {
  total: 0,
  valid: 0,
  errors: 0,
  warnings: 0,
};

/**
 * Busca recursivamente por arquivos .md
 */
function findMarkdownFiles(dir, patterns) {
  const files = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      // Ignorar diretórios/arquivos específicos
      const shouldIgnore = CONFIG.ignore.some(pattern => {
        return relativePath.includes(pattern.replace('**', ''));
      });

      if (shouldIgnore) continue;

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

/**
 * Valida um arquivo Markdown
 */
function validateMarkdownFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const result = {
    file: relativePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    result.valid = false;
    result.errors.push(`Erro ao ler arquivo: ${err.message}`);
    return result;
  }

  const lines = content.split('\n');

  // Validação 1: Trailing spaces
  if (CONFIG.rules['no-trailing-spaces']) {
    lines.forEach((line, i) => {
      if (line.endsWith(' ') || line.endsWith('\t')) {
        result.warnings.push(`Linha ${i + 1}: Espaços no final da linha`);
      }
    });
  }

  // Validação 2: Múltiplas linhas em branco
  if (CONFIG.rules['no-multiple-blanks']) {
    let blankCount = 0;
    lines.forEach((line, i) => {
      if (line.trim() === '') {
        blankCount++;
        if (blankCount > CONFIG.rules['no-multiple-blanks'].maximum) {
          result.warnings.push(`Linha ${i + 1}: Mais de ${CONFIG.rules['no-multiple-blanks'].maximum} linhas em branco consecutivas`);
        }
      } else {
        blankCount = 0;
      }
    });
  }

  // Validação 3: Links vazios
  if (CONFIG.rules['no-empty-links']) {
    const emptyLinkRegex = /\[([^\]]+)\]\(\s*\)/g;
    let match;
    lines.forEach((line, i) => {
      while ((match = emptyLinkRegex.exec(line)) !== null) {
        result.valid = false;
        result.errors.push(`Linha ${i + 1}: Link vazio encontrado: [${match[1]}]()`);
      }
    });
  }

  // Validação 4: Headings duplicados
  if (CONFIG.rules['no-duplicate-heading']) {
    const headings = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line, i) => {
      const match = line.match(headingRegex);
      if (match) {
        const [, level, text] = match;
        const cleanText = text.trim().toLowerCase();

        if (headings.includes(cleanText)) {
          result.warnings.push(`Linha ${i + 1}: Heading duplicado: "${text}"`);
        }
        headings.push(cleanText);
      }
    });
  }

  // Validação 5: Incremento de headings
  if (CONFIG.rules['heading-increment']) {
    let lastLevel = 0;
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line, i) => {
      const match = line.match(headingRegex);
      if (match) {
        const [, hashes, text] = match;
        const currentLevel = hashes.length;

        // Pular frontmatter (ignora headings no YAML)
        if (i < 10 && content.startsWith('---')) {
          return;
        }

        if (lastLevel > 0 && currentLevel > lastLevel + 1) {
          result.warnings.push(
            `Linha ${i + 1}: Incremento de heading inválido (h${lastLevel} → h${currentLevel}): "${text}"`
          );
        }

        lastLevel = currentLevel;
      }
    });
  }

  return result;
}

/**
 * Formata resultado de validação
 */
function printResult(result) {
  const icon = result.valid ? '✅' : '❌';
  const color = result.valid ? colors.green : colors.red;

  // Só mostrar se houver erros/warnings
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return;
  }

  console.log(`\n${color}${icon} ${result.file}${colors.reset}`);

  if (result.errors.length > 0) {
    console.log(`  ${colors.red}Erros:${colors.reset}`);
    result.errors.forEach(err => {
      console.log(`    • ${err}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log(`  ${colors.yellow}Avisos:${colors.reset}`);
    result.warnings.forEach(warn => {
      console.log(`    • ${warn}`);
    });
  }
}

/**
 * Imprime estatísticas finais
 */
function printStats() {
  console.log(`\n${colors.bright}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Estatísticas de Validação Markdown${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════${colors.reset}`);

  console.log(`\nArquivos analisados: ${stats.total}`);
  console.log(`${colors.green}✅ Sem problemas: ${stats.valid}${colors.reset}`);
  console.log(`${colors.red}❌ Com erros: ${stats.errors}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Com avisos: ${stats.warnings}${colors.reset}`);

  const percentage = stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : 0;
  console.log(`\n${colors.bright}Taxa de sucesso: ${percentage}%${colors.reset}`);
}

/**
 * Main
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}📝 Validador de Markdown${colors.reset}\n`);
  console.log(`Analisando: ${DOCS_DIR}\n`);

  // Verificar se diretório existe
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`${colors.red}❌ Diretório não encontrado: ${DOCS_DIR}${colors.reset}`);
    process.exit(1);
  }

  // Buscar arquivos
  const files = findMarkdownFiles(DOCS_DIR, CONFIG.include);

  if (files.length === 0) {
    console.log(`${colors.yellow}⚠️  Nenhum arquivo .md encontrado${colors.reset}`);
    process.exit(0);
  }

  console.log(`Encontrados ${files.length} arquivos\n`);

  // Validar cada arquivo
  for (const file of files) {
    stats.total++;
    const result = validateMarkdownFile(file);

    if (result.errors.length === 0 && result.warnings.length === 0) {
      stats.valid++;
    } else if (result.errors.length > 0) {
      stats.errors++;
    } else {
      stats.warnings++;
    }

    printResult(result);
  }

  // Estatísticas finais
  printStats();

  // Exit code (avisos não causam falha)
  if (stats.errors > 0) {
    console.log(`\n${colors.red}❌ Validação falhou com ${stats.errors} erro(s)${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ Validação concluída!${colors.reset}\n`);
    if (stats.warnings > 0) {
      console.log(`${colors.yellow}ℹ️  ${stats.warnings} arquivo(s) com avisos (não bloqueiam)${colors.reset}\n`);
    }
    process.exit(0);
  }
}

// Executar
main();
