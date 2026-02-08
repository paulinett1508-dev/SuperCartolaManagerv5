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

O sistema agora opera com **3 camadas resilientes**, porque a API-Football foi removida do fluxo (usuário banido). O tráfego principal parte direto para o SoccerDataAPI e só usa cache/globo quando necessário.

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE DADOS ATUAL                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SoccerDataAPI (Principal)                               │
│     └─ 75 req/dia (free) │ Tempo real │ Dados básicos      │
│            │                                                │
│            ▼ (falha, cota ou indisponível)                  │
│                                                             │
│  2. Cache Stale (Fallback 1)                                │
│     └─ Último cache válido │ Máx 30 min │ Com aviso        │
│            │                                                │
│            ▼ (cache muito antigo ou vazio)                  │
│                                                             │
│  3. Globo Esporte (Fallback Final)                          │
│     └─ Scraper │ Ilimitado │ Apenas agenda (sem placar)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> ⚠️ API-Football foi banida e permanece **DESABILITADA**; o sistema não faz mais requisições a ela e exibe o alerta de bloqueio em todos os painéis.

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

### Variáveis Obrigatórias

```env
# SoccerDataAPI (Principal da arquitetura atual)
# Obter em: https://rapidapi.com/soccerdata/api/soccerdata
SOCCERDATA_API_KEY=sua_chave_aqui
```

> ⚠️ A API-Football está bloqueada e não faz parte da arquitetura. Não é necessário manter nenhuma `API_FOOTBALL_KEY` ativa.

### Verificar Configuração

```bash
# Via endpoint de status
curl https://supercartolamanager.com.br/api/jogos-ao-vivo/status
```

**Resposta esperada (exemplo simplificado):**
```json
{
  "fluxo": "✅ SoccerDataAPI (PRINCIPAL) → Cache Stale (30min) → Globo",
  "fontes": {
    "api-football": {
      "configurado": false,
      "tipo": "🚫 REMOVIDA",
      "alerta": "Usuário banido / API desabilitada",
      "requisicoes": {
        "atual": 0,
        "limite": 0
      }
    },
    "soccerdata": {
      "configurado": true,
      "tipo": "🟢 PRINCIPAL",
      "limite": "75 req/dia (free)",
      "mensagem": "Fonte principal ativa"
    },
    "cache-stale": {
      "ativo": false,
      "tipo": "fallback-1",
      "maxIdade": "30 min"
    },
    "globo": {
      "configurado": true,
      "tipo": "fallback-final",
      "descricao": "Scraper de agenda"
    }
  },
  "cache": {
    "temJogosAoVivo": true,
    "fonte": "soccerdata",
    "ttlAtual": "2 min"
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
