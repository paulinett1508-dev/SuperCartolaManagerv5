/**
 * PONTOS CORRIDOS - PLAYOFFS/ELIMINATÓRIAS v1.0.0
 * Funções para geração de brackets e cálculo de resultados em fases eliminatórias
 */

/**
 * Gera bracket de playoffs baseado em times classificados
 * @param {Array<Object>} classificados - Times classificados com seed (ex: "1A", "2B")
 * @param {Object} config - Configuração de playoffs
 * @returns {Array<Object>} Bracket completo com todas as fases
 */
export function gerarBracketPlayoffs(classificados, config) {
    const { tipo, criterio_desempate } = config.fases_eliminatorias || {};
    const quantidadeClassificados = classificados.length;

    console.log(`[PLAYOFFS] 🏆 Gerando bracket para ${quantidadeClassificados} times (tipo: ${tipo || 'ida_volta'})`);

    // Validar quantidade (deve ser potência de 2: 4, 8, 16, 32)
    if (!isPotenciaDeDois(quantidadeClassificados)) {
        throw new Error(
            `Quantidade de classificados (${quantidadeClassificados}) deve ser potência de 2 (4, 8, 16, 32)`
        );
    }

    // Definir fases baseado na quantidade
    const fases = definirFases(quantidadeClassificados);

    console.log(`[PLAYOFFS] 📋 Fases: ${fases.map(f => f.nome).join(' → ')}`);

    // Montar bracket
    const bracket = [];
    let confrontosAtual = classificados;

    fases.forEach((fase, index) => {
        const confrontosFase = gerarConfrontosFase(confrontosAtual, fase, tipo);

        bracket.push({
            fase: fase.id,
            nome: fase.nome,
            tipo: tipo || 'ida_volta',
            criterio_desempate: criterio_desempate || 'saldo_gols',
            confrontos: confrontosFase
        });

        // Preparar confrontos da próxima fase (vencedores desta)
        confrontosAtual = confrontosFase.map((c, idx) => ({
            timeId: null,
            seed: `vencedor_${fase.id}_${idx + 1}`,
            nome: `Vencedor ${c.mandante.seed} vs ${c.visitante.seed}`,
            placeholder: true
        }));
    });

    console.log(`[PLAYOFFS] ✅ Bracket gerado: ${bracket.length} fases`);

    return bracket;
}

/**
 * Verifica se número é potência de 2
 * @param {Number} n
 * @returns {Boolean}
 */
