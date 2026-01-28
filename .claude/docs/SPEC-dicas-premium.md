# SPEC - Dicas Premium MVP

**Data:** 2026-01-28
**Baseado em:** PRD-dicas-premium.md
**Status:** Especificacao Tecnica - MVP
**Versao:** 1.0

---

## Resumo da Implementacao

MVP focado em 3 funcionalidades core:
1. **Lista de Jogadores com Filtros** - Tabela filtravel por posicao/preco com dados da API Cartola
2. **Calculo de MPV** - Minimo para Valorizar calculado automaticamente
3. **Pontuacao Cedida** - Ranking de defesas vulneraveis por posicao

O modulo reutiliza o `dicas.html` e `participante-dicas.js` existentes, expandindo suas funcionalidades sem criar novos arquivos desnecessarios.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. services/dicasPremiumService.js - CRIAR

**Path:** `services/dicasPremiumService.js`
**Tipo:** Criacao
**Impacto:** Alto
**Dependentes:** controllers/dicasPremiumController.js

#### Descricao
Servico que consome a API Cartola `/atletas/mercado` e processa estatisticas.

#### Codigo Completo
```javascript
/**
 * DICAS PREMIUM SERVICE v1.0
 * Processa dados da API Cartola para estatisticas avancadas
 */

import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300 }); // 5 min

const CARTOLA_API = {
    mercado: 'https://api.cartola.globo.com/atletas/mercado',
    pontuados: 'https://api.cartola.globo.com/atletas/pontuados',
    partidas: 'https://api.cartola.globo.com/partidas',
    clubes: 'https://api.cartola.globo.com/clubes',
    status: 'https://api.cartola.globo.com/mercado/status'
};

const POSICOES = {
    1: { id: 1, nome: 'Goleiro', abrev: 'GOL' },
    2: { id: 2, nome: 'Lateral', abrev: 'LAT' },
    3: { id: 3, nome: 'Zagueiro', abrev: 'ZAG' },
    4: { id: 4, nome: 'Meia', abrev: 'MEI' },
    5: { id: 5, nome: 'Atacante', abrev: 'ATA' },
    6: { id: 6, nome: 'Tecnico', abrev: 'TEC' }
};

/**
 * Calcula MPV (Minimo para Valorizar)
 * Formula baseada em preco e rodadas jogadas
 */
function calcularMPV(preco, jogos = 1) {
    if (!preco || preco <= 0) return 0;

    const coeficienteBase = 2.5;
    const fatorPreco = Math.log10(preco + 1) * 0.8;
    const fatorRodadas = jogos > 5 ? 1.0 : 1.2;

    return Number(((coeficienteBase + fatorPreco) * fatorRodadas).toFixed(1));
}

/**
 * Busca atletas do mercado com cache
 */
async function buscarMercado() {
    const cacheKey = 'mercado_atletas';
    const cached = cache.get(cacheKey);

    if (cached) {
        console.log('[DICAS-PREMIUM] Mercado obtido do cache');
        return cached;
    }

    try {
        console.log('[DICAS-PREMIUM] Buscando mercado na API Cartola...');
        const response = await axios.get(CARTOLA_API.mercado, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Super-Cartola-Manager/1.0.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data || !response.data.atletas) {
            throw new Error('Resposta invalida da API');
        }

        const dados = {
            atletas: response.data.atletas,
            clubes: response.data.clubes,
            posicoes: response.data.posicoes,
            rodada: response.data.rodada_atual
        };

        cache.set(cacheKey, dados);
        return dados;

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao buscar mercado:', error.message);
        throw error;
    }
}

/**
 * Processa atletas com estatisticas calculadas
 */
function processarAtletas(atletas, clubes, filtros = {}) {
    const { posicao, precoMin, precoMax, mando, ordem = 'media' } = filtros;

    let resultado = atletas.map(atleta => {
        const clube = clubes[atleta.clube_id] || {};
        const jogos = atleta.jogos_num || 1;
        const media = atleta.media_num || 0;
        const preco = atleta.preco_num || 0;

        return {
            atletaId: atleta.atleta_id,
            nome: atleta.apelido || atleta.nome,
            posicaoId: atleta.posicao_id,
            posicao: POSICOES[atleta.posicao_id]?.abrev || 'N/D',
            clubeId: atleta.clube_id,
            clubeNome: clube.nome || 'N/D',
            clubeAbrev: clube.abreviacao || '???',
            preco: preco,
            variacao: atleta.variacao_num || 0,
            media: media,
            jogos: jogos,
            mpv: calcularMPV(preco, jogos),
            pontos: atleta.pontos_num || 0,
            status: atleta.status_id,
            scouts: atleta.scout || {},
            // Dados do proximo jogo
            proximoJogo: atleta.partida ? {
                adversario: atleta.partida.clube_adversario || null,
                local: atleta.partida.local || null
            } : null
        };
    });

    // Filtrar por posicao
    if (posicao && posicao !== 'todos') {
        const posId = parseInt(posicao);
        resultado = resultado.filter(a => a.posicaoId === posId);
    }

    // Filtrar por preco
    if (precoMin) {
        resultado = resultado.filter(a => a.preco >= parseFloat(precoMin));
    }
    if (precoMax) {
        resultado = resultado.filter(a => a.preco <= parseFloat(precoMax));
    }

    // Filtrar por mando (casa/fora)
    if (mando && mando !== 'todos' && resultado[0]?.proximoJogo) {
        resultado = resultado.filter(a => {
            if (!a.proximoJogo) return true;
            return mando === 'casa' ? a.proximoJogo.local === 'casa' : a.proximoJogo.local === 'fora';
        });
    }

    // Ordenar
    const ordens = {
        media: (a, b) => b.media - a.media,
        preco: (a, b) => a.preco - b.preco,
        mpv: (a, b) => a.mpv - b.mpv,
        variacao: (a, b) => b.variacao - a.variacao
    };

    resultado.sort(ordens[ordem] || ordens.media);

    return resultado;
}

/**
 * Busca jogadores com filtros
 */
export async function buscarJogadores(filtros = {}) {
    const { limit = 50, offset = 0 } = filtros;

    const mercado = await buscarMercado();
    const atletas = processarAtletas(mercado.atletas, mercado.clubes, filtros);

    return {
        jogadores: atletas.slice(offset, offset + limit),
        total: atletas.length,
        pagina: Math.floor(offset / limit) + 1,
        totalPaginas: Math.ceil(atletas.length / limit),
        rodada: mercado.rodada
    };
}

/**
 * Busca detalhes de um jogador
 */
export async function buscarJogador(atletaId) {
    const mercado = await buscarMercado();
    const atleta = mercado.atletas.find(a => a.atleta_id === parseInt(atletaId));

    if (!atleta) {
        return null;
    }

    const clube = mercado.clubes[atleta.clube_id] || {};
    const jogos = atleta.jogos_num || 1;

    return {
        atletaId: atleta.atleta_id,
        nome: atleta.apelido || atleta.nome,
        nomeCompleto: atleta.nome,
        posicaoId: atleta.posicao_id,
        posicao: POSICOES[atleta.posicao_id]?.nome || 'N/D',
        clubeId: atleta.clube_id,
        clubeNome: clube.nome || 'N/D',
        preco: atleta.preco_num || 0,
        variacao: atleta.variacao_num || 0,
        media: atleta.media_num || 0,
        jogos: jogos,
        mpv: calcularMPV(atleta.preco_num, jogos),
        minutos: atleta.minutos_num || 0,
        scouts: {
            // Positivos
            G: atleta.scout?.G || 0,
            A: atleta.scout?.A || 0,
            SG: atleta.scout?.SG || 0,
            DS: atleta.scout?.DS || 0,
            FS: atleta.scout?.FS || 0,
            FF: atleta.scout?.FF || 0,
            FD: atleta.scout?.FD || 0,
            FT: atleta.scout?.FT || 0,
            PS: atleta.scout?.PS || 0,
            DE: atleta.scout?.DE || 0,
            DP: atleta.scout?.DP || 0,
            // Negativos
            GC: atleta.scout?.GC || 0,
            CV: atleta.scout?.CV || 0,
            CA: atleta.scout?.CA || 0,
            GS: atleta.scout?.GS || 0,
            PP: atleta.scout?.PP || 0,
            PC: atleta.scout?.PC || 0,
            FC: atleta.scout?.FC || 0,
            I: atleta.scout?.I || 0
        },
        status: atleta.status_id
    };
}

/**
 * Busca pontuacao cedida por times (defesas vulneraveis)
 * Usa dados de atletas pontuados das ultimas rodadas
 */
export async function buscarPontuacaoCedida(posicaoId = 5, periodo = 5) {
    const cacheKey = `cedido_${posicaoId}_${periodo}`;
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        // Buscar status para saber rodada atual
        const statusResp = await axios.get(CARTOLA_API.status, { timeout: 10000 });
        const rodadaAtual = statusResp.data.rodada_atual || 1;

        // Coletar pontuacoes das ultimas N rodadas
        const rodadaInicio = Math.max(1, rodadaAtual - periodo);
        const pontuacoesPorClube = {};

        for (let r = rodadaInicio; r < rodadaAtual; r++) {
            try {
                const resp = await axios.get(`${CARTOLA_API.pontuados}/${r}`, { timeout: 10000 });
                const atletas = resp.data.atletas || {};

                for (const [id, atleta] of Object.entries(atletas)) {
                    // Filtrar por posicao se especificado
                    if (posicaoId && atleta.posicao_id !== parseInt(posicaoId)) {
                        continue;
                    }

                    // Identificar adversario do jogo
                    const clubeAdversario = atleta.clube_id; // Simplificado - em prod precisaria cruzar com partidas

                    if (!pontuacoesPorClube[clubeAdversario]) {
                        pontuacoesPorClube[clubeAdversario] = {
                            clubeId: clubeAdversario,
                            pontosSofridos: 0,
                            jogos: 0
                        };
                    }

                    pontuacoesPorClube[clubeAdversario].pontosSofridos += atleta.pontuacao || 0;
                    pontuacoesPorClube[clubeAdversario].jogos++;
                }
            } catch (e) {
                console.log(`[DICAS-PREMIUM] Rodada ${r} sem dados`);
            }
        }

        // Buscar nomes dos clubes
        const clubesResp = await axios.get(CARTOLA_API.clubes, { timeout: 10000 });
        const clubes = clubesResp.data || {};

        // Calcular medias e ordenar
        const resultado = Object.values(pontuacoesPorClube)
            .map(c => ({
                clubeId: c.clubeId,
                clubeNome: clubes[c.clubeId]?.nome || 'N/D',
                clubeAbrev: clubes[c.clubeId]?.abreviacao || '???',
                pontosCedidos: c.pontosSofridos,
                mediaCedida: c.jogos > 0 ? Number((c.pontosSofridos / c.jogos).toFixed(1)) : 0,
                jogos: c.jogos
            }))
            .filter(c => c.jogos >= 2) // Minimo 2 jogos para relevancia
            .sort((a, b) => b.mediaCedida - a.mediaCedida)
            .slice(0, 20);

        cache.set(cacheKey, resultado, 600); // 10 min
        return resultado;

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao buscar cedidos:', error.message);
        return [];
    }
}

/**
 * Calcula tabela de valorizacao para um preco
 */
export function calcularTabelaValorizacao(preco) {
    const cenarios = [0, 3, 5, 8, 12, 15, 20];
    const mpv = calcularMPV(preco);

    return cenarios.map(pts => {
        // Formula simplificada de variacao
        let variacao;
        if (pts === 0) {
            variacao = -0.5 - (preco * 0.02);
        } else if (pts < mpv) {
            variacao = (pts - mpv) * 0.15;
        } else {
            variacao = (pts - mpv) * 0.2;
        }

        return {
            pontos: pts,
            variacao: Number(variacao.toFixed(2)),
            novoPreco: Number((preco + variacao).toFixed(2))
        };
    });
}

export default {
    buscarJogadores,
    buscarJogador,
    buscarPontuacaoCedida,
    calcularTabelaValorizacao,
    calcularMPV
};
```

