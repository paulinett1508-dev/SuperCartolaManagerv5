/**
 * SIDEBAR MENU - Menu Dropup do Perfil Admin
 * v1.0 - Funcionalidade do menu do usuário
 */

(function() {
    'use strict';

    // Aguardar sidebar ser injetada
    function esperarSidebar(callback, tentativas = 20) {
        const userSection = document.getElementById('sidebarUserSection');
        const userToggle = document.getElementById('userMenuToggle');

        if (userSection && userToggle) {
            callback();
        } else if (tentativas > 0) {
            setTimeout(() => esperarSidebar(callback, tentativas - 1), 100);
        }
    }

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
                    case 'config':
                        window.location.href = 'ferramentas.html';
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

    // Abrir perfil do admin
    function abrirPerfilAdmin() {
        fetch('/api/admin/auth/session', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                const nome = data.user?.name || data.user?.username || 'Admin';
                const email = data.user?.email || 'Nao informado';
                alert(`Perfil do Administrador\n\nNome: ${nome}\nEmail: ${email}\nRole: Administrador`);
            })
            .catch(() => {
                alert('Perfil do Administrador\n\nUsuario: Admin\nRole: Administrador');
            });
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
            setTimeout(init, 200);
        }
    });

})();
