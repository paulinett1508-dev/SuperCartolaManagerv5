// =====================================================================
// PARTICIPANTE-REGRAS.JS - v1.0 (Regras dos Módulos)
// =====================================================================
// Exibe as regras de cada módulo da liga em formato accordion
// Conteúdo editável pelo admin via painel
// =====================================================================

console.log('[REGRAS] 🚀 Módulo v1.1 carregado');
if (window.Log) Log.info('PARTICIPANTE-REGRAS', 'Carregando módulo v1.1...');

export async function inicializarRegrasParticipante(params) {
    if (window.Log) Log.info('PARTICIPANTE-REGRAS', '🚀 Iniciando com params:', params);

    let ligaId;

    if (typeof params === 'object' && params !== null) {
        ligaId = params.ligaId;
    } else {
        ligaId = params;
    }

    // Fallback
    if (!ligaId && window.participanteAuth) {
        ligaId = window.participanteAuth.ligaId;
        if (window.Log) Log.info('PARTICIPANTE-REGRAS', '📍 ligaId obtido do participanteAuth:', ligaId);
    }

    const loadingEl = document.getElementById('regras-loading');
    const listaEl = document.getElementById('regras-lista');
    const erroEl = document.getElementById('regras-erro');

    if (window.Log) Log.info('PARTICIPANTE-REGRAS', '🔍 Elementos DOM:', {
        loadingEl: !!loadingEl,
        listaEl: !!listaEl,
        erroEl: !!erroEl,
        ligaId
    });

    if (!ligaId) {
        if (window.Log) Log.error('PARTICIPANTE-REGRAS', '❌ Sem ligaId - mostrando erro');
        if (loadingEl) loadingEl.style.display = 'none';
        if (erroEl) erroEl.style.display = 'block';
        return;
    }

    try {
        if (window.Log) Log.info('PARTICIPANTE-REGRAS', `📡 Buscando: /api/regras-modulos/${ligaId}`);
        const resp = await fetch(`/api/regras-modulos/${ligaId}`);
        const data = await resp.json();

        if (window.Log) Log.info('PARTICIPANTE-REGRAS', '📦 Resposta API:', {
            sucesso: data.sucesso,
            totalRegras: data.regras?.length || 0
        });

        if (loadingEl) loadingEl.style.display = 'none';

        if (!data.sucesso || !data.regras || data.regras.length === 0) {
            if (window.Log) Log.warn('PARTICIPANTE-REGRAS', '⚠️ Sem regras - mostrando erro');
            if (erroEl) erroEl.style.display = 'block';
            return;
        }

        if (window.Log) Log.info('PARTICIPANTE-REGRAS', `🎨 Renderizando ${data.regras.length} regras no container:`, listaEl);
        renderizarRegras(data.regras, listaEl);

        if (listaEl) {
            listaEl.style.display = 'flex';
            if (window.Log) Log.info('PARTICIPANTE-REGRAS', '✅ Container exibido, innerHTML length:', listaEl.innerHTML.length);
        }

        console.log(`[REGRAS] ✅ ${data.regras.length} accordions renderizados`);
        if (window.Log) Log.info('PARTICIPANTE-REGRAS', `✅ ${data.regras.length} regras carregadas com sucesso`);

    } catch (error) {
        console.error('[REGRAS] ❌ Erro:', error);
        if (window.Log) Log.error('PARTICIPANTE-REGRAS', '❌ Erro:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (erroEl) erroEl.style.display = 'block';
    }
}

function renderizarRegras(regras, container) {
    if (!container) {
        if (window.Log) Log.error('PARTICIPANTE-REGRAS', '❌ Container não encontrado em renderizarRegras!');
        return;
    }
    if (window.Log) Log.info('PARTICIPANTE-REGRAS', `🔧 renderizarRegras() - ${regras.length} regras`);

    // Armazenar regras globalmente para acesso no modal
    window.__regrasData = regras;

    container.innerHTML = regras.map((regra, index) => {
        const cor = regra.cor || 'var(--app-primary)';
        const icone = regra.icone || 'description';
        const titulo = regra.titulo || regra.modulo;

        return `
            <div class="regra-chip" onclick="abrirModalRegra(${index})" data-modulo="${regra.modulo}">
                <div class="regra-chip-icon" style="background:${cor}20;">
                    <span class="material-icons" style="color:${cor};">${icone}</span>
                </div>
                <div class="regra-chip-titulo">${titulo}</div>
            </div>
        `;
    }).join('');
}

// Abrir modal com detalhes da regra
window.abrirModalRegra = function(index) {
    const regras = window.__regrasData;
    if (!regras || !regras[index]) {
        if (window.Log) Log.error('PARTICIPANTE-REGRAS', '❌ Regra não encontrada:', index);
        return;
    }

    const regra = regras[index];
    const cor = regra.cor || 'var(--app-primary)';
    const icone = regra.icone || 'description';
    const titulo = regra.titulo || regra.modulo;
    const conteudo = regra.conteudo_html || '<p>Conteúdo não disponível.</p>';

    // Elementos do modal
    const modal = document.getElementById('regras-modal');
    const modalIcon = document.getElementById('regras-modal-icon');
    const modalTitulo = document.getElementById('regras-modal-titulo');
    const modalBody = document.getElementById('regras-modal-body');

    if (!modal || !modalIcon || !modalTitulo || !modalBody) {
        if (window.Log) Log.error('PARTICIPANTE-REGRAS', '❌ Elementos do modal não encontrados');
        return;
    }

    // Preencher modal
    modalIcon.style.background = `${cor}20`;
    modalIcon.innerHTML = `<span class="material-icons" style="color:${cor};">${icone}</span>`;
    modalTitulo.textContent = titulo;
    modalBody.innerHTML = conteudo;

    // Resetar scroll
    modalBody.scrollTop = 0;

    // Exibir modal
    modal.style.display = 'block';

    // Prevenir scroll do body
    document.body.style.overflow = 'hidden';

    if (window.Log) Log.info('PARTICIPANTE-REGRAS', `✅ Modal aberto para: ${titulo}`);
};

// Fechar modal
window.fecharModalRegra = function() {
    const modal = document.getElementById('regras-modal');
    if (!modal) return;

    modal.style.display = 'none';

    // Restaurar scroll do body
    document.body.style.overflow = '';

    if (window.Log) Log.info('PARTICIPANTE-REGRAS', '✅ Modal fechado');
};
