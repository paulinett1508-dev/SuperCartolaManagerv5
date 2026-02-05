# 📁 Estrutura de Documentação - Visual

```
docs/
│
├── README.md                          # 📚 Índice principal
├── MIGRATION-GUIDE.md                 # 🔄 Guia de migração (v2.0)
├── STRUCTURE.md                       # 📁 Este arquivo
│
├── 📂 skills/                         # 🤖 Agentes Especializados (19 skills)
│   ├── README.md                      #    Índice completo de skills
│   │
│   ├── 01-core-workflow/              # ⚙️ High Senior Protocol
│   │   ├── workflow.md                #    Maestro - detecta fase
│   │   ├── pesquisa.md                #    Fase 1 - gera PRD
│   │   ├── spec.md                    #    Fase 2 - gera SPEC
│   │   └── code.md                    #    Fase 3 - implementa
│   │
│   ├── 02-specialists/                # 🎯 Especialistas Técnicos
│   │   ├── code-inspector.md          #    Auditoria sênior
│   │   ├── db-guardian.md             #    MongoDB, migrations
│   │   ├── frontend-crafter.md        #    Frontend, UX, cache
│   │   ├── league-architect.md        #    Regras de negócio
│   │   └── system-scribe.md           #    Documentação viva
│   │
│   ├── 03-utilities/                  # 🛠️ Ferramentas Auxiliares
│   │   ├── ai-problems-detection.md   #    Detecta overengineering
│   │   ├── fact-checker.md            #    Anti-alucinação
│   │   ├── git-commit-push.md         #    Git automation
│   │   ├── Refactor-Monolith.md       #    Decomposição segura
│   │   ├── replit-pull.md             #    Sync GitHub ↔ Replit
│   │   ├── restart-server.md          #    Restart Node.js
│   │   └── newsession.md              #    Handover sessões
│   │
│   ├── 04-project-specific/           # ⚽ Específicas Super Cartola
│   │   ├── cartola-api.md             #    Base API Cartola FC
│   │   ├── cartola-api-references/    #    Docs de referência
│   │   ├── AUDITOR-MODULE.md          #    Auditoria de módulos
│   │   ├── cache-auditor.md           #    Auditoria de cache (3 ambientes)
│   │   └── analise-branches.md        #    Análise de branches Git
│   │
│   └── 05-meta/                       # 🎓 Skills sobre Skills
│       ├── skill-creator.md           #    Criar novas skills
│       └── skill-installer.md         #    Instalar do catálogo
│
├── 📂 specs/                          # 📋 Especificações (79 docs)
│   ├── README.md                      #    Workflow PRD→SPEC→Code
│   │
│   ├── prds/                          # 📄 Requirements (37 docs)
│   │   ├── PRD-fix-toggle-modulos-sync.md
│   │   ├── PRD-app-mobile-admin.md
│   │   ├── PRD-preparar-rodada2-cartola-2026.md
│   │   └── ... (34 mais)
│   │
│   ├── specs/                         # 📐 Especificações Técnicas (35 docs)
│   │   ├── SPEC-app-mobile-admin.md
│   │   ├── SPEC-fix-toggle-modulos-sync.md
│   │   ├── IMPL-FEAT-003-Push-Notifications.md
│   │   ├── PONTOS-CORRIDOS-GRUPOS-SPEC.md
│   │   └── ... (31 mais)
│   │
│   └── audits/                        # 🔍 Auditorias (8+ docs)
│       ├── AUDIT-ADMIN-AUTH-2026-02-02.md
│       ├── AUDIT-RANKING-MODULE.md
│       ├── AUDITORIA-MODULO-FINANCEIRO-2026-02-01.md
│       ├── FIX-pontos-corridos-selects.md
│       ├── ANALYSIS-toggle-vs-modal.md
│       └── RELATORIO-IMPLEMENTACAO.md
│
├── 📂 architecture/                   # 🏗️ Docs Técnicos (9 docs)
│   ├── README.md                      #    Índice de arquitetura
│   ├── ARQUITETURA-MODULOS.md         #    Sistema de módulos SaaS
│   ├── ARQUITETURA-SINCRONIZACAO-MERCADO.md
│   ├── API-CARTOLA-ESTADOS.md         #    Estados da API
│   ├── JOGOS-DO-DIA-API.md            #    Multi-fallback jogos
│   ├── SISTEMA-RENOVACAO-TEMPORADA.md #    Lógica renovação
│   ├── VERSIONAMENTO-SISTEMA.md       #    Gestão de versões
│   ├── SINCRONISMO-DEV-PROD.md        #    Deploy strategy
│   ├── live_experience_2026.md        #    Parciais ao vivo
│   └── modules-registry.json          #    Registro de módulos
│
├── 📂 guides/                         # 📖 Guias e Tutoriais (10+ docs)
│   ├── README.md                      #    Índice de guias
│   ├── TEMPORADAS-GUIA.md             #    Como trabalhar com temporadas
│   ├── TEMPORADA-2026.md              #    Específico 2026
│   ├── TOKENS-GUIA.md                 #    Design tokens CSS
│   ├── WORKFLOW-CLAUDE-GITHUB-REPLIT.md
│   ├── CONTEXT7-MCP-SETUP.md          #    Setup MCPs
│   ├── GUIA-TESTES-ADMIN-MOBILE.md    #    Testes mobile
│   ├── WIZARD-MODULOS-REVISAO.md      #    Wizard de revisão
│   ├── POC-README.md                  #    Índice de POCs
│   ├── RESEARCH-SHADCN-MCP.md         #    Pesquisa ShadCN
│   └── SETUP-DAISYUI-POC.md           #    POC DaisyUI
│
├── 📂 rules/                          # ⚖️ Regras de Negócio
│   ├── general/                       #    Regras gerais
│   ├── modules/                       #    Por módulo
│   └── competitions/                  #    Formatos de disputa
│
├── 📂 auditorias/                     # 🔬 Auditorias de Módulos
│   └── (auditorias detalhadas usando auditor-module)
│
└── 📂 archives/                       # 📦 Documentos Históricos
    ├── 2025/                          #    Arquivos de 2025
    └── diagnosticos/                  #    Diagnósticos antigos
```

