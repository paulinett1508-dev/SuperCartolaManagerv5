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

**Status:** 🚧 Em construção (Fase 1 - Dia 1)

**Última atualização:** 2026-02-11

**Versão:** 0.1.0
