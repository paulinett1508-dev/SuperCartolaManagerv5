// =====================================================================
// PARTICIPANTE-CARTOLA-PRO.JS - v2.0 (OAuth + Interface 4 Abas)
// =====================================================================
// ⚠️ RECURSO PREMIUM: Integração OAuth com API Globo
// =====================================================================
// ✅ v2.2: Deteccao automatica de dominio
//          - OAuth disponivel apenas em dominios registrados (replit.dev, localhost)
//          - Dominios customizados vao direto para login email/senha
//          - Interface com 4 abas: Sugerido | Escalar | Nao Escalaram | Meu Time
// =====================================================================

if (window.Log) Log.info("CARTOLA-PRO", "🔄 Carregando módulo v2.0...");

// Estado do módulo
let globoAutenticado = false;
let globoEmail = null;
let abaAtiva = 'sugerido'; // sugerido | escalar | nao-escalaram | meu-time
let dadosTimeSugerido = null;
let dadosMeuTime = null;
let dadosNaoEscalaram = null;
let atletasMercado = [];
let atletasSelecionados = [];
let capitaoId = null;
let esquemaSelecionado = 3; // 4-3-3 padrão
let patrimonioDisponivel = 0;

const ESQUEMAS = {
    1: '3-4-3', 2: '3-5-2', 3: '4-3-3', 4: '4-4-2',
    5: '4-5-1', 6: '5-3-2', 7: '5-4-1'
};

// =====================================================================
// DETECCAO DE DISPONIBILIDADE OAUTH
// =====================================================================
// OAuth so funciona em dominios registrados no client Globo
// Dominios customizados (ex: supercartolamanager.com.br) NAO funcionam
function isOAuthDisponivel() {
    const hostname = window.location.hostname;

    // Dominios onde OAuth funciona (registrados na Globo)
    const dominiosPermitidos = [
        'localhost',
        '127.0.0.1',
        '.replit.dev',      // Replit preview
        '.repl.co',         // Replit antigo
        '.replit.app'       // Replit apps
    ];

    return dominiosPermitidos.some(d => {
        if (d.startsWith('.')) {
            return hostname.endsWith(d);
        }
        return hostname === d;
    });
}

// =====================================================================
// FUNCAO PRINCIPAL: Abrir Modal
// =====================================================================
export async function abrirModal() {
    if (window.Log) Log.info("CARTOLA-PRO", "📱 Abrindo modal...");

    // Remover modal existente
    const existente = document.getElementById('cartola-pro-modal');
    if (existente) existente.remove();

    // Mostrar loading enquanto verifica status
    mostrarLoading();

    // Verificar se está autenticado na Globo
    try {
        const response = await fetch('/api/cartola-pro/oauth/status', {
            credentials: 'include'
        });
        const data = await response.json();

        globoAutenticado = data.authenticated === true;
        globoEmail = data.email || null;

        if (globoAutenticado) {
            // Já autenticado: mostrar interface com abas
            mostrarInterfaceAbas();
        } else {
            // Não autenticado: mostrar tela de conexão OAuth
            mostrarTelaConexao();
        }
    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao verificar status:', error);
        mostrarTelaConexao();
    }
}

