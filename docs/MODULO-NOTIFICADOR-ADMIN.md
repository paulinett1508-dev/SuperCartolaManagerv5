# MÓDULO NOTIFICADOR - Interface Admin

**Localização:** `/admin/operacoes/notificador`
**Objetivo:** Criar e gerenciar avisos para participantes (globais ou segmentados)

---

## 🎨 Mockup da Interface

### Layout Principal

```
┌────────────────────────────────────────────────────────────────────────┐
│ OPERAÇÕES > NOTIFICADOR                                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [+ Novo Aviso]                                 [🔄 Sincronizar Todos] │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🟢 Rodada 12 Consolidada                    [Toggle: ✅ ATIVO]   │  │
│  │ Enviado: 01/02/2026 22:35                                        │  │
│  │ Global • 247 leituras • Visível no app                           │  │
│  │                                                                   │  │
│  │ [📤 Enviar para App] [✏️ Editar] [🗑️ Deletar]                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🟡 Mercado Fecha em 2h                      [Toggle: ⚪ INATIVO] │  │
│  │ Criado: 01/02/2026 18:00                                         │  │
│  │ Liga: Paulistão • Rascunho (não enviado)                         │  │
│  │                                                                   │  │
│  │ [📤 Enviar para App] [✏️ Editar] [🗑️ Deletar]                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🔵 Novas Regras Disponíveis                [Toggle: ✅ ATIVO]   │  │
│  │ Enviado: 31/01/2026 14:20 • Expirou: 07/02/2026                 │  │
│  │ Global • 453 leituras • ⚠️ Expira em 2 dias                      │  │
│  │                                                                   │  │
│  │ [📤 Enviar para App] [✏️ Editar] [🗑️ Deletar]                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Estados do Toggle

**✅ ATIVO (Verde):**
- Aviso está **publicado** no app dos participantes
- Visível na seção "Avisos" da home
- Contabiliza leituras

**⚪ INATIVO (Cinza):**
- Aviso existe no banco mas **NÃO está visível** no app
- Estado "rascunho" ou "despublicado"
- Não aparece para participantes

**🔴 EXPIRADO (Vermelho):**
- Data de expiração passou
- Automaticamente removido do app
- Apenas visível no histórico admin

---

## 🔄 Fluxo de Publicação e Sincronização

### Comportamento do Botão "Enviar para App"

**Função:** Sincronizar estado do aviso (ativo/inativo) com o app dos participantes

#### Quando o Toggle está ATIVO (✅)
```
┌─────────────────────────────────────────┐
│ Status: ATIVO                           │
│                                         │
│ [📤 Enviar para App]  ← Botão ATIVO    │
│                                         │
│ Ação ao clicar:                         │
│ ✅ Publica aviso no app                 │
│ ✅ Atualiza campo "publicadoEm"         │
│ ✅ Torna visível na home participantes  │
│ ✅ Toast: "Aviso publicado com sucesso" │
└─────────────────────────────────────────┘
```

#### Quando o Toggle está INATIVO (⚪)
```
┌─────────────────────────────────────────┐
│ Status: INATIVO                         │
│                                         │
│ [📤 Enviar para App]  ← Botão INATIVO  │
│                                         │
│ Ação ao clicar:                         │
│ ❌ Remove aviso do app                  │
│ ❌ Atualiza campo "despublicadoEm"      │
│ ❌ Oculta da home participantes         │
│ ✅ Toast: "Aviso removido do app"      │
└─────────────────────────────────────────┘
```

### Estados Visuais do Botão

```javascript
// Estado ATIVO - Botão verde de publicar
<button class="btn-publicar bg-green-600 hover:bg-green-700">
    <span class="material-icons">publish</span>
    Enviar para App
</button>

// Estado INATIVO - Botão vermelho de remover
<button class="btn-remover bg-red-600 hover:bg-red-700">
    <span class="material-icons">unpublished</span>
    Remover do App
</button>

// Estado SINCRONIZANDO - Loading
<button class="btn-loading bg-gray-600" disabled>
    <span class="material-icons animate-spin">sync</span>
    Sincronizando...
</button>
```

### Fluxo Completo de Vida de um Aviso

```
1. CRIAÇÃO
   ├─ Admin clica "+ Novo Aviso"
   ├─ Preenche formulário
   ├─ Salva (cria com ativo=false por padrão)
   └─ Estado: RASCUNHO (⚪)

2. PUBLICAÇÃO
   ├─ Admin ativa toggle (✅)
   ├─ Clica "Enviar para App"
   ├─ Backend atualiza: { ativo: true, publicadoEm: Date.now() }
   └─ Estado: PUBLICADO (✅) → Visível no app

3. EDIÇÃO (enquanto publicado)
   ├─ Admin clica "Editar"
   ├─ Modifica texto/categoria
   ├─ Salva alterações
   ├─ Clica "Enviar para App" novamente
   └─ Estado: PUBLICADO (✅) → Alterações sincronizadas

4. DESPUBLICAR
   ├─ Admin desativa toggle (⚪)
   ├─ Clica "Remover do App"
   ├─ Backend atualiza: { ativo: false, despublicadoEm: Date.now() }
   └─ Estado: DESPUBLICADO (⚪) → Oculto do app

5. REPUBLICA (reativar aviso antigo)
   ├─ Admin ativa toggle novamente (✅)
   ├─ Clica "Enviar para App"
   └─ Estado: PUBLICADO (✅) → Volta a aparecer no app

6. EXPIRAÇÃO AUTOMÁTICA
   ├─ Data expira (cron job verifica)
   ├─ Sistema atualiza: { ativo: false, expirado: true }
   └─ Estado: EXPIRADO (🔴) → Removido automaticamente
