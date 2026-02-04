# SPEC - App Mobile Admin

**Feature ID:** FEAT-026
**PRD:** `.claude/docs/PRD-app-mobile-admin.md`
**Status:** IN PROGRESS
**Data:** 2026-02-02

---

## 📐 Visão Geral da Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | HTML5 + Vanilla JS (ES6 Modules) | Consistência com app participante |
| **Styling** | TailwindCSS (CDN) + CSS customizado | Já usado no projeto |
| **PWA** | Service Worker + Web App Manifest | Instalação + offline + push |
| **Autenticação** | Replit Auth (OpenID Connect) + JWT | Sistema existente |
| **API** | Express.js (rotas específicas mobile) | Backend existente |
| **Database** | MongoDB (collections novas) | Banco existente |
| **Cache** | IndexedDB (client-side) | Offline mode |
| **Push** | Web Push API + VAPID | Notificações nativas |

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE DEVICE (Android/iOS)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PWA App (Installed)                                 │  │
│  │  ┌────────────────┐  ┌────────────────┐             │  │
│  │  │  UI Layer      │  │  Service Worker│             │  │
│  │  │  (HTML/CSS/JS) │  │  (Cache + Push)│             │  │
│  │  └────────┬───────┘  └────────┬───────┘             │  │
│  │           │                   │                      │  │
│  │  ┌────────▼───────────────────▼───────┐             │  │
│  │  │  IndexedDB (Offline Storage)       │             │  │
│  │  └────────────────────────────────────┘             │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │ HTTPS + JWT                     │
└──────────────────────────┼─────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Layer                                           │  │
│  │  ┌────────────────┐  ┌────────────────┐             │  │
│  │  │  Admin Mobile  │  │  Admin Notif   │             │  │
│  │  │  Routes        │  │  Routes        │             │  │
│  │  └────────┬───────┘  └────────┬───────┘             │  │
│  │           │                   │                      │  │
│  │  ┌────────▼───────────────────▼───────┐             │  │
│  │  │  Middleware (Auth + Validation)    │             │  │
│  │  └────────┬───────────────────────────┘             │  │
│  │           │                                          │  │
│  │  ┌────────▼───────────────────────────┐             │  │
│  │  │  Controllers                       │             │  │
│  │  │  - adminMobileController           │             │  │
│  │  │  - adminNotificationsController    │             │  │
│  │  └────────┬───────────────────────────┘             │  │
│  │           │                                          │  │
│  │  ┌────────▼───────────────────────────┐             │  │
│  │  │  Models (MongoDB)                  │             │  │
│  │  │  - AdminPushSubscription           │             │  │
│  │  │  - AdminActivityLog                │             │  │
│  │  │  - Liga, Time, etc (existentes)   │             │  │
│  │  └────────────────────────────────────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Push Notification Service                           │  │
│  │  - Web Push (VAPID)                                  │  │
│  │  - Triggers (Consolidação, Health, etc)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONGODB                                  │
├─────────────────────────────────────────────────────────────┤
│  - adminpushsubscriptions (NOVA)                            │
│  - adminactivitylogs (NOVA)                                 │
│  - ligas (existente)                                        │
│  - times (existente)                                        │
│  - acertofinanceiros (existente)                            │
│  - admins (existente)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Nova Collection: `adminpushsubscriptions`

Armazena subscriptions de push notifications para cada admin.

```javascript
{
  _id: ObjectId,
  email: String,                    // Email do admin (único)
  endpoint: String,                 // Endpoint do push service
  keys: {
    p256dh: String,                 // Public key
    auth: String                    // Auth secret
  },
  preferences: {
    mercadoFechou: Boolean,         // Default: true
    consolidacaoCompleta: Boolean,  // Default: true
    consolidacaoErro: Boolean,      // Default: true
    healthScoreBaixo: Boolean,      // Default: true (< 70)
    quitacaoSolicitada: Boolean,    // Default: true
    inadimplenciaAlta: Boolean      // Default: false
  },
  userAgent: String,                // Info do dispositivo
  createdAt: Date,
  updatedAt: Date,
  lastNotificationAt: Date          // Última notificação enviada
}
```

**Índices:**
```javascript
db.adminpushsubscriptions.createIndex({ email: 1 }, { unique: true });
db.adminpushsubscriptions.createIndex({ endpoint: 1 });
db.adminpushsubscriptions.createIndex({ createdAt: 1 });
```

---

### Nova Collection: `adminactivitylogs`

Registra todas as ações realizadas por admins no app mobile.

```javascript
{
  _id: ObjectId,
  email: String,                    // Admin que realizou a ação
  action: String,                   // Tipo de ação (enum)
  ligaId: Number,                   // Liga relacionada (opcional)
  rodada: Number,                   // Rodada relacionada (opcional)
  timeId: String,                   // Time relacionado (opcional)
  details: Object,                  // Detalhes específicos da ação
  result: String,                   // 'success' | 'error'
  errorMessage: String,             // Mensagem de erro (se houver)
  ipAddress: String,                // IP do dispositivo
  userAgent: String,                // Info do dispositivo
  timestamp: Date
}
```

**Enum de Actions:**
```javascript
const ADMIN_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CONSOLIDACAO_MANUAL: 'consolidacao_manual',
  NOVO_ACERTO: 'novo_acerto',
  APROVAR_QUITACAO: 'aprovar_quitacao',
  RECUSAR_QUITACAO: 'recusar_quitacao',
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_LIGA: 'view_liga',
  VIEW_HEALTH: 'view_health',
  SUBSCRIBE_PUSH: 'subscribe_push',
  UNSUBSCRIBE_PUSH: 'unsubscribe_push',
  UPDATE_PREFERENCES: 'update_preferences'
};
```

