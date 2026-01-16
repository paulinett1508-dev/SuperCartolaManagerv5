/**
 * Controller: Inscrições Temporada
 *
 * Lógica de negócio para renovação e inscrição de participantes.
 * Gerencia transferência de saldos entre temporadas.
 *
 * REGRA ESTRUTURADA: Débito de inscrição na renovação
 * - Controlada por LigaRules.inscricao.gerar_debito_inscricao_renovacao (default: true)
 * - Se TRUE: ao renovar sem pagar, gera débito automático no extrato (saldo negativo)
 * - Se FALSE: não gera débito automático, admin controla manualmente
 * - Nunca hardcode: sempre seguir a configuração da liga/temporada
 *
 * Veja models/LigaRules.js para schema e documentação da regra.
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
    // REGRA ESTRUTURADA: só gera débito se regra da liga permitir
    // Se pagouInscricao = false e gerar_debito_inscricao_renovacao = true, cria débito no extrato
    const ligaRules = await LigaRules.buscarPorLiga(ligaId, temporada);
    const gerarDebitoInscricao = ligaRules?.inscricao?.gerar_debito_inscricao_renovacao !== false;
    if (valores.taxa > 0 && valores.pagouInscricao === false && gerarDebitoInscricao) {
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

    // ✅ v1.3 FIX: Default é FALSE (não pagou) - taxa vira débito no extrato
    // Só marca como pago se explicitamente opcoes.pagouInscricao === true
    const pagouInscricao = opcoes.pagouInscricao === true;

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
                // Transferir TODO o crédito para nova temporada
                // Se crédito > taxa, o excedente vira saldo positivo em 2026
                creditoUsado = saldo.saldoFinal;  // Crédito total (ex: 354)
                saldoTransferido = creditoUsado;   // Positivo = crédito transferido
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

    // ✅ FIX: Saldo inicial = crédito - taxa - dívida (negativo = deve, positivo = credor)
    // Exemplo: crédito 111.54 - taxa 180 = -68.46 (deve 68.46)
    const saldoInicialTemporada = creditoUsado - taxaComoDebito - dividaAnterior;

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

    // ✅ v1.3 FIX: Default é FALSE (não pagou) - taxa vira débito
    const pagouInscricao = opcoes.pagouInscricao === true;
    const taxaComoDebito = pagouInscricao ? 0 : taxa;
    // ✅ FIX: Saldo negativo = deve (novo participante só tem taxa, sem crédito)
    const saldoInicialTemporada = -taxaComoDebito;

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
            // ✅ v1.1: Padronizar para clube_id (time do coração) - aceita ambos os nomes
            clube_id: dadosCartola.clube_id || dadosCartola.time_coracao || null,
            time_coracao: dadosCartola.time_coracao || dadosCartola.clube_id || null, // Legacy
            contato: dadosCartola.contato || null,
            pendente_sincronizacao: isCadastroManual && timeId < 0,
            // Dados completos da API Cartola
            slug: dadosCartola.slug || null,
            assinante: dadosCartola.assinante || false,
            patrimonio: dadosCartola.patrimonio || 0,
            pontos_campeonato: dadosCartola.pontos_campeonato || 0,
            dados_cartola: dadosCartola.dados_cartola || null
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
        // ✅ v1.1: Passar clube_id explicitamente (time do coração)
        clube_id: dadosCartola.clube_id || dadosCartola.time_coracao || null,
        time_coracao: dadosCartola.time_coracao || dadosCartola.clube_id || null, // Legacy
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

// =============================================================================
// DECISAO UNIFICADA - QUITACAO + RENOVACAO/NAO_PARTICIPAR
// =============================================================================

/**
 * Busca dados completos para o modal de decisao unificada
 * @param {string} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada destino (ex: 2026)
 * @returns {Promise<Object>} Dados para o modal
 */
