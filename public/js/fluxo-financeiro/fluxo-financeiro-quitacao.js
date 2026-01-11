/**
 * Fluxo Financeiro - Quitação de Temporada
 *
 * Gerencia o modal e lógica de quitação de temporada,
 * permitindo ao admin definir legado para próxima temporada.
 *
 * @version 1.2.0
 * @since 2026-01-10
 *
 * Changelog:
 * - v1.2.0 (2026-01-11): Sincronização com renovação - exibe crédito comprometido e saldo remanescente
 * - v1.1.0 (2026-01-10): Alertas de integração com modal de Renovação
 * - v1.0.0 (2026-01-10): Versão inicial
 */

// =============================================================================
// VARIÁVEIS GLOBAIS
// =============================================================================

let quitacaoAtual = {
    ligaId: null,
    timeId: null,
    temporada: null,
    saldoOriginal: 0,
    nomeParticipante: ''
};

// =============================================================================
// FUNÇÕES DE API
// =============================================================================

/**
 * Busca dados do participante para o modal de quitação
 */
async function buscarDadosQuitacao(ligaId, timeId, temporada) {
    try {
        const response = await fetch(`/api/quitacao/${ligaId}/${timeId}/dados?temporada=${temporada}`, {
            credentials: 'include' // Enviar cookies de sessão
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro ao buscar dados');
        }

        return data.dados;
    } catch (error) {
        console.error('[QUITACAO] Erro ao buscar dados:', error);
        throw error;
    }
}

/**
 * Envia requisição de quitação
 */
async function enviarQuitacao(ligaId, timeId, payload) {
    try {
        const response = await fetch(`/api/quitacao/${ligaId}/${timeId}/quitar-temporada`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include' // Enviar cookies de sessão
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro ao processar quitação');
        }

        return data;
    } catch (error) {
        console.error('[QUITACAO] Erro ao enviar quitação:', error);
        throw error;
    }
}

// =============================================================================
// FUNÇÕES DE UI
// =============================================================================

/**
 * Abre o modal de quitação
 * @param {string} ligaId - ID da liga
 * @param {string} timeId - ID do time
 * @param {number} saldoAtual - Saldo atual do participante
 * @param {number} temporada - Temporada a quitar
 * @param {string} nomeParticipante - Nome do participante
 */
window.abrirModalQuitacao = async function(ligaId, timeId, saldoAtual, temporada, nomeParticipante = '') {
    if (!ligaId) {
        alert('Liga não identificada');
        return;
    }

    try {
        // Mostrar loading
        const modal = document.getElementById('modal-quitacao-temporada');
        if (!modal) {
            console.error('[QUITACAO] Modal não encontrado no DOM');
            return;
        }

        modal.classList.add('active');
        document.getElementById('quitacao-loading').style.display = 'block';
        document.getElementById('quitacao-content').style.display = 'none';

        // Buscar dados atualizados
        const dados = await buscarDadosQuitacao(ligaId, timeId, temporada);

        // Armazenar dados da quitação atual
        quitacaoAtual = {
            ligaId,
            timeId,
            temporada,
            saldoOriginal: dados.saldo_final,
            nomeParticipante: dados.nome_cartoleiro
        };

        // Preencher modal
        renderizarModalQuitacao(dados);

        // Esconder loading e mostrar conteúdo
        document.getElementById('quitacao-loading').style.display = 'none';
        document.getElementById('quitacao-content').style.display = 'block';

    } catch (error) {
        alert(`Erro ao carregar dados: ${error.message}`);
        fecharModalQuitacao();
    }
};

/**
 * Fecha o modal de quitação
 */
window.fecharModalQuitacao = function() {
    const modal = document.getElementById('modal-quitacao-temporada');
    if (modal) {
        modal.classList.remove('active');
    }
    quitacaoAtual = { ligaId: null, timeId: null, temporada: null, saldoOriginal: 0, nomeParticipante: '' };
};

/**
 * Renderiza o conteúdo do modal
 */
function renderizarModalQuitacao(dados) {
    const proximaTemporada = dados.temporada + 1;

    // Header
    document.getElementById('quitacao-nome-participante').textContent =
        `${dados.nome_cartoleiro} - ${dados.nome_time}`;
    document.getElementById('quitacao-temporada').textContent = dados.temporada;

    // Detalhes do saldo
    document.getElementById('quitacao-saldo-rodadas').textContent =
        formatarMoeda(dados.detalhes.saldo_rodadas);
    document.getElementById('quitacao-campos-manuais').textContent =
        formatarMoeda(dados.detalhes.campos_manuais);
    document.getElementById('quitacao-acertos').textContent =
        formatarMoeda(dados.detalhes.acertos);
    document.getElementById('quitacao-saldo-final').textContent =
        formatarMoeda(dados.saldo_final);

    // Cor do saldo final
    const saldoFinalEl = document.getElementById('quitacao-saldo-final');
    saldoFinalEl.className = dados.saldo_final >= 0 ? 'valor-positivo' : 'valor-negativo';

    // ✅ v1.2: Mostrar crédito comprometido e saldo remanescente (se aplicável)
    const linhaComprometido = document.getElementById('quitacao-linha-comprometido');
    const linhaRemanescente = document.getElementById('quitacao-linha-remanescente');

    if (dados.credito_comprometido > 0) {
        // Mostrar linhas de comprometimento
        if (linhaComprometido) {
            linhaComprometido.style.display = '';
            document.getElementById('quitacao-credito-comprometido').textContent =
                `- ${formatarMoeda(dados.credito_comprometido)}`;
        }
        if (linhaRemanescente) {
            linhaRemanescente.style.display = '';
            document.getElementById('quitacao-saldo-remanescente').textContent =
                formatarMoeda(dados.saldo_remanescente);
            const remanescenteEl = document.getElementById('quitacao-saldo-remanescente');
            remanescenteEl.className = dados.saldo_remanescente >= 0 ? 'valor-positivo' : 'valor-negativo';
        }

        // ✅ v1.2: Usar saldo REMANESCENTE como valor padrão (não o saldo total)
        document.getElementById('label-integral').textContent =
            `Carregar saldo remanescente (${formatarMoeda(dados.saldo_remanescente)})`;
        document.getElementById('quitacao-valor-customizado').value =
            dados.saldo_remanescente.toFixed(2);

        // Atualizar quitacaoAtual com saldo remanescente
        quitacaoAtual.saldoOriginal = dados.saldo_remanescente;
    } else {
        // Esconder linhas de comprometimento
        if (linhaComprometido) linhaComprometido.style.display = 'none';
        if (linhaRemanescente) linhaRemanescente.style.display = 'none';

        // Atualizar labels das opções com saldo total
        document.getElementById('label-integral').textContent =
            `Carregar saldo integral (${formatarMoeda(dados.saldo_final)})`;
        document.getElementById('quitacao-valor-customizado').value =
            dados.saldo_final.toFixed(2);
    }

    // Atualizar temporada destino nas labels
    document.querySelectorAll('.temporada-destino').forEach(el => {
        el.textContent = proximaTemporada;
    });

    // Limpar observação
    document.getElementById('quitacao-observacao').value = '';

    // Reset radio buttons
    document.getElementById('opcao-zerado').checked = true;
    document.getElementById('quitacao-valor-customizado').disabled = true;

    // ✅ v1.1: Mostrar alertas sobre inscrição na próxima temporada
    renderizarAlertasInscricao(dados.inscricao_proxima_temporada, proximaTemporada, dados.credito_comprometido);
}

/**
 * Renderiza alertas sobre a situação de inscrição na próxima temporada
 * Integração com o modal de Renovação para evitar inconsistências
 * @param {Object} inscricao - Dados da inscrição na próxima temporada
 * @param {number} temporada - Temporada destino (ex: 2026)
 * @param {number} creditoComprometido - Valor já deduzido para próxima temporada
 */
function renderizarAlertasInscricao(inscricao, temporada, creditoComprometido = 0) {
    const container = document.getElementById('quitacao-alertas-inscricao');
    if (!container) return;

    // Limpar alertas anteriores
    container.innerHTML = '';
    container.style.display = 'none';

    if (!inscricao) {
        // Sem inscrição ainda - mostrar info neutra
        container.innerHTML = `
            <div class="alerta-info">
                <span class="material-icons">info</span>
                <p>Participante ainda <strong>não foi renovado</strong> para ${temporada}.
                   O legado definido aqui será usado quando a renovação for processada.</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    let alertas = [];

    // ✅ v1.2: Alerta especial para crédito comprometido
    if (creditoComprometido > 0) {
        alertas.push({
            tipo: 'highlight',
            icone: 'account_balance_wallet',
            texto: `<strong>${formatarMoeda(creditoComprometido)}</strong> do saldo já foi <strong>utilizado</strong> para abater a taxa de inscrição de ${temporada}.
                    O valor remanescente é o que será considerado nesta quitação.`
        });
    }

    // Caso 1: Já renovou e processou
    if (inscricao.ja_renovou && inscricao.processado) {
        alertas.push({
            tipo: 'warning',
            icone: 'sync_alt',
            texto: `Participante já foi <strong>renovado para ${temporada}</strong> via modal de Renovação.
                    O legado definido aqui será <strong>sobrescrito</strong> na inscrição existente.`
        });
    }

    // Caso 2: Já tem legado_manual definido (por renovação anterior)
    if (inscricao.legado_manual_existente) {
        const legadoAnterior = inscricao.legado_manual;
        alertas.push({
            tipo: 'warning',
            icone: 'history',
            texto: `Já existe um <strong>legado manual</strong> definido:
                    ${formatarMoeda(legadoAnterior.valor_definido)}
                    (origem: ${legadoAnterior.origem === 'quitacao_admin' ? 'Quitação' : 'Renovação'}).
                    Esta ação vai <strong>substituir</strong> o valor anterior.`
        });
    }

    // Caso 3: Já pagou inscrição
    if (inscricao.pagou_inscricao) {
        alertas.push({
            tipo: 'success',
            icone: 'paid',
            texto: `Participante já <strong>pagou a inscrição</strong> de ${temporada}
                    (${formatarMoeda(inscricao.taxa_inscricao || 0)}).
                    Não há débito de inscrição no extrato.`
        });
    } else if (inscricao.taxa_inscricao > 0) {
        // Caso 4: Não pagou inscrição
        alertas.push({
            tipo: 'info',
            icone: 'pending',
            texto: `Inscrição ${temporada} <strong>não paga</strong>.
                    Taxa de ${formatarMoeda(inscricao.taxa_inscricao)}
                    será adicionada como débito no extrato ${temporada}.`
        });
    }

    // Renderizar alertas
    if (alertas.length > 0) {
        alertas.forEach(alerta => {
            container.innerHTML += `
                <div class="alerta-${alerta.tipo}">
                    <span class="material-icons">${alerta.icone}</span>
                    <p>${alerta.texto}</p>
                </div>
            `;
        });
        container.style.display = 'block';
    }
}

/**
 * Handler para mudança de opção de quitação
 */
window.onOpcaoQuitacaoChange = function() {
    const opcaoCustomizado = document.getElementById('opcao-customizado').checked;
    document.getElementById('quitacao-valor-customizado').disabled = !opcaoCustomizado;

    if (opcaoCustomizado) {
        document.getElementById('quitacao-valor-customizado').focus();
    }
};

/**
 * Confirma a quitação
 */
window.confirmarQuitacao = async function() {
    const observacao = document.getElementById('quitacao-observacao').value.trim();

    if (observacao.length < 5) {
        alert('Observação é obrigatória (mínimo 5 caracteres)');
        document.getElementById('quitacao-observacao').focus();
        return;
    }

    // Determinar tipo de quitação
    let tipoQuitacao = 'zerado';
    let valorLegado = 0;

    if (document.getElementById('opcao-integral').checked) {
        tipoQuitacao = 'integral';
        valorLegado = quitacaoAtual.saldoOriginal;
    } else if (document.getElementById('opcao-customizado').checked) {
        tipoQuitacao = 'customizado';
        valorLegado = parseFloat(document.getElementById('quitacao-valor-customizado').value) || 0;
    }

    // Confirmação final
    const proximaTemporada = quitacaoAtual.temporada + 1;
    const mensagem = tipoQuitacao === 'zerado'
        ? `Confirmar quitação ZERANDO o saldo?\n\nO participante iniciará ${proximaTemporada} sem pendências de ${quitacaoAtual.temporada}.`
        : `Confirmar quitação com legado de ${formatarMoeda(valorLegado)}?\n\nEste valor será carregado para ${proximaTemporada}.`;

    if (!confirm(mensagem)) {
        return;
    }

    try {
        // Desabilitar botão
        const btnConfirmar = document.querySelector('#modal-quitacao-temporada .btn-confirmar');
        if (btnConfirmar) {
            btnConfirmar.disabled = true;
            btnConfirmar.textContent = 'Processando...';
        }

        const payload = {
            temporada_origem: quitacaoAtual.temporada,
            temporada_destino: quitacaoAtual.temporada + 1,
            saldo_original: quitacaoAtual.saldoOriginal,
            tipo_quitacao: tipoQuitacao,
            valor_legado: valorLegado,
            observacao: observacao
        };

        await enviarQuitacao(quitacaoAtual.ligaId, quitacaoAtual.timeId, payload);

        // Sucesso
        alert(`Temporada ${quitacaoAtual.temporada} quitada com sucesso!`);
        fecharModalQuitacao();

        // Recarregar tabela
        if (typeof window.carregarDadosFluxoFinanceiro === 'function') {
            window.carregarDadosFluxoFinanceiro();
        } else {
            location.reload();
        }

    } catch (error) {
        alert(`Erro ao processar quitação: ${error.message}`);

        // Reabilitar botão
        const btnConfirmar = document.querySelector('#modal-quitacao-temporada .btn-confirmar');
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Confirmar Quitação';
        }
    }
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formata valor para moeda brasileira
 */
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

// =============================================================================
// TEMPLATE DO MODAL
// =============================================================================

/**
 * Injeta o HTML do modal no DOM (chamado no carregamento da página)
 */
function injetarModalQuitacao() {
    // Verificar se já existe
    if (document.getElementById('modal-quitacao-temporada')) {
        return;
    }

    const modalHTML = `
    <div id="modal-quitacao-temporada" class="modal-overlay">
        <div class="modal-container modal-quitacao">
            <div class="modal-header">
                <h2>
                    <span class="material-icons">lock</span>
                    Quitar Temporada <span id="quitacao-temporada">2025</span>
                </h2>
                <button class="btn-close" onclick="fecharModalQuitacao()">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div id="quitacao-loading" class="modal-loading">
                <div class="spinner"></div>
                <p>Carregando dados...</p>
            </div>

            <div id="quitacao-content" class="modal-body" style="display: none;">
                <div class="quitacao-participante">
                    <span class="material-icons">person</span>
                    <span id="quitacao-nome-participante">Participante</span>
                </div>

                <!-- Alertas sobre inscrição na próxima temporada -->
                <div id="quitacao-alertas-inscricao" class="quitacao-alertas" style="display: none;"></div>

                <div class="quitacao-resumo">
                    <h3>Situação atual</h3>
                    <table class="tabela-resumo">
                        <tr>
                            <td>Saldo Rodadas:</td>
                            <td id="quitacao-saldo-rodadas">R$ 0,00</td>
                        </tr>
                        <tr>
                            <td>Campos Manuais:</td>
                            <td id="quitacao-campos-manuais">R$ 0,00</td>
                        </tr>
                        <tr>
                            <td>Acertos:</td>
                            <td id="quitacao-acertos">R$ 0,00</td>
                        </tr>
                        <tr class="linha-total">
                            <td><strong>SALDO FINAL:</strong></td>
                            <td id="quitacao-saldo-final"><strong>R$ 0,00</strong></td>
                        </tr>
                        <tr id="quitacao-linha-comprometido" class="linha-comprometido" style="display: none;">
                            <td>
                                <span class="material-icons" style="font-size: 14px; vertical-align: middle; color: #eab308;">sync_alt</span>
                                Deduzido para 2026:
                            </td>
                            <td id="quitacao-credito-comprometido">- R$ 0,00</td>
                        </tr>
                        <tr id="quitacao-linha-remanescente" class="linha-remanescente" style="display: none;">
                            <td><strong>SALDO REMANESCENTE:</strong></td>
                            <td id="quitacao-saldo-remanescente"><strong>R$ 0,00</strong></td>
                        </tr>
                    </table>
                </div>

                <div class="quitacao-opcoes">
                    <h3>Como tratar na renovação <span class="temporada-destino">2026</span>?</h3>

                    <label class="opcao-radio">
                        <input type="radio" name="tipo-quitacao" id="opcao-zerado"
                               value="zerado" checked onchange="onOpcaoQuitacaoChange()">
                        <div class="opcao-content">
                            <span class="opcao-titulo">Zerar tudo (perdoar)</span>
                            <span class="opcao-descricao">
                                Participante inicia <span class="temporada-destino">2026</span> sem pendências
                            </span>
                        </div>
                    </label>

                    <label class="opcao-radio">
                        <input type="radio" name="tipo-quitacao" id="opcao-integral"
                               value="integral" onchange="onOpcaoQuitacaoChange()">
                        <div class="opcao-content">
                            <span class="opcao-titulo" id="label-integral">Carregar saldo integral</span>
                            <span class="opcao-descricao">
                                Saldo vira "Legado <span class="temporada-destino">2025</span>" no extrato
                            </span>
                        </div>
                    </label>

                    <label class="opcao-radio">
                        <input type="radio" name="tipo-quitacao" id="opcao-customizado"
                               value="customizado" onchange="onOpcaoQuitacaoChange()">
                        <div class="opcao-content">
                            <span class="opcao-titulo">Carregar valor customizado</span>
                            <div class="input-customizado">
                                <span>R$</span>
                                <input type="number" id="quitacao-valor-customizado"
                                       step="0.01" disabled placeholder="0.00">
                            </div>
                            <span class="opcao-descricao">
                                Positivo = crédito, Negativo = débito
                            </span>
                        </div>
                    </label>
                </div>

                <div class="quitacao-observacao">
                    <label for="quitacao-observacao">
                        <span class="material-icons">edit_note</span>
                        Observação (obrigatória):
                    </label>
                    <textarea id="quitacao-observacao" rows="2"
                              placeholder="Ex: Saldo corrigido após bug de cálculo. Admin decidiu zerar."></textarea>
                </div>

                <div class="quitacao-aviso">
                    <span class="material-icons">warning</span>
                    <p>
                        <strong>Atenção:</strong> Participantes com dívida precisam quitar o saldo antes de renovar para a próxima temporada.<br>
                        Esta ação marcará o extrato como <strong>QUITADO</strong> e registrará o valor escolhido como legado para a temporada seguinte.<br>
                        Após confirmar, não será possível desfazer.
                    </p>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="fecharModalQuitacao()">
                    Cancelar
                </button>
                <button class="btn btn-primary btn-confirmar" onclick="confirmarQuitacao()">
                    <span class="material-icons">check</span>
                    Confirmar Quitação
                </button>
            </div>
        </div>
    </div>

    <style>
        /* =============================================================================
           MODAL OVERLAY - Base (centralização e backdrop)
           ============================================================================= */
        #modal-quitacao-temporada.modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(4px);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        }

        #modal-quitacao-temporada.modal-overlay.active {
            display: flex;
        }

        /* =============================================================================
           MODAL CONTAINER - Caixa do modal
           ============================================================================= */
        #modal-quitacao-temporada .modal-container {
            background: #1a1a1a;
            border-radius: 16px;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255, 85, 0, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                        0 0 30px rgba(255, 85, 0, 0.1);
            animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* =============================================================================
           MODAL HEADER
           ============================================================================= */
        #modal-quitacao-temporada .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            background: linear-gradient(135deg, #252525 0%, #1a1a1a 100%);
            border-bottom: 1px solid #333;
        }

        #modal-quitacao-temporada .modal-header h2 {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: #ff5500;
        }

        #modal-quitacao-temporada .modal-header h2 .material-icons {
            font-size: 24px;
        }

        #modal-quitacao-temporada .btn-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: none;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #999;
            cursor: pointer;
            transition: all 0.2s;
        }

        #modal-quitacao-temporada .btn-close:hover {
            background: rgba(255, 85, 0, 0.2);
            color: #ff5500;
        }

        /* =============================================================================
           MODAL BODY - Conteúdo scrollável
           ============================================================================= */
        #modal-quitacao-temporada .modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        /* Participante */
        #modal-quitacao-temporada .quitacao-participante {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            background: #252525;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 600;
            color: #fff;
            border-left: 4px solid #ff5500;
        }

        #modal-quitacao-temporada .quitacao-participante .material-icons {
            color: #ff5500;
        }

        /* Resumo */
        #modal-quitacao-temporada .quitacao-resumo {
            margin-bottom: 24px;
        }

        #modal-quitacao-temporada .quitacao-resumo h3,
        #modal-quitacao-temporada .quitacao-opcoes h3 {
            font-size: 0.8rem;
            color: #888;
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        #modal-quitacao-temporada .tabela-resumo {
            width: 100%;
            border-collapse: collapse;
            background: #252525;
            border-radius: 8px;
            overflow: hidden;
        }

        #modal-quitacao-temporada .tabela-resumo td {
            padding: 10px 14px;
            border-bottom: 1px solid #333;
            color: #ccc;
        }

        #modal-quitacao-temporada .tabela-resumo td:last-child {
            text-align: right;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-weight: 500;
        }

        #modal-quitacao-temporada .tabela-resumo .linha-total td {
            background: rgba(255, 85, 0, 0.1);
            border-bottom: none;
            color: #fff;
            font-weight: 700;
        }

        #modal-quitacao-temporada .valor-positivo { color: #10b981 !important; }
        #modal-quitacao-temporada .valor-negativo { color: #ef4444 !important; }

        /* ✅ v1.2: Linhas de crédito comprometido e saldo remanescente */
        #modal-quitacao-temporada .tabela-resumo .linha-comprometido td {
            background: rgba(234, 179, 8, 0.08);
            border-bottom: 1px solid rgba(234, 179, 8, 0.2);
            color: #eab308;
            font-size: 0.9rem;
        }

        #modal-quitacao-temporada .tabela-resumo .linha-remanescente td {
            background: rgba(59, 130, 246, 0.1);
            border-bottom: none;
            color: #60a5fa;
            font-weight: 700;
        }

        /* =============================================================================
           OPÇÕES DE QUITAÇÃO
           ============================================================================= */
        #modal-quitacao-temporada .quitacao-opcoes {
            margin-bottom: 24px;
        }

        #modal-quitacao-temporada .opcao-radio {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 14px 16px;
            background: #252525;
            border-radius: 10px;
            margin-bottom: 10px;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s;
        }

        #modal-quitacao-temporada .opcao-radio:hover {
            border-color: rgba(255, 85, 0, 0.4);
            background: #2a2a2a;
        }

        #modal-quitacao-temporada .opcao-radio:has(input:checked) {
            border-color: #ff5500;
            background: rgba(255, 85, 0, 0.08);
        }

        #modal-quitacao-temporada .opcao-radio input[type="radio"] {
            width: 18px;
            height: 18px;
            margin-top: 2px;
            accent-color: #ff5500;
            cursor: pointer;
        }

        #modal-quitacao-temporada .opcao-content {
            flex: 1;
        }

        #modal-quitacao-temporada .opcao-titulo {
            display: block;
            font-weight: 600;
            color: #fff;
            margin-bottom: 4px;
        }

        #modal-quitacao-temporada .opcao-descricao {
            font-size: 0.85rem;
            color: #888;
            line-height: 1.4;
        }

        #modal-quitacao-temporada .input-customizado {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
        }

        #modal-quitacao-temporada .input-customizado span {
            color: #888;
            font-weight: 500;
        }

        #modal-quitacao-temporada .input-customizado input {
            width: 140px;
            padding: 8px 12px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.95rem;
            transition: border-color 0.2s;
        }

        #modal-quitacao-temporada .input-customizado input:focus {
            outline: none;
            border-color: #ff5500;
        }

        #modal-quitacao-temporada .input-customizado input:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* =============================================================================
           OBSERVAÇÃO
           ============================================================================= */
        #modal-quitacao-temporada .quitacao-observacao {
            margin-bottom: 20px;
        }

        #modal-quitacao-temporada .quitacao-observacao label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            font-weight: 500;
            color: #ccc;
        }

        #modal-quitacao-temporada .quitacao-observacao label .material-icons {
            font-size: 20px;
            color: #ff5500;
        }

        #modal-quitacao-temporada .quitacao-observacao textarea {
            width: 100%;
            padding: 12px 14px;
            background: #252525;
            border: 1px solid #444;
            border-radius: 8px;
            color: #fff;
            font-size: 0.95rem;
            line-height: 1.5;
            resize: vertical;
            min-height: 60px;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }

        #modal-quitacao-temporada .quitacao-observacao textarea:focus {
            outline: none;
            border-color: #ff5500;
        }

        #modal-quitacao-temporada .quitacao-observacao textarea::placeholder {
            color: #666;
        }

        /* =============================================================================
           ALERTAS DE INTEGRAÇÃO (Inscrição/Renovação)
           ============================================================================= */
        #modal-quitacao-temporada .quitacao-alertas {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        #modal-quitacao-temporada .quitacao-alertas [class^="alerta-"] {
            display: flex;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        #modal-quitacao-temporada .quitacao-alertas [class^="alerta-"] .material-icons {
            flex-shrink: 0;
            font-size: 20px;
            margin-top: 1px;
        }

        #modal-quitacao-temporada .quitacao-alertas [class^="alerta-"] p {
            margin: 0;
        }

        /* Alerta Info - Azul */
        #modal-quitacao-temporada .alerta-info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
        }

        #modal-quitacao-temporada .alerta-info .material-icons {
            color: #3b82f6;
        }

        /* Alerta Warning - Amarelo */
        #modal-quitacao-temporada .alerta-warning {
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            color: #fde047;
        }

        #modal-quitacao-temporada .alerta-warning .material-icons {
            color: #eab308;
        }

        /* Alerta Success - Verde */
        #modal-quitacao-temporada .alerta-success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
        }

        #modal-quitacao-temporada .alerta-success .material-icons {
            color: #10b981;
        }

        /* ✅ v1.2: Alerta Highlight - Laranja (crédito comprometido) */
        #modal-quitacao-temporada .alerta-highlight {
            background: rgba(255, 85, 0, 0.12);
            border: 1px solid rgba(255, 85, 0, 0.4);
            color: #ffb380;
        }

        #modal-quitacao-temporada .alerta-highlight .material-icons {
            color: #ff5500;
        }

        /* =============================================================================
           AVISO
           ============================================================================= */
        #modal-quitacao-temporada .quitacao-aviso {
            display: flex;
            gap: 12px;
            padding: 14px 16px;
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.25);
            border-radius: 10px;
            color: #eab308;
        }

        #modal-quitacao-temporada .quitacao-aviso .material-icons {
            flex-shrink: 0;
            font-size: 22px;
        }

        #modal-quitacao-temporada .quitacao-aviso p {
            font-size: 0.9rem;
            margin: 0;
            line-height: 1.5;
        }

        /* =============================================================================
           LOADING
           ============================================================================= */
        #modal-quitacao-temporada .modal-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 40px;
            gap: 20px;
            color: #888;
        }

        #modal-quitacao-temporada .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #333;
            border-top-color: #ff5500;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* =============================================================================
           MODAL FOOTER - Botões
           ============================================================================= */
        #modal-quitacao-temporada .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px 24px;
            background: #151515;
            border-top: 1px solid #333;
        }

        #modal-quitacao-temporada .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        #modal-quitacao-temporada .btn-secondary {
            background: #333;
            color: #ccc;
        }

        #modal-quitacao-temporada .btn-secondary:hover {
            background: #444;
            color: #fff;
        }

        #modal-quitacao-temporada .btn-primary {
            background: linear-gradient(135deg, #ff5500 0%, #e64a00 100%);
            color: #fff;
            box-shadow: 0 4px 12px rgba(255, 85, 0, 0.3);
        }

        #modal-quitacao-temporada .btn-primary:hover {
            background: linear-gradient(135deg, #ff6a1a 0%, #ff5500 100%);
            box-shadow: 0 6px 16px rgba(255, 85, 0, 0.4);
            transform: translateY(-1px);
        }

        #modal-quitacao-temporada .btn-primary:active {
            transform: translateY(0);
        }

        #modal-quitacao-temporada .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        #modal-quitacao-temporada .btn .material-icons {
            font-size: 20px;
        }

        /* =============================================================================
           RESPONSIVO - Mobile
           ============================================================================= */
        @media (max-width: 600px) {
            #modal-quitacao-temporada.modal-overlay {
                padding: 10px;
            }

            #modal-quitacao-temporada .modal-container {
                max-height: 95vh;
            }

            #modal-quitacao-temporada .modal-header {
                padding: 16px 20px;
            }

            #modal-quitacao-temporada .modal-header h2 {
                font-size: 1.1rem;
            }

            #modal-quitacao-temporada .modal-body {
                padding: 20px;
            }

            #modal-quitacao-temporada .modal-footer {
                padding: 16px 20px;
                flex-direction: column-reverse;
            }

            #modal-quitacao-temporada .btn {
                width: 100%;
            }
        }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

// Injetar modal quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injetarModalQuitacao);
} else {
    injetarModalQuitacao();
}

console.log('[FLUXO-QUITACAO] Módulo de quitação carregado');
