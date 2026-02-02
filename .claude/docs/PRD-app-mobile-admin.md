# PRD - App Mobile Admin

**Feature ID:** FEAT-026
**Título:** App Mobile Admin - Gestão de Ligas pelo Celular 📱
**Prioridade:** ALTA
**Status:** IN PROGRESS
**Estimativa:** 20-25h
**Data:** 2026-02-02

---

## 📋 Contexto e Problema

### Situação Atual
Os administradores do Super Cartola Manager atualmente só podem gerenciar suas ligas através do **painel web desktop** (`/admin/gerenciar.html`). Isso cria limitações significativas:

- **Imobilidade:** Admin precisa estar no computador para qualquer ação
- **Atraso em decisões:** Não consegue consolidar rodadas ou aprovar acertos fora do escritório
- **Sem visibilidade:** Não tem acesso ao Dashboard de Saúde em tempo real
- **Falta de alertas:** Não recebe notificações de eventos críticos
- **UX inconsistente:** Participantes têm PWA mobile, admins não

### Cenários Problemáticos

**Cenário 1: Consolidação atrasada**
> "É domingo às 18h, acabou o último jogo. O admin está no churrasco e não consegue consolidar a rodada. Participantes ficam esperando os resultados."

**Cenário 2: Erro crítico não detectado**
> "O Health Score caiu para 40 (sistema degradado), mas o admin só descobriu na segunda-feira ao abrir o computador."

**Cenário 3: Acerto financeiro urgente**
> "Participante enviou PIX para renovar a temporada, mas admin está viajando e não consegue registrar o pagamento."

---

## 🎯 Objetivos

### Objetivo Principal
Criar um **PWA (Progressive Web App) instalável** que permita administradores gerenciarem ligas diretamente pelo celular, com experiência mobile-first e funcionalidades críticas para gestão em tempo real.

### Objetivos Secundários
1. Paridade de experiência entre participantes e admins (ambos com PWA)
2. Reduzir tempo de resposta em ações críticas (consolidação, acertos)
3. Aumentar visibilidade sobre saúde do sistema
4. Implementar sistema de notificações push para eventos importantes
5. Permitir operações offline com sincronização posterior

---

## 👥 Personas

### Persona Principal: Paulo (Administrador de Liga)
- **Perfil:** Gestor de 2 ligas (SuperCartola com 12 participantes, Sobral com 8)
- **Contexto:** Trabalha em horário comercial, mas rodadas acontecem nos finais de semana
- **Dores:**
  - Precisa carregar laptop para consolidar rodadas durante viagens
  - Não sabe se houve problemas até segunda-feira
  - Perde tempo respondendo "já registrei seu pagamento?" no WhatsApp
- **Expectativas:**
  - Consolidar rodadas pelo celular em qualquer lugar
  - Receber alerta quando mercado fechar
  - Aprovar pagamentos instantaneamente
  - Ver dashboard de saúde em tempo real

---

## 🎨 Solução Proposta

### Visão Geral
Um PWA instalável com **Bottom Navigation** e **Floating Action Button (FAB)** para ações rápidas. Interface dark mode, mobile-first, touch-optimized.

### Estrutura de Navegação

```
┌─────────────────────────────────┐
│ 🏠 Dashboard Admin              │ ← Título da tela
├─────────────────────────────────┤
│                                 │
│ [Conteúdo da tela atual]        │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [🏠] [💰] [⚙️] [🏥] [👤]       │ ← Bottom Nav (fixo)
└─────────────────────────────────┘
         [+] ← FAB (ações rápidas)
```

### Bottom Navigation (5 itens)

| Ícone | Label | Tela | Função |
|-------|-------|------|--------|
| 🏠 | Início | Dashboard | Resumo geral, cards de ligas, últimas ações |
| 💰 | Financeiro | Acertos | Registrar pagamentos, aprovar quitações, ver saldos |
| ⚙️ | Operações | Consolidação | Consolidar rodadas manualmente, ver histórico |
| 🏥 | Saúde | Health Dashboard | Dashboard adaptado do painel web |
| 👤 | Perfil | Configurações | Notificações, logout, sobre |

### Floating Action Button (FAB)
- **Contexto Dashboard:** Abre menu rápido (Consolidar, Novo Acerto, Ver Health)
- **Contexto Ligas:** Botão "Nova Liga" ou "Ações em Lote"
- **Contexto Financeiro:** Botão "Novo Acerto Rápido"
- **Contexto Consolidação:** Botão "Consolidar Agora"

---

## ✨ Funcionalidades (MVP)

### 1. Dashboard Principal Mobile 🏠

