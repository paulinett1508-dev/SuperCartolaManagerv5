/**
 * Módulo para seleção e troca de ligas no Super Cartola Manager
 * Implementação não intrusiva que preserva o layout original
 */

// Função auto-executável para evitar poluição do escopo global
(function () {
  // Verificar se o seletor já foi inicializado para evitar duplicação
  if (window.seletorLigasInicializado) return;

  // Função principal que será executada quando o DOM estiver pronto
  function inicializarSeletorLigas() {
    // Obter o ID da liga atual da URL
    const urlParams = new URLSearchParams(window.location.search);
    const ligaAtualId = urlParams.get("id");

    if (!ligaAtualId) return;

    // Ligas conhecidas para fallback (evita erro 404)
    const ligasConhecidas = [
      { liga_id: "684cb1c8af923da7c7df51de", nome: "Super Cartola 2025" },
      { liga_id: "684d821cf1a7ae16d1f89572", nome: "Cartoleiros Sobral 2025" },
    ];

    // Verificar se a liga atual está entre as conhecidas
    const ligaAtual = ligasConhecidas.find(
      (liga) => liga.liga_id === ligaAtualId,
    );

    // Se a liga atual não estiver entre as conhecidas, não mostrar o seletor
    if (!ligaAtual) return;

    // Usar diretamente as ligas conhecidas sem tentar buscar da API
    // Isso evita o erro 404 e mensagens de aviso no console
    criarSeletorLigas(ligasConhecidas, ligaAtualId);
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
