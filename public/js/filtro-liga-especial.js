// Correção para filtrar times na liga Cartoleiros Sobral (ID 6818c6125b30e1ad70847192)

// Função para obter os IDs dos times participantes da liga especial
async function obterTimesLigaEspecial(ligaId) {
  console.log(`[filtro-liga-especial.js] Verificando se é a liga especial: ${ligaId}`);

  // Verifica se é a liga especial
  if (ligaId !== "6818c6125b30e1ad70847192") {
    console.log("[filtro-liga-especial.js] Não é a liga especial, retornando null");
    return null;
  }

  try {
    console.log("[filtro-liga-especial.js] Buscando times da liga especial");
    const response = await fetch(`/api/ligas/${ligaId}/times`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar times: ${response.status}`);
    }

    const times = await response.json();
    console.log(`[filtro-liga-especial.js] ${times.length} times encontrados na liga especial`);

    // Extrai apenas os IDs dos times
    const timeIds = times.map(time => {
      const id = time.id || time.time_id || time.timeId;
      console.log(`[filtro-liga-especial.js] Time encontrado: ID=${id}, Nome=${time.nome_time || time.nome}, Cartoleiro=${time.nome_cartola || time.nome_cartoleiro}`);
      return String(id);
    });

    return timeIds;
  } catch (error) {
    console.error("[filtro-liga-especial.js] Erro ao obter times da liga especial:", error);
    return [];
  }
}

// Função para filtrar dados por times da liga especial
async function filtrarDadosPorTimesLigaEspecial(dados, ligaId, idField = "time_id") {
  const timeIds = await obterTimesLigaEspecial(ligaId);

  // Se não for a liga especial ou não conseguiu obter os times, retorna os dados originais
  if (!timeIds) {
    return dados;
  }

  console.log(`[filtro-liga-especial.js] Filtrando dados para ${timeIds.length} times da liga especial`);

  // Se não houver dados ou não for um array, retorna array vazio
  if (!dados || !Array.isArray(dados)) {
    console.warn("[filtro-liga-especial.js] Dados inválidos para filtrar");
    return [];
  }

  // Filtra os dados para incluir apenas os times da liga especial
  const dadosFiltrados = dados.filter(item => {
    // Tenta diferentes propriedades de ID
    const itemId = String(item[idField] || item.timeId || item.time_id || item.id);
    const pertenceLiga = timeIds.includes(itemId);

    if (!pertenceLiga) {
      console.log(`[filtro-liga-especial.js] Time ID=${itemId} não pertence à liga especial, removendo`);
    }

    return pertenceLiga;
  });

  console.log(`[filtro-liga-especial.js] Filtro aplicado: ${dadosFiltrados.length}/${dados.length} itens mantidos`);
  return dadosFiltrados;
}

// Função para aplicar o filtro em todas as abas
async function aplicarFiltroLigaEspecial() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");

  // Verifica se é a liga especial
  if (ligaId !== "6818c6125b30e1ad70847192") {
    console.log("[filtro-liga-especial.js] Não é a liga especial, nenhum filtro será aplicado");
    return;
  }

  console.log("[filtro-liga-especial.js] Aplicando filtros para a liga especial");

  // Obtém os IDs dos times da liga especial
  const timeIds = await obterTimesLigaEspecial(ligaId);
  if (!timeIds || timeIds.length === 0) {
    console.error("[filtro-liga-especial.js] Não foi possível obter os times da liga especial");
    return;
  }

  // Armazena os IDs em uma variável global para uso em outros módulos
  window.timesLigaEspecial = timeIds;

  console.log("[filtro-liga-especial.js] Filtros aplicados com sucesso");
}

// Exporta as funções para uso em outros módulos
export {
  obterTimesLigaEspecial,
  filtrarDadosPorTimesLigaEspecial,
  aplicarFiltroLigaEspecial
};
