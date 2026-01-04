# 📊 RELATÓRIO DE AUDITORIA - Sistema Financeiro
**Data:** 04/01/2026  
**Escopo:** Fluxo Financeiro, Tesouraria, Extrato Participante, Acertos

---

## 🔴 DISCREPÂNCIAS CRÍTICAS

### 1. **TIPOS DE ID INCONSISTENTES** (Problema conhecido, alto risco)

| Collection | Campo | Tipo | Arquivo |
|------------|-------|------|---------|
| `ExtratoFinanceiroCache` | `time_id` | **Number** | `models/ExtratoFinanceiroCache.js` |
| `FluxoFinanceiroCampos` | `timeId` | **String** | `models/FluxoFinanceiroCampos.js` |
| `AcertoFinanceiro` | `timeId` | **String** | `models/AcertoFinanceiro.js` |

**Impacto**: Queries podem falhar silenciosamente se não houver cast correto.

```javascript
// ❌ FALHA: time_id Number vs timeId String
await ExtratoFinanceiroCache.findOne({ time_id: "13935277" }); // String = FALHA
await FluxoFinanceiroCampos.findOne({ timeId: 13935277 });     // Number = FALHA
```

---

### 2. **TEMPORADA HARDCODED vs DINÂMICA**

| Arquivo | Temporada | Problema |
|---------|-----------|----------|
| `config/seasons.js` | `CURRENT_SEASON = 2026` | ✅ Correto |
| `acertos-financeiros-routes.js` | `temporada = 2025` | ❌ Hardcoded |
| `participante-extrato.js` | `RODADA_FINAL_CAMPEONATO = 38` | ⚠️ Hardcoded |
| `fluxo-financeiro-core.js` | `CAMPEONATO_ENCERRADO = true` | ⚠️ Não dinâmico |

**Impacto**: Ao virar a temporada 2026, alguns módulos ainda calcularão com dados de 2025.

---

### 3. **FALTA DE SINCRONISMO ENTRE MÓDULOS**

| Fonte A | Fonte B | Discrepância |
|---------|---------|--------------|
| `fluxoFinanceiroController.js` | `tesouraria-routes.js` | **Cálculos duplicados** - ambos calculam saldo, mas com lógicas diferentes |
| `extratoFinanceiroCacheController.js` | `acertos-financeiros-routes.js` | **Cache desincronizado** - acertos não invalidam cache do extrato |

**Evidência**:
- `tesouraria-routes.js:43`: `calcularSaldoCompleto()` recalcula tudo
- `acertos-financeiros-routes.js:37`: `calcularSaldoTotalParticipante()` usa lógica própria

---

## 🟡 ANOMALIAS IMPORTANTES

### 4. **FÓRMULAS DE SALDO DIVERGENTES**

| Local | Fórmula | Problema |
|-------|---------|----------|
| `extratoFinanceiroCacheController.js` | `saldo = totalPago - totalRecebido` | ✅ Correto |
| `AcertoFinanceiro.js` (statics) | `saldoAcertos = totalPago - totalRecebido` | ✅ Correto |
| `admin-tesouraria.js` | Usa valores da API sem recalcular | ⚠️ Depende da API |

**Risco**: Se a API retornar valores errados, o frontend exibirá dados incorretos sem validação.

---

### 5. **CACHE NÃO INVALIDADO EM CASCATA**

| Ação | Cache Invalidado | Cache NÃO Invalidado |
|------|------------------|----------------------|
| Salvar Campo Editável | `FluxoFinanceiroCampos` | ⚠️ `ExtratoFinanceiroCache` |
| Criar Acerto | `AcertoFinanceiro` | ⚠️ `ExtratoFinanceiroCache` |
| Atualizar Rodada | `Rodada` | ⚠️ `ExtratoFinanceiroCache`, `RankingGeralCache` |

**Evidência**: `fluxo-financeiro-campos.js:76` chama `invalidarCacheTime()` mas depende de `window.invalidarCacheTime` existir.

---

### 6. **FALLBACK INCONSISTENTE DE MÓDULOS ATIVOS**

| Arquivo | Padrão se não configurado |
|---------|---------------------------|
| `fluxo-financeiro-cache.js` | `mata-mata: true` |
| `admin-tesouraria.js` | `mataMata: false` |

**Impacto**: Liga nova sem configuração mostrará módulos diferentes no Admin vs Participante.

---

## 🟢 FALTA DE PADRONIZAÇÃO

### 7. **NOMENCLATURA DE MÓDULOS**

```
mataMata vs mata-mata vs mata_mata
pontosCorridos vs pontos-corridos vs pontos_corridos
melhorMes vs melhor-mes vs melhor_mes
```

| Arquivo | Formato Usado |
|---------|---------------|
| Models (liga.configuracoes) | `snake_case`: `mata_mata` |
| Frontend Cache | `kebab-case`: `mata-mata` |
| Admin Tesouraria | `camelCase`: `mataMata` |

---

### 8. **LOGS SEM PREFIXO PADRÃO**

| Arquivo | Prefixo |
|---------|---------|
| `fluxoFinanceiroController.js` | `[FLUXO]`, `[FLUXO-CONTROLLER]` |
| `extratoFinanceiroCacheController.js` | `[CACHE-CONTROLLER]` |
| `fluxo-financeiro-core.js` | `[FLUXO-CORE]` |
| `fluxo-financeiro-cache.js` | `[FLUXO-CACHE]` |
| `admin-tesouraria.js` | `[TESOURARIA]` |

**Sugestão**: Padronizar para `[FINANCEIRO-{modulo}]`.

---

## 📋 RESUMO EXECUTIVO

| Severidade | Quantidade | Ação Recomendada |
|------------|------------|------------------|
| 🔴 Crítico | 3 | Corrigir imediatamente |
| 🟡 Importante | 3 | Resolver em sprint |
| 🟢 Sugestão | 2 | Backlog de refatoração |

---

## 🔧 CORREÇÕES RECOMENDADAS

### 1. Criar função utilitária de cast de IDs
```javascript
// utils/id-utils.js
export const toTimeId = (id, schema) => schema === 'Number' ? Number(id) : String(id);
```

### 2. Centralizar constantes de temporada no frontend
```javascript
// public/js/core/season-config.js
export const CURRENT_SEASON = await fetchCurrentSeason();
```

### 3. Criar barramento de eventos para invalidação de cache
```javascript
// Quando acerto é criado, emitir evento
eventBus.emit('CACHE_INVALIDATE', { ligaId, timeId, collections: ['extrato', 'ranking'] });
```

### 4. Padronizar nomenclatura de módulos
Usar **camelCase** em todo o sistema.

---

## 📁 ARQUIVOS ANALISADOS

### Backend
- `controllers/fluxoFinanceiroController.js`
- `controllers/extratoFinanceiroCacheController.js`
- `routes/tesouraria-routes.js`
- `routes/acertos-financeiros-routes.js`
- `models/ExtratoFinanceiroCache.js`
- `models/FluxoFinanceiroCampos.js`
- `models/AcertoFinanceiro.js`

### Frontend
- `public/js/fluxo-financeiro/fluxo-financeiro-core.js`
- `public/js/fluxo-financeiro/fluxo-financeiro-cache.js`
- `public/js/fluxo-financeiro/fluxo-financeiro-campos.js`
- `public/js/admin/modules/admin-tesouraria.js`
- `public/participante/js/modules/participante-extrato.js`

---

*Relatório gerado automaticamente pelo code-inspector skill*
