// PONTOS-CORRIDOS.JS - ARQUIVO PRINCIPAL REFATORADO
// Ponto de entrada que importa e expõe funcionalidades do orquestrador modular

import { carregarPontosCorridos } from "./pontos-corridos/pontos-corridos-orquestrador.js";
import {
  getConfrontosLigaPontosCorridos,
  calcularFinanceiroConfronto,
  getRodadaPontosText,
} from "./pontos-corridos/pontos-corridos-core.js";

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

console.log(
  "[PONTOS-CORRIDOS] Sistema modular carregado com arquitetura refatorada",
);
