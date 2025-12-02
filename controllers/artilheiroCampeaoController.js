// controllers/artilheiroCampeaoController.js - VERSÃO 4.1
// ✅ PERSISTÊNCIA MONGODB + LÓGICA DE RODADA PARCIAL (igual Luva de Ouro)
// ✅ SUPORTE A PARTICIPANTES INATIVOS (via endpoint /api/times/batch/status)
// ✅ CORREÇÃO v4.1: Não incluir rodada atual quando mercado aberto (sem scouts válidos)

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
    285: "https://s.sde.globo.com/media/organizations/2019/02/13/bahia.svg",
    286: "https://s.sde.globo.com/media/organizations/2018/03/11/Vitoria-BA.svg",
    287: "https://s.sde.globo.com/media/organizations/2020/01/30/sport.svg",
    290: "https://s.sde.globo.com/media/organizations/2018/03/11/Goias.svg",
    292: "https://s.sde.globo.com/media/organizations/2018/03/11/coritiba.svg",
    293: "https://s.sde.globo.com/media/organizations/2018/03/11/Atletico-PR.svg",
    294: "https://s.sde.globo.com/media/organizations/2018/03/12/Santos-SP.svg",
    315: "https://s.sde.globo.com/media/organizations/2018/03/11/Palmeiras-SP.svg",
    354: "https://s.sde.globo.com/media/organizations/2018/03/12/ceara.svg",
    356: "https://s.sde.globo.com/media/organizations/2018/03/11/Fortaleza-CE.svg",
    373: "https://s.sde.globo.com/media/organizations/2018/03/11/Bragantino.svg",
    1371: "https://s.sde.globo.com/media/organizations/2018/03/11/Cuiaba_MT.svg",
    327: "https://s.sde.globo.com/media/organizations/2020/01/30/juventude.svg",
    1335: "https://s.sde.globo.com/media/organizations/2023/03/13/Criciuma-SC.svg",
    1386: "https://s.sde.globo.com/media/organizations/2018/03/14/Operario-Ferroviario-PR.svg",
    341: "https://s.sde.globo.com/media/organizations/2025/01/04/avai_A9FyNlD.svg",
    343: "https://s.sde.globo.com/media/organizations/2025/01/02/Chapecoense.svg",
    352: "https://s.sde.globo.com/media/organizations/2025/01/17/Paysandu_TVYU2Sn.svg",
    364: "https://s.sde.globo.com/media/organizations/2025/01/05/Mirassol.svg",
    1373: "https://s.sde.globo.com/media/organizations/2024/01/18/Botafogo-PB.svg",
};

