# Cartola API - Endpoints Completos

Documentação exaustiva de todos os endpoints conhecidos da API oficial do Cartola FC.

Base URL: `https://api.cartola.globo.com`

---

## Índice

1. [Mercado](#1-mercado)
2. [Atletas](#2-atletas)
3. [Times](#3-times)
4. [Ligas](#4-ligas)
5. [Rodadas e Partidas](#5-rodadas-e-partidas)
6. [Clubes](#6-clubes)
7. [Esquemas Táticos](#7-esquemas-táticos)
8. [Patrocinadores](#8-patrocinadores)
9. [Pós-Rodada](#9-pós-rodada)
10. [Endpoints Autenticados (/auth)](#10-endpoints-autenticados)

---

## 1. Mercado

### GET /mercado/status
Status atual do mercado do Cartola.

**Autenticação:** Não requer

**Resposta:**
```json
{
  "rodada_atual": 5,
  "status_mercado": 1,
  "temporada_id": 2026,
  "temporada": 2026,
  "fechamento": {
    "dia": 10,
    "mes": 5,
    "ano": 2026,
    "hora": 19,
    "minuto": 0,
    "timestamp": "2026-05-10T22:00:00.000Z"
  },
  "mercado_aberto": true,
  "aviso": "",
  "game_over": false,
  "times_escalados": 5284302,
  "esquema_default_id": 1
}
```

**Status do Mercado (códigos):**
- `1` = Mercado aberto (pode escalar)
- `2` = Mercado fechado (jogos em andamento)
- `4` = Manutenção
- `6` = Encerrado / Fim de temporada
- `15` = Em atualização

**Uso no projeto:** `cartolaApiService.obterStatusMercado()`

---

### GET /mercado/destaques
Jogadores mais escalados da rodada (antes do fechamento).

**Autenticação:** Não requer

**Resposta:**
```json
[
  {
    "atleta_id": 12345,
    "apelido": "Gabigol",
    "clube_id": 262,
    "posicao_id": 5,
    "escalacoes": 1523000,
    "foto": "https://..."
  }
]
```

---

## 2. Atletas

### GET /atletas/mercado
Retorna TODOS os atletas disponíveis no mercado com dados completos.

**Autenticação:** Não requer

**Resposta (parcial):**
```json
{
  "atletas": [
    {
      "atleta_id": 12345,
      "nome": "Gabriel Barbosa",
      "apelido": "Gabigol",
      "foto": "https://...",
      "clube_id": 262,
      "posicao_id": 5,
      "status_id": 7,
      "pontos_num": 8.5,
      "preco_num": 15.30,
      "variacao_num": 1.20,
      "media_num": 6.75,
      "jogos_num": 10,
      "minimo_para_valorizar": 0,
      "scout": {
        "G": 3,
        "A": 2,
        "FT": 1,
        "FD": 5,
        "FF": 8,
        "FS": 12,
        "PE": 15,
        "FC": 4,
        "CA": 1,
        "DS": 3,
        "SG": 0,
        "GC": 0
      },
      "gato_mestre": {
        "minutos_jogados": 450,
        "media_pontos_mandante": 7.2,
        "media_pontos_visitante": 5.1,
        "media_minutos_jogados": 82
      }
    }
  ],
  "clubes": { ... },
  "posicoes": { ... }
}
```

**Campos importantes dos atletas:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `atleta_id` | Number | ID único do atleta |
| `apelido` | String | Nome popular do jogador |
| `clube_id` | Number | ID do clube atual |
| `posicao_id` | Number | 1-6 (GOL,LAT,ZAG,MEI,ATA,TEC) |
| `status_id` | Number | Status de disponibilidade |
| `pontos_num` | Number | Pontuação última rodada |
| `preco_num` | Number | Preço atual (C$) |
| `variacao_num` | Number | Variação de preço |
| `media_num` | Number | Média de pontos |
| `jogos_num` | Number | Jogos disputados |
| `scout` | Object | Scouts acumulados na temporada |

**Status do Atleta (status_id):**
| ID | Status |
|----|--------|
| 2 | Dúvida |
| 3 | Suspenso |
| 5 | Contundido |
| 6 | Nulo (sem clube) |
| 7 | Provável |
| 12 | Em negociação |

---

### GET /atletas/pontuados
Pontuação dos atletas na rodada atual (em andamento ou recém-finalizada).

**Autenticação:** Não requer

**Resposta:**
```json
{
  "atletas": {
    "12345": {
      "atleta_id": 12345,
      "apelido": "Gabigol",
      "clube_id": 262,
      "posicao_id": 5,
      "pontuacao": 8.5,
      "entrou_em_campo": true,
      "scout": {
        "G": 1,
        "A": 0,
        "FD": 2,
        "FS": 1,
        "PE": 3,
        "DS": 1
      }
    }
  },
  "rodada": 5,
  "clubes": { ... },
  "posicoes": { ... }
}
```

**Nota:** O objeto `atletas` é indexado por `atleta_id` (string), não é um array.

---

### GET /atletas/pontuados/{rodada}
Pontuação dos atletas em rodada específica.

**Parâmetros:**
- `rodada` (path): Número da rodada (1-38)

**Resposta:** Mesma estrutura de `/atletas/pontuados`

**Uso no projeto:** `cartolaApiService.coletarGolsRodadaDireta(ligaId, rodada)`

---

## 3. Times

### GET /times?q={query}
Buscar times por nome do time ou cartoleiro.

**Parâmetros:**
- `q` (query): Texto de busca (mínimo 3 caracteres)

**Autenticação:** Não requer

**Resposta:**
```json
[
  {
    "time_id": 13935277,
    "nome": "Urubu Play F.C.",
    "nome_cartola": "Paulinett Miranda",
    "slug": "urubu-play-f-c",
    "url_escudo_png": "https://...",
    "url_escudo_svg": "https://...",
    "url_camisa_png": "https://...",
    "url_camisa_svg": "https://...",
    "assinante": true,
    "facebook_id": null,
    "cor_fundo": "#FF0000",
    "cor_borda": "#000000",
    "cor_camisa": "#FF0000",
    "patrimonio": 250.50
  }
]
```

**Uso no projeto:** `cartolaApiService.buscarTimePorNome(query)`

---

### GET /time/id/{time_id}
Dados completos de um time específico (escalação atual).

**Parâmetros:**
- `time_id` (path): ID numérico do time

**Autenticação:** Não requer

**Exemplo de teste:** `GET /time/id/13935277` (Paulinett Miranda)

**Resposta:**
```json
{
  "time": {
    "time_id": 13935277,
    "clube_id": 262,
    "esquema_id": 1,
    "nome": "Urubu Play F.C.",
    "nome_cartola": "Paulinett Miranda",
    "slug": "urubu-play-f-c",
    "url_escudo_png": "https://...",
    "url_escudo_svg": "https://...",
    "url_camisa_png": "https://...",
    "url_camisa_svg": "https://...",
    "assinante": true,
    "patrimonio": 250.50,
    "pontos_campeonato": 125.75,
    "pontos_cartoleiro": 0,
    "rodada_time_id": 48372625,
    "temporada_id": 2026,
    "cor_fundo": "#FF0000",
    "cor_borda": "#000000",
    "cor_camisa": "#FF0000",
    "foto_perfil": "https://..."
  },
  "atletas": [
    {
      "atleta_id": 12345,
      "apelido": "Jogador X",
      "clube_id": 262,
      "posicao_id": 5,
      "pontos_num": 8.5,
      "preco_num": 15.30,
      "scout": { "G": 1 },
      "foto": "https://..."
    }
  ],
  "esquema_id": 1,
  "pontos": 62.30,
  "patrimonio": 250.50,
  "valor_time": 125.80,
  "rodada_atual": 5,
  "capitao_id": 12345
}
```

**Campos do time:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `time_id` | Number | ID único do time |
| `clube_id` | Number | Time do coração (262=Flamengo, etc) |
| `esquema_id` | Number | Formação tática (1=4-3-3, etc) |
| `assinante` | Boolean | Se é Cartola PRO |
| `patrimonio` | Number | Patrimônio total em C$ |
| `pontos_campeonato` | Number | Pontos totais na temporada |
| `capitao_id` | Number | ID do atleta capitão |

**Uso no projeto:** `cartolaApiService.buscarTimePorId(timeId)` e `buscarTimePorIdCompleto(timeId)`

---

### GET /time/id/{time_id}/{rodada}
Dados do time em rodada específica (escalação e pontuação daquela rodada).

**Parâmetros:**
- `time_id` (path): ID do time
- `rodada` (path): Número da rodada (1-38)

**Resposta:** Mesma estrutura de `/time/id/{id}`, mas com dados da rodada específica.

**Uso no projeto:** `cartolaApiService.obterDadosTimeRodada(timeId, rodada)`

---

### GET /time/slug/{slug}
Dados do time pelo slug (URL-friendly).

**Parâmetros:**
- `slug` (path): Slug do time (ex: "urubu-play-f-c")

**Resposta:** Mesma estrutura de `/time/id/{id}`

---

### GET /time/slug/{slug}/{rodada}
Dados do time por slug em rodada específica.

---

## 4. Ligas

### GET /ligas?q={query}
Buscar ligas por nome.

**Parâmetros:**
- `q` (query): Texto de busca

**Autenticação:** Não requer

**Resposta:**
```json
[
  {
    "liga_id": 12345,
    "nome": "SuperCartola",
    "slug": "supercartola",
    "descricao": "Liga dos amigos",
    "tipo": "classico",
    "mata_mata": false,
    "total_times_liga": 32,
    "imagem": "https://...",
    "dono": {
      "time_id": 13935277,
      "nome": "Urubu Play F.C.",
      "nome_cartola": "Paulinett Miranda"
    }
  }
]
```

---

### GET /liga/{slug}
Dados completos de uma liga (pública).

**Parâmetros:**
- `slug` (path): Slug ou ID da liga

**Resposta:**
```json
{
  "liga": {
    "liga_id": 12345,
    "nome": "SuperCartola",
    "slug": "supercartola",
    "descricao": "...",
    "tipo": "classico",
    "mata_mata": false,
    "total_times_liga": 32
  },
  "times": [
    {
      "time_id": 13935277,
      "nome": "Urubu Play F.C.",
      "nome_cartola": "Paulinett Miranda",
      "slug": "urubu-play-f-c",
      "pontos": {
        "campeonato": 125.75,
        "rodada": 62.30
      },
      "assinante": true
    }
  ],
  "rodada_atual": 5
}
```

**Uso no projeto:** `cartolaApiService.obterTimesLiga(ligaId)`

---

### GET /auth/liga/{slug}
Liga com dados completos (requer autenticação para ligas privadas).

**Autenticação:** `X-GLB-Token` header

---

### GET /auth/ligas
Todas as ligas do usuário logado.

**Autenticação:** `X-GLB-Token` header

---

## 5. Rodadas e Partidas

### GET /rodadas
Lista das 38 rodadas do campeonato.

**Resposta:**
```json
[
  {
    "rodada_id": 1,
    "inicio": "2026-04-25T00:00:00.000Z",
    "fim": "2026-04-28T00:00:00.000Z"
  },
  {
    "rodada_id": 2,
    "inicio": "2026-05-02T00:00:00.000Z",
    "fim": "2026-05-05T00:00:00.000Z"
  }
]
```

---

### GET /partidas
Partidas da rodada atual.

**Resposta:**
```json
{
  "rodada": 5,
  "partidas": [
    {
      "partida_id": 12345,
      "clube_casa_id": 262,
      "clube_visitante_id": 263,
      "clube_casa_posicao": 3,
      "clube_visitante_posicao": 7,
      "placar_oficial_mandante": null,
      "placar_oficial_visitante": null,
      "aproveitamento_mandante": ["v", "v", "d", "e", "v"],
      "aproveitamento_visitante": ["d", "v", "v", "v", "e"],
      "partida_data": "2026-05-10T19:00:00.000Z",
      "local": "Maracanã",
      "valida": true,
      "transmissao": null
    }
  ]
}
```

---

### GET /partidas/{rodada}
Partidas de rodada específica.

**Parâmetros:**
- `rodada` (path): Número da rodada (1-38)

---

## 6. Clubes

### GET /clubes
Todos os clubes do Brasileirão com dados completos.

**Resposta:**
```json
{
  "262": {
    "id": 262,
    "nome": "Flamengo",
    "abreviacao": "FLA",
    "slug": "flamengo",
    "escudos": {
      "60x60": "https://...",
      "45x45": "https://...",
      "30x30": "https://..."
    },
    "nome_fantasia": "Flamengo"
  },
  "263": {
    "id": 263,
    "nome": "Botafogo",
    "abreviacao": "BOT",
    "slug": "botafogo",
    "escudos": { ... }
  }
}
```

**Clubes Brasileirão Série A (IDs oficiais API Cartola):**
| ID | Clube |
|----|-------|
| 262 | Flamengo |
| 263 | Botafogo |
| 264 | Corinthians |
| 265 | Bahia |
| 266 | Fluminense |
| 267 | Vasco |
| 275 | Palmeiras |
| 276 | São Paulo |
| 277 | Santos |
| 280 | Bragantino |
| 282 | Atlético-MG |
| 283 | Cruzeiro |
| 284 | Grêmio |
| 285 | Internacional |
| 286 | Juventude |
| 287 | Vitória |
| 290 | Goiás |
| 292 | Sport |
| 293 | Athletico-PR |
| 354 | Ceará |
| 356 | Fortaleza |
| 1371 | Cuiabá |
| 2305 | Mirassol |

---

## 7. Esquemas Táticos

### GET /esquemas
Formações táticas disponíveis.

**Resposta:**
```json
[
  {
    "esquema_id": 1,
    "nome": "4-3-3",
    "posicoes": {
      "gol": 1,
      "lat": 2,
      "zag": 2,
      "mei": 3,
      "ata": 3,
      "tec": 1
    }
  },
  {
    "esquema_id": 2,
    "nome": "4-4-2",
    "posicoes": {
      "gol": 1,
      "lat": 2,
      "zag": 2,
      "mei": 4,
      "ata": 2,
      "tec": 1
    }
  },
  {
    "esquema_id": 3,
    "nome": "4-5-1",
    "posicoes": { ... }
  },
  {
    "esquema_id": 4,
    "nome": "3-4-3",
    "posicoes": { ... }
  },
  {
    "esquema_id": 5,
    "nome": "3-5-2",
    "posicoes": { ... }
  },
  {
    "esquema_id": 6,
    "nome": "5-3-2",
    "posicoes": { ... }
  },
  {
    "esquema_id": 7,
    "nome": "5-4-1",
    "posicoes": { ... }
  }
]
```

---

## 8. Patrocinadores

### GET /patrocinadores
Lista de patrocinadores do Cartola.

---

## 9. Pós-Rodada

### GET /pos-rodada/destaques
Time com maior pontuação da última rodada finalizada.

**Resposta:**
```json
{
  "mpiores_time": {
    "time_id": 13935277,
    "nome": "Urubu Play F.C.",
    "nome_cartola": "Paulinett Miranda",
    "pontos": 125.30
  },
  "media_cartoleiros": 45.20,
  "media_parciais": 52.10
}
```

---

## 10. Endpoints Autenticados

Todos requerem header `X-GLB-Token`.

### GET /auth/time
Retorna o time do usuário autenticado com escalação atual.

### GET /auth/time/info
Informações detalhadas do time do usuário.

### POST /auth/time/salvar
Salva escalação do time.

**Body:**
```json
{
  "esquema": 1,
  "atleta": [12345, 23456, 34567, 45678, 56789, 67890, 78901, 89012, 90123, 12340, 23450, 34560]
}
```

**Notas:**
- Array `atleta` deve ter exatamente 12 IDs (11 titulares + 1 técnico)
- `esquema` é o ID da formação tática
- Só funciona com mercado aberto (status_mercado = 1)

### GET /auth/ligas
Ligas do usuário logado.

### GET /auth/liga/{slug}
Liga específica com dados privados.

---

## Códigos de Erro Comuns

| Status | Significado | Ação |
|--------|-------------|------|
| 200 | OK | - |
| 401 | Token inválido/expirado | Renovar token |
| 403 | Acesso negado (liga privada) | Verificar permissões |
| 404 | Recurso não encontrado | Time/liga inexistente |
| 429 | Rate limit | Aguardar e retry |
| 500 | Erro interno Cartola | Retry com backoff |
| 503 | API em manutenção | Aguardar |

---

## Rate Limiting e Boas Práticas

1. **Delay entre requests:** Mínimo 200ms entre chamadas sequenciais
2. **Cache agressivo:** Dados de rodadas passadas são imutáveis → cache longo
3. **Retry com backoff:** 1s, 2s, 4s para erros 5xx
4. **Horário de pico:** Sábado/Domingo antes do fechamento = API mais lenta
5. **User-Agent:** Sempre enviar para evitar bloqueio
