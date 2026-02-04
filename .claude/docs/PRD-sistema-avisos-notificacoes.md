# PRD - Sistema de Avisos/Notificações com Interface Admin

**Data:** 04/02/2026
**Autor:** Claude (Pesquisa Protocol - High Senior)
**Status:** Draft
**Prioridade:** Alta
**Estimativa:** 5-8 dias de desenvolvimento

---

## 📋 Resumo Executivo

Implementar **sistema completo de avisos/notificações** com duas frentes:

1. **Admin Interface:** Criar, editar, publicar e despublicar avisos com controle preciso (toggle ativo/inativo + botão "Enviar para App" para sincronização)
2. **App Participante:** Seção "Avisos" na home com scroll horizontal, cards categorizados (success/warning/info/urgent), badge de não lidos, marcação de leitura

**Objetivo:** Estabelecer canal de comunicação direta admin → participantes, otimizar densidade visual da home do participante (reduzir padding/gap, grid 2x2 compacto) inspirado no padrão visual de `dashboard-saude.html`.

---

## 🔍 Contexto e Análise

### Arquitetura Identificada

**Backend atual:**
- Express.js com rotas modularizadas em `/routes/`
- MongoDB Native Driver (sem Mongoose)
- Autenticação admin via middleware `isAdminAutorizado` (arquivo: `middleware/auth.js`)
- Padrão MVC: Controllers em `/controllers/`, Models em `/models/`
- Collection `pushsubscriptions` já existe para Web Push (sistema separado, não conflita)

**Frontend Admin:**
- SPA com navegação via JS (sem framework)
- Design tokens CSS em `/public/css/_admin-tokens.css`
- SuperModal para dialogs (já disponível: `public/js/super-modal.js`)
- Tipografia: Russo One (títulos), Inter (corpo), JetBrains Mono (números)

**Frontend Participante:**
- Módulos ES6 em `/public/participante/js/modules/`
- Fragmentos HTML em `/public/participante/fronts/`
- Cache IndexedDB para performance (padrão já usado em `dashboard-saude.html`)
- Navegação dinâmica via `participante-navigation.js`

---

## 🗂️ Módulos Identificados

### Backend (a criar)

#### Controllers
- **`controllers/avisosAdminController.js`** (NOVO)
  - `criarAviso(req, res)` - POST criar rascunho
  - `listarAvisos(req, res)` - GET listar todos
  - `toggleAtivoAviso(req, res)` - PATCH mudar estado on/off
  - `publicarAviso(req, res)` - POST sincronizar com app (publica)
  - `despublicarAviso(req, res)` - POST remover do app (oculta)
  - `editarAviso(req, res)` - PUT modificar conteúdo
  - `deletarAviso(req, res)` - DELETE remover permanente

- **`controllers/avisosParticipanteController.js`** (NOVO)
  - `getAvisos(req, res)` - GET avisos visíveis (global + liga + time)
  - `marcarComoLido(req, res)` - POST adicionar timeId ao array `leitoPor`
  - `getContadorNaoLidos(req, res)` - GET quantidade de avisos novos

#### Routes
- **`routes/avisos-admin-routes.js`** (NOVO)
  ```javascript
  POST   /api/admin/avisos/criar
  GET    /api/admin/avisos/listar
  PATCH  /api/admin/avisos/:id/toggle
  POST   /api/admin/avisos/:id/publicar
  POST   /api/admin/avisos/:id/despublicar
  PUT    /api/admin/avisos/:id/editar
  DELETE /api/admin/avisos/:id/deletar
  ```

- **`routes/avisos-participante-routes.js`** (NOVO)
  ```javascript
  GET  /api/avisos?ligaId={id}&timeId={id}
  POST /api/avisos/:id/marcar-lido
  GET  /api/avisos/contador-nao-lidos
  ```

#### Models
- **Não necessário criar Model Mongoose**
- Usar MongoDB Native Driver diretamente (padrão do projeto)

---

### Frontend Admin (a criar)

#### Página HTML
- **`public/admin/operacoes/notificador.html`** (NOVO)
  - Interface SPA com lista de avisos
  - Modal "Novo Aviso" (SuperModal)
  - Cards de aviso com toggle + botão "Enviar para App"