**Índices:**
```javascript
db.adminactivitylogs.createIndex({ email: 1, timestamp: -1 });
db.adminactivitylogs.createIndex({ action: 1, timestamp: -1 });
db.adminactivitylogs.createIndex({ ligaId: 1, timestamp: -1 });
db.adminactivitylogs.createIndex({ timestamp: -1 });
```

**Exemplo de documento:**
```javascript
{
  _id: ObjectId("65b1f2a3c4d5e6f7a8b9c0d1"),
  email: "admin@example.com",
  action: "consolidacao_manual",
  ligaId: 1,
  rodada: 6,
  details: {
    duracao: 12500,           // ms
    participantesAtualizados: 12,
    modulosCalculados: ["top10", "melhormes", "artilheiro"]
  },
  result: "success",
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Linux; Android 12) Chrome/120.0.0.0 Mobile",
  timestamp: ISODate("2026-02-02T18:30:45.123Z")
}
```

---

## 📁 Estrutura de Arquivos Detalhada

```
public/
├─ admin-mobile/
│  ├─ index.html                   # Shell do app (SPA)
│  ├─ login.html                   # Tela de login
│  ├─ manifest.json                # PWA manifest
│  ├─ service-worker.js            # Service Worker
│  │
│  ├─ icons/                       # Ícones do PWA (8 tamanhos)
│  │  ├─ icon-72x72.png
│  │  ├─ icon-96x96.png
│  │  ├─ icon-128x128.png
│  │  ├─ icon-144x144.png
│  │  ├─ icon-152x152.png
│  │  ├─ icon-192x192.png
│  │  ├─ icon-384x384.png
│  │  └─ icon-512x512.png
│  │
│  ├─ css/
│  │  ├─ admin-mobile.css          # Estilos base (reset, layout, typography)
│  │  ├─ components.css            # Componentes (cards, buttons, nav, FAB)
│  │  └─ dark-mode.css             # Tokens dark mode
│  │
│  └─ js/
│     ├─ app.js                    # Inicialização + routing SPA
│     ├─ auth.js                   # Autenticação (login, logout, session)
│     ├─ api.js                    # Wrapper para API calls (fetch + retry)
│     │
│     ├─ components/
│     │  ├─ bottom-nav.js          # Bottom Navigation (5 itens)
│     │  ├─ fab.js                 # Floating Action Button
│     │  ├─ modal.js               # Modais genéricos (confirm, alert, custom)
│     │  ├─ toast.js               # Toast notifications
│     │  ├─ skeleton.js            # Skeleton loading
│     │  └─ pull-refresh.js        # Pull-to-refresh component
│     │
│     ├─ pages/
│     │  ├─ dashboard.js           # Dashboard principal (ligas + health)
│     │  ├─ ligas.js               # Gestão de ligas (lista + detalhes)
│     │  ├─ consolidacao.js        # Consolidação manual
│     │  ├─ financeiro.js          # Acertos financeiros
│     │  ├─ health.js              # Dashboard de saúde
│     │  └─ profile.js             # Perfil e configurações
│     │
│     └─ utils/
│        ├─ offline.js             # Gerenciamento offline (IndexedDB)
│        ├─ notifications.js       # Push notifications (subscribe, handle)
│        ├─ formatters.js          # Formatação (moeda, data, etc)
│        ├─ validators.js          # Validações de formulários
│        └─ storage.js             # LocalStorage wrapper
│
routes/
├─ admin-mobile-routes.js          # Rotas mobile (/api/admin/mobile/*)
└─ admin-notifications-routes.js   # Rotas notificações (/api/admin/notifications/*)
│
controllers/
├─ adminMobileController.js        # Lógica mobile-specific
└─ adminNotificationsController.js # Lógica push notifications
│
models/
├─ AdminPushSubscription.js        # Model para subscriptions
└─ AdminActivityLog.js             # Model para logs de atividade
│
middleware/
└─ adminMobileAuth.js              # Middleware de autenticação mobile (JWT)
│
utils/
└─ pushNotificationService.js      # Serviço de envio de push (web-push)
```

---

## 🔐 Autenticação e Segurança

### Fluxo de Autenticação

```
┌─────────────┐                    ┌─────────────┐
│   Mobile    │                    │   Backend   │
│   Device    │                    │   (Node.js) │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. GET /login.html              │
       ├────────────────────────────────>│
       │                                  │
       │ 2. Replit Auth (OpenID Connect) │
       ├────────────────────────────────>│
       │                                  │
       │ 3. Callback + Session Cookie    │
       │<────────────────────────────────┤
       │                                  │
       │ 4. POST /api/admin/mobile/auth  │
       ├────────────────────────────────>│
       │                                  │
       │                    5. Valida admin (collection)
       │                    6. Gera JWT token (24h)
       │                                  │
       │ 7. { token, email, nome }       │
       │<────────────────────────────────┤
       │                                  │
       │ 8. Salva token (localStorage)   │
       │                                  │
       │ 9. API calls com Authorization  │
       ├────────────────────────────────>│
       │    Bearer <token>                │
       │                                  │
       │ 10. Valida JWT + Admin          │
       │                                  │
       │ 11. Response                    │
       │<────────────────────────────────┤
       │                                  │
```

### Middleware de Autenticação Mobile

**Arquivo:** `middleware/adminMobileAuth.js`

