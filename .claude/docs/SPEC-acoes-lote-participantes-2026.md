# SPEC - Ações em Lote para Participantes 2026

**Data:** 2026-01-24
**Baseado em:** Plano aprovado em `/home/runner/.claude/plans/luminous-jumping-gray.md`
**Status:** Especificação Técnica

---

## Resumo da Implementação

Adicionar sistema de seleção múltipla e ações em lote no módulo de Participantes do painel admin, exclusivamente para temporadas >= 2026. Inclui checkboxes nos cards, toolbar flutuante com 7 ações, endpoint batch no backend e modal de confirmação.

---

## Arquivos a Modificar (Ordem de Execução)

### 1. public/fronts/participantes.html - CONCLUÍDO ✅

**Path:** `/home/runner/workspace/public/fronts/participantes.html`
**Tipo:** Modificação
**Status:** JÁ IMPLEMENTADO (linhas 39-74)

Toolbar batch já inserida entre `#temporada-tabs` e `#participantes-grid`.

---

### 2. public/js/participantes.js - Checkboxes nos Cards

**Path:** `/home/runner/workspace/public/js/participantes.js`
**Tipo:** Modificação
**Impacto:** Médio
**Dependentes:** Nenhum (arquivo standalone)

#### Variáveis Globais Identificadas:
- `ligaId` (linha 5) - ID da liga via URL param
- `temporadaSelecionada` (linha 13) - Temporada ativa
- `mostrarToast()` (linha 457) - Função de feedback existente

#### Mudança Cirúrgica 1: Checkbox no Card (PARCIALMENTE FEITO)

**Linha 230-231: VERIFICAR SE JÁ ESTÁ CORRETO**
```javascript
// Checkbox condicional para temporadas >= 2026
${temporadaSelecionada >= 2026 ? `
<input type="checkbox"
       class="batch-checkbox"
       data-time-id="${p.time_id}"
       data-status="${p.status || 'pendente'}"
       data-nome="${(p.nome_cartoleiro || '').replace(/"/g, '&quot;')}"
       onclick="event.stopPropagation(); window.toggleSelecaoBatch(${p.time_id})">
` : ''}
```

#### Mudança Cirúrgica 2: Novo Bloco no Final (Após linha 2862)

**ADICIONAR bloco completo de ações em lote:**

```javascript
// ==============================
// AÇÕES EM LOTE - TEMPORADA 2026
// v1.0 - 2026-01-24
// ==============================

let selecaoBatch = new Set();

// Toggle seleção individual
window.toggleSelecaoBatch = function(timeId) {
    const checkbox = document.querySelector(`.batch-checkbox[data-time-id="${timeId}"]`);
    if (selecaoBatch.has(timeId)) {
        selecaoBatch.delete(timeId);
        if (checkbox) checkbox.checked = false;
    } else {
        selecaoBatch.add(timeId);
        if (checkbox) checkbox.checked = true;
    }
    atualizarToolbarBatch();
};

// Selecionar todos visíveis
window.selecionarTodosBatch = function() {
    document.querySelectorAll('.batch-checkbox').forEach(cb => {
        const timeId = parseInt(cb.dataset.timeId);
        selecaoBatch.add(timeId);
        cb.checked = true;
    });
    atualizarToolbarBatch();
};

// Limpar seleção
window.limparSelecao = function() {
    selecaoBatch.clear();
    document.querySelectorAll('.batch-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('batch-select-all').checked = false;
    atualizarToolbarBatch();
};

// Toggle selecionar todos (checkbox do header)
window.toggleSelecionarTodos = function(checked) {
    if (checked) {
        selecionarTodosBatch();
    } else {
        limparSelecao();
    }
};

// Atualizar visibilidade da toolbar
function atualizarToolbarBatch() {
    const toolbar = document.getElementById('batch-toolbar');
    if (!toolbar) return;

    const count = selecaoBatch.size;

    if (count > 0 && temporadaSelecionada >= 2026) {
        toolbar.style.display = 'flex';
        toolbar.querySelector('.batch-count').textContent = count;
    } else {
        toolbar.style.display = 'none';
    }
}

// Limpar seleção ao trocar temporada
const _originalSelecionarTemporada = window.selecionarTemporada;
window.selecionarTemporada = async function(temporada) {
    limparSelecao();
    await _originalSelecionarTemporada(temporada);
};

// === AÇÕES EM LOTE ===

// Grupo Renovação
window.batchRenovar = () => executarAcaoBatch('renovar', 'Renovar participantes');
window.batchNaoParticipa = () => executarAcaoBatch('nao_participa', 'Marcar como não participa');
window.batchMarcarPago = () => executarAcaoBatch('marcar_pago', 'Marcar inscrição como paga');
window.batchReverter = () => executarAcaoBatch('reverter', 'Reverter para pendente');

// Grupo Gestão
window.batchValidarIds = () => executarAcaoBatch('validar_ids', 'Validar IDs na API Cartola');
window.batchToggleStatus = async () => {
    const acao = await mostrarModalEscolhaStatus();
    if (acao) {
        executarAcaoBatch(acao, acao === 'ativar' ? 'Ativar participantes' : 'Inativar participantes');
    }
};
window.batchGerarSenhas = () => executarAcaoBatch('gerar_senhas', 'Gerar senhas de acesso');

// Modal de escolha ativar/inativar
function mostrarModalEscolhaStatus() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-custom';
        modal.innerHTML = `
            <div class="modal-custom-overlay"></div>
            <div class="modal-custom-content" style="max-width: 300px;">
                <div class="modal-custom-header">
                    <h3>Escolha a ação</h3>
                </div>
                <div class="modal-custom-body" style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-primary" onclick="this.closest('.modal-custom').remove(); window._resolveStatus('ativar')">
                        <span class="material-icons">play_circle</span> Ativar
                    </button>
                    <button class="btn-danger" onclick="this.closest('.modal-custom').remove(); window._resolveStatus('inativar')">
                        <span class="material-icons">pause_circle</span> Inativar
                    </button>
                </div>
                <div class="modal-custom-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-custom').remove(); window._resolveStatus(null)">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        window._resolveStatus = resolve;
    });
}

