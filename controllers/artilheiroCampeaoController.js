// controllers/artilheiroCampeaoController.js - VERSÃO 4.0
// ✅ PERSISTÊNCIA MONGODB + LÓGICA DE RODADA PARCIAL (igual Luva de Ouro)
// ✅ SUPORTE A PARTICIPANTES INATIVOS (via endpoint /api/times/batch/status)

import mongoose from "mongoose";

// ========================================
// MODELO MONGODB PARA GOLS CONSOLIDADOS
// ========================================
const GolsConsolidadosSchema = new mongoose.Schema(
    {
        ligaId: { type: String, required: true, index: true },
        timeId: { type: Number, required: true, index: true },
        rodada: { type: Number, required: true, index: true },
        golsPro: { type: Number, default: 0 },
        golsContra: { type: Number, default: 0 },
        saldo: { type: Number, default: 0 },
        jogadores: [
            {
                atletaId: Number,
                nome: String,
                gols: Number,
                golsContra: Number,
            },
        ],
        parcial: { type: Boolean, default: false }, // ✅ IMPORTANTE: marca se é dado parcial
        dataColeta: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    },
);

// Índice único composto
GolsConsolidadosSchema.index(
    { ligaId: 1, timeId: 1, rodada: 1 },
    { unique: true },
);

// Usar modelo existente ou criar novo
const GolsConsolidados =
    mongoose.models.GolsConsolidados ||
    mongoose.model("GolsConsolidados", GolsConsolidadosSchema);

// ========================================
// PARTICIPANTES DA LIGA (HARDCODED)
// ========================================
const PARTICIPANTES_SOBRAL = [
    {
        timeId: 1926323,
        nome: "Daniel Barbosa",
        nomeTime: "specter United",
        clubeId: 262,
    },
    {
        timeId: 13935277,
        nome: "Paulinett Miranda",
        nomeTime: "Urubu Play F.C.",
        clubeId: 262,
    },
    {
        timeId: 14747183,
        nome: "Carlos Henrique",
        nomeTime: "CHS EC",
        clubeId: 276,
    },
    {
        timeId: 49149009,
        nome: "Matheus Coutinho",
        nomeTime: "RB Teteux SC",
        clubeId: 262,
    },
    {
        timeId: 49149388,
        nome: "Junior Brasilino",
        nomeTime: "JBMENGO94 FC",
        clubeId: 262,
    },
    {
        timeId: 50180257,
        nome: "Hivisson",
        nomeTime: "Senhores Da Escalação",
        clubeId: 267,
    },
];

// ========================================
// ESCUDOS DOS CLUBES
// ========================================
const ESCUDOS_CLUBES = {
    262: "https://s.sde.globo.com/media/organizations/2024/08/12/Flamengo.svg",
    263: "https://s.sde.globo.com/media/organizations/2018/03/11/Botafogo-RJ.svg",
    264: "https://s.sde.globo.com/media/organizations/2018/03/11/Fluminense-RJ.svg",
    265: "https://s.sde.globo.com/media/organizations/2018/03/11/vasco.svg",
    266: "https://s.sde.globo.com/media/organizations/2018/03/11/sao-paulo.svg",
    267: "https://s.sde.globo.com/media/organizations/2018/03/11/Corinthians.svg",
    275: "https://s.sde.globo.com/media/organizations/2021/08/13/gremio.svg",
    276: "https://s.sde.globo.com/media/organizations/2018/03/11/Internacional.svg",
    277: "https://s.sde.globo.com/media/organizations/2018/03/11/atletico-mg.svg",
    283: "https://s.sde.globo.com/media/organizations/2018/03/11/Cruzeiro-MG.svg",
    285: "https://s.sde.globo.com/media/organizations/2023/03/28/palmeiras.svg",
    354: "https://s.sde.globo.com/media/organizations/2019/02/04/bahia.svg",
};

