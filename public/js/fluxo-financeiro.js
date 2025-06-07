import { getRankingRodadaEspecifica } from "./rodadas.js";
import {
    buscarStatusMercado as getMercadoStatus,
    getLigaId,
    getConfrontosLigaPontosCorridos,
} from "./pontos-corridos-utils.js";
import { getResultadosMataMata } from "./mata-mata.js";
import { getResultadosMelhorMes } from "./melhor-mes.js";
import { exportarExtratoFinanceiroComoImagem } from "./export.utils.js";
import { filtrarDadosPorTimesLigaEspecial } from "./filtro-liga-especial.js";

let participantes = [];
let dadosFinanceiros = {};
let rodadaAtual = 0;
let ultimaRodadaCompleta = 0;

let cacheRankings = {};
let cacheConfrontosLPC = [];
let cacheResultadosMM = [];
let cacheResultadosMelhorMes = [];
let isDataLoading = false;
let isDataLoaded = false;

// Mapeamento de Posição -> Valor do Banco (Padrão)
const valoresRodadaPadrao = {
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

// Valores específicos para a liga Cartoleiros Sobral 2025
const valoresRodadaCartoleirosSobral = {
    1: 7.0, // MITO: ganha R$ 7,00
    2: 4.0, // G2: ganha R$ 4,00
    3: 0.0, // 3º: valor neutro (0)
    4: -2.0, // 4º: perde R$ -2,00
    5: -5.0, // 5º: perde R$ -5,00
    6: -10.0, // MICO: perde R$ -10,00
};

// Valores para Mata-Mata
const VALOR_VITORIA_MATA_MATA = 5.0;
const VALOR_DERROTA_MATA_MATA = -5.0;

// IDs das ligas especiais
const ID_SUPERCARTOLA_2025 = "67f02282465c9749496b59e2";
const ID_CARTOLEIROS_SOBRAL = "6818c6125b30e1ad70847192";

// Funções para gerenciar campos editáveis no localStorage
function salvarCampoEditavel(timeId, campo, tipo, valor) {
    const chave = `fluxo_financeiro_${timeId}_${campo}_${tipo}`;
    localStorage.setItem(chave, valor);
}

function carregarCampoEditavel(timeId, campo, tipo, valorPadrao) {
    const chave = `fluxo_financeiro_${timeId}_${campo}_${tipo}`;
    return localStorage.getItem(chave) || valorPadrao;
}

function carregarTodosCamposEditaveis(timeId) {
    return {
        campo1: {
            nome: carregarCampoEditavel(timeId, "campo1", "nome", "Campo 1"),
            valor:
                parseFloat(
                    carregarCampoEditavel(timeId, "campo1", "valor", "0"),
                ) || 0,
        },
        campo2: {
            nome: carregarCampoEditavel(timeId, "campo2", "nome", "Campo 2"),
            valor:
                parseFloat(
                    carregarCampoEditavel(timeId, "campo2", "valor", "0"),
                ) || 0,
        },
        campo3: {
            nome: carregarCampoEditavel(timeId, "campo3", "nome", "Campo 3"),
            valor:
                parseFloat(
                    carregarCampoEditavel(timeId, "campo3", "valor", "0"),
                ) || 0,
        },
        campo4: {
            nome: carregarCampoEditavel(timeId, "campo4", "nome", "Campo 4"),
            valor:
                parseFloat(
                    carregarCampoEditavel(timeId, "campo4", "valor", "0"),
                ) || 0,
        },
    };
}

// Função para simular dados de ranking para desenvolvimento/teste
function gerarRankingSimulado(rodada, timeId) {
    if (!participantes || participantes.length === 0) {
        return [];
    }
    return participantes
        .map((p) => {
            const pontos = Math.random() * 90 + 30;
            return {
                time_id: p.time_id,
                timeId: p.time_id,
                nome_cartola: p.nome_cartola,
                nome_time: p.nome_time,
                clube_id: p.clube_id,
                pontos: pontos.toFixed(2),
                rodada: rodada,
            };
        })
        .sort((a, b) => b.pontos - a.pontos);
}

export async function inicializarFluxoFinanceiro() {
    const container = document.getElementById("fluxoFinanceiroContent");
    const buttonsContainer = document.getElementById("fluxoFinanceiroButtons");
    const exportBtnContainer = document.getElementById(
        "fluxoFinanceiroExportBtnContainer",
    );

    if (isDataLoaded) {
        renderizarBotoesParticipantes();
        const firstButton =
            buttonsContainer?.querySelector(".participante-card");
        if (firstButton) {
            const timeId = firstButton.dataset.timeId;
            calcularEExibirExtrato(timeId);
            buttonsContainer
                .querySelectorAll(".participante-card")
                .forEach((btn) => btn.classList.remove("active"));
            firstButton.classList.add("active");
        }
        return;
    }

    if (isDataLoading) {
        return;
    }

    isDataLoading = true;
    if (container)
        container.innerHTML = `
            <div class="loading-container" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
                <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
                <p style="font-size:16px; margin-bottom:10px;">Carregando dados financeiros...</p>
                <p style="font-size:14px; color:#6c757d;">Isso pode levar alguns instantes</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    if (buttonsContainer) buttonsContainer.innerHTML = "";
    if (exportBtnContainer) exportBtnContainer.innerHTML = "";

    try {
        const [status, participantesData] = await Promise.all([
            getMercadoStatus(),
            carregarParticipantes(),
        ]);

        rodadaAtual = status ? status.rodada_atual : 0;
        ultimaRodadaCompleta = rodadaAtual > 0 ? rodadaAtual - 1 : 0;

        renderizarBotoesParticipantes();

        if (container)
            container.innerHTML = `
                <div class="loading-container" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
                    <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
                    <p style="font-size:16px; margin-bottom:10px;">Carregando dados das rodadas...</p>
                    <p style="font-size:14px; color:#6c757d;">Processando ${ultimaRodadaCompleta} rodadas</p>
                    <div style="width:100%; max-width:300px; margin:15px auto; background:#e9ecef; height:10px; border-radius:5px;">
                        <div id="loading-progress-bar" style="width:5%; background:#3949ab; height:10px; border-radius:5px;"></div>
                    </div>
                </div>
            `;

        await carregarCacheRankingsEmLotes(container);

        const [confrontosLPC, resultadosMM, resultadosMelhorMes] =
            await Promise.all([
                getConfrontosLigaPontosCorridos(),
                getResultadosMataMata().catch(() => []),
                getResultadosMelhorMes().catch(() => []),
            ]);

        cacheConfrontosLPC = confrontosLPC || [];
        cacheResultadosMM = Array.isArray(resultadosMM) ? resultadosMM : [];
        cacheResultadosMelhorMes = Array.isArray(resultadosMelhorMes)
            ? resultadosMelhorMes
            : [];

        isDataLoaded = true;

        if (participantes.length > 0) {
            const firstParticipantId = participantes[0].time_id;
            await calcularEExibirExtrato(firstParticipantId);
            const firstButton =
                buttonsContainer?.querySelector(".participante-card");
            if (firstButton) firstButton.classList.add("active");
        } else {
            if (container)
                container.innerHTML = `
                    <div class="empty-state" style="text-align:center; padding:40px 20px;">
                        <div class="empty-icon" style="font-size:48px; margin-bottom:20px;">👥</div>
                        <p style="font-size:18px; color:#666;">Nenhum participante encontrado.</p>
                    </div>
                `;
        }
    } catch (error) {
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="text-align:center; padding:40px 20px; background:#fff3f3; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
                    <div class="error-icon" style="font-size:48px; margin-bottom:20px;">⚠️</div>
                    <p style="font-size:18px; color:#d32f2f; margin-bottom:10px;">Erro ao carregar dados financeiros</p>
                    <p class="error-details" style="font-size:14px; color:#666; margin-bottom:20px;">${error.message}</p>
                    <button class="retry-button" onclick="window.location.reload()" style="background:#3949ab; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer;">Tentar novamente</button>
                </div>
            `;
        }
    } finally {
        isDataLoading = false;
    }
}

