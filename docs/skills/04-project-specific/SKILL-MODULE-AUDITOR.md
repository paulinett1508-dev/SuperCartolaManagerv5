# SKILL: Module Auditor (Auditor de Módulos)

## 📋 Visão Geral

Sistema inteligente e **agnóstico de IA** para auditoria automatizada de módulos do Super Cartola Manager. Valida conformidade com padrões de **segurança**, **UI/UX**, **performance**, **financeiro** e **regras de negócio**.

**Filosofia:** Skill única + rules reutilizáveis = manutenção centralizada e consistência garantida.

---

## 🎯 Objetivos

1. **Detectar problemas** antes de chegarem à produção
2. **Garantir consistência** entre módulos
3. **Sugerir correções** automaticamente
4. **Documentar padrões** do projeto
5. **Ser agnóstico** (funciona com qualquer IA: Claude, GPT, Gemini, etc.)

---

## 🏗️ Arquitetura

```
docs/
├── SKILL-MODULE-AUDITOR.md        # Esta skill (orquestrador)
├── modules-registry.json          # Catálogo de módulos
├── rules/
│   ├── audit-financial.md         # Checklist financeiro
│   ├── audit-ui.md                # Checklist UI/UX
│   ├── audit-security.md          # Checklist segurança
│   ├── audit-business.md          # Checklist regras de negócio
│   └── audit-performance.md       # Checklist performance
└── auditorias/
    └── [relatórios gerados]       # Ex: AUDITORIA-TOP10-2026-02-04.md
```

### Por que Skill Única?

| ✅ Vantagem | ❌ Skills Individuais |
|------------|----------------------|
| 1 arquivo central | 15+ arquivos duplicados |
| Regras uniformes | Divergências inevitáveis |
| Adicionar módulo = 1 linha JSON | Criar skill inteira |
| Zero duplicação (DRY) | Muito código repetido |
| Fácil manutenção | Overhead insuportável |

---

## 📚 Types de Auditoria

### 1. **Financial** (Financeiro)
**Quando aplicar:** Módulos com transações monetárias (Artilheiro, Luva de Ouro, Inscrições)

**Verifica:**
- ✅ Idempotência (previne cobrança duplicada)
- ✅ Registro no `extratofinanceiro`
- ✅ Validação de sessão (`req.session.usuario`)
- ✅ Operações atômicas MongoDB
- ✅ Auditoria "Follow the Money"

**Severidade:** 🔴 CRÍTICA (bugs financeiros = perda de confiança)

---

### 2. **UI/UX** (Interface)
**Quando aplicar:** Todos módulos com interface visual

**Verifica:**
- ✅ Dark Mode obrigatório (`bg-gray-900`)
- ✅ Tipografia (Russo One, Inter, JetBrains Mono)
- ✅ Cores por variáveis CSS (não hardcode `#22c55e`)
- ✅ Responsividade mobile
- ✅ Estados visuais (loading, error, empty)

**Severidade:** 🟠 ALTA (UX ruim = usuários abandonam)

---

### 3. **Security** (Segurança)
**Quando aplicar:** TODOS módulos (mandatory)

**Verifica:**
- ✅ OWASP Top 10 compliance
- ✅ NoSQL injection prevention
- ✅ XSS protection (`textContent` vs `innerHTML`)
- ✅ Rate limiting em endpoints críticos
- ✅ Validação de entrada (whitelist)

**Severidade:** 🔴 CRÍTICA (segurança compromete todo sistema)

---

### 4. **Business Logic** (Regras de Negócio)
**Quando aplicar:** Todos módulos

**Verifica:**
- ✅ Respeita `modulos_ativos` da liga
- ✅ Filtra por `temporada`
- ✅ Trata pré-temporada corretamente
- ✅ Valida participantes ativos
- ✅ Usa `ligarules` (não hardcode)

**Severidade:** 🟠 ALTA (bugs de negócio = resultados incorretos)

