// export-base.js - Módulo base para exportação de relatórios
// Versão: 3.0 - Sistema modular otimizado

/**
 * Sistema de exportação de relatórios
 * Fornece funções base para exportação em diferentes formatos
 */

// ✅ CONFIGURAÇÃO MOBILE DARK HD
export const MOBILE_DARK_HD_CONFIG = {
    width: 720,
    scale: 6,
    quality: 1.0,
    padding: 20,
    cardSpacing: 12,
    fontSize: {
        title: 28,
        subtitle: 16,
        heading: 22,
        body: 14,
        bodySmall: 13,
        small: 12,
        caption: 10,
        mini: 9,
    },
    fonts: {
        weights: {
            regular: "400",
            medium: "500",
            semibold: "600",
            bold: "700",
            extrabold: "800",
        },
        title: "28px Inter",
        subtitle: "16px Inter",
        heading: "22px Inter",
        subheading: "18px Inter",
        body: "14px Inter",
        bodySmall: "13px Inter",
        caption: "10px Inter",
        mini: "9px Inter",
    },
    colors: {
        text: "#FFFFFF",
        textSecondary: "rgba(255,255,255,0.85)",
        textMuted: "rgba(255,255,255,0.6)",
        success: "#2ecc71",
        danger: "#e74c3c",
        dangerDark: "#c0392b",
        warning: "#ff4500",
        info: "#3498db",
        gold: "#f1c40f",
        accent: "#9b59b6",
        surface: "#1a1a1a",
        surfaceLight: "#2a2a2a",
        border: "rgba(255,255,255,0.1)",
        divider: "rgba(255,255,255,0.05)",
        shadow: "0 4px 16px rgba(0,0,0,0.3)",
        shadowLight: "0 2px 8px rgba(0,0,0,0.2)",
        gradientPrimary: "linear-gradient(135deg, #ff4500 0%, #d63920 100%)",
        gradientSuccess: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
        gradientDanger: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
        gradientWarning: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
        gradientDark: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
    },
    spacing: {
        card: 12,
        section: 16,
        item: 10,
    },
};

// ✅ UTILIDADES MOBILE DARK
export const MobileDarkUtils = {
    validarDadosMobile(dados, camposObrigatorios) {
        camposObrigatorios.forEach((campo) => {
            if (!dados[campo]) {
                throw new Error(`Campo obrigatório ausente: ${campo}`);
            }
        });
    },

    mostrarErro(mensagem) {
        console.error(`❌ ${mensagem}`);
        alert(mensagem);
    },

    mostrarSucesso(mensagem) {
        console.log(`✅ ${mensagem}`);
    },

    formatarMoedaMobile(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) {
            return "R$ 0,00";
        }
        const numero = parseFloat(valor);
        const sinal = numero >= 0 ? "" : "-";
        const valorAbs = Math.abs(numero);
        return `${sinal}R$ ${valorAbs.toFixed(2).replace(".", ",")}`;
    },

    gerarNomeArquivoMobile(tipo, config = {}) {
        const data = new Date();
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        const hora = String(data.getHours()).padStart(2, "0");
        const min = String(data.getMinutes()).padStart(2, "0");

        let nome = `${tipo}_${ano}${mes}${dia}_${hora}${min}`;

        if (config.rodada) {
            nome += `_R${config.rodada}`;
        }

        if (config.extra) {
            nome += `_${config.extra}`;
        }

        return `${nome}.png`;
    },
};

