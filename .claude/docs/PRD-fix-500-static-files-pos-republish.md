# PRD - Fix HTTP 500 em Arquivos Estáticos Pós-Republish

**Data:** 2026-01-30
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Severidade:** 🔴 CRÍTICO (sistema 100% inoperante após Publish)

---

## Resumo Executivo

Após executar "Republish" no Replit, **todos os arquivos estáticos** (`.js`, `.css`) retornam HTTP 500, quebrando completamente tanto o painel admin quanto o app do participante. A causa raiz é uma combinação de **middleware chain mal ordenado** e **race condition na conexão MongoDB**.

O `express.static("public")` está na posição 13 do middleware chain — ou seja, toda request de arquivo estático (JS, CSS, imagens) precisa passar por session/MongoStore/Passport ANTES de ser servida. Se o MongoDB não está pronto ou se algum middleware falha, o arquivo estático retorna 500 em vez de ser servido normalmente.

---

## Contexto e Análise

### Erro Reportado
```
gerenciar-ligas.js:1   Failed to load resource: the server responded with a status of 500 ()
cache-manager.js:1     Failed to load resource: the server responded with a status of 500 ()
painel.html:1  Uncaught (in promise) Error: A listener indicated an asynchronous response...
```

### Ambiente
- **Dev:** `npm dev` → `NODE_ENV=development` → CORS aberto, logs visíveis
- **Publish:** `npm start` → `NODE_ENV=production` → CORS restrito, logs silenciados

### Módulos Identificados

**Backend (Causa Raiz):**
- `index.js` - Middleware chain ordering (linhas 197-413)
- `middleware/auth.js` - `protegerRotas` + `ROTAS_PUBLICAS`
- `middleware/security.js` - Rate limiting + security headers
- `config/database.js` - `connectDB()` async sem await
- `config/replit-auth.js` - Passport setup

**Frontend (Afetados):**
- `public/js/gerenciar-ligas.js` - Module ES6 importado por painel.html e gerenciar.html
- `public/js/core/cache-manager.js` - Module ES6 importado por painel.html e participante/index.html
- `public/painel.html` - Admin dashboard (imports inline module)
- `public/gerenciar.html` - Gerenciar ligas (imports inline module)
- `public/participante/index.html` - App participante (multiple scripts)

### Dependências Mapeadas

**Imports de gerenciar-ligas.js:**
- `public/painel.html` → `import { carregarLigas } from "./js/gerenciar-ligas.js"`
- `public/gerenciar.html` → `import { carregarLigas, deletarLiga } from "./js/gerenciar-ligas.js"`

**Imports de cache-manager.js:**
- `public/painel.html` → `import { cacheManager } from "./js/core/cache-manager.js"`
- `public/participante/index.html` → `<script type="module" src="/js/core/cache-manager.js">`
- `public/js/rodadas/rodadas-cache.js` → `import { cacheManager } from "../core/cache-manager.js"`
- `public/js/mata-mata/mata-mata-orquestrador.js` → `import { cacheManager } from "../core/cache-manager.js"`
- `public/js/fluxo-financeiro/fluxo-financeiro-cache.js` → `import { cacheManager } from "../core/cache-manager.js"`

---

## Diagnóstico: Causas Raiz (3)

### CAUSA 1: Middleware Chain Ordering (PRINCIPAL)
**Arquivo:** `index.js`

O `express.static("public")` está registrado na **posição 13** do middleware chain. Toda request de arquivo estático passa por:

```
Request: GET /js/gerenciar-ligas.js
  ↓
1.  securityHeaders          (linha 202/255)
2.  sanitizeInput            (linha 202/256)
3.  securityLogger           (linha 202/257)
4.  rateLimiter              (linha 202/258) ← skipa .js via regex
5.  compression              (linha 210)
6.  express.json             (linha 222)
7.  express.urlencoded       (linha 223)
8.  cors                     (linha 230)
9.  HTML no-cache headers    (linha 252) ← skipa .js
10. express-session+Mongo    (linha 329) ← ⚠️ REQUER MongoDB
11. passport.initialize()    (linha 360) ← ⚠️ REQUER session
12. passport.session()       (linha 361) ← ⚠️ REQUER session
13. protegerRotas            (linha 407) ← checa isRotaPublica → next()
14. activityTracker          (linha 410) ← skipa static
15. express.static("public") (linha 413) ← FINALMENTE SERVE O ARQUIVO
```

**Problema:** Steps 10-12 (session/passport) rodam em TODA request, incluindo `.js`, `.css`, `.png`. Se MongoDB cai, está lento, ou não está pronto → **500 em TUDO**.

### CAUSA 2: Race Condition - connectDB() Não Awaited
**Arquivo:** `index.js:197`

```javascript
connectDB(); // ← NÃO TEM AWAIT! Promise flutuante
```

O servidor inicia e aceita requests ANTES do MongoDB estar conectado. O `MongoStore` usa `clientPromise` que depende de `mongoose.connection.asPromise()`. Se requests chegam antes da conexão estar pronta, MongoStore pode falhar silenciosamente.

### CAUSA 3: CORS Restritivo em Produção
**Arquivo:** `index.js:230-247`

Em desenvolvimento:
```javascript
if (IS_DEVELOPMENT) return callback(null, true); // permite TUDO
```

Em produção (após Publish):
```javascript
if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) {
  return callback(null, true);
}
// ↓ Se não bate, JOGA ERRO:
callback(new Error('Origem não permitida pelo CORS'));
```

