# PRD - Login Unificado Globo para Participante Premium

**Data:** 2026-01-22
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

O sistema atual exige **dois logins separados** para participantes premium (assinantes Cartola PRO):
1. **Login do App:** time_id + senha local → cria `req.session.participante`
2. **Login Globo:** OAuth ou email/senha Globo → cria `req.session.cartolaProAuth`

Isso causa confusao e fricao para o usuario premium (atualmente apenas Paulinett, time_id: 13935277).

**Objetivo:** Implementar **login unico via Globo** para participantes premium. Quando o assinante digitar seu time_id na tela de login, o sistema detecta automaticamente que e assinante e oferece a opcao "Entrar com Globo". Ao autenticar na Globo, o sistema:
1. Obtem o time_id da conta Globo via API `/auth/time`
2. Verifica se esse time_id esta cadastrado em alguma liga
3. Cria sessao unificada (`participante` + `cartolaProAuth`) em um unico passo

---

## Contexto e Analise

### Arquitetura Atual (Dois Logins)

```
FLUXO ATUAL:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Tela Login App  │───>│ POST /login     │───>│ session.        │
│ (time_id+senha) │    │                 │    │ participante    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Modal PRO       │───>│ OAuth/Login     │───>│ session.        │
│ (Globo Auth)    │    │ Globo           │    │ cartolaProAuth  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Arquitetura Proposta (Login Unico)

```
FLUXO PROPOSTO:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Tela Login App  │    │ Verifica se e   │    │ Mostra opcao    │
│ (digita time_id)│───>│ assinante       │───>│ "Entrar c/Globo"│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                              ┌────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPCAO A: OAuth (dominios Replit)                                │
│ /api/participante/auth/globo/login → Redirect Globo → Callback  │
├─────────────────────────────────────────────────────────────────┤
│ OPCAO B: Login Direto (dominios customizados)                   │
│ POST /api/participante/auth/globo/direct (email+senha Globo)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: Processa autenticacao Globo                            │
│ 1. Obtem glbToken (OAuth ou login direto)                       │
│ 2. Chama API Globo: /auth/time → obtem time_id                  │
│ 3. Busca liga onde time_id esta cadastrado                      │
│ 4. Cria sessao UNIFICADA:                                       │
│    - session.participante = { timeId, ligaId, ... }             │
│    - session.cartolaProAuth = { glbid, email, ... }             │
│ 5. Redireciona para /participante/                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Modulos Identificados

#### Backend

| Arquivo | Descricao | Acao |
|---------|-----------|------|
| `routes/participante-auth.js` | Rotas de autenticacao do participante | **MODIFICAR** - Adicionar rotas de login unificado via Globo |
| `config/globo-oauth.js` | Configuracao OAuth Globo (OIDC) | **REUTILIZAR** - Usar funcoes existentes |
| `services/cartolaProService.js` | Service de integracao API Globo | **REUTILIZAR** - Metodo `buscarMeuTime()` retorna time_id |
| `models/Time.js` | Schema do time (campo `assinante`) | **CONSULTAR** - Verificar se time_id e assinante |
| `models/Liga.js` | Schema da liga (array `participantes`) | **CONSULTAR** - Buscar liga do participante |

#### Frontend

| Arquivo | Descricao | Acao |
|---------|-----------|------|
| `public/participante-login.html` | Tela de login do participante | **MODIFICAR** - Adicionar deteccao de assinante e botao Globo |
| `public/participante/js/modules/participante-cartola-pro.js` | Modal Cartola PRO | **REUTILIZAR** - Funcao `isOAuthDisponivel()` |

---

### Dependencias Mapeadas

1. **API Globo `/auth/time`** (services/cartolaProService.js:500)
   - Requer header `X-GLB-Token` (glbid ou access_token OAuth)
   - Retorna `time.time_id` do usuario autenticado
   - Usado para vincular conta Globo ao participante da liga

2. **Verificacao de Assinante** (routes/cartola-pro-routes.js:44)
   - Busca `Time.findOne({ id: timeId }).select("assinante")`
   - Campo `assinante: Boolean` no model Time

3. **Busca de Liga** (routes/participante-auth.js:47)
   - `Liga.findOne({ "participantes.time_id": parseInt(timeId) })`
   - Retorna liga onde participante esta cadastrado

4. **Deteccao de Dominio OAuth** (participante-cartola-pro.js:37)
   - Funcao `isOAuthDisponivel()` detecta se dominio permite OAuth
   - Dominios permitidos: localhost, *.replit.dev, *.repl.co, *.replit.app
   - Dominios customizados (ex: supercartolamanager.com.br) NAO funcionam com OAuth

---

### Padroes Existentes

