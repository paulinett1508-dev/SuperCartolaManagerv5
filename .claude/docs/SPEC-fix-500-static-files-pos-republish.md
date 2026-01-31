# SPEC - Fix HTTP 500 em Arquivos Estáticos Pós-Republish

**Data:** 2026-01-30
**Baseado em:** PRD-fix-500-static-files-pos-republish.md
**Status:** Especificação Técnica

---

## Resumo da Implementação

Corrigir 3 causas raiz que fazem arquivos estáticos retornarem HTTP 500 após Republish no Replit: (1) mover `express.static` para ANTES de session/passport no middleware chain, (2) fazer `await connectDB()` antes de setup de middlewares, (3) adicionar `.replit.app` ao CORS whitelist. As mudanças são cirúrgicas no `index.js` — nenhum outro arquivo precisa ser modificado, pois o `protegerRotas` em `middleware/auth.js` já lida corretamente com a proteção de páginas admin via `PAGINAS_ADMIN` e recursos públicos via `ROTAS_PUBLICAS`.

---

## Arquivos a Modificar (Ordem de Execução)

### 1. `index.js` - Mudança Primária (3 fixes)

**Path:** `index.js`
**Tipo:** Modificação
**Impacto:** Alto
**Dependentes:** Nenhum (mudança interna de ordering)

---

#### FIX 1: Await connectDB() — Linha 197

**Problema:** `connectDB()` é chamado fire-and-forget. O servidor aceita requests antes do MongoDB estar conectado, causando falha no MongoStore da session.

**Linha 197: MODIFICAR**
```javascript
// ANTES:
connectDB();

// DEPOIS:
await connectDB();
```

**Porém**, `await` no top-level requer que o código esteja em contexto async. O `index.js` usa ESM (`import`), que suporta top-level await nativamente no Node.js 14.8+. Verificado: o arquivo usa `import` (linha 1-189) e `package.json` tem `"type": "module"`. **Top-level await é suportado.**

**Motivo:** Garantir que MongoDB está 100% conectado antes de qualquer middleware que dependa dele (MongoStore, Mongoose queries).

---

#### FIX 2: Mover express.static ANTES de session/passport — Linhas 329-413

**Problema:** `express.static("public")` está na posição 15 do middleware chain (linha 413). Todas as requests de arquivos estáticos passam por session (MongoStore) e passport, que dependem de MongoDB. Se MongoDB não está pronto → 500.

**Estratégia:** Mover `express.static` + `protegerRotas` para LOGO APÓS os middlewares que não dependem de MongoDB (após CORS/compression/body-parsers, ANTES de session/passport).

**Análise crítica do `protegerRotas` (middleware/auth.js):**

O `protegerRotas` faz:
1. `isRotaPublica(url)` → check de array, **SEM session** ✅
2. Landing page (/) → checa `req.session?.admin` com optional chaining → **falha graceful** (retorna `undefined`, segue para `next()`) ✅
3. Login participante → checa `req.session?.participante` com optional chaining → **falha graceful** ✅
4. `isPaginaAdmin(url)` → checa `req.session?.admin` → se `!req.session?.admin` → redirect para `/?error=admin_required` ✅
5. `isPaginaParticipante(url)` → checa `req.session?.participante` → redirect para login ✅
6. Demais rotas → `next()` ✅

**Conclusão:** `protegerRotas` usa `req.session?.` (optional chaining) em TODOS os pontos. Sem session, `req.session` será `undefined`, e:
- Páginas admin → redirect para login (CORRETO — não autenticado)
- Páginas participante → redirect para login (CORRETO)
- Assets estáticos (.js, .css) → match `isRotaPublica` → `next()` (CORRETO)
- Landing page → `req.session?.admin` = `undefined` → serve normalmente (CORRETO)

**`protegerRotas` FUNCIONA SEM SESSION.** Podemos movê-lo para antes do session middleware junto com `express.static`.