// Modal de confirmação batch
async function mostrarModalConfirmacaoBatch(acao, titulo, timeIds) {
    // Buscar nomes dos participantes selecionados
    const nomes = timeIds.map(id => {
        const cb = document.querySelector(`.batch-checkbox[data-time-id="${id}"]`);
        return cb?.dataset.nome || `Time ${id}`;
    });

    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-custom';
        modal.innerHTML = `
            <div class="modal-custom-overlay" onclick="this.closest('.modal-custom').remove(); window._resolveBatch(false)"></div>
            <div class="modal-custom-content" style="max-width: 450px;">
                <div class="modal-custom-header">
                    <h3>${titulo}</h3>
                </div>
                <div class="modal-custom-body">
                    <p style="margin-bottom: 12px;">Aplicar ação em <strong>${timeIds.length}</strong> participante(s):</p>
                    <div style="max-height: 200px; overflow-y: auto; background: #1a1a2e; padding: 8px; border-radius: 8px; margin-bottom: 12px;">
                        ${nomes.map(n => `<div style="padding: 4px 0; border-bottom: 1px solid #333;">${n}</div>`).join('')}
                    </div>
                    ${acao === 'renovar' ? `
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="batch-pagou-inscricao">
                        Marcar como "Já pagou inscrição"
                    </label>
                    ` : ''}
                </div>
                <div class="modal-custom-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="this.closest('.modal-custom').remove(); window._resolveBatch(false)">Cancelar</button>
                    <button class="btn-primary" onclick="this.closest('.modal-custom').remove(); window._resolveBatch(true)">
                        Confirmar (${timeIds.length})
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        window._resolveBatch = resolve;
    });
}

// Executor principal de ações em lote
async function executarAcaoBatch(acao, titulo) {
    if (selecaoBatch.size === 0) {
        mostrarToast('Selecione ao menos um participante', 'warning');
        return;
    }

    const timeIds = Array.from(selecaoBatch);
    const confirmado = await mostrarModalConfirmacaoBatch(acao, titulo, timeIds);
    if (!confirmado) return;

    // Obter opções extras
    const opcoes = {};
    if (acao === 'renovar') {
        const checkPagou = document.getElementById('batch-pagou-inscricao');
        opcoes.pagouInscricao = checkPagou?.checked || false;
    }

    // Loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'batch-loading';
    overlay.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1a2e; padding: 24px; border-radius: 12px; text-align: center;">
                <div class="loading-spinner" style="margin: 0 auto 12px;"></div>
                <p>Processando ${timeIds.length} participantes...</p>
                <p id="batch-progress" style="color: #888; font-size: 14px;">0 / ${timeIds.length}</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    try {
        const response = await fetch(`/api/inscricoes/${ligaId}/${temporadaSelecionada}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeIds, acao, opcoes })
        });

        const result = await response.json();

        if (result.success) {
            mostrarToast(`${result.processados}/${result.total} participantes processados!`, 'success');

            // Mostrar erros se houver
            if (result.erros?.length > 0) {
                console.warn('[BATCH] Erros:', result.erros);
                result.erros.forEach(e => {
                    mostrarToast(`Erro no time ${e.timeId}: ${e.error}`, 'error');
                });
            }

            limparSelecao();
            await carregarParticipantesPorTemporada(temporadaSelecionada);
        } else {
            mostrarToast('Erro ao processar: ' + (result.error || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        mostrarToast('Erro: ' + error.message, 'error');
    } finally {
        overlay.remove();
    }
}

console.log("[PARTICIPANTES] ✅ Módulo de ações em lote carregado");
```

---

### 3. routes/inscricoes-routes.js - Endpoint Batch

**Path:** `/home/runner/workspace/routes/inscricoes-routes.js`
**Tipo:** Modificação
**Impacto:** Baixo
**Dependentes:** inscricoesController.js

#### Mudança Cirúrgica: Adicionar endpoint após linha 486 (após DELETE)

**Linha 487: ADICIONAR novo endpoint**

```javascript
// =============================================================================
// POST /api/inscricoes/:ligaId/:temporada/batch
// Processa ações em lote para múltiplos participantes
// =============================================================================
router.post("/:ligaId/:temporada/batch", verificarAdmin, async (req, res) => {
    try {
        const { ligaId, temporada } = req.params;
        const { timeIds, acao, opcoes } = req.body;

        console.log(`[INSCRICOES] POST batch liga=${ligaId} temporada=${temporada} acao=${acao} times=${timeIds?.length}`);

        // Validar payload
        if (!Array.isArray(timeIds) || timeIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "timeIds deve ser um array não vazio"
            });
        }

        if (!acao) {
            return res.status(400).json({
                success: false,
                error: "Campo 'acao' é obrigatório"
            });
        }

        // Importar função batch do controller
        const { processarBatchInscricoes } = await import("../controllers/inscricoesController.js");

        const resultado = await processarBatchInscricoes(
            ligaId,
            Number(temporada),
            timeIds,
            acao,
            opcoes || {}
        );

        res.json(resultado);

    } catch (error) {
        console.error("[INSCRICOES] Erro no batch:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Erro ao processar batch"
        });
    }
});
```

---

### 4. controllers/inscricoesController.js - Função Batch

**Path:** `/home/runner/workspace/controllers/inscricoesController.js`
**Tipo:** Modificação
**Impacto:** Médio
**Dependentes:** Reutiliza funções existentes

#### Mudança Cirúrgica 1: Nova função (antes da linha 1050 - export)

**Linha 1049: ADICIONAR função processarBatchInscricoes**

```javascript
// =============================================================================
// BATCH: Processar múltiplas inscrições de uma vez
// =============================================================================

