// =====================================================================
// PARTICIPANTE-CARTOLA-PRO.JS - v1.0 (Escalacao Automatica)
// =====================================================================
// ⚠️ RECURSO PREMIUM: Integracao OAuth com API Globo
// =====================================================================

if (window.Log) Log.info("CARTOLA-PRO", "🔄 Carregando modulo v1.0...");

// Estado do modulo
let glbToken = null;
let atletasMercado = [];
let atletasSelecionados = [];
let capitaoId = null;
let esquemaSelecionado = 3; // 4-3-3 padrao
let patrimonioDisponivel = 0;

const ESQUEMAS = {
    1: '3-4-3', 2: '3-5-2', 3: '4-3-3', 4: '4-4-2',
    5: '4-5-1', 6: '5-3-2', 7: '5-4-1'
};

// =====================================================================
// FUNCAO PRINCIPAL: Abrir Modal
// =====================================================================
export function abrirModal() {
    if (window.Log) Log.info("CARTOLA-PRO", "📱 Abrindo modal...");

    // Remover modal existente
    const existente = document.getElementById('cartola-pro-modal');
    if (existente) existente.remove();

    // Verificar se tem token salvo
    if (glbToken) {
        mostrarSeletorEscalacao();
    } else {
        mostrarLoginGlobo();
    }
}

