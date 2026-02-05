// =====================================================================
// PARTICIPANTE-RODADAS-CALENDAR.JS - v1.0
// Gerencia calendário de jogos e determina quando ativar polling
// =====================================================================

if (window.Log) Log.info("[CALENDAR] 📅 Carregando módulo v1.0...");

// Estado do calendário
let estadoCalendario = {
    temporada: null,
    rodada: null,
    calendarioData: null,
    statusData: null,
    ultimaAtualizacao: null,
    cache: new Map(),
    verificacaoTimer: null,
};

// =====================================================================
// INICIALIZAR CALENDÁRIO PARA UMA RODADA
// =====================================================================
export async function inicializarCalendario(temporada, rodada) {
    if (window.Log) Log.info("[CALENDAR] 🚀 Inicializando...", { temporada, rodada });

    estadoCalendario.temporada = temporada;
    estadoCalendario.rodada = rodada;

    try {
        // Buscar status (lightweight) primeiro
        const status = await buscarStatus(temporada, rodada);

        if (status && status.success) {
            estadoCalendario.statusData = status;
            estadoCalendario.ultimaAtualizacao = new Date();

            if (window.Log) {
                Log.info("[CALENDAR] ✅ Status carregado:", {
                    existe: status.existe,
                    tem_jogos_ao_vivo: status.tem_jogos_ao_vivo,
                    deve_ativar_polling: status.deve_ativar_polling,
                    proximo_jogo: status.proximo_jogo,
                });
            }

            return {
                disponivel: status.existe,
                deve_ativar_polling: status.deve_ativar_polling,
                tem_jogos_ao_vivo: status.tem_jogos_ao_vivo,
                proximo_jogo: status.proximo_jogo,
                proximo_disparo: status.proximo_disparo,
            };
        }

        return {
            disponivel: false,
            deve_ativar_polling: false,
            tem_jogos_ao_vivo: false,
        };
    } catch (error) {
        if (window.Log) Log.error("[CALENDAR] ❌ Erro ao inicializar:", error);
        return {
            disponivel: false,
            deve_ativar_polling: false,
            erro: error.message,
        };
    }
}

// =====================================================================
// BUSCAR STATUS (lightweight - sem retornar todas as partidas)
// =====================================================================
async function buscarStatus(temporada, rodada) {
    const cacheKey = `${temporada}-${rodada}-status`;

    // Verificar cache (válido por 5 minutos)
    const cached = estadoCalendario.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
        if (window.Log) Log.info("[CALENDAR] ⚡ Usando cache de status");
        return cached.data;
    }

    try {
        const response = await fetch(
            `/api/calendario-rodadas/${temporada}/${rodada}/status`
        );

        if (!response.ok) {
            if (window.Log) Log.warn(`[CALENDAR] Status HTTP ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Armazenar em cache
        estadoCalendario.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });

        return data;
    } catch (error) {
        if (window.Log) Log.error("[CALENDAR] Erro ao buscar status:", error);
        return null;
    }
}

// =====================================================================
// BUSCAR CALENDÁRIO COMPLETO (com todas as partidas)
// =====================================================================
export async function buscarCalendarioCompleto(temporada, rodada) {
    const cacheKey = `${temporada}-${rodada}-full`;

    // Verificar cache (válido por 30 minutos)
    const cached = estadoCalendario.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 30 * 60 * 1000) {
        if (window.Log) Log.info("[CALENDAR] ⚡ Usando cache de calendário completo");
        return cached.data;
    }

    try {
        const response = await fetch(
            `/api/calendario-rodadas/${temporada}/${rodada}`
        );

        if (!response.ok) {
            if (window.Log) Log.warn(`[CALENDAR] Calendário HTTP ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Armazenar em cache
        estadoCalendario.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });

        estadoCalendario.calendarioData = data;
        return data;
    } catch (error) {
        if (window.Log) Log.error("[CALENDAR] Erro ao buscar calendário:", error);
        return null;
    }
}

// =====================================================================
// VERIFICAR SE DEVE ATIVAR POLLING AGORA
// =====================================================================
export async function deveAtivarPolling(temporada, rodada) {
    const status = await buscarStatus(temporada, rodada);

    if (!status || !status.success || !status.existe) {
        return false;
    }

    return status.deve_ativar_polling === true;
}

// =====================================================================
// INICIAR VERIFICAÇÃO PERIÓDICA (verifica a cada 2 minutos)
// =====================================================================
export function iniciarVerificacaoPeriodica(temporada, rodada, onMudanca) {
    pararVerificacaoPeriodica();

    const verificar = async () => {
        try {
            const status = await buscarStatus(temporada, rodada);

            if (status && status.success && status.existe) {
                const deveAtivar = status.deve_ativar_polling;

                if (typeof onMudanca === 'function') {
                    onMudanca({
                        deve_ativar_polling: deveAtivar,
                        tem_jogos_ao_vivo: status.tem_jogos_ao_vivo,
                        proximo_jogo: status.proximo_jogo,
                        proximo_disparo: status.proximo_disparo,
                    });
                }
            }
        } catch (error) {
            if (window.Log) Log.warn("[CALENDAR] Erro na verificação periódica:", error);
        }
    };

    // Executar primeira verificação imediatamente
    verificar();

    // Programar verificações a cada 2 minutos
    estadoCalendario.verificacaoTimer = setInterval(verificar, 2 * 60 * 1000);

    if (window.Log) Log.info("[CALENDAR] ⏰ Verificação periódica iniciada (a cada 2min)");
}

// =====================================================================
// PARAR VERIFICAÇÃO PERIÓDICA
// =====================================================================
export function pararVerificacaoPeriodica() {
    if (estadoCalendario.verificacaoTimer) {
        clearInterval(estadoCalendario.verificacaoTimer);
        estadoCalendario.verificacaoTimer = null;
        if (window.Log) Log.info("[CALENDAR] ⏸️ Verificação periódica parada");
    }
}

// =====================================================================
// OBTER PRÓXIMO JOGO
// =====================================================================
export function obterProximoJogo() {
    return estadoCalendario.statusData?.proximo_jogo || null;
}

// =====================================================================
// LIMPAR CACHE
// =====================================================================
export function limparCache() {
    estadoCalendario.cache.clear();
    if (window.Log) Log.info("[CALENDAR] 🗑️ Cache limpo");
}

// Expor no window para debug E como export padrão
window.CalendarModule = {
    inicializar: inicializarCalendario,
    buscarCompleto: buscarCalendarioCompleto,
    deveAtivarPolling,
    iniciarVerificacao: iniciarVerificacaoPeriodica,
    pararVerificacao: pararVerificacaoPeriodica,
    proximoJogo: obterProximoJogo,
    limparCache,
};

// Export default para compatibilidade com import
export default {
    inicializar: inicializarCalendario,
    buscarCompleto: buscarCalendarioCompleto,
    deveAtivarPolling,
    iniciarVerificacao: iniciarVerificacaoPeriodica,
    pararVerificacao: pararVerificacaoPeriodica,
    proximoJogo: obterProximoJogo,
    limparCache,
};

if (window.Log) Log.info("[CALENDAR] ✅ Módulo v1.0 carregado");