#### JavaScript
- **`public/js/admin/notificador-management.js`** (NOVO)
  - Renderizar lista de avisos
  - CRUD completo via fetch API
  - Toggle ativo/inativo (local)
  - Publicar/despublicar (sincronização com app)
  - Preview em tempo real no modal

#### CSS
- **Reutilizar:** `/public/css/_admin-tokens.css` (design tokens)
- **Adicionar:** Estilos de toggle switch personalizados
- **Namespace:** `.notificador-*` para evitar conflitos

---

### Frontend Participante (a modificar/criar)

#### HTML
- **`public/participante/fronts/boas-vindas.html`** (MODIFICAR)
  - Adicionar container `<div id="avisos-container">`
  - Seção com scroll horizontal hide-scrollbar

- **`public/participante/fronts/home.html`** (MODIFICAR, se existir separado)

#### JavaScript
- **`public/participante/js/modules/participante-avisos.js`** (NOVO)
  - `renderizarAvisos()` - Fetch + render cards
  - `marcarComoLido(avisoId)` - POST ao clicar no card
  - `atualizarBadge()` - Contador de não lidos

- **`public/participante/js/modules/participante-boas-vindas.js`** (MODIFICAR)
  - Integrar chamada para `participante-avisos.js`
  - Otimizar cards de stats (padding 24px → 12px, gap 24px → 12px)
  - Grid 2x2 compacto: Saldo, Posição, Pontos Rodada, Falta

#### CSS
- **`public/participante/css/avisos.css`** (NOVO)
  - Cards 240px min-width
  - Scroll horizontal fluido
  - Cores por categoria (verde, amarelo, azul, vermelho)
  - Animações fade-in-up

---

## 🗄️ Estrutura de Dados

### Collection MongoDB: `avisos`

```javascript
{
  _id: ObjectId,

  // Conteúdo
  titulo: String,               // "Rodada 12 Consolidada" (max 50 chars)
  mensagem: String,             // "Confira os resultados..." (max 200 chars)
  categoria: String,            // "success" | "warning" | "info" | "urgent"

  // Segmentação (opcional)
  ligaId: String,               // null = global, "paulistao-2026" = liga específica
  timeId: String,               // null = toda liga, "13935277" = participante específico

  // Estado e sincronização
  ativo: Boolean,               // true = habilitado (toggle ON) | false = desabilitado (toggle OFF)
  sincronizadoComApp: Boolean,  // true = publicado (visível no app) | false = rascunho/despublicado

  // Timestamps
  dataCriacao: Date,            // Quando foi criado
  dataExpiracao: Date,          // Auto-remove após N dias (7 padrão)
  publicadoEm: Date,            // Quando foi publicado (primeira sync)
  despublicadoEm: Date,         // Quando foi removido do app (última unsync)

  // Tracking
  leitoPor: [String],           // Array de timeIds ["13935277", "87654321"]
  criadoPor: String,            // Email do admin que criou
  editadoPor: [                 // Histórico de edições (auditoria)
    {
      admin: String,
      data: Date,
      alteracoes: Object
    }
  ]
}
```

### Índices Recomendados

```javascript
db.avisos.createIndex({ ativo: 1, sincronizadoComApp: 1, dataExpiracao: 1 });
db.avisos.createIndex({ ligaId: 1, timeId: 1 });
db.avisos.createIndex({ dataExpiracao: 1 }, { expireAfterSeconds: 0 }); // TTL
```

---

## 🎨 Padrões Existentes a Reutilizar

### Dashboard Saúde (Inspiração)
- **Arquivo:** `public/dashboard-saude.html`
- **Padrões a copiar:**
  - Cards compactos com padding reduzido (12-16px)
  - Scroll horizontal com `hide-scrollbar` class
  - Toggle switches estilizados
  - Animações `fade-in-up` e `fade-in-scale`
  - Cache IndexedDB cache-first (30s TTL)
  - Namespace CSS (`.saude-*` → `.avisos-*`)

### Sistema de Notificações Push (Não Conflita)
- **Controller:** `controllers/notificationsController.js`
- **Model:** `models/PushSubscription.js`
- **Função:** Web Push Notifications (sistema separado, diferentes propósitos)
- **Relação:** Avisos são **in-app**, Push são **browser notifications**

