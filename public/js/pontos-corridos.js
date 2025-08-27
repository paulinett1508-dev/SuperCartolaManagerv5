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

// Exportar funções para fluxo financeiro
export { getConfrontosLigaPontosCorridos, calcularFinanceiroConfronto };

// Exportar função para mata-mata (CORREÇÃO CRÍTICA)
export { getRodadaPontosText };

// Compatibilidade com sistema global (manter funcionalidades existentes)
window.carregarPontosCorridos = carregarPontosCorridos;
window.inicializarPontosCorridos = carregarPontosCorridos; // Alias para compatibilidade
window.getConfrontosLigaPontosCorridos = getConfrontosLigaPontosCorridos;
window.calcularFinanceiroConfronto = calcularFinanceiroConfronto;
window.getRodadaPontosText = getRodadaPontosText; // CORREÇÃO para mata-mata

console.log("[PONTOS-CORRIDOS] Sistema modular carregado com arquitetura refatorada");