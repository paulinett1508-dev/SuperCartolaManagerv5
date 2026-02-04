# Specs - Especificações e Documentos de Desenvolvimento

Este diretório contém **PRDs**, **SPECs** e **Auditorias** do sistema Super Cartola Manager.

## 📁 Estrutura

```
specs/
├── prds/      # Product Requirement Documents (Fase 1)
├── specs/     # Especificações Técnicas (Fase 2)
└── audits/    # Auditorias, Análises e Relatórios
```

---

## 📋 PRDs (Product Requirement Documents)

**Localização:** `specs/prds/`

Documentos de **requisitos de produto** gerados na **Fase 1** do High Senior Protocol pela skill `/pesquisa`.

### Formato
- Gerados automaticamente pela skill `/pesquisa`
- Contêm contexto completo do problema
- Mapeiam arquivos relevantes
- Definem critérios de aceitação

### Nomenclatura
```
PRD-{nome-descritivo}.md
PRD-fix-{bug-name}.md
PRD-bug-{issue-name}.md
```

### Exemplos
- `PRD-fix-toggle-modulos-sync.md`
- `PRD-preparar-rodada2-cartola-2026.md`
- `PRD-app-mobile-admin.md`

---

## 📐 SPECs (Especificações Técnicas)

**Localização:** `specs/specs/`

Documentos de **especificação técnica** gerados na **Fase 2** pela skill `/spec`.

### Formato
- Mapeia TODAS as dependências (S.D.A completo)
- Define mudanças linha por linha
- Preserva lógica existente
- Mudanças cirúrgicas e focadas

### Nomenclatura
```
SPEC-{nome-descritivo}.md
IMPL-{feature-name}.md (implementações completas)
```

### Exemplos
- `SPEC-fix-toggle-modulos-sync.md`
- `SPEC-app-mobile-admin.md`
- `IMPL-FEAT-003-Push-Notifications.md`

---

## 🔍 Audits (Auditorias e Análises)

**Localização:** `specs/audits/`

Documentos de **auditoria**, **análise** e **relatórios** de qualidade/segurança.

### Tipos

#### Auditorias (AUDIT-*)
Revisões técnicas profundas de código, segurança, performance.

**Exemplos:**
- `AUDIT-ADMIN-AUTH-2026-02-02.md`
- `AUDIT-RANKING-MODULE.md`
- `AUDITORIA-MODULO-FINANCEIRO-2026-02-01.md`

#### Análises (ANALYSIS-*)
Comparações, diagnósticos e estudos técnicos.

**Exemplos:**
- `ANALYSIS-toggle-vs-modal.md`

#### Fixes (FIX-*)
Documentos de correção pós-audit.

**Exemplos:**
- `FIX-pontos-corridos-selects.md`

#### Relatórios (RELATORIO-*)
Relatórios de implementação e conclusão.

**Exemplos:**
- `RELATORIO-IMPLEMENTACAO.md`

#### Conclusões (CONCLUSAO-*)
Documentos de fechamento de ciclos.

**Exemplos:**
- `CONCLUSAO-sidebar.md`

---

## 🔄 Workflow Completo

```
┌─────────────────────────────────────────────────────┐
│ 1. FASE 1: /pesquisa                                │
│    Entrada: Descrição da tarefa                     │
│    Saída: PRD-{nome}.md → prds/                     │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ 2. FASE 2: /spec                                    │
│    Entrada: PRD-{nome}.md                           │
│    Saída: SPEC-{nome}.md → specs/                   │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ 3. FASE 3: /code                                    │
│    Entrada: SPEC-{nome}.md                          │
│    Saída: Código implementado                       │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│ 4. AUDITORIA: /code-inspector (opcional)            │
│    Entrada: Código implementado                     │
│    Saída: AUDIT-{nome}.md → audits/                 │
└─────────────────────────────────────────────────────┘
```

---

## 📖 Como Usar

### Criar novo PRD
```bash
/pesquisa
# IA irá buscar no codebase e gerar PRD automaticamente
# Arquivo salvo em: docs/specs/prds/PRD-{nome}.md
```

### Criar SPEC a partir de PRD
```bash
/spec
# IA lê PRD, mapeia dependências e gera SPEC
# Arquivo salvo em: docs/specs/specs/SPEC-{nome}.md
```

### Auditar implementação
```bash
/code-inspector "auditar módulo financeiro"
# Gera: docs/specs/audits/AUDIT-{nome}.md
```

---

## 🗂️ Organização

### Por Data
Arquivos incluem datas quando relevante:
- `AUDIT-ADMIN-AUTH-2026-02-02.md`
- `AUDITORIA-PARCIAIS-AO-VIVO.md`

### Por Funcionalidade
Agrupamento lógico por módulo/feature:
- Financeiro: `PRD-correcao-saldo-extrato-*`, `AUDITORIA-MODULO-FINANCEIRO-*`
- Admin: `PRD-app-mobile-admin`, `AUDIT-ADMIN-AUTH-*`
- Módulos: `PRD-modulos-opcionais-*`, `SPEC-modulos-opcionais-*`

---

## 🔄 Manutenção

### Arquivar documentos antigos
Quando um documento não é mais relevante:
```bash
mv docs/specs/prds/PRD-old.md docs/archives/2025/specs/
```

### Atualizar documentos
Edite diretamente o arquivo `.md` correspondente.

### Deletar documentos
**Nunca delete permanentemente**. Sempre arquive em `docs/archives/`.

---

## 📚 Recursos Relacionados

- **Skills:** `/docs/skills/` - Agentes que geram estes documentos
- **Arquitetura:** `/docs/architecture/` - Contexto técnico do sistema
- **Guias:** `/docs/guides/` - Workflows e tutoriais
