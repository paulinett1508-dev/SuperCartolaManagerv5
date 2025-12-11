<!doctype html>
<html lang="pt-BR">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Detalhe da Liga - Super Cartola Manager</title>

        <!-- Suprimir warnings de extensões do navegador -->
        <script>
            // Capturar erros de extensões que não afetam o sistema
            window.addEventListener("unhandledrejection", function (event) {
                if (
                    event.reason &&
                    event.reason.message &&
                    event.reason.message.includes("message channel closed")
                ) {
                    event.preventDefault(); // Silenciar este erro específico
                }
            });
        </script>
        <link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />

        <!-- CSS HIERÁRQUICO MODULAR -->
        <link rel="stylesheet" href="style.css" />
        <link rel="stylesheet" href="detalhe-liga.css" />
        <link rel="stylesheet" href="css/base.css" />
        <link rel="stylesheet" href="css/performance.css" />

        <!-- MATERIAL ICONS -->
        <link
            href="https://fonts.googleapis.com/icon?family=Material+Icons"
            rel="stylesheet"
        />
        <style>
            /* Fallback Material Icons */
            @font-face {
                font-family: "Material Icons";
                font-style: normal;
                font-weight: 400;
                src: url(https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2)
                    format("woff2");
            }
            .material-icons {
                font-family: "Material Icons" !important;
                font-weight: normal;
                font-style: normal;
                font-size: 24px;
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                display: inline-block;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: "liga";
                font-feature-settings: "liga";
                -webkit-font-smoothing: antialiased;
            }
        </style>

        <!-- EXTERNAL DEPENDENCIES -->
        <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
        <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
            rel="stylesheet"
        />

        <!-- CORREÇÃO CRÍTICA: Definir funções globais no HEAD antes do carregamento -->
        <script>
            // === GERENCIAMENTO DA LOGO - DEFINIDO NO HEAD ===
            let logoTentativas = [
                "img/logo-supercartola.png",
                "../public/img/logo-supercartola.png",
                "./public/img/logo-supercartola.png",
                "/public/img/logo-supercartola.png",
                "public/img/logo-supercartola.png",
            ];
            let logoIndiceAtual = 0;

            function tentarProximoCaminho(img) {
                logoIndiceAtual++;
                if (logoIndiceAtual < logoTentativas.length) {
                    img.src = logoTentativas[logoIndiceAtual];
                } else {
                    // Todas as tentativas falharam, mostrar emoji
                    mostrarLogoFallback();
                }
            }

            function logoCarregada(img) {
                const fallback = document.getElementById("logoFallback");
                if (fallback) {
                    fallback.style.display = "none";
                }
                img.style.display = "block";
            }

            function mostrarLogoFallback() {
                const logoImage = document.getElementById("logoImage");
                const fallback = document.getElementById("logoFallback");
                if (logoImage) {
                    logoImage.style.display = "none";
                }
                if (fallback) {
                    fallback.style.display = "inline-block";
                }
            }

            // Função goToDashboard para compatibilidade com layout
            function goToDashboard() {
                window.location.href = "painel.html";
            }
        </script>
    </head>

    <body>
        <div class="app-container">
            <div id="sidebar-placeholder"></div>

            <main class="app-main">
                <div class="page-content">
                    <!-- Header da Liga Simplificado -->
                    <div class="liga-header">
                        <h2 id="nomeLiga" class="liga-titulo">Nome da Liga</h2>
                        <p id="quantidadeTimes" class="liga-info">
                            0 participantes
                        </p>
                    </div>

                    <!-- Tela Principal - 11 Cards Independentes -->
                    <div id="main-screen" class="main-screen">
                        <div class="modules-grid modules-grid-expanded">
                            <!-- 1. Card Participantes -->
                            <div
                                class="module-card"
                                data-module="participantes"
                            >
                                <div class="module-header">
                                    <div class="module-icon">👥</div>
                                    <h3 class="module-title">PARTICIPANTES</h3>
                                </div>
                                <div
                                    class="module-count"
                                    id="participantes-count"
                                >
                                    0 membros
                                </div>
                            </div>

                            <!-- 2. Card Classificação Geral -->
                            <div
                                class="module-card"
                                data-module="ranking-geral"
                            >
                                <div class="module-header">
                                    <div class="module-icon">🏆</div>
                                    <h3 class="module-title">CLASSIFICAÇÃO</h3>
                                </div>
                            </div>

                            <!-- 3. Card Resultados Parciais -->
                            <div class="module-card" data-module="parciais">
                                <div class="module-header">
                                    <div class="module-icon">📊</div>
                                    <h3 class="module-title">PARCIAIS</h3>
                                </div>
                            </div>

                            <!-- 4. Card Top 10 -->
                            <div class="module-card" data-module="top10">
                                <div class="module-header">
                                    <div class="module-icon">🌟</div>
                                    <h3 class="module-title">TOP 10</h3>
                                </div>
                            </div>

                            <!-- 5. Card Por Rodadas -->
                            <div class="module-card" data-module="rodadas">
                                <div class="module-header">
                                    <div class="module-icon">📅</div>
                                    <h3 class="module-title">RODADAS</h3>
                                </div>
                            </div>

                            <!-- 6. Card Melhor Mês -->
                            <div class="module-card" data-module="melhor-mes">
                                <div class="module-header">
                                    <div class="module-icon">📈</div>
                                    <h3 class="module-title">MELHOR MÊS</h3>
                                </div>
                            </div>

                            <!-- 7. Card Mata-mata -->
                            <div class="module-card" data-module="mata-mata">
                                <div class="module-header">
                                    <div class="module-icon">⚔️</div>
                                    <h3 class="module-title">MATA-MATA</h3>
                                </div>
                            </div>

                            <!-- 8. Card Pontos Corridos -->
                            <div
                                class="module-card"
                                data-module="pontos-corridos"
                            >
                                <div class="module-header">
                                    <div class="module-icon">⚡</div>
                                    <h3 class="module-title">
                                        PONTOS CORRIDOS
                                    </h3>
                                </div>
                            </div>

                            <!-- 9. Card Luva de Ouro -->
                            <div class="module-card" data-module="luva-de-ouro">
                                <div class="module-header">
                                    <div class="module-icon">🥅</div>
                                    <h3 class="module-title">LUVA DE OURO</h3>
                                </div>
                            </div>

                            <!-- 10. Card Artilheiro -->
                            <div
                                class="module-card"
                                data-module="artilheiro-campeao"
                            >
                                <div class="module-header">
                                    <div class="module-icon">⚽</div>
                                    <h3 class="module-title">ARTILHEIRO</h3>
                                </div>
                            </div>

                            <!-- 11. Card Fluxo Financeiro -->
                            <div
                                class="module-card"
                                data-module="fluxo-financeiro"
                            >
                                <div class="module-header">
                                    <div class="module-icon">💰</div>
                                    <h3 class="module-title">FINANCEIRO</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tela Secundária - Conteúdo Dinâmico -->
                    <div id="secondary-screen" class="dynamic-content">
                        <div id="dynamic-content-area">
                            <!-- Conteúdo será injetado aqui dinamicamente -->
                        </div>
                    </div>
                </div>
            </main>

            <!-- Overlay de Loading -->
            <div id="processing-overlay" class="processing-overlay">
                <div class="spinner"></div>
                <div class="processing-text">Carregando dados...</div>
            </div>
        </div>

        <!-- Bootstrap JS -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

        <!-- COMPONENTE CACHE RODADAS -->
        <style>
            .rodadas-cache-mini {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(249, 115, 22, 0.1);
                border: 1px solid rgba(249, 115, 22, 0.3);
                border-radius: 8px;
                font-size: 13px;
                color: #9ca3af;
            }
            .rodadas-cache-mini .material-symbols-outlined {
                font-size: 18px;
                color: #f97316;
            }
            .btn-cache-mini {
                background: none;
                border: none;
                color: #f97316;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .btn-cache-mini:hover {
                background: rgba(249, 115, 22, 0.2);
            }
            .separador-mini {
                width: 1px;
                height: 16px;
                background: rgba(249, 115, 22, 0.3);
            }
            .modal-cache-mini {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                z-index: 9999;
                align-items: center;
                justify-content: center;
            }
            .modal-cache-mini.show {
                display: flex;
            }
            .modal-cache-content {
                background: #1a1a1a;
                border: 1px solid #3a3a3c;
                border-radius: 12px;
                padding: 24px;
                max-width: 420px;
                width: 90%;
            }
            .modal-cache-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .modal-cache-header .material-symbols-outlined {
                color: #f97316;
                font-size: 24px;
            }
            .modal-cache-header h3 {
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                margin: 0;
            }
            .modal-cache-body {
                margin-bottom: 20px;
            }
            .modal-cache-body p {
                color: #9ca3af;
                font-size: 13px;
                line-height: 1.5;
                margin-bottom: 12px;
            }
            .input-mini-group {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 12px;
            }
            .input-mini-field label {
                font-size: 11px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                display: block;
                margin-bottom: 4px;
            }
            .input-mini-field input {
                width: 100%;
                background: #262626;
                border: 1px solid #3a3a3c;
                border-radius: 6px;
                padding: 8px;
                color: #fff;
                font-size: 14px;
            }
            .input-mini-field input:focus {
                outline: none;
                border-color: #f97316;
            }
            .modal-cache-footer {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            .btn-mini {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .btn-mini-cancel {
                background: #262626;
                color: #9ca3af;
            }
            .btn-mini-cancel:hover {
                background: #333;
            }
            .btn-mini-confirm {
                background: #f97316;
                color: white;
            }
            .btn-mini-confirm:hover {
                background: #ea580c;
            }
            .btn-mini-confirm:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .btn-mini-danger {
                background: #ef4444;
                color: white;
            }
            .btn-mini-danger:hover {
                background: #dc2626;
            }
            .spinner-mini {
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 2px solid white;
                width: 12px;
                height: 12px;
                animation: spin 0.8s linear infinite;
                display: inline-block;
                margin-right: 6px;
            }
            .toast-cache-mini {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #1a1a1a;
                border: 1px solid #3a3a3c;
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                font-size: 13px;
            }
            .toast-cache-mini.show {
                transform: translateX(0);
            }
            .toast-cache-mini.success { border-color: #22c55e; }
            .toast-cache-mini.error { border-color: #ef4444; }
            .toast-cache-mini .material-symbols-outlined {
                font-size: 20px;
            }
            .toast-cache-mini.success .material-symbols-outlined { color: #22c55e; }
            .toast-cache-mini.error .material-symbols-outlined { color: #ef4444; }
        </style>

        <div class="modal-cache-mini" id="modalRecalcMini">
            <div class="modal-cache-content">
                <div class="modal-cache-header">
                    <span class="material-symbols-outlined">refresh</span>
                    <h3>Recalcular Rodadas</h3>
                </div>
                <div class="modal-cache-body">
                    <p>Recalcula as posições considerando times ativos em cada rodada.</p>
                    <div class="input-mini-group">
                        <div class="input-mini-field">
                            <label>De</label>
                            <input type="number" id="miniRodadaInicio" value="1" min="1" max="38">
                        </div>
                        <div class="input-mini-field">
                            <label>Até</label>
                            <input type="number" id="miniRodadaFim" value="38" min="1" max="38">
                        </div>
                    </div>
                </div>
                <div class="modal-cache-footer">
                    <button class="btn-mini btn-mini-cancel" onclick="fecharModalMini('modalRecalcMini')">Cancelar</button>
                    <button class="btn-mini btn-mini-confirm" id="btnRecalcMini" onclick="executarRecalcMini()">Executar</button>
                </div>
            </div>
        </div>

        <div class="modal-cache-mini" id="modalLimparMini">
            <div class="modal-cache-content">
                <div class="modal-cache-header">
                    <span class="material-symbols-outlined">delete</span>
                    <h3>Limpar Cache</h3>
                </div>
                <div class="modal-cache-body">
                    <p style="color: #ef4444; font-weight: 600;">⚠️ Remove todos os dados de cache desta liga.</p>
                    <p>Será necessário recalcular depois.</p>
                </div>
                <div class="modal-cache-footer">
                    <button class="btn-mini btn-mini-cancel" onclick="fecharModalMini('modalLimparMini')">Cancelar</button>
                    <button class="btn-mini btn-mini-danger" onclick="executarLimparMini()">Confirmar</button>
                </div>
            </div>
        </div>

        <div class="toast-cache-mini" id="toastCacheMini">
            <span class="material-symbols-outlined"></span>
            <span id="toastCacheMiniTexto"></span>
        </div>

        <script>
            // CACHE MINIMALISTA - RODADAS (GLOBAL)
            let ligaIdCache = null;

            function obterLigaIdCache() {
                if (ligaIdCache) return ligaIdCache;
                const urlParams = new URLSearchParams(window.location.search);
                const ligaIdUrl = urlParams.get('id') || urlParams.get('ligaId');
                if (ligaIdUrl) {
                    ligaIdCache = ligaIdUrl;
                    return ligaIdUrl;
                }
                if (window.ligaAtual?.id) {
                    ligaIdCache = window.ligaAtual.id;
                    return window.ligaAtual.id;
                }
                if (window.ligaId) {
                    ligaIdCache = window.ligaId;
                    return window.ligaId;
                }
                const ligaIdStorage = localStorage.getItem('ligaIdAtual');
                if (ligaIdStorage) {
                    ligaIdCache = ligaIdStorage;
                    return ligaIdStorage;
                }
                return null;
            }

            function abrirModalRecalcMini() {
                document.getElementById('modalRecalcMini').classList.add('show');
            }

            function abrirModalLimparMini() {
                document.getElementById('modalLimparMini').classList.add('show');
            }

            function fecharModalMini(modalId) {
                document.getElementById(modalId).classList.remove('show');
            }

            document.addEventListener('DOMContentLoaded', () => {
                document.querySelectorAll('.modal-cache-mini').forEach(modal => {
                    modal.addEventListener('click', (e) => {
                        if (e.target.classList.contains('modal-cache-mini')) {
                            modal.classList.remove('show');
                        }
                    });
                });
            });

            function mostrarToastMini(tipo, mensagem) {
                const toast = document.getElementById('toastCacheMini');
                const icone = toast.querySelector('.material-symbols-outlined');
                const texto = document.getElementById('toastCacheMiniTexto');
                toast.classList.remove('success', 'error');
                toast.classList.add(tipo);
                icone.textContent = tipo === 'success' ? 'check_circle' : 'error';
                texto.textContent = mensagem;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3500);
            }

            async function executarRecalcMini() {
                const ligaId = obterLigaIdCache();
                if (!ligaId) {
                    mostrarToastMini('error', 'Liga não identificada');
                    return;
                }
                const inicio = parseInt(document.getElementById('miniRodadaInicio').value);
                const fim = parseInt(document.getElementById('miniRodadaFim').value);
                const btn = document.getElementById('btnRecalcMini');
                if (inicio < 1 || fim > 38 || inicio > fim) {
                    mostrarToastMini('error', 'Valores inválidos');
                    return;
                }
                btn.disabled = true;
                btn.innerHTML = '<div class="spinner-mini"></div>Recalculando...';
                try {
                    const response = await fetch(`/api/rodadas-cache/${ligaId}/recalcular`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rodadaInicio: inicio, rodadaFim: fim })
                    });
                    const resultado = await response.json();
                    if (response.ok && resultado.success) {
                        fecharModalMini('modalRecalcMini');
                        mostrarToastMini('success', `✅ ${resultado.totalRecalculados} registros recalculados`);
                    } else {
                        throw new Error(resultado.erro || 'Erro ao recalcular');
                    }
                } catch (error) {
                    mostrarToastMini('error', error.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Executar';
                }
            }

            async function executarLimparMini() {
                const ligaId = obterLigaIdCache();
                if (!ligaId) {
                    mostrarToastMini('error', 'Liga não identificada');
                    return;
                }
                try {
                    const response = await fetch(`/api/rodadas-cache/${ligaId}/limpar`, {
                        method: 'DELETE'
                    });
                    const resultado = await response.json();
                    if (response.ok && resultado.success) {
                        fecharModalMini('modalLimparMini');
                        mostrarToastMini('success', `🗑️ ${resultado.deletedCount} registros removidos`);
                    } else {
                        throw new Error(resultado.erro || 'Erro ao limpar');
                    }
                } catch (error) {
                    mostrarToastMini('error', error.message);
                }
            }
        </script>

        <!-- SCHEDULERS AUTOMÁTICOS (devem carregar antes dos módulos) -->
        <script src="js/parciais-scheduler.js"></script>
        <script src="js/luva-de-ouro/luva-de-ouro-scheduler.js"></script>

        <!-- SCRIPTS MODULARES -->
        <script src="js/cards-condicionais.js"></script>
        <script src="js/sistema-modulos-init.js"></script>
        <script type="module" src="js/detalhe-liga-orquestrador.js"></script>

        <!-- MÓDULOS JS EXISTENTES -->
        <script type="module" src="js/utils.js"></script>
        <script type="module" src="js/navigation.js"></script>
        <script src="js/seletor-ligas.js"></script>
    </body>
</html>