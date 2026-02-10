# PRD-AUDIT-EXTRATO-V2 - Auditoria Completa do Redesign Extrato v2.0

**Data:** 2026-02-10
**Commit auditado:** `5ee7c41` (feat(extrato): redesign Inter-inspired para Admin e App v2.0)
**Status:** FASE 1 CONCLUIDA - Diagnostico completo

---

## 1. RESUMO EXECUTIVO

O commit `5ee7c41` introduziu +2.334 linhas em 7 arquivos implementando redesign do extrato financeiro com visual Inter-inspired. A auditoria identificou **1 bug funcional critico**, **2 gaps funcionais**, e **3 itens cosmeticos/incompletos**.

### Veredicto Geral
- **Admin v2**: 85% implementado - funcional com 1 bug critico (lancamentosIniciais)
- **App participante**: NAO usa v2 - continua com v11.0 independente (CSS tweaks apenas)
- **Backend**: Inconsistencia entre dois endpoints (getExtratoCache vs lerCacheExtratoFinanceiro)

---

## 2. SPEC vs CODIGO - GAP ANALYSIS

### 2.1 Admin (Desktop) - Features Prometidas

| Feature | Spec | Codigo | Status | Detalhes |
|---------|------|--------|--------|----------|
| Hero Card (saldo) | Sec 2.1 | `renderHeroCardV2()` L53-112 | ✅ OK | Saldo, status badge, toggle visibilidade, stats pills |
| Grid 2 colunas | Sec 2.2 | CSS `.extrato-admin-grid` L959-980 | ✅ OK | 300px sidebar + 1fr, responsivo 1col < 1024px |
| Timeline expansivel | Sec 2.3 | `renderTimelineV2()` L219-427 | ✅ OK | Groups, expand/collapse, filtros, totais |
| Chart evolucao | Sec 2 | `renderChartV2()` L117-157 | ✅ OK | SVG, gradiente #FF5500, filtros Tudo/10R/5R |
| Acertos Card | Sec 2 | `renderAcertosCardV2()` L162-214 | ✅ OK | Lista, icones, metodo pagamento, empty state |
| Performance Card | Sec 2 | `renderPerformanceV2()` L432-493 | ✅ OK | Mitos, Micos, Zona G, Zona Z, melhor/pior |
| Footer actions | Sec 2 layout | CSS existe (L891-953) | ❌ FALTANDO | CSS pronto mas nenhum HTML gerado em renderExtratoV2 |
| Dark Mode OLED | Sec 1 | CSS usa `var(--surface-card)` | ⚠️ PARCIAL | Fallback #1a1a1a, nao #0a0a0a (spec) |

### 2.2 App (Mobile) - Features Prometidas

| Feature | Spec | Codigo | Status | Detalhes |
|---------|------|--------|--------|----------|
| Hero borda laranja | Sec 4.2 | `extrato-bank.css` L666-681 | ✅ OK | `border-color: rgba(255, 85, 0, 0.15)` |
| Pills contraste | Sec 4.2 | `extrato-bank.css` L683-697 | ✅ OK | background/border mais forte |
| Timeline tipografia | Sec 4.2 | `extrato-bank.css` L699-712 | ✅ OK | font-weight: 700/800 |
| Performance sparkline | Sec 4.2 | NENHUM | ❌ NAO IMPL | Spec menciona "mini sparkline" - nao codado |

### 2.3 Wiring/Integracao (verificado na sessao anterior)

| Item | Status | Arquivo:Linha |
|------|--------|---------------|
| CSS v2 carregado no HTML | ✅ | `detalhe-liga.html:37` |
| JS v2 importado dinamicamente | ✅ | `fluxo-financeiro.js:78` |
| Funcoes exportadas para window | ✅ | 5 funcoes globais |
| Fallback v1 presente | ✅ | `fluxo-financeiro-ui.js:238-256` |
| Setup interatividade (chart/filters) | ✅ | setTimeout(100ms) |

---

## 3. BUGS E PROBLEMAS ENCONTRADOS

### 3.1 [BUG-CRITICO] lancamentosIniciais nao retornados pela API principal

**Severidade:** ALTA - Dados financeiros incorretos
**Arquivo:** `controllers/extratoFinanceiroCacheController.js`

**Problema:**
O endpoint `GET /api/extrato-cache/:ligaId/times/:timeId/cache` (funcao `getExtratoCache`, L610) calcula `lancamentosIniciais` internamente (L852-874) mas NAO inclui na resposta JSON (L950-977).

O render v2 (`extrato-render-v2.js:507`) espera `data.lancamentosIniciais` para renderizar o grupo "Inscricao" na timeline e calcular saldoAcumulado correto.

**Impacto:**
1. Timeline Admin v2 NUNCA mostra grupo "Inscricao" (taxa, legado anterior)
2. Saldo acumulado na timeline comeca em R$0 ignorando lancamentos iniciais
3. Totais da temporada ficam incorretos (nao incluem inscricao/legado)

