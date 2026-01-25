/**
 * EDITAR LIGA MODULE
 * Refatoração completa mantendo 100% da funcionalidade original
 */

class EditarLigaManager {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.ligaId = this.urlParams.get("id");
        this.ligaAtual = null;
        this.clubes = [];
        this.isLoading = false;

        // Temporada state
        this.temporadaSelecionada = null;
        this.temporadasDisponiveis = [];

        this.elements = {};
        this.initElements();
    }

    initElements() {
        this.elements = {
            // Main containers
            loadingState: document.getElementById("loadingState"),
            emptyState: document.getElementById("emptyState"),
            tabelaTimes: document.getElementById("tabelaTimes"),
            timesTable: document.getElementById("timesTable"),

            // Messages
            errorMessage: document.getElementById("errorMessage"),
            successMessage: document.getElementById("successMessage"),

            // Header
            tituloLiga: document.getElementById("tituloLiga"),

            // Actions
            salvarTudoBtn: document.getElementById("salvarTudoBtn"),
        };
    }

    async init() {
        try {
            await this.loadLayout();
            await this.carregarClubes();
            await this.carregarTemporadas();
            await this.carregarTimes();
            this.attachEventListeners();
        } catch (error) {
            console.error("Erro ao inicializar editar liga:", error);
            this.showError("Erro ao carregar página de edição");
        }
    }

    async carregarTemporadas() {
        try {
            const res = await fetch(`/api/ligas/${this.ligaId}/temporadas`);
            if (!res.ok) throw new Error('Erro ao buscar temporadas');

            const data = await res.json();
            this.temporadasDisponiveis = data.disponiveis || [];

            // Default: temporada mais recente (primeiro da lista)
            this.temporadaSelecionada = this.temporadasDisponiveis[0] || data.temporada_atual || new Date().getFullYear();

            this.renderizarSeletorTemporada();
            return true;
        } catch (err) {
            console.error('Erro ao carregar temporadas:', err);
            // Fallback: apenas temporada atual
            this.temporadasDisponiveis = [new Date().getFullYear()];
            this.temporadaSelecionada = this.temporadasDisponiveis[0];
            return false;
        }
    }

    renderizarSeletorTemporada() {
        const container = document.getElementById('temporada-tabs');
        if (!container) return;

        // Ocultar se apenas uma temporada (v2.0: mostrar tabs quando >= 2)
        if (this.temporadasDisponiveis.length < 2) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'inline-flex';
        container.innerHTML = this.temporadasDisponiveis.map(ano => `
            <button class="tab-btn-inline ${ano === this.temporadaSelecionada ? 'active' : ''}"
                    data-temporada="${ano}"
                    onclick="editarLiga.mudarTemporada(${ano})">
                ${ano}
            </button>
        `).join('');
    }

    async mudarTemporada(novaTemporada) {
        if (novaTemporada === this.temporadaSelecionada) return;

        this.temporadaSelecionada = novaTemporada;
        this.renderizarSeletorTemporada();
        await this.carregarTimes();
    }

    async loadLayout() {
        try {
            const response = await fetch("layout.html");
            const layoutHtml = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(layoutHtml, "text/html");

            // Injetar sidebar + botão toggle
            const sidebar = doc.querySelector(".app-sidebar");
            const toggleBtn = doc.querySelector(".sidebar-toggle-btn");
            const placeholder = document.getElementById("sidebar-placeholder");
            if (sidebar && placeholder) {
                const fragment = document.createDocumentFragment();
                if (toggleBtn) fragment.appendChild(toggleBtn);
                fragment.appendChild(sidebar);
                placeholder.replaceWith(fragment);
            }

            // Executar scripts do layout
            const scripts = doc.querySelectorAll("script");
            scripts.forEach((script) => {
                if (script.textContent.trim()) {
                    const newScript = document.createElement("script");
                    newScript.textContent = script.textContent;
                    document.head.appendChild(newScript);
                }
            });

            // Garantir que AccordionManager seja inicializado
            setTimeout(() => {
                if (window.AccordionManager && !window.AccordionManager._initialized) {
                    window.AccordionManager.init();
                }
                if (typeof window.verificarMenuSuperAdmin === 'function') {
                    window.verificarMenuSuperAdmin();
                }
            }, 150);
        } catch (error) {
            console.error("Erro ao carregar layout:", error);
        }
    }

    attachEventListeners() {
        // Botão salvar tudo
        this.elements.salvarTudoBtn?.addEventListener("click", () => {
            this.salvarTudo();
        });

        // Event delegation para botões da tabela
        this.elements.tabelaTimes?.addEventListener("click", (e) => {
            const target = e.target;
            const button = target.closest(".btn-icon");
            if (!button) return;

            const row = button.closest("tr");
            if (!row) return;

            const index = Array.from(
                this.elements.tabelaTimes.children,
            ).indexOf(row);

            // Detectar ação pelo tipo de botão
            if (button.classList.contains("btn-success") || button.classList.contains("btn-icon-save")) {
                this.atualizarTime(index);
            } else if (button.classList.contains("btn-warning") || button.classList.contains("btn-icon-clear")) {
                if (!row.classList.contains("nova-linha")) {
                    this.limparLinha(index);
                }
            } else if (button.classList.contains("btn-danger") || button.classList.contains("btn-icon-delete")) {
                this.removerTime(index);
            } else if (button.classList.contains("btn-add") || button.classList.contains("btn-icon-add")) {
                this.adicionarNovoTime();
            }
        });
    }

    async carregarClubes() {
        try {
            const res = await fetch("/api/cartola/clubes");
            if (!res.ok) {
                throw new Error(`Erro ao buscar clubes: ${res.statusText}`);
            }

            const data = await res.json();
            this.clubes = Object.keys(data).map((id) => ({
                id: parseInt(id),
                nome: data[id].nome,
                escudo_url: data[id].escudos["30x30"] || "",
            }));

            return true;
        } catch (err) {
            this.showError(`Erro ao carregar clubes: ${err.message}`);
            this.clubes = [];
            return false;
        }
    }

    async buscarDadosCartola(id) {
        if (!id) {
            return {
                nome_cartoleiro: null,
                url_escudo_png: null,
                clube_id: null,
                error: true,
            };
        }

        try {
            const res = await fetch(`/api/cartola/time/${id}`);
            if (!res.ok) {
                throw new Error(`Erro ao buscar time ${id}: ${res.statusText}`);
            }

            const data = await res.json();
            return {
                nome_cartoleiro: data.nome_cartoleiro || null,
                url_escudo_png: data.url_escudo_png || null,
                clube_id: data.clube_id || null,
                error: false,
            };
        } catch (err) {
            console.error(`Erro ao buscar dados do time ${id}:`, err);
            return {
                nome_cartoleiro: null,
                url_escudo_png: null,
                clube_id: null,
                error: true,
            };
        }
    }

    async carregarTimes() {
        if (!this.ligaId) {
            this.showError("ID da liga não fornecido na URL");
            return;
        }

        try {
            this.showLoading(true);

            // 1. Buscar dados básicos da liga (nome, etc.)
            const resLiga = await fetch(`/api/ligas/${this.ligaId}`);
            if (!resLiga.ok) {
                throw new Error(`Erro ao buscar liga: ${resLiga.statusText}`);
            }

            this.ligaAtual = await resLiga.json();

            if (!this.ligaAtual || !this.ligaAtual.nome) {
                throw new Error("Liga não encontrada ou dados inválidos");
            }

            // Atualizar título com indicador de temporada
            if (this.elements.tituloLiga) {
                const temporadaLabel = this.temporadaSelecionada ? ` (${this.temporadaSelecionada})` : '';
                this.elements.tituloLiga.innerHTML = `Editar Times da <span>${this.ligaAtual.nome}</span>${temporadaLabel}`;
            }

            // 2. Buscar participantes filtrados por temporada
            const temporada = this.temporadaSelecionada || this.ligaAtual.temporada || new Date().getFullYear();
            const resParticipantes = await fetch(
                `/api/ligas/${this.ligaId}/participantes?temporada=${temporada}`
            );

            if (!resParticipantes.ok) {
                throw new Error(`Erro ao buscar participantes: ${resParticipantes.statusText}`);
            }

            const dadosParticipantes = await resParticipantes.json();
            const participantes = dadosParticipantes.participantes || [];

            if (participantes.length === 0) {
                this.showEmpty();
                this.ligaAtual.times = [];
                this.adicionarLinhaNova();
                return;
            }

            // Buscar dados adicionais do Cartola para cada participante
            const timesComDados = await Promise.all(
                participantes.map(async (p, index) => {
                    const timeData = await this.buscarDadosCartola(p.time_id);
                    const clubeId = p.clube_id || timeData.clube_id;
                    const clube = this.clubes.find((c) => c.id === clubeId);

                    return {
                        id: p.time_id,
                        nome_cartoleiro: p.nome_cartoleiro || timeData.nome_cartoleiro || "Não encontrado",
                        brasao: timeData.url_escudo_png || p.escudo || null,
                        clube_id: clubeId,
                        timeDoCoracao: clube ? `/escudos/${clube.id}.png` : "",
                        timeDoCoracaoNome: clube ? clube.nome : "N/D",
                        index: index,
                        error: timeData.error,
                        status: p.status, // 'ativo', 'renovado', 'novo', etc.
                    };
                }),
            );

            // Ordenar por nome do cartoleiro
            timesComDados.sort((a, b) =>
                a.nome_cartoleiro.localeCompare(b.nome_cartoleiro),
            );

            // Atualizar array de IDs com a nova ordem
            this.ligaAtual.times = timesComDados.map((t) => t.id);

            this.renderizarTimes(timesComDados);
            this.adicionarLinhaNova();
        } catch (err) {
            this.showError(`Erro ao carregar a liga: ${err.message}`);
            this.ligaAtual = { times: [] };
            this.adicionarLinhaNova();
        } finally {
            this.showLoading(false);
        }
    }

    renderizarTimes(times) {
        if (!this.elements.tabelaTimes) return;

        this.elements.tabelaTimes.innerHTML = "";

        // Atualizar contador no header
        const totalTimesEl = document.getElementById("totalTimes");
        if (totalTimesEl) {
            totalTimesEl.textContent = times.length;
        }

        times.forEach((time, index) => {
            const row = document.createElement("tr");

            const options =
                this.clubes.length > 0
                    ? this.clubes
                          .map(
                              (clube) => `
                    <option value="${clube.id}"
                            data-escudo="/escudos/${clube.id}.png"
                            data-nome="${clube.nome}"
                            ${time.clube_id === clube.id ? "selected" : ""}>
                        ${clube.nome}
                    </option>
                `,
                          )
                          .join("")
                    : '<option value="">Nenhum clube</option>';

            row.innerHTML = `
                <td class="col-num">${index + 1}</td>
                <td class="col-id">
                    <input type="text" class="form-input" value="${time.id}"
                           data-index="${index}" onchange="editarLiga.atualizarCartoleiro(this, ${index})">
                </td>
                <td class="col-cartoleiro">
                    <span class="cartoleiro-name ${time.error ? "error" : ""}">
                        ${time.nome_cartoleiro}
                    </span>
                </td>
                <td class="col-brasao">
                    <div class="avatar-circular">
                        ${
                            time.brasao
                                ? `<img src="${time.brasao}" alt="Brasao">`
                                : '<span class="material-icons">shield</span>'
                        }
                    </div>
                </td>
                <td class="col-clube">
                    <select class="form-select" onchange="editarLiga.atualizarClube(this, ${index})">
                        <option value="">Selecione</option>
                        ${options}
                    </select>
                </td>
                <td class="col-escudo">
                    <img id="timeCoracaoResult_${index}"
                         src="${time.timeDoCoracao || ""}"
                         class="escudo-mini"
                         alt="Escudo"
                         style="display: ${time.timeDoCoracao ? "block" : "none"};"
                         onerror="this.src='/escudos/placeholder.png';">
                </td>
                <td class="col-acoes">
                    <div class="action-buttons">
                        <button class="btn-icon btn-icon-save btn-success" title="Salvar">
                            <span class="material-icons">save</span>
                        </button>
                        <button class="btn-icon btn-icon-clear btn-warning" title="Limpar">
                            <span class="material-icons">refresh</span>
                        </button>
                        <button class="btn-icon btn-icon-delete btn-danger" title="Excluir">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </td>
            `;

            this.elements.tabelaTimes.appendChild(row);
        });

        this.showContent();
    }

    adicionarLinhaNova() {
        if (!this.elements.tabelaTimes) return;

        const row = document.createElement("tr");
        row.classList.add("nova-linha");

        const options =
            this.clubes.length > 0
                ? this.clubes
                      .map(
                          (clube) => `
                <option value="${clube.id}"
                        data-escudo="/escudos/${clube.id}.png"
                        data-nome="${clube.nome}">
                    ${clube.nome}
                </option>
            `,
                      )
                      .join("")
                : '<option value="">Nenhum clube</option>';

        row.innerHTML = `
            <td class="col-num">+</td>
            <td class="col-id">
                <input type="text" class="form-input" id="novoId"
                       placeholder="ID do time">
            </td>
            <td class="col-cartoleiro">
                <span id="novoCartoleiro" class="cartoleiro-name"></span>
            </td>
            <td class="col-brasao">
                <div class="avatar-circular" id="novoBrasaoContainer">
                    <span class="material-icons">shield</span>
                </div>
            </td>
            <td class="col-clube">
                <select class="form-select" id="novoClube"
                        onchange="editarLiga.atualizarNovoEscudo(this)">
                    <option value="">Selecione</option>
                    ${options}
                </select>
            </td>
            <td class="col-escudo">
                <img id="novoTimeCoracaoResult" class="escudo-mini"
                     style="display: none;" alt="Escudo">
            </td>
            <td class="col-acoes">
                <div class="action-buttons">
                    <button class="btn-icon btn-icon-add btn-add" title="Adicionar">
                        <span class="material-icons">add</span>
                    </button>
                    <button class="btn-icon btn-icon-clear" title="Limpar"
                            onclick="editarLiga.limparCampos()">
                        <span class="material-icons">refresh</span>
                    </button>
                </div>
            </td>
        `;

        this.elements.tabelaTimes.appendChild(row);

        // Event listener para busca automática
        const novoIdInput = document.getElementById("novoId");
        if (novoIdInput) {
            novoIdInput.addEventListener("input", () => {
                const id = novoIdInput.value.trim();
                const span = document.getElementById("novoCartoleiro");
                const brasaoContainer = document.getElementById("novoBrasaoContainer");
                this.buscarDadosCartola(id).then((data) => {
                    if (span) {
                        span.textContent = data.nome_cartoleiro || "";
                        span.className = `cartoleiro-name ${data.error ? "error" : ""}`;
                    }
                    if (brasaoContainer) {
                        brasaoContainer.innerHTML = data.url_escudo_png
                            ? `<img src="${data.url_escudo_png}" alt="Brasao">`
                            : '<span class="material-icons">shield</span>';
                    }
                });
            });
        }
    }

    async adicionarNovoTime() {
        const idInput = document.getElementById("novoId");
        const id = idInput?.value?.trim();

        if (!id) {
            this.showError("Informe o ID do time.");
            return;
        }

        if (this.ligaAtual.times.some((t) => t.toString() === id)) {
            this.showError("Este ID já está na lista!");
            return;
        }

        try {
            this.ligaAtual.times.push(isNaN(Number(id)) ? id : Number(id));

            const res = await fetch(`/api/ligas/${this.ligaId}/times`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ times: this.ligaAtual.times }),
            });

            if (!res.ok) {
                throw new Error(
                    `Erro ao adicionar o time à liga: ${res.statusText}`,
                );
            }

            this.showSuccess("Time adicionado com sucesso!");
            await this.carregarTimes();
            this.limparCampos();
        } catch (err) {
            this.showError(`Erro ao adicionar time: ${err.message}`);
        }
    }

    async atualizarTime(index) {
        const row = this.elements.tabelaTimes?.children[index];
        if (!row) return;

        const idInput = row.querySelector(".table-input");
        const id = idInput?.value?.trim();

        if (!id) {
            this.showError("Informe o ID do time.");
            return;
        }

        if (
            this.ligaAtual.times.some(
                (t, i) => t.toString() === id && i !== index,
            )
        ) {
            this.showError("Este ID já foi adicionado!");
            return;
        }

        try {
            this.ligaAtual.times[index] = isNaN(Number(id)) ? id : Number(id);

            const res = await fetch(`/api/ligas/${this.ligaId}/times`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ times: this.ligaAtual.times }),
            });

            if (!res.ok) {
                throw new Error(
                    `Erro ao atualizar o time na liga: ${res.statusText}`,
                );
            }

            this.showSuccess("Time atualizado com sucesso!");
            await this.carregarTimes();
        } catch (err) {
            this.showError(`Erro ao atualizar time: ${err.message}`);
        }
    }

    async removerTime(index) {
        if (!confirm("Tem certeza que deseja excluir este time da liga?")) {
            return;
        }

        const timeId = this.ligaAtual.times[index];

        try {
            const res = await fetch(
                `/api/ligas/${this.ligaId}/times/${timeId}`,
                {
                    method: "DELETE",
                },
            );

            if (!res.ok) {
                throw new Error("Erro ao remover o time da liga");
            }

            this.ligaAtual.times.splice(index, 1);
            this.showSuccess("Time removido com sucesso!");
            await this.carregarTimes();
        } catch (err) {
            this.showError(`Erro ao remover time: ${err.message}`);
        }
    }

    limparLinha(index) {
        const row = this.elements.tabelaTimes?.children[index];
        if (!row) return;

        const idInput = row.querySelector(".form-input");
        const cartoName = row.querySelector(".cartoleiro-name");
        const brasaoContainer = row.querySelector(".avatar-circular");
        const clubeSelect = row.querySelector(".form-select");
        const escudoImg = row.querySelector(".escudo-mini");

        if (idInput) idInput.value = "";
        if (cartoName) {
            cartoName.textContent = "";
            cartoName.className = "cartoleiro-name";
        }
        if (brasaoContainer) {
            brasaoContainer.innerHTML = '<span class="material-icons">shield</span>';
        }
        if (clubeSelect) clubeSelect.value = "";
        if (escudoImg) {
            escudoImg.src = "";
            escudoImg.style.display = "none";
        }
    }

    atualizarCartoleiro(input, index) {
        const id = input.value.trim();
        const row = input.closest("tr");
        const cartoName = row?.querySelector(".cartoleiro-name");
        const brasaoContainer = row?.querySelector(".avatar-circular");

        if (cartoName && brasaoContainer) {
            this.buscarDadosCartola(id).then((data) => {
                cartoName.textContent = data.nome_cartoleiro || "Nao encontrado";
                cartoName.className = `cartoleiro-name ${data.error ? "error" : ""}`;
                brasaoContainer.innerHTML = data.url_escudo_png
                    ? `<img src="${data.url_escudo_png}" alt="Brasao">`
                    : '<span class="material-icons">shield</span>';
            });
        }
    }

    atualizarClube(select, index) {
        const selectedOption = select.options[select.selectedIndex];
        const escudoUrl = selectedOption.getAttribute("data-escudo") || "";
        const escudoImg = document.getElementById(`timeCoracaoResult_${index}`);

        if (escudoImg) {
            if (escudoUrl) {
                escudoImg.src = escudoUrl;
                escudoImg.style.display = "block";
                escudoImg.onerror = () => { escudoImg.src = "/escudos/placeholder.png"; };
            } else {
                escudoImg.style.display = "none";
            }
        }
    }

    atualizarNovoEscudo(select) {
        const selectedOption = select.options[select.selectedIndex];
        const escudoUrl = selectedOption.getAttribute("data-escudo") || "";
        const escudoImg = document.getElementById("novoTimeCoracaoResult");

        if (escudoImg) {
            if (escudoUrl) {
                escudoImg.src = escudoUrl;
                escudoImg.style.display = "block";
                escudoImg.onerror = () => { escudoImg.src = "/escudos/placeholder.png"; };
            } else {
                escudoImg.style.display = "none";
            }
        }
    }

    async salvarTudo() {
        if (!confirm("Tem certeza que deseja salvar todas as alterações?")) {
            return;
        }

        try {
            const res = await fetch(`/api/ligas/${this.ligaId}/times`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ times: this.ligaAtual.times || [] }),
            });

            if (!res.ok) {
                throw new Error("Erro ao salvar as alterações");
            }

            this.showSuccess("Alterações salvas com sucesso!");
            await this.carregarTimes();
        } catch (err) {
            this.showError(`Erro ao salvar: ${err.message}`);
        }
    }

    limparCampos() {
        const novoId = document.getElementById("novoId");
        const novoCartoleiro = document.getElementById("novoCartoleiro");
        const novoBrasaoContainer = document.getElementById("novoBrasaoContainer");
        const novoClube = document.getElementById("novoClube");
        const novoEscudo = document.getElementById("novoTimeCoracaoResult");

        if (novoId) novoId.value = "";
        if (novoCartoleiro) {
            novoCartoleiro.textContent = "";
            novoCartoleiro.className = "cartoleiro-name";
        }
        if (novoBrasaoContainer) {
            novoBrasaoContainer.innerHTML = '<span class="material-icons">shield</span>';
        }
        if (novoClube) novoClube.value = "";
        if (novoEscudo) {
            novoEscudo.src = "";
            novoEscudo.style.display = "none";
        }
    }

    // UI State Management
    showLoading(show) {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = show ? "block" : "none";
        }
        if (this.elements.timesTable) {
            this.elements.timesTable.style.display = show ? "none" : "table";
        }
    }

    showEmpty() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = "block";
        }
        if (this.elements.timesTable) {
            this.elements.timesTable.style.display = "none";
        }
    }

    showContent() {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = "none";
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = "none";
        }
        if (this.elements.timesTable) {
            this.elements.timesTable.style.display = "table";
        }
    }

    showError(message) {
        if (this.elements.errorMessage) {
            const textSpan = this.elements.errorMessage.querySelector("#errorText");
            if (textSpan) textSpan.textContent = message;
            this.elements.errorMessage.classList.add("active");
            setTimeout(() => {
                this.elements.errorMessage.classList.remove("active");
            }, 5000);
        }
    }

    showSuccess(message) {
        if (this.elements.successMessage) {
            const textSpan = this.elements.successMessage.querySelector("#successText");
            if (textSpan) textSpan.textContent = message;
            this.elements.successMessage.classList.add("active");
            setTimeout(() => {
                this.elements.successMessage.classList.remove("active");
            }, 3000);
        }
    }
}