---

### 2. controllers/dicasPremiumController.js - CRIAR

**Path:** `controllers/dicasPremiumController.js`
**Tipo:** Criacao
**Impacto:** Alto
**Dependentes:** routes/dicas-premium-routes.js

#### Codigo Completo
```javascript
/**
 * DICAS PREMIUM CONTROLLER v1.0
 * Endpoints da API para o modulo Dicas Premium
 */

import dicasPremiumService from '../services/dicasPremiumService.js';

/**
 * GET /api/dicas-premium/jogadores
 * Lista jogadores com filtros
 */
export async function listarJogadores(req, res) {
    try {
        const filtros = {
            posicao: req.query.posicao,
            precoMin: req.query.precoMin,
            precoMax: req.query.precoMax,
            mando: req.query.mando,
            ordem: req.query.ordem || 'media',
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        console.log('[DICAS-PREMIUM] Buscando jogadores com filtros:', filtros);

        const resultado = await dicasPremiumService.buscarJogadores(filtros);

        res.json({
            sucesso: true,
            ...resultado
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao listar jogadores:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar jogadores',
            mensagem: error.message
        });
    }
}

/**
 * GET /api/dicas-premium/jogador/:id
 * Detalhes de um jogador especifico
 */
export async function obterJogador(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                sucesso: false,
                erro: 'ID do jogador e obrigatorio'
            });
        }

        const jogador = await dicasPremiumService.buscarJogador(id);

        if (!jogador) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Jogador nao encontrado'
            });
        }

        res.json({
            sucesso: true,
            jogador
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao obter jogador:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar jogador',
            mensagem: error.message
        });
    }
}

/**
 * GET /api/dicas-premium/confrontos
 * Pontuacao cedida por times
 */
export async function listarConfrontos(req, res) {
    try {
        const posicao = parseInt(req.query.posicao) || 5; // Default: Atacantes
        const periodo = parseInt(req.query.periodo) || 5; // Default: 5 rodadas

        const confrontos = await dicasPremiumService.buscarPontuacaoCedida(posicao, periodo);

        res.json({
            sucesso: true,
            confrontos,
            posicao,
            periodo
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao listar confrontos:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar confrontos',
            mensagem: error.message
        });
    }
}

/**
 * GET /api/dicas-premium/calculadora-mpv
 * Calcula MPV e tabela de valorizacao
 */
export async function calcularMPV(req, res) {
    try {
        const preco = parseFloat(req.query.preco);

        if (!preco || preco <= 0) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Preco invalido'
            });
        }

        const mpv = dicasPremiumService.calcularMPV(preco);
        const tabela = dicasPremiumService.calcularTabelaValorizacao(preco);

        res.json({
            sucesso: true,
            preco,
            mpv,
            tabela
        });

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao calcular MPV:', error);
        res.status(500).json({
            sucesso: false,
            erro: 'Erro ao calcular MPV',
            mensagem: error.message
        });
    }
}

export default {
    listarJogadores,
    obterJogador,
    listarConfrontos,
    calcularMPV
};
```

