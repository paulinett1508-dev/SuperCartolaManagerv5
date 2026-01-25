# IMPLEMENTAÇÃO: FEAT-003 - Notificações Push (Web Push API)

**Status:** 🟡 Pronto para implementar
**Estimativa Total:** 11 horas
**Prioridade:** 🔥 ALTA
**Impacto:** Retenção + Engajamento + UX

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Arquitetura](#arquitetura)
4. [FASE 1: Setup Básico](#fase-1-setup-básico)
5. [FASE 2: Backend](#fase-2-backend)
6. [FASE 3: Service Worker](#fase-3-service-worker)
7. [FASE 4: Frontend](#fase-4-frontend)
8. [FASE 5: Gatilhos](#fase-5-gatilhos)
9. [FASE 6: Testes](#fase-6-testes)
10. [Checklist de Conclusão](#checklist-de-conclusão)

---

## Visão Geral

### O que será implementado

Sistema completo de **Web Push Notifications** permitindo enviar notificações aos participantes mesmo quando o app está fechado.

### Casos de Uso (MVP)

| Caso de Uso | Trigger | Exemplo de Notificação |
|-------------|---------|------------------------|
| **Rodada Consolidada** | Após cálculo de ranking | "Rodada 15 finalizada! Você fez 58.2 pontos e ficou em 3° lugar" |
| **Mito/Mico da Rodada** | Após identificar extremos | "Você é o MITO da rodada! 🏆 Parabéns!" |
| **Escalação Pendente** | 30min antes do fechamento | "Esqueceu de escalar? ⚠️ Mercado fecha em 30 minutos!" |

### Status da Infraestrutura

```
✅ PWA funcional (service-worker.js v3.1)
✅ Manifest configurado (manifest.json)
✅ App instalável (standalone mode)
❌ Biblioteca web-push (não instalada)
❌ VAPID keys (não geradas)
❌ Collection MongoDB (não existe)
❌ Handlers de push no SW (não implementados)
```

---

## Pré-requisitos

### Conhecimentos Técnicos

- [ ] Web Push API (MDN)
- [ ] Service Workers (eventos push/notificationclick)
- [ ] VAPID Protocol (RFC8292)
- [ ] MongoDB queries básicas

### Ferramentas

- [ ] Node.js 18+ instalado
- [ ] MongoDB rodando (local ou Atlas)
- [ ] Replit Secrets configurado
- [ ] HTTPS habilitado (Replit já tem)

---

## Arquitetura

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PARTICIPANTE ACEITA PERMISSÃO                            │
│    └─> participante-notifications.js                        │
│        └─> solicitarPermissao()                             │
│            └─> Notification.requestPermission()             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GERA SUBSCRIPTION                                         │
│    └─> serviceWorkerRegistration.pushManager.subscribe()    │
│        └─> { endpoint, keys: {p256dh, auth} }               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ENVIA AO BACKEND                                          │
│    └─> POST /api/notifications/subscribe                    │
│        └─> Salva em collection: push_subscriptions          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GATILHO DISPARA (ex: rodada consolidada)                 │
│    └─> consolidacaoController.consolidar()                  │
│        └─> notificationsController.sendPushNotification()   │
│            └─> webpush.sendNotification(subscription, {})   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SERVICE WORKER RECEBE                                     │
│    └─> service-worker.js: addEventListener('push')          │
│        └─> self.registration.showNotification(title, opts)  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. USUÁRIO CLICA NA NOTIFICAÇÃO                             │
│    └─> addEventListener('notificationclick')                │
│        └─> clients.openWindow(url)                          │
└─────────────────────────────────────────────────────────────┘
```

### Arquivos a Criar/Modificar

```
📦 Backend (5 arquivos)
├── models/PushSubscription.js                        [NOVO]
├── controllers/notificationsController.js            [NOVO]
├── routes/notifications-routes.js                    [NOVO]
├── controllers/consolidacao-controller.js            [MODIFICAR]
└── index.js                                          [MODIFICAR]

📱 Frontend (3 arquivos)
├── public/participante/service-worker.js             [MODIFICAR]
├── public/participante/js/modules/participante-notifications.js  [NOVO]
└── public/participante/fronts/configuracoes.html     [NOVO]

🔧 Config (2 locais)
├── Replit Secrets                                    [ADICIONAR 3 keys]
└── package.json                                      [MODIFICAR]
```

---

## FASE 1: Setup Básico

**Tempo:** ~2h | **Complexidade:** Baixa

### 1.1 Instalar Dependência

```bash
npm install web-push
```

### 1.2 Gerar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

**Saída esperada:**
```
=======================================
Public Key:
BJthRQ5Jn7Z... (87 caracteres)

Private Key:
xQR8Mf2v... (43 caracteres)
=======================================
```

### 1.3 Armazenar nos Replit Secrets

Ir em **Secrets** (ícone de cadeado) e adicionar:

```
VAPID_PUBLIC_KEY=BJthRQ5Jn7Z...
VAPID_PRIVATE_KEY=xQR8Mf2v...
VAPID_SUBJECT=mailto:admin@supercartolamanager.com
```

⚠️ **NUNCA commitar as keys no código!**

### 1.4 Criar Model: PushSubscription

**Arquivo:** `models/PushSubscription.js`

```javascript
import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  timeId: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  preferences: {
    rodadaConsolidada: { type: Boolean, default: true },
    mitoMico: { type: Boolean, default: true },
    escalacaoPendente: { type: Boolean, default: false },
    acertosFinanceiros: { type: Boolean, default: false }
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Index para limpar subscriptions expiradas
pushSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index composto para queries frequentes
pushSubscriptionSchema.index({ timeId: 1, active: 1 });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
```

### 1.5 Criar Índices no MongoDB

```javascript
// Executar no MongoDB Shell ou via script
db.push_subscriptions.createIndex({ timeId: 1, active: 1 });
db.push_subscriptions.createIndex({ endpoint: 1 }, { unique: true });
db.push_subscriptions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## FASE 2: Backend

**Tempo:** ~3h | **Complexidade:** Média

### 2.1 Controller de Notificações

**Arquivo:** `controllers/notificationsController.js`

```javascript
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// Configurar VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@supercartolamanager.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Salvar subscription do participante
 */
export const subscribe = async (req, res) => {
  try {
    const { subscription, preferences } = req.body;
    const timeId = req.session.usuario?.time_id;

    if (!timeId) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ erro: 'Subscription inválida' });
    }

    // Verificar se já existe
    let existing = await PushSubscription.findOne({
      endpoint: subscription.endpoint
    });

    if (existing) {
      // Atualizar preferências
      existing.preferences = preferences || existing.preferences;
      existing.active = true;
      existing.lastUsed = new Date();
      await existing.save();

      return res.json({
        sucesso: true,
        mensagem: 'Preferências atualizadas',
        subscription: existing
      });
    }

    // Criar nova subscription
    const newSubscription = new PushSubscription({
      timeId: String(timeId),
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      preferences: preferences || {},
      active: true
    });

    await newSubscription.save();

    res.json({
      sucesso: true,
      mensagem: 'Notificações ativadas!',
      subscription: newSubscription
    });

  } catch (erro) {
    console.error('[PUSH] Erro ao salvar subscription:', erro);
    res.status(500).json({ erro: 'Erro ao ativar notificações' });
  }
};

/**
 * Remover subscription
 */
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const timeId = req.session.usuario?.time_id;

    if (!timeId) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint, timeId: String(timeId) },
      { active: false }
    );

    res.json({ sucesso: true, mensagem: 'Notificações desativadas' });

  } catch (erro) {
    console.error('[PUSH] Erro ao remover subscription:', erro);
    res.status(500).json({ erro: 'Erro ao desativar notificações' });
  }
};

/**
 * Enviar notificação para um participante
 */
export const sendPushNotification = async (timeId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({
      timeId: String(timeId),
      active: true
    });

    if (subscriptions.length === 0) {
      console.log(`[PUSH] Nenhuma subscription ativa para timeId ${timeId}`);
      return { enviadas: 0, erros: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            },
            JSON.stringify(payload)
          );

          // Atualizar lastUsed
          sub.lastUsed = new Date();
          await sub.save();

          return { sucesso: true };

        } catch (erro) {
          console.error(`[PUSH] Erro ao enviar para ${sub.endpoint}:`, erro);

          // Se subscription expirou ou foi revogada, desativar
          if (erro.statusCode === 410 || erro.statusCode === 404) {
            sub.active = false;
            await sub.save();
          }

          return { sucesso: false, erro };
        }
      })
    );

    const stats = results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled' && result.value.sucesso) {
          acc.enviadas++;
        } else {
          acc.erros++;
        }
        return acc;
      },
      { enviadas: 0, erros: 0 }
    );

    console.log(`[PUSH] Enviado para timeId ${timeId}:`, stats);
    return stats;

  } catch (erro) {
    console.error('[PUSH] Erro ao enviar notificação:', erro);
    throw erro;
  }
};

/**
 * Enviar em lote para múltiplos participantes
 */
export const sendBulkNotifications = async (timeIds, payloadFn) => {
  try {
    const results = await Promise.allSettled(
      timeIds.map(async (timeId) => {
        const payload = typeof payloadFn === 'function'
          ? await payloadFn(timeId)
          : payloadFn;

        return sendPushNotification(timeId, payload);
      })
    );

    const totalStats = results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled') {
          acc.enviadas += result.value.enviadas;
          acc.erros += result.value.erros;
        } else {
          acc.erros++;
        }
        return acc;
      },
      { enviadas: 0, erros: 0 }
    );

    console.log('[PUSH] Total em lote:', totalStats);
    return totalStats;

  } catch (erro) {
    console.error('[PUSH] Erro ao enviar lote:', erro);
    throw erro;
  }
};

/**
 * Verificar status da subscription do participante
 */
export const getStatus = async (req, res) => {
  try {
    const timeId = req.session.usuario?.time_id;

    if (!timeId) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    const subscriptions = await PushSubscription.find({
      timeId: String(timeId),
      active: true
    });

    res.json({
      ativo: subscriptions.length > 0,
      total: subscriptions.length,
      preferences: subscriptions[0]?.preferences || {}
    });

  } catch (erro) {
    console.error('[PUSH] Erro ao verificar status:', erro);
    res.status(500).json({ erro: 'Erro ao verificar status' });
  }
};

/**
 * Limpar subscriptions expiradas (rodar via cron)
 */
export const cleanExpiredSubscriptions = async () => {
  try {
    const result = await PushSubscription.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { active: false, lastUsed: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } // 90 dias
      ]
    });

    console.log(`[PUSH] Limpeza: ${result.deletedCount} subscriptions removidas`);
    return result.deletedCount;

  } catch (erro) {
    console.error('[PUSH] Erro ao limpar subscriptions:', erro);
    throw erro;
  }
};

/**
 * Envio manual pelo admin (painel)
 */
export const sendManual = async (req, res) => {
  try {
    const { timeIds, title, body, url, tag } = req.body;

    // Verificar se é admin
    if (!req.session.usuario?.isAdmin) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const payload = {
      title,
      body,
      url: url || '/participante/home',
      tag: tag || 'manual',
      timestamp: Date.now()
    };

    const stats = await sendBulkNotifications(timeIds, payload);

    res.json({
      sucesso: true,
      mensagem: `Notificações enviadas: ${stats.enviadas} sucesso, ${stats.erros} erros`,
      stats
    });

  } catch (erro) {
    console.error('[PUSH] Erro ao enviar manual:', erro);
    res.status(500).json({ erro: 'Erro ao enviar notificações' });
  }
};
```

### 2.2 Rotas de Notificações

**Arquivo:** `routes/notifications-routes.js`

```javascript
import express from 'express';
import {
  subscribe,
  unsubscribe,
  getStatus,
  sendManual
} from '../controllers/notificationsController.js';

const router = express.Router();

// Participante
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/status', getStatus);

// Admin
router.post('/send', sendManual);

export default router;
```

### 2.3 Integrar no index.js

**Arquivo:** `index.js` (adicionar)

```javascript
// ... imports existentes ...
import notificationsRoutes from './routes/notifications-routes.js';

// ... código existente ...

// Rotas de notificações push
app.use('/api/notifications', notificationsRoutes);

// ... resto do código ...
```

### 2.4 Cron Job de Limpeza

**Arquivo:** `index.js` (adicionar no final)

```javascript
import cron from 'node-cron';
import { cleanExpiredSubscriptions } from './controllers/notificationsController.js';

// Limpar subscriptions expiradas toda segunda às 3h da manhã
cron.schedule('0 3 * * 1', async () => {
  console.log('[CRON] Executando limpeza de subscriptions...');
  await cleanExpiredSubscriptions();
});
```

---

## FASE 3: Service Worker

**Tempo:** ~1h | **Complexidade:** Baixa

### 3.1 Adicionar Handlers de Push

**Arquivo:** `public/participante/service-worker.js` (adicionar no final)

```javascript
// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

/**
 * Receber notificação push
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (erro) {
    console.error('[SW] Erro ao parsear push data:', erro);
    data = {
      title: 'Super Cartola Manager',
      body: 'Você tem uma nova notificação!',
      url: '/participante/home'
    };
  }

  const title = data.title || 'Super Cartola Manager';
  const options = {
    body: data.body || '',
    icon: '/escudos/default.png',
    badge: '/escudos/badge-72x72.png',
    image: data.image || null,
    data: {
      url: data.url || '/participante/home',
      timestamp: data.timestamp || Date.now()
    },
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Clique na notificação
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/participante/home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Procurar janela já aberta
        for (let client of clientList) {
          if (client.url.includes('/participante') && 'focus' in client) {
            return client.focus().then(() => {
              // Enviar mensagem para redirecionar
              client.postMessage({
                type: 'NAVIGATE',
                url: urlToOpen
              });
            });
          }
        }

        // Abrir nova janela se não houver nenhuma aberta
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Fechar notificação
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event);
});
```

### 3.2 Criar Badge do PWA

**Arquivo:** `public/escudos/badge-72x72.png`

Criar ícone monocromático 72x72px (branco/transparente) com logo do app.

**Alternativa rápida:** Usar `default.png` redimensionado:

```bash
# Se tiver ImageMagick instalado
convert public/escudos/default.png -resize 72x72 public/escudos/badge-72x72.png
```

---

## FASE 4: Frontend

**Tempo:** ~2h | **Complexidade:** Média

### 4.1 Módulo de Notificações

**Arquivo:** `public/participante/js/modules/participante-notifications.js`

```javascript
/**
 * Módulo de Notificações Push
 * Gerencia permissões e subscriptions de Web Push API
 */

const NotificationsModule = {
  swRegistration: null,
  vapidPublicKey: null,

  async init() {
    console.log('[NOTIFICATIONS] Inicializando módulo...');

    try {
      // Buscar VAPID public key do servidor
      const response = await fetch('/api/notifications/vapid-key');
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;

      // Verificar status atual
      await this.verificarStatus();

    } catch (erro) {
      console.error('[NOTIFICATIONS] Erro ao inicializar:', erro);
    }
  },

  async verificarStatus() {
    try {
      const response = await fetch('/api/notifications/status');
      const data = await response.json();

      // Atualizar UI com status
      this.atualizarBadgeHeader(data.ativo);

      return data;

    } catch (erro) {
      console.error('[NOTIFICATIONS] Erro ao verificar status:', erro);
      return { ativo: false };
    }
  },

  async solicitarPermissao() {
    try {
      // Verificar suporte
      if (!('Notification' in window)) {
        throw new Error('Este navegador não suporta notificações');
      }

      if (!('serviceWorker' in navigator)) {
        throw new Error('Este navegador não suporta Service Workers');
      }

      // Solicitar permissão
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Permissão negada pelo usuário');
      }

      console.log('[NOTIFICATIONS] Permissão concedida!');

      // Subscrever
      await this.subscreverNotificacoes();

      return true;

    } catch (erro) {
      console.error('[NOTIFICATIONS] Erro ao solicitar permissão:', erro);
      alert(erro.message);
      return false;
    }
  },

  async subscreverNotificacoes(preferences = {}) {
    try {
      // Pegar SW registration
      this.swRegistration = await navigator.serviceWorker.ready;

      // Verificar se já está subscrito
      let subscription = await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        // Criar nova subscription
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });

        console.log('[NOTIFICATIONS] Nova subscription criada');
      } else {
        console.log('[NOTIFICATIONS] Subscription já existe');
      }

      // Enviar ao backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          preferences
        })
      });

      const data = await response.json();

      if (data.sucesso) {
        this.atualizarBadgeHeader(true);
        this.mostrarToast('✅ Notificações ativadas!');
        return true;
      } else {
        throw new Error(data.erro || 'Erro ao ativar');
      }

    } catch (erro) {
      console.error('[NOTIFICATIONS] Erro ao subscrever:', erro);
      alert('Erro ao ativar notificações: ' + erro.message);
      return false;
    }
  },

  async desinscrever() {
    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      const subscription = await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        console.log('[NOTIFICATIONS] Nenhuma subscription ativa');
        return true;
      }

      // Remover no servidor
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      // Remover localmente
      await subscription.unsubscribe();

      this.atualizarBadgeHeader(false);
      this.mostrarToast('🔕 Notificações desativadas');

      return true;

    } catch (erro) {
      console.error('[NOTIFICATIONS] Erro ao desinscrever:', erro);
      return false;
    }
  },

  async testarNotificacao() {
    try {
      if (Notification.permission !== 'granted') {
        alert('Permissão de notificação não concedida');
        return;
      }

      // Criar notificação local para teste
      this.swRegistration = await navigator.serviceWorker.ready;

      await this.swRegistration.showNotification('Teste de Notificação', {
        body: 'Se você viu isso, as notificações estão funcionando! 🎉',
        icon: '/escudos/default.png',
        badge: '/escudos/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'test'
      });

    } catch (erro) {
      console.error('[NOTIFICATIONS] Erro ao testar:', erro);
      alert('Erro ao testar notificação: ' + erro.message);
    }
  },

  atualizarBadgeHeader(ativo) {
    const badge = document.querySelector('#notification-badge');
    if (badge) {
      badge.textContent = ativo ? '🔔' : '🔕';
      badge.title = ativo ? 'Notificações ativadas' : 'Notificações desativadas';
    }
  },

  mostrarToast(mensagem) {
    // Usar sistema de toast existente do app ou criar alert simples
    if (window.showToast) {
      window.showToast(mensagem, 'success');
    } else {
      alert(mensagem);
    }
  },

  // Converter VAPID key de base64 para Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
};

// Exportar para uso global
window.NotificationsModule = NotificationsModule;

// Auto-inicializar quando DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotificationsModule.init());
} else {
  NotificationsModule.init();
}
```

### 4.2 Endpoint para VAPID Public Key

**Arquivo:** `routes/notifications-routes.js` (adicionar)

```javascript
// Retornar VAPID public key para o frontend
router.get('/vapid-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
});
```

### 4.3 Tela de Configurações

**Arquivo:** `public/participante/fronts/configuracoes.html`

```html
<!-- Fragmento HTML para configurações de notificações -->
<div class="config-section">
  <div class="config-header">
    <span id="notification-badge" class="text-2xl">🔕</span>
    <h2 class="text-xl font-russo text-white ml-2">Notificações Push</h2>
  </div>

  <div class="config-body mt-4 space-y-4">
    <!-- Toggle Principal -->
    <div class="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
      <div>
        <p class="text-white font-semibold">Receber notificações</p>
        <p class="text-gray-400 text-sm">Alertas mesmo com app fechado</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="toggle-notifications" class="sr-only peer">
        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
      </label>
    </div>

    <!-- Preferências (só aparece se toggle ativo) -->
    <div id="notification-preferences" class="hidden space-y-3">
      <p class="text-gray-300 text-sm">Escolha o que deseja receber:</p>

      <label class="flex items-center p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600">
        <input type="checkbox" checked class="pref-checkbox" data-pref="rodadaConsolidada">
        <span class="ml-3 text-white">Resultados de rodada</span>
      </label>

      <label class="flex items-center p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600">
        <input type="checkbox" checked class="pref-checkbox" data-pref="mitoMico">
        <span class="ml-3 text-white">Mito/Mico da rodada</span>
      </label>

      <label class="flex items-center p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600">
        <input type="checkbox" class="pref-checkbox" data-pref="escalacaoPendente">
        <span class="ml-3 text-white">Mercado fechando</span>
      </label>

      <label class="flex items-center p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600">
        <input type="checkbox" class="pref-checkbox" data-pref="acertosFinanceiros">
        <span class="ml-3 text-white">Movimentações financeiras</span>
      </label>
    </div>

    <!-- Info -->
    <div class="bg-blue-900/30 border border-blue-500 rounded-lg p-3 mt-4">
      <p class="text-blue-200 text-sm">
        ℹ️ Você pode desativar a qualquer momento nas configurações do navegador.
      </p>
    </div>

    <!-- Botões -->
    <div class="flex gap-3 mt-4">
      <button
        id="btn-test-notification"
        class="flex-1 bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600"
      >
        Testar Notificação
      </button>
      <button
        id="btn-save-preferences"
        class="flex-1 bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600"
      >
        Salvar
      </button>
    </div>
  </div>
</div>

<script>
// Lógica da tela de configurações
const toggleNotifications = document.getElementById('toggle-notifications');
const preferencesSection = document.getElementById('notification-preferences');
const btnTest = document.getElementById('btn-test-notification');
const btnSave = document.getElementById('btn-save-preferences');

// Carregar status atual
async function carregarStatus() {
  const status = await window.NotificationsModule.verificarStatus();
  toggleNotifications.checked = status.ativo;

  if (status.ativo) {
    preferencesSection.classList.remove('hidden');

    // Carregar preferências
    if (status.preferences) {
      Object.keys(status.preferences).forEach(pref => {
        const checkbox = document.querySelector(`[data-pref="${pref}"]`);
        if (checkbox) checkbox.checked = status.preferences[pref];
      });
    }
  }
}

// Toggle principal
toggleNotifications.addEventListener('change', async (e) => {
  if (e.target.checked) {
    const sucesso = await window.NotificationsModule.solicitarPermissao();
    if (sucesso) {
      preferencesSection.classList.remove('hidden');
    } else {
      e.target.checked = false;
    }
  } else {
    await window.NotificationsModule.desinscrever();
    preferencesSection.classList.add('hidden');
  }
});

// Testar notificação
btnTest.addEventListener('click', () => {
  window.NotificationsModule.testarNotificacao();
});

// Salvar preferências
btnSave.addEventListener('click', async () => {
  const preferences = {};

  document.querySelectorAll('.pref-checkbox').forEach(checkbox => {
    preferences[checkbox.dataset.pref] = checkbox.checked;
  });

  const sucesso = await window.NotificationsModule.subscreverNotificacoes(preferences);

  if (sucesso) {
    alert('✅ Preferências salvas!');
  }
});

// Carregar ao abrir tela
carregarStatus();
</script>
```

### 4.4 Badge no Header

**Arquivo:** `public/participante/index.html` (adicionar no header)

```html
<!-- No header do app, adicionar badge de notificações -->
<div class="header-actions">
  <!-- ... outros ícones ... -->
  <span
    id="notification-badge"
    class="text-2xl cursor-pointer"
    title="Notificações"
    onclick="navigateTo('configuracoes')"
  >
    🔕
  </span>
</div>
```

---

## FASE 5: Gatilhos

**Tempo:** ~2h | **Complexidade:** Alta

### 5.1 Gatilho: Rodada Consolidada

**Arquivo:** `controllers/consolidacao-controller.js` (adicionar ao final da função `consolidar`)

```javascript
import { sendBulkNotifications } from './notificationsController.js';

// ... código existente da consolidação ...

// APÓS consolidar todos os participantes
try {
  console.log('[CONSOLIDACAO] Enviando notificações push...');

  const participantesAtivos = participantes.filter(p => p.ativo);
  const timeIds = participantesAtivos.map(p => String(p.time_id));

  // Função para gerar payload personalizado por participante
  const gerarPayload = async (timeId) => {
    // Buscar dados da rodada do participante
    const rodada = await Rodada.findOne({ time_id: Number(timeId), rodada: rodadaNumero });

    if (!rodada) {
      return null; // Pular se não encontrou
    }

    return {
      title: `Rodada ${rodadaNumero} finalizada! 🎉`,
      body: `Você fez ${rodada.pontos.toFixed(1)} pontos e ficou em ${rodada.posicao}° lugar`,
      url: '/participante/rodadas',
      tag: `rodada-${rodadaNumero}`,
      timestamp: Date.now()
    };
  };

  const stats = await sendBulkNotifications(timeIds, gerarPayload);

  console.log(`[CONSOLIDACAO] Notificações enviadas:`, stats);

} catch (erro) {
  console.error('[CONSOLIDACAO] Erro ao enviar notificações:', erro);
  // Não bloquear consolidação se notificações falharem
}
```

### 5.2 Gatilho: Mito/Mico da Rodada

**Arquivo:** `controllers/ranking-controller.js` (adicionar após cálculo de top10)

```javascript
import { sendPushNotification } from './notificationsController.js';

// ... código existente do ranking ...

// APÓS identificar mito e mico
const mito = ranking[0]; // Primeiro colocado
const mico = ranking[ranking.length - 1]; // Último colocado

// Enviar para o MITO
if (mito) {
  try {
    await sendPushNotification(String(mito.time_id), {
      title: '🏆 Você é o MITO da rodada!',
      body: `Parabéns! Com ${mito.pontos.toFixed(1)} pontos, você foi o melhor desta rodada!`,
      url: '/participante/historico',
      tag: `mito-rodada-${rodadaNumero}`,
      requireInteraction: true
    });
  } catch (erro) {
    console.error('[RANKING] Erro ao enviar notificação de MITO:', erro);
  }
}

// Enviar para o MICO (opcional, pode ser polêmico)
if (mico && mico.time_id !== mito.time_id) {
  try {
    await sendPushNotification(String(mico.time_id), {
      title: '💀 Ops... Você foi o Mico da rodada',
      body: `Com ${mico.pontos.toFixed(1)} pontos. Próxima rodada vai melhorar!`,
      url: '/participante/rodadas',
      tag: `mico-rodada-${rodadaNumero}`
    });
  } catch (erro) {
    console.error('[RANKING] Erro ao enviar notificação de MICO:', erro);
  }
}
```

### 5.3 Gatilho: Mercado Fechando

**Arquivo:** `index.js` (adicionar cron job)

```javascript
import cron from 'node-cron';
import { sendPushNotification } from './controllers/notificationsController.js';
import cartolaApiService from './services/cartolaApiService.js';
import Time from './models/Time.js';

// Verificar mercado a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    // Buscar status do mercado
    const statusMercado = await cartolaApiService.buscarStatusMercado();

    if (!statusMercado || statusMercado.mercado.status !== 'aberto') {
      return; // Mercado já fechou ou não está aberto
    }

    // Calcular tempo restante
    const agora = new Date();
    const fechamento = new Date(statusMercado.mercado.fechamento);
    const minutos = Math.floor((fechamento - agora) / 1000 / 60);

    // Notificar 30 minutos antes
    if (minutos === 30) {
      console.log('[CRON] Mercado fecha em 30 minutos, enviando notificações...');

      // Buscar participantes ativos
      const participantes = await Time.find({ ativo: true });

      // Enviar para todos (OU verificar quem não escalou ainda)
      for (const participante of participantes) {
        try {
          await sendPushNotification(String(participante.id), {
            title: '⚠️ Esqueceu de escalar?',
            body: `O mercado fecha em ${minutos} minutos!`,
            url: 'https://cartola.globo.com', // Abrir direto no Cartola
            tag: 'mercado-fechando',
            requireInteraction: true
          });
        } catch (erro) {
          console.error(`Erro ao notificar ${participante.id}:`, erro);
        }
      }
    }

  } catch (erro) {
    console.error('[CRON] Erro ao verificar mercado:', erro);
  }
});
```

### 5.4 Gatilho: Admin Manual (Painel)

**Arquivo:** `public/admin/enviar-notificacao.html` (nova página admin)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Enviar Notificação Push - Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white p-8">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-russo mb-6">📢 Enviar Notificação Push</h1>

    <form id="form-notificacao" class="space-y-4">
      <!-- Destinatários -->
      <div>
        <label class="block mb-2">Destinatários:</label>
        <select id="destinatarios" class="w-full bg-gray-800 p-2 rounded">
          <option value="todos">Todos os participantes</option>
          <option value="ativos">Apenas ativos</option>
          <option value="especificos">Específicos (escolher abaixo)</option>
        </select>
      </div>

      <!-- Seletor de participantes -->
      <div id="seletor-participantes" class="hidden">
        <label class="block mb-2">Selecione os participantes:</label>
        <div id="lista-participantes" class="bg-gray-800 p-4 rounded max-h-60 overflow-y-auto">
          <!-- Preenchido dinamicamente -->
        </div>
      </div>

      <!-- Título -->
      <div>
        <label class="block mb-2">Título:</label>
        <input
          type="text"
          id="titulo"
          class="w-full bg-gray-800 p-2 rounded"
          placeholder="Ex: Importante!"
          required
        >
      </div>

      <!-- Mensagem -->
      <div>
        <label class="block mb-2">Mensagem:</label>
        <textarea
          id="mensagem"
          class="w-full bg-gray-800 p-2 rounded h-24"
          placeholder="Escreva a mensagem aqui..."
          required
        ></textarea>
      </div>

      <!-- URL de destino -->
      <div>
        <label class="block mb-2">URL ao clicar (opcional):</label>
        <input
          type="text"
          id="url"
          class="w-full bg-gray-800 p-2 rounded"
          placeholder="/participante/home"
        >
      </div>

      <!-- Preview -->
      <div class="bg-gray-800 p-4 rounded">
        <p class="text-sm text-gray-400 mb-2">Preview:</p>
        <div class="bg-white text-black p-3 rounded">
          <p class="font-bold" id="preview-titulo">Título da notificação</p>
          <p class="text-sm" id="preview-mensagem">Mensagem aparecerá aqui...</p>
        </div>
      </div>

      <!-- Botões -->
      <div class="flex gap-3">
        <button
          type="button"
          id="btn-testar"
          class="flex-1 bg-gray-700 py-2 rounded hover:bg-gray-600"
        >
          Testar (só para mim)
        </button>
        <button
          type="submit"
          class="flex-1 bg-orange-500 py-2 rounded hover:bg-orange-600"
        >
          Enviar
        </button>
      </div>
    </form>
  </div>

  <script>
    // Preview em tempo real
    document.getElementById('titulo').addEventListener('input', (e) => {
      document.getElementById('preview-titulo').textContent = e.target.value || 'Título da notificação';
    });

    document.getElementById('mensagem').addEventListener('input', (e) => {
      document.getElementById('preview-mensagem').textContent = e.target.value || 'Mensagem aparecerá aqui...';
    });

    // Mostrar/ocultar seletor de participantes
    document.getElementById('destinatarios').addEventListener('change', async (e) => {
      const seletor = document.getElementById('seletor-participantes');

      if (e.target.value === 'especificos') {
        seletor.classList.remove('hidden');
        await carregarParticipantes();
      } else {
        seletor.classList.add('hidden');
      }
    });

    // Carregar lista de participantes
    async function carregarParticipantes() {
      try {
        const response = await fetch('/api/participantes');
        const participantes = await response.json();

        const lista = document.getElementById('lista-participantes');
        lista.innerHTML = participantes.map(p => `
          <label class="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer">
            <input type="checkbox" value="${p.time_id}" class="mr-2">
            <span>${p.nome_cartola} - ${p.nome_time}</span>
          </label>
        `).join('');

      } catch (erro) {
        console.error('Erro ao carregar participantes:', erro);
      }
    }

    // Enviar notificação
    document.getElementById('form-notificacao').addEventListener('submit', async (e) => {
      e.preventDefault();

      const destinatarios = document.getElementById('destinatarios').value;
      const titulo = document.getElementById('titulo').value;
      const mensagem = document.getElementById('mensagem').value;
      const url = document.getElementById('url').value || '/participante/home';

      let timeIds = [];

      // Determinar quem vai receber
      if (destinatarios === 'todos' || destinatarios === 'ativos') {
        const response = await fetch(`/api/participantes?ativo=${destinatarios === 'ativos'}`);
        const participantes = await response.json();
        timeIds = participantes.map(p => String(p.time_id));
      } else {
        const checkboxes = document.querySelectorAll('#lista-participantes input:checked');
        timeIds = Array.from(checkboxes).map(cb => cb.value);
      }

      if (timeIds.length === 0) {
        alert('Selecione pelo menos um destinatário!');
        return;
      }

      // Confirmar envio
      if (!confirm(`Enviar para ${timeIds.length} participante(s)?`)) {
        return;
      }

      // Enviar
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeIds,
            title: titulo,
            body: mensagem,
            url,
            tag: 'admin-manual'
          })
        });

        const data = await response.json();

        if (data.sucesso) {
          alert(`✅ ${data.mensagem}`);
          document.getElementById('form-notificacao').reset();
        } else {
          alert('❌ ' + data.erro);
        }

      } catch (erro) {
        console.error('Erro ao enviar:', erro);
        alert('Erro ao enviar notificações');
      }
    });

    // Testar (enviar só para o admin logado)
    document.getElementById('btn-testar').addEventListener('click', async () => {
      const titulo = document.getElementById('titulo').value || 'Teste';
      const mensagem = document.getElementById('mensagem').value || 'Esta é uma notificação de teste';

      // Enviar para o próprio admin (usando session)
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeIds: ['self'], // Backend deve interpretar como o usuário logado
            title: '[TESTE] ' + titulo,
            body: mensagem,
            url: '/participante/home',
            tag: 'test'
          })
        });

        const data = await response.json();
        alert(data.sucesso ? '✅ Teste enviado!' : '❌ ' + data.erro);

      } catch (erro) {
        console.error('Erro ao testar:', erro);
        alert('Erro ao enviar teste');
      }
    });
  </script>
