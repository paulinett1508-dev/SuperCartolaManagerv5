/**
 * CADASTRO DE PARTICIPANTES - Logica JS
 * Pool global de participantes com vinculacao a multiplas ligas
 *
 * @version 1.0.0
 * @since 2026-01-15
 */

// Estado global
let searchType = 'nome';
let participanteBuscado = null;
let ligasDisponiveis = [];
let participantesCadastrados = [];
let filtroAtual = 'todos';

// ============================================================================
// INICIALIZACAO
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadLayout();
    initEventListeners();
    await carregarLigas();
    await carregarParticipantes();
});

async function loadLayout() {
    try {
        const response = await fetch('layout.html');
        const layoutHtml = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(layoutHtml, 'text/html');

        const sidebar = doc.querySelector('.app-sidebar');
        const toggleBtn = doc.querySelector('.sidebar-toggle-btn');
        const placeholder = document.getElementById('sidebar-placeholder');

        if (sidebar && placeholder) {
            const fragment = document.createDocumentFragment();
            if (toggleBtn) fragment.appendChild(toggleBtn);
            fragment.appendChild(sidebar);
            placeholder.replaceWith(fragment);
        }

        // Executar scripts do layout
        const scripts = doc.querySelectorAll('script');
        scripts.forEach((script) => {
            if (script.textContent.trim()) {
                const newScript = document.createElement('script');
                newScript.textContent = script.textContent;
                document.head.appendChild(newScript);
            }
        });

        // Garantir inicializacao do AccordionManager
        setTimeout(() => {
            if (window.AccordionManager && !window.AccordionManager._initialized) {
                window.AccordionManager.init();
            }
            if (typeof window.verificarMenuSuperAdmin === 'function') {
                window.verificarMenuSuperAdmin();
            }
        }, 150);
    } catch (error) {
        console.error('Erro ao carregar layout:', error);
    }
}

function initEventListeners() {
    // Toggle tipo de busca
    document.querySelectorAll('.search-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.search-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            searchType = btn.dataset.type;

            const input = document.getElementById('searchInput');
            input.placeholder = searchType === 'nome'
                ? 'Digite o nome do time...'
                : 'Digite o ID do Cartola...';
            input.value = '';
        });
    });

    // Busca com Enter
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarParticipante();
        }
    });

    // Botao de busca
    document.getElementById('searchBtn').addEventListener('click', buscarParticipante);

    // Filtros da tabela
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtroAtual = tab.dataset.filter;
            renderizarParticipantes();
        });
    });
}

// ============================================================================
// CARREGAR DADOS
// ============================================================================

async function carregarLigas() {
    try {
        const response = await fetch('/api/ligas');
        if (!response.ok) throw new Error('Erro ao carregar ligas');

        const data = await response.json();
        ligasDisponiveis = data.ligas || data || [];

        renderizarCheckboxesLigas('ligasList');
    } catch (error) {
        console.error('Erro ao carregar ligas:', error);
        document.getElementById('ligasList').innerHTML = `
            <div class="empty-state">
                <p>Erro ao carregar ligas</p>
            </div>
        `;
    }
}

async function carregarParticipantes() {
    try {
        const response = await fetch('/api/times?ativo=true');
        if (!response.ok) throw new Error('Erro ao carregar participantes');

        const data = await response.json();
        participantesCadastrados = data.times || data || [];

        renderizarParticipantes();
    } catch (error) {
        console.error('Erro ao carregar participantes:', error);
    }
}

// ============================================================================
// BUSCA DE PARTICIPANTE
// ============================================================================

