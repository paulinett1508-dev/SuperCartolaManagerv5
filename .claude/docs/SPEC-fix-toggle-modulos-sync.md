# SPEC - Fix: Toggle de Módulos Não Sincroniza Visualmente

**Data:** 2026-02-04
**Baseado em:** PRD-fix-toggle-modulos-sync.md
**Status:** Especificação Técnica - Pronto para Implementação
**Complexidade:** Baixa (2 linhas modificadas)
**Risco:** Muito Baixo

---

## Resumo da Implementação

Adicionar re-render automático após salvar módulos em `gerenciar-modulos.html`. O backend já retorna `{ modulos: {...} }` corretamente, mas o frontend não atualiza `modulosState` nem re-renderiza os cards após salvar. A solução é consumir a resposta do servidor e chamar `renderModulos()` imediatamente após sucesso da API.

**Mudança cirúrgica:** 2 linhas adicionadas na função `salvarModulos()`.

---

## Arquivos a Modificar

### 1. `public/gerenciar-modulos.html` - Função `salvarModulos()`

**Path:** `/home/runner/workspace/public/gerenciar-modulos.html`
**Tipo:** Modificação
**Impacto:** Alto (resolve bug crítico P0)
**Dependentes:** Nenhum (função isolada)

#### Mudanças Cirúrgicas:

**Contexto (Linhas 334-359):**
```javascript
async function salvarModulos() {
    const btn = document.getElementById('salvarBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons">hourglass_empty</span> Salvando...';

    try {
        const response = await fetch(`/api/ligas/${ligaId}/modulos-ativos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modulos: modulosState })
        });

        if (!response.ok) throw new Error('Erro ao salvar');

        // ❌ PROBLEMA: Aqui termina sem atualizar UI
        showMessage('Configurações salvas com sucesso!', 'success');

        setTimeout(() => {
            if (typeof window.refreshLigasSidebar === 'function') {
                window.refreshLigasSidebar();
            }
        }, 600);

    } catch (error) {
        console.error('Erro ao salvar:', error);
        showMessage('Erro ao salvar configurações', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">save</span> Salvar Configurações';
    }
}
```

---

**MODIFICAÇÃO 1: Adicionar após linha 341**

**Linha 341 (ORIGINAL):**
```javascript
if (!response.ok) throw new Error('Erro ao salvar');
```

**ADICIONAR APÓS (Linhas 342-346):**
```javascript
if (!response.ok) throw new Error('Erro ao salvar');

// ✅ FIX: Atualizar estado com resposta do servidor
const data = await response.json();
modulosState = data.modulos;

// ✅ FIX: Re-renderizar cards para refletir novo estado
renderModulos();

