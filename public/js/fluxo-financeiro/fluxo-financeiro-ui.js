// ✅ FLUXO-FINANCEIRO-UI.JS - Interface para Fluxo Financeiro
console.log("💰 [FLUXO-FINANCEIRO-UI] Módulo de interface carregando...");

// ===== CONFIGURAÇÕES DE INTERFACE FLUXO FINANCEIRO =====
const FLUXO_UI_CONFIG = {
    classes: {
        container: "fluxo-container",
        table: "fluxo-table",
        header: "table-header-bg",
    },
    spacing: {
        tablePadding: "8px 6px",
        headerPadding: "10px 6px",
    },
};

// ===== CLASSE FLUXO FINANCEIRO UI =====
class FluxoFinanceiroUI {
    constructor() {
        this.version = "1.0.0";
        console.log("[FLUXO-FINANCEIRO-UI] ✅ Instância criada");
    }

    /**
     * Renderiza loading com progresso
     */
    renderizarLoadingComProgresso(titulo, subtitulo) {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container" style="text-align: center; padding: 60px 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px auto; max-width: 800px;">
                <div class="loading-spinner" style="margin: 0 auto 20px; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 24px;">${titulo}</h3>
                <p style="margin: 0 0 30px 0; color: #7f8c8d; font-size: 16px;">${subtitulo}</p>
                <div style="width: 100%; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin-bottom: 15px;">
                    <div id="loading-progress-bar" style="width: 0%; height: 20px; background: linear-gradient(90deg, #3498db, #2ecc71); transition: width 0.3s ease;"></div>
                </div>
                <p style="margin: 0; color: #95a5a6; font-size: 14px;">Isso pode levar alguns instantes...</p>
            </div>
        `;
    }

    /**
     * Renderiza loading simples
     */
    renderizarLoading(mensagem = "Carregando...") {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container" style="text-align: center; padding: 40px 20px; color: #666;">
                <div class="loading-spinner" style="margin: 0 auto 15px; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin: 0; font-size: 16px;">${mensagem}</p>
            </div>
        `;
    }

