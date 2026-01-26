/**
 * Ferramentas - Pesquisar Time na API do Cartola
 * Permite buscar times e adicionar a ligas existentes
 * @version 2.1.1 - Fix endpoint buscar-time por ID
 */

// Estado do modal
let timeSelecionado = null;
let dadosCompletosAPI = null; // Dados brutos da API Cartola
let ligasDisponiveis = [];
let abaAtiva = 'nome'; // 'nome' ou 'id'
const TEMPORADA_ATUAL = new Date().getFullYear();

// Debounce para busca
let debounceTimer = null;

/**
 * Injeta estilos CSS do modal no documento
 */
function injetarEstilos() {
    if (document.getElementById('pesquisar-time-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'pesquisar-time-styles';
    styles.textContent = `
        /* Modal Pesquisar Time */
        .pesquisar-time-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
            animation: ptFadeIn 0.2s ease;
        }

        @keyframes ptFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .pesquisar-time-modal {
            background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            width: 90%;
            max-width: 520px;
            max-height: 85vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: ptSlideIn 0.3s ease;
        }

        @keyframes ptSlideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .pt-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pt-modal-header h3 {
            display: flex;
            align-items: center;
            gap: 8px;
            font: 600 18px "Inter", sans-serif;
            color: #fff;
            margin: 0;
        }

        .pt-modal-header h3 .material-icons {
            color: #FF5500;
        }

        .pt-modal-close {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .pt-modal-close:hover {
            background: rgba(231, 76, 60, 0.3);
            color: #e74c3c;
        }

        /* Sistema de Abas */
        .pt-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0 20px;
            background: rgba(0, 0, 0, 0.2);
        }

        .pt-tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 12px 16px;
            font: 500 13px "Inter", sans-serif;
            color: #888;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
            margin-bottom: -1px;
        }

        .pt-tab:hover {
            color: #ccc;
        }

        .pt-tab.ativa {
            color: #FF5500;
            border-bottom-color: #FF5500;
        }

        .pt-tab .material-icons {
            font-size: 18px;
        }

        .pt-modal-body {
            padding: 20px;
            max-height: calc(85vh - 120px);
            overflow-y: auto;
        }

        /* Campo de Busca */
        .pt-search-container {
            position: relative;
            margin-bottom: 16px;
        }

        .pt-search-input {
            width: 100%;
            padding: 12px 16px 12px 44px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            font: 400 14px "Inter", sans-serif;
            outline: none;
            transition: all 0.2s ease;
        }

        .pt-search-input:focus {
            border-color: #FF5500;
            box-shadow: 0 0 0 3px rgba(255, 85, 0, 0.2);
        }

        .pt-search-input::placeholder {
            color: #666;
        }

        .pt-search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
            font-size: 20px;
        }

        .pt-search-spinner {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 85, 0, 0.3);
            border-top-color: #FF5500;
            border-radius: 50%;
            animation: ptSpin 0.8s linear infinite;
            display: none;
        }

        .pt-search-spinner.ativo { display: block; }

        @keyframes ptSpin {
            to { transform: translateY(-50%) rotate(360deg); }
        }

        /* Busca por ID */
        .pt-id-form {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }

        .pt-id-input {
            flex: 1;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            font: 400 14px "Inter", sans-serif;
            outline: none;
            transition: all 0.2s ease;
        }

        .pt-id-input:focus {
            border-color: #FF5500;
            box-shadow: 0 0 0 3px rgba(255, 85, 0, 0.2);
        }

        .pt-id-input::placeholder {
            color: #666;
        }

        .pt-id-btn {
            padding: 12px 20px;
            background: #FF5500;
            border: none;
            border-radius: 8px;
            color: #fff;
            font: 600 14px "Inter", sans-serif;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }

        .pt-id-btn:hover {
            background: #ff6b1a;
        }

        .pt-id-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Resultados */
        .pt-resultados {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .pt-resultado-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .pt-resultado-item:hover {
            background: rgba(255, 85, 0, 0.1);
            border-color: rgba(255, 85, 0, 0.3);
        }

        .pt-resultado-escudo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            background: #333;
        }

        .pt-resultado-info {
            flex: 1;
            min-width: 0;
        }

        .pt-resultado-nome {
            font: 600 14px "Inter", sans-serif;
            color: #fff;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .pt-resultado-cartoleiro {
            font: 400 12px "Inter", sans-serif;
            color: #888;
            margin: 0;
        }

        .pt-resultado-id {
            font: 500 11px "Inter", sans-serif;
            color: #666;
            background: rgba(255, 255, 255, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
        }

        /* Estados */
        .pt-estado-vazio {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }

        .pt-estado-vazio .material-icons {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        .pt-estado-vazio p {
            font: 400 14px "Inter", sans-serif;
            margin: 0;
        }

        /* Confirmacao */
        .pt-confirmacao {
            text-align: center;
            padding: 20px 0;
        }

        .pt-time-selecionado {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 20px;
            background: rgba(255, 85, 0, 0.1);
            border: 1px solid rgba(255, 85, 0, 0.3);
            border-radius: 12px;
            margin-bottom: 20px;
        }

        .pt-time-selecionado img {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
        }

        .pt-time-selecionado h4 {
            font: 700 18px "Inter", sans-serif;
            color: #fff;
            margin: 0;
        }

        .pt-time-selecionado p {
            font: 400 13px "Inter", sans-serif;
            color: #888;
            margin: 0;
        }

        .pt-confirmacao-texto {
            font: 500 15px "Inter", sans-serif;
            color: #fff;
            margin: 0 0 20px 0;
        }

        .pt-botoes {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .pt-btn {
            padding: 10px 24px;
            border-radius: 8px;
            font: 600 14px "Inter", sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .pt-btn-primary {
            background: #FF5500;
            color: #fff;
        }

        .pt-btn-primary:hover {
            background: #ff6b1a;
        }

        .pt-btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        .pt-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        /* Lista de Ligas */
        .pt-ligas-lista {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .pt-liga-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .pt-liga-item:hover {
            background: rgba(255, 85, 0, 0.1);
            border-color: rgba(255, 85, 0, 0.3);
        }

        .pt-liga-nome {
            font: 600 14px "Inter", sans-serif;
            color: #fff;
            margin: 0 0 2px 0;
        }

        .pt-liga-info {
            font: 400 12px "Inter", sans-serif;
            color: #888;
            margin: 0;
        }

        .pt-liga-badge {
            font: 600 11px "Inter", sans-serif;
            color: #FF5500;
            background: rgba(255, 85, 0, 0.15);
            padding: 4px 10px;
            border-radius: 12px;
        }

        /* Voltar */
        .pt-voltar {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #888;
            font: 500 13px "Inter", sans-serif;
            cursor: pointer;
            margin-bottom: 16px;
            transition: color 0.2s ease;
        }

        .pt-voltar:hover {
            color: #FF5500;
        }

        .pt-voltar .material-icons {
            font-size: 18px;
        }

        /* Sucesso */
        .pt-sucesso {
            text-align: center;
            padding: 40px 20px;
        }

        .pt-sucesso .material-icons {
            font-size: 64px;
            color: #10b981;
            margin-bottom: 16px;
        }

        .pt-sucesso h4 {
            font: 700 18px "Inter", sans-serif;
            color: #fff;
            margin: 0 0 8px 0;
        }

        .pt-sucesso p {
            font: 400 14px "Inter", sans-serif;
            color: #888;
            margin: 0;
        }

        /* JSON Viewer / Dados Completos */
        .pt-dados-completos {
            margin-top: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }

        .pt-dados-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(255, 85, 0, 0.1);
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .pt-dados-header:hover {
            background: rgba(255, 85, 0, 0.15);
        }

        .pt-dados-header h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            font: 600 13px "Inter", sans-serif;
            color: #FF5500;
            margin: 0;
        }

        .pt-dados-header .material-icons {
            font-size: 18px;
            transition: transform 0.2s ease;
        }

        .pt-dados-header.expandido .material-icons {
            transform: rotate(180deg);
        }

        .pt-dados-body {
            padding: 16px;
            background: rgba(0, 0, 0, 0.3);
            display: none;
            max-height: 300px;
            overflow-y: auto;
        }

        .pt-dados-body.visivel {
            display: block;
        }

        .pt-json-viewer {
            font: 400 12px "JetBrains Mono", "Fira Code", monospace;
            color: #e0e0e0;
            white-space: pre-wrap;
            word-break: break-all;
            line-height: 1.5;
        }

        .pt-json-key {
            color: #FF5500;
        }

        .pt-json-string {
            color: #98c379;
        }

        .pt-json-number {
            color: #d19a66;
        }

        .pt-json-boolean {
            color: #56b6c2;
        }

        .pt-json-null {
            color: #666;
        }

        /* Detalhes do Time */
        .pt-time-detalhes {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 16px;
        }

        .pt-detalhe-item {
            background: rgba(255, 255, 255, 0.03);
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .pt-detalhe-label {
            font: 500 10px "Inter", sans-serif;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .pt-detalhe-valor {
            font: 600 13px "Inter", sans-serif;
            color: #fff;
            word-break: break-all;
        }

        .pt-detalhe-valor.positivo {
            color: #10b981;
        }

        .pt-detalhe-valor.assinante {
            color: #FFD700;
        }

        /* Botao copiar JSON */
        .pt-btn-copiar {
            padding: 6px 12px;
            font: 500 11px "Inter", sans-serif;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
        }

        .pt-btn-copiar:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .pt-btn-copiar .material-icons {
            font-size: 14px;
        }

        /* Loading dados */
        .pt-loading-dados {
            text-align: center;
            padding: 20px;
            color: #888;
        }
    `;
    document.head.appendChild(styles);
}

/**
 * Abre o modal de pesquisa
 */
function abrirModalPesquisarTime() {
    injetarEstilos();

    // Reset estado
    timeSelecionado = null;
    ligasDisponiveis = [];
    abaAtiva = 'nome';

    const overlay = document.createElement('div');
    overlay.className = 'pesquisar-time-overlay';
    overlay.id = 'pesquisar-time-modal';
    overlay.innerHTML = `
        <div class="pesquisar-time-modal">
            <div class="pt-modal-header">
                <h3>
                    <span class="material-icons">group_add</span>
                    Adicionar Participante
                </h3>
                <button class="pt-modal-close" onclick="fecharModalPesquisarTime()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="pt-tabs">
                <div class="pt-tab ativa" data-aba="nome" onclick="trocarAba('nome')">
                    <span class="material-icons">person_search</span>
                    Pesquisar por Nome
                </div>
                <div class="pt-tab" data-aba="id" onclick="trocarAba('id')">
                    <span class="material-icons">tag</span>
                    Buscar por ID
                </div>
            </div>
            <div class="pt-modal-body">
                <!-- Aba: Pesquisar por Nome -->
                <div id="pt-aba-nome">
                    <div id="pt-fase-busca">
                        <div class="pt-search-container">
                            <span class="material-icons pt-search-icon">search</span>
                            <input
                                type="text"
                                class="pt-search-input"
                                id="pt-input-busca"
                                placeholder="Digite o nome do time (min. 3 caracteres)..."
                                autocomplete="off"
                            />
                            <div class="pt-search-spinner" id="pt-spinner"></div>
                        </div>
                        <div id="pt-resultados" class="pt-resultados">
                            <div class="pt-estado-vazio">
                                <span class="material-icons">sports_soccer</span>
                                <p>Digite o nome do time para buscar na API do Cartola</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Aba: Buscar por ID -->
                <div id="pt-aba-id" style="display: none;">
                    <div class="pt-id-form">
                        <input
                            type="number"
                            class="pt-id-input"
                            id="pt-input-id"
                            placeholder="Digite o ID do time (ex: 12345678)"
                            autocomplete="off"
                        />
                        <button class="pt-id-btn" onclick="buscarPorId()">
                            <span class="material-icons">search</span>
                            Buscar
                        </button>
                    </div>
                    <div id="pt-resultados-id" class="pt-resultados">
                        <div class="pt-estado-vazio">
                            <span class="material-icons">tag</span>
                            <p>Informe o ID numerico do time no Cartola FC</p>
                        </div>
                    </div>
                </div>

                <!-- Fases compartilhadas -->
                <div id="pt-fase-confirmar" style="display: none;"></div>
                <div id="pt-fase-ligas" style="display: none;"></div>
                <div id="pt-fase-sucesso" style="display: none;"></div>
            </div>
        </div>
    `;

    // Fechar ao clicar fora
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) fecharModalPesquisarTime();
    });

    document.body.appendChild(overlay);

    // Focar no input
    setTimeout(() => {
        const input = document.getElementById('pt-input-busca');
        if (input) {
            input.focus();
            input.addEventListener('input', onInputBusca);
        }
        // Handler para busca por ID com Enter
        const inputId = document.getElementById('pt-input-id');
        if (inputId) {
            inputId.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') buscarPorId();
            });
        }
    }, 100);

    // Fechar com ESC
    document.addEventListener('keydown', onEscPress);

    console.log('[PESQUISAR-TIME] Modal aberto v2.0');
}

