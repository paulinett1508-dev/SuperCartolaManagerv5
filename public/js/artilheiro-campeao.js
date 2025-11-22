console.log("🏆 [ARTILHEIRO-CAMPEAO] Sistema modular carregando...");

// ===== IMPORTAÇÕES MODULARES =====
// Mantenha a arquitetura segmentada que você já tem
import { ArtilheiroCache } from "./artilheiro-campeao/artilheiro-campeao-cache.js";
import { ArtilheiroCore } from "./artilheiro-campeao/artilheiro-campeao-core.js";
import { ArtilheiroUI } from "./artilheiro-campeao/artilheiro-campeao-ui.js";
import { ArtilheiroUtils } from "./artilheiro-campeao/artilheiro-campeao-utils.js";
import { RodadaDetector } from "./artilheiro-campeao/rodada-detector.js";

// ===== CONFIGURAÇÕES =====
const CONFIG = {
    ligaId: "684d821cf1a7ae16d1f89572",
    endpoints: {
        // Usar backend como proxy para contornar CORS
        mercadoStatus: "/api/cartola/mercado/status",
        timeRodada: "/api/cartola/time/{timeId}/{rodada}",
        participantes: "/api/ligas/{ligaId}/times",
        // Backend otimizado se disponível
        backendOptimizado:
            "/api/artilheiro-campeao/{ligaId}/gols/{timeId}/{rodada}",
    },
};

// ===== COORDENADOR PRINCIPAL =====
class ArtilheiroCoordinator {
    constructor() {
        this.cache = null;
        this.core = null;
        this.ui = null;
        this.detector = null;
        this.dados = [];
        this.processando = false;
        this.rodadaAtual = 15;
        this.rodadaFim = 14;
    }

    async inicializar() {
        console.log("🚀 [COORDENADOR] Inicializando sistema modular...");

        try {
            // Inicializar módulos
            this.cache = ArtilheiroCache;
            this.core = ArtilheiroCore;
            this.ui = ArtilheiroUI;
            this.detector = RodadaDetector;

            // Detectar rodada atual
            await this.detectarRodadaAtual();

            // Renderizar interface inicial
            this.atualizarInterface();

            console.log("✅ [COORDENADOR] Sistema modular inicializado!");
        } catch (error) {
            console.error("❌ [COORDENADOR] Erro na inicialização:", error);
            this.ui.mostrarErro("Erro ao inicializar sistema", error.message);
        }
    }

    async detectarRodadaAtual() {
        try {
            console.log("🔍 [COORDENADOR] Detectando rodada atual...");

            const rodadaInfo = await this.detector.detectar(CONFIG.ligaId);
            this.rodadaAtual = rodadaInfo.rodadaAtual;
            this.rodadaFim = Math.max(1, this.rodadaAtual - 1);

            console.log(
                `✅ Rodada detectada: ${this.rodadaAtual} (processando até: ${this.rodadaFim})`,
            );
        } catch (error) {
            console.warn(
                "⚠️ [COORDENADOR] Erro na detecção, usando padrão:",
                error.message,
            );
            // Manter valores padrão
        }
    }

    async popularGols() {
        if (this.processando) return;

        try {
            this.processando = true;

            this.ui.mostrarLoading("Iniciando processamento...");

            // 1. Buscar participantes
            const participantes = await this.buscarParticipantes();

            // 2. Processar dados via core
            this.ui.mostrarLoading("Extraindo dados via backend proxy...", {
                atual: 0,
                total: participantes.length,
                porcentagem: 0,
            });

            const resultados = await this.core.processarParticipantes(
                participantes,
                this.rodadaFim,
                (atual, total) => {
                    const porcentagem = Math.round((atual / total) * 100);
                    this.ui.mostrarLoading(
                        `Processando ${participantes[atual - 1]?.nome_cartoleiro || "participante"}... (${atual}/${total})`,
                        { atual, total, porcentagem },
                    );
                },
            );

            // 3. Calcular ranking
            this.dados = this.core.calcularRanking(resultados);

            // 4. Renderizar resultado
            this.atualizarInterface();

            console.log(
                `✅ [COORDENADOR] Processamento concluído: ${this.dados.length} participantes`,
            );
        } catch (error) {
            console.error("❌ [COORDENADOR] Erro no processamento:", error);
            this.ui.mostrarErro("Erro ao processar dados", error.message);
        } finally {
            this.processando = false;
        }
    }

