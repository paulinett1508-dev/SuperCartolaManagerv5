# 📚 Documentação do Super Cartola Manager

Este diretório contém **TODA** a documentação do sistema, organizada de forma **agnóstica** para colaboração com diferentes IAs e desenvolvedores.

## 🗺️ Estrutura Geral

```
docs/
├── skills/           # 🤖 Agentes especializados (IAs)
├── specs/            # 📋 PRDs, SPECs e Auditorias
├── architecture/     # 🏗️ Documentação técnica de arquitetura
├── guides/           # 📖 Guias, tutoriais e workflows
├── rules/            # ⚖️ Regras de negócio configuradas
├── auditorias/       # 🔍 Auditorias de módulos
└── archives/         # 📦 Documentos históricos
```

---

## 🤖 Skills - Agentes Especializados

**Localização:** [`skills/`](./skills/)

Agentes de IA especializados por função. Organizados em 5 categorias:

| Categoria | Descrição | Exemplos |
|-----------|-----------|----------|
| **01-core-workflow** | High Senior Protocol (Pesquisa → Spec → Code) | `workflow`, `pesquisa`, `spec`, `code` |
| **02-specialists** | Especialistas técnicos | `code-inspector`, `db-guardian`, `frontend-crafter` |
| **03-utilities** | Ferramentas auxiliares | `git-commit-push`, `fact-checker`, `ai-problems-detection` |
| **04-project-specific** | Específicas do Super Cartola | `cartola-api`, `auditor-module`, `cache-auditor` |
| **05-meta** | Skills sobre skills | `skill-creator`, `skill-installer` |

**Ver:** [skills/README.md](./skills/README.md) para detalhes completos.

---

## 📋 Specs - Especificações e Documentos

**Localização:** [`specs/`](./specs/)

Documentos de desenvolvimento seguindo o High Senior Protocol:

```
specs/
├── prds/      # 37 PRDs (Fase 1 - Requirements)
├── specs/     # 34 SPECs (Fase 2 - Technical Design)
└── audits/    # 8+ Auditorias e Análises
```

**Workflow:**
```
Tarefa → /pesquisa → PRD → /spec → SPEC → /code → Implementado
```

**Ver:** [specs/README.md](./specs/README.md) para workflow completo.

---

## 🏗️ Architecture - Documentação Técnica

**Localização:** [`architecture/`](./architecture/)

Documentos técnicos de arquitetura do sistema:

| Documento | Descrição |
|-----------|-----------|
| `ARQUITETURA-MODULOS.md` | Sistema de módulos opcionais |
| `ARQUITETURA-SINCRONIZACAO-MERCADO.md` | Sync com API Cartola FC |
| `API-CARTOLA-ESTADOS.md` | Estados da API do Cartola |
| `JOGOS-DO-DIA-API.md` | Sistema de jogos ao vivo (fallbacks) |
| `SISTEMA-RENOVACAO-TEMPORADA.md` | Lógica de renovação anual |
| `VERSIONAMENTO-SISTEMA.md` | Gestão de versões do app |
| `live_experience_2026.md` | Experiência de parciais ao vivo |

---

## 📖 Guides - Guias e Tutoriais

**Localização:** [`guides/`](./guides/)

Guias práticos, tutoriais, POCs e documentos de setup:

| Tipo | Exemplos |
|------|----------|
| **Guias de Uso** | `TEMPORADAS-GUIA.md`, `TOKENS-GUIA.md` |
| **Workflows** | `WORKFLOW-CLAUDE-GITHUB-REPLIT.md` |
| **Setup** | `CONTEXT7-MCP-SETUP.md`, `SETUP-DAISYUI-POC.md` |
| **Testes** | `GUIA-TESTES-ADMIN-MOBILE.md` |
| **POCs** | `POC-README.md`, `RESEARCH-SHADCN-MCP.md` |

---

## ⚖️ Rules - Regras de Negócio

**Localização:** [`rules/`](./rules/)

