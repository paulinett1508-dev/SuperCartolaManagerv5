
// Utilitários de validação para o projeto Super Cartola Manager

// Validador de Liga ID
export function validarLigaId(ligaId) {
  if (!ligaId) {
    return { valido: false, erro: 'Liga ID é obrigatório' };
  }

  const ligaIdStr = ligaId.toString().trim();
  
  if (ligaIdStr === '' || ligaIdStr === 'null' || ligaIdStr === 'undefined') {
    return { valido: false, erro: 'Liga ID inválido' };
  }

  // Verificar se é um ObjectId válido do MongoDB (24 caracteres hexadecimais)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(ligaIdStr)) {
    // Se não for ObjectId, permitir IDs numéricos
    const numericId = parseInt(ligaIdStr);
    if (isNaN(numericId) || numericId <= 0) {
      return { valido: false, erro: 'Liga ID deve ser um ObjectId válido ou número positivo' };
    }
  }

  return { valido: true, ligaId: ligaIdStr };
}

// Validador de Rodada
export function validarRodada(rodada) {
  if (rodada === null || rodada === undefined) {
    return { valido: false, erro: 'Rodada é obrigatória' };
  }

  const rodadaNum = parseInt(rodada);
  
  if (isNaN(rodadaNum)) {
    return { valido: false, erro: 'Rodada deve ser um número' };
  }

  if (rodadaNum < 1 || rodadaNum > 38) {
    return { valido: false, erro: 'Rodada deve estar entre 1 e 38' };
  }

  return { valido: true, rodada: rodadaNum };
}

// Validador de Time ID
export function validarTimeId(timeId) {
  if (!timeId) {
    return { valido: false, erro: 'Time ID é obrigatório' };
  }

  const timeIdNum = parseInt(timeId);
  
  if (isNaN(timeIdNum) || timeIdNum <= 0) {
    return { valido: false, erro: 'Time ID deve ser um número positivo' };
  }

  return { valido: true, timeId: timeIdNum };
}

// Validador de Atleta ID
export function validarAtletaId(atletaId) {
  if (!atletaId) {
    return { valido: false, erro: 'Atleta ID é obrigatório' };
  }

  const atletaIdNum = parseInt(atletaId);
  
  if (isNaN(atletaIdNum) || atletaIdNum <= 0) {
    return { valido: false, erro: 'Atleta ID deve ser um número positivo' };
  }

  return { valido: true, atletaId: atletaIdNum };
}

// Validador de dados de Scout
export function validarDadosScout(scout) {
  if (!scout || typeof scout !== 'object') {
    return {
      valido: false,
      erro: 'Dados de scout inválidos',
      gols: 0,
      golsContra: 0
    };
  }

  const gols = parseInt(scout.G) || 0;
  const golsContra = parseInt(scout.GC) || 0;

  const erros = [];

  // Validar gols
  if (gols < 0) {
    erros.push('Gols não pode ser negativo');
  } else if (gols > 10) {
    erros.push('Número de gols suspeito (máximo esperado: 10)');
  }

  // Validar gols contra
  if (golsContra < 0) {
    erros.push('Gols contra não pode ser negativo');
  } else if (golsContra > 5) {
    erros.push('Número de gols contra suspeito (máximo esperado: 5)');
  }

  return {
    valido: erros.length === 0,
    erros: erros,
    gols: Math.max(0, Math.min(10, gols)),
    golsContra: Math.max(0, Math.min(5, golsContra)),
    golsLiquidos: gols - golsContra
  };
}

// Validador de nome de atleta
export function validarNomeAtleta(nome) {
  if (!nome) {
    return { valido: false, erro: 'Nome do atleta é obrigatório' };
  }

  const nomeStr = nome.toString().trim();
  
  if (nomeStr.length === 0) {
    return { valido: false, erro: 'Nome do atleta não pode estar vazio' };
  }

  if (nomeStr.length > 100) {
    return { valido: false, erro: 'Nome do atleta muito longo (máximo 100 caracteres)' };
  }

  // Verificar caracteres válidos (letras, números, espaços, acentos, hífen)
  const nomeRegex = /^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/;
  if (!nomeRegex.test(nomeStr)) {
    return { valido: false, erro: 'Nome do atleta contém caracteres inválidos' };
  }

  return { valido: true, nome: nomeStr };
}

// Validador de pontos
export function validarPontos(pontos) {
  if (pontos === null || pontos === undefined) {
    return { valido: true, pontos: 0 }; // Pontos são opcionais
  }

  const pontosNum = parseFloat(pontos);
  
  if (isNaN(pontosNum)) {
    return { valido: false, erro: 'Pontos deve ser um número' };
  }

  if (pontosNum < -50 || pontosNum > 100) {
    return { valido: false, erro: 'Pontos fora do intervalo esperado (-50 a 100)' };
  }

  return { valido: true, pontos: pontosNum };
}

// Validador de posição
export function validarPosicao(posicao) {
  if (posicao === null || posicao === undefined) {
    return { valido: true, posicao: null }; // Posição é opcional
  }

  const posicaoNum = parseInt(posicao);
  
  if (isNaN(posicaoNum)) {
    return { valido: false, erro: 'Posição deve ser um número' };
  }

  if (posicaoNum < 1 || posicaoNum > 6) {
    return { valido: false, erro: 'Posição deve estar entre 1 e 6' };
  }

  return { valido: true, posicao: posicaoNum };
}

