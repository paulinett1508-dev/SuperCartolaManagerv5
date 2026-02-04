# AUDITORIA DE AUTENTICAÇÃO ADMIN - Super Cartola Manager
**Data:** 2026-02-02
**Auditor:** Claude Code
**Escopo:** Sistema de Autenticação e Autorização Admin (Web + Mobile)

---

## 📋 SUMÁRIO EXECUTIVO

O sistema de autenticação admin possui **3 métodos distintos**:
1. **Replit Auth (OpenID Connect)** - Para Super Admins/Desenvolvedores
2. **Email + Senha (bcrypt)** - Para clientes admin
3. **JWT Mobile** - Para app mobile admin

A auditoria identificou **10 problemas**, sendo:
- 🔴 **3 CRÍTICOS** (podem impedir funcionamento)
- 🟡 **4 ALTOS** (inconsistências de segurança)
- 🟠 **3 MÉDIOS** (melhorias recomendadas)

**Status Geral:** ⚠️ Sistema funciona mas possui falhas críticas que impedem o Admin Mobile

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. Controller Mobile verifica sessão errada
**Arquivo:** `controllers/adminMobileController.js:15-20`

**Problema:**
```javascript
// ❌ ERRADO
if (!req.session || !req.session.usuario) {
  return res.status(401).json({
    error: 'Não autenticado',
    code: 'NOT_AUTHENTICATED'
  });
}
```

**Deveria ser:**
```javascript
// ✅ CORRETO
if (!req.session || !req.session.admin) {
  return res.status(401).json({
    error: 'Não autenticado',
    code: 'NOT_AUTHENTICATED'
  });
}
```

**Impacto:**
- ❌ Admin Mobile **NUNCA FUNCIONA** (sempre retorna 401)
- Sistema web usa `req.session.admin` em todo lugar
- Sistema participante usa `req.session.participante`
- Controller mobile é o único que verifica `.usuario`

**Evidências:**
- `middleware/auth.js:189` → verifica `req.session.admin`
- `routes/admin-auth.js:25` → retorna `req.session.admin`
- `config/replit-auth.js:284` → seta `req.session.admin`

**Severidade:** 🔴 CRÍTICO
**Recomendação:** Corrigir imediatamente linha 15 do controller

---

### 2. Frontend Mobile tenta login em rota inexistente
**Arquivo:** `public/admin-mobile/js/auth.js:13`

**Problema:**
```javascript
// ❌ Rota /auth/login NÃO EXISTE
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, senha })
});
```

**Rotas disponíveis:**
- ✅ `/api/admin/cliente/login` (Email + Senha)
- ✅ `/api/admin/auth/login` (Replit Auth redirect)
- ✅ `/api/participante/auth/login` (Participante)

**Impacto:**
- ❌ Login mobile sempre retorna 404
- Fluxo completo de autenticação mobile quebrado

**Severidade:** 🔴 CRÍTICO
**Recomendação:** Alterar para `/api/admin/cliente/login`

---

### 3. JWT_SECRET com fallback inseguro em produção
**Arquivo:** `middleware/adminMobileAuth.js:8`