Configurações de regras de negócio do sistema:

```
rules/
├── general/           # Regras gerais
├── modules/           # Regras por módulo
└── competitions/      # Formatos de disputa
```

Exemplos: Fórmulas de cálculo, configurações de módulos, critérios de desempate.

---

## 🔍 Auditorias - Auditorias de Módulos

**Localização:** [`auditorias/`](./auditorias/)

Auditorias profundas de implementação de módulos usando o **auditor-module**:

- Conformidade com `modules-registry.json`
- Verificação de rotas, controllers, models
- Validação de telas e navegação
- Checklist de qualidade

---

## 📦 Archives - Documentos Históricos

**Localização:** [`archives/`](./archives/)

Documentos antigos organizados por ano/tipo:

```
archives/
├── 2025/
├── diagnosticos/
└── ...
```

---

## 🎯 Filosofia de Organização

### Princípios

1. **Agnóstico à IA** - Markdown puro, sem dependências Claude-specific
2. **Hierarquia Funcional** - Organizado por propósito, não por data
3. **Autodocumentado** - READMEs em cada diretório
4. **Colaborativo** - Outras IAs podem contribuir facilmente
5. **Rastreável** - Git como fonte única da verdade

### Nomenclatura Padronizada

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| `PRD-` | Product Requirement | `PRD-fix-toggle-modulos-sync.md` |
| `SPEC-` | Especificação Técnica | `SPEC-app-mobile-admin.md` |
| `AUDIT-` | Auditoria | `AUDIT-ADMIN-AUTH-2026-02-02.md` |
| `IMPL-` | Implementação | `IMPL-FEAT-003-Push-Notifications.md` |
| `GUIA-` | Guia/Tutorial | `GUIA-TESTES-ADMIN-MOBILE.md` |
| `POC-` | Proof of Concept | `POC-README.md` |

---

## 🚀 Quick Start

### Para Claude Code

```bash
# Ver todas as skills disponíveis
/help

# Usar workflow completo
/workflow

# Pesquisar e gerar PRD
/pesquisa

# Gerar SPEC a partir de PRD
/spec

# Implementar código
/code
```

### Para Outras IAs

1. Leia os READMEs de cada diretório
2. Siga os protocolos descritos nas skills
3. Use as ferramentas disponíveis (Glob, Grep, Read, Edit, Write)
4. Respeite a estrutura de nomenclatura

---

## 📊 Estatísticas (Atualizado: 2026-02-04)

- **Skills:** 19 skills organizadas
- **PRDs:** 37 documentos
- **SPECs:** 34 especificações
- **Auditorias:** 8+ documentos
- **Docs Arquitetura:** 8 documentos principais
- **Guias:** 5+ tutoriais e POCs

---

## 🔄 Manutenção

### Adicionar novo documento

1. Identifique a categoria correta
2. Use nomenclatura padronizada
3. Atualize o README do diretório se necessário

### Arquivar documento antigo

```bash
# Mover para archives com contexto temporal
mv docs/{categoria}/{arquivo}.md docs/archives/2026/{categoria}/
```

### Criar nova skill

1. Crie arquivo em `docs/skills/{categoria}/{nome}.md`
2. Atualize `docs/skills/README.md`
3. Siga template do `skill-creator`

---

## 🤝 Contribuindo

- **Desenvolvedores:** Mantenha PRDs/SPECs atualizados
- **IAs:** Siga protocolos das skills, gere documentação
- **Gestores:** Use auditorias para validar implementações

---

## 📞 Recursos Relacionados

- **Código-fonte:** `/` (raiz do projeto)
- **Configuração Claude:** `/.claude/` (específico Claude Code)
- **Regras Projeto:** `/CLAUDE.md` (instruções principais)
- **Backlog:** `/BACKLOG.md` (lista de tarefas)

---

**Última Reorganização:** 2026-02-04
**Estrutura por:** Claude Sonnet 4.5
**Objetivo:** Documentação agnóstica, colaborativa e escalável
