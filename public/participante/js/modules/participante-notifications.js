// =====================================================================
// PARTICIPANTE-NOTIFICATIONS.JS - v1.2 (Fix versão em Configurações)
// Destino: /participante/js/modules/participante-notifications.js
// =====================================================================
// Gerencia Web Push Notifications para o app do participante
// - Verifica suporte do navegador
// - Gerencia permissões
// - Registra/remove subscriptions
// - Atualiza preferências
// ✅ v1.2: Carrega versão do app via JS (script inline não executa em SPA)
// ✅ v1.1: Trata graciosamente quando VAPID não está configurado
// =====================================================================

if (window.Log) Log.info('NOTIFICATIONS', '🔔 Carregando módulo v1.2...');

// Estado global do módulo
const NotificationsState = {
    isSupported: false,
    isSystemConfigured: true, // ✅ v1.1: Assume true até verificar
    permission: 'default',
    isSubscribed: false,
    subscription: null,
    vapidKey: null,
    preferences: {
        rodadaConsolidada: true,
        mitoMico: true,
        escalacaoPendente: false,
        acertosFinanceiros: false
    },
    isLoading: false
};

// =====================================================================
// VERIFICAÇÃO DE SUPORTE
// =====================================================================

/**
 * Verifica se o navegador suporta Push Notifications
 */
function checkBrowserSupport() {
    const support = {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notification: 'Notification' in window
    };

    NotificationsState.isSupported = support.serviceWorker && support.pushManager && support.notification;

    if (window.Log) {
        Log.debug('NOTIFICATIONS', '🔍 Suporte:', support);
        Log.info('NOTIFICATIONS', `📱 Push suportado: ${NotificationsState.isSupported}`);
    }

    return NotificationsState.isSupported;
}

/**
 * Verifica permissão atual de notificações
 */
function checkPermission() {
    if (!NotificationsState.isSupported) {
        NotificationsState.permission = 'unsupported';
        return 'unsupported';
    }

    NotificationsState.permission = Notification.permission;
    if (window.Log) Log.debug('NOTIFICATIONS', `🔐 Permissão: ${NotificationsState.permission}`);

    return NotificationsState.permission;
}

// =====================================================================
// VAPID KEY
// =====================================================================

/**
 * Obtém a VAPID public key do servidor
 */
async function getVapidKey() {
    if (NotificationsState.vapidKey) {
        return NotificationsState.vapidKey;
    }

    try {
        const response = await fetch('/api/notifications/vapid-key');
        const data = await response.json();

        if (data.publicKey) {
            NotificationsState.vapidKey = data.publicKey;
            NotificationsState.isSystemConfigured = true;
            if (window.Log) Log.debug('NOTIFICATIONS', '🔑 VAPID key obtida');
            return data.publicKey;
        } else {
            // ✅ v1.1: Sistema não configurado (VAPID ausente)
            NotificationsState.isSystemConfigured = false;
            if (window.Log) Log.warn('NOTIFICATIONS', '⚠️ Sistema de push não configurado no servidor');
            throw new Error(data.erro || 'Sistema de notificações não configurado');
        }
    } catch (erro) {
        // ✅ v1.1: Marcar como não configurado se falhar
        if (erro.message?.includes('não configurado') || erro.message?.includes('503')) {
            NotificationsState.isSystemConfigured = false;
        }
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro ao obter VAPID key:', erro);
        throw erro;
    }
}

/**
 * Converte VAPID key de base64 para Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

// =====================================================================
// STATUS E SUBSCRIPTION
// =====================================================================

/**
 * Verifica status atual no servidor
 */
async function getNotificationStatus() {
    try {
        const response = await fetch('/api/notifications/status');

        if (!response.ok) {
            if (response.status === 401) {
                if (window.Log) Log.warn('NOTIFICATIONS', '⚠️ Não autenticado para verificar status');
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        NotificationsState.isSubscribed = data.ativo;
        NotificationsState.preferences = {
            ...NotificationsState.preferences,
            ...data.preferences
        };

        if (window.Log) Log.debug('NOTIFICATIONS', '📊 Status:', data);

        return data;
    } catch (erro) {
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro ao verificar status:', erro);
        return null;
    }
}

/**
 * Obtém a subscription atual do Service Worker
 */
async function getCurrentSubscription() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        NotificationsState.subscription = subscription;

        if (window.Log) Log.debug('NOTIFICATIONS', subscription ? '✅ Subscription existe' : '❌ Sem subscription');

        return subscription;
    } catch (erro) {
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro ao obter subscription:', erro);
        return null;
    }
}

