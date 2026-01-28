# PRD: Módulo Dicas Premium

**Versão:** 1.0
**Data:** 2026-01-28
**Autor:** Claude Code
**Status:** Draft

---

## 1. Visão Geral

### 1.1 Problema
Os participantes do Super Cartola Manager não têm acesso a ferramentas de análise avançada para montar seus times no Cartola FC. Atualmente dependem de sites externos como Cartola Analítico, Cartola FC Brasil, Cartomante FC, entre outros, para obter estatísticas e dicas de escalação.

### 1.2 Solução
Criar um **Módulo Dicas Premium** integrado ao Super Cartola Manager que ofereça:
- Estatísticas avançadas de jogadores
- Sistema de dicas por posição com filtros inteligentes
- Cálculos de valorização (MPV)
- Análise de confrontos
- Sugestões de escalação baseadas em dados

### 1.3 Proposta de Valor
> "Monte seu time campeão com análises profissionais sem sair do Super Cartola"

### 1.4 Público-Alvo
- Participantes de ligas que querem vantagem competitiva
- Cartoleiros que valorizam análise de dados
- Ligas premium que buscam diferenciais

---

## 2. Análise de Mercado

### 2.1 Benchmark - Principais Concorrentes

| Plataforma | Pontos Fortes | Pontos Fracos |
|------------|---------------|---------------|
| **Cartola Analítico** | Filtros por posição, ordenação flexível, tabelas interativas | Requer JS, UX básica |
| **Cartola FC Brasil** | Histórico desde 2016, scouts detalhados, galerias visuais | Muita informação, pode confundir |
| **Cartomante FC** | IA/Delivery automático, curso, comunidade | Pago (R$130-170/ano) |
| **Capitão Cartoleiro** | 100% grátis, odds de apostas, comparador | Sem comunidade |
| **Super Scouts** | Média 90min, posição real, pontuação cedida | Pago, nicho |
| **Cartola Draft** | IA gratuita, sem cadastro, sem ads | Novo, menos dados históricos |
| **Smartola** | App com IA, fórum integrado | Interface menos fluida |

### 2.2 Funcionalidades-Chave do Mercado

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCIONALIDADES ESSENCIAIS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 ESTATÍSTICAS                                                │
│  ├── Scouts positivos/negativos detalhados                      │
│  ├── Média por jogo vs Média 90 minutos                         │
│  ├── MPV (Mínimo para Valorizar)                                │
│  ├── Histórico últimas N rodadas                                │
│  └── Posição real vs posição Cartola                            │
│                                                                 │
│  🎯 FILTROS E ORDENAÇÃO                                         │
│  ├── Por posição (GOL, ZAG, LAT, MEI, ATA, TEC)                 │
│  ├── Por preço (faixa de cartoletas)                            │
│  ├── Por média/scouts específicos                               │
│  ├── Por clube/adversário                                       │
│  └── Mando de campo (casa/fora)                                 │
│                                                                 │
│  ⚔️ ANÁLISE DE CONFRONTOS                                       │
│  ├── Pontuação cedida por time (por posição)                    │
│  ├── Histórico contra adversário                                │
│  ├── Desfalques/suspensões                                      │
│  └── Probabilidades (gol, assistência, SG)                      │
│                                                                 │
│  🤖 AUTOMAÇÃO/IA                                                │
│  ├── Sugestão de time por patrimônio                            │
│  ├── Comparador lado a lado                                     │
│  ├── Alertas de oportunidades                                   │
│  └── Escalação otimizada por objetivo                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Modelo de Scouts do Cartola FC

#### Scouts Positivos
| Scout | Descrição | Pontos |
|-------|-----------|--------|
| G | Gol | +8.0 |
| A | Assistência | +5.0 |
| SG | Saldo de Gols (sem sofrer gol) | +5.0 |
| DS | Desarme | +1.5 |
| FS | Falta Sofrida | +0.5 |
| FF | Finalização para Fora | +0.8 |
| FD | Finalização Defendida | +1.2 |
| FT | Finalização na Trave | +3.0 |
| PS | Pênalti Sofrido | +1.0 |
| DE | Defesa (goleiro) | +1.3 |
| DP | Defesa de Pênalti | +7.0 |

