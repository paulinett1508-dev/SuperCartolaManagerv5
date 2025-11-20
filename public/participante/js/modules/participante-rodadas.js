
// PARTICIPANTE RODADAS - Módulo de Rodadas

console.log('[PARTICIPANTE-RODADAS] Carregando módulo...');

let todasRodadasCache = []; // Cache de todas as rodadas
let filtroAtual = 'todas'; // Estado do filtro

window.inicializarRodadasParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-RODADAS] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar todas as rodadas da liga
        const responseTodasRodadas = await fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`);
        
        if (!responseTodasRodadas.ok) {
            throw new Error('Erro ao buscar rodadas da liga');
        }

        const todasRodadas = await responseTodasRodadas.json();
        console.log(`[PARTICIPANTE-RODADAS] Total de rodadas recebidas: ${todasRodadas.length}`);

        // Filtrar rodadas do participante
        const minhasRodadas = todasRodadas.filter(r => String(r.timeId) === String(timeId));
        
        // Agrupar rodadas por número
        const rodadasAgrupadas = agruparRodadasPorNumero(todasRodadas, timeId);
        
        // Armazenar no cache
        todasRodadasCache = {
            todas: rodadasAgrupadas,
            minhas: minhasRodadas.map(r => ({
                numero: r.rodada,
                pontos: r.pontos || 0,
                capitao: 'N/D',
                patrimonio: 0
            }))
        };

        // Renderizar com filtro atual
        renderizarRodadas(todasRodadasCache[filtroAtual]);

    } catch (error) {
        console.error('[PARTICIPANTE-RODADAS] Erro:', error);
        mostrarErro(error.message);
    }
};

// Função para agrupar rodadas por número
function agruparRodadasPorNumero(rodadas, meuTimeId) {
    const rodadasMap = new Map();
    
    rodadas.forEach(r => {
        const rodadaNum = r.rodada;
        if (!rodadasMap.has(rodadaNum)) {
            rodadasMap.set(rodadaNum, {
                numero: rodadaNum,
                pontos: 0,
                meusPontos: null,
                participantes: 0,
                jogou: false
            });
        }
        
        const rodadaData = rodadasMap.get(rodadaNum);
        rodadaData.participantes++;
        
        // Se for minha rodada
        if (String(r.timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = true;
        }
    });
    
    return Array.from(rodadasMap.values()).sort((a, b) => b.numero - a.numero);
}

// Função global para alternar filtros
window.filtrarRodadas = function(tipo) {
    console.log(`[PARTICIPANTE-RODADAS] Alterando filtro para: ${tipo}`);
    
    filtroAtual = tipo;
    
    // Atualizar botões
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filtro === tipo);
    });
    
    // Renderizar rodadas filtradas
    if (todasRodadasCache[tipo]) {
        renderizarRodadas(todasRodadasCache[tipo]);
    }
};

function renderizarRodadas(rodadas) {
    const container = document.getElementById('rodadasContainer');
    
    if (!rodadas || rodadas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhuma rodada encontrada</p>';
        return;
    }

    let html = '';
    
    if (filtroAtual === 'todas') {
        // Visualização de todas as rodadas (resumida)
        html = rodadas.map(rodada => {
            const jogou = rodada.jogou;
            const pontos = rodada.meusPontos !== null ? rodada.meusPontos : 0;
            const statusClass = jogou ? 'jogou' : 'nao-jogou';
            
            return `
                <div class="rodada-card ${statusClass}">
                    <div class="rodada-titulo">
                        <span class="rodada-numero">Rodada ${rodada.numero}</span>
                        <span class="rodada-pontos ${jogou ? '' : 'status-nao-jogou'}">
                            ${jogou ? `${pontos.toFixed(2)} pts` : 'Não jogou'}
                        </span>
                    </div>
                    <div class="rodada-detalhes">
                        <p><strong>Participantes:</strong> ${rodada.participantes} times</p>
                        ${jogou ? `<p><strong>Status:</strong> ✅ Rodada disputada</p>` : `<p><strong>Status:</strong> ⚠️ Rodada não disputada</p>`}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // Visualização só das minhas rodadas (detalhada)
        html = rodadas.map(rodada => `
            <div class="rodada-card">
                <div class="rodada-titulo">
                    <span class="rodada-numero">Rodada ${rodada.numero}</span>
                    <span class="rodada-pontos">${(rodada.pontos || 0).toFixed(2)} pts</span>
                </div>
                <div class="rodada-detalhes">
                    <p><strong>Capitão:</strong> ${rodada.capitao || 'N/D'}</p>
                    <p><strong>Patrimônio:</strong> C$ ${(rodada.patrimonio || 0).toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    }

    container.innerHTML = html;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('rodadasContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Rodadas</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-RODADAS] ✅ Módulo carregado');