---

## 📊 Estatísticas

| Categoria | Quantidade | Descrição |
|-----------|------------|-----------|
| **Skills** | 19 | Agentes especializados |
| **PRDs** | 37 | Product Requirements |
| **SPECs** | 35 | Especificações Técnicas |
| **Auditorias** | 8+ | Audits e análises |
| **Arquitetura** | 9 | Docs técnicos |
| **Guias** | 10+ | Tutoriais e POCs |
| **READMEs** | 6 | Índices explicativos |
| **TOTAL** | 120+ | Documentos organizados |

---

## 🎯 Navegação Rápida

### Por Propósito

| Quero... | Ir para... |
|----------|-----------|
| **Usar uma skill** | `skills/README.md` → escolher categoria |
| **Ver workflow de dev** | `specs/README.md` |
| **Entender arquitetura** | `architecture/README.md` |
| **Seguir tutorial** | `guides/README.md` |
| **Criar novo módulo** | `architecture/ARQUITETURA-MODULOS.md` |
| **Integrar API Cartola** | `skills/04-project-specific/cartola-api.md` |
| **Fazer auditoria** | `skills/02-specialists/code-inspector.md` |

### Por Fase de Desenvolvimento

| Fase | Documentos Relevantes |
|------|----------------------|
| **1. Planejamento** | `specs/prds/` + `architecture/` |
| **2. Design** | `specs/specs/` + `guides/` |
| **3. Implementação** | `skills/01-core-workflow/code.md` |
| **4. Validação** | `skills/02-specialists/code-inspector.md` |
| **5. Documentação** | `skills/02-specialists/system-scribe.md` |

---

## 🚀 Quick Start

```bash
# Ver estrutura geral
cat docs/README.md

# Ver todas as skills
cat docs/skills/README.md

# Ver workflow de desenvolvimento
cat docs/specs/README.md

# Ver documentação técnica
cat docs/architecture/README.md

# Ver guias práticos
cat docs/guides/README.md
```

---

## 🤝 Filosofia

Esta estrutura foi projetada para ser:

- ✅ **Agnóstica** - Funciona com qualquer IA (Claude, GPT, Gemini)
- ✅ **Autoexplicativa** - READMEs em cada nível
- ✅ **Hierárquica** - Organização funcional clara
- ✅ **Escalável** - Comporta crescimento futuro
- ✅ **Git-friendly** - Rastreável e versionável

---

**Estrutura criada em:** 2026-02-04
**Por:** Claude Sonnet 4.5
**Versão:** 2.0
