# BACKLOG - Super Cartola Manager

> Sistema de gestão de ideias e melhorias futuras. Organizado por prioridade.

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

- [~] [FEAT-001] **Histórico de Rodadas no App do Participante** ⚡ 80% IMPLEMENTADO
  - **Descrição:** Permitir que participantes visualizem seus dados históricos de cada rodada
  - **Arquivos implementados:**
    - `public/participante/js/modules/participante-rodadas.js` (v4.5) - Grid visual completo
    - `public/participante/fronts/rodadas.html` (v2.0) - Template com 38 cards
    - `public/participante/js/modules/participante-historico.js` (v9.4) - Hall da Fama
    - `routes/participante-historico-routes.js` (v2.0) - API de histórico
  - **Funcionalidades JÁ IMPLEMENTADAS:**
    - ✅ Seletor visual de rodadas (grid 5x8 com 38 cards)
    - ✅ Exibir pontuação por rodada (cards coloridos por saldo)
    - ✅ Posição no ranking da rodada (ao clicar, mostra ranking completo)
    - ✅ Timeline visual da temporada (grid funciona como timeline)
    - ✅ Badges especiais para MITO e MICO
    - ✅ Card "Seu Desempenho" (contagem mitos/micos)
    - ✅ Cache instantâneo via IndexedDB
  - **Funcionalidades PENDENTES (opcional):**
    - [ ] Comparativo com rodada anterior (indicador subiu/desceu posições)
    - [ ] Ver Meus Jogadores (escalação detalhada por rodada)
      - Endpoint existe: `/api/data-lake/raw/:timeId?rodada=N`
      - Botão existe mas desabilitado (`rodadas.html:126`)
  - **Status:** Feature principal funcional. Gaps são melhorias opcionais.

- [~] [FEAT-002] **Hall da Fama - Estatísticas Históricas** ⚡ 70% IMPLEMENTADO
  - **Descrição:** Página com recordes e estatísticas de todas as temporadas
  - **Arquivos implementados:**
    - `public/participante/js/modules/participante-historico.js` (v9.4)
    - `public/participante/fronts/historico.html` (v7.0)
  - **Funcionalidades JÁ IMPLEMENTADAS:**
    - ✅ Posição final, pontuação total, saldo financeiro
    - ✅ Melhor rodada (maior pontuação)
    - ✅ Conquistas: Artilheiro, Luva de Ouro, TOP10, Melhor Mês, Mata-Mata
    - ✅ Fluxo financeiro (créditos/débitos)
    - ✅ Filtragem por liga selecionada
  - **Funcionalidades PENDENTES:**
    - [ ] Maior pontuação de uma rodada (todos os tempos - cross-season)
    - [ ] Maior sequência de vitórias
    - [ ] Comparativo entre temporadas (2025 vs 2026)
  - **Status:** Hall da Fama individual funcional. Falta visão cross-season.

