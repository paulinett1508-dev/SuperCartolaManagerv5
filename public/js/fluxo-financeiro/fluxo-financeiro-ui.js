// FLUXO-FINANCEIRO-UI.JS - Interface UX Elevada
console.log(
    "💰 [FLUXO-FINANCEIRO-UI] Módulo de interface UX elevada carregando...",
);

class FluxoFinanceiroUI {
    constructor() {
        this.version = "2.0.0";
        this.selectedParticipant = null;
        console.log("[FLUXO-FINANCEIRO-UI] ✅ Instância UX elevada criada");
    }

    /**
     * Renderiza loading moderno com animação
     */
    renderizarLoadingComProgresso(titulo, subtitulo) {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <h3>${titulo}</h3>
                <p>${subtitulo}</p>
                <div class="loading-progress">
                    <div id="loading-progress-bar" class="loading-progress-bar"></div>
                </div>
                <p class="loading-subtitle">Processando dados financeiros...</p>
            </div>
        `;

        // Animar barra de progresso
        setTimeout(() => {
            const bar = document.getElementById("loading-progress-bar");
            if (bar) {
                bar.style.width = "30%";
                setTimeout(() => (bar.style.width = "70%"), 500);
                setTimeout(() => (bar.style.width = "100%"), 1000);
            }
        }, 100);
    }

    /**
     * Renderiza loading simples
     */
    renderizarLoading(mensagem = "Carregando...") {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${mensagem}</p>
            </div>
        `;
    }

