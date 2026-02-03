/**
 * MÓDULOS WIZARD - v2.0.1
 * Gerenciador de configuração de módulos via wizard interativo
 * Carrega perguntas dinamicamente da API e gera formulário
 *
 * CHANGELOG v2.0.1 (2026-02-03):
 * - ✅ FIX: Implementada lógica condicional para perguntas dependentes
 * - ✅ FIX: Perguntas condicionais agora mostram/escondem dinamicamente
 * - ✅ ENHANCEMENT: Logs detalhados para debugging
 */

console.log('[MODULOS-WIZARD] 🧙 Inicializando wizard v2.0.1');

// ============================================================================
// ESTADO GLOBAL
// ============================================================================

const state = {
    ligaId: null,
    moduloId: 'pontos_corridos', // Pode ser parametrizado
    temporada: null,
    wizard: null,
    configAtual: null
};

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

/**
 * Inicializa o wizard ao carregar a página
 */
async function inicializar() {
    try {
        // Extrair ligaId da URL
        const urlParams = new URLSearchParams(window.location.search);
        state.ligaId = urlParams.get('ligaId') || urlParams.get('id');
        state.temporada = urlParams.get('temporada') ? Number(urlParams.get('temporada')) : null;

        if (!state.ligaId) {
            mostrarErro('ID da liga não encontrado na URL. Adicione ?ligaId=XXXXX');
            return;
        }

        console.log(`[MODULOS-WIZARD] Liga: ${state.ligaId}, Módulo: ${state.moduloId}`);

        // Carregar informações da liga
        await carregarInfoLiga();

        // Carregar wizard e config atual
        await Promise.all([
            carregarWizard(),
            carregarConfigAtual()
        ]);

        // Renderizar wizard
        renderizarWizard();

        // Mostrar wizard
        esconderElemento('loading');
        mostrarElemento('wizard-container');

    } catch (error) {
        console.error('[MODULOS-WIZARD] Erro ao inicializar:', error);
        mostrarErro(`Erro ao inicializar wizard: ${error.message}`);
    }
}

/**
 * Carrega informações da liga
 */
async function carregarInfoLiga() {
    try {
        // TODO: Implementar endpoint para buscar liga por ID
        // Por enquanto, apenas mostra o ID
        const ligaInfoDiv = document.getElementById('liga-info');
        const ligaNomeEl = document.getElementById('liga-nome');

        ligaNomeEl.textContent = `ID: ${state.ligaId}`;
        ligaInfoDiv.classList.remove('hidden');

    } catch (error) {
        console.warn('[MODULOS-WIZARD] Não foi possível carregar info da liga:', error);
    }
}

/**
 * Carrega definição do wizard da API
 */
async function carregarWizard() {
    console.log(`[MODULOS-WIZARD] 📥 Carregando wizard: ${state.moduloId}`);

    const response = await fetch(`/api/modulos/${state.moduloId}/wizard`);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao carregar wizard');
    }

    state.wizard = data.wizard;

    // Atualizar informações do módulo
    document.getElementById('modulo-nome').textContent = data.modulo.nome;
    document.getElementById('modulo-descricao').textContent = data.modulo.descricao;

    if (state.wizard.descricao) {
        document.querySelector('#wizard-intro p').textContent = state.wizard.descricao;
    } else {
        esconderElemento('wizard-intro');
    }

    console.log(`[MODULOS-WIZARD] ✅ Wizard carregado: ${state.wizard.perguntas?.length || 0} perguntas`);
}

/**
 * Carrega configuração atual (se existir)
 */
