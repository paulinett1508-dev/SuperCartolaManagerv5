/**
 * SuperModal - Sistema Unificado de Modais & Toasts
 * ==================================================
 * Substitui alert(), confirm() e prompt() nativos.
 *
 * USO:
 *   SuperModal.toast.success('Salvo com sucesso!');
 *   SuperModal.toast.error('Erro: ' + err.message);
 *   SuperModal.toast.warning('Preencha todos os campos');
 *   SuperModal.toast.info('Nenhum dado encontrado');
 *
 *   const ok = await SuperModal.confirm({ message: 'Excluir?' });
 *   const val = await SuperModal.prompt({ message: 'Informe:' });
 */
(function (root) {
    'use strict';

    // ========================================
    // Estado interno
    // ========================================
    let toastContainer = null;
    let toastCount = 0;
    const MAX_TOASTS = 5;
    const DEFAULT_TOAST_DURATION = 4000;

    const ICONS = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info',
        confirm: 'help_outline',
        danger: 'warning',
        prompt: 'edit'
    };

    // ========================================
    // Helpers
    // ========================================
    function ensureToastContainer() {
        if (toastContainer && document.body.contains(toastContainer)) return;
        toastContainer = document.createElement('div');
        toastContainer.className = 'super-toast-container';
        toastContainer.setAttribute('aria-live', 'polite');
        toastContainer.setAttribute('role', 'region');
        toastContainer.setAttribute('aria-label', 'Notificações');
        document.body.appendChild(toastContainer);
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return str;
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function removeElement(el, animClass) {
        if (!el || el._removing) return;
        el._removing = true;
        el.classList.add(animClass || 'removing');
        el.addEventListener('animationend', () => el.remove(), { once: true });
        // Fallback se animação não disparar
        setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
    }

    // ========================================
    // TOAST
    // ========================================
    function toast(opts) {
        if (typeof opts === 'string') opts = { message: opts };
        const {
            message = '',
            type = 'info',
            duration = DEFAULT_TOAST_DURATION,
            icon = ICONS[type] || ICONS.info
        } = opts;

        ensureToastContainer();

        // Limitar número de toasts visíveis
        while (toastContainer.children.length >= MAX_TOASTS) {
            removeElement(toastContainer.firstElementChild, 'removing');
        }

        const el = document.createElement('div');
        el.className = `super-toast super-toast--${type}`;
        el.innerHTML = `
            <span class="material-icons super-toast__icon">${escapeHtml(icon)}</span>
            <span class="super-toast__content">${escapeHtml(message)}</span>
            <button class="super-toast__close material-icons" aria-label="Fechar">close</button>
            ${duration > 0 ? `<div class="super-toast__progress" style="animation: super-progress-shrink ${duration}ms linear forwards"></div>` : ''}
        `;

        el.querySelector('.super-toast__close').addEventListener('click', () => removeElement(el));

        toastContainer.appendChild(el);
        toastCount++;

        if (duration > 0) {
            setTimeout(() => removeElement(el), duration);
        }

        return el;
    }

    // Atalhos
    toast.success = (msg, opts) => toast({ message: msg, type: 'success', ...opts });
    toast.error = (msg, opts) => toast({ message: msg, type: 'error', duration: 6000, ...opts });
    toast.warning = (msg, opts) => toast({ message: msg, type: 'warning', ...opts });
    toast.info = (msg, opts) => toast({ message: msg, type: 'info', ...opts });

    // ========================================
    // CONFIRM
    // ========================================
    function confirm(opts) {
        if (typeof opts === 'string') opts = { message: opts };
        const {
            title = 'Confirmação',
            message = '',
            confirmText = 'OK',
            cancelText = 'Cancelar',
            variant = 'default',
            icon = variant === 'danger' ? ICONS.danger : ICONS.confirm
        } = opts;

        return new Promise((resolve) => {
            const prevFocus = document.activeElement;

            // Backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'super-modal-backdrop';

            // Modal
            const modal = document.createElement('div');
            modal.className = `super-modal super-modal--${variant}`;
            modal.setAttribute('role', 'alertdialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'sm-title');
            modal.setAttribute('aria-describedby', 'sm-msg');

            modal.innerHTML = `
                <div class="super-modal__icon-wrapper">
                    <span class="material-icons">${escapeHtml(icon)}</span>
                </div>
                <div class="super-modal__body">
                    <h3 class="super-modal__title" id="sm-title">${escapeHtml(title)}</h3>
                    <p class="super-modal__message" id="sm-msg">${escapeHtml(message)}</p>
                </div>
                <div class="super-modal__actions">
                    <button class="super-modal__btn super-modal__btn--cancel">${escapeHtml(cancelText)}</button>
                    <button class="super-modal__btn super-modal__btn--confirm">${escapeHtml(confirmText)}</button>
                </div>
            `;

            const btnCancel = modal.querySelector('.super-modal__btn--cancel');
            const btnConfirm = modal.querySelector('.super-modal__btn--confirm');

            function close(result) {
                removeElement(modal, 'removing');
                removeElement(backdrop, 'removing');
                if (prevFocus && prevFocus.focus) {
                    setTimeout(() => prevFocus.focus(), 50);
                }
                resolve(result);
            }

            btnConfirm.addEventListener('click', () => close(true));
            btnCancel.addEventListener('click', () => close(false));
            backdrop.addEventListener('click', () => close(false));

            function onKey(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close(false);
                    document.removeEventListener('keydown', onKey);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    close(true);
                    document.removeEventListener('keydown', onKey);
                } else if (e.key === 'Tab') {
                    // Focus trap
                    const focusables = [btnCancel, btnConfirm];
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }

            document.addEventListener('keydown', onKey);
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            // Auto-focus no botão confirmar
            setTimeout(() => btnConfirm.focus(), 50);
        });
    }

    // ========================================
    // PROMPT
    // ========================================
    function prompt(opts) {
        if (typeof opts === 'string') opts = { message: opts };
        const {
            title = 'Entrada',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = 'OK',
            cancelText = 'Cancelar'
        } = opts;

        return new Promise((resolve) => {
            const prevFocus = document.activeElement;

            const backdrop = document.createElement('div');
            backdrop.className = 'super-modal-backdrop';

            const modal = document.createElement('div');
            modal.className = 'super-modal super-modal--info';
            modal.setAttribute('role', 'alertdialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'sm-prompt-title');
            modal.setAttribute('aria-describedby', 'sm-prompt-msg');

            modal.innerHTML = `
                <div class="super-modal__icon-wrapper">
                    <span class="material-icons">${escapeHtml(ICONS.prompt)}</span>
                </div>
                <div class="super-modal__body">
                    <h3 class="super-modal__title" id="sm-prompt-title">${escapeHtml(title)}</h3>
                    <p class="super-modal__message" id="sm-prompt-msg">${escapeHtml(message)}</p>
                    <input type="text" class="super-modal__input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" />
                </div>
                <div class="super-modal__actions">
                    <button class="super-modal__btn super-modal__btn--cancel">${escapeHtml(cancelText)}</button>
                    <button class="super-modal__btn super-modal__btn--confirm">${escapeHtml(confirmText)}</button>
                </div>
            `;

            const btnCancel = modal.querySelector('.super-modal__btn--cancel');
            const btnConfirm = modal.querySelector('.super-modal__btn--confirm');
            const input = modal.querySelector('.super-modal__input');

            function close(confirmed) {
                const val = confirmed ? input.value : null;
                removeElement(modal, 'removing');
                removeElement(backdrop, 'removing');
                if (prevFocus && prevFocus.focus) {
                    setTimeout(() => prevFocus.focus(), 50);
                }
                document.removeEventListener('keydown', onKey);
                resolve(val);
            }

            btnConfirm.addEventListener('click', () => close(true));
            btnCancel.addEventListener('click', () => close(false));
            backdrop.addEventListener('click', () => close(false));

            function onKey(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close(false);
                } else if (e.key === 'Enter' && document.activeElement !== btnCancel) {
                    e.preventDefault();
                    close(true);
                } else if (e.key === 'Tab') {
                    const focusables = [input, btnCancel, btnConfirm];
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }

            document.addEventListener('keydown', onKey);
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);

            // Auto-focus no input
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        });
    }

    // ========================================
    // API Pública
    // ========================================
    const SuperModal = { toast, confirm, prompt };

    // Registrar globalmente
    root.SuperModal = SuperModal;

    // Suporte a ES6 modules (se importado via script type="module")
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SuperModal;
    }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
