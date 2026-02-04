# Super Cartola - MODO MATCHDAY

> **O Sistema Vivo: Transformando o App em uma Plataforma Second Screen**
> Documento de Arquitetura UX/Frontend
> Versão 3.1 | Dezembro 2025

---

## Sumário Executivo

Este documento descreve a transformação do Super Cartola de um **app estático de consulta** para uma **plataforma pulsante de tempo real**. O conceito central é o **MODO MATCHDAY**: um estado global do aplicativo que se ativa automaticamente quando a rodada está em andamento.

```
+---------------------------------------------------------------------+
|                                                                     |
|   PARADIGMA ATUAL (2025)          PARADIGMA NOVO (2026)            |
|   ---------------------           ---------------------            |
|                                                                     |
|   [Dados estaticos]               [Dados pulsantes]                |
|   [Usuario da refresh]            [App atualiza sozinho]           |
|   [Parciais so no Admin]          [Parciais no Mobile]             |
|   [App "morto" durante jogo]      [App "vivo" durante jogo]        |
|                                                                     |
|   "Consulto depois"               "Acompanho agora"                |
|                                                                     |
+---------------------------------------------------------------------+
```

---

# 1. CONCEITO GLOBAL: "O SISTEMA VIVO"

## 1.1 Gatilho de Ativacao

O **MODO MATCHDAY** nao e restrito a domingos. Rodadas acontecem em **qualquer dia da semana** (terca, quarta, sabado, domingo, feriados). O gatilho e unico:

```javascript
// Endpoint: GET /api/mercado/status
// Resposta da API Cartola:
{
    "rodada_atual": 25,
    "status_mercado": 2,  // 1 = Aberto, 2 = Fechado (Em Andamento), 6 = Encerrado
    "fechamento": "2026-09-15T18:30:00"
}

// Logica de ativacao
const MODO_MATCHDAY_ATIVO = status_mercado === 2;
```

| Status Mercado | Valor | Estado do App |
|----------------|-------|---------------|
| Mercado Aberto | `1` | Modo Normal (estatico) |
| **Mercado Fechado** | `2` | **MODO MATCHDAY (live)** |
| Temporada Encerrada | `6` | Modo Arquivo |

**IMPORTANTE:** O sistema verifica o status periodicamente (a cada 5 minutos) e ativa/desativa o MODO MATCHDAY automaticamente, independente do dia da semana.

## 1.2 Mudanca de Paradigma

### Antes (2025)
```
+---------------------------------------------+
|              ADMIN DESKTOP                  |
|  +---------------------------------------+  |
|  |  [Parciais]    [Atualizar Manual]     |  |
|  |  [Rankings]    [So o admin ve]        |  |
|  +---------------------------------------+  |
+---------------------------------------------+

+---------------------------------------------+
|              APP MOBILE                     |
|  +---------------------------------------+  |
|  |  [Dados consolidados da ultima        |  |
|  |   rodada. Usuario espera acabar.]     |  |
|  +---------------------------------------+  |
+---------------------------------------------+
```

### Depois (2026)
```
+---------------------------------------------+
|              APP MOBILE (MATCHDAY)          |
|  +---------------------------------------+  |
|  |  [AO VIVO]         R25 - 67'          |  |
|  +---------------------------------------+  |
|  |  SCOUTS: Gol Cano +8.0 | Ass. De      |  |
|  |     Arrascaeta +5.0 | SG Weverton...  |  | <-- TICKER
|  +---------------------------------------+  |
|  |                                       |  |
|  |  Sua parcial: 67.42 pts              |  |
|  |  Posicao atual: 12o (subiu 3)        |  |
|  |                                       |  |
|  |  +-------------------------------+   |  |
|  |  | RANKING LIVE                  |   |  |
|  |  | ---------------------------   |   |  |
|  |  | 1o  Mengao FC      89.32      |   |  |
|  |  | 2o  Porco Verde    85.11      |   |  |
|  |  | ... reordenando em tempo real |   |  |
|  |  +-------------------------------+   |  |
|  |                                       |  |
|  +---------------------------------------+  |
+---------------------------------------------+
```

## 1.3 Visual Global - Header Matchday

Quando o MODO MATCHDAY esta ativo, o header do app **muda completamente**:

### CSS do Header Matchday

```css
/* Header transforma quando MATCHDAY ativo */
.header-matchday {
    background: linear-gradient(180deg, #1a0a0a 0%, #0a0a0a 100%);
    border-bottom: 2px solid #ef4444;
    position: relative;
    overflow: hidden;
}

/* Indicador AO VIVO pulsante */
.live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid #ef4444;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    color: #ef4444;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.live-indicator::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
    animation: live-pulse 1s infinite;
}

@keyframes live-pulse {
    0%, 100% {
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
        opacity: 0.8;
        box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
    }
}

/* Pontuacao parcial animada */
.parcial-display {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    transition: all 0.3s ease;
}

.parcial-display.updating {
    color: #22c55e;
    transform: scale(1.1);
}

/* Posicao com tendencia */
.posicao-display {
    display: flex;
    align-items: center;
    gap: 4px;
}

.posicao-display .trend-up {
    color: #22c55e;
    animation: bounce-up 0.5s ease;
}

.posicao-display .trend-down {
    color: #ef4444;
    animation: bounce-down 0.5s ease;
}

@keyframes bounce-up {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}

@keyframes bounce-down {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
}
```

## 1.4 Ticker de Scouts

O ticker e um **letreiro horizontal continuo** exibindo eventos relevantes em tempo real:

```
+---------------------------------------------------------------------+
| [Gol] Gol Pedro +8.0 - [Assist] De Arrascaeta +5.0 - [SG] Weverton  |
|    +5.0 - [Gol] Endrick +8.0 - [CA] Hulk -1.0 - ...                 |
+---------------------------------------------------------------------+
        <-------------- (scrolling infinito)
```

### Implementacao do Ticker

```javascript
// Atualizacao do Ticker
class ScoutTicker {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.events = [];
        this.maxEvents = 20;
    }

    addEvent(scout) {
        const event = {
            id: Date.now(),
            type: scout.tipo,      // 'GOL', 'ASSIST', 'SG', 'CA', 'CV', etc.
            player: scout.atleta,
            value: scout.pontos,
            timestamp: new Date()
        };

        this.events.unshift(event);
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }

        this.render();
    }

    render() {
        const html = this.events.map(e => `
            <div class="ticker-item">
                <span class="scout-type">${this.getIcon(e.type)} ${e.type}</span>
                <span class="player-name">${e.player}</span>
                <span class="scout-value ${e.value >= 0 ? 'positive' : 'negative'}">
                    ${e.value >= 0 ? '+' : ''}${e.value.toFixed(1)}
                </span>
            </div>
        `).join('<span class="ticker-separator">-</span>');

        // Duplicar para scroll infinito
        this.container.innerHTML = html + '<span class="ticker-separator">-</span>' + html;
    }

    getIcon(type) {
        const icons = {
            'GOL': '[GOL]',
            'ASSIST': '[ASS]',
            'SG': '[SG]',
            'CA': '[CA]',
            'CV': '[CV]',
            'DEF': '[DEF]',
            'GC': '[GC]',
            'PP': '[PP]'
        };
        return icons[type] || '[EVT]';
    }
}
```

