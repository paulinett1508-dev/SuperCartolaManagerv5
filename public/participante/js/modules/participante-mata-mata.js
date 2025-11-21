
// PARTICIPANTE MATA-MATA - Módulo Mata-Mata

console.log('[PARTICIPANTE-MATA-MATA] Carregando módulo...');

window.inicializarMataMataParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-MATA-MATA] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar dados do mata-mata
        const response = await fetch(`/api/ligas/${ligaId}/mata-mata`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar mata-mata');
        }

        const dadosBase = await response.json();
        
        if (!dadosBase.edicoes || dadosBase.edicoes.length === 0) {
            mostrarMensagem('Nenhuma edição do Mata-Mata iniciada ainda');
            return;
        }

        // Renderizar seletor de edições
        renderizarSeletorEdicoes(dadosBase.edicoes, ligaId, timeId, dadosBase.rodada_atual);

    } catch (error) {
        console.error('[PARTICIPANTE-MATA-MATA] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarSeletorEdicoes(edicoes, ligaId, meuTimeId, rodadaAtual) {
    const container = document.getElementById('mataMataContainer');
    
    const html = `
        <div class="edicao-selector-participante">
            <label for="edicao-select-participante">Edição:</label>
            <select id="edicao-select-participante">
                <option value="" selected>Selecione uma edição</option>
                ${edicoes.map(e => `
                    <option value="${e.id}">${e.nome} (Rodadas ${e.rodadaInicial}-${e.rodadaFinal})</option>
                `).join('')}
            </select>
        </div>
        <div id="fase-nav-participante" style="display:none;">
            <div class="fase-nav-participante">
                <button class="fase-btn-participante active" data-fase="primeira">1ª FASE</button>
                <button class="fase-btn-participante" data-fase="oitavas">OITAVAS</button>
                <button class="fase-btn-participante" data-fase="quartas">QUARTAS</button>
                <button class="fase-btn-participante" data-fase="semis">SEMIS</button>
                <button class="fase-btn-participante" data-fase="final">FINAL</button>
            </div>
        </div>
        <div id="conteudo-mata-mata-participante">
            <p style="text-align: center; color: #999; padding: 40px;">
                Selecione uma edição para visualizar os confrontos
            </p>
        </div>
    `;

    container.innerHTML = html;

    // Event listeners
    const select = document.getElementById('edicao-select-participante');
    select.addEventListener('change', async (e) => {
        const edicaoId = parseInt(e.target.value);
        if (!edicaoId) return;

        const edicao = edicoes.find(ed => ed.id === edicaoId);
        document.getElementById('fase-nav-participante').style.display = 'block';

        // Carregar primeira fase por padrão
        await carregarFase('primeira', edicao, ligaId, meuTimeId, rodadaAtual);
    });

    // Botões de fase
    container.querySelectorAll('.fase-btn-participante').forEach(btn => {
        btn.addEventListener('click', async () => {
            const edicaoId = parseInt(select.value);
            if (!edicaoId) {
                alert('Selecione uma edição primeiro');
                return;
            }

            const edicao = edicoes.find(e => e.id === edicaoId);
            const fase = btn.getAttribute('data-fase');

            container.querySelectorAll('.fase-btn-participante').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            await carregarFase(fase, edicao, ligaId, meuTimeId, rodadaAtual);
        });
    });
}

async function carregarFase(fase, edicao, ligaId, meuTimeId, rodadaAtual) {
    const conteudo = document.getElementById('conteudo-mata-mata-participante');
    conteudo.innerHTML = '<div class="loading-participante"><div class="spinner-participante"></div><p>Carregando confrontos...</p></div>';

    try {
        // Buscar dados da fase usando a mesma rota de pontos corridos
        const rodadaPontos = obterRodadaPontos(fase, edicao);
        
        // Buscar ranking base
        const resRanking = await fetch(`/api/ligas/${ligaId}/ranking`);
        const ranking = await resRanking.json();

        // Buscar pontos da rodada específica
        const resPontos = await fetch(`/api/ligas/${ligaId}/rodadas`);
        const todasRodadas = await resPontos.json();
        
        const rodadasFase = todasRodadas.filter(r => r.rodada === rodadaPontos);
        
        // Montar confrontos
        const confrontos = montarConfrontos(fase, ranking, rodadasFase, edicao);
        
        // Renderizar
        renderizarConfrontos(confrontos, fase, edicao, meuTimeId, rodadaPontos, rodadaAtual);

    } catch (error) {
        console.error('[PARTICIPANTE-MATA-MATA] Erro ao carregar fase:', error);
        conteudo.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h3>Erro ao Carregar Confrontos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function obterRodadaPontos(fase, edicao) {
    const rodadaBase = edicao.rodadaInicial;
    const mapa = {
        'primeira': rodadaBase,
        'oitavas': rodadaBase + 1,
        'quartas': rodadaBase + 2,
        'semis': rodadaBase + 3,
        'final': rodadaBase + 4
    };
    return mapa[fase] || rodadaBase;
}

function montarConfrontos(fase, ranking, rodadasFase, edicao) {
    // Criar mapa de pontos
    const pontosPorTime = {};
    rodadasFase.forEach(r => {
        pontosPorTime[r.timeId] = r.pontos || 0;
    });

    const confrontos = [];

    if (fase === 'primeira') {
        // Primeira fase: 1º vs 32º, 2º vs 31º, etc
        for (let i = 0; i < 16; i++) {
            const timeA = ranking[i];
            const timeB = ranking[31 - i];
            
            confrontos.push({
                jogo: i + 1,
                timeA: {
                    ...timeA,
                    pontos: pontosPorTime[timeA.timeId] || null
                },
                timeB: {
                    ...timeB,
                    pontos: pontosPorTime[timeB.timeId] || null
                }
            });
        }
    } else {
        // Fases eliminatórias: buscar vencedores da fase anterior
        // Por simplicidade, mostrar mensagem
        return null;
    }

    return confrontos;
}

function renderizarConfrontos(confrontos, fase, edicao, meuTimeId, rodadaPontos, rodadaAtual) {
    const conteudo = document.getElementById('conteudo-mata-mata-participante');

    if (!confrontos) {
        conteudo.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <h3>⏳ Fase em Andamento</h3>
                <p>Os confrontos desta fase serão exibidos após a conclusão da fase anterior.</p>
            </div>
        `;
        return;
    }

    const isPendente = rodadaAtual < rodadaPontos;
    const faseNome = {
        'primeira': '1ª FASE',
        'oitavas': 'OITAVAS',
        'quartas': 'QUARTAS',
        'semis': 'SEMIS',
        'final': 'FINAL'
    }[fase] || fase;

    const html = `
        <div class="mata-mata-header-participante">
            <h3>${edicao.nome}</h3>
            <div class="confronto-titulo">${faseNome}</div>
            <div class="rodada-info">Rodada ${rodadaPontos}</div>
            ${isPendente ? '<div class="aviso-pendente">⏳ Rodada Pendente</div>' : ''}
        </div>
        <div class="confrontos-grid">
            ${confrontos.map(c => {
                const meuConfrontoA = c.timeA.timeId === parseInt(meuTimeId);
                const meuConfrontoB = c.timeB.timeId === parseInt(meuTimeId);
                const meuConfronto = meuConfrontoA || meuConfrontoB;
                
                const pontosA = isPendente ? '?' : (c.timeA.pontos?.toFixed(2) || '-');
                const pontosB = isPendente ? '?' : (c.timeB.pontos?.toFixed(2) || '-');

                let vencedor = null;
                if (!isPendente && c.timeA.pontos !== null && c.timeB.pontos !== null) {
                    if (c.timeA.pontos > c.timeB.pontos) vencedor = 'A';
                    else if (c.timeB.pontos > c.timeA.pontos) vencedor = 'B';
                }

                return `
                    <div class="confronto-card ${meuConfronto ? 'meu-confronto' : ''}">
                        <div class="confronto-numero">Jogo ${c.jogo}</div>
                        <div class="time-confronto ${vencedor === 'A' ? 'vencedor' : ''}">
                            <span class="time-nome">${c.timeA.nome_time || c.timeA.nome_cartola || 'N/D'}</span>
                            <span class="time-placar">${pontosA}</span>
                        </div>
                        <div class="vs">VS</div>
                        <div class="time-confronto ${vencedor === 'B' ? 'vencedor' : ''}">
                            <span class="time-placar">${pontosB}</span>
                            <span class="time-nome">${c.timeB.nome_time || c.timeB.nome_cartola || 'N/D'}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    conteudo.innerHTML = html;
}

function mostrarMensagem(mensagem) {
    const container = document.getElementById('mataMataContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <p>${mensagem}</p>
        </div>
    `;
}

function mostrarErro(mensagem) {
    const container = document.getElementById('mataMataContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Mata-Mata</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-MATA-MATA] ✅ Módulo carregado');