O deployment no Replit usa domínio `.replit.app` (GCE deployment target). Este domínio **NÃO está na whitelist**. Para requests de `<script type="module">` que enviam header `Origin`, o CORS joga `Error` que é capturado pelo global error handler → **500**.

**Nota:** Requests same-origin normais não enviam `Origin`, mas `<script type="module">` usa CORS mode internamente. Se o proxy do Replit modifica headers, pode trigger o CORS.

---

## Solução Proposta

### Abordagem: Reordenar Middleware Chain + Corrigir Race Condition

#### Fix 1: Mover `express.static` ANTES de session/passport
Arquivos estáticos não precisam de session, passport, ou activity tracking. Servir antes economiza ~8 middlewares por request de arquivo estático.

**Nova ordem:**
```
1. securityHeaders
2. sanitizeInput
3. securityLogger
4. rateLimiter
5. compression
6. express.json / express.urlencoded
7. cors
8. HTML no-cache / cache busting
9. ★ express.static("public")  ← MOVER PARA AQUI
10. express-session + MongoStore
11. passport.initialize()
12. passport.session()
13. protegerRotas  ← Agora só roda em non-static requests
14. activityTracker
15. API routes
```

**Porém**, `protegerRotas` precisa rodar ANTES de `express.static` para proteger páginas admin (`.html`). A solução é criar um middleware leve que protege apenas HTMLs admin sem precisar de session.

#### Fix 2: Await connectDB() antes de app.listen()
Garantir que MongoDB está 100% conectado antes de aceitar requests.

```javascript
// ANTES (bugado):
connectDB(); // fire-and-forget
// ... setup middleware ...
app.listen(PORT);

// DEPOIS (correto):
await connectDB(); // espera conexão
// ... setup middleware ...
app.listen(PORT);
```

#### Fix 3: Adicionar `.replit.app` ao CORS
```javascript
if (origin.endsWith('.replit.dev') ||
    origin.endsWith('.repl.co') ||
    origin.endsWith('.replit.app')) {  // ← ADICIONAR
  return callback(null, true);
}
```

### Arquivos a Modificar

1. **`index.js`** - Reordenar middleware chain, await connectDB, fix CORS
2. **`middleware/auth.js`** - (Possivelmente) Ajustar `protegerRotas` para funcionar como guard leve antes de static

### Arquivos que NÃO precisam de alteração
- `public/js/gerenciar-ligas.js` - Código está correto
- `public/js/core/cache-manager.js` - Código está correto
- `middleware/security.js` - Já exclui static do rate limiting
- `config/database.js` - Lógica de conexão está correta
- `config/replit-auth.js` - Passport setup está correto

### Regras de Negócio
- **R1:** Arquivos estáticos NUNCA devem depender de MongoDB/session para serem servidos
- **R2:** Páginas admin (.html) DEVEM continuar protegidas por autenticação
- **R3:** A ordem de middleware NÃO deve quebrar funcionalidades existentes
- **R4:** O servidor NÃO deve aceitar requests antes do MongoDB estar conectado

---

## Riscos e Considerações

### Impactos Previstos
- **Positivo:** Sistema volta a funcionar após Publish
- **Positivo:** Redução de latência em ~8 middlewares para cada request estático
- **Positivo:** Maior resiliência - queda de MongoDB não derruba assets estáticos
- **Atenção:** Reordenar middleware é uma operação delicada - testar extensivamente
- **Risco:** `protegerRotas` depende de `req.session` para redirects de admin logado → precisa funcionar SEM session para static files

### Multi-Tenant
- [x] Não afeta isolamento liga_id (middleware de tenant opera apenas em API routes)

### Backward Compatibility
- A mudança é transparente para o frontend
- Nenhuma API muda
- Nenhum comportamento do usuário muda
- Apenas a ORDEM dos middlewares muda internamente

---

## Testes Necessários

### Cenários de Teste
1. **Após Republish:** Carregar painel.html → JS/CSS devem retornar 200
2. **Após Republish:** Carregar participante/ → JS/CSS devem retornar 200
3. **Admin sem login:** Acessar /painel.html → deve redirecionar para login
4. **Participante sem login:** Acessar /participante/ → deve redirecionar para login
5. **MongoDB desconectado:** Assets estáticos continuam sendo servidos (200)
6. **MongoDB desconectado:** APIs retornam erro apropriado (503)
7. **CORS em produção:** Requests do domínio .replit.app passam
8. **Rate limiting:** Continua funcionando para APIs

### Como Testar
```bash
# 1. Iniciar em modo produção localmente
cross-env NODE_ENV=production node index.js

# 2. Testar arquivos estáticos
curl -v http://localhost:5000/js/gerenciar-ligas.js
curl -v http://localhost:5000/js/core/cache-manager.js
curl -v http://localhost:5000/css/style.css

# 3. Testar proteção de rotas admin (sem session)
curl -v http://localhost:5000/painel.html  # deve redirecionar

# 4. Fazer Republish no Replit e testar no navegador
```

---

## Próximos Passos

1. ✅ Validar PRD
2. Gerar Spec: Executar `/spec` com este PRD
3. Implementar: Executar `/code` com Spec gerado

---

**Gerado por:** Pesquisa Protocol v1.0
**Diretório:** `.claude/docs/PRD-fix-500-static-files-pos-republish.md`
