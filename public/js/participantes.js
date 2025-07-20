const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

// NOVA FUNÇÃO - Carrega apenas dados básicos da liga (nome + quantidade)
// NÃO interfere com a lógica existente de carregarDetalhesLiga()
export async function carregarDadosBasicos() {
  try {
    if (!ligaId) return;

    console.log(`Carregando dados básicos da liga: ${ligaId}`);

    const res = await fetch(`/api/ligas/${ligaId}`);
    if (!res.ok) return;

    const liga = await res.json();
    if (!liga || !liga.nome) return;

    // Atualiza apenas os elementos básicos
    document.getElementById("nomeLiga").textContent = `🏆 ${liga.nome}`;
    document.getElementById("quantidadeTimes").textContent =
      liga.times && Array.isArray(liga.times)
        ? `${liga.times.length} participantes`
        : "0 participantes";

    console.log(
      `✅ Dados básicos carregados: ${liga.nome} - ${liga.times?.length || 0} participantes`,
    );
  } catch (err) {
    console.log("Info: Dados básicos não carregados automaticamente");
    // Não exibe erro para não poluir a interface
  }
}

// FUNÇÃO ORIGINAL - Mantida exatamente igual
export async function carregarDetalhesLiga() {
  const container = document.getElementById("timesContainer");
  const timesGrid = container.querySelector(".times-grid");
  if (container.dataset.loaded) return;

  try {
    if (!ligaId) {
      throw new Error("ID da liga não fornecido na URL");
    }
    console.log(`Buscando dados da liga com ID: ${ligaId}`);

    const res = await fetch(`/api/ligas/${ligaId}`);
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Erro na resposta da API: ${errorText}`);
      throw new Error(`Erro ao buscar liga: ${res.statusText}`);
    }
    const liga = await res.json();
    console.log("Dados da liga recebidos:", liga);

    if (!liga || !liga.nome) {
      throw new Error("Liga não encontrada ou dados inválidos");
    }

    document.getElementById("nomeLiga").textContent = `🏆 ${liga.nome}`;
    document.getElementById("quantidadeTimes").textContent =
      liga.times && Array.isArray(liga.times)
        ? `${liga.times.length} time(s) cadastrados`
        : "0 time(s) cadastrados";

    timesGrid.innerHTML = "";
    if (liga.times && Array.isArray(liga.times) && liga.times.length > 0) {
      for (const time of liga.times) {
        const resCartola = await fetch(`/api/time/${time}`);
        if (!resCartola.ok) {
          console.warn(`Erro ao buscar time ${time}: ${resCartola.statusText}`);
          continue;
        }
        const dados = await resCartola.json();

        const card = document.createElement("div");
        card.className = "time-card";
        card.innerHTML = `
          <img src="${dados.url_escudo_png || ""}" alt="Escudo do time" title="Escudo do time" onerror="this.style.display='none'" />
          <h4>${dados.nome_time || "Time N/D"}</h4>
          <p>👤 ${dados.nome_cartoleiro || "N/D"}</p>
        `;
        card.onclick = () => abrirModal(dados);
        timesGrid.appendChild(card);
      }
    } else {
      timesGrid.innerHTML = "<p>Nenhum time cadastrado nesta liga.</p>";
    }
    container.dataset.loaded = "true";
  } catch (err) {
    document.getElementById("nomeLiga").textContent =
      "❌ Erro ao carregar dados da liga.";
    document.getElementById("quantidadeTimes").textContent = "";
    timesGrid.innerHTML = "<p>Não foi possível carregar os times.</p>";
    console.error("Erro em carregarDetalhesLiga:", err.message);
  }
}

// FUNÇÃO ORIGINAL - Mantida exatamente igual
export function toggleParticipants() {
  const container = document.getElementById("timesContainer");
  const button = document.querySelector(".toggle-participants");
  if (container.classList.contains("visible")) {
    container.classList.remove("visible");
    button.textContent = "Exibir Participantes";
  } else {
    container.classList.add("visible");
    button.textContent = "Ocultar Participantes";
  }
}

// FUNÇÃO ORIGINAL - Mantida exatamente igual
function abrirModal(dados) {
  document.getElementById("modalEscudo").src = dados.url_escudo_png || "";
  document.getElementById("modalNomeTime").textContent =
    dados.nome_time || "Time N/D";
  document.getElementById("modalCartoleiro").textContent =
    "👤 " + (dados.nome_cartoleiro || "N/D");
  document.getElementById("modal").style.display = "block";
}

// FUNÇÃO ORIGINAL - Mantida exatamente igual
export function fecharModal() {
  document.getElementById("modal").style.display = "none";
}
