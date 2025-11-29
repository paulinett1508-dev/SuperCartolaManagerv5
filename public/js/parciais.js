// MÓDULO PARCIAIS - Parciais ao Vivo (OTIMIZADO)

const urlParams = new URLSearchParams(window.location.search);
const ligaId = urlParams.get("id");

// ✅ DEBOUNCE
let atualizacaoEmAndamento = false;

// ✅ VALORES DE BANCO POR LIGA
const LIGA_CARTOLEIROS_SOBRAL = "684d821cf1a7ae16d1f89572";

// Liga padrão (32 participantes - SuperCartola)
const bancoValoresPadrao = {
    1: 20.0,
    2: 19.0,
    3: 18.0,
    4: 17.0,
    5: 16.0,
    6: 15.0,
    7: 14.0,
    8: 13.0,
    9: 12.0,
    10: 11.0,
    11: 10.0,
    12: 0.0,
    13: 0.0,
    14: 0.0,
    15: 0.0,
    16: 0.0,
    17: 0.0,
    18: 0.0,
    19: 0.0,
    20: 0.0,
    21: 0.0,
    22: -10.0,
    23: -11.0,
    24: -12.0,
    25: -13.0,
    26: -14.0,
    27: -15.0,
    28: -16.0,
    29: -17.0,
    30: -18.0,
    31: -19.0,
    32: -20.0,
};

// Liga Cartoleiros do Sobral (6 participantes)
const bancoValoresCartoleirosSobral = {
    1: 7.0, // MITO
    2: 4.0, // G2
    3: 0.0, // Neutro
    4: -2.0, // Ônus
    5: -5.0, // Ônus
    6: -10.0, // MICO
};

// Função para obter valores de banco pela liga
function getBancoValores() {
    if (ligaId === LIGA_CARTOLEIROS_SOBRAL) {
        return bancoValoresCartoleirosSobral;
    }
    return bancoValoresPadrao;
}

