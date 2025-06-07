const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

// Elemento de espera global
function mostrarElementoEspera(containerId, mensagem = "Carregando...") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; color:#666;">
      <div class="loading-spinner" style="border:4px solid #f3f3f3; border-top:4px solid #3498db; border-radius:50%; width:30px; height:30px; margin-bottom:15px; animation:spin 1s linear infinite;"></div>
      <div>${mensagem}</div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

export async function carregarDetalhesLiga() {
  const container = document.getElementById("timesContainer");
  if (container.dataset.loaded) return;

  // Mostrar elemento de espera para detalhes da liga
  document.getElementById("nomeLiga").textContent =
    "Carregando dados da liga...";
  document.getElementById("quantidadeTimes").textContent = "";

  try {
    if (!ligaId) {
      throw new Error("ID da liga não fornecido na URL");
    }
    const res = await fetch(`/api/ligas/${ligaId}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar liga: ${res.statusText}`);
    }
    const liga = await res.json();

    document.getElementById("nomeLiga").textContent = `🏆 ${liga.nome}`;
    document.getElementById("quantidadeTimes").textContent =
      liga.times && Array.isArray(liga.times)
        ? `${liga.times.length} time(s) cadastrados`
        : "0 time(s) cadastrados";

    container.innerHTML = "";
    container.dataset.loaded = "true";
    // Armazena os dados completos da liga, incluindo os times se já vierem populados
    container.dataset.liga = JSON.stringify(liga);
  } catch (err) {
    document.getElementById("nomeLiga").textContent =
      "❌ Erro ao carregar dados da liga.";
    document.getElementById("quantidadeTimes").textContent = "";
    container.innerHTML = `
      <div style="text-align:center; padding:20px; background:#ffebee; border-radius:8px; margin:20px; border:1px solid #ef9a9a;">
        <div style="font-weight:bold; margin-bottom:8px; color:#c62828;">Erro ao carregar dados</div>
        <div>Não foi possível carregar os times: ${err.message}</div>
      </div>
    `;
    console.error("Erro em carregarDetalhesLiga:", err.message);
  }
}

