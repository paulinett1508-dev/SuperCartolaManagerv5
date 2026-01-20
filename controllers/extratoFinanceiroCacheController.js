// =====================================================================
// extratoFinanceiroCacheController.js v6.7 - REMOVIDO Botões de Limpeza Perigosos
// ✅ v6.7: REMOVIDO funções limparCacheLiga, limparCacheTime, limparTodosCaches
//   - Causavam perda de dados IRRECUPERÁVEIS em temporadas históricas
//   - Mantido apenas limparCachesCorrompidos para manutenção
// ✅ v6.6: FIX ROBUSTEZ - Usar ?? 0 para lidar com caches sem ultima_rodada_consolidada
//   - Caches criados pelo sistema de renovação podem não ter o campo definido
//   - Agora usa: (ultima_rodada_consolidada ?? 0) === 0
// ✅ v6.5: FIX CRÍTICO - verificarCacheValido agora retorna cache válido em pré-temporada
//   - Cache com 0 rodadas + transações iniciais (inscrição) é válido
//   - Antes: retornava "cache_desatualizado" porque 0 < rodadaEsperada
//   - Agora: detecta pré-temporada e calcula resumo das transações iniciais
// ✅ v6.4: FIX CRÍTICO - Fallback inscricao-nova-temporada agora inclui acertos
//   - Corrige bug onde pagamentos (acertos) não eram somados ao saldo
//   - Exemplo: inscrição -180 + pagamento 60 = saldo -120 (antes mostrava -180)
// ✅ v6.3: Proteção contra salvar rodadas fantasmas em pré-temporada (2026)
// ✅ v6.2: Proteção contra sobrescrita de caches históricos com dados vazios
// ✅ v6.1: FIX - Lançamentos iniciais (rodada=0) agora são contabilizados no saldo
//   - Transações com rodada=0, INSCRICAO_TEMPORADA ou TRANSFERENCIA_SALDO são extraídas
//   - Saldo agora inclui: rodadas + campos + acertos + lançamentos iniciais
//   - Taxa de inscrição agora aparece corretamente no extrato de nova temporada
// ✅ v6.0: Inclui lançamentos iniciais (INSCRICAO, TRANSFERENCIA) no saldo
//   - Transações com rodada=0 ou tipo INSCRICAO_TEMPORADA são extraídas separadamente
//   - Saldo agora inclui: rodadas + campos + acertos + lançamentos iniciais
// ✅ v5.9: FIX - Usa getFinancialSeason() para pegar temporada correta
//   - Durante pré-temporada, busca dados de 2025 (temporada anterior)
// ✅ v5.8: FIX - totalGanhos/totalPerdas calculados por COMPONENTES (não rodadas)
//   - Garante consistência entre card Créditos/Débitos e popup detalhamento
// ✅ v5.7: FIX - Busca aceita liga_id como String ou ObjectId (compatibilidade)
// ✅ v5.6: FIX CRÍTICO - Temporada default usa CURRENT_SEASON (não hardcoded 2025)
//   - Corrige divergência entre Hall da Fama e Módulo Financeiro
//   - Todas as queries agora usam temporada dinâmica
// ✅ v5.5: FIX REFORÇADO - salvarExtratoCache SEMPRE recalcula saldo e saldoAcumulado
//   - Proteção dupla: backend não confia em dados do frontend
//   - r.saldo = recalculado a partir dos componentes individuais
//   - r.saldoAcumulado = recalculado progressivamente
// ✅ v5.4: FIX CRÍTICO - salvarExtratoCache agora recalcula saldoAcumulado
//   - Frontend enviava saldoAcumulado = 0 em todas as rodadas
//   - Agora o backend recalcula progressivamente antes de salvar
// ✅ v5.2: FIX CRÍTICO - lerCacheExtratoFinanceiro agora inclui acertos no saldo
// ✅ v5.1: Inclui acertos financeiros no extrato do participante
// ✅ v5.0: Busca extrato de snapshots quando cache não existe
// ✅ v4.0: Cache permanente para temporadas finalizadas (sem recálculos)
// ✅ v3.4: Corrige detecção de dados consolidados vs legados
// ✅ v3.3: Trava extrato financeiro para inativos na rodada_desistencia
// =====================================================================

import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import RodadaSnapshot from "../models/RodadaSnapshot.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import mongoose from "mongoose";
// ✅ v5.9: Import getFinancialSeason para pegar temporada correta durante pré-temporada
import { CURRENT_SEASON, getFinancialSeason } from "../config/seasons.js";

// ✅ v5.1: Buscar acertos financeiros do participante
// ✅ v5.6 FIX: Default usa CURRENT_SEASON (dinâmico)
async function buscarAcertosFinanceiros(ligaId, timeId, temporada = CURRENT_SEASON) {
    try {
        const acertos = await AcertoFinanceiro.find({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada,
            ativo: true,
        }).sort({ dataAcerto: -1 }).lean();

        if (!acertos || acertos.length === 0) {
            return {
                lista: [],
                resumo: { totalPago: 0, totalRecebido: 0, saldo: 0 },
            };
        }

        // Calcular totais
        let totalPago = 0;
        let totalRecebido = 0;
        acertos.forEach((a) => {
            if (a.tipo === "pagamento") {
                totalPago += a.valor;
            } else {
                totalRecebido += a.valor;
            }
        });

        // ✅ v5.2 FIX: Usar mesma lógica do Model (totalPago - totalRecebido)
        // PAGAMENTO = participante pagou → AUMENTA saldo (quita dívida)
        // RECEBIMENTO = participante recebeu → DIMINUI saldo (usa crédito)
        const saldo = parseFloat((totalPago - totalRecebido).toFixed(2));

        return {
            lista: acertos.map((a) => ({
                _id: a._id,
                tipo: a.tipo,
                valor: a.valor,
                descricao: a.descricao,
                metodoPagamento: a.metodoPagamento,
                dataAcerto: a.dataAcerto,
                observacoes: a.observacoes,
            })),
            resumo: {
                totalPago: parseFloat(totalPago.toFixed(2)),
                totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                saldo,
            },
        };
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro ao buscar acertos:", error);
        return {
            lista: [],
            resumo: { totalPago: 0, totalRecebido: 0, saldo: 0 },
        };
    }
}

// ✅ v4.0: Verificar se temporada está finalizada
async function verificarTemporadaFinalizada(ligaId) {
    try {
        const liga = await Liga.findById(toLigaId(ligaId)).lean();
        if (!liga) return { finalizada: false };

        const temporada2025 = liga.configuracoes?.temporada_2025;
        if (temporada2025?.status === 'finalizada') {
            return {
                finalizada: true,
                rodadaFinal: temporada2025.rodada_final || 38,
                dataEncerramento: temporada2025.data_encerramento
            };
        }
        return { finalizada: false };
    } catch (error) {
        console.error('[CACHE-CONTROLLER] Erro ao verificar temporada:', error);
        return { finalizada: false };
    }
}

// ✅ FIX: Sempre retornar String para manter consistência com dados existentes
// A conversão para ObjectId causava duplicação de documentos quando o documento
// existente tinha liga_id como String mas a query usava ObjectId
function toLigaId(ligaId) {
    return String(ligaId);
}

