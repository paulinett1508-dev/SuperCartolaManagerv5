// ==============================
// GERENCIADOR DE CAMPOS EDITÁVEIS
// ==============================

export class FluxoFinanceiroCampos {
    /**
     * Salva um campo editável no localStorage
     * @param {string} timeId - ID do time
     * @param {string} campo - Nome do campo (campo1, campo2, etc.)
     * @param {string} tipo - Tipo do campo (nome, valor)
     * @param {*} valor - Valor a ser salvo
     */
    static salvarCampoEditavel(timeId, campo, tipo, valor) {
        try {
            const chave = `fluxo_financeiro_${timeId}_${campo}_${tipo}`;
            localStorage.setItem(chave, String(valor));
            console.log(
                `[FluxoFinanceiroCampos] Campo salvo: ${chave} = ${valor}`,
            );
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao salvar campo:",
                error,
            );
        }
    }

    /**
     * Carrega um campo editável do localStorage
     * @param {string} timeId - ID do time
     * @param {string} campo - Nome do campo
     * @param {string} tipo - Tipo do campo
     * @param {*} valorPadrao - Valor padrão se não encontrado
     * @returns {*} - Valor carregado ou padrão
     */
    static carregarCampoEditavel(timeId, campo, tipo, valorPadrao) {
        try {
            const chave = `fluxo_financeiro_${timeId}_${campo}_${tipo}`;
            const valor = localStorage.getItem(chave);
            return valor !== null ? valor : valorPadrao;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao carregar campo:",
                error,
            );
            return valorPadrao;
        }
    }

    /**
     * Carrega todos os campos editáveis de um time
     * @param {string} timeId - ID do time
     * @returns {Object} - Objeto com todos os campos editáveis
     */
    static carregarTodosCamposEditaveis(timeId) {
        return {
            campo1: {
                nome: this.carregarCampoEditavel(
                    timeId,
                    "campo1",
                    "nome",
                    "Campo 1",
                ),
                valor:
                    parseFloat(
                        this.carregarCampoEditavel(
                            timeId,
                            "campo1",
                            "valor",
                            "0",
                        ),
                    ) || 0,
            },
            campo2: {
                nome: this.carregarCampoEditavel(
                    timeId,
                    "campo2",
                    "nome",
                    "Campo 2",
                ),
                valor:
                    parseFloat(
                        this.carregarCampoEditavel(
                            timeId,
                            "campo2",
                            "valor",
                            "0",
                        ),
                    ) || 0,
            },
            campo3: {
                nome: this.carregarCampoEditavel(
                    timeId,
                    "campo3",
                    "nome",
                    "Campo 3",
                ),
                valor:
                    parseFloat(
                        this.carregarCampoEditavel(
                            timeId,
                            "campo3",
                            "valor",
                            "0",
                        ),
                    ) || 0,
            },
            campo4: {
                nome: this.carregarCampoEditavel(
                    timeId,
                    "campo4",
                    "nome",
                    "Campo 4",
                ),
                valor:
                    parseFloat(
                        this.carregarCampoEditavel(
                            timeId,
                            "campo4",
                            "valor",
                            "0",
                        ),
                    ) || 0,
            },
        };
    }

    /**
     * Adiciona eventos aos campos editáveis
     * @param {string} timeId - ID do time
     * @param {Function} onChangeCallback - Callback para quando um campo é alterado
     */
    static adicionarEventosCamposEditaveis(timeId, onChangeCallback) {
        // Eventos para campos de nome
        document.querySelectorAll(".campo-nome").forEach((input) => {
            if (input.dataset.timeId === timeId) {
                // Remover eventos anteriores
                input.removeEventListener("change", this._handleNomeChange);
                input.removeEventListener("blur", this._handleNomeBlur);

                // Adicionar novos eventos
                const handleNomeChange = (e) =>
                    this._handleNomeChange(e, timeId);
                const handleNomeBlur = (e) => this._handleNomeBlur(e, timeId);

                input.addEventListener("change", handleNomeChange);
                input.addEventListener("blur", handleNomeBlur);

                // Armazenar referência para remoção futura
                input._handleNomeChange = handleNomeChange;
                input._handleNomeBlur = handleNomeBlur;
            }
        });

        // Eventos para campos de valor
        document.querySelectorAll(".campo-valor").forEach((input) => {
            if (input.dataset.timeId === timeId) {
                // Remover eventos anteriores
                input.removeEventListener("change", this._handleValorChange);
                input.removeEventListener("blur", this._handleValorBlur);
                input.removeEventListener("input", this._handleValorInput);

                // Adicionar novos eventos
                const handleValorChange = (e) =>
                    this._handleValorChange(e, timeId, onChangeCallback);
                const handleValorBlur = (e) =>
                    this._handleValorBlur(e, timeId, onChangeCallback);
                const handleValorInput = (e) => this._handleValorInput(e);

                input.addEventListener("change", handleValorChange);
                input.addEventListener("blur", handleValorBlur);
                input.addEventListener("input", handleValorInput);

                // Armazenar referência para remoção futura
                input._handleValorChange = handleValorChange;
                input._handleValorBlur = handleValorBlur;
                input._handleValorInput = handleValorInput;
            }
        });
    }

    /**
     * Handler para mudança de nome
     * @param {Event} e - Evento
     * @param {string} timeId - ID do time
     * @private
     */
    static _handleNomeChange(e, timeId) {
        const campo = e.target.dataset.campo;
        const novoNome = e.target.value.trim() || `Campo ${campo.slice(-1)}`;

        // Atualizar valor no input
        e.target.value = novoNome;

        // Salvar no localStorage
        this.salvarCampoEditavel(timeId, campo, "nome", novoNome);

        console.log(
            `[FluxoFinanceiroCampos] Nome alterado: ${campo} = ${novoNome}`,
        );
    }

    /**
     * Handler para blur de nome
     * @param {Event} e - Evento
     * @param {string} timeId - ID do time
     * @private
     */
    static _handleNomeBlur(e, timeId) {
        // Mesmo comportamento do change
        this._handleNomeChange(e, timeId);
    }

    /**
     * Handler para mudança de valor
     * @param {Event} e - Evento
     * @param {string} timeId - ID do time
     * @param {Function} onChangeCallback - Callback
     * @private
     */
    static _handleValorChange(e, timeId, onChangeCallback) {
        const campo = e.target.dataset.campo;
        const novoValor = parseFloat(e.target.value) || 0;

        // Salvar no localStorage
        this.salvarCampoEditavel(timeId, campo, "valor", novoValor);

        // Atualizar display visual
        this._atualizarDisplayValor(e.target, novoValor);

        console.log(
            `[FluxoFinanceiroCampos] Valor alterado: ${campo} = R$ ${novoValor.toFixed(2)}`,
        );

        // Chamar callback se fornecido
        if (onChangeCallback) {
            onChangeCallback(timeId);
        }
    }

    /**
     * Handler para blur de valor
     * @param {Event} e - Evento
     * @param {string} timeId - ID do time
     * @param {Function} onChangeCallback - Callback
     * @private
     */
    static _handleValorBlur(e, timeId, onChangeCallback) {
        // Mesmo comportamento do change
        this._handleValorChange(e, timeId, onChangeCallback);
    }

    /**
     * Handler para input de valor (validação em tempo real)
     * @param {Event} e - Evento
     * @private
     */
    static _handleValorInput(e) {
        const valor = e.target.value;

        // Permitir apenas números, ponto, vírgula e sinal negativo
        const valorLimpo = valor.replace(/[^0-9.,-]/g, "");

        if (valorLimpo !== valor) {
            e.target.value = valorLimpo;
        }
    }

    /**
     * Atualiza display visual do valor
     * @param {HTMLElement} input - Input element
     * @param {number} valor - Valor numérico
     * @private
     */
    static _atualizarDisplayValor(input, valor) {
        const container = input.closest(".card-valor-container");
        if (container) {
            const display = container.querySelector(".card-valor");
            if (display) {
                // Atualizar texto
                display.textContent = `R$ ${valor.toFixed(2).replace(".", ",")}`;

                // Atualizar classe CSS
                display.classList.remove("positivo", "negativo");
                if (valor > 0) {
                    display.classList.add("positivo");
                } else if (valor < 0) {
                    display.classList.add("negativo");
                }
            }
        }
    }

    /**
     * Gera HTML para um campo editável
     * @param {string} timeId - ID do time
     * @param {string} campo - Nome do campo
     * @param {Object} dadosCampo - Dados do campo (nome, valor)
     * @returns {string} - HTML do campo editável
     */
    static gerarHtmlCampoEditavel(timeId, campo, dadosCampo) {
        const valorFormatado = dadosCampo.valor.toFixed(2).replace(".", ",");
        const classeValor = dadosCampo.valor >= 0 ? "positivo" : "negativo";

        return `
            <div class="resumo-card campo-editavel">
                <div class="card-label">
                    <input type="text" 
                           class="campo-nome" 
                           value="${dadosCampo.nome}" 
                           data-campo="${campo}" 
                           data-time-id="${timeId}"
                           placeholder="Nome do campo"
                           maxlength="20">
                </div>
                <div class="card-valor-container">
                    <input type="number" 
                           class="campo-valor" 
                           value="${dadosCampo.valor}" 
                           data-campo="${campo}" 
                           data-time-id="${timeId}" 
                           step="0.01"
                           placeholder="0.00">
                    <div class="card-valor ${classeValor}">
                        R$ ${valorFormatado}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Valida valor de campo
     * @param {*} valor - Valor a ser validado
     * @returns {number} - Valor validado
     */
    static validarValor(valor) {
        const numero = parseFloat(valor);

        if (isNaN(numero)) {
            return 0;
        }

        // Limitar a valores razoáveis
        if (numero > 9999) return 9999;
        if (numero < -9999) return -9999;

        return numero;
    }

    /**
     * Reseta todos os campos de um time
     * @param {string} timeId - ID do time
     */
    static resetarCampos(timeId) {
        const campos = ["campo1", "campo2", "campo3", "campo4"];

        campos.forEach((campo) => {
            this.salvarCampoEditavel(
                timeId,
                campo,
                "nome",
                `Campo ${campo.slice(-1)}`,
            );
            this.salvarCampoEditavel(timeId, campo, "valor", 0);
        });

        console.log(
            `[FluxoFinanceiroCampos] Campos resetados para time ${timeId}`,
        );
    }

    /**
     * Exporta dados dos campos para backup
     * @param {string} timeId - ID do time
     * @returns {Object} - Dados dos campos
     */
    static exportarCampos(timeId) {
        return this.carregarTodosCamposEditaveis(timeId);
    }

    /**
     * Importa dados dos campos de backup
     * @param {string} timeId - ID do time
     * @param {Object} dadosCampos - Dados dos campos
     */
    static importarCampos(timeId, dadosCampos) {
        const campos = ["campo1", "campo2", "campo3", "campo4"];

        campos.forEach((campo) => {
            if (dadosCampos[campo]) {
                this.salvarCampoEditavel(
                    timeId,
                    campo,
                    "nome",
                    dadosCampos[campo].nome,
                );
                this.salvarCampoEditavel(
                    timeId,
                    campo,
                    "valor",
                    dadosCampos[campo].valor,
                );
            }
        });

        console.log(
            `[FluxoFinanceiroCampos] Campos importados para time ${timeId}`,
        );
    }

    /**
     * Remove todos os eventos dos campos
     * @param {string} timeId - ID do time
     */
    static removerEventos(timeId) {
        document
            .querySelectorAll(".campo-nome, .campo-valor")
            .forEach((input) => {
                if (input.dataset.timeId === timeId) {
                    // Remover eventos armazenados
                    if (input._handleNomeChange) {
                        input.removeEventListener(
                            "change",
                            input._handleNomeChange,
                        );
                        input.removeEventListener(
                            "blur",
                            input._handleNomeBlur,
                        );
                    }
                    if (input._handleValorChange) {
                        input.removeEventListener(
                            "change",
                            input._handleValorChange,
                        );
                        input.removeEventListener(
                            "blur",
                            input._handleValorBlur,
                        );
                        input.removeEventListener(
                            "input",
                            input._handleValorInput,
                        );
                    }
                }
            });
    }

    /**
     * Obtém estatísticas dos campos
     * @param {string} timeId - ID do time
     * @returns {Object} - Estatísticas
     */
    static obterEstatisticas(timeId) {
        const campos = this.carregarTodosCamposEditaveis(timeId);
        const valores = Object.values(campos).map((c) => c.valor);

        return {
            total: valores.reduce((sum, val) => sum + val, 0),
            positivos: valores.filter((val) => val > 0).length,
            negativos: valores.filter((val) => val < 0).length,
            zeros: valores.filter((val) => val === 0).length,
            maior: Math.max(...valores),
            menor: Math.min(...valores),
        };
    }
}
