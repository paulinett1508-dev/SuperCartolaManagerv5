// participantes-brasoes.js
// Implementação completa do sistema dual de brasões para o módulo participantes

// ============================================
// CONFIGURAÇÃO E MAPEAMENTO DOS CLUBES
// ============================================
const CLUBES_CONFIG = {
    // Clubes com escudos locais disponíveis
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

    // Caminhos padrão
    PATHS: {
        escudosLocal: "/escudos/",
        placeholder: "/escudos/placeholder.png",
        defaultImage: "/escudos/default.png",
    },
};

// ============================================
// HELPER FUNCTIONS PARA BRASÕES
// ============================================
const BrasoesHelper = {
    /**
     * Obtém a URL do brasão do time fantasy (time no Cartola)
     * @param {Object} timeData - Dados do time
     * @returns {string} URL do brasão
     */
    getTimeFantasyBrasao(timeData) {
        if (!timeData) return CLUBES_CONFIG.PATHS.defaultImage;
        return timeData.url_escudo_png || CLUBES_CONFIG.PATHS.defaultImage;
    },

    /**
     * Obtém a URL do brasão do clube do coração
     * @param {number} clubeId - ID do clube
     * @returns {string} URL do escudo local
     */
    getClubeBrasao(clubeId) {
        if (!clubeId) return CLUBES_CONFIG.PATHS.placeholder;

        const clube = CLUBES_CONFIG.MAPEAMENTO[clubeId];
        if (clube) {
            return `${CLUBES_CONFIG.PATHS.escudosLocal}${clube.arquivo}`;
        }

        return CLUBES_CONFIG.PATHS.placeholder;
    },

    /**
     * Obtém o nome do clube pelo ID
     * @param {number} clubeId - ID do clube
     * @returns {string} Nome do clube
     */
    getNomeClube(clubeId) {
        const clube = CLUBES_CONFIG.MAPEAMENTO[clubeId];
        return clube ? clube.nome : "Não definido";
    },

    /**
     * Verifica se o clube tem escudo local disponível
     * @param {number} clubeId - ID do clube
     * @returns {boolean}
     */
    temEscudoLocal(clubeId) {
        return !!CLUBES_CONFIG.MAPEAMENTO[clubeId];
    },
};

