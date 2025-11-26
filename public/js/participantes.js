// MÓDULO PARTICIPANTES MELHORADO - UX Aprimorada

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

// ==============================
// VARIÁVEIS PARA EXPORTS DINÂMICOS
// ==============================
let criarBotaoExportacaoParticipantes = null;
let exportarParticipantesComoImagem = null;
let exportsCarregados = false;

// ==============================
// CARREGAR EXPORTS DINAMICAMENTE
// ==============================
async function carregarExports() {
    if (exportsCarregados) return;

    try {
        const exportModule = await import("./exports/export-exports.js");
        criarBotaoExportacaoParticipantes =
            exportModule.criarBotaoExportacaoParticipantes;
        exportarParticipantesComoImagem =
            exportModule.exportarParticipantesComoImagem;
        exportsCarregados = true;
        console.log("[PARTICIPANTES] ✅ Exports carregados com sucesso");
    } catch (error) {
        console.warn("[PARTICIPANTES] ⚠️ Erro ao carregar exports:", error);
    }
}

// CONFIGURAÇÃO DOS BRASÕES
const CLUBES_CONFIG = {
    MAPEAMENTO: {
        262: { nome: "Flamengo", arquivo: "262.png" },
        263: { nome: "Botafogo", arquivo: "263.png" },
        264: { nome: "Corinthians", arquivo: "264.png" },
        266: { nome: "Fluminense", arquivo: "266.png" },
        267: { nome: "Vasco", arquivo: "267.png" },
        275: { nome: "Palmeiras", arquivo: "275.png" },
        276: { nome: "São Paulo", arquivo: "276.png" },
        277: { nome: "Santos", arquivo: "277.png" },
        283: { nome: "Cruzeiro", arquivo: "283.png" },
        292: { nome: "Atlético-MG", arquivo: "292.png" },
        344: { nome: "Atlético-GO", arquivo: "344.png" },
    },
    PATHS: {
        escudosLocal: "/escudos/",
        placeholder: "/escudos/placeholder.png",
        defaultImage: "/escudos/default.png",
    },
};

// Helper para obter brasões
const BrasoesHelper = {
    getTimeFantasyBrasao(timeData) {
        if (!timeData) return CLUBES_CONFIG.PATHS.defaultImage;
        return timeData.url_escudo_png || CLUBES_CONFIG.PATHS.defaultImage;
    },

    getClubeBrasao(clubeId) {
        if (!clubeId) return CLUBES_CONFIG.PATHS.placeholder;
        const clube = CLUBES_CONFIG.MAPEAMENTO[clubeId];
        if (clube) {
            return `${CLUBES_CONFIG.PATHS.escudosLocal}${clube.arquivo}`;
        }
        return CLUBES_CONFIG.PATHS.placeholder;
    },

    getNomeClube(clubeId) {
        const clube = CLUBES_CONFIG.MAPEAMENTO[clubeId];
        return clube ? clube.nome : "Não definido";
    },
};

// ==============================
// FUNÇÃO PRINCIPAL MELHORADA
// ==============================
export async function carregarDadosBasicos() {
    try {
        if (!ligaId) {
            console.warn("Liga ID não encontrado na URL");
            return;
        }

        console.log(`Carregando dados básicos da liga: ${ligaId}`);

        const res = await fetch(`/api/ligas/${ligaId}`);
        if (!res.ok) {
            console.warn(
                `Erro ao buscar liga: ${res.status} ${res.statusText}`,
            );
            return;
        }

        const liga = await res.json();
        if (!liga) {
            console.warn("Liga não encontrada");
            return;
        }

        // Carregar participantes automaticamente
        await carregarParticipantesComBrasoes();

        return liga;
    } catch (err) {
        console.error("Erro ao carregar dados básicos:", err);
    }
}

