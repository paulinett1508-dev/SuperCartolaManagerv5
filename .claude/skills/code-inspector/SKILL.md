---
name: code-inspector
description: Senior Full-Stack Code Auditor - Especialista em Arquitetura, Segurança, Performance, Observabilidade e Qualidade de Software. Use para auditorias profundas, análise de débito técnico, code review, troubleshooting avançado, refatoração estratégica ou otimização de sistemas.
allowed-tools: Read, Grep, LS, Bash, Edit
---

# Code Inspector Skill (Senior Full-Stack Edition)

## 🎯 Missão
Garantir excelência técnica através de auditorias sistemáticas com visão holística: segurança, performance, manutenibilidade, observabilidade e resiliência.

---

## 1. 🔬 Framework de Auditoria (SPARC)

### S - Security (Segurança)
### P - Performance (Desempenho)
### A - Architecture (Arquitetura)
### R - Reliability (Confiabilidade)
### C - Code Quality (Qualidade)

Toda auditoria deve cobrir essas 5 dimensões com scores de 1-5.

---

## 2. 🛡️ Security Deep Dive

### 2.1 OWASP Top 10 Checklist (Node.js/Express)

| # | Vulnerabilidade | Regex/Busca | Severidade | Mitigação |
|---|-----------------|-------------|------------|-----------|
| A01 | Broken Access Control | Rotas sem middleware auth | 🔴 CRÍTICO | verificarAdmin, verificarParticipante |
| A02 | Cryptographic Failures | md5, sha1 para senhas | 🔴 CRÍTICO | bcrypt com salt rounds >= 10 |
| A03 | Injection | \$where, eval(), new Function | 🔴 CRÍTICO | Sanitização, prepared statements |
| A04 | Insecure Design | Sem rate limiting em auth | 🟡 ALTO | express-rate-limit |
| A05 | Security Misconfiguration | origin: '*', debug em prod | 🟡 ALTO | Helmet, CORS restrito |
| A06 | Vulnerable Components | npm audit --json | 🟡 ALTO | Dependabot, audits regulares |
| A07 | Auth Failures | Sessão sem httpOnly/secure | 🔴 CRÍTICO | Cookie flags corretas |
| A08 | Data Integrity | Sem validação de schema | 🟡 MÉDIO | Joi, Zod, express-validator |
| A09 | Logging Failures | Dados sensíveis em logs | 🟡 MÉDIO | Sanitizar PII |
| A10 | SSRF | fetch com URL user-controlled | 🔴 CRÍTICO | Whitelist de URLs |

### 2.2 Análise de Autenticação/Autorização