async function carregarParticipantes() {
    const ligaId = getLigaId();
    if (!ligaId) {
        participantes = [];
        return;
    }
    try {
        const response = await fetch(`/api/ligas/${ligaId}/times`);
        if (!response.ok) {
            throw new Error(
                `Erro ao buscar participantes: ${response.statusText}`,
            );
        }
        const data = await response.json();
        if (!data || !Array.isArray(data) || data.length === 0) {
            participantes = [];
            return [];
        }
        participantes = data
            .map((p) => {
                const nomeCartolaFinal =
                    p.nome_cartola || p.nome_cartoleiro || "N/D";
                const nomeTimeFinal = p.nome_time || "Time S/ Nome";
                const nomeFinalParaExibir =
                    nomeCartolaFinal === "N/D"
                        ? nomeTimeFinal !== "Time S/ Nome"
                            ? nomeTimeFinal
                            : "Participante S/ Nome"
                        : nomeCartolaFinal;
                const timeId = String(p.id || p.time_id || p.timeId);
                return {
                    time_id: timeId,
                    timeId: timeId,
                    id: timeId,
                    nome_cartola: nomeFinalParaExibir,
                    nome_time: nomeTimeFinal,
                    clube_id: p.clube_id,
                };
            })
            .sort((a, b) =>
                (a.nome_cartola || "").localeCompare(b.nome_cartola || ""),
            );
        return participantes;
    } catch (error) {
        participantes = [];
        return [];
    }
}