async function buscarParticipante() {
    const input = document.getElementById('searchInput');
    const query = input.value.trim();
    const btn = document.getElementById('searchBtn');

    if (!query) {
        showAlert('Digite um termo para buscar', 'error');
        return;
    }

    btn.classList.add('loading-active');
    btn.disabled = true;

    try {
        let url;
        if (searchType === 'id') {
            // Validar que e numero
            if (!/^\d+$/.test(query)) {
                throw new Error('ID deve conter apenas numeros');
            }
            url = `/api/times/${query}`;
        } else {
            url = `/api/cartola/buscar-time?q=${encodeURIComponent(query)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || data.message || 'Participante nao encontrado');
        }

        // Para busca por nome, pode retornar array - pegar o primeiro
        const participante = Array.isArray(data) ? data[0] : data;

        if (!participante) {
            throw new Error('Nenhum participante encontrado');
        }

        participanteBuscado = {
            id: participante.time_id || participante.id,
            nome_time: participante.nome_time || participante.nome,
            nome_cartoleiro: participante.nome_cartoleiro || participante.cartoleiro || participante.nome_cartola,
            escudo: participante.url_escudo_png || participante.escudo || participante.foto || '/escudos/default.png'
        };

        exibirResultado(participanteBuscado);

    } catch (error) {
        showAlert(error.message, 'error');
        limparResultado();
    } finally {
        btn.classList.remove('loading-active');
        btn.disabled = false;
    }
}

function exibirResultado(participante) {
    document.getElementById('resultEscudo').src = participante.escudo;
    document.getElementById('resultNome').textContent = participante.nome_time;
    document.getElementById('resultCartoleiro').textContent = participante.nome_cartoleiro;
    document.getElementById('resultId').textContent = `ID: ${participante.id}`;

    document.getElementById('searchResult').classList.add('active');
    renderizarCheckboxesLigas('ligasList');
}

function limparResultado() {
    participanteBuscado = null;
    document.getElementById('searchResult').classList.remove('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('contatoInput').value = '';

    // Desmarcar todos os checkboxes
    document.querySelectorAll('#ligasList input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// ============================================================================
// CADASTRO DE PARTICIPANTE
// ============================================================================

async function cadastrarParticipante() {
    if (!participanteBuscado) {
        showAlert('Busque um participante primeiro', 'error');
        return;
    }

    const btn = document.getElementById('cadastrarBtn');
    const temporada = document.getElementById('temporadaSelect').value;
    const contato = document.getElementById('contatoInput').value.trim();

    // Pegar ligas selecionadas
    const ligasSelecionadas = [];
    document.querySelectorAll('#ligasList input[type="checkbox"]:checked').forEach(cb => {
        ligasSelecionadas.push(cb.value);
    });

    btn.classList.add('loading-active');
    btn.disabled = true;

    try {
        // 1. Salvar participante na collection times
        const timeResponse = await fetch(`/api/times/${participanteBuscado.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome_time: participanteBuscado.nome_time,
                nome_cartoleiro: participanteBuscado.nome_cartoleiro,
                url_escudo_png: participanteBuscado.escudo,
                contato: contato || undefined,
                temporada: Number(temporada),
                ativo: true
            })
        });

        if (!timeResponse.ok) {
            const errorData = await timeResponse.json();
            throw new Error(errorData.erro || 'Erro ao salvar participante');
        }

        // 2. Vincular as ligas selecionadas
        for (const ligaId of ligasSelecionadas) {
            await vincularParticipanteALiga(ligaId, participanteBuscado.id);
        }

        showAlert('Participante cadastrado com sucesso!', 'success');
        limparResultado();
        await carregarParticipantes();

    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        btn.classList.remove('loading-active');
        btn.disabled = false;
    }
}