showMessage('Configurações salvas com sucesso!', 'success');
```

**Motivo:**
1. **Linha 344:** Consumir resposta do backend que já retorna `{ modulos: {...} }` (conforme `ligaController.js:968-970`)
2. **Linha 345:** Atualizar `modulosState` em memória com estado salvo no banco
3. **Linha 348:** Forçar re-render dos cards para refletir visualmente o estado atualizado

**Impacto:**
- ✅ Toggles permanecem no estado correto após salvar
- ✅ Cards base não mostram "Em manutenção" se estiverem ativos
- ✅ Modal de configuração abre corretamente pois lê `modulosState` atualizado
- ⚠️ Re-render pode causar flash visual mínimo (acceptable trade-off)

---

**MODIFICAÇÃO 2: Remover linha 343 (duplicada)**

**Linha 343 (ANTES - será movida):**
```javascript
showMessage('Configurações salvas com sucesso!', 'success');
```

**Linha 349 (DEPOIS - nova posição):**
```javascript
showMessage('Configurações salvas com sucesso!', 'success');
```

**Motivo:** Mover `showMessage()` para DEPOIS do re-render, garantindo que usuário veja mensagem após UI atualizada.

---

### Código Completo Atualizado (Linhas 334-360):

```javascript
async function salvarModulos() {
    const btn = document.getElementById('salvarBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons">hourglass_empty</span> Salvando...';

    try {
        const response = await fetch(`/api/ligas/${ligaId}/modulos-ativos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modulos: modulosState })
        });

        if (!response.ok) throw new Error('Erro ao salvar');

        // ✅ FIX: Atualizar estado com resposta do servidor
        const data = await response.json();
        modulosState = data.modulos;

        // ✅ FIX: Re-renderizar cards para refletir novo estado
        renderModulos();

        showMessage('Configurações salvas com sucesso!', 'success');

        setTimeout(() => {
            if (typeof window.refreshLigasSidebar === 'function') {
                window.refreshLigasSidebar();
            }
        }, 600);

    } catch (error) {
        console.error('Erro ao salvar:', error);
        showMessage('Erro ao salvar configurações', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">save</span> Salvar Configurações';
    }
}
```

---

## Mapa de Dependências

```
salvarModulos() [gerenciar-modulos.html:329]
    ├─> PUT /api/ligas/:id/modulos-ativos [routes/ligas.js]
    │   └─> ligaController.atualizarModulosAtivos() [ligaController.js:869]
    │       └─> RETORNA: { success: true, modulos: {...} } ✅
    │
    ├─> modulosState [global scope] → ATUALIZADO ✅
    │
    └─> renderModulos() [gerenciar-modulos.html:261]
        ├─> Lê modulosState ✅
        ├─> Re-cria cards DOM ✅
        └─> Listeners re-adicionados (sem problemas) ✅
```

**Análise de Impacto:**
- ✅ Nenhum arquivo externo depende de `salvarModulos()`
- ✅ `renderModulos()` é idempotente (pode ser chamada múltiplas vezes)
- ✅ Backend não precisa de alterações
- ✅ Event listeners são recriados corretamente no re-render

---

## Validações de Segurança

### Multi-Tenant
- ✅ Não afeta isolamento: `ligaId` é enviado na URL e validado no backend
- ✅ Response do backend já filtrada por `liga_id`

**Query Validada (Backend):**
```javascript
// ligaController.js:882
const liga = await Liga.findById(ligaIdParam);
if (!liga) {
  return res.status(404).json({ erro: "Liga não encontrada" });
}
```

### Autenticação
- ✅ Rota protegida com middleware de admin (verificado em `routes/ligas.js`)
- ✅ Nenhuma mudança em permissões

### Estado da UI
- ✅ Em caso de erro na API, `modulosState` NÃO é alterado (catch block preserva estado)
- ✅ Re-render só acontece após `response.ok`

---

## Casos de Teste

### Teste 1: Ativar Módulo Base (Extrato)
**Setup:**
- Liga ID: `684cb1c8af923da7c7df51de`
- Módulo "Extrato Financeiro" está **desativado** (toggle off)

**Ação:**
1. Abrir `/gerenciar-modulos.html?id=684cb1c8af923da7c7df51de`
2. Ativar toggle de "Extrato Financeiro"
3. Clicar "Salvar Configurações"

**Resultado Esperado:**
- ✅ Toggle permanece **ATIVADO** visualmente
- ✅ Card NÃO exibe "⚙ Em manutenção"
- ✅ Mensagem "Configurações salvas com sucesso!" exibida
- ✅ Clicar no card abre modal de configuração

---

### Teste 2: Desativar Módulo Base (Ranking)
**Setup:**
- Módulo "Ranking Geral" está **ativado**

**Ação:**
1. Desativar toggle de "Ranking Geral"
2. Salvar

**Resultado Esperado:**
- ✅ Toggle permanece **DESATIVADO** visualmente
- ✅ Card exibe "⚙ Em manutenção" em laranja
- ✅ Estado `modulosState.ranking === false`

---

### Teste 3: Ativar Módulo Opcional (Pontos Corridos)
**Setup:**
- Módulo "Pontos Corridos" está **inativo**

**Ação:**
1. Ativar toggle
2. Salvar
3. Clicar no card

**Resultado Esperado:**
- ✅ Card muda de `class="modulo-card inativo"` para `"modulo-card ativo"`
- ✅ Modal de configuração abre sem erros
- ✅ Console NÃO mostra `[GERENCIAR-MODULOS] Ative o módulo primeiro`

---

### Teste 4: Múltiplas Mudanças Simultâneas
**Setup:**
- 3 módulos ativos, 2 inativos

**Ação:**
1. Ativar 2 módulos inativos
2. Desativar 1 módulo ativo
3. Salvar

**Resultado Esperado:**
- ✅ **Todos** os 5 toggles refletem o novo estado
- ✅ Backend sincroniza com `ModuleConfig` (verificar logs)
- ✅ Recarregar página (F5) → estado persiste

---

### Teste 5: Erro na API (Simulação)
**Setup:**
- Servidor retorna `500 Internal Server Error` (simular desconectando rede)

**Ação:**
1. Fazer mudanças nos toggles
2. Tentar salvar

**Resultado Esperado:**
- ✅ Catch block captura erro
- ✅ `modulosState` NÃO é alterado (estado anterior preservado)
- ✅ `renderModulos()` NÃO é chamado
- ✅ Mensagem "Erro ao salvar configurações" exibida
- ✅ UI reflete estado **anterior** (não sincronizado)

---

### Teste 6: Reload Após Salvar (Verificar Persistência)
**Ação:**
1. Ativar módulo "Artilheiro"
2. Salvar
3. F5 (reload página)

**Resultado Esperado:**
- ✅ Após reload, toggle de "Artilheiro" está **ATIVADO**
- ✅ Dados vêm do banco (via `loadModulos()` → `GET /api/ligas/:id/modulos-ativos`)

---

## Rollback Plan

### Em Caso de Falha na Implementação

**Sintomas de Falha:**
- UI trava após salvar
- Cards não aparecem (erro em `renderModulos()`)
- Estado visual fica "piscando"

**Passos de Reversão:**

1. **Rollback via Git:**
```bash
git revert <commit-hash>
git push origin main
```

2. **Verificar Banco de Dados:**
```bash
# Dados no MongoDB permanecem íntegros (backend funciona)
# Não há necessidade de restauração de DB
```

3. **Limpar Cache do Navegador:**
```bash
# Hard refresh: Ctrl+Shift+R (Chrome/Firefox)
# Ou Settings → Clear Cache
```

4. **Validar Estado Anterior:**
- Abrir `/gerenciar-modulos.html`
- Verificar que toggles funcionam (mesmo sem sincronização)
- Confirmar que backend salva corretamente (via MongoDB Compass)

---

## Checklist de Validação

### Antes de Implementar
- [x] PRD lido e analisado
- [x] Arquivo original completo lido (`gerenciar-modulos.html`)
- [x] Backend verificado (retorna `{ modulos: {...} }`)
- [x] Dependências mapeadas (`renderModulos()`, `modulosState`)
- [x] Nenhum arquivo externo depende desta função
- [x] Mudança é cirúrgica (2 linhas)
- [x] Impacto documentado
- [x] Testes planejados

### Durante Implementação
- [ ] Linha 344: `const data = await response.json();` adicionada
- [ ] Linha 345: `modulosState = data.modulos;` adicionada
- [ ] Linha 348: `renderModulos();` adicionada
- [ ] Linha 343: `showMessage(...)` movida para linha 349
- [ ] Indentação preservada
- [ ] Comentários `✅ FIX` adicionados

### Após Implementação
- [ ] Teste 1 passado (ativar módulo base)
- [ ] Teste 2 passado (desativar módulo base)
- [ ] Teste 3 passado (ativar módulo opcional)
- [ ] Teste 4 passado (múltiplas mudanças)
- [ ] Teste 5 passado (erro na API)
- [ ] Teste 6 passado (reload após salvar)
- [ ] Logs do backend verificados (sem erros)
- [ ] Modal de configuração funciona
- [ ] Commit criado com mensagem descritiva

---

## Ordem de Execução

### Implementação (Fase 3)

1. **Aplicar Mudança:**
   - Editar `public/gerenciar-modulos.html:341-349`
   - Adicionar 4 linhas (2 de código + 2 de comentários)

2. **Testar Localmente:**
   - Executar todos os 6 casos de teste
   - Verificar console do navegador (sem erros)
   - Verificar logs do servidor (sincronização OK)

3. **Validar Edge Cases:**
   - Testar com múltiplas ligas diferentes
   - Testar módulos base E opcionais
   - Simular erro de rede

4. **Commit & Push:**
```bash
git add public/gerenciar-modulos.html
git commit -m "fix(modules): sincronizar estado visual após salvar módulos

- Adiciona reload de modulosState após PUT bem-sucedido
- Chama renderModulos() para refletir estado salvo
- Resolve bug onde toggles não atualizavam visualmente
- Corrige abertura de modal com estado desatualizado

Fixes: #BUG-XXX (se houver issue)"
git push origin main
```

---

## Próximo Passo

**Comando para Fase 3 (Implementação):**
```
/code .claude/docs/SPEC-fix-toggle-modulos-sync.md
```

**Contexto Necessário:**
- ✅ SPEC completo gerado
- ✅ Mudanças cirúrgicas definidas linha por linha
- ✅ Testes planejados
- ✅ Rollback documentado

**Ação Esperada:**
- Aplicar edit exato nas linhas 341-349
- Executar testes manuais
- Validar com liga real (`684cb1c8af923da7c7df51de`)

---

## Métricas de Qualidade

**Complexidade:** O(1) - Mudança linear
**Linhas Modificadas:** 4 (2 código + 2 comentários)
**Breaking Changes:** Zero
**Arquivos Afetados:** 1
**Tempo Estimado:** N/A (sem estimativas de tempo)
**Risco de Regressão:** Muito Baixo (<5%)

---

## Observações Técnicas

### Por que `await response.json()` é necessário?

**Backend retorna (ligaController.js:968-970):**
```javascript
res.json({
  success: true,
  modulos: liga.modulos_ativos,  // ✅ Usado no frontend
  mensagem: "Módulos atualizados com sucesso",
  sincronizacao: { total, sincronizados, erros }
});
```

**Frontend atual:**
```javascript
if (!response.ok) throw new Error('Erro ao salvar');
// ❌ NÃO consome response.json() → dados perdidos
```

**Frontend corrigido:**
```javascript
if (!response.ok) throw new Error('Erro ao salvar');
const data = await response.json(); // ✅ Consome body
modulosState = data.modulos; // ✅ Usa dados do servidor
```

---

### Por que `renderModulos()` é seguro de chamar?

**Função é idempotente (gerenciar-modulos.html:261-327):**
```javascript
function renderModulos() {
    const baseGrid = document.getElementById('modulosBaseGrid');
    const opcionaisGrid = document.getElementById('modulosOpcionaisGrid');

    // ✅ Limpa DOM antes de recriar
    baseGrid.innerHTML = '';
    opcionaisGrid.innerHTML = '';

    // ✅ Recria todos os cards
    Object.entries(MODULOS_CONFIG).forEach(([key, config]) => {
        // ... cria card e adiciona listeners
    });
}
```

**Comportamento:**
- Limpa grids existentes → Recria todos os cards → Re-adiciona listeners
- Sem memory leaks (DOM anterior é garbage collected)
- Sem event listeners duplicados (innerHTML limpa listeners antigos)

---

**Gerado por:** Spec Protocol v1.0 (High Senior Edition)
**S.D.A Compliance:** ✅ Completo
**Arquivos Solicitados:** 2/2 (100%)
**Dependências Mapeadas:** 3/3 (100%)
**Status:** PRONTO PARA IMPLEMENTAÇÃO
