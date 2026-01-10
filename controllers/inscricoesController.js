/**
 * Controller: Inscrições Temporada
 *
 * Lógica de negócio para renovação e inscrição de participantes.
 * Gerencia transferência de saldos entre temporadas.
 *
 * @version 1.2.0 (Fix: liga_id como ObjectId para compatibilidade com schema Mongoose)
 * @since 2026-01-04
 */

import mongoose from "mongoose";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
import LigaRules from "../models/LigaRules.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import { CURRENT_SEASON } from "../config/seasons.js";

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Busca saldo final de um participante na temporada anterior
 * @param {string} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada a buscar
 * @returns {Promise<Object>} { saldoExtrato, saldoAcertos, saldoFinal, status }
 */
export async function buscarSaldoTemporada(ligaId, timeId, temporada) {
    const db = mongoose.connection.db;

    // Buscar extrato
    const extrato = await db.collection('extratofinanceirocaches').findOne({
        $or: [
            { liga_id: String(ligaId) },
            { liga_id: new mongoose.Types.ObjectId(ligaId) }
        ],
        time_id: Number(timeId),
        temporada: Number(temporada)
    });

    // Buscar acertos
    const acertos = await db.collection('acertofinanceiros').find({
        ligaId: String(ligaId),
        timeId: String(timeId),
        temporada: Number(temporada),
        ativo: true
    }).toArray();

    // ✅ v1.2: Buscar campos manuais
    const camposManuais = await db.collection('fluxofinanceirocampos').findOne({
        ligaId: String(ligaId),
        timeId: String(timeId),
        temporada: Number(temporada)
    });

    let totalCamposManuais = 0;
    if (camposManuais?.campos) {
        camposManuais.campos.forEach(c => {
            totalCamposManuais += parseFloat(c.valor) || 0;
        });
    }

    // Calcular saldo de acertos
    let saldoAcertos = 0;
    acertos.forEach(a => {
        if (a.tipo === 'pagamento') saldoAcertos += a.valor || 0;
        else if (a.tipo === 'recebimento') saldoAcertos -= a.valor || 0;
    });

    const saldoExtrato = extrato?.saldo_consolidado || 0;
    const saldoFinal = saldoExtrato + saldoAcertos + totalCamposManuais;

    // Determinar status
    let status = 'quitado';
    if (saldoFinal > 0.01) status = 'credor';
    else if (saldoFinal < -0.01) status = 'devedor';

    return {
        saldoExtrato,
        saldoAcertos,
        camposManuais: totalCamposManuais,
        saldoFinal,
        status
    };
}

/**
 * Cria transações iniciais no extrato da nova temporada
 * @param {string} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Nova temporada
 * @param {Object} valores - { taxa, saldoTransferido, dividaAnterior, pagouInscricao }
 * @returns {Promise<Array>} Transações criadas
 */