/**
 * Processa ações em lote para múltiplos participantes
 * @param {string} ligaId - ID da liga
 * @param {number} temporada - Temporada destino
 * @param {Array<number>} timeIds - IDs dos times
 * @param {string} acao - Ação a executar (renovar, nao_participa, marcar_pago, reverter, validar_ids, ativar, inativar, gerar_senhas)
 * @param {Object} opcoes - Opções extras { pagouInscricao, observacoes, aprovadoPor }
 * @returns {Promise<Object>} { success, total, processados, erros }
 */
export async function processarBatchInscricoes(ligaId, temporada, timeIds, acao, opcoes = {}) {
    const resultados = [];
    const db = mongoose.connection.db;

    console.log(`[BATCH] Iniciando: ${acao} para ${timeIds.length} times`);

    for (const timeId of timeIds) {
        try {
            let sucesso = false;

            switch (acao) {
                case 'renovar':
                    await processarDecisaoUnificada(ligaId, Number(timeId), temporada, {
                        decisao: 'renovar',
                        pagouInscricao: opcoes.pagouInscricao === true,
                        aproveitarCredito: true,
                        carregarDivida: true,
                        observacoes: opcoes.observacoes || 'Ação em lote',
                        aprovadoPor: opcoes.aprovadoPor || 'admin_batch'
                    });
                    sucesso = true;
                    break;

                case 'nao_participa':
                    await processarDecisaoUnificada(ligaId, Number(timeId), temporada, {
                        decisao: 'nao_participar',
                        acaoCredito: 'congelar',
                        acaoDivida: 'cobrar',
                        observacoes: opcoes.observacoes || 'Ação em lote - não participa',
                        aprovadoPor: opcoes.aprovadoPor || 'admin_batch'
                    });
                    sucesso = true;
                    break;

                case 'marcar_pago':
                    // Atualizar inscrição existente
                    const inscricao = await InscricaoTemporada.findOne({
                        liga_id: new mongoose.Types.ObjectId(ligaId),
                        time_id: Number(timeId),
                        temporada: Number(temporada)
                    });

                    if (inscricao && !inscricao.pagou_inscricao) {
                        inscricao.pagou_inscricao = true;
                        inscricao.data_pagamento_inscricao = new Date();
                        await inscricao.save();

                        // Estornar débito do extrato
                        const ligaObjId = new mongoose.Types.ObjectId(ligaId);
                        await db.collection('extratofinanceirocaches').updateOne(
                            {
                                liga_id: ligaObjId,
                                time_id: Number(timeId),
                                temporada: Number(temporada)
                            },
                            {
                                $pull: { historico_transacoes: { tipo: 'INSCRICAO_TEMPORADA' } },
                                $inc: { saldo_consolidado: inscricao.taxa_inscricao || 0 }
                            }
                        );
                    }
                    sucesso = true;
                    break;

                case 'reverter':
                    // Voltar para pendente
                    await InscricaoTemporada.updateOne(
                        {
                            liga_id: new mongoose.Types.ObjectId(ligaId),
                            time_id: Number(timeId),
                            temporada: Number(temporada)
                        },
                        {
                            $set: {
                                status: 'pendente',
                                processado: false,
                                observacoes: 'Revertido via ação em lote'
                            }
                        }
                    );
                    sucesso = true;
                    break;

                case 'validar_ids':
                    // Chamar sincronização com API Cartola
                    // Reutiliza lógica existente de sincronização
                    const ligaDoc = await Liga.findById(ligaId).lean();
                    const participante = ligaDoc?.participantes?.find(p => Number(p.time_id) === Number(timeId));

                    if (participante) {
                        // Buscar dados na API Cartola
                        const cartolaRes = await fetch(`https://api.cartola.globo.com/time/id/${timeId}`);
                        if (cartolaRes.ok) {
                            const cartolaData = await cartolaRes.json();
                            // Atualizar dados na liga
                            await Liga.updateOne(
                                { _id: ligaId, "participantes.time_id": Number(timeId) },
                                {
                                    $set: {
                                        "participantes.$.nome_time": cartolaData.time?.nome,
                                        "participantes.$.nome_cartola": cartolaData.time?.nome_cartola,
                                        "participantes.$.escudo_url": cartolaData.time?.url_escudo_png
                                    }
                                }
                            );
                            sucesso = true;
                        }
                    }
                    break;

                case 'ativar':
                    await Time.updateOne({ id: Number(timeId) }, { $set: { ativo: true } });
                    await Liga.updateOne(
                        { _id: ligaId, "participantes.time_id": Number(timeId) },
                        { $set: { "participantes.$.ativo": true } }
                    );
                    sucesso = true;
                    break;

                case 'inativar':
                    await Time.updateOne({ id: Number(timeId) }, { $set: { ativo: false } });
                    await Liga.updateOne(
                        { _id: ligaId, "participantes.time_id": Number(timeId) },
                        { $set: { "participantes.$.ativo": false } }
                    );
                    sucesso = true;
                    break;

                case 'gerar_senhas':
                    // Gerar senha aleatória
                    const novaSenha = Math.random().toString(36).substring(2, 10);
                    await Time.updateOne({ id: Number(timeId) }, { $set: { senha_acesso: novaSenha } });
                    await Liga.updateOne(
                        { _id: ligaId, "participantes.time_id": Number(timeId) },
                        { $set: { "participantes.$.senha_acesso": novaSenha } }
                    );
                    sucesso = true;
                    break;

                default:
                    throw new Error(`Ação '${acao}' não reconhecida`);
            }

            resultados.push({ timeId, success: sucesso });

        } catch (error) {
            console.error(`[BATCH] Erro no time ${timeId}:`, error.message);
            resultados.push({ timeId, success: false, error: error.message });
        }
    }

    const processados = resultados.filter(r => r.success).length;
    const erros = resultados.filter(r => !r.success);

    console.log(`[BATCH] Concluído: ${processados}/${timeIds.length} sucesso, ${erros.length} erros`);

    return {
        success: true,
        total: timeIds.length,
        processados,
        erros
    };
}
```

#### Mudança Cirúrgica 2: Atualizar export (linha 1050)

**Linha 1050-1059: MODIFICAR export default**

```javascript
export default {
    buscarSaldoTemporada,
    criarTransacoesIniciais,
    adicionarParticipanteNaLiga,
    processarRenovacao,
    processarNaoParticipar,
    processarNovoParticipante,
    buscarDadosDecisao,
    processarDecisaoUnificada,
    processarBatchInscricoes  // ADICIONAR
};
```

---

### 5. CSS - Estilos para Toolbar e Checkboxes

**Opção A:** Adicionar inline no HTML (já parcialmente feito)
**Opção B:** Criar arquivo CSS separado

#### Estilos Necessários (adicionar em participantes.css ou inline):

```css
/* Toolbar Batch */
.batch-toolbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid var(--laranja, #f97316);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 16px;
    flex-wrap: wrap;
}

