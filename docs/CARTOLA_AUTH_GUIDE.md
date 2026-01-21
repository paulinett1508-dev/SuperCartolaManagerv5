# Super Cartola Manager - Autenticacao Cartola FC

**Versao:** 2.0 | **Data:** 21/Jan/2026 | **Status:** Implementado

---

## Objetivo

Permitir que participantes PRO acessem dados privados da API Cartola FC:
- `/auth/time` (seu time logado)
- `/auth/ligas` (suas ligas)
- `/auth/time/salvar` (salvar escalacao)

Sem quebrar funcionalidades existentes.

---

## Arquivos Implementados

### 1. middleware/cartolaProxy.js

**Tipo:** ESM (import/export)
**Funcao:** Proxy para bypass de CORS e gerenciamento de tokens

```javascript
import {
    cartolaProxyPublic,      // Middleware para endpoints publicos
    cartolaProxyAuth,        // Middleware que requer token
    verificarTokenGlobo,     // Verifica e renova tokens
    autenticarDireto,        // Login direto email/senha
    requestCartolaAPI,       // Faz request autenticado
    capturarCookiesAutenticacao,  // Processa cookies
    corsProxy,               // Middleware CORS
    getGlbToken,             // Obtem token da sessao
    buildCartolaHeaders      // Monta headers para API
} from './middleware/cartolaProxy.js';
```

### 2. routes/cartolaAuth.js

**Tipo:** ESM
**Base Path:** `/api/cartola-auth`

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/login` | Login direto email/senha |
| POST | `/capture` | Captura tokens do frontend |
| GET | `/status` | Verifica status auth |
| POST | `/logout` | Desconecta conta Globo |
| GET | `/time` | Busca time autenticado |
| GET | `/ligas` | Busca ligas do usuario |
| POST | `/salvar-escalacao` | Salva escalacao |
| GET | `/debug` | Debug de autenticacao |

### 3. models/Liga.js (Atualizado)

**Campo adicionado em `participanteSchema`:**

```javascript
cartolaAuth: {
    email: String,           // Email da conta Globo
    method: String,          // 'direct', 'oauth', 'capture'
    lastAuthAt: Date         // Ultima autenticacao
}
```

**NOTA:** Tokens sensíveis (glbId, access_token) ficam APENAS em `req.session.cartolaProAuth`, NAO no banco.

### 4. index.js (Atualizado)

```javascript
// Import
import cartolaAuthRoutes from "./routes/cartolaAuth.js";

// Registro
app.use("/api/cartola-auth", cartolaAuthRoutes);
```

---

## Fluxo de Autenticacao

```
┌─────────────────────────────────────────────────────────────┐
│                     PARTICIPANTE                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐      ┌──────────────────┐             │
│  │ Conta com senha  │      │ Conta Google/FB  │             │
│  │ (email/senha)    │      │ (OAuth OIDC)     │             │
│  └────────┬─────────┘      └────────┬─────────┘             │
│           │                         │                        │
│           v                         v                        │
│  POST /cartola-auth/login   GET /cartola-pro/oauth/login    │
│           │                         │                        │
│           └────────────┬────────────┘                        │
│                        v                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         login.globo.com/api/authentication            │   │
│  │         (serviceId: 4728)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                     │
│                        v                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     GLB-ID TOKEN (~215 chars, expira ~2h)             │   │
│  │     Salvo em: req.session.cartolaProAuth              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────┐
│                     API CARTOLA FC                           │
│  https://api.cartolafc.globo.com                            │
├─────────────────────────────────────────────────────────────┤
│  Header: X-GLB-Token: {glbId}                               │
│                                                              │
│  Endpoints Autenticados:                                     │
│  - GET  /auth/time          → Dados do seu time             │
│  - GET  /auth/ligas         → Suas ligas                    │
│  - POST /auth/time/salvar   → Salvar escalacao              │
└─────────────────────────────────────────────────────────────┘
```

---

## Uso

### Login Direto (email/senha)

```javascript
// Frontend
const response = await fetch('/api/cartola-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        email: 'usuario@email.com',
        password: 'senha123'
    })
});

const data = await response.json();
// { success: true, message: "Autenticado com sucesso", expiresIn: 7200 }
```

**Limitacao:** Contas Google/Facebook retornam HTTP 406 (use OAuth).

### OAuth Globo (contas Google/Facebook)

```javascript
// Redirecionar para OAuth
window.location.href = '/api/cartola-pro/oauth/login';

// Apos callback, verificar status:
const status = await fetch('/api/cartola-auth/status', {
    credentials: 'include'
}).then(r => r.json());

// { authenticated: true, email: "user@gmail.com", ... }
```

### Captura de Tokens (WebView/DevTools)

```javascript
// Frontend captura tokens via DevTools ou WebView
const response = await fetch('/api/cartola-auth/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        glbId: 'token_215_chars...',
        glbTag: 'tag_opcional',
        cookies: 'GLBID=...; _glbId=...'
    })
});
```

### Buscar Time Autenticado

```javascript
const response = await fetch('/api/cartola-auth/time', {
    credentials: 'include'
});

const data = await response.json();
// { success: true, time: { time: {...}, atletas: [...] } }
```

### Salvar Escalacao

```javascript
const response = await fetch('/api/cartola-auth/salvar-escalacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        atletas: [123, 456, ...], // 12 IDs (11 + tecnico)
        esquema: 3,               // 1-7 (ex: 3 = 4-3-3)
        capitao: 456              // ID do capitao
    })
});
```

---

## Troubleshooting

| Erro | Causa | Solucao |
|------|-------|---------|
| 401 Unauthorized | Token expirado | Refazer login |
| 406 Not Acceptable | Conta Google/FB | Usar OAuth |
| 429 Too Many Requests | Rate limit | Aguardar 60s |
| CORS Blocked | Request direto | Usar rotas proxy |
| `needsGloboAuth: true` | Sem auth | Conectar conta |

---

## Referencias

**Endpoints Globo:**
- Login: `https://login.globo.com/api/authentication`
- API: `https://api.cartolafc.globo.com`
- OIDC: `https://goidc.globo.com/auth/realms/globo.com`

**Service ID:** 4728

**Repositorios:**
- [vicenteneto/python-cartolafc](https://github.com/vicenteneto/python-cartolafc)
- [0xVasconcelos/CartolaJS](https://github.com/0xVasconcelos/CartolaJS)
