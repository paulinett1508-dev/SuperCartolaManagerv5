#!/usr/bin/env node

/**
 * BACKLOG HELPER - Super Cartola Manager
 * Utilitário CLI para gerenciar TODOs e BACKLOG.md
 * 
 * Uso:
 *   node scripts/backlog-helper.js list          - Lista todos os TODOs do código
 *   node scripts/backlog-helper.js validate      - Valida IDs únicos no BACKLOG.md
 *   node scripts/backlog-helper.js report        - Relatório de itens por prioridade
 *   node scripts/backlog-helper.js search [term] - Busca TODOs por palavra-chave
 */

const fs = require('fs');
const path = require('path');

// Configurações
const ROOT_DIR = path.join(__dirname, '..');
const BACKLOG_PATH = path.join(ROOT_DIR, 'BACKLOG.md');
const TODO_PATTERN = /\/\/\s*TODO-(CRITICAL|HIGH|MEDIUM|LOW|FUTURE):\s*(.+)/g;
const BACKLOG_ID_PATTERN = /\[([A-Z]+-\d+)\]/g;

// Cores para output (ANSI)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Prioridades com cores
const priorityColors = {
  CRITICAL: colors.red,
  HIGH: colors.yellow,
  MEDIUM: colors.blue,
  LOW: colors.green,
  FUTURE: colors.cyan,
};

/**
 * Busca recursivamente por arquivos JavaScript/TypeScript
 */
function findSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Ignorar node_modules, .git, etc
    if (file.startsWith('.') || file === 'node_modules' || file === 'backups') {
      return;
    }

    if (stat.isDirectory()) {
      findSourceFiles(filePath, fileList);
    } else if (/\.(js|ts|jsx|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Extrai todos os TODOs de um arquivo
 */
function extractTodos(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const todos = [];

  lines.forEach((line, index) => {
    const matches = [...line.matchAll(TODO_PATTERN)];
    matches.forEach(match => {
      todos.push({
        file: path.relative(ROOT_DIR, filePath),
        line: index + 1,
        priority: match[1],
        text: match[2].trim(),
      });
    });
  });

  return todos;
}

/**
 * Lista todos os TODOs encontrados no código
 */
function listTodos() {
  console.log(`${colors.bright}${colors.cyan}📋 Buscando TODOs no código...${colors.reset}\n`);

  const sourceFiles = findSourceFiles(ROOT_DIR);
  const allTodos = [];

  sourceFiles.forEach(file => {
    const todos = extractTodos(file);
    allTodos.push(...todos);
  });

  if (allTodos.length === 0) {
    console.log(`${colors.yellow}⚠️  Nenhum TODO encontrado!${colors.reset}`);
    return;
  }

  // Agrupar por prioridade
  const byPriority = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    FUTURE: [],
  };

  allTodos.forEach(todo => {
    byPriority[todo.priority].push(todo);
  });

  // Exibir por prioridade
  Object.keys(byPriority).forEach(priority => {
    const todos = byPriority[priority];
    if (todos.length === 0) return;

    const color = priorityColors[priority];
    console.log(`${color}${colors.bright}${priority} (${todos.length})${colors.reset}`);
    console.log(`${'='.repeat(50)}`);

    todos.forEach(todo => {
      console.log(`${color}├─${colors.reset} ${todo.file}:${todo.line}`);
      console.log(`${color}│  ${colors.reset}${todo.text}`);
      console.log();
    });
  });

  console.log(`${colors.bright}Total: ${allTodos.length} TODOs${colors.reset}\n`);
}

/**
 * Valida IDs únicos no BACKLOG.md
 */
function validateBacklog() {
  console.log(`${colors.bright}${colors.cyan}🔍 Validando BACKLOG.md...${colors.reset}\n`);

  if (!fs.existsSync(BACKLOG_PATH)) {
    console.log(`${colors.red}❌ BACKLOG.md não encontrado!${colors.reset}`);
    return;
  }

  const content = fs.readFileSync(BACKLOG_PATH, 'utf8');
  const ids = [...content.matchAll(BACKLOG_ID_PATTERN)].map(m => m[1]);

  // Verificar duplicatas
  const seen = new Set();
  const duplicates = [];

  ids.forEach(id => {
    if (seen.has(id)) {
      duplicates.push(id);
    }
    seen.add(id);
  });

  if (duplicates.length > 0) {
    console.log(`${colors.red}❌ IDs duplicados encontrados:${colors.reset}`);
    duplicates.forEach(id => console.log(`   - ${id}`));
    console.log();
  } else {
    console.log(`${colors.green}✅ Todos os IDs são únicos!${colors.reset}`);
  }

  console.log(`${colors.bright}Total de IDs: ${ids.length}${colors.reset}\n`);
}

/**
 * Gera relatório por prioridade
 */
function generateReport() {
  console.log(`${colors.bright}${colors.cyan}📊 Relatório de TODOs e BACKLOG${colors.reset}\n`);

  // TODOs no código
  const sourceFiles = findSourceFiles(ROOT_DIR);
  const allTodos = [];
  sourceFiles.forEach(file => {
    allTodos.push(...extractTodos(file));
  });

  const byPriority = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    FUTURE: 0,
  };

  allTodos.forEach(todo => {
    byPriority[todo.priority]++;
  });

  console.log(`${colors.bright}TODOs no Código:${colors.reset}`);
  Object.keys(byPriority).forEach(priority => {
    const count = byPriority[priority];
    const color = priorityColors[priority];
    console.log(`  ${color}${priority.padEnd(10)}${colors.reset} ${count} item(s)`);
  });
  console.log(`  ${colors.bright}TOTAL${colors.reset}      ${allTodos.length} item(s)\n`);

  // Itens no BACKLOG.md
  if (fs.existsSync(BACKLOG_PATH)) {
    const content = fs.readFileSync(BACKLOG_PATH, 'utf8');
    const unchecked = (content.match(/- \[ \]/g) || []).length;
    const checked = (content.match(/- \[x\]/g) || []).length;

    console.log(`${colors.bright}Itens no BACKLOG.md:${colors.reset}`);
    console.log(`  Pendentes:  ${unchecked}`);
    console.log(`  Concluídos: ${checked}`);
    console.log(`  Total:      ${unchecked + checked}\n`);
  }
}

