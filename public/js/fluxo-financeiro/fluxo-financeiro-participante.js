// FLUXO-FINANCEIRO-PARTICIPANTE.JS
// ⚠️ IMPORTANTE: Este módulo é 100% READ-ONLY
// - NÃO cria dados próprios
// - NÃO modifica configurações
// - Apenas VISUALIZA dados criados pelo ADMIN
// - Toda alimentação vem do modo ADMIN via API

import { FluxoFinanceiroCore } from "./fluxo-financeiro-core.js";
import { FluxoFinanceiroUI } from "./fluxo-financeiro-ui.js";
import { FluxoFinanceiroCache } from "./fluxo-financeiro-cache.js";

console.log(
    "[FLUXO-PARTICIPANTE] 📦 Módulo carregado (READ-ONLY, sem vida própria)",
);

class FluxoFinanceiroParticipante {
    constructor() {
        this.cache = null;
        this.core = null;
        this.ui = null;
        this.participanteData = null;
        this.isInitialized = false;
    }

    async inicializar(participanteData) {
        if (this.isInitialized) {
            console.log(
                "[FLUXO-PARTICIPANTE] Já inicializado, reutilizando instância",
            );
            return;
        }

        console.log(
            "[FLUXO-PARTICIPANTE] Inicializando para participante:",
            participanteData,
        );

        this.participanteData = participanteData;

        // Validar dados obrigatórios
        if (!participanteData.ligaId || !participanteData.timeId) {
            throw new Error(
                "Dados do participante incompletos (ligaId ou timeId faltando)",
            );
        }

        // Inicializar componentes
        this.cache = new FluxoFinanceiroCache();
        await this.cache.inicializar(participanteData.ligaId);

        this.core = new FluxoFinanceiroCore(this.cache);
        this.ui = new FluxoFinanceiroUI();

        this.isInitialized = true;
        console.log("[FLUXO-PARTICIPANTE] ✅ Inicialização completa");
    }

    async carregarExtrato() {
        if (!this.isInitialized) {
            throw new Error(
                "Módulo não inicializado. Chame inicializar() primeiro.",
            );
        }

        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) {
            throw new Error("Container #fluxoFinanceiroContent não encontrado");
        }

        console.log(
            "[FLUXO-PARTICIPANTE] Carregando extrato para time:",
            this.participanteData.timeId,
        );

        // Mostrar loading
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                            border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 20px; color: var(--text-primary);">Carregando seu extrato financeiro...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;

        try {
            // Buscar rodada atual
            const mercadoStatus = await fetch("/api/cartola/mercado-status");
            const mercadoData = await mercadoStatus.json();
            const rodadaAtual = mercadoData.rodada_atual || 1;
            const ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);

            // Buscar dados do participante
            const participantes = await this.cache.carregarParticipantes();
            const participante = participantes.find(
                (p) =>
                    String(p.time_id || p.id) ===
                    String(this.participanteData.timeId),
            );

            if (!participante) {
                throw new Error("Participante não encontrado na liga");
            }

            // Calcular extrato
            const extrato = await this.core.calcularExtratoFinanceiro(
                this.participanteData.timeId,
                ultimaRodadaCompleta,
            );

            // Renderizar
            await this.ui.renderizarExtratoFinanceiro(extrato, participante);

