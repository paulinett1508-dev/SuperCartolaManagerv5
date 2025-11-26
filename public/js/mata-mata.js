
// MATA-MATA.JS - ARQUIVO PRINCIPAL REFATORADO
// Ponto de entrada que importa e expõe funcionalidades do orquestrador modular

import { carregarMataMata } from "./mata-mata/mata-mata-orquestrador.js";
import {
  getResultadosMataMata,
  getResultadosMataMataFluxo,
  debugEdicoesMataMataFluxo,
  testarDadosMataMata,
} from "./mata-mata/mata-mata-financeiro.js";

// Exportar função principal
export { carregarMataMata };

// Exportar funções financeiras
export { getResultadosMataMata, getResultadosMataMataFluxo };

// Exportar funções de debug e teste
export { debugEdicoesMataMataFluxo, testarDadosMataMata };

// Compatibilidade com sistema global (manter funcionalidades existentes)
window.carregarMataMata = carregarMataMata;
window.getResultadosMataMata = getResultadosMataMata;
window.getResultadosMataMataFluxo = getResultadosMataMataFluxo;
window.debugEdicoesMataMataFluxo = debugEdicoesMataMataFluxo;
window.testarDadosMataMata = testarDadosMataMata;

console.log("[MATA-MATA] Sistema modular carregado com arquitetura refatorada");
