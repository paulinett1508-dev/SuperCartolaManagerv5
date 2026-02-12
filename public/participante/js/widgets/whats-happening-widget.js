/**
 * WHATS HAPPENING WIDGET - "O que tá rolando?"
 * =============================================
 * Widget flutuante de engajamento em tempo real
 * Mostra disputas internas ativas nos módulos da liga
 *
 * @version 1.0.0
 *
 * Módulos suportados:
 * - Pontos Corridos (confrontos da rodada)
 * - Mata-Mata (confrontos ativos)
 * - Artilheiro (disputa pelo topo)
 * - Luva de Ouro (melhor goleiro)
 * - Capitão de Luxo (melhor capitão)
 * - Ranking da Rodada (top 3 + posição do usuário)
 */

if (window.Log) Log.info("[WHATS-HAPPENING] 🔥 Widget v1.0 carregando...");

// ============================================
// ESTADO DO WIDGET
// ============================================
const WHState = {
    isOpen: false,
    isLoading: false,
    ligaId: null,
    timeId: null,
    temporada: null,
    modulosAtivos: {},
    mercadoStatus: null,
    lastUpdate: null,
    pollingInterval: null,
    data: {
        pontosCorridos: null,
        mataMata: null,
        artilheiro: null,
        luvaOuro: null,
        capitao: null,
        ranking: null,
        parciais: null, // Parciais da liga (ranking em tempo real)
        meuConfrontoPc: null, // Confronto do participante no Pontos Corridos
        meuConfrontoMm: null, // Confronto do participante no Mata-Mata
    },
    hasUpdates: false,
    // Drag state
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    fabPosition: { right: 16, bottom: 80 }, // Posição padrão
};

// ============================================
// DRAG & DROP - FAB SOLTO
// ============================================
const FAB_STORAGE_KEY = "wh-fab-position";

function loadFabPosition() {
    try {
        const saved = localStorage.getItem(FAB_STORAGE_KEY);
        if (saved) {
            const pos = JSON.parse(saved);
            WHState.fabPosition = pos;
        }
    } catch (e) {
        // Manter posição padrão
    }
}

function saveFabPosition() {
    try {
        localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(WHState.fabPosition));
    } catch (e) {
        // Ignorar erro de storage
    }
}

function applyFabPosition(fab) {
    fab.style.right = `${WHState.fabPosition.right}px`;
    fab.style.bottom = `${WHState.fabPosition.bottom}px`;
    // Limpar left/top se existirem
    fab.style.left = "auto";
    fab.style.top = "auto";
}

function initFabDrag(fab) {
    let startX, startY, startRight, startBottom;
    let hasMoved = false;
    let touchStartTime = 0;

    // Mostrar hint de drag na primeira vez
    showDragHintIfNeeded(fab);

    // Touch events (mobile)
    fab.addEventListener("touchstart", handleDragStart, { passive: true }); // passive para melhor performance
    fab.addEventListener("touchmove", handleDragMove, { passive: false });
    fab.addEventListener("touchend", handleDragEnd);

    // Mouse events (desktop)
    fab.addEventListener("mousedown", handleDragStart);
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);

    function handleDragStart(e) {
        if (WHState.isOpen) return; // Não arrastar se painel aberto

        WHState.isDragging = true;
        hasMoved = false;
        touchStartTime = Date.now();
        fab.classList.add("dragging");
        fab.classList.remove("show-drag-hint");

        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        startRight = WHState.fabPosition.right;
        startBottom = WHState.fabPosition.bottom;

        // NÃO chamar preventDefault aqui - permite click/tap funcionar
    }

    function handleDragMove(e) {
        if (!WHState.isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        const deltaX = startX - touch.clientX;
        const deltaY = startY - touch.clientY;

        // Considerar como "moveu" se deslocou mais de 10px (aumentado para evitar falsos positivos)
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            hasMoved = true;
            // Só prevenir scroll DEPOIS de confirmar que é drag
            if (e.type === "touchmove" && e.cancelable) {
                e.preventDefault();
            }
        }

        if (!hasMoved) return; // Não mover até confirmar drag

        // Calcular nova posição
        let newRight = startRight + deltaX;
        let newBottom = startBottom + deltaY;

        // Limites da tela
        const fabSize = 60;
        const margin = 8;
        const maxRight = window.innerWidth - fabSize - margin;
        const maxBottom = window.innerHeight - fabSize - margin;

        newRight = Math.max(margin, Math.min(maxRight, newRight));
        newBottom = Math.max(margin, Math.min(maxBottom, newBottom));

        WHState.fabPosition.right = newRight;
        WHState.fabPosition.bottom = newBottom;

        applyFabPosition(fab);
    }

    function handleDragEnd(e) {
        if (!WHState.isDragging) return;

        const wasDragging = hasMoved;
        const touchDuration = Date.now() - touchStartTime;

        WHState.isDragging = false;
        fab.classList.remove("dragging");

        if (wasDragging) {
            // Efeito visual de "soltar"
            fab.classList.add("just-dropped");
            setTimeout(() => fab.classList.remove("just-dropped"), 400);

            // Salvar posição
            saveFabPosition();
            markDragHintShown();
        } else if (e.type === "touchend" && touchDuration < 300) {
            // TAP detectado no mobile - abrir painel diretamente
            // (click event pode não disparar em alguns dispositivos)
            setTimeout(() => {
                if (!WHState.isOpen) {
                    togglePanel();
                }
            }, 10);
        }

        hasMoved = false;
    }
}

function showDragHintIfNeeded(fab) {
    const HINT_KEY = "wh-fab-drag-hint-shown";
    try {
        if (!localStorage.getItem(HINT_KEY)) {
            // Mostrar hint após 2 segundos
            setTimeout(() => {
                fab.classList.add("show-drag-hint");
                // Remover automaticamente após a animação (3s)
                setTimeout(() => {
                    fab.classList.remove("show-drag-hint");
                }, 3000);
            }, 2000);
        }
    } catch (e) {
        // Ignorar
    }
}

