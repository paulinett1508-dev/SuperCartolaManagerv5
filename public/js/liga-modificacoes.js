// Função para modificar a tabela de classificação da Liga Pontos Corridos
function modificarTabelaClassificacao() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  // Aplicar apenas para a liga específica
  if (ligaId === "67f02282465c9749496b59e2") {
    // Observar mudanças no DOM para capturar quando a tabela for renderizada
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          const pontosCorridosContainer = document.getElementById(
            "pontosCorridosRodada",
          );
          if (pontosCorridosContainer) {
            const tabela = pontosCorridosContainer.querySelector(
              ".classificacao-table",
            );
            if (tabela) {
              // Modificar a estrutura da tabela para mover a coluna Pts
              const thead = tabela.querySelector("thead tr");
              const tbody = tabela.querySelector("tbody");

              if (thead && tbody) {
                // Reordenar cabeçalhos: mover Pts para antes de J
                const thPts = thead.querySelector("th:nth-child(3)"); // Coluna Pts
                const thJ = thead.querySelector("th:nth-child(4)"); // Coluna J
                if (thPts && thJ) {
                  thead.insertBefore(thPts, thJ);
                }

                // Reordenar células em cada linha
                tbody.querySelectorAll("tr").forEach((tr) => {
                  const tdPts = tr.querySelector("td:nth-child(3)"); // Célula Pts
                  const tdJ = tr.querySelector("td:nth-child(4)"); // Célula J
                  if (tdPts && tdJ) {
                    tr.insertBefore(tdPts, tdJ);
                  }

                  // Destacar as 3 primeiras posições
                  const posicao = tr.querySelector("td:first-child");
                  if (posicao) {
                    const pos = parseInt(posicao.textContent);
                    if (pos === 1) {
                      tr.querySelectorAll("td").forEach((td) => {
                        td.style.backgroundColor = "#e8f5e9";
                        td.style.fontWeight = "bold";
                      });
                    } else if (pos === 2 || pos === 3) {
                      tr.querySelectorAll("td").forEach((td) => {
                        td.style.backgroundColor = "#f1f8e9";
                      });
                    }
                  }
                });

                // Desconectar o observer após a modificação
                observer.disconnect();
              }
            }
          }
        }
      });
    });

    // Iniciar observação
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Função para corrigir a exibição do fluxo financeiro
function corrigirFluxoFinanceiro() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  // Aplicar para todas as ligas, mas com foco especial na liga específica
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const fluxoContainer = document.getElementById(
          "fluxoFinanceiroContent",
        );
        if (fluxoContainer) {
          // Verificar se há conteúdo mas não há tabela visível
          if (
            fluxoContainer.innerHTML.trim() !== "" &&
            (!fluxoContainer.querySelector(".extrato-table") ||
              fluxoContainer.querySelector(".extrato-table").offsetHeight === 0)
          ) {
            // Forçar a renderização da tabela
            const extratoContainer =
              fluxoContainer.querySelector(".extrato-container");
            if (extratoContainer) {
              // Adicionar uma tabela se não existir
              if (!extratoContainer.querySelector(".extrato-table")) {
                const tabela = document.createElement("table");
                tabela.className = "extrato-table";
                tabela.innerHTML = `
                  <thead>
                    <tr>
                      <th>Rodada</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colspan="3">Carregando dados do extrato...</td>
                    </tr>
                  </tbody>
                `;
                extratoContainer.appendChild(tabela);
              }

              // Garantir que a tabela seja visível
              const tabela = extratoContainer.querySelector(".extrato-table");
              if (tabela) {
                tabela.style.display = "table";
                tabela.style.width = "100%";
                tabela.style.borderCollapse = "collapse";
                tabela.style.marginTop = "15px";

                // Estilizar células
                tabela.querySelectorAll("th, td").forEach((cell) => {
                  cell.style.border = "1px solid #ddd";
                  cell.style.padding = "8px";
                  cell.style.textAlign =
                    cell.tagName === "TH" ? "center" : "left";
                });
              }
            }
          }
        }
      }
    });
  });

  // Iniciar observação
  observer.observe(document.body, { childList: true, subtree: true });
}

