/**
 * Agent Generator - Sistema Híbrido de Skills
 *
 * Gera estrutura .agent/ compatível com Antigravity a partir de docs/skills/.
 * Mapeia categorias de skills para diretórios específicos do Antigravity.
 *
 * @module agent-generator
 */

import fs from 'fs';
import path from 'path';

/**
 * Mapeamento de categorias docs/skills/ → .agent/
 *
 * Antigravity usa estrutura específica:
 * - workflows/ → Processos core (workflow, pesquisa, spec, code)
 * - agents/ → Especialistas (frontend-crafter, league-architect, etc.)
 * - skills/ → Utilitários e project-specific
 */
const CATEGORY_MAPPING = {
  'core-workflow': 'workflows',
  'specialists': 'agents',
  'utilities': 'skills',
  'project-specific': 'skills',
  'meta': 'skills'
};

/**
 * README.md templates por diretório
 */
const README_TEMPLATES = {
  workflows: `# Workflows

Core workflows do High Senior Protocol.

Processos estruturados para desenvolvimento de features:
- **workflow**: Orquestrador principal (decide qual fase executar)
- **pesquisa**: FASE 1 - Levantamento e geração de PRD
- **spec**: FASE 2 - Especificação técnica cirúrgica
- **code**: FASE 3 - Implementação de mudanças

---

Gerado automaticamente a partir de \`docs/skills/01-core-workflow/\`
`,

  agents: `# Agents (Specialists)

Agentes especializados em domínios técnicos específicos.

Cada agent é expert em sua área:
- **frontend-crafter**: UI/UX, CSS, componentes visuais
- **league-architect**: Regras de negócio, cálculos financeiros
- **db-guardian**: MongoDB, migrations, scripts de banco
- **code-inspector**: Code review, segurança, OWASP
- **system-scribe**: Documentação, explicações de sistemas

---

Gerado automaticamente a partir de \`docs/skills/02-specialists/\`
`,

  skills: `# Skills (Utilities)

Skills utilitárias e específicas do projeto.

Ferramentas auxiliares para operações comuns:
- **git-commit-push**: Versionamento
- **restart-server**: Gerenciamento de servidor
- **replit-pull**: Deploy para produção
- **newsession**: Handover de contexto
- **cache-auditor**: Auditoria de cache
- **auditor-module**: Auditoria de módulos
- E outras...

---

Gerado automaticamente a partir de:
- \`docs/skills/03-utilities/\`
- \`docs/skills/04-project-specific/\`
- \`docs/skills/05-meta/\`
`
};

/**
 * Cria estrutura de diretórios .agent/
 *
 * @param {string} outputDir - Diretório raiz para .agent/
 * @returns {Object} Objeto com paths criados
 */