// ==============================
// CARREGAR PARTICIPANTES COM UX MELHORADA
// ==============================
async function carregarParticipantesComBrasoes() {
    const container = document.getElementById("participantes-grid");
    if (!container) {
        console.log("Container participantes-grid não encontrado");
        return;
    }

    // Carregar exports
    await carregarExports();

    try {
        console.log(`Carregando participantes da liga: ${ligaId}`);

        // Buscar dados da liga
        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar liga");
        const liga = await resLiga.json();

        if (!liga.participantes || liga.participantes.length === 0) {
            container.innerHTML = `
                <div class="participantes-empty-state">
                    <div class="empty-icon">👥</div>
                    <div class="empty-title">Nenhum participante cadastrado</div>
                    <div class="empty-message">Esta liga ainda não possui participantes</div>
                </div>
            `;
            return;
        }

        console.log(`[PARTICIPANTES] ⚡ Usando dados da liga (${liga.participantes.length} participantes)`);

        // ✅ SUPER OTIMIZADO: Buscar status de todos os times em UMA ÚNICA requisição batch
        const timeIds = liga.participantes.map(p => p.time_id);
        let statusMap = {};

        try {
            const statusRes = await fetch('/api/times/batch/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timeIds })
            });

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                statusMap = statusData.status || {};
                console.log(`[PARTICIPANTES] ✅ Status batch carregado (1 requisição para ${timeIds.length} times)`);
            } else {
                console.warn('[PARTICIPANTES] ⚠️ Erro ao buscar status batch, assumindo todos ativos');
            }
        } catch (error) {
            console.warn('[PARTICIPANTES] ⚠️ Falha no batch status:', error.message);
        }

        // Processar participantes com dados da liga + status batch
        const timesData = liga.participantes.map((participante, index) => {
            const timeId = participante.time_id;
            const status = statusMap[timeId] || { ativo: true, rodada_desistencia: null };

            return {
                id: timeId,
                nome_cartoleiro: participante.nome_cartola || "N/D",
                nome_time: participante.nome_time || "N/D",
                clube_id: participante.clube_id,
                url_escudo_png: participante.foto_time,
                ativo: status.ativo,
                rodada_desistencia: status.rodada_desistencia,
                index
            };
        });

        // Filtrar times válidos e ordenar
        const timesValidos = timesData
            .filter((t) => t !== null)
            .sort((a, b) =>
                (a.nome_cartoleiro || "").localeCompare(
                    b.nome_cartoleiro || "",
                ),
            );

        // Limpar container
        container.innerHTML = "";

        // Renderizar cards
        timesValidos.forEach((timeData, index) => {
            // Verificar status do participante ANTES de criar o card
            const estaAtivo = timeData.ativo !== false;

            const card = document.createElement("div");
            card.className = `participante-card ${!estaAtivo ? 'card-inativo' : ''}`;
            card.setAttribute("data-delay", index % 10);

            // Adicionar dados para busca
            card.setAttribute(
                "data-nome",
                (timeData.nome_cartoleiro || "").toLowerCase(),
            );
            card.setAttribute(
                "data-time",
                (timeData.nome_time || "").toLowerCase(),
            );
            card.setAttribute(
                "data-clube",
                BrasoesHelper.getNomeClube(timeData.clube_id).toLowerCase(),
            );

            const temClubeCoracao =
                timeData.clube_id &&
                CLUBES_CONFIG.MAPEAMENTO[timeData.clube_id];
            const statusClass = estaAtivo ? 'status-ativo' : 'status-inativo';
            const statusText = estaAtivo ? 'Ativo' : `Inativo desde R${timeData.rodada_desistencia || '?'}`;

            console.log(`[CARD] ${timeData.nome_cartoleiro}: estaAtivo=${estaAtivo}, classe=${statusClass}`);

            card.innerHTML = `
                <div class="participante-header">
                    <div class="participante-avatar">${estaAtivo ? '👤' : '⏸️'}</div>
                    <div class="participante-status ${statusClass}">
                        <span class="status-indicator"></span>
                        ${statusText}
                    </div>
                </div>

                <div class="participante-info">
                    <h4 class="participante-nome">${timeData.nome_cartoleiro || "N/D"}</h4>
                    <p class="participante-time">${timeData.nome_time || "Time N/A"}</p>
                </div>

                <div class="brasoes-container">
                    <div class="brasao-wrapper">
                        <div class="brasao-circle brasao-fantasy">
                            <img src="${BrasoesHelper.getTimeFantasyBrasao(timeData)}" 
                                 alt="Time no Cartola" 
                                 title="Time no Cartola FC"
                                 class="brasao-img"
                                 onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                        </div>
                        <span class="brasao-label fantasy-label">Cartola</span>
                    </div>

                    <div class="brasao-separator">⚡</div>

                    <div class="brasao-wrapper">
                        <div class="brasao-circle brasao-clube ${!temClubeCoracao ? "brasao-disabled" : ""}">
                            <img src="${BrasoesHelper.getClubeBrasao(timeData.clube_id)}" 
                                 alt="Clube do Coração" 
                                 title="${BrasoesHelper.getNomeClube(timeData.clube_id)}"
                                 class="brasao-img"
                                 onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                        </div>
                        <span class="brasao-label clube-label">
                            ${temClubeCoracao ? BrasoesHelper.getNomeClube(timeData.clube_id) : "Não definido"}
                        </span>
                    </div>
                </div>

                <div class="participante-actions">
                    <button class="btn-action btn-status" 
                            onclick="window.toggleStatusParticipante(${timeData.id}, ${estaAtivo})"
                            title="${estaAtivo ? 'Inativar participante' : 'Reativar participante'}">
                        ${estaAtivo ? '⏸️ Inativar' : '▶️ Reativar'}
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

        // Configurar busca
        configurarBusca(timesValidos);

        // Atualizar estatísticas
        atualizarEstatisticas(timesValidos);

        // Criar botão de exportação
        if (criarBotaoExportacaoParticipantes && timesValidos.length > 0) {
            criarBotaoExportacaoParticipantes({
                containerId: "participantesExportBtnContainer",
                participantes: timesValidos,
                customExport: (dados) => exportarParticipantesComoImagem(dados),
            });
        }

        console.log(
            `✅ ${timesValidos.length} participantes carregados com design system aplicado`,
        );
    } catch (error) {
        console.error("Erro ao carregar participantes:", error);
        container.innerHTML = `
            <div class="participantes-empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Erro ao carregar participantes</div>
                <div class="empty-message">${error.message}</div>
                <button class="btn-voltar" onclick="carregarParticipantesComBrasoes()" style="margin-top: 15px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ==============================
// SISTEMA DE BUSCA
// ==============================
function configurarBusca(todosParticipantes) {
    const searchInput = document.getElementById("searchParticipantes");
    const resultsInfo = document.getElementById("search-results-info");
    const resultsCount = document.getElementById("results-count");

    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filtrarParticipantes(
                e.target.value,
                todosParticipantes,
                resultsInfo,
                resultsCount,
            );
        }, 300);
    });

    // Limpar busca ao pressionar Escape
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            searchInput.value = "";
            filtrarParticipantes(
                "",
                todosParticipantes,
                resultsInfo,
                resultsCount,
            );
            searchInput.blur();
        }
    });
}

