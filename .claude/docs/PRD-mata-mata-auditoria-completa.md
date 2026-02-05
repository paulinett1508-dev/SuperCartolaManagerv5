# PRD: Mata-Mata - Correcoes da Auditoria Completa

**Data:** 05/02/2026
**Origem:** Auditoria Module Auditor (5 categorias)
**Score inicial:** 60/100
**Meta:** 90/100+

---

## Resumo Executivo

O modulo Mata-Mata possui um **bug critico em producao** que impede completamente o uso (ranking base 0/32 na pre-temporada), alem de problemas de integridade financeira, logica de negocio hardcoded, e issues de UI/seguranca. Este PRD consolida **12 correcoes** organizadas por prioridade.

---

## Arquivos Identificados

### Frontend (a modificar)
| Arquivo | Linhas | Issues |
|---------|--------|--------|
| `public/js/mata-mata/mata-mata-orquestrador.js` | 687 | Bug critico pre-temporada, inline styles |
| `public/js/mata-mata/mata-mata-config.js` | 166 | Edicoes hardcoded, FASE_NUM_JOGOS estatico |
| `public/js/mata-mata/mata-mata-financeiro.js` | 492 | Sem chaveIdempotencia, sem temporada |
| `public/js/mata-mata/mata-mata-ui.js` | 389 | XSS em renderErrorState, valores hardcoded, responsividade |

### Backend (a modificar)
| Arquivo | Linhas | Issues |
|---------|--------|--------|
| `controllers/mata-mata-backend.js` | ~350 | Precisa endpoint para registrar financeiro |

### CSS (a modificar)
| Arquivo | Issues |
|---------|--------|
| `public/css/modules/mata-mata.css` | Responsividade mobile |

---

## Dependencias Mapeadas

1. `rodadas-core.js` - Fornece `getRankingRodadaEspecifica()` (importado dinamicamente)
2. `cache-manager.js` - Cache local de confrontos
3. `clubes-data.js` - Mapa de nomes de clubes
4. `config/rules/mata_mata.json` - Regras padrao
5. `models/ModuleConfig.js` - Config por liga/temporada
6. `models/MataMataCache.js` - Cache MongoDB
7. `config/seasons.js` - CURRENT_SEASON

---

## Correcoes por Prioridade

### PRIORIDADE CRITICA (Bloqueia uso do modulo)

#### FIX-1: Bug pre-temporada - Ranking base 0/32
**Arquivo:** `mata-mata-orquestrador.js`
**Linhas:** 434-512

**Problema:** Quando usuario seleciona edicao na pre-temporada, `carregarFase()` busca ranking da rodada de definicao (rodada 2) que nao tem dados. O erro "Ranking base invalido: 0/32" e lancado.

**Solucao:**
- Em `carregarFase()`, antes de buscar ranking base (linha 502), verificar:
  - Se `rodada_atual < rodadaDefinicao` → renderizar estado "aguardando dados"
  - Se `rodada_atual === 0` → renderizar estado "temporada nao iniciou"
- Desabilitar edicoes cujo `rodadaDefinicao > rodada_atual` no selector (alem de ativas/inativas)

**Impacto:** Modulo volta a funcionar na pre-temporada sem erro

---

#### FIX-2: Integracao com extratofinanceiro
**Arquivo:** `controllers/mata-mata-backend.js`

**Problema:** Resultados financeiros sao calculados mas NUNCA registrados no `extratofinanceiro`. Sem "Follow the Money".

**Solucao:**
- Criar endpoint `POST /api/mata-mata/registrar-financeiro`
- Para cada resultado de confronto, criar entrada no extratofinanceiro:
  ```
  tipo: 'debito' ou 'credito'
  valor: valoresFase.vitoria ou valoresFase.derrota
  descricao: 'Mata-Mata Edicao X - Fase Y - Vitoria/Derrota'
  chaveIdempotencia: 'matamata-{edicaoId}-{fase}-{timeId}-{temporada}'
  temporada: CURRENT_SEASON
  timeId: String(timeId)
  metadata: { modulo: 'mata_mata', edicao, fase, rodada }
  ```
- Verificar `chaveIdempotencia` antes de criar (idempotente)

**Impacto:** Rastreabilidade financeira completa

---

### PRIORIDADE ALTA (Antes de producao)

#### FIX-3: Carregar edicoes da API
**Arquivos:** `mata-mata-config.js`, `mata-mata-orquestrador.js`

**Problema:** 6 edicoes hardcoded em `mata-mata-config.js:5-54`. O wizard permite configurar `qtd_edicoes` mas o frontend ignora.

