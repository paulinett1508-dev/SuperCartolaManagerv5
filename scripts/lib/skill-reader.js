/**
 * Skill Reader - Sistema Híbrido de Skills
 *
 * Parser de skills em Markdown com YAML frontmatter.
 * Lê skills de docs/skills/ e retorna objetos normalizados.
 *
 * @module skill-reader
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {Object} SkillMetadata
 * @property {string} name - Nome da skill
 * @property {string} description - Descrição da skill
 * @property {string[]} [allowedTools] - Ferramentas permitidas (opcional)
 * @property {string} [category] - Categoria da skill
 */

/**
 * @typedef {Object} ParsedSkill
 * @property {SkillMetadata} metadata - Metadados da skill
 * @property {string} content - Conteúdo Markdown (sem frontmatter)
 * @property {string} filePath - Caminho absoluto do arquivo
 * @property {string} fileName - Nome do arquivo sem extensão
 * @property {string} category - Categoria inferida do path
 */

/**
 * Extrai categoria do caminho do arquivo
 * Ex: docs/skills/01-core-workflow/pesquisa.md → core-workflow
 * Ex: test/01-core-workflow/test.md → core-workflow
 *
 * @param {string} filePath - Caminho do arquivo
 * @returns {string} Categoria
 */
function extractCategoryFromPath(filePath) {
  // Primeiro tenta: padrão skills/XX-categoria/
  let match = filePath.match(/skills\/(\d+-)?([^/]+)\//);
  if (match) {
    return match[2]; // Retorna nome sem prefixo numérico
  }

  // Fallback: qualquer diretório com padrão XX-nome/
  match = filePath.match(/\/(\d+-)([^/]+)\/[^/]+\.md$/);
  if (match) {
    return match[2]; // Retorna nome sem prefixo numérico
  }

  return 'unknown';
}

/**
 * Parseia YAML frontmatter de uma string Markdown
 * Formato esperado:
 * ---
 * name: Nome
 * description: Descrição
 * allowed-tools: Tool1, Tool2
 * ---
 *
 * @param {string} content - Conteúdo completo do arquivo
 * @returns {{metadata: Object, content: string}} Metadados e conteúdo sem frontmatter
 * @throws {Error} Se frontmatter inválido ou campos obrigatórios ausentes
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Frontmatter YAML não encontrado (formato: ---\\n...\\n---)');
  }

  const [, yamlContent, markdownContent] = match;
  const metadata = {};

  // Parsear YAML manualmente (simples, sem dependências externas)
  const lines = yamlContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    // Converter allowed-tools para array
    if (key === 'allowed-tools') {
      metadata.allowedTools = value.split(',').map(t => t.trim()).filter(Boolean);
    } else {
      metadata[key] = value;
    }
  }

  // Validar campos obrigatórios
  if (!metadata.name) {
    throw new Error('Campo obrigatório "name" ausente no frontmatter');
  }
  if (!metadata.description) {
    throw new Error('Campo obrigatório "description" ausente no frontmatter');
  }

  return {
    metadata,
    content: markdownContent.trim()
  };
}

/**
 * Lê e parseia um arquivo de skill
 *
 * @param {string} filePath - Caminho absoluto para o arquivo .md
 * @returns {ParsedSkill} Skill parseada
 * @throws {Error} Se arquivo não existir ou parsing falhar
 */
export function readSkillFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { metadata, content } = parseFrontmatter(fileContent);

  // Detectar categoria pelo path
  const category = extractCategoryFromPath(filePath);

  // Nome do arquivo sem extensão
  const fileName = path.basename(filePath, '.md');

  return {
    metadata: {
      ...metadata,
      category
    },
    content,
    filePath,
    fileName,
    category
  };
}

/**
 * Parseia conteúdo Markdown de uma skill (útil para testes)
 *
 * @param {string} markdownContent - Conteúdo completo do Markdown
 * @param {string} filePath - Path do arquivo (para contexto)
 * @returns {ParsedSkill} Skill parseada
 */
export function parseSkill(markdownContent, filePath = 'unknown.md') {
  const { metadata, content } = parseFrontmatter(markdownContent);
  const category = extractCategoryFromPath(filePath);
  const fileName = path.basename(filePath, '.md');

  return {
    metadata: {
      ...metadata,
      category
    },
    content,
    filePath,
    fileName,
    category
  };
}

/**
 * Lê todos os arquivos .md de um diretório recursivamente
 *
 * @param {string} dir - Diretório raiz
 * @param {string[]} [fileList=[]] - Lista acumulada (uso interno)
 * @returns {string[]} Lista de caminhos absolutos para arquivos .md
 */
export function findAllMarkdownFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Diretório não encontrado: ${dir}`);
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursivo em subdiretórios
      findAllMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md') && file !== 'README.md') {
      // Adiciona .md (exceto README)
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Lê todas as skills de um diretório
 *
 * @param {string} skillsDir - Diretório de skills (ex: docs/skills/)
 * @returns {ParsedSkill[]} Array de skills parseadas
 */
export function readAllSkills(skillsDir) {
  const markdownFiles = findAllMarkdownFiles(skillsDir);
  const skills = [];
  const errors = [];

  for (const filePath of markdownFiles) {
    try {
      const skill = readSkillFile(filePath);
      skills.push(skill);
    } catch (error) {
      errors.push({
        file: filePath,
        error: error.message
      });
    }
  }

  // Log de erros (não interrompe processo)
  if (errors.length > 0) {
    console.warn(`⚠️  [SKILL-READER] ${errors.length} arquivo(s) com erro:`);
    errors.forEach(({ file, error }) => {
      console.warn(`   - ${path.basename(file)}: ${error}`);
    });
  }

  return skills;
}

/**
 * Agrupa skills por categoria
 *
 * @param {ParsedSkill[]} skills - Array de skills
 * @returns {Object} Objeto com skills agrupadas por categoria
 */
export function groupSkillsByCategory(skills) {
  const grouped = {};

  for (const skill of skills) {
    const cat = skill.category;
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(skill);
  }

  return grouped;
}

/**
 * Filtra skills por categoria
 *
 * @param {ParsedSkill[]} skills - Array de skills
 * @param {string} category - Categoria desejada
 * @returns {ParsedSkill[]} Skills filtradas
 */
export function filterSkillsByCategory(skills, category) {
  return skills.filter(s => s.category === category);
}