```

### Indicadores Visuais no Admin

```html
<!-- Aviso ATIVO e PUBLICADO -->
<div class="aviso-card bg-green-900/20 border-green-500">
    <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
        <span class="text-green-400 text-xs font-bold uppercase">Visível no App</span>
    </div>
</div>

<!-- Aviso INATIVO (Rascunho) -->
<div class="aviso-card bg-gray-800 border-gray-600">
    <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-gray-500"></span>
        <span class="text-gray-400 text-xs font-bold uppercase">Rascunho (Não Publicado)</span>
    </div>
</div>

<!-- Aviso EXPIRADO -->
<div class="aviso-card bg-red-900/20 border-red-500 opacity-60">
    <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-red-500"></span>
        <span class="text-red-400 text-xs font-bold uppercase">Expirado • Removido Automaticamente</span>
    </div>
</div>
```

---

## 📝 Modal "Novo Aviso"

### Estrutura do Formulário

```html
<div class="super-modal-overlay" id="modalNovoAviso">
    <div class="super-modal-container" style="max-width: 600px;">
        <div class="super-modal-header">
            <h2 class="font-russo text-xl">Criar Novo Aviso</h2>
            <button class="super-modal-close">&times;</button>
        </div>

        <form id="formNovoAviso" class="super-modal-body space-y-4">
            <!-- Categoria -->
            <div class="form-group">
                <label class="block text-sm font-semibold mb-2">
                    Categoria
                </label>
                <div class="grid grid-cols-4 gap-2">
                    <button type="button" class="categoria-btn" data-categoria="success">
                        <span class="material-icons text-green-500">check_circle</span>
                        <span class="text-xs">Sucesso</span>
                    </button>
                    <button type="button" class="categoria-btn" data-categoria="warning">
                        <span class="material-icons text-yellow-500">warning</span>
                        <span class="text-xs">Alerta</span>
                    </button>
                    <button type="button" class="categoria-btn" data-categoria="info">
                        <span class="material-icons text-blue-500">info</span>
                        <span class="text-xs">Info</span>
                    </button>
                    <button type="button" class="categoria-btn active" data-categoria="urgent">
                        <span class="material-icons text-red-500">error</span>
                        <span class="text-xs">Urgente</span>
                    </button>
                </div>
            </div>

            <!-- Título -->
            <div class="form-group">
                <label for="avisoTitulo" class="block text-sm font-semibold mb-2">
                    Título do Aviso
                </label>
                <input type="text"
                       id="avisoTitulo"
                       class="form-input"
                       placeholder="Ex: Rodada 12 Finalizada"
                       maxlength="50"
                       required>
                <span class="text-xs text-gray-500">Máximo 50 caracteres</span>
            </div>

            <!-- Mensagem -->
            <div class="form-group">
                <label for="avisoMensagem" class="block text-sm font-semibold mb-2">
                    Mensagem
                </label>
                <textarea id="avisoMensagem"
                          class="form-input"
                          rows="3"
                          placeholder="Descreva o aviso para os participantes..."
                          maxlength="200"
                          required></textarea>
                <span class="text-xs text-gray-500">Máximo 200 caracteres</span>
            </div>

            <!-- Segmentação -->
            <div class="form-group">
                <label class="block text-sm font-semibold mb-2">
                    Destinatários
                </label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="segmentacao" value="global" checked>
                        <span class="ml-2">Global (todos os participantes)</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="segmentacao" value="liga">
                        <span class="ml-2">Liga específica</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="segmentacao" value="participante">
                        <span class="ml-2">Participante específico</span>
                    </label>
                </div>
            </div>

            <!-- Select Liga (condicional) -->
            <div class="form-group hidden" id="selectLigaGroup">
                <label for="avisoLiga" class="block text-sm font-semibold mb-2">
                    Selecionar Liga
                </label>
                <select id="avisoLiga" class="form-input">
                    <option value="">-- Escolha uma liga --</option>
                    <!-- Preenchido via JS -->
                </select>
            </div>

            <!-- Select Participante (condicional) -->
            <div class="form-group hidden" id="selectParticipanteGroup">
                <label for="avisoParticipante" class="block text-sm font-semibold mb-2">
                    Selecionar Participante
                </label>
                <input type="text"
                       id="avisoParticipante"
                       class="form-input"
                       placeholder="Digite nome ou time ID...">
            </div>

            <!-- Expiração -->
            <div class="form-group">
                <label for="avisoExpiracao" class="block text-sm font-semibold mb-2">
                    Expiração
                </label>
                <select id="avisoExpiracao" class="form-input">
                    <option value="1">1 dia</option>
                    <option value="3">3 dias</option>
                    <option value="7" selected>7 dias (padrão)</option>
                    <option value="14">14 dias</option>
                    <option value="30">30 dias</option>
                </select>
            </div>

            <!-- Preview -->
            <div class="form-group">
                <label class="block text-sm font-semibold mb-2">
                    Preview do Aviso
                </label>
                <div id="avisoPreview" class="bg-gray-800 rounded-xl p-4 border-l-4 border-gray-500">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-gray-500">info</span>
                        <p class="font-russo text-sm uppercase text-white">Título do Aviso</p>
                    </div>
                    <p class="text-gray-400 text-sm">
                        Mensagem do aviso aparecerá aqui...
                    </p>
                </div>
            </div>
        </form>

        <div class="super-modal-footer flex gap-3 justify-end">
            <button type="button" class="btn-secondary" onclick="SuperModal.close('modalNovoAviso')">
                Cancelar
            </button>
            <button type="submit" form="formNovoAviso" class="btn-primary">
                Publicar Aviso
            </button>
        </div>
    </div>