### Autenticação Admin
- **Middleware:** `middleware/auth.js` → função `isAdminAutorizado`
- **Padrão:** Todas rotas `/api/admin/*` protegidas
- **Session:** `req.session.usuario` (admin) ou `req.session.participante` (participante)

---

## 💡 Solução Proposta

### Abordagem Escolhida

**1. Backend com Sincronização Explícita**
- Toggle ON/OFF apenas muda estado local (`ativo: true/false`)
- Botão "Enviar para App" sincroniza com app (atualiza `sincronizadoComApp: true, publicadoEm: Date`)
- Separação clara: **Estado Admin (toggle)** vs **Estado App (sincronizado)**

**2. Frontend Admin com Preview**
- Modal SuperModal para criar/editar
- Preview em tempo real (atualiza ao digitar)
- Toggle visual (ON = verde, OFF = cinza)
- Botão dinâmico: "Enviar para App" (verde) ou "Remover do App" (vermelho)

**3. Frontend Participante com Cache**
- Buscar avisos ao carregar home
- Cache IndexedDB (30s TTL) para performance
- Scroll horizontal fluido (snap-x)
- Badge pulsante de não lidos no header

**4. Redesign Home Participante**
- Reduzir padding: 24px → 12px (cards stats)
- Reduzir gap: 24px → 12px (grid)
- Grid 2x2 compacto: 4 cards na dobra
- Tipografia otimizada: labels 10px uppercase

---

## 📂 Arquivos a Criar

### Backend
1. **`controllers/avisosAdminController.js`** - CRUD admin (7 funções)
2. **`controllers/avisosParticipanteController.js`** - Consumo participante (3 funções)
3. **`routes/avisos-admin-routes.js`** - 7 endpoints admin
4. **`routes/avisos-participante-routes.js`** - 3 endpoints participante

### Frontend Admin
5. **`public/admin/operacoes/notificador.html`** - Interface SPA
6. **`public/js/admin/notificador-management.js`** - Lógica CRUD (~500 linhas)
7. **`public/css/modules/notificador.css`** - Estilos específicos

### Frontend Participante
8. **`public/participante/js/modules/participante-avisos.js`** - Módulo avisos (~300 linhas)
9. **`public/participante/css/avisos.css`** - Estilos cards avisos

---

## 📝 Arquivos a Modificar

### Backend
1. **`index.js`** (linha ~390-420)
   - Adicionar: `app.use('/api/admin/avisos', avisosAdminRoutes);`
   - Adicionar: `app.use('/api/avisos', avisosParticipanteRoutes);`

### Frontend Participante
2. **`public/participante/fronts/boas-vindas.html`** (linha ~1-50)
   - Adicionar container avisos após header
   - Adicionar badge no ícone notificações

3. **`public/participante/js/modules/participante-boas-vindas.js`** (linha ~140-250)
   - Integrar chamada `renderizarAvisos()`
   - Otimizar CSS de cards stats (padding/gap)

4. **`public/participante/css/boas-vindas.css`**
   - Atualizar classes de cards (padding 24px → 12px)
   - Grid gap 24px → 12px

### Frontend Admin
5. **`public/painel.html`** ou sidebar admin
   - Adicionar link "Notificador" em seção Operações

---

## 🎯 Regras de Negócio

### RN-01: Segmentação de Avisos
- **Global:** Visível para todos participantes (ligaId = null, timeId = null)
- **Por Liga:** Visível apenas para participantes da liga (ligaId = "id-liga", timeId = null)
- **Por Participante:** Visível apenas para um time (ligaId = "id-liga", timeId = "id-time")

### RN-02: Estados de Publicação
- **Rascunho:** `ativo: false`, `sincronizadoComApp: false` → NÃO visível no app
- **Ativo não publicado:** `ativo: true`, `sincronizadoComApp: false` → NÃO visível no app (pronto para publicar)
- **Publicado:** `ativo: true`, `sincronizadoComApp: true` → **VISÍVEL no app**
- **Despublicado:** `ativo: false`, `sincronizadoComApp: false` → NÃO visível (foi publicado, agora oculto)