            console.log(
                "[FLUXO-PARTICIPANTE] ✅ Extrato renderizado com sucesso",
            );
        } catch (error) {
            console.error(
                "[FLUXO-PARTICIPANTE] ❌ Erro ao carregar extrato:",
                error,
            );
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); 
                            border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <div style="font-size: 48px; margin-bottom: 16px;"><span class="material-icons" style="font-size: 48px; color: #f59e0b;">warning</span></div>
                    <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar Extrato</h3>
                    <p style="color: #e0e0e0;">${error.message}</p>
                    <button onclick="window.location.reload()" 
                            style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%); 
                                   color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <span class="material-icons" style="font-size: 14px; vertical-align: middle;">refresh</span> Recarregar Página
                    </button>
                </div>
            `;
        }
    }

    async atualizarExtrato() {
        if (!this.isInitialized) {
            console.warn(
                "[FLUXO-PARTICIPANTE] Tentativa de atualizar sem inicializar",
            );
            return;
        }

        console.log("[FLUXO-PARTICIPANTE] 🔄 Forçando atualização do extrato");
        await this.carregarExtrato();
    }

    // ===== MÉTODO PARA RETORNAR DADOS SEM RENDERIZAÇÃO =====
    async buscarExtratoCalculado(ligaId, timeId, rodadaAtual, forcar = false) {
        console.log(
            "═══════════════════════════════════════════════════════════════",
        );
        console.log("[TESTE-CACHE] 🎯 INICIANDO BUSCA DE EXTRATO");
        console.log(
            `[TESTE-CACHE] 📊 Time: ${timeId} | Rodada: ${rodadaAtual}`,
        );
        console.log(
            `[TESTE-CACHE] 🔄 Forçar Recálculo: ${forcar ? "SIM" : "NÃO"}`,
        );
        console.log(
            "═══════════════════════════════════════════════════════════════",
        );

        const inicio = performance.now();

        try {
            // 1️⃣ SE NÃO FORÇAR, TENTAR BUSCAR CACHE PRIMEIRO
            if (!forcar) {
                console.log("[TESTE-CACHE] 🔍 Verificando cache existente...");
                const cacheResponse = await fetch(
                    `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                );

                if (cacheResponse.ok) {
                    const cacheData = await cacheResponse.json();

                    if (cacheData.cached && cacheData.data) {
                        console.log(
                            "┌─────────────────────────────────────────────────────────────┐",
                        );
                        console.log(
                            "│ ⚡ CACHE ENCONTRADO - USANDO DADOS SALVOS!                  │",
                        );
                        console.log(
                            "└─────────────────────────────────────────────────────────────┘",
                        );

                        console.log("[TESTE-CACHE] 🔍 Estrutura recebida:", {
                            temRodadas: !!cacheData.rodadas,
                            qtdRodadas: cacheData.rodadas?.length || 0,
                            primeiraRodada: cacheData.rodadas?.[0],
                            temResumo: !!cacheData.resumo,
                            saldo: cacheData.resumo?.saldo,
                        });

                        const tempoFim = performance.now();
                        console.log(
                            `[TESTE-CACHE] ⚡ Tempo de resposta: ${(tempoFim - tempoInicio).toFixed(2)}ms`,
                        );
                        console.log(
                            "═══════════════════════════════════════════════════════════════",
                        );

                        // ✅ Normalizar estrutura de retorno
                        return {
                            rodadas:
                                cacheData.data.historico_transacoes ||
                                cacheData.data,
                            resumo: {
                                saldo_final:
                                    cacheData.resumo?.saldo_final ||
                                    cacheData.data?.saldo_consolidado ||
                                    0,
                                ganhos:
                                    cacheData.resumo?.ganhos ||
                                    cacheData.data?.ganhos_consolidados ||
                                    0,
                                perdas:
                                    cacheData.resumo?.perdas ||
                                    cacheData.data?.perdas_consolidadas ||
                                    0,
                            },
                        };
                    }
                }
            }

            // 2️⃣ SE NÃO TIVER CACHE, VERIFICAR STATUS DO MERCADO
            console.log(
                "[TESTE-CACHE] 🔍 Cache não encontrado, verificando mercado...",
            );
            const statusMercado = await fetch(
                "/api/cartola/mercado/status",
            ).then((r) => r.json());
            const mercadoAberto = statusMercado.status_mercado === 1;
            const rodadaAtualCartola = statusMercado.rodada_atual;

            console.log(
                `[TESTE-CACHE] 📡 Mercado: ${mercadoAberto ? "🟢 ABERTO" : "🔴 FECHADO"}`,
            );
            console.log(
                `[TESTE-CACHE] 🎲 Rodada Atual Cartola: ${rodadaAtualCartola}`,
            );

            // ✅ VALIDAR CACHE EXISTENTE (se não forçar recálculo)
            let validacaoData = null;
            if (!forcar) {
                const validacaoResponse = await fetch(
                    `/api/extrato-cache/${ligaId}/times/${timeId}/validar?rodadaAtual=${rodadaAtual}&mercadoAberto=${mercadoAberto}`,
                );
                if (validacaoResponse.ok) {
                    validacaoData = await validacaoResponse.json();
                }
            }

            // 3️⃣ SE CACHE VÁLIDO → RETORNAR IMEDIATAMENTE
            if (
                !forcar &&
                validacaoData?.valido === true &&
                validacaoData?.cached
            ) {
                console.log(
                    "┌─────────────────────────────────────────────────────────────┐",
                );
                console.log(
                    "│ ⚡ CACHE RECENTE VÁLIDO!                                     │",
                );
                console.log(
                    `│ ⏱️  TTL restante: ${validacaoData.ttlRestante || "N/D"}s              │`,
                );
                console.log(
                    "└─────────────────────────────────────────────────────────────┘",
                );

                const fim = performance.now();
                console.log(
                    `[TESTE-CACHE] ⚡ Tempo de resposta: ${(fim - inicio).toFixed(2)}ms`,
                );
                console.log(
                    "═══════════════════════════════════════════════════════════════",
                );

                // ✅ RETORNAR DADOS DO CACHE DIRETAMENTE
                return {
                    rodadas: validacaoData.rodadas || [],
                    resumo: {
                        saldo_final: validacaoData.resumo?.saldo || 0,
                        ganhos: validacaoData.resumo?.totalGanhos || 0,
                        perdas: validacaoData.resumo?.totalPerdas || 0,
                    },
                };
            }

            // 4️⃣ SE NENHUM CACHE VÁLIDO → CALCULAR E SALVAR
            console.log("[TESTE-CACHE] 🧮 Iniciando cálculo completo...");
            const inicioCalculo = performance.now();

            const extratoCompleto = await this.core.calcularExtratoFinanceiro(
                timeId,
                rodadaAtual,
                forcar,
            );

            const fimCalculo = performance.now();
            console.log(
                `[TESTE-CACHE] ⏱️  Tempo de cálculo: ${(fimCalculo - inicioCalculo).toFixed(2)}ms`,
            );

            // Salvar no cache via API
            try {
                console.log(
                    "[TESTE-CACHE] 💾 Salvando extrato no cache MongoDB...",
                );
                const inicioSave = performance.now();

                // ✅ PAYLOAD CORRETO - enviar rodadas diretamente
                const payload = {
                    historico_transacoes: extratoCompleto.rodadas, // ✅ Array de rodadas
                    ultimaRodadaCalculada: rodadaAtual,
                    motivoRecalculo: "participante_visualizacao",
                    resumo: extratoCompleto.resumo, // ✅ Incluir resumo
                    saldo: extratoCompleto.resumo.saldo_final, // Usar saldo_final do resumo
                };

                console.log("[TESTE-CACHE] 📤 Payload:", {
                    rodadas: payload.historico_transacoes?.length,
                    ultimaRodada: payload.ultimaRodadaCalculada,
                    saldo: payload.saldo,
                });

                await fetch(
                    `/api/extrato-cache/${ligaId}/times/${timeId}/cache`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    },
                );

                const fimSave = performance.now();
                console.log(
                    `[TESTE-CACHE] ✅ Cache salvo em ${(fimSave - inicioSave).toFixed(2)}ms`,
                );
            } catch (saveError) {
                console.warn(
                    "[TESTE-CACHE] ⚠️ Erro ao salvar cache:",
                    saveError.message,
                );
            }

            console.log(
                "═══════════════════════════════════════════════════════════════",
            );
            console.log("[TESTE-CACHE] ✅ EXTRATO FINALIZADO");
            console.log(
                `[TESTE-CACHE] 📊 Total de rodadas: ${extratoCompleto.rodadas?.length || 0}`,
            );
            console.log(
                "═══════════════════════════════════════════════════════════════",
            );

            return extratoCompleto;
        } catch (error) {
            console.error(
                "[FLUXO-PARTICIPANTE] Erro ao buscar extrato:",
                error,
            );
            throw error;
        }
    }
}

// Exportar instância única
export const fluxoFinanceiroParticipante = new FluxoFinanceiroParticipante();

// Expor globalmente para compatibilidade
window.fluxoFinanceiroParticipante = fluxoFinanceiroParticipante;
