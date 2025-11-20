// PARTICIPANTE RODADAS - Grid de Cards + Detalhamento

console.log('[PARTICIPANTE-RODADAS] Carregando módulo...');

let todasRodadasCache = [];
let meuTimeId = null;
let ligaId = null;
let rodadaSelecionada = null;

// Função de inicialização
window.inicializarRodadasParticipante = async function(ligaIdParam, timeIdParam) {
    console.log(`[PARTICIPANTE-RODADAS] Inicializando para time ${timeIdParam} na liga ${ligaIdParam}`);

    ligaId = ligaIdParam;
    meuTimeId = timeIdParam;

    try {
        // Buscar todas as rodadas da liga
        const response = await fetch(`/api/rodadas/${ligaId}/rodadas?inicio=1&fim=38`);

        if (!response.ok) {
            throw new Error('Erro ao buscar rodadas da liga');
        }

        const rodadas = await response.json();
        console.log(`[PARTICIPANTE-RODADAS] Total de rodadas recebidas: ${rodadas.length}`);

        // Agrupar rodadas por número
        const rodadasAgrupadas = agruparRodadasPorNumero(rodadas);
        todasRodadasCache = rodadasAgrupadas;

        // Renderizar grid de cards
        renderizarCardsRodadas(rodadasAgrupadas);

    } catch (error) {
        console.error('[PARTICIPANTE-RODADAS] Erro:', error);
        mostrarErro(error.message);
    }
};

// Agrupar rodadas por número
function agruparRodadasPorNumero(rodadas) {
    const rodadasMap = new Map();

    rodadas.forEach(r => {
        const rodadaNum = r.rodada;
        if (!rodadasMap.has(rodadaNum)) {
            rodadasMap.set(rodadaNum, {
                numero: rodadaNum,
                participantes: [],
                meusPontos: null,
                jogou: false
            });
        }

        const rodadaData = rodadasMap.get(rodadaNum);
        rodadaData.participantes.push(r);

        // Se for minha rodada
        if (String(r.timeId) === String(meuTimeId)) {
            rodadaData.meusPontos = r.pontos || 0;
            rodadaData.jogou = !r.rodadaNaoJogada;
            // Adicionar posição financeira para o meu time
            rodadaData.posicaoFinanceira = r.posicaoFinanceira;
        }
    });

    return Array.from(rodadasMap.values()).sort((a, b) => a.numero - b.numero);
}

