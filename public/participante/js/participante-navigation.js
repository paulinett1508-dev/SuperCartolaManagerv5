// PARTICIPANTE NAVIGATION - Sistema de Navegação entre Módulos
console.log('[PARTICIPANTE-NAV] 🚀 Carregando sistema de navegação...');

class ParticipanteNavigation {
    constructor() {
        this.moduloAtual = 'boas-vindas';
        this.participanteData = null;
        this.modulosAtivos = {};
        this.modulos = {
            'boas-vindas': '/participante/fronts/boas-vindas.html',
            'extrato': '/participante/fronts/extrato.html',
            'ranking': '/participante/fronts/ranking.html',
            'rodadas': '/participante/fronts/rodadas.html',
            'top10': '/participante/fronts/top10.html',
            'melhor-mes': '/participante/fronts/melhor-mes.html',
            'pontos-corridos': '/participante/fronts/pontos-corridos.html',
            'mata-mata': '/participante/fronts/mata-mata.html',
            'artilheiro': '/participante/fronts/artilheiro.html',
            'luva-ouro': '/participante/fronts/luva-ouro.html'
        };
    }

    async inicializar() {
        console.log('[PARTICIPANTE-NAV] Inicializando navegação...');

        // Aguardar dados do participante
        await this.aguardarDadosParticipante();

        // Buscar módulos ativos da liga
        await this.carregarModulosAtivos();

        // Renderizar menu dinâmico
        this.renderizarMenuDinamico();

        // Configurar event listeners
        this.configurarEventListeners();

        // Navegar para módulo inicial
        await this.navegarPara('boas-vindas');
    }

    async aguardarDadosParticipante() {
        console.log('[PARTICIPANTE-NAV] Aguardando dados do participante...');

        // Tentar obter dados da sessão
        let tentativas = 0;
        const maxTentativas = 10; // Limite de tentativas para a comunicação API

        while (!this.participanteData && tentativas < maxTentativas) {
            try {
                const response = await fetch('/api/participante/auth/session', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated && data.participante) {
                        this.participanteData = {
                            timeId: data.participante.timeId,
                            ligaId: data.participante.ligaId,
                            nomeCartola: data.participante.participante?.nome_cartola || 'Participante',
                            nomeTime: data.participante.participante?.nome_time || 'Meu Time'
                        };
                        console.log('[PARTICIPANTE-NAV] ✅ Dados obtidos:', this.participanteData);
                        return;
                    }
                }
            } catch (error) {
                console.warn('[PARTICIPANTE-NAV] Tentativa', tentativas + 1, 'falhou:', error);
            }

            tentativas++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Espera de 200ms entre tentativas
        }