export async function buscarDadosDecisao(ligaId, timeId, temporada) {
    const temporadaAnterior = temporada - 1;
    const db = mongoose.connection.db;

    // 1. Buscar dados do participante
    const liga = await Liga.findById(ligaId).lean();
    const participante = liga?.participantes?.find(p => Number(p.time_id) === Number(timeId));

    if (!participante) {
        throw new Error("Participante nao encontrado na liga");
    }

    // 2. Buscar saldo da temporada anterior
    const saldo = await buscarSaldoTemporada(ligaId, timeId, temporadaAnterior);

    // 3. Buscar regras da liga
    const rules = await LigaRules.buscarPorLiga(ligaId, temporada);
    if (!rules) {
        throw new Error("Regras nao configuradas para esta temporada");
    }

    // 4. Verificar se ja existe inscricao
    const inscricaoExistente = await InscricaoTemporada.findOne({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        time_id: Number(timeId),
        temporada: Number(temporada)
    }).lean();

    // 5. Verificar se temporada anterior foi quitada
    const extratoAnterior = await db.collection('extratofinanceirocaches').findOne({
        $or: [
            { liga_id: String(ligaId) },
            { liga_id: new mongoose.Types.ObjectId(ligaId) }
        ],
        time_id: Number(timeId),
        temporada: Number(temporadaAnterior)
    });
    const quitado = extratoAnterior?.quitacao?.quitado === true;
    const tipoQuitacao = extratoAnterior?.quitacao?.tipo || null;

    // 6. Determinar cenario
    let cenario = 'quitado';
    if (saldo.saldoFinal > 0.01) cenario = 'credor';
    else if (saldo.saldoFinal < -0.01) cenario = 'devedor';

    // 7. Montar preview de cenarios
    const taxa = rules.inscricao?.taxa || 0;
    const cenarios = {
        renovar: {
            aproveitarCredito: cenario === 'credor' ? {
                saldoTransferido: saldo.saldoFinal,
                taxa,
                saldoInicial: saldo.saldoFinal - taxa
            } : null,
            naoAproveitarCredito: cenario === 'credor' ? {
                saldoTransferido: 0,
                taxa,
                saldoInicial: -taxa
            } : null,
            carregarDivida: cenario === 'devedor' ? {
                saldoTransferido: saldo.saldoFinal,
                taxa,
                saldoInicial: saldo.saldoFinal - taxa
            } : null,
            quitarDivida: cenario === 'devedor' ? {
                saldoTransferido: 0,
                taxa,
                saldoInicial: -taxa
            } : null,
            quitado: cenario === 'quitado' ? {
                saldoTransferido: 0,
                taxa,
                saldoInicial: -taxa
            } : null
        },
        naoParticipar: {
            pagarCredito: cenario === 'credor' ? { valor: saldo.saldoFinal } : null,
            congelarCredito: cenario === 'credor' ? { valor: saldo.saldoFinal } : null,
            cobrarDivida: cenario === 'devedor' ? { valor: Math.abs(saldo.saldoFinal) } : null,
            perdoar: { valor: 0 }
        }
    };

    return {
        participante: {
            time_id: participante.time_id,
            nome_time: participante.nome_time,
            nome_cartola: participante.nome_cartola || participante.nome_cartoleiro,
            escudo: participante.escudo_url || participante.foto_time,
            clube_id: participante.clube_id || participante.time_coracao
        },
        saldo2025: {
            saldoExtrato: saldo.saldoExtrato,
            camposManuais: saldo.camposManuais,
            saldoAcertos: saldo.saldoAcertos,
            saldoFinal: saldo.saldoFinal,
            status: saldo.status
        },
        quitacao2025: {
            quitado,
            tipo: tipoQuitacao
        },
        regras: {
            taxa,
            permitir_devedor_renovar: rules.inscricao?.permitir_devedor_renovar !== false,
            aproveitar_saldo_positivo: rules.inscricao?.aproveitar_saldo_positivo !== false,
            prazo_renovacao: rules.inscricao?.prazo_renovacao,
            status: rules.status
        },
        inscricaoExistente: inscricaoExistente ? {
            status: inscricaoExistente.status,
            processado: inscricaoExistente.processado,
            pagou_inscricao: inscricaoExistente.pagou_inscricao,
            data_decisao: inscricaoExistente.data_decisao
        } : null,
        cenario,
        cenarios,
        temporadaAnterior,
        temporadaDestino: temporada
    };
}

/**
 * Processa decisao unificada (quitacao + renovacao/nao-participar)
 * @param {string} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada destino (ex: 2026)
 * @param {Object} decisao - Dados da decisao
 * @returns {Promise<Object>} Resultado
 */
