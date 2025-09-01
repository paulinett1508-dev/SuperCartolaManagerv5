// ✅ EXPORT-ARTILHEIRO-CAMPEAO.JS - MÓDULO OTIMIZADO v2.3.0
// Sistema profissional de exportação para artilheiros e campeões

import {
  criarDivExportacao,
  gerarCanvasDownload,
  ExportUtils,
  EXPORT_BASE_CONFIG,
} from "./export-base.js";

console.log("[EXPORT-ARTILHEIRO-CAMPEAO] 🚀 Módulo otimizado v2.3.0 carregado");

// ✅ FUNÇÃO PRINCIPAL PARA EXPORTAR RESUMO ARTILHEIRO CAMPEÃO
export async function exportarResumoArtilheiroCampeao(
  dadosResumo,
  rodadaAtual,
) {
  try {
    console.log(
      `[EXPORT-ARTILHEIRO-CAMPEAO] 🎨 Exportando resumo para rodada ${rodadaAtual}`,
    );

    // Validar dados obrigatórios
    ExportUtils.validarDadosExport(dadosResumo, ["artilheiro", "campeao"]);

    const titulo = "Artilheiro Campeão";
    const subtitulo = `Resumo até a ${rodadaAtual}ª rodada`;
    const exportDiv = criarDivExportacao(titulo, subtitulo, {
      rodada: rodadaAtual,
    });

    // Conteúdo principal ultra-compacto
    const contentDiv = exportDiv.querySelector("#export-content");
    contentDiv.innerHTML = criarLayoutResumo(dadosResumo, rodadaAtual);

    document.body.appendChild(exportDiv);

    const nomeArquivo = ExportUtils.gerarNomeArquivo("artilheiro-campeao", {
      rodada: rodadaAtual,
      extra: "resumo",
    });

    await gerarCanvasDownload(exportDiv, nomeArquivo);
  } catch (error) {
    console.error("[EXPORT-ARTILHEIRO-CAMPEAO] ❌ Erro no resumo:", error);
    ExportUtils.mostrarErro("Erro ao exportar resumo Artilheiro Campeão");
    throw error;
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT RESUMO ULTRA-COMPACTO
function criarLayoutResumo(dadosResumo, rodadaAtual) {
  const artilheiro = dadosResumo.artilheiro || {};
  const campeao = dadosResumo.campeao || {};

  return `
    <!-- CARDS PRINCIPAIS COMPACTOS -->
    <div style="
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: ${EXPORT_BASE_CONFIG.cardSpacing}px; 
      margin-bottom: 16px;
    ">
      <!-- Card Artilheiro -->
      <div style="
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border-radius: 8px; 
        padding: 14px; 
        text-align: center;
        border: 1px solid ${EXPORT_BASE_CONFIG.colors.border};
      ">
        <div style="
          font: 600 ${EXPORT_BASE_CONFIG.fonts.heading} Inter, sans-serif;
          margin-bottom: 6px; 
          color: #1976d2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        ">
          <span style="font-size: 16px;">🏆</span>
          Artilheiro Atual
        </div>
        <div style="
          font: 700 18px Inter, sans-serif;
          margin-bottom: 3px;
          color: ${EXPORT_BASE_CONFIG.colors.text};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${artilheiro.nome || "N/D"}</div>
        <div style="
          font: ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
          color: ${EXPORT_BASE_CONFIG.colors.textLight};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        ">
          <span style="font-weight: 600; font-size: 16px; color: #1976d2;">
            ${artilheiro.gols || 0}
          </span>
          gols
        </div>
      </div>

      <!-- Card Campeão -->
      <div style="
        background: linear-gradient(135deg, #fff3e0, #ffcc80);
        border-radius: 8px; 
        padding: 14px; 
        text-align: center;
        border: 1px solid ${EXPORT_BASE_CONFIG.colors.border};
      ">
        <div style="
          font: 600 ${EXPORT_BASE_CONFIG.fonts.heading} Inter, sans-serif;
          margin-bottom: 6px; 
          color: #f57c00;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        ">
          <span style="font-size: 16px;">👑</span>
          Campeão Atual
        </div>
        <div style="
          font: 700 18px Inter, sans-serif;
          margin-bottom: 3px;
          color: ${EXPORT_BASE_CONFIG.colors.text};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${campeao.nome_cartola || "N/D"}</div>
        <div style="
          font: ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
          color: ${EXPORT_BASE_CONFIG.colors.textLight};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        ">
          <span style="font-weight: 600; font-size: 16px; color: #f57c00;">
            ${campeao.pontos ? campeao.pontos.toFixed(2) : "0.00"}
          </span>
          pts
        </div>
      </div>
    </div>

    <!-- ESTATÍSTICAS GERAIS COMPACTAS -->
    <div style="
      background: ${EXPORT_BASE_CONFIG.colors.surface};
      border-radius: 8px; 
      padding: 16px; 
      border: 1px solid ${EXPORT_BASE_CONFIG.colors.border};
    ">
      <div style="
        font: 600 ${EXPORT_BASE_CONFIG.fonts.heading} Inter, sans-serif;
        margin-bottom: 10px; 
        text-align: center;
        color: ${EXPORT_BASE_CONFIG.colors.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">
        <span style="font-size: 16px;">📊</span>
        Estatísticas Gerais
      </div>

      <div style="
        display: grid; 
        grid-template-columns: repeat(3, 1fr); 
        gap: 12px; 
        text-align: center;
      ">
        <div>
          <div style="
            font: 600 ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
            color: ${EXPORT_BASE_CONFIG.colors.textLight};
            margin-bottom: 2px;
          ">Total de Gols</div>
          <div style="
            font: 700 20px Inter, sans-serif;
            color: ${EXPORT_BASE_CONFIG.colors.success};
          ">${dadosResumo.totalGols || 0}</div>
        </div>

        <div>
          <div style="
            font: 600 ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
            color: ${EXPORT_BASE_CONFIG.colors.textLight};
            margin-bottom: 2px;
          ">Média/Rodada</div>
          <div style="
            font: 700 20px Inter, sans-serif;
            color: #1976d2;
          ">${dadosResumo.mediaPorRodada ? dadosResumo.mediaPorRodada.toFixed(1) : "0.0"}</div>
        </div>

        <div>
          <div style="
            font: 600 ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
            color: ${EXPORT_BASE_CONFIG.colors.textLight};
            margin-bottom: 2px;
          ">Participantes</div>
          <div style="
            font: 700 20px Inter, sans-serif;
            color: ${EXPORT_BASE_CONFIG.colors.primary};
          ">${dadosResumo.totalParticipantes || 0}</div>
        </div>
      </div>
    </div>
  `;
}

// ✅ FUNÇÃO OTIMIZADA PARA EXPORTAR TABELA DE ARTILHEIROS
export async function exportarTabelaArtilheiros(dadosArtilheiros, rodadaAtual) {
  try {
    console.log(
      `[EXPORT-ARTILHEIRO-CAMPEAO] 🎯 Exportando tabela de artilheiros - rodada ${rodadaAtual}`,
    );

    // Validar dados
    if (!Array.isArray(dadosArtilheiros) || dadosArtilheiros.length === 0) {
      throw new Error("Dados de artilheiros inválidos ou vazios");
    }

    const titulo = "Artilheiros da Liga";
    const subtitulo = `Classificação até a ${rodadaAtual}ª rodada`;
    const exportDiv = criarDivExportacao(titulo, subtitulo, {
      rodada: rodadaAtual,
    });

    const contentDiv = exportDiv.querySelector("#export-content");
    contentDiv.innerHTML = criarTabelaArtilheiros(dadosArtilheiros);

    document.body.appendChild(exportDiv);

    const nomeArquivo = ExportUtils.gerarNomeArquivo("artilheiros", {
      rodada: rodadaAtual,
      extra: "tabela",
    });

    await gerarCanvasDownload(exportDiv, nomeArquivo);
  } catch (error) {
    console.error("[EXPORT-ARTILHEIRO-CAMPEAO] ❌ Erro na tabela:", error);
    ExportUtils.mostrarErro("Erro ao exportar tabela de artilheiros");
    throw error;
  }
}

// ✅ FUNÇÃO PARA CRIAR TABELA ULTRA-COMPACTA
function criarTabelaArtilheiros(dadosArtilheiros) {
  return `
    <div style="
      background: ${EXPORT_BASE_CONFIG.colors.surface};
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid ${EXPORT_BASE_CONFIG.colors.border};
    ">
      <table style="
        width: 100%; 
        border-collapse: separate;
        border-spacing: 0;
        font: ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
      ">
        <thead>
          <tr style="
            background: linear-gradient(135deg, ${EXPORT_BASE_CONFIG.colors.primary}, ${EXPORT_BASE_CONFIG.colors.secondary});
            color: white;
          ">
            <th style="width: 40px; text-align: center; padding: 8px 6px; border-radius: 6px 0 0 0; font: 600 12px Inter;">Pos</th>
            <th style="text-align: left; padding: 8px 6px; font: 600 12px Inter;">Jogador</th>
            <th style="text-align: left; padding: 8px 6px; font: 600 12px Inter;">Time</th>
            <th style="width: 40px; text-align: center; padding: 8px 6px; font: 600 12px Inter;">⚽</th>
            <th style="width: 60px; text-align: center; padding: 8px 6px; font: 600 12px Inter;">Gols</th>
            <th style="width: 70px; text-align: center; padding: 8px 6px; border-radius: 0 6px 0 0; font: 600 12px Inter;">Média</th>
          </tr>
        </thead>
        <tbody>
          ${dadosArtilheiros
            .slice(0, 15) // Limitar para caber na página
            .map((artilheiro, index) => {
              const isLider = index === 0;
              const posicao = isLider ? "🏆" : `${index + 1}º`;

              return `
                <tr style="
                  border-bottom: 1px solid ${EXPORT_BASE_CONFIG.colors.border};
                  ${isLider ? `background: linear-gradient(135deg, #e3f2fd, #f3e5f5); font-weight: 600;` : "background: white;"}
                  transition: all 0.2s ease;
                ">
                  <td style="
                    text-align: center; 
                    padding: 6px; 
                    font: 600 13px Inter;
                    color: ${isLider ? "#1976d2" : EXPORT_BASE_CONFIG.colors.text};
                  ">${posicao}</td>

                  <td style="
                    text-align: left; 
                    padding: 6px; 
                    font: 600 13px Inter;
                    color: ${EXPORT_BASE_CONFIG.colors.text};
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 150px;
                  ">${artilheiro.nome || "N/D"}</td>

                  <td style="
                    text-align: left; 
                    padding: 6px;
                    font: ${EXPORT_BASE_CONFIG.fonts.caption} Inter;
                    color: ${EXPORT_BASE_CONFIG.colors.textLight};
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 120px;
                  ">${artilheiro.clube_nome || "N/D"}</td>

                  <td style="text-align: center; padding: 6px;">
                    ${
                      artilheiro.clube_id
                        ? `<img src="/escudos/${artilheiro.clube_id}.png" 
                           alt="" 
                           style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid ${EXPORT_BASE_CONFIG.colors.border};" 
                           onerror="this.style.display='none'"/>`
                        : '<span style="color: #ccc;">—</span>'
                    }
                  </td>

                  <td style="
                    text-align: center; 
                    padding: 6px; 
                    font: 700 16px Inter;
                    color: ${isLider ? "#1976d2" : EXPORT_BASE_CONFIG.colors.success};
                  ">${artilheiro.gols || 0}</td>

                  <td style="
                    text-align: center; 
                    padding: 6px;
                    font: 600 12px Inter;
                    color: ${EXPORT_BASE_CONFIG.colors.textLight};
                  ">${artilheiro.media ? artilheiro.media.toFixed(2) : "0.00"}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>

      ${
        dadosArtilheiros.length > 15
          ? `
        <div style="
          text-align: center; 
          margin-top: 8px; 
          font: ${EXPORT_BASE_CONFIG.fonts.caption} Inter;
          color: ${EXPORT_BASE_CONFIG.colors.textLight};
        ">
          Mostrando top 15 de ${dadosArtilheiros.length} artilheiros
        </div>
      `
          : ""
      }
    </div>
  `;
}

// ✅ FUNÇÃO OTIMIZADA PARA EXPORTAR DADOS DO CAMPEÃO
export async function exportarDadosCampeao(dadosCampeao, rodadaAtual) {
  try {
    console.log(
      `[EXPORT-ARTILHEIRO-CAMPEAO] 👑 Exportando dados do campeão - rodada ${rodadaAtual}`,
    );

    // Validar dados do campeão
    ExportUtils.validarDadosExport(dadosCampeao, ["nome_cartola"]);

    const titulo = "Campeão da Liga";
    const subtitulo = `Líder até a ${rodadaAtual}ª rodada`;
    const exportDiv = criarDivExportacao(titulo, subtitulo, {
      rodada: rodadaAtual,
    });

    const contentDiv = exportDiv.querySelector("#export-content");
    contentDiv.innerHTML = criarLayoutCampeao(dadosCampeao);

    document.body.appendChild(exportDiv);

    const nomeArquivo = ExportUtils.gerarNomeArquivo("campeao", {
      rodada: rodadaAtual,
    });

    await gerarCanvasDownload(exportDiv, nomeArquivo);
  } catch (error) {
    console.error("[EXPORT-ARTILHEIRO-CAMPEAO] ❌ Erro no campeão:", error);
    ExportUtils.mostrarErro("Erro ao exportar dados do campeão");
    throw error;
  }
}

// ✅ FUNÇÃO PARA CRIAR LAYOUT DO CAMPEÃO
function criarLayoutCampeao(dadosCampeao) {
  return `
    <!-- CARD DO CAMPEÃO COMPACTO -->
    <div style="
      text-align: center; 
      background: linear-gradient(135deg, #fff3e0, #ffcc80);
      border-radius: 12px; 
      padding: 24px; 
      margin: 16px auto;
      max-width: 400px;
      border: 2px solid #ffa726;
      box-shadow: 0 4px 12px rgba(255, 167, 38, 0.2);
    ">
      <!-- Ícone de campeão -->
      <div style="font-size: 48px; margin-bottom: 12px;">👑</div>

      <!-- Nome do cartoleiro -->
      <div style="
        font: 700 24px Inter, sans-serif;
        color: #e65100;
        margin-bottom: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${dadosCampeao.nome_cartola || "N/D"}</div>

      <!-- Nome do time -->
      <div style="
        font: 600 ${EXPORT_BASE_CONFIG.fonts.heading} Inter, sans-serif;
        color: ${EXPORT_BASE_CONFIG.colors.textLight};
        margin-bottom: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${dadosCampeao.nome_time || "N/D"}</div>

      <!-- Escudo do time -->
      ${
        dadosCampeao.clube_id
          ? `
        <div style="margin-bottom: 12px;">
          <img src="/escudos/${dadosCampeao.clube_id}.png" 
               alt="Escudo" 
               style="
                 width: 50px; 
                 height: 50px; 
                 border-radius: 50%; 
                 border: 3px solid #fff;
                 box-shadow: 0 2px 8px rgba(0,0,0,0.1);
               " 
               onerror="this.style.display='none'"/>
        </div>
      `
          : ""
      }

      <!-- Pontuação -->
      <div style="
        font: 700 32px Inter, sans-serif;
        color: ${EXPORT_BASE_CONFIG.colors.success};
        margin-bottom: 4px;
      ">${dadosCampeao.pontos ? dadosCampeao.pontos.toFixed(2) : "0.00"}</div>

      <div style="
        font: ${EXPORT_BASE_CONFIG.fonts.body} Inter, sans-serif;
        color: ${EXPORT_BASE_CONFIG.colors.textLight};
      ">pontos acumulados</div>
    </div>
  `;
}

console.log(
  "[EXPORT-ARTILHEIRO-CAMPEAO] ✅ Módulo otimizado carregado com sucesso",
);
console.log(
  "[EXPORT-ARTILHEIRO-CAMPEAO] 🎯 Funções disponíveis: exportarResumoArtilheiroCampeao, exportarTabelaArtilheiros, exportarDadosCampeao",
);
