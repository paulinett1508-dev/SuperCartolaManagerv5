const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

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

// FUNÇÃO PRINCIPAL - Carrega dados básicos da liga
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

        // Atualiza os elementos básicos
        const nomeElement = document.getElementById("nomeLiga");
        const quantidadeElement = document.getElementById("quantidadeTimes");

        if (nomeElement) {
            nomeElement.textContent = `🏆 ${liga.nome || "Liga"}`;
        }

        if (quantidadeElement) {
            const participantes = liga.participantes || liga.times || [];
            const quantidade = Array.isArray(participantes)
                ? participantes.length
                : 0;
            quantidadeElement.textContent = `${quantidade} participantes`;
        }

        console.log(
            `✅ Dados básicos carregados: ${liga.nome} - ${(liga.participantes || liga.times || []).length} participantes`,
        );

        return liga;
    } catch (err) {
        console.error("Erro ao carregar dados básicos:", err);
    }
}

// FUNÇÃO ATUALIZADA - Carrega detalhes com brasões duplos
export async function carregarDetalhesLiga() {
    const container = document.getElementById("timesContainer");
    if (!container) {
        // Se não tem container antigo, usa o novo grid
        await carregarParticipantesComBrasoes();
        return;
    }

    const timesGrid = container.querySelector(".times-grid");
    if (container.dataset.loaded) return;

    try {
        if (!ligaId) {
            throw new Error("ID da liga não fornecido na URL");
        }

        const res = await fetch(`/api/ligas/${ligaId}`);
        if (!res.ok) {
            throw new Error(`Erro ao buscar liga: ${res.statusText}`);
        }
        const liga = await res.json();

        if (!liga || !liga.nome) {
            throw new Error("Liga não encontrada ou dados inválidos");
        }

        document.getElementById("nomeLiga").textContent = `🏆 ${liga.nome}`;
        document.getElementById("quantidadeTimes").textContent =
            liga.times && Array.isArray(liga.times)
                ? `${liga.times.length} time(s) cadastrados`
                : "0 time(s) cadastrados";

        timesGrid.innerHTML = "";
        if (liga.times && Array.isArray(liga.times) && liga.times.length > 0) {
            for (const time of liga.times) {
                const resCartola = await fetch(`/api/time/${time}`);
                if (!resCartola.ok) continue;
                const dados = await resCartola.json();

                const card = document.createElement("div");
                card.className = "time-card";
                card.innerHTML = `
                    <img src="${dados.url_escudo_png || ""}" alt="Escudo do time" title="Escudo do time" onerror="this.style.display='none'" />
                    <h4>${dados.nome_time || "Time N/D"}</h4>
                    <p>👤 ${dados.nome_cartoleiro || "N/D"}</p>
                `;
                card.onclick = () => abrirModal(dados);
                timesGrid.appendChild(card);
            }
        } else {
            timesGrid.innerHTML = "<p>Nenhum time cadastrado nesta liga.</p>";
        }
        container.dataset.loaded = "true";
    } catch (err) {
        console.error("Erro em carregarDetalhesLiga:", err.message);
    }
}

