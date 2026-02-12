# 🔀 SISTEMA HÍBRIDO: ARQUITETURA E INTEGRAÇÃO

## 📋 Visão Geral

O **Sistema Híbrido** combina o melhor do sistema de skills atual do Super Cartola Manager com capacidades avançadas do Antigravity Kit, mantendo 100% de compatibilidade operacional e adicionando:

- ✅ Validação automatizada (checklist, schemas, segurança)
- ✅ Testes E2E com Playwright
- ✅ Lighthouse CI para audits PWA
- ✅ Compatibilidade multi-IDE (VS Code, Cursor, Windsurf, Antigravity)
- ✅ Sistema de router IDE-agnostic

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    USER REQUEST                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│              IDE DETECTION LAYER                         │
│  Detecta: VS Code | Cursor | Windsurf | Antigravity     │
│  Script: scripts/ide-detector.js                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│                ROUTING LAYER                             │
│  - VS Code: .claude/hooks/                              │
│  - Cursor/Windsurf: .agent/                             │
│  - Antigravity: .agent/ (compatível)                    │
│  Script: scripts/sync-skills.js                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│              SKILL RESOLUTION                            │
│  Carrega skill de docs/skills/ (source of truth)        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│               EXECUTION ENGINE                           │
│  Executa skill com contexto do IDE                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Detecção de IDE

O sistema detecta automaticamente qual IDE está sendo usado para rotear skills corretamente.

### Método de Detecção

**Sistema de Scoring (0-100):**
- Cada IDE tem múltiplos indicadores (variáveis env, arquivos, diretórios)
- Cada indicador adiciona pontos ao score do IDE
- IDE com maior score vence (threshold mínimo: 30)
- Se nenhum atingir threshold → `unknown`

### Indicadores por IDE

#### VS Code
| Indicador | Tipo | Score | Confiança |
|-----------|------|-------|-----------|
| `VSCODE_*` env vars | Env | +50 | Alta |
| `TERM_PROGRAM=vscode` | Env | +40 | Alta |
| `.vscode/` directory | Filesystem | +20 | Média |
| `.claude/` directory | Filesystem | +15 | Baixa* |

*Baixa porque `.claude/` é compartilhado com Cursor

#### Cursor
| Indicador | Tipo | Score | Confiança |
|-----------|------|-------|-----------|
| `CURSOR_*` env vars | Env | +50 | Alta |
| `TERM_PROGRAM=Cursor` | Env | +40 | Alta |
| `.cursorrules` file | Filesystem | +30 | Alta |
| `.claude/` directory | Filesystem | +10 | Baixa* |

*Compartilhado com VS Code

#### Windsurf
| Indicador | Tipo | Score | Confiança |
|-----------|------|-------|-----------|
| `WINDSURF_*` env vars | Env | +50 | Alta |
| `CODEIUM_*` env vars | Env | +40 | Alta |
| Parent process name | Process | +30 | Média |
| `.windsurf/` directory | Filesystem | +20 | Média |

#### Antigravity
| Indicador | Tipo | Score | Confiança |
|-----------|------|-------|-----------|
| `ANTIGRAVITY_*` env vars | Env | +50 | Alta |
| `AG_*` env vars | Env | +30 | Alta |
| `.agent/` directory | Filesystem | +40 | Alta |
| `agent.config.json` file | Filesystem | +30 | Alta |

### Exemplo de Detecção

```bash
# Executar detecção
node scripts/sync-skills.js

# Output:
# ✅ [HYBRID-SYSTEM] IDE detectado: cursor
# 🔍 [HYBRID-SYSTEM] Scores: {"vscode":35,"cursor":70,"windsurf":0,"antigravity":0}
```

**Interpretação:**
- **Cursor** detectado com score 70
- Provavelmente tem `CURSOR_*` env vars (50) + `.cursorrules` (30)

### API de Detecção

```javascript
import { detectIDE, getDetectionScores } from './scripts/ide-detector.js';

// Detectar IDE atual
const ide = detectIDE(); // 'vscode' | 'cursor' | 'windsurf' | 'antigravity' | 'unknown'

// Ver scores detalhados (debug)
const scores = getDetectionScores();
console.log(scores);
// { vscode: 35, cursor: 70, windsurf: 0, antigravity: 0 }
```

### Prioridade em Caso de Empate

