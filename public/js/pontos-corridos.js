// PONTOS-CORRIDOS.JS - ARQUIVO PRINCIPAL REFATORADO
// Ponto de entrada que importa e expõe funcionalidades do orquestrador modular

import {
  PONTOS_CORRIDOS_CONFIG,
  calcularRodadaBrasileirao,
  getLigaId,
} from "./pontos-corridos/pontos-corridos-config.js";

import {
  renderizarInterface,
  renderSeletorRodada,
  renderLoadingState,
  renderErrorState,
  renderTabelaRodada,
  renderTabelaClassificacao,
  atualizarContainer,
  configurarBotaoVoltar,
  limparCacheUI,
} from "./pontos-corridos/pontos-corridos-ui.js";

import {
  gerarConfrontos,
  calcularClassificacao,
  normalizarDadosParaExportacao,
  normalizarClassificacaoParaExportacao,
  setRankingFunction,
  buscarStatusMercado,
  buscarTimesLiga,
} from "./pontos-corridos/pontos-corridos-core.js";

import { carregarPontosCorridos } from "./pontos-corridos/pontos-corridos-orquestrador.js";
import {
  getConfrontosLigaPontosCorridos,
  calcularFinanceiroConfronto,
  getRodadaPontosText,
} from "./pontos-corridos/pontos-corridos-core.js";

import {
  criarBotaoExportacaoPontosCorridosRodada,
  criarBotaoExportacaoPontosCorridosClassificacao,
} from "./exports/export-pontos-corridos.js";

// Exportar função principal
export { carregarPontosCorridos };

// Exportar funções para fluxo financeiro e mata-mata
export {
  getConfrontosLigaPontosCorridos,
  calcularFinanceiroConfronto,
  getRodadaPontosText,
};

// Compatibilidade com sistema global
window.carregarPontosCorridos = carregarPontosCorridos;
window.inicializarPontosCorridos = carregarPontosCorridos;
window.getConfrontosLigaPontosCorridos = getConfrontosLigaPontosCorridos;
window.calcularFinanceiroConfronto = calcularFinanceiroConfronto;
window.getRodadaPontosText = getRodadaPontosText;

console.log("[PONTOS-CORRIDOS] Sistema modular carregado com arquitetura refatorada");