---

# 2. COMPORTAMENTO POR MODULO (Atualizacao em Tempo Real)

## 2.A Rankings e Pontos Corridos - "A Danca das Cadeiras"

### Conceito

Durante o MATCHDAY, o ranking **se reordena sozinho** na tela do usuario. Ele ve, em tempo real, se esta entrando na zona de classificacao (G4) ou caindo para a zona de rebaixamento (Z4).

### Dinamica
- A lista de classificacao deve se reordenar sozinha na tela do usuario a cada atualizacao de dados.
- Indicadores de setas de tendencia (Subiu, Desceu) atualizadas instantaneamente.

### Interface Visual

```
+---------------------------------------------------------------------+
|                 RANKING LIVE - R25                                  |
|                 Atualizado ha 45s                                   |
+---------------------------------------------------------------------+
|                                                                     |
|  =============== ZONA DE CLASSIFICACAO ===============              |
|                                                                     |
|  +-----------------------------------------------------------+     |
|  | 1o  [UP]+2  [FIRE] Mengao FC       89.32 pts   [======]   |     |
|  +-----------------------------------------------------------+     |
|                                                                     |
|  +-----------------------------------------------------------+     |
|  | 2o  [DN]-1        Porco Verde      85.11 pts   [===== ]   |     |
|  +-----------------------------------------------------------+     |
|                                                                     |
|  +-----------------------------------------------------------+     |
|  | 3o  [==]          Timao Sofredor   84.89 pts   [===== ]   |     |
|  +-----------------------------------------------------------+     |
|                                                                     |
|  +-----------------------------------------------------------+     |
|  | 4o  [UP]+5  [STAR] EU (Daniel)     82.45 pts   [====  ]   |     | <-- DESTAQUE
|  +-----------------------------------------------------------+     |
|                                                                     |
|  ------------------- ZONA NEUTRA -------------------                |
|                                                                     |
|    5o  [DN]-2     Galo Doido          81.22 pts                     |
|    6o  [==]       Tricolor FC         79.88 pts                     |
|    ...                                                              |
|                                                                     |
|  =============== ZONA DE REBAIXAMENTO ===============               |
|                                                                     |
|  +-----------------------------------------------------------+     |
|  | 31o [DN]-3  [WARN] Lanterna FC     23.40 pts   [#     ]   |     | <-- DANGER
|  +-----------------------------------------------------------+     |
|                                                                     |
|  +-----------------------------------------------------------+     |
|  | 32o [UP]+1  [SKULL] Rebaixado UTD  18.22 pts   [      ]   |     | <-- CRITICAL
|  +-----------------------------------------------------------+     |
|                                                                     |
+---------------------------------------------------------------------+
```

### CSS das Animacoes de Reordenacao

```css
/* Container da lista com animacao de reordenacao */
.ranking-live-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Cada item da lista */
.ranking-item {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center;
}

/* Animacao quando item sobe no ranking */
.ranking-item.moving-up {
    animation: move-up 0.6s ease-out;
    background: rgba(34, 197, 94, 0.15) !important;
    border-color: #22c55e !important;
}

@keyframes move-up {
    0% {
        transform: translateY(60px);
        opacity: 0.5;
    }
    50% {
        transform: translateY(-5px);
    }
    100% {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Animacao quando item desce no ranking */
.ranking-item.moving-down {
    animation: move-down 0.6s ease-out;
    background: rgba(239, 68, 68, 0.15) !important;
    border-color: #ef4444 !important;
}

@keyframes move-down {
    0% {
        transform: translateY(-60px);
        opacity: 0.5;
    }
    50% {
        transform: translateY(5px);
    }
    100% {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Indicador de tendencia */
.trend-indicator {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    font-weight: 700;
    min-width: 40px;
}

.trend-indicator.up {
    color: #22c55e;
}

.trend-indicator.down {
    color: #ef4444;
}

.trend-indicator.stable {
    color: #6b7280;
}

/* Destaque para o usuario logado */
.ranking-item.is-me {
    background: linear-gradient(90deg, rgba(255, 85, 0, 0.2) 0%, transparent 100%);
    border: 2px solid #ff5500;
    border-radius: 12px;
}

/* Zonas coloridas */
.ranking-item.zona-g {
    border-left: 4px solid #22c55e;
}

.ranking-item.zona-neutra {
    border-left: 4px solid #6b7280;
}

.ranking-item.zona-z {
    border-left: 4px solid #ef4444;
    background: rgba(239, 68, 68, 0.05);
}
```

### JavaScript de Reordenacao Animada

```javascript
class RankingLive {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.ranking = [];
        this.previousRanking = new Map();
    }

    update(novoRanking) {
        // Calcular mudancas de posicao
        const mudancas = this.calcularMudancas(novoRanking);

        // Atualizar dados
        this.ranking = novoRanking;

        // Renderizar com animacoes
        this.render(mudancas);

        // Salvar posicoes para proxima comparacao
        this.salvarPosicoes();
    }

    calcularMudancas(novoRanking) {
        const mudancas = new Map();

        novoRanking.forEach((item, index) => {
            const posicaoAnterior = this.previousRanking.get(item.timeId);
            const posicaoAtual = index + 1;

            if (posicaoAnterior !== undefined) {
                const diferenca = posicaoAnterior - posicaoAtual;
                if (diferenca !== 0) {
                    mudancas.set(item.timeId, {
                        de: posicaoAnterior,
                        para: posicaoAtual,
                        diferenca: diferenca,
                        direcao: diferenca > 0 ? 'up' : 'down'
                    });
                }
            }
        });

        return mudancas;
    }

    render(mudancas) {
        const meuTimeId = window.APP_STATE?.timeId;

        const html = this.ranking.map((item, index) => {
            const posicao = index + 1;
            const mudanca = mudancas.get(item.timeId);
            const isMe = item.timeId === meuTimeId;
            const zona = this.getZona(posicao);

            let trendHtml = '<span class="trend-indicator stable">[==]</span>';
            let animationClass = '';

            if (mudanca) {
                const sinal = mudanca.diferenca > 0 ? '+' : '';
                const icon = mudanca.direcao === 'up' ? '[UP]' : '[DN]';
                trendHtml = `
                    <span class="trend-indicator ${mudanca.direcao}">
                        ${icon}${sinal}${mudanca.diferenca}
                    </span>
                `;
                animationClass = `moving-${mudanca.direcao}`;
            }

            return `
                <div class="ranking-item ${zona} ${isMe ? 'is-me' : ''} ${animationClass}"
                     data-time-id="${item.timeId}"
                     style="order: ${posicao}">
                    <span class="posicao">${posicao}o</span>
                    ${trendHtml}
                    <span class="nome-time">${isMe ? '[STAR] ' : ''}${item.nomeTime}</span>
                    <span class="pontos">${item.pontos.toFixed(2)} pts</span>
                </div>
            `;
        }).join('');

        this.container.innerHTML = html;

        // Remover classes de animacao apos completar
        setTimeout(() => {
            this.container.querySelectorAll('.moving-up, .moving-down').forEach(el => {
                el.classList.remove('moving-up', 'moving-down');
            });
        }, 700);
    }

    getZona(posicao) {
        if (posicao <= 11) return 'zona-g';
        if (posicao >= 22) return 'zona-z';
        return 'zona-neutra';
    }

    salvarPosicoes() {
        this.previousRanking.clear();
        this.ranking.forEach((item, index) => {
            this.previousRanking.set(item.timeId, index + 1);
        });
    }
}
```