async function carregarConfigAtual() {
    try {
        const url = state.temporada
            ? `/api/liga/${state.ligaId}/modulos/${state.moduloId}?temporada=${state.temporada}`
            : `/api/liga/${state.ligaId}/modulos/${state.moduloId}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.warn('[MODULOS-WIZARD] Não há config existente');
            return;
        }

        const data = await response.json();

        if (data.sucesso && data.config) {
            state.configAtual = data.config;
            console.log('[MODULOS-WIZARD] 📋 Config existente carregada');
        }

    } catch (error) {
        console.warn('[MODULOS-WIZARD] Erro ao carregar config atual:', error);
    }
}

// ============================================================================
// RENDERIZAÇÃO DO WIZARD
// ============================================================================

/**
 * Renderiza todas as perguntas do wizard
 */
function renderizarWizard() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    if (!state.wizard?.perguntas || state.wizard.perguntas.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">Nenhuma pergunta configurada para este módulo.</p>';
        return;
    }

    state.wizard.perguntas.forEach((pergunta, index) => {
        const perguntaEl = criarPerguntaElement(pergunta, index);
        container.appendChild(perguntaEl);
    });

    console.log(`[MODULOS-WIZARD] ✅ ${state.wizard.perguntas.length} perguntas renderizadas`);

    // Configurar lógica condicional
    setupCondicionalLogic();
}

/**
 * Cria elemento HTML para uma pergunta
 */
function criarPerguntaElement(pergunta, index) {
    const div = document.createElement('div');
    div.className = 'bg-gray-800 rounded-lg p-6 border border-gray-700';
    div.dataset.perguntaId = pergunta.id;

    // Marcar perguntas condicionais
    if (pergunta.condicional) {
        div.dataset.condicional = JSON.stringify(pergunta.condicional);
        // Esconder inicialmente perguntas condicionais
        div.style.display = 'none';
    }

    // Header da pergunta
    const header = document.createElement('div');
    header.className = 'mb-4';

    const titulo = document.createElement('label');
    titulo.className = 'block text-lg font-semibold mb-2';
    titulo.htmlFor = `input-${pergunta.id}`;
    titulo.innerHTML = `
        <span class="text-green-500 russo-one">${index + 1}.</span>
        ${pergunta.label || pergunta.pergunta}
        ${pergunta.required !== false ? '<span class="text-red-500 ml-1">*</span>' : ''}
    `;
    header.appendChild(titulo);

    if (pergunta.descricao) {
        const desc = document.createElement('p');
        desc.className = 'text-sm text-gray-400';
        desc.textContent = pergunta.descricao;
        header.appendChild(desc);
    }

    div.appendChild(header);

    // Campo de input baseado no tipo
    const inputEl = criarInputElement(pergunta);
    div.appendChild(inputEl);

    // Valor padrão da config existente
    if (state.configAtual?.wizard_respostas?.[pergunta.id] !== undefined) {
        const valorExistente = state.configAtual.wizard_respostas[pergunta.id];
        const input = inputEl.querySelector('input, select, textarea');
        if (input) {
            input.value = valorExistente;
        }
    } else if (pergunta.default !== undefined || pergunta.valor_padrao !== undefined) {
        const input = inputEl.querySelector('input, select, textarea');
        if (input) {
            input.value = pergunta.default || pergunta.valor_padrao;
        }
    }

    return div;
}

/**
 * Cria elemento de input baseado no tipo da pergunta
 */
function criarInputElement(pergunta) {
    const wrapper = document.createElement('div');

    switch (pergunta.tipo) {
        case 'number':
        case 'numero':
            wrapper.innerHTML = `
                <input
                    type="number"
                    id="input-${pergunta.id}"
                    name="${pergunta.id}"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent jetbrains-mono text-lg"
                    ${pergunta.min !== undefined ? `min="${pergunta.min}"` : ''}
                    ${pergunta.max !== undefined ? `max="${pergunta.max}"` : ''}
                    ${pergunta.step !== undefined ? `step="${pergunta.step}"` : ''}
                    ${pergunta.required !== false ? 'required' : ''}
                    placeholder="${pergunta.placeholder || ''}"
                >
            `;
            break;

        case 'decimal':
            wrapper.innerHTML = `
                <input
                    type="number"
                    id="input-${pergunta.id}"
                    name="${pergunta.id}"
                    step="0.01"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent jetbrains-mono text-lg"
                    ${pergunta.min !== undefined ? `min="${pergunta.min}"` : ''}
                    ${pergunta.max !== undefined ? `max="${pergunta.max}"` : ''}
                    ${pergunta.required !== false ? 'required' : ''}
                    placeholder="${pergunta.placeholder || ''}"
                >
            `;
            break;

        case 'select':
        case 'escolha':
            const opcoes = pergunta.opcoes || [];
            const opcoesHtml = opcoes.map(op => {
                const valor = typeof op === 'object' ? (op.value || op.valor) : op;
                const rotulo = typeof op === 'object' ? (op.label || op.rotulo) : op;
                return `<option value="${valor}">${rotulo}</option>`;
            }).join('');

            wrapper.innerHTML = `
                <select
                    id="input-${pergunta.id}"
                    name="${pergunta.id}"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    ${pergunta.required !== false ? 'required' : ''}
                >
                    <option value="">Selecione...</option>
                    ${opcoesHtml}
                </select>
            `;
            break;

        case 'text':
        case 'texto':
            wrapper.innerHTML = `
                <input
                    type="text"
                    id="input-${pergunta.id}"
                    name="${pergunta.id}"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    ${pergunta.required !== false ? 'required' : ''}
                    placeholder="${pergunta.placeholder || ''}"
                >
            `;
            break;

        case 'boolean':
        case 'booleano':
            wrapper.innerHTML = `
                <label class="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        id="input-${pergunta.id}"
                        name="${pergunta.id}"
                        class="w-6 h-6 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-green-500 text-green-600"
                    >
                    <span class="text-gray-300">${pergunta.descricao_checkbox || 'Ativar'}</span>
                </label>
            `;
            break;

        default:
            wrapper.innerHTML = `
                <input
                    type="text"
                    id="input-${pergunta.id}"
                    name="${pergunta.id}"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="${pergunta.placeholder || ''}"
                >
            `;
    }

    // Helper text
    if (pergunta.helper) {
        const helper = document.createElement('p');
        helper.className = 'mt-2 text-xs text-gray-500';
        helper.textContent = pergunta.helper;
        wrapper.appendChild(helper);
    }

    return wrapper;
}

// ============================================================================
// SUBMISSÃO DO FORMULÁRIO
// ============================================================================

/**
 * Configura listener de submit do form
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('config-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

/**
 * Manipula submissão do formulário
 */
async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Salvando...';

        // Coletar respostas
        const respostas = coletarRespostas();

        console.log('[MODULOS-WIZARD] 📤 Enviando respostas:', respostas);

        // Salvar configuração
        await salvarConfiguracao(respostas);

        // Mostrar sucesso
        esconderElemento('wizard-container');
        mostrarElemento('success-message');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('[MODULOS-WIZARD] Erro ao salvar:', error);
        alert(`❌ Erro ao salvar configuração:\n\n${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Coleta todas as respostas do formulário
 */
function coletarRespostas() {
    const respostas = {};
    const form = document.getElementById('config-form');
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        const perguntaId = input.name;
        if (!perguntaId) return;

        if (input.type === 'checkbox') {
            respostas[perguntaId] = input.checked;
        } else if (input.type === 'number') {
            respostas[perguntaId] = input.value ? Number(input.value) : null;
        } else {
            respostas[perguntaId] = input.value || null;
        }
    });

    return respostas;
}

/**
 * Salva configuração via API
 */
async function salvarConfiguracao(respostas) {
    const url = `/api/liga/${state.ligaId}/modulos/${state.moduloId}/ativar`;

    const body = {
        wizard_respostas: respostas
    };

    if (state.temporada) {
        body.temporada = state.temporada;
    }

    console.log('[MODULOS-WIZARD] 🌐 POST', url, body);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.erro || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao salvar configuração');
    }

    console.log('[MODULOS-WIZARD] ✅ Configuração salva com sucesso!');
    return data;
}