// =====================================================================
// TELA 1: Login Globo
// =====================================================================
function mostrarLoginGlobo() {
    const modal = document.createElement('div');
    modal.id = 'cartola-pro-modal';
    modal.className = 'fixed inset-0 z-50 flex items-end justify-center';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[#1a1a1a] px-4 py-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span class="material-icons text-yellow-400">lock</span>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Login Globo
                        </h2>
                        <p class="text-xs text-white/50">Conecte sua conta Cartola FC</p>
                    </div>
                </div>
                <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                    <span class="material-icons text-white/50">close</span>
                </button>
            </div>

            <!-- Aviso de Seguranca -->
            <div class="mx-4 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div class="flex items-start gap-3">
                    <span class="material-icons text-red-400">warning</span>
                    <div>
                        <p class="text-sm font-medium text-red-300">Aviso Importante</p>
                        <p class="text-xs text-white/60 mt-1">
                            Esta e uma integracao NAO-OFICIAL. Suas credenciais serao usadas apenas para
                            autenticar na API da Globo e NAO serao armazenadas. O uso e por sua conta e risco.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Formulario -->
            <div class="p-4 space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-1">Email da Conta Globo</label>
                    <input type="email" id="pro-email"
                           class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                           placeholder="seu@email.com">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-1">Senha</label>
                    <input type="password" id="pro-senha"
                           class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                           placeholder="••••••••">
                </div>

                <!-- Checkbox Aceite -->
                <label class="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700 cursor-pointer">
                    <input type="checkbox" id="pro-aceite" class="mt-1 accent-yellow-500">
                    <span class="text-xs text-white/60">
                        Entendo que esta e uma integracao nao-oficial e que o uso e de minha responsabilidade.
                        O Super Cartola nao armazena minhas credenciais.
                    </span>
                </label>

                <!-- Botao Login -->
                <button onclick="window.CartolaProModule.fazerLogin()" id="pro-btn-login"
                        class="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-black font-bold flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-icons">login</span>
                    Conectar com Globo
                </button>

                <!-- Mensagem de erro -->
                <div id="pro-erro" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"></div>
            </div>

            <div class="h-8"></div>
        </div>
    `;

    document.body.appendChild(modal);
}

// =====================================================================
// FAZER LOGIN
// =====================================================================
export async function fazerLogin() {
    const email = document.getElementById('pro-email')?.value;
    const senha = document.getElementById('pro-senha')?.value;
    const aceite = document.getElementById('pro-aceite')?.checked;
    const btnLogin = document.getElementById('pro-btn-login');
    const erroDiv = document.getElementById('pro-erro');

    // Validacoes
    if (!email || !senha) {
        mostrarErro('Preencha email e senha');
        return;
    }

    if (!aceite) {
        mostrarErro('Aceite os termos para continuar');
        return;
    }

    // Loading
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<div class="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>';
    erroDiv.classList.add('hidden');

    try {
        const response = await fetch('/api/cartola-pro/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password: senha })
        });

        const data = await response.json();

        if (!data.success) {
            mostrarErro(data.error || 'Erro ao autenticar');
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<span class="material-icons">login</span> Conectar com Globo';
            return;
        }

        // Salvar token e ir para seletor
        glbToken = data.glbId;

        if (window.Log) Log.info("CARTOLA-PRO", "✅ Login bem-sucedido");

        mostrarSeletorEscalacao();

    } catch (error) {
        console.error('Erro no login:', error);
        mostrarErro('Erro de conexao. Tente novamente.');
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<span class="material-icons">login</span> Conectar com Globo';
    }
}

function mostrarErro(msg) {
    const erroDiv = document.getElementById('pro-erro');
    if (erroDiv) {
        erroDiv.textContent = msg;
        erroDiv.classList.remove('hidden');
    }
}

// =====================================================================
// TELA 2: Seletor de Escalacao
// =====================================================================
async function mostrarSeletorEscalacao() {
    const modal = document.getElementById('cartola-pro-modal');
    if (modal) modal.remove();

    // Criar novo modal com loading
    const novoModal = document.createElement('div');
    novoModal.id = 'cartola-pro-modal';
    novoModal.className = 'fixed inset-0 z-50 flex items-end justify-center';
    novoModal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 max-h-[90vh] flex items-center justify-center py-20">
            <div class="flex flex-col items-center">
                <div class="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <p class="text-sm text-white/50">Carregando mercado...</p>
            </div>
        </div>
    `;
    document.body.appendChild(novoModal);

    try {
        const response = await fetch('/api/cartola-pro/mercado', {
            headers: { 'X-GLB-Token': glbToken },
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.success) {
            if (data.sessaoExpirada) {
                glbToken = null;
                mostrarLoginGlobo();
                return;
            }
            throw new Error(data.error);
        }

        atletasMercado = data.atletas;
        patrimonioDisponivel = data.patrimonio;
        atletasSelecionados = [];
        capitaoId = null;

        renderizarSeletorCompleto(data);

    } catch (error) {
        console.error('Erro ao carregar mercado:', error);
        novoModal.remove();
        alert('Erro ao carregar mercado: ' + error.message);
    }
}

function renderizarSeletorCompleto(data) {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[#1a1a1a] px-4 py-3 border-b border-white/10 z-10">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <span class="material-icons text-yellow-400 text-lg">sports_soccer</span>
                        </div>
                        <h2 class="text-base font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Escalar Time
                        </h2>
                    </div>
                    <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                        <span class="material-icons text-white/50">close</span>
                    </button>
                </div>

                <!-- Patrimonio -->
                <div class="flex items-center justify-between mt-2 text-xs">
                    <span class="text-white/50">Patrimonio:</span>
                    <span class="text-green-400 font-bold" style="font-family: 'JetBrains Mono', monospace;">
                        C$ ${patrimonioDisponivel.toFixed(2)}
                    </span>
                </div>
            </div>

            <!-- Conteudo -->
            <div class="p-4">
                <p class="text-center text-white/50 text-sm mb-4">
                    Funcionalidade em desenvolvimento. Em breve voce podera escalar seu time aqui!
                </p>

                <!-- Botao Salvar (desabilitado por enquanto) -->
                <button disabled
                        class="w-full py-4 bg-gray-700 rounded-xl text-gray-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span class="material-icons">save</span>
                    Em Breve
                </button>
            </div>

            <div class="h-8"></div>
        </div>
    `;
}

// =====================================================================
// FUNCOES AUXILIARES
// =====================================================================
export function fecharModal() {
    const modal = document.getElementById('cartola-pro-modal');
    if (modal) modal.remove();
}

// Expor funcoes globalmente
window.CartolaProModule = {
    abrirModal,
    fecharModal,
    fazerLogin
};

if (window.Log) Log.info("CARTOLA-PRO", "✅ Modulo v1.0 carregado");
