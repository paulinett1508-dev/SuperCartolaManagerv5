// =====================================================================
// PARTICIPANTE-HISTORICO.JS - v2.0 (SALA DE TROFÉUS DINÂMICA)
// Destino: /participante/js/modules/participante-historico.js
// =====================================================================
// ✅ v2.0: Sala de Troféus com conquistas dinâmicas e condicionais
//    - Cards de PONTOS (mantido)
//    - Card de RODADAS (removido - dado irrelevante)
//    - Novos cards dinâmicos: Melhor do Mês, Mata-Mata, Ligas
//    - Lógica condicional: Se ganhou = destaque / Se não = mensagem neutra
// ✅ v1.0: Histórico básico de temporadas
// =====================================================================

if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "📜 Módulo v2.0 (Sala de Troféus) carregando...");

// Estado do módulo
let historicoData = null;
let temporadaSelecionada = null;
let ligaSelecionada = null; // ✅ NOVO: Liga selecionada
let ligaId = null;
let timeId = null;

// Mapeamento de badges para exibição
const BADGES_CONFIG = {
    campeao: { icon: "🏆", nome: "Campeão", cor: "#ffd700" },
    campeao_2025: { icon: "🏆", nome: "Campeão 2025", cor: "#ffd700" },
    vice: { icon: "🥈", nome: "Vice-Campeão", cor: "#c0c0c0" },
    vice_2025: { icon: "🥈", nome: "Vice 2025", cor: "#c0c0c0" },
    terceiro: { icon: "🥉", nome: "3º Lugar", cor: "#cd7f32" },
    terceiro_2025: { icon: "🥉", nome: "3º Lugar 2025", cor: "#cd7f32" },
    top10_mito: { icon: "⭐", nome: "Top 10 Mito", cor: "#10b981" },
    top10_mito_2025: { icon: "⭐", nome: "Top 10 Mito 2025", cor: "#10b981" },
    top10_mico: { icon: "💀", nome: "Top 10 Mico", cor: "#ef4444" },
    top10_mico_2025: { icon: "💀", nome: "Top 10 Mico 2025", cor: "#ef4444" },
    artilheiro: { icon: "⚽", nome: "Artilheiro", cor: "#3b82f6" },
    luva_ouro: { icon: "🧤", nome: "Luva de Ouro", cor: "#f59e0b" },
    melhor_mes: { icon: "📅", nome: "Melhor do Mês", cor: "#8b5cf6" },
    mata_mata_campeao: { icon: "⚔️", nome: "Campeão Mata-Mata", cor: "#ec4899" },
    invicto: { icon: "🛡️", nome: "Invicto", cor: "#14b8a6" }
};

// =====================================================================
// FUNÇÃO PRINCIPAL - INICIALIZAR
// =====================================================================
export async function inicializarHistoricoParticipante({ participante, ligaId: _ligaId, timeId: _timeId }) {
    if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "🔄 Inicializando...", { timeId: _timeId });

    ligaId = _ligaId;
    timeId = _timeId;

    if (!timeId) {
        mostrarErro("Dados inválidos para carregar histórico");
        return;
    }

    // Mostrar loading
    const container = document.getElementById("historicoDetalhe");
    if (container) {
        container.innerHTML = `
            <div class="loading-placeholder">
                <div class="spinner"></div>
                <p>Carregando seu histórico...</p>
            </div>
        `;
    }

    try {
        // Buscar histórico da API
        const response = await fetch(`/api/participante/historico/${timeId}`);

        if (!response.ok) {
            if (response.status === 404) {
                mostrarVazio();
                return;
            }
            throw new Error(`Erro ao buscar histórico: ${response.status}`);
        }

        historicoData = await response.json();

        if (!historicoData.success) {
            throw new Error(historicoData.error || "Erro desconhecido");
        }

        if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "✅ Dados carregados:", {
            temporadas: historicoData.historico?.length || 0
        });

        // Renderizar tudo
        renderizarStats();
        renderizarBadges();
        renderizarSeletorLigas(); // ✅ NOVO
        renderizarTemporadas();

    } catch (error) {
        if (window.Log) Log.error("HISTORICO-PARTICIPANTE", "❌ Erro:", error);
        mostrarErro(error.message);
    }
}

