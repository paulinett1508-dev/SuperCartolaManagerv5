// services/golsService.js - SISTEMA INTELIGENTE DE COLETA E ARMAZENAMENTO
import Gols from "../models/Gols.js";
import mongoose from "mongoose";

class GolsService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000; // 10 minutos
        // ✅ CORREÇÃO: URL base correta da API Cartola
        this.API_BASE = "https://api.cartola.globo.com";
    }

    /**
     * FUNÇÃO PRINCIPAL: Obter gols com coleta inteligente
     * 1. Verifica no MongoDB primeiro
     * 2. Se não existe ou desatualizado, coleta da API
     * 3. Salva no MongoDB
     * 4. Retorna dados processados
     */
    async obterGolsParticipante(ligaId, timeId, rodadaInicio, rodadaFim) {
        try {
            console.log(
                `🔍 [GOLS-SERVICE] Buscando gols: Liga ${ligaId}, Time ${timeId}, Rodadas ${rodadaInicio}-${rodadaFim}`,
            );

            const objectId = new mongoose.Types.ObjectId(ligaId);

            // PASSO 1: Verificar quais rodadas já existem no MongoDB
            const rodadasExistentes = await this.verificarRodadasExistentes(
                objectId,
                timeId,
                rodadaInicio,
                rodadaFim,
            );
            const rodadasFaltantes = this.identificarRodadasFaltantes(
                rodadaInicio,
                rodadaFim,
                rodadasExistentes,
            );

            console.log(
                `📊 Rodadas existentes: [${rodadasExistentes.join(", ")}]`,
            );
            console.log(
                `❓ Rodadas faltantes: [${rodadasFaltantes.join(", ")}]`,
            );

            // PASSO 2: Coletar rodadas faltantes da API
            if (rodadasFaltantes.length > 0) {
                console.log(
                    `🚀 Coletando ${rodadasFaltantes.length} rodadas da API Cartola FC...`,
                );
                await this.coletarRodadasFaltantes(
                    objectId,
                    timeId,
                    rodadasFaltantes,
                );
            }

            // PASSO 3: Buscar todos os dados do MongoDB (agora completos)
            const dadosCompletos = await this.buscarDadosCompletos(
                objectId,
                timeId,
                rodadaInicio,
                rodadaFim,
            );

            // PASSO 4: Processar e retornar dados agregados
            return this.processarDadosAgregados(
                dadosCompletos,
                timeId,
                rodadaInicio,
                rodadaFim,
            );
        } catch (error) {
            console.error(`❌ [GOLS-SERVICE] Erro ao obter gols:`, error);
            throw error;
        }
    }

    /**
     * Verificar quais rodadas já existem no MongoDB para um time
     */
    async verificarRodadasExistentes(ligaId, timeId, rodadaInicio, rodadaFim) {
        const rodadasExistentes = await Gols.distinct("rodada", {
            ligaId: ligaId,
            timeId: parseInt(timeId),
            rodada: { $gte: rodadaInicio, $lte: rodadaFim },
            ativo: true,
        });

        return rodadasExistentes.sort((a, b) => a - b);
    }

    /**
     * Identificar quais rodadas estão faltantes
     */
    identificarRodadasFaltantes(rodadaInicio, rodadaFim, rodadasExistentes) {
        const todasRodadas = [];
        for (let i = rodadaInicio; i <= rodadaFim; i++) {
            todasRodadas.push(i);
        }

        return todasRodadas.filter(
            (rodada) => !rodadasExistentes.includes(rodada),
        );
    }

    /**
     * Coletar rodadas faltantes da API Cartola FC
     */
    async coletarRodadasFaltantes(ligaId, timeId, rodadasFaltantes) {
        const dadosColetados = [];

        for (const rodada of rodadasFaltantes) {
            try {
                console.log(
                    `📡 Coletando rodada ${rodada} para time ${timeId}...`,
                );

                const dadosRodada = await this.buscarRodadaApiCartola(
                    timeId,
                    rodada,
                );

                if (dadosRodada && dadosRodada.length > 0) {
                    // Adicionar metadados
                    const dadosCompletos = dadosRodada.map((atleta) => ({
                        ...atleta,
                        ligaId: ligaId,
                        timeId: parseInt(timeId),
                        rodada: parseInt(rodada),
                        dataColeta: new Date(),
                        ativo: true,
                        scoutValido: true,
                    }));

                    dadosColetados.push(...dadosCompletos);
                    console.log(
                        `✅ Rodada ${rodada}: ${dadosCompletos.length} atletas coletados`,
                    );
                } else {
                    console.log(
                        `⚠️ Rodada ${rodada}: sem dados ou time não escalou`,
                    );
                }

                // Delay para não sobrecarregar API
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                console.error(
                    `❌ Erro ao coletar rodada ${rodada}:`,
                    error.message,
                );
                // Continuar com próximas rodadas mesmo se uma falhar
            }
        }

        // Salvar todos os dados coletados no MongoDB
        if (dadosColetados.length > 0) {
            await this.salvarDadosNoMongo(dadosColetados);
        }

        return dadosColetados;
    }

    /**
     * Buscar dados de uma rodada na API Cartola FC
     * ✅ CORREÇÃO: URL correta api.cartola.globo.com
     */
    async buscarRodadaApiCartola(timeId, rodada) {
        try {
            // ✅ CORREÇÃO: URL correta
            const url = `${this.API_BASE}/time/id/${timeId}/${rodada}`;

            const response = await fetch(url, {
                timeout: 15000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    Accept: "application/json",
                    Referer: "https://cartola.globo.com/",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const data = await response.json();

            // Processar atletas da resposta
            const atletas = [];

            if (data.atletas && Array.isArray(data.atletas)) {
                data.atletas.forEach((atleta) => {
                    const gols = parseInt(atleta.scout?.G) || 0;
                    // ✅ CORREÇÃO: Gols contra para qualquer posição (GC é scout universal)
                    const golsContra = parseInt(atleta.scout?.GC) || 0;

                    atletas.push({
                        atletaId: atleta.atleta_id,
                        nome: atleta.apelido || atleta.nome,
                        gols: gols,
                        golsContra: golsContra,
                        golsLiquidos: gols - golsContra,
                        pontos: parseFloat(atleta.pontos_num) || 0,
                        posicao: atleta.posicao_id,
                        clube: atleta.clube_id,
                    });
                });
            }

            return atletas;
        } catch (error) {
            console.error(
                `❌ Erro na API Cartola para time ${timeId}, rodada ${rodada}:`,
                error.message,
            );
            return [];
        }
    }

    /**
     * Salvar dados coletados no MongoDB
     */
    async salvarDadosNoMongo(dadosColetados) {
        try {
            console.log(
                `💾 Salvando ${dadosColetados.length} registros no MongoDB...`,
            );

            // Usar insertMany para eficiência
            const resultado = await Gols.insertMany(dadosColetados, {
                ordered: false, // Continuar mesmo se alguns falham
                writeConcern: { w: 1 }, // Confirmação básica
            });

            console.log(`✅ ${resultado.length} registros salvos com sucesso`);
            return resultado;
        } catch (error) {
            // Tratar erro de duplicatas (código 11000)
            if (error.code === 11000 || error.writeErrors) {
                const inseridos = error.insertedDocs?.length || 0;
                const duplicados = error.writeErrors?.length || 0;
                console.log(
                    `⚠️ ${inseridos} inseridos, ${duplicados} duplicados ignorados`,
                );
                return { inseridos, duplicados };
            }

            console.error(`❌ Erro ao salvar no MongoDB:`, error.message);
            throw error;
        }
    }

    /**
     * Buscar dados completos do MongoDB
     */
    async buscarDadosCompletos(ligaId, timeId, rodadaInicio, rodadaFim) {
        return await Gols.find({
            ligaId: ligaId,
            timeId: parseInt(timeId),
            rodada: { $gte: rodadaInicio, $lte: rodadaFim },
            ativo: true,
        }).sort({ rodada: 1, gols: -1 });
    }

    /**
     * Processar dados e retornar agregados
     */
    processarDadosAgregados(dados, timeId, rodadaInicio, rodadaFim) {
        let totalGolsPro = 0;
        let totalGolsContra = 0;
        const porRodada = {};
        const jogadoresAgregados = new Map();

        dados.forEach((registro) => {
            const rodada = registro.rodada;

            // Inicializar rodada se necessário
            if (!porRodada[rodada]) {
                porRodada[rodada] = {
                    rodada,
                    golsPro: 0,
                    golsContra: 0,
                    saldo: 0,
                    pontos: 0,
                    jogadores: [],
                };
            }

            // Acumular gols da rodada
            porRodada[rodada].golsPro += registro.gols || 0;
            porRodada[rodada].golsContra += registro.golsContra || 0;
            porRodada[rodada].pontos += registro.pontos || 0;

            // Adicionar jogador com gols à lista
            if (registro.gols > 0) {
                porRodada[rodada].jogadores.push({
                    id: registro.atletaId,
                    nome: registro.nome,
                    gols: registro.gols,
                    posicao: registro.posicao,
                    clube: registro.clube,
                });
            }

            // Atualizar saldo da rodada
            porRodada[rodada].saldo =
                porRodada[rodada].golsPro - porRodada[rodada].golsContra;

            // Agregar totais
            totalGolsPro += registro.gols || 0;
            totalGolsContra += registro.golsContra || 0;

            // Agregar jogadores únicos
            const key = registro.atletaId;
            if (jogadoresAgregados.has(key)) {
                jogadoresAgregados.get(key).gols += registro.gols || 0;
            } else {
                jogadoresAgregados.set(key, {
                    id: registro.atletaId,
                    nome: registro.nome,
                    gols: registro.gols || 0,
                    posicao: registro.posicao,
                    clube: registro.clube,
                });
            }
        });

        const detalhePorRodada = Object.values(porRodada);
        const jogadoresArray = Array.from(jogadoresAgregados.values()).filter(
            (j) => j.gols > 0,
        );

        const resultado = {
            success: true,
            fonte: "mongodb_com_coleta_inteligente",
            data: {
                timeId: parseInt(timeId),
                rodadaInicio,
                rodadaFim,
                totalGolsPro,
                totalGolsContra,
                saldoTotal: totalGolsPro - totalGolsContra,
                detalhePorRodada,
                jogadoresAgregados: jogadoresArray,
                estatisticas: {
                    totalRodadas: rodadaFim - rodadaInicio + 1,
                    rodadasComDados: detalhePorRodada.length,
                    totalJogadores: jogadoresArray.length,
                    dataUltimaColeta: new Date(),
                },
            },
        };

        console.log(
            `✅ Dados processados: ${totalGolsPro} gols pró, ${totalGolsContra} gols contra`,
        );
        return resultado;
    }

    /**
     * Detectar rodada atual via API Cartola FC
     * ✅ CORREÇÃO: URL correta
     */
    async detectarRodadaAtual() {
        try {
            const cacheKey = "rodada_atual";
            const cached = this.cache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
                return cached.data;
            }

            // ✅ CORREÇÃO: URL correta
            const response = await fetch(`${this.API_BASE}/mercado/status`, {
                timeout: 5000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    Referer: "https://cartola.globo.com/",
                },
            });

            if (response.ok) {
                const data = await response.json();
                const rodadaAtual = data.rodada_atual || 15;

                // Salvar no cache
                this.cache.set(cacheKey, {
                    data: rodadaAtual,
                    timestamp: Date.now(),
                });

                console.log(`📅 Rodada atual detectada: ${rodadaAtual}`);
                return rodadaAtual;
            }

            throw new Error("API indisponível");
        } catch (error) {
            console.warn(
                "⚠️ Erro ao detectar rodada atual, usando fallback:",
                error.message,
            );
            return 15; // Fallback
        }
    }

    /**
     * Limpar cache do service
     */
    limparCache() {
        this.cache.clear();
        console.log("🗑️ Cache do GolsService limpo");
    }

    /**
     * Obter estatísticas do cache
     */
    obterEstatisticasCache() {
        return {
            tamanho: this.cache.size,
            chaves: Array.from(this.cache.keys()),
        };
    }

    /**
     * Obter participantes únicos de uma liga
     */
    async obterParticipantesUnicos(ligaId) {
        try {
            console.log(
                `🔍 [GOLS-SERVICE] Buscando participantes únicos da liga ${ligaId}`,
            );

            const pipeline = [
                { $match: { ligaId: new mongoose.Types.ObjectId(ligaId) } },
                {
                    $group: {
                        _id: "$timeId",
                        nomeCartoleiro: { $first: "$nomeCartoleiro" },
                        nomeTime: { $first: "$nomeTime" },
                        timeId: { $first: "$timeId" },
                        clubeId: { $first: "$clubeId" },
                        totalGolsPro: { $sum: "$gols" },
                        totalGolsContra: { $sum: "$golsContra" },
                    },
                },
                {
                    $addFields: {
                        saldoGols: {
                            $subtract: ["$totalGolsPro", "$totalGolsContra"],
                        },
                    },
                },
                { $sort: { saldoGols: -1, totalGolsPro: -1 } },
            ];

            const participantes = await Gols.aggregate(pipeline);

            console.log(
                `✅ [GOLS-SERVICE] ${participantes.length} participantes únicos encontrados`,
            );

            return {
                success: true,
                data: participantes,
            };
        } catch (error) {
            console.error(
                "❌ [GOLS-SERVICE] Erro ao buscar participantes únicos:",
                error,
            );
            return {
                success: false,
                message: "Erro ao buscar participantes únicos",
                error: error.message,
            };
        }
    }

    /**
     * Obter ranking de uma rodada específica
     */
    async obterRankingPorRodada(ligaId, rodada) {
        try {
            console.log(
                `📊 [GOLS-SERVICE] Buscando ranking da rodada ${rodada} para liga ${ligaId}`,
            );

            const pipeline = [
                {
                    $match: {
                        ligaId: new mongoose.Types.ObjectId(ligaId),
                        rodada: parseInt(rodada),
                    },
                },
                {
                    $group: {
                        _id: "$timeId",
                        nomeCartoleiro: { $first: "$nomeCartoleiro" },
                        nomeTime: { $first: "$nomeTime" },
                        timeId: { $first: "$timeId" },
                        clubeId: { $first: "$clubeId" },
                        rodada: { $first: "$rodada" },
                        golsPro: { $sum: "$gols" },
                        golsContra: { $sum: "$golsContra" },
                        pontos: { $sum: "$pontos" },
                    },
                },
                {
                    $addFields: {
                        saldo: { $subtract: ["$golsPro", "$golsContra"] },
                    },
                },
                {
                    $sort: {
                        saldo: -1,
                        golsPro: -1,
                        golsContra: 1,
                    },
                },
            ];

            const ranking = await Gols.aggregate(pipeline);

            console.log(
                `✅ [GOLS-SERVICE] Ranking da rodada ${rodada}: ${ranking.length} participantes`,
            );

            return {
                success: true,
                data: ranking,
            };
        } catch (error) {
            console.error(
                `❌ [GOLS-SERVICE] Erro ao buscar ranking da rodada ${rodada}:`,
                error,
            );
            return {
                success: false,
                message: `Erro ao buscar ranking da rodada ${rodada}`,
                error: error.message,
            };
        }
    }
}

// Instância singleton
const golsService = new GolsService();

export default golsService;
