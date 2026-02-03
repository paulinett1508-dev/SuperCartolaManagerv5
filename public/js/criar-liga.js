/**
 * CRIAR LIGA - Refatoração Simplificada
 * Extrai o JavaScript inline sem complexidade desnecessária
 */

// Variáveis globais (mantidas para compatibilidade)
let timesSelecionados = [];

// === CARREGAR LAYOUT ===
async function loadLayout() {
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
                newScript.textContent = `(function(){${script.textContent}})();`;
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

// === BUSCAR TIME ===
async function buscarTime() {
    const input = document.getElementById("searchInput");
    const timeId = input?.value?.trim();
    const searchBtn = document.getElementById("searchBtn");
    const loadingDiv = document.getElementById("loadingSearch");
    const resultDiv = document.getElementById("searchResult");

    if (!timeId) {
        showAlert("Digite um ID válido", "error");
        return;
    }

    if (!/^\d+$/.test(timeId)) {
        showAlert("ID deve conter apenas números", "error");
        return;
    }

    try {
        if (searchBtn) searchBtn.disabled = true;
        if (loadingDiv) loadingDiv.classList.add("active");
        if (resultDiv) resultDiv.classList.remove("active");

        const response = await fetch(`/api/times/${timeId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Time não encontrado");
        }

        // Exibir resultado
        const isAdded = timesSelecionados.some((t) => t.id == timeId);
        const escudo = data.url_escudo_png || "/escudos/default.png";
        const nomeTime = data.nome_time || "Time sem nome";
        const nomeCartoleiro = data.nome_cartoleiro || "Cartoleiro";

        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="result-item">
                    <div class="result-info">
                        <img src="${escudo}"
                             class="result-escudo"
                             onerror="this.src='/escudos/default.png'"
                             alt="Escudo do time">
                        <div class="result-details">
                            <div class="result-nome">${nomeTime}</div>
                            <div class="result-cartoleiro">${nomeCartoleiro}</div>
                            <div class="result-id">ID: ${timeId}</div>
                        </div>
                    </div>
                    <button class="btn-add" ${isAdded ? "disabled" : ""}
                            onclick="adicionarTime('${timeId}', '${nomeTime}', '${nomeCartoleiro}', '${escudo}')">
                        <span class="material-icons">${isAdded ? "check" : "add"}</span>
                        ${isAdded ? "Adicionado" : "Adicionar"}
                    </button>
                </div>
            `;
            resultDiv.classList.add("active");
        }

        input.value = "";
    } catch (error) {
        showAlert(`Erro: ${error.message}`, "error");
    } finally {
        if (searchBtn) searchBtn.disabled = false;
        if (loadingDiv) loadingDiv.classList.remove("active");
    }
}

// === ADICIONAR TIME ===
function adicionarTime(id, nome, cartoleiro, escudo) {
    if (timesSelecionados.some((t) => t.id == id)) {
        showAlert("Time já foi adicionado!", "error");
        return;
    }

    timesSelecionados.push({
        id: parseInt(id),
        nome: nome || "Time sem nome",
        cartoleiro: cartoleiro || "Cartoleiro",
        escudo: escudo || "/escudos/default.png",
    });

    atualizarListaTimes();
    showAlert("Time adicionado com sucesso!", "success");

    // Atualizar botão no resultado
    const btnAdd = document.querySelector(".btn-add");
    if (btnAdd) {
        btnAdd.disabled = true;
        btnAdd.innerHTML = '<span class="material-icons">check</span>Adicionado';
    }
}

// ✅ Expor função no escopo global para onclick no HTML
window.adicionarTime = adicionarTime;

// === REMOVER TIME ===
function removerTime(id) {
    timesSelecionados = timesSelecionados.filter((t) => t.id != id);
    atualizarListaTimes();
    showAlert("Time removido!", "success");
}

// ✅ Expor função no escopo global para onclick no HTML
window.removerTime = removerTime;

// === ATUALIZAR LISTA ===
function atualizarListaTimes() {
    const lista = document.getElementById("timesList");
    const emptyState = document.getElementById("emptyState");
    const count = document.getElementById("timesCount");
    const btnProxima = document.getElementById("btnProxima");

    if (count) count.textContent = `${timesSelecionados.length} times`;
    // Botão sempre habilitado - liga pode ser criada vazia
    if (btnProxima) btnProxima.disabled = false;

    if (timesSelecionados.length === 0) {
        if (lista) lista.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (lista) lista.style.display = "block";
    if (emptyState) emptyState.style.display = "none";

    if (lista) {
        lista.innerHTML = timesSelecionados
            .map(
                (time) => `
                <li class="time-item">
                    <div class="time-info">
                        <img src="${time.escudo}" class="time-escudo"
                             onerror="this.src='/escudos/default.png'"
                             alt="Escudo do time">
                        <div class="time-details">
                            <div class="time-nome">${time.nome}</div>
                            <div class="time-cartoleiro">${time.cartoleiro}</div>
                        </div>
                    </div>
                    <button onclick="removerTime(${time.id})" class="btn-remove">
                        <span class="material-icons">close</span>
                        Remover
                    </button>
                </li>
            `,
            )
            .join("");
    }
}

// === NAVEGAÇÃO ENTRE ETAPAS ===
function proximaEtapa() {
    // Liga pode ser criada sem participantes (serão adicionados depois)

    // Mudar para etapa 2
    const etapa1 = document.getElementById("etapa1");
    const etapa2 = document.getElementById("etapa2");
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");

    if (etapa1) etapa1.classList.remove("active");
    if (etapa2) etapa2.classList.add("active");
    if (step1) step1.classList.remove("active");
    if (step2) step2.classList.add("active");

    // Atualizar resumo
    atualizarResumo();
}

function voltarEtapa() {
    const etapa1 = document.getElementById("etapa1");
    const etapa2 = document.getElementById("etapa2");
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");

    if (etapa2) etapa2.classList.remove("active");
    if (etapa1) etapa1.classList.add("active");
    if (step2) step2.classList.remove("active");
    if (step1) step1.classList.add("active");
}

function atualizarResumo() {
    const lista = document.getElementById("resumoList");
    const count = document.getElementById("resumoCount");

    if (count) count.textContent = `${timesSelecionados.length} times`;

    if (lista) {
        lista.innerHTML = timesSelecionados
            .map(
                (time) => `
                <li class="time-item">
                    <div class="time-info">
                        <img src="${time.escudo}" class="time-escudo" 
                             onerror="this.src='/escudos/default.png'"
                             alt="Escudo do time">
                        <div class="time-details">
                            <div class="time-nome">${time.nome}</div>
                            <div class="time-cartoleiro">${time.cartoleiro}</div>
                        </div>
                    </div>
                </li>
            `,
            )
            .join("");
    }
}

// === SALVAR LIGA ===
async function salvarLiga() {
    const nomeLiga = document.getElementById("nomeLiga")?.value?.trim();
    const salvarBtn = document.getElementById("salvarBtn");
    const loadingDiv = document.getElementById("loadingSave");

    if (!nomeLiga) {
        showAlert("Digite o nome da liga!", "error");
        return;
    }

    // Liga pode ser criada sem participantes (serão adicionados depois via Fluxo Financeiro)

    try {
        if (salvarBtn) salvarBtn.disabled = true;
        if (loadingDiv) loadingDiv.classList.add("active");

        const response = await fetch("/api/ligas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // Incluir cookies de sessão
            body: JSON.stringify({
                nome: nomeLiga,
                times: timesSelecionados.map((t) => t.id),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || data.error || `Erro ${response.status}`);
        }

        showAlert("Liga criada com sucesso!", "success");

        // Invalidar cache de ligas no sidebar
        if (window.CacheManager) {
            window.CacheManager.invalidate(window.CacheManager.KEYS.LIGAS);
        }
        if (typeof window.refreshLigasSidebar === 'function') {
            window.refreshLigasSidebar();
        }

        setTimeout(() => {
            window.location.href = `detalhe-liga.html?id=${data._id || data.id}`;
        }, 1500);
    } catch (error) {
        showAlert(`Erro: ${error.message}`, "error");
        if (salvarBtn) salvarBtn.disabled = false;
    } finally {
        if (loadingDiv) loadingDiv.classList.remove("active");
    }
}

// === MOSTRAR ALERTAS ===
function showAlert(message, type) {
    const alert = document.getElementById("alertMessage");
    if (!alert) return;

    const icon = type === "success" ? "check_circle" : "error";
    alert.className = `alert alert-${type} active`;
    alert.innerHTML = `<span class="material-icons">${icon}</span>${message}`;

    setTimeout(() => {
        alert.classList.remove("active");
    }, 3000);
}

// === EVENT LISTENERS ===
document.addEventListener("keypress", (e) => {
    if (e.target.id === "searchInput" && e.key === "Enter") {
        buscarTime();
    }
});

// Botões de navegação
document.addEventListener("click", (e) => {
    if (e.target.id === "searchBtn") buscarTime();
    if (e.target.id === "btnProxima") proximaEtapa();
    if (e.target.id === "voltarBtn") voltarEtapa();
    if (e.target.id === "salvarBtn") salvarLiga();
    if (e.target.id === "cancelarBtn")
        window.location.href = "gerenciar.html";
});

// Validação de input (apenas números)
document.addEventListener("input", (e) => {
    if (e.target.id === "searchInput") {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
    }
});

// === INICIALIZAÇÃO ===
async function initCriarLiga() {
    console.log("[CRIAR-LIGA] Inicializando página...");
    await loadLayout();
    atualizarListaTimes();
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!window.location.pathname.includes('criar-liga.html')) return;
    await initCriarLiga();
});

// ✅ FIX: Reinicializar após navegação SPA
window.addEventListener('spa:navigated', async (e) => {
    const { pageName } = e.detail || {};
    if (pageName === 'criar-liga.html') {
        console.log('[CRIAR-LIGA] Reinicializando após navegação SPA...');
        await initCriarLiga();
    }
});

// ✅ FIX: Inicializar se DOM já pronto (navegação SPA)
if (document.readyState !== 'loading' && window.location.pathname.includes('criar-liga.html')) {
    initCriarLiga();
}
