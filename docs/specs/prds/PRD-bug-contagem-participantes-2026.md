# PRD - Bug Contagem de Participantes 2026

**Data:** 24/01/2026
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** URGENTE

---

## Resumo Executivo

Dois bugs críticos detectados no sistema que causam exibição incorreta de participantes na temporada 2026:

1. **BUG SIDEBAR**: Exibe contagem total de `liga.times` (33) ao invés de filtrar por quem renovou para 2026
2. **BUG LISTA PARTICIPANTES**: Quando `temporada === temporadaLiga`, ignora completamente a collection `inscricoestemporada` e retorna TODOS os 33 participantes, incluindo os 3 que marcaram `nao_participa`

---

## Contexto e Análise

### Dados Reais (Liga SuperCartola 2026)

| Fonte | Contagem |
|-------|----------|
| `liga.times.length` | 33 |
| `liga.participantes.length` | 33 |
| `inscricoestemporada` (status=renovado) | 29 |
| `inscricoestemporada` (status=novo) | 1 |
| `inscricoestemporada` (status=nao_participa) | 3 |
| **Participantes ATIVOS em 2026** | **30** |

A sidebar e a lista mostram 33 quando deveriam mostrar **30**.

---

## Arquivos Afetados

### Backend

| Arquivo | Problema |
|---------|----------|
| `controllers/ligaController.js:87` | `timesCount: liga.times?.length` - não filtra por temporada |
| `routes/ligas.js:762-786` | Quando `temporadaFiltro === temporadaLiga`, usa `liga.participantes` sem consultar inscrições |

### Frontend

| Arquivo | Problema |
|---------|----------|
| `public/layout.html:329` | `const timesCount = liga.timesCount || liga.times?.length || 0` - usa contagem errada |

---

## Análise Detalhada dos Bugs

### BUG 1: Sidebar (Contagem Errada)

**Fluxo Atual:**
```
layout.html
  → carregarLigasLayout()
  → fetch("/api/ligas")
  → ligaController.listarLigas()
  → timesCount: liga.times?.length || 0  ❌ ERRADO
  → Exibe "33" na sidebar
```

**Problema:** O controller retorna `timesCount` baseado em `liga.times.length`, que é o array histórico de todos que já participaram. Não considera:
- Temporada atual da liga
- Status de renovação em `inscricoestemporada`

**Solução:**
- Para temporadas >= 2026, contar apenas inscrições com `status IN ('renovado', 'novo')`
- Adicionar campo `timesCountAtivo` no retorno da API

---

### BUG 2: Lista de Participantes (Ignora Inscrições)

**Fluxo Atual:**
```
participantes.js
  → carregarParticipantesPorTemporada(2026)
  → fetch(`/api/ligas/${ligaId}/participantes?temporada=2026`)
  → routes/ligas.js:745

  if (temporadaFiltro === temporadaLiga) {  // 2026 === 2026 = TRUE
    fonte = "liga.participantes";           // ❌ Ignora inscricoestemporada!
    participantes = liga.participantes;     // Retorna TODOS os 33
  }
```

**Problema:** A lógica assume que se a temporada solicitada é igual à temporada base da liga, não precisa consultar inscrições. Mas isso ignora que:
- Sistema de renovação foi implementado em 2026
- 3 participantes marcaram `nao_participa`
- Esses 3 NÃO devem aparecer na lista 2026

**Solução:**
- SEMPRE consultar `inscricoestemporada` para temporadas >= 2026
- Usar `liga.participantes` apenas para temporadas históricas (2025 e anteriores) onde não havia sistema de inscrição

---

## Dependências Mapeadas

### Collection `inscricoestemporada`
- **Índice:** `liga_id + time_id + temporada` (único)
- **Status possíveis:** `pendente`, `renovado`, `nao_participa`, `novo`
- **Método útil:** `InscricaoTemporada.estatisticas(ligaId, temporada)`

### Model `InscricaoTemporada.js`
- **Linha 240:** `estatisticas()` - retorna contagem por status
- **Linha 368:** `vaiParticipar()` - `status === 'renovado' || status === 'novo'`

---

## Solução Proposta

### Correção 1: `ligaController.js` (listarLigas)

**Antes (linha 87):**
```javascript
timesCount: liga.times?.length || 0,
```

**Depois:**
```javascript
// Para cada liga, consultar contagem real de inscritos ativos na temporada
// Usar InscricaoTemporada.estatisticas() para temporadas >= 2026
// Fallback para liga.times.length para temporadas <= 2025
```

**Impacto:** Requer agregação adicional para buscar contagem de inscrições por liga. Pode impactar performance se não otimizado.

**Alternativa:** Adicionar cache de contagem no modelo Liga ou usar aggregation pipeline.

---

### Correção 2: `routes/ligas.js` (endpoint participantes)

**Antes (linha 763):**
```javascript
if (temporadaFiltro === temporadaLiga) {
  fonte = "liga.participantes";
  // ... usa liga.participantes direto
}
```

**Depois:**
```javascript
// SEMPRE consultar inscricoestemporada para temporadas >= 2026
// independente de ser temporadaLiga ou não
if (temporadaFiltro >= 2026) {
  const inscricoes = await InscricaoTemporada.find({...});
  if (inscricoes.length > 0) {
    // Usar inscrições como fonte
  }
}
// Fallback para liga.participantes apenas se não houver inscrições
```

---

## Regras de Negócio

### Quem Aparece na Lista 2026?
- `status === 'renovado'` → **SIM**
- `status === 'novo'` → **SIM**
- `status === 'pendente'` → **SIM** (ainda decidindo)
- `status === 'nao_participa'` → **NÃO**

### Contagem no Sidebar
- Mostrar apenas quem VAI participar: `renovado + novo`
- Ou mostrar "30 de 33" para indicar renovações pendentes

---

## Riscos e Considerações

### Impactos Previstos
- **Positivo:** Exibição correta de participantes ativos
- **Atenção:** Performance da query de contagem de inscrições
- **Risco:** Temporadas históricas (2025) podem não ter inscrições - precisa fallback

### Multi-Tenant
- [x] Validado isolamento liga_id em todas as queries

### Backward Compatibility
- Temporadas <= 2025: continuar usando `liga.participantes` (não havia sistema de inscrição)
- Temporadas >= 2026: SEMPRE usar `inscricoestemporada` quando disponível

---

## Testes Necessários

### Cenário 1: Sidebar SuperCartola
**Setup:** Liga SuperCartola com temporada 2026
**Esperado:** Sidebar mostra "30" (não 33)

### Cenário 2: Lista Participantes 2026
**Setup:** Acessar detalhe-liga > Participantes > Aba 2026
**Esperado:**
- Lista mostra 30 participantes (não 33)
- Os 3 que marcaram `nao_participa` NÃO aparecem

### Cenário 3: Temporada Histórica 2025
**Setup:** Acessar detalhe-liga > Participantes > Aba 2025
**Esperado:** Lista mostra participantes de 2025 (usando `extratofinanceirocaches` como fonte)

### Cenário 4: Liga Sem Inscrições
**Setup:** Liga nova sem registros em `inscricoestemporada`
**Esperado:** Fallback para `liga.participantes`

---

## Próximos Passos

1. ✅ PRD validado
2. Gerar Spec: Executar `/spec .claude/docs/PRD-bug-contagem-participantes-2026.md`
3. Implementar: Executar `/code` com Spec gerado

---

**Gerado por:** Pesquisa Protocol v1.0 (High Senior Edition)