// ✅ v4.1: BUSCAR STATUS DO TIME (ativo/rodada_desistencia) - busca da coleção Time
async function buscarStatusTime(ligaId, timeId) {
    try {
        // ✅ CORREÇÃO: Buscar da coleção Time (não de liga.times que é só array de IDs)
        const time = await Time.findOne(
            { id: Number(timeId) },
            { id: 1, ativo: 1, rodada_desistencia: 1 }
        ).lean();

        if (!time) {
            return { ativo: true, rodada_desistencia: null };
        }

        return {
            ativo: time.ativo !== false,
            rodada_desistencia: time.rodada_desistencia || null,
        };
    } catch (error) {
        console.error(
            "[CACHE-CONTROLLER] Erro ao buscar status do time:",
            error,
        );
        return { ativo: true, rodada_desistencia: null };
    }
}

// ✅ v3.3: FILTRAR RODADAS PARA INATIVOS
function filtrarRodadasParaInativo(rodadas, rodadaDesistencia) {
    if (!rodadaDesistencia || !Array.isArray(rodadas)) {
        return rodadas;
    }

    const rodadaLimite = rodadaDesistencia - 1;
    const rodadasFiltradas = rodadas.filter((r) => r.rodada <= rodadaLimite);

    console.log(
        `[CACHE-CONTROLLER] 🔒 Inativo: filtrando até R${rodadaLimite} | ${rodadas.length} → ${rodadasFiltradas.length}`,
    );

    return rodadasFiltradas;
}

// ✅ v5.0: BUSCAR EXTRATO DIRETAMENTE DOS SNAPSHOTS (fallback quando não há cache)
// ✅ v6.1 FIX: Adicionar filtro de temporada para evitar retornar dados de temporada errada
async function buscarExtratoDeSnapshots(ligaId, timeId, temporada = null) {
    try {
        console.log(`[CACHE-CONTROLLER] 📸 Buscando extrato de snapshots para time ${timeId} | temporada ${temporada}`);

        // ✅ v6.1 FIX: Filtrar por temporada se informada
        const filtro = { liga_id: String(ligaId) };
        if (temporada) {
            filtro.temporada = temporada;
        }

        // Buscar o último snapshot com dados do time
        const snapshots = await RodadaSnapshot.find(filtro).sort({ rodada: -1 }).limit(1).lean();

        if (!snapshots || snapshots.length === 0) {
            console.log(`[CACHE-CONTROLLER] ⚠️ Nenhum snapshot encontrado para liga ${ligaId}`);
            return null;
        }

        const ultimoSnapshot = snapshots[0];
        const timesStats = ultimoSnapshot.dados_consolidados?.times_stats || [];
        const extratosFinanceiros = ultimoSnapshot.dados_consolidados?.extratos_financeiros || [];

        // Buscar dados do time nos stats
        const timeStats = timesStats.find(t => t.time_id === Number(timeId));
        const timeExtrato = extratosFinanceiros.find(t => t.time_id === Number(timeId));

        if (!timeStats) {
            console.log(`[CACHE-CONTROLLER] ⚠️ Time ${timeId} não encontrado nos snapshots`);
            return null;
        }

        console.log(`[CACHE-CONTROLLER] ✅ Encontrado nos snapshots: saldo=${timeStats.saldo_total}, ganhos=${timeStats.ganhos}`);

        // Construir array de rodadas baseado nas transações do extrato
        const rodadasArray = [];
        const transacoes = timeExtrato?.transacoes || [];

        // Agrupar transações por rodada
        const rodadasMap = {};
        transacoes.forEach(t => {
            const numRodada = t.rodada;
            if (!numRodada) return;

            if (!rodadasMap[numRodada]) {
                rodadasMap[numRodada] = {
                    rodada: numRodada,
                    posicao: null,
                    bonusOnus: 0,
                    pontosCorridos: 0,
                    mataMata: 0,
                    top10: 0,
                    saldo: 0,
                    isMito: false,
                    isMico: false,
                    top10Status: null,
                    top10Posicao: null,
                };
            }

            const r = rodadasMap[numRodada];
            const valor = parseFloat(t.valor) || 0;
            const tipo = t.tipo || '';

            switch (tipo) {
                case 'PONTOS_CORRIDOS':
                    r.pontosCorridos += valor;
                    break;
                case 'MATA_MATA':
                    r.mataMata += valor;
                    break;
                case 'MITO':
                    r.top10 += valor;
                    r.isMito = true;
                    r.top10Status = 'MITO';
                    break;
                case 'MICO':
                    r.top10 += valor;
                    r.isMico = true;
                    r.top10Status = 'MICO';
                    break;
                case 'BONUS':
                case 'BANCO_RODADA':
                    r.bonusOnus += valor;
                    break;
                case 'ONUS':
                    r.bonusOnus += valor;
                    break;
                default:
                    if (valor !== 0) {
                        r.bonusOnus += valor;
                    }
            }
            r.saldo = r.bonusOnus + r.pontosCorridos + r.mataMata + r.top10;
        });

        // Converter mapa para array e calcular acumulado
        const rodadasSorted = Object.values(rodadasMap).sort((a, b) => a.rodada - b.rodada);
        let saldoAcumulado = 0;
        rodadasSorted.forEach(r => {
            saldoAcumulado += r.saldo;
            r.saldoAcumulado = saldoAcumulado;
        });

        // Se não tem transações detalhadas, criar resumo básico
        if (rodadasSorted.length === 0 && timeStats.saldo_total) {
            console.log(`[CACHE-CONTROLLER] 📊 Usando resumo geral (sem transações detalhadas)`);
        }

        return {
            rodadas: rodadasSorted,
            resumo: {
                saldo: timeStats.saldo_total || 0,
                saldo_final: timeStats.saldo_total || 0,
                totalGanhos: timeStats.ganhos || 0,
                totalPerdas: timeStats.perdas || 0,
            },
            metadados: {
                fonte: 'snapshot',
                rodadaSnapshot: ultimoSnapshot.rodada,
                dataSnapshot: ultimoSnapshot.data_consolidacao,
            }
        };
    } catch (error) {
        console.error('[CACHE-CONTROLLER] ❌ Erro ao buscar de snapshots:', error);
        return null;
    }
}

