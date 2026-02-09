---
name: context7-monthly-audit
description: Auditoria mensal automatizada usando Context7 MCP. Verifica mudanças na API Cartola FC, atualizações de segurança OWASP, deprecations em Mongoose/Express e novos padrões de PWA. Gera relatório com ações preventivas antes de bugs acontecerem.
allowed-tools: Read, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Context7 Monthly Audit Skill

## 🎯 Missão
Executar auditoria mensal preventiva usando Context7 MCP para detectar:
- 🔴 Mudanças críticas na API Cartola FC
- 🟠 Atualizações de segurança (OWASP Top 10)
- 🟡 Deprecations em dependências (Mongoose, Express)
- 🟢 Novos padrões de PWA/Service Workers

**Objetivo:** Prevenir bugs em produção através de monitoramento proativo.

---

## 📅 Quando Executar

### Automático (Recomendado)
```bash
# Cron job mensal (dia 1 de cada mês)
0 9 1 * * cd /home/user/SuperCartolaManagerv5 && node scripts/monthly-audit.js

# Ou via GitHub Actions (se migrar do Replit)
# .github/workflows/monthly-audit.yml
```

### Manual (Gatilhos)
- 🚨 **Antes de cada temporada do Cartola** (janeiro/fevereiro)
- 🚨 **Após release de versão major de dependência** (Mongoose 8.x, Express 5.x)
- 🚨 **Quando novo CVE crítico surge** (ex: OWASP Top 10 atualizado)
- 🚨 **A cada 30 dias** (mínimo)

---

## 🔍 AUDITORIA 1: API Cartola FC

### Objetivo
Detectar mudanças em endpoints da API não-documentada do Cartola FC.

### Protocolo

**PASSO 1: Buscar Library ID dos Repositórios Comunitários**
```javascript
// Repositório principal: henriquepgomide/caRtola (R package)
const cartolaLibraryId = await mcp__context7__resolve_library_id({
  libraryName: "caRtola",
  query: "Documentação da API do Cartola FC, endpoints de mercado e atletas"
});

// Alternativo: vitoravelino/cartola-sdk (Python)
const cartolaSDKLibraryId = await mcp__context7__resolve_library_id({
  libraryName: "cartola-sdk",
  query: "Python SDK para API Cartola FC, endpoints atualizados"
});
```

**PASSO 2: Auditar Endpoints Críticos**

Lista de endpoints usados no projeto (priorizar):
```javascript
const endpointsCriticos = [
  "/atletas/mercado",           // services/cartolaApiService.js:45
  "/atletas/pontuados",         // services/cartolaApiService.js:78
  "/mercado/status",            // services/cartolaApiService.js:120
  "/partidas/{rodada}",         // services/cartolaApiService.js:156
  "/auth/time/info",            // services/cartolaApiService.js:203
];

for (const endpoint of endpointsCriticos) {
  const docs = await mcp__context7__query_docs({
    libraryId: cartolaLibraryId,
    query: `Endpoint ${endpoint}: estrutura JSON, parâmetros obrigatórios, mudanças recentes em 2026`
  });

  // Comparar com código atual
  // Se diferente → FLAG para revisão
}
```

**PASSO 3: Gerar Relatório**
```markdown
## 🔴 API CARTOLA FC - MUDANÇAS DETECTADAS

### ⚠️ CRÍTICO: Endpoint /atletas/mercado
- **Status:** Deprecated em 2026-01-15
- **Novo endpoint:** /atletas/mercado/v2
- **Breaking change:** Campo `pontos_num` renomeado para `pontuacao`
- **Arquivo afetado:** `services/cartolaApiService.js:45`
- **Ação requerida:** Migrar antes de 2026-03-01

### ✅ OK: Endpoint /mercado/status
- **Status:** Sem mudanças
- **Última verificação:** 2026-02-09
```

---

## 🔍 AUDITORIA 2: OWASP Security

### Objetivo
Verificar se configurações de segurança seguem OWASP Top 10 atualizado.

### Protocolo

**PASSO 1: Buscar OWASP Top 10 Atualizado**
```javascript
const owaspLibraryId = await mcp__context7__resolve_library_id({
  libraryName: "owasp-top-ten",
  query: "OWASP Top 10 2025-2026, vulnerabilidades web mais críticas"
});

const owaspDocs = await mcp__context7__query_docs({
  libraryId: owaspLibraryId,
  query: "Top 10 vulnerabilidades web 2026, recomendações para Node.js e Express"
});
```

