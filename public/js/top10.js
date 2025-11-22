import { getRankingRodadaEspecifica } from "./rodadas.js";
import {
  buscarStatusMercado as getMercadoStatus,
  obterLigaId,
} from "./pontos-corridos-utils.js";

// ==============================
// VARIÁVEIS PARA EXPORTS DINÂMICOS
// ==============================
let exportarTop10ComoImagem = null;
let exportsCarregados = false;

// ==============================
// FUNÇÃO PARA CARREGAR EXPORTS DINAMICAMENTE
// ==============================
async function carregarExports() {
  if (exportsCarregados) return;

  try {
    const exportModule = await import("./exports/export-top10.js");
    exportarTop10ComoImagem = exportModule.exportarTop10ComoImagem;
    exportsCarregados = true;
    console.log("[TOP10] Exports carregados com sucesso");
  } catch (error) {
    console.warn("[TOP10] Erro ao carregar exports:", error);
  }
}

// ==============================
// CONFIGURAÇÃO DE VALORES PARA LIGA ESPECÍFICA
// ==============================
const valoresBonusOnusPadrao = {
  mitos: {
    1: 30,
    2: 28,
    3: 26,
    4: 24,
    5: 22,
    6: 20,
    7: 18,
    8: 16,
    9: 14,
    10: 12,
  },
  micos: {
    1: -30,
    2: -28,
    3: -26,
    4: -24,
    5: -22,
    6: -20,
    7: -18,
    8: -16,
    9: -14,
    10: -12,
  },
};