export function toggleParticipants() {
  const container = document.getElementById("timesContainer");
  const button = document.querySelector(".toggle-participants");

  if (container.classList.contains("visible")) {
    container.classList.remove("visible");
    button.textContent = "Exibir Participantes";
    container.innerHTML = "";
  } else {
    container.classList.add("visible");
    button.textContent = "Ocultar Participantes";

    // Mostrar elemento de espera
    mostrarElementoEspera("timesContainer", "Carregando participantes...");

    try {
      const liga = JSON.parse(container.dataset.liga || "{}");

      if (!liga || !liga.times) {
        container.innerHTML = `
          <div style="text-align:center; padding:20px; background:#ffebee; border-radius:8px; margin:20px; border:1px solid #ef9a9a;">
            <div style="font-weight:bold; margin-bottom:8px; color:#c62828;">Dados incompletos</div>
            <div>Não foi possível encontrar a lista de times desta liga.</div>
          </div>
        `;
        return;
      }

      if (liga.times && Array.isArray(liga.times) && liga.times.length > 0) {
        // Detecta se é array de IDs ou de objetos completos
        const isArrayOfIds =
          typeof liga.times[0] === "number" ||
          typeof liga.times[0] === "string";

        if (isArrayOfIds) {
          // Buscar dados completos de cada time via API
          Promise.all(
            liga.times.map(async (timeId) => {
              try {
                // Normaliza o timeId para string para garantir compatibilidade
                const normalizedTimeId = String(timeId);

                // Tenta buscar com ID como string primeiro
                try {
                  const res = await fetch(
                    `/api/cartola/time/${normalizedTimeId}`,
                  );
                  if (res.ok) {
                    const dados = await res.json();
                    return formatarDadosTime(dados, normalizedTimeId);
                  }
                } catch (err) {
                  console.warn(
                    `Erro ao buscar time com ID string ${normalizedTimeId}: ${err.message}`,
                  );
                }

                // Se falhar, tenta com ID numérico
                try {
                  if (isNaN(Number(normalizedTimeId))) {
                    throw new Error(`ID não numérico: ${normalizedTimeId}`);
                  }

                  const resNum = await fetch(
                    `/api/cartola/time/${Number(normalizedTimeId)}`,
                  );
                  if (resNum.ok) {
                    const dados = await resNum.json();
                    return formatarDadosTime(dados, normalizedTimeId);
                  }
                } catch (err) {
                  console.warn(
                    `Erro ao buscar time com ID numérico ${normalizedTimeId}: ${err.message}`,
                  );
                }

                // Se ambas as tentativas falharem, tenta buscar no banco local
                try {
                  const resLocal = await fetch(
                    `/api/times/${normalizedTimeId}`,
                  );
                  if (resLocal.ok) {
                    const dados = await resLocal.json();
                    return formatarDadosTime(dados, normalizedTimeId);
                  }
                } catch (err) {
                  console.warn(
                    `Erro ao buscar time no banco local ${normalizedTimeId}: ${err.message}`,
                  );
                }

                // Se todas as tentativas falharem, retorna dados padrão
                throw new Error(
                  `Não foi possível encontrar o time ${normalizedTimeId}`,
                );
              } catch (err) {
                console.error(`Falha ao buscar time ${timeId}:`, err);
                return {
                  timeId,
                  nome_cartola: "N/D",
                  nome_time: "N/D",
                  escudo_cartola: "",
                  clube_id: null,
                };
              }
            }),
          )
            .then((timesCompletos) => {
              renderTabelaParticipantes(container, timesCompletos);
            })
            .catch((err) => {
              console.error("Erro ao processar todos os times:", err);
              container.innerHTML = `
                <div style="text-align:center; padding:20px; background:#ffebee; border-radius:8px; margin:20px; border:1px solid #ef9a9a;">
                  <div style="font-weight:bold; margin-bottom:8px; color:#c62828;">Erro ao carregar participantes</div>
                  <div>Não foi possível carregar os dados dos participantes: ${err.message}</div>
                </div>
              `;
            });
        } else {
          // Já é array de objetos (presume-se que já contenham os campos necessários)
          const timesFormatados = liga.times.map((t) => formatarDadosTime(t));
          renderTabelaParticipantes(container, timesFormatados);
        }
      } else {
        container.innerHTML = `
          <div style="text-align:center; padding:20px; background:#fff3cd; border-radius:8px; margin:20px; border:1px solid #ffeeba;">
            <div style="font-weight:bold; margin-bottom:8px; color:#856404;">Nenhum time encontrado</div>
            <div>Não há times cadastrados nesta liga.</div>
          </div>
        `;
      }
    } catch (err) {
      console.error("Erro ao processar dados da liga:", err);
      container.innerHTML = `
        <div style="text-align:center; padding:20px; background:#ffebee; border-radius:8px; margin:20px; border:1px solid #ef9a9a;">
          <div style="font-weight:bold; margin-bottom:8px; color:#c62828;">Erro ao processar dados</div>
          <div>Ocorreu um erro ao processar os dados da liga: ${err.message}</div>
        </div>
      `;
    }
  }
}

// Função auxiliar para formatar dados do time de forma consistente
function formatarDadosTime(dados, fallbackId = null) {
  return {
    timeId: dados.time_id || dados.id || fallbackId, // Normaliza o ID
    nome_cartola: dados.nome_cartola || dados.nome_cartoleiro || "N/D",
    nome_time: dados.nome_time || dados.nome || "N/D",
    escudo_cartola: dados.escudo || dados.url_escudo_png || "", // Escudo do Cartola FC (Brasão)
    clube_id: dados.clube_id || null, // Mantém clube_id
  };
}

