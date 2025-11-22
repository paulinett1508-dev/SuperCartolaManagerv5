// PARTICIPANTE STATUS - Monitoramento de Conexão

console.log('[PARTICIPANTE-STATUS] Carregando sistema de status...');

class ParticipanteStatus {
    constructor() {
        this.isOnline = navigator.onLine;
        this.inicializar();
    }

    inicializar() {
        // Listeners de status de rede
        window.addEventListener('online', () => this.atualizarStatus(true));
        window.addEventListener('offline', () => this.atualizarStatus(false));

        // Status inicial
        this.atualizarStatus(this.isOnline);

        // Verificação periódica
        setInterval(() => this.verificarConexao(), 30000); // 30 segundos
    }

    atualizarStatus(online) {
        this.isOnline = online;

        const indicador = document.getElementById('statusIndicador');
        const texto = document.getElementById('statusTexto');

        if (!indicador || !texto) return;

        if (online) {
            indicador.style.background = '#22c55e';
            texto.textContent = 'Online';
            texto.style.color = '#22c55e';
        } else {
            indicador.style.background = '#ef4444';
            texto.textContent = 'Offline';
            texto.style.color = '#ef4444';
        }

        console.log(`[PARTICIPANTE-STATUS] ${online ? '🟢 Online' : '🔴 Offline'}`);
    }

    async verificarConexao() {
        try {
            const response = await fetch('/api/participante/auth/session', {
                method: 'HEAD',
                credentials: 'include',
                cache: 'no-cache'
            });

            this.atualizarStatus(response.ok);
        } catch (error) {
            this.atualizarStatus(false);
        }
    }
}

// Instância global
const participanteStatus = new ParticipanteStatus();

console.log('[PARTICIPANTE-STATUS] ✅ Sistema carregado');