// LOG MANAGER - Sistema de Controle de Logs por Ambiente
// Carregado APÓS sistema-modulos-init.js e ANTES dos demais módulos
(function () {
    "use strict";

    // Detectar ambiente automaticamente
    const isProduction = (function () {
        const hostname = window.location.hostname;
        // Produção: domínios sem localhost/127.0.0.1/replit dev
        return (
            !hostname.includes("localhost") &&
            !hostname.includes("127.0.0.1") &&
            !hostname.includes(".repl.co") &&
            !hostname.includes("webcontainer")
        );
    })();

    // Níveis de log
    const LOG_LEVELS = {
        OFF: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4,
    };

    // Configuração por ambiente
    const config = {
        level: isProduction ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG,
        showTimestamp: !isProduction,
        prefix: "[SCM]",
    };

    // Formatador de mensagem
    function formatMessage(level, module, message) {
        const parts = [];
        if (config.showTimestamp) {
            parts.push(new Date().toLocaleTimeString("pt-BR"));
        }
        if (module) {
            parts.push(`[${module}]`);
        }
        parts.push(message);
        return parts.join(" ");
    }

    // LogManager
    const LogManager = {
        // Verificar se é produção
        isProduction: isProduction,

        // Alterar nível em runtime (útil para debug temporário)
        setLevel: function (level) {
            if (LOG_LEVELS[level] !== undefined) {
                config.level = LOG_LEVELS[level];
            }
        },

        // Métodos de log
        debug: function (module, ...args) {
            if (config.level >= LOG_LEVELS.DEBUG) {
                console.log(formatMessage("DEBUG", module, ""), ...args);
            }
        },

        info: function (module, ...args) {
            if (config.level >= LOG_LEVELS.INFO) {
                console.log(formatMessage("INFO", module, ""), ...args);
            }
        },

        warn: function (module, ...args) {
            if (config.level >= LOG_LEVELS.WARN) {
                console.warn(formatMessage("WARN", module, ""), ...args);
            }
        },

        error: function (module, ...args) {
            if (config.level >= LOG_LEVELS.ERROR) {
                console.error(formatMessage("ERROR", module, ""), ...args);
            }
        },

        // Log condicional (sempre executa em dev, nunca em prod)
        dev: function (module, ...args) {
            if (!isProduction) {
                console.log(formatMessage("DEV", module, ""), ...args);
            }
        },

        // Grupo de logs (útil para debug complexo)
        group: function (module, label) {
            if (config.level >= LOG_LEVELS.DEBUG && !isProduction) {
                console.group(formatMessage("", module, label));
            }
        },

        groupEnd: function () {
            if (config.level >= LOG_LEVELS.DEBUG && !isProduction) {
                console.groupEnd();
            }
        },

        // Tabela (útil para arrays/objetos)
        table: function (module, data) {
            if (config.level >= LOG_LEVELS.DEBUG && !isProduction) {
                console.log(formatMessage("TABLE", module, ""));
                console.table(data);
            }
        },
    };

    // Registrar no sistema de módulos
    if (window.sistemaModulos) {
        window.sistemaModulos.registrar("LogManager", LogManager);
    }

    // Expor globalmente para fácil acesso
    window.Log = LogManager;

    // Auto-log de inicialização (só em dev)
    if (!isProduction) {
        console.log(
            `%c[LOG-MANAGER] ✅ Ambiente: ${isProduction ? "PRODUÇÃO" : "DESENVOLVIMENTO"} | Nível: ${Object.keys(LOG_LEVELS).find((k) => LOG_LEVELS[k] === config.level)}`,
            "color: #10b981; font-weight: bold;",
        );
    }
})();