// Renderiza a tabela de participantes
// Recebe a lista de times já com os dados completos
async function renderTabelaParticipantes(container, times) {
  // Mostrar elemento de espera
  mostrarElementoEspera(
    "timesContainer",
    "Preparando tabela de participantes...",
  );

  // Busca nomes dos clubes (apenas se precisar do nome no title)
  let clubesNomes = {};
  try {
    const clubesData = await fetch("/api/clubes").then((res) => res.json());
    // Mapeia ID para Nome
    Object.keys(clubesData).forEach((id) => {
      clubesNomes[id] = clubesData[id].nome || `Clube ${id}`;
    });
  } catch {
    console.warn("Não foi possível buscar nomes dos clubes.");
    clubesNomes = {};
  }

  // Filtra times inválidos
  const timesFiltrados = times.filter((t) => t && t.timeId);

  // Verifica se há times válidos
  if (!timesFiltrados.length) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px; background:#fff3cd; border-radius:8px; margin:20px; border:1px solid #ffeeba;">
        <div style="font-weight:bold; margin-bottom:8px; color:#856404;">Nenhum time válido</div>
        <div>Não foi possível encontrar times válidos para exibição.</div>
      </div>
    `;
    return;
  }

  // Ordena por nome do cartoleiro
  timesFiltrados.sort((a, b) =>
    (a.nome_cartola || "").localeCompare(b.nome_cartola || "", "pt-BR", {
      sensitivity: "base",
    }),
  );

  const tableHTML = `
    <table class="tabela-participantes" style="margin: 20px auto; border-collapse:collapse; table-layout:auto; max-width: 700px; width: 100%; border: 1px solid #dee2e6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
      <thead>
        <tr style="background:#f8f9fa; border-bottom: 2px solid #dee2e6;">
          <th style="padding:8px 12px; white-space:nowrap; text-align: left;">ID</th>
          <th style="padding:8px 12px; white-space:nowrap; text-align: left;">Cartoleiro</th>
          <th style="padding:8px 12px; white-space:nowrap; text-align: left;">Time</th>
          <th style="padding:8px 12px; white-space:nowrap; text-align: center;">Brasão</th>
          <th style="padding:8px 12px; white-space:nowrap; text-align: center;">❤️</th>
        </tr>
      </thead>
      <tbody>
        ${timesFiltrados
          .map((t, index) => {
            // **AJUSTE ESCUDOS:** Usa o escudo_cartola para a coluna "Brasão"
            let escudoCartolaHTML = "—";
            if (t.escudo_cartola) {
              escudoCartolaHTML = `
                    <img src="${t.escudo_cartola}" 
                         alt="Brasão do Time" 
                         style="width:28px; height:28px; border-radius:50%; border:1px solid #eee; background:#fff;" 
                         onerror="this.style.display='none'"/>
                 `;
            }

            // **AJUSTE ESCUDOS:** Usa o clube_id para buscar o escudo local na coluna "❤️"
            let escudoCoracaoHTML = "—";
            if (t.clube_id) {
              // Pega o nome do clube se disponível para o title
              const nomeClube = clubesNomes[t.clube_id] || `ID ${t.clube_id}`;
              escudoCoracaoHTML = `
                <img src="/escudos/${t.clube_id}.png" 
                     alt="Escudo do Coração" 
                     title="${nomeClube}" 
                     style="width:28px; height:28px; border-radius:50%; border:1px solid #eee; background:#fff; vertical-align:middle;" 
                     onerror="this.style.display='none'"/>
              `;
            }

            // Alterna cores das linhas
            const rowStyle =
              index % 2 === 0 ? "background:#ffffff;" : "background:#f8f9fa;";

            return `
              <tr style="${rowStyle} border-bottom: 1px solid #dee2e6;">
                <td style="text-align:left; padding:8px 12px; white-space:nowrap;">${t.timeId || "-"}</td>
                <td style="padding:8px 12px; white-space:nowrap;">${t.nome_cartola || "N/D"}</td>
                <td style="padding:8px 12px; white-space:nowrap;">${t.nome_time || "N/D"}</td>
                <td style="text-align:center; padding:8px 12px;">
                  ${escudoCartolaHTML} <!-- Coluna Brasão usa escudo_cartola -->
                </td>
                <td style="text-align:center; padding:8px 12px; white-space:nowrap;">
                  ${escudoCoracaoHTML} <!-- Coluna ❤️ usa /escudos/clube_id.png -->
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  container.innerHTML = tableHTML;
}