```javascript
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const JWT_EXPIRATION = '24h';

/**
 * Gera JWT token para admin autenticado
 */
function generateToken(email, nome) {
  return jwt.sign(
    { email, nome, type: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Middleware: valida JWT token + verifica se é admin
 */
async function validateAdminToken(req, res, next) {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Valida JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verifica se é admin
    const db = req.app.locals.db;
    const admin = await db.collection('admins').findOne({ email: decoded.email });

    if (!admin && !process.env.ADMIN_EMAILS?.split(',').includes(decoded.email)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Adiciona info do admin no request
    req.admin = {
      email: decoded.email,
      nome: decoded.nome
    };

    next();
  } catch (error) {
    console.error('Erro no validateAdminToken:', error);
    res.status(500).json({ error: 'Erro ao validar token' });
  }
}

module.exports = {
  generateToken,
  validateAdminToken
};
```

### Endpoint de Login Mobile

**Arquivo:** `routes/admin-mobile-routes.js` (trecho)

```javascript
const { generateToken } = require('../middleware/adminMobileAuth');

// POST /api/admin/mobile/auth
router.post('/auth', async (req, res) => {
  try {
    // Verifica se usuário está autenticado via Replit Auth (session)
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { email, nome } = req.session.usuario;

    // Verifica se é admin
    const admin = await req.app.locals.db.collection('admins').findOne({ email });
    const isAdminEmail = process.env.ADMIN_EMAILS?.split(',').includes(email);

    if (!admin && !isAdminEmail) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Gera JWT token
    const token = generateToken(email, nome);

    // Log de atividade
    await req.app.locals.db.collection('adminactivitylogs').insertOne({
      email,
      action: 'login',
      details: { platform: 'mobile' },
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });

    res.json({
      token,
      email,
      nome,
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Erro no /auth:', error);
    res.status(500).json({ error: 'Erro ao autenticar' });
  }
});
```

---

## 🌐 API Endpoints Detalhados

### Convenções de API

- **Base URL:** `/api/admin/mobile/*`
- **Autenticação:** Header `Authorization: Bearer <token>`
- **Content-Type:** `application/json`
- **Rate Limiting:** 100 requests/min por IP
- **Error Format:**
  ```json
  {
    "error": "Mensagem de erro legível",
    "code": "ERROR_CODE",
    "details": {}
  }
  ```

---

### 1. Dashboard Principal

#### `GET /api/admin/mobile/dashboard`

**Descrição:** Retorna dados do dashboard (ligas, health score, últimas ações)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "healthScore": 95,
  "healthStatus": "healthy",
  "ligas": [
    {
      "id": 1,
      "nome": "SuperCartola",
      "temporada": 2026,
      "participantesAtivos": 12,
      "participantesTotais": 15,
      "rodadaAtual": 6,
      "ultimaConsolidacao": {
        "rodada": 5,
        "timestamp": "2026-02-01T18:30:00.000Z",
        "status": "success"
      },
      "saldoTotal": 1200.00,
      "inadimplentes": 2,
      "modulosAtivos": ["top10", "melhormes", "artilheiro"]
    },
    {
      "id": 2,
      "nome": "Liga Sobral",
      "temporada": 2026,
      "participantesAtivos": 8,
      "participantesTotais": 10,
      "rodadaAtual": 6,
      "ultimaConsolidacao": {
        "rodada": 5,
        "timestamp": "2026-02-01T18:30:00.000Z",
        "status": "success"
      },
      "saldoTotal": 800.00,
      "inadimplentes": 0,
      "modulosAtivos": ["top10", "melhormes"]
    }
  ],
  "ultimasAcoes": [
    {
      "tipo": "consolidacao",
      "ligaNome": "SuperCartola",
      "rodada": 5,
      "timestamp": "2026-02-01T18:30:00.000Z",
      "status": "success"
    },
    {
      "tipo": "acerto",
      "ligaNome": "SuperCartola",
      "participante": "João Silva",
      "valor": 100.00,
      "timestamp": "2026-02-01T14:20:00.000Z"
    },
    {
      "tipo": "quitacao",
      "ligaNome": "Liga Sobral",
      "participante": "Maria Santos",
      "valor": 50.00,
      "timestamp": "2026-02-01T10:15:00.000Z"
    }
  ]
}
```

**Response (401):**
```json
{
  "error": "Token inválido ou expirado",
  "code": "UNAUTHORIZED"
}
```

---

### 2. Gestão de Ligas

#### `GET /api/admin/mobile/ligas`

**Descrição:** Lista todas as ligas gerenciadas pelo admin

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `temporada` (opcional): Filtrar por temporada (default: atual)
- `ativo` (opcional): Filtrar por ativo (true/false)

**Response (200):**
```json
{
  "ligas": [
    {
      "id": 1,
      "nome": "SuperCartola",
      "temporada": 2026,
      "ativo": true,
      "participantesAtivos": 12,
      "saldoTotal": 1200.00,
      "rodadaAtual": 6
    },
    {
      "id": 2,
      "nome": "Liga Sobral",
      "temporada": 2026,
      "ativo": true,
      "participantesAtivos": 8,
      "saldoTotal": 800.00,
      "rodadaAtual": 6
    }
  ]
}
```

---

#### `GET /api/admin/mobile/ligas/:ligaId`

**Descrição:** Detalhes completos de uma liga

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "nome": "SuperCartola",
  "temporada": 2026,
  "ativo": true,
  "rodadaAtual": 6,
  "participantesAtivos": 12,
  "participantesTotais": 15,
  "saldoTotal": 1200.00,
  "inadimplentes": 2,
  "ultimaConsolidacao": {
    "rodada": 5,
    "timestamp": "2026-02-01T18:30:00.000Z",
    "status": "success",
    "duracao": 12500
  },
  "modulosAtivos": {
    "top10": true,
    "melhormes": true,
    "artilheiro": true,
    "luva": false,
    "campinho": false,
    "dicas": false
  },
  "participantes": [
    {
      "id": "13935277",
      "nome": "João Silva",
      "nomeTime": "Timão do João",
      "ativo": true,
      "saldo": 150.00,
      "inadimplente": false,
      "escudo": "262",
      "pontos": 345.67
    },
    // ... mais 11 participantes
  ],
  "estatisticas": {
    "totalPagamentos": 2500.00,
    "totalPremiacoes": 1300.00,
    "mediaPontos": 298.45,
    "mediaPatrimonio": 125.60
  }
}
```