1. **Sessao Participante** (`routes/participante-auth.js:120-124`):
```javascript
req.session.participante = {
    timeId: timeId,
    ligaId: ligaEncontrada._id.toString(),
    participante: dadosReais,  // nome_cartola, nome_time, foto, etc.
};
```

2. **Sessao Cartola PRO** (`config/globo-oauth.js:217-225`):
```javascript
req.session.cartolaProAuth = {
    globo_id: req.user.globo_id,
    glbid: req.user.glbid,
    email: req.user.email,
    nome: req.user.nome,
    access_token: req.user.access_token,
    refresh_token: req.user.refresh_token,
    expires_at: req.user.expires_at,
    authenticated_at: Date.now()
};
```

3. **Flag Premium na Sessao** (`routes/participante-auth.js:196`):
```javascript
assinante: timeData?.assinante || false, // Flag premium para Cartola PRO
```

---

## Solucao Proposta

### Abordagem Escolhida

Implementar **login unificado em duas etapas**:

**Etapa 1 - Deteccao de Assinante (Frontend)**
- Usuario digita time_id na tela de login
- Frontend faz request para verificar se e assinante
- Se assinante, mostra opcao "Entrar com Globo" (alem do login tradicional)

**Etapa 2 - Login Unificado (Backend)**
- Usuario clica "Entrar com Globo"
- Backend autentica via OAuth (dominios Replit) ou login direto (dominios customizados)
- Apos autenticar, backend:
  1. Busca time_id via API Globo `/auth/time`
  2. Verifica se time_id esta em alguma liga
  3. Cria sessao unificada (participante + cartolaProAuth)
  4. Redireciona para app

### Endpoints a Criar

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/participante/auth/check-assinante/:timeId` | GET | Verifica se time_id e assinante |
| `/api/participante/auth/globo/login` | GET | Inicia fluxo OAuth Globo (redirect) |
| `/api/participante/auth/globo/callback` | GET | Callback OAuth - cria sessao unificada |
| `/api/participante/auth/globo/direct` | POST | Login direto Globo (email/senha) - cria sessao unificada |

### Arquivos a Modificar

1. **`routes/participante-auth.js`**
   - Adicionar endpoint `GET /check-assinante/:timeId`
   - Adicionar rotas de login unificado Globo
   - Reutilizar logica de criacao de sessao existente

2. **`public/participante-login.html`**
   - Adicionar listener no campo time_id (onblur/oninput)
   - Adicionar secao de botao "Entrar com Globo" (inicialmente oculta)
   - Adicionar formulario de login direto Globo (para dominios customizados)
   - Adicionar logica de deteccao de dominio OAuth

---

## Regras de Negocio

### RN-01: Verificacao de Assinante
- Apenas times com `assinante: true` na collection `times` podem usar login Globo
- A verificacao ocorre ANTES do login, quando usuario digita time_id

### RN-02: Vinculo Time-Globo
- O time_id retornado pela API Globo `/auth/time` DEVE corresponder ao time_id digitado
- Se nao corresponder, exibir erro: "Conta Globo nao corresponde ao time informado"

### RN-03: Participante em Liga
- O time_id DEVE estar cadastrado em pelo menos uma liga
- Se nao estiver, exibir erro: "Time nao encontrado em nenhuma liga cadastrada"

### RN-04: Fallback Login Tradicional
- Mesmo para assinantes, o login tradicional (time_id + senha) DEVE continuar funcionando
- O botao "Entrar com Globo" e uma OPCAO, nao obrigatorio

### RN-05: Dominios OAuth
- OAuth so funciona em dominios Replit (localhost, *.replit.dev, *.repl.co, *.replit.app)
- Em dominios customizados, usar formulario de login direto (email/senha Globo)

### RN-06: Sessao Unificada
- Login via Globo DEVE criar AMBAS as sessoes:
  - `req.session.participante` (para navegacao do app)
  - `req.session.cartolaProAuth` (para funcionalidades PRO)

---

## Riscos e Consideracoes

### Impactos Previstos

| Tipo | Descricao |
|------|-----------|
| **Positivo** | Elimina fricao do duplo login para participantes premium |
| **Positivo** | Melhora UX do Cartola PRO significativamente |
| **Positivo** | Prepara infraestrutura para mais assinantes no futuro |
| **Atencao** | API Globo pode mudar sem aviso (integracao nao-oficial) |
| **Atencao** | OAuth depende de dominios registrados na Globo |
| **Risco** | Se time_id da Globo nao bater com o informado, usuario fica confuso |

### Mitigacoes

1. **API Globo instavel:** Manter login tradicional como fallback sempre
2. **Dominios OAuth:** Implementar login direto (email/senha) como alternativa
3. **Time_id diferente:** Mensagem de erro clara explicando o problema

### Multi-Tenant
- [x] Validado isolamento liga_id - Busca continua usando `Liga.findOne` por time_id

---

## Testes Necessarios

### Cenarios de Teste

| # | Cenario | Esperado |
|---|---------|----------|
| 1 | Assinante digita time_id → botao Globo aparece | OK - Mostra "Entrar com Globo" |
| 2 | Nao-assinante digita time_id → botao Globo NAO aparece | OK - Apenas login tradicional |
| 3 | Assinante faz login via OAuth → sessao unificada criada | OK - Ambas sessoes existem |
| 4 | Assinante faz login via email/senha Globo → sessao unificada criada | OK - Ambas sessoes existem |
| 5 | Time_id da Globo diferente do informado → erro claro | OK - Mensagem explicativa |
| 6 | Time_id nao cadastrado em liga → erro claro | OK - "Time nao encontrado" |
| 7 | Dominio customizado → formulario email/senha (sem OAuth redirect) | OK - Fallback funciona |
| 8 | Login tradicional ainda funciona para assinante | OK - Fallback mantido |
| 9 | Apos login unificado, funcionalidades PRO funcionam | OK - Modal PRO abre direto nas abas |

### Dados de Teste

- **Assinante conhecido:** Paulinett (time_id: 13935277, assinante: true)
- **Nao-assinante:** Qualquer outro participante da liga

---

## Fluxo Detalhado de Implementacao

### Fase 1: Backend - Endpoint de Verificacao

```javascript
// routes/participante-auth.js