class ArtilheiroCampeaoController {
    /**
     * ✅ PRINCIPAL: Retorna ranking completo
     * GET /api/artilheiro-campeao/:ligaId/ranking
     */
    static async obterRanking(req, res) {
        try {
            const { ligaId } = req.params;
            const { inicio = 1, fim = null, forcar_coleta = false } = req.query;

            console.log(
                `🏆 [ARTILHEIRO] Solicitação de ranking - Liga: ${ligaId}`,
            );

            // Validar liga
            if (ligaId !== "684d821cf1a7ae16d1f89572") {
                return res.status(400).json({
                    success: false,
                    error: "Liga não suportada",
                });
            }

            const rodadaInicio = parseInt(inicio);

            // ✅ Detectar status do mercado e rodada atual
            const statusMercado =
                await ArtilheiroCampeaoController.detectarStatusMercado();
            const rodadaAtual = statusMercado.rodadaAtual;
            const mercadoAberto = statusMercado.mercadoAberto;

            // ✅ LÓGICA IGUAL LUVA DE OURO:
            // rodadaFim = rodadaAtual (inclui parcial se mercado fechado/em andamento)
            let rodadaFim = fim ? parseInt(fim) : rodadaAtual;

            console.log(
                `📊 Rodada ${rodadaInicio}-${rodadaFim}, Mercado: ${mercadoAberto ? "Aberto" : "Fechado"}`,
            );

            // Gerar ranking (retorna { ativos, inativos, ... })
            const ranking = await ArtilheiroCampeaoController.gerarRanking(
                ligaId,
                rodadaInicio,
                rodadaFim,
                mercadoAberto,
                forcar_coleta === "true",
            );

            // Calcular estatísticas
            const estatisticas = {
                totalGolsPro: ranking.reduce((s, p) => s + p.golsPro, 0),
                totalGolsContra: ranking.reduce((s, p) => s + p.golsContra, 0),
                totalSaldo: ranking.reduce((s, p) => s + p.saldoGols, 0),
                participantes: ranking.length,
                rodadaInicio,
                rodadaFim,
                rodadaAtual,
                mercadoAberto,
            };

            res.json({
                success: true,
                data: {
                    ranking, // ✅ Ranking completo (frontend fará separação ativos/inativos)
                    estatisticas,
                    rodadaFim,
                    rodadaParcial: !mercadoAberto ? rodadaAtual : null, // ✅ Indica rodada em andamento
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error("❌ [ARTILHEIRO] Erro ao obter ranking:", error);
            res.status(500).json({
                success: false,
                error: "Erro ao gerar ranking",
                message: error.message,
            });
        }
    }

    /**
     * ✅ Detectar status do mercado (igual Luva de Ouro)
     */
    static async detectarStatusMercado() {
        try {
            const response = await fetch(
                "https://api.cartola.globo.com/mercado/status",
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            return {
                rodadaAtual: data.rodada_atual || 1,
                mercadoAberto: data.status_mercado === 1, // 1 = aberto, 2 = fechado
                statusMercado: data.status_mercado,
            };
        } catch (error) {
            console.warn("⚠️ Erro ao detectar mercado:", error.message);
            return { rodadaAtual: 36, mercadoAberto: false, statusMercado: 2 };
        }
    }

    /**
     * ✅ Endpoint para detectar rodada (chamado pelo frontend)
     * GET /api/artilheiro-campeao/:ligaId/detectar-rodada
     */
    static async detectarRodada(req, res) {
        try {
            const status =
                await ArtilheiroCampeaoController.detectarStatusMercado();

            res.json({
                success: true,
                data: {
                    rodadaAtual: status.rodadaAtual,
                    mercadoAberto: status.mercadoAberto,
                    statusMercado: status.statusMercado,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * ✅ Gerar ranking completo - OTIMIZADO COM PARALELISMO
     * - Busca do MongoDB se consolidado
     * - Busca da API se parcial ou não existe
     * - Para rodada PARCIAL: busca /atletas/pontuados uma única vez
     * - Status ativo/inativo: Frontend busca via /api/times/batch/status
     */
    static async gerarRanking(
        ligaId,
        rodadaInicio,
        rodadaFim,
        mercadoAberto,
        forcarColeta,
    ) {
        console.log(
            `🔄 Processando ${PARTICIPANTES_SOBRAL.length} participantes em PARALELO...`,
        );

        // ✅ Se mercado fechado (rodada parcial), buscar atletas pontuados ANTES
        let atletasPontuados = null;
        if (!mercadoAberto) {
            console.log(
                `🔴 Mercado FECHADO - buscando scouts em tempo real...`,
            );
            atletasPontuados =
                await ArtilheiroCampeaoController.buscarAtletasPontuados();
            const totalAtletas = Object.keys(atletasPontuados).length;
            console.log(`📊 ${totalAtletas} atletas com scouts em tempo real`);
        }

        // ✅ Processar TODOS os participantes em paralelo
        const ranking = await Promise.all(
            PARTICIPANTES_SOBRAL.map(async (participante, i) => {
                console.log(
                    `📊 [${i + 1}/${PARTICIPANTES_SOBRAL.length}] ${participante.nome}...`,
                );

                try {
                    const dados =
                        await ArtilheiroCampeaoController.obterDadosParticipante(
                            ligaId,
                            participante.timeId,
                            rodadaInicio,
                            rodadaFim,
                            mercadoAberto,
                            forcarColeta,
                            atletasPontuados, // ✅ Passar atletas pontuados para rodada parcial
                        );

                    console.log(
                        `✅ ${participante.nome}: ${dados.golsPro} GP, ${dados.golsContra} GC`,
                    );

                    return {
                        timeId: participante.timeId,
                        nome: participante.nome,
                        nomeTime: participante.nomeTime,
                        escudo: ESCUDOS_CLUBES[participante.clubeId] || null,
                        clubeId: participante.clubeId,
                        golsPro: dados.golsPro,
                        golsContra: dados.golsContra,
                        saldoGols: dados.golsPro - dados.golsContra,
                        rodadasProcessadas: dados.rodadasProcessadas,
                        detalhePorRodada: dados.detalhePorRodada,
                    };
                } catch (error) {
                    console.error(
                        `❌ Erro ${participante.nome}:`,
                        error.message,
                    );
                    return {
                        timeId: participante.timeId,
                        nome: participante.nome,
                        nomeTime: participante.nomeTime,
                        escudo: ESCUDOS_CLUBES[participante.clubeId] || null,
                        clubeId: participante.clubeId,
                        golsPro: 0,
                        golsContra: 0,
                        saldoGols: 0,
                        rodadasProcessadas: 0,
                        detalhePorRodada: [],
                    };
                }
            }),
        );

        // Ordenar por saldo de gols (desc), depois por gols pró (desc)
        ranking.sort((a, b) => {
            if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
            return b.golsPro - a.golsPro;
        });

        // Atribuir posições
        ranking.forEach((item, index) => {
            item.posicao = index + 1;
        });

        return ranking;
    }

    /**
     * ✅ Obter dados de um participante - OTIMIZADO
     * LÓGICA:
     * 1. Buscar TODAS as rodadas consolidadas do MongoDB de uma vez
     * 2. Identificar rodadas que faltam
     * 3. Buscar da API em paralelo
     * 4. Para rodada PARCIAL: usar /atletas/pontuados para scouts em tempo real
     */
    static async obterDadosParticipante(
        ligaId,
        timeId,
        rodadaInicio,
        rodadaFim,
        mercadoAberto,
        forcarColeta,
        atletasPontuados = null,
    ) {
        const detalhePorRodada = [];
        const isParcialRodada = rodadaFim; // Última rodada quando mercado fechado

        // ✅ PASSO 1: Buscar TODAS as rodadas consolidadas do MongoDB de uma vez
        let dadosMongoDB = {};
        if (!forcarColeta) {
            const registros = await GolsConsolidados.find({
                ligaId,
                timeId,
                rodada: { $gte: rodadaInicio, $lte: rodadaFim },
                parcial: false, // ✅ Só dados consolidados
            }).lean();

            registros.forEach((r) => {
                dadosMongoDB[r.rodada] = r;
            });

            if (registros.length > 0) {
                console.log(`  💾 ${registros.length} rodadas do MongoDB`);
            }
        }

        // ✅ PASSO 2: Identificar rodadas que precisam buscar da API
        const rodadasParaBuscar = [];
        for (let rodada = rodadaInicio; rodada <= rodadaFim; rodada++) {
            const isParcial = !mercadoAberto && rodada === rodadaFim;

            // ✅ SEMPRE buscar da API se:
            // - Rodada parcial (última rodada com mercado fechado)
            // - Não tem no MongoDB
            // - Forçar coleta
            const deveBuscarApi =
                isParcial || !dadosMongoDB[rodada] || forcarColeta;

            if (deveBuscarApi) {
                rodadasParaBuscar.push({ rodada, isParcial });
                if (isParcial) {
                    console.log(
                        `  ⚡ R${rodada}: Rodada PARCIAL - buscando scouts em tempo real`,
                    );
                }
            }
        }

        // ✅ PASSO 3: Buscar da API em PARALELO (máximo 5 simultâneas)
        if (rodadasParaBuscar.length > 0) {
            console.log(
                `  🌐 Buscando ${rodadasParaBuscar.length} rodadas da API...`,
            );

            // Processar em batches de 5 para não sobrecarregar a API
            const BATCH_SIZE = 5;
            for (let i = 0; i < rodadasParaBuscar.length; i += BATCH_SIZE) {
                const batch = rodadasParaBuscar.slice(i, i + BATCH_SIZE);

                const resultados = await Promise.all(
                    batch.map(async ({ rodada, isParcial }) => {
                        // ✅ Passar atletasPontuados para rodada PARCIAL
                        const dadosApi =
                            await ArtilheiroCampeaoController.buscarDadosApiCartola(
                                timeId,
                                rodada,
                                isParcial,
                                isParcial ? atletasPontuados : null,
                            );

                        if (dadosApi) {
                            // Salvar no MongoDB (async, não aguardar)
                            GolsConsolidados.findOneAndUpdate(
                                { ligaId, timeId, rodada },
                                {
                                    ligaId,
                                    timeId,
                                    rodada,
                                    golsPro: dadosApi.golsPro,
                                    golsContra: dadosApi.golsContra,
                                    saldo:
                                        dadosApi.golsPro - dadosApi.golsContra,
                                    jogadores: dadosApi.jogadores,
                                    parcial: isParcial,
                                    dataColeta: new Date(),
                                },
                                { upsert: true },
                            ).exec(); // Fire and forget

                            return {
                                rodada,
                                golsPro: dadosApi.golsPro,
                                golsContra: dadosApi.golsContra,
                                jogadores: dadosApi.jogadores,
                                parcial: isParcial,
                            };
                        }
                        return null;
                    }),
                );

                // Adicionar resultados ao dadosMongoDB
                resultados.filter(Boolean).forEach((r) => {
                    dadosMongoDB[r.rodada] = r;
                });
            }
        }

        // ✅ PASSO 4: Montar resultado final
        let golsPro = 0;
        let golsContra = 0;
        let rodadasProcessadas = 0;

        for (let rodada = rodadaInicio; rodada <= rodadaFim; rodada++) {
            const dados = dadosMongoDB[rodada];
            if (dados) {
                const gp = dados.golsPro || 0;
                const gc = dados.golsContra || 0;

                golsPro += gp;
                golsContra += gc;
                rodadasProcessadas++;

                detalhePorRodada.push({
                    rodada,
                    golsPro: gp,
                    golsContra: gc,
                    saldo: gp - gc,
                    parcial:
                        dados.parcial ||
                        (!mercadoAberto && rodada === rodadaFim),
                    jogadores: (dados.jogadores || []).filter(
                        (j) => j.gols > 0 || j.golsContra > 0,
                    ),
                });
            }
        }

        return { golsPro, golsContra, rodadasProcessadas, detalhePorRodada };
    }

    /**
     * ✅ Buscar atletas pontuados (dados PARCIAIS em tempo real)
     * Este endpoint retorna os scouts atualizados durante a rodada em andamento
     */
    static async buscarAtletasPontuados() {
        try {
            const url = "https://api.cartola.globo.com/atletas/pontuados";
            const response = await fetch(url);

            if (!response.ok) {
                console.warn(
                    `⚠️ Erro ao buscar atletas pontuados: ${response.status}`,
                );
                return {};
            }

            const data = await response.json();
            return data.atletas || {};
        } catch (error) {
            console.error(
                "❌ Erro ao buscar atletas pontuados:",
                error.message,
            );
            return {};
        }
    }

    /**
     * ✅ Buscar dados da API Cartola
     * IMPORTANTE: Para rodada PARCIAL, precisa cruzar com /atletas/pontuados
     */
    static async buscarDadosApiCartola(
        timeId,
        rodada,
        isParcial = false,
        atletasPontuados = null,
    ) {
        try {
            const url = `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.atletas) {
                return { golsPro: 0, golsContra: 0, jogadores: [], pontos: 0 };
            }

            let golsPro = 0;
            let golsContra = 0;
            const jogadores = [];

            for (const atleta of data.atletas) {
                let scout = atleta.scout || {};

                // ✅ Se é rodada PARCIAL, buscar scouts atualizados do endpoint /atletas/pontuados
                if (
                    isParcial &&
                    atletasPontuados &&
                    atletasPontuados[atleta.atleta_id]
                ) {
                    scout = atletasPontuados[atleta.atleta_id].scout || {};
                }

                const gols = scout.G || 0; // Gols feitos
                const golsC = scout.GC || 0; // Gols contra

                golsPro += gols;
                golsContra += golsC;

                if (gols > 0 || golsC > 0) {
                    jogadores.push({
                        atletaId: atleta.atleta_id,
                        nome: atleta.apelido || atleta.nome,
                        gols,
                        golsContra: golsC,
                    });
                }
            }

            // ✅ Log detalhado para debug da rodada parcial
            if (isParcial) {
                console.log(
                    `  📊 R${rodada} (PARCIAL): GP=${golsPro}, GC=${golsContra}`,
                );
                if (jogadores.length > 0) {
                    jogadores.forEach((j) =>
                        console.log(`     ⚽ ${j.nome}: ${j.gols} gol(s)`),
                    );
                }
            }

            return {
                golsPro,
                golsContra,
                jogadores,
                pontos: data.pontos || 0,
            };
        } catch (error) {
            console.warn(
                `⚠️ Erro API Cartola time ${timeId} R${rodada}:`,
                error.message,
            );
            return null;
        }
    }

    /**
     * ✅ Consolidar rodada (marca dados como não-parciais)
     * Chamado manualmente ou por scheduler quando rodada fecha
     */
    static async consolidarRodada(req, res) {
        try {
            const { ligaId, rodada } = req.params;

            console.log(`🔒 [ARTILHEIRO] Consolidando rodada ${rodada}...`);

            // Atualizar todos os registros da rodada para parcial=false
            const result = await GolsConsolidados.updateMany(
                { ligaId, rodada: parseInt(rodada), parcial: true },
                { $set: { parcial: false } },
            );

            console.log(`✅ ${result.modifiedCount} registros consolidados`);

            res.json({
                success: true,
                message: `Rodada ${rodada} consolidada`,
                registrosAtualizados: result.modifiedCount,
            });
        } catch (error) {
            console.error("❌ Erro ao consolidar:", error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * ✅ Estatísticas do sistema
     */
    static async obterEstatisticas(req, res) {
        try {
            const { ligaId } = req.params;

            const totalRegistros = await GolsConsolidados.countDocuments({
                ligaId,
            });
            const registrosConsolidados = await GolsConsolidados.countDocuments(
                { ligaId, parcial: false },
            );
            const registrosParciais = await GolsConsolidados.countDocuments({
                ligaId,
                parcial: true,
            });
            const rodadasDisponiveis = await GolsConsolidados.distinct(
                "rodada",
                { ligaId },
            );

            res.json({
                success: true,
                data: {
                    totalRegistros,
                    registrosConsolidados,
                    registrosParciais,
                    rodadasDisponiveis: rodadasDisponiveis.sort(
                        (a, b) => a - b,
                    ),
                    participantes: PARTICIPANTES_SOBRAL.length,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * ✅ Listar participantes
     */
    static async listarParticipantes(req, res) {
        try {
            const participantes = PARTICIPANTES_SOBRAL.map((p) => ({
                ...p,
                escudo: ESCUDOS_CLUBES[p.clubeId] || null,
            }));

            res.json({
                success: true,
                data: participantes,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}

export default ArtilheiroCampeaoController;
