/**
 * Testes para skill-reader.js
 *
 * Setup: Mock de skills em Markdown com YAML frontmatter
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
  parseSkill,
  readSkillFile,
  findAllMarkdownFiles,
  readAllSkills,
  groupSkillsByCategory,
  filterSkillsByCategory
} from '../lib/skill-reader.js';

// ============================================================================
// SETUP DE TESTES
// ============================================================================

const TEST_ROOT = path.join(__dirname, '__test_skill_reader__');

/**
 * Skills de exemplo para testes
 */
const SAMPLE_SKILLS = {
  valid: `---
name: Test Skill
description: Uma skill de teste completa
allowed-tools: Read, Write, Bash
---

# Test Skill

## Descrição
Esta é uma skill de teste.

## Uso
Use esta skill para testes.
`,

  minimal: `---
name: Minimal Skill
description: Skill mínima válida
---

# Minimal Skill

Conteúdo mínimo.
`,

  noFrontmatter: `# Skill Sem Frontmatter

Apenas conteúdo Markdown sem YAML.
`,

  missingName: `---
description: Falta o campo name
---

# Skill Inválida
`,

  missingDescription: `---
name: Invalid Skill
---

# Skill Inválida
`,

  emptyFrontmatter: `---
---

# Skill Vazia
`
};