    /**
     * Limpa containers
     */
    limparContainers() {
        const containers = [
            "fluxoFinanceiroButtons",
            "fluxoFinanceiroExportBtnContainer",
        ];
        containers.forEach((id) => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = "";
        });
    }

    /**
     * Renderiza interface principal melhorada
     */
    async renderizarInterface() {
        console.log(
            "[FLUXO-FINANCEIRO-UI] 🎨 Renderizando interface UX elevada...",
        );

        if (!window.fluxoFinanceiroCache) {
            console.error("[FLUXO-FINANCEIRO-UI] Cache não inicializado");
            return;
        }

        const participantes = window.fluxoFinanceiroCache.getParticipantes();

        if (!participantes || participantes.length === 0) {
            this.mostrarErro(
                "Nenhum participante encontrado para gerar o fluxo financeiro.",
            );
            return;
        }

        // Renderizar grid de participantes melhorado
        this.renderizarGridParticipantes(participantes);

        // Renderizar estado inicial elegante
        this.renderizarEstadoInicial();
    }

    /**
     * Renderiza botões dos participantes (compatibilidade)
     */
    renderizarBotoesParticipantes(participantes) {
        this.renderizarGridParticipantes(participantes);
    }

    /**
     * Renderiza grid de participantes com UX elevada
     */
    renderizarGridParticipantes(participantes) {
        const container = document.getElementById("fluxoFinanceiroButtons");
        if (!container) return;

        // Calcular estatísticas rápidas para preview
        const stats = this._calcularStatsRapidas(participantes);

        container.innerHTML = `
            <div class="participantes-header">
                <h3>👥 Participantes da Liga</h3>
                <div class="liga-stats">
                    <span class="stat-item">
                        <strong>${participantes.length}</strong> participantes
                    </span>
                    <span class="stat-item">
                        <strong>${stats.rodadasProcessadas}</strong> rodadas
                    </span>
                </div>
            </div>
            <div class="participantes-grid">
                ${participantes.map((participante) => this._renderizarCardParticipante(participante)).join("")}
            </div>
        `;
    }

    /**
     * Renderiza card individual do participante
     */
    _renderizarCardParticipante(participante) {
        const timeId = participante.time_id || participante.id;
        const nome =
            participante.nome_cartola ||
            participante.nome_cartoleiro ||
            participante.nome;
        const time = participante.nome_time || "Time";
        const escudo = participante.url_escudo_png || participante.escudo_url;

        // Simular saldo para preview (será calculado real posteriormente)
        const saldoPreview = this._calcularSaldoPreview(participante);

        return `
            <div class="participante-card" 
                 data-time-id="${timeId}"
                 onclick="this.classList.add('loading'); window.calcularEExibirExtrato && window.calcularEExibirExtrato('${timeId}')">

                <div class="participante-header">
                    <div class="participante-avatar">
                        ${
                            escudo
                                ? `<img src="${escudo}" alt="${nome}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div style="display:none; width:100%; height:100%; background: var(--laranja); border-radius:50%; align-items:center; justify-content:center; color:white; font-weight:700;">
                                ${nome.charAt(0).toUpperCase()}
                             </div>`
                                : `<div>${nome.charAt(0).toUpperCase()}</div>`
                        }
                    </div>
                    <div class="participante-info">
                        <h4 class="participante-nome">${nome}</h4>
                        <p class="participante-time">${time}</p>
                    </div>
                </div>

                <div class="participante-stats">
                    <div class="participante-saldo ${saldoPreview >= 0 ? "positivo" : "negativo"}">
                        ${saldoPreview >= 0 ? "+" : ""}R$ ${Math.abs(saldoPreview).toFixed(0)}
                    </div>
                    <div class="participante-badge ativo">
                        Ativo
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Calcula saldo preview (simulação)
     */
    _calcularSaldoPreview(participante) {
        // Simulação básica baseada em posição média hipotética
        return Math.floor(Math.random() * 200 - 100); // -100 a +100
    }

    /**
     * Calcula stats rápidas
     */
    _calcularStatsRapidas(participantes) {
        return {
            totalParticipantes: participantes.length,
            rodadasProcessadas:
                window.fluxoFinanceiroCache?.getUltimaRodadaCompleta() || 0,
        };
    }

    /**
     * Renderiza estado inicial elegante
     */
    renderizarEstadoInicial() {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="estado-inicial">
                <div class="estado-inicial-icon">💰</div>
                <h3 class="estado-inicial-titulo">Fluxo Financeiro da Liga</h3>
                <p class="estado-inicial-subtitulo">
                    Visualize o extrato financeiro completo de cada participante com detalhamento por rodada.
                </p>
                <div class="estado-inicial-features">
                    <div class="feature-item">
                        <span class="feature-icon">📊</span>
                        <span>Resumo por categoria</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">📈</span>
                        <span>Evolução do saldo</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🏆</span>
                        <span>Performance detalhada</span>
                    </div>
                </div>
                <p class="estado-inicial-acao">
                    Clique em um participante acima para começar
                </p>
            </div>
        `;
    }

    /**
     * Renderiza extrato financeiro com UX elevada
     */
    renderizarExtratoFinanceiro(extrato, participante, callback) {
        console.log(
            "[FLUXO-FINANCEIRO-UI] 📊 Renderizando extrato UX elevado...",
        );

        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        // Marcar participante ativo
        this._marcarParticipanteAtivo(participante.time_id || participante.id);

        const formatarMoeda = (valor) => {
            const valorNum = typeof valor === "number" ? valor : 0;
            const sinal = valorNum >= 0 ? "+" : "";
            return `${sinal}R$ ${Math.abs(valorNum).toFixed(2).replace(".", ",")}`;
        };

        const isSuperCartola =
            extrato.resumo.pontosCorridos !== undefined &&
            extrato.resumo.pontosCorridos !== 0;
        const escudo = participante.url_escudo_png || participante.escudo_url;
        const nome =
            participante.nome_cartola ||
            participante.nome_cartoleiro ||
            "Participante";
        const time = participante.nome_time || "Time";

        container.innerHTML = `
            <div class="extrato-container">
                <!-- HEADER PARTICIPANTE -->
                <div class="extrato-header">
                    <div class="extrato-participante-info">
                        <div class="extrato-avatar">
                            ${
                                escudo
                                    ? `<img src="${escudo}" alt="${nome}">`
                                    : `<div class="avatar-placeholder">${nome.charAt(0).toUpperCase()}</div>`
                            }
                        </div>
                        <div class="extrato-dados">
                            <h2 class="extrato-titulo">💰 Extrato Financeiro</h2>
                            <h3 class="extrato-participante">${nome}</h3>
                            <p class="extrato-info">${time} • ${extrato.rodadas.length} rodadas processadas</p>
                        </div>
                    </div>
                </div>

                <!-- SALDO FINAL HERO -->
                <div class="saldo-final-card ${extrato.resumo.saldo >= 0 ? "saldo-final-positivo" : "saldo-final-negativo"}">
                    <h3 class="saldo-final-titulo">Saldo Final</h3>
                    <div class="saldo-final-valor">${formatarMoeda(extrato.resumo.saldo)}</div>
                    <div class="saldo-performance">
                        ${this._gerarIndicadorPerformance(extrato.resumo)}
                    </div>
                </div>

                <!-- RESUMO INTELIGENTE -->
                <div class="resumo-container">
                    <h3 class="resumo-titulo-principal">📊 Resumo Financeiro</h3>
                    <div class="resumo-grid">
                        ${this._renderizarCardResumo("💎 Bônus Total", extrato.resumo.bonus, "bonus")}
                        ${this._renderizarCardResumo("💸 Ônus Total", extrato.resumo.onus, "onus")}

                        ${
                            isSuperCartola
                                ? `
                            ${this._renderizarCardResumo("⚽ Pontos Corridos", extrato.resumo.pontosCorridos, "pontos-corridos")}
                            ${this._renderizarCardResumo("🏆 Mata-Mata", extrato.resumo.mataMata, "mata-mata")}
                        `
                                : ""
                        }

                        ${this._renderizarCardResumo("🔥 Vezes MITO", extrato.resumo.vezesMito, "estatisticas-mito", true)}
                        ${this._renderizarCardResumo("💔 Vezes MICO", extrato.resumo.vezesMico, "estatisticas-mico", true)}
                    </div>
                </div>

                <!-- EVOLUÇÃO DO SALDO -->
                <div class="evolucao-container">
                    <h3 class="evolucao-titulo">📈 Evolução do Saldo</h3>
                    <div class="evolucao-grafico">
                        ${this._renderizarGraficoEvolucao(extrato.rodadas)}
                    </div>
                </div>

                <!-- DETALHAMENTO APRIMORADO -->
                <div class="detalhamento-container">
                    <div class="detalhamento-header">
                        <h3 class="detalhamento-titulo">📋 Detalhamento por Rodada</h3>
                        <div class="detalhamento-stats">
                            <span class="stat-badge">${extrato.rodadas.length} rodadas</span>
                            <span class="stat-badge">Média: ${this._calcularMediaRodada(extrato.rodadas)}</span>
                        </div>
                    </div>

                    <div class="tabela-wrapper">
                        <table class="detalhamento-tabela">
                            <thead>
                                <tr>
                                    <th>Rod</th>
                                    <th>Pos</th>
                                    <th>Bônus/Ônus</th>
                                    ${isSuperCartola ? "<th>Pt.Corridos</th><th>Mata-Mata</th>" : ""}
                                    <th>Saldo</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this._renderizarLinhasDetalhamento(extrato.rodadas, isSuperCartola)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Marca participante ativo no grid
     */
    _marcarParticipanteAtivo(timeId) {
        // Limpar seleções anteriores
        document
            .querySelectorAll(".participante-card.active")
            .forEach((card) => {
                card.classList.remove("active");
            });

        // Marcar participante atual
        const cardAtivo = document.querySelector(`[data-time-id="${timeId}"]`);
        if (cardAtivo) {
            cardAtivo.classList.add("active");
            this.selectedParticipant = timeId;
        }
    }

    /**
     * Renderiza card de resumo individual
     */
    _renderizarCardResumo(titulo, valor, tipo, isContador = false) {
        const valorFormatado = isContador
            ? String(valor || 0)
            : this._formatarValorResumo(valor);

        return `
            <div class="resumo-card ${tipo}">
                <h4 class="resumo-titulo">${titulo}</h4>
                <p class="resumo-valor">${valorFormatado}</p>
            </div>
        `;
    }

    /**
     * Formatar valor do resumo
     */
    _formatarValorResumo(valor) {
        if (typeof valor !== "number") return "R$ 0,00";
        const sinal = valor >= 0 ? "+" : "";
        return `${sinal}R$ ${Math.abs(valor).toFixed(2).replace(".", ",")}`;
    }

    /**
     * Gera indicador de performance
     */
    _gerarIndicadorPerformance(resumo) {
        const mitos = resumo.vezesMito || 0;
        const micos = resumo.vezesMico || 0;
        const ratio = mitos - micos;

        if (ratio > 2)
            return '<span class="performance-badge excelente">🔥 Excelente</span>';
        if (ratio > 0)
            return '<span class="performance-badge bom">⭐ Bom</span>';
        if (ratio === 0)
            return '<span class="performance-badge regular">📊 Regular</span>';
        return '<span class="performance-badge baixo">📉 Precisa melhorar</span>';
    }

    /**
     * Renderiza gráfico de evolução simples
     */
    _renderizarGraficoEvolucao(rodadas) {
        if (!rodadas.length) return "<p>Sem dados para exibir</p>";

        const maxSaldo = Math.max(
            ...rodadas.map((r) => Math.abs(r.saldo || 0)),
        );
        const escala = 100; // Altura máxima das barras

        return `
            <div class="grafico-evolucao">
                ${rodadas
                    .map((rodada, index) => {
                        const altura =
                            maxSaldo > 0
                                ? (Math.abs(rodada.saldo || 0) / maxSaldo) *
                                  escala
                                : 0;
                        const isPositivo = (rodada.saldo || 0) >= 0;

                        return `
                        <div class="grafico-barra" 
                             title="R${rodada.rodada}: ${this._formatarValorResumo(rodada.saldo)}">
                            <div class="barra ${isPositivo ? "positiva" : "negativa"}" 
                                 style="height: ${altura}px;"></div>
                            <span class="barra-label">R${rodada.rodada}</span>
                        </div>
                    `;
                    })
                    .join("")}
            </div>
        `;
    }

    /**
     * Calcula média por rodada
     */
    _calcularMediaRodada(rodadas) {
        if (!rodadas.length) return "R$ 0,00";
        const total = rodadas.reduce((acc, r) => acc + (r.saldo || 0), 0);
        const media = total / rodadas.length;
        return this._formatarValorResumo(media);
    }

    /**
     * Renderiza linhas do detalhamento aprimorado
     */
    _renderizarLinhasDetalhamento(rodadas, isSuperCartola) {
        if (!rodadas.length) {
            return `
                <tr>
                    <td colspan="${isSuperCartola ? "7" : "5"}" class="sem-dados">
                        📊 Nenhuma rodada processada ainda
                    </td>
                </tr>
            `;
        }

        return rodadas
            .map((rodada, index) => {
                const posicaoStyle = this._obterEstiloPosicao(rodada);
                const trend = this._calcularTrend(rodadas, index);

                return `
                <tr class="rodada-row">
                    <td class="rodada-col">R${rodada.rodada}</td>
                    <td class="posicao-col">
                        <span class="${posicaoStyle.classe}">${posicaoStyle.texto}</span>
                    </td>
                    <td class="valor-col ${this._obterClasseValor(rodada.bonusOnus)}">
                        ${this._formatarValorTabela(rodada.bonusOnus)}
                    </td>
                    ${
                        isSuperCartola
                            ? `
                        <td class="valor-col ${this._obterClasseValor(rodada.pontosCorridos)}">
                            ${this._formatarValorTabela(rodada.pontosCorridos)}
                        </td>
                        <td class="valor-col ${this._obterClasseValor(rodada.mataMata)}">
                            ${this._formatarValorTabela(rodada.mataMata)}
                        </td>
                    `
                            : ""
                    }
                    <td class="saldo-col ${this._obterClasseValor(rodada.saldo)}">
                        ${this._formatarValorTabela(rodada.saldo)}
                    </td>
                    <td class="trend-col">
                        ${trend}
                    </td>
                </tr>
            `;
            })
            .join("");
    }

    /**
     * Calcula trend da rodada
     */
    _calcularTrend(rodadas, index) {
        if (index === 0) return '<span class="trend-neutro">—</span>';

        const atual = rodadas[index].saldo || 0;
        const anterior = rodadas[index - 1].saldo || 0;
        const diff = atual - anterior;

        if (diff > 0) return '<span class="trend-positivo">📈</span>';
        if (diff < 0) return '<span class="trend-negativo">📉</span>';
        return '<span class="trend-neutro">➡️</span>';
    }

    /**
     * Obter estilo da posição aprimorado
     */
    _obterEstiloPosicao(rodada) {
        if (rodada.isMito) {
            return {
                texto: "MITO",
                classe: "pos-mito",
            };
        }

        if (rodada.isMico) {
            return {
                texto: "MICO",
                classe: "pos-mico",
            };
        }

        if (rodada.posicao) {
            const pos = rodada.posicao;
            if (pos >= 1 && pos <= 11) {
                return {
                    texto: `${pos}°`,
                    classe: "pos-g",
                };
            }
            if (pos >= 22 && pos <= 32) {
                return {
                    texto: `${pos}°`,
                    classe: "pos-z",
                };
            }
            return {
                texto: `${pos}°`,
                classe: "pos-normal",
            };
        }

        return {
            texto: "-",
            classe: "pos-sem-dados",
        };
    }

    /**
     * Obter classe CSS do valor
     */
    _obterClasseValor(valor) {
        if (typeof valor !== "number") return "valor-neutro";
        if (valor > 0) return "valor-positivo";
        if (valor < 0) return "valor-negativo";
        return "valor-neutro";
    }

    /**
     * Formatar valor da tabela
     */
    _formatarValorTabela(valor) {
        if (typeof valor !== "number" || valor === 0) return "—";
        const valorFormatado = `R$ ${Math.abs(valor).toFixed(2).replace(".", ",")}`;
        return valor >= 0 ? `+${valorFormatado}` : `${valorFormatado}`;
    }

    /**
     * Renderiza botão de exportação moderno
     */
    renderizarBotaoExportacao(callback) {
        const container = document.getElementById(
            "fluxoFinanceiroExportBtnContainer",
        );
        if (!container) return;

        container.innerHTML = `
            <div class="export-container">
                <button class="btn-export" onclick="(${callback.toString()})()">
                    <span class="export-icon">📥</span>
                    Exportar Extrato Completo
                </button>
            </div>
        `;
    }

    /**
     * Mostra erro elegante
     */
    mostrarErro(mensagem) {
        const container = document.getElementById("fluxoFinanceiroContent");
        if (!container) return;

        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <h3>Ops! Algo deu errado</h3>
                <p>${mensagem}</p>
                <button class="retry-button" onclick="window.location.reload()">
                    🔄 Tentar novamente
                </button>
            </div>
        `;
    }

    /**
     * Renderiza dados do participante (compatibilidade)
     */
    renderizarDadosParticipante(participante, dadosFinanceiros) {
        console.log(
            "🎨 [FLUXO-UI] Renderizando dados do participante UX elevado...",
        );

        if (!participante) {
            this.mostrarErro("Participante não encontrado");
            return;
        }

        if (dadosFinanceiros && dadosFinanceiros.extrato) {
            this.renderizarExtratoFinanceiro(
                dadosFinanceiros.extrato,
                participante,
            );
        } else {
            const container = document.getElementById("fluxoFinanceiroContent");
            container.innerHTML = `
                <div class="participante-sem-dados">
                    <div class="sem-dados-icon">📊</div>
                    <h3>Dados Financeiros</h3>
                    <p>Processando informações de <strong>${participante.nome_cartola || participante.nome_cartoleiro}</strong></p>
                    <div class="loading-spinner"></div>
                </div>
            `;
        }
    }

    /**
     * Formatar valor (compatibilidade)
     */
    formatarValor(valor) {
        return this._formatarValorTabela(valor);
    }
}

// Disponibilizar globalmente
if (typeof window !== "undefined") {
    window.FluxoFinanceiroUI = FluxoFinanceiroUI;
}

console.log("✅ [FLUXO-FINANCEIRO-UI] Interface UX elevada carregada!");

export { FluxoFinanceiroUI };
export default FluxoFinanceiroUI;