// ✅ TOAST NÃO-BLOQUEANTE
function mostrarToast(mensagem, tipo = "info") {
    document.querySelector(".toast-parciais")?.remove();

    const toast = document.createElement("div");
    toast.className = `toast-parciais toast-${tipo}`;

    const icone = tipo === "success" ? "✅" : tipo === "error" ? "❌" : "ℹ️";
    toast.innerHTML = `<span>${icone}</span><span>${mensagem}</span>`;

    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 10000;
        background: ${tipo === "success" ? "#2d5a27" : tipo === "error" ? "#8b2635" : "#1a4a6e"};
        color: #fff; padding: 12px 20px; border-radius: 8px;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        font-size: 14px; max-width: 90vw;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ✅ FEEDBACK VISUAL NO BOTÃO
function setButtonLoading(btn, loading) {
    if (!btn) return;

    if (loading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = "⏳ Atualizando...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    } else {
        btn.innerHTML = btn.dataset.originalText || "🔄 Atualizar";
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

async function carregarParciais() {
    const rankingBody = document.getElementById("rankingBody");
    const loading = document.getElementById("loading");
    const error = document.getElementById("error");
    const nomeLiga = document.getElementById("nomeLiga");
    const quantidadeTimes = document.getElementById("quantidadeTimes");
    const rodadaAtualTitle = document.getElementById("rodadaAtualTitle");

    if (!rankingBody) {
        console.warn("[PARCIAIS] Container não encontrado");
        return;
    }

    try {
        if (loading) loading.style.display = "block";
        if (error) error.style.display = "none";
        rankingBody.innerHTML = "";

        // Verificar cache
        const cacheKey = `parciais_${ligaId}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const { rankings, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                exibirRanking(rankings);
                if (loading) loading.style.display = "none";
                console.log("[PARCIAIS] ✅ Dados do cache");
                return;
            }
        }

        // Buscar status do mercado
        const resMercado = await fetch("/api/cartola/mercado/status");
        if (!resMercado.ok) throw new Error("Erro ao buscar status do mercado");
        const mercadoStatus = await resMercado.json();
        const rodadaAtual = mercadoStatus.rodada_atual;

        // Buscar dados da liga
        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar dados da liga");
        const liga = await resLiga.json();

        if (nomeLiga) nomeLiga.textContent = liga.nome || "Nome não disponível";
        if (quantidadeTimes) {
            quantidadeTimes.textContent = `${liga.times?.length || liga.participantes?.length || 0} time(s) cadastrados`;
        }

        // Parciais só disponíveis quando mercado está FECHADO
        if (mercadoStatus.mercado_aberto) {
            if (loading) loading.style.display = "none";
            if (rodadaAtualTitle) {
                rodadaAtualTitle.textContent = `⏸️ Mercado Aberto - Rodada ${rodadaAtual}`;
            }
            rankingBody.innerHTML = `
                <tr><td colspan="6" style="text-align: center; padding: 40px; background: linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%);">
                    <div style="font-size: 24px; margin-bottom: 15px; color: #ffd700;">⏳ Aguardando Início da Rodada ${rodadaAtual}</div>
                    <div style="font-size: 16px; color: #87ceeb; margin-bottom: 10px;">O mercado está em período de escalação</div>
                    <div style="font-size: 14px; color: #aaa;">Parciais ao vivo estarão disponíveis quando:</div>
                    <ul style="list-style: none; padding: 0; margin-top: 10px; color: #ccc; font-size: 14px;">
                        <li>✅ O mercado fechar</li>
                        <li>✅ Os jogos da rodada começarem</li>
                    </ul>
                </td></tr>
            `;
            return;
        }

        if (rodadaAtualTitle) {
            rodadaAtualTitle.textContent = `🔥 Parciais AO VIVO - Rodada ${rodadaAtual}`;
        }

        // Buscar parciais (atletas pontuados)
        const resPartials = await fetch("/api/cartola/atletas/pontuados", {
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        if (!resPartials.ok) throw new Error("Erro ao buscar parciais");
        const partialsData = await resPartials.json();
        if (!partialsData.atletas)
            throw new Error("Dados de parciais não disponíveis");

        // Obter lista de times
        const timesList =
            liga.times ||
            liga.participantes?.map((p) => ({ id: p.time_id })) ||
            [];

        // ✅ FILTRAR INATIVOS: Buscar status dos times
        const timeIds = timesList.map((t) => t.id || t.time_id || t);
        let statusMap = {};

        try {
            const statusRes = await fetch("/api/times/batch/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeIds }),
            });

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                statusMap = statusData.status || {};
                console.log("[PARCIAIS] ✅ Status de inatividade carregado");
            }
        } catch (err) {
            console.warn(
                "[PARCIAIS] ⚠️ Erro ao buscar status, assumindo todos ativos",
            );
        }

        // Filtrar apenas times ATIVOS
        const timesAtivos = timesList.filter((time) => {
            const timeId = time.id || time.time_id || time;
            const status = statusMap[timeId];
            return !status || status.ativo !== false;
        });

        console.log(
            `[PARCIAIS] 📊 ${timesAtivos.length}/${timesList.length} times ativos`,
        );

        const rankings = await Promise.all(
            timesAtivos.map(async (time) => {
                const timeId = time.id || time.time_id || time;
                try {
                    const resInfo = await fetch(`/api/times/${timeId}`);
                    const resEscalacao = await fetch(
                        `/api/cartola/time/id/${timeId}/${rodadaAtual}`,
                    );
                    if (!resInfo.ok || !resEscalacao.ok) return null;

                    const dadosInfo = await resInfo.json();
                    const dadosEscalacao = await resEscalacao.json();

                    let pontos = 0;
                    if (dadosEscalacao.atletas) {
                        dadosEscalacao.atletas.forEach((atleta) => {
                            const pontuacao =
                                partialsData.atletas[atleta.atleta_id]
                                    ?.pontuacao || 0;
                            pontos +=
                                atleta.atleta_id === dadosEscalacao.capitao_id
                                    ? pontuacao * 2
                                    : pontuacao;
                        });
                    }

                    const clubeId =
                        dadosInfo.clube_id || dadosEscalacao.time?.clube_id;
                    const escudoTimeCoracao = clubeId
                        ? `https://s.sde.globo.com/media/organizations/2024/04/10/${clubeId}_45x45.png`
                        : "";

                    return {
                        id: timeId,
                        cartoleiro:
                            dadosInfo.nome_cartoleiro ||
                            dadosInfo.nome_cartola ||
                            "N/D",
                        time: dadosInfo.nome_time || "N/D",
                        escudo:
                            dadosInfo.url_escudo_png ||
                            dadosInfo.escudo_url ||
                            "",
                        timeDoCoracao: escudoTimeCoracao,
                        pontos: pontos.toFixed(2),
                    };
                } catch (err) {
                    console.warn(
                        `[PARCIAIS] Erro time ${timeId}: ${err.message}`,
                    );
                    return null;
                }
            }),
        );

        const validRankings = rankings.filter(Boolean);
        validRankings.sort(
            (a, b) => parseFloat(b.pontos) - parseFloat(a.pontos),
        );

        // ✅ Obter valores de banco corretos para a liga
        const bancoValores = getBancoValores();

        validRankings.forEach((rank, index) => {
            const position = index + 1;
            rank.banco =
                bancoValores[position] !== undefined
                    ? bancoValores[position].toFixed(2)
                    : "0.00";
        });

        localStorage.setItem(
            cacheKey,
            JSON.stringify({ rankings: validRankings, timestamp: Date.now() }),
        );
        exibirRanking(validRankings);
        console.log(`[PARCIAIS] ✅ ${validRankings.length} times carregados`);
    } catch (err) {
        console.error("[PARCIAIS] Erro:", err);
        if (error) {
            error.textContent = `Não foi possível carregar as parciais: ${err.message}`;
            error.style.display = "block";
        }
        rankingBody.innerHTML = "";
    } finally {
        if (loading) loading.style.display = "none";
    }
}