/**
 * Troca entre as abas do modal
 */
function trocarAba(aba) {
    abaAtiva = aba;

    // Atualizar visual das abas
    document.querySelectorAll('.pt-tab').forEach(tab => {
        tab.classList.toggle('ativa', tab.dataset.aba === aba);
    });

    // Mostrar/ocultar conteudo
    document.getElementById('pt-aba-nome').style.display = aba === 'nome' ? 'block' : 'none';
    document.getElementById('pt-aba-id').style.display = aba === 'id' ? 'block' : 'none';

    // Esconder fases de confirmacao se estiverem visiveis
    document.getElementById('pt-fase-confirmar').style.display = 'none';
    document.getElementById('pt-fase-ligas').style.display = 'none';
    document.getElementById('pt-fase-sucesso').style.display = 'none';

    // Focar no input da aba ativa
    setTimeout(() => {
        if (aba === 'nome') {
            document.getElementById('pt-input-busca')?.focus();
        } else {
            document.getElementById('pt-input-id')?.focus();
        }
    }, 100);

    console.log(`[PESQUISAR-TIME] Aba trocada para: ${aba}`);
}

/**
 * Busca time por ID numerico
 */
async function buscarPorId() {
    const input = document.getElementById('pt-input-id');
    const container = document.getElementById('pt-resultados-id');
    const timeId = input?.value?.trim();

    if (!timeId || isNaN(timeId)) {
        container.innerHTML = `
            <div class="pt-estado-vazio">
                <span class="material-icons">error_outline</span>
                <p>Digite um ID numerico valido</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="pt-estado-vazio">
            <div class="pt-search-spinner ativo" style="position: static; transform: none;"></div>
            <p>Buscando time #${timeId}...</p>
        </div>
    `;

    try {
        // ✅ v2.1.1 FIX: Corrigir endpoint para rota correta
        const response = await fetch(`/api/cartola/buscar-time/${timeId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.erro || data.message || 'Time nao encontrado');
        }

        const time = data.time;
        container.innerHTML = `
            <div class="pt-resultado-item" onclick="selecionarTime(${JSON.stringify(time).replace(/"/g, '&quot;')})">
                <img
                    class="pt-resultado-escudo"
                    src="${time.escudo || '/escudos/default.png'}"
                    onerror="this.src='/escudos/default.png'"
                    alt="Escudo"
                />
                <div class="pt-resultado-info">
                    <p class="pt-resultado-nome">${time.nome_time || 'Time sem nome'}</p>
                    <p class="pt-resultado-cartoleiro">${time.nome_cartoleiro || 'Cartoleiro'}</p>
                </div>
                <span class="pt-resultado-id">#${time.time_id}</span>
            </div>
        `;

        console.log(`[PESQUISAR-TIME] Time encontrado por ID: ${time.nome_time}`);

    } catch (error) {
        container.innerHTML = `
            <div class="pt-estado-vazio">
                <span class="material-icons">search_off</span>
                <p>${error.message}</p>
            </div>
        `;
        console.error('[PESQUISAR-TIME] Erro ao buscar por ID:', error);
    }
}

/**
 * Fecha o modal
 */
function fecharModalPesquisarTime() {
    const modal = document.getElementById('pesquisar-time-modal');
    if (modal) {
        modal.remove();
        document.removeEventListener('keydown', onEscPress);
    }
}

/**
 * Handler para tecla ESC
 */
function onEscPress(e) {
    if (e.key === 'Escape') fecharModalPesquisarTime();
}

/**
 * Handler do input de busca com debounce
 */
function onInputBusca(e) {
    const query = e.target.value.trim();

    clearTimeout(debounceTimer);

    if (query.length < 3) {
        document.getElementById('pt-resultados').innerHTML = `
            <div class="pt-estado-vazio">
                <span class="material-icons">sports_soccer</span>
                <p>Digite pelo menos 3 caracteres para buscar</p>
            </div>
        `;
        return;
    }

    // Mostrar loading
    document.getElementById('pt-spinner').classList.add('ativo');

    debounceTimer = setTimeout(() => buscarTimes(query), 400);
}

/**
 * Busca times na API do Cartola
 */
async function buscarTimes(query) {
    const spinner = document.getElementById('pt-spinner');
    const container = document.getElementById('pt-resultados');

    try {
        // Buscar na API da Globo (nao no banco local)
        const response = await fetch(`/api/cartola/buscar-time-globo?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();

        spinner.classList.remove('ativo');

        if (!data.success || !data.times || data.times.length === 0) {
            container.innerHTML = `
                <div class="pt-estado-vazio">
                    <span class="material-icons">search_off</span>
                    <p>Nenhum time encontrado para "${query}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.times.map(time => `
            <div class="pt-resultado-item" onclick="selecionarTime(${JSON.stringify(time).replace(/"/g, '&quot;')})">
                <img
                    class="pt-resultado-escudo"
                    src="${time.escudo || '/escudos/default.png'}"
                    onerror="this.src='/escudos/default.png'"
                    alt="Escudo"
                />
                <div class="pt-resultado-info">
                    <p class="pt-resultado-nome">${time.nome_time || 'Time sem nome'}</p>
                    <p class="pt-resultado-cartoleiro">${time.nome_cartoleiro || 'Cartoleiro'}</p>
                </div>
                <span class="pt-resultado-id">#${time.time_id}</span>
            </div>
        `).join('');

        console.log(`[PESQUISAR-TIME] ${data.times.length} times encontrados para "${query}"`);

    } catch (error) {
        spinner.classList.remove('ativo');
        container.innerHTML = `
            <div class="pt-estado-vazio">
                <span class="material-icons">error_outline</span>
                <p>Erro ao buscar: ${error.message}</p>
            </div>
        `;
        console.error('[PESQUISAR-TIME] Erro na busca:', error);
    }
}

/**
 * Seleciona um time e mostra confirmacao com dados completos
 */
async function selecionarTime(time) {
    timeSelecionado = time;
    dadosCompletosAPI = null;

    // Esconder ambas as abas
    document.getElementById('pt-aba-nome').style.display = 'none';
    document.getElementById('pt-aba-id').style.display = 'none';
    document.getElementById('pt-fase-confirmar').style.display = 'block';

    // Mostrar loading inicial
    document.getElementById('pt-fase-confirmar').innerHTML = `
        <div class="pt-voltar" onclick="voltarParaBusca()">
            <span class="material-icons">arrow_back</span>
            Voltar
        </div>
        <div class="pt-confirmacao">
            <div class="pt-time-selecionado">
                <img
                    src="${time.escudo || '/escudos/default.png'}"
                    onerror="this.src='/escudos/default.png'"
                    alt="Escudo"
                />
                <h4>${time.nome_time}</h4>
                <p>${time.nome_cartoleiro} - ID #${time.time_id}</p>
            </div>
            <div class="pt-loading-dados">
                <div class="pt-search-spinner ativo" style="position: static; transform: none;"></div>
                <p style="margin-top: 8px;">Carregando dados completos da API...</p>
            </div>
        </div>
    `;

    console.log('[PESQUISAR-TIME] Buscando dados completos para:', time.nome_time);

    // Buscar dados completos da API
    try {
        const response = await fetch(`/api/cartola/time/${time.time_id}/completo`);
        const data = await response.json();

        if (data.success && data.time) {
            dadosCompletosAPI = data.time;
            console.log('[PESQUISAR-TIME] Dados completos obtidos:', dadosCompletosAPI);
        }
    } catch (error) {
        console.warn('[PESQUISAR-TIME] Erro ao buscar dados completos:', error);
    }

    // Renderizar confirmacao com dados
    renderizarConfirmacao(time);
}

/**
 * Renderiza a tela de confirmacao com dados completos
 */
function renderizarConfirmacao(time) {
    const timeData = dadosCompletosAPI?.time || dadosCompletosAPI || {};

    // Extrair dados relevantes
    const patrimonio = timeData.patrimonio || 0;
    const pontosCampeonato = timeData.pontos_campeonato || 0;
    const assinante = timeData.assinante || false;
    const slug = timeData.slug || time.slug || '';
    const fotoUrl = timeData.url_escudo_png || timeData.foto_perfil || time.escudo || '';

    document.getElementById('pt-fase-confirmar').innerHTML = `
        <div class="pt-voltar" onclick="voltarParaBusca()">
            <span class="material-icons">arrow_back</span>
            Voltar
        </div>
        <div class="pt-confirmacao">
            <div class="pt-time-selecionado">
                <img
                    src="${fotoUrl || '/escudos/default.png'}"
                    onerror="this.src='/escudos/default.png'"
                    alt="Escudo"
                />
                <h4>${timeData.nome || time.nome_time}</h4>
                <p>${timeData.nome_cartola || time.nome_cartoleiro} - ID #${time.time_id}</p>
            </div>

            ${dadosCompletosAPI ? `
            <div class="pt-time-detalhes">
                <div class="pt-detalhe-item">
                    <div class="pt-detalhe-label">Patrimonio</div>
                    <div class="pt-detalhe-valor positivo">C$ ${patrimonio.toFixed(2)}</div>
                </div>
                <div class="pt-detalhe-item">
                    <div class="pt-detalhe-label">Pontos Campeonato</div>
                    <div class="pt-detalhe-valor">${pontosCampeonato.toFixed(2)}</div>
                </div>
                <div class="pt-detalhe-item">
                    <div class="pt-detalhe-label">Assinante PRO</div>
                    <div class="pt-detalhe-valor ${assinante ? 'assinante' : ''}">${assinante ? 'Sim' : 'Nao'}</div>
                </div>
                <div class="pt-detalhe-item">
                    <div class="pt-detalhe-label">Slug</div>
                    <div class="pt-detalhe-valor">${slug || '-'}</div>
                </div>
            </div>

            <div class="pt-dados-completos">
                <div class="pt-dados-header" onclick="toggleDadosCompletos()">
                    <h4>
                        <span class="material-icons">code</span>
                        Dados Completos da API
                    </h4>
                    <span class="material-icons">expand_more</span>
                </div>
                <div class="pt-dados-body" id="pt-json-container">
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                        <button class="pt-btn-copiar" onclick="copiarJSON()">
                            <span class="material-icons">content_copy</span>
                            Copiar JSON
                        </button>
                    </div>
                    <div class="pt-json-viewer">${formatarJSON(dadosCompletosAPI)}</div>
                </div>
            </div>
            ` : `
            <div class="pt-estado-vazio" style="padding: 16px;">
                <span class="material-icons" style="font-size: 24px;">info</span>
                <p style="font-size: 12px;">Dados completos nao disponiveis</p>
            </div>
            `}

            <p class="pt-confirmacao-texto" style="margin-top: 20px;">Adicionar a uma liga existente?</p>
            <div class="pt-botoes">
                <button class="pt-btn pt-btn-primary" onclick="mostrarListaLigas()">
                    <span class="material-icons">check</span>
                    Sim, escolher liga
                </button>
                <button class="pt-btn pt-btn-secondary" onclick="fecharModalPesquisarTime()">
                    <span class="material-icons">close</span>
                    Fechar
                </button>
            </div>
        </div>
    `;

    console.log('[PESQUISAR-TIME] Time selecionado:', time.nome_time);
}

/**
 * Toggle para expandir/colapsar dados completos
 */
function toggleDadosCompletos() {
    const header = document.querySelector('.pt-dados-header');
    const body = document.getElementById('pt-json-container');

    header.classList.toggle('expandido');
    body.classList.toggle('visivel');
}

/**
 * Formata JSON com syntax highlighting
 */
function formatarJSON(obj) {
    if (!obj) return 'null';

    const json = JSON.stringify(obj, null, 2);

    return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"([^"]+)":/g, '<span class="pt-json-key">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="pt-json-string">"$1"</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="pt-json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="pt-json-boolean">$1</span>')
        .replace(/: (null)/g, ': <span class="pt-json-null">$1</span>');
}

/**
 * Copia o JSON para a area de transferencia
 */
async function copiarJSON() {
    if (!dadosCompletosAPI) return;

    try {
        await navigator.clipboard.writeText(JSON.stringify(dadosCompletosAPI, null, 2));

        const btn = document.querySelector('.pt-btn-copiar');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="material-icons">check</span> Copiado!';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.color = '#10b981';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);

        console.log('[PESQUISAR-TIME] JSON copiado para clipboard');
    } catch (error) {
        console.error('[PESQUISAR-TIME] Erro ao copiar:', error);
    }
}

/**
 * Volta para a busca (aba ativa)
 */
function voltarParaBusca() {
    document.getElementById('pt-fase-confirmar').style.display = 'none';
    document.getElementById('pt-fase-ligas').style.display = 'none';
    document.getElementById('pt-fase-sucesso').style.display = 'none';

    // Mostrar aba que estava ativa
    if (abaAtiva === 'id') {
        document.getElementById('pt-aba-id').style.display = 'block';
        document.getElementById('pt-input-id')?.focus();
    } else {
        document.getElementById('pt-aba-nome').style.display = 'block';
        document.getElementById('pt-input-busca')?.focus();
    }
}

/**
 * Busca ligas e mostra lista para selecao
 */
async function mostrarListaLigas() {
    document.getElementById('pt-fase-confirmar').style.display = 'none';
    document.getElementById('pt-fase-ligas').style.display = 'block';

    document.getElementById('pt-fase-ligas').innerHTML = `
        <div class="pt-estado-vazio">
            <div class="pt-search-spinner ativo" style="position: static; transform: none;"></div>
            <p>Carregando ligas...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/ligas');
        const ligas = await response.json();

        if (!Array.isArray(ligas) || ligas.length === 0) {
            document.getElementById('pt-fase-ligas').innerHTML = `
                <div class="pt-voltar" onclick="voltarParaConfirmacao()">
                    <span class="material-icons">arrow_back</span>
                    Voltar
                </div>
                <div class="pt-estado-vazio">
                    <span class="material-icons">folder_off</span>
                    <p>Nenhuma liga encontrada</p>
                </div>
            `;
            return;
        }

        ligasDisponiveis = ligas;

        document.getElementById('pt-fase-ligas').innerHTML = `
            <div class="pt-voltar" onclick="voltarParaConfirmacao()">
                <span class="material-icons">arrow_back</span>
                Voltar
            </div>
            <p style="color: #888; font-size: 13px; margin-bottom: 12px;">
                Selecione a liga para adicionar <strong style="color: #FF5500;">${timeSelecionado.nome_time}</strong>:
            </p>
            <div class="pt-ligas-lista">
                ${ligas.map(liga => `
                    <div class="pt-liga-item" onclick="adicionarTimeLiga('${liga._id}')">
                        <div>
                            <p class="pt-liga-nome">${liga.nome}</p>
                            <p class="pt-liga-info">${liga.times?.length || 0} participantes</p>
                        </div>
                        <span class="pt-liga-badge">${TEMPORADA_ATUAL}</span>
                    </div>
                `).join('')}
            </div>
        `;

        console.log(`[PESQUISAR-TIME] ${ligas.length} ligas carregadas`);

    } catch (error) {
        document.getElementById('pt-fase-ligas').innerHTML = `
            <div class="pt-voltar" onclick="voltarParaConfirmacao()">
                <span class="material-icons">arrow_back</span>
                Voltar
            </div>
            <div class="pt-estado-vazio">
                <span class="material-icons">error_outline</span>
                <p>Erro ao carregar ligas: ${error.message}</p>
            </div>
        `;
        console.error('[PESQUISAR-TIME] Erro ao carregar ligas:', error);
    }
}

