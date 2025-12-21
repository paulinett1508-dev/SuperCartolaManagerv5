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

- [ ] [FEAT-001] **Histórico de Rodadas no App do Participante (Temporada 2026)**
  - **Descrição:** Permitir que participantes visualizem seus dados históricos de cada rodada (pontuação, escalação, etc.)
  - **Arquivos base:**
    - `public/participante/js/modules/participante-historico.js` (novo ou expandir)
    - `public/participante/fronts/historico.html` (novo template)
    - Reutilizar endpoint `/api/data-lake/raw/:timeId?rodada=N`
  - **Funcionalidades:**
    - Seletor visual de rodadas (1-38) igual ao painel admin
    - Exibir pontuação, posição no ranking, confrontos da rodada
    - Timeline visual da temporada do participante
    - Comparativo com rodada anterior (subiu/desceu posições)
  - **Dependências:**
    - ✅ Endpoint de rodada específica (já implementado)
    - ✅ Backup automático na consolidação (já implementado)
    - ✅ Collection `cartola_oficial_dumps` populada
  - **Quando implementar:** Início da Temporada 2026 (antes da rodada 1)
  - **Ref:** Baseado no modal de "Dados do Time" do painel admin

- [ ] [FEAT-002] **Hall da Fama - Estatísticas Históricas**
  - **Descrição:** Página com recordes e estatísticas de todas as temporadas
  - **Dados necessários:** Collection `cartola_oficial_dumps` com dados permanentes
  - **Funcionalidades:**
    - Maior pontuação de uma rodada (todos os tempos)
    - Maior sequência de vitórias
    - Campeões de cada temporada
    - Artilheiros históricos
  - **Dependências:** FEAT-001, dados da temporada 2025 já salvos

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

- [ ] [FEAT-010] **Sistema de Conquistas (Badges)**
  - **Descrição:** Badges por feitos especiais
  - **Exemplos:** "10 Mitos", "Campeão", "Invicto 5 rodadas", "Rei do Mico"
  - **Exibição:** Perfil do participante
  - **Collection:** `achievements` ou embed no participante

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

_Última atualização: 21/12/2025_