---

## 2.B Mata-Mata - "O Duelo"

### Conceito

Em vez de apenas exibir numeros, o confronto do Mata-Mata e representado como uma **Barra de Cabo de Guerra**. Cada ponto conquistado "empurra" a barra para o seu lado.

### Dinamica
- **Barra de Pressao:** Exibir uma barra de progresso "Cabo de Guerra". Se eu faco ponto, minha barra empurra a do adversario.
- **Status Dinamico:** "Classificando" (Verde) ou "Eliminado" (Vermelho) muda a cada gol.

### Interface Visual

```
+---------------------------------------------------------------------+
|                 MATA-MATA LIVE - 3a Edicao                          |
|                      Quartas de Final                               |
+---------------------------------------------------------------------+
|                                                                     |
|  +---------------------------------------------------------------+  |
|  |                                                               |  |
|  |   [TROPHY] Mengao FC           vs            Porco Verde      |  |
|  |                                                               |  |
|  |   +----------+                              +----------+      |  |
|  |   |  [IMG]   |                              |  [IMG]   |      |  |
|  |   |  89.32   |                              |  72.15   |      |  |
|  |   +----------+                              +----------+      |  |
|  |                                                               |  |
|  |   ==========================================================  |  |
|  |   ##############################............................  |  | <-- CABO DE GUERRA
|  |   ==========================================================  |  |
|  |              ^                                                |  |
|  |         VENCENDO                                              |  |
|  |                                                               |  |
|  |   +-------------------------------------------------------+   |  |
|  |   | [VERDE] CLASSIFICANDO   Diferenca: +17.17 pts         |   |  |
|  |   +-------------------------------------------------------+   |  |
|  |                                                               |  |
|  +---------------------------------------------------------------+  |
|                                                                     |
|  +---------------------------------------------------------------+  |
|  |                                                               |  |
|  |   [SWORD] EU (Daniel)          vs            Galo Doido       |  |
|  |                                                               |  |
|  |   +----------+                              +----------+      |  |
|  |   |  [IMG]   |                              |  [IMG]   |      |  |
|  |   |  67.42   | <-- animando                 |  69.88   |      |  |
|  |   +----------+                              +----------+      |  |
|  |                                                               |  |
|  |   ==========================================================  |  |
|  |   ......................##############################......  |  | <-- PERDENDO
|  |   ==========================================================  |  |
|  |                                          ^                    |  |
|  |                                     VENCENDO                  |  |
|  |                                                               |  |
|  |   +-------------------------------------------------------+   |  |
|  |   | [VERMELHO] ELIMINADO      Diferenca: -2.46 pts        |   |  |
|  |   |    [WARN] Faltam: Raphael Veiga, Endrick (18:30)      |   |  |
|  |   +-------------------------------------------------------+   |  |
|  |                                                               |  |
|  +---------------------------------------------------------------+  |
|                                                                     |
+---------------------------------------------------------------------+
```

### CSS do Cabo de Guerra

```css
/* Container do confronto */
.mata-mata-duel {
    background: #1a1a1a;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    border: 1px solid #2d2d2d;
    transition: all 0.3s ease;
}

.mata-mata-duel.is-my-duel {
    border: 2px solid #ff5500;
    background: linear-gradient(180deg, rgba(255, 85, 0, 0.1) 0%, #1a1a1a 100%);
}

/* Cabo de Guerra */
.tug-of-war-container {
    position: relative;
    height: 24px;
    margin: 20px 0;
}

.tug-of-war-track {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 8px;
    background: #374151;
    border-radius: 4px;
    transform: translateY(-50%);
    overflow: hidden;
}

.tug-of-war-bar {
    position: absolute;
    top: 0;
    height: 100%;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
}

.tug-of-war-bar.left {
    left: 0;
    background: linear-gradient(90deg, #ff5500, #ff8800);
    box-shadow: 0 0 10px rgba(255, 85, 0, 0.5);
}

.tug-of-war-bar.right {
    right: 0;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

/* Status do confronto */
.duel-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
}

.duel-status.classificando {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid #22c55e;
    color: #22c55e;
}

.duel-status.eliminado {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid #ef4444;
    color: #ef4444;
    animation: status-pulse 1s infinite;
}

@keyframes status-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

### JavaScript do Cabo de Guerra

```javascript
class TugOfWar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    update(pontosEsquerda, pontosDireita) {
        const total = pontosEsquerda + pontosDireita;
        if (total === 0) return;

        const percentEsquerda = (pontosEsquerda / total) * 100;
        const percentDireita = (pontosDireita / total) * 100;

        const barraEsquerda = this.container.querySelector('.tug-of-war-bar.left');
        const barraDireita = this.container.querySelector('.tug-of-war-bar.right');
        const indicador = this.container.querySelector('.tug-of-war-indicator');

        // Animar barras
        barraEsquerda.style.width = `${percentEsquerda}%`;
        barraDireita.style.width = `${percentDireita}%`;

