# SPEC: Remover Linha Fixa "Inscrição 2026" do Extrato Individual

**Data:** 2026-01-27
**PRD:** PRD-extrato-individual-remover-inscricao-fixa.md
**Status:** Pronto para Implementação

---

## 1. Arquivo a Modificar

**Arquivo:** `/home/runner/workspace/public/js/fluxo-financeiro/fluxo-financeiro-ui.js`

---

## 2. Mudanças Cirúrgicas

### 2.1 Mudança 1: Simplificar Labels (linhas ~1997-2014)

**ANTES:**
```javascript
let labelSaldoTemporada = 'Resultado Temporada:';
let iconeSaldoTemporada = 'history';

if (isPreTemporada) {
    if (pagouInscricao) {
        // ✅ v6.8: Pagou inscrição - saldo vem de ajustes/créditos, não da inscrição
        labelSaldoTemporada = `Saldo Inicial ${temporadaAtual}:`;
        iconeSaldoTemporada = 'account_balance';
    } else {
        // Não pagou - mostrar como inscrição pendente
        labelSaldoTemporada = `Inscrição ${temporadaAtual}:`;
        iconeSaldoTemporada = 'person_add';
    }
} else if (extrato.rodadas?.length === 0 && saldoTemporada !== 0) {
    // Temporada iniciada mas sem rodadas ainda, com saldo inicial
    labelSaldoTemporada = `Saldo Inicial ${temporadaAtual}:`;
    iconeSaldoTemporada = 'account_balance';
}
```

**DEPOIS:**
```javascript
let labelSaldoTemporada = 'Resultado Temporada:';
let iconeSaldoTemporada = 'history';

// ✅ v8.7: Simplificado - sempre "Saldo Inicial" para pré-temporada
// Removido label "Inscrição XXXX" que era redundante com botões Acerto/Ajustes
if (isPreTemporada || (extrato.rodadas?.length === 0 && saldoTemporada !== 0)) {
    labelSaldoTemporada = 'Saldo Inicial:';
    iconeSaldoTemporada = 'account_balance';
}
```

### 2.2 Mudança 2: Adicionar Sub-linha de Status de Inscrição (após linha ~2061)

**ANTES (linha 2060-2061):**
```javascript
                        <span class="${corSaldoTemp}" style="font-weight: 700; font-size: 15px;">${saldoTemporada >= 0 ? '+' : '-'}R$ ${formatarValor(saldoTemporada)}</span>
                    </div>
```

**DEPOIS:**
```javascript
                        <span class="${corSaldoTemp}" style="font-weight: 700; font-size: 15px;">${saldoTemporada >= 0 ? '+' : '-'}R$ ${formatarValor(saldoTemporada)}</span>
                    </div>
                    ${isPreTemporada ? `
                    <!-- ✅ v8.7: Sub-linha informativa de status de inscrição -->
                    <div style="display: flex; justify-content: flex-end; padding: 4px 12px 0; font-size: 11px; color: rgba(255,255,255,0.5);">
                        <span style="display: flex; align-items: center; gap: 4px;">
                            <span class="material-icons" style="font-size: 12px; color: ${pagouInscricao ? '#10b981' : '#f59e0b'};">${pagouInscricao ? 'check_circle' : 'schedule'}</span>
                            Inscrição ${pagouInscricao ? 'paga' : 'pendente'}
                        </span>
                    </div>
                    ` : ''}
```

### 2.3 Mudança 3: Atualizar Versão do Módulo (linha ~3)

**ANTES:**
```javascript
 * ✅ v8.6: Extrato simplificado: removida seção "Lançamentos" redundante
```

**DEPOIS:**
```javascript
 * ✅ v8.7: Extrato: label "Inscrição" substituído por "Saldo Inicial" + sub-linha informativa
```

### 2.4 Mudança 4: Atualizar console.log de versão (buscar "v8.6")

**ANTES:**
```javascript
console.log('[FLUXO-UI] v8.6 - Extrato simplificado: removida seção "Lançamentos" redundante');
```

**DEPOIS:**
```javascript
console.log('[FLUXO-UI] v8.7 - Extrato: label "Saldo Inicial" + sub-linha status inscrição');
```

---

## 3. Verificações Pós-Implementação

### 3.1 Testes Manuais

1. **Participante que PAGOU inscrição (Os Fuleros - Enderson, Erivaldo):**
   - Deve mostrar "Saldo Inicial: R$ 0,00"
   - Sub-linha: "Inscrição paga" (verde)

2. **Participante que NÃO PAGOU inscrição (outros):**
   - Deve mostrar "Saldo Inicial: -R$ 100,00"
   - Sub-linha: "Inscrição pendente" (amarelo)

3. **Temporada iniciada (2025):**
   - Deve mostrar "Resultado Temporada:"
   - SEM sub-linha de inscrição

### 3.2 Console

Verificar log:
```
[FLUXO-UI] v8.7 - Extrato: label "Saldo Inicial" + sub-linha status inscrição
```

---

## 4. Rollback

Se necessário reverter, restaurar linhas 1997-2014 e 2060-2061 para versão v8.6.

---

## 5. Dependências

Nenhuma mudança em backend necessária. Campos já disponíveis:
- `extrato.preTemporada`
- `extrato.resumo.pagouInscricao`
- `extrato.inscricao.pagouInscricao`

---

**Versão:** 1.0
**Autor:** Workflow (Fase 2 - Spec)
