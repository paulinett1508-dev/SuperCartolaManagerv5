const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

async function carregarTabelaGolsPorRodada(rodada = null) {
  const container = document.getElementById("tabela-gols-por-rodada-container");
  container.innerHTML = "Carregando...";

  let url = `/api/artilheiro-campeao/${ligaId}/gols-por-rodada`;
  if (rodada) {
    url += `?rodada=${rodada}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro ${response.status}`);

    const data = await response.json();
    montarTabela(data.participantes, rodada);
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados: ${error.message}</div>`;
  }
}

function montarTabela(participantes, rodadaFiltro) {
  const container = document.getElementById("tabela-gols-por-rodada-container");
  if (!participantes || participantes.length === 0) {
    container.innerHTML = "<p>Nenhum dado encontrado.</p>";
    return;
  }

  // Determinar rodadas a mostrar
  let rodadas = [];
  if (rodadaFiltro) {
    rodadas = [rodadaFiltro];
  } else {
    // Coletar todas as rodadas encontradas
    const rodadasSet = new Set();
    participantes.forEach((p) => {
      Object.keys(p.golsPorRodada).forEach((r) => rodadasSet.add(parseInt(r)));
    });
    rodadas = Array.from(rodadasSet).sort((a, b) => a - b);
  }

  // Montar cabeçalho
  let html = `<table class="table table-striped table-bordered"><thead><tr><th>Jogador</th>`;
  rodadas.forEach((r) => {
    html += `<th>Rodada ${r}</th>`;
  });
  html += `</tr></thead><tbody>`;

  // Montar linhas
  participantes.forEach((p) => {
    html += `<tr><td>${p.nome}</td>`;
    rodadas.forEach((r) => {
      const gols = p.golsPorRodada[r] || 0;
      html += `<td class="text-center">${gols}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  container.innerHTML = html;
}

// Evento para filtro de rodada
window.filtrarRodada = function () {
  const select = document.getElementById("filtroRodadaGols");
  const rodada = select.value === "" ? null : parseInt(select.value);
  carregarTabelaGolsPorRodada(rodada);
};

// Inicializar tabela ao carregar página
document.addEventListener("DOMContentLoaded", () => {
  carregarTabelaGolsPorRodada();
});
