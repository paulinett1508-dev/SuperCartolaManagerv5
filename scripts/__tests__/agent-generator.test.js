/**
 * Testes para agent-generator.js
 *
 * Setup: Mock de skills e verificação de estrutura .agent/ gerada
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
  generateAgentStructure,
  cleanAgentStructure
} from '../lib/agent-generator.js';

// ============================================================================
// SETUP DE TESTES
// ============================================================================

const TEST_ROOT = path.join(__dirname, '__test_agent_generator__');

/**
 * Skills de exemplo para testes (formato esperado do skill-reader)
 */
const MOCK_SKILLS = [
  // Core Workflow
  {
    metadata: {
      name: 'Workflow',
      description: 'Orquestrador principal',
      category: 'core-workflow'
    },
    content: '# Workflow\n\nConteúdo do workflow.',
    filePath: '/docs/skills/01-core-workflow/workflow.md',
    fileName: 'workflow',
    category: 'core-workflow'
  },
  {
    metadata: {
      name: 'Pesquisa',
      description: 'Fase 1 - Research',
      allowedTools: ['Read', 'Grep', 'WebFetch'],
      category: 'core-workflow'
    },
    content: '# Pesquisa\n\nConteúdo da pesquisa.',
    filePath: '/docs/skills/01-core-workflow/pesquisa.md',
    fileName: 'pesquisa',
    category: 'core-workflow'
  },

  // Specialists
  {
    metadata: {
      name: 'Frontend Crafter',
      description: 'Especialista em UI/UX',
      category: 'specialists'
    },
    content: '# Frontend Crafter\n\nConteúdo do frontend crafter.',
    filePath: '/docs/skills/02-specialists/frontend-crafter.md',
    fileName: 'frontend-crafter',
    category: 'specialists'
  },
  {
    metadata: {
      name: 'League Architect',
      description: 'Especialista em regras de negócio',
      allowedTools: ['Read', 'Edit'],
      category: 'specialists'
    },
    content: '# League Architect\n\nConteúdo do league architect.',
    filePath: '/docs/skills/02-specialists/league-architect.md',
    fileName: 'league-architect',
    category: 'specialists'
  },

  // Utilities
  {
    metadata: {
      name: 'Git Commit Push',
      description: 'Versionamento',
      category: 'utilities'
    },
    content: '# Git Commit Push\n\nConteúdo do git commit push.',
    filePath: '/docs/skills/03-utilities/git-commit-push.md',
    fileName: 'git-commit-push',
    category: 'utilities'
  },

  // Project-specific
  {
    metadata: {
      name: 'Cache Auditor',
      description: 'Auditoria de cache',
      category: 'project-specific'
    },
    content: '# Cache Auditor\n\nConteúdo do cache auditor.',
    filePath: '/docs/skills/04-project-specific/cache-auditor.md',
    fileName: 'cache-auditor',
    category: 'project-specific'
  },

  // Meta
  {
    metadata: {
      name: 'Skill Creator',
      description: 'Criador de skills',
      category: 'meta'
    },
    content: '# Skill Creator\n\nConteúdo do skill creator.',
    filePath: '/docs/skills/05-meta/skill-creator.md',
    fileName: 'skill-creator',
    category: 'meta'
  }
];

function setupTestEnvironment() {
  if (!fs.existsSync(TEST_ROOT)) {
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  }
}

function cleanupTestEnvironment() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

// ============================================================================
// TESTES: generateAgentStructure
// ============================================================================