export async function criarTransacoesIniciais(ligaId, timeId, temporada, valores) {
    const db = mongoose.connection.db;
    const transacoes = [];
    const agora = new Date();

    // 1. Transação de Taxa de Inscrição
    // IMPORTANTE: Se pagouInscricao = true, NÃO cria débito (apenas registro na InscricaoTemporada)
    // Se pagouInscricao = false, cria débito no extrato (participante deve a taxa)
    if (valores.taxa > 0 && valores.pagouInscricao === false) {
        // ✅ v1.2: Usar ObjectId para liga_id (compatível com schema Mongoose)
        const ligaObjId = new mongoose.Types.ObjectId(ligaId);

        // ✅ v1.1: Verificar se já existe transação de inscrição (evitar duplicação)
        const extratoExistente = await db.collection('extratofinanceirocaches').findOne({
            liga_id: ligaObjId,
            time_id: Number(timeId),
            temporada: Number(temporada),
            'historico_transacoes.tipo': 'INSCRICAO_TEMPORADA'
        });

        if (extratoExistente) {
            console.log(`[INSCRICOES] ⚠️ Transação INSCRICAO_TEMPORADA já existe para time ${timeId} em ${temporada}. Pulando...`);
        } else {
            const txInscricao = {
                liga_id: ligaObjId,
                time_id: Number(timeId),
                temporada: Number(temporada),
                rodada: 0, // Rodada 0 = pré-temporada
                tipo: 'INSCRICAO_TEMPORADA',
                descricao: `Taxa de inscrição temporada ${temporada} (pendente)`,
                valor: -valores.taxa, // Negativo = débito
                data: agora,
                criado_em: agora,
                origem: 'sistema_renovacao'
            };

            // Inserir no histórico do cache de extrato
            await db.collection('extratofinanceirocaches').updateOne(
                {
                    liga_id: ligaObjId,
                    time_id: Number(timeId),
                    temporada: Number(temporada)
                },
                {
                    $push: {
                        historico_transacoes: {
                            rodada: 0,
                            tipo: 'INSCRICAO_TEMPORADA',
                            valor: -valores.taxa,
                            descricao: txInscricao.descricao,
                            data: agora
                        }
                    },
                    $inc: {
                        saldo_consolidado: -valores.taxa
                    },
                    $setOnInsert: {
                        liga_id: ligaObjId,
                        time_id: Number(timeId),
                        temporada: Number(temporada),
                        criado_em: agora
                    }
                },
                { upsert: true }
            );

            transacoes.push({
                tipo: 'INSCRICAO_TEMPORADA',
                valor: -valores.taxa,
                ref_id: `inscricao_${ligaId}_${timeId}_${temporada}`
            });
        }
    }

    // 2. Transação de Saldo Transferido (pode ser positivo ou negativo)
    if (valores.saldoTransferido !== 0) {
        // ✅ v1.2: Usar ObjectId para liga_id (compatível com schema Mongoose)
        const ligaObjIdSaldo = new mongoose.Types.ObjectId(ligaId);

        // ✅ v1.1: Verificar se já existe transação de saldo anterior (evitar duplicação)
        const extratoComSaldo = await db.collection('extratofinanceirocaches').findOne({
            liga_id: ligaObjIdSaldo,
            time_id: Number(timeId),
            temporada: Number(temporada),
            'historico_transacoes.tipo': 'SALDO_TEMPORADA_ANTERIOR'
        });

        if (extratoComSaldo) {
            console.log(`[INSCRICOES] ⚠️ Transação SALDO_TEMPORADA_ANTERIOR já existe para time ${timeId} em ${temporada}. Pulando...`);
        } else {
            const descricao = valores.saldoTransferido > 0
                ? `Crédito aproveitado da temporada ${temporada - 1}`
                : `Dívida transferida da temporada ${temporada - 1}`;

            await db.collection('extratofinanceirocaches').updateOne(
                {
                    liga_id: ligaObjIdSaldo,
                    time_id: Number(timeId),
                    temporada: Number(temporada)
                },
                {
                    $push: {
                        historico_transacoes: {
                            rodada: 0,
                            tipo: 'SALDO_TEMPORADA_ANTERIOR',
                            valor: valores.saldoTransferido, // Positivo = crédito, Negativo = dívida
                            descricao,
                            data: agora
                        }
                    },
                    $inc: {
                        saldo_consolidado: valores.saldoTransferido
                    }
                }
            );

            transacoes.push({
                tipo: 'SALDO_TEMPORADA_ANTERIOR',
                valor: valores.saldoTransferido,
                ref_id: `saldo_anterior_${ligaId}_${timeId}_${temporada}`
            });
        }
    }

    return transacoes;
}

/**
 * Adiciona participante à liga para a nova temporada
 * @param {string} ligaId - ID da liga
 * @param {Object} dadosParticipante - Dados do participante
 * @param {number} temporada - Nova temporada
 */