// ========================================
// CONTROLLER
// ========================================
class ArtilheiroCampeaoController {
    /**
     * ✅ Endpoint principal: Ranking de Artilheiros
     * GET /api/artilheiro-campeao/:ligaId/ranking
     */
    static async obterRanking(req, res) {
        try {
            const { ligaId } = req.params;
            const { inicio, fim, forcar_coleta } = req.query;

            console.log(
                ` [ARTILHEIRO] Solicitação de ranking - Liga: ${ligaId}`,
            );

            const rodadaInicio = inicio ? parseInt(inicio) : 1;

            // ✅ Detectar status do mercado
            const statusMercado =
                await ArtilheiroCampeaoController.detectarStatusMercado();
            const rodadaAtual = statusMercado.rodadaAtual;
            const mercadoAberto = statusMercado.mercadoAberto;

            // ✅ CORREÇÃO v4.1: LÓGICA CORRETA DE RODADA FIM
            // - Mercado ABERTO: rodada ainda não começou, usar rodadaAtual - 1 (última consolidada)
            // - Mercado FECHADO: bola rolando, incluir rodada atual (parcial)
            let rodadaFim;
            if (fim) {
                rodadaFim = parseInt(fim);
                // ✅ CORREÇÃO: Se mercado aberto e fim = rodadaAtual, corrigir para rodadaAtual - 1
                // Pois não existem scouts válidos na rodada atual quando mercado está aberto
                if (mercadoAberto && rodadaFim >= rodadaAtual) {
                    rodadaFim = rodadaAtual - 1;
                    console.log(
                        `⚠️ Corrigido: fim=${fim} → ${rodadaFim} (mercado aberto, sem scouts)`,
                    );
                }
            } else {
                rodadaFim = mercadoAberto ? rodadaAtual - 1 : rodadaAtual;
            }

            // Garantir que rodadaFim não seja menor que rodadaInicio
            if (rodadaFim < rodadaInicio) {
                rodadaFim = rodadaInicio;
            }

            console.log(
                `📊 Rodada ${rodadaInicio}-${rodadaFim}, Mercado: ${mercadoAberto ? "Aberto" : "Fechado"}, Rodada API: ${rodadaAtual}`,
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
                    rodadaParcial: !mercadoAberto ? rodadaAtual : null, // ✅ Indica rodada em andamento (só se mercado fechado)
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
                    // ✅ NOVO: informar última rodada consolidada
                    ultimaRodadaConsolidada: status.mercadoAberto
                        ? status.rodadaAtual - 1
                        : status.rodadaAtual,
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
                        erro: error.message,
                    };
                }
            }),
        );

        // Ordenar por gols pró (maior primeiro), depois por saldo
        return ranking.sort((a, b) => {
            if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
            return b.saldoGols - a.saldoGols;
        });
    }

    /**
     * ✅ Obter dados de um participante específico
     * - Busca rodadas consolidadas do MongoDB
     * - Busca rodada atual da API se parcial
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
        let golsPro = 0;
        let golsContra = 0;
        let rodadasProcessadas = 0;
        const detalhePorRodada = [];

        // ✅ 1. Buscar rodadas consolidadas do MongoDB
        const rodadasDB = await GolsConsolidados.find({
            ligaId: ligaId,
            timeId: timeId,
            rodada: { $gte: rodadaInicio, $lte: rodadaFim },
            parcial: false, // Apenas consolidadas
        }).lean();

        console.log(`  💾 ${rodadasDB.length} rodadas do MongoDB`);

        // Somar gols das rodadas consolidadas
        for (const rodada of rodadasDB) {
            golsPro += rodada.golsPro || 0;
            golsContra += rodada.golsContra || 0;
            rodadasProcessadas++;
            detalhePorRodada.push({
                rodada: rodada.rodada,
                golsPro: rodada.golsPro,
                golsContra: rodada.golsContra,
                jogadores: rodada.jogadores || [],
                fonte: "mongodb",
            });
        }

        // ✅ 2. Se mercado FECHADO, adicionar dados parciais da rodada atual
        if (!mercadoAberto && atletasPontuados) {
            const dadosParciais =
                await ArtilheiroCampeaoController.calcularGolsRodadaParcial(
                    timeId,
                    rodadaFim,
                    atletasPontuados,
                );

            if (dadosParciais) {
                golsPro += dadosParciais.golsPro;
                golsContra += dadosParciais.golsContra;

                // Verificar se já existe rodada parcial no detalhe
                const existeParcial = detalhePorRodada.some(
                    (d) => d.rodada === rodadaFim,
                );
                if (!existeParcial) {
                    rodadasProcessadas++;
                    detalhePorRodada.push({
                        rodada: rodadaFim,
                        golsPro: dadosParciais.golsPro,
                        golsContra: dadosParciais.golsContra,
                        jogadores: dadosParciais.jogadores,
                        fonte: "api_parcial",
                        parcial: true,
                    });
                }
            }
        }

        return {
            golsPro,
            golsContra,
            rodadasProcessadas,
            detalhePorRodada,
        };
    }

    /**
     * ✅ Buscar atletas pontuados (para rodada parcial)
     */
    static async buscarAtletasPontuados() {
        try {
            const response = await fetch(
                "https://api.cartola.globo.com/atletas/pontuados",
            );
            if (!response.ok) return {};

            const data = await response.json();
            return data.atletas || {};
        } catch (error) {
            console.warn("⚠️ Erro ao buscar atletas pontuados:", error.message);
            return {};
        }
    }

    /**
     * ✅ Calcular gols de uma rodada parcial
     */
    static async calcularGolsRodadaParcial(timeId, rodada, atletasPontuados) {
        try {
            // Buscar escalação do time na rodada
            const response = await fetch(
                `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`,
            );
            if (!response.ok) return null;

            const data = await response.json();
            const atletas = data.atletas || [];

            let golsPro = 0;
            let golsContra = 0;
            const jogadores = [];

            for (const atleta of atletas) {
                const atletaId = atleta.atleta_id;
                const pontuado = atletasPontuados[atletaId];

                if (pontuado && pontuado.scout) {
                    const gols = pontuado.scout.G || 0;
                    const gc = pontuado.scout.GC || 0;

                    if (gols > 0 || gc > 0) {
                        golsPro += gols;
                        golsContra += gc;
                        jogadores.push({
                            atletaId,
                            nome: atleta.apelido || pontuado.apelido,
                            gols,
                            golsContra: gc,
                        });
                    }
                }
            }

            return { golsPro, golsContra, jogadores };
        } catch (error) {
            console.warn(
                `⚠️ Erro ao calcular parcial time ${timeId}:`,
                error.message,
            );
            return null;
        }
    }

    /**
     * ✅ Endpoint para forçar coleta de uma rodada específica
     * POST /api/artilheiro-campeao/:ligaId/coletar/:rodada
     */
    static async coletarRodada(req, res) {
        try {
            const { ligaId, rodada } = req.params;
            const rodadaNum = parseInt(rodada);

            console.log(
                `🔄 [ARTILHEIRO] Coletando rodada ${rodadaNum} para liga ${ligaId}...`,
            );

            const resultados = [];

            for (const participante of PARTICIPANTES_SOBRAL) {
                try {
                    const dados =
                        await ArtilheiroCampeaoController.coletarDadosRodada(
                            ligaId,
                            participante.timeId,
                            rodadaNum,
                        );

                    resultados.push({
                        timeId: participante.timeId,
                        nome: participante.nome,
                        ...dados,
                    });
                } catch (error) {
                    resultados.push({
                        timeId: participante.timeId,
                        nome: participante.nome,
                        erro: error.message,
                    });
                }
            }

            res.json({
                success: true,
                rodada: rodadaNum,
                resultados,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * ✅ Coletar dados de uma rodada específica para um time
     */
    static async coletarDadosRodada(ligaId, timeId, rodada) {
        try {
            const response = await fetch(
                `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`,
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const atletas = data.atletas || [];

            let golsPro = 0;
            let golsContra = 0;
            const jogadores = [];

            for (const atleta of atletas) {
                const scout = atleta.scout || {};
                const gols = scout.G || 0;
                const gc = scout.GC || 0;

                if (gols > 0 || gc > 0) {
                    golsPro += gols;
                    golsContra += gc;
                    jogadores.push({
                        atletaId: atleta.atleta_id,
                        nome: atleta.apelido,
                        gols,
                        golsContra: gc,
                    });
                }
            }

            // ✅ Salvar no MongoDB (upsert)
            await GolsConsolidados.findOneAndUpdate(
                { ligaId, timeId, rodada },
                {
                    ligaId,
                    timeId,
                    rodada,
                    golsPro,
                    golsContra,
                    saldo: golsPro - golsContra,
                    jogadores,
                    parcial: false,
                    dataColeta: new Date(),
                },
                { upsert: true, new: true },
            );

            return { golsPro, golsContra, jogadores, salvo: true };
        } catch (error) {
            throw error;
        }
    }

    /**
     * ✅ Endpoint para limpar cache de uma liga
     * DELETE /api/artilheiro-campeao/:ligaId/cache
     */
    static async limparCache(req, res) {
        try {
            const { ligaId } = req.params;

            const result = await GolsConsolidados.deleteMany({ ligaId });

            res.json({
                success: true,
                message: `Cache limpo: ${result.deletedCount} registros removidos`,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * ✅ Endpoint para obter detalhes de um time específico
     * GET /api/artilheiro-campeao/:ligaId/time/:timeId
     */
    static async getDetalheTime(req, res) {
        try {
            const { ligaId, timeId } = req.params;

            const rodadas = await GolsConsolidados.find({
                ligaId,
                timeId: parseInt(timeId),
            })
                .sort({ rodada: 1 })
                .lean();

            const totais = rodadas.reduce(
                (acc, r) => {
                    acc.golsPro += r.golsPro || 0;
                    acc.golsContra += r.golsContra || 0;
                    return acc;
                },
                { golsPro: 0, golsContra: 0 },
            );

            res.json({
                success: true,
                timeId: parseInt(timeId),
                totais: {
                    ...totais,
                    saldo: totais.golsPro - totais.golsContra,
                },
                rodadas,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    /**
     * ✅ Consolidar rodada (marca dados como não-parciais)
     * POST /api/artilheiro-campeao/:ligaId/consolidar/:rodada
     */
    static async consolidarRodada(req, res) {
        try {
            const { ligaId, rodada } = req.params;

            console.log(`🔒 [ARTILHEIRO] Consolidando rodada ${rodada}...`);

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
     * GET /api/artilheiro-campeao/:ligaId/estatisticas
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
     * GET /api/artilheiro-campeao/:ligaId/participantes
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
