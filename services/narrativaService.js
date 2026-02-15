// =====================================================================
// narrativaService.js v1.0 - Gerador de Narrativa Inteligente
// Analisa contexto da rodada e gera texto em português natural
// =====================================================================

/**
 * Gera narrativa inteligente baseada no contexto da rodada
 * @param {Object} contexto - Dados completos do contexto
 * @returns {Object} { resumida, completa }
 */
export function gerarNarrativa(contexto) {
    const eventos = [];
    const eventosDetalhados = [];

    // Definir tom baseado em performance
    const tom = definirTom(contexto.performance);
    const abertura = obterAbertura(tom);

    // 1. Analisar Pontos Corridos
    if (contexto.disputas.pontos_corridos) {
        const pc = contexto.disputas.pontos_corridos;
        const eventoPc = analisarPontosCorridos(pc);
        if (eventoPc) {
            eventos.push(eventoPc.resumido);
            eventosDetalhados.push(eventoPc.detalhado);
        }
    }

    // 2. Analisar Mata-Mata
    if (contexto.disputas.mata_mata) {
        const mm = contexto.disputas.mata_mata;
        const eventoMm = analisarMataMata(mm);
        if (eventoMm) {
            eventos.push(eventoMm.resumido);
            eventosDetalhados.push(eventoMm.detalhado);
        }
    }

    // 3. Analisar Artilheiro
    if (contexto.disputas.artilheiro) {
        const art = contexto.disputas.artilheiro;
        const eventoArt = analisarArtilheiro(art);
        if (eventoArt) {
            eventos.push(eventoArt.resumido);
            eventosDetalhados.push(eventoArt.detalhado);
        }
    }

    // 4. Analisar Capitão
    if (contexto.disputas.capitao_luxo) {
        const cap = contexto.disputas.capitao_luxo;
        const eventoCap = analisarCapitao(cap);
        if (eventoCap) {
            eventos.push(eventoCap.resumido);
            eventosDetalhados.push(eventoCap.detalhado);
        }
    }

    // 5. Construir narrativas
    const narrativaResumida = construirNarrativaResumida(abertura, eventos, contexto.performance);
    const narrativaCompleta = construirNarrativaCompleta(abertura, eventosDetalhados, contexto);

    return {
        resumida: narrativaResumida,
        completa: narrativaCompleta,
    };
}

/**
 * Define tom da narrativa baseado em performance
 */
function definirTom(performance) {
    const { total_participantes, posicao, vs_media } = performance;

    if (!total_participantes || total_participantes === 0) {
        return "neutro";
    }

    const percentil = posicao / total_participantes;

    // Top 30% = celebratório
    if (percentil <= 0.3 && vs_media > 5) {
        return "celebratorio";
    }

    // Bottom 30% = construtivo
    if (percentil >= 0.7 || vs_media < -5) {
        return "construtivo";
    }

    // Meio = neutro
    return "neutro";
}

/**
 * Retorna abertura baseada no tom
 */
function obterAbertura(tom) {
    switch (tom) {
        case "celebratorio":
            return "Rodada espetacular! ✨";
        case "construtivo":
            return "Rodada complicada.";
        case "neutro":
        default:
            return "Rodada equilibrada.";
    }
}

/**
 * Analisa Pontos Corridos
 */
function analisarPontosCorridos(pc) {
    if (!pc || !pc.seu_confronto) return null;

    const { resultado, adversario, diferenca } = pc.seu_confronto;
    const { zona, minha_posicao } = pc;

    let resumido = "";
    let detalhado = "";

    if (resultado === "vitoria") {
        resumido = `Vitória nos Pontos Corridos (${pc.seu_confronto.voce.toFixed(1)} × ${adversario.pontos.toFixed(1)})`;

        if (zona === "G4") {
            resumido += " te mantém no G4";
            detalhado = `Vitória apertada sobre ${adversario.nome} por ${diferenca.toFixed(1)} pontos te manteve no G4 dos Pontos Corridos (${minha_posicao}º lugar). `;
        } else {
            resumido += ` e te coloca em ${minha_posicao}º`;
            detalhado = `Vitória sobre ${adversario.nome} te levou ao ${minha_posicao}º lugar na classificação. `;
        }
    } else if (resultado === "derrota") {
        resumido = `Derrota nos PC (${pc.seu_confronto.voce.toFixed(1)} × ${adversario.pontos.toFixed(1)})`;

        if (zona === "Z4") {
            resumido += " te deixa na Z4";
            detalhado = `Derrota para ${adversario.nome} te colocou na zona de rebaixamento (${minha_posicao}º lugar). `;
        } else {
            resumido += `, caiu para ${minha_posicao}º`;
            detalhado = `Derrota por ${diferenca.toFixed(1)} pontos para ${adversario.nome} te fez cair para ${minha_posicao}º. `;
        }
    } else {
        resumido = `Empate nos PC (${pc.seu_confronto.voce.toFixed(1)} × ${adversario.pontos.toFixed(1)})`;
        detalhado = `Empate equilibrado com ${adversario.nome}. Você está em ${minha_posicao}º na classificação. `;
    }

    return { resumido, detalhado };
}

/**
 * Analisa Mata-Mata
 */
