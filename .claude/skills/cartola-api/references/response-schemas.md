# Cartola API - Response Schemas & Estruturas de Dados

Referência completa das estruturas JSON retornadas pela API do Cartola FC.

---

## Índice

1. [Atleta (Mercado)](#1-atleta-mercado)
2. [Atleta (Pontuado)](#2-atleta-pontuado)
3. [Time](#3-time)
4. [Liga](#4-liga)
5. [Clube](#5-clube)
6. [Rodada](#6-rodada)
7. [Partida](#7-partida)
8. [Scout (Detalhamento)](#8-scout)
9. [Gato Mestre (PRO)](#9-gato-mestre)
10. [Mapeamentos e Enums](#10-mapeamentos-e-enums)

---

## 1. Atleta (Mercado)

Retornado por `GET /atletas/mercado`

```typescript
interface AtletaMercado {
  atleta_id: number;           // ID único
  nome: string;                // Nome completo
  apelido: string;             // Nome popular (exibição)
  foto: string;                // URL foto do jogador
  clube_id: number;            // ID do clube (262=Flamengo)
  posicao_id: number;          // 1=GOL, 2=LAT, 3=ZAG, 4=MEI, 5=ATA, 6=TEC
  status_id: number;           // 7=Provável, 2=Dúvida, 3=Suspenso, 5=Contundido
  pontos_num: number;          // Pontuação última rodada
  preco_num: number;           // Preço atual em Cartoletas (C$)
  variacao_num: number;        // Variação de preço
  media_num: number;           // Média de pontos no campeonato
  jogos_num: number;           // Total de jogos disputados
  minimo_para_valorizar: number; // Pontuação mínima para valorizar
  scout: Scout;                // Scouts acumulados da temporada
  gato_mestre?: GatoMestre;    // Dados PRO (se disponível)
}
```

---

## 2. Atleta (Pontuado)

Retornado por `GET /atletas/pontuados` e `GET /atletas/pontuados/{rodada}`

```typescript
// ATENÇÃO: O retorno é um OBJETO indexado por atleta_id (string), NÃO um array
interface AtletasPontuados {
  atletas: {
    [atleta_id: string]: AtletaPontuado;
  };
  rodada: number;
  clubes: { [id: string]: Clube };
  posicoes: { [id: string]: Posicao };
}

interface AtletaPontuado {
  atleta_id: number;
  apelido: string;
  clube_id: number;
  posicao_id: number;
  pontuacao: number;           // Pontos nesta rodada
  entrou_em_campo: boolean;    // Se jogou
  scout: Scout;                // Scouts DESTA rodada (não acumulado)
}
```

**Cuidado:** `atletas` é objeto (map), não array. Iterar com `Object.entries()` ou `Object.keys()`.

---

## 3. Time

Retornado por `GET /time/id/{id}`, `GET /time/slug/{slug}`

```typescript
interface TimeResponse {
  time: TimeInfo;
  atletas: AtletaEscalado[];
  esquema_id: number;
  pontos: number;              // Pontos totais
  patrimonio: number;          // Patrimônio em C$
  valor_time: number;          // Valor total do time
  rodada_atual: number;
  capitao_id: number;          // ID do atleta capitão (pontua em dobro)
}

interface TimeInfo {
  time_id: number;             // ID único do time
  clube_id: number;            // Time do coração do cartoleiro
  esquema_id: number;          // Formação tática
  nome: string;                // Nome do time
  nome_cartola: string;        // Nome do cartoleiro
  slug: string;                // Slug URL-friendly
  url_escudo_png: string;
  url_escudo_svg: string;
  url_camisa_png: string;
  url_camisa_svg: string;
  assinante: boolean;          // Se é Cartola PRO
  patrimonio: number;
  pontos_campeonato: number;   // Pontos totais na temporada
  pontos_cartoleiro: number;
  rodada_time_id: number;      // ID da escalação na rodada
  temporada_id: number;
  cor_fundo: string;           // Hex color
  cor_borda: string;
  cor_camisa: string;
  foto_perfil: string;         // URL foto do cartoleiro
}

interface AtletaEscalado {
  atleta_id: number;
  apelido: string;
  clube_id: number;
  posicao_id: number;
  pontos_num: number;
  preco_num: number;
  scout: Scout;
  foto: string;
}
```

### Participante de Teste (Paulinett)

```bash
# Buscar dados atuais
curl -s "https://api.cartola.globo.com/time/id/13935277" | jq '.time'

# Buscar rodada específica
curl -s "https://api.cartola.globo.com/time/id/13935277/5" | jq '.pontos'

# Buscar por nome
curl -s "https://api.cartola.globo.com/times?q=Paulinett" | jq '.[0]'
```

---

## 4. Liga

Retornado por `GET /liga/{slug}`

```typescript
interface LigaResponse {
  liga: LigaInfo;
  times: TimeLiga[];
  rodada_atual: number;
}

interface LigaInfo {
  liga_id: number;
  nome: string;
  slug: string;
  descricao: string;
  tipo: string;                // "classico" | "mata_mata"
  mata_mata: boolean;
  total_times_liga: number;
  imagem: string;
  dono: {
    time_id: number;
    nome: string;
    nome_cartola: string;
  };
}

interface TimeLiga {
  time_id: number;
  nome: string;
  nome_cartola: string;
  slug: string;
  pontos: {
    campeonato: number;
    rodada: number;
  };
  assinante: boolean;
  url_escudo_png: string;
  url_escudo_svg: string;
}
```

---

## 5. Clube

Retornado por `GET /clubes`

```typescript
// ATENÇÃO: Retorno é OBJETO indexado por clube_id, NÃO array
interface ClubesResponse {
  [clube_id: string]: Clube;
}

interface Clube {
  id: number;
  nome: string;                // "Flamengo"
  abreviacao: string;          // "FLA"
  slug: string;                // "flamengo"
  nome_fantasia: string;
  escudos: {
    "60x60": string;
    "45x45": string;
    "30x30": string;
  };
}
```

---

## 6. Rodada

Retornado por `GET /rodadas`

```typescript
interface Rodada {
  rodada_id: number;           // 1-38
  inicio: string;              // ISO 8601
  fim: string;                 // ISO 8601
}
```

---

## 7. Partida

Retornado por `GET /partidas` e `GET /partidas/{rodada}`

```typescript
interface PartidasResponse {
  rodada: number;
  partidas: Partida[];
}

interface Partida {
  partida_id: number;
  clube_casa_id: number;
  clube_visitante_id: number;
  clube_casa_posicao: number;
  clube_visitante_posicao: number;
  placar_oficial_mandante: number | null;
  placar_oficial_visitante: number | null;
  aproveitamento_mandante: string[];    // ["v", "d", "e", "v", "v"]
  aproveitamento_visitante: string[];
  partida_data: string;                 // ISO 8601
  local: string;                        // "Maracanã"
  valida: boolean;
  transmissao: object | null;
}
```

---

## 8. Scout

Objeto presente em múltiplos endpoints (`atletas`, `times`).

```typescript
interface Scout {
  // Ofensivos (positivos)
  G?: number;     // Gol (+8.0)
  A?: number;     // Assistência (+5.0)
  FT?: number;    // Finalização na trave (+3.5)
  FD?: number;    // Finalização defendida (+1.2)
  FF?: number;    // Finalização pra fora (+0.8)
  FS?: number;    // Falta sofrida (+0.5)
  PC?: number;    // Passes completos >30 (+0.3)

  // Defensivos (positivos)
  SG?: number;    // Sem gol sofrido - clean sheet (+5.0)
  DD?: number;    // Defesa difícil (+3.0)
  DP?: number;    // Defesa de pênalti (+7.0)
  DS?: number;    // Desarme (+1.2)

  // Negativos
  PE?: number;    // Passes errados (-0.3)
  I?: number;     // Impedimento (-0.1)
  FC?: number;    // Falta cometida (-0.3)
  GC?: number;    // Gol contra (-3.0)
  CV?: number;    // Cartão vermelho (-3.0)
  CA?: number;    // Cartão amarelo (-1.0)
  GS?: number;    // Gol sofrido (-1.0)
  PP?: number;    // Pênalti perdido (-4.0)
}
```

### Cálculo de Pontuação

```javascript
function calcularPontuacao(scout) {
  const PESOS = {
    G: 8.0, A: 5.0, FT: 3.5, FD: 1.2, FF: 0.8, FS: 0.5, PC: 0.3,
    SG: 5.0, DD: 3.0, DP: 7.0, DS: 1.2,
    PE: -0.3, I: -0.1, FC: -0.3, GC: -3.0, CV: -3.0, CA: -1.0,
    GS: -1.0, PP: -4.0
  };

  let pontos = 0;
  for (const [sigla, quantidade] of Object.entries(scout)) {
    if (PESOS[sigla]) {
      pontos += PESOS[sigla] * quantidade;
    }
  }
  return Number(pontos.toFixed(1));
}
```

### Capitão

O jogador marcado como `capitao_id` no time tem sua pontuação **DOBRADA**. Esse cálculo é feito automaticamente pela API.

---

## 9. Gato Mestre

Dados adicionais para assinantes PRO.

```typescript
interface GatoMestre {
  minutos_jogados: number;
  media_pontos_mandante: number;
  media_pontos_visitante: number;
  media_minutos_jogados: number;
}
```

---

## 10. Mapeamentos e Enums

### Posições
```javascript
const POSICOES = {
  1: { nome: 'Goleiro',   abreviacao: 'GOL' },
  2: { nome: 'Lateral',   abreviacao: 'LAT' },
  3: { nome: 'Zagueiro',  abreviacao: 'ZAG' },
  4: { nome: 'Meia',      abreviacao: 'MEI' },
  5: { nome: 'Atacante',  abreviacao: 'ATA' },
  6: { nome: 'Técnico',   abreviacao: 'TEC' }
};
```

### Status do Atleta
```javascript
const STATUS_ATLETA = {
  2:  'Dúvida',
  3:  'Suspenso',
  5:  'Contundido',
  6:  'Nulo',           // Sem clube
  7:  'Provável',       // OK para escalar
  12: 'Em negociação'
};
```

### Status do Mercado
```javascript
const STATUS_MERCADO = {
  1:  'Mercado aberto',
  2:  'Mercado fechado',
  4:  'Manutenção',
  6:  'Encerrado',
  15: 'Atualizando'
};
```

### Esquemas Táticos
```javascript
const ESQUEMAS = {
  1: '4-3-3',   // gol:1, lat:2, zag:2, mei:3, ata:3, tec:1
  2: '4-4-2',   // gol:1, lat:2, zag:2, mei:4, ata:2, tec:1
  3: '4-5-1',   // gol:1, lat:2, zag:2, mei:5, ata:1, tec:1
  4: '3-4-3',   // gol:1, lat:0, zag:3, mei:4, ata:3, tec:1
  5: '3-5-2',   // gol:1, lat:0, zag:3, mei:5, ata:2, tec:1
  6: '5-3-2',   // gol:1, lat:2, zag:3, mei:3, ata:2, tec:1
  7: '5-4-1'    // gol:1, lat:2, zag:3, mei:4, ata:1, tec:1
};
```

### Aproveitamento (Partidas)
```javascript
const APROVEITAMENTO = {
  'v': 'Vitória',
  'd': 'Derrota',
  'e': 'Empate'
};
```

---

## Dicas de Uso no Projeto

### Normalização de IDs
```javascript
// A API retorna time_id como Number, mas algumas respostas podem ser String
// Sempre converter para Number ao comparar
const timeId = parseInt(response.data.time.time_id);
```

### Verificando se time escalou na rodada
```javascript
// Se /time/id/{id}/{rodada} retorna 404 → time não escalou
// Se retorna dados mas atletas está vazio → time não escalou
const escalou = response?.atletas?.length > 0;
```

### Cache de rodadas passadas
```javascript
// Rodadas passadas são IMUTÁVEIS → cache longo (1h+)
// Rodada atual pode mudar → cache curto (5min)
const ttl = rodada < rodadaAtual ? 3600 : 300;
cache.set(key, data, ttl);
```