// ✅ CRIAR CONTAINER MOBILE DARK
export function criarContainerMobileDark(titulo, subtitulo, metadata = {}) {
    const container = document.createElement("div");
    container.style.cssText = `
        position: fixed;
        top: -99999px;
        left: -99999px;
        width: ${MOBILE_DARK_HD_CONFIG.width}px;
        background: #0a0a0a;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        z-index: 999999;
        overflow: hidden;
    `;

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #ff4500 0%, #d63920 100%); padding: ${MOBILE_DARK_HD_CONFIG.padding}px; text-align: center;">
            <h1 style="font-size: ${MOBILE_DARK_HD_CONFIG.fontSize.title}px; color: white; margin: 0;">${titulo}</h1>
            <p style="font-size: ${MOBILE_DARK_HD_CONFIG.fontSize.subtitle}px; color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${subtitulo}</p>
        </div>
        <div id="mobile-export-content" style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px;"></div>
        <div style="padding: ${MOBILE_DARK_HD_CONFIG.padding}px; text-align: center; background: #1a1a1a; font-size: ${MOBILE_DARK_HD_CONFIG.fontSize.small}px; color: rgba(255,255,255,0.6);">
            🏆 Super Cartola Manager • ${new Date().toLocaleDateString("pt-BR")}
        </div>
    `;

    return container;
}

// ✅ GERAR CANVAS MOBILE DARK HD
export async function gerarCanvasMobileDarkHD(container, nomeArquivo, customScale) {
    const html2canvas = (
        await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm")
    ).default;

    const scaleToUse = customScale || MOBILE_DARK_HD_CONFIG.scale;

    const canvas = await html2canvas(container, {
        width: MOBILE_DARK_HD_CONFIG.width,
        scale: scaleToUse,
        backgroundColor: "#0a0a0a",
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        removeContainer: false,
        letterRendering: true,
        foreignObjectRendering: false,
        async: true,
    });

    canvas.toBlob(
        (blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = nomeArquivo;
            link.click();
            URL.revokeObjectURL(url);
        },
        "image/png",
        MOBILE_DARK_HD_CONFIG.quality,
    );
}

export const ExportBase = {
    /**
     * Formata data para uso em nomes de arquivo
     * @param {Date} date - Data a ser formatada
     * @returns {string} Data formatada (YYYY-MM-DD)
     */
    formatarDataArquivo(date = new Date()) {
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, "0");
        const dia = String(date.getDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
    },

    /**
     * Formata data e hora para uso em nomes de arquivo
     * @param {Date} date - Data a ser formatada
     * @returns {string} Data e hora formatada (YYYY-MM-DD_HH-mm-ss)
     */
    formatarDataHoraArquivo(date = new Date()) {
        const dataStr = this.formatarDataArquivo(date);
        const hora = String(date.getHours()).padStart(2, "0");
        const min = String(date.getMinutes()).padStart(2, "0");
        const seg = String(date.getSeconds()).padStart(2, "0");
        return `${dataStr}_${hora}-${min}-${seg}`;
    },

    /**
     * Gera nome de arquivo padrão
     * @param {string} tipo - Tipo de relatório
     * @param {string} ligaNome - Nome da liga
     * @param {string} extensao - Extensão do arquivo
     * @returns {string} Nome do arquivo
     */
    gerarNomeArquivo(tipo, ligaNome, extensao = "pdf") {
        const dataHora = this.formatarDataHoraArquivo();
        const nomeClean = ligaNome.replace(/[^a-zA-Z0-9]/g, "_");
        return `${tipo}_${nomeClean}_${dataHora}.${extensao}`;
    },

    /**
     * Baixa arquivo
     * @param {Blob} blob - Dados do arquivo
     * @param {string} nomeArquivo - Nome do arquivo
     */
    baixarArquivo(blob, nomeArquivo) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Converte tabela HTML para CSV
     * @param {HTMLTableElement} tabela - Elemento da tabela
     * @returns {string} Conteúdo CSV
     */
    tabelaParaCSV(tabela) {
        const linhas = [];
        const rows = tabela.querySelectorAll("tr");

        rows.forEach((row) => {
            const cols = row.querySelectorAll("td, th");
            const linha = Array.from(cols).map((col) => {
                let texto = col.textContent.trim();
                // Escapa aspas duplas
                texto = texto.replace(/"/g, '""');
                // Envolve em aspas se contém vírgula, quebra de linha ou aspas
                if (
                    texto.includes(",") ||
                    texto.includes("\n") ||
                    texto.includes('"')
                ) {
                    texto = `"${texto}"`;
                }
                return texto;
            });
            linhas.push(linha.join(","));
        });

        return linhas.join("\n");
    },

    /**
     * Exporta dados como CSV
     * @param {Array} dados - Array de objetos com os dados
     * @param {string} nomeArquivo - Nome do arquivo
     * @param {Array} colunas - Array com as colunas a exportar
     */
    exportarCSV(dados, nomeArquivo, colunas = null) {
        if (!dados || dados.length === 0) {
            console.warn("[EXPORT-BASE] Nenhum dado para exportar");
            return;
        }

        // Se não forneceu colunas, usar todas as chaves do primeiro objeto
        const cols = colunas || Object.keys(dados[0]);

        // Cabeçalho
        const csv = [cols.join(",")];

        // Linhas de dados
        dados.forEach((item) => {
            const linha = cols.map((col) => {
                let valor = item[col] ?? "";
                valor = String(valor).replace(/"/g, '""');
                if (
                    String(valor).includes(",") ||
                    String(valor).includes("\n") ||
                    String(valor).includes('"')
                ) {
                    valor = `"${valor}"`;
                }
                return valor;
            });
            csv.push(linha.join(","));
        });

        const csvContent = csv.join("\n");
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        this.baixarArquivo(
            blob,
            nomeArquivo.endsWith(".csv") ? nomeArquivo : `${nomeArquivo}.csv`,
        );
    },

    /**
     * Mostra notificação de sucesso
     * @param {string} mensagem - Mensagem a exibir
     */
    mostrarSucesso(mensagem) {
        console.log(`✅ ${mensagem}`);
        // Aqui pode adicionar integração com sistema de notificações
    },

    /**
     * Mostra notificação de erro
     * @param {string} mensagem - Mensagem a exibir
     */
    mostrarErro(mensagem) {
        console.error(`❌ ${mensagem}`);
        // Aqui pode adicionar integração com sistema de notificações
    },
};

// Exportar como padrão também
export default ExportBase;

console.log("✅ [EXPORT-BASE] Módulo carregado com sucesso");