export async function adicionarParticipanteNaLiga(ligaId, dadosParticipante, temporada) {
    const liga = await Liga.findById(ligaId);
    if (!liga) throw new Error("Liga não encontrada");

    // Verificar se já existe
    const jaExiste = liga.participantes?.some(
        p => Number(p.time_id) === Number(dadosParticipante.time_id)
    );

    if (!jaExiste) {
        // Adicionar aos participantes
        liga.participantes = liga.participantes || [];
        liga.participantes.push({
            time_id: Number(dadosParticipante.time_id),
            nome_time: dadosParticipante.nome_time,
            nome_cartola: dadosParticipante.nome_cartoleiro || dadosParticipante.nome_cartola,
            escudo_url: dadosParticipante.escudo,
            ativo: true,
            // ✅ v2.12: Campos adicionais para WhatsApp e Time do Coração
            contato: dadosParticipante.contato || "",
            clube_id: dadosParticipante.time_coracao || dadosParticipante.clube_id || null
        });

        // Adicionar ao array de times
        if (!liga.times?.includes(Number(dadosParticipante.time_id))) {
            liga.times = liga.times || [];
            liga.times.push(Number(dadosParticipante.time_id));
        }

        await liga.save();
    }

    // Garantir que Time existe (busca apenas por id, que é único)
    // Se existir: atualiza para nova temporada
    // Se não existir: cria novo
    await Time.findOneAndUpdate(
        {
            id: Number(dadosParticipante.time_id)
        },
        {
            $set: {
                nome_time: dadosParticipante.nome_time,
                nome_cartoleiro: dadosParticipante.nome_cartoleiro || dadosParticipante.nome_cartola,
                nome: dadosParticipante.nome_cartoleiro || dadosParticipante.nome_cartola,
                escudo: dadosParticipante.escudo,
                liga_id: ligaId,
                temporada: Number(temporada),
                ativo: true
            },
            $setOnInsert: {
                id: Number(dadosParticipante.time_id)
            }
        },
        { upsert: true, new: true }
    );
}

// =============================================================================
// CONTROLLER PRINCIPAL
// =============================================================================

/**
 * Processa renovação de um participante
 * @param {string} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Nova temporada
 * @param {Object} opcoes - { aproveitarCredito, pagouInscricao, observacoes, aprovadoPor }
 * @returns {Promise<Object>} Resultado da renovação
 */