**O `injetarSessaoDevAdmin`** também usa `req.session?.admin` com optional chaining (linha 103). Sem session, `!req.session?.admin` = true, mas `isDev && devBypass` = false em produção. Em dev, `req.session` pode não existir mas o código faz `req.session.admin = ...` que falharia. Porém em dev o MongoDB estará conectado (await garante). **Seguro.**

**Mudança cirúrgica:**

**Linhas 404-413: MOVER bloco inteiro para ANTES da linha 329 (session)**

Nova posição: após o bloco de debug (linha 326) e ANTES do bloco de session (linha 328).

```javascript
// ANTES (linhas 404-413):
// 🛡️ MIDDLEWARE DE PROTEÇÃO DE ROTAS (antes de servir estáticos)
// ✅ Bypass de desenvolvimento: injeta sessão admin automaticamente em NODE_ENV=development
app.use(injetarSessaoDevAdmin);
app.use(protegerRotas);

// 👁️ MIDDLEWARE DE RASTREAMENTO DE ATIVIDADE (participantes)
app.use(activityTrackerMiddleware);

// Servir arquivos estáticos (Frontend)
app.use(express.static("public"));

// DEPOIS (inserir entre linha 326 e 328):
// ====================================================================
// 🛡️ SERVIR ARQUIVOS ESTÁTICOS (ANTES de session/passport)
// Assets (.js, .css, .png) NÃO precisam de session/MongoDB
// protegerRotas usa optional chaining (req.session?.) - funciona sem session
// Páginas admin sem session → redirect para login (comportamento correto)
// ====================================================================
app.use(protegerRotas);
app.use(express.static("public"));
```

**Notas:**
- `injetarSessaoDevAdmin` é REMOVIDO deste bloco pré-static. Motivo: sem session object, `req.session.admin = ...` causaria erro. Ele será mantido APÓS session/passport, antes das rotas de API.
- `activityTrackerMiddleware` é REMOVIDO deste bloco pré-static. Motivo: ele tracka atividade de participantes logados (precisa de session).

**Onde ficam `injetarSessaoDevAdmin` e `activityTrackerMiddleware`:**

Inserir APÓS passport.session() (após linha 361), ANTES das rotas de API admin (antes da linha 367):

```javascript
// Linha 361: app.use(passport.session());

// ✅ INSERIR AQUI:
// ✅ Bypass de desenvolvimento: injeta sessão admin automaticamente
app.use(injetarSessaoDevAdmin);

// 👁️ Rastreamento de atividade (requer session)
app.use(activityTrackerMiddleware);

// Linha 363 (antigo): setupReplitAuthRoutes(app);
```

---

#### FIX 3: Adicionar `.replit.app` ao CORS — Linha 237

**Problema:** Após Publish, o app roda em domínio `.replit.app` que não está na whitelist CORS. Requests com header `Origin` (como `<script type="module">`) recebem erro CORS → 500 via error handler global.

**Linha 237: MODIFICAR**
```javascript
// ANTES:
if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) {

// DEPOIS:
if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co') || origin.endsWith('.replit.app')) {
```

**Motivo:** O deployment no Replit usa domínio `.replit.app` (GCE deployment target). Sem isso, requests de origens legítimas são bloqueadas.

---

## Mapa de Dependências

```
index.js (ÚNICO arquivo modificado)
    ├── config/database.js → connectDB() [SEM MUDANÇA - já é async]
    ├── middleware/auth.js → protegerRotas, injetarSessaoDevAdmin [SEM MUDANÇA]
    │   └── Usa req.session?. (optional chaining) → funciona sem session ✅
    ├── middleware/security.js → setupSecurity [SEM MUDANÇA]
    │   └── Já exclui assets estáticos do rate limiting ✅
    └── middleware/activityTracker.js [SEM MUDANÇA - apenas reposicionado]
```

**Nenhum outro arquivo é modificado.** As 3 mudanças são todas em `index.js`.

---

## Detalhamento Linha por Linha

### Mudança 1: `await connectDB()` (linha 197)

```diff
- connectDB();
+ await connectDB();
```

### Mudança 2: Inserir bloco static ANTES de session (entre linhas 326-328)