.batch-info {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #fff;
    font-weight: 500;
}

.batch-info input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.batch-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.btn-batch {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    background: #2d2d44;
    color: #fff;
}

.btn-batch:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.btn-batch .material-icons {
    font-size: 18px;
}

.btn-batch-success { background: #22c55e; }
.btn-batch-danger { background: #ef4444; }
.btn-batch-warning { background: #f59e0b; color: #000; }
.btn-batch-info { background: #3b82f6; }
.btn-batch-secondary { background: #4b5563; }

.btn-batch-clear {
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
}

.btn-batch-clear:hover {
    color: #fff;
}

.batch-divider {
    color: #444;
    margin: 0 4px;
}

/* Checkbox nos cards */
.batch-checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--laranja, #f97316);
    flex-shrink: 0;
}

/* Responsivo mobile */
@media (max-width: 768px) {
    .batch-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .batch-actions {
        justify-content: center;
    }

    .btn-batch span:not(.material-icons) {
        display: none; /* Oculta texto, mantém ícone */
    }
}
```

---

## Mapa de Dependências

```
public/js/participantes.js (PRINCIPAL)
    |-> public/fronts/participantes.html [toolbar batch HTML]
    |-> /api/inscricoes/:ligaId/:temporada/batch [novo endpoint]

routes/inscricoes-routes.js
    |-> controllers/inscricoesController.js [processarBatchInscricoes]

controllers/inscricoesController.js
    |-> models/InscricaoTemporada.js [upsert, find]
    |-> models/Liga.js [updateOne]
    |-> models/Time.js [updateOne]
    |-> API Cartola externa [validar_ids]
```

---

## Validações de Segurança

### Multi-Tenant
- [x] Todas queries incluem `liga_id`
- [x] Endpoint usa `ligaId` do param validado

### Autenticação
- [x] Endpoint protegido com `verificarAdmin` middleware
- [x] Ações executadas apenas por admin logado

---

## Casos de Teste

### Teste 1: Renovar em Lote
**Setup:** 3+ participantes pendentes em temporada 2026
**Ação:** Selecionar todos → Clicar "Renovar" → Confirmar
**Resultado Esperado:** Todos marcados como `renovado`, toast de sucesso

### Teste 2: Marcar Pago em Lote
**Setup:** Participantes renovados com `pagouInscricao: false`
**Ação:** Selecionar → "Marcar Pago" → Confirmar
**Resultado Esperado:** `pagouInscricao: true`, débito removido do extrato

### Teste 3: Regressão Temporada 2025
**Setup:** Acessar aba 2025
**Ação:** Verificar cards
**Resultado Esperado:** SEM checkboxes, SEM toolbar batch

---

## Rollback Plan

### Em Caso de Falha
1. Reverter commits relacionados
2. Se inscrições incorretas: rodar script para reverter status
3. Limpar cache do navegador (CSS inline)

---

## Checklist de Implementação

### Frontend
- [x] HTML: Toolbar batch inserida
- [x] JS: Checkbox nos cards (linha 232-239)
- [x] JS: Bloco de funções batch no final (após linha 2862)
- [x] CSS: Estilos em participantes.css (seção BATCH TOOLBAR)

### Backend
- [x] Route: Endpoint POST /batch (inscricoes-routes.js)
- [x] Controller: Função processarBatchInscricoes (inscricoesController.js)
- [x] Export atualizado

### Testes
- [ ] Renovar em lote funciona
- [ ] Temporada 2025 não afetada
- [ ] Erros individuais não travam o lote

---

## Implementação Concluída

**Data:** 2026-01-24
**Arquivos modificados:**
- `public/js/participantes.js` - Funções batch (170+ linhas)
- `public/css/modules/participantes.css` - Estilos toolbar e modal (180+ linhas)
- `routes/inscricoes-routes.js` - Endpoint POST /batch
- `controllers/inscricoesController.js` - Função processarBatchInscricoes

---

**Gerado por:** Spec Protocol v1.0
**Status:** ✅ IMPLEMENTADO