</div>
```

---

## 🎨 CSS Específico

```css
/* Botões de Categoria */
.categoria-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--surface-card);
    border: 2px solid var(--border-subtle);
    cursor: pointer;
    transition: all 0.2s;
}

.categoria-btn:hover {
    background: var(--surface-card-hover);
    transform: translateY(-2px);
}

.categoria-btn.active {
    border-color: var(--module-saude-primary);
    background: var(--module-saude-muted);
}

/* Preview dinâmico */
#avisoPreview {
    transition: all 0.3s ease;
}

#avisoPreview.categoria-success {
    border-left-color: #10b981;
}

#avisoPreview.categoria-warning {
    border-left-color: #f59e0b;
}

#avisoPreview.categoria-info {
    border-left-color: #3b82f6;
}

#avisoPreview.categoria-urgent {
    border-left-color: #ef4444;
}

/* ===================================================================
   TOGGLE SWITCH ATIVO/INATIVO - Estilo Admin
   =================================================================== */

.toggle-switch-admin {
    position: relative;
    display: inline-block;
    width: 56px;
    height: 28px;
    cursor: pointer;
}

.toggle-switch-admin input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider-admin {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #4b5563; /* gray-600 */
    transition: 0.3s;
    border-radius: 28px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-slider-admin:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-switch-admin input:checked + .toggle-slider-admin {
    background-color: #10b981; /* green-500 */
}

.toggle-switch-admin input:checked + .toggle-slider-admin:before {
    transform: translateX(28px);
}

.toggle-switch-admin input:disabled + .toggle-slider-admin {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Labels dentro do toggle (opcional) */
.toggle-slider-admin::after {
    content: '✕';
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
    opacity: 0.7;
}

.toggle-switch-admin input:checked + .toggle-slider-admin::after {
    content: '✓';
    left: 8px;
    right: auto;
}

/* ===================================================================
   BOTÕES PEQUENOS (Ações no card)
   =================================================================== */

.btn-sm {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-sm:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-sm:active {
    transform: translateY(0);
}

.btn-sm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.btn-sm .material-icons {
    font-size: 16px;
}
```

---

## 💻 JavaScript do Modal

```javascript
// =====================================================================
// NOTIFICADOR-ADMIN.JS
// =====================================================================

let categoriaAtual = 'info';

// Inicializar listeners
document.addEventListener('DOMContentLoaded', () => {
    // Botões de categoria
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover active de todos
            document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('active'));

            // Adicionar active no clicado
            this.classList.add('active');
            categoriaAtual = this.dataset.categoria;

            // Atualizar preview
            atualizarPreview();
        });
    });

    // Input título e mensagem
    document.getElementById('avisoTitulo').addEventListener('input', atualizarPreview);
    document.getElementById('avisoMensagem').addEventListener('input', atualizarPreview);

    // Segmentação
    document.querySelectorAll('input[name="segmentacao"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const selectLigaGroup = document.getElementById('selectLigaGroup');
            const selectParticipanteGroup = document.getElementById('selectParticipanteGroup');

            selectLigaGroup.classList.add('hidden');
            selectParticipanteGroup.classList.add('hidden');

            if (this.value === 'liga') {
                selectLigaGroup.classList.remove('hidden');
            } else if (this.value === 'participante') {
                selectParticipanteGroup.classList.remove('hidden');
            }
        });
    });

    // Form submit
    document.getElementById('formNovoAviso').addEventListener('submit', handleSubmitAviso);
});