**INSERIR após linha 326 (fim do bloco IS_DEVELOPMENT debug):**

```javascript
// ====================================================================
// 🛡️ SERVIR ARQUIVOS ESTÁTICOS (ANTES de session/passport)
// Assets (.js, .css, .png) NÃO precisam de session/MongoDB
// protegerRotas usa optional chaining (req.session?.) - funciona sem session
// Páginas admin sem session → redirect para login (comportamento correto)
// ====================================================================
app.use(protegerRotas);
app.use(express.static("public"));
```

### Mudança 3: REMOVER bloco antigo (linhas 404-413)

**REMOVER as seguintes linhas:**

```javascript
// 🛡️ MIDDLEWARE DE PROTEÇÃO DE ROTAS (antes de servir estáticos)
// ✅ Bypass de desenvolvimento: injeta sessão admin automaticamente em NODE_ENV=development
app.use(injetarSessaoDevAdmin);
app.use(protegerRotas);

// 👁️ MIDDLEWARE DE RASTREAMENTO DE ATIVIDADE (participantes)
app.use(activityTrackerMiddleware);

// Servir arquivos estáticos (Frontend)
app.use(express.static("public"));
```

### Mudança 4: Inserir injetarSessaoDevAdmin + activityTracker APÓS passport (após linha 361)

**INSERIR após `app.use(passport.session());` (linha 361):**

```javascript
// ✅ Bypass de desenvolvimento: injeta sessão admin automaticamente
app.use(injetarSessaoDevAdmin);

// 👁️ Rastreamento de atividade (requer session para identificar participante)
app.use(activityTrackerMiddleware);
```

### Mudança 5: Fix CORS (linha 237)

```diff
- if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) {
+ if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co') || origin.endsWith('.replit.app')) {
```

---

## Nova Ordem do Middleware Chain (Resultado Final)

```
Request: GET /js/gerenciar-ligas.js
  ↓
1.  securityHeaders           (setupSecurity)
2.  sanitizeInput             (setupSecurity)
3.  securityLogger            (setupSecurity)
4.  rateLimiter               (setupSecurity) ← skipa .js via regex
5.  compression               (linha ~210)
6.  express.json              (linha ~222)
7.  express.urlencoded        (linha ~223)
8.  cors                      (linha ~230) ← agora inclui .replit.app
9.  HTML no-cache headers     (linha ~252) ← skipa .js
10. cache busting /participante/ (linha ~268) ← só match /participante/
11. debug logger (dev only)   (linha ~321)
12. ★ protegerRotas           (NOVO) ← isRotaPublica("/js/...") → next()
13. ★ express.static("public") (NOVO) ← SERVE O ARQUIVO! FIM.
    --- ABAIXO: Só para requests que NÃO são static ---
14. express-session+MongoStore (linha ~329)
15. passport.initialize()     (linha ~360)
16. passport.session()        (linha ~361)
17. injetarSessaoDevAdmin     (REPOSICIONADO)
18. activityTrackerMiddleware (REPOSICIONADO)
19. API routes...
```

**Para assets estáticos:** Request passa por 13 middlewares (vs. 15 antes), e NENHUM depende de MongoDB. Se MongoDB cair → assets continuam sendo servidos.

**Para páginas admin HTML (ex: /painel.html):**
- `protegerRotas` → `isPaginaAdmin("/painel.html")` = true → `req.session?.admin` = undefined (sem session) → redirect para `/?error=admin_required`
- Usuário vê a landing page, que é servida por `express.static` sem problemas
- Após login (via session middleware nas rotas de API), o redirect funciona normalmente

---

## Validações de Segurança

### Multi-Tenant
- [x] Mudança não afeta queries com `liga_id` (apenas ordering de middleware)
- [x] Isolamento entre ligas mantido (lógica em controllers, não em middleware chain)

