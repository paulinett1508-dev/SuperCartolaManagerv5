import RodadaSnapshot from "../models/RodadaSnapshot.js";
import Liga from "../models/Liga.js";

// ============================================================================
// ⏰ SCHEDULER DE CONSOLIDAÇÃO AUTOMÁTICA
// Roda a cada 30 minutos verificando se alguma rodada fechou
// ============================================================================

let ultimoStatusMercado = null;
let schedulerAtivo = false;

// Busca status do mercado Cartola
async function getStatusMercado() {
    try {
        const response = await fetch(
            "https://api.cartolafc.globo.com/mercado/status",
        );
        return await response.json();
    } catch (error) {
        console.error(
            "[SCHEDULER] Erro ao buscar status mercado:",
            error.message,
        );
        return null;
    }
}

// Verifica se deve consolidar
async function verificarEConsolidar() {
    try {
        const statusAtual = await getStatusMercado();

        if (!statusAtual) {
            console.log(
                "[SCHEDULER] ⚠️ Não foi possível obter status do mercado",
            );
            return;
        }

        const rodadaAtual = statusAtual.rodada_atual;
        const mercadoAberto = statusAtual.status_mercado === 1; // 1 = aberto, 2 = fechado

        console.log(
            `[SCHEDULER] 📊 Status: Rodada ${rodadaAtual}, Mercado ${mercadoAberto ? "ABERTO" : "FECHADO"}`,
        );

        // Detectar transição: mercado fechou (era aberto, agora fechado)
        if (
            ultimoStatusMercado?.status_mercado === 1 &&
            statusAtual.status_mercado === 2
        ) {
            console.log(
                `[SCHEDULER] 🔔 TRANSIÇÃO DETECTADA: Mercado fechou! Iniciando consolidação R${rodadaAtual - 1}`,
            );

            // Consolidar rodada que acabou de fechar
            await consolidarRodadaAutomatica(rodadaAtual - 1);
        }

        // Se mercado está fechado, garantir que rodada anterior está consolidada
        if (!mercadoAberto && rodadaAtual > 1) {
            await garantirRodadaConsolidada(rodadaAtual - 1);
        }

        ultimoStatusMercado = statusAtual;
    } catch (error) {
        console.error("[SCHEDULER] ❌ Erro na verificação:", error);
    }
}

// Consolida uma rodada específica para todas as ligas
async function consolidarRodadaAutomatica(rodada) {
    try {
        console.log(
            `[SCHEDULER] 🏭 Consolidando R${rodada} para todas as ligas...`,
        );

        const ligas = await Liga.find({}).select("_id nome").lean();

        for (const liga of ligas) {
            try {
                // Verificar se já consolidada
                const existente = await RodadaSnapshot.findOne({
                    liga_id: liga._id.toString(),
                    rodada: rodada,
                    status: "consolidada",
                }).lean();

                if (existente) {
                    console.log(
                        `[SCHEDULER] ⏭️ Liga ${liga.nome} R${rodada} já consolidada`,
                    );
                    continue;
                }

                // Chamar endpoint de consolidação internamente
                const url = `http://localhost:${process.env.PORT || 3000}/api/consolidacao/ligas/${liga._id}/rodadas/${rodada}/consolidar`;

                const response = await fetch(url, { method: "POST" });
                const result = await response.json();

                if (result.success) {
                    console.log(
                        `[SCHEDULER] ✅ Liga ${liga.nome} R${rodada} consolidada`,
                    );
                } else {
                    console.error(
                        `[SCHEDULER] ❌ Liga ${liga.nome} R${rodada} falhou:`,
                        result.error,
                    );
                }

                // Delay entre ligas
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(
                    `[SCHEDULER] ❌ Erro na liga ${liga.nome}:`,
                    error.message,
                );
            }
        }

        console.log(`[SCHEDULER] ✅ Consolidação R${rodada} concluída`);
    } catch (error) {
        console.error("[SCHEDULER] ❌ Erro na consolidação automática:", error);
    }
}

// Garante que uma rodada específica está consolidada
async function garantirRodadaConsolidada(rodada) {
    try {
        const ligas = await Liga.find({}).select("_id").lean();

        for (const liga of ligas) {
            const existente = await RodadaSnapshot.findOne({
                liga_id: liga._id.toString(),
                rodada: rodada,
                status: "consolidada",
            }).lean();

            if (!existente) {
                console.log(
                    `[SCHEDULER] ⚠️ Liga ${liga._id} R${rodada} não consolidada, disparando...`,
                );
                await consolidarRodadaAutomatica(rodada);
                break; // Só precisa disparar uma vez
            }
        }
    } catch (error) {
        console.error("[SCHEDULER] Erro ao garantir consolidação:", error);
    }
}

// ============================================================================
// 🚀 INICIAR SCHEDULER
// ============================================================================

export function iniciarSchedulerConsolidacao() {
    if (schedulerAtivo) {
        console.log("[SCHEDULER] ⚠️ Scheduler já está ativo");
        return;
    }

    console.log("[SCHEDULER] 🚀 Iniciando scheduler de consolidação...");
    console.log("[SCHEDULER] ⏰ Intervalo: 30 minutos");

    // Executar imediatamente na inicialização
    verificarEConsolidar();

    // Configurar intervalo (30 minutos)
    const INTERVALO = 30 * 60 * 1000; // 30 minutos em ms

    setInterval(verificarEConsolidar, INTERVALO);

    schedulerAtivo = true;
    console.log("[SCHEDULER] ✅ Scheduler ativo!");
}

// ============================================================================
// 🛑 PARAR SCHEDULER (para testes)
// ============================================================================

export function pararSchedulerConsolidacao() {
    schedulerAtivo = false;
    console.log("[SCHEDULER] 🛑 Scheduler desativado");
}

export { verificarEConsolidar, getStatusMercado };