**PASSO 2: Auditar Arquivos de Segurança**
```javascript
// Arquivos para verificar:
const securityFiles = [
  "middleware/security.js",      // Helmet.js config
  "middleware/authMiddleware.js", // JWT validation
  "controllers/authController.js" // Password hashing
];

// Checks específicos:
const checksOWASP = [
  {
    vulnerabilidade: "A01:2021 – Broken Access Control",
    verificar: "authMiddleware verifica autorização em TODAS as rotas sensíveis?",
    arquivo: "middleware/authMiddleware.js"
  },
  {
    vulnerabilidade: "A02:2021 – Cryptographic Failures",
    verificar: "Senhas usam bcrypt com salt >= 10?",
    arquivo: "controllers/authController.js"
  },
  {
    vulnerabilidade: "A03:2021 – Injection",
    verificar: "Queries MongoDB usam sanitização?",
    arquivo: "models/*.js"
  },
  {
    vulnerabilidade: "A05:2021 – Security Misconfiguration",
    verificar: "Helmet.js atualizado? CSP configurado?",
    arquivo: "middleware/security.js"
  }
];
```

**PASSO 3: Comparar com Best Practices**
```javascript
// Para cada vulnerabilidade, buscar recomendações
for (const check of checksOWASP) {
  const helmetDocs = await mcp__context7__query_docs({
    libraryId: "/helmetjs/helmet",
    query: `Configuração recomendada de ${check.vulnerabilidade} para PWA com service worker`
  });

  // Ler arquivo atual
  const conteudoAtual = await Read(check.arquivo);

  // Comparar padrões (manual ou com regex)
  // FLAG se divergir das recomendações
}
```

**PASSO 4: Gerar Relatório**
```markdown
## 🛡️ OWASP SECURITY AUDIT

### ⚠️ VULNERABILIDADE DETECTADA: A05 - Security Misconfiguration
- **Arquivo:** `middleware/security.js:15`
- **Problema:** CSP não bloqueia `unsafe-inline` em scripts
- **Recomendação OWASP 2026:** Usar nonces ou hashes para scripts inline
- **Fix sugerido:**
  ```javascript
  helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: ["'self'", "'nonce-{random}'"]  // Em vez de 'unsafe-inline'
    }
  })
  ```

### ✅ OK: A02 - Cryptographic Failures
- **Arquivo:** `controllers/authController.js:34`
- **Status:** bcrypt com salt=12 (recomendado >= 10) ✅
```

---

## 🔍 AUDITORIA 3: Mongoose/Express Deprecations

### Objetivo
Detectar uso de métodos deprecated antes de upgrade.

### Protocolo

**PASSO 1: Buscar Deprecations da Versão Instalada**
```javascript
// Ler versão atual
const packageJson = await Read("package.json");
const mongooseVersion = packageJson.dependencies.mongoose; // "^7.6.1"

// Buscar deprecations
const mongooseLibraryId = await mcp__context7__resolve_library_id({
  libraryName: "mongoose",
  query: "Mongoose 7.x deprecated methods, migration guide to 8.x"
});

const deprecations = await mcp__context7__query_docs({
  libraryId: mongooseLibraryId,
  query: "Lista de métodos deprecated no Mongoose 7.6 e suas substituições no Mongoose 8.x"
});
```

**PASSO 2: Buscar Padrões Deprecated no Código**
```bash
# Grep por padrões conhecidos (atualizar com output do Context7)
grep -r "Model.collection.dropIndexes" models/
grep -r "update({" models/                    # Deprecated: usar updateOne/updateMany
grep -r "remove({" models/                    # Deprecated: usar deleteOne/deleteMany
grep -r "findOneAndRemove" controllers/       # Deprecated: usar findOneAndDelete
```

**PASSO 3: Gerar Relatório**
```markdown
## ⚙️ MONGOOSE DEPRECATIONS

### 🟡 DEPRECATED: Model.collection.dropIndexes()
- **Localização:** `index.js:87`
- **Código atual:**
  ```javascript
  await Time.collection.dropIndexes();
  ```
- **Substituição (Mongoose 8.x):**
  ```javascript
  await Time.syncIndexes({ dropIndexes: true });
  ```
- **Urgência:** Baixa (funciona até Mongoose 9.x)

### 🟢 OK: Sem uso de update(), remove(), findOneAndRemove()
```