describe('generateAgentStructure', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('deve criar estrutura .agent/ completa', () => {
    const stats = generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    // Verificar diretórios criados
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'workflows')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'agents')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'skills')));

    // Verificar estatísticas
    assert.strictEqual(stats.workflows, 2);  // workflow, pesquisa
    assert.strictEqual(stats.agents, 2);     // frontend-crafter, league-architect
    assert.strictEqual(stats.skills, 3);     // git-commit-push, cache-auditor, skill-creator
    assert.strictEqual(stats.errors, 0);
  });

  it('deve criar README.md em cada subdiretório', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    const workflowReadme = path.join(TEST_ROOT, '.agent', 'workflows', 'README.md');
    const agentsReadme = path.join(TEST_ROOT, '.agent', 'agents', 'README.md');
    const skillsReadme = path.join(TEST_ROOT, '.agent', 'skills', 'README.md');

    assert.ok(fs.existsSync(workflowReadme));
    assert.ok(fs.existsSync(agentsReadme));
    assert.ok(fs.existsSync(skillsReadme));

    // Verificar conteúdo dos READMEs
    const workflowContent = fs.readFileSync(workflowReadme, 'utf-8');
    assert.ok(workflowContent.includes('# Workflows'));
    assert.ok(workflowContent.includes('High Senior Protocol'));

    const agentsContent = fs.readFileSync(agentsReadme, 'utf-8');
    assert.ok(agentsContent.includes('# Agents'));
    assert.ok(agentsContent.includes('frontend-crafter'));

    const skillsContent = fs.readFileSync(skillsReadme, 'utf-8');
    assert.ok(skillsContent.includes('# Skills'));
    assert.ok(skillsContent.includes('git-commit-push'));
  });

  it('deve copiar skills para diretórios corretos', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    // Workflows
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'workflows', 'workflow.md')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'workflows', 'pesquisa.md')));

    // Agents
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'agents', 'frontend-crafter.md')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'agents', 'league-architect.md')));

    // Skills
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'skills', 'git-commit-push.md')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'skills', 'cache-auditor.md')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'skills', 'skill-creator.md')));
  });

  it('deve preservar frontmatter e conteúdo', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    const workflowPath = path.join(TEST_ROOT, '.agent', 'workflows', 'workflow.md');
    const content = fs.readFileSync(workflowPath, 'utf-8');

    // Verificar estrutura do arquivo
    assert.ok(content.startsWith('---\n'));
    assert.ok(content.includes('name: Workflow'));
    assert.ok(content.includes('description: Orquestrador principal'));
    assert.ok(content.includes('category: core-workflow'));
    assert.ok(content.includes('# Workflow'));
    assert.ok(content.includes('Conteúdo do workflow'));
  });

  it('deve incluir allowed-tools quando presente', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    const pesquisaPath = path.join(TEST_ROOT, '.agent', 'workflows', 'pesquisa.md');
    const content = fs.readFileSync(pesquisaPath, 'utf-8');

    assert.ok(content.includes('allowed-tools: Read, Grep, WebFetch'));
  });

  it('deve mapear utilities para skills/', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    const gitPath = path.join(TEST_ROOT, '.agent', 'skills', 'git-commit-push.md');
    assert.ok(fs.existsSync(gitPath));

    const content = fs.readFileSync(gitPath, 'utf-8');
    assert.ok(content.includes('name: Git Commit Push'));
    assert.ok(content.includes('category: utilities'));
  });

  it('deve mapear project-specific para skills/', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    const cachePath = path.join(TEST_ROOT, '.agent', 'skills', 'cache-auditor.md');
    assert.ok(fs.existsSync(cachePath));

    const content = fs.readFileSync(cachePath, 'utf-8');
    assert.ok(content.includes('name: Cache Auditor'));
    assert.ok(content.includes('category: project-specific'));
  });

  it('deve mapear meta para skills/', () => {
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    const creatorPath = path.join(TEST_ROOT, '.agent', 'skills', 'skill-creator.md');
    assert.ok(fs.existsSync(creatorPath));

    const content = fs.readFileSync(creatorPath, 'utf-8');
    assert.ok(content.includes('name: Skill Creator'));
    assert.ok(content.includes('category: meta'));
  });

  it('deve lidar com skills de categoria desconhecida', () => {
    const unknownSkills = [
      {
        metadata: {
          name: 'Unknown Skill',
          description: 'Categoria desconhecida',
          category: 'categoria-inexistente'
        },
        content: 'Conteúdo.',
        filePath: '/test.md',
        fileName: 'test',
        category: 'categoria-inexistente'
      }
    ];

    const stats = generateAgentStructure(unknownSkills, TEST_ROOT);

    // Deve marcar como erro
    assert.strictEqual(stats.errors, 1);
    assert.strictEqual(stats.workflows, 0);
    assert.strictEqual(stats.agents, 0);
    assert.strictEqual(stats.skills, 0);
  });

  it('deve retornar estatísticas corretas', () => {
    const stats = generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    assert.ok(stats.workflows >= 0);
    assert.ok(stats.agents >= 0);
    assert.ok(stats.skills >= 0);
    assert.ok(stats.errors >= 0);

    // Total deve ser 7 (número de MOCK_SKILLS)
    const total = stats.workflows + stats.agents + stats.skills + stats.errors;
    assert.strictEqual(total, MOCK_SKILLS.length);
  });

  it('deve funcionar com array vazio', () => {
    const stats = generateAgentStructure([], TEST_ROOT);

    // Estrutura deve ser criada mesmo sem skills
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent')));
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent', 'workflows')));

    // Estatísticas devem ser todas 0
    assert.strictEqual(stats.workflows, 0);
    assert.strictEqual(stats.agents, 0);
    assert.strictEqual(stats.skills, 0);
    assert.strictEqual(stats.errors, 0);
  });
});

// ============================================================================
// TESTES: cleanAgentStructure
// ============================================================================

describe('cleanAgentStructure', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('deve remover estrutura .agent/ existente', () => {
    // Criar estrutura
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);
    assert.ok(fs.existsSync(path.join(TEST_ROOT, '.agent')));

    // Limpar
    cleanAgentStructure(TEST_ROOT);
    assert.ok(!fs.existsSync(path.join(TEST_ROOT, '.agent')));
  });

  it('deve lidar com .agent/ inexistente sem erro', () => {
    // Não deve lançar erro mesmo sem .agent/
    assert.doesNotThrow(() => {
      cleanAgentStructure(TEST_ROOT);
    });
  });

  it('deve remover toda a árvore recursivamente', () => {
    // Criar estrutura
    generateAgentStructure(MOCK_SKILLS, TEST_ROOT);

    // Adicionar arquivo extra
    const extraFile = path.join(TEST_ROOT, '.agent', 'workflows', 'extra.txt');
    fs.writeFileSync(extraFile, 'extra content', 'utf-8');

    // Limpar
    cleanAgentStructure(TEST_ROOT);

    // Tudo deve ter sido removido
    assert.ok(!fs.existsSync(path.join(TEST_ROOT, '.agent')));
  });
});

console.log('✅ Todos os testes de agent-generator.js prontos para execução');
