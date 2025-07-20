import { getRankingRodadaEspecifica } from "./rodadas.js";
import {
  buscarStatusMercado as getMercadoStatus,
  getLigaId,
} from "./pontos-corridos-utils.js"; // Corrigido: busca do arquivo e nome corretos
// CORREÇÃO: Removida importação estática que causava dependência circular
// import {
//   criarBotaoExportacaoRodada,
//   exportarTop10ComoImagem,
// } from "./exports/export-exports.js";

// ==============================
// VARIÁVEIS PARA EXPORTS DINÂMICOS
// ==============================
let criarBotaoExportacaoRodada = null;
let exportarTop10ComoImagem = null;
let exportsCarregados = false;

// ==============================
// FUNÇÃO PARA CARREGAR EXPORTS DINAMICAMENTE
// ==============================
async function carregarExports() {
  if (exportsCarregados) return;

  try {
    const exportModule = await import("./exports/export-exports.js");
    criarBotaoExportacaoRodada = exportModule.criarBotaoExportacaoRodada;
    exportarTop10ComoImagem = exportModule.exportarTop10ComoImagem;
    exportsCarregados = true;
    console.log("[TOP10] ✅ Exports carregados com sucesso");
  } catch (error) {
    console.warn("[TOP10] ⚠️ Erro ao carregar exports:", error);
  }
}

// Valores de Bônus/Ônus padrão
const valoresBonusOnusPadrao = {
  mitos: {
    1: 30.0,
    2: 28.0,
    3: 26.0,
    4: 24.0,
    5: 22.0,
    6: 20.0,
    7: 18.0,
    8: 16.0,
    9: 14.0,
    10: 12.0,
  },
  micos: {
    1: -30.0,
    2: -28.0,
    3: -26.0,
    4: -24.0,
    5: -22.0,
    6: -20.0,
    7: -18.0,
    8: -16.0,
    9: -14.0,
    10: -12.0,
  },
};

// Valores específicos para a liga Cartoleiros Sobral 2025
const valoresBonusOnusCartoleirosSobral = {
  mitos: {
    1: 10.0,
    2: 9.0,
    3: 8.0,
    4: 7.0,
    5: 6.0,
    6: 5.0,
    7: 4.0,
    8: 3.0,
    9: 2.0,
    10: 1.0,
  },
  micos: {
    1: -10.0,
    2: -9.0,
    3: -8.0,
    4: -7.0,
    5: -6.0,
    6: -5.0,
    7: -4.0,
    8: -3.0,
    9: -2.0,
    10: -1.0,
  },
};

let todosOsMitos = [];
let todosOsMicos = [];

export async function inicializarTop10() {
  console.log("Inicializando Top 10...");
  await carregarDadosTop10();
  renderizarTabelasTop10();
}

async function carregarDadosTop10() {
  const ligaId = getLigaId(); // <-- Corrigido: Obtém o ID da liga aqui
  if (!ligaId) {
    console.error("Top 10: ID da Liga não encontrado.");
    return;
  }
  todosOsMitos = [];
  todosOsMicos = [];

  try {
    const status = await getMercadoStatus();
    if (!status || !status.rodada_atual) {
      console.error("Não foi possível obter a rodada atual.");
      return;
    }
    const rodadaAtual = status.rodada_atual;
    const ultimaRodadaCompleta = rodadaAtual - 1;

    console.log(`Buscando Mitos e Micos até a rodada ${ultimaRodadaCompleta}`);

    for (let i = 1; i <= ultimaRodadaCompleta; i++) {
      console.log(`Buscando dados da rodada ${i}...`);
      const ranking = await getRankingRodadaEspecifica(ligaId, i); // Corrigido: Usar 'i' do loop
      if (ranking && ranking.length > 0) {
        // Ordena para garantir que o primeiro é o mito e o último é o mico
        ranking.sort((a, b) => b.pontos - a.pontos); // Corrigido: Usar 'ranking'
        const mito = { ...ranking[0] }; // Clona para evitar modificar o cache original
        const mico = { ...ranking[ranking.length - 1] }; // Clona para evitar modificar o cache original
        mito.rodada = i; // Adiciona a rodada ao objeto mito
        mico.rodada = i; // Adiciona a rodada ao objeto mico

        todosOsMitos.push(mito);
        todosOsMicos.push(mico);
        console.log(
          `Rodada ${i}: Mito - ${mito.nome_cartola} (${mito.pontos.toFixed(2)}), Mico - ${mico.nome_cartola} (${mico.pontos.toFixed(2)})`,
        );
      } else {
        console.warn(`Nenhum dado encontrado para a rodada ${i}`);
      }
    }

    // Ordena a lista geral de mitos (maior pontuação primeiro)
    todosOsMitos.sort((a, b) => b.pontos - a.pontos);

    // Ordena a lista geral de micos (menor pontuação primeiro)
    todosOsMicos.sort((a, b) => a.pontos - b.pontos);

    console.log("Dados de Mitos e Micos carregados e ordenados.");
  } catch (error) {
    console.error("Erro ao carregar dados para Top 10:", error);
    // Tratar erro (ex: exibir mensagem na UI)
  }
}