// =====================================================================
// RENDERIZAR ESTATÍSTICAS AGREGADAS
// =====================================================================
function renderizarStats() {
    const stats = historicoData.stats_agregadas || {};
    const financeiro = historicoData.situacao_financeira || {};

    // Temporadas
    const elTemporadas = document.getElementById("statTemporadas");
    if (elTemporadas) {
        elTemporadas.textContent = stats.total_temporadas || 0;
    }

    // Títulos
    const elTitulos = document.getElementById("statTitulos");
    if (elTitulos) {
        elTitulos.textContent = stats.total_titulos || 0;
    }

    // Melhor Posição
    const elMelhorPos = document.getElementById("statMelhorPos");
    if (elMelhorPos) {
        const pos = stats.melhor_posicao_geral;
        elMelhorPos.textContent = pos ? `${pos}º` : "-";
    }

    // Saldo Histórico
    const elSaldo = document.getElementById("statSaldo");
    if (elSaldo) {
        const saldo = financeiro.saldo_atual || 0;
        elSaldo.textContent = formatarMoeda(saldo);
        elSaldo.classList.toggle("positivo", saldo > 0);
        elSaldo.classList.toggle("negativo", saldo < 0);
    }
}

// =====================================================================
// RENDERIZAR BADGES CONQUISTADOS
// =====================================================================
function renderizarBadges() {
    const container = document.getElementById("badgesContainer");
    const section = document.getElementById("historicoBadges");

    if (!container || !section) return;

    // Coletar todos os badges de todas as temporadas
    const todosBadges = [];

    (historicoData.historico || []).forEach(temp => {
        const badges = temp.conquistas?.badges || [];
        badges.forEach(badgeId => {
            todosBadges.push({
                id: badgeId,
                ano: temp.ano
            });
        });
    });

    if (todosBadges.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";

    container.innerHTML = todosBadges.map(badge => {
        const config = BADGES_CONFIG[badge.id] || BADGES_CONFIG[badge.id.replace(/_\d{4}$/, '')] || {
            icon: "🎖️",
            nome: badge.id.replace(/_/g, " "),
            cor: "#9ca3af"
        };

        return `
            <div class="badge-item" style="border-color: ${config.cor}30;">
                <span class="badge-icon">${config.icon}</span>
                <span class="badge-text">${config.nome}</span>
                ${!badge.id.includes(badge.ano) ? `<span class="badge-year">${badge.ano}</span>` : ''}
            </div>
        `;
    }).join("");
}

// =====================================================================
// ✅ NOVO: RENDERIZAR SELETOR DE LIGAS
// =====================================================================
function renderizarSeletorLigas() {
    const ligasTabsContainer = document.getElementById("ligasTabs");
    const seletorLiga = document.getElementById("historicoSeletorLiga");

    if (!ligasTabsContainer || !seletorLiga) return;

    const temporadas = historicoData.historico || [];

    if (temporadas.length === 0) {
        seletorLiga.style.display = "none";
        return;
    }

    // Agrupar temporadas por liga
    const ligasMap = new Map();
    temporadas.forEach(temp => {
        const ligaKey = temp.liga_id;
        const ligaNome = temp.liga_nome || "Liga Desconhecida";
        
        if (!ligasMap.has(ligaKey)) {
            ligasMap.set(ligaKey, {
                id: ligaKey,
                nome: ligaNome,
                temporadas: []
            });
        }
        ligasMap.get(ligaKey).temporadas.push(temp);
    });

    const ligas = Array.from(ligasMap.values());

    if (ligas.length === 0) {
        seletorLiga.style.display = "none";
        return;
    }

    // Se há apenas uma liga, ocultar seletor
    if (ligas.length === 1) {
        ligaSelecionada = ligas[0].id;
        seletorLiga.style.display = "none";
        return;
    }

    // Renderizar tabs de ligas
    ligasTabsContainer.innerHTML = ligas.map((liga, idx) => `
        <button class="temporada-tab ${idx === 0 ? 'active' : ''}"
                data-liga-id="${liga.id}"
                onclick="window.selecionarLiga('${liga.id}')">
            ${liga.nome}
        </button>
    `).join("");

    // Selecionar primeira liga por padrão
    ligaSelecionada = ligas[0].id;
    seletorLiga.style.display = "block";

    if (window.Log) Log.debug("HISTORICO-PARTICIPANTE", `✅ ${ligas.length} ligas renderizadas`);
}

// =====================================================================
// ✅ NOVO: SELECIONAR LIGA (global para onclick)
// =====================================================================
window.selecionarLiga = function(ligaIdParam) {
    if (window.Log) Log.debug("HISTORICO-PARTICIPANTE", "🏆 Selecionando liga:", ligaIdParam);

    ligaSelecionada = ligaIdParam;

    // Atualizar tabs de liga
    document.querySelectorAll("#ligasTabs .temporada-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.ligaId === ligaIdParam);
    });

    // Re-renderizar temporadas da liga selecionada
    renderizarTemporadas();
};