    /**
     * Limpa containers
     */
    limparContainers() {
        const containers = ["fluxoFinanceiroButtons", "fluxoFinanceiroExportBtnContainer"];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = "";
        });
    }

    /**
     * Renderiza interface principal
     */
    async renderizarInterface() {
        console.log("[FLUXO-FINANCEIRO-UI] 🎨 Renderizando interface...");

        // Importar módulos necessários dinamicamente
        const { FluxoFinanceiroCache } = await import("./fluxo-financeiro-cache.js");

        if (!window.fluxoFinanceiroCache) {
            console.error("[FLUXO-FINANCEIRO-UI] Cache não inicializado");
            return;
        }

        const participantes = window.fluxoFinanceiroCache.getParticipantes();

        if (!participantes || participantes.length === 0) {
            this.mostrarErro("Nenhum participante encontrado para gerar o fluxo financeiro.");
            return;
        }

        // Renderizar botões dos participantes
        this.renderizarBotoesParticipantes(participantes);

        // Renderizar mensagem inicial
        this.renderizarMensagemInicial();
    }

    /**
     * Renderiza botões dos participantes
     */
    renderizarBotoesParticipantes(participantes) {
        const container = document.getElementById("fluxoFinanceiroButtons");
        if (!container) return;

        const botoesHtml = participantes
            .map(participante => `
                <button 
                    class="participant-btn participante-btn" 
                    data-time-id="${participante.time_id || participante.id}"
                    onclick="window.calcularEExibirExtrato && window.calcularEExibirExtrato('${participante.time_id || participante.id}')"
                    style="margin: 4px; padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
                >
                    ${participante.nome_cartola || participante.nome_cartoleiro || participante.nome}
                </button>
            `)
            .join("");

        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h4 style="margin-bottom: 15px;">👥 Selecione um participante para ver o extrato:</h4>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
                    ${botoesHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza mensagem inicial
     */
    renderizarMensagemInicial() {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px auto; max-width: 800px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">💰</div>
                <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 24px;">Fluxo Financeiro da Liga</h3>
                <p style="margin: 0 0 20px 0; color: #7f8c8d; font-size: 16px;">
                    Visualize o extrato financeiro completo de cada participante.
                </p>
                <p style="margin: 0; color: #95a5a6; font-size: 14px;">
                    Clique em um participante acima para ver seu extrato detalhado.
                </p>
            </div>
        `;
    }

    /**
     * Renderiza extrato financeiro
     */
    renderizarExtratoFinanceiro(extrato, participante, callback) {
        console.log("[FLUXO-FINANCEIRO-UI] 📊 Renderizando extrato financeiro...");

        const container = document.getElementById("fluxoFinanceiroContent");
        if (container) {
            container.innerHTML = `
                <div style="padding: 20px;">
                    <h3>💰 Extrato Financeiro - ${participante.nome_cartola}</h3>
                    <p>Saldo Final: R$ ${extrato.resumo.saldo.toFixed(2)}</p>
                    <p>Total de rodadas processadas: ${extrato.rodadas.length}</p>
                </div>
            `;
        }
    }

    /**
     * Renderiza botão de exportação
     */
    renderizarBotaoExportacao(callback) {
        const container = document.getElementById("fluxoFinanceiroExportBtnContainer");
        if (container) {
            container.innerHTML = `
                <button onclick="(${callback.toString()})()" style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    📥 Exportar Extrato
                </button>
            `;
        }
    }

    /**
     * Mostrar erro
     */
    mostrarErro(mensagem) {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                    <h3>Erro no Fluxo Financeiro</h3>
                    <p>${mensagem}</p>
                </div>
            `;
        }
    }

    /**
     * Renderizar resumo financeiro
     */
    _renderizarResumo(dados) {
        const totalEntradas = dados.reduce(
            (acc, item) => acc + (item.entrada || 0),
            0,
        );
        const totalSaidas = dados.reduce(
            (acc, item) => acc + (item.saida || 0),
            0,
        );
        const saldo = totalEntradas - totalSaidas;

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #d4edda, #c3e6cb); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #155724;">R$ ${totalEntradas.toFixed(2)}</div>
                    <div style="font-size: 0.9rem; color: #155724;">💵 Total Entradas</div>
                </div>

                <div style="background: linear-gradient(135deg, #f8d7da, #f5c6cb); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #721c24;">R$ ${totalSaidas.toFixed(2)}</div>
                    <div style="font-size: 0.9rem; color: #721c24;">💸 Total Saídas</div>
                </div>

                <div style="background: linear-gradient(135deg, #cce5ff, #99ccff); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${saldo >= 0 ? "#0c5460" : "#721c24"};">R$ ${saldo.toFixed(2)}</div>
                    <div style="font-size: 0.9rem; color: #0c5460;">📊 Saldo</div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tabela de movimentações
     */
    _renderizarTabela(dados) {
        return `
            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <table class="fluxo-table" style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f4f6fa;">
                        <tr>
                            <th style="${FLUXO_UI_CONFIG.spacing.headerPadding}; text-align: left;">Data</th>
                            <th style="${FLUXO_UI_CONFIG.spacing.headerPadding}; text-align: left;">Descrição</th>
                            <th style="${FLUXO_UI_CONFIG.spacing.headerPadding}; text-align: center;">Entrada</th>
                            <th style="${FLUXO_UI_CONFIG.spacing.headerPadding}; text-align: center;">Saída</th>
                            <th style="${FLUXO_UI_CONFIG.spacing.headerPadding}; text-align: center;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._renderizarLinhasTabela(dados)}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Renderizar linhas da tabela
     */
    _renderizarLinhasTabela(dados) {
        let saldoAcumulado = 0;

        return dados
            .map((item) => {
                saldoAcumulado += (item.entrada || 0) - (item.saida || 0);

                return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="${FLUXO_UI_CONFIG.spacing.tablePadding};">${item.data || "—"}</td>
                    <td style="${FLUXO_UI_CONFIG.spacing.tablePadding};">${item.descricao || "—"}</td>
                    <td style="${FLUXO_UI_CONFIG.spacing.tablePadding}; text-align: center; color: #28a745;">
                        ${item.entrada ? `R$ ${item.entrada.toFixed(2)}` : "—"}
                    </td>
                    <td style="${FLUXO_UI_CONFIG.spacing.tablePadding}; text-align: center; color: #dc3545;">
                        ${item.saida ? `R$ ${item.saida.toFixed(2)}` : "—"}
                    </td>
                    <td style="${FLUXO_UI_CONFIG.spacing.tablePadding}; text-align: center; font-weight: bold; color: ${saldoAcumulado >= 0 ? "#28a745" : "#dc3545"};">
                        R$ ${saldoAcumulado.toFixed(2)}
                    </td>
                </tr>
            `;
            })
            .join("");
    }

    // Renderizar dados do participante
  renderizarDadosParticipante(participante, dadosFinanceiros) {
    console.log("🎨 [FLUXO-UI] Renderizando dados do participante:", participante);
    console.log("🎨 [FLUXO-UI] Dados financeiros:", dadosFinanceiros);

    const container = document.getElementById('fluxoFinanceiroContent');
    if (!container) {
      console.error("❌ [FLUXO-UI] Container não encontrado");
      return;
    }

    if (!participante) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <h4>⚠️ Participante não encontrado</h4>
          <p>Não foi possível carregar os dados deste participante.</p>
        </div>
      `;
      return;
    }

    // Garantir que temos os campos necessários
    const dadosParticipante = {
      nome_cartoleiro: participante.nome_cartoleiro || participante.nome_cartola || 'Nome não disponível',
      nome_time: participante.nome_time || participante.nome || 'Time não disponível',
      time_id: participante.time_id || participante.id || 'ID não disponível',
      clube_id: participante.clube_id || null,
      url_escudo_png: participante.url_escudo_png || participante.escudo_url || ''
    };

    console.log("🎨 [FLUXO-UI] Dados formatados para renderização:", dadosParticipante);
}
}

// ===== DISPONIBILIZAR GLOBALMENTE =====
if (typeof window !== "undefined") {
    window.FluxoFinanceiroUI = FluxoFinanceiroUI;
}

console.log("✅ [FLUXO-FINANCEIRO-UI] Interface do fluxo financeiro carregada!");

export { FluxoFinanceiroUI };
export default FluxoFinanceiroUI;