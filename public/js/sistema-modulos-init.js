
// ✅ SISTEMA DE MÓDULOS - INICIALIZAÇÃO IMEDIATA
// Este arquivo DEVE ser carregado ANTES de qualquer outro script

(function() {
    'use strict';
    
    console.log('🔧 [SISTEMA-MODULOS] Inicializando sistema de módulos...');

    // ✅ CRIAR SISTEMA ANTES DE QUALQUER COISA
    if (!window.sistemaModulos) {
        window.sistemaModulos = {
            registrar: function(nome, modulo) {
                window.modulosCarregados = window.modulosCarregados || {};
                window.modulosCarregados[nome] = modulo;
                console.log(`✅ [SISTEMA-MODULOS] ${nome} registrado`);
                return modulo;
            },
            obter: function(nome) {
                return window.modulosCarregados && window.modulosCarregados[nome];
            },
            listar: function() {
                return window.modulosCarregados ? Object.keys(window.modulosCarregados) : [];
            },
            existe: function(nome) {
                return !!(window.modulosCarregados && window.modulosCarregados[nome]);
            }
        };
    }

    // ✅ GARANTIR OBJETO GLOBAL
    window.modulosCarregados = window.modulosCarregados || {};

    console.log('✅ [SISTEMA-MODULOS] Sistema inicializado com sucesso');
    console.log(`📦 [SISTEMA-MODULOS] Módulos disponíveis: ${Object.keys(window.modulosCarregados).length}`);

})();
