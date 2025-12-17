/**
 * Módulo para seleção e troca de ligas no Super Cartola Manager
 * v2.0 SaaS: Busca ligas da API ao invés de usar lista hardcoded
 * Implementação não intrusiva que preserva o layout original
 */

// Função auto-executável para evitar poluição do escopo global
(function () {
  // Verificar se o seletor já foi inicializado para evitar duplicação
  if (window.seletorLigasInicializado) return;

  // v2.0: Buscar ligas da API
  async function buscarLigasDisponiveis() {
    try {
      const response = await fetch("/api/ligas");
      if (response.ok) {
        const ligas = await response.json();
        return ligas.map(l => ({
          liga_id: l._id || l.liga_id,
          nome: l.nome || l.liga_nome || "Liga"
        }));
      }
    } catch (e) {
      console.warn("[SELETOR-LIGAS] Erro ao buscar ligas:", e.message);
    }
    return [];
  }

  // Função principal que será executada quando o DOM estiver pronto
  async function inicializarSeletorLigas() {
    // Obter o ID da liga atual da URL
    const urlParams = new URLSearchParams(window.location.search);
    const ligaAtualId = urlParams.get("id");

    if (!ligaAtualId) return;

    // v2.0: Buscar ligas da API
    const ligas = await buscarLigasDisponiveis();

    // Se não tiver ligas ou liga atual não existir, não mostrar seletor
    if (ligas.length === 0) return;
    const ligaAtual = ligas.find(liga => liga.liga_id === ligaAtualId);
    if (!ligaAtual) return;

    // Criar seletor com ligas da API
    criarSeletorLigas(ligas, ligaAtualId);
  }

  // Função para criar o seletor de ligas - Design Seamless Dark Mode v3.0
  function criarSeletorLigas(ligas, ligaAtualId) {
    // Encontrar o elemento de título da página para inserir o seletor
    const titulo = document.querySelector(
      ".liga-titulo, #nomeLiga, .titulo-pagina",
    );
    if (!titulo) return;

    // Verificar se o seletor já existe para evitar duplicação
    if (document.querySelector(".seletor-ligas-container")) return;

    // Filtrar ligas únicas
    const ligasUnicas = [];
    const ligasIds = new Set();
    ligas.forEach((liga) => {
      if (!ligasIds.has(liga.liga_id)) {
        ligasIds.add(liga.liga_id);
        ligasUnicas.push(liga);
      }
    });

    // Se só tem 1 liga, não mostrar seletor
    if (ligasUnicas.length <= 1) return;

    // Criar o container do seletor - Estilo Seamless
    const seletorContainer = document.createElement("div");
    seletorContainer.className = "seletor-ligas-container";
    seletorContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      margin-left: 12px;
      vertical-align: middle;
      position: relative;
    `;

    // Criar wrapper para o select com ícone chevron
    const selectWrapper = document.createElement("div");
    selectWrapper.style.cssText = `
      position: relative;
      display: inline-flex;
      align-items: center;
    `;

    // Criar o select - Design Seamless Dark
    const select = document.createElement("select");
    select.className = "seletor-ligas-seamless";
    select.style.cssText = `
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 600;
      font-family: inherit;
      padding: 4px 28px 4px 8px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
      min-width: 180px;
    `;

    // Adicionar opções
    ligasUnicas.forEach((liga) => {
      const option = document.createElement("option");
      option.value = liga.liga_id;
      option.textContent = liga.nome;
      option.selected = liga.liga_id === ligaAtualId;
      option.style.cssText = `
        background: #1a1a1a;
        color: #fff;
        padding: 8px;
      `;
      select.appendChild(option);
    });

    // Criar ícone chevron (Material Icons)
    const chevron = document.createElement("span");
    chevron.className = "material-icons";
    chevron.textContent = "expand_more";
    chevron.style.cssText = `
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 20px;
      color: #FF5500;
      pointer-events: none;
      transition: transform 0.2s ease;
    `;

    // Hover effects
    select.addEventListener("mouseenter", () => {
      select.style.background = "rgba(255, 85, 0, 0.1)";
      chevron.style.color = "#ff6611";
    });
    select.addEventListener("mouseleave", () => {
      select.style.background = "transparent";
      chevron.style.color = "#FF5500";
    });
    select.addEventListener("focus", () => {
      select.style.background = "rgba(255, 85, 0, 0.15)";
      select.style.boxShadow = "0 0 0 2px rgba(255, 85, 0, 0.3)";
    });
    select.addEventListener("blur", () => {
      select.style.background = "transparent";
      select.style.boxShadow = "none";
    });

    // Adicionar evento de mudança
    select.addEventListener("change", function () {
      const novaLigaId = this.value;
      if (novaLigaId !== ligaAtualId) {
        window.location.href = `detalhe-liga.html?id=${novaLigaId}`;
      }
    });

    // Montar estrutura
    selectWrapper.appendChild(select);
    selectWrapper.appendChild(chevron);
    seletorContainer.appendChild(selectWrapper);

    // Inserir após o título
    titulo.parentNode.insertBefore(seletorContainer, titulo.nextSibling);

    // Injetar CSS para options (dropdown aberto)
    if (!document.getElementById("seletor-ligas-styles")) {
      const style = document.createElement("style");
      style.id = "seletor-ligas-styles";
      style.textContent = `
        .seletor-ligas-seamless option {
          background: #1a1a1a !important;
          color: #fff !important;
          padding: 10px !important;
        }
        .seletor-ligas-seamless option:hover,
        .seletor-ligas-seamless option:focus,
        .seletor-ligas-seamless option:checked {
          background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%) !important;
          color: #fff !important;
        }
        .seletor-ligas-seamless::-ms-expand {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarSeletorLigas);
  } else {
    // Se o DOM já estiver carregado, executar imediatamente
    setTimeout(inicializarSeletorLigas, 300);
  }

  // Marcar como inicializado para evitar duplicação
  window.seletorLigasInicializado = true;
})();
