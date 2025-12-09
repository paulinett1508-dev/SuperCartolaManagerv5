// =====================================================================
// PARTICIPANTE NAVIGATION - Sistema de Navegação entre Módulos
// Destino: /participante/js/participante-navigation.js
// =====================================================================

if (window.Log) Log.info('PARTICIPANTE-NAV', '🚀 Carregando sistema de navegação...');

class ParticipanteNavigation {
    constructor() {
        this.moduloAtual = "boas-vindas";
        this.participanteData = null;
        this.modulosAtivos = {};
        this.modulos = {
            "boas-vindas": "/participante/fronts/boas-vindas.html",
            extrato: "/participante/fronts/extrato.html",
            ranking: "/participante/fronts/ranking.html",
            rodadas: "/participante/fronts/rodadas.html",
            top10: "/participante/fronts/top10.html",
            "melhor-mes": "/participante/fronts/melhor-mes.html",
            "pontos-corridos": "/participante/fronts/pontos-corridos.html",
            "mata-mata": "/participante/fronts/mata-mata.html",
            artilheiro: "/participante/fronts/artilheiro.html",
            "luva-ouro": "/participante/fronts/luva-ouro.html",
        };
    }

    async inicializar() {
        if (window.Log) Log.info('PARTICIPANTE-NAV', 'Inicializando navegação...');

        // Aguardar dados do participante
        await this.aguardarDadosParticipante();

        // Buscar módulos ativos da liga
        await this.carregarModulosAtivos();

        // Renderizar menu dinâmico
        this.renderizarMenuDinamico();

        // Configurar event listeners
        this.configurarEventListeners();

        // ✅ AJUSTE REFRESH: Recuperar módulo salvo ou usar boas-vindas
        const moduloSalvo =
            sessionStorage.getItem("participante_modulo_atual") ||
            "boas-vindas";

        // ✅ Sincronizar botão ativo do menu com módulo salvo
        if (moduloSalvo) {
            const navButtons = document.querySelectorAll(".nav-item-modern");
            navButtons.forEach((btn) => {
                btn.classList.remove("active");
                if (btn.dataset.module === moduloSalvo) {
                    btn.classList.add("active");
                }
            });
        }

        // Navegar para módulo (salvo ou inicial)
        await this.navegarPara(moduloSalvo);
    }

    async aguardarDadosParticipante() {
        if (window.Log) Log.debug('PARTICIPANTE-NAV', 'Aguardando dados do participante...');

        // Tentar obter dados da sessão
        let tentativas = 0;
        const maxTentativas = 10;

        while (!this.participanteData && tentativas < maxTentativas) {
            try {
                const response = await fetch("/api/participante/auth/session", {
                    credentials: "include",
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated && data.participante) {
                        this.participanteData = {
                            timeId: data.participante.timeId,
                            ligaId: data.participante.ligaId,
                            nomeCartola:
                                data.participante.participante?.nome_cartola ||
                                "Participante",
                            nomeTime:
                                data.participante.participante?.nome_time ||
                                "Meu Time",
                        };
                        if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Dados obtidos');
                        return;
                    }
                }
            } catch (error) {
                if (window.Log) Log.warn('PARTICIPANTE-NAV', 'Tentativa', tentativas + 1, 'falhou:', error);
            }

            tentativas++;
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (!this.participanteData) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Não foi possível obter dados do participante');
            window.location.href = "/participante-login.html";
        }
    }

    async carregarModulosAtivos() {
        if (window.Log) Log.debug('PARTICIPANTE-NAV', '🔍 Buscando configuração de módulos...');

        try {
            const response = await fetch(
                `/api/ligas/${this.participanteData.ligaId}`,
            );
            if (!response.ok) {
                throw new Error("Erro ao buscar configuração da liga");
            }

            const liga = await response.json();
            this.modulosAtivos = liga.modulos_ativos || {};

            if (window.Log) Log.debug('PARTICIPANTE-NAV', '📋 Módulos ativos recebidos');
        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Erro ao buscar módulos:', error);
            this.modulosAtivos = {
                extrato: true,
                ranking: true,
                rodadas: true,
                top10: false,
                melhorMes: false,
                pontosCorridos: false,
                mataMata: false,
                artilheiro: false,
                luvaOuro: false,
            };
        }
    }

    renderizarMenuDinamico() {
        const bottomNav = document.querySelector(".bottom-nav-modern");
        if (!bottomNav) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Bottom nav não encontrado');
            return;
        }