async function renderizarTabelasTop10() {
  const containerMitos = document.getElementById("top10MitosTable");
  const containerMicos = document.getElementById("top10MicosTable");
  const btnContainerMitos = document.getElementById(
    "top10MitosExportBtnContainer",
  );
  const btnContainerMicos = document.getElementById(
    "top10MicosExportBtnContainer",
  );

  if (
    !containerMitos ||
    !containerMicos ||
    !btnContainerMitos ||
    !btnContainerMicos
  ) {
    console.error("Containers ou botões para tabelas Top 10 não encontrados.");
    return;
  }

  // Obtém o ID da liga atual
  const ligaId = getLigaId();
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";

  // Seleciona os valores de bônus/ônus com base na liga
  const valoresBonusOnus = isLigaCartoleirosSobral
    ? valoresBonusOnusCartoleirosSobral
    : valoresBonusOnusPadrao;

  const mitosTableId = "tabelaTop10Mitos";
  const micosTableId = "tabelaTop10Micos";

  // Modificado: Passa o nome da coluna e os valores de bônus/ônus
  containerMitos.innerHTML = gerarHtmlTabela(
    todosOsMitos.slice(0, 10),
    "Top 10 Mitos (Maiores Pontuadores por Rodada)",
    mitosTableId,
    "Bônus",
    valoresBonusOnus.mitos,
  );
  containerMicos.innerHTML = gerarHtmlTabela(
    todosOsMicos.slice(0, 10),
    "Top 10 Micos (Menores Pontuadores por Rodada)",
    micosTableId,
    "Ônus",
    valoresBonusOnus.micos,
  );

  // CORREÇÃO: Carregar exports antes de usar
  await carregarExports();

  // Adiciona botão de exportação para Mitos
  if (exportarTop10ComoImagem) {
    btnContainerMitos.innerHTML = `<button class="export-button" id="exportTop10MitosBtn">Exportar Mitos</button>`;
    document
      .getElementById("exportTop10MitosBtn")
      .addEventListener("click", () => {
        exportarTop10ComoImagem(
          todosOsMitos.slice(0, 10),
          "mitos",
          valoresBonusOnus.mitos,
        ); // <-- Corrigido: Usa a função e parâmetros corretos
      });

    // Adiciona botão de exportação para Micos
    btnContainerMicos.innerHTML = `<button class="export-button" id="exportTop10MicosBtn">Exportar Micos</button>`;
    document
      .getElementById("exportTop10MicosBtn")
      .addEventListener("click", () => {
        exportarTop10ComoImagem(
          todosOsMicos.slice(0, 10),
          "micos",
          valoresBonusOnus.micos,
        ); // <-- Corrigido: Usa a função e parâmetros corretos
      });

    console.log("Tabelas e botões de exportação Top 10 renderizados.");
  } else {
    console.warn("[TOP10] ⚠️ Função de exportação não disponível");
    // Renderiza botões desabilitados ou remove eles
    btnContainerMitos.innerHTML = "";
    btnContainerMicos.innerHTML = "";
  }
}

// Modificado: Adiciona parâmetros colunaExtraNome e valoresExtra
function gerarHtmlTabela(
  dados,
  titulo,
  tableId,
  colunaExtraNome,
  valoresExtra,
) {
  if (!dados || dados.length === 0) {
    return `<div style="text-align:center; margin-top: 20px; color: #888;">Nenhum dado disponível para ${titulo}.</div>`;
  }

  return `
    <div style="max-width: 700px; margin: 20px auto;">
      <h3 style="text-align: center; margin-bottom: 15px;">${titulo}</h3>
      <table id="${tableId}" class="tabela-top10 ranking-table tabela-compacta" style="margin: 0 auto; min-width: 320px; max-width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="width: 36px; text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Pos</th>
            <th style="min-width: 140px; text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Cartoleiro</th>
            <th style="min-width: 110px; text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Time</th>
            <th style="width: 48px; text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Escudo</th>
            <th style="width: 80px; text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Pontos</th>
            <th style="width: 60px; text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Rodada</th>
            <th style="width: 80px; text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${colunaExtraNome}</th> <!-- Nova coluna -->
          </tr>
        </thead>
        <tbody>
          ${dados
            .map((t, i) => {
              const rank = i + 1;
              const valorExtra = valoresExtra[rank] || 0;
              const valorExtraFormatado =
                valorExtra >= 0
                  ? `R$ ${valorExtra.toFixed(2)}`
                  : `(R$ ${Math.abs(valorExtra).toFixed(2)})`;
              const valorClass =
                valorExtra >= 0 ? "valor-positivo" : "valor-negativo";

              return `
                <tr style="background: ${i % 2 === 0 ? "#f9f9f9" : "#fff"};">
                  <td style="text-align:center; padding: 8px;">${rank}</td>
                  <td style="text-align:left; padding: 8px;">${t.nome_cartola || "N/D"}</td>
                  <td style="text-align:left; padding: 8px;">${t.nome_time || "N/D"}</td>
                  <td style="text-align:center; padding: 8px;">
                    ${
                      t.escudo // Usa o escudo já carregado nos dados
                        ? `<img src="${t.escudo}" alt="Escudo" style="width:24px; height:24px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>`
                        : "—"
                    }
                  </td>
                  <td style="text-align:center; padding: 8px; font-weight:600;">
                    ${t.pontos.toFixed(2)}
                  </td>
                  <td style="text-align:center; padding: 8px;">${t.rodada}</td>
                  <td class="${valorClass}" style="text-align:center; padding: 8px;">${valorExtraFormatado}</td> <!-- Nova célula -->
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// É necessário chamar inicializarTop10() quando a aba correspondente for clicada.
// Exemplo (a ser adicionado em detalhe-liga.html ou similar):
// import { inicializarTop10 } from './js/top10.js';
// document.getElementById('tab-top10').addEventListener('click', inicializarTop10);
