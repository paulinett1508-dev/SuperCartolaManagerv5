# SPEC-AUDIT-EXTRATO-V2 - Correções do Redesign Extrato v2.0

**Data:** 2026-02-10
**PRD de referência:** `PRD-AUDIT-EXTRATO-V2.md`
**Status:** FASE 2 - SPEC pronta para aprovação

---

## 1. ESCOPO DAS CORREÇÕES

Com base na auditoria Fase 1, esta SPEC cobre **1 correção obrigatória** e **1 limpeza de código morto**. Os itens A3 (sparkline) e A4 (background OLED) ficam para BACKLOG conforme recomendação do PRD.

---

## 2. CORREÇÃO A1 - lancamentosIniciais não retornado pela API

### Diagnóstico Confirmado

| Item | Detalhe |
|------|---------|
| **Endpoint afetado** | `GET /api/extrato-cache/:ligaId/times/:timeId/cache` → `getExtratoCache()` |
| **Arquivo** | `controllers/extratoFinanceiroCacheController.js` |
| **Cálculo** | L852-875: `lancamentosIniciais` é filtrado de `transacoesRaw` (tipos: `INSCRICAO_TEMPORADA`, `TRANSFERENCIA_SALDO`, `SALDO_TEMPORADA_ANTERIOR`, `LEGADO_ANTERIOR`, `rodada === 0`) |
| **Resposta JSON** | L950-977: campo **NÃO incluído** na resposta |
| **Endpoint que funciona** | `lerCacheExtratoFinanceiro()` L1573 retorna `lancamentosIniciais: lancamentosIniciais` corretamente |

### Impacto

1. Timeline Admin v2 **nunca mostra grupo "Inscrição"** (taxa + legado)
2. `saldoAcumulado` na timeline começa em R$0 (ignora lançamentos iniciais)
3. "Follow the Money" quebrado: saldo final correto no hero (backend calcula), mas itens individuais ausentes na timeline

### Correção

**Arquivo:** `controllers/extratoFinanceiroCacheController.js`
**Localização:** Bloco `res.json({...})` em `getExtratoCache` (~L950)

**Adicionar 1 campo:**
```javascript
res.json({
    cached: true,
    fonte: 'cache',
    qtdRodadas: rodadasConsolidadas.length,
    rodadas: rodadasConsolidadas,
    resumo: resumoCalculado,
    camposManuais: camposAtivos,
    acertos: acertos,
    lancamentosIniciais: lancamentosIniciais,  // ← ADICIONAR AQUI
    // ... resto permanece igual
});
```

**Posição exata:** Após `acertos: acertos,` e antes de `ligaConfig: {`

### Validação

- Após o fix, abrir extrato admin v2 de qualquer participante
- Verificar que o grupo "Inscrição" aparece na timeline
- Confirmar que `saldoAcumulado` das rodadas inicia com o valor correto (incluindo taxa + legado)
- Comparar com `lerCacheExtratoFinanceiro` que já funciona

### Risco

**ZERO** - é adicionar 1 campo que já está calculado e disponível na variável local. Não altera nenhum cálculo existente.

---

## 3. DECISÃO A2 - Footer actions v2

### Diagnóstico Confirmado

| Item | Detalhe |
|------|---------|
| **CSS v2 footer** | `extrato-v2.css` L891-953: classes `.extrato-footer-v2`, `.extrato-footer-v2__btn`, `--primary`, `--secondary`, `--ghost` |
| **HTML gerado** | `extrato-render-v2.js` L503-533: `renderExtratoV2()` **NÃO gera footer** |
| **Modal chrome** | `fluxo-financeiro-ui.js` L112-126: modal **JÁ TEM botões** no footer do modal (fora do body v2) |

### Botões existentes no modal chrome

```html
<div class="modal-extrato-footer">
    <button id="btnModalAcerto" onclick="window.abrirModalAcertoFromExtrato()">
        Acerto (payments icon)
    </button>
    <button id="btnModalPDF" onclick="window.exportarExtratoPDFFromModal()">
        PDF (picture_as_pdf icon)
    </button>
    <button id="btnModalAtualizar" onclick="window.atualizarExtratoModal()">
        Atualizar (refresh icon)
    </button>
</div>
```

### Decisão: LIMPAR CSS morto (não implementar footer v2)

**Justificativa:**
1. O modal chrome **já fornece** os 3 botões de ação (Acerto, PDF, Atualizar)
2. Adicionar footer dentro do v2 body seria **duplicação** de botões
3. O CSS footer v2 é **código morto** - nunca usado, nunca será
4. Manter CSS não utilizado polui o bundle e confunde futuras manutenções

### Correção

**Arquivo:** `public/css/extrato-v2.css`
**Ação:** Remover bloco L891-953 (classes `.extrato-footer-v2*`)

### Risco

**ZERO** - são classes CSS que não são referenciadas por nenhum HTML.

---

## 4. BACKLOG (não será implementado agora)

| ID | Item | Motivo |
|----|------|--------|
| A3 | Performance sparkline no App | Feature cosmética, App usa v11.0 independente |
| A4 | Background #1a1a1a vs #0a0a0a | Intencional, consistente com design system |

---

## 5. RESUMO DE MUDANÇAS

| # | Arquivo | Ação | Linhas afetadas |
|---|---------|------|-----------------|
| 1 | `controllers/extratoFinanceiroCacheController.js` | Adicionar `lancamentosIniciais` na resposta JSON | +1 linha (~L968) |
| 2 | `public/css/extrato-v2.css` | Remover CSS footer v2 morto | -63 linhas (L891-953) |

**Total: +1 / -63 linhas**

---

## 6. PLANO DE EXECUÇÃO

1. Fix A1: Adicionar campo na resposta do controller
2. Cleanup A2: Remover CSS morto do footer v2
3. Testar: Verificar endpoint retorna `lancamentosIniciais` e timeline renderiza grupo "Inscrição"

---

*Gerado em 2026-02-10 | AUDIT-001 Fase 2 SPEC*
