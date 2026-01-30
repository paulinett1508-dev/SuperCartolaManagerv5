# Tarefas Pendentes

## 🚨 CRÍTICO - RANKING GERAL NÃO FUNCIONA (29/01/2026)

### [BUG-CRITICAL-003] Ranking Geral não exibe dados corretamente

**Status:** 🔴 CRÍTICO - EM INVESTIGAÇÃO

**Problema Reportado:**
O módulo Ranking Geral não está funcionando como esperado:
1. **Liga Super Cartola** - Mostrava dados de 2025 na temporada 2026 (cache contaminado - CORRIGIDO)
2. **Liga Os Fuleros** - Não mostra nada, módulo não reflete pontos do módulo Rodada

**Situação Atual (29/01/2026):**
- API retorna `status: "sem_pontuacao"` com `message: "Aguardando os jogos começarem..."`
- Mercado está FECHADO (`status_mercado: 2`)
- Rodada 1 ainda não tem atletas pontuados (jogos não começaram)
- Frontend deveria exibir mensagem contextualizada "Aguardando Jogos" (amarelo)

**O que foi feito:**
1. ✅ Limpeza de caches contaminados (`rankingturnos`, `rankinggeralcaches`)
2. ✅ Adicionado filtro `temporada` em `rankingGeralCacheController.js`
3. ✅ Criado `parciaisRankingService.js` para calcular ranking em tempo real
4. ✅ Atualizado `rankingTurnoService.js` v3.0 com fallback para parciais
5. ✅ Adicionado campos `message` e `parcial` em `rankingTurnoController.js`
6. ✅ Atualizado `ranking.js` v2.6 com `mostrarSemDados()` contextualizado

**O que ainda NÃO funciona:**
- [ ] Usuário reporta que ainda não funciona como deveria
- [ ] Verificar se frontend está recebendo e tratando `status` e `message`
- [ ] Verificar se `mostrarSemDados()` está sendo chamada com parâmetros corretos
- [ ] Testar quando jogos começarem (atletas pontuados disponíveis)

**Arquivos envolvidos:**
| Arquivo | Função |
|---------|--------|
| `controllers/rankingTurnoController.js` | API `/api/ranking-turno/:ligaId` |
| `services/rankingTurnoService.js` | Lógica de busca ranking por turno |
| `services/parciaisRankingService.js` | Cálculo de parciais em tempo real |
| `public/js/ranking.js` | Frontend do Ranking Geral |

**Fluxo esperado:**
```
1. Frontend chama /api/ranking-turno/:ligaId?turno=geral&temporada=2026
2. Backend verifica se há snapshot consolidado → NÃO (temporada nova)
3. Backend chama buscarRankingParcial()
4. Parciais verifica mercado → FECHADO
5. Parciais verifica atletas pontuados → ZERO (jogos não começaram)
6. Retorna {status: "sem_pontuacao", message: "Aguardando jogos..."}
7. Frontend exibe tela amarela "Aguardando Jogos"
```

**Próximos passos:**
1. Verificar console do navegador para erros JS
2. Verificar Network tab - resposta da API
3. Adicionar console.log no frontend para debug
4. Testar novamente quando Rodada 1 tiver atletas pontuados

**Prioridade:** 🔴 MÁXIMA - Brasileirão começou, módulo principal não funciona

---

## ⚠️ CRÍTICO - MENU DO CAPITÃO DE LUXO NÃO APARECE (30/01/2026)

### [FEAT-029] Exibir Capitão de Luxo na Quick Access Bar do participante

**Status:** ⚠️ CRÍTICO - PENDENTE (próxima sessão)

**Problema Reportado:**
O módulo Capitão de Luxo está implementado no backend e nos arquivos do participante, mas nunca aparece nas opções do menu “ap” porque `participante-quick-bar.js` não gera um card para ele e o registro em `participante-navigation.js`/`detalhe-liga-orquestrador.js` não o exige como rota visível.

**Passos necessários:**
1. Garantir que `modulosAtivos.capitao` retorne `true` para ligas que adicionaram o módulo (API `/api/ligas/:id`, cache `participanteAuth.ligaDataCache` ou `participanteNav.modulosAtivos`).
2. Incluir um card “Capitão de Luxo” em `renderizarMenuContent` (grupo “Prêmios & Estatísticas”) usando `renderCard('capitao', 'capitao', 'emoji_events', 'Capitão de Luxo')` e permitir clique se o módulo estiver ativo.
3. Confirmar que `participante-navigation.js` e o orquestrador (`detalhe-liga-orquestrador.js`) reconhecem o módulo `capitao-luxo` para carregar o `participante-capitao.js`.
4. Validar no app participante que o card aparece/reage corretamente, exibindo “Aguarde” apenas quando estiver desativado e abrindo o módulo quando ativo.

**Criticidade:** O recurso já está pronto mas inacessível; a experiência fica incompleta para ligas que querem mostrar o ranking do capitão.

**Referências:** `public/participante/js/participante-quick-bar.js`, `public/participante/js/participante-navigation.js`, `public/js/detalhe-liga-orquestrador.js`, `public/participante/js/participante-capitao.js`

---

## 🚨 URGENTE - CAPITÃO DE LUXO NÃO RENDERIZA NO ADMIN (30/01/2026)

### [BUG-CRITICAL-004] Tela Capitão de Luxo não executa JS ao clicar no card (Admin)

**Status:** 🟡 PARCIAL — UI/Card corrigidos, execução JS pendente de validação

**Problema Original:**
Ao clicar no card "Capitão de Luxo" na tela de detalhe da liga (admin), aparecia apenas "Redirecionado para o módulo..." e nada renderizava.

**Causas Raiz Identificadas:**
1. `public/fronts/capitao-luxo.html` era uma página HTML completa (`<!DOCTYPE>`, `<body>`, `<script>` com redirect) — **não** um fragmento injetável. Scripts em `innerHTML` não executam.
2. Não existia `case "capitao-luxo"` no switch de `executeModuleScripts` em `detalhe-liga-orquestrador.js`.
3. Card em `detalhe-liga.html` ainda tinha classe `module-card-2026` e badge "Em breve".
4. `.capitao-container` tinha `max-width: 800px` causando layout verticalizado.

