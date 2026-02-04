# GUIA DE TESTES - Admin Mobile
**Data:** 2026-02-02
**Versão:** 1.0
**Status:** Sistema funcional após correções críticas

---

## 📋 SUMÁRIO

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração](#configuração)
3. [Testes Funcionais](#testes-funcionais)
4. [Testes de Segurança](#testes-de-segurança)
5. [Testes de Integração](#testes-de-integração)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 PRÉ-REQUISITOS

### Ambiente de Desenvolvimento

```bash
NODE_ENV=development
SESSION_SECRET=any-secret-for-dev
JWT_SECRET=dev-secret-123  # Opcional em dev (auto-gerado)
```

### Ambiente de Produção

```bash
NODE_ENV=production
SESSION_SECRET=<strong-256-bit-secret>  # OBRIGATÓRIO
JWT_SECRET=<strong-256-bit-secret>      # OBRIGATÓRIO
ADMIN_EMAILS=admin@example.com          # Fallback inicial
```

**Gerar secrets seguros:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Banco de Dados

```javascript
// Collection 'admins' deve ter ao menos 1 admin:
{
  email: "admin@example.com",
  nome: "Admin Teste",
  senhaHash: "<bcrypt-hash>",  // senha: "senha123"
  ativo: true,
  superAdmin: false,
  tipo: "cliente",
  criadoEm: ISODate("2026-01-01T00:00:00.000Z")
}
```

**Criar admin via script:**
```bash
node scripts/create-admin.js --email admin@test.com --senha senha123
```

---

## ⚙️ CONFIGURAÇÃO

### 1. Verificar variáveis de ambiente

```bash
# Ver configuração atual
curl http://localhost:3000/api/admin/auth/debug

# Resposta esperada:
{
  "ok": true,
  "hostname": "localhost",
  "protocol": "http",
  "repl_id": "SET",
  "issuer_url": "https://replit.com/oidc",
  "callback_url": "https://localhost/api/oauth/callback",
  "admin_emails_env": ["admin@example.com"],
  "oidc_config": "LOADED"
}
```

### 2. Validar JWT_SECRET (produção)

```bash
# Servidor DEVE falhar se JWT_SECRET não estiver configurado em produção
NODE_ENV=production node index.js

# Esperado em caso de erro:
# [SECURITY] ❌ JWT_SECRET não definido em produção!
# [SECURITY] ❌ Sistema mobile será desabilitado por segurança.
# (processo termina com exit code 1)
```

---

## ✅ TESTES FUNCIONAIS

### Teste 1: Login com Email/Senha (Sucesso)

**Objetivo:** Validar fluxo completo de autenticação

**Passos:**
1. Acessar `http://localhost:3000/admin-mobile/login.html`
2. Inserir credenciais válidas:
   - Email: `admin@test.com`
   - Senha: `senha123`
3. Clicar em "Entrar como Admin"

**Resultado esperado:**
```
✅ Loading aparecer no botão
✅ Sem erro 404 ou 401
✅ Redirecionamento para /admin-mobile/
✅ Dashboard carregado com ligas
✅ Token JWT salvo no localStorage
```

**Validação técnica:**
```javascript
// Console do navegador
localStorage.getItem('admin_token')
// Deve retornar: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

JSON.parse(localStorage.getItem('admin_user'))
// Deve retornar: { email: "admin@test.com", nome: "Admin Teste" }
```

---

### Teste 2: Login com Credenciais Inválidas

**Objetivo:** Validar tratamento de erro

**Passos:**
1. Acessar `/admin-mobile/login.html`
2. Inserir email válido + senha ERRADA
3. Clicar em "Entrar como Admin"

**Resultado esperado:**
```
✅ Mensagem de erro exibida
✅ Botão volta ao estado normal
✅ Sem redirecionamento
✅ Sem token salvo
```

**Mensagem de erro:**
```
❌ Email ou senha incorretos
```

---

### Teste 3: Login com Email Não Autorizado

**Objetivo:** Validar rejeição de não-admins

**Passos:**
1. Tentar login com email não cadastrado em `admins`
2. Verificar rejeição

**Resultado esperado:**
```
✅ Status 401 ou 403
✅ Mensagem: "Email ou senha incorretos"
✅ Sem token gerado
```

---

### Teste 4: Geração de JWT Token

**Objetivo:** Validar token JWT após login

**Passos:**
1. Fazer login bem-sucedido
2. Inspecionar token no localStorage
3. Decodificar token em https://jwt.io

**Resultado esperado:**
```json
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "email": "admin@test.com",
  "nome": "Admin Teste",
  "type": "admin",
  "iat": 1738454400,
  "exp": 1738540800  // 24h depois
}
```

---

### Teste 5: Navegação no Dashboard

**Objetivo:** Validar autenticação JWT em rotas protegidas

**Passos:**
1. Fazer login
2. Navegar para diferentes telas:
   - Dashboard (`/api/admin/mobile/dashboard`)
   - Ligas (`/api/admin/mobile/ligas`)
   - Consolidação (`/api/admin/mobile/consolidacao/historico/:ligaId`)

**Resultado esperado:**
```
✅ Todas rotas retornam 200 OK
✅ Dados carregam corretamente
✅ Sem erro 401 (token expirado)
✅ Sem erro 403 (acesso negado)
```

---

### Teste 6: Token Expirado

**Objetivo:** Validar tratamento de token expirado

**Passos:**
1. Fazer login
2. Modificar token no localStorage (corromper payload)
3. Tentar acessar dashboard

**Resultado esperado:**
```
✅ Erro 401 com code: 'TOKEN_EXPIRED' ou 'TOKEN_INVALID'
✅ Redirecionamento para /admin-mobile/login.html
✅ Token removido do localStorage
```

**Como simular:**
```javascript
// Console do navegador
const token = localStorage.getItem('admin_token');
localStorage.setItem('admin_token', token + 'corrupted');
location.reload();
```

---

### Teste 7: Admin Desativado

**Objetivo:** Validar bloqueio de admin com `ativo: false`

**Passos:**
1. Desativar admin no banco:
   ```javascript
   db.admins.updateOne(
     { email: "admin@test.com" },
     { $set: { ativo: false } }
   )
   ```
2. Tentar fazer login

**Resultado esperado:**
```
✅ Login recusado
✅ Mensagem: "Email ou senha incorretos"
✅ Sem token gerado
```

**Reativar:**
```javascript
db.admins.updateOne(
  { email: "admin@test.com" },
  { $set: { ativo: true } }
)
```

---

## 🔒 TESTES DE SEGURANÇA

### Segurança 1: JWT Forgery (Token Forjado)

**Objetivo:** Validar que JWT_SECRET impede tokens forjados

**Ataque:**
```javascript
// Tentar criar token falso com secret errado
const jwt = require('jsonwebtoken');
const fakeToken = jwt.sign(
  { email: 'attacker@evil.com', type: 'admin' },
  'wrong-secret',
  { expiresIn: '24h' }
);
```

**Resultado esperado:**
```
✅ Token rejeitado com 401
✅ Mensagem: "Token inválido"
✅ Sem acesso às rotas protegidas
```

---

### Segurança 2: CSRF (Cross-Site Request Forgery)

**Objetivo:** Validar proteção contra CSRF

**Ataque:**
```html
<!-- Site malicioso tenta gerar token -->
<form action="http://localhost:3000/api/admin/mobile/auth" method="POST">
  <input type="submit" value="Hackear">
</form>
```

**Resultado esperado:**
```
✅ Request bloqueado por CORS
✅ Ou retorna 401 (sem sessão válida)
✅ Sem token gerado
```

---

### Segurança 3: Session Hijacking

**Objetivo:** Validar proteção de cookies de sessão

**Verificação:**
```javascript
// Inspecionar cookie no DevTools → Application → Cookies
// connect.sid deve ter:
✅ HttpOnly: true (não acessível via JS)
✅ Secure: true (somente HTTPS em prod)
✅ SameSite: Lax (proteção CSRF)
```

---

### Segurança 4: Rate Limiting

**Objetivo:** Validar proteção contra brute force

**Teste:**
```bash
# Fazer 15 tentativas de login em 1 minuto
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/admin/cliente/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","senha":"errado"}'
  sleep 3
done
```

**Resultado esperado:**
```
✅ Primeiras 10 tentativas: 401 (senha errada)
✅ 11ª tentativa em diante: 429 (Too Many Requests)
✅ Mensagem: "Aguarde 1 minuto antes de tentar novamente"
```

---

## 🔗 TESTES DE INTEGRAÇÃO

### Integração 1: Login Web → Acesso Mobile

**Objetivo:** Validar que sessão web funciona no mobile

**Passos:**
1. Fazer login via web (`/admin-login.html`)
2. Navegar para `/admin-mobile/`
3. Clicar em "Gerar Token"

**Resultado esperado:**
```
✅ Token JWT gerado usando sessão web
✅ Acesso ao dashboard mobile sem novo login
```

---

### Integração 2: Logout Web → Logout Mobile

**Objetivo:** Validar que logout invalida sessão em todos lugares

**Passos:**
1. Fazer login web + mobile
2. Fazer logout via web (`/api/admin/auth/logout`)
3. Tentar acessar `/api/admin/mobile/dashboard` com token JWT

**Resultado esperado:**
```
✅ Token ainda válido (JWT não é revogado por logout)
⚠️ Mas nova geração de token falha (sem sessão)
```

**Nota:** JWT não tem revogação. Para invalidar, precisa esperar expiração (24h).

---

### Integração 3: Replit Auth → Mobile

**Objetivo:** Validar fluxo Replit Auth + Mobile

**Passos:**
1. Fazer login via Replit Auth (`/api/admin/auth/login`)
2. Após redirect para `/painel.html`, acessar `/admin-mobile/`
3. Gerar token JWT

**Resultado esperado:**
```
✅ Sessão criada por Replit Auth aceita
✅ Token JWT gerado com email do Replit
✅ Dashboard mobile funcional
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Não autenticado" (401) ao gerar token

**Sintoma:**
```
POST /api/admin/mobile/auth → 401
{ error: 'Não autenticado', code: 'NOT_AUTHENTICATED' }
```

**Causa:** Sessão admin não existe

**Solução:**
1. Fazer login primeiro via `/admin-login.html`
2. Verificar cookie `connect.sid` existe
3. Verificar `req.session.admin` no backend

---

### Erro: "Rota não encontrada" (404)

**Sintoma:**
```
POST /auth/login → 404
```

**Causa:** Bug corrigido - frontend usava rota errada

**Solução:**
✅ JÁ CORRIGIDO em `public/admin-mobile/js/auth.js`
- Rota correta: `/api/admin/cliente/login`

---

### Erro: "Token inválido" sempre

**Sintoma:**
```
Todas requests retornam 401 TOKEN_INVALID
```

**Causa:** JWT_SECRET diferente entre geração e validação

**Solução:**
```bash
# 1. Verificar JWT_SECRET consistente
echo $JWT_SECRET

# 2. Reiniciar servidor
npm restart

# 3. Fazer novo login (token antigo fica inválido)
```

---

### Erro: Sistema não inicia em produção

**Sintoma:**
```
[SECURITY] ❌ JWT_SECRET não definido em produção!
[SECURITY] ❌ Sistema mobile será desabilitado por segurança.
```

**Causa:** JWT_SECRET não configurado

**Solução:**
```bash
# Gerar secret forte
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicionar ao .env
echo "JWT_SECRET=<secret-gerado>" >> .env

# Reiniciar
npm restart
```

---

### Erro: Admin desativado consegue acessar

**Sintoma:**
```
Admin com ativo: false consegue fazer login
```

**Causa:** Bug corrigido - função antiga não verificava campo

**Solução:**
✅ JÁ CORRIGIDO em Sprint 2 (consolidação)
- Agora usa `isAdminAutorizado` centralizada
- Verifica `ativo: { $ne: false }`

---

### Erro: Rate limiting não funciona

**Sintoma:**
```
Consigo fazer 100 tentativas de login sem bloqueio
```

**Causa:** IP spoofing ou rate limit por IP burlado

**Verificação:**
```bash
# Testar do mesmo IP
curl -X POST http://localhost:3000/api/admin/cliente/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","senha":"errado"}'
# Repetir 15 vezes

# 11ª tentativa deve retornar 429
```

**Workaround:**
- Rate limiting por email (TODO: Sprint 3)

---

## 📊 CHECKLIST DE TESTES

### Funcionalidades Básicas
- [ ] Login com email/senha válido
- [ ] Login recusado com senha errada
- [ ] Login recusado para email não autorizado
- [ ] Dashboard carrega após login
- [ ] Token JWT gerado corretamente
- [ ] Token salvo no localStorage
- [ ] Navegação entre telas funcionando

### Segurança
- [ ] JWT_SECRET obrigatório em produção
- [ ] Tokens forjados são rejeitados
- [ ] Admin desativado não acessa
- [ ] Rate limiting bloqueia brute force
- [ ] Cookies httpOnly/secure em produção
- [ ] CORS bloqueia origins não autorizadas

### Integração
- [ ] Sessão web funciona no mobile
- [ ] Replit Auth funciona no mobile
- [ ] Logout web não quebra mobile (JWT válido até expirar)

### Edge Cases
- [ ] Token expirado redireciona para login
- [ ] Token corrompido é rejeitado
- [ ] Banco indisponível usa fallback (env)
- [ ] Múltiplas sessões simultâneas funcionam

---

## 🎯 MÉTRICAS DE SUCESSO

**Sistema considerado funcional se:**

✅ **100%** dos testes funcionais passam
✅ **100%** dos testes de segurança passam
✅ **≥90%** dos testes de integração passam
✅ **0** bugs críticos identificados
✅ **Rate limiting** funciona (max 10 tentativas/min)

---

## 📚 REFERÊNCIAS

- **Auditoria:** `.claude/docs/AUDIT-ADMIN-AUTH-2026-02-02.md`
- **Correções:** Commits `1738903` (bugs críticos) + `ec0c95f` (consolidação)
- **Arquitetura:** Ver seção "Fluxo de Autenticação Mobile" na auditoria
- **JWT Spec:** https://jwt.io/introduction
- **bcrypt:** https://github.com/kelektiv/node.bcrypt.js

---

**Última atualização:** 2026-02-02
**Próxima revisão:** Após implementação Sprint 3 (melhorias)