// GET /api/participante/auth/check-assinante/:timeId
router.get("/check-assinante/:timeId", async (req, res) => {
    const { timeId } = req.params;
    const Time = (await import("../models/Time.js")).default;
    const time = await Time.findOne({ id: parseInt(timeId) }).select("assinante");
    res.json({ assinante: time?.assinante === true });
});
```

### Fase 2: Frontend - Deteccao de Assinante

```javascript
// public/participante-login.html (script)

const timeIdInput = document.getElementById("timeId");
const globoSection = document.getElementById("globoLoginSection");

timeIdInput.addEventListener("blur", async () => {
    const timeId = timeIdInput.value.trim();
    if (!timeId) return;

    const response = await fetch(`/api/participante/auth/check-assinante/${timeId}`);
    const data = await response.json();

    if (data.assinante) {
        globoSection.style.display = "block";
    } else {
        globoSection.style.display = "none";
    }
});
```

### Fase 3: Backend - Login Unificado

```javascript
// routes/participante-auth.js

// Callback OAuth - cria sessao unificada
router.get("/globo/callback", async (req, res) => {
    // 1. Processar OAuth (reutilizar logica existente)
    // 2. Obter time_id via API Globo /auth/time
    // 3. Buscar liga do participante
    // 4. Criar sessao unificada
    // 5. Redirecionar para /participante/
});

// Login direto - cria sessao unificada
router.post("/globo/direct", async (req, res) => {
    // 1. Autenticar via email/senha Globo
    // 2. Obter time_id via API Globo /auth/time
    // 3. Buscar liga do participante
    // 4. Criar sessao unificada
    // 5. Retornar sucesso (frontend redireciona)
});
```

---

## Proximos Passos

1. **Validar PRD** - Revisar com stakeholder (se aplicavel)
2. **Gerar SPEC** - Executar `/spec .claude/docs/PRD-login-unificado-globo.md`
3. **Implementar** - Executar `/code` com SPEC gerado

---

## Anexos

### A1: Estrutura da Sessao Unificada

```javascript
// Apos login unificado via Globo:
req.session = {
    // Sessao do participante (navegacao do app)
    participante: {
        timeId: "13935277",
        ligaId: "abc123...",
        participante: {
            nome_cartola: "Paulinett Miranda",
            nome_time: "Nome do Time",
            foto_perfil: "...",
            foto_time: "...",
            clube_id: 262
        }
    },

    // Sessao Cartola PRO (funcionalidades premium)
    cartolaProAuth: {
        globo_id: "xyz789...",
        glbid: "token_globo...",
        email: "paulinett@email.com",
        nome: "Paulinett",
        access_token: "oauth_token...",
        refresh_token: "refresh_token...",
        expires_at: 1737500000,
        authenticated_at: 1737400000
    }
};
```

### A2: API Globo /auth/time (Response)

```json
{
    "time": {
        "time_id": 13935277,
        "nome": "Nome do Time",
        "nome_cartola": "Paulinett Miranda",
        "patrimonio": 150.50,
        "rodada_atual": 5
    },
    "atletas": [...],
    "clubes": {...},
    "posicoes": {...}
}
```

---

**Gerado por:** Pesquisa Protocol v1.0
**Skill:** /pesquisa (High Senior Protocol)
