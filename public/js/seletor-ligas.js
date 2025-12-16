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

  // Função para criar o seletor de ligas de forma não intrusiva
  function criarSeletorLigas(ligas, ligaAtualId) {
    // Encontrar o elemento de título da página para inserir o seletor após ele
    const titulo = document.querySelector(
      ".liga-titulo, #nomeLiga, .titulo-pagina",
    );
    if (!titulo) return;

    // Verificar se o seletor já existe para evitar duplicação
    if (document.querySelector(".seletor-ligas-container")) return;

    // Criar o container do seletor com estilo discreto
    const seletorContainer = document.createElement("div");
    seletorContainer.className = "seletor-ligas-container";
    seletorContainer.style.cssText = `
      display: inline-block;
      margin-left: 15px;
      font-size: 14px;
      vertical-align: middle;
    `;

    // Criar o label e o select
    const label = document.createElement("label");
    label.textContent = "Liga: ";
    label.style.cssText = `
      font-weight: normal;
      color: #666;
    `;

    const select = document.createElement("select");
    select.className = "form-control form-control-sm seletor-ligas";
    select.style.cssText = `
      display: inline-block;
      width: auto;
      margin-left: 5px;
      padding: 2px 8px;
      height: auto;
      font-size: 14px;
    `;

    // Adicionar as opções ao select (apenas ligas únicas)
    const ligasUnicas = [];
    const ligasIds = new Set();

    ligas.forEach((liga) => {
      if (!ligasIds.has(liga.liga_id)) {
        ligasIds.add(liga.liga_id);
        ligasUnicas.push(liga);
      }
    });

    ligasUnicas.forEach((liga) => {
      const option = document.createElement("option");
      option.value = liga.liga_id;
      option.textContent = liga.nome;
      option.selected = liga.liga_id === ligaAtualId;
      select.appendChild(option);
    });

    // Adicionar evento de mudança
    select.addEventListener("change", function () {
      const novaLigaId = this.value;
      if (novaLigaId !== ligaAtualId) {
        // Redirecionar para a nova liga (sem barra inicial)
        window.location.href = `detalhe-liga.html?id=${novaLigaId}`;
      }
    });

    // Montar e inserir o seletor na página
    seletorContainer.appendChild(label);
    seletorContainer.appendChild(select);

    // Inserir após o título
    titulo.parentNode.insertBefore(seletorContainer, titulo.nextSibling);
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