#### Layout
```
┌─────────────────────────────────┐
│ 🏠 Dashboard Admin              │
├─────────────────────────────────┤
│ 🟢 Sistema Saudável (Score: 95) │ ← Health Badge
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🏆 Liga SuperCartola        │ │ ← Card Liga
│ │ 12 participantes ativos     │ │
│ │ Rodada 5 consolidada ✅     │ │
│ │ Saldo Total: R$ 1.200,00    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🏆 Liga Sobral              │ │
│ │ 8 participantes ativos      │ │
│ │ Rodada 5 consolidada ✅     │ │
│ │ Saldo Total: R$ 800,00      │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 📊 Últimas Ações                │
│ • R5 consolidada - 15:30        │
│ • Pagamento aprovado - 14:20    │
│ • Quitação João - 10:15         │
├─────────────────────────────────┤
│ [🏠] [💰] [⚙️] [🏥] [👤]       │
└─────────────────────────────────┘
```

#### Componentes
- **Health Badge:** Cor dinâmica (🟢 ≥80, 🟡 60-79, 🔴 <60)
- **Card Liga:** Touch para expandir detalhes
- **Últimas Ações:** Timeline com ícones (🎯 consolidação, 💵 pagamento, ✅ quitação)
- **Pull-to-refresh:** Atualizar dados

---

### 2. Gestão de Ligas 📋

#### Detalhes de Liga (Tela Modal)
```
┌─────────────────────────────────┐
│ ← 🏆 Liga SuperCartola          │
├─────────────────────────────────┤
│ ℹ️ Informações Gerais           │
│ • Participantes: 12 ativos      │
│ • Temporada: 2026               │
│ • Rodada Atual: 5               │
│ • Última Consolidação: 15:30    │
├─────────────────────────────────┤
│ 💰 Financeiro                    │
│ • Saldo Total: R$ 1.200,00      │
│ • Inadimplentes: 2              │
│ • Premiações Pagas: R$ 500,00   │
├─────────────────────────────────┤
│ 🎮 Módulos Ativos                │
│ ✅ Top 10  ✅ Melhor Mês         │
│ ✅ Artilheiro  ❌ Luva de Ouro   │
├─────────────────────────────────┤
│ 👥 Participantes                 │
│ [Scroll horizontal de avatares] │
├─────────────────────────────────┤
│ [Ver Ranking] [Ver Extrato]     │
└─────────────────────────────────┘
```

#### Ações Disponíveis
- **Ver Ranking:** Abre ranking da liga (modal ou nova tela)
- **Ver Extrato:** Extrato financeiro da liga
- **Editar Liga:** Abre formulário (nome, ativa/inativa, módulos)
- **Gerenciar Participantes:** Lista com ações (ativar/desativar, editar saldo)

---

### 3. Consolidação Manual ⚙️

