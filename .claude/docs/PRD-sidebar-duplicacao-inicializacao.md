# PRD - Correção de Duplicação de Inicialização no Sidebar

**Data:** 2026-01-25
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft

---

## Resumo Executivo

O sidebar do painel administrativo apresenta **anomalia visual de sobreposição de menus** causada por **dois sistemas paralelos** que tentam inicializar os mesmos componentes. Os sintomas incluem: ligas carregadas duas vezes, chamadas API duplicadas, e race condition que causa "flicker" visual durante a inicialização.

A solução proposta é **unificar a lógica de inicialização** removendo o arquivo `sidebar-menu.js` que duplica funcionalidades já presentes no script inline do `layout.html`.

---

## Contexto e Análise

### Evidência do Problema (Console Logs)

```
sidebar-menu.js:166 [SIDEBAR-MENU] ✅ Menu do perfil inicializado
VM306:690 [LAYOUT] Sidebar encontrado, inicializando...
VM306:438 [LAYOUT] Menu já inicializado por sidebar-menu.js
```

Isso demonstra que:
1. `sidebar-menu.js` inicializa primeiro
2. `layout.html` detecta que já foi inicializado (linha 552-554)
3. Porém, outras funções ainda executam duplicadas

### Módulos Identificados

- **Sistema 1 (sidebar-menu.js):**
  - `public/js/core/sidebar-menu.js` - IIFE que carrega no DOMContentLoaded
  - Funções: `carregarLigasSidebar()`, `inicializarMenuPerfil()`, `carregarDadosAdmin()`
  - Versão: v1.1

- **Sistema 2 (layout.html inline):**
  - `public/layout.html` - Script inline no template do sidebar
  - Funções: `carregarLigasLayout()`, `inicializarMenuPerfil()`, `carregarDadosAdmin()`
  - Versão: v3.0 (mais completa, com agrupamento por temporada)

- **Relacionados:**
  - `public/js/core/layout-manager.js` - Classe ES6 que injeta o layout
  - Linha 49-51: Chama `window.verificarMenuSuperAdmin()` após injeção

### Dependências Mapeadas