**Solucao:**
- Mover definicao de edicoes para o backend/config
- Frontend busca edicoes via API: `GET /api/liga/{ligaId}/modulos/mata_mata`
- O `wizard_respostas.qtd_edicoes` define quantas edicoes gerar
- `edicoes` deixa de ser `const` e passa a ser carregado dinamicamente
- Backend calcula rodadas com base no calendario

**Impacto:** Cada liga pode ter numero diferente de edicoes

---

#### FIX-4: Valores financeiros dinamicos
**Arquivos:** `mata-mata-config.js`, `mata-mata-financeiro.js`, `mata-mata-ui.js`

**Problema:** `VALORES_FASE` hardcoded (R$10/-R$10) no frontend. UI compara `valorA === 10` literalmente.

**Solucao:**
- Frontend busca valores da config da liga (mesma chamada do FIX-3)
- `wizard_respostas.valor_vitoria` e `valor_derrota` alimentam `VALORES_FASE`
- UI renderiza valores dinamicamente: `R$ ${Math.abs(valorA).toFixed(2)}`
- Remover comparacao hardcoded `=== 10` e `=== -10`

**Impacto:** Ligas podem configurar valores diferentes

---

#### FIX-5: Escape XSS em renderErrorState
**Arquivo:** `mata-mata-ui.js`
**Linha:** 189

**Problema:** `${error.message}` inserido via innerHTML sem escape.

**Solucao:**
```javascript
<p><strong>Erro:</strong> ${esc(error.message)}</p>
```

**Impacto:** Previne XSS via mensagens de erro manipuladas

---

#### FIX-6: Verificar modulos_ativos
**Arquivo:** `mata-mata-orquestrador.js`

**Problema:** Modulo carrega sem verificar se mata-mata esta ativo na liga.

**Solucao:**
- Antes de renderizar, verificar `liga.modulos_ativos.mata_mata`
- Se desabilitado, nao carregar o modulo
- Pode ser feito no `detalhe-liga-orquestrador.js` antes de injetar script

**Impacto:** Respeita configuracao de modulos da liga

---

### PRIORIDADE MEDIA (Proximo sprint)

#### FIX-7: Responsividade mobile na tabela
**Arquivo:** `mata-mata-ui.js`, `mata-mata.css`

**Problema:** Tabela de confrontos sem `overflow-x-auto`, estoura em mobile.

**Solucao:**
- Adicionar `overflow-x-auto` no container `.mata-mata-table-container`
- Adicionar breakpoints `sm:` e `md:` para ajustar layout
- Testar em viewport 375px (iPhone SE)

---

#### FIX-8: Remover inline styles
**Arquivo:** `mata-mata-orquestrador.js`
**Linhas:** 356-391

**Problema:** `renderizarAguardandoDados()` tem 30+ linhas de inline CSS.

**Solucao:**
- Mover estilos para classes em `mata-mata.css`
- Usar classes Tailwind ou CSS customizado

---

#### FIX-9: Padronizar fallback de escudo
**Arquivo:** `mata-mata-ui.js`

**Problema:** Dois padroes diferentes:
- Linha 264: `onerror="this.style.display='none'"` (esconde)
- Linha 358: `onerror="this.src='/escudos/default.png'"` (mostra default)

**Solucao:** Padronizar para `onerror="this.src='/escudos/default.png'"` em todos os lugares

---

#### FIX-10: Filtro de temporada no financeiro
**Arquivo:** `mata-mata-financeiro.js`

**Problema:** `getResultadosMataMataFluxo()` nao filtra edicoes por temporada. Em 2027, edicoes de 2026 podem ser recalculadas.

**Solucao:**
- Adicionar campo `temporada` nas edicoes
- Filtrar por temporada atual nas queries

---

### PRIORIDADE BAIXA (Backlog)

#### FIX-11: Cache de vencedores por fase
**Arquivo:** `mata-mata-orquestrador.js`
**Linhas:** 565-588

**Problema:** Para carregar a FINAL, recalcula TODAS as fases anteriores.

**Solucao:** Cachear vencedores de cada fase (nao apenas confrontos) para evitar recalculos.

---

#### FIX-12: Rate limiting nos endpoints de cache
**Arquivo:** Backend routes

**Problema:** Endpoints `POST/GET /api/mata-mata/cache/*` sem rate limiting.

**Solucao:** Adicionar middleware `rateLimit` com 100 req/15min.

---

## Proxima Acao

```
PRD gerado com sucesso!

LIMPAR CONTEXTO:
1. Feche esta conversa
2. Abra nova conversa
3. Execute: /workflow ler PRD-mata-mata-auditoria-completa.md e gerar Spec
```
