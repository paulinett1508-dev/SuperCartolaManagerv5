// EXPORT RELATÓRIO CONSOLIDADO FLUXO FINANCEIRO - MOBILE DARK HD
import {
    MOBILE_DARK_HD_CONFIG,
    criarContainerMobileDark,
    gerarCanvasMobileDarkHD,
    MobileDarkUtils,
} from "./export-base.js";

export async function exportarRelatorioConsolidadoMobileDarkHD(dados) {
    try {
        console.log(
            "[EXPORT-RELATORIO] Iniciando exportação do relatório consolidado...",
        );

        if (
            !dados ||
            !Array.isArray(dados.relatorio) ||
            dados.relatorio.length === 0
        ) {
            throw new Error("Dados do relatório não fornecidos ou inválidos");
        }

        const { relatorio, ultimaRodada } = dados;

        const exportContainer = criarContainerMobileDark(
            "Relatório Consolidado",
            `Fluxo Financeiro até Rodada ${ultimaRodada}`,
        );

        document.body.appendChild(exportContainer);
        const contentArea = document.getElementById("mobile-export-content");

        // Calcular totais
        const totalPositivo = relatorio
            .filter((p) => p.saldoFinal > 0)
            .reduce((sum, p) => sum + p.saldoFinal, 0);
        const totalNegativo = relatorio
            .filter((p) => p.saldoFinal < 0)
            .reduce((sum, p) => sum + p.saldoFinal, 0);
        const saldoGeral = totalPositivo + totalNegativo;

        const formatarValor = (valor) => {
            const valorNum = parseFloat(valor) || 0;
            const sinal = valorNum > 0 ? "+" : "";
            const cor =
                valorNum >= 0
                    ? MOBILE_DARK_HD_CONFIG.colors.success
                    : MOBILE_DARK_HD_CONFIG.colors.danger;
            return `<span style="color: ${cor}; font-weight: 700;">${sinal}R$ ${Math.abs(valorNum).toFixed(2)}</span>`;
        };

        contentArea.innerHTML = `
            <!-- Cards Resumo -->
            <div style="
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                gap: 8px; 
                margin-bottom: 12px;
            ">
                <div style="
                    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientSuccess}; 
                    padding: 12px; 
                    border-radius: 8px; 
                    text-align: center;
                ">
                    <div style="
                        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
                        color: rgba(255,255,255,0.9); 
                        margin-bottom: 4px;
                        text-transform: uppercase;
                    ">💰 A Receber</div>
                    <div style="
                        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
                        color: white;
                    ">R$ ${totalPositivo.toFixed(2)}</div>
                </div>
                <div style="
                    background: ${MOBILE_DARK_HD_CONFIG.colors.gradientDanger}; 
                    padding: 12px; 
                    border-radius: 8px; 
                    text-align: center;
                ">
                    <div style="
                        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
                        color: rgba(255,255,255,0.9); 
                        margin-bottom: 4px;
                        text-transform: uppercase;
                    ">💸 A Pagar</div>
                    <div style="
                        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
                        color: white;
                    ">R$ ${Math.abs(totalNegativo).toFixed(2)}</div>
                </div>
                <div style="
                    background: ${saldoGeral >= 0 ? MOBILE_DARK_HD_CONFIG.colors.gradientSuccess : MOBILE_DARK_HD_CONFIG.colors.gradientWarning}; 
                    padding: 12px; 
                    border-radius: 8px; 
                    text-align: center;
                ">
                    <div style="
                        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.caption};
                        color: rgba(255,255,255,0.9); 
                        margin-bottom: 4px;
                        text-transform: uppercase;
                    ">📊 Saldo</div>
                    <div style="
                        font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.heading};
                        color: white;
                    ">${formatarValor(saldoGeral)}</div>
                </div>
            </div>

            <!-- Tabela de Participantes -->
            <div style="
                background: ${MOBILE_DARK_HD_CONFIG.colors.surface}; 
                border-radius: 8px; 
                overflow: hidden;
                border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};
            ">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: ${MOBILE_DARK_HD_CONFIG.colors.gradientPrimary};">
                            <th style="padding: 8px 6px; text-align: left; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">#</th>
                            <th style="padding: 8px 6px; text-align: left; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">Participante</th>
                            <th style="padding: 8px 6px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">Bônus</th>
                            <th style="padding: 8px 6px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">Ônus</th>
                            <th style="padding: 8px 6px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">P.C.</th>
                            <th style="padding: 8px 6px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">M-M</th>
                            <th style="padding: 8px 6px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase;">Ajustes</th>
                            <th style="padding: 8px 6px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: white; text-transform: uppercase; background: rgba(0,0,0,0.2);">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${relatorio
                            .map(
                                (p, index) => `
                            <tr style="
                                border-bottom: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.divider};
                                ${index % 2 === 0 ? `background: rgba(255,255,255,0.02);` : ""}
                            ">
                                <td style="padding: 6px 4px; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted};">${index + 1}º</td>
                                <td style="padding: 6px 4px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        ${
                                            p.clube_id
                                                ? `<img src="/escudos/${p.clube_id}.png" alt="${p.nome}" style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border};" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                               <div style="width: 20px; height: 20px; border-radius: 50%; background: ${MOBILE_DARK_HD_CONFIG.colors.secondary}; border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; display: none; align-items: center; justify-content: center; font-size: 10px;">⚽</div>`
                                                : `<div style="width: 20px; height: 20px; border-radius: 50%; background: ${MOBILE_DARK_HD_CONFIG.colors.secondary}; border: 1px solid ${MOBILE_DARK_HD_CONFIG.colors.border}; display: flex; align-items: center; justify-content: center; font-size: 10px;">⚽</div>`
                                        }
                                        <div style="min-width: 0; max-width: 180px;">
                                            <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.semibold} ${MOBILE_DARK_HD_CONFIG.fonts.mini}; color: ${MOBILE_DARK_HD_CONFIG.colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nome}</div>
                                            <div style="font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.regular} 9px Inter; color: ${MOBILE_DARK_HD_CONFIG.colors.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.time}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style="padding: 6px 4px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};">${formatarValor(p.bonus)}</td>
                                <td style="padding: 6px 4px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};">${formatarValor(p.onus)}</td>
                                <td style="padding: 6px 4px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};">${formatarValor(p.pontosCorridos)}</td>
                                <td style="padding: 6px 4px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};">${formatarValor(p.mataMata)}</td>
                                <td style="padding: 6px 4px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.medium} ${MOBILE_DARK_HD_CONFIG.fonts.mini};">${formatarValor(p.ajustes)}</td>
                                <td style="padding: 6px 4px; text-align: center; font: ${MOBILE_DARK_HD_CONFIG.fonts.weights.bold} ${MOBILE_DARK_HD_CONFIG.fonts.bodySmall}; background: rgba(255, 69, 0, 0.05); border-left: 2px solid ${MOBILE_DARK_HD_CONFIG.colors.accent};">${formatarValor(p.saldoFinal)}</td>
                            </tr>
                        `,
                            )
                            .join("")}
                    </tbody>
                </table>
            </div>
        `;

        const filename = MobileDarkUtils.gerarNomeArquivoMobile(
            "relatorio-consolidado",
            {
                extra: `r${ultimaRodada}`,
            },
        );

        await gerarCanvasMobileDarkHD(exportContainer, filename);

        console.log(
            "[EXPORT-RELATORIO] ✅ Relatório consolidado exportado com sucesso",
        );
    } catch (error) {
        console.error(
            "[EXPORT-RELATORIO] ❌ Erro ao exportar relatório:",
            error,
        );
        MobileDarkUtils.mostrarErro(
            "Erro ao exportar relatório. Tente novamente.",
        );
        throw error;
    }
}

console.log(
    "[EXPORT-RELATORIO] ✅ Módulo de exportação do relatório consolidado carregado",
);
