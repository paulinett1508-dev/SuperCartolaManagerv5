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
            await this.carregarTimes();
            this.attachEventListeners();
        } catch (error) {
            console.error("Erro ao inicializar editar liga:", error);
            this.showError("Erro ao carregar página de edição");
        }
    }

    async loadLayout() {
        try {
            const response = await fetch("layout.html");
            const layoutHtml = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(layoutHtml, "text/html");

            // Injetar sidebar
            const sidebar = doc.querySelector(".app-sidebar");
            if (sidebar) {
                document
                    .getElementById("sidebar-placeholder")
                    ?.replaceWith(sidebar);
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
            const row = target.closest("tr");
            if (!row) return;

            const index = Array.from(
                this.elements.tabelaTimes.children,
            ).indexOf(row);

            if (target.classList.contains("btn-success")) {
                this.atualizarTime(index);
            } else if (target.classList.contains("btn-warning")) {
                this.limparLinha(index);
            } else if (target.classList.contains("btn-danger")) {
                this.removerTime(index);
            } else if (target.classList.contains("btn-add")) {
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

            const res = await fetch(`/api/ligas/${this.ligaId}`);
            if (!res.ok) {
                throw new Error(`Erro ao buscar liga: ${res.statusText}`);
            }

            this.ligaAtual = await res.json();

            if (!this.ligaAtual || !this.ligaAtual.nome) {
                throw new Error("Liga não encontrada ou dados inválidos");
            }

            // Atualizar título
            if (this.elements.tituloLiga) {
                this.elements.tituloLiga.textContent = `Editar Times: ${this.ligaAtual.nome}`;
            }

            const timesIds = this.ligaAtual.times || [];

            if (!Array.isArray(timesIds) || timesIds.length === 0) {
                this.showEmpty();
                this.adicionarLinhaNova();
                return;
            }

            // Buscar dados dos times
            const timesComDados = await Promise.all(
                timesIds.map(async (timeId, index) => {
                    const timeData = await this.buscarDadosCartola(timeId);
                    const clubeId = timeData.clube_id;
                    const clube = this.clubes.find((c) => c.id === clubeId);

                    return {
                        id: timeId,
                        nome_cartoleiro:
                            timeData.nome_cartoleiro || "Não encontrado",
                        brasao: timeData.url_escudo_png || null,
                        clube_id: clubeId,
                        timeDoCoracao: clube ? `/escudos/${clube.id}.png` : "",
                        timeDoCoracaoNome: clube ? clube.nome : "N/D",
                        index: index,
                        error: timeData.error,
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
                        ${clube.id} - ${clube.nome}
                    </option>
                `,
                          )
                          .join("")
                    : '<option value="">Nenhum clube disponível</option>';

            row.innerHTML = `
                <td class="col-index">${index + 1}</td>
                <td class="col-id">
                    <input type="text" class="table-input" value="${time.id}" 
                           data-index="${index}" onchange="editarLiga.atualizarCartoleiro(this, ${index})">
                </td>
                <td class="col-cartoleiro">
                    <span class="status ${time.error ? "error" : "ok"}">
                        ${time.nome_cartoleiro}
                    </span>
                </td>
                <td class="col-brasao">
                    ${
                        time.brasao
                            ? `<img src="${time.brasao}" class="escudo-time" alt="Brasão do Time">`
                            : "N/D"
                    }
                </td>
                <td class="col-clube">
                    <select class="table-select" onchange="editarLiga.atualizarClube(this, ${index})">
                        <option value="">Selecione um clube</option>
                        ${options}
                    </select>
                </td>
                <td class="col-escudo">
                    <img id="timeCoracaoResult_${index}" 
                         src="${time.timeDoCoracao || ""}" 
                         class="escudo-coracao" 
                         alt="Escudo do Time do Coração" 
                         style="display: ${time.timeDoCoracao ? "block" : "none"};" 
                         onerror="this.src='/escudos/placeholder.png';">
                </td>
                <td class="col-acoes">
                    <button class="btn-table btn-success" title="Alterar">
                        Alterar
                    </button>
                    <button class="btn-table btn-warning" title="Limpar Campos">
                        Limpar
                    </button>
                    <button class="btn-table btn-danger" title="Excluir">
                        Excluir
                    </button>
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
                    ${clube.id} - ${clube.nome}
                </option>
            `,
                      )
                      .join("")
                : '<option value="">Nenhum clube disponível</option>';

        row.innerHTML = `
            <td class="col-index">+</td>
            <td class="col-id">
                <input type="text" class="table-input" id="novoId" 
                       placeholder="Novo ID">
            </td>
            <td class="col-cartoleiro">
                <span id="novoCartoleiro" class="status"></span>
            </td>
            <td class="col-brasao">
                <span id="novoNomeTime">N/D</span>
            </td>
            <td class="col-clube">
                <select class="table-select" id="novoClube" 
                        onchange="editarLiga.atualizarNovoEscudo(this)">
                    <option value="">Selecione um clube</option>
                    ${options}
                </select>
            </td>
            <td class="col-escudo">
                <img id="novoTimeCoracaoResult" class="escudo-coracao" 
                     style="display: none;" alt="Escudo do Time do Coração">
            </td>
            <td class="col-acoes">
                <button class="btn-table btn-add" title="Adicionar">
                    Adicionar
                </button>
                <button class="btn-table btn-warning" title="Limpar Campos" 
                        onclick="editarLiga.limparCampos()">
                    Limpar
                </button>
            </td>
        `;

        this.elements.tabelaTimes.appendChild(row);

        // Event listener para busca automática
        const novoIdInput = document.getElementById("novoId");
        if (novoIdInput) {
            novoIdInput.addEventListener("input", () => {
                const id = novoIdInput.value.trim();
                const span = document.getElementById("novoCartoleiro");
                const nomeCell = document.getElementById("novoNomeTime");
                this.buscarDadosCartola(id).then((data) => {
                    if (span && nomeCell) {
                        span.textContent =
                            data.nome_cartoleiro || "Não encontrado";
                        span.className = `status ${data.error ? "error" : "ok"}`;
                        nomeCell.innerHTML = data.url_escudo_png
                            ? `<img src="${data.url_escudo_png}" class="table-img" alt="Brasão">`
                            : "N/D";
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

        const idInput = row.querySelector(".table-input");
        const statusSpan = row.querySelector(".status");
        const brasaoCell = row.cells[3];
        const clubeSelect = row.querySelector(".table-select");
        const escudoImg = row.querySelector(".escudo-coracao");

        if (idInput) idInput.value = "";
        if (statusSpan) statusSpan.textContent = "";
        if (brasaoCell) brasaoCell.innerHTML = "N/D";
        if (clubeSelect) clubeSelect.value = "";
        if (escudoImg) {
            escudoImg.src = "";
            escudoImg.style.display = "none";
        }
    }

    atualizarCartoleiro(input, index) {
        const id = input.value.trim();
        const row = input.closest("tr");
        const statusSpan = row?.querySelector(".status");
        const brasaoCell = row?.cells[3];

        if (statusSpan && brasaoCell) {
            this.buscarDadosCartola(id).then((data) => {
                statusSpan.textContent =
                    data.nome_cartoleiro || "Não encontrado";
                statusSpan.className = `status ${data.error ? "error" : "ok"}`;
                brasaoCell.innerHTML = data.url_escudo_png
                    ? `<img src="${data.url_escudo_png}" class="escudo-time" alt="Brasão">`
                    : "N/D";
            });
        }
    }

    atualizarClube(select, index) {
        const selectedOption = select.options[select.selectedIndex];
        const escudoUrl =
            selectedOption.getAttribute("data-escudo") ||
            "/escudos/placeholder.png";
        const escudoImg = document.getElementById(`timeCoracaoResult_${index}`);

        if (escudoImg) {
            escudoImg.src = escudoUrl;
            escudoImg.style.display = escudoUrl ? "block" : "none";
        }
    }

    atualizarNovoEscudo(select) {
        const selectedOption = select.options[select.selectedIndex];
        const escudoUrl = selectedOption.getAttribute("data-escudo") || "";
        const escudoImg = document.getElementById("novoTimeCoracaoResult");

        if (escudoImg) {
            escudoImg.src = escudoUrl;
            escudoImg.style.display = escudoUrl ? "block" : "none";
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
        const novoNomeTime = document.getElementById("novoNomeTime");
        const novoClube = document.getElementById("novoClube");
        const novoEscudo = document.getElementById("novoTimeCoracaoResult");

        if (novoId) novoId.value = "";
        if (novoCartoleiro) novoCartoleiro.textContent = "";
        if (novoNomeTime) novoNomeTime.textContent = "N/D";
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
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.classList.add("active");
            this.elements.errorMessage.style.display = "block";
            setTimeout(() => {
                this.elements.errorMessage.classList.remove("active");
                setTimeout(() => {
                    this.elements.errorMessage.style.display = "none";
                }, 300);
            }, 5000);
        }
    }

    showSuccess(message) {
        if (this.elements.successMessage) {
            this.elements.successMessage.textContent = message;
            this.elements.successMessage.classList.add("active");
            this.elements.successMessage.style.display = "block";
            setTimeout(() => {
                this.elements.successMessage.classList.remove("active");
                setTimeout(() => {
                    this.elements.successMessage.style.display = "none";
                }, 300);
            }, 3000);
        }
    }
}

// Inicialização global
let editarLiga;

document.addEventListener("DOMContentLoaded", async () => {
    editarLiga = new EditarLigaManager();
    await editarLiga.init();
});

// Funções globais para compatibilidade com HTML inline
window.editarLiga = {
    atualizarCartoleiro: (input, index) =>
        editarLiga?.atualizarCartoleiro(input, index),
    atualizarClube: (select, index) =>
        editarLiga?.atualizarClube(select, index),
    atualizarNovoEscudo: (select) => editarLiga?.atualizarNovoEscudo(select),
    limparCampos: () => editarLiga?.limparCampos(),
};