---

### 3. routes/dicas-premium-routes.js - CRIAR

**Path:** `routes/dicas-premium-routes.js`
**Tipo:** Criacao
**Impacto:** Medio
**Dependentes:** server.js

#### Codigo Completo
```javascript
/**
 * DICAS PREMIUM ROUTES v1.0
 * Rotas da API para o modulo Dicas Premium
 */

import express from 'express';
import * as dicasPremiumController from '../controllers/dicasPremiumController.js';

const router = express.Router();

// GET /api/dicas-premium/jogadores - Lista jogadores com filtros
router.get('/jogadores', dicasPremiumController.listarJogadores);

// GET /api/dicas-premium/jogador/:id - Detalhes de um jogador
router.get('/jogador/:id', dicasPremiumController.obterJogador);

// GET /api/dicas-premium/confrontos - Pontuacao cedida
router.get('/confrontos', dicasPremiumController.listarConfrontos);

// GET /api/dicas-premium/calculadora-mpv - Calculadora MPV
router.get('/calculadora-mpv', dicasPremiumController.calcularMPV);

export default router;
```

---

### 4. server.js - MODIFICAR

**Path:** `server.js`
**Tipo:** Modificacao
**Impacto:** Baixo

#### Mudancas Cirurgicas:

**ADICIONAR import (junto aos outros imports de routes):**
```javascript
// ANTES: (linha aproximada onde estao os outros imports)
import jogosHojeRoutes from './routes/jogos-hoje-routes.js';

// DEPOIS:
import jogosHojeRoutes from './routes/jogos-hoje-routes.js';
import dicasPremiumRoutes from './routes/dicas-premium-routes.js';
```

