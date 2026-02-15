/**
 * Admin Análises IA - Frontend Module
 * Gerencia solicitação e visualização de análises via Claude LLM
 */

const API_BASE = '/api/admin/ia-analysis';

// State
let currentAnalises = [];

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarRateLimitInfo();
    await carregarHistorico();
    setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const form = document.getElementById('formNovaAnalise');
    form.addEventListener('submit', handleSubmitAnalise);
}

// ============================================
// RATE LIMIT INFO
// ============================================
async function carregarRateLimitInfo() {
    try {
        const response = await fetch(`${API_BASE}/rate-limit/status`);
        const data = await response.json();

        if (data.success) {
            const { hourly, daily, global } = data.limits;

            const infoDiv = document.getElementById('rateLimitInfo');
            infoDiv.innerHTML = `
                <strong>Limites de uso:</strong><br>
                • Horário: ${hourly.used}/${hourly.limit} análises (restam ${hourly.remaining})<br>
                • Diário: ${daily.used}/${daily.limit} análises (restam ${daily.remaining})<br>
                • Global: ${global.used}/${global.limit} análises (restam ${global.remaining})
            `;

            // Alertar se próximo do limite
            if (hourly.remaining <= 2 || daily.remaining <= 5) {
                infoDiv.style.background = 'rgba(239, 68, 68, 0.15)';
                infoDiv.style.borderLeftColor = '#ef4444';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar rate limit:', error);
    }
}

// ============================================
// SOLICITAR NOVA ANÁLISE
// ============================================
async function handleSubmitAnalise(e) {
    e.preventDefault();

    const tipo = document.getElementById('tipoAnalise').value;
    const contextoRaw = document.getElementById('contextoAnalise').value;

    // Validar
    if (!tipo || !contextoRaw) {
        alert('Preencha todos os campos');
        return;
    }

    // Tentar parsear contexto como JSON
    let contexto;
    try {
        contexto = JSON.parse(contextoRaw);
    } catch {
        // Se não for JSON válido, usar como texto livre
        contexto = { prompt: contextoRaw, dados: {} };
    }

    // Mostrar loading
    const btn = document.getElementById('btnSolicitar');
    const spinner = document.getElementById('loadingSpinner');
    btn.disabled = true;
    spinner.classList.add('active');

    try {
        const response = await fetch(`${API_BASE}/solicitar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo,
                contexto,
                useCache: true
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao solicitar análise');
        }

        if (data.success) {
            alert('Análise concluída com sucesso!');

            // Atualizar rate limit
            await carregarRateLimitInfo();

            // Recarregar histórico
            await carregarHistorico();

            // Limpar form
            document.getElementById('formNovaAnalise').reset();
        }

    } catch (error) {
        console.error('Erro:', error);
        alert(`Erro: ${error.message}`);
    } finally {
        btn.disabled = false;
        spinner.classList.remove('active');
    }
}

// ============================================
// CARREGAR HISTÓRICO
// ============================================
async function carregarHistorico() {
    try {
        const response = await fetch(`${API_BASE}/historico?limit=10`);
        const data = await response.json();

        if (data.success) {
            currentAnalises = data.analises;
            renderHistorico();
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

// ============================================
// RENDERIZAR HISTÓRICO
// ============================================
function renderHistorico() {
    const container = document.getElementById('historicoContainer');

    if (currentAnalises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="material-icons">inbox</div>
                <p>Nenhuma análise encontrada</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentAnalises.map(analise => {
        const data = new Date(analise.criadoEm).toLocaleString('pt-BR');
        const tipo = formatarTipo(analise.tipo);
        const tokens = analise.tokensUsados?.total || 0;
        const custo = analise.custoEstimado || 0;
        const tempo = analise.tempoResposta || 0;

        return `
            <div class="analise-card">
                <div class="analise-card-header">
                    <div>
                        <div class="analise-tipo">${tipo}</div>
                        <div class="analise-data">${data}</div>
                    </div>
                    ${analise.fromCache ? '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem;">CACHE</span>' : ''}
                </div>

                <div class="analise-resposta">
${analise.resposta || 'Sem resposta'}
                </div>

                <div class="analise-meta">
                    <span>
                        <span class="material-icons" style="font-size: 14px;">token</span>
                        ${tokens} tokens
                    </span>
                    <span>
                        <span class="material-icons" style="font-size: 14px;">attach_money</span>
                        $${custo.toFixed(4)}
                    </span>
                    <span>
                        <span class="material-icons" style="font-size: 14px;">schedule</span>
                        ${(tempo / 1000).toFixed(2)}s
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// HELPERS
// ============================================
function formatarTipo(tipo) {
    const tipos = {
        'financeiro-auditoria': 'Auditoria Financeira',
        'performance-participante': 'Performance Participante',
        'comportamento-liga': 'Comportamento da Liga',
        'diagnostico-sistema': 'Diagnóstico de Sistema',
        'generico': 'Análise Genérica'
    };
    return tipos[tipo] || tipo;
}