**O que foi corrigido:**
1. ✅ `public/fronts/capitao-luxo.html` — Reescrito como fragmento HTML injetável
2. ✅ `public/js/detalhe-liga-orquestrador.js` — Adicionado `case "capitao-luxo"`, função `carregarModuloCapitaoLuxo()`, fallback HTML
3. ✅ `public/detalhe-liga.html` — Card convertido de "Em breve" para módulo ativo com classe `module-card-capitao`
4. ✅ `public/css/modules/detalhe-liga-redesign.css` — CSS tema roxo (#8b5cf6) para o card
5. ✅ `public/participante/fronts/capitao.html` — CSS corrigido (`width: 100%`, tipografia)
6. ✅ `config/rules/capitao_luxo.json` — Atualizado para v1.1.0 com regras completas
7. ✅ `config/definitions/capitao_luxo_def.json` — Status alterado para "implementado"

- [ ] JS do módulo não executa após o clique — console mostra `[ORQUESTRADOR] CLICK em: capitao-luxo` mas nenhum log subsequente do `case`
- [ ] Verificar se `executeModuleScripts` realmente entra no `case "capitao-luxo"` (logs de debug foram adicionados)
- [ ] Confirmar se `import("/participante/js/modules/participante-capitao.js")` resolve corretamente; observar erros 404/500 no Network
- [ ] Confirmar que `window.inicializarCapitaoParticipante` é setado após o import para o case conseguir renderizar o fragmento
- [ ] Testar novamente no navegador com DevTools aberto (Network + Console) para garantir que o fluxo de carregamento completa
- [ ] Revisar `public/participante/js/modules/participante-capitao.js` (a estrutura mudou) e garantir que a renderização espere o container injetado antes de chamar `carregarRanking`; o patch anterior falhou porque o trecho procurado não existe mais.

**Arquivos envolvidos:**
| Arquivo | Modificação |
|---------|-------------|
| `public/fronts/capitao-luxo.html` | Reescrito (redirect → fragmento) |
| `public/js/detalhe-liga-orquestrador.js` | case + loader + fallback + logs |
| `public/detalhe-liga.html` | Card ativo com tema |
| `public/css/modules/detalhe-liga-redesign.css` | CSS roxo do card |
| `public/participante/fronts/capitao.html` | CSS width + tipografia |
| `config/rules/capitao_luxo.json` | v1.1.0 completo |
| `config/definitions/capitao_luxo_def.json` | Status implementado |

**Próximos passos:**
1. Abrir DevTools → Console, clicar no card e verificar logs `[ORQUESTRADOR]`
2. Se não aparecem logs do case, o problema está no fluxo antes do switch (verificar `loadModuleHTML`)
3. Se import falha, verificar path do arquivo e se Express serve `/participante/js/modules/`
4. Após JS funcionar, validar que ranking carrega dados da API `/api/capitao/:ligaId/ranking`

**Prioridade:** 🔴 ALTA — Módulo visível no admin mas não funcional

---

## 🔥 PARA PRÓXIMA SESSÃO (29/01/2026)

### [FEAT-026] Sistema de Polling Inteligente para Módulo Rodadas - Calendário Real de Jogos

**Status:** 📋 PENDENTE

**Contexto:**
A 1ª rodada do Brasileirão 2026 começou:
- 28/01: Atlético-MG x Palmeiras (19h), Internacional x Athletico (19h), São Paulo x Flamengo (21h30)
- 29/01: Mirassol x Vasco (20h), Botafogo x Cruzeiro (21h30)

**Problema Atual:**
O módulo "Rodadas" faz refresh automático a cada 30s, independentemente de haver jogos em andamento, desperdiçando recursos e carregando o servidor.

**Solução Proposta:**

#### 1. Repositório de Calendário Local (Cache/IndexedDB)
- Armazenar horários oficiais das partidas por rodada
- Fonte: API oficial CBF ou scraping de VEJA/GE
- Atualizar calendário a cada hora ou quando CBF publicar alterações
- Usar fuso de Brasília para cálculos

#### 2. Gerenciador de Rodadas (Smart Polling)
- Calcular próximo "evento esperado" (início de jogo) baseado no calendário
- Pausar polling quando não há partidas ativas
- Reativar polling ~10min antes do próximo jogo
- Usar `setTimeout` ajustado para horário do próximo evento

#### 3. Estado e Lógica
```javascript
// Gerenciador de estado
const rodadaManager = {
  ultimaRodadaCompleta: null,
  proximoJogo: null, // { data, horario, partida }
  filaPartidas: [],  // Jogos do dia
  pollingAtivo: false,
  timer: null
};

// Fluxo principal
function inicializarGerenciadorRodadas() {
  1. Buscar calendário da rodada atual
  2. Identificar próximo jogo
  3. Se jogo em andamento → ativar polling
  4. Se não → calcular timeout até próximo jogo
  5. Registrar setTimeout para próximo evento
}

function ativarPolling() {
  // Liga fetches: parciais, caches, etc.
  // Feedback visual: "🔴 Ao vivo - Atualizando a cada 30s"
}

function pausarPolling() {
  // Desliga fetches pesados
  // Feedback visual: "⏸️ Sem jogos - Aguardando próxima partida"
}
```

#### 4. Feedback Visual
- **Ativo (jogos ao vivo):** Bolinha piscando verde + "Atualizando a cada 30s"
- **Pausado (sem jogos):** Bolinha cinza + "Próximo jogo: 03/02 às 19h"
- **Aguardando rodada:** Ícone relógio + "Rodada 2 começa em 03/02"

#### 5. Job Noturno/Webhook (Extra)
- Webhook MCP/Perplexity para notificar alterações na tabela
- Job noturno que refresha calendário às 2h da madrugada
- Recalibrar próximo disparo quando receber atualização

#### 6. Implementação Técnica

**Arquivos a criar/modificar:**
- `public/js/rodadas/rodadas-calendar-manager.js` (NOVO) - Gerenciador de calendário
- `public/js/rodadas/rodadas-polling-manager.js` (NOVO) - Lógica de polling inteligente
- `public/js/rodadas.js` (MODIFICAR) - Integrar com novos gerenciadores
- `routes/calendario-routes.js` (NOVO) - API para buscar/atualizar calendário
- `models/CalendarioRodada.js` (NOVO) - Schema MongoDB para horários
- `scripts/sync-calendario-cbf.js` (NOVO) - Job para sincronizar com CBF/GE

**Estrutura do calendário:**
```javascript
{
  temporada: 2026,
  rodada: 1,
  partidas: [
    {
      data: "2026-01-28",
      horario: "19:00",
      time_casa: "Atlético-MG",
      time_fora: "Palmeiras",
      status: "encerrado" | "ao_vivo" | "agendado"
    },
    // ...
  ],
  atualizado_em: ISODate("2026-01-28T15:30:00Z")
}
```

#### 7. Fluxo de Uso

```
[App carrega módulo Rodadas]
    ↓
[Busca calendário da rodada atual no IndexedDB]
    ↓
[Calendário em cache?]
    ├── NÃO → Fetch do backend → Salva no IndexedDB
    └── SIM → Usa cache local
    ↓
[Calcula próximo evento]
    ├── Jogo em andamento AGORA → Ativa polling 30s
    ├── Jogo começa em <10min → Ativa polling preventivo
    └── Sem jogos próximos → Pausa até próximo evento
    ↓
[setTimeout para próximo evento]
    ↓
[Quando dispara → Reavalia estado e decide polling]
```

#### 8. Casos de Borda
- Adiamento de jogo → Job noturno atualiza calendário
- Mudança de horário → Webhook recalibra timer
- App fechado/aberto → Re-calcula próximo evento ao abrir
- Rodada sem jogos (Data FIFA) → Mostra "Rodada pausada"

#### 9. Benefícios
- ✅ Redução de ~90% nas requisições desnecessárias
- ✅ Melhor UX (usuário sabe quando há jogos)
- ✅ Economia de recursos servidor
- ✅ Feedback transparente sobre estado do sistema
- ✅ Sempre sincronizado com calendário oficial

**Prioridade:** ALTA - Brasileirão 2026 JÁ COMEÇOU

**Referências:**
- VEJA: https://veja.abril.com.br (cobertura rodada 1)
- GE/CBF: Tabela oficial atualizada
- API-Football: Já integrada para jogos ao vivo

---

### [BUG-CRITICAL-002] Seção "Jogos do Dia" Desapareceu do App Participante

**Status:** 🔴 CRÍTICO - INVESTIGAÇÃO PENDENTE

**Problema Reportado:**
A seção "Jogos do Dia" (separada em "Ao Vivo" e "Encerrados") sumiu completamente do app do participante.

**Histórico - O que DEVERIA estar funcionando:**

Segundo `.claude/pending-tasks.md` linhas 802-820:
- **SPEC v5.3** implementada em `public/participante/js/modules/participante-jogos.js`
- Seção separada em "Em Andamento" (jogos ao vivo + agendados) e "Encerrados" (FT, AET, PEN)
- Visual diferenciado: borda laranja (Em Andamento) vs cinza (Encerrados)
- Integrado com `jogos-ao-vivo-routes.js`

**Investigação Necessária - Checklist Completo:**

#### 1. Verificação de Arquivos Core
- [ ] `public/participante/js/modules/participante-jogos.js` existe?
- [ ] Versão atual vs esperada (v5.3)?
- [ ] Função `renderizarJogosAoVivo()` está presente?
- [ ] Função `renderizarSecaoJogos()` existe?
- [ ] Imports/exports corretos?

#### 2. Integração com Navegação SPA
- [ ] `public/participante/js/modules/participante-navigation.js` carrega o módulo?
- [ ] Rota registrada corretamente no SPA v3.0?
- [ ] `type="module"` sendo removido prematuramente? (BUG-004/005 histórico)
- [ ] Scripts sendo limpos pelo SPA após 100ms?

#### 3. Backend/API
- [ ] `routes/jogos-ao-vivo-routes.js` existe e está ativo?
- [ ] Rota registrada em `index.js`?
- [ ] Endpoint `/api/jogos-ao-vivo` responde?
- [ ] API-Football key válida?
- [ ] Cache funcionando (2min/10min)?

#### 4. Frontend - Renderização
- [ ] Container HTML existe em `public/participante/index.html`?
- [ ] ID correto (`#jogos-container` ou similar)?
- [ ] CSS carregado? (`participante-styles.css`)
- [ ] JavaScript executado sem erros? (verificar console)

#### 5. Erros Silenciosos
- [ ] Verificar console do navegador (erros JS)
- [ ] Network tab - requisição para `/api/jogos-ao-vivo` feita?
- [ ] Resposta do backend (200 OK vs 404/500)?
- [ ] Logs do servidor (`console.log` em `jogos-ao-vivo-routes.js`)

#### 6. Casos Específicos
- [ ] Módulo desabilitado em `Liga.modulos_ativos`? (não deveria, é módulo base)
- [ ] Condição temporal? (só mostra quando há jogos?)
- [ ] Filtro de liga/temporada bloqueando?
- [ ] IndexedDB cache corrompido?

#### 7. Reversão de Código
- [ ] Comparar com último commit funcional
- [ ] Git blame em `participante-jogos.js`
- [ ] Verificar se foi acidentalmente sobrescrito

**Plano de Ação (Ordem de Prioridade):**

1. **FASE 1 - Diagnóstico Rápido (5 min)**
   ```bash
   # Verificar se arquivo existe
   ls -lh public/participante/js/modules/participante-jogos.js

   # Verificar versão
   grep "VERSION\|v5\." public/participante/js/modules/participante-jogos.js

   # Testar endpoint
   curl http://localhost:3000/api/jogos-ao-vivo
   ```

2. **FASE 2 - Console/Network (2 min)**
   - Abrir app participante no navegador
   - F12 → Console → Verificar erros
   - F12 → Network → Verificar requisição `/api/jogos-ao-vivo`

3. **FASE 3 - Code Inspection (10 min)**
   - Ler `participante-navigation.js` - verificar se módulo "jogos" está registrado
   - Ler `participante-jogos.js` - verificar funções `renderizarJogosAoVivo()` e `renderizarSecaoJogos()`
   - Verificar `index.html` - container HTML presente?

4. **FASE 4 - Git History (5 min)**
   ```bash
   git log --oneline --all -- public/participante/js/modules/participante-jogos.js
   git show <hash>:public/participante/js/modules/participante-jogos.js
   ```

5. **FASE 5 - Restoration (se necessário)**
   - Se código foi sobrescrito → restaurar do commit funcional
   - Se módulo desabilitado → reativar em `modulos_ativos`
   - Se rota não registrada → adicionar em `index.js`

**Arquivos Críticos a Auditar:**

| Arquivo | O que verificar |
|---------|-----------------|
| `public/participante/js/modules/participante-jogos.js` | Existe? Versão v5.3? Funções presentes? |
| `public/participante/js/modules/participante-navigation.js` | Módulo "jogos" registrado? |
| `public/participante/index.html` | Container HTML (`#jogos-container`)? |
| `routes/jogos-ao-vivo-routes.js` | Rota ativa? Endpoint funciona? |
| `index.js` | Rota registrada (`app.use('/api/jogos-ao-vivo', ...)`)? |

**Possíveis Causas Raiz (Hipóteses):**

| Hipótese | Probabilidade | Como verificar |
|----------|---------------|----------------|
| Script removido pelo SPA | 🟡 Média | Ver BUG-004/005 - `type="module"` removido após 100ms? |
| Rota não registrada | 🟢 Alta | Verificar `index.js` - linha de registro da rota |
| Módulo desabilitado | 🔴 Baixa | Checar `Liga.modulos_ativos.jogos` no MongoDB |
| Arquivo sobrescrito | 🟡 Média | Git log + git diff |
| Erro JS silencioso | 🟢 Alta | Console do navegador |
| API-Football erro | 🟡 Média | Network tab - status 500/403? |

**Prioridade:** 🔴 CRÍTICA - Feature visível sumiu sem explicação

**Impacto:** Alto - Usuários não conseguem ver jogos do dia (feature importante durante rodadas)

**Tempo Estimado:** 30-60 min (diagnóstico + correção)

---

### [FEAT-027] Enriquecer Listagem de Participantes no Módulo Rodadas

**Status:** 📋 PENDENTE

**Objetivo:**
Tornar a lista de participantes no módulo "Rodadas" mais informativa e visual, mostrando progresso em tempo real dos atletas que já jogaram e aplicando valores financeiros configurados pelo admin.

**Requisitos Funcionais:**

#### 1. Contador de Atletas que Já Jogaram
**Formato:** `X/12 jogaram` ou `X/12 ⚽`

- Mostrar quantos dos 12 atletas escalados pelo participante já tiveram seus jogos encerrados
- Atualizar em tempo real conforme jogos vão encerrando
- Estados possíveis:
  - `0/12` (nenhum jogo começou) - texto cinza
  - `6/12` (em andamento) - texto laranja/amarelo
  - `12/12` (todos jogaram) - texto verde + ✅

**Lógica de cálculo:**
```javascript
// Para cada participante na rodada
const atletasEscalados = 12; // fixo (11 + técnico)
let atletasQueJogaram = 0;

// Iterar sobre os 12 atletas do time
for (const atleta of timeParticipante.atletas) {
  const clube = atleta.clube_id;
  const jogoDoClube = buscarJogoDoClube(clube, rodadaAtual);

  if (jogoDoClube && jogoDoClube.status === 'encerrado') {
    atletasQueJogaram++;
  }
}

// Renderizar: "6/12 jogaram" com cor baseada no progresso
```

#### 2. Detalhes Visuais do Participante

**A. Escudo do Time do Coração**
- Exibir escudo pequeno (32x32px) ao lado do nome do participante
- Source: `/public/escudos/{clube_id}.png`
- Fallback: `/public/escudos/default.png` se clube não encontrado
- Usar campo `timeCoracao` ou `clube_coracao_id` do participante

**B. Avatar/Foto do Participante (opcional)**
- Se disponível: `foto_perfil` da API Cartola
- Tamanho: 40x40px, circular
- Se não disponível: iniciais do nome em círculo colorido

**Layout proposto:**
```html
<div class="participante-card">
  <div class="participante-visual">
    <img src="/escudos/{clube_id}.png" class="escudo-coracao" />
    <img src="{foto_perfil}" class="avatar-participante" />
  </div>
  <div class="participante-info">
    <span class="nome-time">{nome_time}</span>
    <span class="cartoleiro">{nome_cartoleiro}</span>
  </div>
  <div class="participante-stats">
    <span class="atletas-jogaram">6/12 ⚽</span>
    <span class="pontos">{pontos} pts</span>
  </div>
  <div class="participante-valor">
    <span class="valor-rodada">R$ {valor}</span>
  </div>
</div>
```

#### 3. Valores Financeiros da Liga (CRÍTICO)

**Fonte de Dados:** `ModuleConfig` collection
```javascript
// Buscar config do módulo Rodadas para a liga
const configRodadas = await ModuleConfig.findOne({
  liga_id: ligaId,
  temporada: temporadaAtual,
  modulo: 'rodadas'
});

// Estrutura esperada:
{
  liga_id: ObjectId("..."),
  temporada: 2026,
  modulo: "rodadas",
  config: {
    valor_g10: 5.00,      // Bônus top 10 da rodada
    valor_z10: -3.00,     // Ônus bottom 10 da rodada
    valor_campeao: 20.00, // Campeão da rodada
    valor_vice: 10.00     // Vice da rodada
  },
  ativo: true
}
```

**Regras de Exibição:**
- **Durante a rodada (em andamento):** Mostrar valor POTENCIAL baseado na posição atual
  - Top 1: `+R$ 20,00` (campeão)
  - Top 2: `+R$ 10,00` (vice)
  - Top 3-10: `+R$ 5,00` (G10)
  - Bottom 10: `-R$ 3,00` (Z10)
  - Meio da tabela (11-20): `R$ 0,00`

- **Rodada encerrada:** Mostrar valor DEFINITIVO
  - Texto em verde (positivo) ou vermelho (negativo)
  - Ícone ✅ se bônus, ❌ se ônus

**Comportamento Dinâmico:**
```javascript
function calcularValorRodada(participante, posicao, configRodadas) {
  const { valor_g10, valor_z10, valor_campeao, valor_vice } = configRodadas.config;
  const totalParticipantes = ranking.length;

  // Campeão
  if (posicao === 1) return { valor: valor_campeao, tipo: 'campeao' };

  // Vice
  if (posicao === 2) return { valor: valor_vice, tipo: 'vice' };

  // G10 (top 3-10)
  if (posicao >= 3 && posicao <= 10) return { valor: valor_g10, tipo: 'g10' };

  // Z10 (bottom 10)
  if (posicao > totalParticipantes - 10) return { valor: valor_z10, tipo: 'z10' };

  // Meio da tabela
  return { valor: 0, tipo: 'neutro' };
}
```

#### 4. Integração com Sistema de Regras

**Collections Envolvidas:**
- `ModuleConfig` - Configuração financeira do módulo Rodadas
- `ligarules` - Regras gerais da liga (fallback)
- `times` - Dados dos participantes (escudo, foto)
- `rodadas` - Dados das rodadas (pontos, posição)

**Endpoint Backend:**
```javascript
// GET /api/rodadas/:ligaId/:temporada/:numero
// Retornar estrutura enriquecida:
{
  rodada: 1,
  status: "em_andamento" | "encerrada",
  participantes: [
    {
      time_id: 13935277,
      nome_time: "China Guardiola FC",
      nome_cartoleiro: "Enderson",
      escudo_coracao: "/escudos/262.png", // Flamengo
      foto_perfil: "https://...",
      pontos: 78.45,
      posicao: 3,
      atletas_jogaram: 8,
      atletas_total: 12,
      valor_financeiro: {
        valor: 5.00,
        tipo: "g10",
        confirmado: false // true se rodada encerrada
      }
    },
    // ...
  ],
  config_valores: {
    valor_g10: 5.00,
    valor_z10: -3.00,
    valor_campeao: 20.00,
    valor_vice: 10.00
  }
}
```

#### 5. UX/UI - Elementos Visuais

**A. Card de Participante na Lista:**
```css
.participante-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1e293b; /* bg-slate-800 */
  border-radius: 8px;
  margin-bottom: 8px;
}

.escudo-coracao {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

.atletas-jogaram {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
}

.atletas-jogaram.completo {
  color: #10b981; /* green-500 */
}

.atletas-jogaram.parcial {
  color: #f59e0b; /* amber-500 */
}

.atletas-jogaram.pendente {
  color: #6b7280; /* gray-500 */
}

.valor-rodada.positivo {
  color: #10b981;
  font-weight: 600;
}

.valor-rodada.negativo {
  color: #ef4444; /* red-500 */
  font-weight: 600;
}
```

**B. Barra de Progresso de Jogos (Opcional):**
```html
<div class="progresso-jogos">
  <div class="barra-progresso" style="width: 66.6%"></div>
</div>
<!-- 8/12 = 66.6% -->
```

#### 6. Arquivos a Modificar/Criar

**Backend:**
- `controllers/rodadaController.js` - Adicionar lógica de cálculo de atletas jogados
- `routes/rodadas.js` - Endpoint enriquecido com valores financeiros
- `services/rodadaEnriquecidoService.js` (NOVO) - Lógica de enriquecimento de dados

**Frontend:**
- `public/js/rodadas.js` - Consumir endpoint enriquecido
- `public/participante/js/modules/participante-rodadas.js` - Renderizar cards enriquecidos
- `public/css/participante-styles.css` - Estilos dos novos elementos

**Models (verificar):**
- `ModuleConfig` - Garantir schema correto para config de rodadas
- `times` - Verificar campos `clube_coracao_id`, `foto_perfil`

#### 7. Casos de Borda

- **Config não existe:** Usar valores padrão (R$ 5 / -R$ 3 / R$ 20 / R$ 10)
- **Escudo não encontrado:** Fallback para `/escudos/default.png`
- **Foto perfil indisponível:** Mostrar iniciais do nome
- **Liga sem time do coração cadastrado:** Não mostrar escudo
- **Rodada com menos de 20 participantes:** Ajustar Z10 proporcionalmente

#### 8. Testes de Validação

- [ ] Valores exibidos batem com `ModuleConfig` do MongoDB
- [ ] Escudos carregam corretamente
- [ ] Contador de atletas atualiza em tempo real
- [ ] Valores mudam de cor (verde/vermelho) conforme posição
- [ ] Rodada encerrada "trava" os valores (não mudam mais)
- [ ] Fallbacks funcionam (sem escudo, sem foto, sem config)

**Prioridade:** 🟡 ALTA - Melhoria de UX importante, alinhamento com regras financeiras

**Impacto:** Médio-Alto - Transparência financeira + feedback visual melhorado

**Dependências:**
- `ModuleConfig` deve estar populado pelo admin (painel de configuração)
- Campo `clube_coracao_id` ou `timeCoracao` deve existir em `times`
- API de jogos ao vivo deve retornar status dos jogos

**Estimativa:** 2-3 horas (backend + frontend + testes)

---

## 🚨 URGENTE - PRIORIDADE MÁXIMA (28/01/2026)

### [BUG-CRITICAL-001] Módulos fazendo requisições em loop para temporada não iniciada

**Status:** ✅ CORRIGIDO (28/01/2026)

**Problema Original:**
O sistema estava fazendo CENTENAS de requisições desnecessárias tentando buscar dados de rodadas 1-38 da temporada 2026, que ainda não começou.

**Causa Raiz (IDENTIFICADA):**
A função `detectarTemporadaStatus()` retornava `ultimaRodadaCompleta: 38` quando `rodadaAtual === 1 && mercadoAberto`, assumindo pré-temporada com dados de 2025. Porém:
1. Se API Cartola já retorna `temporada: 2026`, NÃO há dados de 2025 para buscar
2. O sistema tentava buscar 38 rodadas de 2026 que não existem

**Correções Aplicadas:**

| Arquivo | Versão | Correção |
|---------|--------|----------|
| `top10.js` | v3.3 → v3.4 | Verificar `temporadaAPI >= anoAtual` antes de assumir dados |
| `artilheiro-campeao.js` | v4.5 → v4.6 | Remover `\|\| 38` fallback, usar `\|\| 1` + cálculo seguro de rodadaFim |
| `melhor-mes-core.js` | v1.3 → v1.4 | Verificar temporada da API + retornar `aguardandoDados: true` |
| `melhor-mes-orquestrador.js` | v1.3 → v1.4 | Renderizar UI de aguardando quando `aguardandoDados: true` |
| `pontos-corridos-orquestrador.js` | v3.0 → v3.1 | Verificar temporada + renderizar UI de aguardando |
| `mata-mata-orquestrador.js` | v1.3 → v1.4 | Verificar temporada em ambos os pontos de detecção |
| `luva-de-ouro-orquestrador.js` | v2.1 | Já tinha proteção correta (verificava `temporadaAPI < anoAtual`) |

**Lógica Corrigida:**
```javascript
// ANTES (errado):
if (rodadaAtual === 1 && mercadoAberto) {
    ultimaRodadaCompleta = 38; // Assumia dados da temporada anterior
}

// DEPOIS (correto):
if (rodadaAtual === 1 && mercadoAberto) {
    if (temporadaAPI < anoAtual) {
        // Pré-temporada real: API ainda retorna 2025, buscar 38 rodadas
        ultimaRodadaCompleta = 38;
    } else {
        // Nova temporada: API já retorna 2026, NÃO há dados
        ultimaRodadaCompleta = 0;
        aguardandoDados = true;
    }
}
```

**UI "Aguardando Início" adicionada a:**
- ✅ Top 10 (Mitos/Micos)
- ✅ Artilheiro Campeão
- ✅ Luva de Ouro
- ✅ Pontos Corridos
- ✅ Melhor Mês
- ✅ Mata-Mata

**FASE 2 - Desativar Módulos Opcionais por Default:**
> Status: ✅ JÁ IMPLEMENTADO (verificado 28/01/2026)

Objetivo: Garantir que novas ligas não ativam módulos opcionais automaticamente.

**Implementação verificada em:**
| Arquivo | Status | Comportamento |
|---------|--------|---------------|
| `models/Liga.js` | ✅ | Default `false` para todos opcionais |
| `config/modulos-defaults.js` | ✅ | `MODULOS_DEFAULTS` com opcionais = `false` |
| `public/js/wizard-primeira-liga.js` | ✅ | `dados.modulos_ativos` com opcionais = `false` |
| `participante-navigation.js` | ✅ | Módulos ausentes tratados como `false` (linha 275) |

**Módulos BASE (sempre ativos):** extrato, ranking, rodadas, historico
**Módulos OPCIONAIS (desativados por default):** top10, pontosCorridos, mataMata, artilheiro, luvaOuro, melhorMes, campinho, dicas

**Ligas verificadas:**
- "Super Cartola" (2026): ✅ Todos opcionais = `false`
- "Os Fuleros" (2026): ✅ Todos opcionais = `false`

---

## ✅ CONCLUÍDO (28/01/2026)

### [DOC-001] Documentar Skills skill-creator e skill-installer no CLAUDE.md

**Status:** ✅ CONCLUÍDO

**Problema Original:**
O hook de pre-push alertou que as skills `skill-creator` e `skill-installer` não estão documentadas no CLAUDE.md.

**Correções Aplicadas (28/01/2026):**
1. ✅ Adicionado `skill-creator` na tabela de Skills Auxiliares do CLAUDE.md
2. ✅ Adicionado `skill-installer` na tabela de Skills Auxiliares do CLAUDE.md
3. ✅ Adicionados exemplos de uso na seção "Exemplos de Uso"
4. ✅ Atualizado contador de skills de 12 para 14 (8→10 auxiliares)

**Mudanças:**
- `CLAUDE.md` - Seção "Project Skills (Agentes Especializados)" atualizada

**Localização das Skills:**
- `.claude/skills/skill-creator/`
- `.claude/skills/skill-installer/`

---

## ✅ CORRIGIDO (27/01/2026)

### [UI-001] Auditoria Design Extrato Individual - Redução de Verbosidade

**Status:** ✅ CORRIGIDO v8.7

**Problema Original:**
- Linha fixa "Inscrição 2026: -R$ XXX" era redundante com botões Acerto/Ajustes
- Label confundia quando participante tinha pago inscrição

**Solução Implementada (v8.7):**
1. Label simplificado: "Saldo Inicial:" (sempre, para pré-temporada)
2. Sub-linha informativa: "Inscrição paga" (verde) ou "Inscrição pendente" (amarelo)

**Arquivos Modificados:**
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` v8.7
  - Linhas 2001-2005: Lógica simplificada do label
  - Linhas 2054-2062: Sub-linha de status adicionada

**PRD/SPEC:**
- `.claude/docs/PRD-extrato-individual-remover-inscricao-fixa.md`
- `.claude/docs/SPEC-extrato-individual-remover-inscricao-fixa.md`

---

## 🔴 HISTÓRICO (27/01/2026)

### [UI-001-OLD] Contexto Anterior

**Contexto:**
- Mudanças foram feitas no **App Participante** (`participante-extrato-ui.js`)
- Usuário estava testando no **Painel Admin** (`fluxo-financeiro-ui.js`)
- São arquivos/contextos DIFERENTES!

**O que foi solicitado:**
1. ✅ Sub-linha Inscrição no card de saldo: "Inscrição 2026: R$ X,XX C/D" (verde=pago, vermelho=deve)
2. ✅ Simplificar footer Bottom Sheet Acertos: remover QUITADO/A RECEBER/A PAGAR → apenas "Saldo Final"
3. ✅ Simplificar cores do footer: apenas verde (positivo) ou vermelho (negativo)
4. ✅ Fix modal +Adicionar Ajuste: z-index aumentado de 10001 para 15000

**Mudanças já aplicadas (commit c2b28af):**

| Arquivo | Mudança | Para quem? |
|---------|---------|------------|
| `participante-extrato-ui.js` | Sub-linha Inscrição + footer simplificado | **APP PARTICIPANTE** |
| `fluxo-financeiro-ui.js` | z-index 15000 + debug logging | **PAINEL ADMIN** |

**Problema:**
- Usuário testou no Painel Admin → não viu as mudanças de Inscrição/Saldo Final
- As mudanças 1, 2, 3 estão no App Participante, não no Admin
- O Admin usa `renderizarExtratoModal()` em `fluxo-financeiro-ui.js`, não `renderizarConteudoCompleto()`

**Próximos passos:**
1. **DECIDIR:** As mudanças devem aparecer no Admin também?
   - Se SIM: Replicar mudanças em `fluxo-financeiro-ui.js` → função `renderizarExtratoModal()`
   - Se NÃO: Testar no App Participante (mobile) para validar

2. **TESTAR App Participante:**
   - Acessar como participante (não admin)
   - Ir para Extrato
   - Verificar se sub-linha Inscrição aparece
   - Clicar em "Meus Acertos" → verificar footer simplificado

3. **Se não funcionar no App também:**
   - Verificar se `resumoBase.taxaInscricao` e `resumoBase.pagouInscricao` têm valores
   - Adicionar console.log para debug
   - Verificar qual função de renderização está sendo chamada

**Arquivos envolvidos:**
- **Admin:** `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
  - Função: `renderizarExtratoModal()` (linha ~1700)
  - Modal: `#modalExtrato`
- **Participante:** `public/participante/js/modules/participante-extrato-ui.js`
  - Função: `renderizarConteudoRenovadoPreTemporada()` (linha 321)
  - Função: `renderizarConteudoCompleto()` (linha 542)
  - Bottom Sheet: `renderizarBottomSheetAcertos()` (linha 1066)

**Logs relevantes (sessão anterior):**
```
[FLUXO-UI] v8.5 - CSS extraido + PDF/Auditoria extraido para modulo separado
[FLUXO-UI] Abrindo modal para: Enderson
```
Isso confirma que o Admin usa `fluxo-financeiro-ui.js`, não `participante-extrato-ui.js`.

**Plano de contingência:**
Se precisar replicar no Admin, editar `fluxo-financeiro-ui.js`:
1. Encontrar `renderizarExtratoModal()` (~linha 1700)
2. Adicionar sub-linha Inscrição no card de saldo
3. Simplificar footer do modal de acertos (se existir)

---

## ✅ CORRIGIDO (26/01/2026)

### [FEAT-025] Evoluir Botão "Validar ID" da API Cartola

**Status:** ✅ CORRIGIDO COMPLETAMENTE

**Problema Encontrado:**
1. Modal em `ferramentas-pesquisar-time.js` usava endpoint incorreto
2. Campos `foto_time`, `foto_perfil`, `assinante` não eram salvos no participante

**Correções Aplicadas (26/01/2026):**

| Arquivo | Mudança |
|---------|---------|
| `ferramentas-pesquisar-time.js` v2.1.1 | Fix endpoint `/api/cartola/buscar-time/` |
| `participantes.js` v3.0 | Preservar campos `foto_perfil` e `assinante` |
| `ligas.js` v2.1 | Aceitar e passar todos os campos da API |
| `inscricoesController.js` v2.15 | Salvar `foto_time`, `foto_perfil`, `assinante` |
| `cartolaApiService.js` v1.2 | Incluir `foto_perfil` na normalização |

**Referência:** Participante "Paulinett Miranda" da liga "Os Fuleros" com dados completos.

---

### [BUG-004/005] Erros de Import no SPA

**Status:** ✅ CORRIGIDO

**Problema:**
- Scripts com `type="module"` eram removidos após 100ms pelo SPA
- Módulos ES6 são async e precisam de mais tempo para resolver imports

**Correção Aplicada:**
- `public/layout.html` - Módulos ES6 não são mais removidos automaticamente (permanecem no DOM)

---

### [BUG-002] Módulos Históricos 2025 Não Funcionam

**Status:** ✅ CORRIGIDO

**Problema:**
- `cards-condicionais.js` ocultava módulos quando `habilitado !== true`
- Deveria ocultar apenas quando `habilitado === false` explicitamente

**Correção Aplicada:**
- `public/js/cards-condicionais.js` v2.5 - Lógica invertida: só oculta se explicitamente desabilitado

---

## 🚨 BUGS CRÍTICOS (25/01/2026)

### [BUG-001] Re-declaração de Variáveis no SPA

**Status:** ✅ JÁ CORRIGIDO (25/01)

**Correção:** Uso de `window.ligaIdCache` e `window.temporadaCache` em vez de `let`

---

### [BUG-003] Módulos 2026 - Pré-Temporada

**Status:** 🟡 CORREÇÃO PARCIAL (25/01/2026)

**Problema Original:**
- Temporada 2026 / Liga SuperCartola
- Módulos mostram erros ao invés de mensagem amigável de pré-temporada

**Correções Aplicadas (25/01/2026):**

| Arquivo | Versão | Mudança |
|---------|--------|---------|
| `public/js/parciais.js` | v3.0 → v4.0 | Multi-Temporada - verifica `window.temporadaAtual` |
| `public/fronts/parciais.html` | v3.0 → v4.0 | Carregamento dinâmico baseado na temporada |
| `public/js/ranking.js` | v2.4 → v2.5 | Adicionada função `mostrarPreTemporada()` |
| `public/js/cards-condicionais.js` | v2.4 | Temporada 2026+ sem restrições automáticas |
| `public/js/core/cache-manager.js` | v9.2 | Fix export fora de if/else |

**Estado do Banco de Dados (Temporada 2026):**
- ✅ Participantes (times): 3+ registrados
- ❌ Rodadas: 0 (pré-temporada)
- ❌ Ranking snapshots: 0 (pré-temporada)

**Módulos que Mostram Tela de Pré-Temporada:**
- ✅ Parciais - "Aguardando início das rodadas"
- ✅ Ranking - "Temporada 2026 - Aguardando início"
- 🟡 Rodadas - Mensagem "Nenhum dado encontrado"

**Pendente (não corrigido):**
- `pontos-corridos-orquestrador.js` - Não usa `window.temporadaAtual`
- `artilheiro-campeao.js` - Flag `temporadaEncerrada` vem da API
- Outros módulos podem precisar de ajuste similar

**Arquivos Modificados:**
- `public/js/cards-condicionais.js`
- `public/js/parciais.js`
- `public/fronts/parciais.html`
- `public/js/ranking.js`
- `public/js/core/cache-manager.js`

---

### [BUG-004] Menu Ferramentas Sem Renderização

**Status:** ✅ CORRIGIDO (26/01/2026)

**Correção:** Ver [BUG-004/005] acima - Scripts com `type="module"` não são mais removidos pelo SPA.

---

### [BUG-005] Erro Import Statement no Painel

**Status:** ✅ CORRIGIDO (26/01/2026)

**Correção:** Ver [BUG-004/005] acima - Scripts com `type="module"` permanecem no DOM para resolver imports.

---

### Resumo dos Bugs

| ID | Descrição | Status |
|----|-----------|--------|
| BUG-001 | Re-declaração variáveis SPA | ✅ Corrigido (25/01) |
| BUG-002 | Módulos 2025 não funcionam | ✅ Corrigido (26/01) |
| BUG-003 | Módulos 2026 pré-temporada | 🟡 Parcial |
| BUG-004 | Ferramentas sem renderização | ✅ Corrigido (26/01) |
| BUG-005 | Import statement no painel | ✅ Corrigido (26/01) |

**Causa Raiz Corrigida:** SPA agora preserva scripts `type="module"` sem removê-los prematuramente.

---

## 🔴 PRIORIDADE ALTA

### [REFACTOR-001] Decomposição fluxo-financeiro-ui.js (7.010 → 4.426 linhas)

**Objetivo:** Reduzir o monolito de 7.010 linhas para módulos menores e manuteníveis.

**Status Atual:** ✅ FASE 2 CONCLUÍDA - PDF/Auditoria Extraído

| Fase | Status | Descrição |
|------|--------|-----------|
| 1. Análise | ✅ Concluído | Inventário de 50+ funções, 5 responsabilidades |
| 2. CSS Extract | ✅ Concluído | `fluxo-financeiro-styles.js` criado (1.831 linhas) |
| 3. PDF Extract | ✅ Concluído | `fluxo-financeiro-pdf.js` criado (830 linhas) |
| 4. Validação | ✅ Concluído | Testado - servidor inicia, módulos carregam |

**Resultado Final (22/01/2026):**
- ✅ CRIADO: `public/js/fluxo-financeiro/fluxo-financeiro-styles.js` (1.831 linhas)
- ✅ CRIADO: `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js` (830 linhas)
- ✅ MODIFICADO: `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` (7.019 → 4.426 linhas, **-37%**)

**Funções extraídas (Fase 2 - PDF/Auditoria):**
- `exportarExtratoPDF()` - Exportação de extrato para PDF multi-página
- `abrirAuditoriaFinanceira()` - Modal de auditoria financeira
- `renderizarConteudoAuditoria()` - Renderização do conteúdo
- `fecharModalAuditoria()` - Fechar modal
- `exportarAuditoriaPDF()` - Exportar auditoria para PDF
- `gerarPDFAuditoria()` - Geração do PDF
- `inicializarPDF()` - Registro de funções globais no window

**Commits:**
- `fb226ba refactor(p3): extract PDF/Auditoria module, add .lean() to queries`

**Próximos passos (opcional):**
1. 📋 Extrair módulo de Ajustes Dinâmicos (~300 linhas)
2. 📋 Extrair módulo de Tabela Expandida (~400 linhas)
3. 📋 Meta: reduzir para <3.000 linhas

**Rollback:** `git checkout HEAD~1 -- public/js/fluxo-financeiro/fluxo-financeiro-ui.js`

---

### [FEAT-024] Integração OAuth Cartola PRO

**Objetivo:** Permitir que usuário PRO escale automaticamente no Cartola FC através do Super Cartola Manager.

**Status Atual:** ⏸️ ADIADO - Será implementado em momento futuro

> **⚠️ OBSERVAÇÃO (22/01/2026):** Feature adiada por decisão de priorização. Como se trata de funcionalidade focada exclusivamente em participantes premium, existem outras prioridades mais urgentes tanto no app do participante quanto na versão admin. Retomar quando as features core estiverem consolidadas.

| Fase | Status | Arquivo |
|------|--------|---------|
| 1. Pesquisa | ✅ Concluído | `.claude/docs/PRD-cartola-pro.md` |
| 2. Spec | ✅ Concluído | `.claude/docs/SPEC-cartola-pro.md` |
| 3. Code | 🟡 PARCIAL | Implementado, auth Google OAuth não funciona |
| 4. Pesquisa v2 | ✅ Concluído | Perplexity MCP (21/01/2026) |

---

### 🟢 NOVA ABORDAGEM IMPLEMENTADA (22/01/2026)

**Solução: OAuth via Popup Cross-Domain**

O OAuth da Globo só funciona em domínios Replit (`*.replit.dev`). Para domínios customizados (`supercartolamanager.com.br`), implementamos um fluxo via popup:

```
[supercartolamanager.com.br]              [*.replit.dev]
         │                                      │
         │ 1. Clica "Entrar com Globo"          │
         │ ─────────────────────────────────────>│
         │    (abre popup)                       │
         │                                      │
         │                             2. OAuth Globo
         │                                      │
         │ 3. Recebe glbToken via postMessage   │
         │ <────────────────────────────────────│
         │                                      │
         │ 4. POST /globo/create-session        │
         │    (cria sessão LOCAL)               │
         └──────────────────────────────────────┘
```

**Arquivos modificados:**
- `routes/participante-auth.js` - +3 novas rotas
- `public/participante-login.html` - +JS para popup OAuth

**Novas rotas:**
| Rota | Função |
|------|--------|
| `GET /globo/popup` | Inicia OAuth em popup |
| `GET /globo/popup/callback` | Callback que envia token via postMessage |
| `POST /globo/create-session` | Cria sessão local a partir do glbToken |

---

### 🧪 TESTES PENDENTES (22/01/2026)

**Ambiente de teste:** `supercartolamanager.com.br`

| # | Teste | Passos | Esperado | Status |
|---|-------|--------|----------|--------|
| 1 | Detecção de assinante | Digitar ID de time assinante no login | Seção "Entrar com Globo" aparece | ⏳ |
| 2 | Abrir popup | Clicar "Entrar com Conta Globo" | Popup abre no domínio Replit | ⏳ |
| 3 | OAuth Globo | Fazer login na conta Globo no popup | Tela de sucesso aparece | ⏳ |
| 4 | postMessage | Popup fecha automaticamente | Token enviado para janela pai | ⏳ |
| 5 | Criar sessão | Token recebido | POST /create-session funciona | ⏳ |
| 6 | Redirecionamento | Sessão criada | Usuário vai para /participante/ | ⏳ |
| 7 | Funcionalidades PRO | Acessar aba Cartola PRO | Escalação funciona com glbToken | ⏳ |

**Casos de erro a testar:**
| # | Cenário | Esperado |
|---|---------|----------|
| E1 | Popup bloqueado | Mensagem "Permita popups" |
| E2 | Usuário fecha popup | Loading some, sem erro |
| E3 | Conta não é assinante | Erro "não é assinante PRO" |
| E4 | Time não está em liga | Erro "não encontrado em liga" |
| E5 | Token expirado | Erro "token inválido" |

**Comando para testar localmente:**
```bash
# Iniciar servidor
npm start

# Acessar em navegador diferente do Replit
# (simular domínio customizado)
```

---

### 🔴 BLOQUEIO ANTERIOR (21/01/2026) - RESOLVIDO

**Tentativas anteriores que falharam:**

| Método | Ambiente | Resultado | Erro |
|--------|----------|-----------|------|
| OAuth OIDC redirect | Replit Dev | ❌ Falhou | `invalid_request` - redirect_uri não autorizado |
| Login direto (email/senha) | Replit Dev | ❌ Falhou | HTTP 406 - Conta vinculada ao Google |
| Login direto (email/senha) | Produção (supercartolamanager.com.br) | ❌ Falhou | HTTP 401 - Sessão não encontrada |

**Problemas identificados (resolvidos com nova abordagem):**

1. ~~**OAuth redirect_uri:** O client_id só aceita redirect_uri de domínios oficiais~~ → Resolvido com popup no Replit
2. **Login direto com conta Google:** Contas Globo criadas via Google OAuth não têm senha direta (erro 406) → Ainda não suportado
3. ~~**Sessão em produção:** Sessão não reconhecida~~ → Resolvido criando sessão local com glbToken

**Arquivos criados/modificados:**
- `config/globo-oauth.js` - Configuração OIDC Globo (criado)
- `routes/cartola-pro-routes.js` - Rotas OAuth + auth direto (modificado)
- `services/cartolaProService.js` - Serviço com `autenticar()`, `gerarTimeSugerido()`, `buscarMeuTime()` (modificado)
- `public/participante/js/modules/participante-cartola-pro.js` v2.0 - Interface com 4 abas (refatorado)
- `public/participante/js/modules/participante-boas-vindas.js` v11.1 - Botão PRO adicionado (modificado)
- `public/participante/js/modules/participante-dicas.js` v1.1 - Seção PRO removida (modificado)

---

### 📋 PESQUISA REALIZADA (21/01/2026 - Perplexity MCP)

**Status:** ✅ Pesquisa concluída - Problema IDENTIFICADO

---

#### 🔍 DESCOBERTA CRÍTICA: Contas Google OAuth

**O problema identificado:**
- Contas Globo criadas via Google OAuth **NÃO TÊM SENHA DIRETA**
- O endpoint `login.globo.com/api/authentication` **retorna 406** para essas contas
- **NÃO EXISTE** forma programática de autenticar contas Google OAuth sem WebView interativo

**Evidência encontrada (TabNews - mesmo problema):**
> "Já consigo capturar GLBID, glb_uid_jwt e GLOBO_ID nos cookies. Mas qualquer chamada à API (/auth/time) retorna 401 Usuário não autorizado."

**Apps que funcionam (Guru do Cartola, Cartomante, Parciais CFC):**
- Usam **WebView nativo** (Capacitor/Cordova plugin)
- Capturam cookies **durante** o redirect OIDC
- Precisam de combinação específica de cookies + headers

---

#### 🏗️ ARQUITETURA DE AUTENTICAÇÃO GLOBO (2025/2026)

| Sistema | Endpoint | Uso | Status |
|---------|----------|-----|--------|
| **Legacy** | `login.globo.com/api/authentication` | Contas com senha direta | ✅ Funciona |
| **OIDC** | `authx.globoid.globo.com` | Contas Google/Facebook | ⚠️ Requer WebView |

**Fluxo OIDC completo:**
```
[1] User → authx.globoid.globo.com/oauth/authorize
[2] → goidc.globo.com (login interface)
[3] → Google OAuth (se conta Google)
[4] → Callback com cookies (GLBID, GLOBO_ID, glb_uid_jwt)
[5] → /auth/time com cookies + X-GLB-Token header
```

---

#### 📦 BIBLIOTECAS CONFIRMADAS FUNCIONANDO

| Projeto | Linguagem | Autenticação | Link |
|---------|-----------|--------------|------|
| **Python-CartolaFC** | Python 3.8-3.10 | Email/senha direto | [vicenteneto/python-cartolafc](https://github.com/vicenteneto/python-cartolafc) |
| **CartolaJS** | Node.js | GLBID manual | [0xVasconcelos/CartolaJS](https://github.com/0xVasconcelos/CartolaJS) |
| **cartola-api** | PHP | Proxy CORS + GLBID | [renatorib/cartola-api](https://github.com/renatorib/cartola-api) |

**Código de autenticação confirmado (Python-CartolaFC):**
```python
self._auth_url = 'https://login.globo.com/api/authentication'
response = requests.post(self._auth_url,
    json=dict(payload=dict(
        email=self._email,
        password=self._password,
        serviceId=4728  # ID do Cartola FC
    ))
)
self._glb_id = response.json()['glbId']  # Token de 215 caracteres
```

---

#### 🎯 ENDPOINTS CONFIRMADOS (2025/2026)

**Públicos (sem auth):**
- `GET /mercado/status` - Status do mercado
- `GET /atletas/mercado` - Todos jogadores disponíveis
- `GET /atletas/pontuados` - Pontuação parcial
- `GET /time/id/{id}` - Info de qualquer time
- `GET /clubes` - Lista de clubes

**Autenticados (requer X-GLB-Token):**
- `GET /auth/time` - Meu time atual
- `GET /auth/ligas` - Minhas ligas
- `POST /auth/time/salvar` - Salvar escalação

**Formato do POST /auth/time/salvar:**
```json
{
  "esquema": 3,
  "atleta": [37788, 71116, ...]
}
```

---

#### ✅ PRÓXIMOS PASSOS DEFINIDOS

**Opção A: Conta com Senha Direta (Recomendado)**
1. Testar com participante que tem conta Globo com senha direta
2. Se funcionar → Documentar que Google OAuth não suportado
3. Adicionar mensagem no app para usuários criarem senha no Globo

**Opção B: WebView (Complexo)**
1. Implementar popup/modal com WebView para login
2. Capturar cookies após redirect
3. Usar cookies no backend
4. **Problema:** Requer plugin nativo no app mobile

**Opção C: Funcionalidade Reduzida**
1. Manter apenas endpoints públicos
2. Remover feature de "Escalar Time"
3. Focar em sugestões e análises

---

#### 🔗 REFERÊNCIAS DA PESQUISA

- [TabNews - Mesmo problema de 401](https://www.tabnews.com.br/juniorandrade88/345421e4-1e40-4c5d-b12f-a27ff021d881)
- [Workana - Job de implementação](https://www.workana.com/job/implementar-login-autenticado-do-cartola-fc-em-app-capacitor-firebase)
- [ChoraAPI - Lista de endpoints](https://choraapi.com.br/blog/api-cartola-fc/)
- [PyPI - Python-CartolaFC](https://pypi.org/project/Python-CartolaFC/)

---

**Pesquisa já realizada (20/01/2026):**

1. **Endpoint de Autenticação:**
   ```
   POST https://login.globo.com/api/authentication
   Headers: Content-Type: application/json
   Body: {
     "payload": {
       "email": "usuario@email.com",
       "password": "senha123",
       "serviceId": 4728
     }
   }
   Retorna: { "glbId": "token_215_caracteres..." }
   ```

2. **Endpoint para Salvar Escalação:**
   ```
   POST https://api.cartolafc.globo.com/auth/time/salvar
   Headers:
     X-GLB-Token: [glbId]
     Content-Type: application/json
   Body: {
     "esquema": 3,  // ID da formação (4-3-3, etc)
     "atleta": [37788, 71116, ...]  // Array de IDs dos jogadores
   }
   ```

3. **Projetos de Referência no GitHub:**
   - `python-cartolafc` (vicenteneto) - Wrapper Python completo
   - `CartolaJS` (0xVasconcelos) - Wrapper Node.js
   - `cartola-api` (renatorib) - PHP wrapper para CORS

**Arquitetura Proposta:**

```
[App Participante Premium]
    |
    +-- [Modal de Login Globo]
    |       - Input email/senha
    |       - Checkbox "Lembrar credenciais" (opcional, criptografado)
    |       - Aviso de riscos
    |
    +-- [Backend Super Cartola]
    |       - POST /api/cartola-pro/auth
    |       - POST /api/cartola-pro/escalar
    |       - Proxy seguro (não expõe credenciais no frontend)
    |
    +-- [API Cartola Globo]
            - Autenticação com glbId
            - Salvar escalação
```

**Arquivos a Criar:**

1. **Backend:**
   - `routes/cartola-pro-routes.js` - Rotas de autenticação e escalação
   - `services/cartolaProService.js` - Lógica de integração com Globo
   - `models/CartolaProSession.js` - Armazenar sessões ativas (opcional)

2. **Frontend:**
   - `public/participante/js/modules/participante-cartola-pro.js` - Lógica do módulo
   - `public/participante/fronts/cartola-pro.html` - Interface
   - Atualizar `participante-dicas.js` para integrar com PRO

**Fluxo de Implementação:**

- [ ] 1. Criar rota backend POST `/api/cartola-pro/auth`
  - Receber email/senha do participante
  - Fazer request para login.globo.com
  - Retornar glbId (ou erro)
  - NÃO armazenar credenciais em texto claro

- [ ] 2. Criar rota backend POST `/api/cartola-pro/escalar`
  - Receber glbId + array de atletas + esquema
  - Fazer request para api.cartolafc.globo.com
  - Retornar sucesso/erro

- [ ] 3. Criar interface no app participante
  - Botão "Escalar no Cartola" (apenas Premium)
  - Modal de login com aviso de riscos
  - Seletor de jogadores com sugestões
  - Confirmação antes de salvar

- [ ] 4. Implementar seletor de escalação
  - Buscar jogadores disponíveis (mercado aberto)
  - Interface de arrastar/soltar ou seleção
  - Validar formação (11 jogadores + técnico)
  - Mostrar preço total vs patrimônio

- [ ] 5. Testes e validação
  - Testar com conta real (com cuidado)
  - Verificar rate limiting da Globo
  - Implementar fallbacks para erros

**⚠️ RISCOS CONFIRMADOS:**

| Risco | Mitigação |
|-------|-----------|
| Violar ToS Globo | Aviso explícito ao usuário, termo de aceite |
| Credenciais expostas | NUNCA armazenar em texto claro, usar session temporária |
| Conta banida | Limitar requisições, simular comportamento humano |
| API mudar | Monitorar erros, fallback gracioso |

**Acesso:** Apenas participantes Premium (verificar `timeId === '13935277'` ou flag no banco)

---

## ✅ CONCLUÍDO (2026-01-22)

### REFACTOR-001 Fase 2: Extração PDF/Auditoria + Performance P2

**Commit:** `fb226ba refactor(p3): extract PDF/Auditoria module, add .lean() to queries`

**Arquivos criados:**
- `public/js/fluxo-financeiro/fluxo-financeiro-pdf.js` (830 linhas)

**Arquivos modificados:**
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` (5.214 → 4.426 linhas, -15%)
- `controllers/inscricoesController.js` (+.lean() em 1 query)
- `controllers/ligaController.js` (+.lean() em 2 queries)
- `controllers/pontosCorridosCacheController.js` (+.lean() em 1 query)

**Documentação:**
- `.claude/docs/PRD-admin-performance-refactor.md`
- `.claude/docs/SPEC-admin-performance-refactor.md`

**Resultado:**
| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| fluxo-financeiro-ui.js | 5.214 linhas | 4.426 linhas | -15% |
| Total desde início | 7.019 linhas | 4.426 linhas | **-37%** |
| Queries com .lean() | ~135 sem | ~130 sem | +4 controllers |

---

## ✅ CONCLUÍDO (2026-01-20)

### Corrigir Extrato Leilson 2025 + Remover Botão da Morte

**Participante:** Leilson Bezerra (ID 3300583)
**Liga:** SuperCartola (684cb1c8af923da7c7df51de)

#### Causa Raiz
O **botão "Limpar Cache"** no modal de extrato individual apagava dados do MongoDB **sem filtrar por temporada**, causando perda de dados irrecuperáveis em temporadas históricas.

#### Ações Executadas

| Ação | Arquivo | Status |
|------|---------|--------|
| Remover botão HTML | `fluxo-financeiro-ui.js` | ✅ |
| Remover função `limparCacheExtratoModal` | `fluxo-financeiro-ui.js` | ✅ |
| Remover função `recalcularCacheParticipante` | `fluxo-financeiro-ui.js` | ✅ |
| Remover função `limparCacheLiga` | `fluxo-financeiro-ui.js` | ✅ |
| Remover funções backend | `extratoFinanceiroCacheController.js` | ✅ |
| Remover rotas DELETE perigosas | `extratoFinanceiroCacheRoutes.js` | ✅ |
| Reconstruir extrato Leilson 2025 | `fix-leilson-extrato-2025.js` | ✅ |

#### Dados Recuperados do Leilson

| Campo | Valor |
|-------|-------|
| Saldo 2024 (crédito) | R$ 0,54 |
| Dívida das rodadas | R$ -203,46 |
| Pagamento (quitação) | R$ 204,00 |
| **Saldo Final** | **R$ 1,08** |
| Status | ✅ QUITADO |

⚠️ **Nota:** Os dados de rodadas individuais foram PERDIDOS permanentemente. O cache foi reconstruído com dados agregados disponíveis.

#### Scripts Criados
- `scripts/fix-leilson-extrato-2025.js` - Reconstrução do extrato

#### PRD Documentação
- `.claude/docs/PRD-remover-botao-limpar-cache.md`

---

## ✅ CONCLUÍDO (2026-01-19)

### Modal Premiações 2026

**Arquivos:**
- `public/participante/index.html` - Modal com accordion
- `public/participante/js/modules/participante-boas-vindas.js` v10.12 - Botão na tela Início

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Modal com 8 seções accordion | ✅ |
| Campeões de Turno | ✅ Copo Térmico + Camisa |
| Disputas Individuais | ✅ Artilheiro, Luva, Capitão (R$ 50 cada) |
| Pontos Corridos | ✅ 1° R$ 150, 2° R$ 130, 3° R$ 110 |
| Outras Disputas | ✅ Resta Um, Tiro Certo, Mata-Mata |
| Bolões | ✅ Copa do Mundo + Libertadores |
| Bônus/Ônus Especiais | ✅ Micos/Mitos, Nunca Mico, etc |
| Ranking Geral (G10) | ✅ 1° R$ 1000 até 10° R$ 50 |
| Ranking de Rodada | ✅ Bônus G10 + Ônus Z10 |
| Botão na tela Início | ✅ |

**Acesso:** `window.abrirPremiacoes2026()`

---

### Seção de Jogos Separada - v5.3

**Arquivo:** `public/participante/js/modules/participante-jogos.js`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Exibir apenas jogos do dia | ✅ (já existia) |
| Separar em "Em Andamento" e "Encerrados" | ✅ Implementado |
| Aplicar no app do participante (frontend) | ✅ |
| Validar integração com backend | ✅ Funciona com jogos-ao-vivo-routes.js |

**Mudanças técnicas:**
- Nova função `renderizarSecaoJogos()` para renderizar cada seção
- `renderizarJogosAoVivo()` agora separa jogos em duas categorias:
  - "Em Andamento": jogos ao vivo + agendados
  - "Encerrados": jogos finalizados (FT, AET, PEN)
- Visual diferenciado: borda laranja para Em Andamento, cinza para Encerrados

---

> Arquivo gerenciado pelos comandos `/salvar-tarefas` e `/retomar-tarefas`
> Apenas pendencias reais apontadas pelo usuario devem estar aqui.

---

## Status Atual (2026-01-18)

### ✅ SPEC v5.0 Implementada

**Melhorias Badges Jogos v5.0** - CONCLUÍDO
- **PRD:** `.claude/docs/PRD-badges-jogos-melhorias-v5.md`
- **SPEC:** `.claude/docs/SPEC-badges-jogos-melhorias-v5.md`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Nomes de campeonatos | ✅ "Paulista - A1" → "Paulistão", "Carioca - 1" → "Cariocão" |
| Modal com tabs | ✅ Eventos \| Estatísticas \| Escalações |
| Tab Estatísticas | ✅ Barras comparativas (posse, chutes, escanteios, faltas) |
| Tab Escalações | ✅ Formação tática + 11 titulares de cada time |

**Arquivos modificados:**
1. `routes/jogos-ao-vivo-routes.js` v3.2 - LIGAS_PRINCIPAIS expandido + formatarNomeLiga() com nomes populares + extrairResumoStats()
2. `public/participante/js/modules/participante-jogos.js` v5.0 - Modal com tabs + renderizarEstatisticas() + renderizarEscalacoes() + trocarTabModal()

---

### ✅ SPEC v4.1 Implementada (Anterior)

**Badges de Jogos API-Football v4.1** - CONCLUÍDO
- **SPEC:** `.claude/docs/SPEC-badges-jogos-api-football-v3.md`
- **Commit:** `e234a3d feat(jogos-ao-vivo): implementar v4.1 com eventos e auto-refresh`

**O que foi implementado:**
| Feature | Status |
|---------|--------|
| Eventos em tempo real | ✅ Gols, cartões, substituições |
| Auto-refresh | ✅ Atualiza placar a cada 60s quando ao vivo |
| Badge visual v4.1 | ✅ Tempo pulsante, placar halftime, estádio |
| Modal de detalhes | ✅ Toque expande timeline de eventos |

---

## Status Anterior (2026-01-17)

**✅ Skills Robustecidos v2.0 - Instalados**
**✅ Auditoria Baseline Executada**

**Localização:**
- `.claude/skills/` - 5 skills completos (code-inspector, db-guardian, frontend-crafter, league-architect, system-scribe)
- `scripts/` - 5 scripts de auditoria automatizados
- `audit_baseline_20260117.log` - Resultado da primeira auditoria

---

## 📊 Resultado Auditoria SPARC (2026-01-17)

**Score Total: 9/25 (CRÍTICO)**

| Dimensão | Score | Status |
|----------|-------|--------|
| 🛡️ Security | 1/5 | 🔴 |
| ⚡ Performance | 3/5 | 🟡 |
| 🏗️ Architecture | 1/5 | 🔴 |
| 🔄 Reliability | 3/5 | 🟡 |
| 🧹 Code Quality | 1/5 | 🔴 |

### ✅ P1 - Issues Críticos (RESOLVIDOS)

**Multi-Tenant (61 queries → 0 reais):**
- ✅ Análise detalhada: 61 falsos positivos
- ✅ Script melhorado com verificação multiline
- ✅ Queries usam `ligaId` (camelCase), `liga.times`, ou `time_id`

**Correção Aplicada - golsController.js v2.0:**
- ✅ `listarGols`: Adicionado filtro `ligaId` obrigatório
- ✅ `extrairGolsDaRodada`: Adicionado `ligaId` obrigatório + campos corretos
- ✅ `public/js/gols.js`: Atualizado para passar `ligaId`

**Secrets Hardcoded (34):**
- ✅ Falso positivo: todos em `.config/` e `node_modules`

### 🟡 P2 - Issues Médios (Parcialmente Resolvidos)

**Performance:**
- ~~135 queries sem `.lean()`~~ → 🟡 ~130 restantes (4 controllers atualizados em 22/01/2026)
- 567 console.logs (remover em produção)
- ~~2 bundles >100KB (fluxo-financeiro-ui: 286K)~~ → ✅ Reduzido para 180K (-37%)

**Models - Status dos Índices liga_id:**
- ✅ ModuleConfig, AjusteFinanceiro, LigaRules, ExtratoFinanceiroCache (têm índices)
- ⚠️ CartolaOficialDump (`meta.liga_id` não indexado - Data Lake)

### Próximas Ações Recomendadas

1. ~~**P1 Multi-Tenant**~~ ✅ Resolvido
2. ~~**P1 Auth gols.js**~~ ✅ Corrigido com ligaId obrigatório
3. ~~**P2 Índices:**~~ ✅ Análise: 4/5 models JÁ têm índices
4. **P2 Performance:** ~~136 queries sem .lean()~~ → 🟡 ~130 restantes (4 controllers atualizados)

---

## Histórico de Correções Recentes

### ✅ Auditoria P1/P2 Direta (2026-01-17)

**Análise P1 - Multi-Tenant:**
- `rodadaController.js` ✅ SEGURO - todas queries filtram por `ligaId`
- `artilheiroCampeaoController.js` ✅ SEGURO - validação de liga obrigatória

**Análise P1 - Auth:**
- `routes/gols.js` ✅ ACEITÁVEL - exige `ligaId` obrigatório
- `routes/configuracao-routes.js` 🔴 CORRIGIDO - `/limpar-cache` sem auth

**FIX Aplicado:**
- `routes/configuracao-routes.js:146` - Adicionado `verificarAdmin` middleware

**Análise P2 - Índices:**
- ModuleConfig ✅ `{liga_id, temporada, modulo}` único
- AjusteFinanceiro ✅ `{liga_id, time_id, temporada, ativo}`
- LigaRules ✅ `{liga_id, temporada}` único
- ExtratoFinanceiroCache ✅ `{liga_id, time_id, temporada}` único
- CartolaOficialDump ⚠️ `meta.liga_id` não indexado (Data Lake, raramente filtrado)

**Análise P2 - Performance:**
- 136 queries sem `.lean()` (backlog - implementar logger antes)
- 567 console.logs (requer logger configurável - backlog)

### ✅ Fix Multi-Tenant golsController.js (2026-01-17)

**Arquivos:** `controllers/golsController.js` v2.0, `public/js/gols.js` v2.0

**Problema:** Queries sem filtro `ligaId` permitiam vazamento de dados entre ligas

**Correções:**
- `listarGols`: Agora exige `ligaId` obrigatório no query string
- `extrairGolsDaRodada`: Agora exige `ligaId` no body + campos alinhados ao model
- Frontend atualizado para passar `ligaId`

**Script audit_multitenant.sh melhorado:**
- Verificação multiline (5 linhas de contexto)
- Reconhece padrões válidos: `ligaId`, `liga_id`, `liga.times`, `time_id`, `timeId`
- Ignora rotas admin/tesouraria/proxy intencionais

### ✅ Skills & Scripts de Auditoria (2026-01-17)

**Implementado:**
- Framework SPARC (Security/Performance/Architecture/Reliability/Code Quality)
- Scripts: audit_full, audit_security, audit_multitenant, detect_dead_code, check_dependencies
- Patterns específicos: Multi-tenant, Cache-First, Regras financeiras completas
- Documentação: Wiki Viva methodology, Gemini Audit integration

**Aliases criados:**
```bash
audit           # Auditoria completa
audit-security  # Análise de segurança
audit-tenant    # Validação multi-tenant
```

### ✅ Jogos do Dia v2.0 (2026-01-17)

**Arquivos:** `routes/jogos-ao-vivo-routes.js` v2.0, `public/participante/js/modules/participante-jogos.js` v3.0

**Mudanças:** Endpoint `?date={hoje}`, cache inteligente (2min/10min), jogos encerrados visíveis

### ✅ Fix China Guardiola - Crédito 2026 (2026-01-17)

**Corrigido:** `controllers/inscricoesController.js` v1.4 - Transferência de crédito em renovações com `pagouInscricao=true`

### ✅ PWA Install Prompt (Implementado)

**Arquivo:** `public/participante/js/install-prompt.js` v1.1

---

## Referência Rápida

### IDs das Ligas
- **SUPERCARTOLA:** `684cb1c8af923da7c7df51de`
- **SOBRAL:** `684d821cf1a7ae16d1f89572`

### Scripts de Auditoria
```bash
bash scripts/audit_full.sh           # Auditoria completa SPARC
bash scripts/audit_security.sh       # Segurança OWASP Top 10
bash scripts/audit_multitenant.sh    # Isolamento multi-tenant
bash scripts/detect_dead_code.sh     # Código morto/TODOs
bash scripts/check_dependencies.sh   # NPM vulnerabilidades
```

### Status API Cartola
```json
{
  "temporada": 2025,
  "rodada_atual": 1,
  "status_mercado": 1,
  "game_over": false
}
```

---

## Próxima Ação Recomendada

### Imediato (P1 - CRÍTICO)
1. ~~**Executar baseline de auditoria**~~ ✅ Concluído
2. **Revisar queries multi-tenant** - `rodadaController.js`, `artilheiroCampeaoController.js`
3. **Verificar auth** em `routes/gols.js` e `routes/configuracao-routes.js`

### Curto Prazo (P2)
1. ~~Adicionar `.lean()` em 135 queries~~ → 🟡 ~130 restantes (4 controllers feitos)
2. ~~Criar índices `liga_id`~~ → ✅ 4/5 models JÁ têm índices
3. Remover console.logs de produção (567 encontrados)
4. 📋 Continuar refatoração fluxo-financeiro-ui.js (4.426 linhas restantes)

### Quando Brasileirão 2026 Iniciar
1. Atualizar `CAMPEONATO_ENCERRADO = false` em `fluxo-financeiro-core.js`
2. Atualizar `TEMPORADA_CARTOLA = 2026` em `participante-extrato.js`
3. Executar `bash scripts/audit_multitenant.sh` para validar queries 2026

---