// ✅ v5.8 FIX: Calcular totalGanhos/totalPerdas por COMPONENTES (não rodadas inteiras)
// Isso garante consistência entre o card de Créditos/Débitos e o popup de detalhamento
function calcularResumoDeRodadas(rodadas, camposManuais = null) {
    // ✅ v5.9 FIX: Processar campos manuais mesmo sem rodadas (pré-temporada)
    // Bug anterior: retornava saldo:0 ignorando campos quando rodadas=[]
    const rodadasArray = Array.isArray(rodadas) ? rodadas : [];
    const temRodadas = rodadasArray.length > 0;
    const temCampos = camposManuais && Array.isArray(camposManuais) && camposManuais.length > 0;

    // Se não tem nada para processar, retornar zerado
    if (!temRodadas && !temCampos) {
        return {
            saldo: 0,
            totalGanhos: 0,
            totalPerdas: 0,
            bonus: 0,
            onus: 0,
            pontosCorridos: 0,
            mataMata: 0,
            top10: 0,
            camposManuais: 0,
        };
    }

    let totalBonus = 0,
        totalOnus = 0,
        totalPontosCorridos = 0,
        totalMataMata = 0,
        totalTop10 = 0,
        totalGanhos = 0,
        totalPerdas = 0;

    // ✅ v5.9: Usar rodadasArray (pode ser [] em pré-temporada)
    rodadasArray.forEach((r) => {
        const bonusOnus = parseFloat(r.bonusOnus) || 0;
        if (bonusOnus > 0) totalBonus += bonusOnus;
        else totalOnus += bonusOnus;

        const pc = parseFloat(r.pontosCorridos) || 0;
        totalPontosCorridos += pc;

        const mm = parseFloat(r.mataMata) || 0;
        totalMataMata += mm;

        const t10 = parseFloat(r.top10) || 0;
        totalTop10 += t10;
    });

    // ✅ v5.8 FIX: Calcular ganhos/perdas por COMPONENTES LÍQUIDOS
    // Isso bate com o que o popup de detalhamento mostra
    // Ganhos = soma dos componentes positivos
    if (totalBonus > 0) totalGanhos += totalBonus;
    if (totalPontosCorridos > 0) totalGanhos += totalPontosCorridos;
    if (totalMataMata > 0) totalGanhos += totalMataMata;
    if (totalTop10 > 0) totalGanhos += totalTop10;

    // Perdas = soma dos componentes negativos (valor absoluto)
    if (totalOnus < 0) totalPerdas += totalOnus;
    if (totalPontosCorridos < 0) totalPerdas += totalPontosCorridos;
    if (totalMataMata < 0) totalPerdas += totalMataMata;
    if (totalTop10 < 0) totalPerdas += totalTop10;

    let totalCamposManuais = 0;
    if (camposManuais && Array.isArray(camposManuais)) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            totalCamposManuais += valor;
            if (valor > 0) totalGanhos += valor;
            else if (valor < 0) totalPerdas += valor;
        });
    }

    const saldo =
        totalBonus +
        totalOnus +
        totalPontosCorridos +
        totalMataMata +
        totalTop10 +
        totalCamposManuais;

    return {
        saldo,
        saldo_final: saldo,
        totalGanhos,
        totalPerdas,
        bonus: totalBonus,
        onus: totalOnus,
        pontosCorridos: totalPontosCorridos,
        mataMata: totalMataMata,
        top10: totalTop10,
        camposManuais: totalCamposManuais,
    };
}

// ✅ v3.4: FUNÇÃO MELHORADA - Detecta corretamente cache corrompido
function transformarTransacoesEmRodadas(transacoes, ligaId) {
    if (!Array.isArray(transacoes) || transacoes.length === 0) return [];

    const primeiroItem = transacoes[0];

    // ✅ v3.4: Verificar se tem dados legados (tipo/valor)
    const temDadosLegados =
        primeiroItem.tipo !== undefined && primeiroItem.valor !== undefined;

    // ✅ v3.4: Verificar se os dados consolidados estão REALMENTE preenchidos
    const temDadosConsolidadosReais = transacoes.some(
        (r) =>
            (parseFloat(r.bonusOnus) || 0) !== 0 ||
            (parseFloat(r.pontosCorridos) || 0) !== 0 ||
            (parseFloat(r.mataMata) || 0) !== 0 ||
            (parseFloat(r.top10) || 0) !== 0 ||
            (parseFloat(r.saldo) || 0) !== 0,
    );

    // ✅ v3.4: Só considera consolidado se TEM valores reais OU não tem dados legados
    const jaEstaConsolidado = temDadosConsolidadosReais || !temDadosLegados;

    if (jaEstaConsolidado && !temDadosLegados) {
        // ✅ v4.0: Já consolidado corretamente, apenas recalcular acumulado
        return transacoes.map((rodada, idx) => ({
            ...rodada,
            saldoAcumulado: transacoes
                .slice(0, idx + 1)
                .reduce((acc, r) => acc + (parseFloat(r.saldo) || 0), 0),
        }));
    }

    // ✅ v3.4: Se tem dados legados E consolidados zerados = reconstruir
    if (temDadosLegados && !temDadosConsolidadosReais) {
        console.log(
            `[CACHE-CONTROLLER] ⚠️ Cache corrompido detectado - reconstruindo de dados legados`,
        );
    }

    // ✅ v4.0: Formato legado - reconstruir com valores contextuais
    const rodadasMap = {};
    transacoes.forEach((t) => {
        const numRodada = t.rodada;
        if (!numRodada) return;

        if (!rodadasMap[numRodada]) {
            rodadasMap[numRodada] = {
                rodada: numRodada,
                posicao: t.posicao || null,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                saldo: 0,
                isMito: false,
                isMico: false,
                top10Status: null,
                top10Posicao: null,
            };
        }

        const r = rodadasMap[numRodada];
        const valor = parseFloat(t.valor) || 0;

        switch (t.tipo) {
            case "PONTOS_CORRIDOS":
                r.pontosCorridos += valor;
                break;
            case "MATA_MATA":
                r.mataMata += valor;
                break;
            case "MITO":
                r.top10 += valor;
                r.isMito = true;
                r.top10Status = "MITO";
                // Extrair posição do top10 da descrição se disponível
                if (t.descricao) {
                    const match = t.descricao.match(/(\d+)º/);
                    if (match) r.top10Posicao = parseInt(match[1]);
                }
                break;
            case "MICO":
                r.top10 += valor;
                r.isMico = true;
                r.top10Status = "MICO";
                if (t.descricao) {
                    const match = t.descricao.match(/(\d+)º/);
                    if (match) r.top10Posicao = parseInt(match[1]);
                }
                break;
            case "BONUS":
            case "BANCO_RODADA":
                r.bonusOnus += valor;
                break;
            case "ONUS":
                r.bonusOnus += valor; // valor já é negativo
                break;
            default:
                // Tipo desconhecido ou genérico vai para bonusOnus
                if (valor !== 0) {
                    r.bonusOnus += valor;
                }
        }
        r.saldo = r.bonusOnus + r.pontosCorridos + r.mataMata + r.top10;
    });

    const rodadasArray = Object.values(rodadasMap).sort(
        (a, b) => a.rodada - b.rodada,
    );
    let saldoAcumulado = 0;
    rodadasArray.forEach((r) => {
        saldoAcumulado += r.saldo;
        r.saldoAcumulado = saldoAcumulado;
    });

    console.log(
        `[CACHE-CONTROLLER] ✅ Dados reconstruídos: ${rodadasArray.length} rodadas | Saldo: R$ ${saldoAcumulado.toFixed(2)}`,
    );
    return rodadasArray;
}

async function buscarCamposManuais(ligaId, timeId, temporada = CURRENT_SEASON) {
    try {
        const doc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: temporada,  // ✅ v5.9: Filtrar por temporada
        }).lean();
        if (!doc || !doc.campos) {
            // ✅ v5.8: Retornar array padrão com 4 campos para UI
            return [
                { nome: "Campo 1", valor: 0 },
                { nome: "Campo 2", valor: 0 },
                { nome: "Campo 3", valor: 0 },
                { nome: "Campo 4", valor: 0 },
            ];
        }
        // ✅ v5.8: Retornar todos os 4 campos (não só os com valor != 0)
        // Isso garante que o frontend tenha a estrutura completa
        return doc.campos;
    } catch (error) {
        return [
            { nome: "Campo 1", valor: 0 },
            { nome: "Campo 2", valor: 0 },
            { nome: "Campo 3", valor: 0 },
            { nome: "Campo 4", valor: 0 },
        ];
    }
}

// ✅ v5.8: Transformar array de campos em objeto para frontend
function transformarCamposParaObjeto(camposArray) {
    const camposPadrao = [
        { nome: "Campo 1", valor: 0 },
        { nome: "Campo 2", valor: 0 },
        { nome: "Campo 3", valor: 0 },
        { nome: "Campo 4", valor: 0 },
    ];

    // Se não tem campos, usar padrão
    if (!camposArray || !Array.isArray(camposArray)) {
        return {
            campo1: camposPadrao[0],
            campo2: camposPadrao[1],
            campo3: camposPadrao[2],
            campo4: camposPadrao[3],
        };
    }

    return {
        campo1: camposArray[0] || camposPadrao[0],
        campo2: camposArray[1] || camposPadrao[1],
        campo3: camposArray[2] || camposPadrao[2],
        campo4: camposArray[3] || camposPadrao[3],
    };
}