---

## 🔍 AUDITORIA 4: PWA & Service Workers

### Objetivo
Verificar se service worker segue padrões modernos (importante para push notifications planejadas).

### Protocolo

**PASSO 1: Buscar Padrões Modernos de PWA**
```javascript
const mdnLibraryId = await mcp__context7__resolve_library_id({
  libraryName: "mdn-web-docs",
  query: "Service Worker API, Web Push API, best practices 2026"
});

const swBestPractices = await mcp__context7__query_docs({
  libraryId: mdnLibraryId,
  query: "Service worker caching strategies 2026, workbox vs manual, push notifications setup"
});
```

**PASSO 2: Auditar Service Worker Atual**
```javascript
// Ler service worker
const swContent = await Read("public/service-worker.js");

// Checks:
const pwChecks = [
  "Usa Workbox ou caching manual?",
  "Strategy de cache: CacheFirst, NetworkFirst, StaleWhileRevalidate?",
  "Possui listener para 'push' event?",
  "Possui listener para 'notificationclick' event?",
  "Cache versioning implementado?",
  "Cleanup de caches antigas?"
];
```

**PASSO 3: Gerar Relatório**
```markdown
## 📱 PWA & SERVICE WORKER AUDIT

### 🟡 RECOMENDAÇÃO: Migrar para Workbox
- **Situação atual:** Caching manual em `public/service-worker.js`
- **Padrão moderno (MDN 2026):** Usar Workbox para gerenciamento de cache
- **Benefícios:**
  - Menor código boilerplate (50+ linhas → 10 linhas)
  - Strategies prontas (CacheFirst, NetworkFirst)
  - Melhor debugging
- **Exemplo:**
  ```javascript
  import { precacheAndRoute } from 'workbox-precaching';
  import { registerRoute } from 'workbox-routing';
  import { CacheFirst } from 'workbox-strategies';

  // Precache de assets estáticos
  precacheAndRoute(self.__WB_MANIFEST);

  // API com NetworkFirst
  registerRoute(
    ({url}) => url.pathname.startsWith('/api/'),
    new NetworkFirst()
  );
  ```

### ✅ OK: Push notifications não implementadas ainda
- **Status:** Planejado no BACKLOG.md (FEAT-042)
- **Próximo passo:** Seguir guia do MDN ao implementar
```

---

## 📊 FORMATO DO RELATÓRIO FINAL

Gerar arquivo: `.claude/docs/AUDIT-MONTHLY-{YYYY-MM}.md`

### Template
```markdown
# 🔍 AUDITORIA MENSAL - {MÊS}/{ANO}

**Data:** {YYYY-MM-DD}
**Executado por:** Context7 Monthly Audit Skill
**Próxima auditoria:** {YYYY-MM-DD + 30 dias}

---

## 📋 SUMÁRIO EXECUTIVO

| Categoria | Status | Issues Críticas | Issues Médias | Issues Baixas |
|-----------|--------|-----------------|---------------|---------------|
| API Cartola FC | 🔴 CRÍTICO | 1 | 0 | 2 |
| OWASP Security | 🟡 ATENÇÃO | 0 | 1 | 0 |
| Mongoose Deprecations | 🟢 OK | 0 | 0 | 3 |
| PWA/Service Worker | 🟢 OK | 0 | 0 | 1 |

**TOTAL:** 1 crítica, 1 média, 6 baixas

---

## 🔴 AÇÕES URGENTES (Próximos 7 dias)

1. **[API-001] Migrar endpoint /atletas/mercado → /atletas/mercado/v2**
   - Arquivo: `services/cartolaApiService.js:45`
   - Prazo: 2026-03-01 (21 dias restantes)
   - Breaking change: Campo `pontos_num` → `pontuacao`

---

## 🟡 AÇÕES RECOMENDADAS (Próximos 30 dias)

1. **[SEC-001] Atualizar CSP para bloquear unsafe-inline**
   - Arquivo: `middleware/security.js:15`
   - OWASP: A05 - Security Misconfiguration
   - Impacto: Baixo (apenas melhoria de segurança)

---

## 🟢 BACKLOG (Considerar em Q2/Q3 2026)

1. **[MONGOOSE-001] Planejar migração Mongoose 7.x → 8.x**
   - 3 métodos deprecated encontrados
   - Breaking changes: Mínimos
   - ROI: Suporte long-term

2. **[PWA-001] Migrar service worker para Workbox**
   - Reduz 50+ linhas de código
   - Melhora manutenibilidade

---

## 📚 RECURSOS CONSULTADOS

- Context7: `/henriquepgomide/caRtola` (API Cartola FC)
- Context7: `/owasp/top-ten` (OWASP Top 10 2026)
- Context7: `/mongoosejs/mongoose` (Mongoose 7.x → 8.x)
- Context7: `/mdn/web-docs` (Service Worker API)

---

**Arquivo gerado automaticamente por:** `context7-monthly-audit` skill
**Próxima execução:** {YYYY-MM-DD + 30 dias}
```