**Response (404):**
```json
{
  "error": "Liga não encontrada",
  "code": "LIGA_NOT_FOUND"
}
```

---

### 3. Consolidação

#### `POST /api/admin/mobile/consolidacao`

**Descrição:** Inicia consolidação manual de uma rodada

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "ligaId": 1,
  "rodada": 6
}
```

**Response (200):**
```json
{
  "jobId": "consolidacao-1-6-1738516200000",
  "ligaId": 1,
  "rodada": 6,
  "status": "processing",
  "message": "Consolidação iniciada com sucesso",
  "estimatedTime": 15000
}
```

**Response (400):**
```json
{
  "error": "Rodada já consolidada",
  "code": "RODADA_JA_CONSOLIDADA"
}
```

**Response (422):**
```json
{
  "error": "Mercado ainda aberto",
  "code": "MERCADO_ABERTO",
  "details": {
    "fechamento": "2026-02-02T18:00:00.000Z"
  }
}
```

---

#### `GET /api/admin/mobile/consolidacao/status/:jobId`

**Descrição:** Status em tempo real de uma consolidação

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200) - Em andamento:**
```json
{
  "jobId": "consolidacao-1-6-1738516200000",
  "ligaId": 1,
  "rodada": 6,
  "status": "processing",
  "progress": 60,
  "currentStep": "Calculando módulos",
  "steps": [
    { "name": "Buscando pontuações", "status": "completed" },
    { "name": "Atualizando participantes", "status": "completed" },
    { "name": "Calculando módulos", "status": "processing" },
    { "name": "Gerando rankings", "status": "pending" },
    { "name": "Atualizando extratos", "status": "pending" }
  ],
  "startedAt": "2026-02-02T18:30:00.000Z"
}
```

**Response (200) - Concluído:**
```json
{
  "jobId": "consolidacao-1-6-1738516200000",
  "ligaId": 1,
  "rodada": 6,
  "status": "completed",
  "progress": 100,
  "resultado": {
    "participantesAtualizados": 12,
    "modulosCalculados": ["top10", "melhormes", "artilheiro"],
    "rankingGerado": true,
    "extratosAtualizados": 12
  },
  "startedAt": "2026-02-02T18:30:00.000Z",
  "completedAt": "2026-02-02T18:30:15.500Z",
  "duracao": 15500
}
```

**Response (200) - Erro:**
```json
{
  "jobId": "consolidacao-1-6-1738516200000",
  "ligaId": 1,
  "rodada": 6,
  "status": "error",
  "progress": 40,
  "error": "Falha ao buscar pontuações da API Cartola",
  "errorDetails": {
    "step": "Buscando pontuações",
    "message": "Timeout após 30s"
  },
  "startedAt": "2026-02-02T18:30:00.000Z",
  "failedAt": "2026-02-02T18:30:35.000Z"
}
```

---

#### `GET /api/admin/mobile/consolidacao/historico/:ligaId`

**Descrição:** Histórico de consolidações de uma liga

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `limit` (opcional): Limite de registros (default: 20)
- `temporada` (opcional): Filtrar por temporada (default: atual)

**Response (200):**
```json
{
  "ligaId": 1,
  "ligaNome": "SuperCartola",
  "historico": [
    {
      "rodada": 5,
      "status": "success",
      "timestamp": "2026-02-01T18:30:00.000Z",
      "duracao": 12500,
      "participantesAtualizados": 12,
      "adminEmail": "admin@example.com"
    },
    {
      "rodada": 4,
      "status": "success",
      "timestamp": "2026-01-25T18:30:00.000Z",
      "duracao": 11200,
      "participantesAtualizados": 12,
      "adminEmail": "admin@example.com"
    },
    {
      "rodada": 3,
      "status": "error",
      "timestamp": "2026-01-18T18:30:00.000Z",
      "error": "Timeout API Cartola",
      "adminEmail": "admin@example.com"
    }
  ]
}
```

---

### 4. Acertos Financeiros

#### `POST /api/admin/mobile/acertos`

**Descrição:** Registra novo acerto financeiro

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "ligaId": 1,
  "timeId": "13935277",
  "tipo": "pagamento",
  "valor": 100.00,
  "descricao": "Renovação temporada 2026",
  "temporada": 2026
}
```

**Response (201):**
```json
{
  "id": "65b1f2a3c4d5e6f7a8b9c0d1",
  "ligaId": 1,
  "timeId": "13935277",
  "participante": "João Silva",
  "tipo": "pagamento",
  "valor": 100.00,
  "descricao": "Renovação temporada 2026",
  "saldoAnterior": 50.00,
  "saldoNovo": 150.00,
  "adminEmail": "admin@example.com",
  "timestamp": "2026-02-02T19:00:00.000Z"
}
```

