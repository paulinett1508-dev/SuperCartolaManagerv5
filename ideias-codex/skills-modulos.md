# Ideias de Skills (Módulos)

Data: 27 jan 2026

## Objetivo
Registrar a lista de skills por domínio (módulo) e o esqueleto padrão para criação.

---

## Lista proposta de skills por domínio
(orientação: skills por **domínio**, não por arquivo)

- **skill-season-context**
  - Padrões de temporada (URL/localStorage/config), SeasonContext e fallback.
  - Evitar sobrescrita de temporada pela API externa.

- **skill-orquestrador-liga**
  - Orquestrador de módulos, navegação SPA, lazy-load, event delegation.

- **skill-layout-ui**
  - Layout base, header/side, cards condicionais, padrões de UI.

- **skill-renovacao**
  - Regras de renovação, modais, integrações com quitação, cálculos.

- **skill-pontos-corridos**
  - Orquestrador, cache, UI, modo somente leitura, fallback sem dados.

- **skill-ranking**
  - Ranking geral/turno, cache, fallback, pré‑temporada, endpoints.

- **skill-fluxo-financeiro**
  - Acertos, extrato, quitação, ajustes, validações.

- **skill-schedulers**
  - Parciais/luva/backup, cron, reprocessos e logs.

- **skill-admin-api-models**
  - Controllers/models/rotas, payloads, validações e contratos.

---

## Skill exemplo (ajustada): ranking‑rodadas
**Nome sugerido:** `skill-ranking-rodadas`

**Escopo:** ranking_rodada (config, consolidação, snapshot e leitura por rodada)

**Fora de escopo:** pontos‑corridos, ranking geral/turnos.

### Fluxo principal
1) Config da liga: `controllers/rodadaController.js` usa `ranking_rodada`.
2) Consolidação: `controllers/consolidacaoController.js` calcula `ranking_rodada` e grava no snapshot.
3) Leitura: `routes/ligas.js` expõe `/api/ligas/:id/ranking/:rodada`.

### Regras inegociáveis
- `liga.configuracoes.ranking_rodada` é fonte de verdade.
- Suporta `temporal`, `rodada_transicao`, `fase1/fase2`, `faixas`.
- Snapshot consolidado (v2+) inclui `dados_consolidados.ranking_rodada`.
- Rota de ranking por rodada deve filtrar inativos e ordenar por pontos.

### Checklist
- Validar **ranking_rodada temporal** (fase1/fase2) e `rodada_transicao`.
- Garantir snapshot completo.
- Testar rota com filtro de inativos.

---

## Esqueleto padrão sugerido para skills
```md
---
name: skill-<dominio>
description: <quando usar + objetivo em 1 frase>
---

# <Domínio>

## Quando usar
- <gatilhos claros>

## Regras inegociáveis
- <o que não pode quebrar>

## Fluxo principal
1) <passo>
2) <passo>

## Arquivos‑chave
- <paths>

## Dependências e integrações
- <módulos que acoplam>

## Checklist de mudança
- <validações rápidas>

## Riscos e armadilhas
- <regressões comuns>

## Referências (se necessário)
- references/<arquivo.md>
```

---

## Ideia de “commands” (em vez de skill)
Scripts pontuais de auditoria/regeneração podem virar **commands** simples, sem skill completa.
Exemplos (ranking/rodadas):
- `scripts/verificar-ranking-snapshot.js`
- `scripts/regenerar-cache-timeline.js`
- `scripts/corrigir-caches-2025.js`
- `scripts/regenerar-caches-liga.js`
- `scripts/restore-ranking-data.js`
- `scripts/fix-r38-cache.js`