// Função para modificar o menu com base no ID da liga
function ajustarMenuPorLiga() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  if (ligaId === "6818c6125b30e1ad70847192") {
    // Remover abas não desejadas
    const mataMataTab = document.querySelector('.tab[data-tab="mata-mata"]');
    if (mataMataTab) mataMataTab.style.display = "none";

    const pontosCorridosTab = document.querySelector(
      '.tab[data-tab="pontos-corridos"]',
    );
    if (pontosCorridosTab) pontosCorridosTab.style.display = "none";

    // Adicionar novas abas
    const tabs = document.querySelector(".tabs");
    if (tabs) {
      // Verificar se as abas já existem para evitar duplicação
      if (!document.querySelector('.tab[data-tab="artilheiro-campeao"]')) {
        const artilheiroTab = document.createElement("button");
        artilheiroTab.className = "tab";
        artilheiroTab.setAttribute("data-tab", "artilheiro-campeao");
        artilheiroTab.textContent = "Artilheiro Campeão";
        tabs.appendChild(artilheiroTab);

        // Adicionar o conteúdo da aba
        const tabContents = document.querySelector(".tab-contents");
        const artilheiroContent = document.createElement("div");
        artilheiroContent.id = "artilheiro-campeao";
        artilheiroContent.className = "tab-content";
        artilheiroContent.innerHTML = `
          <div id="artilheiroExportBtnContainer" style="text-align: right; margin-bottom: 8px;"></div>
          <div id="artilheiroTabela"></div>
        `;
        tabContents.appendChild(artilheiroContent);

        // Adicionar event listener
        artilheiroTab.addEventListener("click", () => {
          document
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("active"));
          document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));
          artilheiroTab.classList.add("active");
          artilheiroContent.classList.add("active");
          inicializarArtilheiroCampeao();
        });
      }

      if (!document.querySelector('.tab[data-tab="luva-de-ouro"]')) {
        const luvaTab = document.createElement("button");
        luvaTab.className = "tab";
        luvaTab.setAttribute("data-tab", "luva-de-ouro");
        luvaTab.textContent = "Luva de Ouro";
        tabs.appendChild(luvaTab);

        // Adicionar o conteúdo da aba
        const tabContents = document.querySelector(".tab-contents");
        const luvaContent = document.createElement("div");
        luvaContent.id = "luva-de-ouro";
        luvaContent.className = "tab-content";
        luvaContent.innerHTML = `
          <div id="luvaDeOuroExportBtnContainer" style="text-align: right; margin-bottom: 8px;"></div>
          <div id="luvaDeOuroTabela"></div>
        `;
        tabContents.appendChild(luvaContent);

        // Adicionar event listener
        luvaTab.addEventListener("click", () => {
          document
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("active"));
          document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));
          luvaTab.classList.add("active");
          luvaContent.classList.add("active");
          inicializarLuvaDeOuro();
        });
      }
    }
  }
}

// Função para corrigir erros de escudos não encontrados
function corrigirErrosEscudos() {
  // Adicionar manipulador global para erros de imagem
  document.addEventListener(
    "error",
    function (e) {
      if (
        e.target.tagName.toLowerCase() === "img" &&
        e.target.src.includes("/escudos/")
      ) {
        // Substituir por uma imagem padrão ou ocultar
        e.target.style.display = "none";
      }
    },
    true,
  );

  // Adicionar fallback para requisições de escudos
  const originalFetch = window.fetch;
  window.fetch = function (url, options) {
    return originalFetch(url, options)
      .then((response) => {
        if (url.includes("/escudos/") && !response.ok) {
          console.log(`Escudo não encontrado: ${url}`);
          // Retornar uma resposta vazia em vez de erro
          return new Response(new Blob(), { status: 200 });
        }
        return response;
      })
      .catch((error) => {
        if (url.includes("/escudos/")) {
          console.log(`Erro ao buscar escudo: ${url}`);
          // Retornar uma resposta vazia em vez de erro
          return new Response(new Blob(), { status: 200 });
        }
        throw error;
      });
  };
}