export async function processarRenovacao(ligaId, timeId, temporada, opcoes = {}) {
    const temporadaAnterior = temporada - 1;

    // 1. Buscar regras da liga
    const rules = await LigaRules.buscarPorLiga(ligaId, temporada);
    if (!rules) {
        throw new Error("Regras não configuradas para esta temporada");
    }

    if (rules.status !== 'aberto') {
        throw new Error("Período de renovação não está aberto");
    }

    // 2. Verificar prazo
    const agora = new Date();
    if (agora > new Date(rules.inscricao.prazo_renovacao)) {
        throw new Error("Prazo de renovação encerrado");
    }

    // ✅ v1.2: Verificar se já existe inscrição com legado_manual (definido via quitação)
    const inscricaoExistente = await InscricaoTemporada.findOne({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        time_id: Number(timeId),
        temporada: Number(temporada)
    }).lean();

    const temLegadoManual = inscricaoExistente?.legado_manual?.origem != null;
    console.log(`[INSCRICOES] Renovação - legado_manual existente: ${temLegadoManual}`);

    // 3. Buscar saldo da temporada anterior
    const saldo = await buscarSaldoTemporada(ligaId, timeId, temporadaAnterior);

    // 4. Verificar se devedor pode renovar (PULAR se tem legado_manual - já foi quitado)
    if (!temLegadoManual && saldo.status === 'devedor' && !rules.inscricao.permitir_devedor_renovar) {
        throw new Error("Devedores não podem renovar. Quite a dívida primeiro.");
    }

    // 5. Calcular valores
    const taxa = rules.inscricao.taxa || 0;

    // pagouInscricao: default true (presume que pagou, não cria débito)
    // Se false: taxa vira débito no extrato
    const pagouInscricao = opcoes.pagouInscricao !== false;

    let saldoTransferido = 0;
    let dividaAnterior = 0;
    let creditoUsado = 0;

    // ✅ v1.2: Se tem legado_manual, usar valores definidos na quitação
    if (temLegadoManual) {
        const legadoValor = inscricaoExistente.legado_manual.valor_definido || 0;
        if (legadoValor > 0) {
            // Crédito legado
            creditoUsado = legadoValor;
            saldoTransferido = legadoValor;
        } else if (legadoValor < 0) {
            // Dívida legada
            dividaAnterior = Math.abs(legadoValor);
            saldoTransferido = legadoValor;
        }
        // Se legadoValor == 0, foi zerado - não transfere nada
        console.log(`[INSCRICOES] Usando legado_manual: valor=${legadoValor} (tipo: ${inscricaoExistente.legado_manual.tipo_quitacao})`);
    } else {
        // REGRA NORMAL: Crédito só é usado se NÃO pagou a inscrição
        // Se pagou, o crédito fica intacto para uso futuro
        if (saldo.status === 'credor') {
            if (!pagouInscricao && rules.inscricao.aproveitar_saldo_positivo && opcoes.aproveitarCredito !== false) {
                // Aproveitar crédito para abater taxa (máximo = taxa)
                creditoUsado = Math.min(saldo.saldoFinal, taxa);
                saldoTransferido = creditoUsado; // Positivo = crédito transferido
            }
            // Se pagou OU não quer aproveitar: crédito permanece na temporada anterior
        } else if (saldo.status === 'devedor') {
            // Carregar dívida para nova temporada
            dividaAnterior = Math.abs(saldo.saldoFinal);
            saldoTransferido = -dividaAnterior; // Negativo = dívida transferida
        }
    }

    // Taxa só vira dívida se NÃO pagou
    const taxaComoDebito = pagouInscricao ? 0 : taxa;

    // Saldo inicial = taxa (se não pagou) + dívida anterior - crédito usado
    const saldoInicialTemporada = taxaComoDebito + dividaAnterior - creditoUsado;

    // 6. Buscar dados do participante
    const liga = await Liga.findById(ligaId).lean();
    const participante = liga?.participantes?.find(p => Number(p.time_id) === Number(timeId));

    if (!participante) {
        throw new Error("Participante não encontrado na liga");
    }

    // 7. Criar/atualizar inscrição
    // ✅ v1.2: Preservar legado_manual se existir
    const dadosInscricao = {
        liga_id: ligaId,
        time_id: Number(timeId),
        temporada,
        status: 'renovado',
        origem: 'renovacao',
        dados_participante: {
            nome_time: participante.nome_time,
            nome_cartoleiro: participante.nome_cartola || participante.nome_cartoleiro,
            escudo: participante.escudo_url || participante.foto_time,
            id_cartola_oficial: Number(timeId)
        },
        temporada_anterior: temLegadoManual
            ? inscricaoExistente.temporada_anterior  // Preservar dados da quitação
            : {
                temporada: temporadaAnterior,
                saldo_final: saldo.saldoFinal,
                status_quitacao: saldo.status
            },
        saldo_transferido: creditoUsado, // Crédito efetivamente usado (0 se pagou ou devedor)
        taxa_inscricao: taxa,
        divida_anterior: dividaAnterior,
        saldo_inicial_temporada: saldoInicialTemporada,
        pagou_inscricao: pagouInscricao,
        data_decisao: new Date(),
        aprovado_por: opcoes.aprovadoPor || 'admin',
        observacoes: opcoes.observacoes || ''
    };

    // Preservar legado_manual se existir
    if (temLegadoManual) {
        dadosInscricao.legado_manual = inscricaoExistente.legado_manual;
    }

    const inscricao = await InscricaoTemporada.upsert(dadosInscricao);

    // 8. Criar transações iniciais no extrato
    // Nota: só cria débito de taxa se NÃO pagou (pagouInscricao = false)
    const transacoes = await criarTransacoesIniciais(ligaId, timeId, temporada, {
        taxa,
        saldoTransferido,
        dividaAnterior,
        pagouInscricao
    });

    // 9. Marcar como processado
    const inscricaoDoc = await InscricaoTemporada.findById(inscricao._id);
    await inscricaoDoc.marcarProcessado(transacoes);

    // 10. Garantir participante na liga
    await adicionarParticipanteNaLiga(ligaId, {
        time_id: timeId,
        nome_time: participante.nome_time,
        nome_cartoleiro: participante.nome_cartola || participante.nome_cartoleiro,
        escudo: participante.escudo_url || participante.foto_time,
        // ✅ v2.12: Preservar campos adicionais do participante
        contato: participante.contato || "",
        clube_id: participante.clube_id || participante.time_coracao || null
    }, temporada);

    console.log(`[INSCRICOES] Renovação processada: liga=${ligaId} time=${timeId} temporada=${temporada}`);

    return {
        success: true,
        inscricao: inscricaoDoc,
        resumo: {
            taxa,
            pagouInscricao,
            saldoTransferido,
            dividaAnterior,
            saldoInicialTemporada,
            transacoes: transacoes.length
        }
    };
}