        // Mover indicador
        if (pontosEsquerda > pontosDireita) {
            indicador.className = 'tug-of-war-indicator left';
            indicador.textContent = '^ VENCENDO';
        } else if (pontosDireita > pontosEsquerda) {
            indicador.className = 'tug-of-war-indicator right';
            indicador.textContent = 'VENCENDO ^';
        } else {
            indicador.textContent = 'EMPATADO';
        }
    }
}
```

---

## 2.C Modulos Especiais 2026

### Tiro Certo (Survival) - Baseado no PLACAR REAL

O Tiro Certo monitora o **PLACAR DA PARTIDA REAL** (nao pontuacao Cartola). O card do usuario muda de estado baseado no resultado momentaneo do jogo.

#### Estados Visuais

| Estado | Condicao | Visual |
|--------|----------|--------|
| [VERDE] **SAFE** | Time escolhido vencendo | Borda verde, fundo escuro com tint verde |
| [AMARELO] **DANGER** | Jogo empatado | Borda amarela pulsante, shake leve |
| [VERMELHO] **CRITICAL** | Time escolhido perdendo | Borda vermelha pulsante, caveira, heartbeat |
| [CINZA] **DEAD** | Jogo acabou, nao venceu | Grayscale, carimbo "ELIMINADO" |

#### Interface Visual

```
+---------------------------------------------------------------------+
|                    TIRO CERTO - 2a Edicao                           |
|                    Status: VIVO (R23)                               |
+---------------------------------------------------------------------+
|                                                                     |
|  +---------------------------------------------------------------+  |
|  |                                                               |  |
|  |  [WARN] PERIGO - EMPATE ELIMINA!                              |  |
|  |  =============================================================|  |
|  |                                                               |  |
|  |  Sua escolha: FLAMENGO                                        |  |
|  |                                                               |  |
|  |  +-----------------------------------------------------------+|  |
|  |  |                                                           ||  |
|  |  |      [FLA] FLAMENGO    1  X  1    BOTAFOGO [BOT]         ||  | <-- PULSANDO
|  |  |                                                           ||  |
|  |  |                    Tempo: 78'                             ||  |
|  |  |                                                           ||  |
|  |  +-----------------------------------------------------------+|  |
|  |                                                               |  |
|  |  [WORRY] Se acabar assim, voce esta ELIMINADO!                |  |
|  |                                                               |  |
|  |  +-----------------------------------------------------------+|  |
|  |  |  Historico nesta edicao:                                  ||  |
|  |  |  R18: Palmeiras [OK] | R19: Inter [OK] | R20: Sao [OK]    ||  |
|  |  |  R21: Gremio [OK] | R22: Corinthians [OK]                 ||  |
|  |  |  Times usados: 5/20                                       ||  |
|  |  +-----------------------------------------------------------+|  |
|  |                                                               |  |
|  +---------------------------------------------------------------+  |
|                                                                     |
|  =================================================================  |
|  |                  OUTROS PARTICIPANTES                         |  |
|  =================================================================  |
|                                                                     |
|  [VERDE] Joao Silva       Athletico (2x1)     SAFE                  |
|  [VERDE] Maria Santos     Palmeiras (3x0)     SAFE                  |
|  [AMARELO] Pedro Lima     Fluminense (0x0)    DANGER                |
|  [VERMELHO] Ana Costa     Vasco (0x2)         CRITICAL              |
|  [CINZA] Carlos Mendes    Santos (1x2)        ELIMINADO             |
|                                                                     |
|  Vivos: 12/32   Eliminados: 20/32                                   |
|                                                                     |
+---------------------------------------------------------------------+
```

#### CSS dos Estados

```css
/* Base do card */
.tiro-certo-card {
    border-radius: 16px;
    padding: 20px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

/* SAFE - Vencendo */
.tiro-certo-card.safe {
    background: linear-gradient(180deg, rgba(34, 197, 94, 0.15) 0%, #0a0a0a 100%);
    border: 3px solid #22c55e;
    box-shadow: 0 0 30px rgba(34, 197, 94, 0.2);
}

/* DANGER - Empatando */
.tiro-certo-card.danger {
    background: linear-gradient(180deg, rgba(234, 179, 8, 0.15) 0%, #0a0a0a 100%);
    border: 3px solid #eab308;
    animation: danger-pulse 1s infinite;
}

@keyframes danger-pulse {
    0%, 100% {
        box-shadow: 0 0 30px rgba(234, 179, 8, 0.3);
    }
    50% {
        box-shadow: 0 0 50px rgba(234, 179, 8, 0.6);
    }
}

.tiro-certo-card.danger .placar-box {
    animation: shake 0.5s infinite;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
}

/* CRITICAL - Perdendo */
.tiro-certo-card.critical {
    background: linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, #0a0a0a 100%);
    border: 3px solid #ef4444;
    animation: critical-pulse 0.5s infinite;
}

@keyframes critical-pulse {
    0%, 100% {
        box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
    }
    50% {
        box-shadow: 0 0 60px rgba(239, 68, 68, 0.8);
    }
}

/* DEAD - Eliminado */
.tiro-certo-card.dead {
    filter: grayscale(100%);
    opacity: 0.7;
    border: 2px solid #4b5563;
    background: #1f2937;
}

.tiro-certo-card.dead::after {
    content: 'ELIMINADO';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-15deg);
    font-family: 'Russo One', sans-serif;
    font-size: 2rem;
    font-weight: bold;
    color: rgba(239, 68, 68, 0.5);
    letter-spacing: 0.3em;
}
```

---

### Resta Um - "O Holofote da Vergonha"

#### Conceito

O Resta Um e o oposto do ranking tradicional: voce torce para **NAO ser o ultimo**. O "Holofote da Vergonha" destaca dramaticamente quem esta na zona de eliminacao.

Quando o usuario esta na **ultima posicao momentanea**, todo o app entra em "Modo Alerta":

```
+---------------------------------------------------------------------+
|                                                                     |
|  [SIREN][SIREN][SIREN][SIREN][SIREN][SIREN][SIREN][SIREN][SIREN]   |
|  ||      VOCE ESTA NA LANTERNA - ZONA DE ELIMINACAO      ||        |
|  [SIREN][SIREN][SIREN][SIREN][SIREN][SIREN][SIREN][SIREN][SIREN]   |
|                                                                     |
+---------------------------------------------------------------------+
|                                                                     |
|                  RESTA UM - 1a Edicao                               |
|                     Rodada 12 (LIVE)                                |
|                                                                     |
|  POS   PARTICIPANTE              PARCIAL      TREND                 |
|  ------------------------------------------------------------------ |
|                                                                     |
|  1o    [FIRE] Lider FC           92.45 pts    [==]                  |
|  2o    [BOLT] Vice FC            88.32 pts    [UP]+1                |
|  ...                                                                |
|                                                                     |
|  ============== ZONA DE PERIGO ==============                       |
|                                                                     |
|  30o   [WORRY] Quase La          28.44 pts    [DN]-2                |
|  31o   [FEAR] Na Beirada         25.12 pts    [DN]-1                |
|                                                                     |
|  +---------------------------------------------------------------+  |
|  | ############################################################  |  |
|  | ||                                                        ||  |  |
|  | ||  [SKULL] 32o  VOCE (Daniel)      18.22 pts    [DN]-5  ||  |  | <-- NA MIRA
|  | ||                                                        ||  |  |
|  | ||  [WARN] Se a rodada acabar AGORA, voce esta FORA!     ||  |  |
|  | ||                                                        ||  |  |
|  | ||  [PRAY] Esperanca: Raphael Veiga ainda joga (18:30)   ||  |  |
|  | ||                                                        ||  |  |
|  | ############################################################  |  |
|  +---------------------------------------------------------------+  |
|                                                                     |
+---------------------------------------------------------------------+
```

#### CSS do Modo Alerta

```css
/* Tema global quando usuario e lanterna */
body.user-is-lanterna {
    --bg-primary: #1a0505;
    --border-accent: #ef4444;
}

/* Banner fixo no topo */
.lanterna-alert-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 10px 16px;
    background: linear-gradient(90deg, #ef4444, #dc2626);
    color: white;
    font-weight: 700;
    font-size: 12px;
    text-align: center;
    z-index: 99999;
    animation: banner-flash 0.5s infinite;
}

@keyframes banner-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
}

/* Card do lanterna */
.resta-um-row.lanterna {
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%);
    border: 3px solid #ef4444;
    border-radius: 16px;
    padding: 20px;
    margin: 16px 0;
    animation: lanterna-glow 1s infinite;
}

