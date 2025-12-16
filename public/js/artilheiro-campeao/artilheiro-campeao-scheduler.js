// ✅ ARTILHEIRO-CAMPEAO-SCHEDULER.JS v1.1
// Módulo de agendamento automático para atualização do ranking de artilheiros
// v1.1: Adicionada coleta automática de rodadas finalizadas

console.log(
    "⏰ [ARTILHEIRO-SCHEDULER] Módulo de agendamento v1.1 carregando...",
);

const ArtilheiroScheduler = {
    // ===== CONFIGURAÇÕES =====
    config: {
        intervaloMercadoAberto: 30 * 60 * 1000, // 30 minutos quando mercado aberto
        intervaloMercadoFechado: 10 * 60 * 1000, // 10 minutos quando mercado fechado (rodada em andamento)
        intervaloVerificacao: 2 * 60 * 1000, // Verificar mercado a cada 2 minutos
        maxTentativasErro: 3,
        delayEntreErros: 30 * 1000, // 30 segundos entre tentativas após erro
    },

    // ===== ESTADO =====
    estado: {
        ativo: false,
        intervaloId: null,
        verificacaoId: null,
        ultimaAtualizacao: null,
        mercadoAberto: null,
        rodadaAtual: null,
        ultimaRodadaColetada: null, // v1.1: Rastrear última rodada coletada
        errosConsecutivos: 0,
        totalAtualizacoes: 0,
        totalColetas: 0, // v1.1: Contador de coletas
    },

    // ===== INICIAR SCHEDULER =====
    async iniciar() {
        if (this.estado.ativo) {
            console.warn("⚠️ [ARTILHEIRO-SCHEDULER] Já está ativo");
            return;
        }

        console.log("⏰ [ARTILHEIRO-SCHEDULER] Iniciando scheduler...");

        try {
            // Verificar status do mercado primeiro
            await this.verificarMercado();

            // Configurar intervalo baseado no status do mercado
            this.configurarIntervalo();

            // Iniciar verificação periódica do mercado
            this.estado.verificacaoId = setInterval(
                () => this.verificarMercado(),
                this.config.intervaloVerificacao,
            );

            this.estado.ativo = true;
            console.log(
                "✅ [ARTILHEIRO-SCHEDULER] Ativo - atualizando conforme status do mercado",
            );

            // Disparar evento
            this.dispararEvento("scheduler-iniciado", {
                status: this.getStatus(),
            });
        } catch (error) {
            console.error("❌ [ARTILHEIRO-SCHEDULER] Erro ao iniciar:", error);
        }
    },

    // ===== PARAR SCHEDULER =====
    parar() {
        if (!this.estado.ativo) {
            console.warn("⚠️ [ARTILHEIRO-SCHEDULER] Já está parado");
            return;
        }

        console.log("⏹️ [ARTILHEIRO-SCHEDULER] Parando scheduler...");

        if (this.estado.intervaloId) {
            clearInterval(this.estado.intervaloId);
            this.estado.intervaloId = null;
        }

        if (this.estado.verificacaoId) {
            clearInterval(this.estado.verificacaoId);
            this.estado.verificacaoId = null;
        }

        this.estado.ativo = false;
        console.log("✅ [ARTILHEIRO-SCHEDULER] Parado");

        // Disparar evento
        this.dispararEvento("scheduler-parado", { status: this.getStatus() });
    },

    // ===== VERIFICAR STATUS DO MERCADO =====
    async verificarMercado() {
        try {
            console.log(
                "🔍 [ARTILHEIRO-SCHEDULER] Verificando status do mercado...",
            );

            const response = await fetch("/api/cartola/mercado/status");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            const mercadoAnterior = this.estado.mercadoAberto;
            const rodadaAnterior = this.estado.rodadaAtual;

            this.estado.mercadoAberto =
                data.mercado_aberto || data.status_mercado === 1;
            this.estado.rodadaAtual = data.rodada_atual;

            console.log(
                `📊 [ARTILHEIRO-SCHEDULER] Rodada: ${this.estado.rodadaAtual}, Mercado: ${this.estado.mercadoAberto ? "ABERTO" : "FECHADO"}`,
            );

            // Se o status mudou, reconfigurar intervalo
            if (
                mercadoAnterior !== null &&
                mercadoAnterior !== this.estado.mercadoAberto
            ) {
                console.log(
                    "🔄 [ARTILHEIRO-SCHEDULER] Status do mercado mudou, reconfigurando...",
                );
                this.configurarIntervalo();

                // ✅ v1.1: Se mercado acabou de ABRIR, coletar rodada anterior
                if (this.estado.mercadoAberto && !mercadoAnterior) {
                    console.log(
                        "🚀 [ARTILHEIRO-SCHEDULER] Mercado ABRIU! Coletando rodada finalizada...",
                    );
                    await this.coletarRodadaAnterior();
                }

                // Se mercado acabou de fechar, fazer atualização imediata
                if (!this.estado.mercadoAberto) {
                    console.log(
                        "🚀 [ARTILHEIRO-SCHEDULER] Mercado fechou, atualizando dados...",
                    );
                    await this.atualizarArtilheiros();
                }
            }

            this.estado.errosConsecutivos = 0;
        } catch (error) {
            console.error(
                "❌ [ARTILHEIRO-SCHEDULER] Erro ao verificar mercado:",
                error,
            );
            this.estado.errosConsecutivos++;
        }
    },

    // ===== v1.1: COLETAR RODADA ANTERIOR (NOVA FUNÇÃO) =====
    async coletarRodadaAnterior() {
        try {
            const ligaId = this.obterLigaAtual();
            if (!ligaId) {
                console.warn(
                    "⚠️ [ARTILHEIRO-SCHEDULER] Liga não identificada para coleta",
                );
                return;
            }

            // Rodada que acabou = rodada atual - 1
            const rodadaFinalizada = this.estado.rodadaAtual - 1;

            // Evitar coleta duplicada
            if (this.estado.ultimaRodadaColetada === rodadaFinalizada) {
                console.log(
                    `⏭️ [ARTILHEIRO-SCHEDULER] R${rodadaFinalizada} já foi coletada, pulando...`,
                );
                return;
            }

            console.log(
                `📥 [ARTILHEIRO-SCHEDULER] Coletando gols da R${rodadaFinalizada}...`,
            );

            const response = await fetch(
                `/api/artilheiro-campeao/${ligaId}/coletar/${rodadaFinalizada}`,
                { method: "POST" },
            );

            if (response.ok) {
                const data = await response.json();

                this.estado.ultimaRodadaColetada = rodadaFinalizada;
                this.estado.totalColetas++;

                console.log(
                    `✅ [ARTILHEIRO-SCHEDULER] R${rodadaFinalizada} coletada! ${data.resultados?.length || 0} participantes`,
                );

                // Disparar evento
                this.dispararEvento("rodada-coletada", {
                    ligaId,
                    rodada: rodadaFinalizada,
                    resultados: data.resultados,
                    timestamp: new Date(),
                });

                // Atualizar ranking após coleta
                await this.atualizarArtilheiros();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(
                    `❌ [ARTILHEIRO-SCHEDULER] Erro ao coletar R${rodadaFinalizada}:`,
                    errorData.message || response.status,
                );
            }
        } catch (error) {
            console.error(
                "❌ [ARTILHEIRO-SCHEDULER] Erro na coleta automática:",
                error,
            );
        }
    },

    // ===== v1.1: FORÇAR COLETA DE RODADA ESPECÍFICA =====
    async forcarColeta(rodada = null) {
        const ligaId = this.obterLigaAtual();
        if (!ligaId) {
            console.error("❌ [ARTILHEIRO-SCHEDULER] Liga não identificada");
            return;
        }

        const rodadaAlvo = rodada || this.estado.rodadaAtual - 1;

        console.log(
            `🚀 [ARTILHEIRO-SCHEDULER] Forçando coleta da R${rodadaAlvo}...`,
        );

        try {
            const response = await fetch(
                `/api/artilheiro-campeao/${ligaId}/coletar/${rodadaAlvo}`,
                { method: "POST" },
            );

            if (response.ok) {
                const data = await response.json();
                this.estado.ultimaRodadaColetada = rodadaAlvo;
                this.estado.totalColetas++;

                console.log(
                    `✅ [ARTILHEIRO-SCHEDULER] R${rodadaAlvo} coletada manualmente!`,
                );

                return data;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error(
                `❌ [ARTILHEIRO-SCHEDULER] Erro ao coletar R${rodadaAlvo}:`,
                error,
            );
            throw error;
        }
    },

    // ===== CONFIGURAR INTERVALO =====
    configurarIntervalo() {
        // Limpar intervalo anterior
        if (this.estado.intervaloId) {
            clearInterval(this.estado.intervaloId);
        }

        // Definir intervalo baseado no status do mercado
        const intervalo = this.estado.mercadoAberto
            ? this.config.intervaloMercadoAberto
            : this.config.intervaloMercadoFechado;

        console.log(
            `⏱️ [ARTILHEIRO-SCHEDULER] Intervalo: ${intervalo / 60000} minutos`,
        );

        this.estado.intervaloId = setInterval(
            () => this.executarCiclo(),
            intervalo,
        );
    },

    // ===== EXECUTAR CICLO DE ATUALIZAÇÃO =====
    async executarCiclo() {
        if (!this.estado.ativo) return;

        try {
            console.log(
                "🔄 [ARTILHEIRO-SCHEDULER] Executando ciclo de atualização...",
            );

            // Verificar se deve continuar após muitos erros
            if (
                this.estado.errosConsecutivos >= this.config.maxTentativasErro
            ) {
                console.warn(
                    "⚠️ [ARTILHEIRO-SCHEDULER] Muitos erros consecutivos, aguardando...",
                );
                await this.delay(this.config.delayEntreErros);
                this.estado.errosConsecutivos = 0;
            }

            await this.atualizarArtilheiros();
        } catch (error) {
            console.error("❌ [ARTILHEIRO-SCHEDULER] Erro no ciclo:", error);
            this.estado.errosConsecutivos++;
        }
    },

    // ===== ATUALIZAR ARTILHEIROS =====
    async atualizarArtilheiros() {
        console.log(
            "🔄 [ARTILHEIRO-SCHEDULER] Atualizando ranking de artilheiros...",
        );

        try {
            // Obter liga atual
            const ligaId = this.obterLigaAtual();
            if (!ligaId) {
                console.warn("⚠️ [ARTILHEIRO-SCHEDULER] Liga não identificada");
                return;
            }

            // Limpar cache local
            const cacheKey = `artilheiro_${ligaId}`;
            localStorage.removeItem(cacheKey);

            // Verificar se o coordenador existe
            if (
                window.coordinator &&
                typeof window.coordinator.popularGols === "function"
            ) {
                // Usar o coordenador existente
                await window.coordinator.popularGols();

                this.estado.ultimaAtualizacao = new Date();
                this.estado.totalAtualizacoes++;
                this.estado.errosConsecutivos = 0;

                console.log(
                    "✅ [ARTILHEIRO-SCHEDULER] Ranking atualizado via coordenador",
                );

                // Disparar evento
                this.dispararEvento("artilheiros-atualizados", {
                    ligaId,
                    timestamp: this.estado.ultimaAtualizacao,
                    totalAtualizacoes: this.estado.totalAtualizacoes,
                });
            } else {
                // Fallback: buscar via API
                console.log(
                    "📡 [ARTILHEIRO-SCHEDULER] Coordenador não disponível, usando API...",
                );

                const rodadaFim = this.estado.rodadaAtual
                    ? this.estado.rodadaAtual - 1
                    : 14;
                const response = await fetch(
                    `/api/artilheiro-campeao/${ligaId}/ranking?inicio=1&fim=${rodadaFim}`,
                );

                if (response.ok) {
                    const data = await response.json();

                    // Armazenar dados no cache
                    localStorage.setItem(
                        cacheKey,
                        JSON.stringify({
                            data: data.data,
                            timestamp: Date.now(),
                        }),
                    );

                    this.estado.ultimaAtualizacao = new Date();
                    this.estado.totalAtualizacoes++;
                    this.estado.errosConsecutivos = 0;

                    console.log(
                        "✅ [ARTILHEIRO-SCHEDULER] Ranking atualizado via API",
                    );

                    // Disparar evento para atualizar UI
                    this.dispararEvento("artilheiros-atualizados", {
                        ligaId,
                        data: data.data,
                        timestamp: this.estado.ultimaAtualizacao,
                    });
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            }
        } catch (error) {
            console.error(
                "❌ [ARTILHEIRO-SCHEDULER] Erro ao atualizar:",
                error,
            );
            this.estado.errosConsecutivos++;
            throw error;
        }
    },

    // ===== FORÇAR ATUALIZAÇÃO =====
    async forcarAtualizacao() {
        console.log("🚀 [ARTILHEIRO-SCHEDULER] Forçando atualização...");

        try {
            await this.atualizarArtilheiros();
            console.log(
                "✅ [ARTILHEIRO-SCHEDULER] Atualização forçada concluída",
            );
        } catch (error) {
            console.error(
                "❌ [ARTILHEIRO-SCHEDULER] Erro na atualização forçada:",
                error,
            );
        }
    },

    // ===== OBTER LIGA ATUAL =====
    obterLigaAtual() {
        // 1. Tentar do coordenador
        if (window.coordinator?.ligaId) {
            return window.coordinator.ligaId;
        }

        // 2. Tentar da URL (v2.0: adiciona "id" como primeira opção)
        const urlParams = new URLSearchParams(window.location.search);
        const ligaUrl = urlParams.get("id") || urlParams.get("liga") || urlParams.get("ligaId");
        if (ligaUrl) return ligaUrl;

        // 3. Tentar do localStorage
        const ligaStorage =
            localStorage.getItem("ligaAtual") ||
            localStorage.getItem("liga_atual");
        if (ligaStorage) return ligaStorage;

        // 4. Tentar de variável global
        if (window.ligaAtual) return window.ligaAtual;

        // 5. v2.0: Sem fallback hardcoded - retorna null
        console.warn("[ARTILHEIRO-SCHEDULER] ⚠️ Liga ID não encontrado");
        return null;
    },

    // ===== OBTER STATUS =====
    getStatus() {
        return {
            ativo: this.estado.ativo,
            mercadoAberto: this.estado.mercadoAberto,
            rodadaAtual: this.estado.rodadaAtual,
            ultimaAtualizacao: this.estado.ultimaAtualizacao,
            ultimaRodadaColetada: this.estado.ultimaRodadaColetada, // v1.1
            totalAtualizacoes: this.estado.totalAtualizacoes,
            totalColetas: this.estado.totalColetas, // v1.1
            errosConsecutivos: this.estado.errosConsecutivos,
            intervaloAtual: this.estado.mercadoAberto
                ? `${this.config.intervaloMercadoAberto / 60000} min (mercado aberto)`
                : `${this.config.intervaloMercadoFechado / 60000} min (mercado fechado)`,
        };
    },

    // ===== DISPARAR EVENTO =====
    dispararEvento(nome, dados) {
        const evento = new CustomEvent(`artilheiro-scheduler:${nome}`, {
            detail: dados,
            bubbles: true,
        });
        document.dispatchEvent(evento);
    },

    // ===== UTILIDADE: DELAY =====
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },

    // ===== ATUALIZAR BADGE DE STATUS =====
    atualizarBadgeStatus() {
        const badge = document.getElementById("artilheiro-status-badge");
        if (!badge) return;

        if (this.estado.ultimaAtualizacao) {
            const agora = new Date();
            const diff = Math.floor(
                (agora - this.estado.ultimaAtualizacao) / 1000,
            );

            let texto;
            if (diff < 60) {
                texto = `Atualizado há ${diff}s`;
            } else if (diff < 3600) {
                texto = `Atualizado há ${Math.floor(diff / 60)}min`;
            } else {
                texto = `Atualizado há ${Math.floor(diff / 3600)}h`;
            }

            badge.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 2px 8px; background: ${this.estado.mercadoAberto ? "#28a745" : "#dc3545"}; color: white; border-radius: 10px;">
                    <span style="width: 6px; height: 6px; background: white; border-radius: 50%; animation: pulse 2s infinite;"></span>
                    ${this.estado.mercadoAberto ? "Mercado Aberto" : "AO VIVO"} - ${texto}
                </span>
            `;
        }
    },
};

// ===== DISPONIBILIZAR GLOBALMENTE =====
if (typeof window !== "undefined") {
    window.ArtilheiroScheduler = ArtilheiroScheduler;

    // Atualizar badge a cada 10 segundos
    setInterval(() => {
        if (ArtilheiroScheduler.estado.ativo) {
            ArtilheiroScheduler.atualizarBadgeStatus();
        }
    }, 10000);
}

// ===== AUTO-INICIAR QUANDO PÁGINA CARREGAR =====
document.addEventListener("DOMContentLoaded", () => {
    // Verificar se estamos na página de artilheiro
    const container =
        document.getElementById("artilheiro-container") ||
        document.getElementById("artilheiro-campeao-content");

    if (container) {
        console.log(
            "🎯 [ARTILHEIRO-SCHEDULER] Container detectado, aguardando inicialização do coordenador...",
        );

        // Aguardar coordenador inicializar
        setTimeout(() => {
            if (window.coordinator) {
                ArtilheiroScheduler.iniciar();
            } else {
                console.log(
                    "⏳ [ARTILHEIRO-SCHEDULER] Aguardando coordenador...",
                );

                // Tentar novamente em 2 segundos
                setTimeout(() => {
                    ArtilheiroScheduler.iniciar();
                }, 2000);
            }
        }, 1000);
    }
});

console.log("✅ [ARTILHEIRO-SCHEDULER] Módulo v1.1 carregado");
console.log(
    "💡 Comandos: ArtilheiroScheduler.iniciar(), .parar(), .forcarAtualizacao(), .forcarColeta(rodada), .getStatus()",
);

export default ArtilheiroScheduler;