---

### 5. **Performance** (Otimização)
**Quando aplicar:** Módulos com queries pesadas ou listas longas

**Verifica:**
- ✅ Queries têm índices MongoDB
- ✅ Usa cache estratégico
- ✅ Evita N+1 queries
- ✅ Paginação em listas longas
- ✅ `Promise.all()` para requisições paralelas

**Severidade:** 🟡 MÉDIA (performance ruim = UX prejudicada)

---

## 🚀 Como Usar

### Sintaxe

```bash
# Auditoria completa (todas rules aplicáveis)
/module-auditor <nome-modulo>

# Auditoria específica
/module-auditor <nome-modulo> --<tipo-audit>

# Comparar dois módulos
/module-auditor compare <modulo1> <modulo2>

# Auditar todos módulos de uma categoria
/module-auditor --category <categoria>

# Gerar relatório detalhado
/module-auditor <nome-modulo> --report
```

### Exemplos Práticos

```bash
# Auditar Top 10 (todas rules aplicáveis)
/module-auditor top10

# Auditar Artilheiro apenas parte financeira
/module-auditor artilheiro --financial

# Auditar Luva de Ouro (UI + Security)
/module-auditor luva-ouro --ui --security

# Comparar implementações
/module-auditor compare artilheiro luva-ouro

# Auditar todos módulos de competição
/module-auditor --category competition

# Relatório completo com sugestões
/module-auditor parciais --report
```

---

## 📖 Workflow de Auditoria

### Passo 1: Identificar Módulo
```javascript
// Ler modules-registry.json
const modulo = registry[nomeModulo];
if (!modulo) throw new Error('Módulo não encontrado no registry');
```

### Passo 2: Carregar Rules Aplicáveis
```javascript
// Baseado em modulo.audits: ["financial", "ui", "security", ...]
const rules = modulo.audits.map(tipo => loadRule(`docs/rules/audit-${tipo}.md`));
```

### Passo 3: Executar Checklists
```javascript
// Para cada rule, verificar todos itens
for (const rule of rules) {
    const resultados = await executarChecklist(rule, modulo.files);
    relatorio.push(resultados);
}
```

### Passo 4: Gerar Relatório
```markdown
# 📊 AUDITORIA: Top 10
**Data:** 04/02/2026
**Módulo:** top10 (categoria: ranking)
**Complexidade:** low

## ✅ UI/UX: 8/10 checks passed
- ✅ Dark mode aplicado
- ✅ Tipografia correta
- ⚠️  Falta variável CSS em badge (linha 45)
- ❌ Sem responsividade em tabela (linha 78)

## 🔧 Sugestões
1. Linha 45: Trocar `#22c55e` por `var(--module-artilheiro-primary)`
2. Linha 78: Adicionar classes `overflow-x-auto` e `md:overflow-visible`
```

### Passo 5: Salvar Auditoria
```bash
docs/auditorias/AUDITORIA-TOP10-2026-02-04.md
```

---

## 📊 Formato do Registry (`modules-registry.json`)

```json
{
  "nome-modulo": {
    "name": "Nome Exibido",
    "category": "ranking | competition | financial | content | live | game",
    "description": "Breve descrição",
    "hasFinancial": true | false,
    "hasUI": true | false,
    "hasAPI": true | false,
    "complexity": "low | medium | high | critical",
    "colorVar": "--module-*-primary",
    "colorHex": "#hexcolor",
    "status": "active | planned | deprecated",
    "files": {
      "controller": "controllers/modulo-controller.js",
      "model": "models/Modelo.js",
      "frontend": "public/js/admin/modulo-management.js",
      "view": "views/admin/modulo.html"
    },
    "audits": ["financial", "ui", "security", "business", "performance"]
  }
}
```

### Campos Obrigatórios
- `name`, `category`, `hasFinancial`, `hasUI`, `hasAPI`, `complexity`, `audits`

### Categorias Disponíveis
- **ranking**: Top 10, Melhor Mês, Hall da Fama
- **competition**: Artilheiro, Luva de Ouro, Mata-Mata, Pontos Corridos
- **financial**: Extrato, Inscrições, Acertos
- **content**: Dicas, Notícias
- **live**: Parciais ao Vivo, Jogos do Dia
- **game**: Campinho, Bolão

---

## 🎨 Formato das Rules (`docs/rules/audit-*.md`)

Cada rule DEVE seguir este padrão:

```markdown
# AUDIT RULE: <Nome> (<Tradução>)