**Evidencia:**
- `getExtratoCache` L852: `const lancamentosIniciais = transacoesRaw.filter(...)` (calculado)
- `getExtratoCache` L950-977: resposta NAO inclui `lancamentosIniciais`
- `lerCacheExtratoFinanceiro` L1573: `lancamentosIniciais: lancamentosIniciais` (outro endpoint INCLUI)
- `renderTimelineV2` L219-264: espera `lancamentosIniciais` para grupo Inscricao

**Solucao proposta:**
Adicionar `lancamentosIniciais` na resposta de `getExtratoCache` (L950):
```javascript
res.json({
    ...
    lancamentosIniciais: lancamentosIniciais, // ADICIONAR
    ...
});
```

### 3.2 [INCOMPLETO] Footer actions nao renderizado

**Severidade:** MEDIA
**Arquivo:** `extrato-render-v2.js`

**Problema:**
CSS do footer (`extrato-footer-v2`, L891-953 do CSS) existe com botoes "Novo Acerto", "Exportar PDF", "Atualizar". Porem `renderExtratoV2()` (L503-533) NAO gera nenhum HTML de footer.

**Impacto:**
- Sem botoes de acao no modal do extrato v2
- O botao "Atualizar" existe no Hero Card (L77: `window.refreshExtratoModal()`) mas os outros nao

**Nota:** O modal de extrato admin ja pode ter botoes no chrome do modal (fora do container v2). Precisa verificar se `fluxo-financeiro-ui.js` renderiza botoes no footer do modal separadamente.

### 3.3 [INCOMPLETO] Performance sparkline nao implementado no App

**Severidade:** BAIXA
**Arquivo:** `participante-extrato-ui.js`

**Problema:**
Spec Sec 4.2 promete "Performance card com sparkline" para o App mobile, mas nenhum sparkline foi implementado.

**Impacto:** Puramente cosmetico. Card de performance funciona sem sparkline.

### 3.4 [COSMETICO] Dark Mode OLED - background diverge da spec

**Severidade:** BAIXA
**Arquivo:** `extrato-v2.css`

**Problema:**
Spec define fundo OLED como `#0a0a0a` mas CSS usa `var(--surface-card, #1a1a1a)`. O token `--surface-card` em `_admin-tokens.css:30` resolve para `#1a1a1a`.