function isPotenciaDeDois(n) {
    return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Define nomes e IDs das fases baseado na quantidade de times
 * @param {Number} quantidade - Quantidade de times
 * @returns {Array<Object>} Array de fases
 */
function definirFases(quantidade) {
    const fases = [];

    if (quantidade >= 32) fases.push({ id: 'oitavas', nome: 'Oitavas de Final', times: 32 });
    if (quantidade >= 16) fases.push({ id: 'oitavas', nome: 'Oitavas de Final', times: 16 });
    if (quantidade >= 8) fases.push({ id: 'quartas', nome: 'Quartas de Final', times: 8 });
    if (quantidade >= 4) fases.push({ id: 'semis', nome: 'Semifinais', times: 4 });
    if (quantidade >= 2) fases.push({ id: 'final', nome: 'Final', times: 2 });

    // Filtrar apenas fases relevantes
    return fases.filter(f => f.times <= quantidade);
}

/**
 * Gera confrontos de uma fase específica
 * @param {Array<Object>} times - Times desta fase
 * @param {Object} fase - Informações da fase
 * @param {String} tipo - "ida_volta" ou "jogo_unico"
 * @returns {Array<Object>} Confrontos da fase
 */
function gerarConfrontosFase(times, fase, tipo) {
    const confrontos = [];
    const pares = agruparEmPares(times);

    pares.forEach((par, index) => {
        confrontos.push({
            confronto_id: `${fase.id}_${index + 1}`,
            fase: fase.id,
            mandante: {
                timeId: par[0].timeId,
                seed: par[0].seed,
                nome: par[0].nome || `Time ${par[0].seed}`,
                pontos_ida: null,
                pontos_volta: null,
                agregado: null
            },
            visitante: {
                timeId: par[1].timeId,
                seed: par[1].seed,
                nome: par[1].nome || `Time ${par[1].seed}`,
                pontos_ida: null,
                pontos_volta: null,
                agregado: null
            },
            vencedor: null,
            tipo,
            status: 'pendente' // pendente, em_andamento, concluido
        });
    });

    return confrontos;
}

/**
 * Agrupa times em pares para confrontos
 * Usa cruzamento olímpico: 1º vs último, 2º vs penúltimo, etc.
 * @param {Array<Object>} times - Times ordenados por seed
 * @returns {Array<Array<Object>>} Pares de confrontos
 */
function agruparEmPares(times) {
    const pares = [];
    const n = times.length;

    for (let i = 0; i < n / 2; i++) {
        pares.push([times[i], times[n - 1 - i]]);
    }

    return pares;
}

/**
 * Calcula resultado de confronto playoff (ida e volta)
 * @param {Object} confronto - Dados do confronto
 * @param {Number} pontosIda1 - Pontos time1 na ida
 * @param {Number} pontosIda2 - Pontos time2 na ida
 * @param {Number} pontosVolta1 - Pontos time1 na volta
 * @param {Number} pontosVolta2 - Pontos time2 na volta
 * @param {String} criterio - Critério de desempate
 * @returns {Object} Resultado com vencedor
 */
export function calcularResultadoPlayoff(
    confronto,
    pontosIda1,
    pontosIda2,
    pontosVolta1,
    pontosVolta2,
    criterio = 'saldo_gols'
) {
    // Calcular agregado
    const agregadoMandante = pontosIda1 + pontosVolta1;
    const agregadoVisitante = pontosIda2 + pontosVolta2;

    console.log(
        `[PLAYOFFS] 🎲 ${confronto.confronto_id}: ` +
        `Ida ${pontosIda1} x ${pontosIda2}, Volta ${pontosVolta1} x ${pontosVolta2} ` +
        `→ Agregado ${agregadoMandante} x ${agregadoVisitante}`
    );

    // Vencedor pelo agregado
    if (agregadoMandante > agregadoVisitante) {
        return {
            vencedor: 'mandante',
            vencedor_timeId: confronto.mandante.timeId,
            vencedor_seed: confronto.mandante.seed,
            agregados: [agregadoMandante, agregadoVisitante],
            criterio_usado: 'agregado'
        };
    } else if (agregadoVisitante > agregadoMandante) {
        return {
            vencedor: 'visitante',
            vencedor_timeId: confronto.visitante.timeId,
            vencedor_seed: confronto.visitante.seed,
            agregados: [agregadoMandante, agregadoVisitante],
            criterio_usado: 'agregado'
        };
    } else {
        // Empate no agregado - aplicar critério de desempate
        return aplicarCriterioDesempate(
            confronto,
            { ida: pontosIda1, volta: pontosVolta1 },
            { ida: pontosIda2, volta: pontosVolta2 },
            agregadoMandante,
            criterio
        );
    }
}

/**
 * Aplica critério de desempate em playoffs
 * @param {Object} confronto - Dados do confronto
 * @param {Object} pontosMandante - { ida, volta }
 * @param {Object} pontosVisitante - { ida, volta }
 * @param {Number} agregado - Agregado empatado
 * @param {String} criterio - "saldo_gols" ou "gols_fora"
 * @returns {Object} Resultado com vencedor
 */
function aplicarCriterioDesempate(confronto, pontosMandante, pontosVisitante, agregado, criterio) {
    console.log(`[PLAYOFFS] ⚖️ Desempate no agregado (${agregado} x ${agregado}), critério: ${criterio}`);

    if (criterio === 'gols_fora') {
        // Gols marcados fora de casa (visitante na ida = mandante na volta)
        const golsForaMandante = pontosMandante.volta; // mandante jogou fora na volta
        const golsForaVisitante = pontosVisitante.ida;  // visitante jogou fora na ida

        if (golsForaVisitante > golsForaMandante) {
            return {
                vencedor: 'visitante',
                vencedor_timeId: confronto.visitante.timeId,
                vencedor_seed: confronto.visitante.seed,
                agregados: [agregado, agregado],
                criterio_usado: 'gols_fora',
                gols_fora: [golsForaMandante, golsForaVisitante]
            };
        } else if (golsForaMandante > golsForaVisitante) {
            return {
                vencedor: 'mandante',
                vencedor_timeId: confronto.mandante.timeId,
                vencedor_seed: confronto.mandante.seed,
                agregados: [agregado, agregado],
                criterio_usado: 'gols_fora',
                gols_fora: [golsForaMandante, golsForaVisitante]
            };
        }
    }

    // Fallback: critério "saldo_gols" ou empate persistente
    // Em caso de empate total, pode-se usar "primeiro colocado no grupo" ou sorteio
    // Por ora, vamos declarar mandante vencedor (vantagem de jogar em casa na volta)
    return {
        vencedor: 'mandante',
        vencedor_timeId: confronto.mandante.timeId,
        vencedor_seed: confronto.mandante.seed,
        agregados: [agregado, agregado],
        criterio_usado: 'vantagem_mandante',
        empate_tecnico: true
    };
}

/**
 * Calcula resultado de jogo único (não há ida/volta)
 * @param {Object} confronto - Dados do confronto
 * @param {Number} pontosMandante - Pontos do mandante
 * @param {Number} pontosVisitante - Pontos do visitante
 * @returns {Object} Resultado com vencedor
 */
export function calcularResultadoJogoUnico(confronto, pontosMandante, pontosVisitante) {
    console.log(
        `[PLAYOFFS] 🎲 ${confronto.confronto_id} (Jogo Único): ` +
        `${pontosMandante} x ${pontosVisitante}`
    );

    if (pontosMandante > pontosVisitante) {
        return {
            vencedor: 'mandante',
            vencedor_timeId: confronto.mandante.timeId,
            vencedor_seed: confronto.mandante.seed,
            placar: [pontosMandante, pontosVisitante]
        };
    } else if (pontosVisitante > pontosMandante) {
        return {
            vencedor: 'visitante',
            vencedor_timeId: confronto.visitante.timeId,
            vencedor_seed: confronto.visitante.seed,
            placar: [pontosMandante, pontosVisitante]
        };
    } else {
        // Empate em jogo único - usar critério adicional ou declarar mandante vencedor
        return {
            vencedor: 'mandante',
            vencedor_timeId: confronto.mandante.timeId,
            vencedor_seed: confronto.mandante.seed,
            placar: [pontosMandante, pontosVisitante],
            criterio_usado: 'vantagem_mandante',
            empate_tecnico: true
        };
    }
}

/**
 * Atualiza bracket com resultado de um confronto
 * @param {Array<Object>} bracket - Bracket atual
 * @param {String} confrontoId - ID do confronto
 * @param {Object} resultado - Resultado calculado
 * @returns {Array<Object>} Bracket atualizado
 */
export function atualizarBracket(bracket, confrontoId, resultado) {
    const bracketAtualizado = JSON.parse(JSON.stringify(bracket)); // Deep clone

    for (const fase of bracketAtualizado) {
        const confronto = fase.confrontos.find(c => c.confronto_id === confrontoId);

        if (confronto) {
            // Atualizar vencedor
            confronto.vencedor = resultado.vencedor;
            confronto.status = 'concluido';

            // Atualizar placares
            if (resultado.agregados) {
                confronto.mandante.agregado = resultado.agregados[0];
                confronto.visitante.agregado = resultado.agregados[1];
            } else if (resultado.placar) {
                confronto.mandante.pontos_ida = resultado.placar[0];
                confronto.visitante.pontos_ida = resultado.placar[1];
            }

            console.log(
                `[PLAYOFFS] ✅ Bracket atualizado: ${confrontoId} → ` +
                `Vencedor: ${resultado.vencedor} (${resultado.vencedor_seed})`
            );

            // Propagar vencedor para próxima fase
            propagarVencedor(bracketAtualizado, fase.fase, confronto, resultado);

            break;
        }
    }

    return bracketAtualizado;
}

/**
 * Propaga vencedor de um confronto para a próxima fase
 * @param {Array<Object>} bracket - Bracket completo
 * @param {String} faseAtual - ID da fase atual
 * @param {Object} confronto - Confronto atual
 * @param {Object} resultado - Resultado do confronto
 */
function propagarVencedor(bracket, faseAtual, confronto, resultado) {
    // Mapear ordem das fases
    const ordemFases = ['oitavas', 'quartas', 'semis', 'final'];
    const indexFaseAtual = ordemFases.indexOf(faseAtual);

    if (indexFaseAtual === -1 || indexFaseAtual === ordemFases.length - 1) {
        // Não há próxima fase (final) ou fase inválida
        return;
    }

    const proximaFaseId = ordemFases[indexFaseAtual + 1];
    const proximaFase = bracket.find(f => f.fase === proximaFaseId);

    if (!proximaFase) return;

    // Encontrar slot do vencedor na próxima fase
    // Exemplo: vencedor de quartas_1 vai para semis (confronto 1, posição mandante)
    const vencedorTime = resultado.vencedor === 'mandante' ? confronto.mandante : confronto.visitante;

    // Lógica simplificada: inserir vencedor no próximo confronto disponível
    for (const proxConfronto of proximaFase.confrontos) {
        if (proxConfronto.mandante.timeId === null && proxConfronto.mandante.placeholder) {
            proxConfronto.mandante = {
                timeId: vencedorTime.timeId,
                seed: vencedorTime.seed,
                nome: vencedorTime.nome,
                pontos_ida: null,
                pontos_volta: null,
                agregado: null
            };
            console.log(`[PLAYOFFS] ➡️ Vencedor ${vencedorTime.seed} avança para ${proximaFaseId} (mandante)`);
            break;
        } else if (proxConfronto.visitante.timeId === null && proxConfronto.visitante.placeholder) {
            proxConfronto.visitante = {
                timeId: vencedorTime.timeId,
                seed: vencedorTime.seed,
                nome: vencedorTime.nome,
                pontos_ida: null,
                pontos_volta: null,
                agregado: null
            };
            console.log(`[PLAYOFFS] ➡️ Vencedor ${vencedorTime.seed} avança para ${proximaFaseId} (visitante)`);
            break;
        }
    }
}

/**
 * Verifica se bracket está completo (todas as fases concluídas)
 * @param {Array<Object>} bracket - Bracket atual
 * @returns {Boolean}
 */
export function isBracketCompleto(bracket) {
    for (const fase of bracket) {
        for (const confronto of fase.confrontos) {
            if (confronto.status !== 'concluido') {
                return false;
            }
        }
    }
    return true;
}

/**
 * Obtém campeão do bracket (vencedor da final)
 * @param {Array<Object>} bracket - Bracket completo
 * @returns {Object|null} Time campeão ou null se não houver
 */
export function obterCampeao(bracket) {
    const fasesFinal = bracket.find(f => f.fase === 'final');

    if (!fasesFinal || fasesFinal.confrontos.length === 0) {
        return null;
    }

    const confrontoFinal = fasesFinal.confrontos[0];

    if (confrontoFinal.status !== 'concluido' || !confrontoFinal.vencedor) {
        return null;
    }

    const campeao = confrontoFinal.vencedor === 'mandante'
        ? confrontoFinal.mandante
        : confrontoFinal.visitante;

    console.log(`[PLAYOFFS] 🏆 CAMPEÃO: ${campeao.nome} (${campeao.seed})`);

    return campeao;
}

/**
 * Log de resumo do bracket
 * @param {Array<Object>} bracket - Bracket gerado
 */
export function logResumoBracket(bracket) {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 BRACKET DE PLAYOFFS');
    console.log('='.repeat(60));

    bracket.forEach(fase => {
        console.log(`\n📌 ${fase.nome.toUpperCase()} (${fase.confrontos.length} confrontos)`);

        fase.confrontos.forEach((c, idx) => {
            const statusIcon = c.status === 'concluido' ? '✅' : '⏳';
            console.log(
                `  ${statusIcon} ${idx + 1}. ${c.mandante.nome || c.mandante.seed} vs ` +
                `${c.visitante.nome || c.visitante.seed}` +
                (c.vencedor ? ` → Vencedor: ${c.vencedor}` : '')
            );
        });
    });

    console.log('\n' + '='.repeat(60) + '\n');
}