### RN-03: Sincronização com App
- **Publicar:** Apenas se `ativo: true` → Atualiza `sincronizadoComApp: true, publicadoEm: Date`
- **Despublicar:** Força `ativo: false, sincronizadoComApp: false, despublicadoEm: Date`
- **Toggle sozinho:** NÃO sincroniza (apenas muda estado local)

### RN-04: Expiração Automática
- Data de expiração padrão: 7 dias após criação
- Cron job (ou TTL index) remove automaticamente
- Avisos expirados: toggle desabilitado, status "Expirado"

### RN-05: Marcação de Leitura
- Participante clica no card → POST `/marcar-lido`
- Adiciona `timeId` ao array `leitoPor` (unique)
- Badge de não lidos atualiza automaticamente

### RN-06: Categorias Visuais
| Categoria | Cor | Ícone | Uso |
|-----------|-----|-------|-----|
| **success** | Verde `#10b981` | `check_circle` | Confirmações, sucesso |
| **warning** | Amarelo `#f59e0b` | `warning` | Alertas, prazos |
| **info** | Azul `#3b82f6` | `info` | Informações gerais |
| **urgent** | Vermelho `#ef4444` | `error` | Crítico, ação imediata |

---

## ⚠️ Riscos e Considerações

### Impactos Previstos

**Positivos:**
- ✅ Canal direto admin → participantes (melhor comunicação)
- ✅ Redução de suporte (avisos explicam features/mudanças)
- ✅ UX melhorada (densidade visual otimizada na home)

**Atenção:**
- ⚠️ Potencial spam de avisos (admin pode abusar) → Solução: Limite de 5 avisos ativos simultâneos
- ⚠️ Performance com muitos avisos → Solução: Cache IndexedDB 30s, paginação admin
- ⚠️ Notificações duplicadas (Push + Avisos) → Solução: São sistemas independentes, usar para propósitos diferentes

**Riscos:**
- 🔴 Usuários podem ignorar avisos → Solução: Badge pulsante, categorias visuais claras
- 🔴 Avisos críticos podem ser perdidos → Solução: Categoria "urgent" com animação pulse

### Multi-Tenant (Liga Isolation)
- ✅ Filtro por `ligaId` em queries participante
- ✅ Avisos globais visíveis para todas ligas
- ✅ Admin pode criar avisos por liga específica

---

## 🧪 Testes Necessários

### Cenários de Teste

**Backend:**
1. **Criar aviso global** → Deve aparecer para todos participantes
2. **Criar aviso por liga** → Apenas participantes da liga veem
3. **Toggle ON sem publicar** → Aviso NÃO aparece no app
4. **Publicar aviso (ativo=true)** → Aviso APARECE no app
5. **Despublicar aviso** → Aviso DESAPARECE do app
6. **Editar aviso publicado** → Alterações refletem após re-publicar
7. **Expiração automática** → Aviso some após N dias

**Frontend Admin:**
8. **Modal preview** → Atualiza em tempo real ao digitar
9. **Toggle visual** → Sincroniza com estado backend
10. **Botão dinâmico** → Muda entre "Enviar" (verde) e "Remover" (vermelho)

**Frontend Participante:**
11. **Scroll horizontal** → Fluido, sem scrollbar visível
12. **Badge não lidos** → Atualiza ao marcar como lido
13. **Cache IndexedDB** → Load instantâneo na 2ª visita
14. **Categorias visuais** → Cores corretas (verde, amarelo, azul, vermelho)

**Edge Cases:**
15. **Aviso expirado** → Não aparece no app, toggle desabilitado admin
16. **Múltiplos admins editando** → Last write wins (sem conflict resolution)
17. **Participante sem avisos** → Empty state "Nenhum aviso no momento"

---

## 📚 Dependências Mapeadas

### Imports Backend
```javascript
// avisosAdminController.js
import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';

// avisos-admin-routes.js
import express from 'express';
import { isAdminAutorizado } from '../middleware/auth.js';
import * as avisosAdminController from '../controllers/avisosAdminController.js';
```

### Imports Frontend Admin
```javascript
// notificador-management.js (ES6 Module)
// Usa SuperModal global: window.SuperModal
// Usa fetch API nativa
```

