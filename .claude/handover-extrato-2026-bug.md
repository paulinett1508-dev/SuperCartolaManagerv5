# HANDOVER: Bug Crítico no Extrato 2026 - Mauricio Wendel

## Problema Relatado
O extrato individual 2026 do Mauricio Wendel (time_id: 5254799) está mostrando:
- ❌ Dívida de R$ 11,00 (não deveria existir)
- ❌ Rodada 23 (temporada 2026 ainda não começou!)
- ❌ Ignorando saldo remanescente de 2025 (R$ 1.118,38)

## Sintoma
O frontend está **misturando dados de 2025 com 2026**, exibindo rodadas e valores da temporada anterior quando deveria mostrar apenas:
- Crédito herdado 2025: +R$ 1.298,38
- Taxa inscrição PAGA: -R$ 180,00
- Saldo inicial 2026: R$ 1.118,38

## Estado do Banco (CORRETO)

### Cache 2026 (`extratofinanceirocaches`)
```javascript
{
  liga_id: "684cb1c8af923da7c7df51de",
  time_id: 5254799,
  temporada: 2026,
  saldo_consolidado: 1118.38,
  ultima_rodada_consolidada: 0,  // PRÉ-TEMPORADA
  historico_transacoes: [
    { rodada: 0, tipo: "CREDITO_TEMPORADA_ANTERIOR", valor: 1298.38 },
    { rodada: 0, tipo: "INSCRICAO_PAGA", valor: -180 }
  ]
}
```

### API Backend (CORRETO)
```bash
GET /api/extrato-cache/.../times/5254799/cache/valido?temporada=2026
# Retorna: saldo: 1118.38, preTemporada: true, rodadas: []
```

## Hipóteses de Causa

### 1. Frontend não detectando pré-temporada corretamente
- `window.temporadaAtual` pode estar como 2025 em vez de 2026
- `isPreTemporada` pode estar false quando deveria ser true
- Código pode estar caindo no bloco de "temporada normal" em vez de "pré-temporada"

### 2. Cache do navegador
- Service Worker pode estar servindo dados antigos
- IndexedDB pode ter cache de 2025

### 3. Seletor de temporada
- O seletor pode estar em 2025 visualmente mostrando "2026"
- Ou o contrário: mostrando 2026 mas buscando dados de 2025

## Arquivos Relevantes

### Frontend (onde o problema provavelmente está)
- `public/js/fluxo-financeiro/fluxo-financeiro-core.js` - Lógica de cálculo do extrato
  - Linhas 301-307: Detecção de pré-temporada
  - Linhas 341-382: Bloco quando cache válido em pré-temporada
  - Linhas 517-560: Bloco fallback pré-temporada sem cache
- `public/js/fluxo-financeiro/fluxo-financeiro-ui.js` - Renderização

### Variáveis críticas a verificar
```javascript
window.temporadaAtual  // Deve ser 2026
isPreTemporada         // Deve ser true
temporadaSelecionada   // Deve ser 2026
```

## Correções Já Aplicadas (sessão anterior)
1. ✅ Corrigidas 11 chamadas de `carregarTodosCamposEditaveis` para passar temporada
2. ✅ Corrigido `quitacaoController.js` - usa String(ligaId) em vez de ObjectId
3. ✅ Corrigidos 5 documentos com liga_id como ObjectId para String
4. ✅ Cache 2026 tem dados corretos (verificado via MCP Mongo)
5. ✅ API retorna dados corretos (verificado via curl)

## ✅ CORREÇÃO APLICADA (sessão atual - 2026-01-23)

### Causa Raiz Identificada
**Defaults inconsistentes nos fallbacks de `window.temporadaAtual`:**
- `fluxo-financeiro.js` (init) usava default `2026` ✓
- `fluxo-financeiro-cache.js` usava default `2026` ✓
- `fluxo-financeiro-core.js` usava default `2025` ✗ **← PROBLEMA**
- `fluxo-financeiro-campos.js` usava default `2025` ✗
- `fluxo-financeiro-ui.js` usava default `2025` em alguns locais ✗
- `fluxo-financeiro-auditoria.js` usava default `2025` ✗
- `fluxo-financeiro-pdf.js` usava default `2025` ✗

**Resultado:** Se `window.temporadaAtual` não estivesse definido no momento da chamada
(race condition), o código buscava cache de 2025 em vez de 2026.

### Arquivos Corrigidos
1. `fluxo-financeiro-core.js` v6.10
   - Linhas 58, 247, 705, 768, 1225: `|| 2025` → `|| 2026`
   - Linha 1226: `TEMPORADA_CARTOLA = 2025` → `TEMPORADA_CARTOLA = 2026`

2. `fluxo-financeiro-campos.js`
   - Todas as ocorrências: `|| 2025` → `|| 2026`

3. `fluxo-financeiro-auditoria.js`
   - Linha 43: `|| 2025` → `|| 2026`

4. `fluxo-financeiro-ui.js`
   - Linhas 554, 780-781, 1047, 1437, 1571, 2062, 2305: `|| 2025` → `|| 2026`
   - Nota: Linha 2078 (renderizarCamposFixos) mantida como `|| 2025` pois é legado

5. `fluxo-financeiro-pdf.js`
   - Linha 95: `|| 2025` → `|| 2026`

### Resultado Esperado
Ao acessar o extrato 2026 do Mauricio Wendel, o frontend agora deve:
1. Usar default `2026` quando `window.temporadaAtual` não estiver definido
2. Buscar cache da temporada 2026 (não 2025)
3. Exibir corretamente: Saldo R$ 1.118,38 (crédito 2025 - inscrição)

## Próximos Passos Sugeridos

1. **Verificar no console do navegador:**
   ```javascript
   console.log('temporadaAtual:', window.temporadaAtual);
   console.log('temporadaSelecionada:', document.querySelector('[data-temporada]')?.dataset?.temporada);
   ```

2. **Verificar a URL da requisição no Network tab:**
   - Qual temporada está sendo passada na URL?
   - A resposta do servidor está correta?

3. **Verificar se o frontend está entrando no bloco correto:**
   - Adicionar console.log no início de `calcularExtratoFinanceiro`
   - Verificar valor de `isPreTemporada`

4. **Limpar cache completo:**
   - DevTools > Application > Clear Storage > Clear site data
   - Unregister Service Workers

## Comando para Verificar Cache MongoDB
```javascript
// Via MCP Mongo
mcp__mongo__find_documents({
  collection: "extratofinanceirocaches",
  query: '{"time_id": 5254799, "temporada": 2026}',
  limit: 1
})
```

## Participante Afetado
- **Nome:** Mauricio Wendel
- **time_id:** 5254799
- **Liga ID:** 684cb1c8af923da7c7df51de
- **Saldo esperado 2026:** R$ 1.118,38
