# PRD: Remover Seção "Ajustes Financeiros" Redundante do Extrato Individual

**Data:** 2026-01-28
**Fase:** 1 - PESQUISA
**Status:** Completo

---

## 1. Resumo Executivo

Remover a seção "Ajustes Financeiros" e seu botão "Adicionar" do modal de extrato individual do participante na temporada 2026. Esta seção é redundante porque:

1. O botão **"Acerto"** no footer do modal já permite registrar pagamentos/recebimentos
2. O botão "Adicionar" na seção "Ajustes Financeiros" chama a mesma funcionalidade (`abrirModalNovoAjuste` ou `abrirModalAjuste`)
3. Simplifica a UI removendo elemento duplicado

---

## 2. Problema Identificado

No modal de extrato individual (`fluxo-financeiro-ui.js`), existem **duas formas** de adicionar ajustes/acertos:

### 2.1 Botão "Acerto" no Footer (MANTER)
- **Localização:** Linha ~111-112
- **Função:** `window.abrirModalAcertoFromExtrato()`
- **UI:** Botão verde no footer do modal
- **Propósito:** Registrar pagamentos/recebimentos financeiros

### 2.2 Seção "Ajustes Financeiros" (REMOVER)
- **Localização:** Linhas 2373-2398
- **Função:** `renderizarSecaoAjustes()`
- **UI:** Card com título "Ajustes Financeiros" e botão "Adicionar"
- **Propósito:** Mesma funcionalidade do botão "Acerto"

### 2.3 Também encontrada: Seção "Ajustes Manuais" (apenas 2026+)
- **Localização:** Linhas 472-511
- **Condição:** `temporada >= 2026 && window.isAdminMode`
- **UI:** Seção com título "Ajustes Manuais" e botão "Adicionar"
- **NOTA:** Esta seção usa collection `ajustesfinanceiros`, diferente da seção 2.2

---

## 3. Arquivos Afetados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` | JS | Remover seção "Ajustes Financeiros" |
| `public/css/modules/fluxo-financeiro.css` | CSS | Remover estilos `.ajustes-section` (se órfãos) |

---

## 4. Análise Detalhada

### 4.1 Código a Remover (Linhas ~2373-2398)

```javascript
return `
    <div class="card-padrao mb-20 ajustes-section">
        <h4 class="card-titulo" style="font-size: 13px; ...">
            <span style="...">
                <span class="material-icons" ...>tune</span>
                Ajustes Financeiros
            </span>
            ${isAdmin ? `
            <button onclick="window.abrirModalNovoAjuste ? window.abrirModalNovoAjuste('${timeIdSafe}', ${temporada}) : window.abrirModalAjuste && window.abrirModalAjuste()" class="btn-add-ajuste" ...>
                <span class="material-icons" ...>add</span> Adicionar
            </button>
            ` : ''}
        </h4>
        <div class="ajustes-lista">
            ${ajustesHTML}
        </div>
        <!-- Total se houver ajustes -->
    </div>
`;
```

### 4.2 Código do Botão "Acerto" que Permanece (Linha ~111)

```html
<button id="btnModalAcerto" class="btn-modern btn-acerto-gradient"
        onclick="window.abrirModalAcertoFromExtrato()">
    <span class="material-icons" style="font-size: 14px;">payments</span> Acerto
</button>
```

### 4.3 Função que Chama (Já Existe)

```javascript
window.abrirModalAcertoFromExtrato = () => {
    if (this.participanteAtual) {
        const timeId = this.participanteAtual.time_id || this.participanteAtual.id;
        const nome = (this.participanteAtual.nome || this.participanteAtual.nomeTime || 'Participante').replace(/'/g, "\\'");
        const saldo = this.participanteAtual.saldoFinal || this.participanteAtual.saldo || 0;
        if (window.abrirModalAcertoFluxo) {
            window.abrirModalAcertoFluxo(timeId, nome, saldo);
        }
    }
};
```

---

## 5. Verificação de Dependências (S.D.A)

### 5.1 Quem Chama `renderizarSecaoAjustes`?

```bash
grep -rn "renderizarSecaoAjustes" public/js/
```
**Resultado:** Função é definida mas precisa verificar chamadas.

### 5.2 CSS Relacionado

```css
/* public/css/modules/fluxo-financeiro.css */
.ajustes-section { ... }
.btn-add-ajuste { ... }
.ajustes-lista { ... }
.ajustes-total { ... }
```

### 5.3 Funções Globais Relacionadas

- `window.abrirModalNovoAjuste` - Definida em linha ~4368
- `window.abrirModalAjuste` - Definida em linha ~3397
- Ambas continuam existindo para uso em outros contextos

---

## 6. Solução Proposta

### Fase 1: Identificar Função de Renderização
Localizar a função `renderizarSecaoAjustes` e onde ela é chamada.

### Fase 2: Remover Seção
Remover ou comentar o bloco HTML da seção "Ajustes Financeiros" (linhas 2373-2398).

### Fase 3: Verificar CSS
Verificar se classes CSS `.ajustes-section`, `.btn-add-ajuste` são usadas em outros lugares.

### Fase 4: Testar
- Abrir modal de extrato individual
- Verificar que botão "Acerto" funciona
- Confirmar que seção "Ajustes Financeiros" não aparece mais

---

## 7. Impacto

| Aspecto | Impacto |
|---------|---------|
| Funcionalidade | Nenhum - botão "Acerto" mantido |
| UI | Simplificação - menos elementos redundantes |
| UX | Melhor - interface mais limpa |
| Backend | Nenhum - apenas frontend |
| Multi-tenant | N/A - apenas UI |

---

## 8. Checklist de Validação

- [ ] Seção "Ajustes Financeiros" removida
- [ ] Botão "Acerto" no footer continua funcionando
- [ ] Modal de extrato individual renderiza corretamente
- [ ] CSS órfão removido (se aplicável)
- [ ] Nenhuma regressão em outros módulos

---

## 9. Próxima Fase

Executar `/spec` para gerar especificação técnica com mudanças cirúrgicas linha por linha.
