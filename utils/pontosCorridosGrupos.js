/**
 * PONTOS CORRIDOS - GRUPOS/CHAVES v1.0.0
 * Funções para divisão de times em grupos e geração de confrontos por grupo
 */

/**
 * Divide times em grupos usando critério especificado
 * @param {Array<String>} times - Lista de timeIds
 * @param {Number} quantidadeGrupos - Quantidade de grupos (2, 4, 8)
 * @param {String} criterio - "sorteio" ou "ranking"
 * @param {Object} rankingAtual - Ranking atual (opcional, necessário se criterio = "ranking")
 * @returns {Array<Object>} Grupos com times
 * @throws {Error} Se validação falhar
 */
export function dividirEmGrupos(times, quantidadeGrupos, criterio = 'sorteio', rankingAtual = null) {
    // Validações
    if (!Array.isArray(times) || times.length === 0) {
        throw new Error('Lista de times inválida ou vazia');
    }

    if (![2, 4, 8].includes(quantidadeGrupos)) {
        throw new Error('Quantidade de grupos deve ser 2, 4 ou 8');
    }

    const MIN_TIMES_POR_GRUPO = 5;
    const timesPorGrupo = Math.floor(times.length / quantidadeGrupos);

    if (timesPorGrupo < MIN_TIMES_POR_GRUPO) {
        throw new Error(
            `Mínimo ${quantidadeGrupos * MIN_TIMES_POR_GRUPO} times para ${quantidadeGrupos} grupos. ` +
            `Fornecidos: ${times.length} times (${timesPorGrupo} por grupo)`
        );
    }

    console.log(`[GRUPOS] 🏆 Dividindo ${times.length} times em ${quantidadeGrupos} grupos (critério: ${criterio})`);

    let timesOrdenados;

    if (criterio === 'ranking' && rankingAtual) {
        // Ordenar por ranking e distribuir em serpentina (seed)
        timesOrdenados = ordenarPorRanking(times, rankingAtual);
        return distribuirSerpentina(timesOrdenados, quantidadeGrupos);
    } else {
        // Sortear aleatoriamente
        timesOrdenados = embaralhar([...times]); // Criar cópia para não mutar original
        return distribuirBalanceado(timesOrdenados, quantidadeGrupos);
    }
}

/**
 * Ordena times por ranking (melhor → pior)
 * @param {Array<String>} times - Lista de timeIds
 * @param {Object} ranking - Mapa { timeId: posicao }
 * @returns {Array<String>} Times ordenados
 */
function ordenarPorRanking(times, ranking) {
    return times.sort((a, b) => {
        const posA = ranking[a] || 999;
        const posB = ranking[b] || 999;
        return posA - posB; // Ordem crescente (1º, 2º, 3º, ...)
    });
}

/**
 * Embaralha array usando Fisher-Yates shuffle
 * @param {Array} array - Array a embaralhar
 * @returns {Array} Array embaralhado
 */
