# AUDIT RULE: Security (Segurança)

## 🎯 Objetivo
Garantir que módulos sigam práticas de segurança **OWASP Top 10**, previnem vulnerabilidades comuns e protegem dados sensíveis.

---

## ✅ Checklist de Auditoria

### 1. **Autenticação e Autorização**

#### Validação de Sessão
- [ ] Valida `req.session.usuario` antes de operações sensíveis
- [ ] Retorna `401 Unauthorized` se não autenticado
- [ ] Retorna `403 Forbidden` se sem permissão

**Exemplo correto:**
```javascript
if (!req.session.usuario) {
    return res.status(401).json({ erro: 'Não autorizado' });
}
```

#### Autorização Admin
- [ ] Usa `isAdminAutorizado(email)` para operações admin
- [ ] Verifica collection `admins` ou `ADMIN_EMAILS` env
- [ ] Não permite escalação de privilégios

**Exemplo correto:**
```javascript
const { isAdminAutorizado } = require('../utils/auth');

if (!isAdminAutorizado(req.session.usuario.email)) {
    return res.status(403).json({ erro: 'Acesso negado' });
}
```

---

### 2. **Injeção (SQL/NoSQL Injection)**

#### MongoDB Safe Queries
- [ ] Usa queries parametrizadas (não concatenação)
- [ ] Valida tipos de entrada
- [ ] Evita `$where` operator (permite JS injection)
- [ ] Usa Mongoose schemas com validação

**❌ VULNERÁVEL:**
```javascript
// NoSQL Injection risk
const query = { email: req.body.email };
const user = await User.findOne(query);
```

**✅ SEGURO:**
```javascript
// Validação de tipo
const email = String(req.body.email).trim();
if (!email.includes('@')) {
    return res.status(400).json({ erro: 'Email inválido' });
}
const user = await User.findOne({ email });
```

---

### 3. **XSS (Cross-Site Scripting)**

#### Sanitização de Input
- [ ] Escapa HTML em inputs do usuário
- [ ] Usa `textContent` (não `innerHTML`) para dados dinâmicos
- [ ] Valida formato de dados antes de renderizar

**Frontend (JavaScript):**
```javascript
// ❌ VULNERÁVEL
element.innerHTML = userData.nome;

// ✅ SEGURO
element.textContent = userData.nome;
```

**Backend (Se renderizar HTML):**
```javascript
const sanitize = require('sanitize-html');
const cleanInput = sanitize(req.body.descricao, {
    allowedTags: [],
    allowedAttributes: {}
});
```

---

### 4. **Validação de Entrada**

#### Validação de Tipos
- [ ] Valida tipo de todos inputs (`String()`, `Number()`, `parseInt()`)
- [ ] Verifica ranges (min/max valores)
- [ ] Valida formatos (email, telefone, datas)

**Exemplo:**
```javascript
const valor = parseFloat(req.body.valor);
if (isNaN(valor) || valor <= 0 || valor > 1000) {
    return res.status(400).json({ erro: 'Valor inválido' });
}

const temporada = parseInt(req.body.temporada);
if (temporada < 2020 || temporada > 2030) {
    return res.status(400).json({ erro: 'Temporada inválida' });
}
```

#### Whitelist (não Blacklist)
- [ ] Define valores aceitos explicitamente
- [ ] Rejeita qualquer input fora da whitelist

```javascript
const tiposPermitidos = ['debito', 'credito', 'ajuste'];
if (!tiposPermitidos.includes(req.body.tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido' });
}
```

---

### 5. **Exposição de Dados Sensíveis**

#### Informações Protegidas
- [ ] NUNCA retorna senhas (mesmo hashed)
- [ ] Remove campos sensíveis antes de enviar resposta
- [ ] Não loga dados sensíveis (senhas, tokens)

**Exemplo:**
```javascript
const usuario = await Usuario.findOne({ email }).lean();
delete usuario.senha;
delete usuario.tokenResetSenha;
res.json(usuario);
```

#### Mensagens de Erro
- [ ] Erros não expõem estrutura do sistema
- [ ] Stack traces apenas em desenvolvimento
- [ ] Mensagens genéricas em produção

```javascript
try {
    // operação
} catch (erro) {
    console.error('Erro interno:', erro);
    res.status(500).json({
        erro: 'Erro ao processar requisição',
        detalhes: process.env.NODE_ENV === 'development' ? erro.message : undefined
    });
}
```

---

### 6. **Rate Limiting**

#### Proteção contra Abuso
- [ ] Endpoints críticos têm rate limiting
- [ ] Limites por IP ou por usuário
- [ ] Retorna `429 Too Many Requests`

**Exemplo (express-rate-limit):**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests
    message: 'Muitas requisições, tente novamente mais tarde'
});