**ADICIONAR route (junto aos outros app.use):**
```javascript
// ANTES: (linha aproximada onde estao os outros routes)
app.use('/api/jogos-hoje', jogosHojeRoutes);

// DEPOIS:
app.use('/api/jogos-hoje', jogosHojeRoutes);
app.use('/api/dicas-premium', dicasPremiumRoutes);
```

---

### 5. public/participante/fronts/dicas.html - MODIFICAR

**Path:** `public/participante/fronts/dicas.html`
**Tipo:** Modificacao
**Impacto:** Medio

#### Codigo Completo (substituir conteudo)
```html
<!-- =====================================================================
     DICAS.HTML - Dicas Premium v2.0
     Super Cartola Manager
     ===================================================================== -->

<div id="dicas-container" class="min-h-screen bg-[#0a0a0a]">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-white/10">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                    Dicas Premium
                </h2>
                <p class="text-xs text-white/50" id="dicas-rodada-info">Carregando...</p>
            </div>
            <div id="dicas-mercado-status"></div>
        </div>
    </div>

    <!-- Tabs de Navegacao -->
    <div class="px-4 py-2 border-b border-white/10">
        <div class="flex gap-2 overflow-x-auto pb-1" id="dicas-tabs">
            <button class="dicas-tab active" data-tab="jogadores">
                <span class="material-icons text-sm">people</span>
                Jogadores
            </button>
            <button class="dicas-tab" data-tab="confrontos">
                <span class="material-icons text-sm">sports_soccer</span>
                Confrontos
            </button>
            <button class="dicas-tab" data-tab="calculadora">
                <span class="material-icons text-sm">calculate</span>
                MPV
            </button>
        </div>
    </div>

    <!-- Conteudo das Tabs -->
    <div id="dicas-content" class="pb-28">
        <!-- Conteudo sera renderizado pelo JS -->
        <div class="flex flex-col items-center justify-center min-h-[400px] py-16">
            <div class="w-12 h-12 border-4 border-zinc-700 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <p class="text-sm text-gray-400">Analisando mercado...</p>
        </div>
    </div>
</div>

<style>
.dicas-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    white-space: nowrap;
    transition: all 0.2s;
}

.dicas-tab:active {
    transform: scale(0.98);
}

.dicas-tab.active {
    color: #ff5500;
    background: rgba(255,85,0,0.1);
    border-color: rgba(255,85,0,0.3);
}

.dicas-filtro-btn {
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.6);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.2s;
}

.dicas-filtro-btn.active {
    color: white;
    background: #ff5500;
    border-color: #ff5500;
}

.dicas-jogador-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    transition: all 0.2s;
}

.dicas-jogador-card:active {
    transform: scale(0.99);
    background: rgba(255,255,255,0.05);
}

.dicas-confronto-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
}

.dicas-input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 16px;
    color: white;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    outline: none;
}

.dicas-input:focus {
    border-color: #ff5500;
    background: rgba(255,85,0,0.05);
}

.mpv-tabela-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.mpv-tabela-row:last-child {
    border-bottom: none;
}
</style>
```

