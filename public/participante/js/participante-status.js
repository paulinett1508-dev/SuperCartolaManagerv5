// PARTICIPANTE STATUS - Sistema de Verificação de Conectividade

if (window.Log)
    Log.info("PARTICIPANTE-STATUS", "Carregando sistema de status...");

class ParticipanteStatus {
    constructor() {
        this.statusIndicador = null;
        this.statusTexto = null;
        this.verificandoStatus = false;
        this.tentativasFalhadas = 0;
        this.maxTentativasFalhadas = 3;
        this.intervaloVerificacao = 30000; // 30 segundos
        this.timeoutVerificacao = 5000; // 5 segundos timeout
        this.timerId = null;
    }

    inicializar() {
        this.statusIndicador = document.getElementById("statusIndicador");
        this.statusTexto = document.getElementById("statusTexto");

        if (!this.statusIndicador || !this.statusTexto) {
            if (window.Log)
                Log.warn(
                    "PARTICIPANTE-STATUS",
                    "Elementos de status não encontrados no DOM",
                );
            return;
        }

        // Verificação inicial após delay para garantir que a página carregou
        setTimeout(() => {
            this.verificarStatus();
        }, 2000);

        // Verificações periódicas
        this.iniciarVerificacoesPeriodicas();

        // Listener para mudanças de conectividade do navegador
        window.addEventListener("online", () => this.marcarOnline());
        window.addEventListener("offline", () => this.marcarOffline());
    }

    iniciarVerificacoesPeriodicas() {
        // Limpar timer anterior se existir
        if (this.timerId) {
            clearInterval(this.timerId);
        }

        // Verificar a cada 30 segundos
        this.timerId = setInterval(() => {
            this.verificarStatus();
        }, this.intervaloVerificacao);
    }

    async verificarStatus() {
        // Evitar múltiplas verificações simultâneas
        if (this.verificandoStatus) {
            return;
        }

        this.verificandoStatus = true;

        try {
            // Usar HEAD request para ser mais leve
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                this.timeoutVerificacao,
            );

            const response = await fetch("/api/participante/auth/session", {
                method: "HEAD",
                credentials: "include",
                signal: controller.signal,
                cache: "no-store",
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.tentativasFalhadas = 0;
                this.marcarOnline();
            } else {
                this.tentativasFalhadas++;

                // Só marcar offline após múltiplas falhas
                if (this.tentativasFalhadas >= this.maxTentativasFalhadas) {
                    this.marcarOffline();
                }
            }
        } catch (error) {
            // Ignorar erros de abort (timeout)
            if (error.name === "AbortError") {
                if (window.Log)
                    Log.warn(
                        "PARTICIPANTE-STATUS",
                        "Timeout na verificação de status",
                    );
            } else {
                if (window.Log)
                    Log.warn(
                        "PARTICIPANTE-STATUS",
                        "Erro na verificação:",
                        error.message,
                    );
            }

            this.tentativasFalhadas++;

            // Só marcar offline após múltiplas falhas
            if (this.tentativasFalhadas >= this.maxTentativasFalhadas) {
                this.marcarOffline();
            }
        } finally {
            this.verificandoStatus = false;
        }
    }

    marcarOnline() {
        if (!this.statusIndicador || !this.statusTexto) return;

        if (window.Log) Log.debug("PARTICIPANTE-STATUS", "🟢 Online");
        this.statusIndicador.style.background = "var(--app-success-light)";
        this.statusTexto.textContent = "Online";
        this.statusTexto.style.color = "var(--app-success-light)";
    }

    marcarOffline() {
        if (!this.statusIndicador || !this.statusTexto) return;

        if (window.Log) Log.warn("PARTICIPANTE-STATUS", "🔴 Offline");
        this.statusIndicador.style.background = "var(--app-danger)";
        this.statusTexto.textContent = "Offline";
        this.statusTexto.style.color = "var(--app-danger)";
    }

    destruir() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        window.removeEventListener("online", () => this.marcarOnline());
        window.removeEventListener("offline", () => this.marcarOffline());
    }
}

// Instância global
const participanteStatus = new ParticipanteStatus();

// Inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        participanteStatus.inicializar();
    });
} else {
    participanteStatus.inicializar();
}

if (window.Log) Log.info("PARTICIPANTE-STATUS", "✅ Sistema carregado");