#### Interface
```
┌─────────────────────────────────┐
│ ⚙️ Consolidação de Rodadas      │
├─────────────────────────────────┤
│ 🏆 Liga SuperCartola            │ ← Seletor de liga
├─────────────────────────────────┤
│ 📅 Rodada 6                     │ ← Seletor de rodada
├─────────────────────────────────┤
│ Status: Mercado Fechado ✅      │
│ Última consolidação: Há 2 horas │
├─────────────────────────────────┤
│ [CONSOLIDAR AGORA]              │ ← Botão primário
├─────────────────────────────────┤
│ 📊 Histórico de Consolidações   │
│ ┌─────────────────────────────┐ │
│ │ Rodada 5 - 28/01 15:30 ✅   │ │
│ │ Rodada 4 - 21/01 14:45 ✅   │ │
│ │ Rodada 3 - 14/01 16:00 ❌   │ │ ← Erro (expandir)
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### Fluxo de Consolidação
1. Admin seleciona liga e rodada
2. Clica em "CONSOLIDAR AGORA"
3. Modal de confirmação: "Consolidar Rodada 6 da Liga SuperCartola?"
4. Progress bar em tempo real:
   ```
   ┌─────────────────────────────────┐
   │ ⚙️ Consolidando...              │
   ├─────────────────────────────────┤
   │ [████████░░░░░░░░] 60%          │
   │                                 │
   │ ✅ Buscando pontuações          │
   │ ✅ Calculando módulos            │
   │ ⏳ Gerando rankings...           │
   │ ⏳ Atualizando extratos...       │
   └─────────────────────────────────┘
   ```
5. Toast de sucesso: "Rodada 6 consolidada com sucesso! ✅"
6. Push notification (se em background)

#### Tratamento de Erros
- **Erro de API:** "Falha ao buscar pontuações. Tente novamente."
- **Erro de cálculo:** "Erro ao calcular módulo Top 10. Ver detalhes."
- **Erro de banco:** "Erro ao salvar rankings. Contate o suporte."

---

### 4. Acertos Financeiros 💰

#### Tela Principal
```
┌─────────────────────────────────┐
│ 💰 Acertos Financeiros          │
├─────────────────────────────────┤
│ [NOVO ACERTO] ← Botão destaque  │
├─────────────────────────────────┤
│ 🔔 Quitações Pendentes (2)      │
│ ┌─────────────────────────────┐ │
│ │ João Silva - R$ 100,00      │ │
│ │ [APROVAR] [RECUSAR]         │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Maria Santos - R$ 50,00     │ │
│ │ [APROVAR] [RECUSAR]         │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 📊 Histórico de Acertos         │
│ • João - R$ 100,00 - 28/01 ✅   │
│ • Pedro - R$ 50,00 - 27/01 ✅   │
│ • Ana - R$ 200,00 - 26/01 ✅    │
└─────────────────────────────────┘
```

#### Formulário de Novo Acerto (Modal)
```
┌─────────────────────────────────┐
│ ← Novo Acerto Financeiro        │
├─────────────────────────────────┤
│ Liga:                           │
│ [SuperCartola ▼]                │
│                                 │
│ Participante:                   │
│ [João Silva ▼] ← Autocomplete  │
│                                 │
│ Tipo:                           │
│ [Pagamento ▼] [Recebimento]     │
│                                 │
│ Valor: R$                       │
│ [100,00] ← Teclado numérico     │
│                                 │
│ Descrição:                      │
│ [Renovação temporada 2026]      │
│                                 │
│ [CANCELAR] [REGISTRAR]          │
└─────────────────────────────────┘
```

#### Validações
- Campo "Participante" com busca incremental
- Valor mínimo: R$ 1,00
- Descrição obrigatória
- Confirmação antes de salvar: "Registrar pagamento de R$ 100,00 para João Silva?"

---

### 5. Dashboard de Saúde Mobile 🏥

#### Adaptação do Dashboard Existente
O Dashboard de Saúde web (`/admin/dashboard-saude.html`) será adaptado para mobile com cards expansíveis (accordion).

```
┌─────────────────────────────────┐
│ 🏥 Dashboard de Saúde           │
├─────────────────────────────────┤
│ 🟢 Sistema Saudável             │
│ Score: 95/100                   │
├─────────────────────────────────┤
│ ▼ 🗄️ MongoDB (Expandido)        │
│ ┌─────────────────────────────┐ │
│ │ Status: Conectado ✅         │ │
│ │ Collections: 15              │ │
│ │ Último backup: 01/02 03:00   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ▶ 🎮 API Cartola (Collapsed)    │
├─────────────────────────────────┤
│ ▶ 💾 Cache Redis                │
├─────────────────────────────────┤
│ ▶ ⚽ Jogos do Dia                │
├─────────────────────────────────┤
│ Auto-refresh: ⏱️ 30s            │
└─────────────────────────────────┘
```

#### Features Mobile
- **Cards expansíveis:** Touch para expandir/colapsar
- **Pull-to-refresh:** Atualizar manualmente
- **Auto-refresh:** A cada 30s (indicador visual)
- **Gráficos responsivos:** Chart.js adaptado para telas pequenas
- **Indicadores visuais:** 🟢 (saudável), 🟡 (atenção), 🔴 (crítico)

---

### 6. Notificações Push 🔔

#### Eventos com Notificação

| Evento | Título | Mensagem | Ação |
|--------|--------|----------|------|
| **Mercado Fechou** | 🎯 Mercado Fechou! | Rodada 6 pronta para consolidação | Abrir consolidação |
| **Consolidação OK** | ✅ Consolidação Concluída | Rodada 6 consolidada com sucesso | Abrir dashboard |
| **Consolidação Erro** | ❌ Erro na Consolidação | Falha ao consolidar Rodada 6. Verifique. | Abrir logs |
| **Health Score Baixo** | ⚠️ Sistema Degradado | Health Score caiu para 45. Verifique! | Abrir health |
| **Quitação Solicitada** | 💰 Nova Quitação | João Silva solicitou quitação de R$ 100 | Abrir acertos |
| **Inadimplência Alta** | 🚨 Inadimplência Alta | 5 participantes inadimplentes na Liga X | Abrir extrato |

#### Configurações de Notificações (Tela Perfil)
```
┌─────────────────────────────────┐
│ 👤 Perfil                        │
├─────────────────────────────────┤
│ 🔔 Notificações Push             │
│                                 │
│ [✅] Mercado Fechou              │
│ [✅] Consolidação Completada     │
│ [✅] Erros Críticos              │
│ [✅] Health Score < 70           │
│ [✅] Quitações Solicitadas       │
│ [  ] Inadimplência Alta          │
│                                 │
│ [SALVAR PREFERÊNCIAS]           │
└─────────────────────────────────┘
```

#### Implementação Técnica
- **Service Worker:** Intercepta push events
- **Push API:** Web Push com VAPID keys
- **Model:** `AdminPushSubscription` (MongoDB)
- **Endpoints:**
  - `POST /api/admin/notifications/subscribe` (registrar subscription)
  - `POST /api/admin/notifications/unsubscribe` (remover)
  - `GET /api/admin/notifications/preferences` (listar preferências)
  - `PUT /api/admin/notifications/preferences` (atualizar)

---

### 7. Autenticação e Segurança 🔐

#### Login Mobile
```
┌─────────────────────────────────┐
│                                 │
│         🏆                      │
│   SUPER CARTOLA                 │
│      MANAGER                    │
│    [Modo Admin]                 │
│                                 │
│ [ENTRAR COM REPLIT AUTH]        │
│                                 │
│ ou                              │
│                                 │
│ Email:                          │
│ [________________]              │
│                                 │
│ Senha:                          │
│ [________________]              │
│                                 │
│ [ENTRAR COMO ADMIN]             │
│                                 │
└─────────────────────────────────┘
```

#### Validação de Acesso
1. Verifica session no backend (`req.session.usuario`)
2. Valida se email está em `admins` collection ou `ADMIN_EMAILS`
3. Retorna token JWT para API calls subsequentes
4. Token armazenado em `localStorage` (expira em 24h)

#### Proteção de Rotas
- Todas as rotas `/api/admin/*` exigem autenticação
- Token validado em middleware `isAdminAuthorizado()`
- Logout limpa session + localStorage + service worker cache

---

## 🏗️ Arquitetura Técnica

### Estrutura de Arquivos

```
public/
├─ admin-mobile/
│  ├─ index.html                   (Dashboard principal)
│  ├─ login.html                   (Tela de login)
│  ├─ manifest.json                (PWA manifest)
│  ├─ service-worker.js            (Cache + push)
│  ├─ icons/
│  │  ├─ icon-72x72.png
│  │  ├─ icon-96x96.png
│  │  ├─ icon-128x128.png
│  │  ├─ icon-144x144.png
│  │  ├─ icon-152x152.png
│  │  ├─ icon-192x192.png
│  │  ├─ icon-384x384.png
│  │  └─ icon-512x512.png
│  ├─ css/
│  │  ├─ admin-mobile.css          (Estilos base mobile-first)
│  │  ├─ components.css            (Cards, buttons, bottom-nav, FAB)
│  │  └─ dark-mode.css             (Dark mode tokens)
│  └─ js/
│     ├─ app.js                    (Inicialização do app)
│     ├─ auth.js                   (Autenticação e sessão)
│     ├─ api.js                    (Wrapper para API calls)
│     ├─ components/
│     │  ├─ bottom-nav.js          (Bottom Navigation)
│     │  ├─ fab.js                 (Floating Action Button)
│     │  ├─ modal.js               (Modais genéricos)
│     │  └─ toast.js               (Notificações toast)
│     ├─ pages/
│     │  ├─ dashboard.js           (Dashboard principal)
│     │  ├─ ligas.js               (Gestão de ligas)
│     │  ├─ consolidacao.js        (Consolidação)
│     │  ├─ financeiro.js          (Acertos financeiros)
│     │  ├─ health.js              (Dashboard saúde)
│     │  └─ profile.js             (Perfil e configurações)
│     └─ utils/
│        ├─ offline.js             (Gerenciamento offline)
│        ├─ notifications.js       (Push notifications)
│        └─ formatters.js          (Formatação de valores)
│
routes/
├─ admin-mobile-routes.js          (Endpoints específicos mobile)
└─ admin-notifications-routes.js   (Endpoints de notificações)
│
models/
├─ AdminPushSubscription.js        (Subscriptions de push)
└─ AdminActivityLog.js             (Log de atividades admin)
│
controllers/
├─ adminMobileController.js        (Lógica mobile-specific)
└─ adminNotificationsController.js (Lógica de push)
```

### Manifest.json (PWA)

```json
{
  "name": "Super Cartola Manager - Admin",
  "short_name": "SCM Admin",
  "description": "Gerencie suas ligas Cartola FC pelo celular",
  "start_url": "/admin-mobile/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#1e293b",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/admin-mobile/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/admin-mobile/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/admin-mobile/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/admin-mobile/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/admin-mobile/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/admin-mobile/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/admin-mobile/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/admin-mobile/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Consolidar Rodada",
      "short_name": "Consolidar",
      "description": "Consolidar rodada atual",
      "url": "/admin-mobile/?action=consolidar",
      "icons": [{"src": "/admin-mobile/icons/shortcut-consolidar.png", "sizes": "96x96"}]
    },
    {
      "name": "Novo Acerto",
      "short_name": "Acerto",
      "description": "Registrar acerto financeiro",
      "url": "/admin-mobile/?action=acerto",
      "icons": [{"src": "/admin-mobile/icons/shortcut-acerto.png", "sizes": "96x96"}]
    },
    {
      "name": "Dashboard Saúde",
      "short_name": "Saúde",
      "description": "Ver saúde do sistema",
      "url": "/admin-mobile/?action=health",
      "icons": [{"src": "/admin-mobile/icons/shortcut-health.png", "sizes": "96x96"}]
    }
  ]
}
```

### Service Worker (Cache Strategy)

```javascript
// Cache Strategy
const CACHE_NAME = 'scm-admin-v1';
const RUNTIME_CACHE = 'scm-admin-runtime';

// Arquivos para cache imediato (install)
const STATIC_ASSETS = [
  '/admin-mobile/',
  '/admin-mobile/index.html',
  '/admin-mobile/login.html',
  '/admin-mobile/css/admin-mobile.css',
  '/admin-mobile/js/app.js',
  '/admin-mobile/icons/icon-192x192.png',
  // Tailwind CDN
  'https://cdn.tailwindcss.com'
];

// Estratégias por tipo de recurso
const CACHE_STRATEGIES = {
  static: 'cache-first',      // HTML, CSS, JS
  api: 'network-first',        // API calls
  images: 'cache-first',       // Ícones, escudos
  fonts: 'cache-first'         // Fontes
};
```

### API Endpoints Mobile

#### Dashboard
- `GET /api/admin/mobile/dashboard` - Dados do dashboard (ligas, health, últimas ações)
- `GET /api/admin/mobile/ligas` - Lista de ligas gerenciadas
- `GET /api/admin/mobile/ligas/:ligaId` - Detalhes de uma liga

#### Consolidação
- `POST /api/admin/mobile/consolidacao` - Iniciar consolidação
- `GET /api/admin/mobile/consolidacao/status/:jobId` - Status em tempo real
- `GET /api/admin/mobile/consolidacao/historico/:ligaId` - Histórico

#### Financeiro
- `GET /api/admin/mobile/acertos/:ligaId` - Histórico de acertos
- `POST /api/admin/mobile/acertos` - Novo acerto
- `GET /api/admin/mobile/quitacoes/pendentes` - Quitações pendentes
- `PUT /api/admin/mobile/quitacoes/:id/aprovar` - Aprovar quitação
- `PUT /api/admin/mobile/quitacoes/:id/recusar` - Recusar quitação

#### Health
- `GET /api/admin/mobile/health` - Dashboard de saúde (adaptado)

#### Notificações
- `POST /api/admin/notifications/subscribe` - Registrar subscription
- `DELETE /api/admin/notifications/unsubscribe` - Remover subscription
- `GET /api/admin/notifications/preferences` - Preferências
- `PUT /api/admin/notifications/preferences` - Atualizar preferências

---

## 🎨 Design System (Mobile)

### Cores (Dark Mode)
```css
:root {
  /* Backgrounds */
  --bg-primary: #0f172a;      /* slate-900 */
  --bg-secondary: #1e293b;    /* slate-800 */
  --bg-tertiary: #334155;     /* slate-700 */

  /* Text */
  --text-primary: #f1f5f9;    /* slate-100 */
  --text-secondary: #cbd5e1;  /* slate-300 */
  --text-muted: #94a3b8;      /* slate-400 */

  /* Accents */
  --accent-primary: #3b82f6;  /* blue-500 */
  --accent-success: #22c55e;  /* green-500 */
  --accent-warning: #f59e0b;  /* amber-500 */
  --accent-danger: #ef4444;   /* red-500 */

  /* Bottom Nav */
  --bottom-nav-bg: #1e293b;
  --bottom-nav-active: #3b82f6;
  --bottom-nav-inactive: #94a3b8;

  /* FAB */
  --fab-bg: #3b82f6;
  --fab-shadow: rgba(59, 130, 246, 0.4);
}
```

### Tipografia
```css
/* Russo One - Títulos */
h1, h2, .title {
  font-family: 'Russo One', sans-serif;
  font-weight: 400;
}

