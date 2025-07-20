// ✅ ARTILHEIRO-CAMPEAO-UTILS.JS v1.0
// Utilitários compartilhados do sistema de artilheiros

console.log("🛠️ [ARTILHEIRO-UTILS] Módulo v1.0 carregando...");

// ✅ CONFIGURAÇÕES
const UTILS_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  defaultTimeout: 10000
};

// ✅ UTILITÁRIOS CORE
export const ArtilheiroUtils = {
  version: "1.0.0",

  // Fazer requisição com retry inteligente
  async fazerRequisicao(url, options = {}) {
    for (let tentativa = 1; tentativa <= UTILS_CONFIG.maxRetries; tentativa++) {
      try {
        console.log(`🔗 [UTILS] Requisição ${tentativa}/${UTILS_CONFIG.maxRetries}: ${url}`);

        const response = await fetch(url, {
          ...options,
          timeout: UTILS_CONFIG.defaultTimeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Cartola-League-Manager/3.0',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data };

      } catch (error) {
        console.warn(`⚠️ [UTILS] Tentativa ${tentativa} falhou:`, error.message);

        if (tentativa === UTILS_CONFIG.maxRetries) {
          return { success: false, error: error.message };
        }

        // Delay progressivo entre tentativas
        await this.delay(UTILS_CONFIG.retryDelay * tentativa);
      }
    }
  },

  // Delay simples
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Validar estrutura de dados
  validarDados(dados, campos = []) {
    if (!dados) {
      throw new Error("Dados não fornecidos");
    }

    campos.forEach(campo => {
      if (!(campo in dados)) {
        throw new Error(`Campo obrigatório ausente: ${campo}`);
      }
    });

    return true;
  },

  // Validar se é um array não vazio
  validarArray(array, nome = "array") {
    if (!Array.isArray(array)) {
      throw new Error(`${nome} deve ser um array`);
    }

    if (array.length === 0) {
      throw new Error(`${nome} não pode estar vazio`);
    }

    return true;
  },

  // Formatar nome para exibição
  formatarNome(nome, maxLength = 20) {
    if (!nome) return "N/D";
    if (typeof nome !== 'string') return String(nome);

    return nome.length > maxLength ? 
      nome.substring(0, maxLength - 3) + "..." : 
      nome;
  },

  // Formatar número com sinal
  formatarSaldo(numero) {
    if (typeof numero !== 'number') return "0";

    if (numero > 0) return `+${numero}`;
    if (numero < 0) return `${numero}`;
    return "0";
  },

  // Formatar número com separador de milhares
  formatarNumero(numero, casasDecimais = 0) {
    if (typeof numero !== 'number') return "0";

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: casasDecimais,
      maximumFractionDigits: casasDecimais
    });
  },

  // Calcular média
  calcularMedia(valores, casasDecimais = 2) {
    if (!Array.isArray(valores) || valores.length === 0) return 0;

    const soma = valores.reduce((acc, val) => acc + (val || 0), 0);
    const media = soma / valores.length;

    return parseFloat(media.toFixed(casasDecimais));
  },

  // Calcular porcentagem
  calcularPorcentagem(parte, total, casasDecimais = 1) {
    if (!total || total === 0) return 0;

    const porcentagem = (parte / total) * 100;
    return parseFloat(porcentagem.toFixed(casasDecimais));
  },

  // Ordenar array por múltiplos critérios
  ordenarPorCriterios(array, criterios) {
    return array.sort((a, b) => {
      for (const criterio of criterios) {
        const { campo, ordem = 'desc' } = criterio;

        let valorA = a[campo];
        let valorB = b[campo];

        // Converter para números se possível
        if (!isNaN(valorA)) valorA = parseFloat(valorA);
        if (!isNaN(valorB)) valorB = parseFloat(valorB);

        if (valorA !== valorB) {
          if (ordem === 'desc') {
            return valorB > valorA ? 1 : -1;
          } else {
            return valorA > valorB ? 1 : -1;
          }
        }
      }
      return 0;
    });
  },

  // Debounce para evitar múltiplas chamadas
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  // Throttle para limitar frequência de chamadas
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Gerar ID único
  gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Sanitizar string para uso em HTML
  sanitizarHTML(str) {
    if (!str) return '';

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return str.replace(/[&<>"']/g, (m) => map[m]);
  },

  // Formatar data
  formatarData(data, formato = 'completo') {
    if (!data) return 'N/D';

    const dataObj = data instanceof Date ? data : new Date(data);

    if (isNaN(dataObj.getTime())) return 'Data inválida';

    const opcoes = {
      'completo': {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      },
      'data': {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      },
      'hora': {
        hour: '2-digit',
        minute: '2-digit'
      },
      'relativo': null // Será tratado separadamente
    };

    if (formato === 'relativo') {
      return this.formatarDataRelativa(dataObj);
    }

    return dataObj.toLocaleDateString('pt-BR', opcoes[formato] || opcoes.completo);
  },

  // Formatar data relativa (há X minutos, há X horas, etc)
  formatarDataRelativa(data) {
    const agora = new Date();
    const diferenca = agora.getTime() - data.getTime();

    const minutos = Math.floor(diferenca / (1000 * 60));
    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    const dias = Math.floor(diferenca / (1000 * 60 *