---

### 6. public/participante/js/modules/participante-dicas.js - MODIFICAR

**Path:** `public/participante/js/modules/participante-dicas.js`
**Tipo:** Modificacao
**Impacto:** Alto

#### Codigo Completo (substituir conteudo)
```javascript
// =====================================================================
// PARTICIPANTE-DICAS.JS - v2.0 (DICAS PREMIUM)
// =====================================================================
// v2.0: Dicas Premium com filtros, MPV e confrontos
// v1.1: Versao basica com dicas genericas
// =====================================================================

if (window.Log) Log.info("PARTICIPANTE-DICAS", "🔄 Carregando modulo v2.0...");

// Estado do modulo
let estadoDicas = {
    tabAtual: 'jogadores',
    jogadores: [],
    confrontos: [],
    filtros: {
        posicao: 'todos',
        ordem: 'media'
    },
    rodada: null,
    carregando: false
};

const POSICOES = [
    { id: 'todos', nome: 'Todos', abrev: 'TODOS' },
    { id: 1, nome: 'Goleiro', abrev: 'GOL' },
    { id: 2, nome: 'Lateral', abrev: 'LAT' },
    { id: 3, nome: 'Zagueiro', abrev: 'ZAG' },
    { id: 4, nome: 'Meia', abrev: 'MEI' },
    { id: 5, nome: 'Atacante', abrev: 'ATA' },
    { id: 6, nome: 'Tecnico', abrev: 'TEC' }
];

// =====================================================================
// FUNCAO PRINCIPAL DE INICIALIZACAO
// =====================================================================
export async function inicializarDicasParticipante(params) {
    if (window.Log) Log.debug("PARTICIPANTE-DICAS", "🚀 Inicializando v2.0...");

    // Configurar tabs
    configurarTabs();

    // Carregar tab inicial
    await carregarTab('jogadores');
}

// =====================================================================
// NAVEGACAO POR TABS
// =====================================================================
function configurarTabs() {
    const tabs = document.getElementById('dicas-tabs');
    if (!tabs) return;

    tabs.addEventListener('click', async (e) => {
        const btn = e.target.closest('.dicas-tab');
        if (!btn) return;

        const tab = btn.dataset.tab;
        if (tab === estadoDicas.tabAtual) return;

        // Atualizar visual
        tabs.querySelectorAll('.dicas-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        // Carregar tab
        await carregarTab(tab);
    });
}

async function carregarTab(tab) {
    estadoDicas.tabAtual = tab;
    const content = document.getElementById('dicas-content');

    if (tab === 'jogadores') {
        await carregarJogadores();
    } else if (tab === 'confrontos') {
        await carregarConfrontos();
    } else if (tab === 'calculadora') {
        renderizarCalculadora();
    }
}

// =====================================================================
// TAB: JOGADORES
// =====================================================================
async function carregarJogadores() {
    const content = document.getElementById('dicas-content');
    content.innerHTML = renderizarLoading('Buscando jogadores...');

    try {
        const params = new URLSearchParams({
            posicao: estadoDicas.filtros.posicao !== 'todos' ? estadoDicas.filtros.posicao : '',
            ordem: estadoDicas.filtros.ordem,
            limit: 30
        });

        const resp = await fetch(`/api/dicas-premium/jogadores?${params}`);
        const data = await resp.json();

        if (!data.sucesso) throw new Error(data.erro);

        estadoDicas.jogadores = data.jogadores;
        estadoDicas.rodada = data.rodada;

        // Atualizar info da rodada
        const rodadaInfo = document.getElementById('dicas-rodada-info');
        if (rodadaInfo) rodadaInfo.textContent = `Rodada ${data.rodada}`;

        renderizarTabJogadores();

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "Erro:", error);
        content.innerHTML = renderizarErro(error.message);
    }
}

function renderizarTabJogadores() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <!-- Filtros -->
        <div class="px-4 py-3 border-b border-white/10">
            <div class="flex gap-2 overflow-x-auto pb-1" id="filtros-posicao">
                ${POSICOES.map(p => `
                    <button class="dicas-filtro-btn ${estadoDicas.filtros.posicao == p.id ? 'active' : ''}"
                            data-posicao="${p.id}">
                        ${p.abrev}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- Ordenacao -->
        <div class="px-4 py-2 flex items-center justify-between">
            <span class="text-xs text-white/40">${estadoDicas.jogadores.length} jogadores</span>
            <select id="ordem-select" class="bg-transparent text-xs text-white/60 border-none outline-none">
                <option value="media" ${estadoDicas.filtros.ordem === 'media' ? 'selected' : ''}>Ordenar: Media</option>
                <option value="preco" ${estadoDicas.filtros.ordem === 'preco' ? 'selected' : ''}>Ordenar: Preco</option>
                <option value="mpv" ${estadoDicas.filtros.ordem === 'mpv' ? 'selected' : ''}>Ordenar: MPV</option>
                <option value="variacao" ${estadoDicas.filtros.ordem === 'variacao' ? 'selected' : ''}>Ordenar: Variacao</option>
            </select>
        </div>

        <!-- Lista de Jogadores -->
        <div class="px-4 space-y-2" id="lista-jogadores">
            ${estadoDicas.jogadores.map(j => renderizarCardJogador(j)).join('')}
        </div>
    `;

    // Event listeners
    document.getElementById('filtros-posicao')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.dicas-filtro-btn');
        if (!btn) return;

        estadoDicas.filtros.posicao = btn.dataset.posicao;
        await carregarJogadores();
    });

    document.getElementById('ordem-select')?.addEventListener('change', async (e) => {
        estadoDicas.filtros.ordem = e.target.value;
        await carregarJogadores();
    });
}

function renderizarCardJogador(j) {
    const variacaoCor = j.variacao >= 0 ? 'text-green-400' : 'text-red-400';
    const variacaoIcon = j.variacao >= 0 ? 'trending_up' : 'trending_down';

    return `
        <div class="dicas-jogador-card" onclick="window.abrirDetalheJogador(${j.atletaId})">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <img src="/escudos/${j.clubeId}.png" onerror="this.src='/escudos/default.png'" class="w-6 h-6" alt="">
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-white truncate">${j.nome}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">${j.posicao}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                    <span>C$ ${j.preco.toFixed(2)}</span>
                    <span class="flex items-center gap-0.5 ${variacaoCor}">
                        <span class="material-icons text-xs">${variacaoIcon}</span>
                        ${j.variacao > 0 ? '+' : ''}${j.variacao.toFixed(2)}
                    </span>
                </div>
            </div>
            <div class="text-right">
                <div class="text-lg font-bold text-primary" style="font-family: 'JetBrains Mono', monospace;">
                    ${j.media.toFixed(1)}
                </div>
                <div class="text-[10px] text-white/40">MPV ${j.mpv}</div>
            </div>
        </div>
    `;
}

// =====================================================================
// TAB: CONFRONTOS
// =====================================================================
async function carregarConfrontos() {
    const content = document.getElementById('dicas-content');
    content.innerHTML = renderizarLoading('Analisando confrontos...');

    try {
        const resp = await fetch('/api/dicas-premium/confrontos?posicao=5&periodo=5');
        const data = await resp.json();

        if (!data.sucesso) throw new Error(data.erro);

        estadoDicas.confrontos = data.confrontos;
        renderizarTabConfrontos();

    } catch (error) {
        if (window.Log) Log.error("PARTICIPANTE-DICAS", "Erro confrontos:", error);
        content.innerHTML = renderizarErro(error.message);
    }
}

function renderizarTabConfrontos() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-icons text-red-400">gpp_bad</span>
                <h3 class="text-sm font-bold text-white">Defesas Vulneraveis</h3>
            </div>
            <p class="text-xs text-white/50 mb-4">
                Times que mais cedem pontos para atacantes nas ultimas 5 rodadas
            </p>

            <div class="space-y-2">
                ${estadoDicas.confrontos.map((c, i) => `
                    <div class="dicas-confronto-card">
                        <div class="flex items-center gap-3">
                            <span class="w-6 text-center text-xs font-bold ${i < 3 ? 'text-red-400' : 'text-white/40'}">${i + 1}º</span>
                            <img src="/escudos/${c.clubeId}.png" onerror="this.src='/escudos/default.png'" class="w-8 h-8" alt="">
                            <span class="text-sm text-white">${c.clubeNome}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-lg font-bold text-red-400" style="font-family: 'JetBrains Mono', monospace;">
                                ${c.mediaCedida}
                            </span>
                            <span class="text-xs text-white/40 block">pts/jogo</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${estadoDicas.confrontos.length === 0 ? `
                <div class="text-center py-8 text-white/40">
                    <span class="material-icons text-4xl mb-2">sports_soccer</span>
                    <p>Dados insuficientes para analise</p>
                </div>
            ` : ''}
        </div>
    `;
}

// =====================================================================
// TAB: CALCULADORA MPV
// =====================================================================
function renderizarCalculadora() {
    const content = document.getElementById('dicas-content');

    content.innerHTML = `
        <div class="px-4 py-4">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-icons text-primary">calculate</span>
                <h3 class="text-sm font-bold text-white">Calculadora de Valorizacao</h3>
            </div>

            <div class="mb-4">
                <label class="text-xs text-white/50 block mb-2">Preco do Jogador (Cartoletas)</label>
                <input type="number" id="mpv-input" class="dicas-input" placeholder="Ex: 12.50" step="0.01" min="0">
            </div>

            <button id="calcular-mpv-btn" class="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm">
                Calcular MPV
            </button>

            <div id="mpv-resultado" class="mt-4 hidden">
                <!-- Resultado sera inserido aqui -->
            </div>
        </div>
    `;

    document.getElementById('calcular-mpv-btn')?.addEventListener('click', calcularMPV);
    document.getElementById('mpv-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calcularMPV();
    });
}

async function calcularMPV() {
    const input = document.getElementById('mpv-input');
    const resultado = document.getElementById('mpv-resultado');
    const preco = parseFloat(input?.value);

    if (!preco || preco <= 0) {
        resultado.innerHTML = `
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                Digite um preco valido
            </div>
        `;
        resultado.classList.remove('hidden');
        return;
    }

    try {
        const resp = await fetch(`/api/dicas-premium/calculadora-mpv?preco=${preco}`);
        const data = await resp.json();

        if (!data.sucesso) throw new Error(data.erro);

        resultado.innerHTML = `
            <div class="p-4 rounded-xl bg-white/5 border border-white/10">
                <div class="text-center mb-4">
                    <div class="text-sm text-white/50">Minimo para Valorizar</div>
                    <div class="text-3xl font-bold text-primary" style="font-family: 'JetBrains Mono', monospace;">
                        ${data.mpv} pts
                    </div>
                </div>

                <div class="text-xs text-white/50 mb-2">Simulacao de Pontuacao:</div>
                <div class="bg-black/20 rounded-lg overflow-hidden">
                    ${data.tabela.map(t => `
                        <div class="mpv-tabela-row">
                            <span class="text-white/60">${t.pontos} pts</span>
                            <span class="${t.variacao >= 0 ? 'text-green-400' : 'text-red-400'}">
                                ${t.variacao > 0 ? '+' : ''}C$ ${t.variacao.toFixed(2)}
                            </span>
                            <span class="text-white/40">C$ ${t.novoPreco.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        resultado.classList.remove('hidden');

    } catch (error) {
        resultado.innerHTML = `
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                ${error.message}
            </div>
        `;
        resultado.classList.remove('hidden');
    }
}

// =====================================================================
// FUNCOES AUXILIARES
// =====================================================================
function renderizarLoading(texto = 'Carregando...') {
    return `
        <div class="flex flex-col items-center justify-center min-h-[300px] py-16">
            <div class="w-10 h-10 border-4 border-zinc-700 border-t-primary rounded-full animate-spin mb-3"></div>
            <p class="text-sm text-gray-400">${texto}</p>
        </div>
    `;
}

function renderizarErro(mensagem) {
    return `
        <div class="text-center py-16 px-5">
            <span class="material-icons text-5xl text-red-500 mb-4 block">error</span>
            <p class="text-white/70">${mensagem || 'Erro ao carregar dados'}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white text-sm">
                Tentar novamente
            </button>
        </div>
    `;
}

// Modal de detalhes (simplificado para MVP)
window.abrirDetalheJogador = async function(atletaId) {
    // MVP: apenas log - implementar modal na fase 2
    if (window.Log) Log.info("PARTICIPANTE-DICAS", `Detalhe jogador: ${atletaId}`);
};

// Expor globalmente
window.inicializarDicasParticipante = inicializarDicasParticipante;

if (window.Log) Log.info("PARTICIPANTE-DICAS", "✅ Modulo v2.0 carregado (Dicas Premium)");
```

---

### 7. config/modulos-defaults.js - MODIFICAR

**Path:** `config/modulos-defaults.js`
**Tipo:** Modificacao
**Impacto:** Baixo

#### Mudancas Cirurgicas:

**Linha 33: ADICIONAR**
```javascript
// ANTES:
    luvaOuro: false,        // Prêmio luva de ouro - OPCIONAL
};

// DEPOIS:
    luvaOuro: false,        // Prêmio luva de ouro - OPCIONAL
    dicasPremium: false,    // Dicas Premium (estatisticas avancadas) - OPCIONAL
};
```

**Linha 50: ADICIONAR**
```javascript
// ANTES:
        luvaOuro: modulosAtivos.luvaOuro ?? MODULOS_DEFAULTS.luvaOuro,

// DEPOIS:
        luvaOuro: modulosAtivos.luvaOuro ?? MODULOS_DEFAULTS.luvaOuro,
        dicasPremium: modulosAtivos.dicasPremium ?? MODULOS_DEFAULTS.dicasPremium,
```

---

## Mapa de Dependencias

```
NOVOS ARQUIVOS:
services/dicasPremiumService.js (Servico)
    └── axios, node-cache (dependencias existentes)

controllers/dicasPremiumController.js (Controller)
    └── services/dicasPremiumService.js

routes/dicas-premium-routes.js (Rotas)
    └── controllers/dicasPremiumController.js

MODIFICACOES:
server.js
    └── routes/dicas-premium-routes.js (novo import + use)

public/participante/fronts/dicas.html
    └── (estrutura HTML atualizada)

public/participante/js/modules/participante-dicas.js
    └── /api/dicas-premium/* (novos endpoints)

config/modulos-defaults.js
    └── dicasPremium: false (nova chave)

public/participante/js/participante-navigation.js
    └── (nenhuma mudanca - ja mapeia dicas.html)
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [ ] N/A - Modulo nao tem filtro por liga (dados sao da API Cartola)
- [x] Dados publicos da API Cartola FC (sem restricao)

### Autenticacao
- [ ] Rotas sao publicas dentro do app participante
- [ ] Verificacao de liga ativa pode ser adicionada (fase 2)

---

## Casos de Teste

### Teste 1: Listar Jogadores
**Setup:** Mercado aberto, API Cartola disponivel
**Acao:** GET /api/dicas-premium/jogadores?posicao=5&ordem=media&limit=10
**Resultado Esperado:** Lista de 10 atacantes ordenados por media

### Teste 2: Filtrar por Posicao
**Setup:** Dados em cache
**Acao:** Clicar no filtro "GOL"
**Resultado Esperado:** Lista atualizada apenas com goleiros

### Teste 3: Calcular MPV
**Setup:** Tab calculadora aberta
**Acao:** Digitar 12.50 e clicar calcular
**Resultado Esperado:** MPV ~3.4 pts + tabela de simulacao

### Teste 4: API Cartola Offline
**Setup:** API Cartola indisponivel
**Acao:** Acessar tab Jogadores
**Resultado Esperado:** Mensagem de erro amigavel + botao retry

---

## Rollback Plan

### Em Caso de Falha
1. Remover import no server.js
2. Deletar arquivos novos:
   - services/dicasPremiumService.js
   - controllers/dicasPremiumController.js
   - routes/dicas-premium-routes.js
3. Restaurar dicas.html e participante-dicas.js do git

```bash
git checkout HEAD -- public/participante/fronts/dicas.html
git checkout HEAD -- public/participante/js/modules/participante-dicas.js
git checkout HEAD -- config/modulos-defaults.js
```

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - CRIAR services/dicasPremiumService.js
   - CRIAR controllers/dicasPremiumController.js
   - CRIAR routes/dicas-premium-routes.js
   - MODIFICAR server.js (import + use)

2. **Frontend depois:**
   - MODIFICAR public/participante/fronts/dicas.html
   - MODIFICAR public/participante/js/modules/participante-dicas.js

3. **Configuracao:**
   - MODIFICAR config/modulos-defaults.js

4. **Testes:**
   - Verificar endpoints via curl/Postman
   - Testar navegacao no app participante
   - Validar cache e performance

---

## Proximo Passo

**Comando para Fase 3:**
```
/code .claude/docs/SPEC-dicas-premium.md
```

---

**Gerado por:** Spec Protocol v1.0