**Response (400):**
```json
{
  "error": "Validação falhou",
  "code": "VALIDATION_ERROR",
  "details": {
    "valor": "Valor deve ser maior que 0",
    "descricao": "Descrição é obrigatória"
  }
}
```

---

#### `GET /api/admin/mobile/acertos/:ligaId`

**Descrição:** Histórico de acertos de uma liga

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `limit` (opcional): Limite de registros (default: 50)
- `temporada` (opcional): Filtrar por temporada (default: atual)
- `timeId` (opcional): Filtrar por participante

**Response (200):**
```json
{
  "ligaId": 1,
  "ligaNome": "SuperCartola",
  "acertos": [
    {
      "id": "65b1f2a3c4d5e6f7a8b9c0d1",
      "timeId": "13935277",
      "participante": "João Silva",
      "tipo": "pagamento",
      "valor": 100.00,
      "descricao": "Renovação temporada 2026",
      "saldoResultante": 150.00,
      "adminEmail": "admin@example.com",
      "timestamp": "2026-02-02T19:00:00.000Z"
    },
    {
      "id": "65b1f2a3c4d5e6f7a8b9c0d2",
      "timeId": "13935278",
      "participante": "Maria Santos",
      "tipo": "pagamento",
      "valor": 50.00,
      "descricao": "Pagamento mensal",
      "saldoResultante": 75.00,
      "adminEmail": "admin@example.com",
      "timestamp": "2026-02-01T14:20:00.000Z"
    }
  ]
}
```

---

#### `GET /api/admin/mobile/quitacoes/pendentes`

**Descrição:** Lista quitações pendentes de aprovação

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "quitacoes": [
    {
      "id": "65b1f2a3c4d5e6f7a8b9c0d3",
      "ligaId": 1,
      "ligaNome": "SuperCartola",
      "timeId": "13935277",
      "participante": "João Silva",
      "valor": 100.00,
      "descricao": "Solicitação de quitação",
      "solicitadoEm": "2026-02-02T10:00:00.000Z",
      "comprovante": "https://exemplo.com/comprovante.jpg"
    },
    {
      "id": "65b1f2a3c4d5e6f7a8b9c0d4",
      "ligaId": 2,
      "ligaNome": "Liga Sobral",
      "timeId": "13935279",
      "participante": "Pedro Oliveira",
      "valor": 200.00,
      "descricao": "Quitação débitos",
      "solicitadoEm": "2026-02-01T15:30:00.000Z",
      "comprovante": null
    }
  ]
}
```

---

#### `PUT /api/admin/mobile/quitacoes/:id/aprovar`

**Descrição:** Aprova quitação pendente

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "observacao": "Pagamento via PIX confirmado"
}
```

**Response (200):**
```json
{
  "id": "65b1f2a3c4d5e6f7a8b9c0d3",
  "status": "aprovado",
  "aprovadoPor": "admin@example.com",
  "aprovadoEm": "2026-02-02T19:15:00.000Z",
  "observacao": "Pagamento via PIX confirmado"
}
```

---

#### `PUT /api/admin/mobile/quitacoes/:id/recusar`

**Descrição:** Recusa quitação pendente

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "motivo": "Comprovante inválido"
}
```

**Response (200):**
```json
{
  "id": "65b1f2a3c4d5e6f7a8b9c0d3",
  "status": "recusado",
  "recusadoPor": "admin@example.com",
  "recusadoEm": "2026-02-02T19:20:00.000Z",
  "motivo": "Comprovante inválido"
}
```

---

### 5. Dashboard de Saúde

#### `GET /api/admin/mobile/health`

**Descrição:** Dashboard de saúde adaptado para mobile

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "healthScore": 95,
  "status": "healthy",
  "timestamp": "2026-02-02T19:30:00.000Z",
  "components": [
    {
      "name": "MongoDB",
      "status": "healthy",
      "score": 100,
      "details": {
        "connected": true,
        "collections": 15,
        "lastBackup": "2026-02-02T03:00:00.000Z"
      }
    },
    {
      "name": "API Cartola",
      "status": "healthy",
      "score": 95,
      "details": {
        "responseTime": 350,
        "lastCheck": "2026-02-02T19:29:00.000Z",
        "mercadoStatus": "fechado"
      }
    },
    {
      "name": "Cache Redis",
      "status": "healthy",
      "score": 100,
      "details": {
        "connected": true,
        "hitRate": 0.87
      }
    },
    {
      "name": "Jogos do Dia",
      "status": "warning",
      "score": 70,
      "details": {
        "apiStatus": "degraded",
        "usingFallback": true,
        "cacheAge": 3600
      }
    }
  ]
}
```

---

### 6. Push Notifications

#### `POST /api/admin/notifications/subscribe`

**Descrição:** Registra subscription de push notification

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM=",
    "auth": "tBHItJI5svbpez7KI4CCXg=="
  },
  "preferences": {
    "mercadoFechou": true,
    "consolidacaoCompleta": true,
    "consolidacaoErro": true,
    "healthScoreBaixo": true,
    "quitacaoSolicitada": true,
    "inadimplenciaAlta": false
  }
}
```

**Response (201):**
```json
{
  "message": "Subscription registrada com sucesso",
  "email": "admin@example.com",
  "preferences": {
    "mercadoFechou": true,
    "consolidacaoCompleta": true,
    "consolidacaoErro": true,
    "healthScoreBaixo": true,
    "quitacaoSolicitada": true,
    "inadimplenciaAlta": false
  }
}
```

**Response (400):**
```json
{
  "error": "Subscription inválida",
  "code": "INVALID_SUBSCRIPTION"
}
```

---

#### `DELETE /api/admin/notifications/unsubscribe`

**Descrição:** Remove subscription de push notification

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Subscription removida com sucesso"
}
```