function createAgentStructure(outputDir) {
  const agentDir = path.join(outputDir, '.agent');

  // Criar diretórios principais
  const dirs = {
    root: agentDir,
    workflows: path.join(agentDir, 'workflows'),
    agents: path.join(agentDir, 'agents'),
    skills: path.join(agentDir, 'skills')
  };

  Object.values(dirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return dirs;
}

/**
 * Cria README.md em cada subdiretório
 *
 * @param {Object} dirs - Objeto com paths dos diretórios
 */
function createReadmeFiles(dirs) {
  // README.md em workflows/
  fs.writeFileSync(
    path.join(dirs.workflows, 'README.md'),
    README_TEMPLATES.workflows,
    'utf-8'
  );

  // README.md em agents/
  fs.writeFileSync(
    path.join(dirs.agents, 'README.md'),
    README_TEMPLATES.agents,
    'utf-8'
  );

  // README.md em skills/
  fs.writeFileSync(
    path.join(dirs.skills, 'README.md'),
    README_TEMPLATES.skills,
    'utf-8'
  );
}

/**
 * Copia skill para diretório de destino apropriado
 *
 * @param {Object} skill - Skill parseada (do skill-reader)
 * @param {Object} dirs - Objeto com paths dos diretórios
 * @returns {string|null} Path do arquivo criado ou null se erro
 */
function copySkillToAgentDir(skill, dirs) {
  const category = skill.category;
  const targetDir = CATEGORY_MAPPING[category];

  if (!targetDir) {
    console.warn(`⚠️  Categoria desconhecida: ${category} (skill: ${skill.fileName})`);
    return null;
  }

  // Path de destino
  const destPath = path.join(dirs[targetDir], `${skill.fileName}.md`);

  try {
    // Reconstrói arquivo completo (frontmatter + content)
    const frontmatter = buildFrontmatter(skill.metadata);
    const fullContent = `---\n${frontmatter}---\n\n${skill.content}`;

    fs.writeFileSync(destPath, fullContent, 'utf-8');
    return destPath;
  } catch (error) {
    console.error(`❌ Erro ao copiar ${skill.fileName}: ${error.message}`);
    return null;
  }
}

/**
 * Reconstrói YAML frontmatter a partir de metadata
 *
 * @param {Object} metadata - Metadados da skill
 * @returns {string} Frontmatter YAML
 */
function buildFrontmatter(metadata) {
  let yaml = '';

  // name e description são obrigatórios
  yaml += `name: ${metadata.name}\n`;
  yaml += `description: ${metadata.description}\n`;

  // allowed-tools é opcional
  if (metadata.allowedTools && metadata.allowedTools.length > 0) {
    yaml += `allowed-tools: ${metadata.allowedTools.join(', ')}\n`;
  }

  // category (adicional para rastreabilidade)
  if (metadata.category) {
    yaml += `category: ${metadata.category}\n`;
  }

  return yaml;
}

/**
 * Gera estrutura .agent/ completa a partir de skills parseadas
 *
 * @param {Array} skills - Array de skills parseadas (do readAllSkills)
 * @param {string} outputDir - Diretório raiz onde criar .agent/
 * @returns {Object} Estatísticas da geração
 */
export function generateAgentStructure(skills, outputDir) {
  console.log('\n🤖 [AGENT-GENERATOR] Gerando estrutura .agent/ para Antigravity...\n');

  // 1. Criar estrutura de diretórios
  const dirs = createAgentStructure(outputDir);
  console.log(`✅ Estrutura criada: ${dirs.root}`);

  // 2. Criar READMEs
  createReadmeFiles(dirs);
  console.log('✅ README.md criados em workflows/, agents/, skills/');

  // 3. Copiar skills para diretórios apropriados
  const stats = {
    workflows: 0,
    agents: 0,
    skills: 0,
    errors: 0
  };

  for (const skill of skills) {
    const targetDir = CATEGORY_MAPPING[skill.category];
    if (!targetDir) {
      stats.errors++;
      continue;
    }

    const copied = copySkillToAgentDir(skill, dirs);
    if (copied) {
      stats[targetDir]++;
    } else {
      stats.errors++;
    }
  }

  // 4. Relatório final
  console.log('\n📊 Estatísticas de Geração:\n');
  console.log(`   Workflows:  ${stats.workflows} arquivos`);
  console.log(`   Agents:     ${stats.agents} arquivos`);
  console.log(`   Skills:     ${stats.skills} arquivos`);
  if (stats.errors > 0) {
    console.log(`   ⚠️  Erros:   ${stats.errors} arquivos`);
  }
  console.log(`\n✅ Estrutura .agent/ pronta para Antigravity!\n`);

  return stats;
}

/**
 * Remove estrutura .agent/ inteira (cleanup)
 *
 * @param {string} outputDir - Diretório raiz onde está .agent/
 */
export function cleanAgentStructure(outputDir) {
  const agentDir = path.join(outputDir, '.agent');

  if (fs.existsSync(agentDir)) {
    fs.rmSync(agentDir, { recursive: true, force: true });
    console.log(`🗑️  Estrutura .agent/ removida: ${agentDir}`);
  } else {
    console.log(`ℹ️  .agent/ não existe em ${outputDir}`);
  }
}