// Validador completo de registro de gols
export function validarRegistroGols(registro) {
  const erros = [];
  const dadosValidados = {};

  // Validar Liga ID
  const validacaoLiga = validarLigaId(registro.ligaId);
  if (!validacaoLiga.valido) {
    erros.push(validacaoLiga.erro);
  } else {
    dadosValidados.ligaId = registro.ligaId;
  }

  // Validar Rodada
  const validacaoRodada = validarRodada(registro.rodada);
  if (!validacaoRodada.valido) {
    erros.push(validacaoRodada.erro);
  } else {
    dadosValidados.rodada = validacaoRodada.rodada;
  }

  // Validar Atleta ID
  const validacaoAtleta = validarAtletaId(registro.atletaId);
  if (!validacaoAtleta.valido) {
    erros.push(validacaoAtleta.erro);
  } else {
    dadosValidados.atletaId = validacaoAtleta.atletaId;
  }

  // Validar Time ID
  const validacaoTime = validarTimeId(registro.timeId);
  if (!validacaoTime.valido) {
    erros.push(validacaoTime.erro);
  } else {
    dadosValidados.timeId = validacaoTime.timeId;
  }

  // Validar Nome
  const validacaoNome = validarNomeAtleta(registro.nome);
  if (!validacaoNome.valido) {
    erros.push(validacaoNome.erro);
  } else {
    dadosValidados.nome = validacaoNome.nome;
  }

  // Validar dados de scout
  const validacaoScout = validarDadosScout({
    G: registro.gols,
    GC: registro.golsContra
  });
  
  if (!validacaoScout.valido) {
    erros.push(...validacaoScout.erros);
  }
  
  dadosValidados.gols = validacaoScout.gols;
  dadosValidados.golsContra = validacaoScout.golsContra;
  dadosValidados.golsLiquidos = validacaoScout.golsLiquidos;
  dadosValidados.scoutValido = validacaoScout.valido;

  // Validar Pontos (opcional)
  const validacaoPontos = validarPontos(registro.pontos);
  if (!validacaoPontos.valido) {
    erros.push(validacaoPontos.erro);
  } else {
    dadosValidados.pontos = validacaoPontos.pontos;
  }

  // Validar Posição (opcional)
  const validacaoPosicao = validarPosicao(registro.posicao);
  if (!validacaoPosicao.valido) {
    erros.push(validacaoPosicao.erro);
  } else {
    dadosValidados.posicao = validacaoPosicao.posicao;
  }

  // Adicionar campos de controle
  dadosValidados.dataColeta = new Date();
  dadosValidados.ativo = true;

  return {
    valido: erros.length === 0,
    erros: erros,
    dados: dadosValidados
  };
}

// Validador de parâmetros de requisição HTTP
export function validarParametrosRequisicao(req) {
  const erros = [];
  const parametros = {};

  // Validar Liga ID dos parâmetros da URL
  if (req.params.ligaId) {
    const validacaoLiga = validarLigaId(req.params.ligaId);
    if (!validacaoLiga.valido) {
      erros.push(`Parâmetro ligaId: ${validacaoLiga.erro}`);
    } else {
      parametros.ligaId = req.params.ligaId;
    }
  }

  // Validar Rodada dos parâmetros da URL
  if (req.params.rodada) {
    const validacaoRodada = validarRodada(req.params.rodada);
    if (!validacaoRodada.valido) {
      erros.push(`Parâmetro rodada: ${validacaoRodada.erro}`);
    } else {
      parametros.rodada = validacaoRodada.rodada;
    }
  }

  // Validar Time ID dos parâmetros da URL
  if (req.params.timeId) {
    const validacaoTime = validarTimeId(req.params.timeId);
    if (!validacaoTime.valido) {
      erros.push(`Parâmetro timeId: ${validacaoTime.erro}`);
    } else {
      parametros.timeId = validacaoTime.timeId;
    }
  }

  // Validar query parameters
  if (req.query.limite) {
    const limite = parseInt(req.query.limite);
    if (isNaN(limite) || limite < 1 || limite > 1000) {
      erros.push('Query parameter limite deve ser um número entre 1 e 1000');
    } else {
      parametros.limite = limite;
    }
  }

  if (req.query.formato && !['json', 'csv'].includes(req.query.formato)) {
    erros.push('Query parameter formato deve ser "json" ou "csv"');
  } else if (req.query.formato) {
    parametros.formato = req.query.formato;
  }

  return {
    valido: erros.length === 0,
    erros: erros,
    parametros: parametros
  };
}

// Sanitizador de dados de entrada
export function sanitizarDados(dados) {
  const dadosSanitizados = {};

  for (const [chave, valor] of Object.entries(dados)) {
    if (typeof valor === 'string') {
      // Remover espaços em branco e caracteres de controle
      dadosSanitizados[chave] = valor.trim().replace(/[\x00-\x1F\x7F]/g, '');
    } else if (typeof valor === 'number') {
      // Verificar se é um número válido
      dadosSanitizados[chave] = isNaN(valor) ? 0 : valor;
    } else {
      dadosSanitizados[chave] = valor;
    }
  }

  return dadosSanitizados;
}