    async buscarParticipantes() {
        const estrategias = [
            `/api/ligas/${CONFIG.ligaId}/times`,
            `/api/ligas/${CONFIG.ligaId}/participantes`,
            `/api/ligas/${CONFIG.ligaId}`,
        ];

        for (const url of estrategias) {
            try {
                console.log(`📡 [COORDENADOR] Tentando: ${url}`);
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    let participantes = Array.isArray(data)
                        ? data
                        : data.times || data.participantes || [];

                    if (participantes.length > 0) {
                        return participantes.map((p) => ({
                            timeId: p.time_id || p.timeId || p.id,
                            nome_cartoleiro:
                                p.nome_cartoleiro ||
                                p.nome_cartola ||
                                p.nome ||
                                `Participante ${p.id}`,
                            nome_time: p.nome_time || p.time || `Time ${p.id}`,
                            url_escudo_png:
                                p.url_escudo_png || p.escudo || null,
                            clube_id: p.clube_id || null,
                        }));
                    }
                }
            } catch (error) {
                console.warn(
                    `⚠️ [COORDENADOR] Estratégia ${url} falhou:`,
                    error.message,
                );
            }
        }

        throw new Error("Nenhum participante encontrado na liga");
    }

    atualizarInterface() {
        const container = this.obterContainer();
        if (!container) return;

        if (!this.dados || this.dados.length === 0) {
            container.innerHTML = this.renderizarInterfaceInicial();
        } else {
            const estatisticas = this.calcularEstatisticas();
            this.ui.renderizarInterface(this.dados, estatisticas, {
                rodadaAtual: this.rodadaAtual,
                rodadaFim: this.rodadaFim,
            });
        }

        this.ui.esconderLoading();
        console.log("✅ [COORDENADOR] Interface atualizada");
    }

    renderizarInterfaceInicial() {
        return `
            <div style="text-align: center; padding: 40px; background: #fff3cd; border-radius: 8px; color: #856404;">
                <h3>📊 Carregue os Dados do Artilheiro Campeão</h3>
                <p>Sistema modular com backend proxy para contornar limitações CORS.</p>
                <button onclick="coordinator.popularGols()" class="btn btn-success" style="padding: 12px 24px; font-size: 16px;">
                    🚀 Extrair Dados da API
                </button>
                <div class="info-box" style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-left: 4px solid #007bff; border-radius: 4px;">
                    <strong>ℹ️ Sistema Modular:</strong><br>
                    • Cache inteligente para performance<br>
                    • Processamento via backend proxy<br>
                    • Interface otimizada e responsiva<br>
                    • Processamento até a ${this.rodadaFim}ª rodada
                </div>
            </div>
        `;
    }

    calcularEstatisticas() {
        if (!this.dados || this.dados.length === 0) {
            return {
                totalGolsPro: 0,
                totalGolsContra: 0,
                totalSaldo: 0,
                participantesAtivos: 0,
                mediaGolsPorParticipante: 0,
            };
        }

        const totalGolsPro = this.dados.reduce((s, p) => s + p.golsPro, 0);
        const totalGolsContra = this.dados.reduce(
            (s, p) => s + p.golsContra,
            0,
        );
        const participantesAtivos = this.dados.filter(
            (p) => p.golsPro > 0 || p.golsContra > 0,
        ).length;

        return {
            totalGolsPro,
            totalGolsContra,
            totalSaldo: totalGolsPro - totalGolsContra,
            participantesAtivos,
            mediaGolsPorParticipante:
                participantesAtivos > 0
                    ? (totalGolsPro / participantesAtivos).toFixed(2)
                    : 0,
        };
    }

    exportarDados() {
        if (!this.dados || this.dados.length === 0) {
            alert(
                "📊 Nenhum dado para exportar! Execute o processamento primeiro.",
            );
            return;
        }

        const csvContent = [
            [
                "Posição",
                "Cartoleiro",
                "Time",
                "Gols Pró",
                "Gols Contra",
                "Saldo",
                "Rodadas Processadas",
            ],
            ...this.dados.map((p) => [
                p.posicao,
                p.nomeCartoleiro,
                p.nomeTime,
                p.golsPro,
                p.golsContra,
                p.saldoGols,
                this.rodadaFim,
            ]),
        ]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `artilheiro_campeao_modular_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        console.log("✅ [COORDENADOR] Exportação concluída!");
    }

    mostrarDetalhesCompletos(index) {
        if (this.ui && this.dados[index]) {
            this.ui.mostrarDetalhesCompletos(this.dados[index], index);
        }
    }

    obterContainer() {
        const containers = [
            "artilheiro-container",
            "artilheiro-campeao-content",
        ];

        for (const containerId of containers) {
            const container = document.getElementById(containerId);
            if (container) return container;
        }

        console.error("❌ [COORDENADOR] Nenhum container encontrado");
        return null;
    }
}

// ===== INSTÂNCIA GLOBAL DO COORDENADOR =====
let coordinator = null;

// ===== FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO =====
async function inicializarArtilheiroCampeao() {
    console.log("🚀 [ARTILHEIRO-CAMPEAO] Inicializando sistema modular...");

    try {
        // Criar coordenador se não existir
        if (!coordinator) {
            coordinator = new ArtilheiroCoordinator();
        }

        // Inicializar sistema
        await coordinator.inicializar();

        console.log(
            "✅ [ARTILHEIRO-CAMPEAO] Sistema modular inicializado com sucesso!",
        );
    } catch (error) {
        console.error("❌ [ARTILHEIRO-CAMPEAO] Erro na inicialização:", error);
    }
}

// ✅ DISPONIBILIZAR GLOBALMENTE
if (typeof window !== "undefined") {
  window.ArtilheiroCoordinator = ArtilheiroCoordinator;
  window.inicializarArtilheiroCampeao = inicializarArtilheiroCampeao;
  window.forcarArtilheiroCampeaoAgora = forcarArtilheiroCampeaoAgora;
  window.testarArtilheiroCampeao = testarArtilheiroCampeao;

  console.log('✅ [ARTILHEIRO-CAMPEAO] Função inicializarArtilheiroCampeao disponível em window');
}

console.log("✅ [ARTILHEIRO-CAMPEAO] Módulo principal carregado!");
console.log(
  "📋 [ARTILHEIRO-CAMPEAO] Funções disponíveis: window.inicializarArtilheiroCampeao, window.ArtilheiroCoordinator, window.forcarArtilheiroCampeaoAgora, window.testarArtilheiroCampeao",
);

export { ArtilheiroCoordinator, inicializarArtilheiroCampeao };
export default ArtilheiroCoordinator;

console.log("✅ [ARTILHEIRO-CAMPEAO] Sistema modular carregado!");
console.log("🆘 Em caso de erro: window.forcarArtilheiroCampeaoAgora()");

// ========================================
// SISTEMA DE REGISTRO COMPATÍVEL
// ========================================

(function registroCompativel() {
    console.log(
        "🔧 [ARTILHEIRO-CAMPEAO] Sistema de registro compatível iniciado...",
    );

    function tentarRegistrarModulo() {
        if (window.modulosCarregados) {
            window.modulosCarregados["artilheiro-campeao"] = {
                inicializarArtilheiroCampeao: inicializarArtilheiroCampeao,
            };
            console.log(
                "✅ [ARTILHEIRO-CAMPEAO] Registrado em window.modulosCarregados",
            );
            return true;
        }
        return false;
    }

    tentarRegistrarModulo();

    let tentativas = 0;
    const maxTentativas = 10;

    const intervalId = setInterval(() => {
        tentativas++;

        if (tentarRegistrarModulo() || tentativas >= maxTentativas) {
            clearInterval(intervalId);

            if (tentativas >= maxTentativas) {
                console.warn(
                    "⚠️ [ARTILHEIRO-CAMPEAO] Sistema de módulos não encontrado",
                );
            }
        }
    }, 500);

    console.log("✅ [ARTILHEIRO-CAMPEAO] Sistema de registro compatível ativo");
})();

console.log(
    "📤 [ARTILHEIRO-CAMPEAO] Exportações ES6 adicionadas para compatibilidade",
);

if (typeof window.modulosCarregados === "undefined") {
    console.info("ℹ️ [ARTILHEIRO-CAMPEAO] Sistema de módulos carregando...");
}