function embaralhar(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Distribui times balanceadamente (sorteio)
 * @param {Array<String>} times - Times já embaralhados
 * @param {Number} quantidadeGrupos - Quantidade de grupos
 * @returns {Array<Object>} Grupos
 */
function distribuirBalanceado(times, quantidadeGrupos) {
    const grupos = [];
    const nomeGrupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Inicializar grupos vazios
    for (let i = 0; i < quantidadeGrupos; i++) {
        grupos.push({
            grupo: nomeGrupos[i],
            times: []
        });
    }

    // Distribuir times em round-robin (1 para cada grupo, depois volta)
    times.forEach((timeId, index) => {
        const grupoIndex = index % quantidadeGrupos;
        grupos[grupoIndex].times.push(timeId);
    });

    console.log(`[GRUPOS] ✅ Divisão balanceada: ${grupos.map(g => `Grupo ${g.grupo}: ${g.times.length} times`).join(', ')}`);

    return grupos;
}

/**
 * Distribui times em serpentina (seed) - para evitar grupos desbalanceados
 * Exemplo 8 times em 2 grupos:
 * Grupo A: 1º, 4º, 5º, 8º
 * Grupo B: 2º, 3º, 6º, 7º
 *
 * @param {Array<String>} times - Times ordenados por ranking
 * @param {Number} quantidadeGrupos - Quantidade de grupos
 * @returns {Array<Object>} Grupos
 */
function distribuirSerpentina(times, quantidadeGrupos) {
    const grupos = [];
    const nomeGrupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Inicializar grupos vazios
    for (let i = 0; i < quantidadeGrupos; i++) {
        grupos.push({
            grupo: nomeGrupos[i],
            times: []
        });
    }

    // Serpentear
    let grupoAtual = 0;
    let direcao = 1; // 1 = crescente, -1 = decrescente

    times.forEach((timeId, index) => {
        grupos[grupoAtual].times.push(timeId);

        // Mudar grupo
        grupoAtual += direcao;

        // Inverter direção quando chegar no fim ou início
        if (grupoAtual >= quantidadeGrupos) {
            grupoAtual = quantidadeGrupos - 1;
            direcao = -1;
        } else if (grupoAtual < 0) {
            grupoAtual = 0;
            direcao = 1;
        }
    });

    console.log(`[GRUPOS] ✅ Divisão serpentina (seed): ${grupos.map(g => `Grupo ${g.grupo}: ${g.times.length} times`).join(', ')}`);

    return grupos;
}

/**
 * Gera confrontos para fase de grupos (round-robin dentro de cada grupo)
 * @param {Array<Object>} grupos - Array de grupos com times
 * @param {Number} turnos - Quantidade de turnos (1 = só ida, 2 = ida e volta)
 * @returns {Object} Confrontos organizados por grupo
 */
export function gerarConfrontosGrupos(grupos, turnos = 1) {
    const confrontosPorGrupo = {};

    grupos.forEach(grupo => {
        const { grupo: nomeGrupo, times } = grupo;

        console.log(`[GRUPOS] 🎲 Gerando confrontos para Grupo ${nomeGrupo} (${times.length} times, ${turnos} turno(s))`);

        // Gerar round-robin dentro do grupo
        const confrontosIda = gerarRoundRobinGrupo(times);

        let confrontosCompletos = confrontosIda;

        // Se 2 turnos, adicionar volta (inverter mandante/visitante)
        if (turnos === 2) {
            const confrontosVolta = confrontosIda.map(rodada => {
                return rodada.map(jogo => ({
                    timeA: jogo.timeB,
                    timeB: jogo.timeA
                }));
            });
            confrontosCompletos = [...confrontosIda, ...confrontosVolta];
        }

        confrontosPorGrupo[nomeGrupo] = confrontosCompletos;

        console.log(`[GRUPOS] ✅ Grupo ${nomeGrupo}: ${confrontosCompletos.length} rodadas geradas`);
    });

    return confrontosPorGrupo;
}

/**
 * Gera confrontos round-robin para um grupo específico
 * Algoritmo clássico de rotação (mesmo usado no sistema tradicional)
 * @param {Array<String>} times - Times do grupo
 * @returns {Array<Array<Object>>} Array de rodadas, cada rodada com array de jogos
 */
function gerarRoundRobinGrupo(times) {
    const n = times.length;
    const rodadas = [];
    const lista = [...times];

    // Se número ímpar, adicionar "bye" (folga)
    if (n % 2 !== 0) {
        lista.push(null);
    }

    const totalRodadas = lista.length - 1;

    for (let rodada = 0; rodada < totalRodadas; rodada++) {
        const jogos = [];

        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];

            // Ignorar se algum time for null (bye)
            if (timeA && timeB) {
                jogos.push({ timeA, timeB });
            }
        }

        rodadas.push(jogos);

        // Rotacionar lista (fixar primeiro elemento, rotacionar resto)
        lista.splice(1, 0, lista.pop());
    }

    return rodadas;
}

/**
 * Valida configuração de grupos
 * @param {Object} config - Configuração do sistema de grupos
 * @param {Number} totalTimes - Total de times na liga
 * @returns {Object} { valido: boolean, erros: string[] }
 */
export function validarConfigGrupos(config, totalTimes) {
    const erros = [];

    if (!config || !config.sistema_grupos) {
        erros.push('Configuração de grupos ausente');
        return { valido: false, erros };
    }

    const { quantidade_grupos, min_times_por_grupo, classificados_por_grupo } = config.sistema_grupos;

    // Validar quantidade de grupos
    if (![2, 4, 8].includes(quantidade_grupos)) {
        erros.push(`Quantidade de grupos inválida: ${quantidade_grupos}. Use 2, 4 ou 8.`);
    }

    // Validar mínimo de times por grupo
    const timesPorGrupo = Math.floor(totalTimes / quantidade_grupos);
    if (timesPorGrupo < min_times_por_grupo) {
        erros.push(
            `Times insuficientes: ${totalTimes} times para ${quantidade_grupos} grupos = ` +
            `${timesPorGrupo} times/grupo. Mínimo: ${min_times_por_grupo}`
        );
    }

    // Validar classificados por grupo
    if (classificados_por_grupo >= timesPorGrupo) {
        erros.push(
            `Classificados por grupo (${classificados_por_grupo}) deve ser menor que ` +
            `times por grupo (${timesPorGrupo})`
        );
    }

    if (classificados_por_grupo < 1) {
        erros.push('Pelo menos 1 time deve classificar por grupo');
    }

    return {
        valido: erros.length === 0,
        erros
    };
}