/**
 * Volta para fase de confirmacao
 */
function voltarParaConfirmacao() {
    document.getElementById('pt-fase-ligas').style.display = 'none';
    document.getElementById('pt-fase-confirmar').style.display = 'block';
}

/**
 * Adiciona o time selecionado a uma liga
 */
async function adicionarTimeLiga(ligaId) {
    if (!timeSelecionado) {
        console.error('[PESQUISAR-TIME] Nenhum time selecionado');
        return;
    }

    const ligaNome = ligasDisponiveis.find(l => l._id === ligaId)?.nome || 'Liga';

    // Mostrar loading na lista
    document.getElementById('pt-fase-ligas').innerHTML = `
        <div class="pt-estado-vazio">
            <div class="pt-search-spinner ativo" style="position: static; transform: none;"></div>
            <p>Adicionando a ${ligaNome}...</p>
        </div>
    `;

    // Extrair dados completos da API (se disponivel)
    const timeData = dadosCompletosAPI?.time || dadosCompletosAPI || {};

    try {
        const response = await fetch(`/api/inscricoes/${ligaId}/${TEMPORADA_ATUAL}/novo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                time_id: timeSelecionado.time_id,
                nome_time: timeData.nome || timeSelecionado.nome_time,
                nome_cartoleiro: timeData.nome_cartola || timeSelecionado.nome_cartoleiro,
                escudo: timeData.url_escudo_png || timeSelecionado.escudo,
                slug: timeData.slug || '',
                assinante: timeData.assinante || false,
                patrimonio: timeData.patrimonio || 0,
                pontos_campeonato: timeData.pontos_campeonato || 0,
                dados_cartola: dadosCompletosAPI || null, // Dados completos da API
                pagouInscricao: false,
                observacoes: 'Adicionado via Ferramentas > Adicionar Participante'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || data.message || 'Erro ao adicionar participante');
        }

        // Mostrar sucesso
        document.getElementById('pt-fase-ligas').style.display = 'none';
        document.getElementById('pt-fase-sucesso').style.display = 'block';
        document.getElementById('pt-fase-sucesso').innerHTML = `
            <div class="pt-sucesso">
                <span class="material-icons">check_circle</span>
                <h4>Participante adicionado!</h4>
                <p><strong>${timeSelecionado.nome_time}</strong> foi adicionado a <strong>${ligaNome}</strong> na temporada ${TEMPORADA_ATUAL}.</p>
                <div class="pt-botoes" style="margin-top: 20px;">
                    <button class="pt-btn pt-btn-primary" onclick="fecharModalPesquisarTime()">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        console.log(`[PESQUISAR-TIME] Time ${timeSelecionado.nome_time} adicionado a ${ligaNome}`);

    } catch (error) {
        document.getElementById('pt-fase-ligas').innerHTML = `
            <div class="pt-voltar" onclick="mostrarListaLigas()">
                <span class="material-icons">arrow_back</span>
                Voltar
            </div>
            <div class="pt-estado-vazio">
                <span class="material-icons">error_outline</span>
                <p>Erro: ${error.message}</p>
            </div>
        `;
        console.error('[PESQUISAR-TIME] Erro ao adicionar:', error);
    }
}

// Exportar funcoes globais
window.abrirModalPesquisarTime = abrirModalPesquisarTime;
window.fecharModalPesquisarTime = fecharModalPesquisarTime;
window.selecionarTime = selecionarTime;
window.mostrarListaLigas = mostrarListaLigas;
window.voltarParaConfirmacao = voltarParaConfirmacao;
window.voltarParaBusca = voltarParaBusca;
window.adicionarTimeLiga = adicionarTimeLiga;
window.trocarAba = trocarAba;
window.buscarPorId = buscarPorId;
window.toggleDadosCompletos = toggleDadosCompletos;
window.copiarJSON = copiarJSON;

console.log('[FERRAMENTAS] Modulo Adicionar Participante carregado v2.1.1');