### Autenticação
- [x] Páginas admin continuam protegidas por `protegerRotas` → `isPaginaAdmin()`
- [x] Sem session, `req.session?.admin` = undefined → redirect para login ✅
- [x] Páginas participante continuam protegidas → redirect para login ✅
- [x] APIs protegidas individualmente via `verificarAdmin`/`verificarParticipante` nos routes (APÓS session)
- [x] `injetarSessaoDevAdmin` só executa em dev com `DEV_ADMIN_BYPASS=true`

### Segurança de Assets
- [x] `isRotaPublica` já inclui `/css/`, `/js/`, `/img/`, `/escudos/` — assets estáticos passam sem auth
- [x] Rate limiting já exclui assets estáticos (regex em `security.js:36`)
- [x] Security headers aplicados em TODAS as requests (incluindo static) ✅

---

## Casos de Teste

### Teste 1: Assets estáticos retornam 200 após Republish
**Setup:** App publicado no Replit (NODE_ENV=production)
**Ação:** Abrir browser → navegar para a URL do app
**Resultado Esperado:** `gerenciar-ligas.js`, `cache-manager.js` e todos .js/.css retornam HTTP 200

### Teste 2: Páginas admin protegidas sem session
**Setup:** Não estar logado (sem session cookie)
**Ação:** Acessar `/painel.html` diretamente
**Resultado Esperado:** Redirect para `/?error=admin_required`

### Teste 3: Página participante protegida sem session
**Setup:** Não estar logado
**Ação:** Acessar `/participante/`
**Resultado Esperado:** Redirect para `/participante-login.html`

### Teste 4: Login admin funciona normalmente
**Setup:** Acessar landing page
**Ação:** Fazer login via Replit Auth
**Resultado Esperado:** Redirect para `/painel.html`, todos JS/CSS carregam corretamente

### Teste 5: Login participante funciona normalmente
**Setup:** Acessar `/participante-login.html`
**Ação:** Fazer login com senha do time
**Resultado Esperado:** Redirect para `/participante/`, app carrega completo

### Teste 6: CORS aceita domínio .replit.app
**Setup:** App em produção no domínio `.replit.app`
**Ação:** Carregar página com `<script type="module">`
**Resultado Esperado:** Sem erro CORS, scripts carregam normalmente

### Teste 7: MongoDB lento/desconectado não afeta assets
**Setup:** MongoDB temporariamente indisponível
**Ação:** Acessar qualquer página
**Resultado Esperado:** CSS/JS/imagens retornam 200; APIs retornam erro (503 ou similar)

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversão:**
1. Reverter commit: `git revert [hash]`
2. Republish no Replit
3. Sem necessidade de restaurar banco (nenhuma mudança em dados)

**Indicadores de falha:**
- Páginas admin acessíveis sem login → ROLLBACK IMEDIATO
- Assets retornando 404 (em vez de 200) → verificar path do express.static
- APIs falhando com "session required" → verificar posição de injetarSessaoDevAdmin

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados (apenas index.js)
- [x] Mudanças cirúrgicas definidas linha por linha (5 mudanças)
- [x] Impactos mapeados (protegerRotas funciona sem session ✅)
- [x] Testes planejados (7 cenários)
- [x] Rollback documentado

### S.D.A. Completo
- [x] Arquivo original completo lido (index.js — 742 linhas)
- [x] middleware/auth.js analisado (protegerRotas usa optional chaining ✅)
- [x] middleware/security.js analisado (rate limiting já exclui static ✅)
- [x] config/database.js analisado (connectDB já é async ✅)
- [x] Nenhum import/dependência quebrada
- [x] Multi-tenant validado
- [x] Autenticação verificada

---

## Ordem de Execução (Crítico)

1. **Mudança 1:** `await connectDB()` (linha 197)
2. **Mudança 5:** Fix CORS `.replit.app` (linha 237)
3. **Mudança 2:** Inserir bloco static+protegerRotas (entre linhas 326-328)
4. **Mudança 3:** Remover bloco antigo (linhas 404-413)
5. **Mudança 4:** Reposicionar injetarSessaoDevAdmin + activityTracker (após linha 361)

---

## Próximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-fix-500-static-files-pos-republish.md
```

---

**Gerado por:** Spec Protocol v1.0
