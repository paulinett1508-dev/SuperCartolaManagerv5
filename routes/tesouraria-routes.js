/**
 * ROTAS DE TESOURARIA - Gestão Financeira Centralizada
 *
 * Painel para gerenciar saldos de TODOS os participantes de TODAS as ligas.
 * Permite visualizar, filtrar e realizar acertos financeiros.
 *
 * @version 2.24.0
 * ✅ v2.24.0: FIX CRÍTICO - NÃO deletar cache do extrato ao registrar acertos
 *   - Bug v2.4 deletava cache, zerando histórico (rodadas, PC, MM, Top10)
 *   - Acertos são armazenados em coleção separada e integrados na consulta
 *   - Ref: acertos-financeiros-routes.js v1.4.0
 * ✅ v2.23.0: FIX CRÍTICO - Acertos devem ser filtrados pela temporada EXATA
 *   - Query busca temporadas N e N-1 para transição, mas cálculo misturava tudo
 *   - Agora filtra acertos pela temporada sendo visualizada antes de somar
 *   - Corrige saldo de 2026 que incluía acertos de 2025 erroneamente
 * ✅ v2.22.0: FIX - Transações especiais (INSCRICAO, LEGADO) com rodada:0
 *   - transformarTransacoesEmRodadas ignora rodada:0, causando saldo=0 errado
 *   - Agora detecta caches com apenas transações especiais e usa saldo_consolidado
 * ✅ v2.20.0: AUTO-QUITAÇÃO para temporadas anteriores
 *   - Quando saldo zera após acerto em temporada < CURRENT_SEASON, marca como quitado
 *   - Resposta inclui flag autoQuitacao com mensagem para o admin
 * ✅ v2.19.0: Filtrar participantes por inscrição para temporadas >= 2026
 *   - Para 2026+, exibe apenas participantes com status 'renovado' ou 'novo'
 *   - Temporadas anteriores (2025) mantêm comportamento histórico (todos)
 * ✅ v2.18.0: Dados históricos de 2025 preservados (campos + extratos)
 * ✅ v2.16.0: FIX CRÍTICO - Campos manuais com filtro de temporada
 *   - calcularSaldoCompleto() agora filtra por temporada
 *   - Bulk query de campos na rota /liga/:ligaId também filtra
 * ✅ v2.15.0: Ajustes dinâmicos (2026+) - substitui campos fixos
 *   - Busca ajustes no endpoint do participante
 *   - Inclui saldoAjustes no cálculo de saldo final
 * ✅ v2.14.0: Extrato individual agora retorna quitação, legado_manual, resumo e histórico
 *   - Suporte a seletor de temporadas no modal
 *   - Dados de inscrição da próxima temporada para exibir status de renovação
 * ✅ v2.13.0: Dados de quitação incluídos no participante para exibir badge QUITADO
 * ✅ v2.9.0: Adicionado 'acertos' ao breakdown (pagamentos/recebimentos)
 * ✅ v2.6.0: FIX CRÍTICO - Filtrar ExtratoFinanceiroCache e FluxoFinanceiroCampos por temporada
 *   - Queries agora incluem filtro de temporada em todas as collections
 *   - Resolve problema de colunas vazias quando temporada API != temporada dados
 * ✅ v2.5.0: FIX - Incluir ligaId, ligaNome e modulosAtivos na rota /liga/:ligaId
 *   - Badges de movimentações agora aparecem corretamente
 *   - Cache de participantes funciona com chave ligaId_timeId
 * ✅ v2.4.0: FIX - Invalidar cache COM temporada para evitar inconsistências
 *   - deleteOne agora inclui temporada no filtro
 *   - Tipos consistentes: String(ligaId), Number(timeId), Number(temporada)
 * ✅ v2.3.0: FIX - Usar Number(temporada) em calcularSaldoAcertos
 * ✅ v2.2.0: Campos manuais preservados (histórico completo)
 * ✅ v2.1.0: Usar mesma lógica do extrato individual (recalcular de rodadas)
 */

import express from "express";
import mongoose from "mongoose";
import { verificarAdmin } from "../middleware/auth.js";
import Liga from "../models/Liga.js";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import AjusteFinanceiro from "../models/AjusteFinanceiro.js";
import { CURRENT_SEASON } from "../config/seasons.js";
// ✅ v2.1: Importar funções de cálculo do controller (mesma lógica do extrato individual)
import {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
} from "../controllers/extratoFinanceiroCacheController.js";

const router = express.Router();

// =============================================================================
// FUNÇÃO AUXILIAR: Calcular saldo completo de um participante
// =============================================================================

async function calcularSaldoCompleto(ligaId, timeId, temporada = CURRENT_SEASON) {
    // ✅ v2.1 FIX: Usar mesma lógica do extrato individual (recalcular a partir das rodadas)
    // Em vez de confiar no saldo_consolidado que pode estar desatualizado

    // 1. Buscar cache e RECALCULAR a partir das rodadas (igual extrato individual)
    // ✅ v2.2 FIX: Filtrar por temporada para evitar usar cache errado quando
    // existem múltiplos caches (ex: 2025 e 2026) para o mesmo time
    // ✅ v2.4 FIX: Tentar busca com String primeiro (documentos novos), depois ObjectId (antigos)
    let cache = await ExtratoFinanceiroCache.findOne({
        liga_id: String(ligaId),
        time_id: Number(timeId),
        temporada: Number(temporada),
    }).lean();

    // Fallback para busca com ObjectId (alguns documentos antigos usam ObjectId)
    if (!cache) {
        cache = await ExtratoFinanceiroCache.findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            time_id: Number(timeId),
            temporada: Number(temporada),
        }).lean();
    }

    // ✅ v2.4 FIX: Verificar se tem apenas transações especiais (rodada 0)
    // Nesse caso, usar saldo_consolidado diretamente
    const apenasTransacoesEspeciais = cache?.historico_transacoes?.length > 0 &&
        cache.historico_transacoes.every(t => t.rodada === 0 || t.tipo);

    let saldoConsolidado = 0;
    let saldoCampos = 0;

    if (apenasTransacoesEspeciais) {
        // ✅ Temporada futura com apenas inscrição/legado - usar saldo_consolidado direto
        saldoConsolidado = cache.saldo_consolidado || 0;
        console.log(`[TESOURARIA] Usando saldo_consolidado direto para ${temporada}: ${saldoConsolidado}`);
    } else {
        // ✅ RECALCULAR usando as mesmas funções do extrato individual
        const rodadasProcessadas = transformarTransacoesEmRodadas(
            cache?.historico_transacoes || [],
            ligaId
        );

        // 2. Campos manuais
        // ✅ v2.16 FIX: Incluir temporada na query (segregação de dados entre temporadas)
        const camposManuais = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: Number(temporada),
        }).lean();
        const camposAtivos = camposManuais?.campos?.filter(c => c.valor !== 0) || [];

        // 3. Calcular resumo (igual extrato individual)
        const resumoCalculado = calcularResumoDeRodadas(rodadasProcessadas, camposAtivos);
        saldoConsolidado = resumoCalculado.saldo;
        saldoCampos = resumoCalculado.camposManuais || 0;
    }

    // 4. Saldo da temporada (já inclui campos manuais no cálculo)
    const saldoTemporada = saldoConsolidado;

    // 5. Saldo de acertos
    // ✅ v2.3 FIX: Usar Number para temporada (schema define temporada: Number)
    const acertosInfo = await AcertoFinanceiro.calcularSaldoAcertos(
        String(ligaId),
        String(timeId),
        Number(temporada)
    );

    // ✅ v2.15: Buscar ajustes dinâmicos (temporada 2026+)
    let saldoAjustes = 0;
    let ajustesInfo = { total: 0, creditos: 0, debitos: 0, quantidade: 0 };
    if (Number(temporada) >= 2026) {
        ajustesInfo = await AjusteFinanceiro.calcularTotal(ligaId, timeId, Number(temporada));
        saldoAjustes = ajustesInfo.total || 0;
    }

    // 6. Saldo final (inclui ajustes para 2026+)
    const saldoFinal = saldoTemporada + acertosInfo.saldoAcertos + saldoAjustes;

    return {
        saldoConsolidado: parseFloat((saldoConsolidado - saldoCampos).toFixed(2)), // Sem campos manuais
        saldoCampos: parseFloat(saldoCampos.toFixed(2)),
        saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
        saldoAcertos: acertosInfo.saldoAcertos,
        totalPago: acertosInfo.totalPago,
        totalRecebido: acertosInfo.totalRecebido,
        // ✅ v2.15: Incluir ajustes no retorno
        saldoAjustes: parseFloat(saldoAjustes.toFixed(2)),
        ajustesInfo,
        saldoFinal: parseFloat(saldoFinal.toFixed(2)),
        quantidadeAcertos: acertosInfo.quantidadeAcertos,
    };
}

