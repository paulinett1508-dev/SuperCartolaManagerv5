# PRD - Sticky Header Tabela Financeira (v2.0 - Correcao Definitiva)

**Data:** 2026-01-18 (Atualizado)
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft - REVISADO APOS FALHA v1.0

---

## Resumo Executivo

Implementar header fixo (sticky) na tabela de participantes do Fluxo Financeiro. O cabeçalho com "#", "Participante", "favorite", "Timeline", etc. deve permanecer visível no topo enquanto o usuário rola a lista de participantes.

**ATENCAO:** A abordagem v1.0 (remover transform da animacao) foi implementada mas NAO FUNCIONOU. O CSS sticky continua nao funcionando apesar de:
- Transform removido da animacao fadeInUp
- Estilos sticky aplicados via CSS e JS
- Container com scroll interno configurado

**Nova abordagem proposta (v2.0):** Abandonar CSS sticky e usar JavaScript para clonar e posicionar o header de forma ABSOLUTA dentro do container de scroll.

---

## Contexto e Análise

### Hierarquia DOM Completa

```
body
└── .app-container
    └── main.app-main.detalhe-liga-redesign
        └── .page-content
            └── #secondary-screen.dynamic-content  ← PROBLEMA: animation: fadeInUp (usa transform)
                └── #dynamic-content-area
                    └── #fluxo-financeiro.module-content.module-dashboard
                        └── #fluxoFinanceiroContent.fluxo-financeiro-content
                            └── .fluxo-tabela-container  ← Container com scroll
                                └── table.fluxo-participantes-tabela.tabela-financeira
                                    └── thead  ← Elemento que deveria ser sticky
```

### Arquivos Identificados

**Frontend CSS:**
- `public/detalhe-liga.css:442,581-586` - Animação fadeInUp com transform
- `public/css/modules/fluxo-financeiro.css:2071-2076` - Estilos do container
- `public/css/modules/fluxo-financeiro.css:3004-3043` - Estilos sticky (não funcionam)

**Frontend JS:**
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js:737-739` - Renderização da tabela
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js:821-910` - Função _aplicarStickyHeader()

### Causa Raiz Identificada

```css
/* public/detalhe-liga.css:581-586 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);  /* ← ESTE É O PROBLEMA */
    }
    to {
        opacity: 1;
        transform: translateY(0);     /* ← transform permanece no elemento */
    }
}

/* Aplicado em: */
.dynamic-content,
#secondary-screen {
    animation: fadeInUp 0.3s ease-out;  /* ← Container pai da tabela */
}
```

**Por que quebra o sticky:**
Segundo a especificação CSS, um elemento com `transform` (mesmo `translateY(0)`) cria:
1. Um novo "containing block" para descendentes posicionados
2. Um novo contexto de stacking

Isso faz com que `position: sticky` dentro desse elemento não funcione como esperado em relação ao viewport ou ao container de scroll.

### Tentativas Anteriores (Não Funcionaram)

1. **CSS position: sticky no thead** - Não funcionou devido ao transform no ancestral
2. **JS aplicando estilos inline** - Não funcionou pelo mesmo motivo
3. **Clone do header com position: absolute** - Solução parcial, mas complexa

---

## Solucao Proposta (v2.0)

### Abordagem Escolhida: Clone com Position Absolute (JavaScript)

Abandonar CSS sticky e usar JavaScript para criar um clone do header que fica posicionado absolutamente dentro do container de scroll.

**Por que essa abordagem:**
1. CSS sticky tem muitas restricoes (transform, overflow, z-index em ancestrais)
2. JavaScript oferece controle total sobre posicionamento
3. Funciona em qualquer contexto de stacking

### Arquivos a Modificar

1. **`public/js/fluxo-financeiro/fluxo-financeiro-ui.js`**
   - Linha 832-908: Reescrever `_aplicarStickyHeader()` com abordagem de clone

2. **`public/css/modules/fluxo-financeiro.css`**
   - Adicionar estilos para `.sticky-header-clone`
   - REMOVER regras CSS sticky redundantes (linhas 2060-3135)

### Implementacao Detalhada