// =====================================================================
// RENDERIZAR SELETOR DE TEMPORADAS
// =====================================================================
function renderizarTemporadas() {
    const tabsContainer = document.getElementById("temporadasTabs");
    const detalheContainer = document.getElementById("historicoDetalhe");

    if (!tabsContainer || !detalheContainer) return;

    const todasTemporadas = historicoData.historico || [];

    if (todasTemporadas.length === 0) {
        mostrarVazio();
        return;
    }

    // ✅ NOVO: Filtrar temporadas pela liga selecionada (se houver seletor de liga)
    const temporadas = ligaSelecionada
        ? todasTemporadas.filter(t => t.liga_id === ligaSelecionada)
        : todasTemporadas;

    if (temporadas.length === 0) {
        detalheContainer.innerHTML = `
            <div class="historico-vazio">
                <span class="material-symbols-outlined empty-icon">info</span>
                <h3>Sem histórico nesta liga</h3>
                <p>Você não participou de temporadas nesta liga.</p>
            </div>
        `;
        return;
    }

    // Ordenar temporadas (mais recente primeiro)
    const temporadasOrdenadas = [...temporadas].sort((a, b) => b.ano - a.ano);

    // Renderizar tabs
    tabsContainer.innerHTML = temporadasOrdenadas.map((temp, idx) => `
        <button class="temporada-tab ${idx === 0 ? 'active' : ''}"
                data-ano="${temp.ano}"
                onclick="window.selecionarTemporada(${temp.ano})">
            ${temp.ano}
        </button>
    `).join("");

    // Selecionar primeira temporada por padrão
    if (temporadasOrdenadas.length > 0) {
        temporadaSelecionada = temporadasOrdenadas[0].ano;
        renderizarDetalheTemporada(temporadasOrdenadas[0]);
    }
}

// =====================================================================
// SELECIONAR TEMPORADA (global para onclick)
// =====================================================================
window.selecionarTemporada = function(ano) {
    if (window.Log) Log.debug("HISTORICO-PARTICIPANTE", "📅 Selecionando temporada:", ano);

    temporadaSelecionada = ano;

    // Atualizar tabs
    document.querySelectorAll("#temporadasTabs .temporada-tab").forEach(tab => {
        tab.classList.toggle("active", parseInt(tab.dataset.ano) === ano);
    });

    // Buscar dados da temporada (filtrado pela liga se necessário)
    const todasTemporadas = historicoData.historico || [];
    const temporadasFiltradas = ligaSelecionada
        ? todasTemporadas.filter(t => t.liga_id === ligaSelecionada)
        : todasTemporadas;
    
    const temporada = temporadasFiltradas.find(t => t.ano === ano);

    if (temporada) {
        renderizarDetalheTemporada(temporada);
    }
};