Se múltiplos IDEs tiverem o mesmo score, a ordem de prioridade é:
1. **vscode** (mais comum)
2. **cursor** (segunda opção)
3. **windsurf** (terceira opção)
4. **antigravity** (experimental)

### Testes

Cobertura completa em `scripts/__tests__/ide-detector.test.js`:
- ✅ 24 testes unitários
- ✅ Mock de filesystem e env vars
- ✅ Cenários de empate
- ✅ Fallback para `unknown`

```bash
# Rodar testes
node --test scripts/__tests__/ide-detector.test.js
```

---

## 📚 Skill Reader

Sistema de leitura e parsing de skills em Markdown com YAML frontmatter.

### Formato de Skill

Todas as skills em `docs/skills/` seguem este formato:

```markdown
---
name: Nome da Skill
description: Descrição detalhada da skill
allowed-tools: Tool1, Tool2, Tool3  # Opcional
---

# Nome da Skill

## Seção 1
Conteúdo da skill...

## Seção 2
Mais conteúdo...
```

**Campos obrigatórios:**
- `name`: Nome da skill (usado para referência)
- `description`: Descrição completa da funcionalidade

**Campos opcionais:**
- `allowed-tools`: Lista de ferramentas permitidas (separadas por vírgula)

### API do Skill Reader

```javascript
import {
  readSkillFile,
  readAllSkills,
  parseSkill,
  groupSkillsByCategory,
  filterSkillsByCategory
} from './scripts/lib/skill-reader.js';

// Ler uma skill específica
const skill = readSkillFile('/path/to/skill.md');
console.log(skill.metadata.name);        // "Nome da Skill"
console.log(skill.metadata.description); // "Descrição..."
console.log(skill.category);             // "core-workflow"
console.log(skill.content);              // Markdown sem frontmatter

// Ler todas as skills
const skills = readAllSkills('./docs/skills');
console.log(`${skills.length} skills encontradas`);

// Agrupar por categoria
const grouped = groupSkillsByCategory(skills);
console.log(grouped['core-workflow']); // Array de skills

// Filtrar por categoria
const coreSkills = filterSkillsByCategory(skills, 'core-workflow');
```

### Detecção de Categoria

A categoria é inferida automaticamente do caminho do arquivo:

| Path | Categoria |
|------|-----------|
| `docs/skills/01-core-workflow/pesquisa.md` | `core-workflow` |
| `docs/skills/02-specialists/frontend-crafter.md` | `specialists` |
| `docs/skills/03-utilities/git-commit-push.md` | `utilities` |

**Prefixos numéricos** (`01-`, `02-`, etc.) são **removidos** da categoria.

### Tratamento de Erros

O reader é **tolerante a falhas**:
- Skills inválidas são **ignoradas** (não quebram o processo)
- Erros são **logados** com detalhes do arquivo
- Retorna apenas skills válidas

```bash
# Exemplo de saída com erros
⚠️  [SKILL-READER] 3 arquivo(s) com erro:
   - newsession.md: Frontmatter YAML não encontrado
   - invalid.md: Campo obrigatório "name" ausente
   - broken.md: Campo obrigatório "description" ausente
```

### Validação

Skills são validadas em **duas etapas**:

1. **Estrutural:** Presença de frontmatter YAML
2. **Conteúdo:** Campos obrigatórios (`name`, `description`)

### Testes

Cobertura completa em `scripts/__tests__/skill-reader.test.js`:
- ✅ 21 testes unitários
- ✅ Mock de skills com diferentes formatos
- ✅ Teste de leitura recursiva
- ✅ Teste de agrupamento e filtragem
- ✅ Tratamento de erros

```bash
# Rodar testes
node --test scripts/__tests__/skill-reader.test.js
```

### Exemplo Real

```bash
# Executar sync-skills.js para ver skills em ação
node scripts/sync-skills.js

# Output:
# ✅ [HYBRID-SYSTEM] IDE detectado: cursor
# ✅ [HYBRID-SYSTEM] 18 skills lidas
# 🔍 [HYBRID-SYSTEM] Categorias: core-workflow, specialists, utilities, project-specific, meta
# 🔍 [HYBRID-SYSTEM]   - core-workflow: 4 skill(s)
# 🔍 [HYBRID-SYSTEM]   - specialists: 5 skill(s)
# 🔍 [HYBRID-SYSTEM]   - utilities: 3 skill(s)
# 🔍 [HYBRID-SYSTEM]   - project-specific: 5 skill(s)
# 🔍 [HYBRID-SYSTEM]   - meta: 1 skill(s)
```