</body>
</html>
```

---

## FASE 6: Testes

**Tempo:** ~1h | **Complexidade:** Média

### 6.1 Checklist de Testes

```markdown
## Testes de Compatibilidade

### Desktop
- [ ] Chrome Windows (última versão)
- [ ] Chrome Linux
- [ ] Edge Windows
- [ ] Firefox (opcional)

### Mobile
- [ ] Chrome Android (PWA instalado)
- [ ] Samsung Internet (se disponível)
- [ ] Safari iOS 16.4+ (PWA instalado)

## Testes Funcionais

### Permissão
- [ ] Solicitar permissão pela primeira vez
- [ ] Aceitar permissão → badge muda para 🔔
- [ ] Negar permissão → mensagem de erro clara
- [ ] Revogar permissão no navegador → sistema detecta

### Subscription
- [ ] Criar nova subscription
- [ ] Atualizar subscription existente
- [ ] Desinscrever → badge muda para 🔕
- [ ] Reinstalar PWA → subscription persiste

### Envio de Notificações
- [ ] Notificação de teste (botão)
- [ ] Notificação após consolidação de rodada
- [ ] Notificação de Mito da rodada
- [ ] Notificação de mercado fechando
- [ ] Envio manual pelo admin

### Interações
- [ ] Clicar em notificação → abre URL correta
- [ ] Clicar em notificação com app já aberto → navega sem recarregar
- [ ] Clicar em notificação com app fechado → abre app
- [ ] Fechar notificação sem clicar → não abre app