---

#### `GET /api/admin/notifications/preferences`

**Descrição:** Retorna preferências de notificação do admin

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "email": "admin@example.com",
  "subscribed": true,
  "preferences": {
    "mercadoFechou": true,
    "consolidacaoCompleta": true,
    "consolidacaoErro": true,
    "healthScoreBaixo": true,
    "quitacaoSolicitada": true,
    "inadimplenciaAlta": false
  },
  "lastNotificationAt": "2026-02-02T18:30:00.000Z"
}
```

**Response (404):**
```json
{
  "email": "admin@example.com",
  "subscribed": false
}
```

---

#### `PUT /api/admin/notifications/preferences`

**Descrição:** Atualiza preferências de notificação

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "mercadoFechou": true,
  "consolidacaoCompleta": true,
  "consolidacaoErro": true,
  "healthScoreBaixo": false,
  "quitacaoSolicitada": true,
  "inadimplenciaAlta": true
}
```

**Response (200):**
```json
{
  "message": "Preferências atualizadas com sucesso",
  "preferences": {
    "mercadoFechou": true,
    "consolidacaoCompleta": true,
    "consolidacaoErro": true,
    "healthScoreBaixo": false,
    "quitacaoSolicitada": true,
    "inadimplenciaAlta": true
  }
}
```

---

## 🔔 Push Notifications - Gatilhos

### Serviço de Push Notification

**Arquivo:** `utils/pushNotificationService.js`

```javascript
const webpush = require('web-push');

// VAPID keys (gerar com: npx web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = 'mailto:admin@supercartolamanager.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Envia push notification para um admin
 */
async function sendPushToAdmin(email, payload, db) {
  try {
    // Busca subscription do admin
    const subscription = await db.collection('adminpushsubscriptions').findOne({ email });

    if (!subscription) {
      console.log(`Admin ${email} não tem subscription ativa`);
      return;
    }

    // Verifica preferência para este tipo de notificação
    const eventType = payload.data?.eventType;
    if (eventType && subscription.preferences[eventType] === false) {
      console.log(`Admin ${email} desabilitou notificações de ${eventType}`);
      return;
    }

    // Envia push
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

    // Atualiza lastNotificationAt
    await db.collection('adminpushsubscriptions').updateOne(
      { email },
      { $set: { lastNotificationAt: new Date() } }
    );

    console.log(`Push enviado para ${email}:`, payload.title);
  } catch (error) {
    console.error(`Erro ao enviar push para ${email}:`, error);

    // Se subscription expirou ou é inválida, remove
    if (error.statusCode === 410 || error.statusCode === 404) {
      await db.collection('adminpushsubscriptions').deleteOne({ email });
      console.log(`Subscription inválida removida: ${email}`);
    }
  }
}

/**
 * Envia push para todos os admins de uma liga
 */
async function sendPushToLigaAdmins(ligaId, payload, db) {
  try {
    // Busca admins da liga (todos admins recebem por enquanto)
    const admins = await db.collection('admins').find({}).toArray();
    const adminEmails = admins.map(a => a.email);

    // Envia para cada admin
    for (const email of adminEmails) {
      await sendPushToAdmin(email, payload, db);
    }
  } catch (error) {
    console.error('Erro ao enviar push para admins da liga:', error);
  }
}

module.exports = {
  sendPushToAdmin,
  sendPushToLigaAdmins
};
```

### Gatilhos de Notificação

#### 1. Mercado Fechou

**Onde:** Após consolidação automática detectar mercado fechado

```javascript
const { sendPushToLigaAdmins } = require('../utils/pushNotificationService');

// Após detectar mercado fechou
await sendPushToLigaAdmins(ligaId, {
  title: '🎯 Mercado Fechou!',
  body: `Rodada ${rodada} pronta para consolidação`,
  icon: '/admin-mobile/icons/icon-192x192.png',
  badge: '/admin-mobile/icons/badge.png',
  data: {
    eventType: 'mercadoFechou',
    ligaId,
    rodada,
    url: `/admin-mobile/?action=consolidar&ligaId=${ligaId}&rodada=${rodada}`
  }
}, db);
```

---

#### 2. Consolidação Completada

**Onde:** Após consolidação manual/automática completar com sucesso

```javascript
await sendPushToLigaAdmins(ligaId, {
  title: '✅ Consolidação Concluída',
  body: `Rodada ${rodada} consolidada com sucesso em ${duracao}ms`,
  icon: '/admin-mobile/icons/icon-192x192.png',
  data: {
    eventType: 'consolidacaoCompleta',
    ligaId,
    rodada,
    duracao,
    url: `/admin-mobile/?action=dashboard`
  }
}, db);
```

---

#### 3. Consolidação com Erro

**Onde:** Após consolidação falhar

```javascript
await sendPushToLigaAdmins(ligaId, {
  title: '❌ Erro na Consolidação',
  body: `Falha ao consolidar Rodada ${rodada}. Verifique os logs.`,
  icon: '/admin-mobile/icons/icon-192x192.png',
  data: {
    eventType: 'consolidacaoErro',
    ligaId,
    rodada,
    error: errorMessage,
    url: `/admin-mobile/?action=consolidar&ligaId=${ligaId}&rodada=${rodada}`
  },
  requireInteraction: true
}, db);
```

---

#### 4. Health Score Baixo

**Onde:** No dashboard de saúde, quando score < 70