function analisarMataMata(mm) {
    if (!mm || !mm.seu_confronto) return null;

    const { resultado, adversario, diferenca } = mm.seu_confronto;
    const { fase_atual } = mm;

    let resumido = "";
    let detalhado = "";

    if (resultado === "classificado") {
        resumido = `Avançou nas ${fase_atual} do Mata-Mata`;
        detalhado = `Classificação nas ${fase_atual} após vencer ${adversario?.nome || "adversário"} por ${diferenca?.toFixed(1) || "N/D"} pontos. `;
    } else if (resultado === "eliminado") {
        resumido = `❌ Eliminado nas ${fase_atual}`;
        detalhado = `Eliminação dolorosa nas ${fase_atual} do Mata-Mata. Diferença de apenas ${diferenca?.toFixed(1) || "N/D"} pontos para ${adversario?.nome || "adversário"}. `;
    }

    return { resumido, detalhado };
}

/**
 * Analisa Artilheiro
 */
function analisarArtilheiro(art) {
    if (!art || !art.classificacao || art.classificacao.length === 0) return null;

    const { sua_posicao, classificacao } = art;
    const lider = classificacao[0];
    const minhaPosicaoObj = classificacao.find(c => c.posicao === sua_posicao);

    let resumido = "";
    let detalhado = "";

    if (sua_posicao === 1) {
        // Sou líder
        if (classificacao.length > 1 && classificacao[1].gols === lider.gols) {
            resumido = `Líder do Artilheiro (empatado com ${classificacao[1].nome})`;
            detalhado = `Você lidera o Artilheiro Campeão com ${lider.gols} gols, mas está empatado com ${classificacao[1].nome}. `;
        } else {
            resumido = `🏆 Líder isolado do Artilheiro (${lider.gols} gols)`;
            detalhado = `Liderança isolada do Artilheiro com ${lider.gols} gols. `;
        }
    } else if (sua_posicao <= 3) {
        // No pódio
        resumido = `${sua_posicao}º no Artilheiro (${minhaPosicaoObj?.gols || 0} gols)`;
        detalhado = `Você está em ${sua_posicao}º no Artilheiro com ${minhaPosicaoObj?.gols || 0} gols. Líder tem ${lider.gols}. `;
    } else {
        // Fora do pódio
        resumido = `${sua_posicao}º no Artilheiro`;
        detalhado = `Artilheiro: ${sua_posicao}º lugar com ${minhaPosicaoObj?.gols || 0} gols. `;
    }

    return { resumido, detalhado };
}

/**
 * Analisa Capitão de Luxo
 */
function analisarCapitao(cap) {
    if (!cap || !cap.classificacao_acumulada || cap.classificacao_acumulada.length === 0) return null;

    const { sua_posicao, classificacao_acumulada } = cap;
    const lider = classificacao_acumulada[0];

    let resumido = "";
    let detalhado = "";

    if (sua_posicao === 1) {
        resumido = `👑 Líder do Capitão de Luxo (${lider.pontos.toFixed(1)} pts)`;
        detalhado = `Você lidera o Capitão de Luxo com ${lider.pontos.toFixed(1)} pontos acumulados. `;
    } else {
        const minhaPosicaoObj = classificacao_acumulada.find(c => c.posicao === sua_posicao);
        const diferenca = Math.abs(minhaPosicaoObj?.diferenca || 0);
        resumido = `${sua_posicao}º no Capitão (-${diferenca.toFixed(1)} pts)`;
        detalhado = `Capitão de Luxo: ${sua_posicao}º lugar, ${diferenca.toFixed(1)} pontos atrás do líder. `;
    }

    return { resumido, detalhado };
}

/**
 * Constrói narrativa resumida (para modal)
 */
function construirNarrativaResumida(abertura, eventos, performance) {
    if (eventos.length === 0) {
        return `${abertura} Você fez ${performance.pontos.toFixed(2)} pontos (${performance.posicao}º de ${performance.total_participantes}).`;
    }

    // Limitar a 3 eventos mais importantes
    const eventosTop = eventos.slice(0, 3);

    return `${abertura} ${eventosTop.join(". ")}. 🔥`;
}

/**
 * Constrói narrativa completa (para análise detalhada)
 */
function construirNarrativaCompleta(abertura, eventosDetalhados, contexto) {
    const { performance } = contexto;

    let narrativa = `${abertura} `;

    // Adicionar contexto de performance
    narrativa += `Você fez ${performance.pontos.toFixed(2)} pontos e ficou em ${performance.posicao}º lugar de ${performance.total_participantes} participantes. `;

    if (performance.vs_media > 0) {
        narrativa += `Ficou ${performance.vs_media.toFixed(1)} pontos acima da média da liga. `;
    } else if (performance.vs_media < 0) {
        narrativa += `Ficou ${Math.abs(performance.vs_media).toFixed(1)} pontos abaixo da média. `;
    }

    // Adicionar eventos detalhados
    if (eventosDetalhados.length > 0) {
        narrativa += "\n\n";
        narrativa += eventosDetalhados.join(" ");
    }

    // Adicionar recomendação se houver
    const recomendacao = gerarRecomendacao(contexto);
    if (recomendacao) {
        narrativa += `\n\n💡 ${recomendacao}`;
    }

    return narrativa;
}

/**
 * Gera recomendação baseada no contexto
 */
function gerarRecomendacao(contexto) {
    const { performance, disputas } = contexto;

    // Se está mal nas Pontos Corridos
    if (disputas.pontos_corridos?.zona === "Z4") {
        return "Próxima rodada é decisiva para sair da zona de perigo nos Pontos Corridos.";
    }

    // Se foi eliminado no MM
    if (disputas.mata_mata?.seu_confronto?.resultado === "eliminado") {
        return "Foque agora nos Pontos Corridos e módulos acumulados para recuperar.";
    }

    // Se está perto da liderança
    if (performance.vs_melhor > -10 && performance.vs_melhor < 0) {
        return "Você está próximo da liderança! Mantenha a consistência.";
    }

    return null;
}

export default { gerarNarrativa };
