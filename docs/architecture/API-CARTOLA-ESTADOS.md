# API Cartola FC - Guia de Estados e Sincronização

> **Atualizado:** 28 de janeiro de 2026
> **Versão:** 1.0.0

## Visão Geral

Este documento descreve como o sistema Super Cartola Manager sincroniza com a API oficial do Cartola FC e interpreta os diferentes estados de rodadas e temporadas.

---

## 1. Endpoint Principal: `/mercado/status`

**URL:** `https://api.cartola.globo.com/mercado/status`

**Responsabilidade:** Fonte única da verdade sobre o estado atual do mercado e rodadas.

**Campos retornados:**

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `rodada_atual` | Number | Número da rodada atual (1-38) | `15` |
| `status_mercado` | Number | Código de status do mercado (1-6) | `1` |
| `temporada` | Number | Ano da temporada | `2026` |
| `fechamento` | Object | Data/hora do próximo fechamento | `{ dia: 28, mes: 1, ... }` |
| `game_over` | Boolean | Se temporada encerrou | `false` |

---

## 2. Códigos de Status do Mercado

| Código | Nome | Descrição | Ações no Sistema |
|--------|------|-----------|------------------|
| **1** | ABERTO | Mercado recebendo escalações | ✅ Participantes podem escalar<br>📊 Rodada atual em preparação<br>💾 Rodada anterior consolidada |
| **2** | FECHADO | Mercado fechado, aguardando | ❌ Não aceita escalações<br>⏳ Pode estar em parciais ou aguardando |
| **3** | DESBLOQUEADO | Mercado reaberto após fechamento | ✅ Aceita escalações novamente |
| **4** | ENCERRADO | Rodada encerrada | ❌ Escalação bloqueada<br>📊 Dados sendo consolidados |
| **5** | FUTURO | Rodada futura | ⏳ Aguardando |
| **6** | TEMPORADA_ENCERRADA | Campeonato finalizado | 🔒 Circuit breaker ativo<br>💾 Todos os caches permanentes |

---

## 3. Estados de uma Rodada

### 3.1 Fluxo Completo

```
┌────────────────────────────────────────────────────────┐
│ SEGUNDA (antes do jogo)                                │
│ - Mercado: ABERTO (status=1)                           │
│ - API rodada_atual: 15                                 │
│ - Ação: Participantes escalando para R15               │
│ - Sistema: R14 consolidada, R15 em preparação          │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│ QUINTA (jogos começando)                                │
│ - Mercado: FECHADO (status=2)                          │
│ - API rodada_atual: 15                                 │
│ - Ação: Parciais atualizando em tempo real            │
│ - Sistema: R15 com dados voláteis (não cachear)        │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│ DOMINGO (noite - tudo encerrado)                        │
│ - Mercado: ENCERRADO (status=4) ou virou para R16     │
│ - API rodada_atual: 15 ou 16                           │
│ - Ação: Consolidação de dados                          │
│ - Sistema: Salva R15 como consolidada                  │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│ SEGUNDA (próxima semana)                                │
│ - Mercado: ABERTO (status=1)                           │
│ - API rodada_atual: 16                                 │
│ - Ação: Ciclo recomeça para R16                        │
└────────────────────────────────────────────────────────┘
```

### 3.2 Estados Possíveis

| Estado | Quando ocorre | Cache | Processar? |
|--------|---------------|-------|------------|
| **futura** | `rodada > rodadaAtual` | ❌ Não | ❌ Não |
| **em_andamento** | `rodada === rodadaAtual && status=1` | ⏳ Volátil | ✅ Sim |
| **parciais** | `rodada === rodadaAtual && status=2` | ⏳ Volátil | ✅ Sim (tempo real) |
| **consolidada** | `rodada < rodadaAtual` | ✅ Permanente | ✅ Sim |
| **encerrada** | `status_mercado === 6` | ✅ Permanente | ❌ Não |

---

## 4. Detecção de Pré-Temporada

### 4.1 Condições

Pré-temporada é detectada quando:
- `rodada_atual === 1`
- `status_mercado !== 1` (mercado fechado)
- `temporada > temporadaSelecionada` (API virou para novo ano)

**Exemplo real (Janeiro 2026):**
```json
{
  "rodada_atual": 1,
  "status_mercado": 2,
  "temporada": 2026,
  "game_over": false
}
```

### 4.2 Comportamento do Sistema

Durante pré-temporada:
- ✅ Módulos default funcionam (Rodadas, Ranking, Extrato)
- ❌ Módulos opcionais bloqueados (Top 10, Pontos Corridos)
- 💰 Cálculos financeiros usam temporada anterior
- 📋 Exibe inscrições e renovações
- ⚠️ Não tenta buscar rodadas inexistentes

---

## 5. Consolidação de Rodadas

### 5.1 Quando Consolidar

Uma rodada é consolidada quando:
1. `rodadaAtual` na API avançou (ex: era 15, agora é 16)
2. Todos os jogos da rodada anterior terminaram
3. Pontuações finais foram divulgadas

### 5.2 Processo de Consolidação

