console.log("🏆 [ARTILHEIRO-CAMPEAO] Versão com controle manual de rodadas...");

// ===== CONFIGURAÇÕES =====
const CONFIG = {
    ligaId: "684d821cf1a7ae16d1f89572",
    endpoints: {
        dadosAcumulados: "/api/artilheiro-campeao/{ligaId}/acumulado",
        participantes: "/api/ligas/{ligaId}/times",
        configuracao: "/api/configuracao/rodada-atual",
    },
};

// ===== ESTADO =====
let estado = {
    dados: [],
    rodadaInicio: 1,
    rodadaFim: 14, // Padrão: até rodada 14 (considerando que 15 está em andamento)
    rodadaAtual: 15, // Rodada em andamento
    loading: false,
    participantes: [],
    processando: false,
};

// ===== INTERFACE DE CONTROLE =====
function renderizarControles() {
    return `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
                <span>⚙️</span> Controle de Processamento
            </h4>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <!-- Rodada Atual -->
                <div>
                    <label style="display: block; font-weight: 500; margin-bottom: 5px; color: #495057;">📅 Rodada Atual (em andamento):</label>
                    <input type="number" id="rodadaAtualInput" min="1" max="38" value="${estado.rodadaAtual}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;" 
                           onchange="atualizarRodadaAtual(this.value)">
                    <small style="color: #6c757d;">Rodada que está acontecendo agora</small>
                </div>

                <!-- Rodada de Início -->
                <div>
                    <label style="display: block; font-weight: 500; margin-bottom: 5px; color: #495057;">🏁 Processar desde a rodada:</label>
                    <input type="number" id="rodadaInicioInput" min="1" max="38" value="${estado.rodadaInicio}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;" 
                           onchange="atualizarRodadaInicio(this.value)">
                    <small style="color: #6c757d;">Primeira rodada a ser processada</small>
                </div>

                <!-- Rodada Final -->
                <div>
                    <label style="display: block; font-weight: 500; margin-bottom: 5px; color: #495057;">🏁 Processar até a rodada:</label>
                    <input type="number" id="rodadaFimInput" min="1" max="38" value="${estado.rodadaFim}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;" 
                           onchange="atualizarRodadaFim(this.value)">
                    <small style="color: #6c757d;">Última rodada <strong>liquidada</strong> (${estado.rodadaAtual - 1})</small>
                </div>
            </div>

            <!-- Botões de Ação -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="popularGols()" ${estado.processando ? "disabled" : ""} 
                        style="padding: 10px 20px; background: ${estado.processando ? "#6c757d" : "#28a745"}; color: white; border: none; border-radius: 4px; cursor: ${estado.processando ? "not-allowed" : "pointer"}; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                    <span>${estado.processando ? "⏳" : "🚀"}</span>
                    ${estado.processando ? "Processando..." : "Popular Gols"}
                </button>

                <button onclick="definirRodadasRapido('atual')" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    📊 Até Rodada Atual-1
                </button>

                <button onclick="definirRodadasRapido('completa')" style="padding: 10px 20px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    🏆 Temporada Completa
                </button>

                <button onclick="limparDados()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    🗑️ Limpar
                </button>
            </div>

            <!-- Informações Úteis -->
            <div style="margin-top: 15px; padding: 12px; background: #fff3cd; border-radius: 4px; border-left: 3px solid #ffc107;">
                <div style="font-size: 0.9rem; color: #856404;">
                    <strong>💡 Dicas:</strong><br>
                    • <strong>Rodada Atual:</strong> A rodada que está acontecendo agora (dados parciais)<br>
                    • <strong>Rodadas Liquidadas:</strong> Rodadas 1 até ${estado.rodadaAtual - 1} (dados completos)<br>
                    • <strong>Recomendado:</strong> Processar da rodada 1 até ${estado.rodadaAtual - 1} para dados precisos
                </div>
            </div>
        </div>
    `;
}

// ===== FUNÇÕES DE CONTROLE =====
function atualizarRodadaAtual(valor) {
    estado.rodadaAtual = parseInt(valor) || 15;

    // Ajustar automaticamente a rodada fim para (atual - 1)
    estado.rodadaFim = Math.max(1, estado.rodadaAtual - 1);
    document.getElementById("rodadaFimInput").value = estado.rodadaFim;

    atualizarInterface();
    console.log(`📅 Rodada atual atualizada: ${estado.rodadaAtual}`);
}

function atualizarRodadaInicio(valor) {
    estado.rodadaInicio = parseInt(valor) || 1;
    console.log(`🏁 Rodada início atualizada: ${estado.rodadaInicio}`);
}

function atualizarRodadaFim(valor) {
    const novaRodadaFim = parseInt(valor) || estado.rodadaAtual - 1;

    // Validar se não é maior que rodada atual - 1
    if (novaRodadaFim >= estado.rodadaAtual) {
        alert(
            `⚠️ Rodada fim não pode ser ${novaRodadaFim} pois a rodada ${estado.rodadaAtual} está em andamento.\nUse no máximo a rodada ${estado.rodadaAtual - 1}.`,
        );
        document.getElementById("rodadaFimInput").value =
            estado.rodadaAtual - 1;
        estado.rodadaFim = estado.rodadaAtual - 1;
        return;
    }

    estado.rodadaFim = novaRodadaFim;
    console.log(`🏁 Rodada fim atualizada: ${estado.rodadaFim}`);
}