        const todosModulosDisponiveis = [
            { id: "boas-vindas", icon: "home", label: "Início", config: "extrato", base: true },
            { id: "extrato", icon: "payments", label: "Extrato", config: "extrato", base: true },
            { id: "ranking", icon: "bar_chart", label: "Ranking", config: "ranking", base: true },
            { id: "rodadas", icon: "target", label: "Rodadas", config: "rodadas", base: true },
            { id: "top10", icon: "format_list_numbered", label: "Top 10", config: "top10", base: false },
            { id: "melhor-mes", icon: "calendar_month", label: "Melhor Mês", config: "melhorMes", base: false },
            { id: "pontos-corridos", icon: "sync", label: "P. Corridos", config: "pontosCorridos", base: false },
            { id: "mata-mata", icon: "swords", label: "Mata-Mata", config: "mataMata", base: false },
            { id: "artilheiro", icon: "sports_soccer", label: "Artilheiro", config: "artilheiro", base: false },
            { id: "luva-ouro", icon: "front_hand", label: "Luva Ouro", config: "luvaOuro", base: false },
        ];

        const modulosAtivos = todosModulosDisponiveis.filter((m) =>
            this.verificarModuloAtivo(m.config),
        );

        if (window.Log) Log.debug('PARTICIPANTE-NAV', '📋 Módulos disponíveis:', modulosAtivos.length);

        bottomNav.innerHTML = modulosAtivos
            .map(
                (modulo) => `
            <button class="nav-item-modern ${modulo.id === "boas-vindas" ? "active" : ""}"
                    data-module="${modulo.id}"
                    data-icon="${modulo.icon}"
                    title="${modulo.label}">
                <span class="material-symbols-outlined nav-icon-modern">${modulo.icon}</span>
                <span class="nav-label-modern">${modulo.label}</span>
            </button>
        `,
            )
            .join("");

        bottomNav.style.overflowX = "auto";
        bottomNav.style.overflowY = "hidden";
        bottomNav.style.webkitOverflowScrolling = "touch";
        bottomNav.style.scrollbarWidth = "thin";