\`\`\`bash
# Rotas POST/PUT/DELETE sem middleware de auth
grep -rn "router\.\(post\|put\|delete\|patch\)" routes/ | grep -v "verificar"

# Sessões sem flags de segurança
grep -rn "cookie:" config/ | grep -v "httpOnly\|secure\|sameSite"

# Secrets expostos
grep -rn "password\s*[:=]\s*['\"][^'\"]*['\"]" --include="*.js" | grep -v "process\.env\|\.example"
\`\`\`

### 2.3 MongoDB Injection Patterns

\`\`\`javascript
// 🔴 VULNERÁVEL: Query operator injection
const user = await User.findOne({ email: req.body.email }); // Se email = {"$gt": ""}

// 🟢 SEGURO: Sanitização
const email = String(req.body.email).toLowerCase().trim();
const user = await User.findOne({ email });

// 🔴 VULNERÁVEL: $where (executa JS no servidor)
db.collection.find({ $where: "this.name == '" + userInput + "'" });

// 🟢 SEGURO: Usar operadores nativos
db.collection.find({ name: sanitizedInput });
\`\`\`

### 2.4 Checklist de Segurança deste Projeto

| Item | Status | Arquivo de Referência |
|------|--------|----------------------|
| Rate limiting em login | Verificar | routes/admin-auth-routes.js |
| CSRF protection | Verificar | index.js (csurf) |
| Helmet headers | Verificar | index.js |
| Session segura | Verificar | config/replit-auth.js |
| Sanitização de inputs | Verificar | Controllers |
| Multi-tenant isolation | Verificar | Todas queries com liga_id |

---

## 3. ⚡ Performance Engineering

### 3.1 Database Performance

#### N+1 Query Detection
\`\`\`bash
# Encontrar loops com queries
grep -rn "for.*await\|forEach.*await\|\.map.*await" controllers/ --include="*.js"

# Queries sem .lean()
grep -rn "find\|findOne" controllers/ | grep -v "\.lean()"
\`\`\`

#### Otimizações MongoDB

| Anti-Pattern | Impacto | Solução |
|--------------|---------|---------|
| N+1 Queries | 100x mais lento | \$in, \$lookup, bulk |
| Sem .lean() | 5x mais memória | Adicionar .lean() em reads |
| Sem índices | Scan completo | createIndex em campos filtrados |
| Select * | I/O desnecessário | .select('campo1 campo2') |
| Sort sem índice | In-memory sort | Índice composto incluindo sort |
| Skip grande | Lento em paginação | Cursor-based pagination |

#### Query Analysis
\`\`\`javascript
// Habilitar profiling temporário
db.setProfilingLevel(1, { slowms: 100 });

// Ver queries lentas
db.system.profile.find().sort({ ts: -1 }).limit(10);

// Explain de query suspeita
db.collection.find({ campo: valor }).explain("executionStats");
\`\`\`

### 3.2 Node.js Performance

#### Event Loop Blocking
\`\`\`bash
# Operações síncronas que bloqueiam
grep -rn "readFileSync\|writeFileSync\|execSync" --include="*.js" | grep -v "node_modules"

# JSON.parse em payloads grandes sem stream
grep -rn "JSON\.parse" controllers/ services/
\`\`\`

#### Memory Leaks Patterns
\`\`\`javascript
// 🔴 LEAK: Listeners acumulando
emitter.on('event', handler); // Sem removeListener

// 🔴 LEAK: Closures retendo referências
const cache = {};
function process(data) {
  cache[data.id] = data; // Cresce infinitamente
}

// 🔴 LEAK: Timers não limpos
setInterval(() => {}, 1000); // Sem clearInterval

// 🟢 SOLUÇÃO: WeakMap para cache
const cache = new WeakMap();
\`\`\`

### 3.3 Frontend Performance

| Métrica | Target | Como Medir |
|---------|--------|------------|
| FCP (First Contentful Paint) | < 1.8s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| TTI (Time to Interactive) | < 3.8s | Lighthouse |

#### Checklist Frontend
\`\`\`bash
# Bundles grandes
find public/js -name "*.js" -size +100k

# Imagens não otimizadas
find public -name "*.png" -o -name "*.jpg" | xargs ls -lh 2>/dev/null

# Requests sem cache headers
grep -rn "res\.json\|res\.send" routes/ | grep -v "Cache-Control"
\`\`\`

---

## 4. 🏗️ Architecture Analysis

### 4.1 SOLID Principles Check

| Princípio | Violação Comum | Como Detectar |
|-----------|----------------|---------------|
| **S**ingle Responsibility | Controller com lógica de negócio | Arquivo > 300 linhas |
| **O**pen/Closed | Switch/case crescendo | switch.*case em múltiplos lugares |
| **L**iskov Substitution | Herança quebrada | Override que muda comportamento |
| **I**nterface Segregation | Models muito grandes | Schema > 50 campos |
| **D**ependency Inversion | Import direto de implementação | Sem camada de abstração |

### 4.2 Layer Violations

\`\`\`
✅ CORRETO:
Route → Controller → Service → Model → Database

❌ VIOLAÇÃO:
Route → Database (skip controller/service)
Controller → Database (skip model)
Frontend → Database (exposição direta)
\`\`\`

\`\`\`bash
# Routes acessando Model diretamente (pular controller)
grep -rn "import.*from.*models" routes/

# Controllers com lógica que deveria estar em Service
grep -rn "\.aggregate\|\.bulkWrite" controllers/
\`\`\`

### 4.3 Arquitetura Multi-Tenant (Crítico neste Projeto)

\`\`\`bash
# TODAS as queries devem filtrar por liga_id
# Buscar queries sem filtro de tenant
grep -rn "\.find({" controllers/ | grep -v "liga_id\|ligaId"
\`\`\`

| Camada | Responsabilidade | Validação |
|--------|------------------|-----------|
| Route | Extrair ligaId dos params | req.params.ligaId |
| Middleware | Injetar liga_id no req | tenantFilter.js |
| Controller | Sempre passar para Service | Não assumir default |
| Model | Índice composto com liga_id | Verificar schema |

---

## 5. 🔄 Reliability & Resilience

### 5.1 Error Handling Patterns

\`\`\`javascript
// 🔴 RUIM: Engolir erros
try { await operation(); } catch (e) { }

// 🔴 RUIM: Throw genérico
throw new Error('Erro');

// 🟢 BOM: Error handling completo
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error('[MODULE] Operation failed', { 
    error: error.message,
    context: { userId, ligaId }
  });
  
  if (error instanceof ValidationError) {
    throw new AppError('Dados inválidos', 400, 'VALIDATION_ERROR');
  }
  throw new AppError('Erro interno', 500, 'INTERNAL_ERROR');
}
\`\`\`

### 5.2 Graceful Degradation

\`\`\`bash
# Operações sem timeout
grep -rn "await.*fetch\|await.*axios" --include="*.js" | grep -v "timeout"

# Sem circuit breaker em integrações externas
grep -rn "cartolaApi\|fetch.*cartola" services/
\`\`\`

### 5.3 Idempotency Check

\`\`\`javascript
// Operações financeiras DEVEM ser idempotentes
// Padrão correto:
const existing = await Collection.findOne({ 
  uniqueKey: operationId,
  liga_id: ligaId 
});
if (existing) {
  return { success: true, message: 'Já processado', idempotent: true };
}
\`\`\`

### 5.4 Retry & Backoff

\`\`\`javascript
// Para integrações externas (Cartola API)
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, timeout: 5000 });
      if (response.ok) return response;
      
      if (response.status >= 500 && attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        continue;
      }
      throw new Error(\`HTTP \${response.status}\`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
\`\`\`

---

## 6. 📊 Observability (Logs, Metrics, Tracing)

### 6.1 Logging Best Practices

| Level | Quando Usar | Exemplo |
|-------|-------------|---------|
| error | Falhas que precisam ação | DB connection failed |
| warn | Situações anômalas | Rate limit approaching |
| info | Eventos de negócio | Participante inscrito |
| debug | Troubleshooting | Query params recebidos |

\`\`\`javascript
// 🔴 RUIM
console.log('erro', error);

// 🟢 BOM - Structured logging
console.error('[FLUXO-FINANCEIRO] Falha ao calcular saldo', {
  ligaId,
  timeId,
  temporada,
  error: error.message
});
\`\`\`

### 6.2 Audit Trail (Operações Sensíveis)

\`\`\`javascript
// Toda operação financeira deve ser logada
await AuditLog.create({
  action: 'ACERTO_FINANCEIRO',
  actor: req.session?.admin?.email || 'system',
  target: { ligaId, timeId },
  payload: { valor, tipo, descricao },
  ip: req.ip,
  timestamp: new Date()
});
\`\`\`

### 6.3 Health Checks

\`\`\`javascript
// Endpoint de health para monitoramento
router.get('/health', async (req, res) => {
  const checks = {
    database: await checkMongoDB(),
    cartolaApi: await checkCartolaAPI(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
});
\`\`\`

---

## 7. 🧹 Code Quality & Technical Debt

### 7.1 Code Smells Severity Matrix

| Smell | Severidade | Threshold | Ação |
|-------|------------|-----------|------|
| Função > 50 linhas | 🟡 Médio | 50 LOC | Extrair funções |
| Arquivo > 500 linhas | 🟡 Médio | 500 LOC | Dividir módulo |
| Cyclomatic complexity > 10 | 🔴 Alto | 10 | Simplificar lógica |
| Duplicação > 10 linhas | 🟡 Médio | 10 LOC | Extrair função |
| Nesting > 4 níveis | 🟡 Médio | 4 | Early return |
| Parâmetros > 5 | 🟡 Médio | 5 | Object parameter |
| TODO/FIXME antigo | 🟢 Baixo | 30 dias | Resolver ou remover |

### 7.2 Dead Code Detection

\`\`\`bash
# Código comentado
grep -rn "^\s*//.*function\|^\s*//.*const\|^\s*//.*let" --include="*.js"

# Console.logs esquecidos
grep -rn "console\.log" controllers/ routes/ services/ --include="*.js"

# TODOs e FIXMEs
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.js"
\`\`\`

### 7.3 Dependency Health

\`\`\`bash
# Pacotes desatualizados
npm outdated

# Vulnerabilidades
npm audit

# Dependências não utilizadas
npx depcheck
\`\`\`

### 7.4 Refactoring Priorities (Quadrant)

\`\`\`
                    IMPACTO ALTO
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    │   QUICK WINS       │    MAJOR PROJECTS  │
    │   (Fazer agora)    │    (Planejar)      │
    │                    │                    │
────┼────────────────────┼────────────────────┼──── ESFORÇO
    │                    │                    │
    │   FILL-INS         │    THANKLESS       │
    │   (Tempo livre)    │    (Evitar)        │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                    IMPACTO BAIXO
\`\`\`

---

## 8. 🧪 Testing Coverage

### 8.1 Test Strategy Matrix

| Tipo | Cobertura Ideal | Foco |
|------|-----------------|------|
| Unit | 80%+ | Services, Utils |
| Integration | 60%+ | Controllers, Routes |
| E2E | Fluxos críticos | Login, Pagamentos |
| Contract | APIs externas | Cartola API |

### 8.2 Verificar Cobertura de Testes

\`\`\`bash
# Rodar testes com coverage
npm test -- --coverage

# Verificar arquivos sem testes
find controllers services -name "*.js" | while read f; do
  testfile="tests/\$(basename \$f .js).test.js"
  if [ ! -f "\$testfile" ]; then
    echo "Sem teste: \$f"
  fi
done
\`\`\`

### 8.3 Test Smells

| Smell | Problema | Solução |
|-------|----------|---------|
| Teste > 50 linhas | Difícil manutenção | Dividir em cenários |
| Muitos mocks | Acoplamento | Refatorar código |
| Teste flaky | Dependência externa | Isolar com mocks |
| Sleep em teste | Lento e frágil | Usar eventos/promises |
| Sem assertions | Teste inútil | Verificar retorno |

---

## 9. 🛠️ Comandos de Diagnóstico Avançado

### 9.1 Análise Completa

\`\`\`bash
# Script de auditoria rápida
echo "=== AUDITORIA DE CÓDIGO ===" 
echo ""
echo "📊 MÉTRICAS GERAIS"
echo "Arquivos JS: \$(find . -name '*.js' ! -path './node_modules/*' | wc -l)"
echo "Linhas totais: \$(find . -name '*.js' ! -path './node_modules/*' -exec cat {} \; | wc -l)"
echo ""
echo "🔴 SEGURANÇA"
echo "Rotas sem auth:" 
grep -rn "router\.\(post\|put\|delete\)" routes/ 2>/dev/null | grep -v "verificar" | wc -l
echo ""
echo "⚡ PERFORMANCE"
echo "Queries sem .lean():"
grep -rn "\.find\|\.findOne" controllers/ 2>/dev/null | grep -v "\.lean()" | wc -l
echo ""
echo "🧹 QUALIDADE"
echo "Console.logs:"
grep -rn "console\.log" controllers/ routes/ services/ 2>/dev/null | wc -l
echo "TODOs/FIXMEs:"
grep -rn "TODO\|FIXME" --include="*.js" 2>/dev/null | wc -l
\`\`\`

### 9.2 Busca por Padrões Específicos deste Projeto

\`\`\`bash
# Inconsistência de tipos (liga_id String vs ObjectId)
grep -rn "liga_id.*String\|String.*liga_id" controllers/ routes/

# Queries multi-tenant sem filtro
grep -rn "\.find({" controllers/ | grep -v "liga_id\|ligaId"

# Cache sem invalidação
grep -rn "\.findOneAndUpdate\|\.updateMany" controllers/ | grep -v "invalidar\|limpar.*cache"

# Temporada hardcoded
grep -rn "temporada.*2025\|temporada.*2026" controllers/ routes/ | grep -v "CURRENT_SEASON"
\`\`\`

---

## 10. 📋 Templates de Relatório

### 10.1 Relatório Executivo (SPARC)

\`\`\`markdown
# 📊 Auditoria de Código - [Módulo/Sistema]

**Data:** YYYY-MM-DD
**Auditor:** Code Inspector
**Escopo:** [Arquivos analisados]

## Scores SPARC

| Dimensão | Score | Status |
|----------|-------|--------|
| 🛡️ Security | X/5 | 🟢🟡🔴 |
| ⚡ Performance | X/5 | 🟢🟡🔴 |
| 🏗️ Architecture | X/5 | 🟢🟡🔴 |
| 🔄 Reliability | X/5 | 🟢🟡🔴 |
| 🧹 Code Quality | X/5 | 🟢🟡🔴 |
| **TOTAL** | **X/25** | |

## Achados Críticos (Bloqueia Deploy)
1. [Descrição] - Arquivo:Linha

## Achados Importantes (Resolver em 48h)
1. [Descrição] - Arquivo:Linha

## Débito Técnico Identificado
| Item | Esforço | Impacto | Prioridade |
|------|---------|---------|------------|
| ... | S/M/L | Alto/Médio/Baixo | P1/P2/P3 |

## Recomendações
1. [Ação específica]
2. [Ação específica]
\`\`\`

### 10.2 Pull Request Review Template

\`\`\`markdown
## Code Review: PR #XXX

### ✅ Aprovado | 🔄 Mudanças Necessárias | ❌ Rejeitado

### Checklist
- [ ] Sem vulnerabilidades de segurança
- [ ] Performance adequada
- [ ] Testes incluídos
- [ ] Multi-tenant respeitado
- [ ] Error handling completo

### Comentários por Arquivo
**arquivo.js**
- L42: [Comentário]
\`\`\`

---

## 11. 🔧 Workflow de Correção (Senior)

### Antes de Corrigir
1. **Entender impacto** - Quem consome esse código?
2. **Verificar testes** - Existem? Vão quebrar?
3. **Avaliar rollback** - Como reverter se der errado?

### Durante a Correção
1. **Branch específica** - fix/security-auth-middleware
2. **Commits atômicos** - Um commit por mudança lógica
3. **Manter backward compat** - Não quebrar contratos

### Após Corrigir
1. **Testar localmente** - npm test && npm run dev
2. **Validar em staging** - Se disponível
3. **Monitorar após deploy** - Logs, métricas

### Commit Message Convention
\`\`\`
<type>(<scope>): <description>

Tipos: fix, feat, refactor, perf, security, docs, test, chore
Escopo: auth, financeiro, participante, liga, cache, etc.

Exemplo:
fix(security): adicionar verificarAdmin em rotas de escrita
\`\`\`

---

## 12. 🚨 Incident Response

### Quando Encontrar Vulnerabilidade Crítica

1. **NÃO commitar a fix publicamente** (se for security)
2. **Avaliar exposição** - Já foi explorada?
3. **Patch temporário** - Rate limit, WAF, disable feature
4. **Fix definitivo** - Em branch privada
5. **Deploy rápido** - Fora do ciclo normal se necessário
6. **Post-mortem** - Documentar e prevenir recorrência

### Escalation Matrix

| Severidade | Tempo de Resposta | Ação |
|------------|-------------------|------|
| 🔴 Crítico | Imediato | Notificar + Fix urgente |
| 🟡 Alto | 4 horas | Priorizar sprint |
| 🟢 Médio | 24 horas | Backlog priorizado |
| ⚪ Baixo | Sprint seguinte | Backlog normal |
