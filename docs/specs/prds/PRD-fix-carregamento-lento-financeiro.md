# PRD - Fix Carregamento Lento Tela Financeiro (iPhone)

**Data:** 2026-01-17
**Autor:** Claude (Pesquisa Protocol)
**Status:** Draft
**Prioridade:** P1 - Afeta UX em dispositivos móveis

---

## Resumo Executivo

Usuário de iPhone reporta que a tela "Financeiro" do app participante não carrega, exibindo mensagem "Carregamento lento - O servidor está demorando para responder" após 15 segundos.

A causa raiz é a **execução sequencial de 5 requisições HTTP** que, em redes móveis lentas (4G fraco), acumulam latência suficiente para exceder o timeout de 15s.

---

## Contexto e Análise

### Fluxo Atual (Sequencial)

```
carregarExtrato()
    │
    ├─► 1. verificarRenovacao() ────► /api/inscricoes/{liga}/{temp}/{time}
    │       (timeout: 5s)                    └─► 1-3s em 4G
    │
    ├─► 2. fetch mercado/status ────► /api/cartola/mercado/status
    │                                        └─► 0.7-2s
    │
    ├─► 3. fetch cache ─────────────► /api/extrato-cache/.../cache
    │       (timeout: 10s)                   └─► 2-5s (documento grande ~20KB)
    │
    ├─► 4. [se não cache] calcular ─► /api/fluxo-financeiro/.../extrato
    │                                        └─► 3-8s (cálculo pesado)
    │
    └─► 5. buscarCamposEditaveis() ─► /api/fluxo-financeiro/.../times/...
                                             └─► 1-2s
```

**Total em rede boa:** ~5-8s
**Total em 4G fraco:** ~12-20s (excede timeout de 15s)

### Módulos Identificados

**Frontend:**
- `public/participante/js/modules/participante-extrato.js` - Lógica principal (v4.7)
  - Linha 337: `TIMEOUT_MS = 15000` (15s)
  - Linha 339-352: Função `mostrarTimeoutError()` que exibe a mensagem
  - Linha 361-367: `Promise.race` para verificação de renovação (5s)
  - Linha 461-468: `AbortController` com timeout de 10s para fetch cache

**Backend:**
- `controllers/extratoFinanceiroCacheController.js` - Cache de extrato (v6.6)
  - Linha 1262: `lerCacheExtratoFinanceiro()` - 4 queries ao MongoDB
- `controllers/inscricoesController.js` - Verificação de renovação
- `controllers/fluxoFinanceiroController.js` - Cálculo de extrato

### Dependências Mapeadas

```
participante-extrato.js
    ├── importa: participante-extrato-ui.js (renderização)
    ├── usa: window.ParticipanteCache (IndexedDB)
    ├── usa: window.ParticipanteConfig (configurações globais)
    └── chama: 5 endpoints de API
```

### Índices MongoDB (Verificados)

| Collection | Índice Composto | Status |
|------------|----------------|--------|
| `extratofinanceirocaches` | `{liga_id, time_id, temporada}` único | ✅ OK |
| `inscricoestemporada` | `{liga_id, time_id, temporada}` único | ✅ OK |

**Conclusão:** Índices estão corretos. Problema não é query lenta.

---

## Solução Proposta

### Abordagem 1: Paralelizar Requisições (Recomendado)

Executar requisições independentes em paralelo com `Promise.all`:

```javascript
// ANTES (sequencial ~15s)
const status = await verificarRenovacao(ligaId, timeId);
const mercado = await fetch("/api/cartola/mercado/status");
const cache = await fetch(urlCache);

// DEPOIS (paralelo ~5s)
const [status, mercado, cacheResponse] = await Promise.all([
    verificarRenovacao(ligaId, timeId),
    fetch("/api/cartola/mercado/status").then(r => r.json()).catch(() => ({ rodada_atual: 1 })),
    fetch(urlCache, { signal: controller.signal })
]);
```

### Abordagem 2: Aumentar Timeout (Paliativo)

Aumentar `TIMEOUT_MS` de 15s para 25-30s. **Não recomendado** - apenas mascara o problema.

### Abordagem 3: Endpoint Unificado (Ideal, maior esforço)

Criar endpoint `/api/participante/{timeId}/financeiro-completo` que retorna tudo em uma única chamada:
- Status de renovação
- Cache de extrato
- Campos editáveis
- Acertos financeiros

**Benefício:** 1 requisição HTTP ao invés de 5
**Esforço:** Médio (novo endpoint no backend)

---

## Arquivos a Modificar

### Frontend (Abordagem 1)

1. `public/participante/js/modules/participante-extrato.js`
   - Linha ~360-470: Refatorar para usar `Promise.all`
   - Linha 337: Considerar aumentar timeout para 20s como fallback

### Backend (Abordagem 3 - Opcional)

1. **Criar:** `controllers/participanteFinanceiroController.js`
   - Endpoint unificado que agrega todas as queries

2. **Criar:** `routes/participante-financeiro-routes.js`
   - Rota: `GET /api/participante/:ligaId/:timeId/financeiro`

---

## Regras de Negócio

1. **Cache IndexedDB tem prioridade** - Se existe cache local válido, exibir imediatamente
2. **Timeout não deve bloquear** - Se uma requisição falhar, usar fallback/default
3. **Renovação é opcional** - Se falhar verificação, assumir `renovado: false`
4. **Experiência mobile-first** - Otimizar para conexões lentas (4G, 3G)

---

## Riscos e Considerações

### Impactos Previstos

- **Positivo:** Redução de 50-60% no tempo de carregamento
- **Positivo:** Menos usuários vendo erro de timeout
- **Atenção:** Mudança no fluxo de dados pode introduzir bugs

### Compatibilidade

- `Promise.all` é suportado em todos os browsers modernos
- Safari iOS 12+ suporta `AbortController`

### Multi-Tenant

- [ ] Não afeta isolamento - todas as queries já filtram por `ligaId`

---

## Testes Necessários

### Cenários de Teste

1. **Rede boa (WiFi):** Carregar extrato em <5s
2. **Rede lenta (4G simulado):** Carregar extrato em <15s
3. **Sem cache:** Calcular extrato do zero
4. **Com cache válido:** Exibir imediatamente do IndexedDB
5. **Participante renovado 2026:** Exibir dados da nova temporada
6. **Participante não renovado:** Exibir dados de 2025
7. **Timeout parcial:** Uma requisição falha, outras continuam

### Como Simular Rede Lenta

Chrome DevTools → Network → Throttling → "Slow 3G" ou "Custom" (latency: 300ms)

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo médio carregamento (WiFi) | ~5s | ~3s |
| Tempo médio carregamento (4G) | ~15s+ | ~8s |
| Taxa de timeout | ~10-15% em mobile | <2% |

---

## Próximos Passos

1. **Validar PRD** com stakeholder
2. **Gerar Spec:** Executar `/spec PRD-fix-carregamento-lento-financeiro.md`
3. **Implementar:** Executar `/code` com Spec gerado

---

## Quick Fix Imediato (Opcional)

Se precisar resolver urgentemente antes da refatoração completa:

```javascript
// participante-extrato.js linha 337
const TIMEOUT_MS = 25000; // Aumentar de 15s para 25s
```

**Prós:** Resolve imediatamente para a maioria dos casos
**Contras:** Usuário ainda espera mais tempo, não resolve causa raiz

---

**Gerado por:** Pesquisa Protocol v1.0
**Arquivos analisados:** 4 controllers, 2 collections MongoDB, 1 módulo frontend
