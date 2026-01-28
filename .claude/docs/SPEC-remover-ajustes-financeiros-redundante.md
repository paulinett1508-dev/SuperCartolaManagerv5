# SPEC: Remover Seção "Ajustes Financeiros" Redundante

**Data:** 2026-01-28
**PRD:** PRD-remover-ajustes-financeiros-redundante.md
**Status:** IMPLEMENTADO

---

## 1. Resumo das Mudanças

Remover a seção "Ajustes Financeiros" do modal de extrato individual para temporada 2026+, pois:
1. O botão **"Acerto"** no footer já permite a mesma funcionalidade
2. A UI fica mais limpa sem elemento redundante

---

## 2. Arquivos a Modificar

| Arquivo | Linha | Ação |
|---------|-------|------|
| `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` | 2168-2174 | Modificar retorno para 2026 |

---

## 3. Mudanças Cirúrgicas

### 3.1 Arquivo: `public/js/fluxo-financeiro/fluxo-financeiro-ui.js`

#### Mudança 1: Função `renderizarCamposEditaveis` (linha 2165-2175)

**DE (código atual):**
```javascript
    async renderizarCamposEditaveis(timeId) {
        const temporada = this.temporadaModalExtrato || window.temporadaAtual || 2026;

        if (temporada >= 2026) {
            // ✅ v8.0: Novo sistema - ajustes dinâmicos ilimitados
            return await this.renderizarAjustesDinamicos(timeId, temporada);
        } else {
            // ✅ v8.0: Sistema legado - 4 campos fixos (mantém compatibilidade 2025)
            return await this.renderizarCamposFixos(timeId);
        }
    }
```

**PARA (código novo):**
```javascript
    async renderizarCamposEditaveis(timeId) {
        const temporada = this.temporadaModalExtrato || window.temporadaAtual || 2026;

        if (temporada >= 2026) {
            // ✅ v8.9: Seção "Ajustes Financeiros" REMOVIDA para temporada 2026+
            // Motivo: Redundante com botão "Acerto" no footer do modal
            // O admin usa o botão "Acerto" (payments) para registrar movimentações
            return "";
        } else {
            // ✅ v8.0: Sistema legado - 4 campos fixos (mantém compatibilidade 2025)
            return await this.renderizarCamposFixos(timeId);
        }
    }
```

#### Mudança 2: Atualizar Header de Versão (linha 17)

**DE:**
```javascript
 * FLUXO-FINANCEIRO-UI.JS - v8.8.1 (Seletor de Temporada Inteligente)
```

**PARA:**
```javascript
 * FLUXO-FINANCEIRO-UI.JS - v8.9 (Seção Ajustes Financeiros Removida)
```

#### Mudança 3: Adicionar Log de Versão no Header (após linha 21)

**Adicionar:**
```javascript
 * ✅ v8.9: Seção "Ajustes Financeiros" REMOVIDA para 2026+ (redundante com botão Acerto)
```

---

## 4. O que NÃO Modificar

- **Função `renderizarAjustesDinamicos`** (linhas 2277-2399): Manter código, mas não será chamada para 2026
- **Botão "Acerto" no footer** (linha 111): MANTER - é a forma principal de adicionar movimentações
- **CSS `.ajustes-section`**: Manter - pode ser usado em outros contextos
- **Seção "Ajustes Manuais" na tabela** (linhas 472-511): MANTER - é outra seção diferente

---

## 5. Verificação de Impacto

### 5.1 Funções Preservadas
- `window.abrirModalAcertoFromExtrato()` - MANTIDA
- `window.abrirModalAcertoFluxo()` - MANTIDA
- `window.abrirModalNovoAjuste()` - MANTIDA (não é removida, apenas não será chamada via seção)

### 5.2 UI Resultante
```
+------------------------------------------+
|     Modal Extrato Individual 2026        |
+------------------------------------------+
|  [Header: Nome do Participante]          |
|  [Card: Resultado 2026: R$ X,XX]         |
|  [Card: Saldo Pendente: R$ Y,YY]         |
|                                          |
|  [Tabela de Rodadas - se houver]         |
|                                          |
|  [Seção Acertos - lista existente]       |
|                                          |
|  ❌ REMOVIDA: Seção "Ajustes Financeiros"|
+------------------------------------------+
|  Footer: [Acerto] [PDF] [Fechar]         |
+------------------------------------------+
```

---

## 6. Testes de Validação

### 6.1 Teste Manual
1. Acessar Detalhe Liga > Fluxo Financeiro (temporada 2026)
2. Clicar em um participante para abrir extrato individual
3. **Verificar:** Seção "Ajustes Financeiros" NÃO aparece
4. **Verificar:** Botão "Acerto" no footer funciona normalmente
5. Trocar para temporada 2025
6. **Verificar:** Campos fixos legados aparecem normalmente

### 6.2 Funcionalidade Mantida
- [ ] Botão "Acerto" abre modal de acerto financeiro
- [ ] Modal de acerto permite registrar pagamento/recebimento
- [ ] Extrato 2025 mostra campos fixos legados (campo1-4)
- [ ] Lista de acertos continua visível no extrato

---

## 7. Rollback

Se necessário reverter:
```javascript
// Reverter linha 2168-2174 para chamar renderizarAjustesDinamicos novamente
if (temporada >= 2026) {
    return await this.renderizarAjustesDinamicos(timeId, temporada);
}
```

---

## 8. Checklist Final

- [x] Função `renderizarCamposEditaveis` retorna string vazia para 2026+
- [x] Header de versão atualizado para v8.9
- [x] Changelog adicionado no header
- [x] Seção "Ajustes Manuais" removida de `renderizarExtratoTemporada` (linhas 473-512)
- [x] Hint message atualizada para mencionar apenas botão "Acerto"
- [ ] Teste: Extrato 2026 não mostra seção "Ajustes Financeiros"
- [ ] Teste: Botão "Acerto" funciona
- [ ] Teste: Extrato 2025 funciona normalmente
