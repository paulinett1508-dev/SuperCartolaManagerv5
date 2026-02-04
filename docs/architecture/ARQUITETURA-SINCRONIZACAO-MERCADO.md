# Arquitetura de Sincronização: Jogos + Rodadas + Mercado

> **Documentação da arquitetura de sincronização automática e inteligente do Super Cartola Manager**
> **Versão:** 2.0
> **Data:** 31/01/2026
> **Responsável:** Sistema

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Componentes Principais](#componentes-principais)
3. [Fluxo de Sincronização](#fluxo-de-sincronização)
4. [Dados Perpétuos](#dados-perpétuos)
5. [Status do Mercado](#status-do-mercado)
6. [Consolidação Automática](#consolidação-automática)
7. [Popular Rodadas (Plano B)](#popular-rodadas-plano-b)
8. [Monitoramento e Debug](#monitoramento-e-debug)

---

## Visão Geral

O Super Cartola Manager opera com **três pilares sincronizados** para automação completa:

```
┌─────────────────────────────────────────────────────────────┐
│                  TRIPÉ DE SINCRONIZAÇÃO                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ JOGOS DO DIA                                            │
│     └─ APIs esportivas (SoccerData → Cache → Globo)        │
│        └─ Detecta quando jogos começam/terminam            │
│                                                             │
│  2️⃣ STATUS DO MERCADO CARTOLA                               │
│     └─ MarketGate (singleton)                              │
│        └─ Detecta abertura/fechamento do mercado           │
│                                                             │
│  3️⃣ CALENDÁRIO DE RODADAS                                   │
│     └─ CalendarioRodada (MongoDB)                          │
│        └─ Mapeia jogos → rodadas do Cartola                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Objetivo:** Sistema autônomo que **detecta, reage e consolida** sem intervenção manual.

---

## Componentes Principais

### 1. **MarketGate** (Backend Singleton)
**Arquivo:** `utils/marketGate.js`

Centralizador único de status do mercado Cartola FC.

```javascript
// Uso
import marketGate from './utils/marketGate.js';

const status = await marketGate.fetchStatus();
console.log(status.mercado_aberto); // true/false
console.log(status.rodada_atual);   // 1-38
console.log(status.pode_escalar);   // true/false
```

**Características:**
- Cache de 5 minutos (NodeCache)
- Fallback seguro se API Cartola falhar
- Métodos helpers: `isMercadoAberto()`, `isPreTemporada()`, `canEscalar()`
- TTL sincronizado com frontend

---

### 2. **SeasonStatusManager** (Frontend Singleton)
**Arquivo:** `public/js/core/season-status-manager.js`

Espelho do MarketGate no frontend.

```javascript
// Uso
const seasonStatus = new SeasonStatusManager();
const status = await seasonStatus.getStatus();
console.log(status.mercadoAberto);  // true/false
console.log(status.preTemporada);   // true/false
```

**v2.0:** Agora consome `/api/app/system-status` (endpoint unificado) ao invés de `/api/cartola/mercado/status`.

---

### 3. **Endpoint Unificado: /api/app/system-status**
**Arquivo:** `routes/appVersionRoutes.js`

Substitui múltiplas chamadas fragmentadas por uma única requisição.

**Resposta:**
```json
{
  "mercado": {
    "rodada_atual": 5,
    "status_mercado": 2,
    "mercado_aberto": false,
    "temporada": 2026
  },
  "temporada": {
    "atual": 2026,
    "pre_temporada": false,
    "status": "ativa"
  },
  "permissoes": {
    "pode_escalar": false,
    "pode_ver_parciais": true,
    "deve_consolidar": false
  },
  "cache": {
    "ativo": true,
    "ttl_segundos": 287,
    "stale": false
  }
}
```

**Benefícios:**
- 1 requisição vs 3-4 chamadas antigas
- Dados sincronizados (mercado + temporada + cache)
- Simplifica lógica frontend

---

### 4. **SmartDataFetcher** (Inteligência de Dados)
**Arquivo:** `utils/smartDataFetcher.js`

Decide se deve buscar dados da API Cartola ou do cache consolidado.

**Lógica:**
```
┌────────────────────────────────────────────────┐
│ Rodada solicitada: 5                           │
│ Rodada atual: 7                                │
├────────────────────────────────────────────────┤
│ 1. Verifica RodadaSnapshot com status=         │
│    'consolidada' para R5                       │
│    └─ ✅ EXISTE: Retorna do snapshot           │
│       (ZERO requisições à API Cartola)         │
│                                                │
│ 2. Se não existe snapshot consolidado:         │
│    └─ Calcula ao vivo (busca API Cartola)     │
└────────────────────────────────────────────────┘
```

**Resultado:** Dados consolidados = perpétuos = zero requisições.

---

### 5. **ConsolidaçãoScheduler** (Automação)
**Arquivo:** `utils/consolidacaoScheduler.js`

Monitora transições de mercado e dispara consolidações automáticas.

**Intervalo:** 30 minutos
**Monitoramento:** Detecta mudança de `status_mercado` 1→2 (aberto→fechado)

```javascript
// Lógica
const statusAtual = await marketGate.fetchStatus();

if (ultimoStatus.status_mercado === 1 && statusAtual.status_mercado === 2) {
    console.log('🔔 MERCADO FECHOU! Disparando consolidação...');
    await consolidarRodadaAutomatica(rodadaAtual - 1);
}
```

**Ações ao consolidar:**
1. Busca dados de todas as rodadas da API Cartola
2. Salva em `RodadaSnapshot` com `status: 'consolidada'`
3. Faz backup em `CartolaOficialDump` (data lake permanente)
4. Calcula rankings, Top 10, confrontos
5. Dispara notificações push (se habilitado)

---

### 6. **CalendarioRodada** (Polling Inteligente)
**Arquivo:** `models/CalendarioRodada.js`

Armazena horários dos jogos do Brasileirão para polling inteligente.

**Schema:**
```javascript
{
  temporada: 2026,
  rodada: 5,
  partidas: [
    {
      data: "2026-02-15",
      horario: "16:00",
      time_casa: "Flamengo",
      time_fora: "Botafogo",
      status: "agendado" // agendado | ao_vivo | encerrado
    }
  ]
}
```

**Métodos úteis:**
- `temJogosAoVivo()` → Booleano se há jogos rolando agora
- `obterProximoJogo()` → Próximo jogo a começar
- `calcularProximoDisparo()` → Quando ativar polling (10min antes)

**Integração com Parciais:**
```javascript
const calendario = await CalendarioRodada.findOne({ temporada: 2026, rodada: 5 });

if (calendario.temJogosAoVivo()) {
    ativarPollingParciais(2000); // 2 segundos
} else {
    desativarPolling();
}
```

---

## Fluxo de Sincronização

### **Cenário 1: Rodada em Andamento**

```
Sexta 19:00 - Primeiro jogo do Brasileirão começa
  ↓
CalendarioRodada.temJogosAoVivo() = true
  ↓
App participante ativa polling de parciais (2s)
  ↓
Exibe placar ao vivo via /api/parciais
  ↓
Domingo 21:00 - Último jogo termina
  ↓
CalendarioRodada.temJogosAoVivo() = false
  ↓
Polling pausado (economia de recursos)
  ↓
Segunda 12:00 - Cartola fecha mercado (status 1→2)
  ↓
ConsolidaçãoScheduler detecta transição
  ↓
Dispara consolidação automática
  ↓
Rodada salva como RodadaSnapshot (status=consolidada)
  ↓
Backup em CartolaOficialDump (dados perpétuos)
  ↓
Notificações push enviadas aos participantes
```

---

### **Cenário 2: Consulta de Rodada Passada**

```
Participante acessa "Rodadas" e seleciona R3
  ↓
Frontend chama: GET /api/rodadas/{ligaId}/rodadas?rodada=3
  ↓
Backend usa SmartDataFetcher.obterDadosRodada(ligaId, 3)
  ↓
SmartDataFetcher verifica:
  1. Existe RodadaSnapshot com status=consolidada?
     ✅ SIM: Retorna do snapshot
     (ZERO chamadas à API Cartola)
  ↓
Frontend renderiza dados instantaneamente
```

---

### **Cenário 3: Pré-Temporada**

```
Janeiro 2026 - Brasileirão não começou
  ↓
API Cartola retorna: { temporada: 2025, status_mercado: 2 }
  ↓
MarketGate detecta: temporada < CURRENT_SEASON
  ↓
MarketGate.isPreTemporada() = true
  ↓
Frontend bloqueia módulos opcionais:
  - Top 10 (Mitos/Micos)
  - Melhor Mês
  - Pontos Corridos
  - Mata-Mata
  ↓
Módulos liberados permanecem:
  - Extrato Financeiro (saldo da temporada anterior)
  - Hall da Fama (dados históricos)
  - Renovação de Temporada
```

---

## Dados Perpétuos

### **Princípio Fundamental**

> **Rodada consolidada = dados imutáveis = zero requisições à API Cartola**

### **Collections de Persistência**

#### 1. **RodadaSnapshot**
Dados consolidados da rodada por liga.

```javascript
{
  liga_id: ObjectId("..."),
  rodada: 5,
  status: "consolidada", // aberta | consolidada
  dados_consolidados: {
    ranking: [...], // Ranking da rodada
    top10: {...},   // Mitos e Micos
    confrontos: [...] // Mata-mata
  },
  versao_schema: 2,
  atualizado_em: ISODate("2026-02-17T15:30:00Z")
}
```

#### 2. **CartolaOficialDump** (Data Lake)
Backup permanente dos dados brutos da API Cartola.

```javascript
{
  time_id: 13935277,
  temporada: 2026,
  rodada: 5,
  tipo_coleta: "time_rodada",
  raw_json: {
    time: {...},
    pontos: 87.50,
    rodada_atual: 5
  },
  meta: {
    origem_trigger: "consolidacao",
    liga_id: ObjectId("...")
  },
  coletado_em: ISODate("2026-02-17T15:30:00Z")
}
```

**Benefícios:**
- Auditoria completa
- Restauração de dados
- Hall da Fama multi-temporada
- Análises históricas

---

### **Fluxo de Backup Automático**

```javascript
// Em consolidacaoController.js
async function consolidarRodada(ligaId, rodada) {
    // 1. Buscar dados da API Cartola
    const dadosRodada = await buscarDadosRodada(ligaId, rodada);

    // 2. Calcular rankings e estatísticas
    const rankingCalculado = calcularRankingCompleto(dadosRodada);

    // 3. Salvar snapshot consolidado
    await RodadaSnapshot.create({
        liga_id: ligaId,
        rodada: rodada,
        status: 'consolidada',
        dados_consolidados: rankingCalculado
    });

    // 4. Backup para Data Lake
    await backupRodadaParaDataLake(ligaId, rodada, dadosRodada);

    console.log('✅ Rodada consolidada e backup realizado');
}
```

---

## Status do Mercado

### **Códigos de Status**

| Código | Nome | Significado | Ações do Sistema |
|--------|------|-------------|------------------|
| **1** | ABERTO | Mercado aceita escalações | Frontend libera módulos dependentes |
| **2** | FECHADO | Jogos em andamento | Ativa parciais, bloqueia escalação |
| **3** | DESBLOQUEADO | Reaberto após fechamento | Libera escalação novamente |
| **4** | ENCERRADO | Rodada finalizada | Dispara consolidação |
| **5** | FUTURO | Rodada futura | Aguarda abertura |
| **6** | TEMPORADA_ENCERRADA | Campeonato acabou | Circuit breaker (seasonGuard) |

---

### **Circuit Breaker: seasonGuard.js**

Protege o sistema quando temporada acaba.

```javascript
// Quando status_mercado === 6
if (isSeasonFinished()) {
    // Bloqueia operações destrutivas
    logBlockedOperation('popularRodadas', { ligaId, rodada });

    return res.status(403).json({
        error: 'Temporada encerrada - dados imutáveis'
    });
}
```

**Operações bloqueadas:**
- Popular rodadas
- Atualizar rankings
- Modificar extratos

**Operações permitidas:**
- Leitura de dados históricos
- Exportações
- Análises

---

## Consolidação Automática

### **Quando Acontece?**

1. **Scheduler (30min):** Detecta transição mercado 1→2
2. **Manual (admin):** Via `/api/consolidacao/ligas/:ligaId/rodadas/:rodada/consolidar`
3. **Garantia de consolidação:** Se mercado está fechado e rodada não foi consolidada

### **O Que é Consolidado?**

```
Rodada 5 (exemplo)
├─ Ranking Geral
│  └─ Posições finais + pontos + movimento (+3↑ / -2↓)
│
├─ Top 10
│  ├─ Mitos (top 3 melhores)
│  └─ Micos (top 3 piores)
│
├─ Fluxo Financeiro
│  ├─ Bonificações (1º lugar: +R$50, 2º: +R$30...)
│  └─ Débitos (últimos lugares: -R$20, -R$10...)
│
├─ Mata-Mata (se habilitado)
│  └─ Confrontos da rodada
│
├─ Pontos Corridos (se habilitado)
│  └─ Tabela de classificação
│
└─ Notificações
   ├─ "Rodada finalizada"
   ├─ "Você é o mito!" (se top 3)
   └─ "Você é o mico!" (se bottom 3)
```

---

### **Idempotência**

**Consolidação é IDEMPOTENTE**: rodar múltiplas vezes não duplica dados.

```javascript
// Antes de consolidar
const jaConsolidada = await RodadaSnapshot.findOne({
    liga_id: ligaId,
    rodada: rodada,
    status: 'consolidada'
});

if (jaConsolidada) {
    console.log('⏭️ Rodada já consolidada, pulando...');
    return;
}
```

---

## Popular Rodadas (Plano B)

### **Status:** Plano B Emergencial (não é fluxo principal)

**UI Admin:** `/ferramentas-rodadas.html`
**Endpoint:** `POST /api/rodadas/:ligaId/rodadas`

### **Quando Usar?**

❌ **NÃO usar para fluxo normal** (consolidação automática faz isso)
✅ **SIM usar para:**
- Re-popular rodadas com dados corrompidos
- Popular rodadas de ligas novas
- Debug e testes
- Recuperação de desastres

### **Alerta na UI**

```
⚠️ FERRAMENTA EMERGENCIAL - PLANO B

Esta ferramenta deve ser usada APENAS quando a consolidação
automática falhar. O sistema consolida rodadas automaticamente
quando o mercado fecha. Use esta opção somente para re-popular
dados ou corrigir problemas.
```

### **Proteções**

1. **seasonGuard:** Bloqueia se temporada encerrada (`status_mercado === 6`)
2. **Checkbox "Repopular":** Obrigatório para sobrescrever dados existentes
3. **Confirmação:** Admin deve selecionar liga + rodadas manualmente

---

## Monitoramento e Debug

### **Endpoints de Diagnóstico**

#### 1. `/api/app/system-status`
Status completo do sistema.

```bash
curl https://supercartolamanager.com.br/api/app/system-status
```

Retorna:
- Status do mercado Cartola
- Temporada atual
- Permissões (pode escalar, tem parciais, etc.)
- Info de cache (TTL, stale, fallback)

---

#### 2. `/api/jogos-ao-vivo/status`
Diagnóstico das APIs de jogos.

```bash
curl https://supercartolamanager.com.br/api/jogos-ao-vivo/status
```

Retorna:
- Fonte ativa (SoccerData | Cache Stale | Globo)
- Cota de requisições
- TTL do cache
- Alertas

---

#### 3. `/api/app/versao/debug`
Diagnóstico de versionamento.

```bash
curl https://supercartolamanager.com.br/api/app/versao/debug
```

Retorna:
- Versão admin vs app
- Cliente detectado
- Servidor uptime

---

### **Logs Importantes**

**Backend:**
```
[SCHEDULER] 📊 Status: Rodada 5, Mercado FECHADO
[SCHEDULER] 🔔 TRANSIÇÃO DETECTADA: Mercado fechou! Iniciando consolidação R4
[CONSOLIDAÇÃO] 🏭 Consolidando R4 para todas as ligas...
[CONSOLIDAÇÃO] ✅ Liga SuperCartola R4 consolidada
[DATA-LAKE] 💾 Salvando backup R4 (12 times)...
[DATA-LAKE] ✅ Backup R4: 12 novos, 0 já existentes
[MARKET-GATE] Status do cache (TTL restante: 287000 ms)
[SMART-FETCH] 🔒 Rodada 4 CONSOLIDADA - dados imutáveis
```

**Frontend:**
```
[SEASON-STATUS] Usando último cache conhecido
[SEASON-STATUS] Erro ao buscar status: HTTP 503
[PARTICIPANTE-RODADAS] Status: mercado fechado, rodada 5
[PARTICIPANTE-PARCIAIS] Polling ativo (2s)
```

---

### **Forçar Refresh de Cache**

**Backend:**
```bash
curl -X POST https://supercartolamanager.com.br/api/app/system-status/clear-cache
```

**Frontend:**
```javascript
const seasonStatus = new SeasonStatusManager();
seasonStatus.forceRefresh();
```

---

## Arquivos Principais

| Componente | Arquivo | Responsabilidade |
|------------|---------|------------------|
| **MarketGate** | `utils/marketGate.js` | Singleton de status do mercado |
| **Endpoint Unificado** | `routes/appVersionRoutes.js` | `/api/app/system-status` |
| **SeasonStatusManager** | `public/js/core/season-status-manager.js` | Frontend singleton |
| **SmartDataFetcher** | `utils/smartDataFetcher.js` | Inteligência de dados |
| **ConsolidaçãoScheduler** | `utils/consolidacaoScheduler.js` | Automação de consolidação |
| **ConsolidaçãoController** | `controllers/consolidacaoController.js` | Lógica de consolidação |
| **CalendarioRodada** | `models/CalendarioRodada.js` | Schema de calendário |
| **RodadaSnapshot** | `models/RodadaSnapshot.js` | Dados consolidados |
| **CartolaOficialDump** | `models/CartolaOficialDump.js` | Data lake |
| **Popular Rodadas (UI)** | `public/ferramentas-rodadas.html` | Plano B emergencial |
| **Popular Rodadas (API)** | `routes/rodadas-routes.js` | Endpoints de rodadas |

---

## Checklist de Saúde do Sistema

✅ **MarketGate** funcionando?
- Cache ativo e com TTL > 0
- Sem erros no console `[MARKET-GATE]`
- `/api/app/system-status` retornando dados válidos

✅ **Consolidação automática** ativa?
- Logs `[SCHEDULER]` aparecendo a cada 30 min
- Transições 1→2 sendo detectadas
- Snapshots sendo salvos com `status: 'consolidada'`

✅ **Dados perpétuos** funcionando?
- SmartDataFetcher retornando snapshots consolidados
- Logs `[SMART-FETCH] 🔒 Rodada X CONSOLIDADA - dados imutáveis`
- Zero chamadas à API Cartola para rodadas passadas

✅ **Frontend sincronizado**?
- SeasonStatusManager usando `/api/app/system-status`
- TTL de 5 minutos respeitado
- Fallbacks funcionando se API falhar

✅ **Jogos do dia** operacional?
- `/api/jogos-ao-vivo/status` retornando fonte ativa
- Cache invalidado quando muda o dia
- Fallback Globo funcionando se APIs esportivas falharem

---

## Troubleshooting

### **Problema: Rodada não consolida automaticamente**

**Checklist:**
1. ConsolidaçãoScheduler está ativo? (logs a cada 30 min)
2. Mercado realmente fechou? (status_mercado mudou de 1 para 2?)
3. RodadaSnapshot já existe? (pode estar pulando se já consolidada)
4. Há erros nos logs do scheduler?

**Solução manual:**
```bash
curl -X POST https://supercartolamanager.com.br/api/consolidacao/ligas/{ligaId}/rodadas/{rodada}/consolidar
```

---

### **Problema: Cache sempre stale/fallback**

**Causas:**
- API Cartola fora do ar
- Rede bloqueando requisições HTTPS
- Cache corrompido

**Solução:**
```bash
# Limpar cache backend
curl -X POST https://supercartolamanager.com.br/api/app/system-status/clear-cache

# Limpar cache frontend
localStorage.clear();
sessionStorage.clear();
```

---

### **Problema: Popular Rodadas não funciona**

**Checklist:**
1. Temporada encerrada? (seasonGuard bloqueia se `status_mercado === 6`)
2. Liga existe no banco?
3. Times cadastrados na liga?
4. API Cartola acessível?

**Debug:**
```bash
# Ver logs do controller
GET /api/rodadas/:ligaId/rodadas?rodada=5
```

---

## Próximos Passos (Roadmap)

1. **Polling inteligente baseado em CalendarioRodada**
   - Ativar polling 10min antes do primeiro jogo
   - Desativar quando último jogo termina
   - Economia de recursos

2. **Integração CalendarioRodada ↔ ConsolidaçãoScheduler**
   - Usar `temJogosAoVivo()` para decidir frequência de verificação
   - Intervalos: 2 min (jogos ao vivo) / 30 min (sem jogos)

3. **Webhook de notificação quando mercado fecha**
   - Push imediato para admins
   - Alertas no Slack/Discord

4. **Dashboard de saúde do sistema**
   - UI visual com status de cada componente
   - Gráficos de latência de APIs
   - Histórico de consolidações

5. **Auto-correção de dados**
   - Detectar snapshots com `versao_schema` antiga
   - Re-consolidar automaticamente quando schema muda

---

**Última atualização:** 31/01/2026
**Versão do documento:** 2.0
**Responsável:** Sistema Automatizado