async function carregarCacheRankingsEmLotes(container) {
    const ligaId = getLigaId();
    if (!ligaId) {
        cacheRankings = {};
        return;
    }
    cacheRankings = {};
    const tamanhoDeLote = 5;
    const totalDeLotes = Math.ceil(ultimaRodadaCompleta / tamanhoDeLote);

    for (let lote = 0; lote < totalDeLotes; lote++) {
        const rodadaInicial = lote * tamanhoDeLote + 1;
        const rodadaFinal = Math.min(
            (lote + 1) * tamanhoDeLote,
            ultimaRodadaCompleta,
        );
        const progressoAtual = Math.round((lote / totalDeLotes) * 100);
        const barraDeProgresso = document.getElementById(
            "loading-progress-bar",
        );
        if (barraDeProgresso) {
            barraDeProgresso.style.width = `${progressoAtual}%`;
        }
        if (container) {
            const mensagemDeProgresso = container.querySelector(
                ".loading-container p:nth-child(2)",
            );
            if (mensagemDeProgresso) {
                mensagemDeProgresso.textContent = `Processando rodadas ${rodadaInicial} a ${rodadaFinal} de ${ultimaRodadaCompleta}`;
            }
        }
        const promessasDoLote = [];
        for (let r = rodadaInicial; r <= rodadaFinal; r++) {
            promessasDoLote.push(
                getRankingRodadaEspecifica(ligaId, r)
                    .then(async (ranking) => {
                        if (
                            !ranking ||
                            !Array.isArray(ranking) ||
                            ranking.length === 0
                        ) {
                            const rankingSimulado = gerarRankingSimulado(r);
                            cacheRankings[r] = rankingSimulado;
                            return;
                        }
                        const rankingNormalizado = ranking.map((item) => {
                            const timeId = String(
                                item.timeId || item.time_id || item.id,
                            );
                            return {
                                ...item,
                                time_id: timeId,
                                timeId: timeId,
                                id: timeId,
                            };
                        });
                        cacheRankings[r] = rankingNormalizado;
                    })
                    .catch(() => {
                        const rankingSimulado = gerarRankingSimulado(r);
                        cacheRankings[r] = rankingSimulado;
                    }),
            );
        }
        await Promise.all(promessasDoLote);
    }
    const barraDeProgresso = document.getElementById("loading-progress-bar");
    if (barraDeProgresso) {
        barraDeProgresso.style.width = "100%";
    }
}

function renderizarBotoesParticipantes() {
    const container = document.getElementById("fluxoFinanceiroButtons");
    if (!container) return;

    container.style.cssText = "";
    container.className = "participantes-buttons-container";

    if (participantes.length === 0) {
        container.innerHTML = `
            <div class="empty-buttons" style="text-align:center; padding:20px; background:#f8f9fa; border-radius:8px;">
                <p style="color:#666;">Nenhum participante encontrado.</p>
            </div>
        `;
        return;
    }

    const buttonsHTML = `
        <div class="cards-grid">
            ${participantes
                .map(
                    (p) => `
                <div class="participante-card" data-time-id="${p.time_id}">
                    <div class="card-content">
                        ${p.clube_id ? `<img src="/escudos/${p.clube_id}.png" class="card-escudo" onerror="this.style.display='none'">` : ""}
                        <div class="card-info">
                            <div class="card-nome">${p.nome_cartola}</div>
                            <div class="card-time">${p.nome_time}</div>
                        </div>
                    </div>
                </div>
            `,
                )
                .join("")}
        </div>
    `;

    container.innerHTML = buttonsHTML;

    const style = document.createElement("style");
    style.textContent = `
        .participantes-buttons-container {
            max-width: 1200px;
            margin: 0 auto 20px auto;
        }
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 8px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        @media (max-width: 1200px) {
            .cards-grid {
                grid-template-columns: repeat(6, 1fr);
            }
        }
        @media (max-width: 900px) {
            .cards-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }
        @media (max-width: 600px) {
            .cards-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        .participante-card {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 6px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .participante-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 5px rgba(0,0,0,0.1);
            border-color: #bbdefb;
        }
        .participante-card.active {
            background: #e3f2fd;
            border-color: #2196f3;
            box-shadow: 0 2px 4px rgba(33, 150, 243, 0.2);
        }
        .card-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .card-escudo {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #fff;
            border: 1px solid #eee;
            flex-shrink: 0;
        }
        .card-info {
            overflow: hidden;
        }
        .card-nome {
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .card-time {
            font-size: 11px;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `;
    document.head.appendChild(style);

    container.querySelectorAll(".participante-card").forEach((card) => {
        card.addEventListener("click", async () => {
            const timeId = card.dataset.timeId;
            container
                .querySelectorAll(".participante-card")
                .forEach((btn) => btn.classList.remove("active"));
            card.classList.add("active");
            await calcularEExibirExtrato(timeId);
        });
    });
}

