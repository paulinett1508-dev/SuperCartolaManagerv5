/**
 * Testes para ide-detector.js
 *
 * Setup: Mock de filesystem e variáveis env para simular diferentes ambientes
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar módulo a testar
import {
  detectIDE,
  getDetectionScores,
  detectVSCode,
  detectCursor,
  detectWindsurf,
  detectAntigravity
} from '../ide-detector.js';

// ============================================================================
// SETUP DE TESTES
// ============================================================================

const TEST_ROOT = path.join(__dirname, '__test_ide_detection__');
const ALL_IDE_ENV_KEYS = [
  'VSCODE_IPC_HOOK', 'VSCODE_PID', 'VSCODE_CWD',
  'CURSOR_USER_DATA', 'CURSOR_CWD',
  'WINDSURF_SESSION', 'WINDSURF_MODE',
  'CODEIUM_API_KEY', 'CODEIUM_SESSION',
  'ANTIGRAVITY_MODE', 'ANTIGRAVITY_SESSION',
  'AG_SESSION', 'AG_MODE',
  'TERM_PROGRAM'
];

let savedEnv = {};

function setupTestEnvironment(config = {}) {
  // Salvar estado original das variáveis env
  savedEnv = {};
  ALL_IDE_ENV_KEYS.forEach(key => {
    if (process.env[key]) {
      savedEnv[key] = process.env[key];
    }
  });

  // Limpar TODAS as variáveis de IDE antes de começar
  ALL_IDE_ENV_KEYS.forEach(key => {
    delete process.env[key];
  });

  // Criar diretório de teste
  if (!fs.existsSync(TEST_ROOT)) {
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  }

  // Criar estrutura de diretórios/arquivos
  if (config.directories) {
    config.directories.forEach(dir => {
      const fullPath = path.join(TEST_ROOT, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  if (config.files) {
    config.files.forEach(file => {
      const fullPath = path.join(TEST_ROOT, file);
      fs.writeFileSync(fullPath, '');
    });
  }

  // Configurar variáveis de ambiente do teste
  if (config.env) {
    Object.keys(config.env).forEach(key => {
      process.env[key] = config.env[key];
    });
  }
}

function cleanupTestEnvironment(envKeys = []) {
  // Remover diretório de teste
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }

  // Limpar variáveis de ambiente do teste
  ALL_IDE_ENV_KEYS.forEach(key => {
    delete process.env[key];
  });

  // Restaurar variáveis env originais
  Object.keys(savedEnv).forEach(key => {
    process.env[key] = savedEnv[key];
  });
  savedEnv = {};
}

// ============================================================================
// TESTES: detectVSCode
// ============================================================================

describe('detectVSCode', () => {
  afterEach(() => {
    cleanupTestEnvironment(['VSCODE_IPC_HOOK', 'TERM_PROGRAM']);
  });

  it('deve detectar VS Code por variável env VSCODE_*', () => {
    setupTestEnvironment({ env: { VSCODE_IPC_HOOK: '/tmp/vscode.sock' } });
    const score = detectVSCode(TEST_ROOT);
    assert.ok(score >= 50, `Score esperado >= 50, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar VS Code por TERM_PROGRAM=vscode', () => {
    setupTestEnvironment({ env: { TERM_PROGRAM: 'vscode' } });
    const score = detectVSCode(TEST_ROOT);
    assert.ok(score >= 40, `Score esperado >= 40, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar VS Code por diretório .vscode', () => {
    setupTestEnvironment({ directories: ['.vscode'] });
    const score = detectVSCode(TEST_ROOT);
    assert.ok(score >= 20, `Score esperado >= 20, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve retornar score baixo sem indicadores', () => {
    setupTestEnvironment({});
    const score = detectVSCode(TEST_ROOT);
    assert.strictEqual(score, 0);
    cleanupTestEnvironment();
  });
});

// ============================================================================
// TESTES: detectCursor
// ============================================================================

describe('detectCursor', () => {
  afterEach(() => {
    cleanupTestEnvironment(['CURSOR_USER_DATA', 'TERM_PROGRAM']);
  });

  it('deve detectar Cursor por variável env CURSOR_*', () => {
    setupTestEnvironment({ env: { CURSOR_USER_DATA: '/home/user/.cursor' } });
    const score = detectCursor(TEST_ROOT);
    assert.ok(score >= 50, `Score esperado >= 50, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar Cursor por TERM_PROGRAM=Cursor', () => {
    setupTestEnvironment({ env: { TERM_PROGRAM: 'Cursor' } });
    const score = detectCursor(TEST_ROOT);
    assert.ok(score >= 40, `Score esperado >= 40, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar Cursor por arquivo .cursorrules', () => {
    setupTestEnvironment({ files: ['.cursorrules'] });
    const score = detectCursor(TEST_ROOT);
    assert.ok(score >= 30, `Score esperado >= 30, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve retornar score baixo sem indicadores', () => {
    setupTestEnvironment({});
    const score = detectCursor(TEST_ROOT);
    assert.strictEqual(score, 0);
    cleanupTestEnvironment();
  });
});

// ============================================================================
// TESTES: detectWindsurf
// ============================================================================

describe('detectWindsurf', () => {
  afterEach(() => {
    cleanupTestEnvironment(['WINDSURF_SESSION', 'CODEIUM_API_KEY']);
  });

  it('deve detectar Windsurf por variável env WINDSURF_*', () => {
    setupTestEnvironment({ env: { WINDSURF_SESSION: 'abc123' } });
    const score = detectWindsurf(TEST_ROOT);
    assert.ok(score >= 50, `Score esperado >= 50, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar Windsurf por variável env CODEIUM_*', () => {
    setupTestEnvironment({ env: { CODEIUM_API_KEY: 'xyz789' } });
    const score = detectWindsurf(TEST_ROOT);
    assert.ok(score >= 40, `Score esperado >= 40, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve retornar score baixo sem indicadores', () => {
    setupTestEnvironment({});
    const score = detectWindsurf(TEST_ROOT);
    assert.strictEqual(score, 0);
    cleanupTestEnvironment();
  });
});

// ============================================================================
// TESTES: detectAntigravity
// ============================================================================

describe('detectAntigravity', () => {
  afterEach(() => {
    cleanupTestEnvironment(['ANTIGRAVITY_MODE', 'AG_SESSION']);
  });

  it('deve detectar Antigravity por variável env ANTIGRAVITY_*', () => {
    setupTestEnvironment({ env: { ANTIGRAVITY_MODE: 'active' } });
    const score = detectAntigravity(TEST_ROOT);
    assert.ok(score >= 50, `Score esperado >= 50, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar Antigravity por variável env AG_*', () => {
    setupTestEnvironment({ env: { AG_SESSION: 'session123' } });
    const score = detectAntigravity(TEST_ROOT);
    assert.ok(score >= 30, `Score esperado >= 30, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar Antigravity por diretório .agent', () => {
    setupTestEnvironment({ directories: ['.agent'] });
    const score = detectAntigravity(TEST_ROOT);
    assert.ok(score >= 40, `Score esperado >= 40, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve detectar Antigravity por agent.config.json', () => {
    setupTestEnvironment({ files: ['agent.config.json'] });
    const score = detectAntigravity(TEST_ROOT);
    assert.ok(score >= 30, `Score esperado >= 30, recebido: ${score}`);
    cleanupTestEnvironment();
  });

  it('deve retornar score baixo sem indicadores', () => {
    setupTestEnvironment({});
    const score = detectAntigravity(TEST_ROOT);
    assert.strictEqual(score, 0);
    cleanupTestEnvironment();
  });
});

// ============================================================================
// TESTES: detectIDE (função principal)
// ============================================================================

describe('detectIDE', () => {
  afterEach(() => {
    cleanupTestEnvironment([
      'VSCODE_IPC_HOOK',
      'CURSOR_USER_DATA',
      'WINDSURF_SESSION',
      'ANTIGRAVITY_MODE',
      'TERM_PROGRAM'
    ]);
  });

  it('deve detectar vscode quando score é maior', () => {
    setupTestEnvironment({
      env: { VSCODE_IPC_HOOK: '/tmp/vscode.sock', TERM_PROGRAM: 'vscode' },
      directories: ['.vscode', '.claude']
    });
    const ide = detectIDE(TEST_ROOT);
    assert.strictEqual(ide, 'vscode');
    cleanupTestEnvironment();
  });

  it('deve detectar cursor quando score é maior', () => {
    setupTestEnvironment({
      env: { CURSOR_USER_DATA: '/home/user/.cursor', TERM_PROGRAM: 'Cursor' },
      files: ['.cursorrules']
    });
    const ide = detectIDE(TEST_ROOT);
    assert.strictEqual(ide, 'cursor');
    cleanupTestEnvironment();
  });

  it('deve detectar windsurf quando score é maior', () => {
    setupTestEnvironment({
      env: { WINDSURF_SESSION: 'abc123', CODEIUM_API_KEY: 'xyz789' }
    });
    const ide = detectIDE(TEST_ROOT);
    assert.strictEqual(ide, 'windsurf');
    cleanupTestEnvironment();
  });

  it('deve detectar antigravity quando score é maior', () => {
    setupTestEnvironment({
      env: { ANTIGRAVITY_MODE: 'active', AG_SESSION: 'session123' },
      directories: ['.agent']
    });
    const ide = detectIDE(TEST_ROOT);
    assert.strictEqual(ide, 'antigravity');
    cleanupTestEnvironment();
  });

  it('deve retornar unknown quando nenhum score atinge threshold', () => {
    setupTestEnvironment({}); // Sem indicadores
    const ide = detectIDE(TEST_ROOT);
    assert.strictEqual(ide, 'unknown');
    cleanupTestEnvironment();
  });

  it('deve priorizar IDE com maior score em caso de empate', () => {
    // Criar cenário onde múltiplos IDEs têm scores próximos
    setupTestEnvironment({
      env: { CURSOR_USER_DATA: '/home/user/.cursor' },
      directories: ['.agent'], // Score 40 para Antigravity
      files: ['.cursorrules'] // Score adicional para Cursor
    });

    const scores = getDetectionScores(TEST_ROOT);
    const ide = detectIDE(TEST_ROOT);

    // O IDE com maior score deve vencer
    const maxScore = Math.max(...Object.values(scores));
    const expectedIDE = Object.keys(scores).find(key => scores[key] === maxScore);

    assert.strictEqual(ide, expectedIDE);
    cleanupTestEnvironment();
  });
});

// ============================================================================
// TESTES: getDetectionScores
// ============================================================================

describe('getDetectionScores', () => {
  afterEach(() => {
    cleanupTestEnvironment(['VSCODE_IPC_HOOK']);
  });

  it('deve retornar scores de todos os detectores', () => {
    setupTestEnvironment({ env: { VSCODE_IPC_HOOK: '/tmp/vscode.sock' } });
    const scores = getDetectionScores(TEST_ROOT);

    assert.ok(typeof scores === 'object');
    assert.ok('vscode' in scores);
    assert.ok('cursor' in scores);
    assert.ok('windsurf' in scores);
    assert.ok('antigravity' in scores);

    cleanupTestEnvironment();
  });

  it('deve retornar scores numéricos válidos', () => {
    setupTestEnvironment({});
    const scores = getDetectionScores(TEST_ROOT);

    Object.values(scores).forEach(score => {
      assert.ok(typeof score === 'number');
      assert.ok(score >= 0 && score <= 100);
    });

    cleanupTestEnvironment();
  });
});

console.log('✅ Todos os testes de ide-detector.js prontos para execução');