// Atualizar preview em tempo real
function atualizarPreview() {
    const preview = document.getElementById('avisoPreview');
    const titulo = document.getElementById('avisoTitulo').value || 'Título do Aviso';
    const mensagem = document.getElementById('avisoMensagem').value || 'Mensagem do aviso aparecerá aqui...';

    // Atualizar classe de categoria
    preview.className = `bg-gray-800 rounded-xl p-4 border-l-4 categoria-${categoriaAtual}`;

    // Cores dos ícones
    const iconColors = {
        success: 'text-green-500',
        warning: 'text-yellow-500',
        info: 'text-blue-500',
        urgent: 'text-red-500'
    };

    // Ícones por categoria
    const icons = {
        success: 'check_circle',
        warning: 'warning',
        info: 'info',
        urgent: 'error'
    };

    preview.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
            <span class="material-icons ${iconColors[categoriaAtual]}">${icons[categoriaAtual]}</span>
            <p class="font-russo text-sm uppercase text-white">${titulo}</p>
        </div>
        <p class="text-gray-400 text-sm">
            ${mensagem}
        </p>
    `;
}

// Submit do formulário
async function handleSubmitAviso(e) {
    e.preventDefault();

    const titulo = document.getElementById('avisoTitulo').value.trim();
    const mensagem = document.getElementById('avisoMensagem').value.trim();
    const segmentacao = document.querySelector('input[name="segmentacao"]:checked').value;
    const expiracao = parseInt(document.getElementById('avisoExpiracao').value);

    // Validações
    if (!titulo || !mensagem) {
        SuperModal.toast.error('Preencha todos os campos obrigatórios');
        return;
    }

    // Montar payload
    const payload = {
        titulo,
        mensagem,
        categoria: categoriaAtual,
        expiracao
    };

    // Adicionar segmentação
    if (segmentacao === 'liga') {
        const ligaId = document.getElementById('avisoLiga').value;
        if (!ligaId) {
            SuperModal.toast.error('Selecione uma liga');
            return;
        }
        payload.ligaId = ligaId;
    } else if (segmentacao === 'participante') {
        const timeId = document.getElementById('avisoParticipante').value.trim();
        if (!timeId) {
            SuperModal.toast.error('Digite o ID do participante');
            return;
        }
        payload.timeId = timeId;
    }

    try {
        // Enviar para API
        const response = await fetch('/api/admin/avisos/criar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao criar aviso');
        }

        SuperModal.toast.success('Aviso criado com sucesso!');
        SuperModal.close('modalNovoAviso');

        // Recarregar lista de avisos
        carregarAvisos();

        // Resetar formulário
        document.getElementById('formNovoAviso').reset();
        categoriaAtual = 'info';
        atualizarPreview();

    } catch (erro) {
        console.error('Erro ao criar aviso:', erro);
        SuperModal.toast.error(erro.message);
    }
}

// Carregar lista de avisos
async function carregarAvisos() {
    try {
        const response = await fetch('/api/admin/avisos/listar');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao carregar avisos');
        }

        renderizarListaAvisos(data.avisos);

    } catch (erro) {
        console.error('Erro ao carregar avisos:', erro);
        SuperModal.toast.error('Erro ao carregar avisos');
    }
}

// Renderizar lista de avisos
function renderizarListaAvisos(avisos) {
    const container = document.getElementById('listaAvisos');

    if (!avisos || avisos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <span class="material-icons text-5xl text-gray-600 mb-4">notifications_off</span>
                <p class="text-gray-400">Nenhum aviso criado ainda</p>
            </div>
        `;
        return;
    }

    const iconColors = {
        success: '🟢',
        warning: '🟡',
        info: '🔵',
        urgent: '🔴'
    };

    container.innerHTML = avisos.map(aviso => {
        const leituras = aviso.leitoPor?.length || 0;
        const segmentacao = aviso.ligaId
            ? `Liga: ${aviso.ligaNome}`
            : aviso.timeId
                ? `Participante: ${aviso.timeNome}`
                : 'Global';

        // Determinar estado do aviso
        const agora = new Date();
        const expirado = aviso.dataExpiracao && new Date(aviso.dataExpiracao) < agora;
        const ativo = aviso.ativo && !expirado;

        // Classes CSS por estado
        let cardClass = 'bg-gray-800 border-gray-600';
        let statusBadge = '';
        let statusDot = 'bg-gray-500';

        if (expirado) {
            cardClass = 'bg-red-900/20 border-red-500 opacity-60';
            statusBadge = '<span class="text-red-400 text-xs font-bold uppercase">🔴 Expirado</span>';
            statusDot = 'bg-red-500';
        } else if (ativo) {
            cardClass = 'bg-green-900/20 border-green-500';
            statusBadge = '<span class="text-green-400 text-xs font-bold uppercase">✅ Visível no App</span>';
            statusDot = 'bg-green-500 animate-pulse';
        } else {
            statusBadge = '<span class="text-gray-400 text-xs font-bold uppercase">⚪ Rascunho</span>';
        }

        // Botão de publicar/remover
        const btnPublicar = ativo
            ? `<button class="btn-sm bg-red-600 hover:bg-red-700 text-white" onclick="despublicarAviso('${aviso._id}')">
                   <span class="material-icons text-sm">unpublished</span>
                   Remover do App
               </button>`
            : `<button class="btn-sm bg-green-600 hover:bg-green-700 text-white" onclick="publicarAviso('${aviso._id}')">
                   <span class="material-icons text-sm">publish</span>
                   Enviar para App
               </button>`;

        // Toggle visual
        const toggleChecked = ativo ? 'checked' : '';
        const toggleClass = ativo ? 'bg-green-500' : 'bg-gray-600';

        return `
            <div class="rounded-lg p-4 mb-3 border-2 ${cardClass} transition-all">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="w-3 h-3 rounded-full ${statusDot}"></span>
                            <h4 class="font-russo text-white">
                                ${iconColors[aviso.categoria]} ${aviso.titulo}
                            </h4>
                        </div>
                        <p class="text-sm text-gray-400 mb-1">
                            ${aviso.publicadoEm
                                ? `Enviado: ${new Date(aviso.publicadoEm).toLocaleString('pt-BR')}`
                                : `Criado: ${new Date(aviso.dataCriacao).toLocaleString('pt-BR')}`
                            }
                        </p>
                        <p class="text-xs text-gray-500 mb-2">
                            ${segmentacao} • ${leituras} leituras
                        </p>
                        ${statusBadge}
                    </div>

                    <!-- Toggle Ativo/Inativo -->
                    <label class="toggle-switch-admin">
                        <input type="checkbox"
                               ${toggleChecked}
                               ${expirado ? 'disabled' : ''}
                               onchange="toggleAtivoAviso('${aviso._id}', this.checked)">
                        <span class="toggle-slider-admin ${toggleClass}"></span>
                    </label>
                </div>

                <!-- Ações -->
                <div class="flex gap-2 flex-wrap">
                    ${expirado ? '' : btnPublicar}
                    <button class="btn-sm bg-gray-700 hover:bg-gray-600 text-white"
                            onclick="editarAviso('${aviso._id}')">
                        <span class="material-icons text-sm">edit</span>
                        Editar
                    </button>
                    <button class="btn-sm bg-gray-700 hover:bg-gray-600 text-red-400"
                            onclick="deletarAviso('${aviso._id}')">
                        <span class="material-icons text-sm">delete</span>
                        Deletar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle ativo/inativo (apenas atualiza estado local, não sincroniza)
async function toggleAtivoAviso(avisoId, novoEstado) {
    try {
        const response = await fetch(`/api/admin/avisos/${avisoId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ativo: novoEstado })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao atualizar estado');
        }

        SuperModal.toast.info(
            novoEstado
                ? 'Status alterado para ATIVO. Clique em "Enviar para App" para publicar.'
                : 'Status alterado para INATIVO. Clique em "Remover do App" para despublicar.'
        );

        // Recarregar lista para atualizar UI
        carregarAvisos();

    } catch (erro) {
        console.error('Erro ao toggle aviso:', erro);
        SuperModal.toast.error(erro.message);
        // Recarregar para reverter toggle
        carregarAvisos();
    }
}