// =====================================================================
// ATIVAR/DESATIVAR NOTIFICAÇÕES
// =====================================================================

/**
 * Pede permissão ao usuário
 */
async function requestPermission() {
    if (!NotificationsState.isSupported) {
        throw new Error('Push notifications não suportado neste navegador');
    }

    if (Notification.permission === 'denied') {
        throw new Error('Notificações bloqueadas. Vá nas configurações do navegador para desbloquear.');
    }

    const permission = await Notification.requestPermission();
    NotificationsState.permission = permission;

    if (window.Log) Log.info('NOTIFICATIONS', `🔐 Permissão solicitada: ${permission}`);

    return permission;
}

/**
 * Ativa notificações push para o participante
 */
async function subscribeToPush(preferences = null) {
    NotificationsState.isLoading = true;

    try {
        // 1. Verificar suporte
        if (!checkBrowserSupport()) {
            throw new Error('Seu navegador não suporta notificações push');
        }

        // 2. Pedir permissão se necessário
        if (Notification.permission === 'default') {
            const permission = await requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permissão negada pelo usuário');
            }
        } else if (Notification.permission === 'denied') {
            throw new Error('Notificações bloqueadas. Vá nas configurações do navegador para desbloquear.');
        }

        // 3. Obter VAPID key
        const vapidKey = await getVapidKey();

        // 4. Obter Service Worker registration
        const registration = await navigator.serviceWorker.ready;

        // 5. Criar subscription
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });

        if (window.Log) Log.info('NOTIFICATIONS', '✅ Subscription criada no browser');

        // 6. Enviar para o servidor
        const prefsToSend = preferences || NotificationsState.preferences;

        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                preferences: prefsToSend
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao registrar no servidor');
        }

        // 7. Atualizar estado
        NotificationsState.isSubscribed = true;
        NotificationsState.subscription = subscription;
        NotificationsState.preferences = prefsToSend;

        if (window.Log) Log.info('NOTIFICATIONS', '🎉 Notificações ativadas com sucesso!');

        return { sucesso: true, mensagem: data.mensagem };

    } catch (erro) {
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro ao ativar:', erro);
        throw erro;
    } finally {
        NotificationsState.isLoading = false;
    }
}

/**
 * Desativa notificações push para o participante
 */
async function unsubscribeFromPush() {
    NotificationsState.isLoading = true;

    try {
        // 1. Obter subscription atual
        const subscription = await getCurrentSubscription();

        if (!subscription) {
            // Já está desativado
            NotificationsState.isSubscribed = false;
            return { sucesso: true, mensagem: 'Notificações já estavam desativadas' };
        }

        // 2. Remover no servidor
        const response = await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: subscription.endpoint
            })
        });

        const data = await response.json();

        // Mesmo se der erro no servidor, tenta remover localmente
        if (!response.ok && response.status !== 404) {
            if (window.Log) Log.warn('NOTIFICATIONS', '⚠️ Erro no servidor, removendo localmente');
        }

        // 3. Remover subscription no browser
        await subscription.unsubscribe();

        // 4. Atualizar estado
        NotificationsState.isSubscribed = false;
        NotificationsState.subscription = null;

        if (window.Log) Log.info('NOTIFICATIONS', '🔕 Notificações desativadas');

        return { sucesso: true, mensagem: 'Notificações desativadas' };

    } catch (erro) {
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro ao desativar:', erro);
        throw erro;
    } finally {
        NotificationsState.isLoading = false;
    }
}

/**
 * Atualiza preferências de notificação
 */
async function updatePreferences(newPreferences) {
    try {
        // Se não está inscrito, apenas salvar localmente
        if (!NotificationsState.isSubscribed) {
            NotificationsState.preferences = { ...NotificationsState.preferences, ...newPreferences };
            return { sucesso: true };
        }

        // Se está inscrito, re-registrar com novas preferências
        const subscription = await getCurrentSubscription();

        if (!subscription) {
            throw new Error('Subscription não encontrada');
        }

        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                preferences: { ...NotificationsState.preferences, ...newPreferences }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao atualizar preferências');
        }

        NotificationsState.preferences = { ...NotificationsState.preferences, ...newPreferences };

        if (window.Log) Log.info('NOTIFICATIONS', '✅ Preferências atualizadas');

        return { sucesso: true };

    } catch (erro) {
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro ao atualizar preferências:', erro);
        throw erro;
    }
}

