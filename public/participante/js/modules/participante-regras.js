// =====================================================================
// PARTICIPANTE-REGRAS.JS - v1.0 (Regras dos Módulos)
// =====================================================================
// Exibe as regras de cada módulo da liga em formato accordion
// Conteúdo editável pelo admin via painel
// =====================================================================

if (window.Log) Log.info('PARTICIPANTE-REGRAS', 'Carregando módulo v1.0...');

export async function inicializarRegrasParticipante(params) {
    let ligaId;

    if (typeof params === 'object' && params !== null) {
        ligaId = params.ligaId;
    } else {
        ligaId = params;
    }

    // Fallback
    if (!ligaId && window.participanteAuth) {
        ligaId = window.participanteAuth.ligaId;
    }

    const loadingEl = document.getElementById('regras-loading');
    const listaEl = document.getElementById('regras-lista');
    const erroEl = document.getElementById('regras-erro');

    if (!ligaId) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (erroEl) erroEl.style.display = 'block';
        return;
    }

    try {
        const resp = await fetch(`/api/regras-modulos/${ligaId}`);
        const data = await resp.json();

        if (loadingEl) loadingEl.style.display = 'none';

        if (!data.sucesso || !data.regras || data.regras.length === 0) {
            if (erroEl) erroEl.style.display = 'block';
            return;
        }

        renderizarRegras(data.regras, listaEl);
        if (listaEl) listaEl.style.display = 'flex';

        if (window.Log) Log.info('PARTICIPANTE-REGRAS', `✅ ${data.regras.length} regras carregadas`);

    } catch (error) {
        if (window.Log) Log.error('PARTICIPANTE-REGRAS', '❌ Erro:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (erroEl) erroEl.style.display = 'block';
    }
}

function renderizarRegras(regras, container) {
    if (!container) return;

    container.innerHTML = regras.map((regra, index) => {
        const cor = regra.cor || '#ff5500';
        const icone = regra.icone || 'description';
        const titulo = regra.titulo || regra.modulo;
        const conteudo = regra.conteudo_html || '<p>Conteúdo não disponível.</p>';

        // Primeiro item aberto por padrão
        const openClass = index === 0 ? 'open' : '';

        return `
            <div class="regra-accordion ${openClass}" data-modulo="${regra.modulo}">
                <div class="regra-accordion-header" onclick="toggleRegraAccordion(this)">
                    <div class="regra-acc-icon" style="background:${cor}20;">
                        <span class="material-icons" style="color:${cor};">${icone}</span>
                    </div>
                    <div class="regra-acc-info">
                        <div class="regra-acc-titulo">${titulo}</div>
                        <div class="regra-acc-sub">Toque para ver detalhes</div>
                    </div>
                    <span class="material-icons regra-acc-chevron">expand_more</span>
                </div>
                <div class="regra-accordion-body">
                    <div class="regra-accordion-content">
                        ${conteudo}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle accordion global function
window.toggleRegraAccordion = function(headerEl) {
    const accordion = headerEl.closest('.regra-accordion');
    if (!accordion) return;

    const wasOpen = accordion.classList.contains('open');

    // Toggle
    accordion.classList.toggle('open');

    // Update subtitle
    const sub = accordion.querySelector('.regra-acc-sub');
    if (sub) {
        sub.textContent = wasOpen ? 'Toque para ver detalhes' : 'Toque para recolher';
    }
};