// ============================================================================
// LÓGICA CONDICIONAL
// ============================================================================

/**
 * Configura lógica para mostrar/esconder perguntas condicionais
 */
function setupCondicionalLogic() {
    const container = document.getElementById('questions-container');
    if (!container) return;

    console.log('[MODULOS-WIZARD] 🔗 Configurando lógica condicional');

    // Verificar estado inicial
    atualizarPerguntasCondicionais();

    // Listener para mudanças
    container.addEventListener('change', (e) => {
        const input = e.target;
        const perguntaId = input.name;

        console.log(`[MODULOS-WIZARD] 📝 Mudança detectada: ${perguntaId} = ${input.value}`);
        atualizarPerguntasCondicionais();
    });
}

/**
 * Atualiza visibilidade de perguntas condicionais
 */
function atualizarPerguntasCondicionais() {
    const container = document.getElementById('questions-container');
    if (!container) return;

    const todasPerguntas = container.querySelectorAll('[data-condicional]');

    todasPerguntas.forEach(div => {
        try {
            const condicional = JSON.parse(div.dataset.condicional);
            const campoInput = container.querySelector(`[name="${condicional.campo}"]`);

            if (!campoInput) {
                console.warn(`[MODULOS-WIZARD] Campo de controle não encontrado: ${condicional.campo}`);
                return;
            }

            const valorAtual = campoInput.value;
            const valorEsperado = String(condicional.valor);

            if (valorAtual === valorEsperado) {
                // Mostrar pergunta
                div.style.display = 'block';
                console.log(`[MODULOS-WIZARD] ✅ Mostrando: ${div.dataset.perguntaId} (${condicional.campo} === ${valorEsperado})`);
            } else {
                // Esconder e limpar
                div.style.display = 'none';
                const innerInput = div.querySelector('input, select, textarea');
                if (innerInput && innerInput.value) {
                    innerInput.value = '';
                    console.log(`[MODULOS-WIZARD] ❌ Escondendo: ${div.dataset.perguntaId}`);
                }
            }
        } catch (error) {
            console.error('[MODULOS-WIZARD] Erro ao processar condicional:', error);
        }
    });
}

// ============================================================================
// UTILITÁRIOS UI
// ============================================================================

function mostrarElemento(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function esconderElemento(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function mostrarErro(mensagem) {
    esconderElemento('loading');
    esconderElemento('wizard-container');

    const errorEl = document.getElementById('error');
    const errorMsgEl = document.getElementById('error-message');

    errorMsgEl.textContent = mensagem;
    mostrarElemento('error');
}

// ============================================================================
// INICIAR AO CARREGAR PÁGINA
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}

console.log('[MODULOS-WIZARD] ✅ Script carregado');
