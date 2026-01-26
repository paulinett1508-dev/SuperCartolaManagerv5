# PRD - Bug Sidebar Temporadas SPA Navigation

**Data:** 26/01/2026
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** CRITICA

---

## Resumo Executivo

O sidebar admin perde a renderizacao das temporadas (2025/2026) e os modulos ficam quebrados apos navegacao entre paginas. O problema ocorre porque:

1. **CONFLITO DE RENDERIZACAO**: `painel.html` tem sua propria funcao `carregarLigasSidebar()` (linhas 352-398) que renderiza ligas SEM temporadas (formato legado)
2. **PROTECAO BLOQUEANTE**: A flag `window._layoutInicializado` impede reinicializacao do layout
3. **INJECAO DUPLICADA**: Cada pagina injeta scripts do layout.html, mas a protecao bloqueia execucao

### Fluxo do Bug

```
1. Usuario abre painel.html
2. painel.html carrega layout.html e injeta sidebar
3. painel.html chama SUA PROPRIA carregarLigasSidebar() (sem temporadas)
4. layout.html scripts sao injetados
5. window._layoutCacheManager = true (primeira vez)
6. setTimeout(tentarInicializarLayout, 200) agendado
7. tentarInicializarLayout() executa
8. window._layoutInicializado = true
9. inicializarLayout() cria NavigationSystem
10. NavigationSystem.loadLigas() chama carregarLigasLayout() (COM temporadas)
11. Sidebar renderiza CORRETAMENTE com temporadas

--- USUARIO NAVEGA PARA preencher-liga.html ---

12. preencher-liga.html carrega
13. loadLayout() busca layout.html
14. Substitui sidebar-placeholder pelo sidebar do layout
15. Scripts do layout.html sao injetados NOVAMENTE
16. POREM: window._layoutCacheManager JA EXISTE
17. ELSE BLOCK executa: tentarInicializarLayout()
18. POREM: window._layoutInicializado JA E TRUE
19. tentarInicializarLayout() retorna imediatamente (linha 1093-1095)
20. carregarLigasLayout() NUNCA E CHAMADO
21. Sidebar fica VAZIO ou com dados incorretos
```

---

## Contexto e Analise

### Arquivos com Problema

#### 1. `public/painel.html` (linhas 352-398)
- **Problema**: Tem funcao `carregarLigasSidebar()` PROPRIA que renderiza ligas SEM agrupamento por temporada
- **Conflito**: Sobrescreve o HTML que `carregarLigasLayout()` do layout.html geraria

```javascript
// FUNCAO LEGADA NO painel.html (SEM temporadas)
async function carregarLigasSidebar() {
    ligasList.innerHTML = ligas.map((liga) => {
        return `<a href="detalhe-liga.html?id=${ligaId}">...`;  // SEM temporadas
    }).join("");
}
```

#### 2. `public/layout.html` (linhas 1088-1141)
- **Problema**: Flag `window._layoutInicializado` impede reinicializacao
- **Consequencia**: Na navegacao, `tentarInicializarLayout()` retorna early

```javascript
function tentarInicializarLayout() {
    if (layoutInicializado || window._layoutInicializado) {
        console.log('[LAYOUT] Já inicializado, ignorando...');
        return;  // <-- PROBLEMA: Nunca chama carregarLigasLayout()
    }
    // ...
}
```

#### 3. `public/preencher-liga.html` (linhas 695-745)
- **Problema**: `loadLayout()` injeta sidebar mas nao garante carregamento das ligas
- **Falta**: Chamar explicitamente `carregarLigasLayout()` apos injecao

### Dependencias Identificadas

| Arquivo | Funcao | Problema |
|---------|--------|----------|
| `layout.html` | `carregarLigasLayout()` | Funcao correta COM temporadas |
| `layout.html` | `tentarInicializarLayout()` | Bloqueada por flag |
| `painel.html` | `carregarLigasSidebar()` | Funcao LEGADA sem temporadas |
| `preencher-liga.html` | `loadLayout()` | Nao chama carregarLigasLayout() |

### Outras Paginas Afetadas

Todas as 15 paginas que usam `loadLayout()` e `sidebar-placeholder`:
- criar-liga.html
- editar-liga.html
- detalhe-liga.html
- ferramentas.html
- ferramentas-rodadas.html
- fluxo-financeiro.html
- gerenciar.html
- gerenciar-modulos.html
- gerir-senhas-participantes.html
- admin-gestao.html
- historico-acessos.html
- auditoria-extratos.html
- api-football-analytics.html

---

## Solucao Proposta

### Estrategia: Centralizar + Garantir Execucao

#### MUDANCA 1: Remover `carregarLigasSidebar()` do painel.html
- **Motivo**: Funcao duplicada e desatualizada
- **Impacto**: painel.html usara `carregarLigasLayout()` do layout.html

#### MUDANCA 2: Modificar flag de protecao no layout.html
- **De**: `window._layoutInicializado` bloqueia TUDO
- **Para**: Flag so bloqueia criacao de NavigationSystem, NAO o carregamento de ligas

#### MUDANCA 3: Garantir carregamento de ligas apos injecao
- No else block, chamar `carregarLigasLayout()` diretamente
- Nao depender de `tentarInicializarLayout()` que esta bloqueado

### Mudancas Especificas

#### layout.html - Modificar else block (linhas 1133-1141)

```javascript
} else {
    // v9.3 FIX: Scripts já carregados - recarregar ligas (não todo o layout)
    console.log('[LAYOUT] Scripts já carregados, recarregando ligas...');
    setTimeout(() => {
        // Recarregar apenas ligas, não reinicializar layout completo
        if (typeof carregarLigasLayout === 'function') {
            carregarLigasLayout();
        }
        // Atualizar navegacao ativa
        if (window.navigationSystem) {
            window.navigationSystem.setActiveNavigation();
        }
    }, 200);
}
```

#### painel.html - Remover funcao duplicada

1. REMOVER: `carregarLigasSidebar()` (linhas 352-398)
2. MODIFICAR: Linha 337 - trocar `carregarLigasSidebar()` por `carregarLigasLayout()`
3. VERIFICAR: `loadLayout()` deve executar antes de tentar carregar ligas

---

## Riscos e Consideracoes

### Impactos Previstos
- **Positivo**: Sidebar consistente em TODAS as paginas
- **Positivo**: Temporadas 2025/2026 sempre visiveis
- **Atencao**: Mudanca afeta fluxo de inicializacao

### Testes Necessarios

1. **Navegacao Normal**: painel.html -> preencher-liga.html -> voltar
2. **Navegacao SPA**: Clicar em links do sidebar
3. **Hard Refresh**: Ctrl+Shift+R em qualquer pagina
4. **Cache**: Verificar que temporadas aparecem com cache ativo

### Rollback Plan
- Reverter else block para versao anterior
- Manter `carregarLigasSidebar()` no painel.html como backup

---

## Proximos Passos

1. **Validar PRD** com usuario
2. **Gerar Spec**: Executar `/spec .claude/docs/PRD-sidebar-temporadas-spa-navigation.md`
3. **Implementar**: Executar `/code` com Spec gerado

---

**Gerado por:** Pesquisa Protocol v1.0
**Arquivos analisados:** 4
**Linhas de codigo revisadas:** ~500