// NOVA FUNÇÃO - Carrega participantes com brasões duplos
async function carregarParticipantesComBrasoes() {
    const container = document.getElementById("participantes-grid");
    if (!container) {
        console.log("Container participantes-grid não encontrado");
        return;
    }

    try {
        console.log(`Carregando participantes da liga: ${ligaId}`);

        // Mostrar loading
        container.innerHTML = `
            <div class="loading-state">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; padding: 60px;">
                    <div style="width: 40px; height: 40px; border: 4px solid rgba(255, 69, 0, 0.3); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="color: #ff4500; font-weight: 600; font-size: 16px">Carregando participantes com brasões...</div>
                </div>
            </div>
        `;

        // Buscar dados da liga
        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar liga");
        const liga = await resLiga.json();

        if (!liga.times || liga.times.length === 0) {
            container.innerHTML =
                '<p class="no-data" style="text-align: center; padding: 60px; color: #95a5a6;">Nenhum participante cadastrado</p>';
            return;
        }

        // Buscar dados de cada time
        const timesData = await Promise.all(
            liga.times.map(async (timeId) => {
                try {
                    const res = await fetch(`/api/time/${timeId}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return { ...data, id: timeId, ativo: true };
                } catch (err) {
                    console.error(`Erro ao buscar time ${timeId}:`, err);
                    return null;
                }
            }),
        );

        // Filtrar times válidos e ordenar
        const timesValidos = timesData
            .filter((t) => t !== null)
            .sort((a, b) =>
                (a.nome_cartoleiro || "").localeCompare(
                    b.nome_cartoleiro || "",
                ),
            );

        // Limpar container e renderizar cards
        container.innerHTML = "";
        container.style.display = "grid";
        container.style.gridTemplateColumns =
            "repeat(auto-fill, minmax(280px, 1fr))";
        container.style.gap = "20px";
        container.style.padding = "20px 0";

        timesValidos.forEach((timeData) => {
            const card = document.createElement("div");
            card.className = "participante-card";
            card.style.cssText = `
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                padding: 20px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            `;

            const temClubeCoracao =
                timeData.clube_id &&
                CLUBES_CONFIG.MAPEAMENTO[timeData.clube_id];

            card.innerHTML = `
                <!-- Header do Card -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; justify-content: center; width: 35px; height: 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; color: white; font-size: 16px;">
                        <span>👤</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #d4edda; color: #155724;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                        Ativo
                    </div>
                </div>

                <!-- Informações do Cartoleiro -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <h4 style="font-size: 18px; font-weight: 700; color: #2c3e50; margin: 0 0 5px 0;">${timeData.nome_cartoleiro || "N/D"}</h4>
                    <p style="font-size: 14px; color: #7f8c8d; margin: 0;">${timeData.nome_time || "Time N/A"}</p>
                </div>

                <!-- Container dos Brasões -->
                <div style="display: flex; align-items: center; justify-content: space-around; padding: 20px 10px; background: linear-gradient(135deg, #f6f9fc 0%, #e9ecef 100%); border-radius: 10px; margin-bottom: 15px;">
                    <!-- Brasão do Time Fantasy -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                        <img src="${BrasoesHelper.getTimeFantasyBrasao(timeData)}" 
                             alt="Time no Cartola" 
                             title="Time no Cartola FC"
                             style="width: 60px; height: 60px; object-fit: contain; border-radius: 50%; padding: 5px; background: white; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1); border: 2px solid #3498db;"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.defaultImage}'">
                        <span style="font-size: 11px; color: #3498db; text-align: center; font-weight: 600;">Time Cartola</span>
                    </div>

                    <!-- Separador Visual -->
                    <div style="display: flex; align-items: center; justify-content: center; color: #95a5a6; font-size: 20px; margin: 0 10px;">
                        <span>⚡</span>
                    </div>

                    <!-- Brasão do Clube do Coração -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                        <img src="${BrasoesHelper.getClubeBrasao(timeData.clube_id)}" 
                             alt="Clube do Coração" 
                             title="${BrasoesHelper.getNomeClube(timeData.clube_id)}"
                             style="width: 60px; height: 60px; object-fit: contain; border-radius: 50%; padding: 5px; background: white; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1); border: 2px solid #e74c3c; ${!temClubeCoracao ? "opacity: 0.5; filter: grayscale(100%);" : ""}"
                             onerror="this.src='${CLUBES_CONFIG.PATHS.placeholder}'">
                        <span style="font-size: 11px; color: #e74c3c; text-align: center; font-weight: 600; max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${temClubeCoracao ? "❤️ " + BrasoesHelper.getNomeClube(timeData.clube_id) : "Não definido"}
                        </span>
                    </div>
                </div>
            `;

            // Adicionar hover effect
            card.onmouseenter = function () {
                this.style.transform = "translateY(-5px)";
                this.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
            };
            card.onmouseleave = function () {
                this.style.transform = "translateY(0)";
                this.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            };

            container.appendChild(card);
        });

        // Atualizar estatísticas
        atualizarEstatisticas(timesValidos);

        console.log(
            `✅ ${timesValidos.length} participantes carregados com brasões duplos`,
        );
    } catch (error) {
        console.error("Erro ao carregar participantes:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <p>❌ Erro ao carregar participantes</p>
                <button onclick="carregarParticipantesComBrasoes()" style="margin-top: 20px; padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Tentar Novamente</button>
            </div>
        `;
    }
}

// Atualizar estatísticas
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

// Toggle para mostrar/ocultar participantes
export function toggleParticipants() {
    const container = document.getElementById("timesContainer");
    const button = document.querySelector(".toggle-participants");
    if (container.classList.contains("visible")) {
        container.classList.remove("visible");
        button.textContent = "Exibir Participantes";
    } else {
        container.classList.add("visible");
        button.textContent = "Ocultar Participantes";
    }
}

// Modal
function abrirModal(dados) {
    document.getElementById("modalEscudo").src = dados.url_escudo_png || "";
    document.getElementById("modalNomeTime").textContent =
        dados.nome_time || "Time N/D";
    document.getElementById("modalCartoleiro").textContent =
        "👤 " + (dados.nome_cartoleiro || "N/D");
    document.getElementById("modal").style.display = "block";
}

export function fecharModal() {
    document.getElementById("modal").style.display = "none";
}

// Exportar globalmente
window.carregarParticipantesComBrasoes = carregarParticipantesComBrasoes;

// Carregar automaticamente quando o módulo participantes for detectado
setTimeout(() => {
    if (document.getElementById("participantes-grid")) {
        carregarParticipantesComBrasoes();
    }
}, 1000);