// Inicialização global
let editarLiga;

async function initEditarLiga() {
    console.log("[EDITAR-LIGA] Inicializando página...");
    editarLiga = new EditarLigaManager();
    await editarLiga.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!window.location.pathname.includes('editar-liga.html')) return;
    await initEditarLiga();
});

// ✅ FIX: Reinicializar após navegação SPA
window.addEventListener('spa:navigated', async (e) => {
    const { pageName } = e.detail || {};
    if (pageName === 'editar-liga.html') {
        console.log('[EDITAR-LIGA] Reinicializando após navegação SPA...');
        await initEditarLiga();
    }
});

// ✅ FIX: Inicializar se DOM já pronto (navegação SPA)
if (document.readyState !== 'loading' && window.location.pathname.includes('editar-liga.html')) {
    initEditarLiga();
}

// Funções globais para compatibilidade com HTML inline
window.editarLiga = {
    atualizarCartoleiro: (input, index) =>
        editarLiga?.atualizarCartoleiro(input, index),
    atualizarClube: (select, index) =>
        editarLiga?.atualizarClube(select, index),
    atualizarNovoEscudo: (select) => editarLiga?.atualizarNovoEscudo(select),
    limparCampos: () => editarLiga?.limparCampos(),
    mudarTemporada: (ano) => editarLiga?.mudarTemporada(ano),
};
