// SISTEMA DE MÓDULOS - INICIALIZAÇÃO
// Carregado ANTES de qualquer outro script

(function () {
    "use strict";

    // Criar sistema se não existir
    if (!window.sistemaModulos) {
        window.sistemaModulos = {
            registrar: function (nome, modulo) {
                window.modulosCarregados = window.modulosCarregados || {};
                window.modulosCarregados[nome] = modulo;
                return modulo;
            },
            obter: function (nome) {
                return (
                    window.modulosCarregados && window.modulosCarregados[nome]
                );
            },
            listar: function () {
                return window.modulosCarregados
                    ? Object.keys(window.modulosCarregados)
                    : [];
            },
            existe: function (nome) {
                return !!(
                    window.modulosCarregados && window.modulosCarregados[nome]
                );
            },
        };
    }

    // Garantir objeto global
    window.modulosCarregados = window.modulosCarregados || {};
})();