app.use('/api/apostas/', limiter);
```

---

### 7. **CSRF (Cross-Site Request Forgery)**

#### Tokens CSRF
- [ ] Endpoints sensíveis validam CSRF token
- [ ] Usa `csurf` middleware ou similar
- [ ] Formulários incluem token CSRF

**Nota:** Session-based auth já oferece alguma proteção.

---

### 8. **Segurança de Sessão**

#### Configuração de Cookies
- [ ] `httpOnly: true` (previne JS access)
- [ ] `secure: true` em produção (HTTPS only)
- [ ] `sameSite: 'lax'` ou `'strict'`
- [ ] Timeout de sessão configurado

**Exemplo:**
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24h
    }
}));
```

---

### 9. **Dependency Security**

#### Pacotes npm
- [ ] `npm audit` executado regularmente
- [ ] Dependências atualizadas (sem vulnerabilidades conhecidas)
- [ ] Evita pacotes abandonados ou suspeitos

```bash
npm audit
npm audit fix
```

---

### 10. **Logging e Monitoramento**

#### Auditoria de Ações
- [ ] Ações sensíveis são logadas (quem, quando, o quê)
- [ ] Logs não contêm dados sensíveis
- [ ] Logs incluem contexto (IP, user-agent, etc.)

**Exemplo:**
```javascript
console.log(`[AUDIT] Usuário ${req.session.usuario.email} criou aposta | IP: ${req.ip}`);
```

---

## 🚨 Red Flags Críticos

| Problema | Severidade | Vulnerabilidade | Ação |
|----------|-----------|-----------------|------|
| Sem validação de sessão | 🔴 CRÍTICO | Broken Access Control | Adicionar imediatamente |
| Concatenação de query | 🔴 CRÍTICO | NoSQL Injection | Usar queries parametrizadas |
| `innerHTML` com user input | 🔴 CRÍTICO | XSS | Usar `textContent` |
| Senha em response | 🔴 CRÍTICO | Data Exposure | Remover campo |
| Sem validação de tipo | 🟠 ALTO | Type Confusion | Validar inputs |
| Sem rate limiting | 🟠 ALTO | Brute Force | Adicionar limiter |
| Stack trace em prod | 🟡 MÉDIO | Information Disclosure | Ocultar detalhes |
| Sem CSRF token | 🟡 MÉDIO | CSRF | Implementar tokens |

---

## 📊 Exemplo Completo (Endpoint Seguro)

```javascript
const rateLimit = require('express-rate-limit');
const { isAdminAutorizado } = require('../utils/auth');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50
});

router.post('/api/apostas/criar', limiter, async (req, res) => {
    try {
        // 1. Autenticação
        if (!req.session.usuario) {
            return res.status(401).json({ erro: 'Não autorizado' });
        }

        // 2. Validação de entrada (whitelist)
        const timeId = String(req.body.timeId).trim();
        const valor = parseFloat(req.body.valor);
        const temporada = parseInt(req.body.temporada);

        if (!timeId || isNaN(valor) || isNaN(temporada)) {
            return res.status(400).json({ erro: 'Dados inválidos' });
        }

        if (valor <= 0 || valor > 1000) {
            return res.status(400).json({ erro: 'Valor fora do range permitido' });
        }

        // 3. Autorização (só pode apostar para si mesmo)
        if (timeId !== req.session.usuario.timeId && !isAdminAutorizado(req.session.usuario.email)) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        // 4. Query parametrizada (MongoDB safe)
        const aposta = await Aposta.create({
            timeId,
            valor,
            temporada,
            data: new Date()
        });

        // 5. Audit log
        console.log(`[AUDIT] Aposta criada por ${req.session.usuario.email} | Valor: ${valor}`);

        // 6. Response limpa (sem dados sensíveis)
        res.json({
            sucesso: true,
            apostaId: aposta._id
        });

    } catch (erro) {
        // 7. Error handling seguro
        console.error('Erro ao criar aposta:', erro);
        res.status(500).json({
            erro: 'Falha ao processar aposta',
            detalhes: process.env.NODE_ENV === 'development' ? erro.message : undefined
        });
    }
});
```

---

## 🔗 Referências

### OWASP Top 10 2021
1. **A01:2021** – Broken Access Control
2. **A02:2021** – Cryptographic Failures
3. **A03:2021** – Injection
4. **A04:2021** – Insecure Design
5. **A05:2021** – Security Misconfiguration
6. **A06:2021** – Vulnerable Components
7. **A07:2021** – Identification/Authentication Failures
8. **A08:2021** – Software/Data Integrity Failures
9. **A09:2021** – Security Logging/Monitoring Failures
10. **A10:2021** – Server-Side Request Forgery (SSRF)

### Documentação
- `CLAUDE.md` → Seção "Coding Standards"
- `utils/auth.js` → Funções de autorização
- OWASP: https://owasp.org/Top10/

---

**Última atualização:** 04/02/2026
**Versão:** 1.0.0