        if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Menu renderizado com', modulosAtivos.length, 'módulos');
    }

    verificarModuloAtivo(configKey) {
        if (!this.modulosAtivos || Object.keys(this.modulosAtivos).length === 0) {
            return ["extrato", "ranking", "rodadas"].includes(configKey);
        }
        return this.modulosAtivos[configKey] === true;
    }

    configurarEventListeners() {
        const navButtons = document.querySelectorAll(".nav-item-modern");

        navButtons.forEach((button) => {
            button.addEventListener("click", async (e) => {
                const modulo = button.dataset.module;
                if (window.Log) Log.debug('PARTICIPANTE-NAV', '🎯 Clique no módulo:', modulo);

                navButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");

                await this.navegarPara(modulo);
            });
        });

        if (window.Log) Log.debug('PARTICIPANTE-NAV', '✅ Event listeners configurados');
    }

    async navegarPara(moduloId, forcarReload = false) {
        if (window.Log) Log.info('PARTICIPANTE-NAV', `🧭 Navegando para: ${moduloId}`);

        const container = document.getElementById("moduleContainer");
        if (!container) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', '❌ Container não encontrado');
            return;
        }

        const nomeModulo = this.obterNomeModulo(moduloId);
        container.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 80px 20px; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="position: relative; width: 80px; height: 80px; margin-bottom: 24px;">
                    <div style="position: absolute; width: 80px; height: 80px; border: 4px solid rgba(255, 69, 0, 0.1); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="position: absolute; width: 60px; height: 60px; top: 10px; left: 10px; border: 3px solid rgba(255, 69, 0, 0.05); border-bottom: 3px solid #ff4500; border-radius: 50%; animation: spin 1.5s linear infinite reverse;"></div>
                </div>
                <h3 style="color: #333; margin-bottom: 8px; font-weight: 600;">Carregando ${nomeModulo}</h3>
                <p style="color: #999; font-size: 14px;">Aguarde um momento...</p>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;

        try {
            const htmlPath = this.modulos[moduloId];
            if (!htmlPath) {
                throw new Error(`Módulo "${moduloId}" não encontrado`);
            }

            const response = await fetch(htmlPath);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`O módulo "${nomeModulo}" ainda não está disponível`);
                }
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            await this.carregarModuloJS(moduloId);

            this.moduloAtual = moduloId;
            sessionStorage.setItem("participante_modulo_atual", moduloId);

            if (window.Log) Log.info('PARTICIPANTE-NAV', `✅ Módulo ${moduloId} carregado`);

            // ✅ SPLASH: Esconder após módulo carregado
            if (window.SplashScreen) {
                window.SplashScreen.hide();
            }

        } catch (error) {
            if (window.Log) Log.error('PARTICIPANTE-NAV', `❌ Erro ao carregar ${moduloId}:`, error);

            // ✅ SPLASH: Esconder mesmo em caso de erro
            if (window.SplashScreen) {
                window.SplashScreen.hide();
            }

            const mensagemErro = this.obterMensagemErroAmigavel(error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; max-width: 500px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); border-radius: 16px; padding: 40px; border: 2px solid rgba(239, 68, 68, 0.2);">
                        <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                        <h3 style="color: #dc2626; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Ops! Algo deu errado</h3>
                        <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">${mensagemErro}</p>
                        <button onclick="window.participanteNav.navegarPara('boas-vindas')"
                                style="background: #ff4500; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            `;
        }
    }

    obterNomeModulo(moduloId) {
        const nomes = {
            "boas-vindas": "Boas-Vindas",
            extrato: "Extrato Financeiro",
            ranking: "Ranking Geral",
            rodadas: "Rodadas",
            top10: "Top 10",
            "melhor-mes": "Melhor Mês",
            "pontos-corridos": "Pontos Corridos",
            "mata-mata": "Mata-Mata",
            artilheiro: "Artilheiro Campeão",
            "luva-ouro": "Luva de Ouro",
        };
        return nomes[moduloId] || moduloId;
    }

    obterMensagemErroAmigavel(error) {
        const mensagem = error.message.toLowerCase();

        if (mensagem.includes("não foi encontrado") || mensagem.includes("404")) {
            return "Este módulo ainda não está disponível. Entre em contato com o administrador da liga.";
        }
        if (mensagem.includes("network") || mensagem.includes("fetch")) {
            return "Falha na conexão. Verifique sua internet e tente novamente.";
        }
        if (mensagem.includes("timeout")) {
            return "A requisição demorou muito. Tente novamente em instantes.";
        }
        return error.message || "Ocorreu um erro inesperado. Tente novamente.";
    }

    async carregarModuloJS(modulo) {
        if (window.Log) Log.debug('PARTICIPANTE-NAV', `📦 Importando JS: ${modulo}`);

        const modulosPaths = {
            "boas-vindas": "/participante/js/modules/participante-boas-vindas.js",
            extrato: "/participante/js/modules/participante-extrato.js",
            ranking: "/participante/js/modules/participante-ranking.js",
            rodadas: "/participante/js/modules/participante-rodadas.js",
            top10: "/participante/js/modules/participante-top10.js",
            "melhor-mes": "/participante/js/modules/participante-melhor-mes.js",
            "pontos-corridos": "/participante/js/modules/participante-pontos-corridos.js",
            "mata-mata": "/participante/js/modules/participante-mata-mata.js",
            artilheiro: "/participante/js/modules/participante-artilheiro.js",
            "luva-ouro": "/participante/js/modules/participante-luva-ouro.js",
        };

        const jsPath = modulosPaths[modulo];
        if (jsPath) {
            try {
                const moduloJS = await import(jsPath);

                const moduloCamelCase = modulo
                    .split("-")
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join("");

                const possibleFunctionNames = [
                    `inicializar${moduloCamelCase}Participante`,
                    `inicializar${moduloCamelCase}`,
                    `inicializar${modulo}Participante`,
                    `inicializar${modulo}`,
                ];

                let functionExecuted = false;
                for (const funcName of possibleFunctionNames) {
                    if (moduloJS[funcName]) {
                        if (window.Log) Log.debug('PARTICIPANTE-NAV', `🚀 Executando: ${funcName}()`);
                        try {
                            if (this.participanteData) {
                                await moduloJS[funcName]({
                                    participante: this.participanteData,
                                    ligaId: this.participanteData.ligaId,
                                    timeId: this.participanteData.timeId,
                                });
                            } else {
                                await moduloJS[funcName]();
                            }
                            if (window.Log) Log.debug('PARTICIPANTE-NAV', `✅ ${funcName}() executada`);
                            functionExecuted = true;
                            break;
                        } catch (error) {
                            if (window.Log) Log.error('PARTICIPANTE-NAV', `❌ Erro em ${funcName}():`, error);
                        }
                    }
                }

                if (!functionExecuted) {
                    if (window.Log) Log.debug('PARTICIPANTE-NAV', `ℹ️ Sem função de init para '${modulo}'`);
                }
            } catch (error) {
                if (window.Log) Log.error('PARTICIPANTE-NAV', `❌ Erro ao importar '${jsPath}':`, error);
                throw error;
            }
        } else {
            if (window.Log) Log.debug('PARTICIPANTE-NAV', `ℹ️ Sem JS para '${modulo}'`);
        }
    }
}

// Instância global
const participanteNav = new ParticipanteNavigation();

// ✅ Expor globalmente para integração com SplashScreen
window.participanteNavigation = participanteNav;
window.participanteNav = participanteNav;

// Inicializar
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
        await participanteNav.inicializar();
    });
} else {
    participanteNav.inicializar();
}

if (window.Log) Log.info('PARTICIPANTE-NAV', '✅ Sistema pronto.');