async function calcularEExibirExtrato(timeId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    const exportBtnContainer = document.getElementById(
        "fluxoFinanceiroExportBtnContainer",
    );
    if (!container) return;
    container.innerHTML = `
        <div class="loading-container" style="text-align:center; padding:40px 20px; background:#f8f9fa; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin:20px auto; max-width:700px;">
            <div class="loading-spinner" style="margin:0 auto 20px auto; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #3949ab; border-radius:50%; animation:spin 1s linear infinite;"></div>
            <p style="font-size:16px; margin-bottom:10px;">Calculando extrato financeiro...</p>
        </div>
    `;
    if (exportBtnContainer) exportBtnContainer.innerHTML = "";
    const participante = participantes.find((p) => p.time_id === timeId);
    if (!participante) {
        container.innerHTML = `
            <div class="error-message" style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;">
                <p style="color:#d32f2f;">Participante não encontrado.</p>
            </div>
        `;
        return;
    }
    if (Object.keys(cacheRankings).length === 0) {
        await carregarCacheRankingsEmLotes(container);
    }
    const extrato = calcularExtratoFinanceiro(timeId);
    if (!extrato.rodadas || extrato.rodadas.length === 0) {
        await carregarCacheRankingsEmLotes(container);
        const extratoAtualizado = calcularExtratoFinanceiro(timeId);
        renderizarExtratoFinanceiro(extratoAtualizado, participante);
    } else {
        renderizarExtratoFinanceiro(extrato, participante);
    }
    if (exportBtnContainer) {
        const exportBtn = document.createElement("button");
        exportBtn.className = "btn-exportar-extrato";
        exportBtn.textContent = "Exportar Imagem";
        exportBtn.style.cssText = `
            padding: 6px 12px;
            background: #3949ab;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        `;
        exportBtn.onclick = () => {
            exportBtn.disabled = true;
            exportBtn.textContent = "Exportando...";
            setTimeout(async () => {
                try {
                    const camposEditaveis =
                        carregarTodosCamposEditaveis(timeId);
                    await exportarExtratoFinanceiroComoImagem(
                        extrato,
                        participante,
                        camposEditaveis,
                    );
                } catch (error) {
                    alert(
                        "Erro ao exportar extrato. Verifique o console para mais detalhes.",
                    );
                } finally {
                    exportBtn.disabled = false;
                    exportBtn.textContent = "Exportar Imagem";
                }
            }, 100);
        };
        exportBtnContainer.appendChild(exportBtn);
    }
}