// Publicar aviso (sincronizar com app)
async function publicarAviso(avisoId) {
    try {
        const response = await fetch(`/api/admin/avisos/${avisoId}/publicar`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao publicar aviso');
        }

        SuperModal.toast.success('✅ Aviso publicado no app com sucesso!');
        carregarAvisos();

    } catch (erro) {
        console.error('Erro ao publicar aviso:', erro);
        SuperModal.toast.error(erro.message);
    }
}

// Despublicar aviso (remover do app)
async function despublicarAviso(avisoId) {
    const confirmado = await SuperModal.confirm({
        title: 'Remover Aviso do App',
        message: 'Tem certeza que deseja remover este aviso do app dos participantes? Ele ficará salvo como rascunho.',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    try {
        const response = await fetch(`/api/admin/avisos/${avisoId}/despublicar`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao despublicar aviso');
        }

        SuperModal.toast.success('✅ Aviso removido do app');
        carregarAvisos();

    } catch (erro) {
        console.error('Erro ao despublicar aviso:', erro);
        SuperModal.toast.error(erro.message);
    }
}

// Deletar aviso
async function deletarAviso(avisoId) {
    const confirmado = await SuperModal.confirm({
        title: 'Deletar Aviso',
        message: 'Tem certeza que deseja deletar este aviso? Esta ação não pode ser desfeita.',
        confirmText: 'Deletar',
        cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    try {
        const response = await fetch(`/api/admin/avisos/${avisoId}/deletar`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao deletar aviso');
        }

        SuperModal.toast.success('Aviso deletado');
        carregarAvisos();

    } catch (erro) {
        console.error('Erro ao deletar aviso:', erro);
        SuperModal.toast.error(erro.message);
    }
}

// Expor funções globalmente
window.NotificadorAdmin = {
    carregarAvisos,
    deletarAviso
};

// Carregar avisos ao iniciar
carregarAvisos();
```

---

## 🗄️ Backend - Controller e Rotas

### Controller: `controllers/avisos-admin-controller.js`

```javascript
// =====================================================================
// AVISOS-ADMIN-CONTROLLER.JS
// =====================================================================
const { ObjectId } = require('mongodb');
const clientPromise = require('../config/mongodb');

/**
 * Criar novo aviso
 * POST /api/admin/avisos/criar
 */
async function criarAviso(req, res) {
    try {
        const { titulo, mensagem, categoria, ligaId, timeId, expiracao } = req.body;

        // Validações
        if (!titulo || !mensagem || !categoria) {
            return res.status(400).json({
                success: false,
                erro: 'Campos obrigatórios: titulo, mensagem, categoria'
            });
        }

        const categoriasValidas = ['success', 'warning', 'info', 'urgent'];
        if (!categoriasValidas.includes(categoria)) {
            return res.status(400).json({
                success: false,
                erro: 'Categoria inválida'
            });
        }

        const client = await clientPromise;
        const db = client.db();

        // Calcular data de expiração
        const diasExpiracao = expiracao || 7;
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracao);

        // Montar documento
        const novoAviso = {
            titulo,
            mensagem,
            categoria,
            ligaId: ligaId || null,
            timeId: timeId || null,
            dataCriacao: new Date(),
            dataExpiracao,
            ativo: true,
            leitoPor: [],
            criadoPor: req.session.usuario.email
        };

        const result = await db.collection('avisos').insertOne(novoAviso);

        res.json({
            success: true,
            mensagem: 'Aviso criado com sucesso',
            avisoId: result.insertedId
        });

    } catch (erro) {
        console.error('[AVISOS] Erro ao criar:', erro);
        res.status(500).json({
            success: false,
            erro: 'Erro interno ao criar aviso'
        });
    }
}

/**
 * Listar avisos (admin)
 * GET /api/admin/avisos/listar
 */
async function listarAvisos(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const avisos = await db.collection('avisos')
            .find({ ativo: true })
            .sort({ dataCriacao: -1 })
            .limit(50)
            .toArray();

        // Enriquecer com nomes de ligas/participantes
        for (let aviso of avisos) {
            if (aviso.ligaId) {
                const liga = await db.collection('ligas').findOne({ liga_id: aviso.ligaId });
                aviso.ligaNome = liga?.nome || 'Liga Desconhecida';
            }
            if (aviso.timeId) {
                const time = await db.collection('times').findOne({ id: Number(aviso.timeId) });
                aviso.timeNome = time?.nome_time || 'Time Desconhecido';
            }
        }

        res.json({
            success: true,
            avisos
        });

    } catch (erro) {
        console.error('[AVISOS] Erro ao listar:', erro);
        res.status(500).json({
            success: false,
            erro: 'Erro interno ao listar avisos'
        });
    }
}

/**
 * Toggle ativo/inativo (apenas atualiza estado, não sincroniza)
 * PATCH /api/admin/avisos/:id/toggle
 */
async function toggleAtivoAviso(req, res) {
    try {
        const { id } = req.params;
        const { ativo } = req.body;

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({
                success: false,
                erro: 'Campo "ativo" deve ser boolean'
            });
        }

        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('avisos').updateOne(
            { _id: new ObjectId(id) },
            { $set: { ativo } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                erro: 'Aviso não encontrado'
            });
        }

        res.json({
            success: true,
            mensagem: `Status alterado para ${ativo ? 'ATIVO' : 'INATIVO'}`
        });

    } catch (erro) {
        console.error('[AVISOS] Erro ao toggle:', erro);
        res.status(500).json({
            success: false,
            erro: 'Erro interno ao alterar status'
        });
    }
}