```
Fluxo de Carregamento:
┌─────────────────────────────────────────────────────────────────────┐
│ Página (ex: detalhe-liga.html)                                      │
│   ├─ Inclui: <script src="js/core/sidebar-menu.js"></script>       │
│   └─ Usa: LayoutManager.load() → injeta layout.html                │
│                                                                     │
│ Execução:                                                           │
│   1. DOMContentLoaded → sidebar-menu.js.init()                     │
│   2. LayoutManager → injeta layout.html                             │
│   3. layout.html script → setTimeout(tentarInicializarLayout, 200) │
│                                                                     │
│ Resultado: DUPLA INICIALIZAÇÃO                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Duplicadas

| Funcionalidade | sidebar-menu.js | layout.html | Diferença |
|----------------|-----------------|-------------|-----------|
| Carregar Ligas | `carregarLigasSidebar()` | `carregarLigasLayout()` | layout.html agrupa por temporada (v3.0) |
| Menu Perfil | `inicializarMenuPerfil()` | `inicializarMenuPerfil()` | Idênticas |
| Dados Admin | `carregarDadosAdmin()` | `carregarDadosAdmin()` | layout.html mais completa |
| Logout | `fazerLogoutAdmin()` | `fazerLogoutAdmin()` | Idênticas |
| Super Admin | N/A | `verificarMenuSuperAdmin()` | Apenas layout.html |
| Accordion | N/A | `AccordionManager` | Apenas layout.html |
| Toggle Sidebar | N/A | `toggleSidebar()` | Apenas layout.html |

### Padrões Existentes

- **Guard de dupla inicialização:** Ambos usam `userToggle.dataset.initialized`
- **Problema:** Guard só protege `inicializarMenuPerfil()`, não as outras funções
- **Carregamento de ligas:** Executa duas vezes, causando flicker

---

## Solução Proposta

### Abordagem Escolhida

**Remover `sidebar-menu.js`** completamente, pois:
1. `layout.html` tem versão mais completa (v3.0 com temporadas)
2. `layout.html` já tem todas as funcionalidades
3. Evita race condition e chamadas duplicadas

### Arquivos a Modificar

1. **`public/js/core/sidebar-menu.js`** - DELETAR
   - Arquivo inteiro será removido
   - 253 linhas de código duplicado

2. **Páginas que incluem sidebar-menu.js** - REMOVER IMPORT
   - Buscar: `<script src="js/core/sidebar-menu.js"></script>`
   - Ou: `<script src="/js/core/sidebar-menu.js"></script>`
   - Remover a linha do import

3. **`public/layout.html`** - AJUSTES MENORES
   - Remover verificação de `dataset.initialized` (linha 552-555)
   - Já não há mais concorrência

### Arquivos a Verificar (S.D.A)

Páginas que podem incluir `sidebar-menu.js`:
- `public/painel.html`
- `public/detalhe-liga.html`
- `public/fluxo-financeiro.html`
- `public/ferramentas.html`
- `public/admin-gestao.html`
- `public/gerenciar.html`
- `public/criar-liga.html`
- `public/editar-liga.html`
- `public/ferramentas-rodadas.html`
- `public/auditoria-extratos.html`
- `public/historico-acessos.html`
- `public/buscar-times.html`

---

## Regras de Negócio

- **RN-01:** O sidebar deve inicializar apenas UMA vez
- **RN-02:** As ligas devem ser carregadas agrupadas por temporada (v3.0)
- **RN-03:** O menu de Super Admin só aparece para usuários com `isSuperAdmin: true`
- **RN-04:** O estado do accordion deve persistir em `localStorage`
- **RN-05:** O estado collapsed/expanded do sidebar deve persistir

---

## Riscos e Considerações

### Impactos Previstos

- **Positivo:** Elimina flicker visual, reduz chamadas API em 50%
- **Positivo:** Código mais limpo, uma única fonte de verdade
- **Atenção:** Verificar se alguma página depende exclusivamente de `sidebar-menu.js`
- **Risco Baixo:** Se alguma página não usa `LayoutManager`, pode perder funcionalidade

### Multi-Tenant

- [x] Não afeta isolamento liga_id (sidebar apenas exibe ligas do admin)

### Rollback Plan

1. Restaurar `sidebar-menu.js` do git
2. Re-adicionar imports nas páginas
3. Commit: `git revert [hash]`

---

## Testes Necessários

### Cenários de Teste

1. **Inicialização Limpa**
   - Abrir painel.html em aba anônima
   - Verificar console: apenas logs `[LAYOUT]`, nenhum `[SIDEBAR-MENU]`
   - Verificar: ligas carregam uma única vez

2. **Menu Perfil**
   - Clicar no avatar do usuário
   - Menu dropup deve abrir/fechar corretamente
   - Botão "Meu Perfil" deve abrir modal
   - Botão "Sair" deve fazer logout

3. **Menu Super Admin**
   - Logar como Super Admin
   - Verificar: botão "Administradores" visível
   - Logar como Admin comum
   - Verificar: botão "Administradores" oculto

4. **Navegação entre Páginas**
   - Navegar: Dashboard → Detalhe Liga → Fluxo Financeiro
   - Verificar: sidebar mantém estado
   - Verificar: liga ativa destacada corretamente

5. **Accordion de Ligas**
   - Expandir/colapsar accordion "Ligas"
   - Recarregar página
   - Verificar: estado persistido

6. **Toggle Sidebar (Desktop)**
   - Clicar botão de recolher sidebar
   - Verificar: sidebar colapsa
   - Recarregar página
   - Verificar: estado persistido

### Páginas a Testar

- [ ] painel.html
- [ ] detalhe-liga.html
- [ ] fluxo-financeiro.html
- [ ] ferramentas.html
- [ ] admin-gestao.html (Super Admin)

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Chamadas `/api/ligas` por page load | 2 | 1 |
| Chamadas `/api/admin/auth/session` | 2 | 1 |
| Logs de inicialização | 10+ | 5 |
| Tempo de inicialização | ~400ms | ~200ms |

---

## Próximos Passos

1. **Validar PRD** - Revisar com stakeholder
2. **Gerar Spec:** Executar `/spec .claude/docs/PRD-sidebar-duplicacao-inicializacao.md`
3. **Implementar:** Executar `/code` com Spec gerado

---

**Gerado por:** Pesquisa Protocol v1.0
**Workflow:** High Senior Protocol - FASE 1 COMPLETA