function calcularExtratoFinanceiro(timeId) {
    const ligaId = getLigaId();
    const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
    const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;
    const camposEditaveis = carregarTodosCamposEditaveis(timeId);
    const extrato = {
        rodadas: [],
        resumo: {
            bonus: 0,
            onus: 0,
            pontosCorridos: 0,
            mataMata: 0,
            campo1: camposEditaveis.campo1.valor,
            campo2: camposEditaveis.campo2.valor,
            campo3: camposEditaveis.campo3.valor,
            campo4: camposEditaveis.campo4.valor,
            vezesMito: 0,
            vezesMico: 0,
            saldo: 0,
        },
        totalTimes: 0,
        camposEditaveis: camposEditaveis,
    };
    if (Object.keys(cacheRankings).length === 0) {
        return extrato;
    }
    for (let rodada = 1; rodada <= ultimaRodadaCompleta; rodada++) {
        const ranking = cacheRankings[rodada];
        if (!ranking || !ranking.length) {
            continue;
        }
        const posicao = ranking.findIndex((r) => {
            const rTimeId = String(r.timeId || r.time_id || r.id);
            return rTimeId === timeId;
        });
        if (posicao === -1) {
            continue;
        }
        const totalTimes = ranking.length;
        extrato.totalTimes = Math.max(extrato.totalTimes, totalTimes);
        const posicaoReal = posicao + 1;
        const isMito = posicaoReal === 1;
        const isMico = posicaoReal === totalTimes;
        let bonusOnus = 0;
        const valoresRodadaAtual = isCartoleirosSobral
            ? valoresRodadaCartoleirosSobral
            : valoresRodadaPadrao;
        if (valoresRodadaAtual[posicaoReal]) {
            bonusOnus = valoresRodadaAtual[posicaoReal];
        }
        if (isMito) extrato.resumo.vezesMito++;
        if (isMico) extrato.resumo.vezesMico++;
        let pontosCorridos = null;
        let mataMata = null;
        if (isSuperCartola2025) {
            pontosCorridos = 0;
            if (cacheConfrontosLPC && cacheConfrontosLPC.length > 0) {
                const confrontosRodada = cacheConfrontosLPC.find(
                    (c) => c.rodadaCartola === rodada || c.rodada === rodada,
                );
                if (confrontosRodada && confrontosRodada.jogos) {
                    const confronto = confrontosRodada.jogos.find((j) => {
                        const timeA_id =
                            j.timeA &&
                            String(
                                j.timeA.time_id || j.timeA.timeId || j.timeA.id,
                            );
                        const timeB_id =
                            j.timeB &&
                            String(
                                j.timeB.time_id || j.timeB.timeId || j.timeB.id,
                            );
                        const time1_id =
                            j.time1 &&
                            String(
                                j.time1.time_id || j.time1.timeId || j.time1.id,
                            );
                        const time2_id =
                            j.time2 &&
                            String(
                                j.time2.time_id || j.time2.timeId || j.time2.id,
                            );
                        return (
                            timeA_id === timeId ||
                            timeB_id === timeId ||
                            time1_id === timeId ||
                            time2_id === timeId
                        );
                    });
                    if (confronto) {
                        const isTimeA =
                            (confronto.timeA &&
                                String(
                                    confronto.timeA.time_id ||
                                        confronto.timeA.timeId ||
                                        confronto.timeA.id,
                                ) === timeId) ||
                            (confronto.time1 &&
                                String(
                                    confronto.time1.time_id ||
                                        confronto.time1.timeId ||
                                        confronto.time1.id,
                                ) === timeId);
                        const pontosTime = isTimeA
                            ? confronto.pontosTimeA || confronto.pontos1
                            : confronto.pontosTimeB || confronto.pontos2;
                        const pontosAdversario = isTimeA
                            ? confronto.pontosTimeB || confronto.pontos2
                            : confronto.pontosTimeA || confronto.pontos1;
                        if (
                            typeof pontosTime === "number" &&
                            typeof pontosAdversario === "number"
                        ) {
                            if (pontosTime > pontosAdversario) {
                                pontosCorridos =
                                    pontosTime - pontosAdversario >= 10
                                        ? 7.0
                                        : 5.0;
                            } else if (pontosAdversario > pontosTime) {
                                pontosCorridos =
                                    pontosAdversario - pontosTime >= 10
                                        ? -7.0
                                        : -5.0;
                            } else {
                                pontosCorridos = 0.0;
                            }
                        } else {
                            pontosCorridos = null;
                        }
                    } else {
                        pontosCorridos = null;
                    }
                }
            }
            mataMata = null;
            if (cacheResultadosMM && cacheResultadosMM.length > 0) {
                const resultadosRodada = cacheResultadosMM.find(
                    (r) => r.rodada === rodada,
                );
                if (resultadosRodada && resultadosRodada.confrontos) {
                    const confronto = resultadosRodada.confrontos.find((c) => {
                        const timeA_id =
                            c.timeA &&
                            String(
                                c.timeA.time_id || c.timeA.timeId || c.timeA.id,
                            );
                        const timeB_id =
                            c.timeB &&
                            String(
                                c.timeB.time_id || c.timeB.timeId || c.timeB.id,
                            );
                        return timeA_id === timeId || timeB_id === timeId;
                    });
                    if (confronto && confronto.vencedor) {
                        const isTimeA =
                            confronto.timeA &&
                            String(
                                confronto.timeA.time_id ||
                                    confronto.timeA.timeId ||
                                    confronto.timeA.id,
                            ) === timeId;
                        const isVencedor =
                            (isTimeA && confronto.vencedor === "A") ||
                            (!isTimeA && confronto.vencedor === "B");
                        mataMata = isVencedor
                            ? VALOR_VITORIA_MATA_MATA
                            : VALOR_DERROTA_MATA_MATA;
                    } else {
                        mataMata = null;
                    }
                }
            }
        }
        extrato.rodadas.push({
            rodada,
            posicao: posicaoReal,
            bonusOnus,
            pontosCorridos,
            mataMata,
        });
        if (bonusOnus > 0) extrato.resumo.bonus += bonusOnus;
        if (bonusOnus < 0) extrato.resumo.onus += bonusOnus;
        if (isSuperCartola2025) {
            if (typeof pontosCorridos === "number")
                extrato.resumo.pontosCorridos += pontosCorridos;
            if (typeof mataMata === "number")
                extrato.resumo.mataMata += mataMata;
        }
    }
    extrato.resumo.saldo =
        extrato.resumo.bonus +
        extrato.resumo.onus +
        extrato.resumo.pontosCorridos +
        extrato.resumo.mataMata +
        extrato.resumo.campo1 +
        extrato.resumo.campo2 +
        extrato.resumo.campo3 +
        extrato.resumo.campo4;
    return extrato;
}

