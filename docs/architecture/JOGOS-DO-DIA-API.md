# Jogos do Dia - Documentação da API

> **IMPORTANTE**: Esta documentação é a fonte de verdade para a feature "Jogos do Dia".
> Qualquer mudança nesta configuração deve ser documentada aqui.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Organização Visual](#2-organização-visual)
3. [Escopo de Cobertura](#3-escopo-de-cobertura)
4. [Arquitetura de Fallback](#4-arquitetura-de-fallback)
5. [Configuração de Ambiente](#5-configuração-de-ambiente)
6. [Endpoints da API](#6-endpoints-da-api)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Visão Geral

A feature **"Jogos do Dia"** exibe partidas de futebol na tela inicial do app do participante.

### Objetivo
Mostrar **TODOS os jogos brasileiros do dia**, organizados por:
1. **Campeonato** (acordeão colapsável)
2. **Status** (Ao Vivo / Agenda / Encerrados)

### Competições Cobertas
- **Estaduais**: Cariocão, Paulistão, Gauchão, Mineirão, Baianão, etc.
- **Nacionais**: Brasileirão Séries A, B, C, D
- **Copas**: Copa do Brasil, Copinha, Supercopa

### Restrição Temporal
- **EXCLUSIVAMENTE jogos do dia atual**
- Jogos de ontem ou amanhã NÃO aparecem

---

## 2. Organização Visual

### Estrutura do Frontend (v5.6)

```
┌─────────────────────────────────────────────────────┐
│ JOGOS DO DIA                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─ AGENDA DO DIA ─────────────────────────────────┐ │
│ │ ○ Vasco vs Fluminense           17:00           │ │
│ │ ○ Internacional vs Grêmio       19:00           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ▼ Cariocão (2 jogos)              [EXPANDIDO]      │
│ ├─ AO VIVO ──────────────────────────────────────┐ │
│ │ ● Flamengo 2x1 Botafogo         67'            │ │
│ └────────────────────────────────────────────────┘ │
│ ├─ ENCERRADOS ───────────────────────────────────┐ │
│ │ ✓ Maricá 0x0 Sampaio Corrêa    FIM             │ │
│ └────────────────────────────────────────────────┘ │
│                                                     │
│ ▶ Paulistão (1 jogo)              [COLAPSADO]      │
│                                                     │
│ ▶ Brasileirão A (3 jogos)         [COLAPSADO]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Seções por Status

| Status | Ícone | Descrição | Cor |
|--------|-------|-----------|-----|
| **Ao Vivo** | ● | Jogos em andamento (1H, 2H, HT) | Verde pulsante |
| **Agenda** | ○ | Jogos agendados para hoje | Laranja |
| **Encerrados** | ✓ | Jogos finalizados hoje | Cinza |

### Comportamento do Acordeão
- **Expandido por padrão**: Campeonatos com jogos ao vivo
- **Colapsado por padrão**: Campeonatos só com encerrados
- **Não aparece**: Campeonatos só com agendados (vão para "Agenda do Dia")

### Arquivo de Implementação
```
public/participante/js/modules/participante-jogos.js (v5.6)
```

---

## 3. Escopo de Cobertura

### Critério de Filtro (Backend)
```javascript
// REGRA FUNDAMENTAL - NÃO ALTERAR
// Arquivo: routes/jogos-ao-vivo-routes.js, linha ~170
const jogosBrasil = (data.response || []).filter(jogo => {
  const pais = jogo.league?.country?.toLowerCase();
  return pais === 'brazil';  // ← TODOS os jogos do país Brazil
});
```

**POR QUE este filtro?**
- Brasileirão não acontece todos os dias (principalmente no início/fim do ano)
- Estaduais acontecem durante a semana quando não há Brasileirão
- Usuários querem ver QUALQUER jogo brasileiro relevante

---

## 2. Escopo de Cobertura

### Competições Cobertas (Automático via `country === 'brazil'`)

| Tipo | Competições | Período Típico |
|------|-------------|----------------|
| **Nacionais** | Brasileirão A, B, C, D | Abril - Dezembro |
| **Copa** | Copa do Brasil | Fevereiro - Novembro |
| **Estaduais** | Todos (Cariocão, Paulistão, etc.) | Janeiro - Abril |
| **Juvenil** | Copinha | Janeiro |
| **Super** | Supercopa do Brasil | Janeiro/Fevereiro |

### Mapeamento de Nomes (IDs estáveis)

```javascript
// Arquivo: routes/jogos-ao-vivo-routes.js, linha ~25
const LIGAS_PRINCIPAIS = {
  71: 'Brasileirão A',
  72: 'Brasileirão B',
  73: 'Copa do Brasil',
  75: 'Série C',
  76: 'Série D',
  77: 'Supercopa',
  618: 'Copinha'
};
```

### Estaduais (tratados por nome, NÃO por ID)

Os IDs de estaduais **variam entre temporadas** na API-Football. Por isso, são tratados via `formatarNomeLiga()`:

```javascript
// Exemplo de transformação
'Paulista - A1'  → 'Paulistão'
'Carioca - 1'    → 'Cariocão'
'Mineiro - 1'    → 'Mineirão'
'Baiano'         → 'Baianão'
```

---

## 3. Arquitetura de Fallback (v5.0)

O sistema opera com um **orquestrador multi-API** de 4 camadas. A API-Football foi **REATIVADA** (v5.0) como fonte SECUNDÁRIA com proteções anti-banimento.

```
┌─────────────────────────────────────────────────────────────┐
│              FLUXO DE DADOS v5.0 (ORQUESTRADOR)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SoccerDataAPI (PRIMÁRIA - livescores)                   │
│     └─ 75 req/dia (free) │ Tempo real │ Polling 30s        │
│            │                                                │
│            ▼ (falha → orquestrador ativa API-Football)      │
│                                                             │
│  2. API-Football v3 (SECUNDÁRIA - fallback + eventos)       │
│     └─ 90 req/dia cap (100 real) │ Tempo real │ Completa   │
│     └─ Proteções: circuit breaker, rate limiter, MongoDB    │
│            │                                                │
│  || Globo SSR (PARALELO - agenda)                           │
│     └─ Ilimitado │ ge.globo.com scraper                    │
│            │                                                │
│            ▼ (todas falharam)                               │
│                                                             │
│  3. Cache Stale (Fallback)                                  │
│     └─ Último cache válido │ Máx 30 min │ Com aviso        │
│            │                                                │
│  4. Globo JSON (Fallback Final)                             │
│     └─ Arquivo estático │ Backup legado                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Proteções Anti-Banimento (API-Football)

| Proteção | Configuração | Descrição |
|----------|-------------|-----------|
| Hard Cap | 90 req/dia | Buffer de 10 (limite real = 100) |
| Rate Limiter | 2 req/min | Respeita TOS da API |
| Intervalo | 30s entre requests | Evita burst |
| Circuit Breaker | Auto com < 10 restantes | Para antes de esgotar |
| Deduplicação | 60s cache por endpoint | Evita requests duplicados |
| Backoff | Exponencial em 429 | Para, respira, tenta depois |
| Persistência | MongoDB `apiQuotaTracker` | Sobrevive restarts |
| Prioridade | low rejeitado com > 70% | Preserva budget |

### Orquestração

```
API-Football é ativada SOMENTE quando:
  ✅ SoccerDataAPI falha/indisponível → livescores fallback
  ✅ Usuário clica em jogo → eventos on-demand (1 req)
  ✅ Fixtures do dia → 1x de manhã (agenda enriquecida)

API-Football NUNCA é chamada se:
  ❌ SoccerDataAPI retornou dados com sucesso
  ❌ Circuit breaker está aberto (quota baixa)
  ❌ Request de prioridade 'low' e quota > 70%
```

### TTL do Cache

| Condição | TTL | Razão |
|----------|-----|-------|
| Com jogos ao vivo | **30 segundos** | Atualização rápida de placares (v4.1) |
| Sem jogos ao vivo | 10 minutos | Economia de requisições |
| Cache stale | 30 minutos máx | Melhor que nada |

**Histórico:**
- v4.1 (08/02/2026): Reduzido de 2min → 30s por feedback de usuários
- v4.0: Era 2 minutos (muito lento para jogos ao vivo)

---

## 4. Configuração de Ambiente

### Variáveis de Ambiente

```env
# SoccerDataAPI (PRIMÁRIA)
SOCCERDATA_API_KEY=sua_chave_aqui

# API-Football v3 (SECUNDÁRIA) - Obter em dashboard.api-football.com
API_FOOTBALL_KEY=sua_chave_aqui
```

> Se `API_FOOTBALL_KEY` não estiver configurada, o serviço fica desabilitado (graceful degradation). SoccerDataAPI continua funcionando normalmente como primária.

---

## 5. Endpoints da API

### GET /api/jogos-ao-vivo

Retorna jogos do dia.

**Resposta:**
```json
{
  "jogos": [
    {
      "id": 123456,
      "mandante": "Flamengo",
      "visitante": "Botafogo",
      "golsMandante": 2,
      "golsVisitante": 1,
      "status": "ao_vivo",
      "tempo": "67'",
      "liga": "Cariocão",
      "horario": "16:00"
    }
  ],
  "fonte": "soccerdata",
  "aoVivo": true,
  "estatisticas": { ... }
}
```

### GET /api/jogos-ao-vivo/status

Diagnóstico do sistema.

### GET /api/jogos-ao-vivo/invalidar

Força refresh do cache (útil para debug).

### GET /api/jogos-ao-vivo/:fixtureId/eventos

Detalhes de uma partida (gols, cartões, escalações).

---

## 6. Troubleshooting

### Problema: "Jogos não aparecem"

**Checklist:**
1. [ ] `SOCCERDATA_API_KEY` está configurada no `.env`?
2. [ ] Limite diário do SoccerDataAPI (75 req/dia) está disponível? (ver `/api/jogos-ao-vivo/status`)
3. [ ] Existem jogos brasileiros para o dia atual? (consultar globo.com ou outro calendário oficial)
4. [ ] Cache stale não passou de 30 min? (usar `/api/jogos-ao-vivo/invalidar` para forçar refresh)

**Comandos de debug:**
```bash
# 1. Verificar status e fluxo
curl /api/jogos-ao-vivo/status

# 2. Forçar refresh
curl /api/jogos-ao-vivo/invalidar

# 3. Buscar jogos atualizados
curl /api/jogos-ao-vivo
```

### Problema: "Só mostra jogos do Brasileirão"

**Causa:** Isso NÃO deveria acontecer, pois o filtro é `country === 'brazil'` a partir dos dados do SoccerDataAPI.

**Verificar:**
1. O SoccerDataAPI está retornando o campo `league.country === 'brazil'` corretamente para estaduais?
2. O campo `league.name` está sendo mapeado corretamente em `formatarNomeLiga()`?

### Problema: "Cota da API esgotou"

**Solução:**
1. O fluxo troca automaticamente para cache stale (máx 30 min) quando SoccerDataAPI falhar.
2. Se cache stale também expirar, o fallback final é o scraper do Globo (agenda apenas).
3. Verificar `/api/jogos-ao-vivo/status` para confirmar `cache.stale` e `globo` ativos.

**Prevenção:**
- Monitorar o uso diário do SoccerDataAPI (75 req/dia).
- Garantir que o cache seja invalidado periodicamente (`/invalidar`) para limpar dados obsoletos.

---

## Arquivos Relacionados

| Arquivo | Função |
|---------|--------|
| `services/api-football-service.js` | Smart client API-Football (rate limiter, circuit breaker) |
| `services/api-orchestrator.js` | Orquestrador multi-API (prioridades, budget) |
| `routes/jogos-ao-vivo-routes.js` | Rota principal, integra orquestrador |
| `scripts/scraper-jogos-globo.js` | Scraper do Globo Esporte |
| `data/jogos-globo.json` | Cache local do scraper |
| `public/api-football-analytics.html` | Dashboard admin (quotas, status APIs) |
| `public/participante/js/modules/participante-jogos.js` | Frontend do app |

---

## Histórico de Versões

| Versão | Data | Mudança |
|--------|------|---------|
| **v5.0** | **Fev/2026** | **API-Football REATIVADA como SECUNDÁRIA com orquestrador multi-API** |
| v4.3 | Fev/2026 | TTL dinâmico blindado para agenda |
| v4.2 | Fev/2026 | Campo atualizadoEm em respostas |
| v4.1 | Fev/2026 | Cache TTL 2min → 30s |
| v4.0 | Jan/2026 | Agenda do dia via ge.globo.com SSR |
| v3.6 | Jan/2026 | Invalidação de cache por mudança de data |
| v3.5 | Jan/2026 | SoccerDataAPI como principal (API-Football removida) |
| v3.4 | Jan/2026 | Cache stale quando APIs falham |

---

> **Última atualização:** 12/02/2026
> **Versão:** 5.0