@keyframes lanterna-glow {
    0%, 100% {
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
    }
    50% {
        box-shadow: 0 0 40px rgba(239, 68, 68, 0.6);
    }
}

/* Animacao de "escapou da lanterna" */
.resta-um-row.escaped-lanterna {
    animation: escape-relief 1s forwards;
}

@keyframes escape-relief {
    0% {
        background: rgba(239, 68, 68, 0.3);
        transform: scale(1);
    }
    50% {
        background: rgba(34, 197, 94, 0.3);
        transform: scale(1.02);
    }
    100% {
        background: transparent;
        transform: scale(1);
    }
}
```

---

## 2.D Premiacoes Especificas (Contexto Extra)

### Capitao de Luxo

**REQUISITO DE UI CRITICO:** Alem da pontuacao, e **OBRIGATORIO** exibir discretamente o **Nome do Capitao** escolhido ao lado do nome do time.

#### Exemplo Visual

```
+---------------------------------------------------------------------+
|                 CAPITAO DE LUXO - LIVE                              |
|                 Ranking de Capitaes R25                             |
+---------------------------------------------------------------------+
|                                                                     |
|  POS   PARTICIPANTE               PONTOS CAP    CAPITAO             |
|  ------------------------------------------------------------------ |
|                                                                     |
|  1o    [TROPHY] Time do Joao      24.50 pts    [Badge: HULK]        |
|  2o    [MEDAL] Mengao FC          22.80 pts    [Badge: PEDRO]       |
|  3o    Time do Carlos             21.40 pts    [Badge: ARRASCAETA]  |
|  4o    [STAR] EU (Daniel)         19.60 pts    [Badge: VEIGA]       | <-- MEU TIME
|  5o    Porco Verde                18.90 pts    [Badge: ENDRICK]     |
|  ...                                                                |
|                                                                     |
|  ------------------------------------------------------------------ |
|  |  Seu capitao: RAPHAEL VEIGA (19.60 pts x2 = 39.20 no total)   |  |
|  |  Melhor capitao da rodada: HULK (24.50 pts)                   |  |
|  ------------------------------------------------------------------ |
|                                                                     |
+---------------------------------------------------------------------+
```

#### Formato da Badge

```html
<!-- Badge do capitao ao lado do nome -->
<div class="ranking-row">
    <span class="posicao">1o</span>
    <span class="nome-time">Time do Joao</span>
    <span class="pontos-capitao">24.50 pts</span>
    <span class="capitao-badge">[Badge: HULK]</span>
</div>
```

#### CSS do Capitao Badge

```css
/* Badge do capitao */
.capitao-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid #8b5cf6;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    color: #a78bfa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.capitao-badge::before {
    content: 'C';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background: #8b5cf6;
    color: #000;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 700;
}

/* Destaque quando capitao pontua */
.capitao-badge.pontuando {
    animation: capitao-glow 0.5s ease;
    background: rgba(34, 197, 94, 0.3);
    border-color: #22c55e;
    color: #22c55e;
}

@keyframes capitao-glow {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
```

#### JavaScript - Atualizacao Live do Capitao

```javascript
// Quando capitao pontua, animar a badge
function onCapitaoPontuou(timeId, novosPontos, nomeCapitao) {
    const row = document.querySelector(`[data-time-id="${timeId}"]`);
    if (!row) return;

    const badge = row.querySelector('.capitao-badge');
    const pontos = row.querySelector('.pontos-capitao');

    // Atualizar pontuacao
    pontos.textContent = `${novosPontos.toFixed(2)} pts`;
    pontos.classList.add('updating');

    // Animar badge
    badge.classList.add('pontuando');

    // Remover animacoes
    setTimeout(() => {
        pontos.classList.remove('updating');
        badge.classList.remove('pontuando');
    }, 500);
}
```

---

### Luva de Ouro

**MECANICA LIVE:** Ranking de goleiros. Se o goleiro **toma gol**, o usuario cai na hora na tabela (perde o SG - Saldo de Gols).

#### Exemplo Visual

```
+---------------------------------------------------------------------+
|                 LUVA DE OURO - LIVE                                 |
|                 Ranking de Goleiros R25                             |
+---------------------------------------------------------------------+
|                                                                     |
|  POS   PARTICIPANTE         GOLEIRO        PONTOS    SG             |
|  ------------------------------------------------------------------ |
|                                                                     |
|  1o    [GLOVE] Mengao FC    ROSSI          12.50     [SG OK]        |
|  2o    [GLOVE] Porco Verde  WEVERTON       11.80     [SG OK]        |
|  3o    Time do Carlos       CASSIO         10.20     [SG OK]        |
|  4o    [STAR] EU (Daniel)   JOHN           8.50      [SG PERDIDO]   | <-- TOMEI GOL!
|  5o    Galo Doido           EVERSON        7.90      [SG OK]        |
|  ...                                                                |
|                                                                     |
|  ------------------------------------------------------------------ |
|  |  [ALERT] Seu goleiro JOHN tomou gol!                           |  |
|  |  SG perdido: -5.0 pts                                          |  |
|  |  Voce caiu 2 posicoes (2o -> 4o)                               |  |
|  ------------------------------------------------------------------ |
|                                                                     |
+---------------------------------------------------------------------+
```

#### Estados do Goleiro

| Estado | Condicao | Visual |
|--------|----------|--------|
| [SG OK] | Goleiro nao tomou gol | Badge verde "SG" |
| [SG PERDIDO] | Goleiro tomou gol | Badge vermelha, row pisca vermelho |
| [DEFENDEU] | Goleiro fez defesa | Badge pisca dourado brevemente |

#### CSS da Luva de Ouro

```css
/* Badge de Saldo de Gols */
.sg-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
}