function setupTestEnvironment() {
  // Criar diretório de teste
  if (!fs.existsSync(TEST_ROOT)) {
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  }

  // Criar estrutura de diretórios
  const dirs = [
    '01-core-workflow',
    '02-specialists',
    '03-utilities'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(TEST_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

function cleanupTestEnvironment() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

function createTestSkill(category, fileName, content) {
  const filePath = path.join(TEST_ROOT, category, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ============================================================================
// TESTES: parseSkill
// ============================================================================

describe('parseSkill', () => {
  it('deve parsear skill válida completa', () => {
    const skill = parseSkill(SAMPLE_SKILLS.valid, 'docs/skills/01-core-workflow/test.md');

    assert.strictEqual(skill.metadata.name, 'Test Skill');
    assert.strictEqual(skill.metadata.description, 'Uma skill de teste completa');
    assert.deepStrictEqual(skill.metadata.allowedTools, ['Read', 'Write', 'Bash']);
    assert.strictEqual(skill.category, 'core-workflow');
    assert.ok(skill.content.includes('# Test Skill'));
  });

  it('deve parsear skill mínima válida', () => {
    const skill = parseSkill(SAMPLE_SKILLS.minimal, 'docs/skills/02-specialists/minimal.md');

    assert.strictEqual(skill.metadata.name, 'Minimal Skill');
    assert.strictEqual(skill.metadata.description, 'Skill mínima válida');
    assert.strictEqual(skill.category, 'specialists');
    assert.ok(skill.content.includes('Conteúdo mínimo'));
  });

  it('deve lançar erro para skill sem frontmatter', () => {
    assert.throws(() => {
      parseSkill(SAMPLE_SKILLS.noFrontmatter, 'test.md');
    }, /Frontmatter YAML não encontrado/);
  });

  it('deve lançar erro para skill sem campo name', () => {
    assert.throws(() => {
      parseSkill(SAMPLE_SKILLS.missingName, 'test.md');
    }, /Campo obrigatório "name" ausente/);
  });

  it('deve lançar erro para skill sem campo description', () => {
    assert.throws(() => {
      parseSkill(SAMPLE_SKILLS.missingDescription, 'test.md');
    }, /Campo obrigatório "description" ausente/);
  });

  it('deve lançar erro para frontmatter vazio', () => {
    assert.throws(() => {
      parseSkill(SAMPLE_SKILLS.emptyFrontmatter, 'test.md');
    }, /(Campo obrigatório|Frontmatter YAML não encontrado)/);
  });
});

// ============================================================================
// TESTES: readSkillFile
// ============================================================================

describe('readSkillFile', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('deve ler arquivo de skill válido', () => {
    const filePath = createTestSkill('01-core-workflow', 'test.md', SAMPLE_SKILLS.valid);
    const skill = readSkillFile(filePath);

    assert.strictEqual(skill.metadata.name, 'Test Skill');
    assert.strictEqual(skill.category, 'core-workflow');
    assert.strictEqual(skill.fileName, 'test');
    assert.strictEqual(skill.filePath, filePath);
  });

  it('deve lançar erro para arquivo inexistente', () => {
    assert.throws(() => {
      readSkillFile('/path/inexistente.md');
    }, /Arquivo não encontrado/);
  });

  it('deve lançar erro para arquivo inválido', () => {
    const filePath = createTestSkill('01-core-workflow', 'invalid.md', SAMPLE_SKILLS.noFrontmatter);

    assert.throws(() => {
      readSkillFile(filePath);
    }, /Frontmatter YAML não encontrado/);
  });
});

// ============================================================================
// TESTES: findAllMarkdownFiles
// ============================================================================

describe('findAllMarkdownFiles', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('deve encontrar todos os arquivos .md recursivamente', () => {
    createTestSkill('01-core-workflow', 'skill1.md', SAMPLE_SKILLS.valid);
    createTestSkill('01-core-workflow', 'skill2.md', SAMPLE_SKILLS.minimal);
    createTestSkill('02-specialists', 'skill3.md', SAMPLE_SKILLS.valid);

    const files = findAllMarkdownFiles(TEST_ROOT);

    assert.strictEqual(files.length, 3);
    assert.ok(files.every(f => f.endsWith('.md')));
  });

  it('deve ignorar README.md', () => {
    createTestSkill('01-core-workflow', 'skill1.md', SAMPLE_SKILLS.valid);
    createTestSkill('01-core-workflow', 'README.md', '# README');

    const files = findAllMarkdownFiles(TEST_ROOT);

    assert.strictEqual(files.length, 1);
    assert.ok(!files.some(f => f.includes('README')));
  });

  it('deve retornar array vazio para diretório vazio', () => {
    const files = findAllMarkdownFiles(TEST_ROOT);
    assert.strictEqual(files.length, 0);
  });

  it('deve lançar erro para diretório inexistente', () => {
    assert.throws(() => {
      findAllMarkdownFiles('/path/inexistente');
    }, /Diretório não encontrado/);
  });
});

// ============================================================================
// TESTES: readAllSkills
// ============================================================================

describe('readAllSkills', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('deve ler todas as skills válidas', () => {
    createTestSkill('01-core-workflow', 'skill1.md', SAMPLE_SKILLS.valid);
    createTestSkill('02-specialists', 'skill2.md', SAMPLE_SKILLS.minimal);

    const skills = readAllSkills(TEST_ROOT);

    assert.strictEqual(skills.length, 2);
    assert.strictEqual(skills[0].metadata.name, 'Test Skill');
    assert.strictEqual(skills[1].metadata.name, 'Minimal Skill');
  });

  it('deve ignorar skills inválidas sem interromper processo', () => {
    createTestSkill('01-core-workflow', 'valid.md', SAMPLE_SKILLS.valid);
    createTestSkill('01-core-workflow', 'invalid.md', SAMPLE_SKILLS.noFrontmatter);
    createTestSkill('02-specialists', 'minimal.md', SAMPLE_SKILLS.minimal);

    const skills = readAllSkills(TEST_ROOT);

    // Deve ler apenas as 2 válidas
    assert.strictEqual(skills.length, 2);
  });

  it('deve retornar array vazio para diretório sem skills', () => {
    const skills = readAllSkills(TEST_ROOT);
    assert.strictEqual(skills.length, 0);
  });

  it('deve detectar categoria corretamente', () => {
    createTestSkill('01-core-workflow', 'skill1.md', SAMPLE_SKILLS.valid);
    createTestSkill('02-specialists', 'skill2.md', SAMPLE_SKILLS.minimal);
    createTestSkill('03-utilities', 'skill3.md', SAMPLE_SKILLS.valid);

    const skills = readAllSkills(TEST_ROOT);

    assert.strictEqual(skills[0].category, 'core-workflow');
    assert.strictEqual(skills[1].category, 'specialists');
    assert.strictEqual(skills[2].category, 'utilities');
  });
});

// ============================================================================
// TESTES: groupSkillsByCategory
// ============================================================================

describe('groupSkillsByCategory', () => {
  it('deve agrupar skills por categoria', () => {
    const skills = [
      { metadata: { name: 'Skill1' }, category: 'core-workflow' },
      { metadata: { name: 'Skill2' }, category: 'core-workflow' },
      { metadata: { name: 'Skill3' }, category: 'specialists' }
    ];

    const grouped = groupSkillsByCategory(skills);

    assert.strictEqual(Object.keys(grouped).length, 2);
    assert.strictEqual(grouped['core-workflow'].length, 2);
    assert.strictEqual(grouped['specialists'].length, 1);
  });

  it('deve retornar objeto vazio para array vazio', () => {
    const grouped = groupSkillsByCategory([]);
    assert.deepStrictEqual(grouped, {});
  });
});

// ============================================================================
// TESTES: filterSkillsByCategory
// ============================================================================

describe('filterSkillsByCategory', () => {
  it('deve filtrar skills por categoria', () => {
    const skills = [
      { metadata: { name: 'Skill1' }, category: 'core-workflow' },
      { metadata: { name: 'Skill2' }, category: 'specialists' },
      { metadata: { name: 'Skill3' }, category: 'core-workflow' }
    ];

    const filtered = filterSkillsByCategory(skills, 'core-workflow');

    assert.strictEqual(filtered.length, 2);
    assert.ok(filtered.every(s => s.category === 'core-workflow'));
  });

  it('deve retornar array vazio se categoria não existe', () => {
    const skills = [
      { metadata: { name: 'Skill1' }, category: 'core-workflow' }
    ];

    const filtered = filterSkillsByCategory(skills, 'inexistente');

    assert.strictEqual(filtered.length, 0);
  });
});

console.log('✅ Todos os testes de skill-reader.js prontos para execução');
