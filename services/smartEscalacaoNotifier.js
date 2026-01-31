/**
 * SMART ESCALAÇÃO NOTIFIER v2.0
 * Sistema inteligente de notificações de escalação baseado em MarketGate
 *
 * Substitui horários fixos por cálculos dinâmicos baseados no fechamento real do mercado
 *
 * ANTES (v1.0):
 * - Sexta 18h, Sábado 14h/16h, Domingo 14h (fixo)
 * - Problema: Mercado Cartola fecha em horários variáveis
 *
 * DEPOIS (v2.0):
 * - Calcula tempo real até fechamento via MarketGate
 * - Notifica 2h, 1h, 30min antes (dinâmico)
 * - Mais preciso e assertivo
 */

import marketGate from '../utils/marketGate.js';
import { triggerEscalacaoPendente, verificarQuemNaoEscalou } from './notificationTriggers.js';
import Liga from '../models/Liga.js';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const INTERVALOS_NOTIFICACAO = {
    alerta_2h: 2 * 60 * 60 * 1000,   // 2 horas em ms
    alerta_1h: 1 * 60 * 60 * 1000,   // 1 hora em ms
    alerta_30min: 30 * 60 * 1000     // 30 minutos em ms
};

// Armazena últimas notificações enviadas para evitar duplicatas
const ultimasNotificacoes = new Map();

// ============================================================================
// FUNÇÃO PRINCIPAL: Verificar e Notificar
// ============================================================================

/**
 * Verifica se deve notificar participantes baseado no tempo restante até fechamento
 * Chamado pelo CRON a cada 15 minutos
 */