function filtrarParticipantes(
    termo,
    todosParticipantes,
    resultsInfo,
    resultsCount,
) {
    const cards = document.querySelectorAll(".participante-card");
    const termoLower = termo.toLowerCase().trim();

    if (!termoLower) {
        // Mostrar todos
        cards.forEach((card) => {
            card.classList.remove("filtered-hidden");
        });
        resultsInfo.style.display = "none";
        return;
    }

    let countVisible = 0;

    cards.forEach((card) => {
        const nome = card.getAttribute("data-nome") || "";
        const time = card.getAttribute("data-time") || "";
        const clube = card.getAttribute("data-clube") || "";

        const matches =
            nome.includes(termoLower) ||
            time.includes(termoLower) ||
            clube.includes(termoLower);

        if (matches) {
            card.classList.remove("filtered-hidden");
            countVisible++;
        } else {
            card.classList.add("filtered-hidden");
        }
    });

    // Mostrar info dos resultados
    resultsCount.textContent = countVisible;
    resultsInfo.style.display = "block";
}

// ==============================
// ATUALIZAR ESTATÍSTICAS
// ==============================
function atualizarEstatisticas(timesData) {
    const totalElement = document.getElementById("total-participantes");
    if (totalElement) {
        totalElement.textContent = timesData.length;
    }

    const ativosElement = document.getElementById("participantes-ativos");
    if (ativosElement) {
        ativosElement.textContent = timesData.length;
    }

    const clubesUnicos = new Set(
        timesData
            .map((t) => t.clube_id)
            .filter((id) => id && CLUBES_CONFIG.MAPEAMENTO[id]),
    );

    const uniquesElement = document.getElementById("times-diferentes");
    if (uniquesElement) {
        uniquesElement.textContent = clubesUnicos.size;
    }
}

// ==============================
// FUNÇÕES AUXILIARES MANTIDAS
// ==============================
export async function carregarDetalhesLiga() {
    // Compatibilidade com código legado
    await carregarParticipantesComBrasoes();
}

export function toggleParticipants() {
    const container = document.getElementById("timesContainer");
    const button = document.querySelector(".toggle-participants");
    if (container && container.classList.contains("visible")) {
        container.classList.remove("visible");
        if (button) button.textContent = "Exibir Participantes";
    } else if (container) {
        container.classList.add("visible");
        if (button) button.textContent = "Ocultar Participantes";
    }
}

export function fecharModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
}

// ==============================
// GESTÃO DE STATUS
// ==============================
async function toggleStatusParticipante(timeId, estaAtivo) {
    if (!confirm(`Confirma ${estaAtivo ? 'inativação' : 'reativação'} deste participante?`)) {
        return;
    }

    try {
        let endpoint, body;

        if (estaAtivo) {
            // Inativar - pedir rodada de desistência
            const rodadaDesistencia = prompt(
                "Em qual rodada o participante desistiu?\n(Digite o número da rodada, ex: 15)"
            );

            if (!rodadaDesistencia) return;

            const rodada = parseInt(rodadaDesistencia);
            if (isNaN(rodada) || rodada < 1 || rodada > 38) {
                alert("Rodada inválida! Deve ser entre 1 e 38.");
                return;
            }

            endpoint = `/api/time/${timeId}/inativar`;
            body = { rodada_desistencia: rodada };
        } else {
            // Reativar
            endpoint = `/api/time/${timeId}/reativar`;
            body = {};
        }

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao alterar status');
        }

        alert(data.mensagem || 'Status atualizado com sucesso!');

        console.log('[STATUS] Recarregando participantes após alteração...');

        // Recarregar dados para atualizar visual
        await carregarParticipantesComBrasoes();

    } catch (error) {
        console.error('Erro ao alterar status:', error);
        alert(`Erro: ${error.message}`);
    }
}

