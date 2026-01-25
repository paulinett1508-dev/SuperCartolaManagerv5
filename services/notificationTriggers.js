/**
 * SERVICE: Notification Triggers
 * Gatilhos automaticos para disparar push notifications
 *
 * FASE 5 - Push Notifications (FEAT-003)
 *
 * Gatilhos implementados:
 * - Rodada Finalizada: Notifica todos da liga quando consolidacao completa
 * - Mito/Mico: Notifica top 1 (mito) e ultimo (mico) com payload personalizado
 * - Acerto Financeiro: Notifica participante quando pagamento/recebimento registrado
 * - Escalacao Pendente: Notifica quem nao escalou 2h antes do fechamento (via CRON)
 */

import PushSubscription from '../models/PushSubscription.js';
import Liga from '../models/Liga.js';
import Rodada from '../models/Rodada.js';
import {
  sendPushNotification,
  sendBulkNotifications
} from '../controllers/notificationsController.js';

// ============================================
// FUNCOES AUXILIARES
// ============================================

/**
 * Buscar participantes da liga com subscriptions ativas
 * Filtra por preferencia especifica
 * @param {string} ligaId - ID da liga
 * @param {string} preferencia - Chave da preferencia (rodadaConsolidada, mitoMico, etc)
 * @returns {Promise<string[]>} Lista de timeIds com preferencia ativa
 */
async function getParticipantesComPreferencia(ligaId, preferencia) {
  try {
    // Buscar liga para obter participantes
    const liga = await Liga.findById(ligaId).select('participantes').lean();
    if (!liga || !liga.participantes) {
      console.log(`[TRIGGERS] Liga ${ligaId} sem participantes`);
      return [];
    }

    // IDs dos participantes da liga
    const timeIds = liga.participantes
      .filter(p => p.ativo !== false)
      .map(p => String(p.time_id));

    if (timeIds.length === 0) {
      return [];
    }

    // Buscar subscriptions ativas com a preferencia desejada
    const subscriptions = await PushSubscription.find({
      timeId: { $in: timeIds },
      active: true,
      [`preferences.${preferencia}`]: true
    }).select('timeId').lean();

    // Retornar timeIds unicos com preferencia ativa
    const uniqueTimeIds = [...new Set(subscriptions.map(s => s.timeId))];

    console.log(`[TRIGGERS] ${uniqueTimeIds.length}/${timeIds.length} participantes com ${preferencia} ativo`);

    return uniqueTimeIds;

  } catch (erro) {
    console.error(`[TRIGGERS] Erro ao buscar participantes:`, erro.message);
    return [];
  }
}

/**
 * Formatar valor monetario
 */