function markDragHintShown() {
    const HINT_KEY = "wh-fab-drag-hint-shown";
    try {
        localStorage.setItem(HINT_KEY, "1");
    } catch (e) {
        // Ignorar
    }
}

// ============================================
// CONFIGURAÇÃO
// ============================================
const WH_CONFIG = {
    POLLING_INTERVAL: 60000, // 60 segundos
    API_TIMEOUT: 5000, // Timeout padrão (aumentado de 3s para 5s)
    API_TIMEOUT_SLOW: 10000, // Timeout para APIs lentas (luva, parciais) - 10s
    MIN_DIFF_HOT: 10, // Diferença mínima para ser "disputa quente"
};

// Helper: fetch com timeout
async function fetchWithTimeout(url, timeout = WH_CONFIG.API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            if (window.Log) Log.warn(`[WHATS-HAPPENING] ⏱️ Timeout em ${url}`);
        }
        throw e;
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
export async function initWhatsHappeningWidget(params = {}) {
    if (window.Log) Log.info("[WHATS-HAPPENING] 🚀 Inicializando widget...", params);

    // Extrair parâmetros
    WHState.ligaId = params.ligaId || window.participanteData?.ligaId;
    WHState.timeId = params.timeId || window.participanteData?.timeId;
    WHState.temporada = params.temporada || new Date().getFullYear();
    WHState.modulosAtivos = params.modulosAtivos || {};

    if (!WHState.ligaId) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ ligaId não definido, widget não será renderizado");
        return;
    }

    // 1) Criar FAB IMEDIATAMENTE (não bloquear UX)
    createWidgetElements();

    // 2) Buscar status do mercado (rápido, ~0.5s)
    fetchMercadoStatus().then(() => {
        // 3) Buscar dados em background (não bloquear)
        fetchAllData().then(() => {
            // 4) Iniciar polling se bola rolando
            if (WHState.mercadoStatus?.bola_rolando) {
                startPolling();
            }
            if (window.Log) Log.info("[WHATS-HAPPENING] ✅ Widget inicializado com sucesso");
        });
    });
}

// ============================================
// CRIAR ELEMENTOS DO DOM
// ============================================
function createWidgetElements() {
    // Remover elementos existentes (se houver)
    const existingFab = document.getElementById("wh-fab");
    const existingPanel = document.getElementById("wh-panel");
    const existingBackdrop = document.getElementById("wh-backdrop");

    if (existingFab) existingFab.remove();
    if (existingPanel) existingPanel.remove();
    if (existingBackdrop) existingBackdrop.remove();

    // Carregar posição salva
    loadFabPosition();

    // Criar FAB
    const fab = document.createElement("button");
    fab.id = "wh-fab";
    fab.className = "wh-fab";
    fab.innerHTML = `
        <span class="material-icons wh-fab-icon">local_fire_department</span>
    `;

    // Aplicar posição salva
    applyFabPosition(fab);

    // Click handler que ignora se estava arrastando
    fab.addEventListener("click", (e) => {
        if (WHState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        togglePanel();
    });

    document.body.appendChild(fab);

    // Inicializar drag
    initFabDrag(fab);

    // Criar Backdrop
    const backdrop = document.createElement("div");
    backdrop.id = "wh-backdrop";
    backdrop.className = "wh-backdrop";
    backdrop.addEventListener("click", closePanel);
    document.body.appendChild(backdrop);

    // Criar Panel
    const panel = document.createElement("div");
    panel.id = "wh-panel";
    panel.className = "wh-panel";
    panel.innerHTML = `
        <div class="wh-handle"></div>
        <div class="wh-header">
            <div class="wh-title">
                <span class="material-icons wh-title-icon">local_fire_department</span>
                O que tá rolando?
            </div>
            <button class="wh-close-btn" id="wh-close-btn">
                <span class="material-icons">close</span>
            </button>
        </div>
        <div class="wh-content" id="wh-content">
            <div class="wh-loading">
                <div class="wh-loading-spinner"></div>
                <div class="wh-loading-text">Buscando disputas...</div>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Event listener para fechar
    document.getElementById("wh-close-btn").addEventListener("click", closePanel);

    // Swipe down para fechar
    setupSwipeToClose(panel);
}

// ============================================
// TOGGLE / OPEN / CLOSE
// ============================================
function togglePanel() {
    if (WHState.isOpen) {
        closePanel();
    } else {
        openPanel();
    }
}

function openPanel() {
    WHState.isOpen = true;
    document.getElementById("wh-fab").classList.add("open");
    document.getElementById("wh-panel").classList.add("open");
    document.getElementById("wh-backdrop").classList.add("visible");

    // Remover badge de novidades
    WHState.hasUpdates = false;
    updateFabBadge();

    // Renderizar conteúdo
    renderContent();
}

function closePanel() {
    WHState.isOpen = false;
    document.getElementById("wh-fab").classList.remove("open");
    document.getElementById("wh-panel").classList.remove("open");
    document.getElementById("wh-backdrop").classList.remove("visible");
}

// ============================================
// SWIPE TO CLOSE
// ============================================
function setupSwipeToClose(panel) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    panel.addEventListener("touchstart", (e) => {
        if (e.target.closest(".wh-content")) return; // Não interferir no scroll
        startY = e.touches[0].clientY;
        isDragging = true;
    });

    panel.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0) {
            panel.style.transform = `translateY(${diff}px)`;
        }
    });

    panel.addEventListener("touchend", () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = currentY - startY;
        if (diff > 100) {
            closePanel();
        }

        panel.style.transform = "";
    });
}

// ============================================
// BUSCAR DADOS
// ============================================
async function fetchMercadoStatus() {
    try {
        // Usar proxy interno para evitar CORS (timeout 2s)
        const res = await fetchWithTimeout("/api/cartola/mercado-status", 2000);
        if (res.ok) {
            WHState.mercadoStatus = await res.json();
        }
    } catch (e) {
        // Fallback: tentar cache do window se disponível
        if (window.mercadoStatusCache) {
            WHState.mercadoStatus = window.mercadoStatusCache;
        }
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Usando cache de mercado status");
    }
}

async function fetchAllData() {
    WHState.isLoading = true;

    const promises = [];

    // Pontos Corridos
    if (WHState.modulosAtivos.pontosCorridos) {
        promises.push(fetchPontosCorridos());
    }

    // Mata-Mata
    if (WHState.modulosAtivos.mataMata) {
        promises.push(fetchMataMata());
    }

    // Artilheiro
    if (WHState.modulosAtivos.artilheiro) {
        promises.push(fetchArtilheiro());
    }

    // Luva de Ouro
    if (WHState.modulosAtivos.luvaOuro) {
        promises.push(fetchLuvaOuro());
    }

    // Capitão de Luxo
    if (WHState.modulosAtivos.capitaoLuxo) {
        promises.push(fetchCapitao());
    }

    // Ranking da Rodada (sempre ativo)
    promises.push(fetchRanking());

    // Parciais (para confrontos em tempo real)
    if (WHState.mercadoStatus?.bola_rolando) {
        promises.push(fetchParciais());
    }

    await Promise.allSettled(promises);

    WHState.isLoading = false;
    WHState.lastUpdate = new Date();

    // Se painel está aberto, atualizar conteúdo
    if (WHState.isOpen) {
        renderContent();
    }

    // Verificar se há novidades
    checkForUpdates();
}

async function fetchPontosCorridos() {
    try {
        const rodada = WHState.mercadoStatus?.rodada_atual || 1;
        const res = await fetchWithTimeout(
            `/api/pontos-corridos/${WHState.ligaId}?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // Encontrar rodada atual
            const rodadaData = data.find((r) => r.rodada === rodada);
            WHState.data.pontosCorridos = rodadaData;

            // Encontrar MEU confronto nesta rodada
            if (rodadaData?.confrontos) {
                const meuConfronto = rodadaData.confrontos.find((c) => {
                    const id1 = String(c.time1?.id);
                    const id2 = String(c.time2?.id);
                    const meuId = String(WHState.timeId);
                    return id1 === meuId || id2 === meuId;
                });

                if (meuConfronto) {
                    // Normalizar para sempre ter "eu" como time1
                    const sou1 = String(meuConfronto.time1?.id) === String(WHState.timeId);
                    WHState.data.meuConfrontoPc = {
                        rodada,
                        eu: sou1 ? meuConfronto.time1 : meuConfronto.time2,
                        adversario: sou1 ? meuConfronto.time2 : meuConfronto.time1,
                        meusPontos: sou1 ? meuConfronto.pontos1 : meuConfronto.pontos2,
                        pontosAdv: sou1 ? meuConfronto.pontos2 : meuConfronto.pontos1,
                        tipo: meuConfronto.tipo,
                        raw: meuConfronto
                    };
                    if (window.Log) Log.info("[WHATS-HAPPENING] Meu confronto PC encontrado:", WHState.data.meuConfrontoPc);
                }
            }
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Pontos Corridos:", e);
    }
}

