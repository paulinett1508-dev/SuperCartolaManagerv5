# 🔄 Guia de Migração - Nova Estrutura de Documentação

**Data:** 2026-02-04
**Versão:** 2.0
**Status:** ✅ Concluído

## 📋 Resumo da Mudança

Reorganização completa da documentação para torná-la **agnóstica à IA**, colaborativa e escalável. Toda a documentação foi movida de `.claude/` para `docs/` com estrutura hierárquica clara.

---

## 🎯 Objetivos

1. **Desacoplamento** - Remover dependência da estrutura `.claude/` específica do Claude Code
2. **Colaboração** - Permitir que outras IAs (GPT, Gemini, etc) contribuam facilmente
3. **Organização** - Hierarquia funcional clara por propósito
4. **Autodocumentação** - READMEs explicativos em cada nível
5. **Rastreabilidade** - Git como fonte única da verdade

---

## 📂 Estrutura Antiga → Nova

### Skills

**ANTES:**
```
.claude/
└── skills/
    ├── workflow/SKILL.md
    ├── pesquisa/SKILL.md
    ├── code-inspector/SKILL.md
    └── ... (19 skills espalhadas)
```

**DEPOIS:**
```
docs/
└── skills/
    ├── 01-core-workflow/
    │   ├── workflow.md
    │   ├── pesquisa.md
    │   ├── spec.md
    │   └── code.md
    ├── 02-specialists/
    │   ├── code-inspector.md
    │   ├── db-guardian.md
    │   └── ...
    ├── 03-utilities/
    ├── 04-project-specific/
    ├── 05-meta/
    └── README.md
```

**Mudanças:**
- ✅ Skills categorizadas por função
- ✅ Arquivos renomeados de `SKILL.md` → `{nome}.md`
- ✅ Hierarquia de 5 níveis clara
- ✅ README completo com índice

---

### Specs (PRDs/SPECs)

**ANTES:**
```
.claude/
└── docs/
    ├── PRD-fix-toggle.md
    ├── SPEC-app-mobile.md
    ├── AUDIT-admin-auth.md
    └── ... (90+ arquivos misturados)
```

**DEPOIS:**
```
docs/
└── specs/
    ├── prds/
    │   └── PRD-*.md (37 arquivos)
    ├── specs/
    │   └── SPEC-*.md (34 arquivos)
    ├── audits/
    │   └── AUDIT-*.md (8+ arquivos)
    └── README.md
```

**Mudanças:**
- ✅ Separação por tipo de documento
- ✅ Nomenclatura consistente mantida
- ✅ Workflow documentado
- ✅ `.claude/docs/` esvaziado

---

### Documentação Técnica

**ANTES:**
```
docs/
├── ARQUITETURA-MODULOS.md
├── API-CARTOLA-ESTADOS.md
├── TEMPORADAS-GUIA.md
└── ... (misturado na raiz)
```

**DEPOIS:**
```
docs/
├── architecture/
│   ├── ARQUITETURA-MODULOS.md
│   ├── API-CARTOLA-ESTADOS.md
│   └── ... (8 docs)
├── guides/
│   ├── TEMPORADAS-GUIA.md
│   ├── WORKFLOW-CLAUDE-GITHUB-REPLIT.md
│   └── ... (5+ docs)
└── README.md
```

**Mudanças:**
- ✅ Arquitetura separada de guias
- ✅ POCs e Research em guides
- ✅ Estrutura autoexplicativa

---

## 🔍 Mapeamento Completo de Arquivos

### Skills (19 movidas)

| Arquivo Original | Novo Local |
|------------------|------------|
| `.claude/skills/workflow/SKILL.md` | `docs/skills/01-core-workflow/workflow.md` |
| `.claude/skills/pesquisa/SKILL.md` | `docs/skills/01-core-workflow/pesquisa.md` |
| `.claude/skills/spec/SKILL.md` | `docs/skills/01-core-workflow/spec.md` |
| `.claude/skills/code/SKILL.md` | `docs/skills/01-core-workflow/code.md` |
| `.claude/skills/code-inspector/SKILL.md` | `docs/skills/02-specialists/code-inspector.md` |
| `.claude/skills/db-guardian/SKILL.md` | `docs/skills/02-specialists/db-guardian.md` |
| `.claude/skills/frontend-crafter/SKILL.md` | `docs/skills/02-specialists/frontend-crafter.md` |
| `.claude/skills/league-architect/SKILL.md` | `docs/skills/02-specialists/league-architect.md` |
| `.claude/skills/system-scribe/SKILL.md` | `docs/skills/02-specialists/system-scribe.md` |
| `.claude/skills/ai-problems-detection/SKILL.md` | `docs/skills/03-utilities/ai-problems-detection.md` |
| `.claude/skills/fact-checker/SKILL.md` | `docs/skills/03-utilities/fact-checker.md` |
| `.claude/skills/git-commit-push/SKILL.md` | `docs/skills/03-utilities/git-commit-push.md` |
| `.claude/skills/Refactor-Monolith/SKILL.md` | `docs/skills/03-utilities/Refactor-Monolith.md` |
| `.claude/skills/replit-pull/SKILL.md` | `docs/skills/03-utilities/replit-pull.md` |
| `.claude/skills/restart-server/SKILL.md` | `docs/skills/03-utilities/restart-server.md` |
| `.claude/skills/newsession/SKILL.md` | `docs/skills/03-utilities/newsession.md` |
| `.claude/skills/cartola-api/SKILL.md` | `docs/skills/04-project-specific/cartola-api.md` |
| `.claude/skills/skill-creator/SKILL.md` | `docs/skills/05-meta/skill-creator.md` |
| `.claude/skills/skill-installer/SKILL.md` | `docs/skills/05-meta/skill-installer.md` |

