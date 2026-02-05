# Skills - Agentes Especializados do Sistema

Este diretório contém todas as **skills** (agentes especializados) do Super Cartola Manager, organizadas por categoria funcional.

## 📁 Estrutura de Diretórios

```
skills/
├── 01-core-workflow/      # High Senior Protocol - Workflow principal
├── 02-specialists/        # Agentes especialistas técnicos
├── 03-utilities/          # Ferramentas auxiliares
├── 04-project-specific/   # Skills específicas do Super Cartola
└── 05-meta/              # Skills para gerenciar skills
```

---

## 🔄 01 - Core Workflow (High Senior Protocol)

Skills que formam o **protocolo de desenvolvimento profissional** - fluxo completo de pesquisa → especificação → implementação:

| Skill | Fase | Descrição | Quando Usar |
|-------|------|-----------|-------------|
| **workflow** | Maestro | Detecta fase automaticamente e orquestra o fluxo | `/workflow` no início de cada sessão |
| **pesquisa** | Fase 1 | Busca autônoma no codebase, gera PRD.md | Quando receber nova tarefa |
| **spec** | Fase 2 | Mapeia dependências, define mudanças cirúrgicas | Após ter PRD completo |
| **code** | Fase 3 | Aplica mudanças linha por linha | Após ter SPEC aprovada |

**Fluxo:**
```
/workflow → FASE 1: /pesquisa → PRD.md
         → FASE 2: /spec → SPEC.md
         → FASE 3: /code → Código implementado
```

---

## 🎯 02 - Specialists (Especialistas Técnicos)

Agentes com expertise profunda em áreas específicas:

| Skill | Expertise | Quando Usar |
|-------|-----------|-------------|
| **code-inspector** | Auditoria Sênior de Código | "auditar código", "security review", "OWASP check" |
| **db-guardian** | MongoDB, Segurança de Dados, Migrations | Scripts DB, limpeza, manutenção, snapshots |
| **frontend-crafter** | Frontend Mobile-First, UX, Cache Offline | Criar/ajustar telas, componentes, CSS/JS |
| **league-architect** | Regras de Negócio, Lógica de Ligas | Criar configs de liga, calcular finanças |
| **system-scribe** | Documentação Viva do Sistema | "explique módulo X", "como funciona Y?" |

---

## 🛠️ 03 - Utilities (Ferramentas Auxiliares)

Skills utilitárias para tarefas específicas:

| Skill | Função | Quando Usar |
|-------|--------|-------------|
| **ai-problems-detection** | Detecta 5 problemas comuns da IA | Antes de implementar: overengineering, duplicação, etc |
| **fact-checker** | Protocolo Anti-Alucinação | "verifique se", "confirme que" |
| **git-commit-push** | Commits e push automatizados | "git push", "commite tudo" |
| **Refactor-Monolith** | Decomposição de arquivos grandes | "refatorar arquivo grande", "separar em módulos" |
| **replit-pull** | Sincronização GitHub ↔ Replit | "pull no replit", "atualizar replit", "deploy" |
| **restart-server** | Reiniciar servidor Node.js | "reiniciar servidor", "restart" |
| **newsession** | Handover entre sessões | Transferir contexto para nova sessão |

---

## ⚽ 04 - Project-Specific (Específicas do Projeto)

Skills desenvolvidas especificamente para o Super Cartola Manager:

| Skill | Função | Quando Usar |
|-------|--------|-------------|
| **cartola-api** | Base de conhecimento da API Cartola FC | Consultar endpoints, schemas, scouts, autenticação |
| **auditor-module** | Auditoria de módulos do sistema | Validar implementação de novos módulos |
| **cache-auditor** | Auditoria de cache (3 ambientes) | Detectar cache stale/morto, validar coerência, otimizar velocidade |
| **analise-branches** | Análise de branches Git | Comparar branches, identificar divergências |

---

## 🎓 05 - Meta (Skills sobre Skills)

Skills para gerenciar e criar outras skills:

| Skill | Função | Quando Usar |
|-------|--------|-------------|
| **skill-creator** | Guia para criar skills efetivas | "criar skill", "fazer skill" |
| **skill-installer** | Instalar skills do catálogo | "instalar skill", "listar skills" |

---

## 🤝 Filosofia Agnóstica

Esta estrutura foi projetada para ser **agnóstica em relação à IA**:

- ✅ **Markdown puro** - legível por qualquer sistema
- ✅ **Sem dependências** do formato Claude/.skills
- ✅ **Documentação clara** - outras IAs podem colaborar
- ✅ **Hierarquia funcional** - organização por propósito

---

## 📖 Como Usar

### Para Claude Code
```bash
# Skills são invocadas via /nome-da-skill
/workflow
/pesquisa
/code-inspector
```

### Para Outras IAs
1. Leia o arquivo `.md` da skill desejada
2. Siga as instruções do protocolo descrito
3. Use as ferramentas disponíveis (Glob, Grep, Read, etc)

---

## 🔄 Atualização e Manutenção

- **Adicionar nova skill:** Coloque no diretório apropriado e atualize este README
- **Modificar skill:** Edite o arquivo `.md` correspondente
- **Deprecar skill:** Mova para `docs/archives/skills/deprecated/`

---

## 📚 Recursos Relacionados

- **PRDs/SPECs:** `/docs/specs/` - Especificações de funcionalidades
- **Arquitetura:** `/docs/architecture/` - Documentos técnicos do sistema
- **Guias:** `/docs/guides/` - Tutoriais e workflows
- **Regras:** `/docs/rules/` - Regras de negócio configuradas