**Problema:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
```

**Risco:**
- 🚨 Se `JWT_SECRET` não estiver configurada, usa valor hardcoded
- Em produção, **todos os tokens podem ser forjados** usando esse secret
- Atacante pode criar tokens válidos para qualquer admin

**Severidade:** 🔴 CRÍTICO
**Recomendação:**
```javascript
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] ❌ JWT_SECRET não definido em produção!');
    process.exit(1);
  }
  return secret || `dev_only_${Date.now()}`;
})();
```

---

## 🟡 PROBLEMAS ALTOS

### 4. Múltiplas funções `isSuperAdmin` duplicadas
**Arquivos afetados:**
- `config/admin-config.js:35` (centralizada) ✅
- `config/replit-auth.js:71` (`isSuperAdminCheck`) ❌
- `routes/admin-cliente-auth.js:23` (função local) ❌

**Problema:**
Cada implementação tem lógica ligeiramente diferente:

```javascript
// config/admin-config.js (CORRETO)
export function isSuperAdmin(email) {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

// config/replit-auth.js (duplicado)
async function isSuperAdminCheck(email) {
  if (ADMIN_EMAILS_ENV.includes(emailLower)) return true;
  // + lógica adicional de banco
}

// routes/admin-cliente-auth.js (duplicado + verificações extras)
function isSuperAdmin(sessionAdmin) {
  if (checkSuperAdmin(email)) return true;
  if (REPL_OWNER === nome) return true;
  // + mais lógicas
}
```

**Impacto:**
- Inconsistência: admin pode ser super em um contexto e não em outro
- Dificulta manutenção
- Risco de bypass se uma implementação for mais permissiva

**Severidade:** 🟡 ALTO
**Recomendação:** Usar APENAS `config/admin-config.js` em todo código

---

### 5. Múltiplas funções `isAdminAutorizado` com lógicas diferentes
**Arquivos:**
- `config/replit-auth.js:22` (verifica banco + env)
- `middleware/adminMobileAuth.js:94` (verifica banco + env)

**Diferenças:**
```javascript
// replit-auth.js
async function isAdminAuthorizado(email) {
  const admin = await db.collection("admins").findOne({
    email: emailLower,
    ativo: { $ne: false }  // ✅ Verifica campo 'ativo'
  });
  // ...
}

// adminMobileAuth.js
async function isAdminAutorizado(email, db) {
  const admin = await db.collection('admins').findOne({ email });
  // ❌ NÃO verifica campo 'ativo'
  if (admin) return true;
  // ...
}
```

**Impacto:**
- Admin desativado pode acessar mobile mas não web
- Inconsistência de permissões

**Severidade:** 🟡 ALTO
**Recomendação:** Centralizar em `config/admin-config.js`

---

### 6. DEV_ADMIN_BYPASS sem validação extra
**Arquivo:** `middleware/auth.js:99-119`

**Problema:**
```javascript
export function injetarSessaoDevAdmin(req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';
  const devBypass = process.env.DEV_ADMIN_BYPASS === 'true';

  if (isDev && devBypass && !req.session?.admin) {
    req.session.admin = {
      email: devEmail,
      nome: 'Admin Dev',
      _id: devAdminId,
      isDev: true  // ⚠️ Flag não é verificada em lugar nenhum
    };
  }
  next();
}
```

**Risco:**
- Se `NODE_ENV` for manipulado (ex: `.env` comprometido), bypass ativa
- Flag `isDev` não é validada antes de operações sensíveis
- Admin dev tem acesso total sem Replit Auth

**Severidade:** 🟡 ALTO
**Recomendação:**
1. Adicionar IP whitelist para dev bypass
2. Verificar `isDev` flag antes de operações destrutivas
3. Logar todas as ações feitas por admin dev

---

### 7. Rate Limiting burlável via IP spoofing
**Arquivo:** `middleware/security.js:32-90`

**Problema:**
```javascript
const forwardedFor = req.headers['x-forwarded-for'];
const realIp = req.headers['x-real-ip'];
const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : // ⚠️ Confia no header
         realIp ? realIp :
         req.ip;
```

**Risco:**
- Headers `X-Forwarded-For` e `X-Real-IP` podem ser falsificados
- Atacante pode bypassar rate limiting mudando header
- Brute force de senha fica possível

**Severidade:** 🟡 ALTO
**Recomendação:**
1. Usar `req.ip` (IP do socket) como primário
2. Validar se está atrás de proxy confiável antes de usar headers
3. Adicionar rate limiting por email também (não só IP)

---

## 🟠 PROBLEMAS MÉDIOS

### 8. Sessões sem renovação automática
**Arquivo:** `index.js:369-376`

**Problema:**
```javascript
cookie: {
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 dias FIXO
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
}
```

**Impacto:**
- Admin precisa re-autenticar a cada 14 dias mesmo usando sistema
- UX ruim para admins ativos diariamente
- Token JWT mobile expira em 24h mas sessão em 14 dias (inconsistente)

**Severidade:** 🟠 MÉDIO
**Recomendação:**
1. Implementar sliding sessions (renovar a cada acesso)
2. Sincronizar TTL de JWT com sessão

---

### 9. Admin Mobile não valida origem da sessão
**Arquivo:** `controllers/adminMobileController.js:12-67`

**Problema:**
- Aceita qualquer sessão válida para gerar JWT
- Não verifica se sessão foi criada por Replit Auth ou Email/Senha
- Não valida User-Agent ou origem da request

**Risco:**
- CSRF: atacante pode forçar vítima a gerar JWT
- Session fixation se sessão for roubada

**Severidade:** 🟠 MÉDIO
**Recomendação:**
1. Adicionar CSRF token no endpoint `/auth`
2. Validar User-Agent é mobile
3. Verificar método de autenticação usado na sessão

---

### 10. Logs de autenticação não estruturados
**Arquivos:** Diversos `console.log` espalhados

**Problema:**
```javascript
console.log("[REPLIT-AUTH] ✅ Admin autorizado:", email);  // Alguns logs
console.log("[CLIENTE-AUTH] Login falhou:", emailLower);   // Outros logs
// Sem sistema centralizado de audit logs
```

**Impacto:**
- Difícil rastrear tentativas de invasão
- Logs não têm formato padrão (dificulta parsing)
- Não há retenção garantida (console é efêmero)
- Impossível gerar relatórios de segurança

**Severidade:** 🟠 MÉDIO
**Recomendação:**
1. Criar collection `auth_audit_logs` no MongoDB
2. Logar TODAS tentativas de login (sucesso e falha)
3. Incluir: timestamp, email, IP, User-Agent, resultado, método auth

---

## 📊 ANÁLISE DE ARQUITETURA

### Fluxo de Autenticação Web (Funcionando ✅)

```
1. Admin acessa /admin-login.html

2a. [Email/Senha] → POST /api/admin/cliente/login
    → Valida bcrypt
    → Cria req.session.admin
    → Redireciona /painel.html

2b. [Replit Auth] → GET /api/admin/auth/login
    → Redirect para Replit OIDC
    → Callback /api/oauth/callback
    → Valida email na collection admins
    → Cria req.session.admin
    → Redireciona /painel.html

3. Páginas admin protegidas por middleware/auth.js:protegerRotas
   → Verifica req.session.admin
   → Permite acesso
```

### Fluxo de Autenticação Mobile (QUEBRADO ❌)

```
1. Admin acessa /admin-mobile/login.html

2. Digita email/senha → POST /auth/login  ❌ (rota não existe)
   [DEVERIA SER /api/admin/cliente/login]

3. ❌ Falha aqui (404)

4. [SE FUNCIONASSE] → POST /api/admin/mobile/auth
   → Lê req.session.usuario ❌ (deveria ser .admin)
   → ❌ Retorna 401 sempre

5. [SE FUNCIONASSE] → Gera JWT
   → Salva no localStorage
   → Usa JWT em todas requests

6. Rotas mobile protegidas por middleware/adminMobileAuth.js:validateAdminToken
   → Valida JWT
   → Verifica email na collection admins
```

### Camadas de Proteção

```
┌─────────────────────────────────────────────────────────┐
│ 1. RATE LIMITING (security.js)                          │
│    • 500 req/min geral                                  │
│    • 10 req/min para auth                               │
│    ⚠️ Burlável via IP spoofing                          │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│ 2. PROTEÇÃO DE ROTAS (middleware/auth.js)              │
│    • protegerRotas: páginas HTML                       │
│    • verificarAdmin: rotas de API                      │
│    ✅ Funcionando corretamente                          │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│ 3. VALIDAÇÃO DE ADMIN                                   │
│    • Collection admins (MongoDB)                        │
│    • ADMIN_EMAILS (env fallback)                       │
│    ⚠️ Múltiplas implementações inconsistentes           │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│ 4. VALIDAÇÃO DE SUPER ADMIN                            │
│    • Bypass tenant filter                              │
│    • Operações destrutivas                             │
│    ⚠️ Múltiplas implementações                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 ANÁLISE DE SUPERFÍCIE DE ATAQUE

### Vetores de Ataque Identificados

#### 1. Brute Force de Senha (Risco Moderado)
- **Endpoint:** `/api/admin/cliente/login`
- **Proteção:** Rate limiting 10 req/min por IP
- **Bypasses possíveis:**
  - IP spoofing via headers
  - Distributed attack (vários IPs)
- **Mitigação atual:** Senha bcrypt (lenta)

#### 2. Session Hijacking (Risco Baixo)
- **Vetor:** Roubo de cookie `connect.sid`
- **Proteções:**
  - ✅ httpOnly (previne XSS)
  - ✅ secure em prod (HTTPS only)
  - ✅ sameSite: lax (previne CSRF parcial)
- **Risco residual:** Man-in-the-middle se HTTPS falhar

#### 3. JWT Forgery (Risco ALTO se JWT_SECRET não configurado)
- **Vetor:** Gerar tokens válidos sem autenticação
- **Proteção:** Depende de JWT_SECRET forte
- **Risco:** ⚠️ Fallback inseguro permite forgery

#### 4. Privilege Escalation (Risco Baixo)
- **Vetor:** Participante virar admin
- **Proteções:**
  - ✅ Sessões separadas (admin vs participante)
  - ✅ Verificação em collection admins
  - ✅ Middleware bloqueia participante de páginas admin

#### 5. Admin Desativado (Risco Médio)
- **Vetor:** Admin com `ativo: false` ainda pode acessar mobile
- **Causa:** `adminMobileAuth.js` não verifica campo `ativo`

---

## 📋 CHECKLIST DE SEGURANÇA

### ✅ Implementado Corretamente
- [x] Passwords hasheados com bcrypt (salt rounds: 10)
- [x] Sessões persistentes em MongoDB (não memória)
- [x] HTTPS enforced em produção
- [x] Cookies httpOnly, secure, sameSite
- [x] Rate limiting em rotas de login
- [x] Security headers (CSP, X-Frame-Options, etc)
- [x] Sanitização de inputs (middleware/security.js)
- [x] Separation of concerns (admin vs participante)
- [x] CORS restrito em produção

### ❌ Precisa Corrigir
- [ ] Múltiplas implementações de verificação de admin
- [ ] JWT_SECRET sem validação em produção
- [ ] Admin Mobile quebrado (sessão errada)
- [ ] Rate limiting burlável por IP
- [ ] Logs não estruturados
- [ ] Sessões sem renovação automática
- [ ] Admin desativado pode acessar mobile

### 🟡 Melhorias Recomendadas
- [ ] 2FA para Super Admins
- [ ] Audit trail completo no MongoDB
- [ ] IP whitelist para operações destrutivas
- [ ] Notificações de login suspeito
- [ ] Bloqueio temporário após N tentativas falhas
- [ ] Rotação automática de JWT_SECRET
- [ ] Monitoramento de sessões ativas

---

## 🎯 PLANO DE AÇÃO PRIORITÁRIO

### Sprint 1 - Correções Críticas (1-2 dias)
1. ✅ **Corrigir controller mobile**
   - Trocar `req.session.usuario` por `req.session.admin`
   - Arquivo: `controllers/adminMobileController.js:15`

2. ✅ **Corrigir rota de login mobile**
   - Trocar `/auth/login` por `/api/admin/cliente/login`
   - Arquivo: `public/admin-mobile/js/auth.js:13`

3. ✅ **Validar JWT_SECRET obrigatório em produção**
   - Adicionar exit(1) se não configurado
   - Arquivo: `middleware/adminMobileAuth.js:8`

### Sprint 2 - Consolidação (2-3 dias)
4. ✅ **Centralizar verificação de admin**
   - Criar função única em `config/admin-config.js`
   - Substituir todas implementações duplicadas

5. ✅ **Unificar isAdminAutorizado**
   - Versão única que verifica campo `ativo`
   - Substituir em replit-auth e adminMobileAuth

### Sprint 3 - Melhorias de Segurança (3-5 dias)
6. ✅ **Implementar audit logs estruturados**
   - Collection `auth_audit_logs`
   - Logar todos eventos de autenticação

7. ✅ **Melhorar rate limiting**
   - Adicionar rate limiting por email
   - Validar proxy confiável antes de usar headers

8. ✅ **Adicionar sliding sessions**
   - Renovar cookie a cada acesso
   - Sincronizar TTL JWT

---

## 📎 ANEXOS

### A. Variáveis de Ambiente Necessárias

```bash
# Sessões
SESSION_SECRET=<random-256-bits>  # OBRIGATÓRIO em prod

# JWT (Admin Mobile)
JWT_SECRET=<random-256-bits>  # OBRIGATÓRIO em prod

# Replit Auth
REPL_ID=<replit-app-id>
ISSUER_URL=https://replit.com/oidc

# Admins
ADMIN_EMAILS=email1@domain.com,email2@domain.com  # Fallback inicial
SUPER_ADMIN_EMAIL=dev@domain.com  # Super Admin principal

# Dev Bypass (NUNCA em produção)
DEV_ADMIN_BYPASS=true  # Somente NODE_ENV=development
DEV_ADMIN_EMAIL=dev@localhost
```

### B. Estrutura da Collection `admins`

```javascript
{
  _id: ObjectId,
  email: String,           // lowercase, único
  nome: String,
  senhaHash: String,       // bcrypt (se método email/senha)
  senhaProvisoria: Boolean, // true = forçar troca
  superAdmin: Boolean,     // true = bypass tenant filter
  ativo: Boolean,          // false = desativado
  tipo: String,            // "cliente" | "super"
  criadoEm: Date,
  criadoPor: String,       // email de quem criou
  ultimoAcesso: Date
}
```

### C. Exemplo de Audit Log

```javascript
{
  _id: ObjectId,
  timestamp: Date,
  event: "login_success" | "login_failed" | "logout" | "session_expired",
  email: String,
  method: "replit_auth" | "email_password" | "jwt_mobile",
  ip: String,
  userAgent: String,
  metadata: {
    platform: "web" | "mobile",
    sessionId: String,
    failureReason: String  // se falha
  }
}
```

---

## 🏁 CONCLUSÃO

O sistema de autenticação possui uma **arquitetura sólida** com múltiplas camadas de proteção, mas sofre de:

1. **Bugs de implementação** que impedem Admin Mobile de funcionar
2. **Inconsistências** devido a código duplicado
3. **Falta de auditoria** adequada

**Prioridade de correção:**
- 🔴 Críticos (1-3): **Imediato** (sistema mobile não funciona)
- 🟡 Altos (4-7): **Sprint 2** (inconsistências de segurança)
- 🟠 Médios (8-10): **Sprint 3** (melhorias operacionais)

**Estimativa total:** 6-10 dias de desenvolvimento + testes

**Próximos passos:**
1. Aplicar correções do Sprint 1
2. Testar fluxo completo de Admin Mobile
3. Implementar audit logs
4. Conduzir penetration testing

---

**Auditado por:** Claude Code
**Revisão:** Pendente
**Aprovação:** Pendente