## 🎯 Objetivo
Breve descrição do propósito desta auditoria.

---

## ✅ Checklist de Auditoria

### 1. **Item Principal**
- [ ] Sub-check 1
- [ ] Sub-check 2

**Exemplo correto:**
\`\`\`javascript
// código exemplo
\`\`\`

---

## 🚨 Red Flags Críticos

| Problema | Severidade | Ação |
|----------|-----------|------|
| Descrição | 🔴/🟠/🟡 | Ação corretiva |

---

## 📊 Exemplo Completo
\`\`\`javascript
// Implementação de referência
\`\`\`

---

**Última atualização:** DD/MM/AAAA
**Versão:** X.Y.Z
```

---

## 🚨 Severidades

| Emoji | Nível | Quando Usar | Ação |
|-------|-------|-------------|------|
| 🔴 | CRÍTICO | Segurança, financeiro, data loss | Bloquear merge |
| 🟠 | ALTO | UX ruim, bugs funcionais | Corrigir antes de prod |
| 🟡 | MÉDIO | Performance, code smell | Corrigir no sprint |
| 🟢 | BAIXO | Nice to have, otimizações | Backlog |

---

## 📈 Métricas de Qualidade

### Score de Conformidade
```
Score = (Checks Passed / Total Checks) * 100
```

**Benchmarks:**
- 🟢 **90-100%**: Excelente
- 🟡 **70-89%**: Aceitável (revisar warnings)
- 🟠 **50-69%**: Precisa melhorias
- 🔴 **< 50%**: Crítico (não mergear)

### Taxa de Cobertura de Auditorias
```
Cobertura = (Módulos Auditados / Total Módulos) * 100
```

**Meta:** 100% dos módulos ativos auditados

---

## 🔄 Quando Auditar

### 1. **Criação de Novo Módulo**
Antes do primeiro merge, auditar completamente.

### 2. **Refatoração Significativa**
Após mudanças estruturais (>100 linhas).

### 3. **Antes de Releases**
Validar módulos críticos antes de deploy.

### 4. **Auditoria Periódica**
Mensal para módulos financeiros, trimestral para demais.

### 5. **Após Bugs Reportados**
Validar correção + prevenir regressão.

---

## 🛠️ Adicionar Novo Módulo ao Sistema

### Passo 1: Adicionar ao Registry
```json
// docs/modules-registry.json
"novo-modulo": {
    "name": "Novo Módulo",
    "category": "ranking",
    "hasFinancial": false,
    "hasUI": true,
    "hasAPI": true,
    "complexity": "medium",
    "files": {
        "controller": "controllers/novo-modulo-controller.js",
        "frontend": "public/js/admin/novo-modulo-management.js"
    },
    "audits": ["ui", "security", "business", "performance"]
}
```

### Passo 2: Executar Auditoria
```bash
/module-auditor novo-modulo --report
```

### Passo 3: Corrigir Issues
Implementar sugestões do relatório.

### Passo 4: Re-auditar
```bash
/module-auditor novo-modulo
```

### Passo 5: Documentar
Relatório final em `docs/auditorias/`.

---

## 🤝 Agnóstico de IA

Esta skill funciona com **qualquer assistente de IA**:

### Claude (Anthropic)
```
/module-auditor top10
```

### ChatGPT (OpenAI)
```
Por favor, execute a skill Module Auditor para o módulo top10
```