// =====================================================================
// ✅ v2.0: RENDERIZAR DETALHE DE UMA TEMPORADA (SALA DE TROFÉUS)
// =====================================================================
async function renderizarDetalheTemporada(temporada) {
    const container = document.getElementById("historicoDetalhe");
    if (!container) return;

    const stats = temporada.estatisticas || {};
    const financeiro = temporada.financeiro || {};
    const badges = temporada.conquistas?.badges || [];

    // Determinar classe da posição
    let posicaoClasse = "normal";
    if (stats.posicao_final === 1) posicaoClasse = "ouro";
    else if (stats.posicao_final === 2) posicaoClasse = "prata";
    else if (stats.posicao_final === 3) posicaoClasse = "bronze";

    // ✅ v2.0: Buscar dados de conquistas dinâmicas
    const conquistasMelhorMes = await buscarConquistasMelhorMes(temporada.ano);
    const conquistasMataMata = await buscarConquistasMataMata(temporada.ano);

    container.innerHTML = `
        <!-- Header com Escudo e Posição -->
        <div class="detalhe-header">
            <img src="${temporada.time_escudo || '/participante/img/escudo-placeholder.png'}"
                 alt="Escudo"
                 class="detalhe-escudo"
                 onerror="this.src='/participante/img/escudo-placeholder.png'">
            <div class="detalhe-info">
                <h3>${temporada.liga_nome || 'Liga'}</h3>
                <p>Temporada ${temporada.ano}</p>
            </div>
            <div class="detalhe-posicao">
                <span class="posicao-numero ${posicaoClasse}">${stats.posicao_final || '-'}º</span>
                <span class="posicao-label">Posição Final</span>
            </div>
        </div>

        <!-- ✅ v2.0: Card PONTOS (mantido) -->
        <div class="conquista-card card-pontos">
            <div class="conquista-header">
                <span class="material-symbols-outlined conquista-icon">sports_score</span>
                <h4 class="conquista-titulo">Pontuação Total</h4>
            </div>
            <div class="conquista-body">
                <p class="conquista-valor-principal">${formatarPontos(stats.pontos_totais)}</p>
                <p class="conquista-descricao">pontos acumulados na Rodada 38</p>
            </div>
        </div>

        ${renderizarCardSaldoFinanceiro(financeiro)}
        ${renderizarCardMelhorMes(conquistasMelhorMes)}
        ${renderizarCardMataMata(conquistasMataMata)}

        ${badges.length > 0 ? `
            <!-- Badges da Temporada -->
            <div class="detalhe-badges">
                ${badges.map(badgeId => {
                    const config = BADGES_CONFIG[badgeId] || BADGES_CONFIG[badgeId.replace(/_\d{4}$/, '')] || {
                        icon: "🎖️",
                        nome: badgeId.replace(/_/g, " ")
                    };
                    return `
                        <span class="detalhe-badge">
                            ${config.icon} ${config.nome.replace(/_\d{4}$/, '')}
                        </span>
                    `;
                }).join("")}
            </div>
        ` : ''}
    `;
}

