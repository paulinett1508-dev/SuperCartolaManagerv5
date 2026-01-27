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

## 3. Arquitetura de Fallback

O sistema possui **4 camadas de fallback** para garantir resiliência:

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE DADOS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. API-Football (Principal)                                │
│     └─ 100 req/dia (free) │ Tempo real │ Todos os dados    │
│            │                                                │
│            ▼ (falha ou cota esgotada)                       │
│                                                             │
│  2. SoccerDataAPI (Fallback 1)                              │
│     └─ 75 req/dia (free) │ Tempo real │ Dados básicos      │
│            │                                                │
│            ▼ (falha ou cota esgotada)                       │
│                                                             │
│  3. Cache Stale (Fallback 2)                                │
│     └─ Último cache válido │ Máx 30 min │ Com aviso        │
│            │                                                │
│            ▼ (cache muito antigo ou vazio)                  │
│                                                             │
│  4. Globo Esporte (Fallback Final)                          │
│     └─ Scraper │ Ilimitado │ Apenas agenda (sem placar)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### TTL do Cache

| Condição | TTL | Razão |
|----------|-----|-------|
| Com jogos ao vivo | 2 minutos | Placares mudam rapidamente |
| Sem jogos ao vivo | 10 minutos | Economia de requisições |
| Cache stale | 30 minutos máx | Melhor que nada |

---

## 4. Configuração de Ambiente

### Variáveis Obrigatórias

```env
# API-Football (Principal)
# Obter em: https://www.api-football.com/
API_FOOTBALL_KEY=sua_chave_aqui

# SoccerDataAPI (Opcional - Fallback)
# Obter em: https://rapidapi.com/soccerdata/api/soccerdata
SOCCERDATA_API_KEY=sua_chave_aqui
```

### Verificar Configuração

```bash
# Via endpoint de status
curl https://supercartolamanager.com.br/api/jogos-ao-vivo/status

# Resposta esperada
{
  "fontes": {
    "api-football": {
      "configurado": true,       # ← DEVE ser true
      "requisicoes": {
        "atual": 45,
        "limite": 100
      }
    },
    "soccerdata": {
      "configurado": true        # ← Recomendado
    },
    "globo": {
      "configurado": true        # ← Sempre true (scraper)
    }
  }
}
```

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
  "fonte": "api-football",
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
1. [ ] API_FOOTBALL_KEY está configurada?
2. [ ] Cota da API não esgotou? (verificar `/status`)
3. [ ] Existem jogos brasileiros hoje? (verificar ge.globo.com)
4. [ ] Cache está stale? (invalidar via `/invalidar`)

**Comandos de debug:**
```bash
# 1. Verificar status das APIs
curl /api/jogos-ao-vivo/status

# 2. Forçar refresh
curl /api/jogos-ao-vivo/invalidar

# 3. Buscar jogos
curl /api/jogos-ao-vivo
```

### Problema: "Só mostra jogos do Brasileirão"

**Causa:** Isso NÃO deveria acontecer. O filtro é `country === 'brazil'`, não por liga específica.

**Verificar:**
1. A API-Football está retornando os estaduais?
2. O campo `league.country` está correto nos dados?

### Problema: "Cota da API esgotou"

**Solução:**
1. Sistema usa SoccerDataAPI automaticamente
2. Se SoccerDataAPI também esgotou, usa cache stale
3. Se cache muito antigo, usa Globo (sem placares)

**Prevenção:**
- Aumentar TTL do cache se necessário
- Contratar plano pago da API-Football

---

## Arquivos Relacionados

| Arquivo | Função |
|---------|--------|
| `routes/jogos-ao-vivo-routes.js` | Rota principal, lógica de fallback |
| `scripts/scraper-jogos-globo.js` | Scraper do Globo Esporte |
| `scripts/save-jogos-globo.js` | Salva cache do scraper |
| `data/jogos-globo.json` | Cache local do scraper |
| `public/participante/js/modules/participante-jogos.js` | Frontend do app |

---

## Histórico de Versões

| Versão | Data | Mudança |
|--------|------|---------|
| v3.6 | Jan/2026 | Invalidação de cache por mudança de data |
| v3.5 | Jan/2026 | SoccerDataAPI como fallback |
| v3.4 | Jan/2026 | Cache stale quando APIs falham |
| v3.3 | Jan/2026 | Fix IDs de estaduais |
| v3.2 | Jan/2026 | Nomes populares (Paulistão, etc.) |

---

> **Mantenedor:** Sistema automatizado
> **Última atualização:** 27/01/2026
> **Versão:** 1.0