```
┌─────────────────────────────────────────┐
│ 1. Detectar rodada consolidada          │
│    (rodadaAtual > ultimaProcessada)      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 2. Buscar dados finais da API           │
│    GET /atletas/pontuados/{rodada}       │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 3. Salvar em RodadaSnapshot              │
│    (dados imutáveis, permanentes)        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 4. Calcular extratos financeiros         │
│    (bônus/ônus por posição)              │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 5. Backup em Data Lake                   │
│    (CartolaOficialDump)                  │
└─────────────────────────────────────────┘
```

---

## 6. Sistema de Cache

### 6.1 Estratégia por Endpoint

| Endpoint | TTL | Quando Invalidar |
|----------|-----|------------------|
| `/mercado/status` | 5 min | A cada fechamento de mercado |
| `/atletas/pontuados/{rodada}` | 30 min | Quando rodada consolidar |
| `/time/id/{timeId}` | 1h | Raramente (dados estáticos) |
| `/liga/{ligaId}` | 10 min | Quando participante entra/sai |

### 6.2 Cache Permanente

Dados que **NUNCA** expiram:
- Rodadas consolidadas (< rodadaAtual)
- Temporadas encerradas (status=6)
- Extratos de temporadas históricas

---

## 7. Módulos e Dependências

### 7.1 Módulos que Dependem do Status

| Módulo | Depende de | Bloqueado quando |
|--------|-----------|------------------|
| **Rodadas** | `rodada_atual` | Pré-temporada sem dados |
| **Ranking** | `rodada_atual` | Pré-temporada |
| **Top 10** | `rodada_atual` | Pré-temporada + não configurado |
| **Extrato** | `rodada_atual` + acertos | Nunca (sempre ativo) |
| **Parciais** | `status_mercado=2` | Mercado aberto ou encerrado |
| **Pontos Corridos** | Confrontos consolidados | Pré-temporada + não configurado |

### 7.2 Módulos Default vs Opcionais

**Sempre ativos (default):**
- Rodadas
- Ranking
- Extrato
- Parciais/Ao Vivo

**Bloqueados até admin configurar:**
- Top 10 (Mito/Mico)
- Pontos Corridos
- Mata-Mata
- Melhor Mês
- Artilheiro
- Luva de Ouro
- Campinho
- Dicas

---

## 8. Troubleshooting

### 8.1 Rodadas Não Aparecem

**Sintoma:** Frontend não mostra rodadas processadas

**Diagnóstico:**
```bash
# 1. Verificar status da API
curl http://localhost:3000/api/cartola/mercado/status

# 2. Verificar endpoint de debug
curl http://localhost:3000/api/cartola/status/debug

# 3. Verificar banco de dados
db.rodadas.find({ temporada: 2026 }).count()
```

**Causas comuns:**
- Pré-temporada (rodada 1 sem dados)
- Cache desatualizado
- API Cartola instável

### 8.2 Módulos Bloqueados

**Sintoma:** Participante vê mensagem "Aguardando início"

**Causa:** Status `'preparando'` em `participante-config.js`

**Solução:**
- Se temporada começou: Admin deve configurar módulos por liga
- Se temporada não começou: Comportamento correto (manter bloqueado)

### 8.3 Extratos Zerados

**Sintoma:** Saldo mostra R$ 0,00 para todos

**Diagnóstico:**
```bash
# Verificar cache financeiro
db.extratofinanceirocaches.find({
  liga_id: "...",
  temporada: 2026
})
```

**Causas comuns:**
- Pré-temporada (sem rodadas consolidadas)
- Cache não foi gerado
- Temporada selecionada errada

---

## 9. Arquivos de Referência

| Arquivo | Função |
|---------|--------|
| `services/cartolaApiService.js` | Consumo da API + cache |
| `public/js/core/season-status-manager.js` | Centralizador de status (frontend) |
| `config/seasons.js` | Configuração de temporada (backend) |
| `utils/seasonGuard.js` | Circuit breaker para temporada encerrada |
| `routes/cartola.js` | Endpoints de status e debug |
| `controllers/consolidacaoController.js` | Consolidação de rodadas |

---

## 10. Endpoint de Debug

**URL:** `GET /api/cartola/status/debug`

**Retorna:**
```json
{
  "timestamp": "2026-01-28T...",
  "api_cartola": {
    "rodada_atual": 1,
    "status_mercado": 2,
    "mercado_aberto": false,
    "temporada": 2026,
    "_descricao_status": "FECHADO - Mercado fechado"
  },
  "deteccao_rodadas": {
    "ultima_rodada_com_dados": 1,
    "metodo": "detectarUltimaRodadaComDados()"
  },
  "season_guard": {
    "ativo": false,
    "descricao": "Temporada ativa - API normal"
  },
  "backend_config": {
    "season": 2026,
    "status": "ativa",
    "rodada_inicial": 1,
    "rodada_final": 38
  },
  "cache_info": { /* estatísticas */ }
}
```

---

## 11. Changelog

### 2026-01-28 - v1.0.0
- ✅ Criação do guia completo de estados
- ✅ Documentação de fluxo de consolidação
- ✅ Seção de troubleshooting
- ✅ Endpoint de debug `/status/debug`

---

## 12. Recursos Externos

- **API Cartola FC:** https://api.cartola.globo.com/
- **Documentação Comunitária:** https://github.com/henriquepgomide/caRtola
- **Super Cartola Manager:** Repositório privado

---

**Dúvidas?** Consulte o arquivo `CLAUDE.md` seção "Pré-Temporada (Conceito Crítico)".
