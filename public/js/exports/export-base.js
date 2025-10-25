// export-base.js - Módulo base para exportação de relatórios
// Versão: 3.0 - Sistema modular otimizado

/**
 * Sistema de exportação de relatórios
 * Fornece funções base para exportação em diferentes formatos
 */

export const ExportBase = {
    /**
     * Formata data para uso em nomes de arquivo
     * @param {Date} date - Data a ser formatada
     * @returns {string} Data formatada (YYYY-MM-DD)
     */
    formatarDataArquivo(date = new Date()) {
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const dia = String(date.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    },

    /**
     * Formata data e hora para uso em nomes de arquivo
     * @param {Date} date - Data a ser formatada
     * @returns {string} Data e hora formatada (YYYY-MM-DD_HH-mm-ss)
     */
    formatarDataHoraArquivo(date = new Date()) {
        const dataStr = this.formatarDataArquivo(date);
        const hora = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const seg = String(date.getSeconds()).padStart(2, '0');
        return `${dataStr}_${hora}-${min}-${seg}`;
    },

    /**
     * Gera nome de arquivo padrão
     * @param {string} tipo - Tipo de relatório
     * @param {string} ligaNome - Nome da liga
     * @param {string} extensao - Extensão do arquivo
     * @returns {string} Nome do arquivo
     */
    gerarNomeArquivo(tipo, ligaNome, extensao = 'pdf') {
        const dataHora = this.formatarDataHoraArquivo();
        const nomeClean = ligaNome.replace(/[^a-zA-Z0-9]/g, '_');
        return `${tipo}_${nomeClean}_${dataHora}.${extensao}`;
    },

    /**
     * Baixa arquivo
     * @param {Blob} blob - Dados do arquivo
     * @param {string} nomeArquivo - Nome do arquivo
     */
    baixarArquivo(blob, nomeArquivo) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Converte tabela HTML para CSV
     * @param {HTMLTableElement} tabela - Elemento da tabela
     * @returns {string} Conteúdo CSV
     */
    tabelaParaCSV(tabela) {
        const linhas = [];
        const rows = tabela.querySelectorAll('tr');

        rows.forEach(row => {
            const cols = row.querySelectorAll('td, th');
            const linha = Array.from(cols).map(col => {
                let texto = col.textContent.trim();
                // Escapa aspas duplas
                texto = texto.replace(/"/g, '""');
                // Envolve em aspas se contém vírgula, quebra de linha ou aspas
                if (texto.includes(',') || texto.includes('\n') || texto.includes('"')) {
                    texto = `"${texto}"`;
                }
                return texto;
            });
            linhas.push(linha.join(','));
        });

        return linhas.join('\n');
    },

    /**
     * Exporta dados como CSV
     * @param {Array} dados - Array de objetos com os dados
     * @param {string} nomeArquivo - Nome do arquivo
     * @param {Array} colunas - Array com as colunas a exportar
     */
    exportarCSV(dados, nomeArquivo, colunas = null) {
        if (!dados || dados.length === 0) {
            console.warn('[EXPORT-BASE] Nenhum dado para exportar');
            return;
        }

        // Se não forneceu colunas, usar todas as chaves do primeiro objeto
        const cols = colunas || Object.keys(dados[0]);

        // Cabeçalho
        const csv = [cols.join(',')];

        // Linhas de dados
        dados.forEach(item => {
            const linha = cols.map(col => {
                let valor = item[col] ?? '';
                valor = String(valor).replace(/"/g, '""');
                if (String(valor).includes(',') || String(valor).includes('\n') || String(valor).includes('"')) {
                    valor = `"${valor}"`;
                }
                return valor;
            });
            csv.push(linha.join(','));
        });

        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this.baixarArquivo(blob, nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`);
    },

    /**
     * Mostra notificação de sucesso
     * @param {string} mensagem - Mensagem a exibir
     */
    mostrarSucesso(mensagem) {
        console.log(`✅ ${mensagem}`);
        // Aqui pode adicionar integração com sistema de notificações
    },

    /**
     * Mostra notificação de erro
     * @param {string} mensagem - Mensagem a exibir
     */
    mostrarErro(mensagem) {
        console.error(`❌ ${mensagem}`);
        // Aqui pode adicionar integração com sistema de notificações
    }
};

// Exportar como padrão também
export default ExportBase;

console.log('✅ [EXPORT-BASE] Módulo carregado com sucesso');