### Preferências
- [ ] Marcar/desmarcar preferências → salva corretamente
- [ ] Subscription respeita preferências
- [ ] Testar filtro por tipo de notificação

### Performance
- [ ] Rate limiting: máx 1 notif/rodada por tipo
- [ ] Envio em lote para 10+ participantes
- [ ] Cleanup de subscriptions expiradas (cron)

### Edge Cases
- [ ] Participante sem subscription ativa → não recebe
- [ ] Subscription expirada → é removida automaticamente
- [ ] Erro 410 (Gone) da API → marca como inativa
- [ ] Erro de rede no envio → não trava consolidação
```

### 6.2 Script de Teste Automatizado

**Arquivo:** `scripts/test-push-notifications.js`

```javascript
import PushSubscription from '../models/PushSubscription.js';
import { sendPushNotification, sendBulkNotifications } from '../controllers/notificationsController.js';
import connectDB from '../config/db.js';

async function testar() {
  await connectDB();

  console.log('🧪 TESTE: Notificações Push\n');

  // 1. Verificar subscriptions ativas
  const subscriptions = await PushSubscription.find({ active: true });
  console.log(`✅ Subscriptions ativas: ${subscriptions.length}\n`);

  if (subscriptions.length === 0) {
    console.log('❌ Nenhuma subscription encontrada. Configure uma pelo app primeiro.');
    process.exit(1);
  }

  // 2. Teste unitário: enviar para 1 participante
  const primeiroTimeId = subscriptions[0].timeId;
  console.log(`📤 Enviando teste para timeId ${primeiroTimeId}...`);

  const resultado1 = await sendPushNotification(primeiroTimeId, {
    title: '🧪 Teste Unitário',
    body: 'Se você recebeu isso, o sistema está funcionando!',
    url: '/participante/home',
    tag: 'test-unit'
  });

  console.log(`✅ Resultado: ${resultado1.enviadas} enviadas, ${resultado1.erros} erros\n`);

  // 3. Teste em lote: enviar para todos
  const timeIds = subscriptions.map(s => s.timeId);
  console.log(`📤 Enviando lote para ${timeIds.length} participante(s)...`);

  const resultado2 = await sendBulkNotifications(timeIds, {
    title: '🧪 Teste em Lote',
    body: 'Testando envio para múltiplos destinatários',
    url: '/participante/home',
    tag: 'test-batch'
  });

  console.log(`✅ Resultado: ${resultado2.enviadas} enviadas, ${resultado2.erros} erros\n`);

  // 4. Teste de payload personalizado
  console.log(`📤 Testando payload personalizado...`);

  const payloadFn = async (timeId) => ({
    title: `Olá participante ${timeId}!`,
    body: `Esta é uma mensagem personalizada para você`,
    url: '/participante/extrato',
    tag: `test-custom-${timeId}`
  });

  const resultado3 = await sendBulkNotifications(timeIds, payloadFn);

  console.log(`✅ Resultado: ${resultado3.enviadas} enviadas, ${resultado3.erros} erros\n`);

  console.log('✅ TODOS OS TESTES CONCLUÍDOS!\n');
  process.exit(0);
}