---

## 🔧 IMPLEMENTAÇÃO

### Script Automatizado

Criar: `scripts/monthly-audit.js`

```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Script de auditoria mensal usando Context7 MCP
 * Executa: node scripts/monthly-audit.js
 */

async function runMonthlyAudit() {
  console.log('🔍 Iniciando auditoria mensal...\n');

  const today = new Date();
  const reportFile = `.claude/docs/AUDIT-MONTHLY-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}.md`;

  console.log('📅 Data:', today.toISOString().split('T')[0]);
  console.log('📄 Relatório será salvo em:', reportFile);
  console.log('');

  // Simular chamada à skill (em produção, seria via Claude API)
  console.log('⚠️  NOTA: Este script requer execução via Claude Code');
  console.log('Para executar a auditoria completa, use:');
  console.log('');
  console.log('  /context7-monthly-audit');
  console.log('');
  console.log('Ou via keywords naturais:');
  console.log('  "Executar auditoria mensal do Context7"');
  console.log('');

  // Placeholder para futuro (quando tiver API da skill)
  // const result = await executeSkill('context7-monthly-audit');
  // fs.writeFileSync(reportFile, result.markdown);

  process.exit(0);
}

runMonthlyAudit();
```

### Cron Job (Opcional)

```bash
# Executar dia 1 de cada mês às 9h
# crontab -e
0 9 1 * * cd /home/user/SuperCartolaManagerv5 && /usr/bin/node scripts/monthly-audit.js >> logs/monthly-audit.log 2>&1
```

---

## 🎯 KEYWORDS DE ATIVAÇÃO

Esta skill é ativada automaticamente por:
- "auditoria mensal"
- "auditar context7"
- "verificar mudanças api cartola"
- "check owasp"
- "verificar deprecations"
- "context7 audit"

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Baseline (Sem Skill) | Meta (Com Skill) |
|---------|---------------------|------------------|
| Bugs de API em produção | 2-3/temporada | 0-1/temporada |
| Tempo de debug de API | 5h/bug | 2h/bug |
| Vulnerabilidades detectadas pós-deploy | 3-5/ano | 0-1/ano |
| Tempo de pesquisa pré-upgrade | 3h | 30min |
| Breaking changes não detectados | 2-3/upgrade | 0/upgrade |

**ROI Estimado:** **40-60 horas/ano economizadas**

---

## 🔄 HISTÓRICO DE EXECUÇÕES

Manter log de execuções em: `.claude/monthly-audit-history.json`

```json
{
  "audits": [
    {
      "date": "2026-02-01",
      "status": "completed",
      "duration_seconds": 127,
      "issues_found": {
        "critical": 1,
        "medium": 1,
        "low": 6
      },
      "report_file": ".claude/docs/AUDIT-MONTHLY-2026-02.md"
    }
  ]
}
```

---

## 📝 NOTAS FINAIS

- Esta skill **NÃO faz mudanças no código**, apenas gera relatórios
- Decisões de implementação ficam com o desenvolvedor
- Útil para planejar sprints (priorizar fixes antes de bugs)
- Complementa (não substitui) testes automatizados

---

**Criado em:** 2026-02-09
**Baseado em:** Context7 MCP + CLAUDE.md (seção MCPs)
**Próxima revisão:** 2026-03-09