async function vincularParticipanteALiga(ligaId, timeId) {
    try {
        // Buscar liga atual
        const ligaResponse = await fetch(`/api/ligas/${ligaId}`);
        if (!ligaResponse.ok) throw new Error('Liga nao encontrada');

        const liga = await ligaResponse.json();
        const timesAtuais = liga.times || [];

        // Adicionar se nao existir
        if (!timesAtuais.includes(Number(timeId))) {
            timesAtuais.push(Number(timeId));

            // Atualizar liga
            const updateResponse = await fetch(`/api/ligas/${ligaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ times: timesAtuais })
            });

            if (!updateResponse.ok) {
                console.error(`Erro ao vincular a liga ${ligaId}`);
            }

            // Sincronizar participantes
            await fetch(`/api/ligas/${ligaId}/sincronizar-participantes`, {
                method: 'POST'
            });
        }
    } catch (error) {
        console.error(`Erro ao vincular a liga ${ligaId}:`, error);
    }
}

// ============================================================================
// RENDERIZACAO
// ============================================================================

function renderizarCheckboxesLigas(containerId) {
    const container = document.getElementById(containerId);

    if (ligasDisponiveis.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma liga disponivel</p>
            </div>
        `;
        return;
    }

    container.innerHTML = ligasDisponiveis.map(liga => `
        <label class="liga-checkbox">
            <input type="checkbox" value="${liga._id}">
            <span>${liga.nome}</span>
        </label>
    `).join('');
}

function renderizarParticipantes() {
    const tbody = document.getElementById('participantesBody');

    // Aplicar filtro
    let participantesFiltrados = [...participantesCadastrados];

    if (filtroAtual === 'sem-liga') {
        participantesFiltrados = participantesFiltrados.filter(p => {
            const ligasCount = contarLigasDoParticipante(p.id);
            return ligasCount === 0;
        });
    } else if (filtroAtual === 'com-liga') {
        participantesFiltrados = participantesFiltrados.filter(p => {
            const ligasCount = contarLigasDoParticipante(p.id);
            return ligasCount > 0;
        });
    }

    if (participantesFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <span class="material-icons">person_off</span>
                        <p>Nenhum participante encontrado.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = participantesFiltrados.map(p => {
        const ligasCount = contarLigasDoParticipante(p.id);
        const escudo = p.url_escudo_png || p.escudo || '/escudos/default.png';

        return `
            <tr>
                <td>
                    <div class="participant-row-info">
                        <img src="${escudo}"
                             class="participant-row-escudo"
                             onerror="this.src='/escudos/default.png'"
                             alt="Escudo">
                        <div>
                            <div class="participant-row-name">${p.nome_time || p.nome}</div>
                            <div class="participant-row-cartoleiro">${p.nome_cartoleiro || p.cartoleiro || '--'}</div>
                        </div>
                    </div>
                </td>
                <td>${p.temporada || '--'}</td>
                <td>
                    <span class="badge-ligas ${ligasCount === 0 ? 'badge-sem-liga' : ''}">
                        ${ligasCount === 0 ? 'Sem liga' : ligasCount + ' liga(s)'}
                    </span>
                </td>
                <td>
                    <button class="action-btn" title="Vincular a Liga" onclick="abrirModalVincular(${p.id})">
                        <span class="material-icons">add_link</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function contarLigasDoParticipante(timeId) {
    let count = 0;
    ligasDisponiveis.forEach(liga => {
        if (liga.times && liga.times.includes(Number(timeId))) {
            count++;
        }
    });
    return count;
}

// ============================================================================
// MODAL VINCULAR LIGA
// ============================================================================

function abrirModalVincular(timeId) {
    document.getElementById('modalTimeId').value = timeId;

    const container = document.getElementById('modalLigasList');
    container.innerHTML = ligasDisponiveis.map(liga => {
        const jaVinculado = liga.times && liga.times.includes(Number(timeId));
        return `
            <label class="liga-checkbox">
                <input type="checkbox" value="${liga._id}" ${jaVinculado ? 'checked' : ''}>
                <span>${liga.nome}</span>
            </label>
        `;
    }).join('');

    document.getElementById('modalVincular').classList.add('active');
}

function fecharModalVincular() {
    document.getElementById('modalVincular').classList.remove('active');
}

async function salvarVinculos() {
    const timeId = document.getElementById('modalTimeId').value;
    const ligasSelecionadas = [];

    document.querySelectorAll('#modalLigasList input[type="checkbox"]:checked').forEach(cb => {
        ligasSelecionadas.push(cb.value);
    });

    try {
        // Para cada liga, verificar se precisa adicionar ou remover
        for (const liga of ligasDisponiveis) {
            const ligaId = liga._id;
            const jaVinculado = liga.times && liga.times.includes(Number(timeId));
            const deveTerVinculo = ligasSelecionadas.includes(ligaId);

            if (deveTerVinculo && !jaVinculado) {
                // Adicionar vinculo
                await vincularParticipanteALiga(ligaId, timeId);
            } else if (!deveTerVinculo && jaVinculado) {
                // Remover vinculo
                await desvincularParticipanteDeLiga(ligaId, timeId);
            }
        }

        showAlert('Vinculos atualizados!', 'success');
        fecharModalVincular();
        await carregarLigas();
        await carregarParticipantes();

    } catch (error) {
        showAlert('Erro ao salvar vinculos', 'error');
    }
}

async function desvincularParticipanteDeLiga(ligaId, timeId) {
    try {
        const ligaResponse = await fetch(`/api/ligas/${ligaId}`);
        if (!ligaResponse.ok) return;

        const liga = await ligaResponse.json();
        const timesAtuais = (liga.times || []).filter(id => Number(id) !== Number(timeId));

        await fetch(`/api/ligas/${ligaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ times: timesAtuais })
        });

        // Sincronizar participantes
        await fetch(`/api/ligas/${ligaId}/sincronizar-participantes`, {
            method: 'POST'
        });
    } catch (error) {
        console.error(`Erro ao desvincular da liga ${ligaId}:`, error);
    }
}

// ============================================================================
// UTILITARIOS
// ============================================================================

function showAlert(message, type = 'success') {
    const toast = document.getElementById('alertToast');
    const messageEl = document.getElementById('alertMessage');
    const icon = toast.querySelector('.material-icons');

    messageEl.textContent = message;
    toast.className = `alert-toast ${type} active`;
    icon.textContent = type === 'success' ? 'check_circle' : 'error';

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}
