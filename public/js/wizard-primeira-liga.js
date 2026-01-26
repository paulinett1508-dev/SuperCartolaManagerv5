/**
 * Wizard de Primeira Liga - Super Cartola Manager
 *
 * Controla o fluxo de 5 etapas para criar a primeira liga
 * de um novo admin (multi-tenant onboarding).
 *
 * @version 1.0.0
 * @since 2026-01-03
 */

class WizardPrimeiraLiga {
    constructor() {
        this.etapaAtual = 1;
        this.totalEtapas = 5;

        // Dados coletados no wizard
        // ✅ v2.0: Módulos BASE ativos, OPCIONAIS desabilitados por padrão
        // Admin deve configurar regras antes de habilitar módulos opcionais
        this.dados = {
            nome: "",
            descricao: "",
            times: [],
            modulos_ativos: {
                // Módulos BASE - sempre habilitados
                extrato: true,
                ranking: true,
                rodadas: true,
                historico: true,
                // Módulos OPCIONAIS - desabilitados até admin configurar
                top10: false,
                pontosCorridos: false,
                mataMata: false,
                artilheiro: false,
                luvaOuro: false,
                melhorMes: false,
                campinho: false,
                dicas: false
            },
            configuracoes: "padrao" // Usar configs padrao
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.atualizarUI();
        console.log("[WIZARD] Inicializado");
    }

    bindEvents() {
        // Botoes de navegacao
        document.getElementById("btn-proximo").addEventListener("click", () => this.proximaEtapa());
        document.getElementById("btn-voltar").addEventListener("click", () => this.etapaAnterior());

        // Buscar time
        document.getElementById("btn-buscar-time").addEventListener("click", () => this.buscarTime());
        document.getElementById("time-id-input").addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.buscarTime();
        });

        // Toggle modulos
        document.querySelectorAll(".modulo-toggle").forEach(toggle => {
            toggle.addEventListener("click", (e) => this.toggleModulo(e.currentTarget));
        });