const valoresBonusOnusCartoleirosSobral = {
  mitos: { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
  micos: {
    1: -10,
    2: -9,
    3: -8,
    4: -7,
    5: -6,
    6: -5,
    7: -4,
    8: -3,
    9: -2,
    10: -1,
  },
};

// ==============================
// VARIÁVEIS DE DADOS
// ==============================
let todosOsMitos = [];
let todosOsMicos = [];

// ==============================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ==============================
export async function inicializarTop10() {
  console.log("[TOP10] Inicializando módulo...");

  const loadingIndicator = document.getElementById("loadingTop10");
  if (loadingIndicator) loadingIndicator.style.display = "block";

  try {
    await carregarDadosTop10();
    await renderizarTabelasTop10();
  } catch (error) {
    console.error("[TOP10] Erro na inicialização:", error);
    renderizarErro("Erro ao carregar dados do Top 10");
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
}

// ==============================
// CARREGAMENTO DE DADOS
// ==============================
async function carregarDadosTop10() {
  console.log('[TOP10] Carregando dados...');

  // ✅ OBTER LIGA ID - compatível com Admin e Participante
  let ligaId = null;

  // Tentar Admin
  if (window.obterLigaId) {
    ligaId = window.obterLigaId();
  }

  // Tentar Participante
  if (!ligaId && window.participanteData?.ligaId) {
    ligaId = window.participanteData.ligaId;
  }

  // Tentar URL
  if (!ligaId) {
    const urlParams = new URLSearchParams(window.location.search);
    ligaId = urlParams.get('ligaId');
  }

  if (!ligaId) {
    throw new Error('ID da Liga não encontrado');
  }

  console.log(`[TOP10] ✅ Liga ID obtido: ${ligaId}`);

  todosOsMitos = [];
  todosOsMicos = [];

  try {
    const status = await getMercadoStatus();
    if (!status || !status.rodada_atual) {
      throw new Error("Não foi possível obter a rodada atual");
    }

    const ultimaRodadaCompleta = status.rodada_atual - 1;
    console.log(`[TOP10] Buscando dados até rodada ${ultimaRodadaCompleta}`);

    // Buscar rankings de todas as rodadas
    const promises = [];
    for (let i = 1; i <= ultimaRodadaCompleta; i++) {
      promises.push(
        getRankingRodadaEspecifica(ligaId, i)
          .then((ranking) => {
            if (ranking && ranking.length > 0) {
              const rankingOrdenado = ranking.sort(
                (a, b) => b.pontos - a.pontos,
              );

              const mito = { ...rankingOrdenado[0], rodada: i };
              const mico = {
                ...rankingOrdenado[rankingOrdenado.length - 1],
                rodada: i,
              };

              todosOsMitos.push(mito);
              todosOsMicos.push(mico);

              console.log(
                `[TOP10] R${i}: ${mito.nome_cartola} (${mito.pontos.toFixed(2)}) / ${mico.nome_cartola} (${mico.pontos.toFixed(2)})`,
              );
            }
          })
          .catch((error) => console.warn(`[TOP10] Erro rodada ${i}:`, error)),
      );
    }

    await Promise.all(promises);

    // Ordenar listas finais
    todosOsMitos.sort((a, b) => b.pontos - a.pontos);
    todosOsMicos.sort((a, b) => a.pontos - b.pontos);

    console.log(
      `[TOP10] Dados carregados: ${todosOsMitos.length} mitos, ${todosOsMicos.length} micos`,
    );
  } catch (error) {
    console.error("[TOP10] Erro ao carregar dados:", error);
    throw error;
  }
}

// ==============================
// RENDERIZAÇÃO DAS TABELAS
// ==============================
async function renderizarTabelasTop10() {
  const containerMitos = document.getElementById("top10MitosTable");
  const containerMicos = document.getElementById("top10MicosTable");

  if (!containerMitos || !containerMicos) {
    console.error("[TOP10] Containers não encontrados");
    return;
  }

  // Determinar valores de bônus/ônus baseado na liga
  let ligaId = null;
  if (window.obterLigaId) {
    ligaId = window.obterLigaId();
  }
  if (!ligaId && window.participanteData?.ligaId) {
    ligaId = window.participanteData.ligaId;
  }
  if (!ligaId) {
    const urlParams = new URLSearchParams(window.location.search);
    ligaId = urlParams.get('ligaId');
  }
  
  const isLigaCartoleirosSobral = ligaId === "684d821cf1a7ae16d1f89572";
  const valoresBonusOnus = isLigaCartoleirosSobral
    ? valoresBonusOnusCartoleirosSobral
    : valoresBonusOnusPadrao;

  // Renderizar tabelas
  containerMitos.innerHTML = gerarTabelaHTML(
    todosOsMitos.slice(0, 10),
    "mitos",
    valoresBonusOnus,
  );

  containerMicos.innerHTML = gerarTabelaHTML(
    todosOsMicos.slice(0, 10),
    "micos",
    valoresBonusOnus,
  );

  // Carregar sistema de exportação
  await carregarExports();

  if (exportarTop10ComoImagem) {
    criarBotoesExportacao(valoresBonusOnus);
  }

  console.log("[TOP10] Tabelas renderizadas com sucesso");
}

// ==============================
// GERAÇÃO DE HTML DA TABELA
// ==============================
function gerarTabelaHTML(dados, tipo, valoresBonus) {
  if (!dados || dados.length === 0) {
    return `
      <div class="error-state">
        <p class="error-message">Nenhum dado disponível para ${tipo}</p>
      </div>
    `;
  }

  const corHeader = tipo === "mitos" ? "var(--success)" : "var(--danger)";

  return `
    <table class="tabela-top10">
      <thead style="background: linear-gradient(135deg, ${corHeader} 0%, ${tipo === "mitos" ? "#16a34a" : "#dc2626"} 100%);">
        <tr>
          <th style="width: 40px;">Pos</th>
          <th style="min-width: 120px; text-align: left;">Cartoleiro</th>
          <th style="min-width: 100px; text-align: left;">Time</th>
          <th style="width: 40px;">Escudo</th>
          <th style="width: 70px;">Pontos</th>
          <th style="width: 60px;">Rodada</th>
          <th style="width: 70px;">${tipo === "mitos" ? "Bônus" : "Ônus"}</th>
        </tr>
      </thead>
      <tbody>
        ${dados
          .map((item, index) => {
            const posicao = index + 1;
            const valorBonus = valoresBonus[posicao] || 0;
            const valorClass =
              valorBonus >= 0 ? "valor-positivo" : "valor-negativo";
            const valorFormatado =
              valorBonus >= 0
                ? `+R$ ${valorBonus.toFixed(2)}`
                : `-R$ ${Math.abs(valorBonus).toFixed(2)}`;

            const rowClass = posicao <= 3 ? `posicao-${posicao}` : "";

            return `
            <tr class="${rowClass}">
              <td style="text-align: center; font-weight: 700;">
                ${posicao === 1 ? (tipo === "mitos" ? "👑" : "💀") : posicao + "º"}
              </td>
              <td style="text-align: left;">
                ${item.nome_cartola || item.nome_cartoleiro || "N/D"}
              </td>
              <td style="text-align: left;">
                ${item.nome_time || "N/D"}
              </td>
              <td style="text-align: center;">
                ${
                  item.clube_id
                    ? `<img src="/escudos/${item.clube_id}.png" alt="" class="time-escudo" onerror="this.style.display='none'"/>`
                    : "❤️"
                }
              </td>
              <td style="text-align: center;" class="pontos-destaque">
                ${item.pontos.toFixed(2)}
              </td>
              <td style="text-align: center;">
                R${item.rodada}
              </td>
              <td style="text-align: center;" class="${valorClass}">
                ${valorFormatado}
              </td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function criarBotoesExportacao(valoresBonusOnus) {
  const btnContainerMitos = document.getElementById(
    "top10MitosExportBtnContainer",
  );
  const btnContainerMicos = document.getElementById(
    "top10MicosExportBtnContainer",
  );

  if (btnContainerMitos && todosOsMitos.length > 0) {
    btnContainerMitos.innerHTML = `
      <button class="btn-export-top10 mitos" id="exportMitosBtn">
        Exportar
      </button>
    `;

    document.getElementById("exportMitosBtn").onclick = async () => {
      const btn = document.getElementById("exportMitosBtn");
      const textoOriginal = btn.innerHTML;

      btn.innerHTML = "...";
      btn.disabled = true;

      try {
        await exportarTop10ComoImagem(
          todosOsMitos.slice(0, 10),
          "mitos",
          "geral",
          valoresBonusOnus,
        );
      } catch (error) {
        console.error("[TOP10] Erro na exportação de mitos:", error);
      } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
      }
    };
  }

  if (btnContainerMicos && todosOsMicos.length > 0) {
    btnContainerMicos.innerHTML = `
      <button class="btn-export-top10 micos" id="exportMicosBtn">
        Exportar
      </button>
    `;

    document.getElementById("exportMicosBtn").onclick = async () => {
      const btn = document.getElementById("exportMicosBtn");
      const textoOriginal = btn.innerHTML;

      btn.innerHTML = "...";
      btn.disabled = true;

      try {
        await exportarTop10ComoImagem(
          todosOsMicos.slice(0, 10),
          "micos",
          "geral",
          valoresBonusOnus,
        );
      } catch (error) {
        console.error("[TOP10] Erro na exportação de micos:", error);
      } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
      }
    };
  }
}

// ==============================
// RENDERIZAÇÃO DE ERRO
// ==============================
function renderizarErro(mensagem) {
  const containerMitos = document.getElementById("top10MitosTable");
  const containerMicos = document.getElementById("top10MicosTable");

  const erroHTML = `
    <div class="error-state">
      <p class="error-message">${mensagem}</p>
      <button onclick="window.orquestrador.executeAction('top10')" class="btn-voltar">
        Tentar Novamente
      </button>
    </div>
  `;

  if (containerMitos) containerMitos.innerHTML = erroHTML;
  if (containerMicos) containerMicos.innerHTML = erroHTML;
}

// ==============================
// FUNÇÕES PARA OBTER DADOS (COMPATIBILIDADE)
// ==============================

// ✅ NOVA: Garante que os dados estão carregados
export async function garantirDadosCarregados() {
  // Se já tem dados, retorna imediatamente
  if (todosOsMitos.length > 0 && todosOsMicos.length > 0) {
    console.log("[TOP10] Dados já carregados, retornando cache");
    return {
      mitos: todosOsMitos.slice(0, 10),
      micos: todosOsMicos.slice(0, 10),
    };
  }

  // Carrega os dados
  console.log("[TOP10] Carregando dados para integração...");
  try {
    await carregarDadosTop10();
    console.log(
      `[TOP10] Dados carregados: ${todosOsMitos.length} mitos, ${todosOsMicos.length} micos`,
    );
    return {
      mitos: todosOsMitos.slice(0, 10),
      micos: todosOsMicos.slice(0, 10),
    };
  } catch (error) {
    console.error("[TOP10] Erro ao carregar dados:", error);
    return { mitos: [], micos: [] };
  }
}

export function getMitosData() {
  return todosOsMitos.slice(0, 10);
}

export function getMicosData() {
  return todosOsMicos.slice(0, 10);
}

export function getTop10Data() {
  return {
    mitos: todosOsMitos.slice(0, 10),
    micos: todosOsMicos.slice(0, 10),
  };
}

console.log("[TOP10] Módulo carregado e pronto");