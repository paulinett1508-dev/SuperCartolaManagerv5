# SPEC - Fix Sidebar Temporadas SPA Navigation

**Data:** 26/01/2026
**Baseado em:** PRD-sidebar-temporadas-spa-navigation.md
**Status:** Especificacao Tecnica
**Versao:** 1.0

---

## Resumo da Implementacao

Corrigir o bug onde o sidebar admin perde as temporadas (2025/2026) apos navegacao entre paginas. A solucao envolve: (1) remover a funcao `carregarLigasSidebar()` duplicada do `painel.html`, e (2) modificar o else block do `layout.html` para chamar `carregarLigasLayout()` diretamente em vez de depender da flag bloqueante.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. `public/layout.html` - Mudanca Primaria

**Path:** `/home/runner/workspace/public/layout.html`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** Todas as 15 paginas que usam loadLayout()

#### Mudancas Cirurgicas:

**Linhas 1133-1141: MODIFICAR else block**

```javascript
// ANTES (linhas 1133-1141):
            } else {
                // ✅ v9.2 FIX: Scripts já carregados (navegação SPA) - reinicializar layout
                console.log('[LAYOUT] Scripts já carregados, reinicializando...');
                setTimeout(() => {
                    if (typeof tentarInicializarLayout === 'function') {
                        tentarInicializarLayout();
                    }
                }, 200);
            } // ✅ Fecha o if de proteção contra redeclaração (linha 119)

// DEPOIS:
            } else {
                // ✅ v9.3 FIX: Scripts já carregados - RECARREGAR LIGAS diretamente
                // Não chamar tentarInicializarLayout() pois a flag bloqueia
                console.log('[LAYOUT] Scripts já carregados, recarregando ligas...');
                setTimeout(() => {
                    // Recarregar ligas no sidebar (função que renderiza COM temporadas)
                    if (typeof carregarLigasLayout === 'function') {
                        carregarLigasLayout();
                    }
                    // Atualizar navegação ativa
                    if (window.navigationSystem) {
                        window.navigationSystem.setActiveNavigation();
                    }
                }, 200);
            } // ✅ Fecha o if de proteção contra redeclaração (linha 119)
```

**Motivo:** O `tentarInicializarLayout()` retorna early na linha 1093-1095 quando `window._layoutInicializado` ja e true. Ao chamar `carregarLigasLayout()` diretamente, garantimos que as ligas COM temporadas sejam renderizadas apos navegacao SPA.

---

### 2. `public/painel.html` - Remover Funcao Duplicada

**Path:** `/home/runner/workspace/public/painel.html`
**Tipo:** Modificacao
**Impacto:** Medio
**Dependentes:** Nenhum (funcao era local)

#### Mudancas Cirurgicas:

**Linha 337: MODIFICAR chamada da funcao**

```javascript
// ANTES (linha 337):
                    carregarLigasSidebar();

// DEPOIS:
                    // v9.3 FIX: Usar carregarLigasLayout() do layout.html (COM temporadas)
                    // A funcao carregarLigasSidebar() local foi removida
                    if (typeof carregarLigasLayout === 'function') {
                        carregarLigasLayout();
                    }
```

**Motivo:** Trocar a chamada da funcao local pela funcao do layout que renderiza temporadas.

---

**Linhas 352-398: REMOVER funcao duplicada completa**

```javascript
// REMOVER COMPLETAMENTE (linhas 352-398):
            // === CARREGAR LIGAS NO SIDEBAR (NOVO DESIGN) ===
            async function carregarLigasSidebar() {
                const ligasList = document.getElementById("ligasList");
                if (!ligasList) return;

                try {
                    const response = await fetch("/api/ligas");
                    const ligas = await response.json();

                    if (!Array.isArray(ligas) || ligas.length === 0) {
                        ligasList.innerHTML = `
                            <div class="sidebar-ligas-empty">
                                <span class="material-icons" style="font-size: 24px; margin-bottom: 8px; display: block;">folder_open</span>
                                Nenhuma liga criada
                            </div>
                        `;
                        return;
                    }

                    // Renderizar ligas com novo design e logos
                    ligasList.innerHTML = ligas
                        .map((liga) => {
                            const ligaId = liga._id || liga.id;
                            const timesCount = liga.times?.length || 0;
                            const logoUrl = obterLogoLiga(liga.nome);
                            const logoHtml = logoUrl
                                ? `<img src="${logoUrl}" alt="" class="liga-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span class="liga-dot" style="display:none;"></span>`
                                : `<span class="liga-dot"></span>`;
                            return `
                                <a href="detalhe-liga.html?id=${ligaId}" class="sidebar-liga-item">
                                    ${logoHtml}
                                    <div class="liga-info-sidebar">
                                        <div class="liga-name-sidebar">${liga.nome || "Liga sem nome"}</div>
                                    </div>
                                    <span class="liga-badge-count">${timesCount}</span>
                                </a>
                            `;
                        })
                        .join("");
                } catch (error) {
                    ligasList.innerHTML = `
                        <div class="sidebar-ligas-empty">
                            <span class="material-icons" style="color: #ef4444; font-size: 24px; margin-bottom: 8px; display: block;">warning</span>
                            Erro ao carregar
                        </div>
                    `;
                }
            }
