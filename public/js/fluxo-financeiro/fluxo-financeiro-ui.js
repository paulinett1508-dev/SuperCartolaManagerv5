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

// ===== INTERFACE DO FLUXO FINANCEIRO =====
const FluxoFinanceiroUI = {
    version: "1.0.0",

    // Renderizar interface do fluxo financeiro
    renderizarInterface(dados) {
        const container = document.getElementById("fluxo-financeiro-container");
        if (!container) {
            console.error(
                "Container #fluxo-financeiro-container não encontrado",
            );
            return;
        }

        const html = `
            <div class="fluxo-financeiro-content">
                <h2 style="margin-bottom: 15px; color: #2c3e50;">💰 Fluxo Financeiro</h2>

                ${this._renderizarResumo(dados)}
                ${this._renderizarTabela(dados)}
            </div>
        `;

        container.innerHTML = html;
        console.log("✅ [FLUXO-FINANCEIRO-UI] Interface renderizada");
    },

    // Mostrar loading
    mostrarLoading(mensagem = "Carregando fluxo financeiro...") {
        const container = document.getElementById("fluxo-financeiro-container");
        if (container) {
            container.innerHTML = `
                <div class="loading-container" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 15px; color: #666;">${mensagem}</p>
                </div>
            `;
        }
    },

    // Mostrar erro
    mostrarErro(mensagem) {
        const container = document.getElementById("fluxo-financeiro-container");
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                    <h3>Erro no Fluxo Financeiro</h3>
                    <p>${mensagem}</p>
                </div>
            `;
        }
    },

    // Renderizar resumo financeiro
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
    },

    // Renderizar tabela de movimentações
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
    },

    // Renderizar linhas da tabela
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
    },
};

// ===== DISPONIBILIZAR GLOBALMENTE =====
if (typeof window !== "undefined") {
    window.FluxoFinanceiroUI = FluxoFinanceiroUI;
}

console.log(
    "✅ [FLUXO-FINANCEIRO-UI] Interface do fluxo financeiro carregada!",
);

export { FluxoFinanceiroUI };
export default FluxoFinanceiroUI;