// ==============================
// GERENCIAMENTO DE SENHAS
// ==============================
async function gerenciarSenhaParticipante(timeId, nomeCartoleiro) {
    try {
        // Buscar dados do participante
        const response = await fetch(`/api/time/${timeId}`);
        if (!response.ok) throw new Error('Erro ao buscar dados do participante');

        const participante = await response.json();
        const temSenha = participante.senha_acesso && participante.senha_acesso.length > 0;

        // Criar modal
        const modal = document.createElement('div');
        modal.className = 'modal-senha';
        modal.innerHTML = `
            <div class="modal-senha-content">
                <div class="modal-senha-header">
                    <h3>🔑 Gerenciar Senha - ${nomeCartoleiro}</h3>
                    <button class="modal-senha-close" onclick="this.closest('.modal-senha').remove()">×</button>
                </div>

                <div class="senha-status ${temSenha ? 'configurada' : 'nao-configurada'}">
                    ${temSenha ? '✓ Senha configurada' : '⚠ Senha não configurada'}
                </div>

                <div class="senha-info">
                    <p><strong>ID do Time:</strong> ${timeId}</p>
                    <p>Configure uma senha para permitir que o participante acesse seu extrato financeiro.</p>
                </div>

                <div class="senha-field">
                    <label>Nova Senha:</label>
                    <div class="senha-input-group">
                        <input type="text" 
                               id="novaSenha" 
                               placeholder="Digite ou gere uma senha"
                               value="${temSenha ? participante.senha_acesso : ''}"
                               maxlength="20">
                        <button class="btn-gerar-senha" onclick="window.gerarSenhaAleatoria()">
                            🎲 Gerar
                        </button>
                    </div>
                    <small style="color: var(--text-muted); display: block; margin-top: 5px;">
                        Mínimo 4 caracteres. Evite caracteres especiais.
                    </small>
                </div>

                <div class="senha-actions">
                    <button class="btn-modal btn-modal-cancelar" onclick="this.closest('.modal-senha').remove()">
                        Cancelar
                    </button>
                    <button class="btn-modal btn-modal-salvar" onclick="window.salvarSenhaParticipante(${timeId})">
                        💾 Salvar Senha
                    </button>
                </div>
            </div>
        `;

        // Fechar com ESC
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.remove();
        });

        document.body.appendChild(modal);

        // Focar no input
        setTimeout(() => {
            document.getElementById('novaSenha')?.focus();
        }, 100);

    } catch (error) {
        console.error('Erro ao abrir modal de senha:', error);
        alert(`Erro: ${error.message}`);
    }
}

function gerarSenhaAleatoria() {
    // Gerar senha de 8 caracteres (letras e números)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const input = document.getElementById('novaSenha');
    if (input) {
        input.value = senha;
        input.select();
    }
}

async function salvarSenhaParticipante(timeId) {
    const novaSenha = document.getElementById('novaSenha')?.value.trim();

    if (!novaSenha || novaSenha.length < 4) {
        alert('A senha deve ter no mínimo 4 caracteres!');
        return;
    }

    try {
        const response = await fetch(`/api/time/${timeId}/senha`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: novaSenha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao salvar senha');
        }

        alert(`✅ Senha configurada com sucesso!\n\nCredenciais de acesso:\nID do Time: ${timeId}\nSenha: ${novaSenha}\n\nOriente o participante a acessar via menu Ferramentas > Participantes`);

        // Fechar modal
        document.querySelector('.modal-senha')?.remove();

    } catch (error) {
        console.error('Erro ao salvar senha:', error);
        alert(`Erro: ${error.message}`);
    }
}

// Exportar globalmente
window.carregarParticipantesComBrasoes = carregarParticipantesComBrasoes;
window.toggleStatusParticipante = toggleStatusParticipante;
window.gerenciarSenhaParticipante = gerenciarSenhaParticipante;
window.gerarSenhaAleatoria = gerarSenhaAleatoria;
window.salvarSenhaParticipante = salvarSenhaParticipante;

// Auto-inicialização
setTimeout(() => {
    if (document.getElementById("participantes-grid")) {
        carregarParticipantesComBrasoes();
    }
}, 100);

console.log(
    "[PARTICIPANTES] ✅ Módulo melhorado carregado - UX aprimorada aplicada",
);