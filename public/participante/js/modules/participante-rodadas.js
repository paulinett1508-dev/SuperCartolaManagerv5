// PARTICIPANTE RODADAS - Grid de Cards + Detalhamento

console.log('[PARTICIPANTE-RODADAS] Carregando módulo...');

// Importar configurações de valores de banco
const LIGAS_CONFIG = {
    SUPERCARTOLA: "684cb1c8af923da7c7df51de",
    CARTOLEIROS_SOBRAL: "684d821cf1a7ae16d1f89572",
};

const valoresBancoPadrao = {
    1: 20.0, 2: 19.0, 3: 18.0, 4: 17.0, 5: 16.0, 6: 15.0, 7: 14.0, 8: 13.0, 9: 12.0, 10: 11.0,
    11: 10.0, 12: 0.0, 13: 0.0, 14: 0.0, 15: 0.0, 16: 0.0, 17: 0.0, 18: 0.0, 19: 0.0, 20: 0.0,
    21: 0.0, 22: -10.0, 23: -11.0, 24: -12.0, 25: -13.0, 26: -14.0, 27: -15.0, 28: -16.0,
    29: -17.0, 30: -18.0, 31: -19.0, 32: -20.0,
};

const valoresBancoCartoleirosSobral = {
    1: 7.0, 2: 4.0, 3: 0.0, 4: -2.0, 5: -5.0, 6: -10.0,
};

function getBancoPorLiga(ligaIdParam) {
    return ligaIdParam === LIGAS_CONFIG.CARTOLEIROS_SOBRAL 
        ? valoresBancoCartoleirosSobral 
        : valoresBancoPadrao;
}

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
        
        // Formatar pontos com vírgula decimal brasileira
        const pontos = rodada.meusPontos !== null 
            ? Number(rodada.meusPontos).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '-';
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

        // Calcular financeiro usando valores reais da configuração
        const valoresBanco = getBancoPorLiga(ligaId);
        const bonusOnus = valoresBanco[posicao] || 0;

        // Formatar valor financeiro com padrão brasileiro
        const bonusOnusAbs = Math.abs(bonusOnus);
        const valorFormatado = bonusOnusAbs.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        const financeiroTexto = bonusOnus > 0 
            ? `+R$ ${valorFormatado}` 
            : bonusOnus < 0 
                ? `-R$ ${valorFormatado}` 
                : 'R$ 0,00';

        const financeiroClass = bonusOnus > 0 
            ? 'financeiro-positivo' 
            : bonusOnus < 0 
                ? 'financeiro-negativo' 
                : 'financeiro-neutro';

        // Adicionar ícones MITO/MICO
        let icone = '';
        if (posicao === 1) {
            icone = ' 🎩';
        } else if (posicao === totalParticipantes) {
            icone = ' 🐵';
        }

        // Formatar pontos com vírgula decimal brasileira
        const pontosFormatados = Number(participante.pontos || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Usar nome correto (API retorna 'nome', não 'nome_time')
        const nomeTime = participante.nome || participante.nome_time || 'N/D';

        return `
            <tr class="${isMeuTime ? 'meu-time' : ''}">
                <td style="text-align: center;">
                    <span class="posicao-badge">${posicao}º${icone}</span>
                </td>
                <td>${nomeTime}</td>
                <td>${participante.nome_cartola || 'N/D'}</td>
                <td style="text-align: center;" class="pontos-destaque">
                    ${pontosFormatados}
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