```javascript
const { sendPushToAdmin } = require('../utils/pushNotificationService');

// Busca todos admins
const admins = await db.collection('admins').find({}).toArray();

for (const admin of admins) {
  await sendPushToAdmin(admin.email, {
    title: '⚠️ Sistema Degradado',
    body: `Health Score caiu para ${healthScore}. Verifique o dashboard.`,
    icon: '/admin-mobile/icons/icon-192x192.png',
    data: {
      eventType: 'healthScoreBaixo',
      healthScore,
      url: '/admin-mobile/?action=health'
    },
    requireInteraction: true
  }, db);
}
```

---

#### 5. Quitação Solicitada

**Onde:** Quando participante solicita quitação

```javascript
await sendPushToLigaAdmins(ligaId, {
  title: '💰 Nova Quitação',
  body: `${participanteNome} solicitou quitação de R$ ${valor.toFixed(2)}`,
  icon: '/admin-mobile/icons/icon-192x192.png',
  data: {
    eventType: 'quitacaoSolicitada',
    ligaId,
    quitacaoId,
    timeId,
    valor,
    url: `/admin-mobile/?action=financeiro`
  }
}, db);
```

---

#### 6. Inadimplência Alta

**Onde:** Verificação periódica (cron) detecta > 30% inadimplentes

```javascript
await sendPushToLigaAdmins(ligaId, {
  title: '🚨 Inadimplência Alta',
  body: `${inadimplentes} participantes inadimplentes na ${ligaNome}`,
  icon: '/admin-mobile/icons/icon-192x192.png',
  data: {
    eventType: 'inadimplenciaAlta',
    ligaId,
    inadimplentes,
    porcentagem: (inadimplentes / totalParticipantes * 100).toFixed(1),
    url: `/admin-mobile/?action=financeiro&ligaId=${ligaId}`
  }
}, db);
```

---

## 📱 Frontend - Estrutura SPA

### Routing (SPA)

**Arquivo:** `public/admin-mobile/js/app.js`

```javascript
// Router simples baseado em hash
class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');

    const route = this.routes[path];
    if (route) {
      const params = this.parseQueryString(queryString);
      route(params);
      this.updateBottomNav(path);
    } else {
      this.routes['/']();
    }
  }

  navigate(path) {
    window.location.hash = path;
  }

  parseQueryString(queryString) {
    if (!queryString) return {};

    return queryString.split('&').reduce((acc, param) => {
      const [key, value] = param.split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
  }

  updateBottomNav(path) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.route === path) {
        item.classList.add('active');
      }
    });
  }
}

// Inicialização
const router = new Router();

// Rotas
router.addRoute('/', () => {
  import('./pages/dashboard.js').then(m => m.render());
});

router.addRoute('/ligas', () => {
  import('./pages/ligas.js').then(m => m.render());
});

router.addRoute('/consolidacao', () => {
  import('./pages/consolidacao.js').then(m => m.render());
});

router.addRoute('/financeiro', () => {
  import('./pages/financeiro.js').then(m => m.render());
});

router.addRoute('/health', () => {
  import('./pages/health.js').then(m => m.render());
});

router.addRoute('/profile', () => {
  import('./pages/profile.js').then(m => m.render());
});

// Atalhos (shortcuts do manifest)
const params = new URLSearchParams(window.location.search);
const action = params.get('action');

if (action === 'consolidar') {
  const ligaId = params.get('ligaId');
  const rodada = params.get('rodada');
  router.navigate(`/consolidacao?ligaId=${ligaId}&rodada=${rodada}`);
} else if (action === 'acerto') {
  router.navigate('/financeiro');
} else if (action === 'health') {
  router.navigate('/health');
}
```

---

### API Wrapper

**Arquivo:** `public/admin-mobile/js/api.js`

```javascript
const API_BASE = '/api/admin/mobile';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1s

class API {
  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      }
    };

    let lastError;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await fetch(url, config);

        if (response.status === 401) {
          // Token expirado - redireciona para login
          this.clearToken();
          window.location.href = '/admin-mobile/login.html';
          throw new Error('Token expirado');
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro na requisição');
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        console.error(`Tentativa ${i + 1}/${MAX_RETRIES} falhou:`, error);

        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  // Métodos de conveniência
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Endpoints específicos
  async getDashboard() {
    return this.get('/dashboard');
  }

  async getLigas() {
    return this.get('/ligas');
  }

  async getLiga(ligaId) {
    return this.get(`/ligas/${ligaId}`);
  }

  async consolidarRodada(ligaId, rodada) {
    return this.post('/consolidacao', { ligaId, rodada });
  }

  async getConsolidacaoStatus(jobId) {
    return this.get(`/consolidacao/status/${jobId}`);
  }

  async registrarAcerto(data) {
    return this.post('/acertos', data);
  }

  async getQuitacoesPendentes() {
    return this.get('/quitacoes/pendentes');
  }

  async aprovarQuitacao(id, observacao) {
    return this.put(`/quitacoes/${id}/aprovar`, { observacao });
  }

  async recusarQuitacao(id, motivo) {
    return this.put(`/quitacoes/${id}/recusar`, { motivo });
  }

  async getHealth() {
    return this.get('/health');
  }

  async subscribeNotifications(subscription, preferences) {
    return this.post('/notifications/subscribe', { ...subscription, preferences });
  }

  async getNotificationPreferences() {
    return this.get('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences) {
    return this.put('/notifications/preferences', preferences);
  }
}

export default new API();
```

---

## 🎨 CSS - Design Tokens