/**
 * Publicar aviso (sincronizar com app)
 * POST /api/admin/avisos/:id/publicar
 */
async function publicarAviso(req, res) {
    try {
        const { id } = req.params;

        const client = await clientPromise;
        const db = client.db();

        // Verificar se aviso existe e está ativo
        const aviso = await db.collection('avisos').findOne({ _id: new ObjectId(id) });

        if (!aviso) {
            return res.status(404).json({
                success: false,
                erro: 'Aviso não encontrado'
            });
        }

        if (!aviso.ativo) {
            return res.status(400).json({
                success: false,
                erro: 'Aviso deve estar ATIVO para ser publicado. Ative o toggle primeiro.'
            });
        }

        // Atualizar com timestamp de publicação
        const result = await db.collection('avisos').updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    publicadoEm: new Date(),
                    sincronizadoComApp: true
                },
                $unset: { despublicadoEm: "" }
            }
        );

        res.json({
            success: true,
            mensagem: 'Aviso publicado no app com sucesso'
        });

        // Log de auditoria
        console.log(`[AVISOS] Publicado: ${aviso.titulo} por ${req.session.usuario.email}`);

    } catch (erro) {
        console.error('[AVISOS] Erro ao publicar:', erro);
        res.status(500).json({
            success: false,
            erro: 'Erro interno ao publicar aviso'
        });
    }
}

/**
 * Despublicar aviso (remover do app)
 * POST /api/admin/avisos/:id/despublicar
 */
async function despublicarAviso(req, res) {
    try {
        const { id } = req.params;

        const client = await clientPromise;
        const db = client.db();

        // Verificar se aviso existe
        const aviso = await db.collection('avisos').findOne({ _id: new ObjectId(id) });

        if (!aviso) {
            return res.status(404).json({
                success: false,
                erro: 'Aviso não encontrado'
            });
        }

        // Atualizar: marcar como inativo + timestamp de despublicação
        const result = await db.collection('avisos').updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ativo: false,
                    despublicadoEm: new Date(),
                    sincronizadoComApp: false
                }
            }
        );

        res.json({
            success: true,
            mensagem: 'Aviso removido do app'
        });

        // Log de auditoria
        console.log(`[AVISOS] Despublicado: ${aviso.titulo} por ${req.session.usuario.email}`);

    } catch (erro) {
        console.error('[AVISOS] Erro ao despublicar:', erro);
        res.status(500).json({
            success: false,
            erro: 'Erro interno ao despublicar aviso'
        });
    }
}

/**
 * Deletar aviso (permanente)
 * DELETE /api/admin/avisos/:id/deletar
 */
async function deletarAviso(req, res) {
    try {
        const { id } = req.params;

        const client = await clientPromise;
        const db = client.db();

        // Hard delete (remover permanentemente)
        const result = await db.collection('avisos').deleteOne(
            { _id: new ObjectId(id) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                erro: 'Aviso não encontrado'
            });
        }

        res.json({
            success: true,
            mensagem: 'Aviso deletado permanentemente'
        });

    } catch (erro) {
        console.error('[AVISOS] Erro ao deletar:', erro);
        res.status(500).json({
            success: false,
            erro: 'Erro interno ao deletar aviso'
        });
    }
}

module.exports = {
    criarAviso,
    listarAvisos,
    toggleAtivoAviso,
    publicarAviso,
    despublicarAviso,
    deletarAviso
};
```

### Rotas: `routes/avisos-admin.js`

```javascript
const express = require('express');
const router = express.Router();
const { isAdminAutorizado } = require('../middleware/auth');
const {
    criarAviso,
    listarAvisos,
    toggleAtivoAviso,
    publicarAviso,
    despublicarAviso,
    deletarAviso
} = require('../controllers/avisos-admin-controller');

// Todas as rotas exigem autenticação admin
router.use(isAdminAutorizado);

// CRUD básico
router.post('/criar', criarAviso);
router.get('/listar', listarAvisos);
router.delete('/:id/deletar', deletarAviso);

// Sincronização com app
router.patch('/:id/toggle', toggleAtivoAviso);       // Apenas muda estado local
router.post('/:id/publicar', publicarAviso);         // Sincroniza: publica no app
router.post('/:id/despublicar', despublicarAviso);   // Sincroniza: remove do app

module.exports = router;
```

**Registrar no `index.js`:**
```javascript
app.use('/api/admin/avisos', require('./routes/avisos-admin'));
```

### Tabela de Endpoints

| Método | Endpoint | Função | Efeito no App |
|--------|----------|--------|---------------|
| **POST** | `/criar` | Criar novo aviso | ❌ Não (criado como rascunho) |
| **GET** | `/listar` | Listar todos os avisos | - |
| **PATCH** | `/:id/toggle` | Alterar estado ativo/inativo | ❌ Não (apenas muda flag) |
| **POST** | `/:id/publicar` | Publicar aviso no app | ✅ **SIM** (torna visível) |
| **POST** | `/:id/despublicar` | Remover aviso do app | ✅ **SIM** (oculta) |
| **DELETE** | `/:id/deletar` | Deletar permanentemente | ✅ **SIM** (se publicado) |

---

## 🗄️ Schema MongoDB Atualizado

### Collection `avisos`

```javascript
{
  _id: ObjectId,

  // Conteúdo do aviso
  titulo: String,              // "Rodada 12 Consolidada"
  mensagem: String,            // "Confira os resultados..."
  categoria: String,           // "success" | "warning" | "info" | "urgent"

  // Segmentação (opcional)
  ligaId: String,              // null = global
  timeId: String,              // null = para toda a liga

  // Estado e sincronização
  ativo: Boolean,              // true = habilitado | false = desabilitado
  sincronizadoComApp: Boolean, // true = publicado | false = rascunho

  // Lifecycle (timestamps)
  dataCriacao: Date,           // Quando foi criado
  dataExpiracao: Date,         // Data de expiração automática
  publicadoEm: Date,           // Quando foi publicado (primeira vez)
  despublicadoEm: Date,        // Quando foi despublicado (última vez)

  // Tracking
  leitoPor: [String],          // Array de timeIds que leram
  criadoPor: String,           // Email do admin que criou

  // Auditoria
  editadoPor: [                // Histórico de edições
    {
      admin: String,
      data: Date,
      alteracoes: Object
    }
  ]
}
```

### Índices Recomendados

```javascript
// Índice composto para busca eficiente
db.avisos.createIndex({ ativo: 1, sincronizadoComApp: 1, dataExpiracao: 1 });

