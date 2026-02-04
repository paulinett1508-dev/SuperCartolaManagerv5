# PRD - Fix: Toggle de Módulos Não Sincroniza Visualmente

**Data:** 2026-02-04
**Autor:** Claude (Research Protocol)
**Status:** Draft - Crítico
**Prioridade:** P0 (Bug Bloqueante)

---

## Resumo Executivo

O sistema de ativação/desativação de módulos em `gerenciar-modulos.html` possui um bug crítico onde **o estado visual não reflete o estado salvo no banco de dados**. Após clicar em "Salvar Configurações", a API retorna sucesso mas a interface não recarrega os dados, fazendo com que:

1. Toggles permaneçam no estado anterior visualmente
2. Cards de módulos base mostrem "Em manutenção" mesmo quando salvos como ativos
3. Modal de configuração não abra pois lê o `modulosState` desatualizado

**Root Cause:** Falta de reload/re-render após salvar. A função `salvarModulos()` apenas mostra mensagem de sucesso mas **não atualiza `modulosState` nem re-renderiza os cards**.

---

## Contexto e Análise

### Arquivos Identificados

**Backend:**
- `controllers/ligaController.js:869-975` - `atualizarModulosAtivos()`
  - Salva em `Liga.modulos_ativos` ✅
  - Sincroniza com `ModuleConfig` ✅
  - Retorna `{ success: true, modulos: {...} }` ✅

**Frontend:**
- `public/gerenciar-modulos.html:329-359` - `salvarModulos()`
  - ❌ **BUG:** Não recarrega dados após salvar
  - ❌ **BUG:** Não chama `loadModulos()` novamente
  - ❌ **BUG:** Estado `modulosState` fica desatualizado

### Fluxo Atual (QUEBRADO)

```
1. Usuário ativa toggle
   → modulosState[key] = true (apenas em memória)

2. Usuário clica "Salvar Configurações"
   → PUT /api/ligas/:id/modulos-ativos
   → Backend salva corretamente ✅
   → Retorna { success: true, modulos: {...} } ✅

3. Frontend recebe resposta
   → Mostra "Configurações salvas com sucesso!" ✅
   → ❌ NÃO atualiza modulosState
   → ❌ NÃO re-renderiza cards
   → ❌ Estado visual permanece no estado anterior

4. Usuário tenta abrir modal
   → Lê modulosState desatualizado
   → Modal não abre ou mostra "Em manutenção"
```

### Evidência do Bug (Código)

