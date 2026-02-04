# SPEC - Sticky Header Tabela Financeira (v9.0)

**Data:** 2026-01-18
**Baseado em:** PRD-sticky-header-tabela-financeira.md (v2.0)
**Status:** Especificacao Tecnica - PRONTO PARA IMPLEMENTACAO

---

## Resumo da Implementacao

Reescrever a funcao `_aplicarStickyHeader()` para usar abordagem de clone com `position: fixed` relativo ao viewport. A versao v8.0 atual clona o `<thead>` diretamente, o que nao funciona porque elementos `<thead>` fora de `<table>` tem comportamento inconsistente. A v9.0 cria um wrapper `<div>` com uma `<table>` completa contendo apenas o header clonado, posicionado com `position: fixed` no viewport.

**Por que CSS sticky nao funcionou (v1.0 - v7.0):**
- `transform` em ancestrais (mesmo `transform: none` via animacao) cria novo stacking context
- Alguns browsers mantem o context apos animacao terminar
- Multiplas tentativas de remover transform via CSS e JS falharam

**Por que clone com position absolute nao funcionou (v8.0):**
- `<thead>` clonado fora de `<table>` nao renderiza corretamente
- `display: table-header-group` em elemento com `position: absolute` tem comportamento inconsistente

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. fluxo-financeiro-ui.js - Reescrever _aplicarStickyHeader()

