# BACKLOG - Super Cartola Manager

> Sistema de gestão de ideias e melhorias futuras. Organizado por prioridade.

---

## ⚽ FOCO PRINCIPAL: Cartola FC (Globo)

> **95% dos módulos do Super Cartola Manager são baseados nos pontos do fantasy game Cartola FC da Globo.**
> Todas as features devem considerar a integração com a API do Cartola como fonte primária de dados.

### 🔗 Integração com Cartola FC

- **API Atual:** `services/cartolaApiService.js` - API não-oficial do Cartola
- **Endpoints principais usados:**
  - `/atletas/mercado` - Jogadores disponíveis e preços
  - `/time/id/{timeId}` - Escalação de um time específico
  - `/time/id/{timeId}/{rodada}` - Escalação histórica por rodada
  - `/atletas/pontuados` - Parciais em tempo real
  - `/mercado/status` - Status do mercado (aberto/fechado)
  - `/rodadas` - Informações das rodadas

### 📊 Dados do Cartola Utilizados

| Dado | Onde é usado | Collection MongoDB |
|------|--------------|-------------------|
| Pontuação por rodada | Rankings, Hall da Fama | `rodadas`, `rankinggeral` |
| Escalação do time | Parciais, Data Lake | `cartolaoficialdumps` |
| Parciais ao vivo | Módulo Parciais | Cache em memória |
| Posição no ranking | Top 10, Mito/Mico | `top10caches` |
| Patrimônio | Fluxo Financeiro | `extratofinanceirocaches` |

### ⚠️ Considerações Importantes

1. **API não-oficial:** A API do Cartola não é documentada oficialmente pela Globo
2. **Rate limiting:** Evitar muitas requisições simultâneas
3. **Disponibilidade:** API pode ficar instável durante picos (fechamento de mercado)
4. **Temporada:** Dados são zerados a cada nova temporada do Brasileirão

---

## 🔴 CRÍTICO (Bugs graves, problemas de segurança)

_Resolver ASAP - Bloqueia funcionalidades ou compromete segurança_

<!-- Exemplo:
- [ ] [BUG-001] Descrição do bug crítico
  - **Arquivo:** caminho/para/arquivo.js
  - **Contexto:** Detalhes sobre o problema
  - **Impacto:** Quem/o que é afetado
-->

---

## 🟠 ALTA PRIORIDADE (Features importantes, melhorias de performance)

_Próximas sprints - Impacto significativo no sistema_