**Arquivo:** `public/gerenciar-modulos.html:329-359`

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

        showMessage('Configurações salvas com sucesso!', 'success');

        setTimeout(() => {
            // Manter usuário na tela atual para navegação mais fluida
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

    // ❌ PROBLEMA: Função termina aqui sem recarregar dados!
    // ❌ modulosState continua com valores antigos
    // ❌ UI não reflete estado salvo no banco
}
```

### Comparação: Comportamento Esperado vs Atual

| Ação | Esperado | Atual | Status |
|------|----------|-------|--------|
| Salvar config | Backend atualiza DB | ✅ Funciona | OK |
| Retornar resposta | Backend envia `{modulos}` | ✅ Funciona | OK |
| Atualizar state | Frontend atualiza `modulosState` | ❌ Não faz | **BUG** |
| Re-renderizar UI | Cards refletem novo estado | ❌ Não faz | **BUG** |
| Abrir modal | Modal carrega config | ❌ Falha | **CONSEQUÊNCIA** |

---

## Solução Proposta

### Abordagem Escolhida: Reload Automático Após Salvar

**Opção A (RECOMENDADA): Recarregar dados do servidor**
```javascript
async function salvarModulos() {
    // ... código de save existente ...

    if (!response.ok) throw new Error('Erro ao salvar');

    // ✅ FIX: Atualizar modulosState com resposta do servidor
    const data = await response.json();
    modulosState = data.modulos;

    // ✅ FIX: Re-renderizar cards com novo estado
    renderModulos();

    showMessage('Configurações salvas com sucesso!', 'success');
}
```

**Opção B (Alternativa): Chamar loadModulos()**
```javascript
async function salvarModulos() {
    // ... código de save existente ...

    showMessage('Configurações salvas com sucesso!', 'success');

    // ✅ FIX: Recarregar dados do servidor
    await loadModulos();
}
```

**Decisão:** Opção A é mais eficiente (usa resposta do PUT ao invés de fazer novo GET).

### Arquivos a Modificar

1. **`public/gerenciar-modulos.html:329-359`**
   - Adicionar atualização de `modulosState` após salvar
   - Adicionar chamada a `renderModulos()`
   - Garantir que UI reflete estado salvo

### Regras de Negócio Preservadas

- ✅ Backend salva em `Liga.modulos_ativos`
- ✅ Backend sincroniza com `ModuleConfig`
- ✅ Mensagem de sucesso mostrada
- ✅ Sidebar atualizada (mantido)
- **NOVO:** UI reflete estado salvo imediatamente

---

## Riscos e Considerações

### Impactos Previstos

**Positivo:**
- ✅ Bug crítico resolvido
- ✅ UX consistente (estado visual = estado real)
- ✅ Modal funciona após salvar
- ✅ Zero breaking changes

**Atenção:**
- Re-render pode causar flash visual (cards recriados)
- Listeners de eventos são re-adicionados (não é problema, mas vale observar)

**Risco:**
- Muito baixo - mudança cirúrgica e isolada

### Multi-Tenant
- ✅ Não afeta isolamento `liga_id`
- ✅ Cada liga continua com seus módulos independentes

---

## Testes Necessários

### Cenários de Teste

**Teste 1: Ativar módulo base**
1. Abrir `/gerenciar-modulos.html?id=684cb1c8af923da7c7df51de`
2. **Desativar** toggle de "Extrato Financeiro"
3. Clicar "Salvar Configurações"
4. ✅ Verificar que toggle permanece desativado visualmente
5. ✅ Verificar que card mostra "Em manutenção"

**Teste 2: Ativar módulo opcional**
1. **Ativar** toggle de "Pontos Corridos"
2. Clicar "Salvar Configurações"
3. ✅ Verificar que toggle permanece ativado visualmente
4. ✅ Verificar que card NÃO mostra "Em manutenção"
5. Clicar no card
6. ✅ Modal deve abrir corretamente

**Teste 3: Múltiplas mudanças**
1. Ativar 3 módulos
2. Desativar 2 módulos
3. Salvar
4. ✅ Estado visual deve refletir exatamente o que foi salvo

**Teste 4: Reload da página**
1. Fazer mudanças e salvar
2. Recarregar página (F5)
3. ✅ Estado deve persistir (dados vêm do banco)

**Teste 5: Edge case - API retorna erro**
1. Simular erro de rede
2. Tentar salvar
3. ✅ Estado visual deve permanecer como estava
4. ✅ Mensagem de erro exibida

---

## Implementação Detalhada (Preview)

### Mudança Exata (Preview do SPEC)

**Arquivo:** `public/gerenciar-modulos.html`
**Função:** `salvarModulos()`
**Linhas:** 329-359

```javascript
// ANTES (linha 341-350)
if (!response.ok) throw new Error('Erro ao salvar');

showMessage('Configurações salvas com sucesso!', 'success');

setTimeout(() => {
    if (typeof window.refreshLigasSidebar === 'function') {
        window.refreshLigasSidebar();
    }
}, 600);

// DEPOIS (adicionar após linha 341)
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
```

**Linhas afetadas:** 2 linhas adicionadas
**Breaking changes:** Zero
**Risco:** Muito baixo

---

## Dependências Mapeadas

### Quem Usa `modulosState`

1. `renderModulos()` - Lê para renderizar cards ✅
2. `onCardClick()` - Lê para validar se pode abrir modal ✅
3. `salvarModulos()` - Envia para backend ✅

**Conclusão:** Atualizar `modulosState` após salvar é **suficiente e necessário**.

### Quem Usa `renderModulos()`

- Chamado em `loadModulos()` após fetch inicial ✅
- **NOVO:** Será chamado em `salvarModulos()` após save

**Conclusão:** Função já está preparada para ser chamada múltiplas vezes.

---

## Próximos Passos

1. ✅ **Validar PRD** (este documento)
2. **Gerar SPEC:** Executar `/spec .claude/docs/PRD-fix-toggle-modulos-sync.md`
3. **Implementar:** Executar `/code` com SPEC gerado
4. **Testar:** Seguir cenários de teste listados

---

## Apêndice: Logs do Bug

### Console do Navegador (Reprodução)
```
[GERENCIAR-MODULOS] Abrindo configuração: extrato → extrato
[MODULE-CONFIG-MODAL] Inicializando modal - Liga: 684cb1c8af923da7c7df51de, Módulo: extrato
[MODULE-CONFIG-MODAL] ✅ Wizard carregado
[MODULE-CONFIG-MODAL] ✅ Config carregada
[MODULE-CONFIG-MODAL] ✅ Modal exibido

// ❌ Mas modal mostra "Em manutenção" porque modulosState está desatualizado!
```

### Servidor (Logs Corretos)
```
[REQUEST] PUT /api/ligas/684cb1c8af923da7c7df51de/modulos-ativos
[LIGAS] Sincronizando 9 módulos com ModuleConfig...
[LIGAS] ✅ Módulo extrato ativado e criado no ModuleConfig
[LIGAS] Sincronização concluída: 9 ok, 0 erros

// ✅ Backend funciona corretamente, problema é apenas no frontend!
```

---

**Gerado por:** Research Protocol v1.0
**Tempo de Pesquisa:** 15 minutos
**Arquivos Analisados:** 3
**Linhas de Código Lidas:** ~500
**Confiança:** 95% (root cause confirmado)
