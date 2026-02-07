// =====================================================================
// LIGA LOGOS v1.0 - Configuração de Logos por Liga
// =====================================================================
// Gerencia as logos das ligas para splash screen e outras áreas
//
// Regras:
// 1. Se participante está em MÚLTIPLAS LIGAS → logo do sistema
// 2. Se participante está em UMA LIGA → logo da liga específica
// 3. Fallback → logo do sistema
// =====================================================================

(function() {
    'use strict';

    console.log('[LIGA-LOGOS] v1.0 Inicializando...');

    // =====================================================================
    // CONFIGURAÇÃO DE LOGOS POR LIGA
    // =====================================================================
    const LOGOS_CONFIG = {
        // Logo padrão do sistema (usada para múltiplas ligas ou fallback)
        sistema: '/img/newlogo-supercartola.png',

        // Mapeamento de liga_id → logo
        ligas: {
            '684cb1c8af923da7c7df51de': '/img/newlogo-supercartola.png',  // Super Cartola
            '6977a62071dee12036bb163e': '/img/logo-osfuleros.png',         // Os Fuleros
        },

        // Mapeamento por nome (fallback caso ID não encontrado)
        ligasPorNome: {
            'super cartola': '/img/newlogo-supercartola.png',
            'os fuleros': '/img/logo-osfuleros.png',
        }
    };

    // =====================================================================
    // API PÚBLICA
    // =====================================================================

    /**
     * Obtém a logo apropriada baseada na liga e quantidade de ligas
     * @param {string} ligaId - ID da liga atual
     * @param {string} ligaNome - Nome da liga (fallback)
     * @param {boolean} multiplasLigas - Se participante está em múltiplas ligas
     * @returns {string} URL da logo
     */
    function getLogo(ligaId, ligaNome = null, multiplasLigas = false) {
        // Regra 1: Múltiplas ligas → logo do sistema
        if (multiplasLigas) {
            console.log('[LIGA-LOGOS] Múltiplas ligas detectadas - usando logo do sistema');
            return LOGOS_CONFIG.sistema;
        }

        // Regra 2: Buscar por ID
        if (ligaId && LOGOS_CONFIG.ligas[ligaId]) {
            console.log('[LIGA-LOGOS] Logo encontrada por ID:', ligaId);
            return LOGOS_CONFIG.ligas[ligaId];
        }

        // Regra 3: Buscar por nome (fallback)
        if (ligaNome) {
            const nomeNormalizado = ligaNome.toLowerCase().trim();
            if (LOGOS_CONFIG.ligasPorNome[nomeNormalizado]) {
                console.log('[LIGA-LOGOS] Logo encontrada por nome:', ligaNome);
                return LOGOS_CONFIG.ligasPorNome[nomeNormalizado];
            }
        }

        // Fallback: logo do sistema
        console.log('[LIGA-LOGOS] Fallback para logo do sistema');
        return LOGOS_CONFIG.sistema;
    }

    /**
     * Obtém a logo do sistema (para tela Sobre, footer, etc)
     * @returns {string} URL da logo do sistema
     */
    function getLogoSistema() {
        return LOGOS_CONFIG.sistema;
    }

    /**
     * Atualiza a logo da splash screen
     * @param {string} logoUrl - URL da nova logo
     */
    function atualizarSplashLogo(logoUrl) {
        const splashLogo = document.querySelector('.splash-logo-img');
        if (splashLogo) {
            splashLogo.src = logoUrl;
            console.log('[LIGA-LOGOS] Splash logo atualizada:', logoUrl);
        }
    }

    /**
     * Atualiza todas as logos do app baseado no contexto do participante
     * @param {object} contexto - { ligaId, ligaNome, multiplasLigas }
     */
    function atualizarLogosApp(contexto = {}) {
        const { ligaId, ligaNome, multiplasLigas } = contexto;
        const logo = getLogo(ligaId, ligaNome, multiplasLigas);

        // Atualizar splash
        atualizarSplashLogo(logo);

        // Disparar evento para outros módulos
        window.dispatchEvent(new CustomEvent('liga-logo-atualizada', {
            detail: { logo, ligaId, multiplasLigas }
        }));

        return logo;
    }

    // =====================================================================
    // EXPOR API GLOBAL
    // =====================================================================
    window.LigaLogos = {
        getLogo,
        getLogoSistema,
        atualizarSplashLogo,
        atualizarLogosApp,
        config: LOGOS_CONFIG
    };

    console.log('[LIGA-LOGOS] v1.0 Sistema inicializado');
})();