/**
 * Busca TODOs por palavra-chave
 */
function searchTodos(searchTerm) {
  console.log(`${colors.bright}${colors.cyan}🔎 Buscando por: "${searchTerm}"${colors.reset}\n`);

  const sourceFiles = findSourceFiles(ROOT_DIR);
  const allTodos = [];

  sourceFiles.forEach(file => {
    const todos = extractTodos(file);
    allTodos.push(...todos);
  });

  const results = allTodos.filter(todo =>
    todo.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (results.length === 0) {
    console.log(`${colors.yellow}⚠️  Nenhum resultado encontrado!${colors.reset}`);
    return;
  }

  results.forEach(todo => {
    const color = priorityColors[todo.priority];
    console.log(`${color}[${todo.priority}]${colors.reset} ${todo.file}:${todo.line}`);
    console.log(`  ${todo.text}\n`);
  });

  console.log(`${colors.bright}${results.length} resultado(s) encontrado(s)${colors.reset}\n`);
}

/**
 * Exibe ajuda
 */
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}BACKLOG HELPER - Super Cartola Manager${colors.reset}

${colors.bright}Uso:${colors.reset}
  node scripts/backlog-helper.js <comando> [argumentos]

${colors.bright}Comandos:${colors.reset}
  ${colors.green}list${colors.reset}          Lista todos os TODOs do código organizados por prioridade
  ${colors.green}validate${colors.reset}      Valida IDs únicos no BACKLOG.md (detecta duplicatas)
  ${colors.green}report${colors.reset}        Gera relatório resumido de TODOs e BACKLOG
  ${colors.green}search${colors.reset} [term] Busca TODOs por palavra-chave

${colors.bright}Exemplos:${colors.reset}
  node scripts/backlog-helper.js list
  node scripts/backlog-helper.js validate
  node scripts/backlog-helper.js search "rate limit"

${colors.bright}Padrão de TODOs:${colors.reset}
  // TODO-CRITICAL: [Descrição]
  // TODO-HIGH: [Descrição]
  // TODO-MEDIUM: [Descrição]
  // TODO-LOW: [Descrição]
  // TODO-FUTURE: [Descrição]
`);
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'list':
    listTodos();
    break;
  case 'validate':
    validateBacklog();
    break;
  case 'report':
    generateReport();
    break;
  case 'search':
    if (!arg) {
      console.log(`${colors.red}❌ Erro: Termo de busca não fornecido${colors.reset}\n`);
      console.log(`Uso: node scripts/backlog-helper.js search [termo]\n`);
    } else {
      searchTodos(arg);
    }
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (command) {
      console.log(`${colors.red}❌ Comando desconhecido: ${command}${colors.reset}\n`);
    }
    showHelp();
}