function renderizarExtratoFinanceiro(extrato, participante) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) return;
    const ligaId = getLigaId();
    const isSuperCartola2025 = ligaId === ID_SUPERCARTOLA_2025;
    const isCartoleirosSobral = ligaId === ID_CARTOLEIROS_SOBRAL;
    if (!extrato.rodadas || extrato.rodadas.length === 0) {
        container.innerHTML = `
            <div class="error-message" style="text-align:center; padding:20px; background:#fff3f3; border-radius:8px;">
                <p style="color:#d32f2f;">Nenhuma rodada encontrada para este participante.</p>
                <p style="color:#666; margin-top:10px;">Tente recarregar a página ou selecione outro participante.</p>
            </div>
        `;
        return;
    }
    const headerHTML = `
        <div class="extrato-header">
            <div class="participante-info">
                ${participante.clube_id ? `<img src="/escudos/${participante.clube_id}.png" class="participante-escudo" onerror="this.style.display='none'">` : ""}
                <div>
                    <h3 class="participante-nome">${participante.nome_cartola}</h3>
                    <p class="participante-time">${participante.nome_time}</p>
                </div>
            </div>
            <div class="saldo-container ${extrato.resumo.saldo >= 0 ? "saldo-positivo" : "saldo-negativo"}">
                <div class="saldo-label">Saldo</div>
                <div class="saldo-valor">R$ ${extrato.resumo.saldo.toFixed(2).replace(".", ",")}</div>
            </div>
        </div>
    `;
    const resumoHTML = `
        <div class="resumo-container">
            <h4 class="resumo-titulo">Resumo Financeiro</h4>
            <div class="resumo-cards">
                <div class="resumo-card">
                    <div class="card-label">Bônus</div>
                    <div class="card-valor positivo">R$ ${extrato.resumo.bonus.toFixed(2).replace(".", ",")}</div>
                </div>
                <div class="resumo-card">
                    <div class="card-label">Ônus</div>
                    <div class="card-valor negativo">R$ ${extrato.resumo.onus.toFixed(2).replace(".", ",")}</div>
                </div>
                ${
                    isSuperCartola2025
                        ? `
                <div class="resumo-card">
                    <div class="card-label">Pontos Corridos</div>
                    <div class="card-valor ${extrato.resumo.pontosCorridos >= 0 ? "positivo" : "negativo"}">R$ ${extrato.resumo.pontosCorridos.toFixed(2).replace(".", ",")}</div>
                </div>
                <div class="resumo-card">
                    <div class="card-label">Mata-Mata</div>
                    <div class="card-valor ${extrato.resumo.mataMata >= 0 ? "positivo" : "negativo"}">R$ ${extrato.resumo.mataMata.toFixed(2).replace(".", ",")}</div>
                </div>
                `
                        : ""
                }
                <div class="resumo-card campo-editavel">
                    <div class="card-label">
                        <input type="text" class="campo-nome" value="${extrato.camposEditaveis.campo1.nome}" data-campo="campo1" data-time-id="${participante.time_id}">
                    </div>
                    <div class="card-valor-container">
                        <input type="number" class="campo-valor" value="${extrato.resumo.campo1}" data-campo="campo1" data-time-id="${participante.time_id}" step="0.01">
                        <div class="card-valor ${extrato.resumo.campo1 >= 0 ? "positivo" : "negativo"}">R$ ${extrato.resumo.campo1.toFixed(2).replace(".", ",")}</div>
                    </div>
                </div>
                <div class="resumo-card campo-editavel">
                    <div class="card-label">
                        <input type="text" class="campo-nome" value="${extrato.camposEditaveis.campo2.nome}" data-campo="campo2" data-time-id="${participante.time_id}">
                    </div>
                    <div class="card-valor-container">
                        <input type="number" class="campo-valor" value="${extrato.resumo.campo2}" data-campo="campo2" data-time-id="${participante.time_id}" step="0.01">
                        <div class="card-valor ${extrato.resumo.campo2 >= 0 ? "positivo" : "negativo"}">R$ ${extrato.resumo.campo2.toFixed(2).replace(".", ",")}</div>
                    </div>
                </div>
                <div class="resumo-card campo-editavel">
                    <div class="card-label">
                        <input type="text" class="campo-nome" value="${extrato.camposEditaveis.campo3.nome}" data-campo="campo3" data-time-id="${participante.time_id}">
                    </div>
                    <div class="card-valor-container">
                        <input type="number" class="campo-valor" value="${extrato.resumo.campo3}" data-campo="campo3" data-time-id="${participante.time_id}" step="0.01">
                        <div class="card-valor ${extrato.resumo.campo3 >= 0 ? "positivo" : "negativo"}">R$ ${extrato.resumo.campo3.toFixed(2).replace(".", ",")}</div>
                    </div>
                </div>
                <div class="resumo-card campo-editavel">
                    <div class="card-label">
                        <input type="text" class="campo-nome" value="${extrato.camposEditaveis.campo4.nome}" data-campo="campo4" data-time-id="${participante.time_id}">
                    </div>
                    <div class="card-valor-container">
                        <input type="number" class="campo-valor" value="${extrato.resumo.campo4}" data-campo="campo4" data-time-id="${participante.time_id}" step="0.01">
                        <div class="card-valor ${extrato.resumo.campo4 >= 0 ? "positivo" : "negativo"}">R$ ${extrato.resumo.campo4.toFixed(2).replace(".", ",")}</div>
                    </div>
                </div>
                <div class="resumo-card">
                    <div class="card-label">Vezes como MITO</div>
                    <div class="card-valor">${extrato.resumo.vezesMito}</div>
                </div>
                <div class="resumo-card">
                    <div class="card-label">Vezes como MICO</div>
                    <div class="card-valor">${extrato.resumo.vezesMico}</div>
                </div>
            </div>
        </div>
    `;
    let tabelaHTML = `
        <div class="detalhamento-container">
            <h4 class="detalhamento-titulo">Detalhamento por Rodada</h4>
            <div class="tabela-container">
                <table class="tabela-extrato">
                    <thead>
                        <tr>
                            <th>Rodada</th>
                            <th>Posição</th>
                            <th>Bônus/Ônus</th>
                            ${isSuperCartola2025 ? "<th>Pontos Corridos</th><th>Mata-Mata</th>" : ""}
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    const rodadasOrdenadas = [...extrato.rodadas].sort(
        (a, b) => a.rodada - b.rodada,
    );
    rodadasOrdenadas.forEach((rodada) => {
        const isMito = rodada.posicao === 1;
        const isMico = rodada.posicao === extrato.totalTimes;
        const isTop11 = rodada.posicao >= 1 && rodada.posicao <= 11;
        const isZ22_32 = rodada.posicao >= 22 && rodada.posicao <= 32;
        let posicaoClasse = "";
        let posicaoTexto = rodada.posicao;
        if (isMito) {
            posicaoClasse = "mito-posicao";
            posicaoTexto = "MITO";
        } else if (isMico) {
            posicaoClasse = "mico-posicao";
            posicaoTexto = "MICO";
        } else if (isTop11) {
            posicaoClasse = "top11-posicao";
        } else if (isZ22_32) {
            posicaoClasse = "z22-32-posicao";
        }
        let totalRodada = rodada.bonusOnus;
        if (isSuperCartola2025) {
            totalRodada +=
                (typeof rodada.pontosCorridos === "number"
                    ? rodada.pontosCorridos
                    : 0) +
                (typeof rodada.mataMata === "number" ? rodada.mataMata : 0);
        }
        tabelaHTML += `
            <tr>
                <td>${rodada.rodada}</td>
                <td class="${posicaoClasse}">${posicaoTexto}</td>
                <td class="${rodada.bonusOnus > 0 ? "positivo bonus-destaque" : rodada.bonusOnus < 0 ? "negativo onus-destaque" : ""}">${rodada.bonusOnus !== 0 ? `R$ ${rodada.bonusOnus.toFixed(2).replace(".", ",")}` : "-"}</td>
                ${
                    isSuperCartola2025
                        ? `
                    <td class="${rodada.pontosCorridos > 0 ? "positivo" : rodada.pontosCorridos < 0 ? "negativo" : ""}">
                        ${typeof rodada.pontosCorridos === "number" ? `R$ ${rodada.pontosCorridos.toFixed(2).replace(".", ",")}` : "-"}
                    </td>
                    <td class="${rodada.mataMata > 0 ? "positivo" : rodada.mataMata < 0 ? "negativo" : ""}">
                        ${typeof rodada.mataMata === "number" ? `R$ ${rodada.mataMata.toFixed(2).replace(".", ",")}` : "-"}
                    </td>
                `
                        : ""
                }
                <td class="${totalRodada > 0 ? "positivo" : totalRodada < 0 ? "negativo" : ""}">${totalRodada !== 0 ? `R$ ${totalRodada.toFixed(2).replace(".", ",")}` : "-"}</td>
            </tr>
        `;
    });
    tabelaHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = headerHTML + resumoHTML + tabelaHTML;
    adicionarEventosCamposEditaveis(participante.time_id);
    const style = document.createElement("style");
    style.textContent = `
        #fluxoFinanceiroContent {
            max-width: 900px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
        }
        .extrato-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .participante-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .participante-escudo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #fff;
            border: 1px solid #eee;
        }
        .participante-nome {
            font-size: 18px;
            margin: 0 0 4px 0;
            color: #333;
        }
        .participante-time {
            font-size: 14px;
            margin: 0;
            color: #666;
        }
        .saldo-container {
            text-align: right;
            padding: 10px 15px;
            border-radius: 6px;
        }
        .saldo-positivo {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .saldo-negativo {
            background: #ffebee;
            color: #c62828;
        }
        .saldo-label {
            font-size: 14px;
            margin-bottom: 4px;
        }
        .saldo-valor {
            font-size: 22px;
            font-weight: 700;
        }
        .resumo-container {
            background: #fff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .resumo-titulo {
            font-size: 16px;
            margin: 0 0 15px 0;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
        }
        .resumo-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 10px;
        }
        .resumo-card {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        .campo-editavel {
            background: #fff3e0;
            border: 1px solid #ffcc02;
        }
        .card-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
        }
        .card-valor {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        .card-valor-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .campo-nome {
            width: 100%;
            padding: 4px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
            text-align: center;
            background: #fff;
        }
        .campo-valor {
            width: 100%;
            padding: 4px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 14px;
            text-align: center;
            background: #fff;
        }
        .positivo {
            color: #2e7d32;
        }
        .negativo {
            color: #c62828;
        }
        .bonus-destaque {
            background-color: #c8e6c9 !important;
            font-weight: bold;
        }
        .onus-destaque {
            background-color: #ffcdd2 !important;
            font-weight: bold;
        }
        .detalhamento-container {
            background: #fff;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .detalhamento-titulo {
            font-size: 16px;
            margin: 0 0 15px 0;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
        }
        .tabela-container {
            overflow-x: auto;
        }
        .tabela-extrato {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        .tabela-extrato th {
            background: #f1f3f5;
            padding: 8px;
            text-align: center;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
        }
        .tabela-extrato td {
            padding: 8px;
            text-align: center;
            border-bottom: 1px solid #e9ecef;
        }
        /* Destaques de posição no detalhamento */
        .top11-posicao {
            background: #e8f5e9 !important;
            color: #1b5e20 !important;
            font-weight: 600;
            border-radius: 4px;
        }
        .mito-posicao {
            background: #388e3c !important;
            color: #fff !important;
            font-weight: bold;
            border-radius: 4px;
            letter-spacing: 1px;
        }
        .z22-32-posicao {
            background: #ffebee !important;
            color: #b71c1c !important;
            font-weight: 600;
            border-radius: 4px;
        }
        .mico-posicao {
            background: #b71c1c !important;
            color: #fff !important;
            font-weight: bold;
            border-radius: 4px;
            letter-spacing: 1px;
        }
    `;
    document.head.appendChild(style);
}

// Função para adicionar eventos aos campos editáveis
function adicionarEventosCamposEditaveis(timeId) {
    document.querySelectorAll(".campo-nome").forEach((input) => {
        input.addEventListener("change", (e) => {
            const campo = input.dataset.campo;
            const novoNome = input.value;
            salvarCampoEditavel(timeId, campo, "nome", novoNome);
        });
    });
    document.querySelectorAll(".campo-valor").forEach((input) => {
        input.addEventListener("change", (e) => {
            const campo = input.dataset.campo;
            const novoValor = parseFloat(input.value) || 0;
            salvarCampoEditavel(timeId, campo, "valor", novoValor);
            calcularEExibirExtrato(timeId);
        });
    });
}