// =====================================================================
// TESTE DE NOTIFICAÇÃO
// =====================================================================

/**
 * Exibe uma notificação de teste local (sem enviar pelo servidor)
 */
async function sendTestNotification() {
    if (!NotificationsState.isSupported) {
        throw new Error('Notificações não suportadas');
    }

    if (Notification.permission !== 'granted') {
        throw new Error('Permissão não concedida');
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification('Super Cartola - Teste', {
            body: 'Se você está vendo isso, as notificações estão funcionando!',
            icon: '/img/newlogo-supercartola.png',
            badge: '/img/newlogo-supercartola.png',
            tag: 'test-notification',
            vibrate: [200, 100, 200],
            data: {
                url: '/participante/configuracoes'
            }
        });

        if (window.Log) Log.info('NOTIFICATIONS', '📤 Notificação de teste enviada');

        return { sucesso: true };

    } catch (erro) {
        if (window.Log) Log.error('NOTIFICATIONS', '❌ Erro no teste:', erro);
        throw erro;
    }
}

// =====================================================================
// INICIALIZAÇÃO DO MÓDULO DE CONFIGURAÇÕES
// =====================================================================

/**
 * Inicializa a tela de configurações de notificações
 */
async function inicializarConfiguracoes() {
    if (window.Log) Log.info('NOTIFICATIONS', '🚀 Inicializando tela de configurações...');

    // ✅ v1.2: Buscar versão do app (script inline no HTML não executa em SPA)
    carregarVersaoApp();

    // Verificar suporte
    checkBrowserSupport();
    checkPermission();

    // ✅ v1.1: Verificar se sistema está configurado (VAPID keys)
    try {
        await getVapidKey();
    } catch (e) {
        // Se falhar, isSystemConfigured será false
        if (window.Log) Log.warn('NOTIFICATIONS', '⚠️ Sistema de notificações não configurado');
    }

    // Verificar status no servidor (só se sistema configurado)
    if (NotificationsState.isSystemConfigured) {
        await getNotificationStatus();
        await getCurrentSubscription();
    }

    // Renderizar UI
    renderConfiguracoesUI();

    if (window.Log) Log.info('NOTIFICATIONS', '✅ Tela de configurações inicializada');
}

/**
 * ✅ v1.2: Carrega versão do app via API
 * Script inline no HTML não executa em navegação SPA
 */
async function carregarVersaoApp() {
    try {
        const response = await fetch('/api/app/check-version?client=app');
        if (response.ok) {
            const data = await response.json();
            const versionEl = document.getElementById('appVersion');
            if (versionEl && data.version) {
                versionEl.textContent = `v${data.version}`;
                if (window.Log) Log.debug('NOTIFICATIONS', `📱 Versão carregada: ${data.version}`);
            }
        }
    } catch (e) {
        if (window.Log) Log.warn('NOTIFICATIONS', 'Erro ao buscar versão:', e);
    }
}

/**
 * Renderiza a UI de configurações
 */