---

## 📂 Estrutura de Diretórios

```
SuperCartolaManagerv5/
├── docs/
│   └── skills/                         # SOURCE OF TRUTH (único)
│       ├── 01-core-workflow/
│       ├── 02-specialists/
│       ├── 03-utilities/
│       ├── 04-project-specific/
│       ├── 05-meta/
│       └── SKILL-KEYWORD-MAP.md
│
├── .claude/                            # VS Code + Claude Code
│   ├── hooks/
│   └── CLAUDE.md
│
├── .agent/                             # Cursor/Windsurf/Antigravity
│   ├── agents/                         # GERADO automaticamente
│   ├── skills/                         # GERADO automaticamente
│   ├── workflows/                      # GERADO automaticamente
│   └── README.md
│
├── scripts/
│   ├── ide-detector.js                 # Detecção de IDE
│   ├── sync-skills.js                  # Sincronizador principal
│   ├── lib/
│   │   ├── skill-reader.js             # Leitor de skills
│   │   └── agent-generator.js          # Gerador .agent/
│   └── validation/
│       ├── checklist.py                # Validação rápida
│       ├── verify_all.py               # Validação completa
│       └── validators/
│           ├── eslint.py
│           ├── mongodb-schema.js
│           └── security.js
│
├── tests/
│   └── e2e/                            # Testes Playwright
│       ├── auth/
│       ├── participante/
│       ├── modules/
│       └── pwa/
│
├── .cursorrules                        # Config Cursor
├── .gitignore
├── lighthouserc.json                   # PWA audits
└── playwright.config.js                # Config E2E
```

---

## 🔄 Fluxo de Sincronização

### 1. Source of Truth

Todas as skills residem em `docs/skills/`. Este é o **único lugar** onde skills são editadas.

### 2. Sincronização Automática

O script `scripts/sync-skills.js` sincroniza para os formatos de cada IDE:

```bash
# Manual
node scripts/sync-skills.js

# Automático (pre-commit hook)
git commit -m "..." # Sincroniza automaticamente
```

### 3. Estrutura Gerada

**Para VS Code (.claude/):**
- Mantém estrutura atual
- Adiciona hooks se necessário

**Para Cursor/Windsurf/Antigravity (.agent/):**
```
.agent/
├── agents/
│   ├── frontend-crafter.md
│   ├── league-architect.md
│   └── ...
├── skills/
│   ├── cartola-api.md
│   ├── cache-patterns.md
│   └── ...
└── workflows/
    ├── workflow.md
    ├── orchestrate.md
    └── ...
```

---

## 🎯 Compatibilidade Multi-IDE

### VS Code (Primário)

**Configuração:**
- Skills em `docs/skills/`
- Hooks em `.claude/hooks/`
- Ativação por keywords (PT-BR)

**Exemplo:**
```
Usuário: "crie uma tela de ranking"
↓
Keyword "crie uma tela" detectada
↓
Skill frontend-crafter ativada
```

### Cursor/Windsurf

**Configuração:**
- Skills sincronizadas em `.agent/`
- Slash commands + keywords
- `.cursorrules` para contexto

**Exemplo:**
```
Usuário: /frontend ou "ajuste CSS"
↓
.cursorrules mapeia para .agent/agents/frontend-crafter.md
↓
Skill executada
```

### Antigravity

**Configuração:**
- Estrutura `.agent/` totalmente compatível
- Workflows mapeados
- Agents sincronizados

**Diferença:** Antigravity usa auto-detection de especialistas. Nossas skills são mapeadas como agents.

---

## 🛡️ Sistema de Validação

### Níveis de Validação

**1. Quick Checks (Pre-commit - ~10s):**
- ESLint em arquivos modificados
- Schema validation (se models/ mudou)
- Git hooks básicos

**2. Full Verification (CI/CD - ~3-5min):**
- Todos os lints
- Testes unitários
- Security audit (OWASP)
- Schema validation completo
- Bundle analysis

**3. E2E Tests (CI/CD - ~10-15min):**
- Playwright testes críticos
- Lighthouse audits
- PWA compliance

### Executar Validações Manualmente

```bash
# Quick checks
npm run validate:quick

# Full verification
npm run validate:full

# E2E tests
npm run test:e2e

# Lighthouse
npm run lighthouse
```