function definirRodadasRapido(tipo) {
    switch (tipo) {
        case "atual":
            estado.rodadaInicio = 1;
            estado.rodadaFim = estado.rodadaAtual - 1;
            break;
        case "completa":
            estado.rodadaInicio = 1;
            estado.rodadaFim = 38;
            break;
    }

    document.getElementById("rodadaInicioInput").value = estado.rodadaInicio;
    document.getElementById("rodadaFimInput").value = estado.rodadaFim;

    console.log(
        `⚡ Definição rápida: ${tipo} - Rodadas ${estado.rodadaInicio} a ${estado.rodadaFim}`,
    );
}

function limparDados() {
    if (
        confirm(
            "🗑️ Tem certeza que deseja limpar todos os dados do artilheiro campeão?",
        )
    ) {
        estado.dados = [];
        atualizarInterface();
        console.log("🗑️ Dados limpos");
    }
}

// ===== PROCESSAMENTO PRINCIPAL =====
async function popularGols() {
    if (estado.processando) {
        console.warn("⚠️ Processamento já em andamento");
        return;
    }

    // Validações
    if (estado.rodadaInicio > estado.rodadaFim) {
        alert("❌ Rodada início não pode ser maior que rodada fim!");
        return;
    }

    if (estado.rodadaFim >= estado.rodadaAtual) {
        alert(
            `❌ Rodada fim (${estado.rodadaFim}) deve ser menor que a rodada atual (${estado.rodadaAtual}) pois ela está em andamento!`,
        );
        return;
    }

    try {
        estado.processando = true;
        atualizarInterface();

        console.log(
            `🚀 Iniciando processamento: rodadas ${estado.rodadaInicio} a ${estado.rodadaFim}`,
        );

        mostrarProgresso(0, 0, "Iniciando processamento...");

        // 1. Buscar participantes
        mostrarProgresso(1, 4, "Buscando participantes da liga...");
        estado.participantes = await buscarParticipantes();
        console.log(
            `👥 ${estado.participantes.length} participantes encontrados`,
        );

        // 2. Processar dados
        mostrarProgresso(2, 4, "Processando dados dos participantes...");
        estado.dados = await processarParticipantes();

        // 3. Calcular ranking
        mostrarProgresso(3, 4, "Calculando ranking final...");
        estado.dados = calcularRanking(estado.dados);

        // 4. Renderizar interface
        mostrarProgresso(4, 4, "Finalizando...");
        atualizarInterface();

        console.log(
            `✅ Processamento concluído: ${estado.dados.length} participantes`,
        );
    } catch (error) {
        console.error("❌ Erro no processamento:", error);
        mostrarErro("Erro ao processar dados dos gols", error.message);
    } finally {
        estado.processando = false;
        atualizarInterface();
    }
}

// ===== BUSCAR PARTICIPANTES =====
async function buscarParticipantes() {
    const estrategias = [
        `/api/ligas/${CONFIG.ligaId}/times`,
        `/api/ligas/${CONFIG.ligaId}/participantes`,
        `/api/ligas/${CONFIG.ligaId}`,
    ];

    for (const url of estrategias) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                let participantes = Array.isArray(data)
                    ? data
                    : data.times || data.participantes || [];

                if (participantes.length > 0) {
                    return participantes.map((p) => ({
                        timeId: p.time_id || p.timeId || p.id,
                        nome:
                            p.nome_cartoleiro ||
                            p.nome_cartola ||
                            p.nome ||
                            `Participante ${p.id}`,
                        nomeTime: p.nome_time || p.time || `Time ${p.id}`,
                        escudo: p.url_escudo_png || p.escudo || null,
                    }));
                }
            }
        } catch (error) {
            console.warn(`⚠️ Estratégia ${url} falhou:`, error);
        }
    }

    throw new Error("Nenhum participante encontrado na liga");
}