**Path:** `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** Nenhum (metodo interno)

#### Mudancas Cirurgicas:

**Linhas 832-908: SUBSTITUIR FUNCAO INTEIRA**

```javascript
// ANTES (v8.0 - NAO FUNCIONA):
    /**
     * ✅ v8.0: Header fixo via JavaScript puro (sem CSS sticky)
     * Clona o header e posiciona absolutamente quando usuário scrolla
     */
    _aplicarStickyHeader() {
        setTimeout(() => {
            const container = document.querySelector('.fluxo-tabela-container');
            const tabela = container?.querySelector('.fluxo-participantes-tabela, .tabela-financeira');
            const thead = tabela?.querySelector('thead');

            if (!container || !tabela || !thead) {
                console.log('[FluxoFinanceiroUI] Elementos não encontrados');
                return;
            }

            // Remover header fixo anterior se existir
            container.querySelector('.thead-clone-fixo')?.remove();

            // Calcular altura do container
            const rect = container.getBoundingClientRect();
            const alturaDisponivel = window.innerHeight - rect.top - 40;
            const altura = Math.max(300, Math.min(alturaDisponivel, window.innerHeight * 0.7));

            // Configurar container
            container.style.cssText = `
                max-height: ${altura}px;
                overflow-y: auto;
                overflow-x: auto;
                position: relative;
            `;

            // Criar clone do header
            const clone = thead.cloneNode(true);
            clone.className = 'thead-clone-fixo';
            clone.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 100;
                display: none;
                background: #1a1a1a;
                box-shadow: 0 2px 8px rgba(0,0,0,0.8);
            `;

            // Copiar larguras das colunas
            const thsOriginal = thead.querySelectorAll('th');
            const thsClone = clone.querySelectorAll('th');
            thsOriginal.forEach((th, i) => {
                if (thsClone[i]) {
                    thsClone[i].style.width = `${th.offsetWidth}px`;
                    thsClone[i].style.minWidth = `${th.offsetWidth}px`;
                    thsClone[i].style.background = '#1a1a1a';
                    thsClone[i].style.borderBottom = '2px solid #FF5500';
                }
            });

            container.appendChild(clone);

            // Listener de scroll
            const onScroll = () => {
                const scrollTop = container.scrollTop;
                if (scrollTop > 5) {
                    clone.style.display = 'table-header-group';
                    clone.style.transform = `translateX(-${container.scrollLeft}px)`;
                } else {
                    clone.style.display = 'none';
                }
            };

            container.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = onScroll;
            container.addEventListener('scroll', onScroll);

            console.log(`[FluxoFinanceiroUI] ✅ Header fixo v8.0 (JS puro) - altura: ${altura}px`);
        }, 200);
    }
```

**DEPOIS (v9.0 - Clone com position: fixed):**

```javascript
    /**
     * ✅ v9.0: Header fixo via position: fixed no viewport
     *
     * Problema das versoes anteriores:
     * - CSS sticky nao funciona com transform em ancestrais (mesmo apos animacao)
     * - Clone de <thead> com position: absolute tem comportamento inconsistente
     *
     * Solucao v9.0:
     * - Criar wrapper <div> com position: fixed no viewport
     * - Dentro, criar <table> completa com apenas o <thead> clonado
     * - Posicionar no topo do container visivel
     * - Mostrar apenas quando usuario scrolla para baixo
     */
    _aplicarStickyHeader() {
        setTimeout(() => {
            const container = document.querySelector('.fluxo-tabela-container');
            const tabela = container?.querySelector('.fluxo-participantes-tabela, .tabela-financeira');
            const thead = tabela?.querySelector('thead');

            if (!container || !tabela || !thead) {
                console.log('[FluxoFinanceiroUI] Elementos nao encontrados para sticky header');
                return;
            }

            // Remover clone anterior se existir
            document.querySelector('.sticky-header-clone')?.remove();

            // Calcular altura do container
            const rect = container.getBoundingClientRect();
            const alturaDisponivel = window.innerHeight - rect.top - 40;
            const altura = Math.max(300, Math.min(alturaDisponivel, window.innerHeight * 0.7));

            // Configurar container com scroll interno
            container.style.cssText = `
                max-height: ${altura}px;
                overflow-y: auto;
                overflow-x: auto;
                position: relative;
            `;

            // Criar wrapper fixo no viewport
            const wrapper = document.createElement('div');
            wrapper.className = 'sticky-header-clone';
            wrapper.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                display: none;
                overflow: hidden;
                pointer-events: none;
            `;

            // Criar tabela clone (estrutura completa para renderizacao correta)
            const cloneTable = document.createElement('table');
            cloneTable.className = tabela.className;
            cloneTable.style.cssText = `
                margin: 0;
                width: ${tabela.offsetWidth}px;
                table-layout: fixed;
                border-collapse: separate;
                border-spacing: 0;
                background: #1a1a1a;
                box-shadow: 0 2px 8px rgba(0,0,0,0.8);
                pointer-events: auto;
            `;

            // Clonar thead
            const cloneThead = thead.cloneNode(true);
            cloneTable.appendChild(cloneThead);

            // Copiar larguras exatas das colunas
            const thsOriginal = thead.querySelectorAll('th');
            const thsClone = cloneThead.querySelectorAll('th');
            thsOriginal.forEach((th, i) => {
                if (thsClone[i]) {
                    const width = th.getBoundingClientRect().width;
                    thsClone[i].style.width = `${width}px`;
                    thsClone[i].style.minWidth = `${width}px`;
                    thsClone[i].style.maxWidth = `${width}px`;
                    thsClone[i].style.background = '#1a1a1a';
                    thsClone[i].style.borderBottom = '2px solid #FF5500';
                    thsClone[i].style.boxSizing = 'border-box';
                }
            });

            wrapper.appendChild(cloneTable);
            document.body.appendChild(wrapper);

            // Funcao para atualizar posicao do header clone
            const atualizarPosicao = () => {
                const containerRect = container.getBoundingClientRect();
                const scrollTop = container.scrollTop;
                const scrollLeft = container.scrollLeft;

                // Mostrar clone apenas quando thead original sair da view
                if (scrollTop > 5 && containerRect.top < window.innerHeight && containerRect.bottom > 0) {
                    wrapper.style.display = 'block';
                    wrapper.style.top = `${Math.max(0, containerRect.top)}px`;
                    wrapper.style.left = `${containerRect.left}px`;
                    wrapper.style.width = `${containerRect.width}px`;
                    cloneTable.style.transform = `translateX(-${scrollLeft}px)`;
                } else {
                    wrapper.style.display = 'none';
                }
            };

            // Listeners
            container.removeEventListener('scroll', this._scrollHandler);
            window.removeEventListener('scroll', this._windowScrollHandler);
            window.removeEventListener('resize', this._resizeHandler);

            this._scrollHandler = atualizarPosicao;
            this._windowScrollHandler = atualizarPosicao;
            this._resizeHandler = () => {
                // Recalcular larguras no resize
                const thsOrig = thead.querySelectorAll('th');
                const thsCloneNew = cloneThead.querySelectorAll('th');
                thsOrig.forEach((th, i) => {
                    if (thsCloneNew[i]) {
                        const width = th.getBoundingClientRect().width;
                        thsCloneNew[i].style.width = `${width}px`;
                        thsCloneNew[i].style.minWidth = `${width}px`;
                        thsCloneNew[i].style.maxWidth = `${width}px`;
                    }
                });
                cloneTable.style.width = `${tabela.offsetWidth}px`;
                atualizarPosicao();
            };

            container.addEventListener('scroll', this._scrollHandler);
            window.addEventListener('scroll', this._windowScrollHandler, { passive: true });
            window.addEventListener('resize', this._resizeHandler, { passive: true });

            console.log(`[FluxoFinanceiroUI] ✅ Sticky header v9.0 (fixed) - altura container: ${altura}px`);
        }, 200);
    }
```

**Motivo:** A versao v8.0 clonava o `<thead>` diretamente e aplicava `display: table-header-group` com `position: absolute`, o que nao funciona porque:
1. Elementos `<thead>` fora de `<table>` nao renderizam corretamente
2. O `position: absolute` em elementos table tem comportamento inconsistente entre browsers

A v9.0 usa `position: fixed` no viewport, criando uma `<table>` completa com apenas o header, posicionada exatamente sobre o container original.

---

### 2. fluxo-financeiro.css - Adicionar estilos para cleanup

**Path:** `public/css/modules/fluxo-financeiro.css`
**Tipo:** Modificacao
**Impacto:** Baixo
**Dependentes:** Nenhum

#### Mudancas Cirurgicas:

**Apos linha 3190 (apos scrollbar styles): ADICIONAR**

```css
/* =============================================================================
   ✅ v9.0: STICKY HEADER CLONE - Estilos para header fixo via JavaScript
   O JS cria um clone com position: fixed. Este CSS e backup/override.
   ============================================================================= */