export async function processarDecisaoUnificada(ligaId, timeId, temporada, decisao) {
    const temporadaAnterior = temporada - 1;
    const db = mongoose.connection.db;

    console.log(`[INSCRICOES] Processando decisao unificada: liga=${ligaId} time=${timeId} temporada=${temporada}`);
    console.log(`[INSCRICOES] Decisao:`, JSON.stringify(decisao, null, 2));

    // 1. Buscar saldo atual
    const saldo = await buscarSaldoTemporada(ligaId, timeId, temporadaAnterior);
    const cenario = saldo.status; // credor, devedor, quitado

    // 2. Determinar tipo de quitacao e valor legado baseado na decisao
    let tipoQuitacao = 'integral';
    let valorLegado = 0;

    if (decisao.decisao === 'renovar') {
        if (cenario === 'credor') {
            if (decisao.aproveitarCredito) {
                // Credito sera transferido para 2026
                tipoQuitacao = 'integral';
                valorLegado = saldo.saldoFinal;
            } else {
                // Credito fica congelado em 2025 (participante escolheu nao usar)
                tipoQuitacao = 'zerado';
                valorLegado = 0;
            }
        } else if (cenario === 'devedor') {
            if (decisao.carregarDivida) {
                // Divida sera carregada para 2026
                tipoQuitacao = 'integral';
                valorLegado = saldo.saldoFinal; // Negativo
            } else {
                // Participante ja quitou a divida (pagou fora do sistema)
                tipoQuitacao = 'zerado';
                valorLegado = 0;
            }
        } else {
            // Quitado - nada a transferir
            tipoQuitacao = 'zerado';
            valorLegado = 0;
        }
    } else if (decisao.decisao === 'nao_participar') {
        if (cenario === 'credor') {
            if (decisao.acaoCredito === 'pagar') {
                // Admin vai pagar o credito ao participante - zera
                tipoQuitacao = 'zerado';
                valorLegado = 0;
            } else if (decisao.acaoCredito === 'congelar') {
                // Credito fica congelado (futuro uso se voltar)
                tipoQuitacao = 'integral';
                valorLegado = saldo.saldoFinal;
            } else {
                // Perdoar
                tipoQuitacao = 'zerado';
                valorLegado = 0;
            }
        } else if (cenario === 'devedor') {
            if (decisao.acaoDivida === 'cobrar') {
                // Divida fica pendente para cobranca externa
                tipoQuitacao = 'integral';
                valorLegado = saldo.saldoFinal; // Negativo
            } else {
                // Perdoar divida
                tipoQuitacao = 'zerado';
                valorLegado = 0;
            }
        } else {
            tipoQuitacao = 'zerado';
            valorLegado = 0;
        }
    }

    // 3. Registrar quitacao da temporada anterior
    const agora = new Date();
    const ligaObjId = new mongoose.Types.ObjectId(ligaId);

    await db.collection('extratofinanceirocaches').updateOne(
        {
            liga_id: ligaObjId,
            time_id: Number(timeId),
            temporada: Number(temporadaAnterior)
        },
        {
            $set: {
                quitacao: {
                    quitado: true,
                    tipo: tipoQuitacao,
                    saldo_no_momento: saldo.saldoFinal,
                    valor_legado: valorLegado,
                    data_quitacao: agora,
                    admin_responsavel: decisao.aprovadoPor || 'admin',
                    observacao: decisao.observacoes || `Quitacao via modal unificado - ${decisao.decisao}`
                }
            }
        },
        { upsert: true }
    );

    console.log(`[INSCRICOES] Quitacao ${temporadaAnterior} registrada: tipo=${tipoQuitacao} legado=${valorLegado}`);

    // 4. Processar renovacao ou nao-participar
    let resultado;

    if (decisao.decisao === 'renovar') {
        // Criar inscricao com legado_manual se aplicavel
        if (valorLegado !== saldo.saldoFinal || tipoQuitacao === 'zerado') {
            // Definir legado manual na inscricao
            const inscricaoPrevia = await InscricaoTemporada.findOne({
                liga_id: ligaObjId,
                time_id: Number(timeId),
                temporada: Number(temporada)
            });

            if (!inscricaoPrevia) {
                await InscricaoTemporada.create({
                    liga_id: ligaObjId,
                    time_id: Number(timeId),
                    temporada: Number(temporada),
                    status: 'pendente',
                    legado_manual: {
                        origem: 'decisao_unificada',
                        tipo_quitacao: tipoQuitacao,
                        valor_original: saldo.saldoFinal,
                        valor_definido: valorLegado,
                        definido_por: decisao.aprovadoPor || 'admin',
                        data: agora
                    }
                });
            } else {
                await InscricaoTemporada.updateOne(
                    { _id: inscricaoPrevia._id },
                    {
                        $set: {
                            legado_manual: {
                                origem: 'decisao_unificada',
                                tipo_quitacao: tipoQuitacao,
                                valor_original: saldo.saldoFinal,
                                valor_definido: valorLegado,
                                definido_por: decisao.aprovadoPor || 'admin',
                                data: agora
                            }
                        }
                    }
                );
            }
        }

        // Chamar processarRenovacao
        resultado = await processarRenovacao(ligaId, Number(timeId), temporada, {
            pagouInscricao: decisao.pagouInscricao === true,
            aproveitarCredito: decisao.aproveitarCredito === true,
            observacoes: decisao.observacoes,
            aprovadoPor: decisao.aprovadoPor
        });

    } else if (decisao.decisao === 'nao_participar') {
        resultado = await processarNaoParticipar(ligaId, Number(timeId), temporada, {
            observacoes: decisao.observacoes,
            aprovadoPor: decisao.aprovadoPor
        });
    } else {
        throw new Error("Decisao invalida. Use 'renovar' ou 'nao_participar'");
    }

    return {
        success: true,
        quitacao: {
            temporada: temporadaAnterior,
            tipo: tipoQuitacao,
            saldoOriginal: saldo.saldoFinal,
            valorLegado
        },
        resultado,
        mensagem: decisao.decisao === 'renovar'
            ? `Participante renovado para ${temporada}`
            : `Participante marcado como nao participa em ${temporada}`
    };
}

export default {
    buscarSaldoTemporada,
    criarTransacoesIniciais,
    adicionarParticipanteNaLiga,
    processarRenovacao,
    processarNaoParticipar,
    processarNovoParticipante,
    buscarDadosDecisao,
    processarDecisaoUnificada
};