// ===== PROCESSAR PARTICIPANTES =====
async function processarParticipantes() {
    const resultados = [];

    for (let i = 0; i < estado.participantes.length; i++) {
        const participante = estado.participantes[i];

        mostrarProgresso(
            i + 1,
            estado.participantes.length,
            `Processando ${participante.nome}... (${i + 1}/${estado.participantes.length})`,
        );

        try {
            const dadosParticipante = await processarParticipante(participante);
            resultados.push(dadosParticipante);

            console.log(
                `✅ ${participante.nome}: ${dadosParticipante.golsPro} gols pró, ${dadosParticipante.golsContra} gols contra`,
            );
        } catch (error) {
            console.error(`❌ Erro ao processar ${participante.nome}:`, error);

            // Adicionar com dados zerados em caso de erro
            resultados.push({
                timeId: participante.timeId,
                nomeCartoleiro: participante.nome,
                nomeTime: participante.nomeTime,
                escudo: participante.escudo,
                golsPro: 0,
                golsContra: 0,
                saldoGols: 0,
                mediaGols: "0.00",
                jogadores: [],
                totalJogos: 0,
                erro: error.message,
            });
        }

        // Delay entre participantes para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return resultados;
}

// ===== PROCESSAR PARTICIPANTE INDIVIDUAL =====
async function processarParticipante(participante) {
    console.log(
        `🔄 Processando participante: ${participante.nome} (ID: ${participante.timeId})`,
    );

    try {
        // ESTRATÉGIA 1: Tentar buscar dados agregados do backend primeiro
        const urlAgregado = `/api/artilheiro-campeao/${CONFIG.ligaId}/gols/${participante.timeId}/agregado?inicio=${estado.rodadaInicio}&fim=${estado.rodadaFim}`;

        console.log(`📡 Tentando dados agregados: ${urlAgregado}`);
        const respostaAgregado = await fetch(urlAgregado);

        if (respostaAgregado.ok) {
            const dadosAgregados = await respostaAgregado.json();
            if (dadosAgregados.success && dadosAgregados.data) {
                console.log(
                    `✅ Dados agregados obtidos para ${participante.nome}`,
                );
                return formatarDadosParticipante(
                    participante,
                    dadosAgregados.data,
                );
            }
        }

        console.log(
            `⚠️ Dados agregados não disponíveis para ${participante.nome}, tentando rodada por rodada...`,
        );

        // ESTRATÉGIA 2: Buscar rodada por rodada
        let totalGolsPro = 0;
        let totalGolsContra = 0;
        const detalhePorRodada = [];
        const jogadoresMap = new Map();
        let endpointsBackendFalharam = 0; // Contador de falhas

        for (
            let rodada = estado.rodadaInicio;
            rodada <= estado.rodadaFim;
            rodada++
        ) {
            const urlRodada = `/api/artilheiro-campeao/${CONFIG.ligaId}/gols/${participante.timeId}/${rodada}`;

            try {
                console.log(
                    `📊 Buscando rodada ${rodada} para ${participante.nome}: ${urlRodada}`,
                );
                const respostaRodada = await fetch(urlRodada);

                if (respostaRodada.ok) {
                    const dadosRodada = await respostaRodada.json();

                    if (dadosRodada.success && dadosRodada.data) {
                        const golsPro = dadosRodada.data.golsPro || 0;
                        const golsContra = dadosRodada.data.golsContra || 0;

                        totalGolsPro += golsPro;
                        totalGolsContra += golsContra;

                        detalhePorRodada.push({
                            rodada,
                            golsPro,
                            golsContra,
                            saldo: golsPro - golsContra,
                            jogadores: dadosRodada.data.jogadores || [],
                        });

                        // Agregar jogadores
                        if (
                            dadosRodada.data.jogadores &&
                            Array.isArray(dadosRodada.data.jogadores)
                        ) {
                            dadosRodada.data.jogadores.forEach((jogador) => {
                                const chave =
                                    jogador.nome ||
                                    jogador.apelido ||
                                    "Jogador";
                                if (jogadoresMap.has(chave)) {
                                    jogadoresMap.get(chave).gols +=
                                        jogador.gols || 0;
                                } else {
                                    jogadoresMap.set(chave, {
                                        nome: chave,
                                        gols: jogador.gols || 0,
                                    });
                                }
                            });
                        }

                        console.log(
                            `✅ Rodada ${rodada}: ${golsPro} gols pró, ${golsContra} gols contra`,
                        );
                    } else {
                        console.warn(
                            `⚠️ Resposta inválida para rodada ${rodada}: ${JSON.stringify(dadosRodada)}`,
                        );
                        endpointsBackendFalharam++;
                    }
                } else {
                    console.warn(
                        `⚠️ Erro HTTP ${respostaRodada.status} para rodada ${rodada}`,
                    );
                    endpointsBackendFalharam++;
                }
            } catch (errorRodada) {
                console.warn(
                    `⚠️ Erro na rodada ${rodada}:`,
                    errorRodada.message,
                );
                endpointsBackendFalharam++;
            }

            // Se as primeiras 3 rodadas falharam, ir direto para API Cartola
            if (
                rodada <= estado.rodadaInicio + 2 &&
                endpointsBackendFalharam >= 3
            ) {
                console.log(
                    `🚨 Backend completamente indisponível para ${participante.nome}, mudando para API Cartola...`,
                );
                return await processarParticipanteViaCartola(participante);
            }

            // Delay entre rodadas
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Formatar resultado
        const saldoGols = totalGolsPro - totalGolsContra;
        const numRodadas = estado.rodadaFim - estado.rodadaInicio + 1;
        const mediaGols =
            numRodadas > 0 ? (totalGolsPro / numRodadas).toFixed(2) : "0.00";

        // Converter jogadores map para array ordenado
        const jogadores = Array.from(jogadoresMap.values())
            .filter((j) => j.gols > 0)
            .sort((a, b) => b.gols - a.gols);

        const resultado = {
            timeId: participante.timeId,
            nomeCartoleiro: participante.nome,
            nomeTime: participante.nomeTime,
            escudo: participante.escudo,
            golsPro: totalGolsPro,
            golsContra: totalGolsContra,
            saldoGols: saldoGols,
            mediaGols: mediaGols,
            jogadores: jogadores,
            totalJogos: numRodadas,
            rodadasProcessadas: `${estado.rodadaInicio}-${estado.rodadaFim}`,
            detalhePorRodada: detalhePorRodada,
        };

        console.log(
            `✅ Processamento concluído para ${participante.nome}: ${totalGolsPro} gols pró, ${totalGolsContra} gols contra`,
        );
        return resultado;
    } catch (error) {
        console.error(`❌ Erro ao processar ${participante.nome}:`, error);

        // ESTRATÉGIA 3: Fallback com dados da API Cartola direta
        console.log(
            `🔄 Tentando fallback via API Cartola para ${participante.nome}...`,
        );
        return await processarParticipanteViaCartola(participante);
    }
}

// ===== FALLBACK VIA API CARTOLA =====
async function processarParticipanteViaCartola(participante) {
    let totalGolsPro = 0;
    let totalGolsContra = 0;
    const detalhePorRodada = [];
    const jogadoresMap = new Map();

    for (
        let rodada = estado.rodadaInicio;
        rodada <= estado.rodadaFim;
        rodada++
    ) {
        try {
            const urlCartola = `https://api.cartola.globo.com/time/id/${participante.timeId}/${rodada}`;
            console.log(`📡 Tentando API Cartola: ${urlCartola}`);

            const response = await fetch(urlCartola);
            if (response.ok) {
                const data = await response.json();

                let golsPro = 0;
                let golsContra = 0;
                const jogadoresRodada = [];

                if (data.atletas && Array.isArray(data.atletas)) {
                    data.atletas.forEach((atleta) => {
                        if (atleta.scout) {
                            // Gols marcados
                            const gols = parseInt(atleta.scout.G) || 0;
                            if (gols > 0) {
                                golsPro += gols;
                                const nomeJogador =
                                    atleta.apelido || atleta.nome || "Jogador";
                                jogadoresRodada.push({
                                    nome: nomeJogador,
                                    gols: gols,
                                });

                                // Agregar no map geral
                                if (jogadoresMap.has(nomeJogador)) {
                                    jogadoresMap.get(nomeJogador).gols += gols;
                                } else {
                                    jogadoresMap.set(nomeJogador, {
                                        nome: nomeJogador,
                                        gols: gols,
                                    });
                                }
                            }

                            // Gols contra (só goleiros)
                            if (atleta.posicao_id === 1) {
                                const gc = parseInt(atleta.scout.GC) || 0;
                                golsContra += gc;
                            }
                        }
                    });
                }

                totalGolsPro += golsPro;
                totalGolsContra += golsContra;

                detalhePorRodada.push({
                    rodada,
                    golsPro,
                    golsContra,
                    saldo: golsPro - golsContra,
                    jogadores: jogadoresRodada,
                });

                console.log(
                    `✅ API Cartola - Rodada ${rodada}: ${golsPro} gols pró, ${golsContra} gols contra`,
                );
            }
        } catch (error) {
            console.warn(
                `⚠️ Erro na API Cartola, rodada ${rodada}:`,
                error.message,
            );
        }

        // Delay entre requests
        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const saldoGols = totalGolsPro - totalGolsContra;
    const numRodadas = estado.rodadaFim - estado.rodadaInicio + 1;
    const mediaGols =
        numRodadas > 0 ? (totalGolsPro / numRodadas).toFixed(2) : "0.00";

    const jogadores = Array.from(jogadoresMap.values())
        .filter((j) => j.gols > 0)
        .sort((a, b) => b.gols - a.gols);

    return {
        timeId: participante.timeId,
        nomeCartoleiro: participante.nome,
        nomeTime: participante.nomeTime,
        escudo: participante.escudo,
        golsPro: totalGolsPro,
        golsContra: totalGolsContra,
        saldoGols: saldoGols,
        mediaGols: mediaGols,
        jogadores: jogadores,
        totalJogos: numRodadas,
        rodadasProcessadas: `${estado.rodadaInicio}-${estado.rodadaFim}`,
        detalhePorRodada: detalhePorRodada,
        fonte: "api_cartola",
    };
}

// ===== FORMATAR DADOS DO PARTICIPANTE =====
function formatarDadosParticipante(participante, dados) {
    const numRodadas = estado.rodadaFim - estado.rodadaInicio + 1;
    const mediaGols =
        numRodadas > 0 ? (dados.golsPro / numRodadas).toFixed(2) : "0.00";

    return {
        timeId: participante.timeId,
        nomeCartoleiro: participante.nome,
        nomeTime: participante.nomeTime,
        escudo: participante.escudo,
        golsPro: dados.golsPro || 0,
        golsContra: dados.golsContra || 0,
        saldoGols: (dados.golsPro || 0) - (dados.golsContra || 0),
        mediaGols: mediaGols,
        jogadores: dados.jogadores || [],
        totalJogos: numRodadas,
        rodadasProcessadas: `${estado.rodadaInicio}-${estado.rodadaFim}`,
        detalhePorRodada: dados.detalhePorRodada || [],
        fonte: "backend",
    };
}

// ===== CALCULAR RANKING =====
function calcularRanking(dados) {
    return dados
        .sort((a, b) => {
            // 1º critério: saldo de gols
            if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
            // 2º critério: gols pró
            if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
            // 3º critério: alfabético
            return a.nomeCartoleiro.localeCompare(b.nomeCartoleiro);
        })
        .map((item, index) => ({ ...item, posicao: index + 1 }));
}

// ===== INTERFACE =====
function mostrarProgresso(atual, total, mensagem) {
    const container = obterContainer();
    if (!container) return;

    const porcentagem = total > 0 ? Math.round((atual / total) * 100) : 0;

    container.innerHTML = `
        ${renderizarControles()}

        <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="width: 60px; height: 60px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>

            <h3 style="color: #007bff; margin-bottom: 10px;">🏆 Processando Artilheiro Campeão</h3>
            <p style="color: #6c757d; margin-bottom: 20px;">Rodadas ${estado.rodadaInicio} a ${estado.rodadaFim}</p>

            <div style="max-width: 400px; margin: 0 auto 15px;">
                <div style="background: #e9ecef; border-radius: 20px; height: 24px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #007bff, #0056b3); height: 100%; width: ${porcentagem}%; transition: width 0.3s ease; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8rem;">
                        ${porcentagem}%
                    </div>
                </div>
            </div>

            <p style="color: #495057; font-weight: 500; margin-bottom: 5px;">${mensagem}</p>
            <p style="color: #6c757d; font-size: 0.9rem;">${atual} de ${total} processados</p>
        </div>
    `;
}

function mostrarErro(mensagem, detalhes = "") {
    const container = obterContainer();
    if (!container) return;

    container.innerHTML = `
        ${renderizarControles()}

        <div style="text-align: center; padding: 40px; background: #f8d7da; border-radius: 8px; color: #721c24; margin-top: 20px;">
            <h3>❌ Erro no Processamento</h3>
            <p style="margin-bottom: 15px;">${mensagem}</p>
            ${detalhes ? `<details style="margin-bottom: 15px;"><summary>Detalhes</summary><pre style="text-align: left; background: #fff; padding: 10px; border-radius: 4px; margin-top: 10px;">${detalhes}</pre></details>` : ""}
            <button onclick="atualizarInterface()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔄 Voltar aos Controles
            </button>
        </div>
    `;
}

function renderizarTabela() {
    if (!estado.dados || estado.dados.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; background: #fff3cd; border-radius: 8px; color: #856404; margin-top: 20px;">
                <h3>📊 Nenhum Dado Processado</h3>
                <p>Use os controles acima para processar os dados do artilheiro campeão.</p>
                <p><strong>Recomendação:</strong> Processar da rodada 1 até ${estado.rodadaAtual - 1}</p>
            </div>
        `;
    }

    const totalGolsPro = estado.dados.reduce((s, p) => s + p.golsPro, 0);
    const totalGolsContra = estado.dados.reduce((s, p) => s + p.golsContra, 0);
    const totalSaldo = totalGolsPro - totalGolsContra;

    return `
        <!-- ESTATÍSTICAS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
            <div style="background: linear-gradient(135deg, #e8f5e8, #c8e6c9); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${totalGolsPro}</div>
                <div style="font-size: 0.9rem; color: #424242;">⚽ Total Gols Pró</div>
            </div>
            <div style="background: linear-gradient(135deg, #ffebee, #ffcdd2); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #d32f2f;">${totalGolsContra}</div>
                <div style="font-size: 0.9rem; color: #424242;">🔴 Total Gols Contra</div>
            </div>
            <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: ${totalSaldo >= 0 ? "#1976d2" : "#d32f2f"};">
                    ${totalSaldo >= 0 ? "+" : ""}${totalSaldo}
                </div>
                <div style="font-size: 0.9rem; color: #424242;">📊 Saldo Total</div>
            </div>
            <div style="background: linear-gradient(135deg, #fff3e0, #ffcc80); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">${estado.dados.length}</div>
                <div style="font-size: 0.9rem; color: #424242;">👥 Participantes</div>
            </div>
        </div>

        <!-- TABELA -->
        <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #343a40; color: white;">
                    <tr>
                        <th style="padding: 12px 8px; text-align: center;">Pos</th>
                        <th style="padding: 12px 8px; text-align: left;">Cartoleiro / Time</th>
                        <th style="padding: 12px 8px; text-align: center;">⚽ GP</th>
                        <th style="padding: 12px 8px; text-align: center;">🔴 GC</th>
                        <th style="padding: 12px 8px; text-align: center;">📊 SG</th>
                        <th style="padding: 12px 8px; text-align: center;">📈 Média</th>
                        <th style="padding: 12px 8px; text-align: center;">🎯 Rodadas</th>
                        <th style="padding: 12px 8px; text-align: center;">👁️</th>
                    </tr>
                </thead>
                <tbody>
                    ${estado.dados
                        .map(
                            (p, i) => `
                        <tr style="border-bottom: 1px solid #eee; ${i === 0 ? "background: linear-gradient(135deg, #fff3e0, #ffe0b2); font-weight: 600;" : i === estado.dados.length - 1 ? "background: linear-gradient(135deg, #ffebee, #ffcdd2);" : ""}" onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='${i === 0 ? "#fff3e0" : i === estado.dados.length - 1 ? "#ffebee" : "white"}'">
                            <td style="padding: 10px 8px; text-align: center;">
                                ${
                                    i === 0
                                        ? '<span style="background: #ffd700; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">🏆 ARTILHEIRO</span>'
                                        : i === estado.dados.length - 1
                                          ? '<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">📉 ÚLTIMO</span>'
                                          : `${i + 1}º`
                                }
                            </td>
                            <td style="padding: 10px 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${p.escudo ? `<img src="${p.escudo}" alt="Escudo" style="width: 20px; height: 20px; border-radius: 50%;" onerror="this.style.display='none'">` : ""}
                                    <div>
                                        <div style="font-weight: 500; color: #2c3e50;">${p.nomeCartoleiro}</div>
                                        <div style="font-size: 0.8rem; color: #6c757d;">${p.nomeTime}</div>
                                        ${p.fonte ? `<div style="font-size: 0.7rem; color: #007bff;">📡 ${p.fonte === "api_cartola" ? "API Cartola" : "Backend"}</div>` : ""}
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 10px 8px; text-align: center;">
                                <span style="font-weight: 600; color: #28a745; background: #e8f5e8; padding: 4px 8px; border-radius: 12px; font-size: 0.9rem;">${p.golsPro}</span>
                            </td>
                            <td style="padding: 10px 8px; text-align: center;">
                                <span style="font-weight: 600; color: #dc3545; background: #ffebee; padding: 4px 8px; border-radius: 12px; font-size: 0.9rem;">${p.golsContra}</span>
                            </td>
                            <td style="padding: 10px 8px; text-align: center;">
                                <span style="font-weight: 600; color: ${p.saldoGols >= 0 ? "#28a745" : "#dc3545"}; background: ${p.saldoGols >= 0 ? "#e8f5e8" : "#ffebee"}; padding: 4px 8px; border-radius: 12px; font-size: 0.9rem;">
                                    ${p.saldoGols >= 0 ? "+" : ""}${p.saldoGols}
                                </span>
                            </td>
                            <td style="padding: 10px 8px; text-align: center; color: #6c757d; font-weight: 500;">${p.mediaGols}</td>
                            <td style="padding: 10px 8px; text-align: center; color: #6c757d; font-size: 0.9rem;">${p.rodadasProcessadas || `${estado.rodadaInicio}-${estado.rodadaFim}`}</td>
                            <td style="padding: 10px 8px; text-align: center;">
                                <button onclick="mostrarDetalhes(${i})" style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Detalhes</button>
                            </td>
                        </tr>
                    `,
                        )
                        .join("")}
                </tbody>
            </table>
        </div>

        <!-- FOOTER -->
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap; font-size: 0.9rem; color: #155724;">
                <span><strong>📊 Rodadas processadas: ${estado.rodadaInicio} a ${estado.rodadaFim}</strong></span>
                <span>•</span>
                <span>🔄 Processado em: ${new Date().toLocaleString("pt-BR")}</span>
                <span>•</span>
                <span>🏆 Liga Sobral 2025</span>
            </div>
        </div>
    `;
}

// ===== FUNÇÃO AUXILIAR PARA OBTER CONTAINER =====
function obterContainer() {
    const containers = ["artilheiro-container", "artilheiro-campeao-content"];

    for (const containerId of containers) {
        const container = document.getElementById(containerId);
        if (container) {
            return container;
        }
    }

    console.error("❌ Nenhum container encontrado para artilheiro");
    return null;
}

function atualizarInterface() {
    const container = obterContainer();
    if (!container) return;

    container.style.display = "block";

    container.innerHTML = `
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
            <div>
                <h2 style="margin: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px;">
                    🏆 Artilheiro Campeão
                    <span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">DADOS REAIS</span>
                </h2>
                <p style="margin: 5px 0 0 0; color: #6c757d;">Liga Sobral 2025 - Processamento Inteligente de Rodadas</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="exportarDados()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">📤 Exportar</button>
                <button onclick="atualizarInterface()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Atualizar</button>
            </div>
        </div>

        <!-- CONTROLES -->
        ${renderizarControles()}

        <!-- TABELA OU MENSAGEM -->
        ${renderizarTabela()}
    `;

    console.log("✅ Interface atualizada");
}

// ===== DETALHES DO PARTICIPANTE =====
function mostrarDetalhes(index) {
    const p = estado.dados[index];
    if (!p) return;

    const modal = document.createElement("div");
    modal.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: center; align-items: center; overflow-y: auto; padding: 20px;";

    const rodadasHtml =
        p.detalhePorRodada && p.detalhePorRodada.length > 0
            ? p.detalhePorRodada
                  .map((r) => {
                      const corFundo =
                          r.saldo > 0
                              ? "#d4edda"
                              : r.saldo < 0
                                ? "#f8d7da"
                                : "#e2e3e5";
                      return `<div style="display: inline-block; margin: 3px; padding: 6px 10px; background: ${corFundo}; border-radius: 6px; font-size: 0.85rem;"><strong>R${r.rodada}:</strong> ${r.golsPro}${r.golsContra > 0 ? ` (-${r.golsContra})` : ""} = ${r.saldo >= 0 ? "+" : ""}${r.saldo}</div>`;
                  })
                  .join("")
            : '<p style="color: #6c757d; margin: 0;">Dados de rodada não disponíveis</p>';

    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 2px solid #f8f9fa; background: linear-gradient(135deg, #28a745, #20c997); color: white;">
                <h3 style="margin: 0;">🏆 ${p.nomeCartoleiro}</h3>
                <button onclick="this.closest('div').parentElement.remove()" style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 1.2rem;">×</button>
            </div>

            <div style="padding: 20px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    ${p.escudo ? `<img src="${p.escudo}" alt="Escudo" style="width: 50px; height: 50px; border-radius: 50%;">` : `<div style="width: 50px; height: 50px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👤</div>`}
                    <div>
                        <div style="font-weight: 600; font-size: 1.2rem; color: #2c3e50;">${p.nomeCartoleiro}</div>
                        <div style="color: #6c757d;">${p.nomeTime}</div>
                        <div style="font-size: 0.9rem; color: #28a745;"><strong>Posição:</strong> ${p.posicao}º lugar</div>
                        <div style="font-size: 0.9rem; color: #007bff;"><strong>Rodadas:</strong> ${p.rodadasProcessadas || `${estado.rodadaInicio}-${estado.rodadaFim}`}</div>
                        ${p.fonte ? `<div style="font-size: 0.8rem; color: #6c757d;"><strong>Fonte:</strong> ${p.fonte === "api_cartola" ? "API Cartola FC" : "Backend"}</div>` : ""}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${p.golsPro}</div>
                        <div style="font-size: 0.8rem;">⚽ Gols Pró</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f8e8e8; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #dc3545;">${p.golsContra}</div>
                        <div style="font-size: 0.8rem;">🔴 Gols Contra</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${p.saldoGols >= 0 ? "#1976d2" : "#d32f2f"};">${p.saldoGols >= 0 ? "+" : ""}${p.saldoGols}</div>
                        <div style="font-size: 0.8rem;">📊 Saldo</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fff3e0; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">${p.mediaGols}</div>
                        <div style="font-size: 0.8rem;">📈 Média</div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">📅 Desempenho por Rodada:</h4>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fafafa;">
                        ${rodadasHtml}
                    </div>
                </div>

                ${
                    p.jogadores && p.jogadores.length > 0
                        ? `
                    <div>
                        <h4 style="margin-bottom: 15px; color: #2c3e50;">⚽ Top Artilheiros do Time:</h4>
                        <div style="border: 1px solid #ddd; border-radius: 8px; background: white;">
                            <div style="padding: 15px;">
                                ${p.jogadores
                                    .map(
                                        (j, idx) => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; ${idx === 0 ? "font-weight: 600; background: #fff3e0; margin: -8px -15px 8px -15px; padding: 12px 15px;" : ""}">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            ${idx === 0 ? '<span style="background: #ffd700; color: #333; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem;">👑</span>' : `<span style="color: #6c757d;">${idx + 1}º</span>`}
                                            <span>${j.nome}</span>
                                        </div>
                                        <span style="font-weight: bold; color: #28a745; background: #e8f5e8; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">
                                            ${j.gols} gol${j.gols !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                `,
                                    )
                                    .join("")}
                            </div>
                        </div>
                    </div>
                `
                        : ""
                }

                ${
                    p.erro
                        ? `
                    <div style="margin-top: 15px; padding: 12px; background: #f8d7da; border-radius: 4px; border-left: 3px solid #dc3545; color: #721c24;">
                        <strong>⚠️ Erro no processamento:</strong> ${p.erro}
                    </div>
                `
                        : ""
                }
            </div>

            <div style="padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center;">
                <button onclick="this.closest('div').parentElement.remove()" style="padding: 10px 30px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ===== EXPORTAÇÃO =====
function exportarDados() {
    if (!estado.dados || estado.dados.length === 0) {
        alert(
            "📊 Nenhum dado para exportar! Use o botão 'Popular Gols' primeiro.",
        );
        return;
    }

    const csvContent = [
        [
            "Posição",
            "Cartoleiro",
            "Time",
            "Gols Pró",
            "Gols Contra",
            "Saldo",
            "Média",
            "Rodadas Processadas",
            "Fonte",
        ],
        ...estado.dados.map((p) => [
            p.posicao,
            p.nomeCartoleiro,
            p.nomeTime,
            p.golsPro,
            p.golsContra,
            p.saldoGols,
            p.mediaGols,
            p.rodadasProcessadas ||
                `${estado.rodadaInicio}-${estado.rodadaFim}`,
            p.fonte || "backend",
        ]),
    ]
        .map((row) => row.join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artilheiro_campeao_r${estado.rodadaInicio}-${estado.rodadaFim}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    console.log("✅ Exportação concluída!");
}

// ===== INICIALIZAÇÃO =====
async function inicializar() {
    console.log("🚀 Inicializando sistema com controle manual...");

    // Tentar obter rodada atual do sistema
    try {
        const response = await fetch("/api/configuracao/rodada-atual");
        if (response.ok) {
            const data = await response.json();
            if (data.rodadaAtual) {
                estado.rodadaAtual = data.rodadaAtual;
                estado.rodadaFim = Math.max(1, estado.rodadaAtual - 1);
            }
        }
    } catch (error) {
        console.warn(
            "⚠️ Não foi possível obter rodada atual do sistema:",
            error,
        );
    }

    atualizarInterface();
}

// ===== FUNÇÃO PRINCIPAL =====
async function inicializarArtilheiroCampeao() {
    console.log("🚀 [ARTILHEIRO-CAMPEAO] Inicializando com dados reais...");

    const container = obterContainer();
    if (!container) {
        console.error("❌ Container não encontrado!");
        return;
    }

    // Esconder loading anterior
    const loadingContainer = document.getElementById("artilheiro-loading");
    if (loadingContainer) {
        loadingContainer.style.display = "none";
    }

    await inicializar();

    console.log(
        "✅ [ARTILHEIRO-CAMPEAO] Sistema com dados reais inicializado!",
    );
}

// ===== DISPONIBILIZAR GLOBALMENTE =====
if (typeof window !== "undefined") {
    window.inicializarArtilheiroCampeao = inicializarArtilheiroCampeao;
    window.popularGols = popularGols;
    window.atualizarRodadaAtual = atualizarRodadaAtual;
    window.atualizarRodadaInicio = atualizarRodadaInicio;
    window.atualizarRodadaFim = atualizarRodadaFim;
    window.definirRodadasRapido = definirRodadasRapido;
    window.limparDados = limparDados;
    window.mostrarDetalhes = mostrarDetalhes;
    window.exportarDados = exportarDados;
    window.atualizarInterface = atualizarInterface;
}

console.log(
    "✅ [ARTILHEIRO-CAMPEAO] Sistema com extração de dados reais carregado!",
);

// ========================================
// SISTEMA DE REGISTRO COMPATÍVEL
// ========================================

(function registroCompativel() {
    console.log(
        "🔧 [ARTILHEIRO-CAMPEAO] Sistema de registro compatível iniciado...",
    );

    // Função principal sempre disponível globalmente
    window.inicializarArtilheiroCampeao = inicializarArtilheiroCampeao;
    window.ativarArtilheiroCampeao = inicializarArtilheiroCampeao;
    window.forcarInicializacaoArtilheiro = inicializarArtilheiroCampeao;

    // Registra no sistema de módulos se existir
    function tentarRegistrarModulo() {
        if (window.modulosCarregados) {
            window.modulosCarregados["artilheiro-campeao"] = {
                inicializarArtilheiroCampeao: inicializarArtilheiroCampeao,
            };
            console.log(
                "✅ [ARTILHEIRO-CAMPEAO] Registrado em window.modulosCarregados",
            );
            return true;
        }
        return false;
    }

    // Tenta registrar imediatamente
    tentarRegistrarModulo();

    // Tenta novamente a cada 500ms por até 5 segundos
    let tentativas = 0;
    const maxTentativas = 10;

    const intervalId = setInterval(() => {
        tentativas++;

        if (tentarRegistrarModulo() || tentativas >= maxTentativas) {
            clearInterval(intervalId);

            if (tentativas >= maxTentativas) {
                console.warn(
                    "⚠️ [ARTILHEIRO-CAMPEAO] Sistema de módulos não encontrado",
                );
            }
        }
    }, 500);

    // Função de emergência que verifica o container correto
    window.forcarArtilheiroCampeaoAgora = function () {
        console.log("🚨 [ARTILHEIRO-CAMPEAO] Forçando inicialização...");

        // Tenta diferentes containers possíveis
        const containers = [
            "artilheiro-campeao-content",
            "artilheiro-container",
            "artilheiro-campeao",
        ];

        let containerEncontrado = null;

        for (const containerId of containers) {
            const container = document.getElementById(containerId);
            if (container) {
                containerEncontrado = container;
                console.log(`✅ Container encontrado: ${containerId}`);
                break;
            }
        }

        if (!containerEncontrado) {
            console.error("❌ Nenhum container encontrado");

            // Tenta criar um container se estiver na aba certa
            const tabContent = document.getElementById("artilheiro-campeao");
            if (tabContent) {
                const novoContainer = document.createElement("div");
                novoContainer.id = "artilheiro-campeao-content";
                tabContent.innerHTML = "";
                tabContent.appendChild(novoContainer);
                containerEncontrado = novoContainer;
                console.log("✅ Container criado: artilheiro-campeao-content");

                // Agora cria o container que o código espera
                const artilheiroContainer = document.createElement("div");
                artilheiroContainer.id = "artilheiro-container";
                novoContainer.appendChild(artilheiroContainer);
                console.log("✅ Container artilheiro-container criado também");
            }
        }

        if (containerEncontrado) {
            try {
                // Limpa loading se existir
                const loading = document.getElementById("artilheiro-loading");
                if (loading) {
                    loading.style.display = "none";
                }

                inicializarArtilheiroCampeao();
                console.log(
                    "✅ [ARTILHEIRO-CAMPEAO] Inicialização forçada bem-sucedida",
                );
                return true;
            } catch (error) {
                console.error("❌ Erro na inicialização:", error);
                return false;
            }
        }

        return false;
    };

    console.log("✅ [ARTILHEIRO-CAMPEAO] Sistema de registro compatível ativo");
    console.log("🆘 Para forçar: window.forcarArtilheiroCampeaoAgora()");
})();

console.log("🆘 Em caso de erro: window.forcarArtilheiroCampeaoAgora()");

export { inicializarArtilheiroCampeao };

// Também disponibiliza via export default
export default inicializarArtilheiroCampeao;

console.log("📤 [ARTILHEIRO-CAMPEAO] Exportações ES6 adicionadas para compatibilidade");