/**
 * Processa "não participar" de um participante
 * @param {string} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Nova temporada
 * @param {Object} opcoes - { observacoes, aprovadoPor }
 * @returns {Promise<Object>}
 */
export async function processarNaoParticipar(ligaId, timeId, temporada, opcoes = {}) {
    const temporadaAnterior = temporada - 1;

    // 1. Buscar saldo para registro
    const saldo = await buscarSaldoTemporada(ligaId, timeId, temporadaAnterior);

    // 2. Buscar dados do participante
    const liga = await Liga.findById(ligaId).lean();
    const participante = liga?.participantes?.find(p => Number(p.time_id) === Number(timeId));

    if (!participante) {
        throw new Error("Participante não encontrado na liga");
    }

    // 3. Criar inscrição com status nao_participa
    const inscricao = await InscricaoTemporada.upsert({
        liga_id: ligaId,
        time_id: Number(timeId),
        temporada,
        status: 'nao_participa',
        origem: 'renovacao',
        dados_participante: {
            nome_time: participante.nome_time,
            nome_cartoleiro: participante.nome_cartola || participante.nome_cartoleiro,
            escudo: participante.escudo_url || participante.foto_time,
            id_cartola_oficial: Number(timeId)
        },
        temporada_anterior: {
            temporada: temporadaAnterior,
            saldo_final: saldo.saldoFinal,
            status_quitacao: saldo.status
        },
        saldo_transferido: 0,
        taxa_inscricao: 0,
        divida_anterior: 0,
        saldo_inicial_temporada: 0,
        data_decisao: new Date(),
        aprovado_por: opcoes.aprovadoPor || 'admin',
        observacoes: opcoes.observacoes || 'Optou por não participar',
        processado: true,
        data_processamento: new Date()
    });

    // 4. NÃO criar Time para nova temporada (ele fica só em 2025)
    // O saldo de 2025 fica congelado, pode quitar depois via AcertoFinanceiro

    console.log(`[INSCRICOES] Não participar processado: liga=${ligaId} time=${timeId} temporada=${temporada}`);

    return {
        success: true,
        inscricao,
        mensagem: saldo.status === 'devedor'
            ? `Participante não vai participar. Saldo de R$ ${Math.abs(saldo.saldoFinal).toFixed(2)} pendente em ${temporadaAnterior}.`
            : 'Participante marcado como não participa.'
    };
}

/**
 * Processa cadastro de novo participante
 * Suporta cadastro manual (sem ID do Cartola) com pendência de sincronização
 * @param {string} ligaId - ID da liga
 * @param {number} temporada - Nova temporada
 * @param {Object} dadosCartola - { time_id, nome_time, nome_cartoleiro, escudo, time_coracao, contato, pendente_sincronizacao }
 * @param {Object} opcoes - { observacoes, aprovadoPor, pagouInscricao }
 * @returns {Promise<Object>}
 */
