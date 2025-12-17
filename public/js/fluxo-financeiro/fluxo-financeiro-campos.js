// ==============================
// GERENCIADOR DE CAMPOS EDITÁVEIS - MONGODB
// ==============================

import { FluxoFinanceiroAPI } from "./fluxo-financeiro-api.js";
import { obterLigaId } from "../pontos-corridos-utils.js";
import { parseMoedaBR } from "./fluxo-financeiro-utils.js";

export class FluxoFinanceiroCampos {
    /**
     * Carrega todos os campos editáveis de um time do MongoDB
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>} - Objeto com todos os campos editáveis
     */
    static async carregarTodosCamposEditaveis(timeId) {
        try {
            const ligaId = obterLigaId();
            const data = await FluxoFinanceiroAPI.getCampos(ligaId, timeId);

            // Transformar array de campos em objeto
            const campos = {
                campo1: data.campos[0] || { nome: "Campo 1", valor: 0 },
                campo2: data.campos[1] || { nome: "Campo 2", valor: 0 },
                campo3: data.campos[2] || { nome: "Campo 3", valor: 0 },
                campo4: data.campos[3] || { nome: "Campo 4", valor: 0 },
            };

            console.log(
                "[FluxoFinanceiroCampos] Campos carregados do MongoDB:",
                campos,
            );
            return campos;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao carregar campos, usando padrão:",
                error,
            );
            return {
                campo1: { nome: "Campo 1", valor: 0 },
                campo2: { nome: "Campo 2", valor: 0 },
                campo3: { nome: "Campo 3", valor: 0 },
                campo4: { nome: "Campo 4", valor: 0 },
            };
        }
    }

    /**
     * Salva o valor de um campo no MongoDB
     * @param {string} timeId - ID do time
     * @param {string} nomeCampo - Nome do campo (campo1, campo2, etc.)
     * @param {number} valor - Valor numérico
     * @returns {Promise<Object>}
     */
    static async salvarValorCampo(timeId, nomeCampo, valor) {
        try {
            const ligaId = obterLigaId();
            const campoIndex = parseInt(nomeCampo.replace("campo", "")) - 1;

            // ✅ CARREGAR DADOS ATUAIS PRIMEIRO
            const camposAtuais =
                await this.carregarTodosCamposEditaveis(timeId);
            const campoAtual = camposAtuais[nomeCampo];

            const valorNumerico = parseMoedaBR(valor);

            // ✅ PRESERVAR O NOME EXISTENTE
            const data = await FluxoFinanceiroAPI.salvarCampo(
                ligaId,
                timeId,
                campoIndex,
                {
                    nome: campoAtual?.nome || `Campo ${campoIndex + 1}`,
                    valor: valorNumerico,
                },
            );

            console.log(
                `[FluxoFinanceiroCampos] Valor salvo: ${nomeCampo} = R$ ${valor}`,
            );

            // ✅ INVALIDAR CACHE após salvar campo editável
            console.log('[FLUXO-CAMPOS] Invalidando cache após alteração de campo');
            if (window.invalidarCacheTime) {
              await window.invalidarCacheTime(ligaId, timeId);
            }

            return data;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao salvar valor:",
                error,
            );
            throw error;
        }
    }

    /**
     * Salva o nome de um campo no MongoDB
     * @param {string} timeId - ID do time
     * @param {string} nomeCampo - Nome do campo (campo1, campo2, etc.)
     * @param {string} nome - Nome do campo
     * @returns {Promise<Object>}
     */
    static async salvarNomeCampo(timeId, nomeCampo, nome) {
        try {
            const ligaId = obterLigaId();
            const campoIndex = parseInt(nomeCampo.replace("campo", "")) - 1;

            // ✅ CARREGAR DADOS ATUAIS PRIMEIRO
            const camposAtuais =
                await this.carregarTodosCamposEditaveis(timeId);
            const campoAtual = camposAtuais[nomeCampo];

            // ✅ PRESERVAR O VALOR EXISTENTE
            const data = await FluxoFinanceiroAPI.salvarCampo(
                ligaId,
                timeId,
                campoIndex,
                {
                    nome: nome.trim(),
                    valor: campoAtual?.valor || 0,
                },
            );

            console.log(
                `[FluxoFinanceiroCampos] Nome salvo: ${nomeCampo} = ${nome}`,
            );

            // ✅ INVALIDAR CACHE após renomear campo (não afeta valores, mas por segurança)
            console.log('[FLUXO-CAMPOS] Campo renomeado - cache mantido');

            return data;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao salvar nome:",
                error,
            );
            throw error;
        }
    }

    /**
     * Obtém o nome de um campo
     * @param {string} timeId - ID do time
     * @param {string} nomeCampo - Nome do campo (campo1, campo2, etc.)
     * @returns {Promise<string>} - Nome do campo
     */
    static async obterNomeCampo(timeId, nomeCampo) {
        try {
            const campos = await this.carregarTodosCamposEditaveis(timeId);
            return campos[nomeCampo]?.nome || `Campo ${nomeCampo.slice(-1)}`;
        } catch (error) {
            console.error("[FluxoFinanceiroCampos] Erro ao obter nome:", error);
            return `Campo ${nomeCampo.slice(-1)}`;
        }
    }

    /**
     * Reseta todos os campos de um time
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>}
     */
    static async resetarCampos(timeId) {
        try {
            const ligaId = obterLigaId();
            const data = await FluxoFinanceiroAPI.resetarCampos(ligaId, timeId);

            console.log(
                `[FluxoFinanceiroCampos] Campos resetados para time ${timeId}`,
            );
            return data;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao resetar campos:",
                error,
            );
            throw error;
        }
    }

    /**
     * Exporta dados dos campos para backup
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>} - Dados dos campos
     */
    static async exportarCampos(timeId) {
        return await this.carregarTodosCamposEditaveis(timeId);
    }

    /**
     * Importa dados dos campos de backup
     * @param {string} timeId - ID do time
     * @param {Object} dadosCampos - Dados dos campos
     * @returns {Promise<Object>}
     */
    static async importarCampos(timeId, dadosCampos) {
        try {
            const ligaId = obterLigaId();

            const campos = [
                dadosCampos.campo1 || { nome: "Campo 1", valor: 0 },
                dadosCampos.campo2 || { nome: "Campo 2", valor: 0 },
                dadosCampos.campo3 || { nome: "Campo 3", valor: 0 },
                dadosCampos.campo4 || { nome: "Campo 4", valor: 0 },
            ];

            const data = await FluxoFinanceiroAPI.salvarCampos(
                ligaId,
                timeId,
                campos,
            );

            console.log(
                `[FluxoFinanceiroCampos] Campos importados para time ${timeId}`,
            );
            return data;
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao importar campos:",
                error,
            );
            throw error;
        }
    }

    /**
     * Obtém estatísticas dos campos
     * @param {string} timeId - ID do time
     * @returns {Promise<Object>} - Estatísticas
     */
    static async obterEstatisticas(timeId) {
        try {
            const campos = await this.carregarTodosCamposEditaveis(timeId);
            const valores = Object.values(campos).map((c) => c.valor);

            return {
                total: valores.reduce((sum, val) => sum + val, 0),
                positivos: valores.filter((val) => val > 0).length,
                negativos: valores.filter((val) => val < 0).length,
                zeros: valores.filter((val) => val === 0).length,
                maior: Math.max(...valores),
                menor: Math.min(...valores),
            };
        } catch (error) {
            console.error(
                "[FluxoFinanceiroCampos] Erro ao obter estatísticas:",
                error,
            );
            return null;
        }
    }

    /**
     * Valida valor de campo
     * Aceita formatos: "1234.56", "1234,56", "R$ 1.234,56"
     * @param {*} valor - Valor a ser validado
     * @returns {number} - Valor validado
     */
    static validarValor(valor) {
        // Usa parseMoedaBR para aceitar formato brasileiro
        const numero = parseMoedaBR(valor);

        if (isNaN(numero)) {
            return 0;
        }

        // Limitar a valores razoáveis
        if (numero > 99999) return 99999;
        if (numero < -99999) return -99999;

        return numero;
    }
}