#### Scouts Negativos
| Scout | Descrição | Pontos |
|-------|-----------|--------|
| GC | Gol Contra | -3.0 |
| CV | Cartão Vermelho | -3.0 |
| CA | Cartão Amarelo | -1.0 |
| GS | Gol Sofrido | -1.0 |
| PP | Pênalti Perdido | -4.0 |
| PC | Pênalti Cometido | -1.0 |
| FC | Falta Cometida | -0.3 |
| I | Impedimento | -0.1 |

---

## 3. Especificação Funcional

### 3.1 Módulo: Dicas por Posição

#### 3.1.1 Interface Principal
```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 DICAS PREMIUM - Rodada 15                      [Atualizar]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ FILTROS                                                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Posição:  [GOL] [ZAG] [LAT] [MEI] [ATA] [TEC]           │   │
│  │                                                          │   │
│  │ Ordenar:  [▼ Média] [Preço] [MPV] [Scouts+] [Scouts-]   │   │
│  │                                                          │   │
│  │ Preço:    C$ [___] até C$ [___]   [x] Só valorização    │   │
│  │                                                          │   │
│  │ Mando:    [Todos] [Casa] [Fora]                         │   │
│  │                                                          │   │
│  │ [🔍 Filtrar]                          [↻ Limpar Filtros] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ RESULTADOS - Atacantes (47 jogadores)                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ # │ Jogador      │ Clube │ C$    │ Média │ MPV  │ Próx  │   │
│  │───┼──────────────┼───────┼───────┼───────┼──────┼───────│   │
│  │ 1 │ Pedro        │ FLA   │ 18.50 │ 7.82  │ 4.2  │ vs BOT│   │
│  │ 2 │ Hulk         │ CAM   │ 16.20 │ 6.95  │ 3.8  │ vs CRU│   │
│  │ 3 │ Calleri      │ SAO   │ 14.80 │ 6.43  │ 3.5  │ @ PAL│   │
│  │ 4 │ Yuri Alberto │ COR   │ 12.30 │ 5.87  │ 3.1  │ vs FLU│   │
│  │ 5 │ Lucero       │ FOR   │ 8.90  │ 5.21  │ 2.4  │ @ CEA│   │
│  │   │ ...          │       │       │       │      │       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [◀ Anterior]  Página 1 de 5  [Próximo ▶]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.1.2 Detalhe do Jogador (Modal)
```
┌─────────────────────────────────────────────────────────────────┐
│  👤 PEDRO - Atacante                                      [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  Flamengo (FLA)                              │
│  │   [ESCUDO]   │  Preço: C$ 18.50 (↑ 0.45)                    │
│  │              │  Média: 7.82 pts | Média 90min: 8.14 pts     │
│  └──────────────┘  MPV: 4.2 pts | Jogos: 12                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SCOUTS TEMPORADA                                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ G: 8  │ A: 4  │ FD: 15 │ FF: 22 │ FS: 18 │ DS: 3        │   │
│  │ CA: 2 │ FC: 8 │ I: 1   │ GS: 0  │ PC: 0  │ PP: 0        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ÚLTIMAS 5 RODADAS                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ R14: 12.3 (G, A)  │ R13: 3.2      │ R12: 8.0 (G)        │   │
│  │ R11: -0.5 (CA)    │ R10: 15.8 (2G)│                      │   │
│  │                                                          │   │
│  │ Tendência: ████████░░ 80% ↑                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PRÓXIMO CONFRONTO                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Flamengo vs Botafogo (Casa)                             │   │
│  │                                                          │   │
│  │ Botafogo cede para ATAs:                                │   │
│  │ • 6.8 pts/jogo (5º que mais cede)                       │   │
│  │ • 1.2 gols/jogo sofridos                                │   │
│  │ • Pedro vs BOT (histórico): 2J, 3G, 1A                  │   │
│  │                                                          │   │
│  │ ⚠️ Botafogo sem John (lesão) - defesa fragilizada       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [⚖️ Comparar]  [⭐ Favoritar]  [📊 Ver Histórico Completo]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Módulo: Calculadora MPV

#### 3.2.1 Fórmula do MPV
O **Mínimo para Valorizar** varia conforme:
- Preço atual do jogador
- Número de rodadas disputadas
- Coeficientes da temporada

```javascript
// Fórmula simplificada (temporada em andamento)
function calcularMPV(preco, rodadasJogadas) {
    // Jogadores baratos valorizam com menos pontos
    // Jogadores caros precisam de mais pontos

    const coeficienteBase = 2.5; // Ajustado por temporada
    const fatorPreco = Math.log10(preco + 1) * 0.8;
    const fatorRodadas = rodadasJogadas > 5 ? 1.0 : 1.2;

    return (coeficienteBase + fatorPreco) * fatorRodadas;
}

// Exemplo:
// Jogador C$ 5.00  → MPV ≈ 2.1 pts
// Jogador C$ 10.00 → MPV ≈ 3.3 pts
// Jogador C$ 20.00 → MPV ≈ 4.5 pts
```

#### 3.2.2 Interface Calculadora
```
┌─────────────────────────────────────────────────────────────────┐
│  📈 CALCULADORA DE VALORIZAÇÃO                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Jogador: [_______________] 🔍   ou   Preço: C$ [______]       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │   Preço Atual:        C$ 12.50                          │   │
│  │   Mínimo p/ Valorizar: 3.4 pontos                       │   │
│  │   Mínimo p/ Desvalorizar: < 1.8 pontos                  │   │
│  │                                                          │   │
│  │   ┌─────────────────────────────────────────────┐       │   │
│  │   │ Se pontuar    │ Variação    │ Novo Preço   │       │   │
│  │   ├───────────────┼─────────────┼──────────────┤       │   │
│  │   │ 0 pts         │ -C$ 0.80    │ C$ 11.70     │       │   │
│  │   │ 3 pts         │ -C$ 0.20    │ C$ 12.30     │       │   │
│  │   │ 5 pts         │ +C$ 0.35    │ C$ 12.85     │       │   │
│  │   │ 8 pts         │ +C$ 0.95    │ C$ 13.45     │       │   │
│  │   │ 12 pts        │ +C$ 1.80    │ C$ 14.30     │       │   │
│  │   └───────────────┴─────────────┴──────────────┘       │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Módulo: Análise de Confrontos

#### 3.3.1 Pontuação Cedida por Time
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔️ PONTUAÇÃO CEDIDA - Defesas mais vulneráveis                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filtro: [▼ Atacantes]  Período: [▼ Últimas 5 rodadas]         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # │ Time        │ Pts Cedidos │ Gols Sofridos │ Trend   │   │
│  │───┼─────────────┼─────────────┼───────────────┼─────────│   │
│  │ 1 │ Cuiabá      │ 9.2 pts     │ 2.4 gols      │ ████↑   │   │
│  │ 2 │ Atlético-GO │ 8.7 pts     │ 2.1 gols      │ ███░↑   │   │
│  │ 3 │ Grêmio      │ 7.9 pts     │ 1.8 gols      │ ██░░→   │   │
│  │ 4 │ Juventude   │ 7.5 pts     │ 1.7 gols      │ ██░░↓   │   │
│  │ 5 │ Criciúma    │ 7.2 pts     │ 1.6 gols      │ █░░░↓   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Dica: Atacantes enfrentando Cuiabá têm média 38% maior     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Módulo: Comparador de Jogadores

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚖️ COMPARADOR                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Selecionar Jogador 1 ▼]        [Selecionar Jogador 2 ▼]      │
│                                                                 │
│  ┌────────────────────────┬────────────────────────┐           │
│  │      PEDRO (FLA)       │      HULK (CAM)        │           │
│  ├────────────────────────┼────────────────────────┤           │
│  │ Preço:    C$ 18.50     │ Preço:    C$ 16.20     │  ✓       │
│  │ Média:    7.82         │ Média:    6.95         │  ✓       │
│  │ Média90:  8.14         │ Média90:  7.23         │  ✓       │
│  │ MPV:      4.2          │ MPV:      3.8          │  ✓       │
│  │ Gols:     8            │ Gols:     6            │  ✓       │
│  │ Assist:   4            │ Assist:   7            │     ✓    │
│  │ Cartões:  2            │ Cartões:  4            │  ✓       │
│  │ Próx:     vs BOT       │ Próx:     vs CRU       │  ≈       │
│  ├────────────────────────┼────────────────────────┤           │
│  │ Pts Cedidos: 6.8       │ Pts Cedidos: 5.2       │  ✓       │
│  │ Histórico:   3G, 1A    │ Histórico:   2G, 2A    │  ≈       │
│  └────────────────────────┴────────────────────────┘           │
│                                                                 │
│  📊 VEREDICTO: Pedro leva vantagem em 6 de 10 métricas         │
│  💰 Custo-benefício: Hulk (0.43 pts/C$) vs Pedro (0.42 pts/C$) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Módulo: Sugestão de Escalação (IA)

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 SUGESTÃO DE ESCALAÇÃO - Rodada 15                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Seu patrimônio: C$ 125.00                                     │
│                                                                 │
│  Objetivo: [▼ Mitar (pontuação máxima)]                        │
│            [ ] Valorizar (ganhar cartoletas)                   │
│            [ ] Equilibrado                                      │
│                                                                 │
│  [🎯 Gerar Sugestão]                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │              ┌─────────┐                                 │   │
│  │              │  PEDRO  │  C                              │   │
│  │              │  18.50  │                                 │   │
│  │              └─────────┘                                 │   │
│  │     ┌─────────┐ ┌─────────┐ ┌─────────┐                 │   │
│  │     │ ARRASCAE│ │ GERSON  │ │  DUDU   │                 │   │
│  │     │  14.20  │ │  11.80  │ │   9.50  │                 │   │
│  │     └─────────┘ └─────────┘ └─────────┘                 │   │
│  │        ┌─────────┐       ┌─────────┐                    │   │
│  │        │ FAGNER  │       │ AYRTON  │                    │   │
│  │        │   6.30  │       │   7.80  │                    │   │
│  │        └─────────┘       └─────────┘                    │   │
│  │     ┌─────────┐             ┌─────────┐                 │   │
│  │     │  BRUNO  │             │ GUSTAVO │                 │   │
│  │     │  12.40  │             │   8.20  │                 │   │
│  │     └─────────┘             └─────────┘                 │   │
│  │              ┌─────────┐                                 │   │
│  │              │  JOHN   │                                 │   │
│  │              │   9.30  │                                 │   │
│  │              └─────────┘                                 │   │
│  │                                                          │   │
│  │  Técnico: Dorival Jr (C$ 7.00)                          │   │
│  │                                                          │   │
│  │  Total: C$ 123.00  │  Sobra: C$ 2.00                    │   │
│  │  Pontuação Esperada: 58-72 pts                          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📋 Copiar Escalação]  [💾 Salvar]  [🔄 Gerar Outra]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Arquitetura Técnica

### 4.1 Estrutura de Arquivos

```
/public
├── /dicas-premium.html              # Página principal
├── /css
│   └── /modules
│       └── dicas-premium.css        # Estilos do módulo
└── /js
    └── /dicas-premium
        ├── dicas-premium.js         # Orquestrador
        ├── dicas-filtros.js         # Sistema de filtros
        ├── dicas-tabela.js          # Renderização de tabelas
        ├── dicas-jogador-modal.js   # Modal de detalhes
        ├── calculadora-mpv.js       # Cálculo de valorização
        ├── comparador.js            # Comparador lado a lado
        ├── analise-confrontos.js    # Pontuação cedida
        └── sugestor-escalacao.js    # IA de sugestão

/controllers
└── dicasPremiumController.js        # API endpoints

/services
├── cartolaApiService.js             # Integração API Cartola
├── scoutsService.js                 # Processamento de scouts
├── valorizacaoService.js            # Cálculos MPV
└── confrontosService.js             # Análise de confrontos

/models
└── DicasPremiumCache.js             # Cache de dados processados
```

### 4.2 Collections MongoDB

```javascript
// Collection: dicaspremium_jogadores
{
    _id: ObjectId,
    atleta_id: Number,           // ID do jogador na API Cartola
    temporada: Number,           // 2026
    rodada: Number,              // Última rodada processada

    // Dados básicos
    nome: String,
    apelido: String,
    posicao_id: Number,          // 1=GOL, 2=LAT, 3=ZAG, 4=MEI, 5=ATA, 6=TEC
    clube_id: Number,
    preco: Number,
    variacao: Number,

    // Estatísticas calculadas
    media: Number,
    media_90min: Number,
    mpv: Number,                 // Mínimo para valorizar
    jogos: Number,
    minutos: Number,

    // Scouts acumulados
    scouts: {
        G: Number, A: Number, SG: Number, DS: Number,
        FS: Number, FF: Number, FD: Number, FT: Number,
        PS: Number, DE: Number, DP: Number,
        GC: Number, CV: Number, CA: Number, GS: Number,
        PP: Number, PC: Number, FC: Number, I: Number
    },

    // Histórico últimas rodadas
    historico: [{
        rodada: Number,
        pontos: Number,
        scouts: Object
    }],

    // Metadados
    atualizado_em: Date
}

// Collection: dicaspremium_confrontos
{
    _id: ObjectId,
    temporada: Number,
    rodada: Number,

    clube_id: Number,
    clube_nome: String,

    // Pontuação cedida por posição
    cedido: {
        goleiros: { total: Number, media: Number, jogos: Number },
        laterais: { total: Number, media: Number, jogos: Number },
        zagueiros: { total: Number, media: Number, jogos: Number },
        meias: { total: Number, media: Number, jogos: Number },
        atacantes: { total: Number, media: Number, jogos: Number }
    },

    // Casa vs Fora
    cedido_casa: Object,
    cedido_fora: Object,

    atualizado_em: Date
}

// Collection: dicaspremium_sugestoes
{
    _id: ObjectId,
    temporada: Number,
    rodada: Number,

    patrimonio_min: Number,
    patrimonio_max: Number,
    objetivo: String,            // "mitar" | "valorizar" | "equilibrado"

    escalacao: [{
        atleta_id: Number,
        posicao: String,
        capitao: Boolean
    }],

    preco_total: Number,
    pontuacao_esperada: { min: Number, max: Number },

    criado_em: Date
}
```

### 4.3 API Endpoints

```javascript
// GET /api/dicas-premium/jogadores
// Params: posicao, ordem, precoMin, precoMax, mando, limit, offset
// Response: { jogadores: [...], total: Number, pagina: Number }

// GET /api/dicas-premium/jogador/:id
// Response: { jogador: Object, historico: [...], confronto: Object }

// GET /api/dicas-premium/confrontos
// Params: posicao, periodo
// Response: { confrontos: [...] }

// GET /api/dicas-premium/comparar
// Params: jogador1, jogador2
// Response: { comparacao: Object }

// POST /api/dicas-premium/sugestao
// Body: { patrimonio: Number, objetivo: String }
// Response: { escalacao: [...], meta: Object }

// GET /api/dicas-premium/calculadora-mpv
// Params: preco | atletaId
// Response: { mpv: Number, tabela: [...] }
```

### 4.4 Integração com API Cartola FC

```javascript
// Endpoints da API Oficial Cartola
const CARTOLA_API = {
    mercado: 'https://api.cartola.globo.com/atletas/mercado',
    pontuados: 'https://api.cartola.globo.com/atletas/pontuados',
    partidas: 'https://api.cartola.globo.com/partidas',
    clubes: 'https://api.cartola.globo.com/clubes',
    status: 'https://api.cartola.globo.com/mercado/status'
};

// Fluxo de atualização
// 1. Cron job a cada 30min durante mercado aberto
// 2. Ao fechar rodada, processar pontuações
// 3. Calcular métricas derivadas (média90, MPV, cedidos)
// 4. Cachear em MongoDB
```

---

## 5. Modelo de Acesso

### 5.1 Opções de Monetização

| Modelo | Descrição | Recomendação |
|--------|-----------|--------------|
| **Liga Premium** | Admin ativa módulo → todos participantes têm acesso | ✅ Mais simples |
| **Participante Premium** | Participante paga taxa extra individual | Complexo |
| **Freemium** | Stats básicas grátis, avançadas pagas | Médio |

### 5.2 Proposta: Liga Premium

```javascript
// Collection: ligas
{
    modulos_ativos: {
        dicas_premium: true    // Admin ativa/desativa
    }
}

// Verificação no frontend
if (liga.modulos_ativos?.dicas_premium) {
    // Mostrar menu "Dicas Premium"
}
```

### 5.3 Custo Sugerido

| Tipo | Valor |
|------|-------|
| Por liga/temporada | R$ 50-100 |
| Incluído em "Liga Pro" | Bundle com outros módulos |
| Grátis para beta | Primeiras 10 ligas |

---

## 6. Roadmap de Implementação

### Fase 1 - MVP (2-3 semanas)
- [ ] Integração básica com API Cartola
- [ ] Tela de dicas com filtros por posição
- [ ] Tabela de jogadores ordenável
- [ ] Cálculo de MPV
- [ ] Cache em MongoDB

### Fase 2 - Análises (2 semanas)
- [ ] Modal de detalhes do jogador
- [ ] Histórico últimas 5 rodadas
- [ ] Pontuação cedida por time
- [ ] Média 90 minutos

### Fase 3 - Ferramentas (2 semanas)
- [ ] Comparador lado a lado
- [ ] Calculadora de valorização interativa
- [ ] Alertas de oportunidades

### Fase 4 - IA (3-4 semanas)
- [ ] Sugestão de escalação por patrimônio
- [ ] Otimização por objetivo (mitar/valorizar)
- [ ] Predição de pontuação

### Fase 5 - Polish (1-2 semanas)
- [ ] Testes e ajustes
- [ ] Documentação
- [ ] Onboarding de ligas beta

---

## 7. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Ligas ativas com módulo | 20+ na primeira temporada |
| Uso semanal por participante | 3+ acessos/semana |
| NPS do módulo | > 40 |
| Precisão das sugestões | > 60% acima da média nacional |

---

## 8. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| API Cartola instável/muda | Alto | Cache agressivo, fallbacks |
| Baixa adoção | Médio | Período grátis, demonstração |
| Concorrência gratuita | Médio | Integração única com liga |
| Complexidade técnica | Médio | MVP incremental |

---

## 9. Referências

- [Cartola Analítico](https://cartolaanalitico.com) - Filtros e ordenação
- [Cartola FC Brasil](https://cartolafcbrasil.com.br) - Scouts detalhados
- [Cartomante FC](https://cartomantefc.com.br) - IA/Delivery
- [Capitão Cartoleiro](https://capitaocartoleiro.com.br) - 100% grátis, odds
- [Cartola Draft](https://cartoladraft.com) - IA gratuita
- [Super Scouts](https://cartolafcmix.com/estatisticas-cartola-fc/) - Média 90min
- [caRtola GitHub](https://github.com/henriquepgomide/caRtola) - Dados históricos/ML

---

## 10. Aprovações

| Papel | Nome | Data | Status |
|-------|------|------|--------|
| Product Owner | | | Pendente |
| Tech Lead | | | Pendente |
| Stakeholder | | | Pendente |

---

*Documento gerado em 2026-01-28 por Claude Code*