function renderConfiguracoesUI() {
    const container = document.getElementById('notificacoesConfig');
    if (!container) {
        if (window.Log) Log.warn('NOTIFICATIONS', '⚠️ Container #notificacoesConfig não encontrado');
        return;
    }

    const isSupported = NotificationsState.isSupported;
    const isSystemConfigured = NotificationsState.isSystemConfigured;
    const permission = NotificationsState.permission;
    const isSubscribed = NotificationsState.isSubscribed;
    const prefs = NotificationsState.preferences;

    // ✅ v1.1: Se sistema não está configurado, mostrar mensagem amigável
    if (!isSystemConfigured) {
        container.innerHTML = `
            <h3 class="config-section-title">Notificações Push</h3>
            <div class="config-status-card status-inactive">
                <div class="status-icon-wrapper">
                    <span class="material-symbols-outlined">notifications_paused</span>
                </div>
                <div class="status-info">
                    <span class="status-label">Em breve!</span>
                    <p style="font-size: 12px; color: var(--config-text-muted); margin-top: 4px;">
                        O sistema de notificações push está sendo preparado e estará disponível em breve.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    // Status card
    let statusHtml = '';
    let statusClass = '';
    let statusIcon = '';
    let statusText = '';

    if (!isSupported) {
        statusClass = 'status-unsupported';
        statusIcon = 'block';
        statusText = 'Seu navegador não suporta notificações push';
    } else if (permission === 'denied') {
        statusClass = 'status-denied';
        statusIcon = 'notifications_off';
        statusText = 'Notificações bloqueadas. Desbloqueie nas configurações do navegador.';
    } else if (isSubscribed) {
        statusClass = 'status-active';
        statusIcon = 'notifications_active';
        statusText = 'Notificações ativadas';
    } else {
        statusClass = 'status-inactive';
        statusIcon = 'notifications_none';
        statusText = 'Notificações desativadas';
    }

    container.innerHTML = `
        <!-- Status Card -->
        <div class="config-status-card ${statusClass}">
            <div class="status-icon-wrapper">
                <span class="material-symbols-outlined">${statusIcon}</span>
            </div>
            <div class="status-info">
                <span class="status-label">${statusText}</span>
            </div>
        </div>

        <!-- Toggle Principal -->
        <div class="config-section">
            <div class="config-item toggle-item">
                <div class="config-item-info">
                    <span class="material-symbols-outlined config-icon">notifications</span>
                    <div class="config-text">
                        <span class="config-title">Receber Notificações</span>
                        <span class="config-description">Ative para receber alertas do Super Cartola</span>
                    </div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggleNotificacoes"
                           ${!isSupported || permission === 'denied' ? 'disabled' : ''}
                           ${isSubscribed ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>

        <!-- Preferências (só aparece se ativado) -->
        <div class="config-section preferences-section ${isSubscribed ? '' : 'hidden'}">
            <h3 class="config-section-title">Tipos de Notificação</h3>

            <div class="config-item preference-item">
                <div class="config-item-info">
                    <span class="material-symbols-outlined config-icon">sports_soccer</span>
                    <div class="config-text">
                        <span class="config-title">Rodada Finalizada</span>
                        <span class="config-description">Quando os jogos da rodada terminarem</span>
                    </div>
                </div>
                <label class="toggle-switch small">
                    <input type="checkbox" id="prefRodada" ${prefs.rodadaConsolidada ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="config-item preference-item">
                <div class="config-item-info">
                    <span class="material-symbols-outlined config-icon">emoji_events</span>
                    <div class="config-text">
                        <span class="config-title">Mito / Mico</span>
                        <span class="config-description">Se você foi destaque da rodada</span>
                    </div>
                </div>
                <label class="toggle-switch small">
                    <input type="checkbox" id="prefMitoMico" ${prefs.mitoMico ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="config-item preference-item">
                <div class="config-item-info">
                    <span class="material-symbols-outlined config-icon">schedule</span>
                    <div class="config-text">
                        <span class="config-title">Escalação Pendente</span>
                        <span class="config-description">Lembrete se não escalou antes do fechamento</span>
                    </div>
                </div>
                <label class="toggle-switch small">
                    <input type="checkbox" id="prefEscalacao" ${prefs.escalacaoPendente ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="config-item preference-item">
                <div class="config-item-info">
                    <span class="material-symbols-outlined config-icon">payments</span>
                    <div class="config-text">
                        <span class="config-title">Acertos Financeiros</span>
                        <span class="config-description">Quando houver movimentação no seu saldo</span>
                    </div>
                </div>
                <label class="toggle-switch small">
                    <input type="checkbox" id="prefFinanceiro" ${prefs.acertosFinanceiros ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>

        <!-- Botão de Teste -->
        <div class="config-section test-section ${isSubscribed ? '' : 'hidden'}">
            <button class="btn-test-notification" id="btnTesteNotificacao">
                <span class="material-symbols-outlined">send</span>
                <span>Enviar Notificação de Teste</span>
            </button>
        </div>

        <!-- Mensagem de erro (hidden por padrão) -->
        <div class="config-error hidden" id="configError">
            <span class="material-symbols-outlined">error</span>
            <span class="error-text"></span>
        </div>
    `;

    // Event Listeners
    setupEventListeners();
}

/**
 * Configura os event listeners da UI
 */
function setupEventListeners() {
    // Toggle principal
    const toggleNotificacoes = document.getElementById('toggleNotificacoes');
    if (toggleNotificacoes) {
        toggleNotificacoes.addEventListener('change', handleToggleNotificacoes);
    }

    // Preferências
    const prefInputs = ['prefRodada', 'prefMitoMico', 'prefEscalacao', 'prefFinanceiro'];
    prefInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', handlePreferenceChange);
        }
    });

    // Botão de teste
    const btnTeste = document.getElementById('btnTesteNotificacao');
    if (btnTeste) {
        btnTeste.addEventListener('click', handleTestClick);
    }
}

/**
 * Handler para toggle de notificações
 */
async function handleToggleNotificacoes(event) {
    const checkbox = event.target;
    const shouldEnable = checkbox.checked;

    // Desabilitar durante operação
    checkbox.disabled = true;
    showLoading(true);

    try {
        if (shouldEnable) {
            await subscribeToPush();
            showSuccess('Notificações ativadas!');
        } else {
            await unsubscribeFromPush();
            showSuccess('Notificações desativadas');
        }

        // Re-renderizar UI
        renderConfiguracoesUI();

    } catch (erro) {
        // Reverter checkbox
        checkbox.checked = !shouldEnable;
        showError(erro.message);
    } finally {
        checkbox.disabled = false;
        showLoading(false);
    }
}

/**
 * Handler para mudança de preferências
 */
async function handlePreferenceChange(event) {
    const checkbox = event.target;
    const prefKey = {
        'prefRodada': 'rodadaConsolidada',
        'prefMitoMico': 'mitoMico',
        'prefEscalacao': 'escalacaoPendente',
        'prefFinanceiro': 'acertosFinanceiros'
    }[checkbox.id];

    if (!prefKey) return;

    try {
        await updatePreferences({ [prefKey]: checkbox.checked });
        if (window.Log) Log.debug('NOTIFICATIONS', `✅ Preferência ${prefKey} = ${checkbox.checked}`);
    } catch (erro) {
        // Reverter
        checkbox.checked = !checkbox.checked;
        showError('Erro ao salvar preferência');
    }
}

/**
 * Handler para botão de teste
 */
async function handleTestClick() {
    const btn = document.getElementById('btnTesteNotificacao');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = `
        <span class="material-symbols-outlined rotating">sync</span>
        <span>Enviando...</span>
    `;

    try {
        await sendTestNotification();
        showSuccess('Notificação de teste enviada!');
    } catch (erro) {
        showError(erro.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <span class="material-symbols-outlined">send</span>
            <span>Enviar Notificação de Teste</span>
        `;
    }
}

// =====================================================================
// UI HELPERS
// =====================================================================

function showLoading(show) {
    const container = document.getElementById('notificacoesConfig');
    if (container) {
        container.style.opacity = show ? '0.6' : '1';
        container.style.pointerEvents = show ? 'none' : 'auto';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('configError');
    if (errorDiv) {
        errorDiv.classList.remove('hidden');
        errorDiv.querySelector('.error-text').textContent = message;

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    if (window.Log) Log.error('NOTIFICATIONS', `❌ UI Error: ${message}`);
}

function showSuccess(message) {
    // Usar toast global se disponível
    if (window.Toast?.show) {
        window.Toast.show(message, 'success');
    } else {
        // Fallback simples
        const toast = document.createElement('div');
        toast.className = 'notification-toast success';
        toast.innerHTML = `
            <span class="material-symbols-outlined">check_circle</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// =====================================================================
// EXPORTS
// =====================================================================

// Exportar para uso externo
export {
    checkBrowserSupport,
    checkPermission,
    getNotificationStatus,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    sendTestNotification,
    inicializarConfiguracoes,
    NotificationsState
};

// Expor globalmente para acesso via console/outros módulos
window.NotificationsModule = {
    checkBrowserSupport,
    checkPermission,
    getNotificationStatus,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    sendTestNotification,
    getState: () => NotificationsState
};

if (window.Log) Log.info('NOTIFICATIONS', '✅ Módulo carregado e exposto em window.NotificationsModule');
