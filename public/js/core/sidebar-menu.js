/**
 * SIDEBAR MENU - Menu Dropup do Perfil Admin + Carregamento de Ligas
 * v1.1 - Funcionalidade completa do sidebar
 */

(function() {
    'use strict';

    // Aguardar sidebar ser injetada
    function esperarSidebar(callback, tentativas = 20) {
        const userSection = document.getElementById('sidebarUserSection');
        const ligasList = document.getElementById('ligasList');

        if (userSection && ligasList) {
            callback();
        } else if (tentativas > 0) {
            setTimeout(() => esperarSidebar(callback, tentativas - 1), 100);
        }
    }

    // === MAPEAMENTO DE LOGOS DAS LIGAS ===
    function obterLogoLiga(nomeLiga) {
        const nome = (nomeLiga || '').toLowerCase();
        if (nome.includes('super')) return 'img/logo-supercartola.png';
        if (nome.includes('sobral') || nome.includes('cartoleiros')) return 'img/logo-cartoleirossobral.png';
        return null;
    }

    // === CARREGAMENTO DAS LIGAS NO SIDEBAR ===
    async function carregarLigasSidebar() {
        const ligasList = document.getElementById('ligasList');
        if (!ligasList) return;

        // Obter ID da liga atual da URL
        const urlParams = new URLSearchParams(window.location.search);
        const ligaAtualId = urlParams.get('id');

        try {
            const response = await fetch('/api/ligas');
            const ligas = await response.json();

            if (!Array.isArray(ligas) || ligas.length === 0) {
                ligasList.innerHTML = `
                    <div class="sidebar-ligas-empty">
                        <span class="material-icons" style="font-size: 24px; margin-bottom: 8px; display: block;">folder_open</span>
                        Nenhuma liga criada
                    </div>
                `;
                return;
            }

            // Renderizar ligas com logos
            ligasList.innerHTML = ligas.map(liga => {
                const ligaId = liga._id || liga.id;
                const isLigaAtual = ligaId === ligaAtualId;
                const timesCount = liga.times?.length || 0;
                const logoUrl = obterLogoLiga(liga.nome);

                const logoHtml = logoUrl
                    ? `<img src="${logoUrl}" alt="" class="liga-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span class="liga-dot" style="display:none;"></span>`
                    : `<span class="liga-dot"></span>`;

                return `
                    <a href="detalhe-liga.html?id=${ligaId}" class="sidebar-liga-item ${isLigaAtual ? 'active' : ''}">
                        ${logoHtml}
                        <div class="liga-info-sidebar">
                            <div class="liga-name-sidebar">${liga.nome || 'Liga sem nome'}</div>
                        </div>
                        <span class="liga-badge-count">${timesCount}</span>
                    </a>
                `;
            }).join('');
        } catch (error) {
            console.error('[SIDEBAR-MENU] Erro ao carregar ligas:', error);
            ligasList.innerHTML = `
                <div class="sidebar-ligas-empty">
                    <span class="material-icons" style="color: #ef4444; font-size: 24px; margin-bottom: 8px; display: block;">warning</span>
                    Erro ao carregar
                    <button onclick="window.recarregarLigasSidebar()" style="
                        margin-top: 8px;
                        padding: 6px 12px;
                        background: #FF5500;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 600;
                        display: block;
                        width: 100%;
                    ">Tentar Novamente</button>
                </div>
            `;
        }
    }

    // Expor função globalmente para retry
    window.recarregarLigasSidebar = carregarLigasSidebar;

    // Inicializar menu do perfil
    function inicializarMenuPerfil() {
        const userSection = document.getElementById('sidebarUserSection');
        const userToggle = document.getElementById('userMenuToggle');
        const menuItems = document.querySelectorAll('#userDropupMenu .sidebar-user-menu-item');

        if (!userSection || !userToggle) {
            console.warn('[SIDEBAR-MENU] Elementos não encontrados');
            return;
        }

        // Evitar dupla inicialização
        if (userToggle.dataset.initialized) return;
        userToggle.dataset.initialized = 'true';

        // Toggle do menu
        userToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userSection.classList.toggle('menu-open');
        });

        // Ações do menu
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.getAttribute('data-action');

                switch(action) {
                    case 'perfil':
                        abrirPerfilAdmin();
                        break;
                    case 'administradores':
                        window.location.href = 'admin-gestao.html';
                        break;
                    case 'logout':
                        fazerLogoutAdmin();
                        break;
                }

                userSection.classList.remove('menu-open');
            });
        });

        // Fechar ao clicar fora
        document.addEventListener('click', function(e) {
            if (userSection && !userSection.contains(e.target)) {
                userSection.classList.remove('menu-open');
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                userSection.classList.remove('menu-open');
            }
        });

        console.log('[SIDEBAR-MENU] ✅ Menu do perfil inicializado');
    }

    // Abrir perfil do admin - delega para função global do layout
    function abrirPerfilAdmin() {
        if (typeof window.abrirPerfilAdmin === 'function') {
            window.abrirPerfilAdmin();
        } else {
            // Fallback caso layout não tenha carregado
            fetch('/api/admin/auth/session', { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    const nome = data.user?.name || data.user?.username || 'Admin';
                    const email = data.user?.email || 'Nao informado';
                    alert(`Perfil: ${nome}\nEmail: ${email}`);
                })
                .catch(() => {
                    alert('Perfil do Administrador');
                });
        }
    }

    // Fazer logout
    function fazerLogoutAdmin() {
        if (confirm('Deseja realmente sair do sistema?')) {
            fetch('/api/admin/auth/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => {
                localStorage.removeItem('adminLogado');
                localStorage.removeItem('ligaIdSelecionada');
                window.location.href = '/';
            })
            .catch(() => {
                localStorage.removeItem('adminLogado');
                window.location.href = '/';
            });
        }
    }

    // Carregar dados do admin e atualizar nome
    function carregarDadosAdmin() {
        fetch('/api/admin/auth/session', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    const userName = document.getElementById('userName');
                    if (userName) {
                        const nome = data.user.name || data.user.username || 'Admin';
                        const primeiroNome = nome.split(' ')[0];
                        userName.textContent = primeiroNome;
                    }
                }
            })
            .catch(() => {
                // Silencioso
            });
    }

    // Inicialização
    function init() {
        esperarSidebar(() => {
            inicializarMenuPerfil();
            carregarDadosAdmin();
            carregarLigasSidebar();
        });
    }

    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-inicializar quando voltar para página (cache do navegador)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            setTimeout(() => {
                init();
                carregarLigasSidebar();
            }, 200);
        }
    });

})();