function formatarValor(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formatar pontuacao
 */
function formatarPontos(pontos) {
  return pontos.toFixed(2).replace('.', ',');
}

// ============================================
// GATILHO: RODADA FINALIZADA
// ============================================

/**
 * Dispara notificacao de rodada finalizada para todos os participantes
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaNum - Numero da rodada consolidada
 * @param {Object} resumo - Resumo da consolidacao { times, mitos, micos }
 */
export async function triggerRodadaFinalizada(ligaId, rodadaNum, resumo = {}) {
  console.log(`[TRIGGERS] 🔔 Disparando rodada finalizada R${rodadaNum}...`);

  try {
    // Buscar participantes que querem receber notificacao de rodada
    const timeIds = await getParticipantesComPreferencia(ligaId, 'rodadaConsolidada');

    if (timeIds.length === 0) {
      console.log(`[TRIGGERS] Nenhum participante para notificar (rodadaConsolidada)`);
      return { enviadas: 0, erros: 0 };
    }

    // Buscar nome da liga para mensagem mais amigavel
    const liga = await Liga.findById(ligaId).select('nome').lean();
    const nomeLiga = liga?.nome || 'Liga';

    // Payload da notificacao
    const payload = {
      title: `Rodada ${rodadaNum} Finalizada!`,
      body: `A pontuacao da rodada ${rodadaNum} foi consolidada. Confira seu desempenho!`,
      url: '/participante/rodadas',
      tag: `rodada-${rodadaNum}`,
      icon: '/participante/icons/icon-192x192.png',
      badge: '/participante/icons/badge-72x72.png',
      data: {
        tipo: 'rodada_finalizada',
        ligaId,
        rodada: rodadaNum,
        timestamp: Date.now()
      }
    };

    const stats = await sendBulkNotifications(timeIds, payload);

    console.log(`[TRIGGERS] ✅ Rodada finalizada: ${stats.enviadas} notificacoes enviadas`);

    return stats;

  } catch (erro) {
    console.error(`[TRIGGERS] Erro ao disparar rodada finalizada:`, erro.message);
    return { enviadas: 0, erros: 1 };
  }
}

// ============================================
// GATILHO: MITO E MICO
// ============================================

/**
 * Dispara notificacao para mito (1o lugar) e mico (ultimo) da rodada
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaNum - Numero da rodada
 * @param {Object} top10Data - Dados do top10 { mitos: [], micos: [] }
 */
export async function triggerMitoMico(ligaId, rodadaNum, top10Data) {
  console.log(`[TRIGGERS] 🏆 Disparando mito/mico R${rodadaNum}...`);

  try {
    if (!top10Data || !top10Data.mitos || !top10Data.micos) {
      console.log(`[TRIGGERS] Sem dados de top10 para notificar`);
      return { enviadas: 0, erros: 0 };
    }

    const stats = { enviadas: 0, erros: 0 };

    // MITO - Primeiro lugar
    const mito = top10Data.mitos[0];
    if (mito && mito.time_id) {
      // Verificar se quer receber notificacao de mito/mico
      const subscriptionMito = await PushSubscription.findOne({
        timeId: String(mito.time_id),
        active: true,
        'preferences.mitoMico': true
      }).lean();

      if (subscriptionMito) {
        const premioText = mito.premio ? ` e ganhou ${formatarValor(mito.premio)}!` : '!';

        const payloadMito = {
          title: '🏆 VOCE E O MITO DA RODADA!',
          body: `Parabens! Voce fez ${formatarPontos(mito.pontos_rodada)} pontos na R${rodadaNum}${premioText}`,
          url: '/participante/rodadas',
          tag: `mito-${rodadaNum}`,
          icon: '/participante/icons/icon-192x192.png',
          badge: '/participante/icons/badge-72x72.png',
          data: {
            tipo: 'mito',
            ligaId,
            rodada: rodadaNum,
            pontos: mito.pontos_rodada,
            premio: mito.premio || 0,
            timestamp: Date.now()
          }
        };

        const resultMito = await sendPushNotification(String(mito.time_id), payloadMito);
        stats.enviadas += resultMito.enviadas;
        stats.erros += resultMito.erros;

        console.log(`[TRIGGERS] Mito ${mito.nome_time}: notificado`);
      }
    }

    // MICO - Ultimo lugar
    const mico = top10Data.micos[0];
    if (mico && mico.time_id && mico.time_id !== mito?.time_id) {
      // Verificar se quer receber notificacao de mito/mico
      const subscriptionMico = await PushSubscription.findOne({
        timeId: String(mico.time_id),
        active: true,
        'preferences.mitoMico': true
      }).lean();

      if (subscriptionMico) {
        const multaText = mico.multa ? ` Multa: ${formatarValor(mico.multa)}` : '';

        const payloadMico = {
          title: '😬 Voce foi o Mico da Rodada',
          body: `Voce fez ${formatarPontos(mico.pontos_rodada)} pontos na R${rodadaNum}.${multaText}`,
          url: '/participante/rodadas',
          tag: `mico-${rodadaNum}`,
          icon: '/participante/icons/icon-192x192.png',
          badge: '/participante/icons/badge-72x72.png',
          data: {
            tipo: 'mico',
            ligaId,
            rodada: rodadaNum,
            pontos: mico.pontos_rodada,
            multa: mico.multa || 0,
            timestamp: Date.now()
          }
        };

        const resultMico = await sendPushNotification(String(mico.time_id), payloadMico);
        stats.enviadas += resultMico.enviadas;
        stats.erros += resultMico.erros;

        console.log(`[TRIGGERS] Mico ${mico.nome_time}: notificado`);
      }
    }

    console.log(`[TRIGGERS] ✅ Mito/Mico: ${stats.enviadas} notificacoes enviadas`);

    return stats;

  } catch (erro) {
    console.error(`[TRIGGERS] Erro ao disparar mito/mico:`, erro.message);
    return { enviadas: 0, erros: 1 };
  }
}

// ============================================
// GATILHO: ACERTO FINANCEIRO
// ============================================

/**
 * Dispara notificacao quando um acerto financeiro e registrado
 * @param {string} timeId - ID do participante
 * @param {Object} acerto - Dados do acerto { tipo, valor, descricao }
 */
export async function triggerAcertoFinanceiro(timeId, acerto) {
  console.log(`[TRIGGERS] 💰 Disparando acerto financeiro para ${timeId}...`);

  try {
    // Verificar se participante quer receber notificacao de acertos
    const subscription = await PushSubscription.findOne({
      timeId: String(timeId),
      active: true,
      'preferences.acertosFinanceiros': true
    }).lean();

    if (!subscription) {
      console.log(`[TRIGGERS] Participante ${timeId} nao quer notificacoes de acertos`);
      return { enviadas: 0, erros: 0 };
    }

    const isPagamento = acerto.tipo === 'pagamento';
    const valorFormatado = formatarValor(acerto.valor);

    const payload = {
      title: isPagamento ? '✅ Pagamento Registrado' : '💵 Recebimento Registrado',
      body: isPagamento
        ? `Seu pagamento de ${valorFormatado} foi registrado. ${acerto.descricao || ''}`
        : `Voce recebeu ${valorFormatado}. ${acerto.descricao || ''}`,
      url: '/participante/extrato',
      tag: `acerto-${Date.now()}`,
      icon: '/participante/icons/icon-192x192.png',
      badge: '/participante/icons/badge-72x72.png',
      data: {
        tipo: 'acerto_financeiro',
        acertoTipo: acerto.tipo,
        valor: acerto.valor,
        timestamp: Date.now()
      }
    };

    const stats = await sendPushNotification(String(timeId), payload);

    console.log(`[TRIGGERS] ✅ Acerto financeiro: ${stats.enviadas} notificacoes enviadas`);

    return stats;

  } catch (erro) {
    console.error(`[TRIGGERS] Erro ao disparar acerto financeiro:`, erro.message);
    return { enviadas: 0, erros: 1 };
  }
}

// ============================================
// GATILHO: ESCALACAO PENDENTE
// ============================================

/**
 * Dispara notificacao para participantes que nao escalaram
 * Executado via CRON 2h antes do fechamento do mercado
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaNum - Numero da rodada atual
 * @param {string[]} timeIdsNaoEscalados - Lista de timeIds que nao escalaram
 */
export async function triggerEscalacaoPendente(ligaId, rodadaNum, timeIdsNaoEscalados) {
  console.log(`[TRIGGERS] ⚠️ Disparando escalacao pendente R${rodadaNum} (${timeIdsNaoEscalados.length} times)...`);

  try {
    if (!timeIdsNaoEscalados || timeIdsNaoEscalados.length === 0) {
      console.log(`[TRIGGERS] Todos ja escalaram!`);
      return { enviadas: 0, erros: 0 };
    }

    // Filtrar apenas quem quer receber notificacao de escalacao
    const subscriptions = await PushSubscription.find({
      timeId: { $in: timeIdsNaoEscalados.map(String) },
      active: true,
      'preferences.escalacaoPendente': true
    }).select('timeId').lean();

    const timeIdsParaNotificar = [...new Set(subscriptions.map(s => s.timeId))];

    if (timeIdsParaNotificar.length === 0) {
      console.log(`[TRIGGERS] Nenhum participante quer notificacao de escalacao`);
      return { enviadas: 0, erros: 0 };
    }

    const payload = {
      title: '⚠️ Mercado fecha em breve!',
      body: `Voce ainda nao escalou para a rodada ${rodadaNum}. Corre la!`,
      url: 'https://cartolafc.globo.com',
      tag: `escalacao-${rodadaNum}`,
      icon: '/participante/icons/icon-192x192.png',
      badge: '/participante/icons/badge-72x72.png',
      data: {
        tipo: 'escalacao_pendente',
        ligaId,
        rodada: rodadaNum,
        timestamp: Date.now()
      }
    };

    const stats = await sendBulkNotifications(timeIdsParaNotificar, payload);

    console.log(`[TRIGGERS] ✅ Escalacao pendente: ${stats.enviadas} notificacoes enviadas`);

    return stats;

  } catch (erro) {
    console.error(`[TRIGGERS] Erro ao disparar escalacao pendente:`, erro.message);
    return { enviadas: 0, erros: 1 };
  }
}

// ============================================
// FUNCAO AUXILIAR: VERIFICAR QUEM NAO ESCALOU
// ============================================

/**
 * Verifica quais participantes da liga ainda nao escalaram para a rodada
 * @param {string} ligaId - ID da liga
 * @param {number} rodadaNum - Numero da rodada
 * @returns {Promise<string[]>} Lista de timeIds que nao escalaram
 */
export async function verificarQuemNaoEscalou(ligaId, rodadaNum) {
  try {
    // Buscar participantes ativos da liga
    const liga = await Liga.findById(ligaId).select('participantes').lean();
    if (!liga || !liga.participantes) {
      return [];
    }

    const timeIdsAtivos = liga.participantes
      .filter(p => p.ativo !== false)
      .map(p => String(p.time_id));

    // Buscar quem ja tem registro na rodada
    const rodadas = await Rodada.find({
      ligaId,
      rodada: rodadaNum,
      timeId: { $in: timeIdsAtivos.map(Number) }
    }).select('timeId').lean();

    const timeIdsEscalados = new Set(rodadas.map(r => String(r.timeId)));

    // Filtrar quem ainda nao escalou
    const naoEscalados = timeIdsAtivos.filter(id => !timeIdsEscalados.has(id));

    console.log(`[TRIGGERS] ${naoEscalados.length}/${timeIdsAtivos.length} ainda nao escalaram R${rodadaNum}`);

    return naoEscalados;

  } catch (erro) {
    console.error(`[TRIGGERS] Erro ao verificar escalacao:`, erro.message);
    return [];
  }
}

// ============================================
// FUNCAO CRON: VERIFICAR E NOTIFICAR ESCALACAO
// ============================================

/**
 * Funcao executada pelo CRON para verificar e notificar escalacao pendente
 * @param {number} rodadaAtual - Numero da rodada atual (opcional, busca do mercado se nao informado)
 */
export async function cronEscalacaoPendente(rodadaAtual = null) {
  console.log(`[CRON-ESCALACAO] Verificando escalacoes pendentes...`);

  try {
    // Se rodada nao informada, buscar do mercado
    if (!rodadaAtual) {
      const statusMercado = await fetch('https://api.cartolafc.globo.com/mercado/status')
        .then(r => r.json())
        .catch(() => null);

      if (!statusMercado || statusMercado.status_mercado !== 1) {
        console.log(`[CRON-ESCALACAO] Mercado nao esta aberto, pulando...`);
        return;
      }

      rodadaAtual = statusMercado.rodada_atual;
    }

    // Buscar todas as ligas ativas
    const ligas = await Liga.find({ ativa: true }).select('_id nome').lean();

    let totalNotificadas = 0;

    for (const liga of ligas) {
      const naoEscalados = await verificarQuemNaoEscalou(liga._id.toString(), rodadaAtual);

      if (naoEscalados.length > 0) {
        const stats = await triggerEscalacaoPendente(liga._id.toString(), rodadaAtual, naoEscalados);
        totalNotificadas += stats.enviadas;
      }
    }

    console.log(`[CRON-ESCALACAO] ✅ Total: ${totalNotificadas} notificacoes enviadas`);

  } catch (erro) {
    console.error(`[CRON-ESCALACAO] Erro:`, erro.message);
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  // Gatilhos
  triggerRodadaFinalizada,
  triggerMitoMico,
  triggerAcertoFinanceiro,
  triggerEscalacaoPendente,

  // Auxiliares
  verificarQuemNaoEscalou,
  cronEscalacaoPendente,
  getParticipantesComPreferencia
};

console.log('[TRIGGERS] ✅ Service de gatilhos de notificacao carregado');