### Gemini (Google)
```
Audite o módulo top10 usando o Module Auditor
```

### Cursor IDE
```
@module-auditor analise artilheiro
```

### Copilot (GitHub)
```
#module-auditor security luva-ouro
```

**Requisito:** IA deve ter acesso ao contexto do projeto (CLAUDE.md, modules-registry.json, rules/).

---

## 📚 Exemplos de Relatórios

### Relatório Completo
```markdown
# 📊 AUDITORIA COMPLETA: Artilheiro Campeão

**Data:** 04/02/2026 15:30
**Módulo:** artilheiro (categoria: competition)
**Complexidade:** high
**Arquivos:** 4 (controller, model, frontend, view)

---

## 📋 Resumo Executivo

| Categoria | Score | Status |
|-----------|-------|--------|
| Financial | 10/10 | ✅ Aprovado |
| UI/UX | 8/10 | ⚠️ Warnings |
| Security | 9/10 | ⚠️ Warnings |
| Business | 10/10 | ✅ Aprovado |
| Performance | 7/10 | ⚠️ Melhorias |

**Score Geral:** 88/100 (🟡 Aceitável)

---

## ✅ Financial: 10/10 checks passed

### Pontos Fortes
- ✅ Idempotência implementada corretamente (linha 45)
- ✅ Registro completo no extratofinanceiro
- ✅ Validação de sessão presente
- ✅ Operações atômicas (`findOneAndUpdate`)

### Issues
Nenhum issue crítico.

---

## ⚠️ UI/UX: 8/10 checks passed

### Pontos Fortes
- ✅ Dark mode aplicado
- ✅ Tipografia Russo One em títulos

### Issues
- 🟡 **Linha 156**: Cor hardcoded `#22c55e`
  - **Correção:** `background: var(--module-artilheiro-primary);`
- 🟡 **Linha 203**: Sem responsividade em tabela
  - **Correção:** Adicionar `overflow-x-auto md:overflow-visible`

---

## ⚠️ Security: 9/10 checks passed

### Pontos Fortes
- ✅ Autenticação validada
- ✅ Inputs sanitizados

### Issues
- 🟡 **Linha 89**: Falta rate limiting
  - **Correção:** Adicionar `rateLimit` middleware

---

## 🔧 Ações Recomendadas

**Prioridade ALTA (antes de prod):**
1. Adicionar rate limiting (security)
2. Substituir cor hardcoded por variável CSS (ui)

**Prioridade MÉDIA (próximo sprint):**
3. Melhorar responsividade de tabela (ui)
4. Adicionar cache em query de apostas (performance)

---

**Auditoria realizada por:** Claude Code
**Próxima auditoria:** 04/03/2026
```

---

## 🔗 Referências

### Documentação Interna
- `CLAUDE.md` → Padrões gerais do projeto
- `docs/SISTEMA-RENOVACAO-TEMPORADA.md` → Regras financeiras
- `docs/ARQUITETURA-MODULOS.md` → Estrutura de módulos

### Rules de Auditoria
- `docs/rules/audit-financial.md`
- `docs/rules/audit-ui.md`
- `docs/rules/audit-security.md`
- `docs/rules/audit-business.md`
- `docs/rules/audit-performance.md`

### Registry
- `docs/modules-registry.json` → Catálogo de módulos

---

## 🏆 Benefícios

1. **Consistência**: Todos módulos seguem mesmos padrões
2. **Qualidade**: Bugs detectados antes de produção
3. **Documentação**: Relatórios servem como knowledge base
4. **Onboarding**: Novos devs aprendem padrões via auditorias
5. **Manutenibilidade**: Centralização facilita updates
6. **Independência**: Funciona com qualquer IA

---

**Última atualização:** 04/02/2026
**Versão:** 1.0.0
**Autor:** Sistema Super Cartola Manager
**Licença:** Uso interno do projeto