**Arquivo:** `public/admin-mobile/css/dark-mode.css`

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f172a;      /* slate-900 */
  --bg-secondary: #1e293b;    /* slate-800 */
  --bg-tertiary: #334155;     /* slate-700 */
  --bg-hover: #475569;        /* slate-600 */

  /* Text */
  --text-primary: #f1f5f9;    /* slate-100 */
  --text-secondary: #cbd5e1;  /* slate-300 */
  --text-muted: #94a3b8;      /* slate-400 */

  /* Accents */
  --accent-primary: #3b82f6;  /* blue-500 */
  --accent-success: #22c55e;  /* green-500 */
  --accent-warning: #f59e0b;  /* amber-500 */
  --accent-danger: #ef4444;   /* red-500 */
  --accent-info: #06b6d4;     /* cyan-500 */

  /* Borders */
  --border-color: #334155;    /* slate-700 */
  --border-focus: #3b82f6;    /* blue-500 */

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);

  /* Bottom Nav */
  --bottom-nav-bg: #1e293b;
  --bottom-nav-border: #334155;
  --bottom-nav-active: #3b82f6;
  --bottom-nav-inactive: #94a3b8;

  /* FAB */
  --fab-bg: #3b82f6;
  --fab-shadow: rgba(59, 130, 246, 0.4);

  /* Typography */
  --font-russo: 'Russo One', sans-serif;
  --font-inter: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}
```

---

## 📦 Service Worker

**Arquivo:** `public/admin-mobile/service-worker.js`

```javascript
const CACHE_NAME = 'scm-admin-v1';
const RUNTIME_CACHE = 'scm-admin-runtime';

// Arquivos para cache no install
const STATIC_ASSETS = [
  '/admin-mobile/',
  '/admin-mobile/index.html',
  '/admin-mobile/login.html',
  '/admin-mobile/css/admin-mobile.css',
  '/admin-mobile/css/components.css',
  '/admin-mobile/css/dark-mode.css',
  '/admin-mobile/js/app.js',
  '/admin-mobile/js/auth.js',
  '/admin-mobile/js/api.js',
  '/admin-mobile/icons/icon-192x192.png',
  '/admin-mobile/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - network-first para API, cache-first para static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache-first
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Fallback offline
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy (com fallback)
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || '/admin-mobile/icons/icon-192x192.png',
    badge: data.badge || '/admin-mobile/icons/badge.png',
    data: data.data,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/admin-mobile/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Se app já está aberto, foca nele
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Caso contrário, abre nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (para ações offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // TODO: Implementar sincronização de ações offline
  console.log('Background sync triggered');
}
```

---

## ✅ Checklist de Implementação

### Preparação
- [ ] Gerar VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Adicionar keys em `.env` (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
- [ ] Criar ícones PWA (72x72 até 512x512)
- [ ] Instalar dependência: `npm install web-push`

### Backend
- [ ] Criar models (`AdminPushSubscription`, `AdminActivityLog`)
- [ ] Criar `pushNotificationService.js`
- [ ] Criar `adminMobileAuth.js` (middleware JWT)
- [ ] Criar `adminMobileController.js`
- [ ] Criar `adminNotificationsController.js`
- [ ] Criar `admin-mobile-routes.js`
- [ ] Criar `admin-notifications-routes.js`
- [ ] Registrar rotas no `server.js`
- [ ] Implementar gatilhos de push (6 eventos)

### Frontend - Estrutura
- [ ] Criar pasta `public/admin-mobile/`
- [ ] Criar `manifest.json`
- [ ] Criar `service-worker.js`
- [ ] Criar `login.html`
- [ ] Criar `index.html` (shell SPA)
- [ ] Criar CSS base (dark-mode, components)

### Frontend - JavaScript
- [ ] `app.js` - Router SPA
- [ ] `auth.js` - Autenticação
- [ ] `api.js` - API wrapper
- [ ] `components/bottom-nav.js`
- [ ] `components/fab.js`
- [ ] `components/modal.js`
- [ ] `components/toast.js`
- [ ] `components/skeleton.js`
- [ ] `components/pull-refresh.js`
- [ ] `pages/dashboard.js`
- [ ] `pages/ligas.js`
- [ ] `pages/consolidacao.js`
- [ ] `pages/financeiro.js`
- [ ] `pages/health.js`
- [ ] `pages/profile.js`
- [ ] `utils/offline.js`
- [ ] `utils/notifications.js`
- [ ] `utils/formatters.js`
- [ ] `utils/validators.js`
- [ ] `utils/storage.js`

### Testes
- [ ] Testar instalação PWA (Android)
- [ ] Testar offline mode
- [ ] Testar push notifications (6 tipos)
- [ ] Testar em diferentes telas (320px, 375px, 414px)
- [ ] Lighthouse audit (Performance, PWA, Accessibility)
- [ ] Testar sincronização offline → online
- [ ] Testar tratamento de erros

---

## 📊 Estimativa de Implementação

| Fase | Descrição | Tempo |
|------|-----------|-------|
| FASE 1 | Setup PWA + Autenticação | 4h |
| FASE 2 | Dashboard + Bottom Nav + FAB | 3h |
| FASE 3 | Gestão de Ligas | 5h |
| FASE 4 | Consolidação | 4h |
| FASE 5 | Acertos Financeiros | 3h |
| FASE 6 | Dashboard Saúde | 2h |
| FASE 7 | Push Notifications | 3h |
| FASE 8 | Testes + Validação | 2h |
| **TOTAL** | | **26h** |

---

## 🎯 Próximos Passos

1. ✅ PRD criado
2. ✅ SPEC criado
3. ⏳ **Iniciar FASE 1:** Setup PWA + Estrutura Base

**Pronto para começar a implementação!** 🚀