**Impacto:**
Cards tem fundo `#1a1a1a` em vez de `#0a0a0a`. Visualmente similar, nao afeta funcionalidade. O fundo da pagina (modal) depende do theme geral que usa `bg-gray-900` (#111827).

**Nota:** A diferenca entre #0a0a0a e #1a1a1a eh sutil. O #1a1a1a pode ser intencional para manter consistencia com o design system admin.

---

## 4. APP PARTICIPANTE - ANALISE COMPLETA

### 4.1 NAO usa renderExtratoV2

O App participante (`participante-extrato-ui.js`) eh v11.0 BANK DIGITAL REDESIGN com render proprio:
- `renderHeroSaldoCard()` - classes CSS: `.extrato-hero`, `.extrato-hero--positive`
- `renderQuickStatsRow()` - classes CSS: `.extrato-stats`, `.extrato-stat-pill`
- `renderTransactionTimeline()` - classes CSS: `.extrato-timeline`, `.extrato-timeline__group`
- `renderPerformanceCard()` - classes CSS: `.extrato-performance`
- `renderEvolutionChart()` - usa IDs: `graficoSVG`, `graficoPath`, `graficoArea`

**Estas sao funcoes DIFERENTES das do v2 admin** (que usa `.extrato-hero-v2`, `.extrato-stat-pill-v2`, etc.)

### 4.2 extrato-bank.css - Tweaks Inter-style

O arquivo `extrato-bank.css` adiciona na secao "Inter-Inspired Enhancements (v2.0)" (L662-761):
- Borda laranja sutil no Hero Card
- Stat pills com contraste maior
- Timeline valores mais bold
- Bordas laranja no chart e performance
- Hover effects em desktop

**Sao SOBREPOSICOES CSS** ao v11.0 existente, NAO um redesign v2.

### 4.3 Conclusao App

O App participante tem seu proprio pipeline de renderizacao independente do Admin. O commit 5ee7c41 adicionou apenas CSS tweaks sutis ao App, nao um redesign v2 completo. Isso eh consistente com a spec Sec 3 que diz "Ajustes propostos" (nao redesign).

---

## 5. VALIDACAO MONGODB

### 5.1 Schema ExtratoFinanceiroCache
- 95 documentos na collection
- Schema compativel com dados do render v2
- `historico_transacoes[]` contem rodadas com campos: `bonusOnus`, `pontosCorridos`, `mataMata`, `top10`, `saldo`, `saldoAcumulado`, `isMito`, `isMico`
- Indice composto unico: `liga_id + time_id + temporada`
- Campo `quitacao` para encerramento de temporada

### 5.2 Fluxo de dados API -> Frontend

```
MongoDB (extratofinanceirocaches)
    ↓ historico_transacoes
Controller (getExtratoCache)
    ↓ transformarTransacoesEmRodadas()
    ↓ calcularResumoDeRodadas()
    ↓ buscarAcertosFinanceiros()
    ↓ { rodadas, resumo, acertos, camposManuais }  ← FALTA lancamentosIniciais
Frontend (renderExtratoV2)
    ↓ renderHeroCardV2(resumo)
    ↓ renderChartV2(rodadas)
    ↓ renderAcertosCardV2(acertos)
    ↓ renderTimelineV2(rodadas, resumo, acertos, lancamentosIniciais)  ← sempre []
    ↓ renderPerformanceV2(rodadas)
```

### 5.3 Follow The Money - Trilha de Auditoria

| Etapa | Calculo | Onde | Status |
|-------|---------|------|--------|
| BonusOnus | Banco posicao | `historico_transacoes.bonusOnus` | ✅ OK |
| PontosCorridos | Delta por rodada | `historico_transacoes.pontosCorridos` | ✅ OK |
| MataMata | Resultado duelo | `historico_transacoes.mataMata` | ✅ OK |
| Top10 | Mito/Mico | `historico_transacoes.top10` | ✅ OK |
| Inscricao | Taxa temporada | `lancamentosIniciais` (INSCRICAO_TEMPORADA) | ⚠️ Nao chega no v2 |
| Legado | Saldo anterior | `lancamentosIniciais` (SALDO_TEMPORADA_ANTERIOR) | ⚠️ Nao chega no v2 |
| Acertos | Pagamentos | `buscarAcertosFinanceiros()` | ✅ OK |
| Ajustes | Campos manuais | `buscarCamposManuais()` | ✅ OK |
| Saldo Final | Soma tudo | `resumo.saldo_atual` | ✅ OK (calculo backend correto) |

**NOTA:** O saldo final no `resumo.saldo_atual` INCLUI lancamentosIniciais (calculado no backend L896). O problema eh que o frontend v2 nao recebe os itens para EXIBIR na timeline.

---

## 6. TOKENS CSS - VERIFICACAO

Todas as variaveis CSS usadas em `extrato-v2.css` sao resolvidas:

| Variavel | Definida em | Valor |
|----------|-------------|-------|
| `--color-primary` | `_admin-tokens.css:16` | `#FF5500` |
| `--color-success-light` | `_admin-tokens.css:43` | `#22c55e` |
| `--color-gold` | `_admin-tokens.css:65` | `#ffd700` |
| `--surface-card` | `_admin-tokens.css:30` | `#1a1a1a` |
| `--font-family-brand` | `_admin-tokens.css:92` | `'Russo One'` |
| `--font-family-mono` | `_admin-tokens.css:93` | `'JetBrains Mono'` |
| `--font-family-base` | `_admin-tokens.css:91` | `'Inter'` |

Nao ha variavel CSS sem fallback ou sem definicao.

---

## 7. RESPONSIVIDADE - VERIFICACAO

| Breakpoint | O que muda | Status |
|------------|-----------|--------|
| Desktop (>1024px) | Grid 2 colunas (300px + 1fr) | ✅ OK |
| Tablet (768px-1024px) | Grid 1 coluna | ✅ OK |
| Mobile (<768px) | Padding reduzido, pills scroll horizontal, performance 2x2, footer vertical | ✅ OK |

---

## 8. CODIGO MORTO / IMPORTS QUEBRADOS

Nenhum codigo morto ou import quebrado encontrado nos 7 arquivos do commit.

---

## 9. CLASSIFICACAO DOS ACHADOS

| ID | Tipo | Severidade | Descricao | Arquivo | Acao |
|----|------|-----------|-----------|---------|------|
| A1 | BUG | ALTA | lancamentosIniciais nao retornado pela API | `extratoFinanceiroCacheController.js:950` | FIX: adicionar campo na resposta |
| A2 | INCOMPLETO | MEDIA | Footer actions sem HTML | `extrato-render-v2.js:503-533` | AVALIAR: pode ser intencional |
| A3 | INCOMPLETO | BAIXA | Performance sparkline nao implementado | `participante-extrato-ui.js` | BACKLOG: feature enhancement |
| A4 | COSMETICO | BAIXA | Background #1a1a1a vs spec #0a0a0a | `extrato-v2.css` | IGNORAR: consistente com design system |

---

## 10. RECOMENDACOES PARA FASE 2 (SPEC)

### Prioridade 1 - FIX OBRIGATORIO
1. **A1**: Adicionar `lancamentosIniciais` na resposta de `getExtratoCache` - 1 linha de codigo

### Prioridade 2 - AVALIAR
2. **A2**: Verificar se modal admin ja tem botoes de acao no chrome. Se sim, footer v2 eh redundante. Se nao, implementar.

### Prioridade 3 - BACKLOG
3. **A3**: Sparkline eh feature cosmetica, adicionar ao BACKLOG
4. **A4**: Diferenca de background eh intencional, nao corrigir

---

*Gerado em 2026-02-10 | AUDIT-001 Fase 1*