function exibirRanking(rankings) {
    const rankingBody = document.getElementById("rankingBody");
    if (!rankingBody) return;

    const totalParticipantes = rankings.length;
    const isLigaPequena = totalParticipantes <= 10;

    rankingBody.innerHTML =
        rankings
            .map((rank, index) => {
                const position = index + 1;
                let positionLabel = `${position}º`;
                let positionClass = "";

                if (position === 1) {
                    positionLabel = "MITO";
                    positionClass = "mito";
                } else if (isLigaPequena) {
                    // Liga pequena: G2 só para 2º lugar, MICO para último
                    if (position === 2) {
                        positionLabel = "G2";
                        positionClass = "g2-g11";
                    } else if (position === totalParticipantes) {
                        positionLabel = "MICO";
                        positionClass = "mico";
                    }
                } else {
                    // Liga grande (32 participantes)
                    if (position >= 2 && position <= 11) {
                        positionLabel = `G${position}`;
                        positionClass = "g2-g11";
                    } else if (position >= 22 && position <= 31) {
                        positionLabel = `Z${position}`;
                        positionClass = "z22-z31";
                    } else if (position === totalParticipantes) {
                        positionLabel = "MICO";
                        positionClass = "mico";
                    }
                }

                const bancoValue = parseFloat(rank.banco);
                const bancoClass = bancoValue >= 0 ? "" : "negative";
                const bancoDisplay =
                    bancoValue >= 0
                        ? `R$ ${rank.banco}`
                        : `-R$ ${Math.abs(bancoValue).toFixed(2)}`;

                return `
            <tr>
                <td class="position ${positionClass}">${positionLabel}</td>
                <td class="cartoleiro">
                    <img src="${rank.escudo}" class="escudo" alt="Escudo" onerror="this.style.display='none'"/>
                    ${rank.cartoleiro}
                </td>
                <td class="time">${rank.time}</td>
                <td class="time-coracao">
                    ${rank.timeDoCoracao ? `<img src="${rank.timeDoCoracao}" alt="Time do Coração" onerror="this.style.display='none'"/>` : "-"}
                </td>
                <td class="pontos">${rank.pontos}</td>
                <td class="banco ${bancoClass}">${bancoDisplay}</td>
            </tr>
        `;
            })
            .join("") ||
        `<tr><td colspan="6">Nenhum dado disponível para exibição.</td></tr>`;
}

// ✅ ATUALIZAR PARCIAIS OTIMIZADO
async function atualizarParciais() {
    if (atualizacaoEmAndamento) {
        mostrarToast("Atualização em andamento, aguarde...", "info");
        return;
    }
    atualizacaoEmAndamento = true;

    const btn = document.getElementById("btnAtualizarParciais");
    setButtonLoading(btn, true);

    try {
        const resMercado = await fetch("/api/cartola/mercado/status");
        if (!resMercado.ok)
            throw new Error("Erro ao verificar status do mercado");
        const mercadoStatus = await resMercado.json();

        if (mercadoStatus.mercado_aberto) {
            mostrarToast(
                `⏸️ Rodada ${mercadoStatus.rodada_atual} - Mercado aberto. Aguarde o início dos jogos.`,
                "info",
            );
            return;
        }

        const cacheKey = `parciais_${ligaId}`;
        localStorage.removeItem(cacheKey);
        await carregarParciais();

        mostrarToast("Parciais atualizadas!", "success");
    } catch (error) {
        console.error("[PARCIAIS] Erro ao atualizar:", error);
        mostrarToast(`Erro: ${error.message}`, "error");
    } finally {
        setButtonLoading(btn, false);
        atualizacaoEmAndamento = false;
    }
}

// Inicialização do módulo
export async function inicializarParciais() {
    console.log("[PARCIAIS] Inicializando módulo...");

    const btnAtualizarParciais = document.getElementById(
        "btnAtualizarParciais",
    );
    if (btnAtualizarParciais) {
        btnAtualizarParciais.addEventListener("click", atualizarParciais);
        console.log("[PARCIAIS] Botão configurado");
    }

    await carregarParciais();
    console.log("[PARCIAIS] ✅ Módulo inicializado");
}

// Expor globalmente
window.carregarParciais = carregarParciais;
window.atualizarParciais = atualizarParciais;
window.inicializarParciais = inicializarParciais;

console.log("[PARCIAIS] ✅ Módulo carregado (otimizado)");