// =============================================================================
// GET /api/tesouraria/participantes
// Retorna TODOS os participantes de TODAS as ligas com saldos
// ✅ v2.0: Inclui breakdown por módulo financeiro e módulos ativos por liga
// =============================================================================

router.get("/participantes", verificarAdmin, async (req, res) => {
    try {
        const { temporada = CURRENT_SEASON } = req.query;
        const startTime = Date.now();

        console.log(`[TESOURARIA] Buscando participantes - Temporada ${temporada}`);

        // Buscar todas as ligas ativas
        const ligas = await Liga.find({ ativo: { $ne: false } }).lean();

        if (!ligas || ligas.length === 0) {
            return res.json({
                success: true,
                participantes: [],
                totais: { credores: 0, devedores: 0, quitados: 0, total: 0 },
            });
        }

        // ✅ v2.0: Coletar todos os timeIds para bulk queries
        const allTimeIds = [];
        const ligaMap = new Map();

        for (const liga of ligas) {
            const ligaId = liga._id.toString();
            ligaMap.set(ligaId, liga);
            for (const p of liga.participantes || []) {
                allTimeIds.push(p.time_id);
            }
        }

        // ✅ v2.0: Bulk queries para todos os dados
        // ✅ v2.3 FIX: Usar Number para temporada (schema define temporada: Number)
        const [todosExtratos, todosCampos, todosAcertos] = await Promise.all([
            ExtratoFinanceiroCache.find({ time_id: { $in: allTimeIds } }).lean(),
            FluxoFinanceiroCampos.find({ timeId: { $in: allTimeIds.map(String) } }).lean(),
            AcertoFinanceiro.find({ temporada: Number(temporada), ativo: true }).lean()
        ]);

        // Criar mapas para acesso O(1) - chave composta liga_time
        const extratoMap = new Map();
        todosExtratos.forEach(e => {
            const key = `${e.liga_id}_${e.time_id}`;
            extratoMap.set(key, e);
        });

        const camposMap = new Map();
        todosCampos.forEach(c => {
            const key = `${c.ligaId}_${c.timeId}`;
            camposMap.set(key, c);
        });

        // Agrupar acertos por liga_time
        const acertosMap = new Map();
        todosAcertos.forEach(a => {
            const key = `${a.ligaId}_${a.timeId}`;
            if (!acertosMap.has(key)) acertosMap.set(key, []);
            acertosMap.get(key).push(a);
        });

        const participantes = [];
        let totalCredores = 0;
        let totalDevedores = 0;
        let quantidadeCredores = 0;
        let quantidadeDevedores = 0;
        let quantidadeQuitados = 0;

        // Processar cada liga
        for (const liga of ligas) {
            const ligaId = liga._id.toString();
            const ligaNome = liga.nome || "Liga sem nome";

            // ✅ v2.1: Extrair módulos ativos desta liga
            // OPCIONAIS usam === true (não habilitados por default)
            const modulosAtivos = {
                banco: liga.modulos_ativos?.banco !== false,
                pontosCorridos: liga.modulos_ativos?.pontosCorridos === true || liga.configuracoes?.pontos_corridos?.habilitado === true,
                mataMata: liga.modulos_ativos?.mataMata === true || liga.configuracoes?.mata_mata?.habilitado === true,
                top10: liga.modulos_ativos?.top10 === true || liga.configuracoes?.top10?.habilitado === true,
                melhorMes: liga.modulos_ativos?.melhorMes === true || liga.configuracoes?.melhor_mes?.habilitado === true,
                artilheiro: liga.modulos_ativos?.artilheiro === true || liga.configuracoes?.artilheiro?.habilitado === true,
                luvaOuro: liga.modulos_ativos?.luvaOuro === true || liga.configuracoes?.luva_ouro?.habilitado === true,
            };

            // Processar cada participante da liga
            for (const participante of liga.participantes || []) {
                const timeId = String(participante.time_id);
                const nomeTime = participante.nome_time || "Time sem nome";
                const nomeCartola = participante.nome_cartola || "";
                const escudo = participante.escudo_url || participante.escudo || null;
                const ativo = participante.ativo !== false;

                const key = `${ligaId}_${timeId}`;

                // Buscar dados do cache
                const extrato = extratoMap.get(key);
                const historico = extrato?.historico_transacoes || [];

                // ✅ v2.22 FIX: Detectar caches com apenas transações especiais (INSCRICAO, LEGADO)
                const apenasTransacoesEspeciais = historico.length > 0 &&
                    historico.every(t => t.rodada === 0 || t.tipo);

                // Campos manuais
                const camposDoc = camposMap.get(key);
                const camposAtivos = camposDoc?.campos?.filter(c => c.valor !== 0) || [];

                let saldoConsolidado = 0;
                let saldoCampos = 0;
                let resumoCalculado = { bonus: 0, onus: 0, pontosCorridos: 0, mataMata: 0, top10: 0 };

                if (apenasTransacoesEspeciais) {
                    // ✅ v2.22: Para pré-temporada (só inscrição/legado), usar saldo_consolidado direto
                    saldoConsolidado = extrato?.saldo_consolidado || 0;
                } else {
                    // ✅ v2.1 FIX: RECALCULAR usando mesmas funções do extrato individual
                    const rodadasProcessadas = transformarTransacoesEmRodadas(historico, ligaId);
                    resumoCalculado = calcularResumoDeRodadas(rodadasProcessadas, camposAtivos);
                    saldoConsolidado = resumoCalculado.saldo;
                    saldoCampos = resumoCalculado.camposManuais || 0;
                }

                // ✅ v2.0: Calcular breakdown por módulo (baseado no resumo calculado)
                // ✅ v2.9: Adicionado 'acertos' ao breakdown
                const breakdown = {
                    banco: resumoCalculado.bonus + resumoCalculado.onus,
                    pontosCorridos: resumoCalculado.pontosCorridos,
                    mataMata: resumoCalculado.mataMata,
                    top10: resumoCalculado.top10,
                    melhorMes: 0, // Não está no resumoCalculado padrão
                    artilheiro: 0, // Não está no resumoCalculado padrão
                    luvaOuro: 0, // Não está no resumoCalculado padrão
                    campos: saldoCampos,
                    acertos: 0, // Será preenchido abaixo
                };

                // Calcular campos especiais do histórico legado se houver
                historico.forEach(t => {
                    if (t.tipo === 'MELHOR_MES') breakdown.melhorMes += t.valor || 0;
                    else if (t.tipo === 'ARTILHEIRO') breakdown.artilheiro += t.valor || 0;
                    else if (t.tipo === 'LUVA_OURO') breakdown.luvaOuro += t.valor || 0;
                });

                // Calcular saldo de acertos
                // ✅ v2.23 FIX: Filtrar acertos pela temporada EXATA sendo visualizada
                const acertosList = acertosMap.get(key) || [];
                const temporadaNum = Number(temporada);
                const acertosTemporada = acertosList.filter(a => Number(a.temporada) === temporadaNum);
                let totalPago = 0;
                let totalRecebido = 0;
                acertosTemporada.forEach(a => {
                    if (a.tipo === 'pagamento') totalPago += a.valor || 0;
                    else if (a.tipo === 'recebimento') totalRecebido += a.valor || 0;
                });
                // ✅ v1.1.0 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
                // PAGAMENTO = participante pagou à liga → AUMENTA saldo (quita dívida)
                // RECEBIMENTO = participante recebeu da liga → DIMINUI saldo (usa crédito)
                const saldoAcertos = totalPago - totalRecebido;

                // ✅ v2.9: Adicionar acertos ao breakdown
                breakdown.acertos = saldoAcertos;

                // ✅ v2.1 FIX: Saldo da temporada já inclui campos (calcularResumoDeRodadas soma tudo)
                const saldoTemporada = saldoConsolidado;
                const saldoFinal = saldoTemporada + saldoAcertos;

                // Classificar situação financeira
                // ✅ v2.10 FIX: Corrigir contagem - quitados NÃO deve incluir credores
                let situacao = "quitado";
                if (saldoFinal < -0.01) {
                    // Devedor: saldo negativo (deve à liga)
                    situacao = "devedor";
                    totalDevedores += Math.abs(saldoFinal);
                    quantidadeDevedores++;
                } else if (saldoFinal > 0.01) {
                    // Credor: saldo positivo (liga deve a ele)
                    situacao = "credor";
                    totalCredores += saldoFinal;
                    quantidadeCredores++;
                } else {
                    // Quitado: saldo entre -0.01 e 0.01 (zerado)
                    quantidadeQuitados++;
                }

                // 🐛 DEBUG: Log da classificação
                if (participante.time_id) {
                    console.log(`[TESOURARIA-API] ${nomeTime}: saldoFinal=${saldoFinal.toFixed(2)} | situacao=${situacao}`);
                }

                participantes.push({
                    ligaId,
                    ligaNome,
                    timeId,
                    nomeTime,
                    nomeCartola,
                    escudo,
                    ativo,
                    temporada,
                    saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
                    saldoAcertos: parseFloat(saldoAcertos.toFixed(2)),
                    totalPago: parseFloat(totalPago.toFixed(2)),
                    totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                    saldoFinal: parseFloat(saldoFinal.toFixed(2)),
                    situacao,
                    quantidadeAcertos: acertosTemporada.length,
                    // ✅ v2.0: Breakdown e módulos ativos
                    // ✅ v2.9: Adicionado 'acertos' ao breakdown
                    breakdown: {
                        banco: parseFloat(breakdown.banco.toFixed(2)),
                        pontosCorridos: parseFloat(breakdown.pontosCorridos.toFixed(2)),
                        mataMata: parseFloat(breakdown.mataMata.toFixed(2)),
                        top10: parseFloat(breakdown.top10.toFixed(2)),
                        melhorMes: parseFloat(breakdown.melhorMes.toFixed(2)),
                        artilheiro: parseFloat(breakdown.artilheiro.toFixed(2)),
                        luvaOuro: parseFloat(breakdown.luvaOuro.toFixed(2)),
                        campos: breakdown.campos,
                        acertos: parseFloat(breakdown.acertos.toFixed(2)),
                    },
                    modulosAtivos,
                });
            }
        }

        // Ordenar por saldo (devedores primeiro, depois credores)
        participantes.sort((a, b) => a.saldoFinal - b.saldoFinal);

        const elapsed = Date.now() - startTime;
        console.log(`[TESOURARIA] ✅ ${participantes.length} participantes em ${elapsed}ms`);

        // 🐛 DEBUG: Log dos totais calculados
        console.log(`[TESOURARIA-API] 📊 TOTAIS calculados:`);
        console.log(`  Total participantes: ${participantes.length}`);
        console.log(`  Devedores: ${quantidadeDevedores}`);
        console.log(`  Credores: ${quantidadeCredores}`);
        console.log(`  Quitados: ${quantidadeQuitados}`);
        console.log(`  Validação: ${quantidadeDevedores + quantidadeCredores + quantidadeQuitados} = ${participantes.length}`);

        res.json({
            success: true,
            temporada,
            participantes,
            totais: {
                totalParticipantes: participantes.length,
                quantidadeCredores,
                quantidadeDevedores,
                quantidadeQuitados,
                totalAReceber: parseFloat(totalDevedores.toFixed(2)),
                totalAPagar: parseFloat(totalCredores.toFixed(2)),
                saldoGeral: parseFloat((totalDevedores - totalCredores).toFixed(2)),
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao buscar participantes:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// GET /api/tesouraria/liga/:ligaId
// Retorna participantes de UMA LIGA específica com saldos (para módulo Fluxo Financeiro)
// ✅ OTIMIZADO: Usa bulk queries em vez de queries individuais por participante
// =============================================================================

router.get("/liga/:ligaId", verificarAdmin, async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada = CURRENT_SEASON } = req.query;
        const startTime = Date.now();

        console.log(`[TESOURARIA] Buscando participantes da liga ${ligaId}`);

        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ success: false, error: "Liga não encontrada" });
        }

        const temporadaNum = Number(temporada);
        const ligaIdStr = String(ligaId);

        // ✅ v2.20 FIX: Para temporadas >= 2026, usar dados de inscricoestemporada como fonte OFICIAL
        // Isso sincroniza com o módulo Participantes (que também usa inscricoestemporada)
        // Temporadas anteriores (2025) usam liga.participantes (comportamento histórico)
        let participantesFiltrados = liga.participantes || [];
        let totalParticipantesLiga = participantesFiltrados.length;
        let inscricoesMap = new Map(); // Mapa para acessar dados completos das inscrições

        if (temporadaNum >= 2026) {
            const inscricoesAtivas = await InscricaoTemporada.find({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                temporada: temporadaNum,
                status: { $in: ['renovado', 'novo'] }
            }).lean();

            // ✅ v2.20: Criar mapa de inscrições para acessar dados_participante
            inscricoesAtivas.forEach(i => inscricoesMap.set(String(i.time_id), i));

            // ✅ v2.21: Criar mapa de liga.participantes para obter clube_id (time do coração)
            // O clube_id está em liga.participantes, não em inscricoestemporada
            const ligaParticipantesMap = new Map();
            (liga.participantes || []).forEach(p => ligaParticipantesMap.set(String(p.time_id), p));

            // ✅ v2.20: Usar dados de inscricoestemporada.dados_participante como fonte oficial
            // ✅ v2.21: Merge com liga.participantes para obter clube_id
            participantesFiltrados = inscricoesAtivas.map(insc => {
                const timeIdStr = String(insc.time_id);
                const participanteLiga = ligaParticipantesMap.get(timeIdStr);

                return {
                    time_id: insc.time_id,
                    nome_time: insc.dados_participante?.nome_time || participanteLiga?.nome_time || "N/D",
                    nome_cartola: insc.dados_participante?.nome_cartoleiro || participanteLiga?.nome_cartola || "N/D",
                    escudo: insc.dados_participante?.escudo || participanteLiga?.foto_time || "",
                    // ✅ v2.21: clube_id vem de liga.participantes (fonte oficial do time do coração)
                    clube_id: participanteLiga?.clube_id || insc.dados_participante?.time_coracao || null,
                    contato: insc.dados_participante?.contato || participanteLiga?.contato || null,
                    ativo: true, // Se está em inscricoesAtivas, está ativo
                    // Dados extras da inscrição
                    status_inscricao: insc.status,
                    pagou_inscricao: insc.pagou_inscricao || false,
                    saldo_transferido: insc.saldo_transferido || 0
                };
            });

            console.log(`[TESOURARIA] Temporada ${temporadaNum}: ${participantesFiltrados.length} participantes (fonte: inscricoestemporada + liga.participantes)`);
        }

        const timeIds = participantesFiltrados.map(p => p.time_id);

        // ✅ BULK QUERIES - Buscar todos os dados de uma vez (4 queries em vez de ~96)
        console.log(`[TESOURARIA] Buscando dados para temporada ${temporadaNum}`);

        const [todosExtratos, todosCampos, todosAcertos] = await Promise.all([
            // 1. Todos os extratos da liga
            // ✅ v2.8 FIX CRÍTICO: Usar acesso DIRETO à collection (bypass schema)
            // Problema: Schema define liga_id como ObjectId, mas docs foram salvos como String
            // Mongoose tenta cast e falha. Usar mongoose.connection.db.collection() resolve
            // ✅ v2.11 FIX: Buscar temporada atual OU anterior (para transição de temporada)
            mongoose.connection.db.collection('extratofinanceirocaches').find({
                $or: [
                    { liga_id: ligaIdStr },
                    { liga_id: new mongoose.Types.ObjectId(ligaId) }
                ],
                time_id: { $in: timeIds },
                temporada: { $in: [temporadaNum, temporadaNum - 1] }
            }).toArray(),

            // 2. Todos os campos manuais da liga
            // ✅ v2.18 FIX: Buscar temporada atual E anterior (dados históricos durante renovação)
            // Bug v2.16: Filtrava só temporadaNum, perdendo histórico 2025 ao visualizar 2026
            FluxoFinanceiroCampos.find({
                ligaId: ligaIdStr,
                timeId: { $in: timeIds.map(String) },
                temporada: { $in: [temporadaNum, temporadaNum - 1] }
            }).lean(),

            // 3. Todos os acertos da liga na temporada
            // ✅ v2.3 FIX: Usar Number para temporada (schema define temporada: Number)
            // ✅ v2.11 FIX: Buscar temporada atual OU anterior (para transição de temporada)
            AcertoFinanceiro.find({
                ligaId: String(ligaId),
                temporada: { $in: [temporadaNum, temporadaNum - 1] },
                ativo: true
            }).lean()
        ]);

        // Criar mapas para acesso O(1)
        // ✅ v2.17 FIX: Priorizar temporada SOLICITADA sobre anterior
        // Bug anterior: sort crescente + forEach sobrescrevia com temporada maior (ex: 2026)
        // Correção: primeiro adiciona temporadas anteriores, depois a solicitada (que sobrescreve)
        const extratoMap = new Map();
        // Ordenar: temporadas menores primeiro, temporada solicitada por último (para sobrescrever)
        const extratosOrdenados = [...todosExtratos].sort((a, b) => {
            // Prioridade: temporada solicitada = maior prioridade (vem por último para sobrescrever)
            const aIsSolicitada = a.temporada === temporadaNum;
            const bIsSolicitada = b.temporada === temporadaNum;
            if (aIsSolicitada && !bIsSolicitada) return 1;  // a vem depois
            if (!aIsSolicitada && bIsSolicitada) return -1; // b vem depois
            return (a.temporada || 0) - (b.temporada || 0); // ordem crescente para o resto
        });
        extratosOrdenados.forEach(e => extratoMap.set(String(e.time_id), e));
        console.log(`[TESOURARIA] Extratos carregados: ${todosExtratos.length} (temporadas: ${[...new Set(todosExtratos.map(e => e.temporada))].join(', ')}) | Prioridade: ${temporadaNum}`);

        // ✅ v2.25 FIX: Priorizar temporada SOLICITADA (não a anterior)
        // Bug v2.18: Priorizava temporada anterior, sobrescrevendo dados de 2026 com 2025
        // Correção: Para visualizar 2026, campos de 2026 têm prioridade (ex: "Saldo 2025")
        //           Para visualizar 2025, campos de 2025 têm prioridade
        const camposMap = new Map();
        const camposOrdenados = [...todosCampos].sort((a, b) => {
            // Temporada SOLICITADA tem prioridade (vem por último para sobrescrever)
            const aIsSolicitada = a.temporada === temporadaNum;
            const bIsSolicitada = b.temporada === temporadaNum;
            if (aIsSolicitada && !bIsSolicitada) return 1;  // a vem depois
            if (!aIsSolicitada && bIsSolicitada) return -1; // b vem depois
            return (a.temporada || 0) - (b.temporada || 0);
        });
        camposOrdenados.forEach(c => camposMap.set(String(c.timeId), c));
        console.log(`[TESOURARIA] Campos carregados: ${todosCampos.length} (temporadas: ${[...new Set(todosCampos.map(c => c.temporada))].join(', ')}) | Prioridade: ${temporadaNum}`);

        // Agrupar acertos por timeId
        const acertosMap = new Map();
        todosAcertos.forEach(a => {
            const key = String(a.timeId);
            if (!acertosMap.has(key)) acertosMap.set(key, []);
            acertosMap.get(key).push(a);
        });

        console.log(`[TESOURARIA] Bulk queries: ${todosExtratos.length} extratos, ${todosCampos.length} campos, ${todosAcertos.length} acertos`);

        // ✅ v2.1: Extrair módulos ativos da liga para enviar ao frontend
        // OPCIONAIS usam === true (não habilitados por default)
        const modulosAtivos = {
            banco: liga.modulos_ativos?.banco !== false,
            pontosCorridos: liga.modulos_ativos?.pontosCorridos === true || liga.configuracoes?.pontos_corridos?.habilitado === true,
            mataMata: liga.modulos_ativos?.mataMata === true || liga.configuracoes?.mata_mata?.habilitado === true,
            top10: liga.modulos_ativos?.top10 === true || liga.configuracoes?.top10?.habilitado === true,
            melhorMes: liga.modulos_ativos?.melhorMes === true || liga.configuracoes?.melhor_mes?.habilitado === true,
            artilheiro: liga.modulos_ativos?.artilheiro === true || liga.configuracoes?.artilheiro?.habilitado === true,
            luvaOuro: liga.modulos_ativos?.luvaOuro === true || liga.configuracoes?.luva_ouro?.habilitado === true,
        };

        // Processar participantes em memória (sem queries adicionais)
        const participantes = [];
        let totalCredores = 0;
        let totalDevedores = 0;
        let quantidadeCredores = 0;
        let quantidadeDevedores = 0;
        let quantidadeQuitados = 0;

        // ✅ v2.19: Usar participantesFiltrados (renovados/novos para 2026+)
        for (const participante of participantesFiltrados) {
            const timeId = String(participante.time_id);

            // Calcular saldo do extrato
            const extrato = extratoMap.get(timeId);
            const historico = extrato?.historico_transacoes || [];

            // ✅ v2.22 FIX: Detectar caches com apenas transações especiais (INSCRICAO, LEGADO)
            // Esses caches têm rodada: 0 ou campo tipo, que são ignorados por transformarTransacoesEmRodadas
            const apenasTransacoesEspeciais = historico.length > 0 &&
                historico.every(t => t.rodada === 0 || t.tipo);

            // Campos manuais
            const camposDoc = camposMap.get(timeId);
            const camposAtivos = camposDoc?.campos?.filter(c => c.valor !== 0) || [];

            let saldoConsolidado = 0;
            let saldoCampos = 0;
            let resumoCalculado = { bonus: 0, onus: 0, pontosCorridos: 0, mataMata: 0, top10: 0 };

            if (apenasTransacoesEspeciais) {
                // ✅ v2.22: Para pré-temporada (só inscrição/legado), usar saldo_consolidado direto
                saldoConsolidado = extrato?.saldo_consolidado || 0;
                console.log(`[TESOURARIA] Participante ${timeId}: usando saldo_consolidado direto = ${saldoConsolidado}`);
            } else {
                // ✅ v2.1 FIX: RECALCULAR usando mesmas funções do extrato individual
                const rodadasProcessadas = transformarTransacoesEmRodadas(historico, ligaId);
                resumoCalculado = calcularResumoDeRodadas(rodadasProcessadas, camposAtivos);
                saldoConsolidado = resumoCalculado.saldo;
                saldoCampos = resumoCalculado.camposManuais || 0;
            }

            // ✅ v2.0: Calcular breakdown por módulo (baseado no resumo calculado)
            // ✅ v2.9: Adicionado 'acertos' ao breakdown
            const breakdown = {
                banco: resumoCalculado.bonus + resumoCalculado.onus,
                pontosCorridos: resumoCalculado.pontosCorridos,
                mataMata: resumoCalculado.mataMata,
                top10: resumoCalculado.top10,
                melhorMes: 0,
                artilheiro: 0,
                luvaOuro: 0,
                acertos: 0, // Será preenchido abaixo
            };

            // Calcular campos especiais do histórico legado se houver
            historico.forEach(t => {
                if (t.tipo === 'MELHOR_MES') breakdown.melhorMes += t.valor || 0;
                else if (t.tipo === 'ARTILHEIRO') breakdown.artilheiro += t.valor || 0;
                else if (t.tipo === 'LUVA_OURO') breakdown.luvaOuro += t.valor || 0;
            });

            // Calcular saldo dos acertos
            // ✅ v2.23 FIX: Filtrar acertos pela temporada EXATA sendo visualizada
            // A query busca temporadas current e anterior, mas o cálculo deve usar apenas a atual
            const acertosList = acertosMap.get(timeId) || [];
            const acertosTemporada = acertosList.filter(a => Number(a.temporada) === temporadaNum);
            let totalPago = 0;
            let totalRecebido = 0;
            acertosTemporada.forEach(a => {
                if (a.tipo === 'pagamento') totalPago += a.valor || 0;
                else if (a.tipo === 'recebimento') totalRecebido += a.valor || 0;
            });
            // ✅ v1.1.0 FIX: Usar mesma fórmula do Model (totalPago - totalRecebido)
            // PAGAMENTO = participante pagou à liga → AUMENTA saldo (quita dívida)
            // RECEBIMENTO = participante recebeu da liga → DIMINUI saldo (usa crédito)
            const saldoAcertos = totalPago - totalRecebido;

            // ✅ v2.9: Adicionar acertos ao breakdown
            breakdown.acertos = saldoAcertos;

            // ✅ v2.1 FIX: Saldo da temporada já inclui campos (calcularResumoDeRodadas soma tudo)
            const saldoTemporada = saldoConsolidado;
            const saldoFinal = saldoTemporada + saldoAcertos;

            // Classificar situação
            // ✅ v2.10 FIX: Corrigir contagem - quitados NÃO deve incluir credores
            let situacao = "quitado";
            if (saldoFinal < -0.01) {
                // Devedor: saldo negativo (deve à liga)
                situacao = "devedor";
                totalDevedores += Math.abs(saldoFinal);
                quantidadeDevedores++;
            } else if (saldoFinal > 0.01) {
                // Credor: saldo positivo (liga deve a ele)
                situacao = "credor";
                totalCredores += saldoFinal;
                quantidadeCredores++;
            } else {
                // Quitado: saldo entre -0.01 e 0.01 (zerado)
                quantidadeQuitados++;
            }

            participantes.push({
                // ✅ v2.5 FIX: Incluir ligaId e ligaNome para consistência com /participantes
                ligaId,
                ligaNome: liga.nome || "Liga sem nome",
                timeId,
                nomeTime: participante.nome_time || "Time sem nome",
                nomeCartola: participante.nome_cartola || "",
                escudo: participante.escudo_url || participante.escudo || null,
                ativo: participante.ativo !== false,
                temporada: Number(temporada),
                // ✅ v2.12: Contato para botão WhatsApp
                contato: participante.contato || null,
                clube_id: participante.clube_id || participante.time_coracao || null,
                saldoTemporada: parseFloat(saldoTemporada.toFixed(2)),
                saldoAcertos: parseFloat(saldoAcertos.toFixed(2)),
                totalPago: parseFloat(totalPago.toFixed(2)),
                totalRecebido: parseFloat(totalRecebido.toFixed(2)),
                saldoFinal: parseFloat(saldoFinal.toFixed(2)),
                situacao,
                quantidadeAcertos: acertosTemporada.length,
                // ✅ v2.0: Breakdown por módulo financeiro
                // ✅ v2.9: Adicionado 'acertos' ao breakdown
                breakdown: {
                    banco: parseFloat(breakdown.banco.toFixed(2)),
                    pontosCorridos: parseFloat(breakdown.pontosCorridos.toFixed(2)),
                    mataMata: parseFloat(breakdown.mataMata.toFixed(2)),
                    top10: parseFloat(breakdown.top10.toFixed(2)),
                    melhorMes: parseFloat(breakdown.melhorMes.toFixed(2)),
                    artilheiro: parseFloat(breakdown.artilheiro.toFixed(2)),
                    luvaOuro: parseFloat(breakdown.luvaOuro.toFixed(2)),
                    campos: parseFloat(saldoCampos.toFixed(2)),
                    acertos: parseFloat(breakdown.acertos.toFixed(2)),
                },
                // ✅ v2.5 FIX: Incluir modulosAtivos para renderizar badges
                modulosAtivos,
                // ✅ v2.13: Dados de quitação para exibir badge QUITADO
                quitacao: extrato?.quitacao || null,
            });
        }

        // Ordenar por nome
        participantes.sort((a, b) => (a.nomeCartola || '').localeCompare(b.nomeCartola || ''));

        const elapsed = Date.now() - startTime;
        console.log(`[TESOURARIA] ✅ ${participantes.length} participantes em ${elapsed}ms`);

        // 🐛 DEBUG: Log dos totais calculados
        console.log(`[TESOURARIA-API] 📊 TOTAIS para liga ${ligaId}:`);
        console.log(`  Total participantes: ${participantes.length}`);
        console.log(`  Devedores: ${quantidadeDevedores}`);
        console.log(`  Credores: ${quantidadeCredores}`);
        console.log(`  Quitados: ${quantidadeQuitados}`);
        console.log(`  Validação: ${quantidadeDevedores + quantidadeCredores + quantidadeQuitados} = ${participantes.length}`);

        res.json({
            success: true,
            ligaId,
            ligaNome: liga.nome,
            temporada,
            // ✅ v2.0: Incluir módulos ativos para renderização condicional no frontend
            modulosAtivos,
            participantes,
            totais: {
                totalParticipantes: participantes.length,
                quantidadeCredores,
                quantidadeDevedores,
                quantidadeQuitados,
                totalAReceber: parseFloat(totalDevedores.toFixed(2)),
                totalAPagar: parseFloat(totalCredores.toFixed(2)),
                saldoGeral: parseFloat((totalDevedores - totalCredores).toFixed(2)),
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao buscar participantes da liga:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// GET /api/tesouraria/participante/:ligaId/:timeId
// Retorna detalhes completos de um participante (incluindo histórico de acertos)
// =============================================================================

router.get("/participante/:ligaId/:timeId", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { temporada = CURRENT_SEASON } = req.query;
        const tempNum = Number(temporada);

        console.log(`[TESOURARIA] Buscando detalhes: liga=${ligaId} time=${timeId} temporada=${tempNum}`);

        // Buscar liga
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ success: false, error: "Liga não encontrada" });
        }

        // Buscar participante
        const participante = liga.participantes?.find(
            p => String(p.time_id) === String(timeId)
        );
        if (!participante) {
            return res.status(404).json({ success: false, error: "Participante não encontrado" });
        }

        // ✅ v2.14: Buscar cache, histórico de acertos, quitação e inscrição em paralelo
        // ✅ v2.15: Adicionar busca de ajustes dinâmicos (2026+)
        const [saldo, acertos, cache, inscricao, inscricaoProxima, ajustes] = await Promise.all([
            // Calcular saldo completo
            calcularSaldoCompleto(ligaId, timeId, tempNum),
            // Buscar histórico de acertos
            AcertoFinanceiro.buscarPorTime(ligaId, timeId, tempNum),
            // Buscar cache (para quitação)
            ExtratoFinanceiroCache.findOne({
                liga_id: String(ligaId),
                time_id: Number(timeId),
                temporada: tempNum
            }).lean(),
            // Buscar inscrição da temporada (para legado_manual)
            InscricaoTemporada.findOne({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                time_id: Number(timeId),
                temporada: tempNum
            }).lean(),
            // Buscar inscrição da próxima temporada (para mostrar status de renovação)
            InscricaoTemporada.findOne({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                time_id: Number(timeId),
                temporada: tempNum + 1
            }).lean(),
            // ✅ v2.15: Buscar ajustes dinâmicos (para 2026+)
            tempNum >= 2026
                ? AjusteFinanceiro.listarPorParticipante(ligaId, timeId, tempNum)
                : Promise.resolve([])
        ]);

        // Classificar situação
        let situacao = "quitado";
        if (saldo.saldoFinal > 0.01) situacao = "credor";
        else if (saldo.saldoFinal < -0.01) situacao = "devedor";

        // ✅ v2.14: Preparar resumo de valores por módulo
        const resumo = {
            bonus: 0,
            onus: 0,
            pontosCorridos: 0,
            mataMata: 0,
            top10: 0,
            camposManuais: saldo.saldoCampos || 0,
            saldo_final: saldo.saldoFinal
        };

        // Se tiver cache com historico_transacoes, calcular resumo
        // ✅ FIX: Usar campos camelCase do banco
        // ✅ FIX v2.15: Incluir transações especiais (INSCRICAO_TEMPORADA)
        if (cache?.historico_transacoes?.length > 0) {
            cache.historico_transacoes.forEach(t => {
                // ✅ Transação especial (inscrição, legado, etc.)
                if (t.tipo) {
                    if (t.tipo === 'INSCRICAO_TEMPORADA') {
                        resumo.inscricao = t.valor || 0;
                    } else if (t.tipo === 'SALDO_TEMPORADA_ANTERIOR' || t.tipo === 'LEGADO_ANTERIOR') {
                        resumo.legado = t.valor || 0;
                    }
                    return; // Não processar como rodada normal
                }

                // Campos novos (camelCase)
                const bonusOnus = t.bonusOnus || 0;
                if (bonusOnus > 0) resumo.bonus += bonusOnus;
                if (bonusOnus < 0) resumo.onus += bonusOnus;

                // Fallback para campos antigos (snake_case) + novos
                resumo.pontosCorridos += t.pontosCorridos ?? t.pontos_corridos ?? 0;
                resumo.mataMata += t.mataMata ?? t.mata_mata ?? 0;
                resumo.top10 += t.top10 ?? ((t.top10_mito || 0) + (t.top10_mico || 0));
            });

            // ✅ v2.15: Atualizar saldo_final se houver transações especiais
            if (resumo.inscricao !== undefined || resumo.legado !== undefined) {
                const saldoTransacoesEspeciais = (resumo.inscricao || 0) + (resumo.legado || 0);
                resumo.saldo_final = saldo.saldoFinal || saldoTransacoesEspeciais;
            }
        }

        // ✅ v2.14: Preparar histórico de rodadas para exibição
        // ✅ FIX: Campos são camelCase no banco (bonusOnus, pontosCorridos, mataMata)
        // ✅ FIX v2.15: Suportar transações especiais (INSCRICAO_TEMPORADA, SALDO_ANTERIOR)
        const historico = cache?.historico_transacoes?.map(t => {
            // Transação especial (inscrição, legado, etc.)
            if (t.tipo) {
                return {
                    rodada: t.rodada || 0,
                    tipo: t.tipo,
                    descricao: t.descricao || t.tipo,
                    valor: t.valor || 0,
                    saldo: t.valor || 0,
                    saldoAcumulado: t.valor || 0,
                    data: t.data,
                    isTransacaoEspecial: true
                };
            }
            // Transação normal de rodada
            return {
                rodada: t.rodada,
                posicao: t.posicao || t.colocacao,
                bonusOnus: t.bonusOnus ?? ((t.bonus || 0) + (t.onus || 0)),
                pontosCorridos: t.pontosCorridos ?? t.pontos_corridos,
                mataMata: t.mataMata ?? t.mata_mata,
                top10: t.top10 || 0,
                saldo: t.saldo || 0,
                saldoAcumulado: t.saldoAcumulado ?? t.saldo_acumulado,
                isMito: t.isMito || false,
                isMico: t.isMico || false,
                top10Status: t.top10Status,
                top10Posicao: t.top10Posicao
            };
        }) || [];

        // ✅ v2.15: Se não tem histórico de rodadas, mas tem saldo_consolidado no cache (ex: só inscrição)
        // usar saldo_consolidado como base
        if (cache?.saldo_consolidado && historico.length > 0) {
            // Atualizar resumo com base no cache
            const temTransacaoEspecial = historico.some(h => h.isTransacaoEspecial);
            if (temTransacaoEspecial) {
                // Somar valores das transações especiais no resumo
                historico.filter(h => h.isTransacaoEspecial).forEach(h => {
                    if (h.tipo === 'INSCRICAO_TEMPORADA') {
                        resumo.inscricao = h.valor;
                    } else if (h.tipo === 'SALDO_TEMPORADA_ANTERIOR' || h.tipo === 'LEGADO_ANTERIOR') {
                        resumo.legado = h.valor;
                    }
                });
            }
        }

        res.json({
            success: true,
            participante: {
                ligaId,
                ligaNome: liga.nome,
                timeId: String(timeId),
                nomeTime: participante.nome_time,
                nomeCartola: participante.nome_cartola,
                escudo: participante.escudo_url || participante.escudo,
                ativo: participante.ativo !== false,
            },
            financeiro: {
                temporada: tempNum,
                saldoConsolidado: saldo.saldoConsolidado,
                saldoCampos: saldo.saldoCampos,
                saldoTemporada: saldo.saldoTemporada,
                saldoAcertos: saldo.saldoAcertos,
                totalPago: saldo.totalPago,
                totalRecebido: saldo.totalRecebido,
                saldoFinal: saldo.saldoFinal,
                situacao,
            },
            // ✅ v2.14: Resumo por módulo
            resumo,
            // ✅ v2.14: Histórico de rodadas (ambos campos para compatibilidade)
            historico,
            rodadas: historico,  // ✅ FIX: Alias para compatibilidade com frontend
            acertos: acertos.map(a => ({
                _id: a._id,
                tipo: a.tipo,
                valor: a.valor,
                descricao: a.descricao,
                metodoPagamento: a.metodoPagamento,
                dataAcerto: a.dataAcerto,
                observacoes: a.observacoes,
                registradoPor: a.registradoPor,
                createdAt: a.createdAt,
            })),
            // ✅ v2.14: Dados de quitação (se existir)
            quitacao: cache?.quitacao || null,
            // ✅ v2.14: Legado manual (se existir)
            legado_manual: inscricao?.legado_manual || null,
            // ✅ v2.14: Inscrição da próxima temporada (para ver status de renovação)
            inscricao_proxima: inscricaoProxima ? {
                temporada: inscricaoProxima.temporada,
                status: inscricaoProxima.status,
                processado: inscricaoProxima.processado,
                pagou_inscricao: inscricaoProxima.pagou_inscricao,
                taxa_inscricao: inscricaoProxima.taxa_inscricao || 0,  // ✅ FIX: Incluir valor da taxa
                legado_manual: inscricaoProxima.legado_manual
            } : null,
            // ✅ v2.15: Ajustes dinâmicos (2026+)
            ajustes: tempNum >= 2026 ? ajustes : [],
            ajustes_total: saldo.saldoAjustes || 0
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao buscar detalhes:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// POST /api/tesouraria/acerto
// Registra um novo acerto financeiro (mesma lógica do extrato)
// =============================================================================

router.post("/acerto", verificarAdmin, async (req, res) => {
    try {
        const {
            ligaId,
            timeId,
            nomeTime,
            tipo,
            valor,
            descricao,
            metodoPagamento = "pix",
            observacoes,
            dataAcerto,
            temporada = String(CURRENT_SEASON),
            registradoPor = "admin_tesouraria",
        } = req.body;

        // Validações
        if (!ligaId || !timeId) {
            return res.status(400).json({
                success: false,
                error: "ligaId e timeId são obrigatórios",
            });
        }

        if (!tipo || !["pagamento", "recebimento"].includes(tipo)) {
            return res.status(400).json({
                success: false,
                error: "Tipo inválido. Use 'pagamento' ou 'recebimento'",
            });
        }

        if (!valor || isNaN(valor) || parseFloat(valor) <= 0) {
            return res.status(400).json({
                success: false,
                error: "Valor deve ser um número positivo",
            });
        }

        const valorNumerico = parseFloat(valor);
        const dataAcertoFinal = dataAcerto ? new Date(dataAcerto) : new Date();

        // Buscar nome do time se não fornecido
        let nomeTimeFinal = nomeTime;
        if (!nomeTimeFinal) {
            const liga = await Liga.findById(ligaId).lean();
            const participante = liga?.participantes?.find(
                p => String(p.time_id) === String(timeId)
            );
            nomeTimeFinal = participante?.nome_time || `Time ${timeId}`;
        }

        // =========================================================================
        // VERIFICAR TROCO EM PAGAMENTOS (mesma lógica do acertos-financeiros-routes)
        // =========================================================================
        let acertoTroco = null;
        let valorTroco = 0;

        if (tipo === "pagamento") {
            const saldoAntes = await calcularSaldoCompleto(ligaId, timeId, temporada);
            const dividaAtual = saldoAntes.saldoFinal < 0 ? Math.abs(saldoAntes.saldoFinal) : 0;

            console.log(`[TESOURARIA] Verificando troco para ${nomeTimeFinal}:`);
            console.log(`  - Saldo antes: R$ ${saldoAntes.saldoFinal.toFixed(2)}`);
            console.log(`  - Dívida atual: R$ ${dividaAtual.toFixed(2)}`);
            console.log(`  - Pagamento: R$ ${valorNumerico.toFixed(2)}`);

            if (dividaAtual > 0 && valorNumerico > dividaAtual) {
                valorTroco = parseFloat((valorNumerico - dividaAtual).toFixed(2));

                console.log(`[TESOURARIA] ✅ TROCO DETECTADO: R$ ${valorTroco.toFixed(2)}`);

                acertoTroco = new AcertoFinanceiro({
                    ligaId: String(ligaId),
                    timeId: String(timeId),
                    nomeTime: nomeTimeFinal,
                    temporada,
                    tipo: "recebimento",
                    valor: valorTroco,
                    descricao: `TROCO - Pagamento a maior (Dívida: R$ ${dividaAtual.toFixed(2)})`,
                    metodoPagamento,
                    comprovante: null,
                    observacoes: `Gerado automaticamente via Tesouraria. Pagamento original: R$ ${valorNumerico.toFixed(2)}`,
                    dataAcerto: dataAcertoFinal,
                    registradoPor: "sistema_troco_tesouraria",
                });
            }
        }

        // Criar o acerto principal
        const novoAcerto = new AcertoFinanceiro({
            ligaId: String(ligaId),
            timeId: String(timeId),
            nomeTime: nomeTimeFinal,
            temporada,
            tipo,
            valor: valorNumerico,
            descricao: descricao || `Acerto via Tesouraria - ${tipo}`,
            metodoPagamento,
            comprovante: null,
            observacoes: observacoes || null,
            dataAcerto: dataAcertoFinal,
            registradoPor,
        });

        await novoAcerto.save();

        // Salvar troco se existir
        if (acertoTroco) {
            await acertoTroco.save();
            console.log(`[TESOURARIA] ✅ Troco de R$ ${valorTroco.toFixed(2)} salvo`);
        }

        // =========================================================================
        // ✅ v2.5 FIX CRITICO: NÃO DELETAR CACHE DO EXTRATO
        //
        // BUG ANTERIOR (v2.4): deleteOne() zerava todos os dados históricos
        // (rodadas, Timeline, P.Corridos, MataMata, Top10, etc.)
        //
        // Acertos são armazenados em coleção SEPARADA (AcertoFinanceiro) e
        // são integrados no momento da consulta em getExtratoFinanceiro().
        // O cache deve ser PRESERVADO - apenas o saldo final muda.
        //
        // Ref: acertos-financeiros-routes.js v1.4.0 (mesma lógica)
        // =========================================================================
        console.log(`[TESOURARIA] ✅ Acerto registrado para time ${timeId} (cache preservado)`)

        // Calcular novo saldo
        const novoSaldo = await calcularSaldoCompleto(ligaId, timeId, temporada);

        // =====================================================================
        // ✅ v2.2: Campos manuais NÃO são zerados (mantém histórico completo)
        // O status (Quitado/Devedor/Credor) é calculado pelo saldo final
        // que considera: temporada + campos + acertos
        // =====================================================================

        // =====================================================================
        // ✅ v2.20: AUTO-QUITAÇÃO para temporadas anteriores
        // Se saldo zerou após o acerto, marcar automaticamente como quitado
        // =====================================================================
        const temporadaNum = Number(temporada);
        let autoQuitacaoInfo = null;

        if (Math.abs(novoSaldo.saldoFinal) < 0.01 && temporadaNum < CURRENT_SEASON) {
            try {
                await ExtratoFinanceiroCache.updateOne(
                    {
                        liga_id: String(ligaId),
                        time_id: Number(timeId),
                        temporada: temporadaNum
                    },
                    {
                        $set: {
                            'quitacao.quitado': true,
                            'quitacao.data_quitacao': new Date(),
                            'quitacao.admin_responsavel': 'auto_quitacao',
                            'quitacao.tipo': 'zerado',
                            'quitacao.saldo_no_momento': 0,
                            'quitacao.observacao': 'Quitação automática - saldo zerado via acerto'
                        }
                    }
                );
                console.log(`[TESOURARIA] ✅ AUTO-QUITAÇÃO: ${nomeTimeFinal} - Temporada ${temporadaNum} marcada como quitada`);

                autoQuitacaoInfo = {
                    ativada: true,
                    temporada: temporadaNum,
                    mensagem: `Temporada ${temporadaNum} marcada como QUITADA automaticamente!`
                };
            } catch (quitError) {
                console.warn(`[TESOURARIA] ⚠️ Falha na auto-quitação:`, quitError.message);
            }
        }

        // Resposta
        const response = {
            success: true,
            message: acertoTroco
                ? `Pagamento de R$ ${valorNumerico.toFixed(2)} registrado. TROCO de R$ ${valorTroco.toFixed(2)} creditado!`
                : `Acerto de R$ ${valorNumerico.toFixed(2)} registrado com sucesso`,
            acerto: {
                _id: novoAcerto._id,
                tipo: novoAcerto.tipo,
                valor: novoAcerto.valor,
                descricao: novoAcerto.descricao,
                dataAcerto: novoAcerto.dataAcerto,
            },
            novoSaldo: {
                saldoTemporada: novoSaldo.saldoTemporada,
                saldoAcertos: novoSaldo.saldoAcertos,
                saldoFinal: novoSaldo.saldoFinal,
            },
        };

        if (acertoTroco) {
            response.troco = {
                valor: valorTroco,
                mensagem: `Pagamento excedeu a dívida. R$ ${valorTroco.toFixed(2)} creditados.`,
            };
        }

        // ✅ v2.20: Incluir info de auto-quitação na resposta
        if (autoQuitacaoInfo) {
            response.autoQuitacao = autoQuitacaoInfo;
        }

        res.status(201).json(response);
    } catch (error) {
        console.error("[TESOURARIA] Erro ao registrar acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// DELETE /api/tesouraria/acerto/:id
// Remove um acerto financeiro (soft delete)
// =============================================================================

router.delete("/acerto/:id", verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { hardDelete = false } = req.query;

        const acerto = await AcertoFinanceiro.findById(id);

        if (!acerto) {
            return res.status(404).json({
                success: false,
                error: "Acerto não encontrado",
            });
        }

        if (hardDelete === "true") {
            await AcertoFinanceiro.findByIdAndDelete(id);
        } else {
            acerto.ativo = false;
            await acerto.save();
        }

        // ✅ v2.5 FIX CRITICO: NÃO DELETAR CACHE DO EXTRATO
        // Acertos são armazenados em coleção separada e integrados na consulta
        // Ref: acertos-financeiros-routes.js v1.4.0
        console.log(`[TESOURARIA] ✅ Acerto removido para time ${acerto.timeId} (cache preservado)`)

        // Calcular novo saldo
        const novoSaldo = await calcularSaldoCompleto(
            acerto.ligaId,
            acerto.timeId,
            acerto.temporada
        );

        res.json({
            success: true,
            message: hardDelete === "true" ? "Acerto removido permanentemente" : "Acerto desativado",
            novoSaldo: {
                saldoTemporada: novoSaldo.saldoTemporada,
                saldoAcertos: novoSaldo.saldoAcertos,
                saldoFinal: novoSaldo.saldoFinal,
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao remover acerto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// GET /api/tesouraria/resumo
// Retorna resumo financeiro geral (totais por liga)
// =============================================================================

router.get("/resumo", verificarAdmin, async (req, res) => {
    try {
        const { temporada = CURRENT_SEASON } = req.query;

        const ligas = await Liga.find({ ativo: { $ne: false } }).lean();

        const resumoPorLiga = [];
        let totalGeralCredores = 0;
        let totalGeralDevedores = 0;

        for (const liga of ligas) {
            const ligaId = liga._id.toString();
            let credores = 0;
            let devedores = 0;
            let qtdCredores = 0;
            let qtdDevedores = 0;
            let qtdQuitados = 0;

            for (const participante of liga.participantes || []) {
                const saldo = await calcularSaldoCompleto(ligaId, participante.time_id, temporada);

                if (saldo.saldoFinal < -0.01) {
                    // Devedor: saldo negativo (deve à liga)
                    devedores += Math.abs(saldo.saldoFinal);
                    qtdDevedores++;
                } else {
                    // ✅ FIX: Quitados = saldo >= -0.01 (zerados + credores = sem dívidas)
                    qtdQuitados++;
                    if (saldo.saldoFinal > 0.01) {
                        credores += saldo.saldoFinal;
                        qtdCredores++;
                    }
                }
            }

            totalGeralCredores += credores;
            totalGeralDevedores += devedores;

            resumoPorLiga.push({
                ligaId,
                ligaNome: liga.nome,
                totalParticipantes: liga.participantes?.length || 0,
                qtdCredores,
                qtdDevedores,
                qtdQuitados,
                totalAReceber: parseFloat(credores.toFixed(2)),
                totalAPagar: parseFloat(devedores.toFixed(2)),
                saldoLiga: parseFloat((credores - devedores).toFixed(2)),
            });
        }

        res.json({
            success: true,
            temporada,
            ligas: resumoPorLiga,
            totaisGerais: {
                totalAReceber: parseFloat(totalGeralCredores.toFixed(2)),
                totalAPagar: parseFloat(totalGeralDevedores.toFixed(2)),
                saldoGeral: parseFloat((totalGeralCredores - totalGeralDevedores).toFixed(2)),
            },
        });
    } catch (error) {
        console.error("[TESOURARIA] Erro ao gerar resumo:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

console.log("[TESOURARIA] ✅ v2.24 Rotas carregadas (FIX CRÍTICO: cache preservado ao registrar acertos)");

export default router;
