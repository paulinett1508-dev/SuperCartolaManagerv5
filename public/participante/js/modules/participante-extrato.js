
// PARTICIPANTE EXTRATO - Módulo de Extrato Financeiro

console.log('[PARTICIPANTE-EXTRATO] Carregando módulo...');

window.inicializarExtratoParticipante = async function(ligaId, timeId) {
    console.log(`[PARTICIPANTE-EXTRATO] Inicializando para time ${timeId} na liga ${ligaId}`);

    try {
        // Buscar extrato do participante
        const response = await fetch(`/api/extrato-financeiro/${ligaId}/${timeId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar extrato');
        }

        const dados = await response.json();
        renderizarExtrato(dados);

    } catch (error) {
        console.error('[PARTICIPANTE-EXTRATO] Erro:', error);
        mostrarErro(error.message);
    }
};

function renderizarExtrato(dados) {
    // Atualizar resumo
    const saldoTotal = dados.saldo || 0;
    const totalCreditos = dados.movimentacoes?.filter(m => m.valor > 0)
        .reduce((sum, m) => sum + m.valor, 0) || 0;
    const totalDebitos = Math.abs(dados.movimentacoes?.filter(m => m.valor < 0)
        .reduce((sum, m) => sum + m.valor, 0) || 0);

    document.getElementById('saldoTotal').textContent = `R$ ${saldoTotal.toFixed(2)}`;
    document.getElementById('totalCreditos').textContent = `R$ ${totalCreditos.toFixed(2)}`;
    document.getElementById('totalDebitos').textContent = `R$ ${totalDebitos.toFixed(2)}`;

    // Renderizar tabela
    const container = document.getElementById('extratoTabela');
    
    if (!dados.movimentacoes || dados.movimentacoes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Nenhuma movimentação registrada</p>';
        return;
    }

    const html = `
        <table class="tabela-extrato">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Rodada</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                ${dados.movimentacoes.map(mov => `
                    <tr class="${mov.valor >= 0 ? 'credito' : 'debito'}">
                        <td>${formatarData(mov.data)}</td>
                        <td>${mov.descricao}</td>
                        <td>${mov.rodada || '--'}</td>
                        <td class="valor ${mov.valor >= 0 ? 'positivo' : 'negativo'}">
                            ${mov.valor >= 0 ? '+' : ''}R$ ${Math.abs(mov.valor).toFixed(2)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function formatarData(data) {
    if (!data) return '--';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

function mostrarErro(mensagem) {
    const container = document.getElementById('extratoTabela');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
            <h3>Erro ao Carregar Extrato</h3>
            <p>${mensagem}</p>
        </div>
    `;
}

console.log('[PARTICIPANTE-EXTRATO] ✅ Módulo carregado');