```

**Motivo:** Esta funcao renderiza ligas SEM agrupamento por temporada. Ao remove-la, o `painel.html` usara a funcao `carregarLigasLayout()` do `layout.html` que renderiza COM temporadas.

---

## Mapa de Dependencias

```
layout.html (script principal)
    |
    |-> carregarLigasLayout() [FUNÇÃO CORRETA - COM temporadas]
    |       |-> renderiza grupos por temporada (2025, 2026)
    |       |-> usa toggleTemporadaGroup() para expandir/recolher
    |
    |-> tentarInicializarLayout() [BLOQUEADA por flag após primeira execução]
    |       |-> verifica window._layoutInicializado
    |       |-> se true -> RETURN EARLY (bug!)
    |
    |-> else block (linhas 1133-1141) [MODIFICAR]
            |-> ANTES: chamava tentarInicializarLayout() -> bloqueado
            |-> DEPOIS: chama carregarLigasLayout() diretamente

painel.html
    |-> carregarLigasSidebar() [REMOVER - SEM temporadas]
    |-> loadLayout() -> injeta scripts do layout.html
            |-> chamava carregarLigasSidebar() local [MODIFICAR]
            |-> DEPOIS: chama carregarLigasLayout() do layout
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Nao afeta queries com `liga_id` - mudanca apenas em rendering do sidebar
- [x] Ligas continuam isoladas por admin

### Autenticacao
- [x] Nao afeta fluxo de autenticacao
- [x] Sidebar so carrega se usuario autenticado (verificacao ja existe)

---

## Casos de Teste

### Teste 1: Navegacao Normal com Temporadas
**Setup:** Usuario logado no admin
**Acao:**
1. Abrir painel.html
2. Verificar sidebar tem grupos "2026" e "2025" (se existirem)
3. Clicar em uma liga
4. Clicar em "Dashboard" no sidebar
5. Verificar sidebar ainda tem temporadas
**Resultado Esperado:** Temporadas visiveis em TODAS as navegacoes

### Teste 2: Navegacao SPA Completa
**Setup:** Usuario logado no admin
**Acao:**
1. Abrir painel.html (primeira carga)
2. Clicar em "Ferramentas" no sidebar
3. Clicar em uma liga (detalhe-liga.html)
4. Clicar em "Fluxo Financeiro"
5. Clicar em "Dashboard"
6. Verificar sidebar em cada pagina
**Resultado Esperado:** Temporadas visiveis em TODAS as transicoes

### Teste 3: Hard Refresh
**Setup:** Usuario em qualquer pagina admin
**Acao:**
1. Pressionar Ctrl+Shift+R (hard refresh)
2. Verificar sidebar
**Resultado Esperado:** Temporadas carregam corretamente

### Teste 4: Voltar/Avancar do Navegador
**Setup:** Usuario navegou por varias paginas
**Acao:**
1. Clicar no botao "Voltar" do navegador
2. Verificar sidebar
3. Clicar no botao "Avancar"
4. Verificar sidebar
**Resultado Esperado:** Temporadas visiveis apos navegacao history

---

## Rollback Plan

### Em Caso de Falha

**Passos de Reversao:**
1. Reverter commit: `git revert [hash]`
2. Ou manualmente:
   - Restaurar `carregarLigasSidebar()` no painel.html
   - Restaurar else block original no layout.html

**Backup das linhas originais:**
```javascript
// layout.html else block original (linhas 1133-1141):
} else {
    console.log('[LAYOUT] Scripts já carregados, reinicializando...');
    setTimeout(() => {
        if (typeof tentarInicializarLayout === 'function') {
            tentarInicializarLayout();
        }
    }, 200);
}
```

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados (15 paginas)
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Ordem de Execucao
1. **layout.html** - Modificar else block primeiro (garantir funcao disponivel)
2. **painel.html** - Remover funcao duplicada e atualizar chamada

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-sidebar-temporadas-spa-navigation.md
```

---

**Gerado por:** Spec Protocol v1.0
**Arquivos analisados:** 3
**Linhas de codigo revisadas:** ~1500