- [ ] [FEAT-003] **Notificações Push (Web Push API)** 🔔 ALTA PRIORIDADE
  - **Descrição:** Sistema completo de notificações push para alertar participantes sobre eventos importantes da liga
  - **Status Atual:** 0% implementado (infraestrutura PWA existente, mas sem push notifications)
  - **Impacto:** ALTO - Retenção, engajamento e experiência do usuário
  - **Complexidade:** ALTA (~11h de implementação)
  
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
    
    **FASE 1: Setup Básico** (~2h)
    - [ ] Instalar biblioteca: `npm install web-push`
    - [ ] Gerar VAPID keys: `npx web-push generate-vapid-keys`
    - [ ] Armazenar keys nos Replit Secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
    - [ ] Criar collection MongoDB: `push_subscriptions`
    - [ ] Criar modelo: `models/PushSubscription.js`
      ```javascript
      // Schema: { timeId, endpoint, keys: {p256dh, auth}, createdAt, expiresAt, active }
      ```
    
    **FASE 2: Backend** (~3h)
    - [ ] Criar `routes/notifications-routes.js`
      - `POST /api/notifications/subscribe` - Salvar subscription do participante
      - `POST /api/notifications/unsubscribe` - Remover subscription
      - `POST /api/notifications/send` - Admin enviar manual
      - `GET /api/notifications/status` - Verificar status da subscription
    - [ ] Criar `controllers/notificationsController.js`
      - Função `sendPushNotification(timeId, payload)` - Enviar via web-push
      - Função `cleanExpiredSubscriptions()` - Limpar expiradas
      - Função `sendBulkNotifications(timeIds, payload)` - Envio em lote
    - [ ] Integrar rotas no `index.js`
    
    **FASE 3: Service Worker** (~1h)
    - [ ] Adicionar handler `push` em `public/participante/service-worker.js`:
      ```javascript
      self.addEventListener('push', (event) => {
          const data = event.data.json();
          const options = {
              body: data.body,
              icon: '/escudos/default.png',
              badge: '/escudos/badge.png',
              data: { url: data.url },
              vibrate: [200, 100, 200],
              tag: data.tag || 'default'
          };
          event.waitUntil(
              self.registration.showNotification(data.title, options)
          );
      });
      ```
    - [ ] Adicionar handler `notificationclick`:
      ```javascript
      self.addEventListener('notificationclick', (event) => {
          event.notification.close();
          event.waitUntil(
              clients.openWindow(event.notification.data.url)
          );
      });
      ```
    
    **FASE 4: Frontend** (~2h)
    - [ ] Criar `public/participante/js/modules/participante-notifications.js`
      - Função `solicitarPermissao()` - Request permission
      - Função `subscreverNotificacoes()` - Subscribe + enviar ao backend
      - Função `desinscrever()` - Unsubscribe
      - Função `verificarStatus()` - Checar se já está subscrito
      - Função `urlBase64ToUint8Array()` - Converter VAPID key
    - [ ] Adicionar UI de configuração (modal ou tela de perfil):
      - Toggle "Receber Notificações"
      - Checkboxes: "Resultados", "Mercado", "Escalação", "Mito/Mico"
      - Botão "Testar Notificação" (debug)
    - [ ] Integrar no fluxo de onboarding (primeira vez)
    - [ ] Badge visual no header indicando status (🔔 ativo / 🔕 desativado)
    
    **FASE 5: Gatilhos de Envio** (~2h)
    - [ ] **Rodada Consolidada** (`controllers/consolidacao-controller.js`):
      - Após consolidar → buscar subscriptions ativas
      - Enviar notificação personalizada para cada participante (pontos + posição)
    - [ ] **Mercado Fechando** (novo cron job):
      - Verificar status do mercado a cada 5min
      - 30min antes do fechamento → notificar quem não escalou
      - Endpoint: `GET /api/mercado/status` (já existe?)
    - [ ] **Mito/Mico da Rodada** (`controllers/ranking-controller.js`):
      - Após calcular ranking → identificar 1° e último
      - Enviar notificações especiais com badge/emoji
    - [ ] **Admin Manual** (painel admin):
      - Interface para enviar notificação customizada
      - Selecionar destinatários (todos, específicos, por liga)
      - Preview antes de enviar
    
    **FASE 6: Testes e Validação** (~1h)
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
  
  - **Arquivos a Criar/Modificar:**
    ```
    📦 Backend
    ├── models/PushSubscription.js                        [NOVO]
    ├── controllers/notificationsController.js            [NOVO]
    ├── routes/notifications-routes.js                    [NOVO]
    ├── controllers/consolidacao-controller.js            [MODIFICAR]
    ├── controllers/ranking-controller.js                 [MODIFICAR]
    └── index.js                                          [MODIFICAR]
    
    📱 Frontend
    ├── public/participante/service-worker.js             [MODIFICAR]
    ├── public/participante/js/modules/participante-notifications.js  [NOVO]
    ├── public/participante/fronts/configuracoes.html     [NOVO ou MODIFICAR]
    └── public/participante/js/participante-navigation.js [MODIFICAR]
    
    🔧 Config
    ├── .env (via Replit Secrets)                         [ADICIONAR]
    │   ├── VAPID_PUBLIC_KEY
    │   ├── VAPID_PRIVATE_KEY
    │   └── VAPID_SUBJECT (email)
    └── package.json                                      [MODIFICAR]
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
    - [ ] VAPID keys geradas e guardadas nos Secrets
    - [ ] Collection `push_subscriptions` criada e indexada
    - [ ] Rotas de subscribe/unsubscribe funcionais e testadas
    - [ ] Service Worker com handlers de push implementados
    - [ ] UI de permissão implementada (modal educativo)
    - [ ] Gatilho "rodada consolidada" ativo e enviando notificações
    - [ ] Gatilho "escalação pendente" ativo (30min antes)
    - [ ] Testado em Chrome Android (PWA instalado)
    - [ ] Testado em Safari iOS 16.4+ (se disponível)
    - [ ] Rate limiting implementado (1 notif/rodada/tipo)
    - [ ] Cron job para limpar subscriptions expiradas
    - [ ] Documentação de uso atualizada
    - [ ] Logs de envio implementados (auditoria)
  
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

- [ ] [FEAT-015] **Campinho com Escalação Visual (Field Layout)**
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
    - Módulo Parciais (uso principal)
    - Tela de Rodadas (resumo visual)
    - App do Participante (histórico de rodadas)
  - **Complexidade:** Média-Alta (SVG/Canvas + integração API)
  - **Status:** Ideia para temporada 2026

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

## 🎯 Como Usar

1. **Nova ideia surge?** → Adicione na seção apropriada com ID único
2. **Vai implementar algo?** → Marque com `[x]` quando concluir
3. **Mudou prioridade?** → Mova para a seção correta
4. **Revisar backlog** → Mensalmente, reavalie prioridades

**Dica:** Use `TODO-[PRIORIDADE]` no código para ideias localizadas e referencie aqui para visão geral.

---

_Última atualização: 10/01/2026 - [FEAT-016] Participante Premium adicionado ao backlog_