/* Wrapper do clone - position fixed no viewport */
.sticky-header-clone {
    position: fixed !important;
    z-index: 1000 !important;
    pointer-events: none !important;
    overflow: hidden !important;
}

/* Tabela clone dentro do wrapper */
.sticky-header-clone table {
    pointer-events: auto !important;
    background: #1a1a1a !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8) !important;
}

/* Celulas do header clone */
.sticky-header-clone th {
    background: #1a1a1a !important;
    border-bottom: 2px solid #FF5500 !important;
    color: #fff !important;
}
```

**Motivo:** Estilos de backup caso os estilos inline do JS nao sejam aplicados corretamente.

---

## Mapa de Dependencias

```
fluxo-financeiro-ui.js (MODIFICAR)
    ├── _aplicarStickyHeader() - Metodo interno, linhas 832-908
    ├── Chamado por: renderizarTabelaPrincipal() - linha 818
    └── Listeners armazenados em: this._scrollHandler, this._windowScrollHandler, this._resizeHandler

fluxo-financeiro.css (MODIFICAR)
    └── Adicionar estilos apos linha 3190

Arquivos NAO afetados (apenas leitura):
    ├── public/js/fluxo-financeiro.js - Apenas instancia FluxoFinanceiroUI
    ├── public/js/fluxo-financeiro/fluxo-financeiro-participante.js - Apenas importa classe
    └── public/detalhe-liga.css - Animacao fadeInUp ja corrigida (transform: none)
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Nao afeta isolamento liga_id (mudanca puramente visual/frontend)
- [x] Nenhuma query de banco envolvida
- [x] Nenhum endpoint de API afetado

### Autenticacao
- [x] Nao requer verificacao (mudanca de UI apenas)

---

## Casos de Teste

### Teste 1: Scroll Vertical Basico
**Setup:** Abrir Fluxo Financeiro com 10+ participantes
**Acao:** Rolar tabela para baixo
**Resultado Esperado:** Header ("#", "Participante", etc.) permanece visivel no topo

### Teste 2: Scroll Horizontal
**Setup:** Abrir Fluxo Financeiro, reduzir largura da janela para forcar scroll horizontal
**Acao:** Rolar tabela horizontalmente
**Resultado Esperado:** Header clone acompanha scroll horizontal (colunas alinhadas)

### Teste 3: Voltar ao Topo
**Setup:** Estar com tabela scrollada para baixo
**Acao:** Rolar de volta ao topo
**Resultado Esperado:** Header clone desaparece quando header original fica visivel

### Teste 4: Resize da Janela
**Setup:** Estar com header clone visivel
**Acao:** Redimensionar janela do browser
**Resultado Esperado:** Larguras das colunas do clone se ajustam

### Teste 5: Navegacao Entre Modulos
**Setup:** Estar no Fluxo Financeiro com header clone visivel
**Acao:** Clicar em outro modulo (ex: "Ranking")
**Resultado Esperado:** Header clone desaparece (removido do DOM ao sair)

### Teste 6: Mobile/Touch
**Setup:** Abrir em dispositivo movel ou emulador
**Acao:** Fazer scroll touch na tabela
**Resultado Esperado:** Header clone funciona identicamente ao desktop

---

## Rollback Plan

### Em Caso de Falha
**Passos de Reversao:**
1. Reverter alteracao no JS: `git checkout public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
2. Reverter alteracao no CSS: `git checkout public/css/modules/fluxo-financeiro.css`
3. Limpar cache do browser (Ctrl+Shift+R)

**Nao requer:**
- Rollback de banco de dados
- Rollback de backend

---

## Checklist de Validacao

### Antes de Implementar
- [x] Arquivos originais analisados (JS linhas 832-908)
- [x] CSS existente mapeado (linhas 2060-3190)
- [x] Dependencias verificadas (nenhuma externa)
- [x] Testes planejados (6 cenarios)
- [x] Rollback documentado (git checkout)

### Durante Implementacao
- [ ] Substituir funcao _aplicarStickyHeader() (linhas 832-908)
- [ ] Adicionar CSS de backup (apos linha 3190)
- [ ] Testar scroll vertical
- [ ] Testar scroll horizontal
- [ ] Testar resize
- [ ] Testar navegacao entre modulos

---

## Ordem de Execucao (Critico)

1. **JavaScript primeiro:**
   - Modificar `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`
   - Substituir funcao `_aplicarStickyHeader()` (linhas 832-908)

2. **CSS depois:**
   - Modificar `public/css/modules/fluxo-financeiro.css`
   - Adicionar estilos de backup apos linha 3190

3. **Testes:**
   - Testar todos os 6 cenarios documentados
   - Verificar console para log de confirmacao

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-sticky-header-tabela-financeira.md
```

---

**Gerado por:** Spec Protocol v1.0