// Função para inicializar o Artilheiro Campeão
function inicializarArtilheiroCampeao() {
  const container = document.getElementById("artilheiroTabela");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:20px;">
      <div class="loading-spinner" style="margin:0 auto 15px auto;"></div>
      <p>Carregando dados do Artilheiro Campeão...</p>
    </div>
  `;

  // Simulação de dados para demonstração
  setTimeout(() => {
    const dados = [
      { nome_cartola: "João Silva", nome_time: "Leões FC", gols: 15 },
      {
        nome_cartola: "Maria Oliveira",
        nome_time: "Águias Douradas",
        gols: 12,
      },
      { nome_cartola: "Pedro Santos", nome_time: "Tigres Voadores", gols: 10 },
      { nome_cartola: "Ana Costa", nome_time: "Panteras Negras", gols: 8 },
      {
        nome_cartola: "Carlos Pereira",
        nome_time: "Dragões Vermelhos",
        gols: 7,
      },
    ];

    renderizarTabelaArtilheiro(dados);

    // Adicionar botão de exportação
    const exportContainer = document.getElementById(
      "artilheiroExportBtnContainer",
    );
    if (exportContainer) {
      const btn = document.createElement("button");
      btn.textContent = "Exportar Imagem";
      btn.className = "btn-exportar-imagem";
      btn.style.cssText = `
        padding: 5px 12px;
        font-size: 0.85rem;
        background: #34495e;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 1px 4px #0001;
      `;
      exportContainer.appendChild(btn);
    }
  }, 1000);
}

// Função para renderizar a tabela de Artilheiro
function renderizarTabelaArtilheiro(dados) {
  const container = document.getElementById("artilheiroTabela");
  if (!container) return;

  let html = `
    <table class="ranking-table" style="width:100%; border-collapse:collapse; margin-top:15px;">
      <thead>
        <tr>
          <th style="width:36px; text-align:center">Pos</th>
          <th style="min-width:110px; text-align:left">Cartoleiro</th>
          <th style="min-width:110px; text-align:left">Time</th>
          <th style="width:60px; text-align:center">Gols</th>
        </tr>
      </thead>
      <tbody>
  `;

  dados.forEach((item, index) => {
    const posicao = index + 1;
    const estiloPosicao =
      posicao === 1
        ? "background-color:#e8f5e9; font-weight:bold;"
        : posicao <= 3
          ? "background-color:#f1f8e9;"
          : "";

    html += `
      <tr>
        <td style="padding:8px; text-align:center; border:1px solid #ddd; ${estiloPosicao}">
          ${posicao}º ${posicao === 1 ? "🏆" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : ""}
        </td>
        <td style="padding:8px; text-align:left; border:1px solid #ddd;">${item.nome_cartola}</td>
        <td style="padding:8px; text-align:left; border:1px solid #ddd;">${item.nome_time}</td>
        <td style="padding:8px; text-align:center; border:1px solid #ddd; font-weight:bold;">${item.gols}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Função para inicializar a Luva de Ouro
function inicializarLuvaDeOuro() {
  const container = document.getElementById("luvaDeOuroTabela");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:20px;">
      <div class="loading-spinner" style="margin:0 auto 15px auto;"></div>
      <p>Carregando dados da Luva de Ouro...</p>
    </div>
  `;

  // Simulação de dados para demonstração
  setTimeout(() => {
    const dados = [
      {
        nome_cartola: "Roberto Almeida",
        nome_time: "Goleiros FC",
        defesas: 25,
      },
      { nome_cartola: "Fernanda Lima", nome_time: "Muralha Azul", defesas: 22 },
      {
        nome_cartola: "Lucas Mendes",
        nome_time: "Defensores Unidos",
        defesas: 18,
      },
      {
        nome_cartola: "Juliana Ferreira",
        nome_time: "Escudos de Aço",
        defesas: 15,
      },
      {
        nome_cartola: "Marcelo Souza",
        nome_time: "Barreira Intransponível",
        defesas: 12,
      },
    ];

    renderizarTabelaLuvaDeOuro(dados);

    // Adicionar botão de exportação
    const exportContainer = document.getElementById(
      "luvaDeOuroExportBtnContainer",
    );
    if (exportContainer) {
      const btn = document.createElement("button");
      btn.textContent = "Exportar Imagem";
      btn.className = "btn-exportar-imagem";
      btn.style.cssText = `
        padding: 5px 12px;
        font-size: 0.85rem;
        background: #34495e;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 1px 4px #0001;
      `;
      exportContainer.appendChild(btn);
    }
  }, 1000);
}

// Função para renderizar a tabela de Luva de Ouro
function renderizarTabelaLuvaDeOuro(dados) {
  const container = document.getElementById("luvaDeOuroTabela");
  if (!container) return;

  let html = `
    <table class="ranking-table" style="width:100%; border-collapse:collapse; margin-top:15px;">
      <thead>
        <tr>
          <th style="width:36px; text-align:center">Pos</th>
          <th style="min-width:110px; text-align:left">Cartoleiro</th>
          <th style="min-width:110px; text-align:left">Time</th>
          <th style="width:60px; text-align:center">Defesas</th>
        </tr>
      </thead>
      <tbody>
  `;

  dados.forEach((item, index) => {
    const posicao = index + 1;
    const estiloPosicao =
      posicao === 1
        ? "background-color:#e8f5e9; font-weight:bold;"
        : posicao <= 3
          ? "background-color:#f1f8e9;"
          : "";

    html += `
      <tr>
        <td style="padding:8px; text-align:center; border:1px solid #ddd; ${estiloPosicao}">
          ${posicao}º ${posicao === 1 ? "🧤" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : ""}
        </td>
        <td style="padding:8px; text-align:left; border:1px solid #ddd;">${item.nome_cartola}</td>
        <td style="padding:8px; text-align:left; border:1px solid #ddd;">${item.nome_time}</td>
        <td style="padding:8px; text-align:center; border:1px solid #ddd; font-weight:bold;">${item.defesas}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Inicializar quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  modificarTabelaClassificacao();
  corrigirFluxoFinanceiro();
  ajustarMenuPorLiga();
  corrigirErrosEscudos();
});
