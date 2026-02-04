# 🗂️ Índice Rápido - Documentação Super Cartola

> **Versão:** 2.0 | **Data:** 2026-02-04 | **Status:** ✅ Reorganizado

---

## 🚀 Acesso Rápido

| 🎯 Preciso... | 📂 Ir para... | 📄 Documento |
|---------------|---------------|--------------|
| **Usar uma skill de IA** | `skills/` | [README](./skills/README.md) |
| **Ver workflow de desenvolvimento** | `specs/` | [README](./specs/README.md) |
| **Entender arquitetura do sistema** | `architecture/` | [README](./architecture/README.md) |
| **Seguir um tutorial** | `guides/` | [README](./guides/README.md) |
| **Ver estrutura completa** | `.` | [STRUCTURE.md](./STRUCTURE.md) |
| **Entender a reorganização** | `.` | [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) |

---

## 📚 Documentos Principais

### 🤖 Skills - Agentes Especializados
**19 skills** organizadas em **5 categorias**

- [`skills/README.md`](./skills/README.md) - Índice completo
- **Core Workflow:** workflow, pesquisa, spec, code
- **Specialists:** code-inspector, db-guardian, frontend-crafter, league-architect, system-scribe
- **Utilities:** ai-problems-detection, fact-checker, git-commit-push, Refactor-Monolith, replit-pull, restart-server, newsession
- **Project-Specific:** cartola-api, module-auditor, analise-branches
- **Meta:** skill-creator, skill-installer

### 📋 Specs - Especificações
**79 documentos** de desenvolvimento

- [`specs/README.md`](./specs/README.md) - Workflow PRD→SPEC→Code
- **37 PRDs** - Requirements (Fase 1)
- **36 SPECs** - Especificações Técnicas (Fase 2)
- **9 Auditorias** - Análises e relatórios

### 🏗️ Architecture - Documentação Técnica
**9 documentos** de arquitetura

- [`architecture/README.md`](./architecture/README.md) - Índice técnico
- Sistema de módulos, API Cartola, Jogos ao vivo, Renovação de temporada, etc

### 📖 Guides - Guias e Tutoriais
**11 documentos** práticos

- [`guides/README.md`](./guides/README.md) - Índice de guias
- Temporadas, Tokens, Workflows, POCs, Setup de ferramentas

---

## 🎓 Por Nível de Experiência

### 👶 Iniciante
1. [`README.md`](./README.md) - Visão geral
2. [`STRUCTURE.md`](./STRUCTURE.md) - Estrutura visual
3. [`guides/WORKFLOW-CLAUDE-GITHUB-REPLIT.md`](./guides/WORKFLOW-CLAUDE-GITHUB-REPLIT.md)

### 🧑‍💻 Desenvolvedor
1. [`skills/01-core-workflow/`](./skills/01-core-workflow/) - Workflow de desenvolvimento
2. [`specs/README.md`](./specs/README.md) - PRDs e SPECs
3. [`architecture/`](./architecture/) - Docs técnicos

### 🎯 Especialista
1. [`skills/02-specialists/`](./skills/02-specialists/) - Skills avançadas
2. [`architecture/ARQUITETURA-MODULOS.md`](./architecture/ARQUITETURA-MODULOS.md)
3. [`specs/audits/`](./specs/audits/) - Auditorias

### 🤖 IA / Agente
1. [`skills/`](./skills/) - Todas as skills
2. [`MIGRATION-GUIDE.md`](./MIGRATION-GUIDE.md) - Contexto da estrutura
3. Qualquer README.md - Instruções específicas

---

## 🔍 Por Tipo de Tarefa

### Implementar Feature Nova
```
1. /pesquisa → gera PRD em specs/prds/
2. /spec → gera SPEC em specs/specs/
3. /code → implementa
4. /code-inspector → audita (opcional)
```

### Criar Novo Módulo
```
1. architecture/ARQUITETURA-MODULOS.md
2. architecture/modules-registry.json
3. skills/04-project-specific/module-auditor.md
```

### Integrar API Externa
```
1. skills/04-project-specific/cartola-api.md
2. architecture/API-CARTOLA-ESTADOS.md
3. architecture/ARQUITETURA-SINCRONIZACAO-MERCADO.md
```

### Fazer Auditoria
```
1. skills/02-specialists/code-inspector.md
2. specs/audits/ (exemplos)
```

### Refatorar Código Grande
```
1. skills/03-utilities/Refactor-Monolith.md
2. skills/03-utilities/ai-problems-detection.md
```

### Criar Nova Skill
```
1. skills/05-meta/skill-creator.md
2. skills/README.md (adicionar ao índice)
```

---

## 📊 Estatísticas

| 📂 Categoria | 📄 Arquivos | 📝 Descrição |
|-------------|------------|-------------|
| **Skills** | 25 | Agentes especializados (19 skills + READMEs) |
| **Specs** | 82 | PRDs, SPECs, Auditorias |
| **Architecture** | 9 | Documentos técnicos |
| **Guides** | 11 | Tutoriais e POCs |
| **Meta** | 5 | READMEs, índices, migração |
| **TOTAL** | **132** | Documentos organizados |

---

## 🎯 Atalhos Úteis

### Comandos Rápidos (Terminal)
```bash
# Ver índice principal
cat docs/README.md

# Ver todas as skills
cat docs/skills/README.md

# Ver estrutura visual
cat docs/STRUCTURE.md

# Buscar skill específica
ls docs/skills/*/code-inspector.md

# Ver último PRD criado
ls -t docs/specs/prds/ | head -1
```

### Comandos para IAs
```bash
# Ler skill antes de usar
Read docs/skills/02-specialists/code-inspector.md

# Ver PRDs de um módulo
Glob "docs/specs/prds/PRD-*modulos*.md"

# Buscar docs de arquitetura
Grep "pattern" docs/architecture/ --output_mode content
```

---

## 🔄 Manutenção

### Adicionar Documento
1. Identificar categoria (skills, specs, architecture, guides)
2. Seguir nomenclatura padrão
3. Atualizar README da categoria
4. Atualizar este índice se necessário

### Arquivar Documento
```bash
# Mover para archives com ano
mv docs/{categoria}/{doc}.md docs/archives/2026/{categoria}/
```

### Buscar Documento
```bash
# Por nome
find docs/ -name "*nome*"

# Por conteúdo
grep -r "termo" docs/
```

---

## 🤝 Filosofia da Estrutura

Esta organização foi projetada para ser:

- ✅ **Agnóstica** - Funciona com qualquer IA
- ✅ **Autoexplicativa** - READMEs em cada nível
- ✅ **Hierárquica** - Organização funcional
- ✅ **Escalável** - Comporta crescimento
- ✅ **Git-friendly** - Rastreável e versionável

---

## 📞 Recursos Externos

- **Código-fonte:** `/` (raiz do projeto)
- **Configuração Claude:** `/.claude/` (backward compatibility)
- **Regras Projeto:** `/CLAUDE.md`
- **Backlog:** `/BACKLOG.md`
- **GitHub:** [Super Cartola Manager](https://github.com/user/super-cartola-manager)

---

**Última atualização:** 2026-02-04
**Por:** Claude Sonnet 4.5
**Versão:** 2.0