export async function processarNovoParticipante(ligaId, temporada, dadosCartola, opcoes = {}) {
    const isCadastroManual = dadosCartola.cadastro_manual === true || dadosCartola.pendente_sincronizacao === true;

    // Para cadastro manual sem ID, gerar ID temporário negativo (timestamp)
    let timeId;
    if (dadosCartola.time_id) {
        timeId = Number(dadosCartola.time_id);
    } else if (isCadastroManual) {
        // ID temporário negativo = -timestamp para identificar cadastros manuais
        timeId = -Date.now();
        console.log(`[INSCRICOES] Cadastro manual - ID temporário gerado: ${timeId}`);
    } else {
        throw new Error("ID do time é obrigatório");
    }

    // 1. Verificar se já existe na liga
    const liga = await Liga.findById(ligaId).lean();
    if (!liga) {
        throw new Error("Liga não encontrada");
    }

    // Para IDs positivos (Cartola real), verificar duplicidade
    if (timeId > 0) {
        const jaExiste = liga.participantes?.some(p => Number(p.time_id) === timeId);
        if (jaExiste) {
            throw new Error("Este time já está cadastrado na liga");
        }
    }

    // 2. Buscar regras da liga
    const rules = await LigaRules.buscarPorLiga(ligaId, temporada);
    if (!rules) {
        throw new Error("Regras não configuradas para esta temporada");
    }

    const taxa = rules.inscricao.taxa || 0;

    // pagouInscricao: default true (presume que pagou, não cria débito)
    const pagouInscricao = opcoes.pagouInscricao !== false;
    const taxaComoDebito = pagouInscricao ? 0 : taxa;
    const saldoInicialTemporada = taxaComoDebito;

    // 3. Criar inscrição
    const nomeTime = dadosCartola.nome_time || dadosCartola.nome || dadosCartola.nome_cartoleiro;
    const nomeCartoleiro = dadosCartola.nome_cartoleiro || dadosCartola.cartoleiro || dadosCartola.nome_time;

    const inscricao = await InscricaoTemporada.upsert({
        liga_id: ligaId,
        time_id: timeId,
        temporada,
        status: 'novo',
        origem: isCadastroManual ? 'cadastro_manual' : 'novo_cadastro',
        dados_participante: {
            nome_time: nomeTime,
            nome_cartoleiro: nomeCartoleiro,
            escudo: dadosCartola.escudo || dadosCartola.url_escudo_png || '',
            id_cartola_oficial: timeId > 0 ? timeId : null,
            time_coracao: dadosCartola.time_coracao || null,
            contato: dadosCartola.contato || null,
            pendente_sincronizacao: isCadastroManual && timeId < 0
        },
        temporada_anterior: {
            temporada: null,
            saldo_final: 0,
            status_quitacao: 'quitado'
        },
        saldo_transferido: 0,
        taxa_inscricao: taxa,
        divida_anterior: 0,
        saldo_inicial_temporada: saldoInicialTemporada,
        pagou_inscricao: pagouInscricao,
        data_decisao: new Date(),
        aprovado_por: opcoes.aprovadoPor || 'admin',
        observacoes: opcoes.observacoes || (isCadastroManual ? 'Cadastro manual - pendente vincular ID Cartola' : 'Novo participante')
    });

    // 4. Criar transações iniciais (só cria débito se NÃO pagou)
    const transacoes = await criarTransacoesIniciais(ligaId, timeId, temporada, {
        taxa,
        saldoTransferido: 0,
        dividaAnterior: 0,
        pagouInscricao
    });

    // 5. Marcar como processado
    const inscricaoDoc = await InscricaoTemporada.findById(inscricao._id);
    await inscricaoDoc.marcarProcessado(transacoes);

    // 6. Adicionar à liga
    await adicionarParticipanteNaLiga(ligaId, {
        time_id: timeId,
        nome_time: nomeTime,
        nome_cartoleiro: nomeCartoleiro,
        escudo: dadosCartola.escudo || dadosCartola.url_escudo_png || '',
        time_coracao: dadosCartola.time_coracao || null,
        contato: dadosCartola.contato || null,
        pendente_sincronizacao: isCadastroManual && timeId < 0
    }, temporada);

    const tipoLog = isCadastroManual ? 'MANUAL' : 'NOVO';
    console.log(`[INSCRICOES] ${tipoLog} participante cadastrado: liga=${ligaId} time=${timeId} temporada=${temporada}`);

    return {
        success: true,
        inscricao: inscricaoDoc,
        cadastroManual: isCadastroManual,
        pendenteSincronizacao: isCadastroManual && timeId < 0,
        resumo: {
            taxa,
            pagouInscricao,
            saldoInicialTemporada,
            timeId,
            nomeTime,
            nomeCartoleiro
        }
    };
}

export default {
    buscarSaldoTemporada,
    criarTransacoesIniciais,
    adicionarParticipanteNaLiga,
    processarRenovacao,
    processarNaoParticipar,
    processarNovoParticipante
};