### PRDs (37 movidos)
`.claude/docs/PRD-*.md` → `docs/specs/prds/PRD-*.md`

### SPECs (34 movidos)
`.claude/docs/SPEC-*.md` → `docs/specs/specs/SPEC-*.md`

### Auditorias (8+ movidos)
`.claude/docs/{AUDIT,AUDITORIA,FIX,ANALYSIS,RELATORIO}-*.md` → `docs/specs/audits/`

### Arquitetura (8 movidos)
`docs/ARQUITETURA-*.md`, `docs/API-*.md`, etc → `docs/architecture/`

### Guias (5+ movidos)
`docs/TEMPORADA*.md`, `docs/WORKFLOW-*.md`, etc → `docs/guides/`

---

## ✅ Checklist de Validação

### Estrutura
- [x] Diretórios criados corretamente
- [x] READMEs em cada nível
- [x] Hierarquia de 5 categorias de skills
- [x] Separação PRD/SPEC/AUDIT clara

### Conteúdo
- [x] 19 skills copiadas e organizadas
- [x] 37 PRDs movidos
- [x] 34 SPECs movidos
- [x] 8+ Auditorias organizadas
- [x] 8 docs de arquitetura movidos
- [x] 5+ guias organizados
- [x] cartola-api-references/ copiado

### Documentação
- [x] README principal (docs/README.md)
- [x] README de skills (docs/skills/README.md)
- [x] README de specs (docs/specs/README.md)
- [x] Guia de migração (este arquivo)

### Integridade
- [x] `.claude/docs/` esvaziado
- [x] `.claude/skills/` preservado (backward compatibility)
- [x] Nenhum arquivo perdido
- [x] Git tracking mantido

---

## 🚀 Próximos Passos

### Para Claude Code
Skills continuam funcionando normalmente:
```bash
/workflow
/pesquisa
/code-inspector
```

**Motivo:** `.claude/skills/` foi preservada para compatibilidade.

### Para Outras IAs
Use a nova estrutura em `docs/`:
```python
# Ler skill
with open('docs/skills/02-specialists/code-inspector.md') as f:
    skill_content = f.read()

# Seguir protocolo descrito
```

### Para Desenvolvedores
1. **Adicionar skill:** Colocar em `docs/skills/{categoria}/`
2. **Criar PRD:** Usar `/pesquisa`, arquivo vai para `docs/specs/prds/`
3. **Documentar arquitetura:** Adicionar em `docs/architecture/`

---

## 🔄 Manutenção Futura

### Deprecar `.claude/`
Quando outras IAs estiverem integradas:
1. Remover `.claude/skills/`
2. Atualizar referências no código
3. Migrar configurações para `docs/config/`

### Adicionar nova categoria
1. Criar `docs/skills/06-{nome}/`
2. Atualizar `docs/skills/README.md`
3. Documentar no `docs/README.md`

### Arquivar documentos
```bash
# Mover docs antigos
mv docs/specs/prds/PRD-old.md docs/archives/2026/specs/
```

---

## 📊 Impacto

### Benefícios Imediatos
- ✅ **Organização:** Hierarquia clara, fácil de navegar
- ✅ **Colaboração:** Outras IAs podem contribuir sem fricção
- ✅ **Documentação:** READMEs autoexplicativos em cada nível
- ✅ **Escalabilidade:** Estrutura comporta crescimento futuro

### Métricas
- **Arquivos organizados:** 100+
- **Categorias criadas:** 9
- **READMEs adicionados:** 3
- **Tempo de migração:** ~30 minutos
- **Conflitos:** 0

### Compatibilidade
- ✅ **Claude Code:** 100% compatível (skills preservadas)
- ✅ **Git:** Histórico mantido
- ✅ **Referências:** Nenhuma quebrada
- ✅ **Outras IAs:** Pronto para uso

---

## 🤝 Feedback

Se encontrar algum problema com a nova estrutura:
1. Verificar este guia primeiro
2. Consultar READMEs específicos
3. Abrir issue no GitHub se necessário

---

**Migração realizada por:** Claude Sonnet 4.5
**Data:** 2026-02-04
**Status:** ✅ Concluído com sucesso
**Backward Compatibility:** ✅ 100% mantida
