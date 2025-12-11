// controllers/artilheiroCampeaoController.js - VERSÃO 4.4
// ✅ PERSISTÊNCIA MONGODB + LÓGICA DE RODADA PARCIAL (igual Luva de Ouro)
// ✅ SUPORTE A PARTICIPANTES INATIVOS - FILTRO INTEGRADO
// ✅ CORREÇÃO v4.1: Não incluir rodada atual quando mercado aberto (sem scouts válidos)
// ✅ CORREÇÃO v4.2: Incluir rodadas anteriores mesmo se parcial=true (rodadas passadas são válidas)
// ✅ CORREÇÃO v4.3: Integração com participanteHelper para filtrar inativos
// ✅ CORREÇÃO v4.4: COLETA AUTOMÁTICA de rodadas faltantes no MongoDB

import mongoose from "mongoose";
import {
    buscarStatusParticipantes,
    obterUltimaRodadaValida,
    ordenarRankingComInativos,
} from "../utils/participanteHelper.js";

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
        parcial: { type: Boolean, default: false },
        dataColeta: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    },
);

GolsConsolidadosSchema.index(
    { ligaId: 1, timeId: 1, rodada: 1 },
    { unique: true },
);

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

            // ✅ v4.4: Detectar status do mercado COM temporada encerrada
            const statusMercado =
                await ArtilheiroCampeaoController.detectarStatusMercado();
            const rodadaAtual = statusMercado.rodadaAtual;
            const mercadoAberto = statusMercado.mercadoAberto;
            const temporadaEncerrada = statusMercado.temporadaEncerrada;
            const rodadaEmAndamento = statusMercado.rodadaEmAndamento;

            // ✅ v4.5: LÓGICA CORRETA DE RODADA FIM
            let rodadaFim;
            if (fim) {
                rodadaFim = parseInt(fim);
                // ✅ v4.5: Se temporada encerrada (R38), não subtrair
                if (mercadoAberto && rodadaFim >= rodadaAtual && rodadaAtual < 38) {
                    rodadaFim = rodadaAtual - 1;
                    console.log(
                        `⚠️ Corrigido: fim=${fim} → ${rodadaFim} (mercado aberto, sem scouts)`,
                    );
                }
            } else {
                // ✅ v4.5: Se rodada >= 38, sempre usar 38 (temporada encerrada)
                if (rodadaAtual >= 38) {
                    rodadaFim = 38;
                    console.log(`🏁 Temporada encerrada - usando R38`);
                } else if (mercadoAberto) {
                    rodadaFim = rodadaAtual - 1;
                } else {
                    rodadaFim = rodadaAtual;
                }
            }

            if (rodadaFim < rodadaInicio) {
                rodadaFim = rodadaInicio;
            }

            console.log(
                `📊 Rodada ${rodadaInicio}-${rodadaFim}, Mercado: ${mercadoAberto ? "Aberto" : "Fechado"}, Temporada: ${temporadaEncerrada ? "ENCERRADA" : "ATIVA"}, Rodada API: ${rodadaAtual}`,
            );

            // ✅ v4.4: Gerar ranking - só busca parciais se rodada em andamento
            const ranking = await ArtilheiroCampeaoController.gerarRanking(
                ligaId,
                rodadaInicio,
                rodadaFim,
                !rodadaEmAndamento, // Se NÃO está em andamento, considera como "mercado aberto" (não busca parciais)
                forcar_coleta === "true",
            );

            // Calcular estatísticas (apenas ativos)
            const ativos = ranking.filter((p) => p.ativo !== false);
            const estatisticas = {
                totalGolsPro: ativos.reduce((s, p) => s + p.golsPro, 0),
                totalGolsContra: ativos.reduce((s, p) => s + p.golsContra, 0),
                totalSaldo: ativos.reduce((s, p) => s + p.saldoGols, 0),
                participantes: ranking.length,
                participantesAtivos: ativos.length,
                participantesInativos: ranking.length - ativos.length,
                rodadaInicio,
                rodadaFim,
                rodadaAtual,
                mercadoAberto,
                temporadaEncerrada,
            };

            res.json({
                success: true,
                data: {
                    ranking,
                    estatisticas,
                    rodadaFim,
                    // ✅ v4.4: Só marca como parcial se rodada EM ANDAMENTO
                    rodadaParcial: rodadaEmAndamento ? rodadaAtual : null,
                    temporadaEncerrada: temporadaEncerrada,
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
     * ✅ v4.4: Detectar status do mercado COM DETECÇÃO DE TEMPORADA ENCERRADA
     */
    static async detectarStatusMercado() {
        try {
            const response = await fetch(
                "https://api.cartola.globo.com/mercado/status",
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            // ✅ v4.4: Detectar temporada encerrada
            // status_mercado: 1 = aberto, 2 = fechado (em andamento), 6 = temporada encerrada
            const statusMercado = data.status_mercado;
            const temporadaEncerrada =
                statusMercado === 6 || statusMercado === 4;
            const mercadoAberto = statusMercado === 1;

            // Se temporada encerrada, considerar como consolidado (não parcial)
            const rodadaEmAndamento = !mercadoAberto && !temporadaEncerrada;

            console.log(
                `📊 [MERCADO] Status: ${statusMercado}, Rodada: ${data.rodada_atual}, Temporada: ${temporadaEncerrada ? "ENCERRADA" : "ATIVA"}`,
            );

            return {
                rodadaAtual: data.rodada_atual || 1,
                mercadoAberto: mercadoAberto,
                temporadaEncerrada: temporadaEncerrada,
                rodadaEmAndamento: rodadaEmAndamento,
                statusMercado: statusMercado,
            };
        } catch (error) {
            console.warn("⚠️ Erro ao detectar mercado:", error.message);
            return {
                rodadaAtual: 38,
                mercadoAberto: false,
                temporadaEncerrada: true, // Assume encerrada em caso de erro
                rodadaEmAndamento: false,
                statusMercado: 6,
            };
        }
    }

    /**
     * ✅ Endpoint para detectar rodada
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
                    temporadaEncerrada: status.temporadaEncerrada,
                    rodadaEmAndamento: status.rodadaEmAndamento,
                    statusMercado: status.statusMercado,
                    ultimaRodadaConsolidada: status.rodadaAtual, // Sempre a atual se temporada encerrada
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
     * ✅ v4.3: Gerar ranking completo COM FILTRO DE INATIVOS
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

        // ✅ v4.3: Buscar status de todos os participantes ANTES de processar
        const timeIds = PARTICIPANTES_SOBRAL.map((p) => p.timeId);
        const statusMap = await buscarStatusParticipantes(timeIds);

        console.log(
            `📋 [ARTILHEIRO] Status dos participantes:`,
            Object.entries(statusMap)
                .filter(([_, s]) => s.ativo === false)
                .map(
                    ([id, s]) =>
                        `${id}: inativo R${s.rodada_desistencia || "?"}`,
                ),
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
                const status = statusMap[String(participante.timeId)] || {
                    ativo: true,
                    rodada_desistencia: null,
                };
                const isAtivo = status.ativo !== false;

                // ✅ v4.3: Limitar rodadaFim para inativos
                const rodadaFimParticipante = obterUltimaRodadaValida(
                    status,
                    rodadaFim,
                );

                console.log(
                    `📊 [${i + 1}/${PARTICIPANTES_SOBRAL.length}] ${participante.nome}${!isAtivo ? ` (INATIVO até R${rodadaFimParticipante})` : ""}...`,
                );

                try {
                    const dados =
                        await ArtilheiroCampeaoController.obterDadosParticipante(
                            ligaId,
                            participante.timeId,
                            rodadaInicio,
                            rodadaFimParticipante, // ✅ Usa rodada limitada para inativos
                            isAtivo ? mercadoAberto : true, // ✅ Inativos não processam parciais
                            forcarColeta,
                            isAtivo ? atletasPontuados : null, // ✅ Inativos não usam parciais
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
                        // ✅ v4.3: Adicionar status
                        ativo: isAtivo,
                        rodada_desistencia: status.rodada_desistencia,
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
                        ativo: isAtivo,
                        rodada_desistencia: status.rodada_desistencia,
                    };
                }
            }),
        );

        // ✅ v4.3: Ordenar com ativos primeiro, depois inativos
        const sortFn = (a, b) => {
            if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
            return b.saldoGols - a.saldoGols;
        };

        return ordenarRankingComInativos(ranking, sortFn);
    }

    /**
     * ✅ v4.4: Obter dados de um participante específico COM COLETA AUTOMÁTICA DE FALTANTES
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

        // ✅ v4.4: Buscar rodadas existentes no MongoDB
        const rodadasDB = await GolsConsolidados.find({
            ligaId: ligaId,
            timeId: timeId,
            rodada: { $gte: rodadaInicio, $lte: rodadaFim },
        }).lean();

        // ✅ v4.4: Identificar rodadas que já existem
        const rodadasExistentes = new Set(rodadasDB.map((r) => r.rodada));

        // ✅ v4.4: Identificar rodadas faltantes (consolidadas, não parciais)
        const rodadasFaltantes = [];

        for (let r = rodadaInicio; r <= rodadaFim; r++) {
            if (!rodadasExistentes.has(r)) {
                rodadasFaltantes.push(r);
            }
        }

        // ✅ v4.4: Coletar rodadas faltantes da API e salvar no MongoDB
        if (rodadasFaltantes.length > 0) {
            console.log(
                `  📥 Coletando ${rodadasFaltantes.length} rodadas faltantes para time ${timeId}: [${rodadasFaltantes.join(", ")}]`,
            );

            for (const rodada of rodadasFaltantes) {
                try {
                    const dadosColetados =
                        await ArtilheiroCampeaoController.coletarDadosRodada(
                            ligaId,
                            timeId,
                            rodada,
                        );

                    // Adicionar aos dados coletados
                    golsPro += dadosColetados.golsPro || 0;
                    golsContra += dadosColetados.golsContra || 0;
                    rodadasProcessadas++;
                    detalhePorRodada.push({
                        rodada: rodada,
                        golsPro: dadosColetados.golsPro,
                        golsContra: dadosColetados.golsContra,
                        jogadores: dadosColetados.jogadores || [],
                        fonte: "api_coletada",
                    });

                    console.log(
                        `    ✅ R${rodada}: ${dadosColetados.golsPro} GP, ${dadosColetados.golsContra} GC (salvo no MongoDB)`,
                    );
                } catch (error) {
                    console.warn(
                        `    ⚠️ Erro ao coletar R${rodada} para time ${timeId}:`,
                        error.message,
                    );
                }
            }
        }

        // ✅ Processar rodadas que já estavam no MongoDB
        console.log(`  💾 ${rodadasDB.length} rodadas do MongoDB`);

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

        // ✅ Se mercado FECHADO, adicionar dados parciais da rodada atual (se não existir já)
        if (!mercadoAberto && atletasPontuados) {
            // ✅ v4.4: Verificar ANTES se a rodada já foi processada
            const jaExisteRodadaFim = detalhePorRodada.some(
                (d) => d.rodada === rodadaFim,
            );

            if (!jaExisteRodadaFim) {
                const dadosParciais =
                    await ArtilheiroCampeaoController.calcularGolsRodadaParcial(
                        timeId,
                        rodadaFim,
                        atletasPontuados,
                    );

                if (
                    dadosParciais &&
                    (dadosParciais.golsPro > 0 || dadosParciais.golsContra > 0)
                ) {
                    golsPro += dadosParciais.golsPro;
                    golsContra += dadosParciais.golsContra;
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
            // ✅ v4.3: Buscar status de todos
            const timeIds = PARTICIPANTES_SOBRAL.map((p) => p.timeId);
            const statusMap = await buscarStatusParticipantes(timeIds);

            const participantes = PARTICIPANTES_SOBRAL.map((p) => {
                const status = statusMap[String(p.timeId)] || { ativo: true };
                return {
                    ...p,
                    escudo: ESCUDOS_CLUBES[p.clubeId] || null,
                    ativo: status.ativo !== false,
                    rodada_desistencia: status.rodada_desistencia || null,
                };
            });

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