export async function verificarENotificarEscalacao() {
    console.log('[SMART-ESCALACAO] Verificando necessidade de notificações...');

    try {
        // 1. Buscar status do mercado via MarketGate
        const statusMercado = await marketGate.fetchStatus();

        // 2. Validar se mercado está aberto
        if (!statusMercado.mercado_aberto) {
            console.log('[SMART-ESCALACAO] Mercado fechado, pulando verificação');
            return { enviadas: 0, motivo: 'mercado_fechado' };
        }

        // 3. Calcular tempo restante até fechamento
        const tempoRestante = calcularTempoRestante(statusMercado);

        if (!tempoRestante) {
            console.log('[SMART-ESCALACAO] Horário de fechamento não disponível');
            return { enviadas: 0, motivo: 'sem_horario_fechamento' };
        }

        console.log(`[SMART-ESCALACAO] Tempo restante: ${Math.floor(tempoRestante / 1000 / 60)}min`);

        // 4. Determinar se deve notificar
        const tipoNotificacao = determinarTipoNotificacao(tempoRestante);

        if (!tipoNotificacao) {
            console.log('[SMART-ESCALACAO] Nenhuma notificação necessária neste momento');
            return { enviadas: 0, motivo: 'fora_dos_intervalos' };
        }

        // 5. Verificar se já notificou neste intervalo (evitar duplicatas)
        const rodadaAtual = statusMercado.rodada_atual;
        const chaveDuplicata = `${rodadaAtual}-${tipoNotificacao}`;

        if (ultimasNotificacoes.has(chaveDuplicata)) {
            const ultimaNotif = ultimasNotificacoes.get(chaveDuplicata);
            const diffTime = Date.now() - ultimaNotif;

            // Só notifica novamente após 10 minutos
            if (diffTime < 10 * 60 * 1000) {
                console.log(`[SMART-ESCALACAO] Já notificado ${tipoNotificacao} há ${Math.floor(diffTime / 1000 / 60)}min`);
                return { enviadas: 0, motivo: 'ja_notificado' };
            }
        }

        // 6. Buscar ligas ativas e notificar
        const ligas = await Liga.find({ ativa: true }).select('_id nome').lean();
        let totalNotificadas = 0;

        for (const liga of ligas) {
            const naoEscalados = await verificarQuemNaoEscalou(liga._id.toString(), rodadaAtual);

            if (naoEscalados.length > 0) {
                const stats = await triggerEscalacaoPendente(
                    liga._id.toString(),
                    rodadaAtual,
                    naoEscalados
                );
                totalNotificadas += stats.enviadas;

                console.log(`[SMART-ESCALACAO] Liga ${liga.nome}: ${stats.enviadas} notificações (${tipoNotificacao})`);
            }
        }

        // 7. Registrar notificação enviada
        ultimasNotificacoes.set(chaveDuplicata, Date.now());

        console.log(`[SMART-ESCALACAO] ✅ Total: ${totalNotificadas} notificações (${tipoNotificacao})`);

        return {
            enviadas: totalNotificadas,
            tipo: tipoNotificacao,
            tempo_restante_min: Math.floor(tempoRestante / 1000 / 60)
        };

    } catch (error) {
        console.error('[SMART-ESCALACAO] Erro:', error.message);
        return { enviadas: 0, erro: error.message };
    }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcula tempo restante até fechamento do mercado
 * @param {Object} statusMercado - Status do marketGate
 * @returns {number|null} Tempo em milissegundos ou null se não disponível
 */
function calcularTempoRestante(statusMercado) {
    // Verificar se tem informação de fechamento
    if (!statusMercado.fechamento || !statusMercado.fechamento.timestamp) {
        return null;
    }

    const agora = Date.now();
    const fechamentoTimestamp = statusMercado.fechamento.timestamp * 1000; // Converter para ms

    const tempoRestante = fechamentoTimestamp - agora;

    // Se já passou do fechamento, retorna null
    if (tempoRestante < 0) {
        return null;
    }

    return tempoRestante;
}

/**
 * Determina qual tipo de notificação enviar baseado no tempo restante
 * @param {number} tempoRestante - Tempo em milissegundos
 * @returns {string|null} Tipo de notificação ou null
 */
function determinarTipoNotificacao(tempoRestante) {
    const tolerancia = 5 * 60 * 1000; // 5 minutos de tolerância

    // 30 minutos antes (±5min)
    if (Math.abs(tempoRestante - INTERVALOS_NOTIFICACAO.alerta_30min) < tolerancia) {
        return 'alerta_30min';
    }

    // 1 hora antes (±5min)
    if (Math.abs(tempoRestante - INTERVALOS_NOTIFICACAO.alerta_1h) < tolerancia) {
        return 'alerta_1h';
    }

    // 2 horas antes (±5min)
    if (Math.abs(tempoRestante - INTERVALOS_NOTIFICACAO.alerta_2h) < tolerancia) {
        return 'alerta_2h';
    }

    return null;
}

/**
 * Limpa cache de notificações antigas (executar diariamente)
 */
export function limparCacheNotificacoes() {
    const agora = Date.now();
    const limite = 24 * 60 * 60 * 1000; // 24 horas

    for (const [chave, timestamp] of ultimasNotificacoes.entries()) {
        if (agora - timestamp > limite) {
            ultimasNotificacoes.delete(chave);
        }
    }

    console.log(`[SMART-ESCALACAO] Cache limpo: ${ultimasNotificacoes.size} notificações ativas`);
}

/**
 * Debug: Retorna status atual do sistema de notificações
 */
export async function getEscalacaoStatus() {
    try {
        const statusMercado = await marketGate.fetchStatus();
        const tempoRestante = calcularTempoRestante(statusMercado);
        const tipoNotificacao = tempoRestante ? determinarTipoNotificacao(tempoRestante) : null;

        return {
            mercado_aberto: statusMercado.mercado_aberto,
            rodada_atual: statusMercado.rodada_atual,
            tempo_restante_min: tempoRestante ? Math.floor(tempoRestante / 1000 / 60) : null,
            proxima_notificacao: tipoNotificacao,
            cache_size: ultimasNotificacoes.size,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            erro: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

console.log('[SMART-ESCALACAO] ✅ Serviço de notificações inteligentes carregado');