        if (!this.participanteData) {
            console.error('[PARTICIPANTE-NAV] ❌ Não foi possível obter dados do participante');
            window.location.href = '/participante-login.html'; // Redirecionar para login se falhar
        }
    }

    async carregarModulosAtivos() {
        console.log('[PARTICIPANTE-NAV] 🔍 Buscando configuração de módulos...');

        try {
            const response = await fetch(`/api/ligas/${this.participanteData.ligaId}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar configuração da liga');
            }

            const liga = await response.json();
            // ✅ USAR O CAMPO CORRETO: modulos_ativos
            this.modulosAtivos = liga.modulos_ativos || {};

            console.log('[PARTICIPANTE-NAV] 📋 Módulos ativos recebidos:', this.modulosAtivos);
        } catch (error) {
            console.error('[PARTICIPANTE-NAV] ❌ Erro ao buscar módulos:', error);
            // Módulos padrão se falhar ao buscar configuração
            this.modulosAtivos = {
                extrato: true,
                ranking: true,
                rodadas: true,
                top10: false,
                melhorMes: false,
                pontosCorridos: false,
                mataMata: false,
                artilheiro: false,
                luvaOuro: false
            };
        }
    }

    renderizarMenuDinamico() {
        const bottomNav = document.querySelector('.bottom-nav-modern');
        if (!bottomNav) {
            console.error('[PARTICIPANTE-NAV] ❌ Bottom nav não encontrado');
            return;
        }

        // Definir TODOS os módulos disponíveis com suas propriedades
        const todosModulosDisponiveis = [
            { id: 'boas-vindas', icon: '🏠', label: 'Início', config: 'extrato', base: true },
            { id: 'extrato', icon: '💰', label: 'Extrato', config: 'extrato', base: true },
            { id: 'ranking', icon: '📊', label: 'Ranking', config: 'ranking', base: true },
            { id: 'rodadas', icon: '🎯', label: 'Rodadas', config: 'rodadas', base: true },
            { id: 'top10', icon: '🔟', label: 'Top 10', config: 'top10', base: false },
            { id: 'melhor-mes', icon: '📅', label: 'Melhor Mês', config: 'melhorMes', base: false },
            { id: 'pontos-corridos', icon: '🔄', label: 'P. Corridos', config: 'pontosCorridos', base: false },
            { id: 'mata-mata', icon: '⚔️', label: 'Mata-Mata', config: 'mataMata', base: false },
            { id: 'artilheiro', icon: '⚽', label: 'Artilheiro', config: 'artilheiro', base: false },
            { id: 'luva-ouro', icon: '🧤', label: 'Luva Ouro', config: 'luvaOuro', base: false }
        ];

        // Filtrar apenas os módulos que estão ativos na configuração da liga
        const modulosAtivos = todosModulosDisponiveis.filter(m => this.verificarModuloAtivo(m.config));

        console.log('[PARTICIPANTE-NAV] 📋 Módulos disponíveis para o usuário:', modulosAtivos.length, 'de', todosModulosDisponiveis.length);
        console.log('[PARTICIPANTE-NAV] 🔧 Configuração da liga recebida:', this.modulosAtivos);

        // Renderizar os botões de navegação com suporte a scroll horizontal
        bottomNav.innerHTML = modulosAtivos.map(modulo => `
            <button class="nav-item-modern ${modulo.id === 'boas-vindas' ? 'active' : ''}"
                    data-module="${modulo.id}"
                    title="${modulo.label}">
                <span class="nav-icon-modern">${modulo.icon}</span>
                <span class="nav-label-modern">${modulo.label}</span>
            </button>
        `).join('');

        // Habilitar scroll horizontal para navegação suave em dispositivos touch e desktop
        bottomNav.style.overflowX = 'auto';
        bottomNav.style.overflowY = 'hidden';
        bottomNav.style.webkitOverflowScrolling = 'touch'; // Para melhor scroll em iOS
        bottomNav.style.scrollbarWidth = 'thin'; // Para ocultar scrollbar em alguns navegadores

        console.log('[PARTICIPANTE-NAV] ✅ Menu renderizado com scroll horizontal ativado para', modulosAtivos.length, 'módulos');
    }

    // Verifica se um módulo específico está ativo com base na configuração da liga
    verificarModuloAtivo(configKey) {
        // Se não houver configuração carregada, permitir apenas módulos base
        if (!this.modulosAtivos || Object.keys(this.modulosAtivos).length === 0) {
            return ['extrato', 'ranking', 'rodadas'].includes(configKey);
        }

        // Verificar configuração explícita da liga
        // Se não estiver definido, assume false para módulos opcionais
        return this.modulosAtivos[configKey] === true;
    }

    configurarEventListeners() {
        const navButtons = document.querySelectorAll('.nav-item-modern'); // Seleciona todos os botões de navegação

        navButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const modulo = button.dataset.module; // Obtém o ID do módulo do atributo data-module
                console.log('[PARTICIPANTE-NAV] 🎯 Clique detectado no módulo:', modulo);

                // Remove a classe 'active' de todos os botões para resetar o estilo
                navButtons.forEach(btn => btn.classList.remove('active'));

                // Adiciona a classe 'active' ao botão clicado para feedback visual
                button.classList.add('active');

                // Realiza a navegação para o módulo selecionado
                await this.navegarPara(modulo);
            });
        });

        console.log('[PARTICIPANTE-NAV] ✅ Event listeners de clique configurados nos botões de navegação');
    }

    async navegarPara(moduloId) {
        console.log(`[PARTICIPANTE-NAV] 🧭 Iniciando navegação para o módulo: ${moduloId}`);

        const container = document.getElementById('moduleContainer'); // Container onde o conteúdo do módulo será carregado
        if (!container) {
            console.error('[PARTICIPANTE-NAV] ❌ Container de módulo não encontrado');
            return; // Sai da função se o container não existir
        }

        // Exibe um estado de carregamento visualmente agradável
        const nomeModulo = this.obterNomeModulo(moduloId); // Obtém o nome amigável do módulo
        container.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 80px 20px; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="position: relative; width: 80px; height: 80px; margin-bottom: 24px;">
                    <div style="position: absolute; width: 80px; height: 80px; border: 4px solid rgba(255, 69, 0, 0.1); border-top: 4px solid #ff4500; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="position: absolute; width: 60px; height: 60px; top: 10px; left: 10px; border: 3px solid rgba(255, 69, 0, 0.05); border-bottom: 3px solid #ff4500; border-radius: 50%; animation: spin 1.5s linear infinite reverse;"></div>
                </div>
                <h3 style="color: #333; margin-bottom: 8px; font-weight: 600;">Carregando ${nomeModulo}</h3>
                <p style="color: #999; font-size: 14px;">Aguarde um momento...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        try {
            // Busca o caminho do HTML do módulo a ser carregado
            const htmlPath = this.modulos[moduloId];
            if (!htmlPath) {
                throw new Error(`Módulo "${moduloId}" não foi encontrado no sistema de rotas`);
            }

            // Faz a requisição para obter o conteúdo HTML do módulo
            const response = await fetch(htmlPath);
            if (!response.ok) {
                // Trata erros específicos como 404
                if (response.status === 404) {
                    throw new Error(`O módulo "${nomeModulo}" ainda não está disponível`);
                }
                // Lança um erro genérico para outros status HTTP
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text(); // Obtém o HTML como texto
            container.innerHTML = html; // Insere o HTML no container

            // Tenta carregar e executar o script JavaScript associado ao módulo
            await this.carregarModuloJS(moduloId);

            this.moduloAtual = moduloId; // Atualiza o módulo atual
            console.log(`[PARTICIPANTE-NAV] ✅ Módulo ${moduloId} (${nomeModulo}) carregado e renderizado com sucesso`);

        } catch (error) {
            console.error(`[PARTICIPANTE-NAV] ❌ Erro crítico ao carregar o módulo ${moduloId}:`, error);

            // Exibe uma mensagem de erro amigável para o usuário
            const mensagemErro = this.obterMensagemErroAmigavel(error);

            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; max-width: 500px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); border-radius: 16px; padding: 40px; border: 2px solid rgba(239, 68, 68, 0.2);">
                        <div style="font-size: 64px; margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(239, 68, 68, 0.2));">⚠️</div>
                        <h3 style="color: #dc2626; margin-bottom: 16px; font-size: 20px; font-weight: 600;">Ops! Algo deu errado</h3>
                        <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">${mensagemErro}</p>
                        <button onclick="window.participanteNav.navegarPara('boas-vindas')"
                                style="background: #ff4500; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Retorna o nome amigável de um módulo com base no seu ID
    obterNomeModulo(moduloId) {
        const nomes = {
            'boas-vindas': 'Boas-Vindas',
            'extrato': 'Extrato Financeiro',
            'ranking': 'Ranking Geral',
            'rodadas': 'Rodadas',
            'top10': 'Top 10',
            'melhor-mes': 'Melhor Mês',
            'pontos-corridos': 'Pontos Corridos',
            'mata-mata': 'Mata-Mata',
            'artilheiro': 'Artilheiro Campeão',
            'luva-ouro': 'Luva de Ouro'
        };
        return nomes[moduloId] || moduloId; // Retorna o nome mapeado ou o próprio ID se não encontrado
    }

    // Gera uma mensagem de erro mais compreensível para o usuário
    obterMensagemErroAmigavel(error) {
        const mensagem = error.message.toLowerCase(); // Converte a mensagem de erro para minúsculas

        // Mensagens específicas para erros comuns
        if (mensagem.includes('não foi encontrado') || mensagem.includes('404')) {
            return 'Este módulo ainda não está disponível. Entre em contato com o administrador da liga para mais informações.';
        }

        if (mensagem.includes('network') || mensagem.includes('fetch')) {
            return 'Falha na conexão com o servidor. Por favor, verifique sua conexão com a internet e tente novamente.';
        }

        if (mensagem.includes('timeout')) {
            return 'A requisição para carregar o módulo demorou muito. Tente novamente em alguns instantes.';
        }

        // Mensagem genérica para outros erros
        return error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
    }

    // Carrega e executa o script JavaScript de um módulo específico
    async carregarModuloJS(modulo) {
        console.log(`[PARTICIPANTE-NAV] 📦 Tentando importar o módulo JS: ${modulo}`);

        // Mapeamento dos módulos para seus respectivos arquivos JS
        const modulosPaths = {
            'boas-vindas': '/participante/js/modules/participante-boas-vindas.js',
            'extrato': '/participante/js/modules/participante-extrato.js',
            'ranking': '/participante/js/modules/participante-ranking.js',
            'rodadas': '/participante/js/modules/participante-rodadas.js',
            'top10': '/participante/js/modules/participante-top10.js',
            'melhor-mes': '/participante/js/modules/participante-melhor-mes.js',
            'pontos-corridos': '/participante/js/modules/participante-pontos-corridos.js',
            'mata-mata': '/participante/js/modules/participante-mata-mata.js',
            'artilheiro': '/participante/js/modules/participante-artilheiro.js',
            'luva-ouro': '/participante/js/modules/participante-luva-ouro.js'
        };

        const jsPath = modulosPaths[modulo]; // Obtém o caminho do arquivo JS
        if (jsPath) { // Se o caminho for encontrado
            try {
                // Importa o módulo dinamicamente
                const moduloJS = await import(jsPath);

                // Tenta encontrar e executar uma função de inicialização específica para o módulo
                // Converte "boas-vindas" -> "BoasVindas" (camelCase correto)
                const moduloCamelCase = modulo
                    .split('-')
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                    .join('');

                // Tentar múltiplos padrões de nomenclatura
                const possibleFunctionNames = [
                    `inicializar${moduloCamelCase}Participante`,  // inicializarBoasVindasParticipante
                    `inicializar${moduloCamelCase}`,              // inicializarBoasVindas
                    `inicializar${modulo}Participante`,           // inicializarboas-vindasParticipante (caso original)
                    `inicializar${modulo}`                        // inicializarboas-vindas (caso original)
                ];

                let functionExecuted = false;
                for (const funcName of possibleFunctionNames) {
                    if (moduloJS[funcName]) { // Verifica se a função existe no módulo importado
                        console.log(`[PARTICIPANTE-NAV] 🚀 Executando função: ${funcName}()`);
                        try {
                            // ✅ PASSAR PARÂMETROS SEPARADOS (ligaId, timeId)
                            await moduloJS[funcName](this.participanteData.ligaId, this.participanteData.timeId);
                            console.log(`[PARTICIPANTE-NAV] ✅ Função ${funcName}() executada com sucesso`);
                            functionExecuted = true;
                            break;
                        } catch (error) {
                            console.error(`[PARTICIPANTE-NAV] ❌ Erro ao executar ${funcName}():`, error);
                        }
                    }
                }

                if (!functionExecuted) {
                    console.log(`[PARTICIPANTE-NAV] ℹ️ Nenhuma função de inicialização encontrada para o módulo '${modulo}'. Tentativas: ${possibleFunctionNames.join(', ')}`);
                }
            } catch (error) {
                console.error(`[PARTICIPANTE-NAV] ❌ Erro ao importar ou executar o módulo JS '${jsPath}':`, error);
                throw error; // Re-lança o erro para ser tratado pela lógica de navegação
            }
        } else {
            console.log(`[PARTICIPANTE-NAV] ℹ️ Nenhum arquivo JS associado ao módulo '${modulo}'. Ignorando carregamento de JS.`);
        }
    }
}

// Cria uma instância global da classe ParticipanteNavigation
const participanteNav = new ParticipanteNavigation();

// Adiciona um listener para inicializar a navegação quando o DOM estiver completamente carregado
if (document.readyState === 'loading') { // Verifica se o DOM ainda está sendo carregado
    document.addEventListener('DOMContentLoaded', async () => {
        await participanteNav.inicializar(); // Inicializa a navegação
    });
} else { // Se o DOM já estiver pronto
    participanteNav.inicializar(); // Inicializa a navegação diretamente
}

// Expõe a instância globalmente para que possa ser acessada de outros scripts, se necessário
window.participanteNav = participanteNav;

console.log('[PARTICIPANTE-NAV] ✅ Sistema de navegação do participante inicializado e pronto.');