// Renderizar grid de cards
function renderizarCardsRodadas(rodadas) {
    const container = document.getElementById('rodadasCardsGrid');

    if (!rodadas || rodadas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhuma rodada encontrada</p>';
        return;
    }

    const html = rodadas.map(rodada => {
        const statusClass = rodada.jogou ? 'jogou' : 'nao-jogou';
        const pontos = rodada.meusPontos !== null ? rodada.meusPontos.toFixed(2) : '-';
        const statusTexto = rodada.jogou ? `${pontos} pts` : 'Não jogou';

        // Determinar destaque visual baseado na posição financeira
        let corFonte = '';
        let icone = '';

        if (rodada.jogou && rodada.posicaoFinanceira) {
            const pos = rodada.posicaoFinanceira;
            const totalParticipantes = rodada.participantes.length;

            // Zona de ganho (verde)
            if (pos <= Math.ceil(totalParticipantes * 0.3)) {
                corFonte = 'color: #10b981;';
                if (pos === 1) icone = ' 🎩'; // MITO
            }
            // Zona neutra (branco)
            else if (pos <= Math.ceil(totalParticipantes * 0.7)) {
                corFonte = 'color: #fff;';
            }
            // Zona de perda (vermelho)
            else {
                corFonte = 'color: #ef4444;';
                if (pos === totalParticipantes) icone = ' 🐵'; // MICO
            }
        }

        return `
            <div class="rodada-mini-card ${statusClass}" onclick="window.selecionarRodada(${rodada.numero})" data-rodada="${rodada.numero}">
                <div class="numero">Rodada ${rodada.numero}</div>
                <div class="pontos" style="${corFonte}">${statusTexto}${icone}</div>
                <div class="status">${rodada.participantes.length} times</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Selecionar rodada e mostrar detalhamento
window.selecionarRodada = async function(numeroRodada) {
    console.log(`[PARTICIPANTE-RODADAS] Selecionando rodada ${numeroRodada}`);

    rodadaSelecionada = numeroRodada;

    // Atualizar visual dos cards
    document.querySelectorAll('.rodada-mini-card').forEach(card => {
        card.classList.remove('selected');
    });

    const cardSelecionado = document.querySelector(`[data-rodada="${numeroRodada}"]`);
    if (cardSelecionado) {
        cardSelecionado.classList.add('selected');
    }

    // Buscar dados da rodada
    const rodadaData = todasRodadasCache.find(r => r.numero === numeroRodada);

    if (!rodadaData) {
        console.error('[PARTICIPANTE-RODADAS] Dados da rodada não encontrados');
        return;
    }

    // Renderizar detalhamento
    renderizarDetalhamentoRodada(rodadaData);

    // Mostrar seção de detalhamento
    document.getElementById('rodadaDetalhamento').style.display = 'block';

    // Scroll suave para o detalhamento
    document.getElementById('rodadaDetalhamento').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
};

// Renderizar detalhamento da rodada
function renderizarDetalhamentoRodada(rodadaData) {
    // Atualizar título
    document.getElementById('rodadaTitulo').textContent = `Rodada ${rodadaData.numero}`;

    // Ordenar participantes por pontuação
    const participantesOrdenados = [...rodadaData.participantes].sort((a, b) => 
        (b.pontos || 0) - (a.pontos || 0)
    );

    const totalParticipantes = participantesOrdenados.length;

    // Renderizar tabela
    const tbody = document.getElementById('rankingBody');

    const html = participantesOrdenados.map((participante, index) => {
        const isMeuTime = String(participante.timeId) === String(meuTimeId);
        const posicao = index + 1;

        // Calcular financeiro baseado na posição
        let financeiro = 0;
        const zonaGanho = Math.ceil(totalParticipantes * 0.3);
        const zonaNeutra = Math.ceil(totalParticipantes * 0.7);

        if (posicao <= zonaGanho) {
            financeiro = (zonaGanho - posicao + 1) * 10; // Exemplo: 10 por posição
        } else if (posicao > zonaNeutra) {
            financeiro = -(posicao - zonaNeutra) * 10; // Negativo na zona de perda
        }

        const financeiroTexto = financeiro > 0 ? `+R$ ${financeiro}` : 
                               financeiro < 0 ? `-R$ ${Math.abs(financeiro)}` : 
                               'R$ 0';

        const financeiroClass = financeiro > 0 ? 'financeiro-positivo' : 
                               financeiro < 0 ? 'financeiro-negativo' : 
                               'financeiro-neutro';

        // Adicionar ícones MITO/MICO apenas para o meu time
        let icone = '';
        if (isMeuTime) {
            if (posicao === 1) {
                icone = ' 🎩';
            } else if (posicao === totalParticipantes) {
                icone = ' 🐵';
            }
        }

        return `
            <tr class="${isMeuTime ? 'meu-time' : ''}">
                <td style="text-align: center;">
                    <span class="posicao-badge">${posicao}º${icone}</span>
                </td>
                <td>${participante.nome_time || 'N/D'}</td>
                <td>${participante.nome_cartola || 'N/D'}</td>
                <td style="text-align: center;" class="pontos-destaque">
                    ${(participante.pontos || 0).toFixed(2)}
                </td>
                <td style="text-align: center;" class="${financeiroClass}">
                    ${financeiroTexto}
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum dado disponível</td></tr>';
}

// Voltar para os cards
window.voltarParaCards = function() {
    document.getElementById('rodadaDetalhamento').style.display = 'none';

    // Remover seleção
    document.querySelectorAll('.rodada-mini-card').forEach(card => {
        card.classList.remove('selected');
    });

    rodadaSelecionada = null;

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Mostrar erro
function mostrarErro(mensagem) {
    const container = document.getElementById('rodadasCardsGrid');
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Rodadas</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-RODADAS] ✅ Módulo carregado');