// Índice para busca por liga/time
db.avisos.createIndex({ ligaId: 1, timeId: 1 });

// Índice para expiração automática (TTL)
db.avisos.createIndex({ dataExpiracao: 1 }, { expireAfterSeconds: 0 });
```

### Exemplos de Documentos

**Aviso PUBLICADO (Visível no app):**
```json
{
  "_id": ObjectId("..."),
  "titulo": "Rodada 12 Consolidada",
  "mensagem": "Os resultados já estão disponíveis!",
  "categoria": "success",
  "ligaId": null,
  "timeId": null,
  "ativo": true,
  "sincronizadoComApp": true,
  "dataCriacao": ISODate("2026-02-01T22:30:00Z"),
  "dataExpiracao": ISODate("2026-02-08T22:30:00Z"),
  "publicadoEm": ISODate("2026-02-01T22:35:00Z"),
  "leitoPor": ["13935277", "87654321"],
  "criadoPor": "admin@superCartola.com"
}
```

**Aviso RASCUNHO (Não visível):**
```json
{
  "_id": ObjectId("..."),
  "titulo": "Mercado Fecha em 2h",
  "mensagem": "Última chance de fazer trocas!",
  "categoria": "warning",
  "ligaId": "paulistao-2026",
  "timeId": null,
  "ativo": false,
  "sincronizadoComApp": false,
  "dataCriacao": ISODate("2026-02-01T18:00:00Z"),
  "dataExpiracao": ISODate("2026-02-01T20:00:00Z"),
  "leitoPor": [],
  "criadoPor": "admin@superCartola.com"
}
```

**Aviso DESPUBLICADO (Foi publicado, agora oculto):**
```json
{
  "_id": ObjectId("..."),
  "titulo": "Manutenção Programada",
  "mensagem": "Sistema ficará offline das 2h às 4h",
  "categoria": "urgent",
  "ligaId": null,
  "timeId": null,
  "ativo": false,
  "sincronizadoComApp": false,
  "dataCriacao": ISODate("2026-02-01T10:00:00Z"),
  "dataExpiracao": ISODate("2026-02-02T04:00:00Z"),
  "publicadoEm": ISODate("2026-02-01T10:05:00Z"),
  "despublicadoEm": ISODate("2026-02-01T15:00:00Z"),
  "leitoPor": ["13935277", "87654321", "11223344"],
  "criadoPor": "admin@superCartola.com"
}
```

---

## 📊 Diagrama de Fluxo Visual

```
╔══════════════════════════════════════════════════════════════════════╗
║                    CICLO DE VIDA DO AVISO                            ║
╚══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN CRIA AVISO                                                    │
│  [+ Novo Aviso] → Preenche formulário → [Salvar]                    │
│                                                                       │
│  Estado inicial: { ativo: false, sincronizadoComApp: false }         │
│  Status: ⚪ RASCUNHO                                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN ATIVA TOGGLE                                                  │
│  [Toggle ⚪ OFF] → Clica → [Toggle ✅ ON]                           │
│                                                                       │
│  Endpoint: PATCH /avisos/:id/toggle                                  │
│  Atualiza: { ativo: true }                                           │
│  Status: ⚪ RASCUNHO (ainda NÃO visível no app)                     │
│                                                                       │
│  ⚠️ IMPORTANTE: Apenas mudar toggle NÃO publica no app!             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN CLICA "ENVIAR PARA APP"                                       │
│  [📤 Enviar para App] → Clica                                       │
│                                                                       │
│  Endpoint: POST /avisos/:id/publicar                                 │
│  Atualiza: { sincronizadoComApp: true, publicadoEm: Date.now() }    │
│  Status: ✅ PUBLICADO (VISÍVEL NO APP)                              │
│                                                                       │
│  ✅ Participantes veem o aviso na home                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ├────────────────────────────────────────┐
                           │                                        │
                           ▼                                        ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────┐
│  ADMIN QUER REMOVER                  │  │  DATA EXPIRA AUTOMATICAMENTE   │
│  [Toggle ✅ ON] → Clica → [⚪ OFF]  │  │  (Cron job verifica)           │
└───────────────┬──────────────────────┘  └──────────┬─────────────────────┘
                │                                     │
                ▼                                     ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────┐
│  Status: ⚪ INATIVO (toggle OFF)     │  │  Status: 🔴 EXPIRADO           │
│  Ainda VISÍVEL no app                │  │  REMOVIDO automaticamente      │
│  (precisa despublicar)               │  │                                │
└───────────────┬──────────────────────┘  └────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ADMIN CLICA "REMOVER DO APP"                                         │
│  [📤 Remover do App] → Clica                                         │
│                                                                        │
│  Endpoint: POST /avisos/:id/despublicar                               │
│  Atualiza: { ativo: false, sincronizadoComApp: false,                │
│              despublicadoEm: Date.now() }                             │
│  Status: ⚪ DESPUBLICADO (OCULTO DO APP)                             │
│                                                                        │
│  ❌ Participantes NÃO veem mais o aviso                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Tabela de Comportamento

