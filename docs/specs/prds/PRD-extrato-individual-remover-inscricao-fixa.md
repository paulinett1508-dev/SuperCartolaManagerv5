# PRD: Remover Linha Fixa "Inscrição 2026" do Extrato Individual

**Data:** 2026-01-27
**Status:** Fase 1 Completa
**Liga Foco:** Os Fuleros (6977a62071dee12036bb163e)

---

## 1. Resumo Executivo

O extrato financeiro individual do participante exibe uma linha fixa "Inscrição 2026: -R$ XXX" que é **redundante** com os mecanismos existentes de registro de valores:
- Botão "Acerto" (footer do modal)
- Botão "Adicionar" na seção "Ajustes Manuais"

O admin pode registrar a inscrição manualmente via esses botões, tornando a linha fixa desnecessária e potencialmente confusa.

---

## 2. Problema Identificado

### 2.1 Local do Problema
**Arquivo:** `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`

**Função:** `renderizarFooterExtrato()` (linhas ~1980-2080)

**Código Problemático (linhas 2000-2014):**
```javascript
if (isPreTemporada) {
    if (pagouInscricao) {
        labelSaldoTemporada = `Saldo Inicial ${temporadaAtual}:`;
        iconeSaldoTemporada = 'account_balance';
    } else {
        // Não pagou - mostrar como inscrição pendente
        labelSaldoTemporada = `Inscrição ${temporadaAtual}:`;  // ← PROBLEMA
        iconeSaldoTemporada = 'person_add';
    }
}
```

**Código que Renderiza (linhas 2054-2061):**
```javascript
<!-- RESULTADO DA TEMPORADA / INSCRIÇÃO (histórico, imutável) -->
<div style="...">
    <span style="...">
        <span class="material-icons">${iconeSaldoTemporada}</span>
        ${labelSaldoTemporada}  // ← Exibe "Inscrição 2026:"
    </span>
    <span class="${corSaldoTemp}">${saldoTemporada >= 0 ? '+' : '-'}R$ ${formatarValor(saldoTemporada)}</span>
</div>
```

### 2.2 Por que é Redundante

1. **Botão "Acerto"** no footer do modal já permite registrar pagamentos/recebimentos
2. **Seção "Ajustes Manuais"** com botão "Adicionar" permite criar ajustes com descrição livre
3. O admin pode registrar "Inscrição" como um acerto ou ajuste manual
4. A linha fixa não permite edição nem interação

### 2.3 Confusão Causada

- Participante que pagou via "Acerto" ainda vê "Inscrição 2026: -R$ 100"
- Duplicidade visual de informação
- Label "Inscrição" quando o valor vem de `saldo_inicial_temporada` (pode não ser inscrição)

---

## 3. Solução Proposta

### 3.1 Mudança Principal
Simplificar o label da linha de resumo para sempre usar termos genéricos:

| Cenário | Label Atual | Label Proposto |
|---------|-------------|----------------|
| Pré-temporada, não pagou | "Inscrição 2026:" | "Saldo Inicial:" |
| Pré-temporada, pagou | "Saldo Inicial 2026:" | "Saldo Inicial:" |
| Temporada iniciada | "Resultado Temporada:" | "Resultado Temporada:" |

### 3.2 Comportamento Esperado

1. **Sempre mostrar "Saldo Inicial:"** para pré-temporada (sem mencionar inscrição)
2. Se `saldoTemporada === 0`, mostrar sub-linha opcional:
   - Se `inscricao.pagou_inscricao === true`: "(Inscrição paga)"
   - Se `inscricao.pagou_inscricao === false`: "(Inscrição pendente)"
3. Manter ícones apropriados (`account_balance` para saldo, `history` para resultado)

### 3.3 Alternativa Mais Simples
Remover completamente a lógica condicional de label e usar sempre:
- **Pré-temporada:** "Saldo Inicial:"
- **Pós-temporada:** "Resultado:"

---

## 4. Arquivos Afetados

### 4.1 Arquivo Principal
| Arquivo | Função | Ação |
|---------|--------|------|
| `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` | `renderizarFooterExtrato()` | Simplificar labels |

### 4.2 Dependências (verificar)
| Arquivo | Relevância |
|---------|------------|
| `public/js/fluxo-financeiro/fluxo-financeiro-participante.js` | Chama `renderizarFooterExtrato` |
| `public/js/fluxo-financeiro/fluxo-financeiro-core.js` | Fornece dados de extrato |
| `controllers/extratoFinanceiroCacheController.js` | Envia campo `pagouInscricao` |

---

## 5. Dados do Backend (Referência)

O campo `pagouInscricao` vem de:
```javascript
// Collection: inscricoestemporada
{
    liga_id: ObjectId("6977a62071dee12036bb163e"),
    time_id: 13935277,
    temporada: 2026,
    pagou_inscricao: true,  // ← Este campo
    saldo_inicial_temporada: 0
}
```

O backend já envia isso no extrato via:
- `extrato.resumo.pagouInscricao`
- `extrato.inscricao.pagouInscricao`

---

## 6. Impacto

### 6.1 Visual
- Linha de resumo mais clara e consistente
- Remoção de menção explícita a "inscrição" que pode confundir

### 6.2 Funcional
- Zero impacto em cálculos (apenas label visual)
- Não afeta fluxo de acertos/ajustes

### 6.3 Multi-tenant
- Aplicável a todas as ligas (não é específico de Os Fuleros)

---

## 7. Critérios de Aceite

- [ ] Label nunca exibe "Inscrição XXXX:" explicitamente
- [ ] Pré-temporada mostra "Saldo Inicial:" para todos os casos
- [ ] Temporada iniciada mostra "Resultado:" ou "Resultado Temporada:"
- [ ] Sub-linha opcional indica status de inscrição se relevante
- [ ] Funciona corretamente para Os Fuleros e outras ligas

---

## 8. Próximos Passos

1. **SPEC**: Definir mudanças linha por linha em `fluxo-financeiro-ui.js`
2. **CODE**: Aplicar mudanças cirúrgicas
3. **TESTE**: Verificar em Os Fuleros (6977a62071dee12036bb163e)
4. **VALIDAR**: Extrato de participante que pagou vs não pagou

---

**Versão:** 1.0
**Autor:** Workflow (Fase 1 - Pesquisa)