// ✅ v5.9: Buscar campos já no formato objeto para frontend (com filtro de temporada)
async function buscarCamposComoObjeto(ligaId, timeId, temporada = CURRENT_SEASON) {
    try {
        const doc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: temporada,  // ✅ v5.9: Filtrar por temporada
        }).lean();

        return transformarCamposParaObjeto(doc?.campos);
    } catch (error) {
        return transformarCamposParaObjeto(null);
    }
}

// ✅ v5.0: GET EXTRATO CACHE COM FALLBACK PARA SNAPSHOTS
export const getExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { temporada } = req.query;
        // ✅ v5.9 FIX: Temporada usa getFinancialSeason() como default
        // Durante pré-temporada, busca dados de 2025 (temporada anterior)
        const temporadaNum = parseInt(temporada) || getFinancialSeason();

        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;

        // ✅ v5.1: Buscar acertos financeiros em paralelo
        // ✅ v5.6 FIX: Passar temporada correta
        const acertosPromise = buscarAcertosFinanceiros(ligaId, timeId, temporadaNum);

        // ✅ v5.7 FIX: Usar query nativa para evitar conversão de tipo pelo Mongoose
        // O schema define liga_id como ObjectId, mas alguns registros estão como String
        const db = mongoose.connection.db;
        const cache = await db.collection('extratofinanceirocaches').findOne({
            $or: [
                { liga_id: new mongoose.Types.ObjectId(ligaId) },
                { liga_id: String(ligaId) }
            ],
            time_id: Number(timeId),
            temporada: temporadaNum,
        });
        console.log('[CACHE-CONTROLLER] Cache encontrado via query nativa:', cache ? 'SIM' : 'NÃO');

        // ✅ v5.1: Aguardar acertos
        const acertos = await acertosPromise;

        // ✅ v5.0: Se não tem cache, tentar buscar dos snapshots
        // ✅ v6.1 FIX: Passar temporada para evitar retornar snapshot de temporada errada
        if (!cache) {
            console.log(`[CACHE-CONTROLLER] Cache não encontrado para time ${timeId}, tentando snapshots temporada ${temporadaNum}...`);

            const dadosSnapshot = await buscarExtratoDeSnapshots(ligaId, timeId, temporadaNum);

            if (dadosSnapshot) {
                const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);

                // ✅ v5.3 FIX: Calcular resumo COMPLETO a partir das rodadas (igual cache)
                // Isso garante que campos detalhados (bonus, onus, pontosCorridos, mataMata, top10)
                // estejam disponíveis no resumo para exibição correta de débitos/créditos no app
                let resumoFinal = calcularResumoDeRodadas(dadosSnapshot.rodadas, camposAtivos);

                // ✅ v5.2 FIX: Incluir saldo de acertos no cálculo do saldo final
                const saldoAcertosSnap = acertos?.resumo?.saldo ?? 0;
                resumoFinal.saldo_temporada = resumoFinal.saldo; // Preservar saldo sem acertos
                resumoFinal.saldo_acertos = saldoAcertosSnap;
                resumoFinal.saldo = resumoFinal.saldo + saldoAcertosSnap;
                resumoFinal.saldo_final = resumoFinal.saldo;
                resumoFinal.saldo_atual = resumoFinal.saldo;

                return res.json({
                    cached: true,
                    fonte: 'snapshot',
                    qtdRodadas: dadosSnapshot.rodadas.length,
                    rodadas: dadosSnapshot.rodadas,
                    resumo: resumoFinal,
                    camposManuais: camposAtivos,
                    acertos: acertos, // ✅ v5.1: Incluir acertos
                    metadados: dadosSnapshot.metadados,
                    inativo: isInativo,
                    rodadaDesistencia,
                    extratoTravado: isInativo && rodadaDesistencia,
                    rodadaTravada: rodadaDesistencia ? rodadaDesistencia - 1 : null,
                });
            }

            // ✅ v6.0: Para temporada nova (2026+), criar extrato inicial com taxa de inscrição
            if (temporadaNum >= CURRENT_SEASON) {
                console.log(`[CACHE-CONTROLLER] 🆕 Criando extrato inicial para temporada ${temporadaNum}...`);
                
                // Buscar inscrição do participante para a nova temporada
                const InscricaoTemporada = mongoose.model('InscricaoTemporada');
                const inscricao = await InscricaoTemporada.findOne({
                    liga_id: String(ligaId),
                    time_id: Number(timeId),
                    temporada: temporadaNum,
                }).lean();
                
                const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);
                
                // Se tem inscrição, criar extrato com taxa
                if (inscricao) {
                    const taxaInscricao = inscricao.taxa_inscricao || 0;
                    const statusInscricao = inscricao.status;
                    const pagouInscricao = inscricao.pagou_inscricao === true;
                    // ✅ v6.3 FIX: Usar saldo_inicial_temporada que já considera crédito anterior
                    const saldoTransferido = inscricao.saldo_transferido || 0;

                    // ✅ v6.3 FIX: Usar saldo já calculado na inscrição (crédito - taxa)
                    // Se pagou, saldo = 0. Se não pagou, usar saldo_inicial_temporada
                    const saldoInicial = pagouInscricao ? 0 : (inscricao.saldo_inicial_temporada || -taxaInscricao);

                    // ✅ v6.4 FIX CRÍTICO: Incluir acertos no saldo final
                    // Acertos já foram buscados acima, usar o saldo deles
                    const saldoAcertosIns = acertos?.resumo?.saldo ?? 0;
                    const saldoFinalComAcertos = saldoInicial + saldoAcertosIns;

                    // ✅ v6.3 FIX: Calcular ganhos/perdas considerando crédito transferido
                    let totalGanhos = saldoTransferido > 0 ? saldoTransferido : 0;
                    let totalPerdas = pagouInscricao ? 0 : -taxaInscricao;
                    // ✅ v6.4: Incluir acertos nos ganhos/perdas
                    if (saldoAcertosIns > 0) totalGanhos += saldoAcertosIns;
                    else if (saldoAcertosIns < 0) totalPerdas += saldoAcertosIns;

                    // Extrato inicial zerado, apenas com informação da inscrição
                    const resumoInicial = {
                        saldo: saldoFinalComAcertos,  // ✅ v6.4 FIX: Inclui acertos!
                        saldo_final: saldoFinalComAcertos,
                        saldo_temporada: saldoInicial,  // Saldo SEM acertos
                        saldo_acertos: saldoAcertosIns,  // ✅ v6.4 FIX: Valor real dos acertos
                        saldo_atual: saldoFinalComAcertos,
                        totalGanhos: totalGanhos,
                        totalPerdas: totalPerdas,
                        bonus: 0,
                        onus: 0,
                        pontosCorridos: 0,
                        mataMata: 0,
                        top10: 0,
                        camposManuais: 0,
                        taxaInscricao: taxaInscricao,
                        pagouInscricao: pagouInscricao,
                        // ✅ v6.3 FIX: Incluir saldo anterior para UI
                        saldoAnteriorTransferido: saldoTransferido,
                    };

                    console.log(`[CACHE-CONTROLLER] ✅ Extrato inicial: taxa=${taxaInscricao}, saldoTransferido=${saldoTransferido}, saldoInicial=${saldoInicial}, acertos=${saldoAcertosIns}, saldoFinal=${saldoFinalComAcertos}, status=${statusInscricao}`);
                    
                    return res.json({
                        cached: false,
                        fonte: 'inscricao-nova-temporada',
                        temporada: temporadaNum,
                        qtdRodadas: 0,
                        rodadas: [],
                        resumo: resumoInicial,
                        camposManuais: camposAtivos,
                        acertos: acertos,
                        inscricao: {
                            status: statusInscricao,
                            taxaInscricao: taxaInscricao,
                            pagouInscricao: inscricao.pagou_inscricao || false,
                            saldoInicial: inscricao.saldo_inicial_temporada || 0,
                        },
                        inativo: isInativo,
                        rodadaDesistencia,
                        extratoTravado: false,
                        rodadaTravada: null,
                    });
                }
            }

            // Se não tem cache nem snapshot, retorna 404
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado",
                acertos: acertos, // ✅ v5.1: Incluir acertos mesmo sem cache
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);

        // ✅ v6.1 FIX: Extrair lançamentos iniciais (inscrição, transferência) antes de converter
        // Transações com rodada=0 ou tipo INSCRICAO_TEMPORADA são lançamentos da temporada
        const transacoesRaw = cache.historico_transacoes || [];
        const lancamentosIniciais = transacoesRaw.filter(t =>
            t.rodada === 0 ||
            t.tipo === 'INSCRICAO_TEMPORADA' ||
            t.tipo === 'TRANSFERENCIA_SALDO' ||
            t.tipo === 'SALDO_TEMPORADA_ANTERIOR' ||
            t.tipo === 'LEGADO_ANTERIOR'
        );

        // ✅ v6.3 FIX: Extrair taxa e saldo anterior SEPARADAMENTE para UI
        let taxaInscricaoValor = 0;
        let saldoAnteriorTransferidoValor = 0;
        lancamentosIniciais.forEach(t => {
            const valor = parseFloat(t.valor) || 0;
            if (t.tipo === 'INSCRICAO_TEMPORADA') {
                taxaInscricaoValor += Math.abs(valor); // Taxa é sempre positiva para exibição
            } else if (t.tipo === 'SALDO_TEMPORADA_ANTERIOR' || t.tipo === 'LEGADO_ANTERIOR' || t.tipo === 'TRANSFERENCIA_SALDO') {
                saldoAnteriorTransferidoValor += valor; // Pode ser + ou -
            }
        });

        const saldoLancamentosIniciais = lancamentosIniciais.reduce((acc, t) =>
            acc + (parseFloat(t.valor) || 0), 0
        );
        console.log(`[CACHE-CONTROLLER] 📋 Lançamentos iniciais: ${lancamentosIniciais.length}, taxa=${taxaInscricaoValor}, saldoAnterior=${saldoAnteriorTransferidoValor}, total=${saldoLancamentosIniciais}`);

        let rodadasConsolidadas = transformarTransacoesEmRodadas(
            transacoesRaw,
            ligaId,
        );

        if (isInativo && rodadaDesistencia) {
            rodadasConsolidadas = filtrarRodadasParaInativo(
                rodadasConsolidadas,
                rodadaDesistencia,
            );
        }

        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        // ✅ v6.1 FIX: Incluir lançamentos iniciais no saldo
        // Isso garante que taxa de inscrição (rodada=0) seja contabilizada
        resumoCalculado.saldo += saldoLancamentosIniciais;
        resumoCalculado.saldo_final += saldoLancamentosIniciais;
        // ✅ v6.3 FIX: Separar ganhos (crédito anterior) e perdas (taxa) corretamente
        if (saldoAnteriorTransferidoValor > 0) {
            resumoCalculado.totalGanhos += saldoAnteriorTransferidoValor;
        } else if (saldoAnteriorTransferidoValor < 0) {
            resumoCalculado.totalPerdas += saldoAnteriorTransferidoValor;
        }
        if (taxaInscricaoValor > 0) {
            resumoCalculado.totalPerdas -= taxaInscricaoValor; // Taxa é débito (negativo)
        }
        // ✅ v6.3 FIX: Incluir valores separados para UI
        resumoCalculado.taxaInscricao = taxaInscricaoValor;
        resumoCalculado.saldoAnteriorTransferido = saldoAnteriorTransferidoValor;

        // ✅ v5.2 FIX: Incluir saldo de acertos no cálculo do saldo final
        const saldoAcertosCc = acertos?.resumo?.saldo ?? 0;
        resumoCalculado.saldo_temporada = resumoCalculado.saldo;
        resumoCalculado.saldo_acertos = saldoAcertosCc;
        resumoCalculado.saldo = resumoCalculado.saldo + saldoAcertosCc;
        resumoCalculado.saldo_final = resumoCalculado.saldo;
        resumoCalculado.saldo_atual = resumoCalculado.saldo;

        // ✅ v6.0: Quitação de temporada - se quitado, saldo = 0 para exibição
        // (valores originais são preservados no histórico para Hall da Fama)
        if (cache.quitacao?.quitado) {
            // Preservar valores originais antes de zerar
            resumoCalculado.saldo_original = resumoCalculado.saldo;
            resumoCalculado.saldo_final_original = resumoCalculado.saldo_final;
            // Zerar para exibição no Fluxo Financeiro e App Participante
            resumoCalculado.saldo = 0;
            resumoCalculado.saldo_final = 0;
            resumoCalculado.saldo_atual = 0;
            resumoCalculado.quitacao = cache.quitacao;
        }

        // ✅ v5.1: Adicionar acertos ao retorno
        res.json({
            cached: true,
            fonte: 'cache',
            qtdRodadas: rodadasConsolidadas.length,
            rodadas: rodadasConsolidadas,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            acertos: acertos, // ✅ v5.1: Incluir acertos
            metadados: cache.metadados,
            ultimaRodadaCalculada: cache.ultima_rodada_consolidada,
            updatedAt: cache.updatedAt,
            inativo: isInativo,
            rodadaDesistencia,
            extratoTravado: isInativo && rodadaDesistencia,
            rodadaTravada: rodadaDesistencia ? rodadaDesistencia - 1 : null,
            // ✅ v6.0: Dados de quitação para exibir badge no frontend
            quitacao: cache.quitacao || null,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ v3.3: SALVAR CACHE COM VALIDAÇÃO DE INATIVO
// ✅ v6.2: Proteção contra caches vazios/corrompidos para temporadas históricas
export const salvarExtratoCache = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const {
            historico_transacoes,
            extrato,
            ultimaRodadaCalculada,
            motivoRecalculo,
            temporada,
        } = req.body;
        // ✅ v5.9 FIX: Temporada usa getFinancialSeason() como default
        const temporadaNum = parseInt(temporada) || getFinancialSeason();

        // ✅ v6.2: PROTEÇÃO - Não sobrescrever caches de temporadas históricas com dados vazios
        const anoAtual = new Date().getFullYear();
        const isTemporadaHistorica = temporadaNum < anoAtual;
        const rodadasEnviadas = historico_transacoes || extrato || [];
        const temDadosValidos = Array.isArray(rodadasEnviadas) && rodadasEnviadas.length > 0 &&
            rodadasEnviadas.some(r => (r.bonusOnus || 0) !== 0 || (r.top10 || 0) !== 0 || (r.posicao && r.posicao !== null));

        if (isTemporadaHistorica && !temDadosValidos) {
            // Verificar se já existe cache com dados
            const cacheExistente = await ExtratoFinanceiroCache.findOne({
                liga_id: toLigaId(ligaId),
                time_id: Number(timeId),
                temporada: temporadaNum
            }).lean();

            if (cacheExistente && cacheExistente.historico_transacoes?.length > 0) {
                console.warn(`[CACHE-CONTROLLER] ⚠️ BLOQUEADO: Tentativa de sobrescrever cache ${temporadaNum} do time ${timeId} com dados vazios`);
                return res.status(400).json({
                    success: false,
                    error: "Não é permitido sobrescrever cache de temporada histórica com dados vazios",
                    temporada: temporadaNum
                });
            }
        }

        // ✅ v6.3: PROTEÇÃO PRÉ-TEMPORADA - Não salvar rodadas fantasmas
        // Se tentando salvar rodadas > 0 para uma temporada que ainda não tem rodadas no banco
        const temRodadasNoEnvio = Array.isArray(rodadasEnviadas) &&
            rodadasEnviadas.some(r => r.rodada > 0);

        if (temRodadasNoEnvio && temporadaNum >= anoAtual) {
            // Verificar se existem rodadas REAIS para esta temporada
            const rodadasDb = mongoose.connection.db.collection('rodadas');
            const rodadaExiste = await rodadasDb.findOne({
                temporada: temporadaNum,
                numero: { $gt: 0 }
            });

            if (!rodadaExiste) {
                console.warn(`[CACHE-CONTROLLER] ⚠️ BLOQUEADO: Tentativa de salvar rodadas fantasmas para temporada ${temporadaNum} (pré-temporada)`);
                return res.status(400).json({
                    success: false,
                    error: `Temporada ${temporadaNum} ainda não iniciou. Não é possível salvar rodadas.`,
                    temporada: temporadaNum,
                    preTemporada: true
                });
            }
        }

        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;

        let rodadasArray = historico_transacoes || extrato || [];
        if (!Array.isArray(rodadasArray) && rodadasArray?.rodadas)
            rodadasArray = rodadasArray.rodadas;

        if (isInativo && rodadaDesistencia && Array.isArray(rodadasArray)) {
            const rodadaLimite = rodadaDesistencia - 1;
            rodadasArray = rodadasArray.filter((r) => r.rodada <= rodadaLimite);
        }

        const rodadaCalculadaReal =
            ultimaRodadaCalculada ||
            (Array.isArray(rodadasArray) && rodadasArray.length > 0
                ? Math.max(...rodadasArray.map((r) => r.rodada || 0))
                : 0);

        // ✅ v5.5 FIX: SEMPRE recalcular saldo e saldoAcumulado antes de salvar
        // Proteção dupla: mesmo se frontend enviar dados corrompidos, backend corrige
        // - r.saldo = soma dos componentes INDIVIDUAIS da rodada
        // - r.saldoAcumulado = soma PROGRESSIVA de todos os saldos
        if (Array.isArray(rodadasArray) && rodadasArray.length > 0) {
            // Ordenar por rodada
            rodadasArray.sort((a, b) => (a.rodada || 0) - (b.rodada || 0));

            // SEMPRE recalcular saldo e saldoAcumulado (não confiar no frontend)
            let saldoAcumulado = 0;
            rodadasArray.forEach((r) => {
                // SEMPRE recalcular saldo individual da rodada a partir dos componentes
                // Isso protege contra bug onde frontend enviava saldo = acumulado
                r.saldo = (parseFloat(r.bonusOnus) || 0) +
                          (parseFloat(r.pontosCorridos) || 0) +
                          (parseFloat(r.mataMata) || 0) +
                          (parseFloat(r.top10) || 0);

                // Acumular progressivamente
                saldoAcumulado += r.saldo;
                r.saldoAcumulado = saldoAcumulado;
            });

            console.log(`[CACHE-CONTROLLER] ✅ saldo e saldoAcumulado recalculados para ${rodadasArray.length} rodadas (final: ${saldoAcumulado.toFixed(2)})`);
        }

        const resumoCalculado = calcularResumoDeRodadas(rodadasArray);

        const cacheData = {
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
            temporada: temporadaNum, // ✅ v5.6 FIX
            ultima_rodada_consolidada: rodadaCalculadaReal,
            historico_transacoes: rodadasArray,
            data_ultima_atualizacao: new Date(),
            saldo_consolidado: resumoCalculado.saldo,
            ganhos_consolidados: resumoCalculado.totalGanhos,
            perdas_consolidadas: resumoCalculado.totalPerdas,
            metadados: {
                versaoCalculo: "3.4.0",
                timestampCalculo: new Date(),
                motivoRecalculo: motivoRecalculo || "atualizacao",
                inativo: isInativo,
                rodadaDesistencia,
            },
        };

        // ✅ v5.6 FIX: Incluir temporada na query de upsert
        const cache = await ExtratoFinanceiroCache.findOneAndUpdate(
            { liga_id: toLigaId(ligaId), time_id: Number(timeId), temporada: temporadaNum },
            cacheData,
            { new: true, upsert: true },
        );

        res.json({
            success: true,
            message: "Cache atualizado",
            updatedAt: cache.updatedAt,
            inativo: isInativo,
            extratoTravado: isInativo && rodadaDesistencia,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro:", error);
        res.status(500).json({ error: "Erro ao salvar cache" });
    }
};

// ✅ v4.0: VERIFICAR CACHE VÁLIDO COM SUPORTE A TEMPORADA FINALIZADA
// ✅ v5.7 FIX: Queries paralelas para performance
export const verificarCacheValido = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, mercadoAberto, temporada } = req.query;
        // ✅ v5.9 FIX: Temporada usa getFinancialSeason() como default
        const temporadaNum = parseInt(temporada) || getFinancialSeason();

        // ✅ v5.7 FIX: Executar queries independentes em PARALELO
        const [statusTime, statusTemporada, cacheExistente, acertos] = await Promise.all([
            buscarStatusTime(ligaId, timeId),
            verificarTemporadaFinalizada(ligaId),
            ExtratoFinanceiroCache.findOne({
                liga_id: toLigaId(ligaId),
                time_id: Number(timeId),
                temporada: temporadaNum,
            }).lean(),
            buscarAcertosFinanceiros(ligaId, timeId),
        ]);

        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;

        if (!cacheExistente) {
            return res.json({
                valido: false,
                motivo: "cache_nao_encontrado",
                inativo: isInativo,
                rodadaDesistencia,
                temporadaFinalizada: statusTemporada.finalizada,
            });
        }

        // ✅ v5.2 FIX: Acertos já buscados em paralelo acima
        const saldoAcertosVal = acertos?.resumo?.saldo ?? 0;

        // Helper para adicionar acertos ao resumo
        const adicionarAcertosAoResumo = (resumo) => {
            resumo.saldo_temporada = resumo.saldo;
            resumo.saldo_acertos = saldoAcertosVal;
            resumo.saldo = resumo.saldo + saldoAcertosVal;
            resumo.saldo_final = resumo.saldo;
            resumo.saldo_atual = resumo.saldo;
            return resumo;
        };

        // ✅ v4.0: Se temporada finalizada E cache permanente, retorna imediatamente
        if (statusTemporada.finalizada && cacheExistente.cache_permanente) {
            console.log(`[CACHE-CONTROLLER] 🏁 Temporada finalizada - retornando cache permanente para time ${timeId}`);

            let rodadasConsolidadas = transformarTransacoesEmRodadas(
                cacheExistente.historico_transacoes || [],
                ligaId,
            );

            if (isInativo && rodadaDesistencia) {
                rodadasConsolidadas = filtrarRodadasParaInativo(
                    rodadasConsolidadas,
                    rodadaDesistencia,
                );
            }

            const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);
            const resumoCalculado = calcularResumoDeRodadas(
                rodadasConsolidadas,
                camposAtivos,
            );
            adicionarAcertosAoResumo(resumoCalculado); // ✅ v5.2: Incluir acertos

            return res.json({
                valido: true,
                cached: true,
                permanente: true,
                temporadaFinalizada: true,
                motivo: "temporada_finalizada_cache_permanente",
                ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                rodadaFinal: statusTemporada.rodadaFinal,
                updatedAt: cacheExistente.updatedAt,
                rodadas: rodadasConsolidadas,
                resumo: resumoCalculado,
                camposManuais: camposAtivos,
                acertos: acertos, // ✅ v5.2: Incluir acertos
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        const mercadoEstaAberto = mercadoAberto === "true";
        const rodadaAtualInt = parseInt(rodadaAtual);

        // Para inativos, cache é válido se tiver até rodada_desistencia - 1
        if (isInativo && rodadaDesistencia) {
            const rodadaLimite = rodadaDesistencia - 1;
            if (cacheExistente.ultima_rodada_consolidada >= rodadaLimite) {
                let rodadasConsolidadas = transformarTransacoesEmRodadas(
                    cacheExistente.historico_transacoes || [],
                    ligaId,
                );
                rodadasConsolidadas = filtrarRodadasParaInativo(
                    rodadasConsolidadas,
                    rodadaDesistencia,
                );
                const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);
                const resumoCalculado = calcularResumoDeRodadas(
                    rodadasConsolidadas,
                    camposAtivos,
                );
                adicionarAcertosAoResumo(resumoCalculado); // ✅ v5.2: Incluir acertos

                return res.json({
                    valido: true,
                    cached: true,
                    permanente: true,
                    motivo: "inativo_extrato_travado",
                    ultimaRodada: rodadaLimite,
                    updatedAt: cacheExistente.updatedAt,
                    rodadas: rodadasConsolidadas,
                    resumo: resumoCalculado,
                    camposManuais: camposAtivos,
                    acertos: acertos, // ✅ v5.2: Incluir acertos
                    inativo: true,
                    rodadaDesistencia,
                    extratoTravado: true,
                    rodadaTravada: rodadaLimite,
                });
            }
        }

        // ✅ v6.5 FIX: Pré-temporada - cache com 0 rodadas é válido se tem transações iniciais
        // Cenário: temporada nova (2026), sem rodadas ainda, mas com inscrição/transferência
        // ✅ v6.6 FIX: Usar || 0 para lidar com caches antigos sem o campo definido
        const ultimaRodadaCache = cacheExistente.ultima_rodada_consolidada ?? 0;
        const isPreTemporadaCache = temporadaNum >= CURRENT_SEASON &&
                                     ultimaRodadaCache === 0 &&
                                     cacheExistente.historico_transacoes?.length > 0;

        if (isPreTemporadaCache) {
            console.log(`[CACHE-CONTROLLER] ✅ PRÉ-TEMPORADA: Cache válido com ${cacheExistente.historico_transacoes.length} transações iniciais`);

            // Extrair lançamentos iniciais (inscrição, transferência)
            const transacoesRaw = cacheExistente.historico_transacoes || [];
            const lancamentosIniciais = transacoesRaw.filter(t =>
                t.rodada === 0 ||
                t.tipo === 'INSCRICAO_TEMPORADA' ||
                t.tipo === 'SALDO_TEMPORADA_ANTERIOR' ||
                t.tipo === 'LEGADO_ANTERIOR'
            );

            // Calcular saldo dos lançamentos iniciais
            const saldoLancamentosIniciais = lancamentosIniciais.reduce((acc, t) =>
                acc + (parseFloat(t.valor) || 0), 0
            );

            const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);

            // Criar resumo inicial com saldo das transações
            const resumoCalculado = {
                totalGanhos: 0,
                totalPerdas: 0,
                bonus: 0,
                onus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                saldo: saldoLancamentosIniciais,
                saldo_final: saldoLancamentosIniciais,
            };

            adicionarAcertosAoResumo(resumoCalculado);

            console.log(`[CACHE-CONTROLLER] ✅ PRÉ-TEMPORADA resumo: saldoInicial=${saldoLancamentosIniciais}, acertos=${saldoAcertosVal}, final=${resumoCalculado.saldo}`);

            return res.json({
                valido: true,
                cached: true,
                permanente: false,
                preTemporada: true,
                motivo: "pre_temporada_cache_valido",
                ultimaRodada: 0,
                updatedAt: cacheExistente.updatedAt,
                rodadas: [],
                resumo: resumoCalculado,
                camposManuais: camposAtivos,
                acertos: acertos,
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: false,
            });
        }

        // Validação normal para ativos
        const rodadaEsperada = mercadoEstaAberto
            ? rodadaAtualInt - 1
            : rodadaAtualInt;
        if (cacheExistente.ultima_rodada_consolidada >= rodadaEsperada) {
            const rodadasConsolidadas = transformarTransacoesEmRodadas(
                cacheExistente.historico_transacoes || [],
                ligaId,
            );
            const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);
            const resumoCalculado = calcularResumoDeRodadas(
                rodadasConsolidadas,
                camposAtivos,
            );
            adicionarAcertosAoResumo(resumoCalculado); // ✅ v5.2: Incluir acertos

            return res.json({
                valido: true,
                cached: true,
                permanente: !mercadoEstaAberto,
                motivo: mercadoEstaAberto
                    ? "mercado_aberto_cache_valido"
                    : "rodada_fechada_cache_permanente",
                ultimaRodada: cacheExistente.ultima_rodada_consolidada,
                updatedAt: cacheExistente.updatedAt,
                rodadas: rodadasConsolidadas,
                resumo: resumoCalculado,
                camposManuais: camposAtivos,
                acertos: acertos, // ✅ v5.2: Incluir acertos
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        res.json({
            valido: false,
            motivo: "cache_desatualizado",
            cacheRodada: cacheExistente.ultima_rodada_consolidada,
            rodadaEsperada,
            inativo: isInativo,
            rodadaDesistencia,
        });
    } catch (error) {
        console.error("[CACHE-CONTROLLER] Erro:", error);
        res.status(500).json({ error: "Erro na validação" });
    }
};

// ✅ v3.3: LER CACHE COM SUPORTE A INATIVOS
export const lerCacheExtratoFinanceiro = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { rodadaAtual, temporada } = req.query;
        const rodadaAtualNum = parseInt(rodadaAtual) || 1;
        // ✅ v5.9 FIX: Temporada usa getFinancialSeason() como default
        // Durante pré-temporada, busca dados de 2025 (temporada anterior)
        const temporadaNum = parseInt(temporada) || getFinancialSeason();

        const statusTime = await buscarStatusTime(ligaId, timeId);
        const isInativo = statusTime.ativo === false;
        const rodadaDesistencia = statusTime.rodada_desistencia;
        const rodadaLimiteInativo = rodadaDesistencia
            ? rodadaDesistencia - 1
            : null;

        // ✅ v5.6 FIX: SEMPRE filtrar por temporada para evitar retornar cache de outra temporada
        const cache = await ExtratoFinanceiroCache.findOne({
            liga_id: toLigaId(ligaId),
            time_id: Number(timeId),
            temporada: temporadaNum,
        }).lean();

        if (!cache) {
            return res.status(404).json({
                cached: false,
                message: "Cache não encontrado",
                needsRecalc: true,
                inativo: isInativo,
                rodadaDesistencia,
                extratoTravado: isInativo && rodadaDesistencia,
            });
        }

        const rodadaCache = cache.ultima_rodada_consolidada || 0;

        // Verificação de cache desatualizado
        if (
            isInativo &&
            rodadaLimiteInativo &&
            rodadaCache < rodadaLimiteInativo
        ) {
            return res.status(200).json({
                cached: true,
                needsRecalc: true,
                message: `Cache inativo desatualizado`,
                rodada_cache: rodadaCache,
                expectedUntil: rodadaLimiteInativo,
                inativo: true,
                rodadaDesistencia,
                extratoTravado: true,
            });
        } else if (!isInativo && rodadaCache < rodadaAtualNum) {
            return res.status(200).json({
                cached: true,
                needsRecalc: true,
                message: `Cache desatualizado`,
                rodada_cache: rodadaCache,
                expectedUntil: rodadaAtualNum,
                inativo: false,
            });
        }

        let rodadasConsolidadas = transformarTransacoesEmRodadas(
            cache.historico_transacoes || [],
            ligaId,
        );

        if (isInativo && rodadaDesistencia) {
            rodadasConsolidadas = filtrarRodadasParaInativo(
                rodadasConsolidadas,
                rodadaDesistencia,
            );
        }

        // ✅ v6.0: Extrair lançamentos iniciais (INSCRICAO, TRANSFERENCIA, etc.) que não são rodadas
        const lancamentosIniciais = (cache.historico_transacoes || []).filter(t =>
            t.tipo === 'INSCRICAO_TEMPORADA' ||
            t.tipo === 'TRANSFERENCIA_SALDO' ||
            t.tipo === 'DIVIDA_ANTERIOR' ||
            t.tipo === 'CREDITO_ANTERIOR' ||
            (t.rodada === 0 || t.rodada === null || t.rodada === undefined)
        );

        let saldoLancamentosIniciais = 0;
        lancamentosIniciais.forEach(l => {
            saldoLancamentosIniciais += parseFloat(l.valor) || 0;
        });

        const camposAtivos = await buscarCamposManuais(ligaId, timeId, temporadaNum);
        const resumoCalculado = calcularResumoDeRodadas(
            rodadasConsolidadas,
            camposAtivos,
        );

        // ✅ v6.0: Incluir lançamentos iniciais no resumo
        if (saldoLancamentosIniciais !== 0) {
            resumoCalculado.lancamentosIniciais = saldoLancamentosIniciais;
            resumoCalculado.saldo += saldoLancamentosIniciais;
            resumoCalculado.saldo_final = resumoCalculado.saldo;
            if (saldoLancamentosIniciais < 0) {
                resumoCalculado.totalPerdas = (resumoCalculado.totalPerdas || 0) + saldoLancamentosIniciais;
            } else {
                resumoCalculado.totalGanhos = (resumoCalculado.totalGanhos || 0) + saldoLancamentosIniciais;
            }
        }

        // ✅ v5.2 FIX: Buscar acertos financeiros e incluir no saldo final
        // ✅ v5.6 FIX: Passar temporada para buscar acertos da temporada correta
        const acertos = await buscarAcertosFinanceiros(ligaId, timeId, temporadaNum);
        const saldoAcertos = acertos?.resumo?.saldo ?? 0;

        // Adicionar saldo de acertos ao resumo
        const saldoTemporada = resumoCalculado.saldo; // Saldo SEM acertos (só rodadas + campos)
        resumoCalculado.saldo_temporada = saldoTemporada; // Preservar saldo original
        resumoCalculado.saldo_acertos = saldoAcertos;
        resumoCalculado.saldo = saldoTemporada + saldoAcertos; // Saldo COM acertos
        resumoCalculado.saldo_final = resumoCalculado.saldo;
        resumoCalculado.saldo_atual = resumoCalculado.saldo; // ✅ Usado pelo UI do App

        // Atualizar ganhos/perdas com acertos
        if (saldoAcertos > 0) {
            resumoCalculado.totalGanhos = (resumoCalculado.totalGanhos || 0) + saldoAcertos;
        } else if (saldoAcertos < 0) {
            resumoCalculado.totalPerdas = (resumoCalculado.totalPerdas || 0) + saldoAcertos;
        }

        console.log(`[CACHE-EXTRATO] ✅ Extrato time ${timeId} temp=${temporadaNum}: Lanç.Iniciais=${saldoLancamentosIniciais.toFixed(2)} + Rodadas=${(resumoCalculado.saldo - saldoLancamentosIniciais - saldoAcertos).toFixed(2)} + Acertos=${saldoAcertos.toFixed(2)} = Final=${resumoCalculado.saldo.toFixed(2)}`);

        res.json({
            cached: true,
            fonte: 'cache',
            qtdRodadas: rodadasConsolidadas.length,
            rodada_calculada: rodadaCache,
            dados: rodadasConsolidadas,
            dados_extrato: rodadasConsolidadas,
            rodadas: rodadasConsolidadas,
            saldo_total: resumoCalculado.saldo,
            resumo: resumoCalculado,
            camposManuais: camposAtivos,
            lancamentosIniciais: lancamentosIniciais, // ✅ v6.0: Incluir lançamentos iniciais
            acertos: acertos, // ✅ v5.2: Incluir acertos na resposta
            updatedAt: cache.updatedAt || cache.data_ultima_atualizacao,
            inativo: isInativo,
            rodadaDesistencia,
            extratoTravado: isInativo && rodadaDesistencia,
            rodadaTravada: rodadaLimiteInativo,
        });
    } catch (error) {
        console.error("[CACHE-EXTRATO] Erro:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// =========================================================================
// ✅ v6.7: REMOVIDO - Funções de limpeza perigosas (Botão da Morte)
// As funções limparCacheLiga e limparCacheTime foram REMOVIDAS por causar
// perda de dados IRRECUPERÁVEIS em temporadas históricas.
// Mantido apenas limparCachesCorrompidos para manutenção técnica.
// =========================================================================

export const limparCachesCorrompidos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const filtro = {
            $or: [
                { historico_transacoes: { $type: "number" } },
                { historico_transacoes: { $exists: false } },
                { historico_transacoes: { $size: 0 } },
            ],
        };
        if (ligaId) filtro.liga_id = ligaId;
        const resultado = await ExtratoFinanceiroCache.deleteMany(filtro);
        res.json({
            success: true,
            message: `Caches corrompidos limpos`,
            deletedCount: resultado.deletedCount,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao limpar caches" });
    }
};

// ✅ v6.7: limparTodosCaches REMOVIDO - muito perigoso

export const estatisticasCache = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const filtroBase = ligaId ? { liga_id: toLigaId(ligaId) } : {};
        const total = await ExtratoFinanceiroCache.countDocuments(filtroBase);
        const corrompidos = await ExtratoFinanceiroCache.countDocuments({
            ...filtroBase,
            $or: [
                { historico_transacoes: { $type: "number" } },
                { historico_transacoes: { $size: 0 } },
            ],
        });
        res.json({
            success: true,
            estatisticas: {
                total,
                validos: total - corrompidos,
                corrompidos,
                percentualValido:
                    total > 0
                        ? (((total - corrompidos) / total) * 100).toFixed(1) +
                          "%"
                        : "0%",
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao obter estatísticas" });
    }
};

console.log("[CACHE-CONTROLLER] ✅ v6.7 carregado (REMOVIDO funções de limpeza perigosas)");

// ✅ v5.6: Exportar funções auxiliares para uso em outros módulos (tesouraria, etc.)
export {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
    buscarCamposManuais,
    buscarAcertosFinanceiros,
};
