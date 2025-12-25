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

---

## 📦 BACKLOG (Ideias para futuro distante)

_Reavaliar periodicamente - Ideias interessantes mas sem cronograma_

### 📱 App do Participante

- [ ] [FEAT-003] **Notificações Push**
  - **Descrição:** Alertas de resultado, fechamento do mercado, escalação não feita
  - **Tecnologia:** Web Push API + Service Worker
  - **Servidor:** Precisa de push server (Firebase ou similar)
  - **Complexidade:** Alta

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

_Última atualização: 25/12/2025_