.sg-badge.sg-ok {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid #22c55e;
    color: #22c55e;
}

.sg-badge.sg-ok::before {
    content: '[GLOVE]';
}

.sg-badge.sg-perdido {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid #ef4444;
    color: #ef4444;
    animation: sg-lost-pulse 0.5s ease;
}

.sg-badge.sg-perdido::before {
    content: '[X]';
}

@keyframes sg-lost-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

/* Row quando goleiro toma gol */
.luva-ouro-row.tomou-gol {
    animation: gol-tomado 1s ease;
}

@keyframes gol-tomado {
    0% {
        background: transparent;
    }
    25% {
        background: rgba(239, 68, 68, 0.4);
        transform: translateX(-5px);
    }
    50% {
        background: rgba(239, 68, 68, 0.4);
        transform: translateX(5px);
    }
    75% {
        background: rgba(239, 68, 68, 0.2);
        transform: translateX(-3px);
    }
    100% {
        background: transparent;
        transform: translateX(0);
    }
}

/* Alert de gol tomado */
.sg-alert {
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%);
    border-left: 4px solid #ef4444;
    padding: 12px 16px;
    margin-top: 16px;
    border-radius: 0 8px 8px 0;
}

.sg-alert .alert-title {
    color: #ef4444;
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 4px;
}

.sg-alert .alert-details {
    color: #9ca3af;
    font-size: 12px;
}

/* Badge quando goleiro defende */
.sg-badge.defendeu {
    animation: defesa-glow 0.5s ease;
}

@keyframes defesa-glow {
    0% {
        box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7);
    }
    50% {
        box-shadow: 0 0 20px 5px rgba(255, 215, 0, 0.5);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(255, 215, 0, 0);
    }
}
```

#### JavaScript - Atualizacao Live do Goleiro

```javascript
class LuvaOuroLive {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.goleirosStatus = new Map(); // timeId -> { sg: true/false, pontos: number }
    }

    update(parciais) {
        parciais.forEach(item => {
            const statusAnterior = this.goleirosStatus.get(item.timeId);
            const sgAtual = !item.goleiroTomouGol;

            // Detectar se goleiro acabou de tomar gol
            if (statusAnterior && statusAnterior.sg && !sgAtual) {
                this.onGoleiroTomouGol(item.timeId, item.goleiroNome);
            }

            // Atualizar status
            this.goleirosStatus.set(item.timeId, {
                sg: sgAtual,
                pontos: item.pontosGoleiro
            });
        });

        this.render(parciais);
    }

    onGoleiroTomouGol(timeId, goleiroNome) {
        const row = this.container.querySelector(`[data-time-id="${timeId}"]`);
        if (!row) return;

        // Adicionar classe de animacao
        row.classList.add('tomou-gol');

        // Mostrar alert
        this.showSgAlert(goleiroNome);

        // Remover classe apos animacao
        setTimeout(() => {
            row.classList.remove('tomou-gol');
        }, 1000);
    }

    showSgAlert(goleiroNome) {
        const alertHtml = `
            <div class="sg-alert">
                <div class="alert-title">[ALERT] Seu goleiro ${goleiroNome} tomou gol!</div>
                <div class="alert-details">SG perdido: -5.0 pts</div>
            </div>
        `;

        // Inserir alert no topo
        const alertContainer = document.getElementById('sg-alerts');
        if (alertContainer) {
            alertContainer.innerHTML = alertHtml;

            // Auto-remover apos 5s
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }
    }

    render(parciais) {
        // Ordenar por pontos do goleiro
        const sorted = [...parciais].sort((a, b) => b.pontosGoleiro - a.pontosGoleiro);

        const html = sorted.map((item, index) => {
            const posicao = index + 1;
            const sg = !item.goleiroTomouGol;
            const isMe = item.timeId === window.APP_STATE?.timeId;

            return `
                <div class="luva-ouro-row ${isMe ? 'is-me' : ''}" data-time-id="${item.timeId}">
                    <span class="posicao">${posicao}o</span>
                    <span class="nome-time">${item.nomeTime}</span>
                    <span class="goleiro-nome">${item.goleiroNome}</span>
                    <span class="pontos-goleiro">${item.pontosGoleiro.toFixed(2)}</span>
                    <span class="sg-badge ${sg ? 'sg-ok' : 'sg-perdido'}">
                        ${sg ? 'SG' : 'SG PERDIDO'}
                    </span>
                </div>
            `;
        }).join('');

        this.container.innerHTML = html;
    }
}
```

---

# 3. REQUISITOS TECNICOS (Frontend)

## 3.1 Arquitetura de Polling

O App deve consultar a API de parciais **periodicamente** (ex: a cada 60s) para atualizar a tela sem refresh manual.

```javascript
// matchday-service.js
class MatchdayService {
    constructor() {
        this.isMatchdayActive = false;
        this.pollingInterval = null;
        this.POLLING_INTERVAL_MS = 60000; // 60 segundos
        this.listeners = new Map();
    }

    async checkMatchdayStatus() {
        try {
            const response = await fetch('/api/mercado/status');
            const data = await response.json();

            const wasActive = this.isMatchdayActive;
            this.isMatchdayActive = data.status_mercado === 2;

            // Transicao de estado
            if (!wasActive && this.isMatchdayActive) {
                this.onMatchdayStart();
            } else if (wasActive && !this.isMatchdayActive) {
                this.onMatchdayEnd();
            }

            return this.isMatchdayActive;
        } catch (error) {
            console.error('[MATCHDAY] Erro ao verificar status:', error);
            return false;
        }
    }

    onMatchdayStart() {
        console.log('[MATCHDAY] [LIVE] MODO MATCHDAY ATIVADO');

        // Adicionar classe ao body
        document.body.classList.add('matchday-active');

        // Iniciar polling de dados
        this.startPolling();

        // Notificar listeners
        this.emit('matchday:start');
    }

    onMatchdayEnd() {
        console.log('[MATCHDAY] [OFF] Modo Matchday desativado');

        document.body.classList.remove('matchday-active');
        this.stopPolling();
        this.emit('matchday:end');
    }