### Imports Frontend Participante
```javascript
// participante-avisos.js (ES6 Module)
export async function renderizarAvisos(ligaId, timeId) { ... }

// participante-boas-vindas.js (import)
import { renderizarAvisos } from './participante-avisos.js';
```

---

## 🎨 Design Tokens a Usar

### CSS Variables (de `_admin-tokens.css`)
```css
/* Cores de fundo */
--surface-bg: #111827;           /* gray-900 */
--surface-card: #1f2937;         /* gray-800 */
--surface-card-hover: #374151;   /* gray-700 */

/* Texto */
--text-primary: #ffffff;
--text-secondary: #9ca3af;       /* gray-400 */
--text-muted: #6b7280;           /* gray-500 */

/* Borders */
--border-subtle: #374151;        /* gray-700 */

/* Categorias de aviso (a adicionar) */
--aviso-success: #10b981;        /* green-500 */
--aviso-warning: #f59e0b;        /* yellow-500 */
--aviso-info: #3b82f6;           /* blue-500 */
--aviso-urgent: #ef4444;         /* red-500 */
```

---

## 📊 Métricas de Sucesso

### KPIs
- **Taxa de leitura:** > 60% dos avisos marcados como lidos em 24h
- **Tempo de carregamento:** < 300ms (home participante com cache)
- **Engajamento:** +20% tempo médio na home (conteúdo relevante)
- **Suporte:** -20% tickets sobre "não vi aviso X"

### Performance
- **Cache hit rate:** > 80% (IndexedDB)
- **Bundle size:** < 50KB adicional (JS avisos)
- **Queries DB:** < 100ms (avisos por participante)

---

## 📅 Próximos Passos

### Validação do PRD
1. ✅ **Revisar** com Product Owner (regras de negócio corretas?)
2. ✅ **Aprovar** segmentação e categorias
3. ✅ **Definir** prioridade vs outras features

### Gerar Specification
```bash
# Executar Fase 2:
/spec .claude/docs/PRD-sistema-avisos-notificacoes.md
```

**Output esperado:** `.claude/docs/SPEC-sistema-avisos-notificacoes.md` com:
- Lista precisa de arquivos a modificar
- Mudanças cirúrgicas linha por linha
- Dependências validadas (imports, exports, IDs CSS)
- Testes necessários detalhados

### Implementar
```bash
# Executar Fase 3:
/code .claude/docs/SPEC-sistema-avisos-notificacoes.md
```

---

## 📚 Documentação de Referência

### Código Existente Consultado
- ✅ `controllers/notificationsController.js` - Push notifications (não conflita)
- ✅ `public/dashboard-saude.html` - Padrão visual de referência
- ✅ `public/participante/js/modules/participante-boas-vindas.js` - Home atual
- ✅ `middleware/auth.js` - Autenticação admin/participante
- ✅ `routes/admin-gestao-routes.js` - Exemplo de rotas admin
- ✅ `public/css/_admin-tokens.css` - Design tokens
- ✅ `CLAUDE.md` - Princípios do projeto

### MCPs Consultados
- ❌ Context7: Não necessário (lógica interna, sem libs externas complexas)
- ❌ Perplexity: Não necessário (feature bem definida)
- ✅ MongoDB MCP: Pode ser usado para debug durante implementação

---

## ✅ Checklist de Pesquisa Completa

- [x] Busquei automaticamente todos os arquivos relacionados
- [x] Li arquivos principais completamente (controllers, routes, frontend)
- [x] Mapeei dependências iniciais (imports, exports, sessão)
- [x] Identifiquei padrões existentes a reutilizar (dashboard-saude, SuperModal)
- [x] Li CLAUDE.md do projeto (MVC, dark mode, nomenclatura PT)
- [x] Proposta baseada em código existente (reutiliza notificationsController como referência)
- [x] Riscos mapeados (spam, performance, multi-tenant)
- [x] Testes planejados (17 cenários)

---

**Gerado por:** Pesquisa Protocol v1.0 (High Senior Edition)
**Próximo:** Executar `/spec .claude/docs/PRD-sistema-avisos-notificacoes.md`

**📍 IMPORTANTE:** Após validar este PRD, **feche esta conversa** e **abra nova sessão** para limpar contexto antes de gerar a Spec.