// =====================================================================
// ✅ v2.0: RENDERIZAR CARD DE SALDO FINANCEIRO
// =====================================================================
function renderizarCardSaldoFinanceiro(financeiro) {
    const saldoFinal = financeiro.saldo_final || 0;
    const isPositivo = saldoFinal > 0.01;
    const isNegativo = saldoFinal < -0.01;
    const isZerado = Math.abs(saldoFinal) <= 0.01;

    let corClasse = "neutro";
    let icone = "account_balance_wallet";
    let status = "Neutro";

    if (isPositivo) {
        corClasse = "sucesso";
        icone = "trending_up";
        status = "Credor";
    } else if (isNegativo) {
        corClasse = "alerta";
        icone = "trending_down";
        status = "Devedor";
    } else {
        corClasse = "sucesso";
        icone = "check_circle";
        status = "Quitado";
    }

    return `
        <div class="conquista-card card-financeiro card-${corClasse}">
            <div class="conquista-header">
                <span class="material-symbols-outlined conquista-icon">${icone}</span>
                <h4 class="conquista-titulo">Saldo Financeiro</h4>
            </div>
            <div class="conquista-body">
                <p class="conquista-valor-principal">${formatarMoeda(saldoFinal)}</p>
                <p class="conquista-descricao">${status}</p>
                <div class="conquista-detalhes">
                    <div class="detalhe-item">
                        <span class="detalhe-label">Bônus</span>
                        <span class="detalhe-valor positivo">+${formatarMoeda(Math.abs(financeiro.total_bonus || 0))}</span>
                    </div>
                    <div class="detalhe-item">
                        <span class="detalhe-label">Ônus</span>
                        <span class="detalhe-valor negativo">-${formatarMoeda(Math.abs(financeiro.total_onus || 0))}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================================
// ✅ v2.0: RENDERIZAR CARD DE MELHOR DO MÊS
// =====================================================================
function renderizarCardMelhorMes(conquistas) {
    const ganhou = conquistas && conquistas.length > 0;

    if (ganhou) {
        // Agrupar por mês
        const mesesGanhos = conquistas.map(c => {
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return meses[c.mes - 1];
        });

        return `
            <div class="conquista-card card-melhor-mes card-conquista">
                <div class="conquista-header">
                    <span class="material-symbols-outlined conquista-icon">calendar_month</span>
                    <h4 class="conquista-titulo">Melhor do Mês</h4>
                    <span class="conquista-badge badge-ouro">🏆 ${conquistas.length}x</span>
                </div>
                <div class="conquista-body">
                    <p class="conquista-texto-destaque">Você foi o melhor do mês em:</p>
                    <div class="conquista-lista-meses">
                        ${mesesGanhos.map(mes => `
                            <span class="mes-badge">${mes}</span>
                        `).join('')}
                    </div>
                    <p class="conquista-descricao-extra">Parabéns pela consistência! 🎉</p>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="conquista-card card-melhor-mes card-vazio">
                <div class="conquista-header">
                    <span class="material-symbols-outlined conquista-icon">calendar_month</span>
                    <h4 class="conquista-titulo">Melhor do Mês</h4>
                </div>
                <div class="conquista-body">
                    <p class="conquista-texto-neutro">Você não ganhou nenhum <strong>MELHOR DO MÊS</strong> nesta temporada.</p>
                    <p class="conquista-motivacao">Continue se esforçando! Na próxima temporada pode ser diferente. 💪</p>
                </div>
            </div>
        `;
    }
}

// =====================================================================
// ✅ v2.0: RENDERIZAR CARD DE MATA-MATA
// =====================================================================
function renderizarCardMataMata(conquistas) {
    const ganhou = conquistas && conquistas.length > 0;

    if (ganhou) {
        return `
            <div class="conquista-card card-mata-mata card-conquista">
                <div class="conquista-header">
                    <span class="material-symbols-outlined conquista-icon">emoji_events</span>
                    <h4 class="conquista-titulo">Mata-Mata</h4>
                    <span class="conquista-badge badge-ouro">👑 Campeão</span>
                </div>
                <div class="conquista-body">
                    <p class="conquista-texto-destaque">Você foi campeão do Mata-Mata!</p>
                    <div class="conquista-detalhes-liga">
                        ${conquistas.map(c => `
                            <div class="liga-vencida">
                                <span class="material-symbols-outlined">military_tech</span>
                                <span>${c.nome || `Edição ${c.edicao}`}</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="conquista-descricao-extra">Glória eterna! 🏆</p>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="conquista-card card-mata-mata card-vazio">
                <div class="conquista-header">
                    <span class="material-symbols-outlined conquista-icon">sports_mma</span>
                    <h4 class="conquista-titulo">Mata-Mata</h4>
                </div>
                <div class="conquista-body">
                    <p class="conquista-texto-neutro">Você não ganhou nenhuma edição do <strong>MATA-MATA</strong>.</p>
                    <p class="conquista-motivacao">A eliminação direta é implacável. Treine e volte mais forte! ⚔️</p>
                </div>
            </div>
        `;
    }
}

// =====================================================================
// ✅ v2.0: BUSCAR CONQUISTAS DE MELHOR DO MÊS
// =====================================================================
async function buscarConquistasMelhorMes(ano) {
    try {
        if (!ligaId || !timeId) return null;

        const response = await fetch(`/api/melhor-mes/${ligaId}?temporada=${ano}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success || !data.vencedores) return null;

        // Filtrar meses que o participante ganhou
        const mesesGanhos = data.vencedores.filter(v => 
            String(v.time_id) === String(timeId) && v.nome
        );

        return mesesGanhos.length > 0 ? mesesGanhos : null;
    } catch (error) {
        if (window.Log) Log.warn("HISTORICO-PARTICIPANTE", "⚠️ Erro ao buscar Melhor do Mês:", error);
        return null;
    }
}

// =====================================================================
// ✅ v2.0: BUSCAR CONQUISTAS DE MATA-MATA
// =====================================================================
async function buscarConquistasMataMata(ano) {
    try {
        if (!ligaId || !timeId) return null;

        const response = await fetch(`/api/mata-mata/${ligaId}/edicoes`);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success || !data.edicoes) return null;

        // Filtrar edições que o participante ganhou
        const edicoesGanhas = data.edicoes.filter(ed => {
            // Verificar se é campeão (1º lugar)
            if (!ed.ranking || !Array.isArray(ed.ranking)) return false;
            
            const campeao = ed.ranking[0];
            return campeao && String(campeao.time_id) === String(timeId);
        });

        return edicoesGanhas.length > 0 ? edicoesGanhas.map(ed => ({
            edicao: ed.edicao,
            nome: ed.nome || `${ed.edicao}ª Edição`
        })) : null;
    } catch (error) {
        if (window.Log) Log.warn("HISTORICO-PARTICIPANTE", "⚠️ Erro ao buscar Mata-Mata:", error);
        return null;
    }
}

// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

function formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatarPontos(valor) {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function mostrarVazio() {
    const container = document.getElementById("historicoDetalhe");
    const section = document.getElementById("historicoSeletor");

    if (section) section.style.display = "none";

    if (container) {
        container.innerHTML = `
            <div class="historico-vazio">
                <span class="material-symbols-outlined empty-icon">history_edu</span>
                <h3>Sem histórico ainda</h3>
                <p>Seu legado começará a ser registrado após a primeira temporada.</p>
            </div>
        `;
    }

    // Zerar stats
    document.getElementById("statTemporadas")?.textContent && (document.getElementById("statTemporadas").textContent = "0");
    document.getElementById("statTitulos")?.textContent && (document.getElementById("statTitulos").textContent = "0");
    document.getElementById("statMelhorPos")?.textContent && (document.getElementById("statMelhorPos").textContent = "-");
    document.getElementById("statSaldo")?.textContent && (document.getElementById("statSaldo").textContent = "R$ 0");
}

function mostrarErro(mensagem) {
    const container = document.getElementById("historicoDetalhe");
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1);
                        border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444; margin-bottom: 16px; display: block;">error</span>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar</h3>
                <p style="color: #e0e0e0; margin-bottom: 20px;">${mensagem}</p>
                <button onclick="location.reload()"
                        style="padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%);
                               color: white; border: none; border-radius: 8px; cursor: pointer;
                               font-weight: 600; font-size: 14px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

// =====================================================================
// EXPORTS
// =====================================================================
export function initHistoricoParticipante() {
    if (window.Log) Log.debug("HISTORICO-PARTICIPANTE", "Módulo pronto");
}

if (window.Log) Log.info("HISTORICO-PARTICIPANTE", "✅ Módulo v2.0 (Sala de Troféus) carregado");