// =====================================================================
// MOSTRAR LOADING
// =====================================================================
function mostrarLoading() {
    const modal = document.createElement('div');
    modal.id = 'cartola-pro-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-lg mx-4 bg-[var(--app-surface)] rounded-3xl border border-white/10 max-h-[80vh] flex items-center justify-center py-20">
            <div class="flex flex-col items-center">
                <div class="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <p class="text-sm text-white/50">Verificando conexão...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// =====================================================================
// TELA DE CONEXAO - Detecta automaticamente se OAuth disponivel
// =====================================================================
function mostrarTelaConexao() {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    const oauthDisponivel = isOAuthDisponivel();

    // Se OAuth nao disponivel, ir direto para formulario email/senha
    if (!oauthDisponivel) {
        mostrarFormularioEmail();
        return;
    }

    // OAuth disponivel: mostrar tela com opcoes
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg mx-4 bg-[var(--app-surface)] rounded-3xl border border-white/10 max-h-[80vh] overflow-y-auto animate-slide-up">
            <!-- Header -->
            <div class="sticky top-0 bg-[var(--app-surface)] rounded-t-3xl px-4 py-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, rgba(234,179,8,0.2), rgba(249,115,22,0.2));">
                        <span class="material-icons text-yellow-400">sports_soccer</span>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Cartola PRO
                        </h2>
                        <p class="text-xs text-white/50">Conecte sua conta Globo</p>
                    </div>
                </div>
                <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                    <span class="material-icons text-white/50">close</span>
                </button>
            </div>

            <!-- Conteudo -->
            <div class="p-4 space-y-4">
                <!-- Aviso Integracao -->
                <div class="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div class="flex items-start gap-3">
                        <span class="material-icons text-yellow-400">warning</span>
                        <div>
                            <p class="text-sm font-medium text-yellow-300">Integracao Nao-Oficial</p>
                            <p class="text-xs text-white/60 mt-1">
                                Suas credenciais sao usadas apenas para autenticar na API da Globo e NAO sao armazenadas.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- BOTAO PRINCIPAL: OAuth -->
                <button onclick="window.CartolaProModule.iniciarOAuth()"
                        class="w-full py-4 rounded-xl text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style="background: linear-gradient(135deg, var(--app-warning), var(--app-pos-gol));">
                    <span class="material-icons">login</span>
                    Conectar com Globo
                </button>

                <!-- Divisor -->
                <div class="flex items-center gap-3 py-2">
                    <div class="flex-1 h-px bg-white/10"></div>
                    <span class="text-xs text-white/30">ou</span>
                    <div class="flex-1 h-px bg-white/10"></div>
                </div>

                <!-- Link para login direto -->
                <button onclick="window.CartolaProModule.mostrarFormularioEmail()"
                        class="w-full text-center text-sm text-white/50 hover:text-white/70 transition-colors">
                    Usar email e senha (contas antigas)
                </button>

                <!-- Aviso sobre contas Google -->
                <div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div class="flex items-start gap-3">
                        <span class="material-icons text-blue-400 text-sm">info</span>
                        <p class="text-xs text-white/50">
                            <strong class="text-blue-300">Contas Google/Facebook:</strong> Se sua conta Globo foi criada via Google ou Facebook, use o botao "Conectar com Globo" acima.
                        </p>
                    </div>
                </div>

                <!-- Recursos disponiveis -->
                <div class="pt-2 border-t border-white/10">
                    <p class="text-xs text-white/40 mb-2">Recursos disponiveis:</p>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-green-400 text-sm">lightbulb</span>
                            Sugestoes
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-yellow-400 text-sm">edit</span>
                            Escalar
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-purple-400 text-sm">groups</span>
                            Nao Escalaram
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-blue-400 text-sm">visibility</span>
                            Meu Time
                        </div>
                    </div>
                </div>
            </div>

            <div class="h-4"></div>
        </div>
    `;
}

// =====================================================================
// FORMULARIO EMAIL/SENHA (FALLBACK ou UNICA OPCAO)
// =====================================================================
function mostrarFormularioEmail() {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    const oauthDisponivel = isOAuthDisponivel();

    // Header diferente: com botao voltar (se OAuth disponivel) ou sem (se unica opcao)
    const headerHTML = oauthDisponivel ? `
        <!-- Header com Voltar -->
        <div class="sticky top-0 bg-[var(--app-surface)] rounded-t-3xl px-4 py-4 border-b border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <button onclick="window.CartolaProModule.voltarTelaConexao()" class="p-2 -ml-2 rounded-full hover:bg-white/10">
                    <span class="material-icons text-white/50">arrow_back</span>
                </button>
                <div>
                    <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                        Login Direto
                    </h2>
                    <p class="text-xs text-white/50">Email e senha da conta Globo</p>
                </div>
            </div>
            <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                <span class="material-icons text-white/50">close</span>
            </button>
        </div>
    ` : `
        <!-- Header sem Voltar (unica opcao de login) -->
        <div class="sticky top-0 bg-[var(--app-surface)] rounded-t-3xl px-4 py-4 border-b border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, rgba(234,179,8,0.2), rgba(249,115,22,0.2));">
                    <span class="material-icons text-yellow-400">sports_soccer</span>
                </div>
                <div>
                    <h2 class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                        Cartola PRO
                    </h2>
                    <p class="text-xs text-white/50">Conecte sua conta Globo</p>
                </div>
            </div>
            <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                <span class="material-icons text-white/50">close</span>
            </button>
        </div>
    `;

    // Aviso diferente baseado no contexto
    const avisoHTML = oauthDisponivel ? `
        <!-- Aviso para contas antigas -->
        <div class="mx-4 mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <div class="flex items-start gap-3">
                <span class="material-icons text-orange-400">info</span>
                <div>
                    <p class="text-sm font-medium text-orange-300">Contas Antigas</p>
                    <p class="text-xs text-white/60 mt-1">
                        Este metodo funciona apenas para contas criadas diretamente na Globo (nao via Google/Facebook).
                    </p>
                </div>
            </div>
        </div>
    ` : `
        <!-- Aviso integracao nao-oficial -->
        <div class="mx-4 mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div class="flex items-start gap-3">
                <span class="material-icons text-yellow-400">warning</span>
                <div>
                    <p class="text-sm font-medium text-yellow-300">Integracao Nao-Oficial</p>
                    <p class="text-xs text-white/60 mt-1">
                        Suas credenciais sao usadas apenas para autenticar na API da Globo e NAO sao armazenadas.
                    </p>
                </div>
            </div>
        </div>
    `;

    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg mx-4 bg-[var(--app-surface)] rounded-3xl border border-white/10 max-h-[80vh] overflow-y-auto animate-slide-up">
            ${headerHTML}
            ${avisoHTML}

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
                           placeholder="********">
                </div>

                <!-- Checkbox Aceite -->
                <label class="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700 cursor-pointer">
                    <input type="checkbox" id="pro-aceite" class="mt-1 accent-yellow-500">
                    <span class="text-xs text-white/60">
                        Entendo que esta e uma integracao nao-oficial e que o uso e de minha responsabilidade.
                    </span>
                </label>

                <!-- Botao Login -->
                <button onclick="window.CartolaProModule.fazerLogin()" id="pro-btn-login"
                        class="w-full py-4 rounded-xl text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style="background: linear-gradient(135deg, var(--app-warning), var(--app-pos-gol));">
                    <span class="material-icons">login</span>
                    Conectar
                </button>

                <!-- Mensagem de erro -->
                <div id="pro-erro" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"></div>

                <!-- Recursos disponiveis (so mostra se OAuth nao disponivel) -->
                ${!oauthDisponivel ? `
                <div class="pt-2 border-t border-white/10">
                    <p class="text-xs text-white/40 mb-2">Recursos disponiveis:</p>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-green-400 text-sm">lightbulb</span>
                            Sugestoes
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-yellow-400 text-sm">edit</span>
                            Escalar
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-purple-400 text-sm">groups</span>
                            Nao Escalaram
                        </div>
                        <div class="flex items-center gap-2 text-xs text-white/60">
                            <span class="material-icons text-blue-400 text-sm">visibility</span>
                            Meu Time
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="h-4"></div>
        </div>
    `;
}

// Voltar para tela de conexao principal
function voltarTelaConexao() {
    mostrarTelaConexao();
}

// =====================================================================
// FAZER LOGIN DIRETO
// =====================================================================
export async function fazerLogin() {
    const email = document.getElementById('pro-email')?.value;
    const senha = document.getElementById('pro-senha')?.value;
    const aceite = document.getElementById('pro-aceite')?.checked;
    const btnLogin = document.getElementById('pro-btn-login');
    const erroDiv = document.getElementById('pro-erro');

    // Validações
    if (!email || !senha) {
        mostrarErroLogin('Preencha email e senha');
        return;
    }

    if (!aceite) {
        mostrarErroLogin('Aceite os termos para continuar');
        return;
    }

    // Loading
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<div class="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>';
    erroDiv?.classList.add('hidden');

    try {
        const response = await fetch('/api/cartola-pro/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password: senha })
        });

        const data = await response.json();

        if (!data.success) {
            mostrarErroLogin(data.error || 'Erro ao autenticar');
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<span class="material-icons">login</span> Conectar';
            return;
        }

        // Salvar estado
        globoAutenticado = true;
        globoEmail = email;

        if (window.Log) Log.info("CARTOLA-PRO", "✅ Login bem-sucedido");

        // Ir para interface com abas
        mostrarInterfaceAbas();

    } catch (error) {
        console.error('[CARTOLA-PRO] Erro no login:', error);
        mostrarErroLogin('Erro de conexão. Tente novamente.');
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<span class="material-icons">login</span> Conectar';
    }
}

function mostrarErroLogin(msg) {
    const erroDiv = document.getElementById('pro-erro');
    if (erroDiv) {
        erroDiv.textContent = msg;
        erroDiv.classList.remove('hidden');
    }
}

// =====================================================================
// INICIAR FLUXO OAUTH (mantido como fallback)
// =====================================================================
export function iniciarOAuth() {
    if (window.Log) Log.info("CARTOLA-PRO", "🔄 Iniciando OAuth...");

    // Redirecionar para rota OAuth
    window.location.href = '/api/cartola-pro/oauth/login';
}

// =====================================================================
// INTERFACE COM 4 ABAS
// =====================================================================
async function mostrarInterfaceAbas() {
    const modal = document.getElementById('cartola-pro-modal');
    if (!modal) return;

    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="window.CartolaProModule.fecharModal()"></div>
        <div class="relative w-full max-w-lg mx-4 bg-[var(--app-surface)] rounded-3xl border border-white/10 max-h-[75vh] overflow-hidden flex flex-col animate-slide-up">
            <!-- Header -->
            <div class="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, rgba(234,179,8,0.2), rgba(249,115,22,0.2));">
                        <span class="material-icons text-yellow-400 text-lg">sports_soccer</span>
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-white" style="font-family: 'Russo One', sans-serif;">
                            Cartola PRO
                        </h2>
                        <p class="text-[10px] text-white/50">${globoEmail || 'Conectado'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.CartolaProModule.desconectar()" class="p-2 rounded-full hover:bg-white/10" title="Desconectar">
                        <span class="material-icons text-white/50 text-sm">logout</span>
                    </button>
                    <button onclick="window.CartolaProModule.fecharModal()" class="p-2 rounded-full hover:bg-white/10">
                        <span class="material-icons text-white/50">close</span>
                    </button>
                </div>
            </div>

            <!-- Abas -->
            <div class="flex-shrink-0 px-2 pt-2 border-b border-white/10">
                <div class="flex gap-1 overflow-x-auto pb-2 hide-scrollbar">
                    <button onclick="window.CartolaProModule.trocarAba('sugerido')"
                            class="aba-btn flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${abaAtiva === 'sugerido' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'text-white/50 hover:bg-white/5'}">
                        <span class="material-icons text-sm mr-1 align-middle">lightbulb</span>
                        Sugerido
                    </button>
                    <button onclick="window.CartolaProModule.trocarAba('escalar')"
                            class="aba-btn flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${abaAtiva === 'escalar' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'text-white/50 hover:bg-white/5'}">
                        <span class="material-icons text-sm mr-1 align-middle">edit</span>
                        Escalar
                    </button>
                    <button onclick="window.CartolaProModule.trocarAba('nao-escalaram')"
                            class="aba-btn flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${abaAtiva === 'nao-escalaram' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'text-white/50 hover:bg-white/5'}">
                        <span class="material-icons text-sm mr-1 align-middle">group_off</span>
                        Não Escalaram
                    </button>
                    <button onclick="window.CartolaProModule.trocarAba('meu-time')"
                            class="aba-btn flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${abaAtiva === 'meu-time' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'text-white/50 hover:bg-white/5'}">
                        <span class="material-icons text-sm mr-1 align-middle">shield</span>
                        Meu Time
                    </button>
                </div>
            </div>

            <!-- Conteúdo da Aba -->
            <div id="cartola-pro-conteudo" class="flex-1 overflow-y-auto">
                <div class="flex items-center justify-center py-16">
                    <div class="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                </div>
            </div>
        </div>
    `;

    // Carregar conteúdo da aba ativa
    await carregarConteudoAba(abaAtiva);
}

// =====================================================================
// TROCAR ABA
// =====================================================================
export async function trocarAba(aba) {
    abaAtiva = aba;

    // Atualizar visual das abas
    document.querySelectorAll('.aba-btn').forEach(btn => {
        const abaBtn = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (abaBtn === aba) {
            btn.className = 'aba-btn flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-yellow-500/20 text-yellow-400 border border-yellow-500/40';
        } else {
            btn.className = 'aba-btn flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all text-white/50 hover:bg-white/5';
        }
    });

    await carregarConteudoAba(aba);
}

// =====================================================================
// CARREGAR CONTEÚDO DA ABA
// =====================================================================
async function carregarConteudoAba(aba) {
    const container = document.getElementById('cartola-pro-conteudo');
    if (!container) return;

    // Mostrar loading
    container.innerHTML = `
        <div class="flex items-center justify-center py-16">
            <div class="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
        </div>
    `;

    try {
        switch (aba) {
            case 'sugerido':
                await carregarTimeSugerido(container);
                break;
            case 'escalar':
                await carregarEscalar(container);
                break;
            case 'nao-escalaram':
                await carregarNaoEscalaram(container);
                break;
            case 'meu-time':
                await carregarMeuTime(container);
                break;
        }
    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao carregar aba:', error);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4">
                <span class="material-icons text-4xl text-red-400 mb-2">error</span>
                <p class="text-sm text-white/70 text-center">${error.message || 'Erro ao carregar dados'}</p>
                <button onclick="window.CartolaProModule.trocarAba('${aba}')"
                        class="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm">
                    Tentar novamente
                </button>
            </div>
        `;
    }
}

// =====================================================================
// ABA: TIME SUGERIDO
// =====================================================================
async function carregarTimeSugerido(container) {
    const response = await fetch(`/api/cartola-pro/sugestao?esquema=${esquemaSelecionado}&patrimonio=${patrimonioDisponivel || 100}`, {
        credentials: 'include'
    });
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar sugestão');
    }

    dadosTimeSugerido = data;

    const atletas = data.atletas || [];
    const totalPreco = data.totalPreco || 0;

    container.innerHTML = `
        <div class="p-4 space-y-4">
            <!-- Info -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                    <p class="text-xs text-white/50">Formação</p>
                    <p class="text-sm font-bold text-white">${data.esquema || '4-3-3'}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-white/50">Custo Total</p>
                    <p class="text-sm font-bold text-green-400">C$ ${totalPreco.toFixed(2)}</p>
                </div>
            </div>

            <!-- Botão Colar -->
            <button onclick="window.CartolaProModule.colarTimeSugerido()"
                    class="w-full py-3 rounded-xl border border-yellow-500/40 text-yellow-400 font-medium flex items-center justify-center gap-2 hover:bg-yellow-500/10 transition-all">
                <span class="material-icons text-sm">content_paste</span>
                Colar na Aba "Escalar"
            </button>

            <!-- Lista de Atletas -->
            <div class="space-y-2">
                ${atletas.map(atleta => renderizarCardAtletaSugerido(atleta, atleta.atletaId === data.capitaoSugerido)).join('')}
            </div>

            <!-- Algoritmo -->
            <p class="text-[10px] text-white/30 text-center">
                Algoritmo: ${data.algoritmo || 'custo-beneficio-v1'}
            </p>
        </div>
    `;
}

function renderizarCardAtletaSugerido(atleta, isCapitao) {
    return `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 ${isCapitao ? 'border border-yellow-500/40' : ''}">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                ${atleta.foto ? `<img src="${atleta.foto}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'material-icons text-white/30\\'>person</span>'">` : '<span class="material-icons text-white/30">person</span>'}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-white truncate">${atleta.nome}</p>
                    ${isCapitao ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">C</span>' : ''}
                </div>
                <p class="text-xs text-white/50">${atleta.posicaoAbreviacao || atleta.posicao} • ${atleta.clubeAbreviacao || atleta.clube}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold text-white">${atleta.media?.toFixed(1) || '0.0'}</p>
                <p class="text-[10px] text-white/40">C$ ${atleta.preco?.toFixed(2) || '0.00'}</p>
            </div>
        </div>
    `;
}

// =====================================================================
// ABA: ESCALAR TIME
// =====================================================================
async function carregarEscalar(container) {
    container.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="p-8 rounded-xl bg-white/5 border border-dashed border-white/20 text-center">
                <span class="material-icons text-4xl text-white/20 mb-2">construction</span>
                <p class="text-sm text-white/50">Em desenvolvimento</p>
                <p class="text-xs text-white/30 mt-1">Seletor de escalação em breve</p>
            </div>

            <div class="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div class="flex items-start gap-3">
                    <span class="material-icons text-yellow-400">tips_and_updates</span>
                    <div>
                        <p class="text-sm font-medium text-yellow-300">Dica</p>
                        <p class="text-xs text-white/60">
                            Use a aba "Sugerido" e clique em "Colar" para facilitar sua escalação.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================================
// ABA: NÃO ESCALARAM
// =====================================================================
async function carregarNaoEscalaram(container) {
    const response = await fetch('/api/cartola-pro/nao-escalaram', {
        credentials: 'include'
    });
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar dados');
    }

    dadosNaoEscalaram = data;

    const naoEscalaram = data.naoEscalaram || [];
    const escalaram = data.escalaram || [];

    container.innerHTML = `
        <div class="p-4 space-y-4">
            <!-- Resumo -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                    <p class="text-xs text-white/50">Rodada ${data.rodada || '--'}</p>
                    <p class="text-sm font-bold text-white">${data.total || 0} participantes</p>
                </div>
                <div class="flex gap-4">
                    <div class="text-center">
                        <p class="text-lg font-bold text-green-400">${escalaram.length}</p>
                        <p class="text-[10px] text-white/40">escalaram</p>
                    </div>
                    <div class="text-center">
                        <p class="text-lg font-bold text-red-400">${naoEscalaram.length}</p>
                        <p class="text-[10px] text-white/40">pendente</p>
                    </div>
                </div>
            </div>

            <!-- Lista -->
            ${naoEscalaram.length > 0 ? `
                <div>
                    <p class="text-xs font-medium text-white/50 mb-2 uppercase">Não Escalaram</p>
                    <div class="space-y-2">
                        ${naoEscalaram.map(p => `
                            <div class="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                    ${p.clube_id ? `<img src="/escudos/${p.clube_id}.png" onerror="this.src='/escudos/default.png'" class="w-5 h-5">` : '<span class="material-icons text-white/30 text-sm">person</span>'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-white truncate">${p.nome_time || 'Time'}</p>
                                    <p class="text-xs text-white/50">${p.nome_cartola || ''}</p>
                                </div>
                                <span class="material-icons text-red-400 text-sm">schedule</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : `
                <div class="text-center py-8">
                    <span class="material-icons text-4xl text-green-400 mb-2">check_circle</span>
                    <p class="text-sm text-white/70">Todos escalaram!</p>
                </div>
            `}

            ${escalaram.length > 0 ? `
                <div>
                    <p class="text-xs font-medium text-white/50 mb-2 uppercase">Já Escalaram</p>
                    <div class="space-y-1">
                        ${escalaram.slice(0, 5).map(p => `
                            <div class="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                                <span class="material-icons text-green-400 text-sm">check</span>
                                <span class="text-xs text-white/70 truncate">${p.nome_time || p.nome_cartola}</span>
                            </div>
                        `).join('')}
                        ${escalaram.length > 5 ? `<p class="text-xs text-white/30 text-center">+${escalaram.length - 5} outros</p>` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// =====================================================================
// ABA: MEU TIME
// =====================================================================
async function carregarMeuTime(container) {
    const response = await fetch('/api/cartola-pro/meu-time', {
        credentials: 'include'
    });
    const data = await response.json();

    if (!data.success) {
        if (data.needsGloboAuth) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 px-4">
                    <span class="material-icons text-4xl text-yellow-400 mb-2">account_circle</span>
                    <p class="text-sm text-white/70 text-center">Reconecte sua conta Globo</p>
                    <button onclick="window.CartolaProModule.iniciarOAuth()"
                            class="mt-4 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm">
                        Reconectar
                    </button>
                </div>
            `;
            return;
        }
        throw new Error(data.error || 'Erro ao buscar time');
    }

    dadosMeuTime = data;
    const time = data.time || {};
    const atletas = data.atletas || [];

    container.innerHTML = `
        <div class="p-4 space-y-4">
            <!-- Info do Time -->
            <div class="p-4 rounded-xl bg-white/5 text-center">
                <p class="text-lg font-bold text-white" style="font-family: 'Russo One', sans-serif;">${time.nome || 'Meu Time'}</p>
                <p class="text-xs text-white/50">${time.nomeCartola || ''}</p>
                <div class="flex items-center justify-center gap-4 mt-3">
                    <div>
                        <p class="text-2xl font-bold text-yellow-400">${data.pontosParciais?.toFixed(1) || '0.0'}</p>
                        <p class="text-[10px] text-white/40">parcial</p>
                    </div>
                    <div class="w-px h-8 bg-white/10"></div>
                    <div>
                        <p class="text-sm font-medium text-white">C$ ${time.patrimonio?.toFixed(2) || '0.00'}</p>
                        <p class="text-[10px] text-white/40">patrimônio</p>
                    </div>
                </div>
            </div>

            <!-- Escalação -->
            ${atletas.length > 0 ? `
                <div class="space-y-2">
                    ${atletas.map(atleta => `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 ${atleta.capitao ? 'border border-yellow-500/40' : ''}">
                            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                ${atleta.foto ? `<img src="${atleta.foto}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'material-icons text-white/30\\'>person</span>'">` : '<span class="material-icons text-white/30">person</span>'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <p class="text-sm font-medium text-white truncate">${atleta.nome}</p>
                                    ${atleta.capitao ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">C</span>' : ''}
                                </div>
                                <p class="text-xs text-white/50">${atleta.posicao} • ${atleta.clubeAbreviacao || atleta.clube}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-bold ${atleta.pontosRodada >= 0 ? 'text-green-400' : 'text-red-400'}">${atleta.pontosRodada?.toFixed(1) || '0.0'}</p>
                                <p class="text-[10px] text-white/40">pts</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="text-center py-8">
                    <span class="material-icons text-4xl text-white/20 mb-2">sports_soccer</span>
                    <p class="text-sm text-white/50">Nenhum atleta escalado</p>
                </div>
            `}
        </div>
    `;
}

// =====================================================================
// COLAR TIME SUGERIDO
// =====================================================================
export function colarTimeSugerido() {
    if (!dadosTimeSugerido || !dadosTimeSugerido.atletas) {
        SuperModal.toast.warning('Carregue a sugestão primeiro');
        return;
    }

    atletasSelecionados = dadosTimeSugerido.atletas.map(a => a.atletaId);
    capitaoId = dadosTimeSugerido.capitaoSugerido;
    esquemaSelecionado = parseInt(dadosTimeSugerido.esquema?.split('-')[0]) || 3;

    // Ir para aba escalar
    trocarAba('escalar');

    if (window.Log) Log.info("CARTOLA-PRO", "📋 Time sugerido colado!");
}

// =====================================================================
// DESCONECTAR
// =====================================================================
export async function desconectar() {
    try {
        await fetch('/api/cartola-pro/oauth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        globoAutenticado = false;
        globoEmail = null;

        mostrarTelaConexao();

        if (window.Log) Log.info("CARTOLA-PRO", "🔓 Desconectado da Globo");
    } catch (error) {
        console.error('[CARTOLA-PRO] Erro ao desconectar:', error);
    }
}

// =====================================================================
// FECHAR MODAL
// =====================================================================
export function fecharModal() {
    const modal = document.getElementById('cartola-pro-modal');
    if (modal) modal.remove();
}

// =====================================================================
// EXPOR FUNCOES GLOBALMENTE
// =====================================================================
window.CartolaProModule = {
    abrirModal,
    fecharModal,
    iniciarOAuth,
    fazerLogin,
    trocarAba,
    colarTimeSugerido,
    desconectar,
    mostrarFormularioEmail,
    voltarTelaConexao
};

// Alias global para uso pelo botão na tela de início
window.abrirCartolaPro = abrirModal;

if (window.Log) Log.info("CARTOLA-PRO", "Modulo v2.2 carregado (OAuth auto-detect)");