testar().catch(erro => {
  console.error('❌ Erro nos testes:', erro);
  process.exit(1);
});
```

**Executar:**
```bash
node scripts/test-push-notifications.js
```

---

## Checklist de Conclusão

### Setup
- [ ] ✅ web-push instalado (`npm list web-push`)
- [ ] ✅ VAPID keys geradas e salvas nos Secrets
- [ ] ✅ Collection `push_subscriptions` criada com índices
- [ ] ✅ Model `PushSubscription.js` implementado

### Backend
- [ ] ✅ `notificationsController.js` implementado
- [ ] ✅ `notifications-routes.js` implementado
- [ ] ✅ Rotas integradas no `index.js`
- [ ] ✅ Endpoint `/vapid-key` funcionando
- [ ] ✅ Cron job de limpeza configurado

### Service Worker
- [ ] ✅ Handler `push` implementado
- [ ] ✅ Handler `notificationclick` implementado
- [ ] ✅ Badge 72x72px criado em `/escudos/badge-72x72.png`
- [ ] ✅ Navegação funcionando ao clicar

### Frontend
- [ ] ✅ `participante-notifications.js` implementado
- [ ] ✅ Tela de configurações criada
- [ ] ✅ Badge de status no header
- [ ] ✅ Toggle "Receber Notificações" funcionando
- [ ] ✅ Botão "Testar Notificação" funcionando

### Gatilhos
- [ ] ✅ Rodada consolidada enviando notificações
- [ ] ✅ Mito/Mico da rodada enviando notificações
- [ ] ✅ Mercado fechando (cron 5min) funcionando
- [ ] ✅ Envio manual pelo admin implementado

### Testes
- [ ] ✅ Testado em Chrome Desktop
- [ ] ✅ Testado em Chrome Android (PWA)
- [ ] ✅ Testado em Safari iOS (se disponível)
- [ ] ✅ Rate limiting validado
- [ ] ✅ Script de teste automatizado rodado com sucesso

### Documentação
- [ ] ✅ Atualizar `CLAUDE.md` com seção de Push Notifications
- [ ] ✅ Documentar endpoints de API
- [ ] ✅ Criar guia para usuários (como ativar)

---

## Próximos Passos (Pós-MVP)

### Melhorias Futuras

1. **Notificações Avançadas**
   - [ ] Badge conquistado (integrar com FEAT-010)
   - [ ] Provocações pós-rodada (integrar com FEAT-011)
   - [ ] Histórico de notificações recebidas

2. **Personalização**
   - [ ] Horário preferido (não notificar à noite)
   - [ ] Quiet hours (silencioso das 22h às 7h)
   - [ ] Som customizado por tipo

3. **Analytics**
   - [ ] Taxa de abertura (cliques vs enviadas)
   - [ ] Conversão (ação após clicar)
   - [ ] Gráfico de engajamento

4. **Otimizações**
   - [ ] WebSockets para tempo real (em vez de polling)
   - [ ] Service Worker com background sync
   - [ ] Rich notifications com imagens

---

## Referências Técnicas

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [VAPID Protocol RFC8292](https://datatracker.ietf.org/doc/html/rfc8292)
- [Service Worker Notifications](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)

---

**Última atualização:** 25/01/2026
**Status:** 📝 Documento completo - Pronto para implementação
**Responsável:** Time de Desenvolvimento
**Aprovação:** Pendente
