// LOG MANAGER v2.0 - Sistema de Controle de Logs por Ambiente
// Carregado ANTES de todos os outros scripts
// Em PRODUÇÃO: Silencia TODOS os console.* (log, warn, error, info, debug)
// Em DEV (localhost/127.0.0.1): Mantém logs normais
(function () {
    "use strict";

    // Detectar ambiente automaticamente
    const hostname = window.location.hostname;
    const isDevelopment = (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.includes(".repl.co") ||
        hostname.includes("replit.dev") ||
        hostname.includes("replit.app") ||
        hostname.includes("webcontainer")
    );
    const isProduction = !isDevelopment;

    // =========================================================================
    // SILENCIAMENTO TOTAL EM PRODUÇÃO
    // =========================================================================
    if (isProduction) {
        // Guardar referências originais (para uso interno se necessário)
        const originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
            debug: console.debug.bind(console),
            table: console.table.bind(console),
            group: console.group.bind(console),
            groupEnd: console.groupEnd.bind(console),
            trace: console.trace.bind(console),
        };

        // Função vazia (no-op)
        const noop = function() {};

        // Sobrescrever TODOS os métodos de console
        console.log = noop;
        console.warn = noop;
        console.error = noop;
        console.info = noop;
        console.debug = noop;
        console.table = noop;
        console.group = noop;
        console.groupEnd = noop;
        console.trace = noop;

        // Expor método para logs críticos (apenas erros fatais do sistema)
        window.__criticalLog = originalConsole.error;
    }

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
            `%c[LOG-MANAGER] v2.0 | Ambiente: DESENVOLVIMENTO | Logs: ATIVOS`,
            "color: #10b981; font-weight: bold;",
        );
    }
    // Em produção: Silêncio total (console.* já foi sobrescrito acima)
})();