- [x] [FEAT-003] **Notificações Push (Web Push API)** 🔔 ✅ IMPLEMENTADO 25/01/2026
  - **Descrição:** Sistema completo de notificações push para alertar participantes sobre eventos importantes da liga
  - **Status Atual:** 100% implementado (Fases 1-5 concluídas, Fase 6 testes pendente)
  - **Impacto:** ALTO - Retenção, engajamento e experiência do usuário
  - **Complexidade:** ALTA (~7h implementadas)
  
  - **Infraestrutura Existente (Base PWA):**
    - ✅ Service Worker funcional: `public/participante/service-worker.js` (v3.1)
    - ✅ PWA Manifest: `public/participante/manifest.json`
    - ✅ App instalável (modo standalone)
    - ❌ SEM handlers de `push` e `notificationclick` no SW
    - ❌ SEM backend para gerenciar subscriptions
    - ❌ SEM biblioteca `web-push` instalada
  
  - **Casos de Uso (MVP):**
    1. **Rodada Consolidada** (essencial)
       - Título: "Rodada X finalizada! 🎉"
       - Body: "Você fez X pontos e ficou em Y° lugar"
       - Ação: Abrir tela de Rodadas
    2. **Mito/Mico da Rodada** (gamificação)
       - Título: "Você é o MITO da rodada! 🏆"
       - Body: "Parabéns! Você foi o melhor desta rodada"
       - Ação: Abrir Hall da Fama
    3. **Escalação Pendente** (retenção)
       - Título: "Esqueceu de escalar? ⚠️"
       - Body: "Mercado fecha em 30 minutos!"
       - Ação: Abrir Cartola FC direto
  
  - **Roadmap de Implementação:**
    
    **FASE 1: Setup Básico** ✅ CONCLUÍDA
    - [x] Instalar biblioteca: `npm install web-push`
    - [x] Gerar VAPID keys: `npx web-push generate-vapid-keys`
    - [x] Armazenar keys nos Replit Secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
    - [x] Criar collection MongoDB: `push_subscriptions`
    - [x] Criar modelo: `models/PushSubscription.js`

    **FASE 2: Backend** ✅ CONCLUÍDA
    - [x] Criar `routes/notifications-routes.js`
      - `POST /api/notifications/subscribe` - Salvar subscription
      - `POST /api/notifications/unsubscribe` - Remover subscription
      - `POST /api/notifications/send` - Admin enviar manual
      - `GET /api/notifications/status` - Verificar status
      - `GET /api/notifications/vapid-key` - Obter VAPID public key
    - [x] Criar `controllers/notificationsController.js`
      - `sendPushNotification(timeId, payload)` - Enviar via web-push
      - `cleanExpiredSubscriptions()` - Limpar expiradas
      - `sendBulkNotifications(timeIds, payload)` - Envio em lote
    - [x] Integrar rotas no `index.js`

    **FASE 3: Service Worker** ✅ CONCLUÍDA
    - [x] Adicionar handler `push` em `public/participante/service-worker.js`
    - [x] Adicionar handler `notificationclick`
    - [x] Suporte a ações (abrir app, ver detalhes)

    **FASE 4: Frontend** ✅ CONCLUÍDA
    - [x] Criar `public/participante/js/modules/participante-notifications.js` (~450 linhas)
    - [x] Criar `public/participante/fronts/configuracoes.html` (~300 linhas)
    - [x] Toggle "Receber Notificações" com feedback visual
    - [x] Checkboxes: Rodada, Mito/Mico, Escalação, Acertos Financeiros
    - [x] Botão "Testar Notificação"
    - [x] Integrar no menu lateral (Configurações)

    **FASE 5: Gatilhos de Envio** ✅ CONCLUÍDA
    - [x] Criar `services/notificationTriggers.js` (~280 linhas)
    - [x] **Rodada Consolidada** - `triggerRodadaFinalizada()` no consolidacaoController
    - [x] **Mito/Mico** - `triggerMitoMico()` no consolidacaoController
    - [x] **Acerto Financeiro** - `triggerAcertoFinanceiro()` em acertos-financeiros-routes
    - [x] **Escalação Pendente** - CRON jobs (sex 18h, sab 14h/16h, dom 14h)
    - [x] Filtrar por preferências do participante
    - [x] Execução assíncrona (não bloqueia resposta)

    **FASE 6: Testes e Validação** ⏳ PENDENTE
    - [ ] Testar em Chrome Desktop (Windows/Linux)
    - [ ] Testar em Chrome Android (instalado como PWA)
    - [ ] Testar em Edge Desktop
    - [ ] Testar em Safari iOS 16.4+ (PWA instalado)
    - [ ] Validar persistência após reinstalar PWA
    - [ ] Testar renovação de subscription expirada
    - [ ] Validar rate limiting (max 1 notif/rodada por tipo)
  
  - **Considerações Técnicas Críticas:**
    
    **Segurança:**
    - ⚠️ VAPID keys NUNCA no código, sempre em Replit Secrets
    - ⚠️ Validar `req.session.usuario` antes de salvar subscription
    - ⚠️ HTTPS obrigatório (Replit já tem SSL)
    
    **Compatibilidade:**
    - ✅ Chrome/Edge: Suporte total (desktop + Android)
    - ⚠️ Safari iOS: Apenas com PWA instalado (iOS 16.4+)
    - ⚠️ Firefox: Suporte total, mas menor uso no mobile
    
    **LGPD/Privacidade:**
    - ✅ Opt-in obrigatório (nunca forçar)
    - ✅ Usuário pode desativar a qualquer momento
    - ✅ Explicar claramente o que será notificado
    - ✅ Remover subscription ao desativar
    
    **Performance:**
    - ⚠️ Rate limiting: Máximo 1 notificação por rodada por tipo
    - ⚠️ Subscriptions podem expirar → implementar renovação automática
    - ⚠️ Limpar subscriptions inativas periodicamente (cron semanal)
    
    **UX:**
    - ✅ Solicitar permissão no momento certo (não no primeiro acesso)
    - ✅ Modal educativo explicando benefícios
    - ✅ Opção de "Lembrar depois"
    - ✅ Indicador visual de status no app
  
  - **Arquivos Criados/Modificados:**
    ```
    📦 Backend
    ├── models/PushSubscription.js                        ✅ CRIADO
    ├── controllers/notificationsController.js            ✅ CRIADO (~530 linhas)
    ├── routes/notifications-routes.js                    ✅ CRIADO
    ├── services/notificationTriggers.js                  ✅ CRIADO (~280 linhas)
    ├── controllers/consolidacaoController.js             ✅ MODIFICADO (+20 linhas)
    ├── routes/acertos-financeiros-routes.js              ✅ MODIFICADO (+15 linhas)
    └── index.js                                          ✅ MODIFICADO (+40 linhas)

    📱 Frontend
    ├── public/participante/service-worker.js             ✅ MODIFICADO (+85 linhas)
    ├── public/participante/js/modules/participante-notifications.js  ✅ CRIADO (~450 linhas)
    ├── public/participante/fronts/configuracoes.html     ✅ CRIADO (~300 linhas)
    ├── public/participante/js/participante-navigation.js ✅ MODIFICADO (+6 linhas)
    ├── public/participante/js/participante-quick-bar.js  ✅ MODIFICADO (+4 linhas)
    └── middleware/auth.js                                ✅ MODIFICADO (+2 linhas)

    🔧 Config
    ├── .env (via Replit Secrets)                         ✅ CONFIGURADO
    │   ├── VAPID_PUBLIC_KEY
    │   ├── VAPID_PRIVATE_KEY
    │   └── VAPID_SUBJECT (email)
    └── package.json                                      ✅ MODIFICADO (web-push)

    📝 Docs
    ├── .claude/handover-push-notifications.md            ✅ CRIADO
    └── .claude/docs/IMPL-FEAT-003-Push-Notifications.md  ✅ CRIADO
    ```
  
  - **Dependências NPM:**
    ```json
    {
      "web-push": "^3.6.7"
    }
    ```
  
  - **Referências Técnicas:**
    - [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
    - [web-push Library](https://github.com/web-push-libs/web-push)
    - [VAPID Protocol RFC8292](https://datatracker.ietf.org/doc/html/rfc8292)
    - [Service Worker Notifications](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
  
  - **Mockup de UI (Sugestão):**
    ```
    ┌────────────────────────────────────┐
    │  🔔 Notificações                    │
    │                                     │
    │  [ ✓ ] Receber notificações push   │
    │                                     │
    │  Escolha o que deseja receber:     │
    │  [ ✓ ] Resultados de rodada        │
    │  [ ✓ ] Mito/Mico da rodada         │
    │  [   ] Mercado fechando            │
    │  [   ] Movimentações financeiras   │
    │                                     │
    │  ℹ️  Você pode desativar a qualquer│
    │     momento nas configurações do   │
    │     navegador.                     │
    │                                     │
    │  [Testar Notificação]  [Salvar]    │
    └────────────────────────────────────┘
    ```
  
  - **Estimativa Total:** ~11 horas
    | Fase | Tempo | Complexidade |
    |------|-------|--------------|
    | Setup Básico | 2h | Baixa |
    | Backend | 3h | Média |
    | Service Worker | 1h | Baixa |
    | Frontend | 2h | Média |
    | Gatilhos | 2h | Alta |
    | Testes | 1h | Média |
  
  - **Checklist de Conclusão:**
    - [x] VAPID keys geradas e guardadas nos Secrets
    - [x] Collection `push_subscriptions` criada e indexada
    - [x] Rotas de subscribe/unsubscribe funcionais e testadas
    - [x] Service Worker com handlers de push implementados
    - [x] UI de permissão implementada (tela Configurações)
    - [x] Gatilho "rodada consolidada" ativo e enviando notificações
    - [x] Gatilho "mito/mico" ativo com payload personalizado
    - [x] Gatilho "acerto financeiro" ativo
    - [x] Gatilho "escalação pendente" ativo (CRON sex/sab/dom)
    - [ ] Testado em Chrome Android (PWA instalado) - PENDENTE
    - [ ] Testado em Safari iOS 16.4+ (se disponível) - PENDENTE
    - [x] Cron job para limpar subscriptions expiradas (seg 3h)
    - [x] Documentação de uso atualizada (handover)
    - [x] Logs de envio implementados (console + auditoria)
  
  - **Próximos Passos (Pós-MVP):**
    - [ ] Notificação de "Badge conquistado" (integrar com FEAT-010)
    - [ ] Notificação de "Provocação pós-rodada" (integrar com FEAT-011)
    - [ ] Personalização de horário preferido (ex: não notificar à noite)
    - [ ] Histórico de notificações recebidas (tela no app)
    - [ ] Analytics: Taxa de abertura, cliques, conversões

- [ ] [FEAT-014] **Co-Piloto de Análise via CLI (Lab 2026)**
  - **Descrição:** Ferramenta de terminal para curadoria de dados assistida por IA (Admin).
  - **Escopo:** MVP restrito a 1 time na temporada 2026 (fase de testes) (participante Paulinett Miranda)
  - **Fluxo:** Leitura de dados locais (Mongo) → Cruzamento com notícias (Perplexity) → Sugestão de status/escalação.
  - **Arquivos base:**
    - `scripts/cli-analyser.js` (novo script de leitura)
    - `prompts/analisar.md` (novo prompt de comando)
  - **Funcionalidades:**
    - Auditoria de status de jogadores (Lesionado vs Provável)
    - Geração de "Dica da Rodada" baseada em estatística + notícias
  - **Dependências:** Acesso ao banco de dados via script, API de Search (MCP)
  - **Quando implementar:** Pré-temporada 2026

- [ ] [FEAT-030] **Copa de Times Super Cartola - Competição do Segundo Turno** 🏆
  - **Descrição:** Competição especial no formato Copa do Mundo realizada durante o segundo turno do Brasileirão
  - **Status Atual:** Planejamento inicial - apenas anúncio visível no app
  - **Período:** Segundo turno do Brasileirão (rodadas 20-38)
  - **Impacto:** ALTO - Novo formato de competição, engajamento na reta final
  - **Complexidade:** ALTA (~25-30h estimadas)

  **MVP - FASE 1: Teaser (Implementar AGORA)** ✅ IMPLEMENTADO
  - [x] Adicionar botão "Copa de Times SC" no hub de menus participante
  - [x] Criar tela placeholder: `public/participante/fronts/copa-times-sc.html`
  - [x] Exibir mensagem: "Aguarde mais informações. Será realizado no segundo turno do Brasileirão"
  - [x] Badge "EM BREVE" no menu
  - [x] Design visual temático (troféu, cores douradas)

  **Conceito da Competição (A definir):**
  - **Formato:** Copa do Mundo (grupos + mata-mata)
  - **Participação:** Todos os times da liga
  - **Critérios:** A definir (classificação, sorteio, pontos acumulados)
  - **Premiação:** A definir
  - **Rodadas:** Segundo turno (após rodada 19)

  **FASE 2: Planejamento Detalhado (Pré-rodada 19)**
  - [ ] Definir regras completas (grupos, chaveamento, critérios)
  - [ ] Criar collection `copa_times_sc` no MongoDB
  - [ ] Projetar sistema de pontuação
  - [ ] Definir premiações e incentivos
  - [ ] Criar identidade visual completa

  **FASE 3: Implementação Backend**
  - [ ] Model `CopaTimesSC.js`
  - [ ] Routes `copa-times-sc-routes.js`
  - [ ] Controller com lógica de grupos/mata-mata
  - [ ] Integração com pontos do Cartola FC
  - [ ] Sistema de chaveamento automático

  **FASE 4: Frontend Completo**
  - [ ] Tela de grupos (tabelas de classificação)
  - [ ] Bracket visual de mata-mata
  - [ ] Confrontos em tempo real
  - [ ] Histórico de partidas
  - [ ] Estatísticas da competição

  **FASE 5: Gamificação**
  - [ ] Notificações de avanço de fase
  - [ ] Badges especiais (Campeão Copa SC, Artilheiro Copa)
  - [ ] Integração com Hall da Fama
  - [ ] Troféu virtual para o campeão

  **Inspirações:**
  - Copa do Mundo FIFA (formato grupos + mata-mata)
  - March Madness (bracket interativo)
  - Champions League (prestígio e identidade visual)

  **Arquivos criados (FASE 1 - MVP):** ✅ CONCLUÍDO
  ```
  ✅ public/participante/fronts/copa-times-sc.html           (tela teaser)
  ✅ public/participante/js/modules/participante-copa-sc.js  (módulo básico v1.0)
  ✅ public/participante/css/copa-sc.css                     (tema dourado/troféu)
  ```

  **Arquivos modificados (FASE 1 - MVP):**
  ```
  ✅ public/participante/js/participante-navigation.js  (adicionado módulo)
  ✅ public/participante/js/participante-quick-bar.js   (card no menu)
  ✅ public/participante/index.html                     (import CSS)
  ```

  **Integração com sistema:**
  - Menu lateral: adicionar item "Copa de Times SC 🏆"
  - Quick bar: badge "EM BREVE"
  - Dashboard: card de anúncio

  **Complexidade:** Alta (feature completa, mas MVP é simples)
  **Prioridade FASE 1:** Alta (teaser deve estar visível desde já)
  **Prioridade FASE 2+:** Média (implementar até rodada 18)
  **Estimativa FASE 1 (MVP Teaser):** ~2h
  **Estimativa Total (Feature Completa):** ~25-30h

- [ ] [FEAT-026] **App Mobile Admin - Gestão de Ligas pelo Celular** 📱
  - **Descrição:** PWA/App mobile para administradores gerenciarem ligas pelo celular (evolução do painel admin web-only)
  - **Status Atual:** Admin só pode gerenciar pelo desktop (painel web)
  - **Impacto:** ALTO - Mobilidade, agilidade em decisões, gestão em tempo real
  - **Complexidade:** ALTA (~20-25h)

  **Problema Atual:**
  - Admin precisa estar no computador para gerenciar ligas
  - Não consegue tomar decisões rápidas durante rodadas
  - Sem acesso ao Dashboard de Saúde do Sistema fora do escritório
  - Não recebe alertas críticos no celular

  **Solução Proposta:**
  - PWA instalável para admin (igual ao app participante)
  - Interface otimizada para mobile (touch-friendly)
  - Dashboard de Saúde acessível no celular
  - Ações críticas disponíveis (consolidação, acertos financeiros)
  - Push notifications para admin (mercado fechou, erros críticos)

  **Casos de Uso (MVP):**

  1. **Dashboard Principal Mobile**
     - Cards com resumo das ligas
     - Rodada atual, participantes ativos
     - Últimas consolidações
     - Health score do sistema
     - Atalhos rápidos

  2. **Gestão de Ligas**
     - Listar ligas gerenciadas
     - Ver detalhes de liga (participantes, saldo, ranking)
     - Ativar/desativar liga
     - Ver módulos habilitados

  3. **Consolidação Manual**
     - Botão "Consolidar Rodada X"
     - Ver status de consolidação em tempo real
     - Histórico de consolidações por liga

  4. **Acertos Financeiros**
     - Registrar pagamento/recebimento rápido
     - Aprovar quitações pendentes
     - Ver saldo de participantes

  5. **Dashboard de Saúde (Mobile)**
     - Mesma funcionalidade da versão web
     - Otimizado para telas pequenas
     - Cards expansíveis (accordion)
     - Indicadores visuais (🟢🟡🔴)

  6. **Notificações Push para Admin**
     - "Mercado Cartola fechou - Consolidação iniciada"
     - "Health Score abaixo de 70 - Sistema degradado"
     - "Erro na consolidação da Liga X"
     - "Participante solicitou quitação"

  **Arquitetura Proposta:**

  ```
  public/
    └─ admin-mobile/
       ├─ index.html              (Dashboard principal mobile)
       ├─ manifest.json           (PWA manifest para instalação)
       ├─ service-worker.js       (Cache + push notifications)
       ├─ css/
       │  └─ admin-mobile.css     (Estilos mobile-first)
       └─ js/
          ├─ admin-dashboard.js   (Dashboard principal)
          ├─ admin-ligas.js       (Gestão de ligas)
          ├─ admin-consolidacao.js (Consolidação manual)
          ├─ admin-financeiro.js  (Acertos financeiros)
          ├─ admin-notifications.js (Push notifications)
          └─ admin-health.js      (Dashboard de saúde adaptado)

  routes/
    └─ admin-mobile-routes.js     (Endpoints específicos mobile)

  models/
    └─ AdminPushSubscription.js   (Subscriptions de push para admins)
  ```

  **Roadmap de Implementação:**

  **FASE 1: Setup PWA Admin (4h)**
  - [ ] Criar estrutura `public/admin-mobile/`
  - [ ] Manifest.json com ícones e configurações
  - [ ] Service Worker com cache offline
  - [ ] Tela de login mobile
  - [ ] Dashboard principal com cards responsivos

  **FASE 2: Gestão de Ligas Mobile (5h)**
  - [ ] Listar ligas gerenciadas
  - [ ] Ver detalhes de liga (touch-optimized)
  - [ ] Cards de participantes com scroll horizontal
  - [ ] Botão flutuante para ações rápidas
  - [ ] Busca/filtro de ligas

  **FASE 3: Consolidação Mobile (4h)**
  - [ ] Tela de consolidação manual
  - [ ] Progress bar em tempo real
  - [ ] Histórico de consolidações
  - [ ] Logs de erros (se houver)
  - [ ] Confirmação visual (toast/snackbar)

  **FASE 4: Acertos Financeiros Mobile (3h)**
  - [ ] Tela de registro de acerto rápido
  - [ ] Formulário otimizado (teclado numérico, autocomplete)
  - [ ] Lista de participantes com saldo
  - [ ] Aprovar quitações pendentes
  - [ ] Histórico de transações

  **FASE 5: Dashboard Saúde Mobile (2h)**
  - [ ] Adaptar dashboard-saude.html para mobile
  - [ ] Cards expansíveis (accordion)
  - [ ] Gráficos responsivos (Chart.js mobile)
  - [ ] Auto-refresh com indicador visual
  - [ ] Pull-to-refresh

  **FASE 6: Push Notifications Admin (3h)**
  - [ ] Model AdminPushSubscription
  - [ ] Endpoints subscribe/unsubscribe
  - [ ] Gatilhos de notificação:
    - Consolidação completada/falhou
    - Health score < 70
    - Mercado fechou
    - Erro crítico no sistema
  - [ ] Tela de configuração de notificações

  **FASE 7: Testes e Validação (2h)**
  - [ ] Testar instalação como PWA (Android)
  - [ ] Validar offline mode
  - [ ] Testar em diferentes tamanhos de tela
  - [ ] Validar push notifications
  - [ ] Performance (Lighthouse)

  **Diferencial vs Painel Web:**

  | Feature | Painel Web (Desktop) | App Mobile Admin |
  |---------|---------------------|------------------|
  | **Acesso** | Apenas computador | Qualquer lugar 📱 |
  | **Dashboard Saúde** | ✅ Sim | ✅ Sim (adaptado) |
  | **Consolidação** | ✅ Sim | ✅ Sim (simplificado) |
  | **Acertos Financeiros** | ✅ Sim | ✅ Sim (otimizado) |
  | **Notificações Push** | ❌ Não | ✅ Sim |
  | **Offline Mode** | ❌ Não | ✅ Sim (cache) |
  | **Instalável** | ❌ Não | ✅ Sim (PWA) |
  | **Ações Rápidas** | Limitado | ✅ Botões flutuantes |

  **Tecnologias:**
  - **Frontend:** HTML5, Vanilla JS (ES6 Modules), TailwindCSS
  - **PWA:** Service Worker, Cache API, Push API
  - **UI/UX:** Mobile-first design, Bottom navigation, FAB (Floating Action Button)
  - **Backend:** Endpoints existentes + novos endpoints mobile-specific

  **Mockup de UI (Sugestão):**

  ```
  ┌──────────────────────────────────┐
  │  🏠 Dashboard Admin              │
  ├──────────────────────────────────┤
  │                                  │
  │  🟢 Sistema Saudável (95)        │
  │                                  │
  │  ┌────────────────────────────┐  │
  │  │ Liga SuperCartola          │  │
  │  │ 12 participantes ativos    │  │
  │  │ Rodada 5 consolidada ✅    │  │
  │  └────────────────────────────┘  │
  │                                  │
  │  ┌────────────────────────────┐  │
  │  │ Liga Sobral                │  │
  │  │ 8 participantes ativos     │  │
  │  │ Rodada 5 consolidada ✅    │  │
  │  └────────────────────────────┘  │
  │                                  │
  │  📊 Últimas Ações:              │
  │  • R5 consolidada - 15:30       │
  │  • Pagamento aprovado - 14:20   │
  │                                  │
  ├──────────────────────────────────┤
  │  [🏠] [💰] [⚙️] [🏥] [👤]       │ ← Bottom Nav
  └──────────────────────────────────┘

  Botão flutuante: [+] → Ações rápidas
  ```

  **Estimativa Total:** ~20-25 horas

  | Fase | Tempo | Complexidade |
  |------|-------|--------------|
  | Setup PWA | 4h | Média |
  | Gestão Ligas | 5h | Média |
  | Consolidação | 4h | Alta |
  | Acertos Financeiros | 3h | Média |
  | Dashboard Saúde | 2h | Baixa |
  | Push Notifications | 3h | Alta |
  | Testes | 2h | Média |

  **Checklist de Conclusão:**
  - [ ] PWA instalável e funcional (Android/iOS)
  - [ ] Dashboard principal com resumo de ligas
  - [ ] Consolidação manual funcionando
  - [ ] Acertos financeiros registráveis
  - [ ] Dashboard de Saúde mobile-optimized
  - [ ] Push notifications configuradas e testadas
  - [ ] Offline mode com cache
  - [ ] Bottom navigation implementada
  - [ ] FAB com ações rápidas
  - [ ] Lighthouse score > 90 (Performance)
  - [ ] Testado em Chrome Android
  - [ ] Testado em Safari iOS
  - [ ] Documentação de uso criada

  **Próximos Passos (Pós-MVP):**
  - [ ] Gráficos de estatísticas (Chart.js)
  - [ ] Exportar relatórios em PDF (mobile)
  - [ ] Chat entre admin e participantes
  - [ ] Aprovação de múltiplas quitações (batch)
  - [ ] Widget de atalho na home screen
  - [ ] Modo escuro/claro

  **Dependências:**
  - Sistema de autenticação admin (já existe)
  - Dashboard de Saúde web (FEAT-026 implementado)
  - Push Notifications (FEAT-003 - reutilizar infraestrutura)
  - Endpoints de consolidação (já existem)

  **Quando implementar:** Após temporada 2026 estabilizar (pós-rodada 10)

---

## 🟡 MÉDIA PRIORIDADE (Melhorias de UX, refatorações)

_1-2 meses - Melhorias importantes mas não urgentes_

- [ ] [UX-001] **Tema Claro/Escuro no App Participante**
  - **Descrição:** Permitir que participante escolha tema de sua preferência
  - **Arquivos:** `public/participante/css/`, `participante-config.js`
  - **Complexidade:** Média

- [ ] [FEAT-008] **Relatórios Exportáveis (PDF/Excel)**
  - **Descrição:** Exportar financeiro, rankings, histórico em PDF ou Excel
  - **Uso:** Admin e participantes
  - **Libs sugeridas:** jsPDF, SheetJS

- [ ] [SEC-001] **Auditoria de Ações Administrativas**
  - **Descrição:** Log de todas as ações do admin (quem, quando, o quê)
  - **Tabela:** `audit_logs` ou expandir `useractivities`
  - **Benefício:** Rastreabilidade e segurança

### 🔄 Renovação de Temporada (Fluxo Financeiro)

- [x] [FEAT-REN-001] **Regras por liga/temporada (CRUD + status rascunho/aberto/encerrado)**
  - **Arquivos:** `models/LigaRules.js`, `routes/liga-rules-routes.js`, `public/js/renovacao/renovacao-ui.js`
- [x] [FEAT-REN-002] **Inscrições por temporada (listar/estatísticas/buscar/renovar/não participa/novo/inicializar/reverter)**
  - **Arquivos:** `models/InscricaoTemporada.js`, `routes/inscricoes-routes.js`
- [x] [FEAT-REN-003] **Fluxos de negócio + transferência de saldo + transações no extrato**
  - **Arquivos:** `controllers/inscricoesController.js`
- [x] [FEAT-REN-004] **Frontend de renovação + integração com Fluxo Financeiro**
  - **Arquivos:** `public/js/renovacao/*`, `public/js/fluxo-financeiro.js`, `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
- [x] [FEAT-REN-005] **Expor regra `gerar_debito_inscricao_renovacao` na UI/API**
  - **Arquivos:** `routes/liga-rules-routes.js`, `public/js/renovacao/renovacao-ui.js`, `public/js/renovacao/renovacao-modals.js`
- [ ] [FEAT-REN-006] **Parcelamento de taxa (lógica de parcelas)**
  - **Arquivos:** `controllers/inscricoesController.js`, `public/js/renovacao/renovacao-ui.js`
- [~] [SEC-REN-001] **Auditoria do fluxo de renovação (quem/quando/o quê em decisões e mudanças de status)**
  - **Observação:** Coberto por `SEC-001` (Auditoria de Ações Administrativas).
- [x] [DOC-REN-001] **Atualizar doc: endpoint de busca Cartola (`/api/cartola/*` vs `/api/cartola-proxy/*`)**
  - **Arquivo:** `docs/SISTEMA-RENOVACAO-TEMPORADA.md`
- [ ] [FEAT-REN-007] **Wizard de criação de liga deve incluir config de taxa de inscrição**
  - **Problema:** Ligas novas são criadas sem `ligarules` configurado, ficando sem taxa de inscrição definida
  - **Solução:** Adicionar passo no wizard de criação de liga para definir `inscricao.taxa` por temporada
  - **Arquivos:**
    - `public/js/admin-ligas.js` (wizard de criação)
    - `routes/liga-routes.js` (endpoint de criação)
    - `models/LigaRules.js` (já existe, precisa ser populado na criação)
  - **Contexto:** Cada liga define sua própria taxa (não é valor fixo). Exemplo: SuperCartola 2026 = R$180, mas outras ligas podem ter valores diferentes
  - **Impacto:** Admin precisa configurar manualmente após criar liga

---

## 🟢 BAIXA PRIORIDADE (Nice to have, ideias experimentais)

_Quando houver tempo - Melhorias de qualidade de vida_

- [ ] [FEAT-006] **Widget Home Screen (PWA)**
  - **Descrição:** Mini-card com posição e saldo na tela inicial do celular
  - **Tecnologia:** Web App Manifest + Service Worker
  - **Complexidade:** Alta

- [ ] [FEAT-012] **Ranking de Consistência**
  - **Descrição:** Prêmio para participante com menor variação de pontos
  - **Cálculo:** Desvio padrão das pontuações
  - **Módulo:** Novo ou integrar ao Ranking Geral

- [ ] [FEAT-013] **Compartilhar em Redes Sociais**
  - **Descrição:** Gerar card visual para Instagram/WhatsApp com resultados
  - **Formato:** Imagem PNG com design personalizado
  - **Libs sugeridas:** html2canvas, Canvas API

- [ ] [SEC-002] **Rate Limiting por Usuário**
  - **Descrição:** Limitar requests por usuário para evitar abuso
  - **Implementação:** Middleware com Redis ou in-memory
  - **Prioridade:** Aumenta se houver abuso

- [ ] [QA-001] **Hall da Fama - Debug de renderização**
  - **Descrição:** Cards não renderizam no frontend (APIs funcionam OK)
  - **Arquivo:** `public/participante/js/modules/participante-historico.js`
  - **Debug:** Verificar console do navegador (F12) para logs `[HISTORICO-DEBUG]`
  - **Possíveis causas:** Erro silencioso em Promise.all, cache corrompido
  - **Status:** Análise técnica concluída, aguarda debug manual

---

## 📦 BACKLOG (Ideias para futuro distante)

_Reavaliar periodicamente - Ideias interessantes mas sem cronograma_

### 🎖️ Participante Premium

- [ ] [FEAT-016] **Participante Premium - Funcionalidades Extras**
  - **Descrição:** Nível premium para participantes com funcionalidades exclusivas
  - **Participante piloto:** Paulinett Miranda (ID: 13935277) - Owner do sistema
  - **Escopo MVP:**

    **📊 Histórico Completo**
    - Histórico multi-temporada (2024, 2025, 2026...)
    - Gráfico de evolução do saldo ao longo das rodadas
    - Estatísticas consolidadas (melhor rodada, pior rodada, média)

    **📥 Exportar Dados**
    - Download do extrato em PDF com visual profissional
    - Exportar histórico para Excel/CSV
    - Compartilhar card de performance no WhatsApp

    **🔍 Comparar com Outros**
    - "Duelo" direto com outro participante (quem ganhou mais rodadas)
    - Ranking de confrontos diretos no mata-mata
    - Posição relativa na liga ao longo do tempo

    **📈 Projeções e Análises**
    - Projeção de saldo final baseado em desempenho
    - Alertas personalizados (ex: "Você precisa de +50 nas próximas 3 rodadas")
    - Insights automáticos ("Seu melhor desempenho é em rodadas ímpares")

  - **Arquivos a criar:**
    - `models/ParticipantePremium.js` - Flag e configurações premium
    - `public/participante/js/modules/participante-premium.js` - Funcionalidades exclusivas
    - `routes/premium-routes.js` - APIs premium
  - **Dependências:** FEAT-004 (Head-to-Head), FEAT-005 (Gráficos), FEAT-008 (Exportar PDF)

- [ ] [FEAT-017] **Módulo de Escalação Premium - Super Cartola Manager**
  - **Descrição:** Módulo dedicado de visualização e gestão de escalação do Cartola FC
  - **Acesso:** Exclusivo para participantes premium do sistema (não do Cartola FC)
  - **Status:** Planejado - Implementação futura
  - **Contexto:** Atualmente o sistema não possui módulo de escalação próprio. Este módulo será uma feature premium que permite gerenciar escalações dentro do Super Cartola Manager.

  - **Funcionalidades Planejadas:**

    **📋 Visualização de Escalação**
    - Esquema tático visual (4-4-2, 4-3-3, etc.)
    - Informações detalhadas de cada atleta (preço, valorização, média de pontos)
    - Status do mercado (aberto/fechado) integrado via MarketGate
    - Histórico de escalações por rodada

    **⚡ Validações em Tempo Real**
    - Verificação de budget disponível
    - Alertas de atletas suspensos/lesionados
    - Sugestões de substituições baseadas em performance
    - Comparação com escalação de outras rodadas

    **📊 Estatísticas Avançadas**
    - Gráfico de valorização dos atletas ao longo da temporada
    - Comparativo de desempenho: escalação atual vs média da liga
    - ROI (Return on Investment) por atleta
    - Análise de consistência do time

    **🔔 Integração com Sistema**
    - Notificações push quando mercado está prestes a fechar (via FEAT-003)
    - Exportar histórico de escalações (PDF/Excel)
    - Integração com módulo de Parciais para ver pontuação ao vivo

  - **Arquivos a criar:**
    - `public/participante/js/modules/participante-escalacao.js` - UI e lógica do módulo
    - `public/participante/css/escalacao.css` - Estilos do campo tático
    - `routes/escalacao-routes.js` - Endpoints de escalação
    - `services/escalacaoService.js` - Lógica de negócio e validações

  - **Integrações necessárias:**
    - `utils/marketGate.js` - Para verificar se pode escalar
    - `services/cartolaApiService.js` - Buscar dados da API Cartola FC
    - `models/ParticipantePremium.js` - Controle de acesso premium
    - `services/notificationTriggers.js` - Alertas de mercado fechando

  - **Dependências:**
    - FEAT-016 (Participante Premium) - Sistema de controle de acesso
    - FEAT-003 (Notificações Push) - Alertas de mercado
    - MarketGate - Status do mercado centralizado

  - **Decisão de Design:**
    - **Visualização apenas (MVP):** Primeiro passo seria mostrar escalação atual e histórico
    - **Gestão completa (v2):** Permitir escalação diretamente no app (requer integração mais profunda com API Cartola)
    - **Análise e sugestões (v3):** IA/ML para sugerir melhores escalações baseadas em histórico

  - **Complexidade:** ALTA
  - **Estimativa:** ~15-20 horas (MVP - visualização apenas)
  - **Prioridade:** Média-baixa (após consolidação do sistema de premium)
  - **Quando implementar:** 2026 (pós-temporada)
  - **Complexidade:** Alta
  - **Status:** Backlog - Implementar após funcionalidades base

### 📱 App do Participante

- [ ] [FEAT-004] **Comparativo Head-to-Head**
  - **Descrição:** Tela para comparar histórico entre dois participantes
  - **Dados:** Confrontos diretos, vitórias, empates, pontuação média
  - **UX:** Seletor de participantes + gráfico comparativo

- [ ] [FEAT-005] **Gráficos de Evolução**
  - **Descrição:** Visualizar pontuação e posição ao longo da temporada
  - **Libs sugeridas:** Chart.js (já usado?) ou Recharts
  - **Dados:** Histórico de rodadas do participante

### 🖥️ Painel Admin

- [ ] [FEAT-007] **Dashboard Analytics**
  - **Descrição:** Métricas em tempo real (acessos, engajamento, picos)
  - **Dados:** Collection `accesslogs`, `useractivities`
  - **Visualização:** Cards + gráficos de linha/barra

- [ ] [FEAT-009] **Configurador Visual de Liga (Wizard)**
  - **Descrição:** Interface amigável para criar/editar regras da liga
  - **Funcionalidades:** Steps guiados, preview, validação
  - **Benefício:** Facilita criação de novas ligas (SaaS)

### 🎮 Gamificação/Social

- [~] [FEAT-010] **Sistema de Conquistas (Badges)** ⚡ 85% IMPLEMENTADO
  - **Descrição:** Badges por feitos especiais exibidos no Hall da Fama
  - **Arquivos implementados:**
    - `routes/participante-historico-routes.js:314-392` - API com 10 badges definidos
    - `scripts/turn_key_2026.js:285-488` - Atribuição automática no fim da temporada
    - `public/participante/js/modules/participante-historico.js` - Renderização visual
    - `data/users_registry.json` - Armazenamento no Cartório Vitalício
  - **Badges JÁ IMPLEMENTADOS (10 tipos):**
    - ✅ Campeão 🏆, Vice 🥈, Terceiro 🥉 (auto-atribuição)
    - ✅ Top 10 Mito ⭐, Top 10 Mico 💀 (auto-atribuição)
    - ✅ Artilheiro ⚽, Luva de Ouro 🧤, Melhor Mês 📅, Mata-Mata ⚔️, Invicto 🛡️ (definidos, exibição OK)
  - **Funcionalidades PENDENTES (opcional):**
    - [ ] Auto-atribuição de Artilheiro, Luva, Melhor Mês e Mata-Mata no `turn_key_2026.js`
    - [ ] Notificação/toast ao conquistar badge (gamificação)
    - [ ] Página dedicada de conquistas (vitrine do participante)
    - [ ] Badges progressivos: "10 Mitos", "Veterano 3 temporadas", "5 Vitórias Consecutivas"
  - **Status:** Sistema funcional. Badges são atribuídos e exibidos no Hall da Fama.

- [ ] [FEAT-011] **Provocações pós-Rodada**
  - **Descrição:** Mensagens automáticas/customizáveis após resultados
  - **Exemplos:** "Fulano tomou de X no confronto!", "Mico da rodada: Y"
  - **Canal:** Notificação in-app ou integração WhatsApp

### 🎨 Visualização/UX Avançado

- [ ] [FEAT-015] **Campinho com Escalação Visual (Field Layout)** 🔥 PRIORIDADE 2026
  - **Descrição:** Visualização gráfica do time escalado pelo participante em formato de "campinho", similar ao app oficial do Cartola FC
  - **Inspiração:** App Cartola FC (Globo), Fantasy Premier League, SofaScore
  - **Funcionalidades sugeridas:**
    - Campo verde com posições táticas (4-3-3, 4-4-2, etc)
    - Jogadores posicionados por função (GOL, ZAG, LAT, MEI, ATA)
    - Foto do jogador ou escudo do clube
    - Parciais em tempo real sobre cada jogador
    - Indicador de capitão (C) com destaque visual
    - Cores diferenciadas: pontuação positiva (verde), negativa (vermelha)
    - Banco de reservas visível abaixo do campo
  - **Onde usar:**
    - Módulo Parciais (uso principal) ⭐
    - Tela de Rodadas (resumo visual)
    - App do Participante (histórico de rodadas)
    - Comparativo de Confronto (Mata-Mata/Pontos Corridos) - lado a lado
  
  - **⚽ INTEGRAÇÃO CARTOLA FC:**
    - **Endpoint principal:** `/api/data-lake/raw/:timeId?rodada=N` (escalação completa)
    - **Dados do jogador disponíveis:**
      - `atleta_id` - ID único do jogador
      - `apelido` - Nome de exibição
      - `foto` - URL da foto (s3.glbimg.com)
      - `posicao_id` - 1=GOL, 2=LAT, 3=ZAG, 4=MEI, 5=ATA, 6=TEC
      - `clube_id` - Para buscar escudo
      - `pontos_num` - Pontuação da rodada
      - `capitao` - Boolean se é capitão
      - `scout` - Objeto com detalhes (G, A, SG, CA, CV, etc)
    - **Parciais ao vivo:** `/atletas/pontuados` (atualiza a cada ~30s durante jogos)
  
  - **🛠️ ROADMAP DE IMPLEMENTAÇÃO:**
  
    **FASE 1: Componente Base SVG** (~4h)
    - [ ] Criar `public/participante/js/components/campinho-visual.js`
      - Classe `CampinhoVisual` com métodos: `render()`, `atualizarParciais()`, `destacarJogador()`
      - SVG responsivo com viewBox para escalar em qualquer tela
      - Posições pré-definidas para cada formação (4-3-3, 4-4-2, 3-5-2)
    - [ ] Criar CSS: `public/css/modules/campinho.css`
      - Estilo dark mode com campo verde gradiente
      - Animações para gols, assistências, cartões
      - Transições suaves para atualização de parciais
    
    **FASE 2: Integração com API do Cartola** (~3h)
    - [ ] Usar endpoint existente: `/api/data-lake/raw/:timeId?rodada=N`
    - [ ] Mapear `posicao_id` do Cartola para coordenadas X/Y no campo:
      ```javascript
      // Mapeamento oficial do Cartola FC
      const POSICOES_CARTOLA = {
        1: { nome: 'GOL', x: 50, y: 90, cor: '#1E90FF' },   // Goleiro (azul)
        2: { nome: 'LAT', x: [15, 85], y: 70 },             // Laterais (2 posições)
        3: { nome: 'ZAG', x: [35, 65], y: 78 },             // Zagueiros (2 posições)
        4: { nome: 'MEI', x: [25, 50, 75], y: 50 },         // Meias (3 posições)
        5: { nome: 'ATA', x: [35, 65], y: 22 },             // Atacantes (2 posições)
        6: { nome: 'TEC', x: 8, y: 95, fora: true }         // Técnico (fora do campo)
      };
      ```
    - [ ] Buscar fotos: `https://s3.glbimg.com/v1/AUTH_cartola/atletas/{atleta_id}_140x140.png`
    - [ ] Fallback: escudo do clube se foto não disponível
    
    **FASE 3: Renderização de Jogadores** (~3h)
    - [ ] Componente de jogador individual:
      - Foto circular com borda (cor = clube ou parcial)
      - Nome abaixo (truncado se longo)
      - Parcial atual em badge
      - Ícone de capitão (C) com brilho dourado
    - [ ] Estados visuais baseados no scout do Cartola:
      - 🟢 Verde: parcial positiva
      - 🔴 Vermelho: parcial negativa
      - ⚪ Cinza: ainda não jogou (jogo não começou)
      - 🟡 Amarelo: em campo agora (jogo em andamento)
      - ⚽ Badge especial: gol marcado
      - 🅰️ Badge especial: assistência
    
    **FASE 4: Integração no Módulo Parciais** (~2h)
    - [ ] Adicionar toggle "Ver como Lista / Ver como Campo"
    - [ ] Substituir tabela por campinho quando ativado
    - [ ] Manter polling de parciais existente (`/atletas/pontuados`)
    - [ ] Auto-refresh do campinho a cada 30s durante jogos
    
    **FASE 5: Banco de Reservas** (~1h)
    - [ ] Área abaixo do campo com reservas
    - [ ] Mesmo estilo visual dos titulares
    - [ ] Indicador se reserva entrou em campo
  
  - **Tecnologias:**
    - **SVG inline** (não Canvas) - melhor para interatividade e responsividade
    - **CSS Variables** para cores dinâmicas
    - **Vanilla JS** (sem libs extras) - consistente com o projeto
  
  - **Referências visuais:**
    - https://www.sofascore.com (campinho minimalista)
    - https://www.fotmob.com (posições precisas)
    - App Cartola FC (estilo oficial)
  
  - **🤖 MCPs RECOMENDADOS:**
    - **@anthropic/fetch** - Buscar exemplos de SVG de campos de futebol
    - **@anthropic/puppeteer** - Capturar screenshots de referência (SofaScore, FotMob)
    - **@anthropic/github** - Buscar repos open-source com componentes de campo:
      - `football-field-svg`, `soccer-pitch-react`, `pitch-visualizer`
    - **Context7** - Documentação de SVG e CSS animations
    - **21st-dev/magic** - Gerar código de componentes UI complexos
  
  - **Complexidade:** Média-Alta (~13h total)
  - **Status:** Pronto para implementar

- [ ] [FEAT-017] **Comparativo de Confronto em Tempo Real** 🔥 PRIORIDADE 2026
  - **Descrição:** Em **qualquer disputa que envolva 2 participantes diretamente**, exibir ao participante o time escalado do seu adversário e fazer comparativos em tempo real
  - **Regra de Ouro:** Sempre que houver um confronto direto 1v1 entre participantes (seja em competições existentes ou futuras criadas pelo admin), o sistema deve oferecer essa visualização
  - **Funcionalidades:**
    - Exibir escalação do adversário no formato "campinho virtual" (FEAT-015)
    - Parciais lado a lado em tempo real
    - Indicador visual de quem está vencendo
    - Destaque de duelos diretos por posição (ex: seu atacante vs zagueiro dele)
    - Histórico de parciais durante a rodada
    - Alertas: "Seu adversário virou!", "Você está na frente!"
  - **Onde integrar (exemplos atuais):**
    - Módulo Mata-Mata (confronto da fase atual)
    - Módulo Pontos Corridos (rodada atual vs adversário)
    - Módulo Parciais (novo modo "Confronto")
    - **Qualquer disputa futura** criada pelo admin que seja 1v1
  
  - **🛠️ ROADMAP DE IMPLEMENTAÇÃO:**
  
    **FASE 1: API de Confronto Atual** (~2h)
    - [ ] Criar endpoint: `GET /api/participante/:timeId/confronto-atual`
      - Retorna: `{ adversario: { time_id, nome, escalacao }, tipo_disputa, fase, rodada, placar_parcial }`
    - [ ] Buscar confronto ativo em **qualquer competição 1v1** (não apenas Mata-Mata/PC)
    - [ ] Se não houver confronto ativo, retornar `{ confronto: null }`
    - [ ] **Extensível:** Preparar para novas disputas criadas pelo admin
    
    **FASE 2: Componente de Confronto Lado a Lado** (~4h)
    - [ ] Criar `public/participante/js/components/confronto-visual.js`
      - Dois campinhos lado a lado (mobile: empilhados)
      - Placar central grande: "45.2 x 38.7"
      - Indicador de quem está vencendo (seta ou cor)
      - Barra de progresso visual (% de vitória)
    - [ ] CSS responsivo:
      - Desktop: lado a lado (50% cada)
      - Mobile: empilhados com placar fixo no topo
    
    **FASE 3: Duelos por Posição** (~2h)
    - [ ] Identificar duelos diretos baseados em `posicao_id` do Cartola:
      - Meu ATA (5) vs ZAG (3) dele
      - Meu MEI (4) vs MEI (4) dele
      - Meu GOL (1) vs ATA (5) dele
    - [ ] Exibir mini-cards de duelo:
      ```
      ⚔️ Duelo de Atacantes
      [Foto] Neymar 12.5  vs  Mbappé 8.3 [Foto]
      ```
    - [ ] Highlight do vencedor de cada duelo
    
    **FASE 4: Sistema de Alertas** (~2h)
    - [ ] Detectar mudanças de liderança via polling de `/atletas/pontuados`:
      - `if (meuPlacarAnterior < adversario && meuPlacarAtual > adversario)`
      - Toast: "🎉 Você virou o confronto!"
    - [ ] Alertas baseados no scout do Cartola:
      - [ ] "Adversário fez gol!" (detectar 'G' no scout)
      - [ ] "Você está perdendo por mais de 10 pontos"
      - [ ] "Faltam 2 jogadores seus para entrar em campo"
    - [ ] Histórico de eventos da rodada (timeline lateral)
    
    **FASE 5: Integração nos Módulos** (~2h)
    - [ ] Mata-Mata: botão "Ver Confronto Ao Vivo" na fase atual
    - [ ] Pontos Corridos: card "Seu Adversário da Rodada"
    - [ ] Parciais: toggle "Modo Confronto"
    
    **FASE 6: Polling/WebSocket** (~2h)
    - [ ] Polling a cada 30s (consistente com parciais existentes)
    - [ ] Usar mesmo endpoint: `/atletas/pontuados` para ambos os times
    - [ ] Cache local para evitar re-renders desnecessários
  
  - **⚽ INTEGRAÇÃO CARTOLA FC:**
    - **Escalação adversário:** `/api/data-lake/raw/:adversarioId?rodada=N`
    - **Parciais ao vivo:** `/atletas/pontuados` (mesmo endpoint, filtrar por atleta_id)
    - **Dados necessários por jogador:**
      - `pontos_num` - Parcial atual
      - `scout` - Detalhes (G, A, SG, CA, CV)
      - `variacao_num` - Variação desde último refresh
    - **Considerar:** Capitão dobra pontos (já vem calculado na API)
  
  - **Tecnologias:**
    - **Reutilizar FEAT-015** (CampinhoVisual)
    - **CSS Grid/Flexbox** para layout responsivo
    - **Intersection Observer** para pausar polling quando não visível
  
  - **🤖 MCPs RECOMENDADOS:**
    - **@anthropic/fetch** - Buscar dados de parciais em tempo real
    - **Context7** - Documentação de WebSocket/SSE para real-time
    - **21st-dev/magic** - Gerar UI de comparativo lado a lado
    - **@anthropic/github** - Buscar implementações de live score comparisons
    - **Perplexity MCP** - Pesquisar melhores práticas de UX para confrontos ao vivo
  
  - **Dependências:** FEAT-015 (Campinho Visual) - DEVE ser implementado primeiro
  - **Complexidade:** Alta (~14h total)
  - **Status:** Aguardando FEAT-015

- [ ] [FEAT-018] **Jogos do Dia** 📅
  - **Descrição:** Exibir calendário de jogos da rodada atual/próxima, com horários e informações relevantes
  - **Fonte de dados:** API-Football (principal) ou scraping como fallback
  - **Funcionalidades:**
    - Lista de jogos do dia com horários
    - Escudos dos times
    - Indicador de jogos em andamento
    - Placar em tempo real (se possível)
    - Destaque de jogos com jogadores escalados pelo participante
    - "Qual jogo assistir" baseado na escalação
  - **Onde exibir:**
    - App do Participante (tela inicial ou seção dedicada)
    - Módulo Parciais (contextualização)
  
  - **🛠️ ROADMAP DE IMPLEMENTAÇÃO:**
  
    **FASE 1: Pesquisa e Seleção de API** (~1h)
    - [ ] Avaliar opções de API:
      - **API-Football** (api-football.com): Plano gratuito 100 req/dia - RECOMENDADO
      - **Football-Data.org**: Gratuito, limitado ao Brasileirão
      - **SofaScore API** (não oficial): Scraping arriscado
      - **Perplexity AI**: Para consultas pontuais, não real-time
    - [ ] Criar conta e obter API key
    - [ ] Armazenar em Replit Secrets: `FOOTBALL_API_KEY`
    
    **FASE 2: Service de Integração** (~3h)
    - [ ] Criar `services/footballApiService.js`:
      ```javascript
      // Métodos principais:
      async function getJogosHoje(competicaoId) { }
      async function getJogosRodada(rodadaId) { }
      async function getPlacarAoVivo(jogoId) { }
      async function getProximosJogos(dias = 7) { }
      ```
    - [ ] Implementar cache em memória (5 minutos) para reduzir requests
    - [ ] Fallback para dados estáticos se API falhar
    
    **FASE 3: Backend Routes** (~2h)
    - [ ] Criar `routes/jogos-routes.js`:
      - `GET /api/jogos/hoje` - Jogos do dia
      - `GET /api/jogos/rodada/:numero` - Jogos de uma rodada específica
      - `GET /api/jogos/ao-vivo` - Apenas jogos em andamento
      - `GET /api/jogos/proximos` - Próximos 7 dias
    - [ ] Middleware de cache HTTP (Cache-Control: max-age=300)
    
    **FASE 4: Frontend - Componente de Jogos** (~3h)
    - [ ] Criar `public/participante/js/modules/participante-jogos.js`
    - [ ] Criar `public/participante/fronts/jogos.html`
    - [ ] UI sugerida:
      ```
      ┌─────────────────────────────────────┐
      │ 📅 JOGOS DE HOJE                    │
      ├─────────────────────────────────────┤
      │ 🔴 AO VIVO                          │
      │ [Flamengo] 2 x 1 [Palmeiras] 67'    │
      ├─────────────────────────────────────┤
      │ ⏰ PRÓXIMOS                          │
      │ [Corinthians] vs [São Paulo] 19:00  │
      │ [Santos] vs [Grêmio] 21:30          │
      ├─────────────────────────────────────┤
      │ ✅ ENCERRADOS                        │
      │ [Atlético-MG] 1 x 0 [Cruzeiro]      │
      └─────────────────────────────────────┘
      ```
    
    **FASE 5: Destaque de Jogadores Escalados** (~2h)
    - [ ] Cruzar jogos com escalação do participante via API Cartola
    - [ ] Usar `clube_id` dos jogadores para identificar times
    - [ ] Indicador visual: "⭐ 3 jogadores seus neste jogo"
    - [ ] Lista de jogadores escalados em cada partida
    - [ ] Sugestão: "Assista Flamengo x Palmeiras - 5 dos seus jogadores em campo!"
    
    **FASE 6: Widget na Home** (~1h)
    - [ ] Mini-widget na tela inicial do participante
    - [ ] Mostrar apenas próximo jogo relevante
    - [ ] Link para tela completa de jogos
  
  - **⚽ INTEGRAÇÃO CARTOLA FC:**
    - **Cruzamento de dados:** Usar `clube_id` da escalação do participante
    - **Mapeamento de clubes:** IDs do Cartola para times do Brasileirão
      ```javascript
      // Alguns clube_id do Cartola FC
      const CLUBES_CARTOLA = {
        262: 'Flamengo',
        263: 'Botafogo', 
        264: 'Corinthians',
        265: 'Bahia',
        266: 'Fluminense',
        275: 'Palmeiras',
        276: 'São Paulo',
        277: 'Santos',
        // ... ver cartolaApiService.js para lista completa
      };
      ```
    - **Destacar jogos:** Onde o participante tem jogadores escalados
    - **Sugestão inteligente:** "Você tem 5 jogadores no jogo das 16h!"
  
  - **Tecnologias:**
    - **API-Football** (melhor custo-benefício)
    - **Node-cache** ou cache em memória existente
    - **Vanilla JS** para frontend
  
  - **Custos:**
    - API-Football gratuito: 100 requests/dia (suficiente para MVP)
    - Plano Pro: $15/mês para 7.500 requests/dia (escalar depois)
  
  - **🤖 MCPs RECOMENDADOS:**
    - **Perplexity MCP** ⭐ - Consulta principal para jogos do dia em tempo real
      - Query: "jogos do brasileirão hoje horários"
      - Query: "próximos jogos da rodada X do Cartola"
    - **@anthropic/fetch** - Integração direta com API-Football
    - **@anthropic/brave-search** - Alternativa ao Perplexity para busca de jogos
    - **@anthropic/puppeteer** - Scraping de GE/ESPN como fallback
    - **Context7** - Documentação de APIs de futebol (API-Football, Football-Data)
    - **@anthropic/github** - Buscar wrappers Node.js para API-Football:
      - `api-football-nodejs`, `football-data-api`
  
  - **Complexidade:** Média (~12h total)
  - **Status:** Backlog - Avaliar API primeiro

- [ ] [FEAT-019] **Tabelas de Competições Oficiais 2026** 🏆
  - **Descrição:** Implementar tabelas de classificação e jogos das competições foco da temporada 2026
  - **Competições:**
    - 🇧🇷 **Brasileirão Série A** - Tabela de classificação, rodadas, artilharia
    - 🌎 **Copa Libertadores** - Fase de grupos, mata-mata, classificação
    - 🏆 **Copa do Mundo de Seleções** - Grupos, mata-mata, calendário completo
  - **Funcionalidades por competição:**
    - Tabela de classificação atualizada
    - Próximos jogos e resultados
    - Artilheiros da competição
    - Destaque de times com jogadores escalados na liga
    - Filtro por time favorito
  
  - **🛠️ ROADMAP DE IMPLEMENTAÇÃO:**
  
    **FASE 1: Modelo de Dados** (~2h)
    - [ ] Criar `models/Competicao.js`:
      ```javascript
      {
        id: String,           // 'brasileirao-2026', 'libertadores-2026', 'copa-mundo-2026'
        nome: String,
        tipo: String,         // 'pontos-corridos', 'mata-mata', 'grupos+mata-mata'
        temporada: Number,
        pais: String,
        logo_url: String,
        ativa: Boolean
      }
      ```
    - [ ] Criar `models/TabelaClassificacao.js`:
      ```javascript
      {
        competicao_id: String,
        grupo: String,        // null para pontos corridos, 'A', 'B', etc para grupos
        classificacao: [{
          posicao: Number,
          time: { nome, escudo_url, sigla },
          pontos: Number,
          jogos: Number,
          vitorias: Number,
          empates: Number,
          derrotas: Number,
          gols_pro: Number,
          gols_contra: Number,
          saldo: Number
        }],
        atualizado_em: Date
      }
      ```
    
    **FASE 2: Service de Dados** (~3h)
    - [ ] Criar `services/competicoesService.js`
    - [ ] Integrar com API-Football (mesma do FEAT-018):
      - Brasileirão: `league_id = 71`
      - Libertadores: `league_id = 13`
      - Copa do Mundo: `league_id = 1` (quando disponível)
    - [ ] Cache agressivo: tabelas mudam 1x por rodada
    - [ ] Cron job para atualizar tabelas a cada 6h
    
    **FASE 3: Backend Routes** (~2h)
    - [ ] Criar `routes/competicoes-routes.js`:
      - `GET /api/competicoes` - Lista competições ativas
      - `GET /api/competicoes/:id/tabela` - Tabela de classificação
      - `GET /api/competicoes/:id/jogos` - Jogos da competição
      - `GET /api/competicoes/:id/artilheiros` - Top 10 artilheiros
      - `GET /api/competicoes/:id/rodada/:numero` - Jogos de uma rodada
    
    **FASE 4: Frontend - Brasileirão** (~4h)
    - [ ] Criar `public/participante/fronts/competicoes.html`
    - [ ] Criar `public/participante/js/modules/participante-competicoes.js`
    - [ ] Tabela de classificação estilo GE/ESPN:
      ```
      ┌────┬─────────────────┬───┬───┬───┬───┬────┐
      │ #  │ Time            │ P │ J │ V │ SG │ %  │
      ├────┼─────────────────┼───┼───┼───┼───┼────┤
      │ 1  │ 🔴 Flamengo     │ 45│ 20│ 14│ +18│ 75%│
      │ 2  │ 🟢 Palmeiras    │ 42│ 20│ 13│ +15│ 70%│
      │ ...│                 │   │   │   │    │    │
      └────┴─────────────────┴───┴───┴───┴───┴────┘
      ```
    - [ ] Cores por zona: G4 (verde), rebaixamento (vermelho), Libertadores (azul)
    - [ ] Clicar no time → ver jogos e detalhes
    
    **FASE 5: Frontend - Copa do Mundo** (~4h)
    - [ ] Layout especial para grupos + mata-mata:
      ```
      ┌─────────────────────────────────────────┐
      │ 🏆 COPA DO MUNDO 2026                   │
      ├─────────────────────────────────────────┤
      │ GRUPO A          │ GRUPO B              │
      │ 1. 🇧🇷 Brasil    │ 1. 🇫🇷 França       │
      │ 2. 🇩🇪 Alemanha  │ 2. 🇪🇸 Espanha      │
      │ ...              │ ...                  │
      ├─────────────────────────────────────────┤
      │ MATA-MATA (quando disponível)           │
      │ [Bracket visual tipo NCAA]              │
      └─────────────────────────────────────────┘
      ```
    - [ ] Bracket interativo para mata-mata
    - [ ] Calendário de jogos com fuso horário local
    
    **FASE 6: Integração com Liga Cartola** (~2h)
    - [ ] Destacar times que têm jogadores escalados na liga
    - [ ] Cruzar `clube_id` dos jogadores escalados com times da tabela
    - [ ] "Flamengo tem 5 jogadores escalados na sua liga"
    - [ ] Filtro "Mostrar apenas times relevantes"
    
    **FASE 7: Widget na Sidebar** (~1h)
    - [ ] Mini-tabela na sidebar do painel
    - [ ] Top 4 + time favorito do participante
    - [ ] Atualização automática
  
  - **⚽ INTEGRAÇÃO CARTOLA FC:**
    - **Mapeamento Clube/Time:** Relacionar `clube_id` do Cartola com times das competições
    - **Destaque inteligente:** 
      - Mostrar quantos jogadores de cada time estão escalados na liga
      - "Você tem interesse no jogo Flamengo x Palmeiras - 8 jogadores escalados!"
    - **Artilheiros do Cartola vs Artilheiros do Brasileirão:**
      - Comparar top artilheiros do fantasy com artilheiros reais
      - "Gabigol: 15 gols no Brasileirão, 45 gols no Cartola da liga"
    - **Impacto na rodada:** 
      - "Se o Flamengo vencer, 3 participantes ganham bônus de SG"
  
  - **Tecnologias:**
    - **API-Football** (mesmo do FEAT-018 - compartilhar quota)
    - **MongoDB** para cache persistente de tabelas
    - **Cron jobs** (node-cron já usado no projeto)
    - **CSS Grid** para layouts de tabela
  
  - **IDs das Competições (API-Football):**
    - Brasileirão Série A: `71`
    - Copa Libertadores: `13`
    - Copa do Mundo: `1` (verificar quando houver dados 2026)
  
  - **Custos:**
    - Compartilha quota com FEAT-018
    - ~20-30 requests/dia para manter tabelas atualizadas
  
  - **🤖 MCPs RECOMENDADOS:**
    - **Perplexity MCP** ⭐ - Consultas atualizadas sobre competições:
      - "tabela atualizada do brasileirão 2026"
      - "grupos da copa do mundo 2026"
      - "classificação da libertadores 2026"
    - **@anthropic/fetch** - Integração com API-Football para dados estruturados
    - **@anthropic/brave-search** - Buscar informações de artilheiros, estatísticas
    - **@anthropic/puppeteer** - Scraping de tabelas do GE/ESPN/Flashscore como backup
    - **@anthropic/github** - Buscar componentes de bracket/tournament:
      - `react-brackets`, `tournament-bracket`, `bracket-generator`
    - **Context7** - Documentação de CSS Grid para tabelas responsivas
    - **21st-dev/magic** - Gerar UI de tabelas de classificação e brackets
    - **@anthropic/filesystem** - Salvar cache de tabelas localmente para dev
  
  - **Dependências:** FEAT-018 (compartilha service de API)
  - **Complexidade:** Alta (~18h total)
  - **Status:** Backlog - Implementar junto com FEAT-018

### ⚙️ Infraestrutura/Performance

- [ ] [PERF-001] **Cache com Redis**
  - **Descrição:** Substituir cache em memória por Redis
  - **Benefício:** Persistência, compartilhamento entre instâncias
  - **Quando:** Se escalar para múltiplos servidores

- [ ] [PERF-002] **PWA Offline Completo**
  - **Descrição:** App funciona 100% sem internet (leitura)
  - **Tecnologia:** IndexedDB + Service Worker avançado
  - **Sync:** Background sync quando voltar online

---

## 🤖 MCPs Recomendados (Model Context Protocol)

> Servidores MCP que podem acelerar o desenvolvimento das features do backlog.

### 🔍 Pesquisa e Dados em Tempo Real
| MCP | Uso Principal | Features Relacionadas |
|-----|---------------|----------------------|
| **Perplexity MCP** | Pesquisa web em tempo real, dados atualizados | FEAT-018, FEAT-019 |
| **@anthropic/brave-search** | Busca alternativa, scraping-friendly | FEAT-018, FEAT-019 |
| **@anthropic/fetch** | Requisições HTTP para APIs externas | Todas |

### 🎨 Geração de UI/Código
| MCP | Uso Principal | Features Relacionadas |
|-----|---------------|----------------------|
| **21st-dev/magic** | Gerar componentes UI complexos | FEAT-015, FEAT-017 |
| **Context7** | Documentação técnica de libs/frameworks | Todas |
| **@anthropic/github** | Buscar código de referência em repos | Todas |

### 🕷️ Scraping e Automação
| MCP | Uso Principal | Features Relacionadas |
|-----|---------------|----------------------|
| **@anthropic/puppeteer** | Screenshots, scraping de sites | FEAT-015, FEAT-018, FEAT-019 |
| **@anthropic/filesystem** | Manipulação de arquivos locais | Cache, backups |

### 📊 Dados de Futebol
| MCP | Uso Principal | Features Relacionadas |
|-----|---------------|----------------------|
| **API-Football via fetch** | Dados estruturados de competições | FEAT-018, FEAT-019 |
| **Football-Data.org via fetch** | Alternativa gratuita (limitada) | FEAT-018 |

### 💡 Como Usar MCPs no Desenvolvimento

```bash
# Exemplo: Pesquisar jogos do dia com Perplexity
# No Claude/Copilot com MCP configurado:
"Use o MCP Perplexity para buscar os jogos do Brasileirão de hoje com horários"

# Exemplo: Buscar código de referência
"Use o MCP GitHub para buscar implementações de 'soccer pitch svg component' em JavaScript"

# Exemplo: Capturar screenshot de referência
"Use o MCP Puppeteer para capturar screenshot do SofaScore mostrando um campo de futebol"
```

### 🔧 Configuração de MCPs no VS Code

Ver documentação completa em: [docs/CONTEXT7-MCP-SETUP.md](docs/CONTEXT7-MCP-SETUP.md)

```json
// .vscode/mcp.json (exemplo)
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-perplexity"],
      "env": { "PERPLEXITY_API_KEY": "${env:PERPLEXITY_API_KEY}" }
    },
    "fetch": {
      "command": "npx", 
      "args": ["-y", "@anthropic/mcp-fetch"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-puppeteer"]
    }
  }
}
```

---

## 📋 Convenções

### IDs Únicos
- **BUG-XXX**: Bugs/correções
- **SEC-XXX**: Segurança
- **FEAT-XXX**: Novas features
- **PERF-XXX**: Performance
- **UX-XXX**: User Experience
- **REFACTOR-XXX**: Refatorações
- **IDEA-XXX**: Ideias experimentais
- **NICE-XXX**: Nice to have
- **FUTURE-XXX**: Backlog distante

### Checkboxes
- `[ ]` - Não iniciado
- `[x]` - Concluído
- `[~]` - Em progresso (opcional)

### Referências
- Referenciar arquivos específicos quando possível
- Adicionar links para issues, PRs ou discussões relacionadas
- Manter contexto suficiente para retomar meses depois

---

## 🆕 NOVAS IDEIAS - Janeiro 2026

### 🤖 IA e Assistente Virtual

- [ ] [FEAT-020] **IA Conversar com Participante (LLM Free)**
  - **Descrição:** Chatbot inteligente para tirar dúvidas e dar dicas
  - **Tecnologia:** LLM gratuita/barata (ex: Gemini Flash, Groq, local LLM)
  - **Funcionalidades:**
    - Responder dúvidas sobre regras da liga
    - Dar dicas de escalação baseadas em dados
    - Análise do desempenho do participante
  - **Complexidade:** Alta
  - **Riscos:** Custo de API, qualidade das respostas, latência

### 📊 Confrontos e Comparativos

- [ ] [FEAT-021] **Comparativo Detalhado de Times Adversários**
  - **Descrição:** Análise lado-a-lado com adversário em confrontos
  - **Funcionalidades:**
    - Comparar jogadores posição a posição
    - Histórico de confrontos diretos
    - Probabilidade de vitória baseada em dados
  - **Arquivos relacionados:** `participante-campinho.js`, `participante-mata-mata.js`
  - **Status:** Parcialmente implementado (campinho v1.0 tem base)

### 🔴 Tempo Real e Live Experience

- [ ] [FEAT-022] **Tempo Real: Jogos com Jogadores Escalados (Premium)**
  - **Descrição:** Durante parciais, destacar quais jogos têm jogadores do participante
  - **Funcionalidades:**
    - Badge "Você tem jogador neste jogo"
    - Notificação quando jogador marca gol
    - Destaque visual no placar ao vivo
  - **Dependências:** Sistema de jogos ao vivo já implementado (`jogos-ao-vivo-routes.js`)
  - **Acesso:** Premium apenas

### 🔔 Notificações Avançadas

- [x] [FEAT-023] **Push Notifications Completo (Web Push API)** ✅ IMPLEMENTADO
  - **Descrição:** Sistema completo de push notifications
  - **Status atual:** 100% implementado via FEAT-003
  - **Implementado:**
    - ✅ Instalação `web-push` library
    - ✅ VAPID keys + collection MongoDB
    - ✅ Service Worker handlers (push + notificationclick)
    - ✅ Backend de gerenciamento de subscriptions
    - ✅ Gatilhos automáticos (rodada, mito/mico, acertos, escalação)
    - ✅ Tela de configurações com preferências
  - **Referência:** FEAT-003 concluída em 25/01/2026

### 🎮 Integração Cartola PRO

- [ ] [FEAT-024] **Escalar Automaticamente no Cartola PRO** ⚠️ ALTO RISCO
  - **Descrição:** Permitir que usuário PRO escale diretamente pelo Super Cartola
  - **Status da pesquisa:**
    - ✅ Viabilidade técnica confirmada (endpoints identificados)
    - ⚠️ Riscos significativos:
      - Pode violar ToS da Globo
      - Armazenar credenciais é sensível
      - Conta pode ser banida
      - API pode mudar sem aviso
  - **Endpoints identificados:**
    - Auth: `POST https://login.globo.com/api/authentication`
    - Salvar: `POST https://api.cartolafc.globo.com/auth/time/salvar`
  - **Recomendação:** Implementar em fases:
    1. Fase 1 ✅: Dicas de escalação (somente leitura) - IMPLEMENTADO
    2. Fase 2: Mostrar sugestão, usuário copia manualmente
    3. Fase 3: Escalar automaticamente (usuário assume risco)
  - **Referências GitHub:** `python-cartolafc`, `CartolaJS`, `cartola-api`

### ⚽ Melhorias no Campinho Virtual

- [x] [FEAT-015] **Campinho Virtual Básico** ✅ IMPLEMENTADO 20/01/2026
  - **Descrição:** Visualização da escalação em formato de campo
  - **Arquivos criados:**
    - `public/participante/js/modules/participante-campinho.js`
    - `public/participante/css/campinho.css`
    - `public/participante/fronts/campinho.html`
  - **Funcionalidades implementadas:**
    - Exibição de jogadores por posição
    - Pontuação por jogador
    - Integração com confrontos (estrutura preparada)

- [ ] [FEAT-025] **Campinho com Parciais ao Vivo**
  - **Descrição:** Atualizar pontuação dos jogadores em tempo real durante jogos
  - **Dependências:** FEAT-015 (base), API de parciais
  - **Funcionalidades:**
    - Auto-refresh a cada 30s durante jogos
    - Animação quando jogador pontua
    - Indicador de jogo em andamento

### 🔴 Live Experience / Matchday (2026)

- [ ] [FEAT-026] **Modo Matchday (Live Experience 2026)**
  - **Descrição:** Ativar estado global “MATCHDAY” quando mercado estiver fechado e atualizar o app em tempo real
  - **Doc:** `docs/live_experience_2026.md` (especificação aprovada)
  - **Backend (mínimo):**
    - [ ] `/api/matchday/status`
    - [ ] `/api/matchday/parciais/:ligaId`
    - [ ] `/api/matchday/partidas`
  - **Frontend (core):**
    - [ ] `MatchdayService` (estado global + polling)
    - [ ] Header “AO VIVO” + CSS global do modo
    - [ ] Ticker de scouts
  - **Frontend (módulos live):**
    - [ ] Ranking Live (reordenação animada)
    - [ ] Pontos Corridos Live
    - [ ] Mata-Mata Live (cabo de guerra)
    - [ ] Capitao de Luxo / Luva de Ouro live badges
  - **Extras:**
    - [ ] Cache TTL (30s) para parciais/partidas
    - [ ] WebSocket opcional (fase 2)

### 🧩 Módulos Planejados (ARQUITETURA-MODULOS)

- [ ] [FEAT-027] **Capitão de Luxo (ranking estatístico do capitão)**
  - **Doc:** `docs/ARQUITETURA-MODULOS.md`
- [ ] [FEAT-028] **Tiro Certo (Survival)**
  - **Doc:** `docs/ARQUITETURA-MODULOS.md`, `docs/live_experience_2026.md`
- [ ] [FEAT-029] **Resta Um (Competição Eliminatória)**
  - **Doc:** `docs/ARQUITETURA-MODULOS.md`, `docs/live_experience_2026.md`

### 🗄️ Backups (legado docs/archives)

- [ ] [PERF-BKP-001] **Backup Scheduler + Monitoramento**
  - **Doc:** `docs/archives/2025/ANALISE-BACKUPS-25-12-2025.md`

---

### 🏷️ White Label / Multi-Tenant SaaS

- [ ] [FEAT-025] **Sistema White Label Completo** 🚀 VISÃO ESTRATÉGICA
  - **Descrição:** Transformar o Super Cartola em plataforma white-label onde qualquer pessoa pode criar sua própria liga com identidade visual customizada
  - **Contexto atual:**
    - ✅ Multi-tenant já implementado (cada liga tem suas configs)
    - ✅ Controllers usam `liga.configuracoes` dinâmico
    - ✅ `modulos_ativos` por liga
    - ⚠️ Branding ainda é fixo (Super Cartola)

  - **Funcionalidades White Label:**

    **📦 FASE 1: Configuração de Marca**
    - [ ] Modelo `LigaBranding` com:
      - Nome da liga (já existe)
      - Logo customizado (upload)
      - Cores primária/secundária (CSS variables)
      - Favicon customizado
      - Domínio customizado (CNAME)
    - [ ] Tela admin "Personalizar Marca"

    **🎨 FASE 2: Theming Dinâmico**
    - [ ] CSS variables carregadas do banco
    - [ ] Dark/Light mode por liga
    - [ ] Fontes customizáveis (Google Fonts)
    - [ ] Templates de email com marca da liga

    **🔗 FASE 3: Domínio Customizado**
    - [ ] Suporte a subdomínio: `minhaliga.supercartola.com.br`
    - [ ] Suporte a domínio próprio: `minhaliga.com.br`
    - [ ] SSL automático (Let's Encrypt)
    - [ ] Redirect middleware baseado em hostname

    **💰 FASE 4: Monetização (Opcional)**
    - [ ] Planos de assinatura para ligas (Free/Pro/Enterprise)
    - [ ] Limites por plano (participantes, módulos, storage)
    - [ ] Gateway de pagamento (Stripe/PIX)
    - [ ] Dashboard de billing para owners

  - **Arquitetura proposta:**
    ```
    Request → Middleware detecta hostname → Carrega LigaBranding → Injeta CSS vars → Renderiza

    Models:
    - LigaBranding { liga_id, logo, cores, dominio, plano }
    - LigaPlano { features[], limites{}, preco }
    ```

  - **Arquivos a criar/modificar:**
    - `models/LigaBranding.js` - Schema de branding
    - `middleware/whitelabel.js` - Detecta liga por domínio
    - `public/css/_liga-variables.css` - CSS dinâmico
    - `routes/branding-routes.js` - Upload de logo, cores
    - `controllers/brandingController.js` - CRUD branding

  - **Dependências:**
    - Cloudflare ou similar para wildcard SSL
    - Storage para logos (S3/Cloudinary)
    - DNS dinâmico para subdomínios

  - **Complexidade:** Muito Alta (~80h+)
  - **ROI:** Potencial de escalar para múltiplas ligas independentes
  - **Status:** Backlog - Visão de longo prazo

---

## 🎯 Como Usar

1. **Nova ideia surge?** → Adicione na seção apropriada com ID único
2. **Vai implementar algo?** → Marque com `[x]` quando concluir
3. **Mudou prioridade?** → Mova para a seção correta
4. **Revisar backlog** → Mensalmente, reavalie prioridades

**Dica:** Use `TODO-[PRIORIDADE]` no código para ideias localizadas e referencie aqui para visão geral.

---

_Última atualização: 25/01/2026 - FEAT-025 White Label adicionado ao backlog_