/* Inter - Corpo */
body, p, span, .text {
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 400;
}

/* JetBrains Mono - Valores numéricos */
.numeric, .value, .currency {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}
```

### Componentes Base

#### Card
```css
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  touch-action: manipulation; /* Melhor performance em touch */
}
```

#### Button
```css
.btn-primary {
  background: var(--accent-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  min-height: 44px; /* Área de toque mínima */
  touch-action: manipulation;
}

.btn-primary:active {
  transform: scale(0.98); /* Feedback visual */
}
```

#### Bottom Navigation
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bottom-nav-bg);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  min-width: 64px;
  touch-action: manipulation;
}

.bottom-nav-item.active {
  color: var(--bottom-nav-active);
}
```

#### FAB (Floating Action Button)
```css
.fab {
  position: fixed;
  bottom: 80px; /* Acima do bottom nav */
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--fab-bg);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px var(--fab-shadow);
  z-index: 999;
  touch-action: manipulation;
}

.fab:active {
  transform: scale(0.95);
}
```

---

## 📱 UX/UI Patterns

### Pull-to-Refresh
```javascript
let startY = 0;
let pullDistance = 0;

document.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    startY = e.touches[0].pageY;
  }
});

document.addEventListener('touchmove', (e) => {
  if (startY > 0) {
    pullDistance = e.touches[0].pageY - startY;
    if (pullDistance > 0) {
      showRefreshIndicator(pullDistance);
    }
  }
});

document.addEventListener('touchend', () => {
  if (pullDistance > 80) {
    refreshData();
  }
  resetPullIndicator();
});
```

### Swipe Gestures
```javascript
// Swipe para deletar item de lista
let startX = 0;
let currentX = 0;

listItem.addEventListener('touchstart', (e) => {
  startX = e.touches[0].pageX;
});

listItem.addEventListener('touchmove', (e) => {
  currentX = e.touches[0].pageX;
  const diff = currentX - startX;

  if (diff < -50) {
    showDeleteButton(listItem);
  }
});
```

### Loading States
```html
<!-- Skeleton loading -->
<div class="skeleton-card">
  <div class="skeleton-title"></div>
  <div class="skeleton-text"></div>
  <div class="skeleton-text"></div>
</div>
```

### Toast Notifications
```javascript
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
```

---

## 🔄 Sincronização Offline

### Estratégia
1. **Online:** API calls normais
2. **Offline:** Operações ficam em fila (IndexedDB)
3. **Volta online:** Sincroniza fila automaticamente

### IndexedDB Structure
```javascript
const DB_NAME = 'scm-admin-offline';
const STORES = {
  pendingActions: 'pending_actions',  // Ações pendentes
  cachedData: 'cached_data',          // Dados em cache
  syncLog: 'sync_log'                 // Log de sincronização
};

// Exemplo de ação pendente
{
  id: 'uuid-v4',
  type: 'acerto_financeiro',
  data: {
    ligaId: 1,
    timeId: 13935277,
    valor: 100,
    tipo: 'pagamento',
    descricao: 'Renovação 2026'
  },
  timestamp: 1738502400000,
  synced: false
}
```

### Background Sync
```javascript
// Service Worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  const db = await openDB();
  const actions = await db.getAll('pending_actions');

  for (const action of actions) {
    try {
      await fetch(`/api/admin/mobile/${action.type}`, {
        method: 'POST',
        body: JSON.stringify(action.data)
      });

      await db.delete('pending_actions', action.id);
      showToast(`${action.type} sincronizado!`, 'success');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

## 📊 Métricas de Sucesso

### KPIs Quantitativos
1. **Tempo médio de consolidação:** < 30s (objetivo: 15s)
2. **Tempo de resposta em acertos:** < 1 min (objetivo: tempo real)
3. **Taxa de instalação do PWA:** > 60% dos admins
4. **Taxa de notificações habilitadas:** > 50%
5. **Uptime offline mode:** > 95%

### KPIs Qualitativos
1. **Satisfação do admin:** NPS > 8
2. **Facilidade de uso:** SUS Score > 80
3. **Performance:** Lighthouse Score > 90
4. **Redução de reclamações:** -70% em "demora para consolidar"

---

## 🚀 Roadmap de Implementação

### FASE 1: Setup PWA Admin (4h)
**Objetivo:** Estrutura base funcional com PWA instalável

**Tasks:**
- [ ] Criar estrutura `public/admin-mobile/`
- [ ] Criar `manifest.json` com ícones
- [ ] Implementar `service-worker.js` básico (cache)
- [ ] Criar `login.html` mobile
- [ ] Criar `index.html` (dashboard skeleton)
- [ ] Implementar autenticação (`auth.js`)
- [ ] Testar instalação como PWA

**Validação:**
- ✅ PWA instalável no Android
- ✅ Login funcionando
- ✅ Cache offline básico

---

### FASE 2: Dashboard Principal (3h)
**Objetivo:** Dashboard funcional com cards de ligas e health badge

**Tasks:**
- [ ] Criar endpoint `/api/admin/mobile/dashboard`
- [ ] Implementar `pages/dashboard.js`
- [ ] Renderizar cards de ligas
- [ ] Implementar health badge dinâmico
- [ ] Criar timeline de últimas ações
- [ ] Implementar pull-to-refresh

**Validação:**
- ✅ Cards de ligas renderizando corretamente
- ✅ Health badge com cor dinâmica
- ✅ Pull-to-refresh funcionando

---

### FASE 3: Bottom Nav + FAB (2h)
**Objetivo:** Navegação mobile-first funcional

**Tasks:**
- [ ] Criar componente `bottom-nav.js`
- [ ] Criar componente `fab.js`
- [ ] Implementar navegação entre telas
- [ ] Implementar menu rápido do FAB
- [ ] Adicionar animações de transição

**Validação:**
- ✅ Bottom Nav com 5 itens
- ✅ FAB com ações contextuais
- ✅ Navegação fluida entre telas

---

### FASE 4: Gestão de Ligas Mobile (5h)
**Objetivo:** Visualizar e gerenciar ligas

**Tasks:**
- [ ] Criar endpoint `/api/admin/mobile/ligas/:id`
- [ ] Implementar `pages/ligas.js`
- [ ] Criar modal de detalhes de liga
- [ ] Implementar scroll horizontal de participantes
- [ ] Criar cards de participantes touch-optimized
- [ ] Implementar busca/filtro de ligas

**Validação:**
- ✅ Modal de detalhes funcionando
- ✅ Participantes em scroll horizontal
- ✅ Busca funcionando

---

### FASE 5: Consolidação Mobile (4h)
**Objetivo:** Consolidar rodadas pelo celular

**Tasks:**
- [ ] Criar endpoint `/api/admin/mobile/consolidacao`
- [ ] Implementar `pages/consolidacao.js`
- [ ] Criar seletor de liga + rodada
- [ ] Implementar progress bar em tempo real (SSE ou polling)
- [ ] Criar histórico de consolidações
- [ ] Implementar tratamento de erros
- [ ] Adicionar toast de sucesso/erro

**Validação:**
- ✅ Consolidação funcionando
- ✅ Progress bar em tempo real
- ✅ Histórico renderizando corretamente

---

### FASE 6: Acertos Financeiros Mobile (3h)
**Objetivo:** Registrar e aprovar acertos pelo celular

**Tasks:**
- [ ] Criar endpoints `/api/admin/mobile/acertos`
- [ ] Implementar `pages/financeiro.js`
- [ ] Criar formulário de novo acerto (modal)
- [ ] Implementar autocomplete de participantes
- [ ] Criar lista de quitações pendentes
- [ ] Implementar aprovar/recusar quitação
- [ ] Criar histórico de acertos

**Validação:**
- ✅ Formulário com teclado numérico
- ✅ Autocomplete funcionando
- ✅ Quitações aprovadas/recusadas

---

### FASE 7: Dashboard Saúde Mobile (2h)
**Objetivo:** Adaptar dashboard de saúde para mobile

**Tasks:**
- [ ] Criar endpoint `/api/admin/mobile/health`
- [ ] Implementar `pages/health.js`
- [ ] Adaptar cards para accordion expansível
- [ ] Implementar auto-refresh (30s)
- [ ] Criar gráficos responsivos (Chart.js mobile)
- [ ] Implementar pull-to-refresh

**Validação:**
- ✅ Cards expansíveis funcionando
- ✅ Auto-refresh a cada 30s
- ✅ Gráficos responsivos

---

### FASE 8: Push Notifications Admin (3h)
**Objetivo:** Notificações push para eventos críticos

**Tasks:**
- [ ] Criar model `AdminPushSubscription`
- [ ] Criar endpoints de notificações
- [ ] Implementar `utils/notifications.js`
- [ ] Implementar subscribe/unsubscribe
- [ ] Criar gatilhos de notificação no backend:
  - Consolidação completada/falhou
  - Health score < 70
  - Mercado fechou
  - Quitação solicitada
- [ ] Criar tela de configurações (perfil)
- [ ] Implementar preferências de notificação

**Validação:**
- ✅ Notificações chegando no celular
- ✅ Gatilhos funcionando corretamente
- ✅ Preferências salvando

---

### FASE 9: Testes e Validação (2h)
**Objetivo:** Garantir qualidade e performance

**Tasks:**
- [ ] Testar instalação PWA (Android)
- [ ] Validar offline mode (sem conexão)
- [ ] Testar em diferentes tamanhos de tela
- [ ] Validar push notifications
- [ ] Lighthouse audit (Performance, PWA, Accessibility)
- [ ] Testar sincronização offline → online
- [ ] Validar tratamento de erros

**Validação:**
- ✅ Lighthouse Score > 90
- ✅ PWA instalável
- ✅ Offline mode funcionando
- ✅ Push notifications OK

---

## 📝 Checklist de Implementação

### Setup Inicial
- [ ] Criar estrutura de pastas `public/admin-mobile/`
- [ ] Criar `manifest.json` com todos os ícones
- [ ] Gerar ícones (72x72 até 512x512)
- [ ] Implementar `service-worker.js`
- [ ] Criar arquivos base HTML (index, login)

### Frontend (HTML/CSS/JS)
- [ ] `login.html` - Tela de login mobile
- [ ] `index.html` - Shell do app (bottom nav + container)
- [ ] `admin-mobile.css` - Estilos base dark mode
- [ ] `components.css` - Cards, buttons, bottom-nav, FAB
- [ ] `app.js` - Inicialização e routing
- [ ] `auth.js` - Autenticação e sessão
- [ ] `api.js` - Wrapper para API calls
- [ ] `components/bottom-nav.js` - Bottom Navigation
- [ ] `components/fab.js` - Floating Action Button
- [ ] `components/modal.js` - Modais genéricos
- [ ] `components/toast.js` - Toast notifications
- [ ] `pages/dashboard.js` - Dashboard principal
- [ ] `pages/ligas.js` - Gestão de ligas
- [ ] `pages/consolidacao.js` - Consolidação
- [ ] `pages/financeiro.js` - Acertos financeiros
- [ ] `pages/health.js` - Dashboard saúde
- [ ] `pages/profile.js` - Perfil e configurações
- [ ] `utils/offline.js` - Offline mode
- [ ] `utils/notifications.js` - Push notifications
- [ ] `utils/formatters.js` - Formatação

### Backend (Rotas + Controllers + Models)
- [ ] `routes/admin-mobile-routes.js` - Rotas mobile
- [ ] `routes/admin-notifications-routes.js` - Rotas notificações
- [ ] `controllers/adminMobileController.js` - Lógica mobile
- [ ] `controllers/adminNotificationsController.js` - Lógica push
- [ ] `models/AdminPushSubscription.js` - Model subscriptions
- [ ] `models/AdminActivityLog.js` - Model log de atividades

### Endpoints a Criar
- [ ] `GET /api/admin/mobile/dashboard`
- [ ] `GET /api/admin/mobile/ligas`
- [ ] `GET /api/admin/mobile/ligas/:id`
- [ ] `POST /api/admin/mobile/consolidacao`
- [ ] `GET /api/admin/mobile/consolidacao/status/:jobId`
- [ ] `GET /api/admin/mobile/consolidacao/historico/:ligaId`
- [ ] `GET /api/admin/mobile/acertos/:ligaId`
- [ ] `POST /api/admin/mobile/acertos`
- [ ] `GET /api/admin/mobile/quitacoes/pendentes`
- [ ] `PUT /api/admin/mobile/quitacoes/:id/aprovar`
- [ ] `PUT /api/admin/mobile/quitacoes/:id/recusar`
- [ ] `GET /api/admin/mobile/health`
- [ ] `POST /api/admin/notifications/subscribe`
- [ ] `DELETE /api/admin/notifications/unsubscribe`
- [ ] `GET /api/admin/notifications/preferences`
- [ ] `PUT /api/admin/notifications/preferences`

### Testes
- [ ] Teste de instalação PWA (Android)
- [ ] Teste offline mode
- [ ] Teste push notifications
- [ ] Teste em diferentes telas (320px, 375px, 414px)
- [ ] Lighthouse audit
- [ ] Teste de sincronização offline → online
- [ ] Teste de tratamento de erros

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Push notifications não funcionam em iOS** | Alto | Alta | Documentar limitação + fallback com polling |
| **Service Worker cache quebra app** | Alto | Média | Versionamento de cache + clear cache forçado |
| **Offline sync perde dados** | Crítico | Baixa | Testes rigorosos + log de sync + retry automático |
| **Performance ruim em dispositivos antigos** | Médio | Média | Lazy loading + skeleton loading + code splitting |
| **Admin esquece de habilitar notificações** | Médio | Alta | Onboarding educativo + lembrete periódico |

---

## 📚 Documentação Adicional

- **Deploy:** Instruções em `docs/DEPLOY-APP-MOBILE-ADMIN.md`
- **Testing:** Guia em `docs/TESTING-APP-MOBILE-ADMIN.md`
- **Push Notifications:** Setup em `docs/PUSH-NOTIFICATIONS-SETUP.md`
- **Troubleshooting:** FAQ em `docs/FAQ-APP-MOBILE-ADMIN.md`

---

## ✅ Critérios de Aceitação

### Funcional
- [ ] Admin consegue fazer login pelo celular
- [ ] Admin consegue instalar o app como PWA
- [ ] Admin visualiza dashboard com ligas e health score
- [ ] Admin consegue consolidar rodadas manualmente
- [ ] Admin consegue registrar acertos financeiros
- [ ] Admin consegue aprovar/recusar quitações
- [ ] Admin visualiza dashboard de saúde adaptado
- [ ] Admin recebe notificações push de eventos críticos
- [ ] Admin consegue usar o app offline (funções limitadas)

### Não-Funcional
- [ ] Lighthouse Performance Score > 90
- [ ] Lighthouse PWA Score = 100
- [ ] Lighthouse Accessibility Score > 95
- [ ] Tempo de carregamento inicial < 2s
- [ ] Tempo de resposta API < 500ms
- [ ] Instalação PWA funcionando em Android 9+
- [ ] Dark mode aplicado em todas as telas
- [ ] Touch targets mínimo de 44x44px
- [ ] Compatibilidade com Chrome/Safari mobile

---

## 🎯 Próximos Passos

1. **Aprovação do PRD:** Review com stakeholders
2. **Criação do SPEC:** Detalhamento técnico completo
3. **Setup inicial:** FASE 1 (4h)
4. **Iterações:** FASE 2-9 (16-21h)
5. **Testing e Deploy:** FASE 9 (2h)

---

**Estimativa Total:** 20-25 horas
**Prioridade:** ALTA
**Status:** READY TO START 🚀