| Ação Admin | Toggle Estado | Sincronizado | Visível no App? | Botão Exibido |
|------------|---------------|--------------|-----------------|---------------|
| **Cria aviso** | ⚪ INATIVO | ❌ Não | ❌ Não | "Enviar para App" (verde) |
| **Ativa toggle** | ✅ ATIVO | ❌ Não | ❌ Não | "Enviar para App" (verde) |
| **Clica "Enviar"** | ✅ ATIVO | ✅ Sim | ✅ **SIM** | "Remover do App" (vermelho) |
| **Desativa toggle** | ⚪ INATIVO | ✅ Sim | ✅ **SIM** | "Remover do App" (vermelho) |
| **Clica "Remover"** | ⚪ INATIVO | ❌ Não | ❌ Não | "Enviar para App" (verde) |
| **Data expira** | 🔴 EXPIRADO | ❌ Não | ❌ Não | - (sem ação) |

### Casos de Uso Práticos

**1. Criar e publicar imediatamente:**
```
1. Criar aviso (toggle OFF por padrão)
2. Ativar toggle (ON)
3. Clicar "Enviar para App"
✅ Resultado: Publicado e visível
```

**2. Criar rascunho, publicar depois:**
```
1. Criar aviso (toggle OFF)
2. Deixar como está (não clicar em nada)
3. [Dias depois] Ativar toggle (ON)
4. Clicar "Enviar para App"
✅ Resultado: Publicado quando admin decidir
```

**3. Remover aviso urgente:**
```
1. Aviso está publicado (toggle ON, sincronizado)
2. Desativar toggle (OFF)
3. Clicar "Remover do App"
✅ Resultado: Removido imediatamente do app
```

**4. Republicar aviso antigo:**
```
1. Aviso despublicado (toggle OFF, não sincronizado)
2. Ativar toggle (ON)
3. Clicar "Enviar para App"
✅ Resultado: Volta a aparecer no app
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar controller `avisos-admin-controller.js`
- [ ] Criar rotas `avisos-admin.js`
- [ ] Registrar rotas no `index.js`
- [ ] Testar endpoints via Postman/Insomnia
- [ ] Criar índice no MongoDB: `db.avisos.createIndex({ ativo: 1, dataCriacao: -1 })`

### Frontend Admin
- [ ] Criar HTML `/admin/operacoes/notificador`
- [ ] Criar JS `notificador-admin.js`
- [ ] Integrar com SuperModal
- [ ] Adicionar link no sidebar admin
- [ ] Testar fluxo completo de CRUD

### Frontend Participante
- [ ] Criar endpoint `GET /api/avisos` (controller separado)
- [ ] Criar componente `<AvisosList>` no home
- [ ] Implementar scroll horizontal
- [ ] Badge de não lidos no header
- [ ] Marcar como lido ao clicar

### Polimento
- [ ] Loading states
- [ ] Empty states
- [ ] Confirmações de delete
- [ ] Logs de auditoria
- [ ] Testes manuais em várias ligas

---

## 🧪 Checklist de Testes Manuais

### Teste 1: Criar e Publicar
```
✅ Criar aviso com toggle OFF
✅ Verificar que NÃO aparece no app participante
✅ Ativar toggle (ON)
✅ Verificar que AINDA NÃO aparece no app
✅ Clicar "Enviar para App"
✅ Verificar que AGORA aparece no app
✅ Badge de aviso novo deve piscar no header participante
```

### Teste 2: Remover do App
```
✅ Aviso publicado (toggle ON, visível no app)
✅ Desativar toggle (OFF)
✅ Verificar que AINDA está visível no app
✅ Clicar "Remover do App"
✅ Verificar que NÃO está mais no app
✅ Badge deve desaparecer se não houver outros avisos
```

### Teste 3: Republicar
```
✅ Aviso despublicado (toggle OFF)
✅ Ativar toggle (ON)
✅ Clicar "Enviar para App"
✅ Verificar que volta a aparecer no app
✅ Contador de leituras deve ser preservado
```

### Teste 4: Segmentação
```
✅ Criar aviso para liga específica
✅ Publicar
✅ Verificar que APENAS participantes da liga veem
✅ Outros participantes NÃO veem
```

### Teste 5: Expiração
```
✅ Criar aviso com expiração de 1 dia
✅ Publicar
✅ Aguardar expiração (ou simular alterando data)
✅ Verificar que foi removido automaticamente
✅ Status no admin deve mostrar "Expirado"
✅ Toggle deve ficar desabilitado
```

### Teste 6: Edição Durante Publicação
```
✅ Aviso publicado
✅ Clicar "Editar"
✅ Alterar título e mensagem
✅ Salvar
✅ Clicar "Enviar para App" novamente
✅ Verificar que mudanças aparecem no app
```

### Teste 7: Múltiplas Categorias
```
✅ Criar 1 aviso de cada categoria (success, warning, info, urgent)
✅ Publicar todos
✅ Verificar cores corretas no app (verde, amarelo, azul, vermelho)
✅ Verificar ícones corretos
```

### Teste 8: Performance
```
✅ Criar 10 avisos
✅ Publicar todos
✅ Verificar tempo de carregamento no app (< 300ms)
✅ Scroll horizontal deve ser fluido
✅ Marcar como lido deve ser instantâneo
```

---

**Status:** 🟢 Pronto para Implementação
**Estimativa:** 3-4 dias de desenvolvimento + 1 dia de testes