// ============================================
// COMPONENTES DE RENDERIZAÇÃO
// ============================================
const BrasoesComponents = {
    /**
     * Renderiza card de participante com brasões duais
     * @param {Object} timeData - Dados completos do time
     * @returns {string} HTML do card
     */
    renderParticipanteCard(timeData) {
        const temClubeCoracao =
            timeData.clube_id &&
            BrasoesHelper.temEscudoLocal(timeData.clube_id);

        return `
            <div class="participante-card" data-time-id="${timeData.id || ""}">
                <!-- Header do Card -->
                <div class="participante-header">
                    <div class="participante-badge">
                        <span class="badge-icon">👤</span>
                    </div>
                    <div class="participante-status ${timeData.ativo ? "ativo" : "inativo"}">
                        <span class="status-indicator"></span>
                        ${timeData.ativo ? "Ativo" : "Inativo"}
                    </div>
                </div>

                <!-- Informações do Cartoleiro -->
                <div class="participante-info">
                    <h4 class="participante-cartoleiro">${timeData.nome_cartoleiro || "N/D"}</h4>
                    <p class="participante-time">${timeData.nome_time || "Time N/A"}</p>
                </div>

                <!-- Container dos Brasões -->
                <div class="participante-brasoes">
                    <!-- Brasão do Time Fantasy -->
                    <div class="brasao-container brasao-fantasy">
                        <img src="${BrasoesHelper.getTimeFantasyBrasao(timeData)}" 
                             alt="Time no Cartola" 
                             title="Time no Cartola FC"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                        <span class="brasao-label">Time Cartola</span>
                    </div>

                    <!-- Separador Visual -->
                    <div class="brasoes-separator">
                        <span>⚡</span>
                    </div>

                    <!-- Brasão do Clube do Coração -->
                    <div class="brasao-container brasao-coracao">
                        <img src="${BrasoesHelper.getClubeBrasao(timeData.clube_id)}" 
                             alt="Clube do Coração" 
                             title="${BrasoesHelper.getNomeClube(timeData.clube_id)}"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'"
                             class="${!temClubeCoracao ? "sem-clube" : ""}">
                        <span class="brasao-label">
                            ${temClubeCoracao ? "❤️ " + BrasoesHelper.getNomeClube(timeData.clube_id) : "Não definido"}
                        </span>
                    </div>
                </div>

                <!-- Footer do Card com Ações -->
                <div class="participante-footer">
                    <button class="btn-ver-detalhes" onclick="verDetalhesTime('${timeData.id}')">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza linha de tabela com brasões
     * @param {Object} timeData - Dados do time
     * @param {number} posicao - Posição na tabela
     * @returns {string} HTML da linha
     */
    renderParticipanteRow(timeData, posicao) {
        return `
            <tr class="participante-row" data-time-id="${timeData.id}">
                <td class="col-posicao">${posicao}</td>
                <td class="col-cartoleiro">
                    <div class="cartoleiro-info">
                        <strong>${timeData.nome_cartoleiro}</strong>
                        <small>${timeData.nome_time}</small>
                    </div>
                </td>
                <td class="col-brasao-fantasy">
                    <img src="${BrasoesHelper.getTimeFantasyBrasao(timeData)}" 
                         alt="Time Cartola" 
                         width="30" height="30"
                         onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                </td>
                <td class="col-brasao-coracao">
                    <img src="${BrasoesHelper.getClubeBrasao(timeData.clube_id)}" 
                         alt="${BrasoesHelper.getNomeClube(timeData.clube_id)}" 
                         title="${BrasoesHelper.getNomeClube(timeData.clube_id)}"
                         width="30" height="30"
                         onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                </td>
                <td class="col-pontos">${timeData.pontos || "0.00"}</td>
            </tr>
        `;
    },
};

// ============================================
// FUNÇÃO PRINCIPAL PARA CARREGAR PARTICIPANTES
// ============================================
async function carregarParticipantesComBrasoes() {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");

    if (!ligaId) {
        console.error("ID da liga não encontrado");
        return;
    }

    const container = document.getElementById("participantes-grid");
    if (!container) return;

    try {
        // Mostrar loading
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando participantes...</p>
            </div>
        `;

        // Buscar dados da liga
        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar liga");
        const liga = await resLiga.json();

        // Limpar container
        container.innerHTML = "";

        // Verificar se há times
        if (!liga.times || liga.times.length === 0) {
            container.innerHTML =
                '<p class="no-data">Nenhum participante cadastrado</p>';
            return;
        }

        // Buscar dados de cada time
        const timesData = await Promise.all(
            liga.times.map(async (timeId) => {
                try {
                    const res = await fetch(`/api/time/${timeId}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return { ...data, id: timeId };
                } catch (err) {
                    console.error(`Erro ao buscar time ${timeId}:`, err);
                    return null;
                }
            }),
        );

        // Filtrar times válidos e ordenar por nome
        const timesValidos = timesData
            .filter((t) => t !== null)
            .sort((a, b) =>
                (a.nome_cartoleiro || "").localeCompare(
                    b.nome_cartoleiro || "",
                ),
            );

        // Renderizar cards ou tabela baseado na preferência
        const viewMode = localStorage.getItem("participantes-view") || "cards";

        if (viewMode === "cards") {
            // Renderizar como cards
            timesValidos.forEach((timeData) => {
                container.innerHTML +=
                    BrasoesComponents.renderParticipanteCard(timeData);
            });
        } else {
            // Renderizar como tabela
            const table = document.createElement("table");
            table.className = "participantes-table";
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Cartoleiro / Time</th>
                        <th>Time Cartola</th>
                        <th>Clube ❤️</th>
                        <th>Pontos</th>
                    </tr>
                </thead>
                <tbody>
                    ${timesValidos
                        .map((timeData, index) =>
                            BrasoesComponents.renderParticipanteRow(
                                timeData,
                                index + 1,
                            ),
                        )
                        .join("")}
                </tbody>
            `;
            container.appendChild(table);
        }

        // Atualizar estatísticas
        atualizarEstatisticas(timesValidos);
    } catch (error) {
        console.error("Erro ao carregar participantes:", error);
        container.innerHTML = `
            <div class="error-state">
                <p>❌ Erro ao carregar participantes</p>
                <button onclick="carregarParticipantesComBrasoes()">Tentar Novamente</button>
            </div>
        `;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Atualiza as estatísticas na tela
 * @param {Array} timesData - Array com dados dos times
 */
function atualizarEstatisticas(timesData) {
    // Total de participantes
    const totalElement = document.getElementById("total-participantes");
    if (totalElement) {
        totalElement.textContent = timesData.length;
    }

    // Participantes ativos (exemplo: todos por padrão)
    const ativosElement = document.getElementById("participantes-ativos");
    if (ativosElement) {
        ativosElement.textContent = timesData.length;
    }

    // Times únicos (clubes do coração)
    const clubesUnicos = new Set(
        timesData
            .map((t) => t.clube_id)
            .filter((id) => id && BrasoesHelper.temEscudoLocal(id)),
    );

    const uniquesElement = document.getElementById("times-diferentes");
    if (uniquesElement) {
        uniquesElement.textContent = clubesUnicos.size;
    }
}

/**
 * Ver detalhes de um time específico
 * @param {string} timeId - ID do time
 */
function verDetalhesTime(timeId) {
    console.log("Ver detalhes do time:", timeId);
    // Implementar modal ou navegação para detalhes
    // Pode abrir um modal ou redirecionar para página de detalhes
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Executar quando o DOM estiver pronto
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        carregarParticipantesComBrasoes,
    );
} else {
    // DOM já carregado
    carregarParticipantesComBrasoes();
}

// Exportar para uso global
window.BrasoesHelper = BrasoesHelper;
window.BrasoesComponents = BrasoesComponents;
window.carregarParticipantesComBrasoes = carregarParticipantesComBrasoes;