---

## 🔧 Comandos Úteis

### Sincronização

```bash
# Sincronizar skills manualmente
node scripts/sync-skills.js

# Forçar re-sincronização
node scripts/sync-skills.js --force

# Sincronizar apenas para IDE específico
node scripts/sync-skills.js --ide=cursor
```

### Validação

```bash
# Validação rápida
python scripts/validation/checklist.py

# Validação completa
python scripts/validation/verify_all.py

# Validar apenas schemas
node scripts/validation/validators/mongodb-schema.js
```

### Testes

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Rodar teste específico
npx playwright test tests/e2e/ranking.spec.js

# Modo debug (UI)
npx playwright test --ui

# Lighthouse local
lhci autorun
```

---

## 🚨 Troubleshooting

### Skills não aparecem no Cursor

**Problema:** Slash commands não funcionam
**Solução:**
1. Verificar se `.agent/` existe e está populado
2. Rodar `node scripts/sync-skills.js`
3. Garantir que `.agent/` NÃO está no `.gitignore`
4. Reiniciar Cursor

### Validação falhando

**Problema:** Pre-commit hook bloqueia commit
**Solução temporária:**
```bash
git commit --no-verify -m "mensagem"
```

**Solução permanente:**
1. Corrigir os erros apontados
2. Ou desabilitar validação (não recomendado):
```bash
# .env
ENABLE_VALIDATION_HOOKS=false
```

### Testes E2E falhando

**Problema:** Testes Playwright falham localmente
**Solução:**
1. Garantir que servidor está rodando: `npm start`
2. Verificar porta: `BASE_URL=http://localhost:3000 npm run test:e2e`
3. Instalar browsers: `npx playwright install`

---

## 📊 Monitoramento

### Logs do Sistema Híbrido

Todos os componentes logam com prefixo `[HYBRID-SYSTEM]`:

```
[HYBRID-SYSTEM] IDE detectado: vscode
[HYBRID-SYSTEM] Sincronizando 29 skills...
[HYBRID-SYSTEM] ✅ Sincronização concluída em 1.2s
[HYBRID-SYSTEM] Validação rápida iniciada...
[HYBRID-SYSTEM] ✅ Validação concluída - 0 erros
```

### Métricas

O sistema coleta métricas de:
- Tempo de sincronização
- Cobertura de testes
- Lighthouse scores
- Bundle size

---

## 🔄 Atualizações

### Como Adicionar Nova Skill

1. Criar skill em `docs/skills/[categoria]/nome-skill.md`
2. Adicionar keywords em `SKILL-KEYWORD-MAP.md`
3. Rodar sincronização: `node scripts/sync-skills.js`
4. Testar ativação por keyword
5. Commit e push

### Como Atualizar Skill Existente

1. Editar em `docs/skills/` (source of truth)
2. Sincronização automática no próximo commit
3. Ou manual: `node scripts/sync-skills.js`

---

## 📚 Referências

- [CLAUDE.md](../CLAUDE.md) - Regras do projeto
- [SKILL-KEYWORD-MAP.md](skills/SKILL-KEYWORD-MAP.md) - Mapeamento de keywords
- [Antigravity Kit](https://github.com/vudovn/antigravity-kit) - Inspiração
- [Playwright Docs](https://playwright.dev) - Testes E2E
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) - Audits

---

## 📅 Histórico de Desenvolvimento

### ✅ DIA 1 (2026-02-11)
- Infraestrutura base do sistema híbrido
- Estrutura de diretórios (`docs/skills/`, `.agent/`)
- Script `sync-skills.js` (estrutura base)

### ✅ DIA 2 (2026-02-11)
- Módulo `scripts/ide-detector.js` com detecção robusta
- Integração no `sync-skills.js`
- 24 testes unitários com 100% de aprovação
- Documentação completa do método de detecção

### ✅ DIA 3 (2026-02-12)
- Módulo `scripts/lib/skill-reader.js` com parser Markdown
- Parser de YAML frontmatter (name, description, allowed-tools)
- Detecção automática de categoria por path
- Implementação de `readAllSkills()` no sync-skills.js
- 21 testes unitários com 100% de aprovação
- Tratamento tolerante a falhas
- Documentação completa da API

---

**Status:** 🚧 Em construção (Fase 1 - Dia 3 concluído)

**Última atualização:** 2026-02-12

**Versão:** 0.3.0