        // Aceitar termos
        document.getElementById("aceitar-termos").addEventListener("change", () => this.atualizarBotaoFinal());
    }

    // =========================================================================
    // NAVEGACAO
    // =========================================================================

    proximaEtapa() {
        if (!this.validarEtapa(this.etapaAtual)) {
            return;
        }

        if (this.etapaAtual < this.totalEtapas) {
            this.etapaAtual++;
            this.atualizarUI();

            // Se chegou na ultima etapa, montar resumo
            if (this.etapaAtual === 5) {
                this.montarResumo();
            }
        } else {
            // Ultima etapa - criar liga
            this.criarLiga();
        }
    }

    etapaAnterior() {
        if (this.etapaAtual > 1) {
            this.etapaAtual--;
            this.atualizarUI();
        }
    }

    atualizarUI() {
        // Atualizar steps no progress
        document.querySelectorAll(".step-number").forEach((step, idx) => {
            const stepNum = idx + 1;
            step.classList.remove("active", "completed");

            if (stepNum === this.etapaAtual) {
                step.classList.add("active");
            } else if (stepNum < this.etapaAtual) {
                step.classList.add("completed");
                step.innerHTML = '<span class="material-icons" style="font-size: 14px;">check</span>';
            } else {
                step.textContent = stepNum;
            }
        });

        // Atualizar labels
        document.querySelectorAll(".step-label").forEach((label, idx) => {
            const stepNum = idx + 1;
            label.classList.remove("active", "completed");

            if (stepNum === this.etapaAtual) {
                label.classList.add("active");
            } else if (stepNum < this.etapaAtual) {
                label.classList.add("completed");
            }
        });

        // Atualizar conectores
        document.querySelectorAll(".step-connector").forEach((conn, idx) => {
            conn.classList.remove("completed");
            if (idx + 1 < this.etapaAtual) {
                conn.classList.add("completed");
            }
        });

        // Mostrar/ocultar conteudos
        document.querySelectorAll(".step-content").forEach(content => {
            content.classList.remove("active");
        });
        document.querySelector(`.step-content[data-step="${this.etapaAtual}"]`).classList.add("active");

        // Botao voltar
        const btnVoltar = document.getElementById("btn-voltar");
        btnVoltar.style.visibility = this.etapaAtual > 1 ? "visible" : "hidden";

        // Botao proximo
        const btnProximo = document.getElementById("btn-proximo");
        if (this.etapaAtual === this.totalEtapas) {
            btnProximo.innerHTML = '<span class="material-icons" style="font-size: 18px;">rocket_launch</span> CRIAR LIGA';
        } else {
            btnProximo.innerHTML = 'Proximo <span class="material-icons" style="font-size: 18px;">arrow_forward</span>';
        }

        this.atualizarBotaoProximo();
    }

    atualizarBotaoProximo() {
        const btn = document.getElementById("btn-proximo");
        let habilitado = true;

        switch (this.etapaAtual) {
            case 1:
                habilitado = document.getElementById("nome-liga").value.trim().length >= 3;
                break;
            case 2:
                habilitado = this.dados.times.length >= 2;
                break;
            case 5:
                habilitado = document.getElementById("aceitar-termos").checked;
                break;
        }

        btn.disabled = !habilitado;
    }

    atualizarBotaoFinal() {
        this.atualizarBotaoProximo();
    }

    // =========================================================================
    // VALIDACAO
    // =========================================================================

    validarEtapa(etapa) {
        switch (etapa) {
            case 1:
                const nome = document.getElementById("nome-liga").value.trim();
                if (nome.length < 3) {
                    this.showToast("Nome da liga deve ter pelo menos 3 caracteres", "error");
                    return false;
                }
                this.dados.nome = nome;
                this.dados.descricao = document.getElementById("descricao-liga").value.trim();
                return true;

            case 2:
                if (this.dados.times.length < 2) {
                    this.showToast("Adicione pelo menos 2 times", "error");
                    return false;
                }
                return true;

            case 3:
                // Coletar modulos ativos
                const modulos = {};
                document.querySelectorAll(".modulo-toggle").forEach(toggle => {
                    const input = toggle.querySelector("input");
                    modulos[input.value] = input.checked;
                });
                this.dados.modulos_ativos = modulos;
                return true;

            case 4:
                // Configs padrao - sempre valido
                return true;

            case 5:
                if (!document.getElementById("aceitar-termos").checked) {
                    this.showToast("Aceite os termos para continuar", "error");
                    return false;
                }
                return true;

            default:
                return true;
        }
    }

    // =========================================================================
    // BUSCA DE TIMES
    // =========================================================================

    async buscarTime() {
        const input = document.getElementById("time-id-input");
        const btn = document.getElementById("btn-buscar-time");
        const timeId = input.value.trim();

        if (!timeId) {
            this.showToast("Digite o ID do time", "error");
            return;
        }

        // Verificar se ja foi adicionado
        if (this.dados.times.some(t => t.id === parseInt(timeId))) {
            this.showToast("Este time ja foi adicionado", "error");
            return;
        }

        // Loading
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>';

        try {
            const response = await fetch(`/api/cartola/time/${timeId}`);
            const data = await response.json();

            if (data.erro || !data.time) {
                throw new Error(data.erro || "Time nao encontrado");
            }

            const time = data.time;
            this.dados.times.push({
                id: time.time_id,
                nome: time.nome,
                cartoleiro: time.nome_cartoleiro,
                foto: time.url_escudo_png || time.url_escudo_svg || ""
            });

            this.renderizarTimes();
            this.showToast(`${time.nome} adicionado!`, "success");
            input.value = "";

        } catch (error) {
            console.error("[WIZARD] Erro ao buscar time:", error);
            this.showToast(error.message || "Erro ao buscar time", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons">search</span> Buscar';
        }

        this.atualizarBotaoProximo();
    }

    removerTime(timeId) {
        this.dados.times = this.dados.times.filter(t => t.id !== timeId);
        this.renderizarTimes();
        this.atualizarBotaoProximo();
    }

    renderizarTimes() {
        const container = document.getElementById("times-list");

        if (this.dados.times.length === 0) {
            container.innerHTML = `
                <div class="times-empty">
                    <span class="material-icons">groups</span>
                    <p>Nenhum time adicionado ainda</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.dados.times.map(time => `
            <div class="time-item">
                <img src="${time.foto || 'https://s.sde.globo.com/media/organizations/2024/04/11/Cartola_Escudo.svg'}"
                     alt="${time.nome}"
                     onerror="this.src='https://s.sde.globo.com/media/organizations/2024/04/11/Cartola_Escudo.svg'">
                <div class="time-info">
                    <div class="nome">${time.nome}</div>
                    <div class="cartoleiro">${time.cartoleiro} (ID: ${time.id})</div>
                </div>
                <button class="time-remove" onclick="wizard.removerTime(${time.id})" title="Remover">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `).join("");
    }

    // =========================================================================
    // MODULOS
    // =========================================================================

    toggleModulo(toggle) {
        const input = toggle.querySelector("input");
        input.checked = !input.checked;
        toggle.classList.toggle("active", input.checked);
    }

    // =========================================================================
    // RESUMO
    // =========================================================================

    montarResumo() {
        // Nome
        document.getElementById("resumo-nome").textContent = this.dados.nome;

        // Descricao
        const descContainer = document.getElementById("resumo-descricao-container");
        if (this.dados.descricao) {
            descContainer.style.display = "flex";
            document.getElementById("resumo-descricao").textContent = this.dados.descricao;
        } else {
            descContainer.style.display = "none";
        }

        // Times
        document.getElementById("resumo-times-count").textContent = this.dados.times.length;

        // Modulos
        const modulosContainer = document.getElementById("resumo-modulos");
        const modulosLabels = {
            ranking: "Ranking Geral",
            top10: "Top 10 (Mito/Mico)",
            pontosCorridos: "Pontos Corridos",
            mataMata: "Mata-Mata",
            artilheiro: "Artilheiro",
            luvaOuro: "Luva de Ouro",
            melhorMes: "Melhor Mes",
            extrato: "Extrato Financeiro"
        };

        const modulosAtivos = Object.entries(this.dados.modulos_ativos)
            .filter(([_, ativo]) => ativo)
            .map(([key, _]) => modulosLabels[key] || key);

        modulosContainer.innerHTML = modulosAtivos.map(nome => `
            <div class="resumo-item">
                <span class="material-icons success">check_circle</span>
                <span>${nome}</span>
            </div>
        `).join("");
    }

    // =========================================================================
    // CRIAR LIGA
    // =========================================================================

    async criarLiga() {
        const btn = document.getElementById("btn-proximo");
        const loading = document.getElementById("loading");
        const content = document.querySelector(".wizard-content");

        // Ocultar conteudo e mostrar loading
        document.querySelectorAll(".step-content").forEach(el => el.classList.remove("active"));
        loading.classList.add("active");
        btn.disabled = true;

        try {
            const payload = {
                nome: this.dados.nome,
                descricao: this.dados.descricao,
                times: this.dados.times.map(t => t.id),
                modulos_ativos: this.dados.modulos_ativos,
                usar_config_padrao: true
            };

            console.log("[WIZARD] Criando liga:", payload);

            const response = await fetch("/api/ligas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || data.message || "Erro ao criar liga");
            }

            console.log("[WIZARD] Liga criada:", data);

            // Sucesso!
            this.showToast("Liga criada com sucesso!", "success");

            // Redirecionar para a nova liga
            setTimeout(() => {
                const ligaId = data.liga?._id || data._id || data.id;
                if (ligaId) {
                    window.location.href = `/detalhe-liga.html?id=${ligaId}`;
                } else {
                    window.location.href = "/painel.html";
                }
            }, 1500);

        } catch (error) {
            console.error("[WIZARD] Erro ao criar liga:", error);
            this.showToast(error.message || "Erro ao criar liga", "error");

            // Voltar para etapa de confirmacao
            loading.classList.remove("active");
            document.querySelector('.step-content[data-step="5"]').classList.add("active");
            btn.disabled = false;
        }
    }

    // =========================================================================
    // TOAST
    // =========================================================================

    showToast(message, type = "success") {
        const toast = document.getElementById("toast");
        const icon = toast.querySelector(".material-icons");
        const messageEl = toast.querySelector(".toast-message");

        icon.className = `material-icons ${type}`;
        icon.textContent = type === "success" ? "check_circle" : "error";
        messageEl.textContent = message;

        toast.className = `toast ${type}`;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}

// Instanciar wizard globalmente
const wizard = new WizardPrimeiraLiga();

// Eventos de input para validacao em tempo real
document.getElementById("nome-liga").addEventListener("input", () => wizard.atualizarBotaoProximo());

// Toggle config sections
function toggleConfig(header) {
    const body = header.nextElementSibling;
    body.classList.toggle("open");
}