/**
 * Calcula classificação de um grupo específico
 * @param {String} nomeGrupo - Nome do grupo (A, B, C...)
 * @param {Array<Object>} confrontos - Confrontos do grupo com resultados
 * @returns {Array<Object>} Classificação ordenada
 */
export function calcularClassificacaoGrupo(nomeGrupo, confrontos) {
    const stats = {};

    // Inicializar stats para todos os times do grupo
    const timesGrupo = new Set();
    confrontos.flat().forEach(jogo => {
        if (jogo.time1) timesGrupo.add(String(jogo.time1.id || jogo.time1));
        if (jogo.time2) timesGrupo.add(String(jogo.time2.id || jogo.time2));
    });

    timesGrupo.forEach(timeId => {
        stats[timeId] = {
            timeId,
            grupo: nomeGrupo,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            pontos: 0,
            gols_pro: 0,
            gols_contra: 0,
            saldo_gols: 0,
            pontosGoleada: 0,
            financeiro: 0
        };
    });

    // Processar confrontos
    confrontos.flat().forEach(jogo => {
        if (!jogo.resultado) return; // Jogo ainda não realizado

        const tid1 = String(jogo.time1.id || jogo.time1);
        const tid2 = String(jogo.time2.id || jogo.time2);

        const resultado = jogo.resultado;

        // Atualizar stats time1
        stats[tid1].jogos++;
        stats[tid1].pontos += resultado.pontosA || 0;
        stats[tid1].gols_pro += jogo.time1.pontos || 0;
        stats[tid1].gols_contra += jogo.time2.pontos || 0;
        stats[tid1].financeiro += resultado.financeiroA || 0;

        if (resultado.tipo === 'vitoria' && resultado.pontosA > resultado.pontosB) {
            stats[tid1].vitorias++;
        } else if (resultado.tipo === 'empate') {
            stats[tid1].empates++;
        } else {
            stats[tid1].derrotas++;
        }

        if (resultado.tipo === 'goleada' && resultado.pontosA > resultado.pontosB) {
            stats[tid1].pontosGoleada++;
        }

        // Atualizar stats time2
        stats[tid2].jogos++;
        stats[tid2].pontos += resultado.pontosB || 0;
        stats[tid2].gols_pro += jogo.time2.pontos || 0;
        stats[tid2].gols_contra += jogo.time1.pontos || 0;
        stats[tid2].financeiro += resultado.financeiroB || 0;

        if (resultado.tipo === 'vitoria' && resultado.pontosB > resultado.pontosA) {
            stats[tid2].vitorias++;
        } else if (resultado.tipo === 'empate') {
            stats[tid2].empates++;
        } else {
            stats[tid2].derrotas++;
        }

        if (resultado.tipo === 'goleada' && resultado.pontosB > resultado.pontosA) {
            stats[tid2].pontosGoleada++;
        }
    });

    // Calcular saldo de gols
    Object.values(stats).forEach(time => {
        time.saldo_gols = time.gols_pro - time.gols_contra;
    });

    // Ordenar classificação (pontos → saldo → vitórias)
    const classificacao = Object.values(stats).sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.saldo_gols !== a.saldo_gols) return b.saldo_gols - a.saldo_gols;
        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
        return b.gols_pro - a.gols_pro; // Último critério: gols pró
    });

    console.log(`[GRUPOS] 📊 Classificação Grupo ${nomeGrupo}: ${classificacao.length} times`);

    return classificacao;
}

/**
 * Extrai times classificados de cada grupo para playoffs
 * @param {Array<Object>} grupos - Grupos com classificação
 * @param {Number} classificadosPorGrupo - Quantos avançam
 * @returns {Array<Object>} Times classificados com informações do grupo
 */
export function extrairClassificados(grupos, classificadosPorGrupo) {
    const classificados = [];

    grupos.forEach(grupo => {
        const topN = grupo.classificacao.slice(0, classificadosPorGrupo);

        topN.forEach((time, posicao) => {
            classificados.push({
                ...time,
                grupo_origem: grupo.grupo,
                posicao_grupo: posicao + 1,
                seed: `${posicao + 1}${grupo.grupo}` // Ex: "1A", "2B"
            });
        });
    });

    console.log(`[GRUPOS] 🎖️ ${classificados.length} times classificados para playoffs`);

    return classificados;
}

/**
 * Log de resumo da divisão de grupos
 * @param {Array<Object>} grupos - Grupos gerados
 */
export function logResumoGrupos(grupos) {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 RESUMO DA DIVISÃO DE GRUPOS');
    console.log('='.repeat(60));

    grupos.forEach(grupo => {
        console.log(`\n📌 GRUPO ${grupo.grupo} (${grupo.times.length} times)`);
        grupo.times.forEach((timeId, idx) => {
            console.log(`  ${idx + 1}. ${timeId}`);
        });
    });

    console.log('\n' + '='.repeat(60) + '\n');
}
