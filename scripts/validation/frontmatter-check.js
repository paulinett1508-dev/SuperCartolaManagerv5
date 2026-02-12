#!/usr/bin/env node

/**
 * Frontmatter Validator
 *
 * Valida que todas as skills em docs/skills/ possuem frontmatter YAML válido
 * com os campos obrigatórios.
 *
 * Uso:
 *   node scripts/validation/frontmatter-check.js
 *   node scripts/validation/frontmatter-check.js --fix  # Tenta corrigir erros simples
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
const SKILLS_DIR = path.resolve(__dirname, '../../docs/skills');
const REQUIRED_FIELDS = ['name', 'description'];
const OPTIONAL_FIELDS = ['category', 'version', 'author', 'keywords', 'dependencies', 'activationKeywords'];

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Estatísticas
const stats = {
  total: 0,
  valid: 0,
  errors: 0,
  warnings: 0,
  files: [],
};

/**
 * Extrai frontmatter de um arquivo Markdown
 */
function extractFrontmatter(content, filePath) {
  const lines = content.split('\n');

  // Verificar se começa com ---
  if (lines[0] !== '---') {
    return {
      valid: false,
      error: 'Frontmatter não encontrado (deve começar com ---)',
      line: 1,
    };
  }

  // Encontrar o fim do frontmatter
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) {
    return {
      valid: false,
      error: 'Frontmatter não fechado (falta --- no final)',
      line: 1,
    };
  }

  // Extrair conteúdo YAML
  const yamlContent = lines.slice(1, endLine).join('\n');

  // Parse manual simples do YAML (evita dependência)
  const data = {};
  const yamlLines = yamlContent.split('\n');

  for (let i = 0; i < yamlLines.length; i++) {
    const line = yamlLines[i].trim();
    if (!line || line.startsWith('#')) continue;

    // Parse key: value
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;

      // Remove aspas se houver
      let parsedValue = value.trim();
      if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
          (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
        parsedValue = parsedValue.slice(1, -1);
      }

      // Arrays simples (YAML list)
      if (parsedValue.startsWith('[') && parsedValue.endsWith(']')) {
        parsedValue = parsedValue.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }

      data[key] = parsedValue;
    }
  }

  return {
    valid: true,
    data,
    endLine,
  };
}

/**
 * Valida um arquivo de skill
 */
function validateSkillFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const result = {
    file: relativePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  // Ler arquivo
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    result.valid = false;
    result.errors.push(`Erro ao ler arquivo: ${err.message}`);
    return result;
  }

  // Extrair frontmatter
  const frontmatter = extractFrontmatter(content, filePath);

  if (!frontmatter.valid) {
    result.valid = false;
    result.errors.push(`${frontmatter.error} (linha ${frontmatter.line})`);
    return result;
  }

  const { data } = frontmatter;

  // Validar campos obrigatórios
  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || data[field].trim() === '') {
      result.valid = false;
      result.errors.push(`Campo obrigatório ausente ou vazio: ${field}`);
    }
  }

  // Avisos para campos recomendados
  if (!data.category) {
    result.warnings.push('Campo recomendado ausente: category');
  }

  if (!data.keywords || data.keywords.length === 0) {
    result.warnings.push('Campo recomendado ausente: keywords (ajuda na busca)');
  }

  // Validar tipos
  if (data.keywords && typeof data.keywords === 'string') {
    result.warnings.push('keywords deveria ser uma lista YAML, não string');
  }

  return result;
}

/**
 * Busca recursivamente por arquivos .md
 */
function findMarkdownFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

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
 * Formata resultado de validação
 */
function printResult(result) {
  const icon = result.valid ? '✅' : '❌';
  const color = result.valid ? colors.green : colors.red;

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
  console.log(`${colors.cyan}Estatísticas de Validação${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════${colors.reset}`);

  console.log(`\nArquivos analisados: ${stats.total}`);
  console.log(`${colors.green}✅ Válidos: ${stats.valid}${colors.reset}`);
  console.log(`${colors.red}❌ Com erros: ${stats.errors}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Com avisos: ${stats.warnings}${colors.reset}`);

  const percentage = stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : 0;
  console.log(`\n${colors.bright}Taxa de sucesso: ${percentage}%${colors.reset}`);
}

/**
 * Main
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}🔍 Validador de Frontmatter${colors.reset}\n`);
  console.log(`Analisando: ${SKILLS_DIR}\n`);

  // Verificar se diretório existe
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`${colors.red}❌ Diretório não encontrado: ${SKILLS_DIR}${colors.reset}`);
    process.exit(1);
  }

  // Buscar arquivos
  const files = findMarkdownFiles(SKILLS_DIR);

  if (files.length === 0) {
    console.log(`${colors.yellow}⚠️  Nenhum arquivo .md encontrado${colors.reset}`);
    process.exit(0);
  }

  console.log(`Encontrados ${files.length} arquivos\n`);

  // Validar cada arquivo
  for (const file of files) {
    stats.total++;
    const result = validateSkillFile(file);

    if (result.valid) {
      stats.valid++;
    } else {
      stats.errors++;
    }

    if (result.warnings.length > 0) {
      stats.warnings++;
    }

    printResult(result);
  }

  // Estatísticas finais
  printStats();

  // Exit code
  if (stats.errors > 0) {
    console.log(`\n${colors.red}❌ Validação falhou com ${stats.errors} erro(s)${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ Todos os arquivos estão válidos!${colors.reset}\n`);
    process.exit(0);
  }
}

// Executar
main();