```javascript
// fluxo-financeiro-ui.js - _aplicarStickyHeader() v9.0
_aplicarStickyHeader() {
    setTimeout(() => {
        const container = document.querySelector('.fluxo-tabela-container');
        const tabela = container?.querySelector('.fluxo-participantes-tabela, .tabela-financeira');
        const thead = tabela?.querySelector('thead');

        if (!container || !tabela || !thead) return;

        // Remover clone anterior
        container.querySelector('.sticky-header-clone')?.remove();

        // Configurar container
        const rect = container.getBoundingClientRect();
        const altura = Math.min(window.innerHeight - rect.top - 40, window.innerHeight * 0.7);
        container.style.cssText = `
            max-height: ${Math.max(300, altura)}px;
            overflow-y: auto;
            overflow-x: auto;
            position: relative;
        `;

        // Criar wrapper para o clone
        const wrapper = document.createElement('div');
        wrapper.className = 'sticky-header-clone';
        wrapper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            display: none;
            overflow: hidden;
            background: #1a1a1a;
            box-shadow: 0 2px 8px rgba(0,0,0,0.8);
        `;

        // Clonar como tabela completa
        const cloneTable = document.createElement('table');
        cloneTable.className = tabela.className;
        cloneTable.style.cssText = 'margin: 0; width: 100%;';

        const cloneThead = thead.cloneNode(true);
        cloneTable.appendChild(cloneThead);

        // Copiar larguras das colunas
        const thsOriginal = thead.querySelectorAll('th');
        const thsClone = cloneThead.querySelectorAll('th');
        thsOriginal.forEach((th, i) => {
            if (thsClone[i]) {
                const width = th.getBoundingClientRect().width;
                thsClone[i].style.width = `${width}px`;
                thsClone[i].style.minWidth = `${width}px`;
                thsClone[i].style.background = '#1a1a1a';
                thsClone[i].style.borderBottom = '2px solid #FF5500';
            }
        });

        wrapper.appendChild(cloneTable);
        container.insertBefore(wrapper, container.firstChild);

        // Listener de scroll
        const onScroll = () => {
            const scrollTop = container.scrollTop;
            const scrollLeft = container.scrollLeft;

            if (scrollTop > 5) {
                wrapper.style.display = 'block';
                wrapper.style.top = `${scrollTop}px`;
                cloneTable.style.transform = `translateX(-${scrollLeft}px)`;
            } else {
                wrapper.style.display = 'none';
            }
        };

        container.removeEventListener('scroll', this._scrollHandler);
        this._scrollHandler = onScroll;
        container.addEventListener('scroll', onScroll);

        console.log('[FluxoFinanceiroUI] ✅ Sticky header v9.0 (clone absoluto)');
    }, 200);
}
```

### Regras de Negocio

- **R1:** Clone aparece quando `scrollTop > 5px`
- **R2:** Clone acompanha scroll vertical (position absolute + top = scrollTop)
- **R3:** Clone acompanha scroll horizontal (transform translateX)
- **R4:** Clone tem mesmas larguras de colunas que o original
- **R5:** Clone desaparece quando volta ao topo

---

## Riscos e Consideracoes

### Impactos Previstos

- **Positivo:** Header SEMPRE visivel durante scroll (nao depende de CSS sticky)
- **Positivo:** Funciona em qualquer contexto de stacking
- **Atencao:** Clone precisa recalcular larguras se colunas mudarem
- **Atencao:** Performance em tabelas muito grandes (muitos elementos clonados)

### Mitigacao

1. **Larguras desalinhadas:** Recalcular no evento `resize`
2. **Performance:** Clone apenas o `thead` (nao a tabela inteira)
3. **Memoria:** Remover listener ao destruir componente

### Multi-Tenant

- [x] Nao afeta isolamento liga_id (mudanca puramente visual/frontend)

---

## Testes Necessários

### Cenários de Teste

1. **Teste positivo:** Abrir Fluxo Financeiro, rolar tabela para baixo, verificar se header fica fixo
2. **Teste horizontal:** Rolar tabela horizontalmente, verificar se header acompanha
3. **Teste de animação:** Verificar se animação de entrada ainda funciona (fade)
4. **Teste de regressão:** Verificar se outros módulos não foram afetados
5. **Teste mobile:** Verificar comportamento em telas pequenas

### Como Testar

1. Acessar `detalhe-liga.html?id=[liga_id]`
2. Clicar no card "Financeiro"
3. Aguardar carregar lista de participantes
4. Rolar a tabela para baixo
5. **Esperado:** Header ("#", "Participante", etc.) permanece visível no topo

---

## Proximos Passos

1. **LIMPAR CONTEXTO** (nova sessao)
2. Executar: `/spec PRD-sticky-header-tabela-financeira.md`
3. **LIMPAR CONTEXTO** (nova sessao)
4. Executar: `/code SPEC-sticky-header-tabela-financeira.md`

---

## Historico de Tentativas

| Versao | Abordagem | Resultado |
|--------|-----------|-----------|
| v5.1 | CSS sticky + transform: none | NAO FUNCIONOU |
| v6.0 | JS calcula altura dinamica | NAO FUNCIONOU |
| v7.0 | JS + requestAnimationFrame | NAO FUNCIONOU |
| v8.0 | Clone thead com display: table-header-group | NAO FUNCIONOU |
| **v9.0** | **Clone com position: absolute + top: scrollTop** | PENDENTE |

---

**Gerado por:** Pesquisa Protocol v2.0