    startPolling() {
        if (this.pollingInterval) return;

        // Primeira busca imediata
        this.fetchLiveData();

        // Polling periodico
        this.pollingInterval = setInterval(() => {
            this.fetchLiveData();
        }, this.POLLING_INTERVAL_MS);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async fetchLiveData() {
        try {
            const [parciais, partidas] = await Promise.all([
                fetch('/api/atletas/pontuados').then(r => r.json()),
                fetch('/api/partidas/live').then(r => r.json())
            ]);

            this.emit('data:parciais', parciais);
            this.emit('data:partidas', partidas);

        } catch (error) {
            console.error('[MATCHDAY] Erro ao buscar dados live:', error);
        }
    }

    // Event Emitter simples
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
}

// Singleton
export const matchdayService = new MatchdayService();
```

## 3.2 Integracao com Modulos

```javascript
// Inicializacao no app
import { matchdayService } from './matchday-service.js';

// Verificar status ao carregar
matchdayService.checkMatchdayStatus();

// Verificar periodicamente (a cada 5 min) se matchday comecou/terminou
setInterval(() => {
    matchdayService.checkMatchdayStatus();
}, 300000);

// Listeners para cada modulo
matchdayService.on('data:parciais', (parciais) => {
    // Atualizar Ranking
    if (window.RankingLive) {
        window.RankingLive.update(parciais.ranking);
    }

    // Atualizar Resta Um
    if (window.RestaUmLive) {
        window.RestaUmLive.update(parciais.ranking);
    }

    // Atualizar Mata-Mata
    if (window.MataMataLive) {
        window.MataMataLive.update(parciais.confrontos);
    }

    // Atualizar Capitao de Luxo
    if (window.CapitaoLuxoLive) {
        window.CapitaoLuxoLive.update(parciais.capitaes);
    }

    // Atualizar Luva de Ouro
    if (window.LuvaOuroLive) {
        window.LuvaOuroLive.update(parciais.goleiros);
    }
});

matchdayService.on('data:partidas', (partidas) => {
    // Atualizar Tiro Certo (baseado em placares reais)
    if (window.TiroCertoLive) {
        window.TiroCertoLive.update(partidas);
    }

    // Atualizar Ticker de scouts
    if (window.ScoutTicker) {
        partidas.eventos.forEach(e => window.ScoutTicker.addEvent(e));
    }
});
```

## 3.3 CSS Global do Modo Matchday

```css
/* Quando MATCHDAY esta ativo */
body.matchday-active {
    --header-bg: linear-gradient(180deg, #1a0505 0%, #0a0a0a 100%);
    --accent-glow: rgba(239, 68, 68, 0.3);
}

body.matchday-active .app-header {
    background: var(--header-bg);
    border-bottom: 2px solid #ef4444;
}

/* Indicador global de "dados atualizando" */
body.matchday-active.fetching::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, #ff5500, transparent);
    animation: loading-bar 1s infinite;
    z-index: 99999;
}

@keyframes loading-bar {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* Transicoes suaves para todas as listas (list-move) */
body.matchday-active .ranking-item,
body.matchday-active .resta-um-row,
body.matchday-active .mata-mata-duel,
body.matchday-active .luva-ouro-row,
body.matchday-active .capitao-row {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 3.4 Animacoes de Reordenacao (list-move)

Uso de transicoes suaves na reordenacao das tabelas:

```css
/* Animacao generica de reordenacao */
.live-list-item {
    transition: transform 0.5s ease, opacity 0.3s ease;
}

.live-list-item.moving {
    transform: translateY(var(--move-distance, 0));
}

.live-list-item.entering {
    animation: item-enter 0.3s ease;
}

@keyframes item-enter {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
```

---

# 4. ARQUITETURA DE DADOS (Data Sources)

Definicao tecnica das fontes de dados para o backend do MODO MATCHDAY.

## 4.1 Fontes da API Cartola

O sistema utiliza **EXCLUSIVAMENTE** a API oficial do Cartola FC (Globo). **NAO usar APIs externas pagas.**

| Endpoint | Uso | Dados Retornados |
|----------|-----|------------------|
| `/mercado/status` | Verificar se MATCHDAY ativo | `status_mercado`, `rodada_atual` |
| `/atletas/pontuados` | Parciais de pontuacao | Scouts individuais dos atletas |
| `/partidas` | Placares em tempo real | `placar_oficial_mandante`, `placar_oficial_visitante` |

## 4.2 Para Pontuacoes (Resta Um, Mata-Mata, Rankings, Capitao de Luxo, Luva de Ouro)

**Endpoint:** `GET /atletas/pontuados` (API Cartola)

**Processamento Backend:**
1. Buscar lista de atletas pontuados
2. Para cada time do sistema, somar pontuacao dos atletas escalados
3. Calcular parcial do capitao (pontuacao x2)
4. Identificar goleiro e verificar se tomou gol (SG)
5. Retornar ranking ordenado por pontuacao

```javascript
// Exemplo de processamento
async function calcularParciais(ligaId) {
    const pontuados = await cartolaAPI.get('/atletas/pontuados');
    const times = await Time.find({ ligaId });

    return times.map(time => {
        const escalacao = time.escalacao; // atletas escalados
        let parcial = 0;

        escalacao.forEach(atletaId => {
            const atleta = pontuados.atletas[atletaId];
            if (atleta) {
                const pontos = atleta.pontuacao;
                // Capitao tem bonus x2
                parcial += (atletaId === time.capitaoId) ? pontos * 2 : pontos;
            }
        });

        return {
            timeId: time._id,
            nomeTime: time.nome,
            parcial: parcial,
            capitaoNome: pontuados.atletas[time.capitaoId]?.apelido || 'N/A',
            goleiroTomouGol: verificarGolSofrido(time.goleiroId, pontuados)
        };
    }).sort((a, b) => b.parcial - a.parcial);
}
```

## 4.3 Para Tiro Certo (Survival) - PLACAR REAL

**Endpoint:** `GET /partidas` (API Cartola)

**IMPORTANTE:** O Tiro Certo usa o **PLACAR DA PARTIDA**, nao a pontuacao Cartola.

**Dados Utilizados:**
- `placar_oficial_mandante` - Gols do time mandante
- `placar_oficial_visitante` - Gols do time visitante
- `clube_casa_id` - ID do time mandante
- `clube_visitante_id` - ID do time visitante
- `status_transmissao` - Status do jogo (ao vivo, encerrado, etc.)

**Logica de Status:**

```javascript
function calcularStatusTiroCerto(escolhaTimeId, partida) {
    const timeEscolhidoMandante = partida.clube_casa_id === escolhaTimeId;
    const timeEscolhidoVisitante = partida.clube_visitante_id === escolhaTimeId;

    if (!timeEscolhidoMandante && !timeEscolhidoVisitante) {
        return { status: 'ERROR', msg: 'Time escolhido nao participa desta partida' };
    }

    const golsEscolhido = timeEscolhidoMandante
        ? partida.placar_oficial_mandante
        : partida.placar_oficial_visitante;

    const golsAdversario = timeEscolhidoMandante
        ? partida.placar_oficial_visitante
        : partida.placar_oficial_mandante;

    // Determinar status
    if (golsEscolhido > golsAdversario) {
        return {
            status: 'SAFE',
            msg: 'Time vencendo',
            placar: `${golsEscolhido} x ${golsAdversario}`
        };
    } else if (golsEscolhido === golsAdversario) {
        return {
            status: 'DANGER',
            msg: 'Empate - ELIMINACAO se acabar assim',
            placar: `${golsEscolhido} x ${golsAdversario}`
        };
    } else {
        return {
            status: 'CRITICAL',
            msg: 'Time perdendo - ELIMINACAO se acabar assim',
            placar: `${golsEscolhido} x ${golsAdversario}`
        };
    }
}
```

**Vantagens desta abordagem:**
- **IDs compativeis:** Os IDs de clubes da API Cartola sao os mesmos usados no sistema
- **Custo ZERO:** API oficial gratuita
- **Dados confiaveis:** Fonte oficial da Globo

## 4.4 Mapeamento de Clubes (Referencia)

Os IDs dos clubes do Brasileirao na API Cartola:

| ID | Clube | Abreviacao |
|----|-------|------------|
| 262 | Flamengo | FLA |
| 263 | Botafogo | BOT |
| 264 | Fluminense | FLU |
| 265 | Vasco | VAS |
| 266 | Corinthians | COR |
| 275 | Palmeiras | PAL |
| 276 | Sao Paulo | SAO |
| 277 | Santos | SAN |
| 282 | Athletico-PR | CAP |
| 283 | Coritiba | CFC |
| 284 | Gremio | GRE |
| 285 | Internacional | INT |
| 286 | Cruzeiro | CRU |
| 287 | Atletico-MG | CAM |
| 290 | Goias | GOI |
| 292 | Sport | SPT |
| 293 | Bahia | BAH |
| 294 | Vitoria | VIT |
| 315 | Ceara | CEA |
| 316 | Fortaleza | FOR |
| 327 | America-MG | AME |
| 354 | Cuiaba | CUI |
| 356 | Red Bull Bragantino | RBB |

## 4.5 Cache e Performance

**Estrategia de Cache:**

| Dado | TTL | Justificativa |
|------|-----|---------------|
| Status do Mercado | 60s | Verificacao frequente |
| Parciais (pontuados) | 30s | Atualizacao rapida durante jogos |
| Partidas (placares) | 30s | Placares mudam a qualquer momento |
| Escalacoes | 1h | Nao muda durante rodada |

**Implementacao:**

```javascript
// Cache em memoria com TTL
const cache = new Map();

async function getWithCache(key, fetchFn, ttlMs) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
        return cached.data;
    }

    const data = await fetchFn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}

// Uso
const parciais = await getWithCache(
    'parciais',
    () => cartolaAPI.get('/atletas/pontuados'),
    30000 // 30s TTL
);
```

## 4.6 Endpoints Internos do Super Cartola

O backend expoe os seguintes endpoints para o frontend:

| Endpoint | Metodo | Descricao | Resposta |
|----------|--------|-----------|----------|
| `/api/matchday/status` | GET | Status do MODO MATCHDAY | `{ active: boolean, rodada: number }` |
| `/api/matchday/parciais/:ligaId` | GET | Parciais da liga | Array de times com pontuacao |
| `/api/matchday/partidas` | GET | Placares ao vivo | Array de partidas com placar |
| `/api/matchday/tiro-certo/:ligaId` | GET | Status dos participantes | Array com status SAFE/DANGER/CRITICAL |
| `/api/matchday/capitaes/:ligaId` | GET | Ranking de capitaes | Array com nome do capitao |
| `/api/matchday/goleiros/:ligaId` | GET | Ranking de goleiros | Array com status SG |

---

# 5. CHECKLIST DE IMPLEMENTACAO

## Backend

- [ ] Endpoint `/api/mercado/status` (proxy para API Cartola)
- [ ] Endpoint `/api/atletas/pontuados` (parciais)
- [ ] Endpoint `/api/partidas/live` (placares em tempo real)
- [ ] Endpoint `/api/capitaes/live` (pontuacao dos capitaes)
- [ ] Endpoint `/api/goleiros/live` (pontuacao e SG dos goleiros)
- [ ] WebSocket server (opcional, para real-time puro)
- [ ] Cache de parciais com TTL de 30s

## Frontend - Core

- [ ] `MatchdayService` - Gerenciador de estado global
- [ ] Header Matchday com indicador AO VIVO
- [ ] Ticker de Scouts
- [ ] CSS do Modo Matchday

## Frontend - Modulos

- [ ] **Ranking Live** - Reordenacao animada
- [ ] **Pontos Corridos Live** - Tabela com trends
- [ ] **Mata-Mata Live** - Cabo de Guerra
- [ ] **Tiro Certo Live** - 4 estados visuais (SAFE/DANGER/CRITICAL/DEAD)
- [ ] **Resta Um Live** - Holofote da Vergonha
- [ ] **Capitao de Luxo Live** - Badge com nome do capitao (OBRIGATORIO)
- [ ] **Luva de Ouro Live** - Atualizacao quando goleiro toma gol

## UX/Feedback

- [ ] Vibration API para alertas criticos
- [ ] Notificacoes push para mudancas de status
- [ ] Sons opcionais (configuravel)
- [ ] Animacoes de transicao (list-move)

---

# 6. METRICAS DE SUCESSO

| Metrica | Meta 2026 |
|---------|-----------|
| Tempo medio de sessao durante Matchday | +150% vs 2025 |
| Refresh manual durante jogos | -80% (polling automatico) |
| Engajamento com notificacoes push | >60% opt-in |
| NPS do Modo Matchday | >70 |

---

> **Documento criado por:** UX Lead & System Architect
> **Data:** Dezembro 2025
> **Versao:** 3.1 (adicionada Arquitetura de Dados)
> **Status:** Especificacao Aprovada

```
+---------------------------------------------------------------------+
|                                                                     |
|   "O Super Cartola nao e mais um app que voce abre depois.          |
|    E um companheiro que vive o jogo COM voce."                      |
|                                                                     |
|                          - Visao 2026                               |
|                                                                     |
+---------------------------------------------------------------------+
```