async function fetchParciais() {
    try {
        // Parciais é lento (~4s), usar timeout maior
        const res = await fetchWithTimeout(`/api/matchday/parciais/${WHState.ligaId}`, WH_CONFIG.API_TIMEOUT_SLOW);
        if (res.ok) {
            const data = await res.json();
            WHState.data.parciais = data;
            if (window.Log) Log.info("[WHATS-HAPPENING] Parciais:", data.ranking?.length, "times");
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Parciais:", e.name === 'AbortError' ? 'Timeout' : e);
    }
}

async function fetchMataMata() {
    try {
        // Primeiro buscar edições disponíveis
        const edicoesRes = await fetchWithTimeout(
            `/api/mata-mata/cache/${WHState.ligaId}/edicoes?temporada=${WHState.temporada}`
        );

        if (!edicoesRes.ok) return;

        const edicoesData = await edicoesRes.json();
        if (!edicoesData.edicoes || edicoesData.edicoes.length === 0) return;

        // Pegar a última edição (mais recente)
        const ultimaEdicao = edicoesData.edicoes[edicoesData.edicoes.length - 1];

        // Buscar dados da edição
        const res = await fetchWithTimeout(
            `/api/mata-mata/cache/${WHState.ligaId}/${ultimaEdicao.edicao}?temporada=${WHState.temporada}`
        );

        if (res.ok) {
            const data = await res.json();
            WHState.data.mataMata = {
                edicao: ultimaEdicao.edicao,
                confrontos: data.confrontos || [],
                faseAtual: data.fase_atual || "quartas",
                dados: data.dados
            };

            // Encontrar MEU confronto no Mata-Mata
            const meuId = String(WHState.timeId);
            const fases = ["primeira", "oitavas", "quartas", "semis", "final"]; // ✅ FIX: "semi" → "semis"

            for (const fase of fases) {
                const confrontosFase = data.dados?.[fase];
                if (!confrontosFase || !Array.isArray(confrontosFase)) continue;

                const meuConfronto = confrontosFase.find((c) => {
                    const idA = String(c.timeA?.timeId || c.timeA?.time_id);
                    const idB = String(c.timeB?.timeId || c.timeB?.time_id);
                    return idA === meuId || idB === meuId;
                });

                if (meuConfronto) {
                    const souA = String(meuConfronto.timeA?.timeId || meuConfronto.timeA?.time_id) === meuId;
                    WHState.data.meuConfrontoMm = {
                        fase,
                        edicao: ultimaEdicao.edicao,
                        jogo: meuConfronto.jogo,
                        eu: souA ? meuConfronto.timeA : meuConfronto.timeB,
                        adversario: souA ? meuConfronto.timeB : meuConfronto.timeA,
                        raw: meuConfronto
                    };
                    if (window.Log) Log.info("[WHATS-HAPPENING] Meu confronto MM encontrado:", WHState.data.meuConfrontoMm);
                    break;
                }
            }
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Mata-Mata:", e);
    }
}

async function fetchArtilheiro() {
    try {
        const res = await fetchWithTimeout(
            `/api/artilheiro-campeao/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // API retorna: { success, data: { ranking: [...] } }
            const ranking = data?.data?.ranking || data?.ranking || [];
            WHState.data.artilheiro = { ranking };
            if (window.Log) Log.info("[WHATS-HAPPENING] Artilheiro:", ranking.length, "participantes");
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Artilheiro:", e.name === 'AbortError' ? 'Timeout' : e);
    }
}

async function fetchLuvaOuro() {
    try {
        // API luva-de-ouro é MUITO lenta (~8s), usar timeout curto e aceitar falha
        const res = await fetchWithTimeout(
            `/api/luva-de-ouro/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`,
            WH_CONFIG.API_TIMEOUT_SLOW
        );
        if (res.ok) {
            const data = await res.json();
            // API retorna: { success, data: { ranking: [...] } }
            const ranking = data?.data?.ranking || data?.ranking || [];
            WHState.data.luvaOuro = { ranking };
            if (window.Log) Log.info("[WHATS-HAPPENING] Luva de Ouro:", ranking.length, "participantes");
        }
    } catch (e) {
        // Luva de Ouro é lenta, timeout é esperado
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Luva de Ouro:", e.name === 'AbortError' ? 'Timeout (API lenta)' : e);
    }
}

async function fetchCapitao() {
    try {
        const res = await fetchWithTimeout(
            `/api/capitao/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`
        );
        if (res.ok) {
            const data = await res.json();
            // API retorna: { success, ranking: [...] }
            const ranking = data?.ranking || data?.data?.ranking || [];
            WHState.data.capitao = { ranking };
            if (window.Log) Log.info("[WHATS-HAPPENING] Capitão:", ranking.length, "participantes");
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Capitão:", e.name === 'AbortError' ? 'Timeout' : e);
    }
}

async function fetchRanking() {
    try {
        const rodada = WHState.mercadoStatus?.rodada_atual || 1;

        // Tentar ranking da rodada específica primeiro
        let res = await fetchWithTimeout(
            `/api/ligas/${WHState.ligaId}/ranking/${rodada}?temporada=${WHState.temporada}`
        );

        // Se 404 (rodada não consolidada), usar ranking geral
        if (res.status === 404) {
            if (window.Log) Log.info(`[WHATS-HAPPENING] 📊 Rodada ${rodada} não consolidada, usando ranking geral`);
            res = await fetchWithTimeout(
                `/api/ligas/${WHState.ligaId}/ranking?temporada=${WHState.temporada}`
            );
        }

        if (res.ok) {
            const data = await res.json();
            // Normalizar formato (API geral retorna array direto)
            const ranking = Array.isArray(data) ? data : (data.ranking || data.data || []);
            WHState.data.ranking = { ranking };
            if (window.Log) Log.info("[WHATS-HAPPENING] 📊 Ranking:", ranking.length, "participantes");
        }
    } catch (e) {
        if (window.Log) Log.warn("[WHATS-HAPPENING] ⚠️ Erro Ranking:", e.name === 'AbortError' ? 'Timeout' : e);
    }
}

// ============================================
// POLLING (ATUALIZAÇÃO AUTOMÁTICA)
// ============================================
function startPolling() {
    if (WHState.pollingInterval) return;

    if (window.Log) Log.info("[WHATS-HAPPENING] 🔄 Iniciando polling (60s)...");

    WHState.pollingInterval = setInterval(async () => {
        // Verificar se ainda está rolando
        await fetchMercadoStatus();

        if (!WHState.mercadoStatus?.bola_rolando) {
            stopPolling();
            return;
        }

        await fetchAllData();
    }, WH_CONFIG.POLLING_INTERVAL);
}

function stopPolling() {
    if (WHState.pollingInterval) {
        clearInterval(WHState.pollingInterval);
        WHState.pollingInterval = null;
        if (window.Log) Log.info("[WHATS-HAPPENING] ⏹️ Polling parado");
    }
}

// ============================================
// VERIFICAR NOVIDADES
// ============================================
function checkForUpdates() {
    // Lógica simples: se há disputas "quentes", mostrar badge
    const hasHotDisputes =
        hasHotPontosCorridos() ||
        hasHotMataMata() ||
        hasHotArtilheiro();

    if (hasHotDisputes && !WHState.isOpen) {
        WHState.hasUpdates = true;
        updateFabBadge();
    }
}

function hasHotPontosCorridos() {
    const data = WHState.data.pontosCorridos;
    if (!data?.confrontos) return false;

    return data.confrontos.some((c) => {
        const diff = Math.abs((c.pontosA || 0) - (c.pontosB || 0));
        return diff < WH_CONFIG.MIN_DIFF_HOT;
    });
}

function hasHotMataMata() {
    const data = WHState.data.mataMata;
    if (!data?.confrontos) return false;

    return data.confrontos.some((c) => {
        const diff = Math.abs((c.timeA?.pontos || 0) - (c.timeB?.pontos || 0));
        return diff < WH_CONFIG.MIN_DIFF_HOT;
    });
}

function hasHotArtilheiro() {
    const data = WHState.data.artilheiro;
    if (!data?.ranking || data.ranking.length < 2) return false;

    const diff = (data.ranking[0]?.gols || 0) - (data.ranking[1]?.gols || 0);
    return diff <= 1;
}

function updateFabBadge() {
    const fab = document.getElementById("wh-fab");
    if (!fab) return;

    // Remover badge existente
    const existingBadge = fab.querySelector(".wh-fab-badge");
    if (existingBadge) existingBadge.remove();

    // Adicionar classe de pulsação e badge se há updates
    if (WHState.hasUpdates) {
        fab.classList.add("has-updates");
        const badge = document.createElement("span");
        badge.className = "wh-fab-badge";
        badge.textContent = "!";
        fab.appendChild(badge);
    } else {
        fab.classList.remove("has-updates");
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function renderContent() {
    const content = document.getElementById("wh-content");
    if (!content) return;

    if (WHState.isLoading) {
        content.innerHTML = `
            <div class="wh-loading">
                <div class="wh-loading-spinner"></div>
                <div class="wh-loading-text">Buscando disputas...</div>
            </div>
        `;
        return;
    }

    const sections = [];

    // Timestamp
    sections.push(renderTimestamp());

    // ========== MEUS CONFRONTOS (DESTAQUE PRINCIPAL) ==========
    // Meu Confronto no Pontos Corridos
    if (WHState.modulosAtivos.pontosCorridos && WHState.data.meuConfrontoPc) {
        const meuPcSection = renderMeuConfrontoPontosCorridos();
        if (meuPcSection) sections.push(meuPcSection);
    }

    // Meu Confronto no Mata-Mata
    if (WHState.modulosAtivos.mataMata && WHState.data.meuConfrontoMm) {
        const meuMmSection = renderMeuConfrontoMataMata();
        if (meuMmSection) sections.push(meuMmSection);
    }

    // ========== OUTROS MÓDULOS ==========
    // Ranking da Rodada
    const rankingSection = renderRankingSection();
    if (rankingSection) sections.push(rankingSection);

    // Pontos Corridos (outros confrontos quentes)
    if (WHState.modulosAtivos.pontosCorridos) {
        const pcSection = renderPontosCorridosSection();
        if (pcSection) sections.push(pcSection);
    }

    // Mata-Mata (outros confrontos)
    if (WHState.modulosAtivos.mataMata) {
        const mmSection = renderMataMataSection();
        if (mmSection) sections.push(mmSection);
    }

    // Artilheiro
    if (WHState.modulosAtivos.artilheiro) {
        const artSection = renderArtilheiroSection();
        if (artSection) sections.push(artSection);
    }

    // Luva de Ouro
    if (WHState.modulosAtivos.luvaOuro) {
        const luvaSection = renderLuvaOuroSection();
        if (luvaSection) sections.push(luvaSection);
    }

    // Capitão de Luxo
    if (WHState.modulosAtivos.capitaoLuxo) {
        const capSection = renderCapitaoSection();
        if (capSection) sections.push(capSection);
    }

    // Se não há nada
    if (sections.length <= 1) {
        content.innerHTML = `
            <div class="wh-empty">
                <span class="material-icons wh-empty-icon">sports_soccer</span>
                <div class="wh-empty-title">Nenhuma disputa ativa</div>
                <div class="wh-empty-desc">Aguardando início da rodada</div>
            </div>
        `;
        return;
    }

    content.innerHTML = sections.join("");
}

function renderTimestamp() {
    const now = WHState.lastUpdate || new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const isLive = WHState.mercadoStatus?.bola_rolando;

    return `
        <div class="wh-timestamp">
            <span class="material-icons">${isLive ? "sensors" : "schedule"}</span>
            ${isLive ? "Ao vivo" : "Atualizado"} às ${time}
            ${isLive ? '<span style="color: var(--app-danger);">●</span>' : ""}
        </div>
    `;
}

function renderRankingSection() {
    const data = WHState.data.ranking;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const ranking = data.ranking;
    const meuTime = ranking.find((r) => String(r.timeId) === String(WHState.timeId));
    const minhaPosicao = meuTime ? ranking.indexOf(meuTime) + 1 : null;

    // Top 3
    const top3 = ranking.slice(0, 3);

    // Montar HTML
    // API retorna: pontos_totais (ranking geral) ou pontos (ranking por rodada)
    let items = top3.map((r, i) => {
        const posClass = i === 0 ? "gold" : i === 1 ? "silver" : "bronze";
        const isMe = String(r.timeId) === String(WHState.timeId);
        const pontos = r.pontos_totais || r.pontos || 0;
        return `
            <div class="wh-ranking-item ${posClass} ${isMe ? "me" : ""}">
                <div class="wh-ranking-pos">${i + 1}</div>
                <div class="wh-ranking-nome">${r.nome_time || r.nomeTime}</div>
                <div class="wh-ranking-valor">${pontos.toFixed(1)}</div>
            </div>
        `;
    }).join("");

    // Se eu não estou no top 3, mostrar minha posição
    if (minhaPosicao && minhaPosicao > 3) {
        const meusPontos = meuTime.pontos_totais || meuTime.pontos || 0;
        items += `
            <div class="wh-ranking-separator">···</div>
            <div class="wh-ranking-item me">
                <div class="wh-ranking-pos">${minhaPosicao}º</div>
                <div class="wh-ranking-nome">${meuTime.nome_time || meuTime.nomeTime}</div>
                <div class="wh-ranking-valor">${meusPontos.toFixed(1)}</div>
            </div>
        `;
    }

    return `
        <div class="wh-section wh-section--ranking">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">leaderboard</span>
                </div>
                <div class="wh-section-title">Ranking Rodada ${WHState.mercadoStatus?.rodada_atual || "?"}</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-ranking-mini">
                    ${items}
                </div>
            </div>
        </div>
    `;
}

function renderPontosCorridosSection() {
    const data = WHState.data.pontosCorridos;
    if (!data?.confrontos || data.confrontos.length === 0) return null;

    // Filtrar confrontos que envolvem meu time ou são "quentes"
    const myConfrontos = data.confrontos.filter((c) => {
        const isMyGame =
            String(c.timeAId) === String(WHState.timeId) ||
            String(c.timeBId) === String(WHState.timeId);
        const diff = Math.abs((c.pontosA || 0) - (c.pontosB || 0));
        const isHot = diff < WH_CONFIG.MIN_DIFF_HOT;
        return isMyGame || isHot;
    });

    if (myConfrontos.length === 0) return null;

    const confrontosHtml = myConfrontos.slice(0, 3).map((c) => {
        const diff = Math.abs((c.pontosA || 0) - (c.pontosB || 0));
        const isHot = diff < WH_CONFIG.MIN_DIFF_HOT;
        const isMyGame =
            String(c.timeAId) === String(WHState.timeId) ||
            String(c.timeBId) === String(WHState.timeId);

        const aWinning = (c.pontosA || 0) > (c.pontosB || 0);
        const bWinning = (c.pontosB || 0) > (c.pontosA || 0);

        let insight = "";
        if (isHot) {
            insight = `
                <div class="wh-confronto-insight">
                    <span class="material-icons">whatshot</span>
                    Disputa acirrada! Apenas ${diff.toFixed(1)} pts de diferença
                </div>
            `;
        }

        return `
            <div class="wh-confronto ${isHot ? "hot" : ""}">
                <div class="wh-confronto-header">
                    <span class="wh-confronto-rodada">Rodada ${data.rodada}</span>
                    ${isHot ? '<span class="wh-confronto-status tight"><span class="material-icons" style="font-size:12px">local_fire_department</span> Quente!</span>' : ""}
                </div>
                <div class="wh-confronto-times">
                    <div class="wh-time wh-time--home ${aWinning ? "winning" : bWinning ? "losing" : ""}">
                        <img class="wh-time-escudo" src="${c.escudoA || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.nomeTimeA || "Time A"}</div>
                        </div>
                        <div class="wh-time-pontos">${(c.pontosA || 0).toFixed(1)}</div>
                    </div>
                    <div class="wh-vs">
                        <span class="wh-vs-text">VS</span>
                    </div>
                    <div class="wh-time wh-time--away ${bWinning ? "winning" : aWinning ? "losing" : ""}">
                        <div class="wh-time-pontos">${(c.pontosB || 0).toFixed(1)}</div>
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.nomeTimeB || "Time B"}</div>
                        </div>
                        <img class="wh-time-escudo" src="${c.escudoB || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                    </div>
                </div>
                ${insight}
            </div>
        `;
    }).join("");

    return `
        <div class="wh-section wh-section--pontos-corridos">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">swap_horiz</span>
                </div>
                <div class="wh-section-title">Pontos Corridos</div>
            </div>
            <div class="wh-section-body">
                ${confrontosHtml}
            </div>
        </div>
    `;
}

function renderMataMataSection() {
    const data = WHState.data.mataMata;
    if (!data?.confrontos || data.confrontos.length === 0) return null;

    // Filtrar confrontos que envolvem meu time
    const myConfrontos = data.confrontos.filter((c) => {
        const timeAId = c.timeA?.time_id || c.timeA?.timeId;
        const timeBId = c.timeB?.time_id || c.timeB?.timeId;
        return (
            String(timeAId) === String(WHState.timeId) ||
            String(timeBId) === String(WHState.timeId)
        );
    });

    if (myConfrontos.length === 0) return null;

    const confrontosHtml = myConfrontos.map((c) => {
        const pontosA = parseFloat(c.timeA?.pontos) || 0;
        const pontosB = parseFloat(c.timeB?.pontos) || 0;
        const diff = Math.abs(pontosA - pontosB);
        const aWinning = pontosA > pontosB;
        const bWinning = pontosB > pontosA;

        const fase = c.fase || "Fase";

        return `
            <div class="wh-confronto ${diff < 15 ? "hot" : ""}">
                <div class="wh-confronto-header">
                    <span class="wh-confronto-rodada">${data.edicao || "Mata-Mata"} - ${fase}</span>
                    ${WHState.mercadoStatus?.bola_rolando ? '<span class="wh-confronto-status live"><span class="material-icons" style="font-size:12px">sensors</span> AO VIVO</span>' : ""}
                </div>
                <div class="wh-confronto-times">
                    <div class="wh-time wh-time--home ${aWinning ? "winning" : bWinning ? "losing" : ""}">
                        <img class="wh-time-escudo" src="${c.timeA?.url_escudo_png || c.timeA?.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.timeA?.nome_time || "Time A"}</div>
                        </div>
                        <div class="wh-time-pontos">${pontosA.toFixed(1)}</div>
                    </div>
                    <div class="wh-vs">
                        <span class="wh-vs-text">VS</span>
                        <span class="wh-vs-diff">${diff.toFixed(1)}</span>
                    </div>
                    <div class="wh-time wh-time--away ${bWinning ? "winning" : aWinning ? "losing" : ""}">
                        <div class="wh-time-pontos">${pontosB.toFixed(1)}</div>
                        <div class="wh-time-info">
                            <div class="wh-time-nome">${c.timeB?.nome_time || "Time B"}</div>
                        </div>
                        <img class="wh-time-escudo" src="${c.timeB?.url_escudo_png || c.timeB?.escudo || "/escudos/default.png"}" onerror="this.src='/escudos/default.png'" alt="">
                    </div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="wh-section wh-section--mata-mata">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">emoji_events</span>
                </div>
                <div class="wh-section-title">Mata-Mata</div>
            </div>
            <div class="wh-section-body">
                ${confrontosHtml}
            </div>
        </div>
    `;
}

function renderArtilheiroSection() {
    const data = WHState.data.artilheiro;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const top = data.ranking[0];
    if (!top) return null;

    // API retorna: golsPro, nome, nomeTime, escudo (pode ser null)
    const gols = top.golsPro || top.gols || 0;
    const nome = top.nome || top.nome_cartola || top.nomeCartola || "Líder";
    const escudo = top.escudo || `/escudos/${top.clubeId || "default"}.png`;
    const rodadas = top.rodadasProcessadas || top.rodadas || "?";

    const segundo = data.ranking[1];
    const golsSegundo = segundo ? (segundo.golsPro || segundo.gols || 0) : 0;
    const diff = gols - golsSegundo;

    const disputaAcirrada =
        diff <= 1 && segundo
            ? `
        <div class="wh-disputa-acirrada">
            <span class="material-icons">warning</span>
            Disputa acirrada! ${segundo.nome || segundo.nome_cartola || "2º lugar"} está a apenas ${diff} gol(s)
        </div>
    `
            : "";

    return `
        <div class="wh-section wh-section--artilheiro">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">sports_soccer</span>
                </div>
                <div class="wh-section-title">Artilheiro Campeão</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-leader-card">
                    <div class="wh-leader-avatar">
                        <img class="wh-leader-escudo" src="${escudo}" onerror="this.src='/escudos/default.png'" alt="">
                        <span class="wh-leader-crown">👑</span>
                    </div>
                    <div class="wh-leader-info">
                        <div class="wh-leader-nome">${nome}</div>
                        <div class="wh-leader-stat">
                            <span class="material-icons">sports_soccer</span>
                            ${gols} gol(s) em ${rodadas} rodadas
                        </div>
                    </div>
                    <div class="wh-leader-value">${gols}</div>
                </div>
                ${disputaAcirrada}
            </div>
        </div>
    `;
}

function renderLuvaOuroSection() {
    const data = WHState.data.luvaOuro;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const top = data.ranking[0];
    if (!top) return null;

    // API retorna: participanteNome, pontosTotais, clubeId, rodadasJogadas, ultimaRodada
    const nome = top.participanteNome || top.nome_cartola || top.nomeCartola || "Líder";
    const pontos = top.pontosTotais || top.pontos || 0;
    const escudo = top.escudo || `/escudos/${top.clubeId || "default"}.png`;
    const rodadas = top.rodadasJogadas || top.rodadas?.length || "?";
    const ultimoGoleiro = top.ultimaRodada?.goleiroNome || "";

    return `
        <div class="wh-section wh-section--luva-ouro">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">sports_handball</span>
                </div>
                <div class="wh-section-title">Luva de Ouro</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-leader-card">
                    <div class="wh-leader-avatar">
                        <img class="wh-leader-escudo" src="${escudo}" onerror="this.src='/escudos/default.png'" alt="">
                        <span class="wh-leader-crown">🧤</span>
                    </div>
                    <div class="wh-leader-info">
                        <div class="wh-leader-nome">${nome}</div>
                        <div class="wh-leader-stat">
                            <span class="material-icons">shield</span>
                            ${pontos.toFixed(1)} pts em ${rodadas} rodadas
                            ${ultimoGoleiro ? `<br><small>Último: ${ultimoGoleiro}</small>` : ""}
                        </div>
                    </div>
                    <div class="wh-leader-value">${pontos.toFixed(1)}</div>
                </div>
            </div>
        </div>
    `;
}

function renderCapitaoSection() {
    const data = WHState.data.capitao;
    if (!data?.ranking || !Array.isArray(data.ranking) || data.ranking.length === 0) return null;

    const top = data.ranking[0];
    if (!top) return null;

    // API retorna: nome_cartola, media_capitao, pontuacao_total, escudo, melhor_capitao
    const nome = top.nome_cartola || top.nomeCartola || "Líder";
    const media = top.media_capitao || top.media || 0;
    const total = top.pontuacao_total || top.total || 0;
    const escudo = top.escudo || `/escudos/${top.clube_id || "default"}.png`;
    const melhorCapitao = top.melhor_capitao?.atleta_nome || "";

    return `
        <div class="wh-section wh-section--capitao">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">military_tech</span>
                </div>
                <div class="wh-section-title">Capitão de Luxo</div>
            </div>
            <div class="wh-section-body">
                <div class="wh-leader-card">
                    <div class="wh-leader-avatar">
                        <img class="wh-leader-escudo" src="${escudo}" onerror="this.src='/escudos/default.png'" alt="">
                        <span class="wh-leader-crown">🎖️</span>
                    </div>
                    <div class="wh-leader-info">
                        <div class="wh-leader-nome">${nome}</div>
                        <div class="wh-leader-stat">
                            <span class="material-icons">trending_up</span>
                            Média: ${media.toFixed(1)} pts
                            ${melhorCapitao ? `<br><small>Melhor: ${melhorCapitao}</small>` : ""}
                        </div>
                    </div>
                    <div class="wh-leader-value">${total.toFixed(0)}</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MEU CONFRONTO - PONTOS CORRIDOS
// ============================================
function renderMeuConfrontoPontosCorridos() {
    const confronto = WHState.data.meuConfrontoPc;
    if (!confronto) return null;

    const { eu, adversario, rodada } = confronto;

    // Buscar pontuação atual das parciais (se disponível)
    const parciais = WHState.data.parciais?.ranking || [];
    const minhaParcial = parciais.find((p) => String(p.timeId) === String(WHState.timeId));
    const advParcial = parciais.find((p) => String(p.timeId) === String(adversario.id));

    const meusPontos = minhaParcial?.pontos_rodada_atual || eu?.pontos || 0;
    const pontosAdv = advParcial?.pontos_rodada_atual || adversario?.pontos || 0;
    const diff = meusPontos - pontosAdv;

    const vencendo = diff > 0;
    const perdendo = diff < 0;
    const empatado = diff === 0;

    const statusClass = vencendo ? "winning" : perdendo ? "losing" : "tied";
    const statusEmoji = vencendo ? "🔥" : perdendo ? "😰" : "⚔️";
    const statusText = vencendo ? "Vencendo!" : perdendo ? "Perdendo..." : "Empatado";

    const isLive = WHState.mercadoStatus?.bola_rolando;

    return `
        <div class="wh-section wh-section--meu-confronto wh-section--pontos-corridos ${statusClass}">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">stadium</span>
                </div>
                <div class="wh-section-title">Seu Confronto - Rodada ${rodada}</div>
                ${isLive ? '<span class="wh-live-badge">🔴 AO VIVO</span>' : ''}
            </div>
            <div class="wh-section-body">
                <div class="wh-meu-confronto">
                    <div class="wh-mc-times">
                        <div class="wh-mc-time wh-mc-time--eu ${vencendo ? 'winning' : ''}">
                            <img class="wh-mc-escudo" src="${eu?.escudo || '/escudos/default.png'}" onerror="this.src='/escudos/default.png'" alt="">
                            <div class="wh-mc-info">
                                <div class="wh-mc-label">VOCÊ</div>
                                <div class="wh-mc-nome">${eu?.nome || 'Meu Time'}</div>
                            </div>
                            <div class="wh-mc-pontos ${vencendo ? 'winning' : ''}">${meusPontos.toFixed(1)}</div>
                        </div>

                        <div class="wh-mc-vs">
                            <span class="wh-mc-vs-emoji">${statusEmoji}</span>
                            <span class="wh-mc-vs-diff ${statusClass}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}</span>
                        </div>

                        <div class="wh-mc-time wh-mc-time--adv ${perdendo ? 'winning' : ''}">
                            <img class="wh-mc-escudo" src="${adversario?.escudo || '/escudos/default.png'}" onerror="this.src='/escudos/default.png'" alt="">
                            <div class="wh-mc-info">
                                <div class="wh-mc-label">ADVERSÁRIO</div>
                                <div class="wh-mc-nome">${adversario?.nome || adversario?.nome_cartola || 'Rival'}</div>
                            </div>
                            <div class="wh-mc-pontos ${perdendo ? 'winning' : ''}">${pontosAdv.toFixed(1)}</div>
                        </div>
                    </div>

                    <div class="wh-mc-status ${statusClass}">
                        <span class="material-icons">${vencendo ? 'trending_up' : perdendo ? 'trending_down' : 'trending_flat'}</span>
                        ${statusText} por ${Math.abs(diff).toFixed(1)} pts
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MEU CONFRONTO - MATA-MATA
// ============================================
function renderMeuConfrontoMataMata() {
    const confronto = WHState.data.meuConfrontoMm;
    if (!confronto) return null;

    const { eu, adversario, fase, edicao } = confronto;

    // Buscar pontuação atual das parciais (se disponível)
    const parciais = WHState.data.parciais?.ranking || [];
    const minhaParcial = parciais.find((p) => String(p.timeId) === String(WHState.timeId));
    const advParcial = parciais.find((p) => String(p.timeId) === String(adversario?.timeId || adversario?.time_id));

    const meusPontos = minhaParcial?.pontos_rodada_atual || eu?.pontos || 0;
    const pontosAdv = advParcial?.pontos_rodada_atual || adversario?.pontos || 0;
    const diff = meusPontos - pontosAdv;

    const vencendo = diff > 0;
    const perdendo = diff < 0;

    const statusClass = vencendo ? "winning" : perdendo ? "losing" : "tied";
    const statusEmoji = vencendo ? "🏆" : perdendo ? "⚠️" : "⚔️";

    const faseLabel = {
        primeira: "1ª Fase",
        oitavas: "Oitavas",
        quartas: "Quartas",
        semis: "Semifinal", // ✅ FIX: "semi" → "semis"
        final: "FINAL"
    }[fase] || fase;

    const isLive = WHState.mercadoStatus?.bola_rolando;

    return `
        <div class="wh-section wh-section--meu-confronto wh-section--mata-mata ${statusClass}">
            <div class="wh-section-header">
                <div class="wh-section-icon">
                    <span class="material-icons">emoji_events</span>
                </div>
                <div class="wh-section-title">Mata-Mata - ${faseLabel}</div>
                ${isLive ? '<span class="wh-live-badge">🔴 AO VIVO</span>' : ''}
            </div>
            <div class="wh-section-body">
                <div class="wh-meu-confronto">
                    <div class="wh-mc-times">
                        <div class="wh-mc-time wh-mc-time--eu ${vencendo ? 'winning' : ''}">
                            <img class="wh-mc-escudo" src="${eu?.url_escudo_png || '/escudos/default.png'}" onerror="this.src='/escudos/default.png'" alt="">
                            <div class="wh-mc-info">
                                <div class="wh-mc-label">VOCÊ</div>
                                <div class="wh-mc-nome">${eu?.nome_time || eu?.nome_cartola || 'Meu Time'}</div>
                            </div>
                            <div class="wh-mc-pontos ${vencendo ? 'winning' : ''}">${meusPontos.toFixed(1)}</div>
                        </div>

                        <div class="wh-mc-vs">
                            <span class="wh-mc-vs-emoji">${statusEmoji}</span>
                            <span class="wh-mc-vs-diff ${statusClass}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}</span>
                        </div>

                        <div class="wh-mc-time wh-mc-time--adv ${perdendo ? 'winning' : ''}">
                            <img class="wh-mc-escudo" src="${adversario?.url_escudo_png || '/escudos/default.png'}" onerror="this.src='/escudos/default.png'" alt="">
                            <div class="wh-mc-info">
                                <div class="wh-mc-label">ADVERSÁRIO</div>
                                <div class="wh-mc-nome">${adversario?.nome_time || adversario?.nome_cartola || 'Rival'}</div>
                            </div>
                            <div class="wh-mc-pontos ${perdendo ? 'winning' : ''}">${pontosAdv.toFixed(1)}</div>
                        </div>
                    </div>

                    <div class="wh-mc-status ${statusClass}">
                        <span class="material-icons">${vencendo ? 'thumb_up' : perdendo ? 'thumb_down' : 'compare_arrows'}</span>
                        ${vencendo ? 'Avançando!' : perdendo ? 'Em risco de eliminação' : 'Confronto equilibrado'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// DESTRUIR WIDGET
// ============================================
export function destroyWhatsHappeningWidget() {
    stopPolling();

    const fab = document.getElementById("wh-fab");
    const panel = document.getElementById("wh-panel");
    const backdrop = document.getElementById("wh-backdrop");

    if (fab) fab.remove();
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();

    if (window.Log) Log.info("[WHATS-HAPPENING] 🗑️ Widget destruído");
}

// ============================================
// EXPOR GLOBALMENTE (para debug)
// ============================================
if (typeof window !== "undefined") {
    window.WhatsHappeningWidget = {
        init: initWhatsHappeningWidget,
        destroy: destroyWhatsHappeningWidget,
        open: openPanel,
        close: closePanel,
        refresh: fetchAllData,
        state: WHState,
    };
}

if (window.Log) Log.info("[WHATS-HAPPENING] ✅ Widget v1.0 carregado");
