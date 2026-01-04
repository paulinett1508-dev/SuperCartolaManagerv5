# Revisao dos Wizards de Modulos

> **Status:** PENDENTE REVISAO DO ADMIN
> **Data:** 2026-01-04
> **Objetivo:** Validar perguntas e defaults de cada modulo antes de liberar para producao

---

## Instrucoes

Para cada modulo, responda:
- [ ] Defaults estao OK?
- [ ] Faltam perguntas?
- [ ] Alguma pergunta desnecessaria?

Adicione comentarios ao lado de cada item se necessario.

---

## 1. RANKING GERAL

**Tipo:** `ranking_acumulado` | **Status:** ativo | **Impacto Financeiro:** Nenhum por default

| # | Pergunta | Tipo | Default | OK? | Comentario |
|---|----------|------|---------|-----|------------|
| 1 | Incluir participantes inativos? | boolean | `true` | | |
| 2 | Premiacao do campeao (R$) | number | `0` | | |

**Observacao:** Modulo informativo. Premiacao zerada significa que nao ha premio automatico.

**Sugestoes/Duvidas:**
- [ ] Deveria ter premiacao default para top 3?
- [ ] Faz sentido ter wizard neste modulo ou deixar sempre ativo?

---

## 2. RANKING DA RODADA (BANCO)

**Tipo:** `ranking_rodada` | **Status:** ativo | **Impacto Financeiro:** Alto (toda rodada)

| # | Pergunta | Tipo | Default | Min | Max | OK? | Comentario |
|---|----------|------|---------|-----|-----|-----|------------|
| 1 | Quantas posicoes de GANHO? | number | `11` | 1 | 20 | | |
| 2 | Quantas posicoes de PERDA? | number | `11` | 1 | 20 | | |
| 3 | Valor do 1o lugar - MITO (R$) | number | `20` | 0 | 100 | | |
| 4 | Valor do ultimo lugar - MICO (R$) | number | `-20` | -100 | 0 | | |
| 5 | Decremento por posicao (R$) | number | `1` | 0 | 10 | | |

**Logica atual:**
- G1 (1o) = R$20, G2 (2o) = R$19, ..., G11 (11o) = R$10
- Zona neutra (12o-21o) = R$0
- Z1 (22o) = -R$10, ..., Z11 (32o) = -R$20

**Sugestoes/Duvidas:**
- [ ] Defaults baseados na SUPERCARTOLA (32 times). Ligas menores precisariam ajustar.
- [ ] Adicionar pergunta "Zona neutra automatica?" (calcula baseado no total de times)?

---

## 3. PONTOS CORRIDOS

**Tipo:** `competicao_confronto` | **Status:** ativo | **Impacto Financeiro:** Medio (1x por rodada)

| # | Pergunta | Tipo | Default | Min | Max | OK? | Comentario |
|---|----------|------|---------|-----|-----|-----|------------|
| 1 | Rodada inicial | number | `7` | 1 | 38 | | |
| 2 | Valor por vitoria (R$) | number | `5` | 0 | 50 | | |
| 3 | Valor por empate (R$) | number | `3` | 0 | 50 | | |
| 4 | Valor por derrota (R$) | number | `-5` | -50 | 0 | | |
| 5 | Tolerancia para empate (pts) | number | `0.3` | 0 | 5 | | |
| 6 | Bonus por goleada (R$) | number | `2` | 0 | 20 | | |

**Logica atual:**
- Confrontos 1x1 em formato round-robin
- Empate = diferenca <= 0.3 pontos
- Goleada = diferenca >= 50 pontos

**Sugestoes/Duvidas:**
- [ ] Rodada 7 e um bom default? Ou deveria ser 1?
- [ ] Limite de goleada (50 pts) deveria ser configuravel?

---

## 4. MATA-MATA

**Tipo:** `competicao_eliminatoria` | **Status:** ativo | **Impacto Financeiro:** Alto (multiplas fases)

| # | Pergunta | Tipo | Default | Opcoes | OK? | Comentario |
|---|----------|------|---------|--------|-----|------------|
| 1 | Quantos times participam? | select | `32` | 8, 16, 32 | | |
| 2 | Quantas edicoes por temporada? | number | `5` | 1-10 | | |
| 3 | Valor por vitoria (R$) | number | `10` | 0-100 | | |
| 4 | Valor por derrota (R$) | number | `-10` | -100-0 | | |
| 5 | Valores progressivos por fase? | boolean | `false` | - | | |

**Logica atual:**
- Chaveamento: 1x32, 2x31, ..., 16x17 (baseado no ranking)
- Desempate: melhor posicao na rodada de definicao
- 5 fases: Primeira, Oitavas, Quartas, Semis, Final

**Sugestoes/Duvidas:**
- [ ] "Valores progressivos" deveria ser `true` por default? (semi/final valem mais)
- [ ] Se progressivo, quais multiplicadores? (ex: semi=1.5x, final=2x)
- [ ] Adicionar opcao "64 times" para ligas grandes?

---

## 5. TOP 10 MITOS/MICOS

**Tipo:** `ranking_historico` | **Status:** ativo | **Impacto Financeiro:** Fim de temporada

| # | Pergunta | Tipo | Default | Min | Max | OK? | Comentario |
|---|----------|------|---------|-----|-----|-----|------------|
| 1 | Quantas posicoes de MITOS? | number | `10` | 3 | 20 | | |
| 2 | Quantas posicoes de MICOS? | number | `10` | 3 | 20 | | |
| 3 | Valor do 1o MITO (R$) | number | `30` | 0 | 500 | | |
| 4 | Valor do 1o MICO (R$) | number | `-30` | -500 | 0 | | |
| 5 | Decremento por posicao (R$) | number | `2` | 0 | 20 | | |

**Logica atual:**
- Analisa TODAS as pontuacoes da temporada
- Top 10 maiores = MITOS (premios)
- Top 10 menores = MICOS (penalidades)
- Decremento: 1o=30, 2o=28, 3o=26, ..., 10o=12

**Sugestoes/Duvidas:**
- [ ] Defaults parecem equilibrados?
- [ ] Mesma pessoa pode aparecer em MITOS e MICOS (pontuacoes diferentes)?

---

## 6. MELHOR DO MES

**Tipo:** `competicao_periodica` | **Status:** ativo | **Impacto Financeiro:** Mensal

| # | Pergunta | Tipo | Default | Min | Max | OK? | Comentario |
|---|----------|------|---------|-----|-----|-----|------------|
| 1 | Quantas edicoes mensais? | number | `7` | 1 | 12 | | |
| 2 | Valor por edicao vencida (R$) | number | `20` | 0 | 200 | | |
| 3 | Bonus campeao geral (R$) | number | `50` | 0 | 500 | | |

**Logica atual:**
- 7 edicoes ao longo da temporada
- Campeao de cada edicao ganha R$20
- Quem vencer mais edicoes ganha bonus de R$50

**Sugestoes/Duvidas:**
- [ ] 7 edicoes e um bom default? Calendario do Brasileirao varia.
- [ ] Bonus so pro maior vencedor ou top 3?

---

## 7. TURNO E RETURNO

**Tipo:** `ranking_periodico` | **Status:** ativo | **Impacto Financeiro:** 2x por temporada

| # | Pergunta | Tipo | Default | Min | Max | OK? | Comentario |
|---|----------|------|---------|-----|-----|-----|------------|
| 1 | Valor por turno vencido (R$) | number | `30` | 0 | 200 | | |
| 2 | Bonus se vencer os 2 turnos (R$) | number | `50` | 0 | 300 | | |

**Logica atual:**
- 1o Turno: Rodadas 1-19
- 2o Turno: Rodadas 20-38
- Campeao de cada turno ganha R$30
- Se mesma pessoa vencer ambos, ganha +R$50 bonus

**Sugestoes/Duvidas:**
- [ ] Defaults parecem OK?
- [ ] Divisao 1-19/20-38 deveria ser configuravel?

---

## 8. LUVA DE OURO

**Tipo:** `ranking_estatistico` | **Status:** ativo | **Impacto Financeiro:** Fim de temporada

| # | Pergunta | Tipo | Default | Min | Max | OK? | Comentario |
|---|----------|------|---------|-----|-----|-----|------------|
| 1 | Premio do 1o lugar (R$) | number | `30` | 0 | 500 | | |
| 2 | Premio do 2o lugar (R$) | number | `20` | 0 | 300 | | |
| 3 | Premio do 3o lugar (R$) | number | `10` | 0 | 200 | | |

**Logica atual:**
- Ranking baseado na pontuacao acumulada dos goleiros escalados
- Premiacao fim de temporada para top 3

**Sugestoes/Duvidas:**
- [ ] Premiar mais posicoes (top 5)?
- [ ] Adicionar "melhor goleiro da rodada" como bonus?

---

## 9. ARTILHEIRO CAMPEAO

**Tipo:** `ranking_estatistico` | **Status:** ativo | **Impacto Financeiro:** Fim de temporada

| # | Pergunta | Tipo | Default | Opcoes | OK? | Comentario |
|---|----------|------|---------|--------|-----|------------|
| 1 | Premio do 1o lugar (R$) | number | `30` | 0-500 | | |
| 2 | Premio do 2o lugar (R$) | number | `20` | 0-300 | | |
| 3 | Premio do 3o lugar (R$) | number | `10` | 0-200 | | |
| 4 | Criterio do ranking | select | `saldo_gols` | Saldo, Gols Pro | | |

**Logica atual:**
- Saldo de Gols = Gols Marcados - Gols Contra
- Premiacao fim de temporada para top 3

**Sugestoes/Duvidas:**
- [ ] Default "saldo_gols" ou "gols_pro"?
- [ ] Adicionar penalidade para quem tomar muitos gols?

---

## 10. CAPITAO DE LUXO (PLANEJADO)

**Tipo:** `ranking_estatistico` | **Status:** planejado | **Impacto Financeiro:** Fim de temporada

| # | Pergunta | Tipo | Default | OK? | Comentario |
|---|----------|------|---------|-----|------------|
| 1 | Premio do 1o lugar (R$) | number | `25` | | |
| 2 | Premio do 2o lugar (R$) | number | `15` | | |
| 3 | Premio do 3o lugar (R$) | number | `10` | | |
| 4 | Premiar melhor capitao de cada rodada? | boolean | `false` | | |

**Logica planejada:**
- Ranking baseado na pontuacao acumulada dos capitaes
- Opcao de bonus por rodada (melhor capitao ganha X)

**Sugestoes/Duvidas:**
- [ ] Valores menores que outros rankings (25 vs 30). Intencional?
- [ ] Bonus por rodada deveria ser `true` por default?

---

## 11. TIRO CERTO (PLANEJADO)

**Tipo:** `competicao_survival` | **Status:** planejado | **Impacto Financeiro:** Por edicao

| # | Pergunta | Tipo | Default | OK? | Comentario |
|---|----------|------|---------|-----|------------|
| 1 | Quantas edicoes por temporada? | number | `3` | | |
| 2 | Premio do campeao (R$) | number | `100` | | |
| 3 | Bonus por invencibilidade (R$) | number | `50` | | |
| 4 | Proibir repetir time na edicao? | boolean | `true` | | |

**Logica planejada:**
- Escolher time do Brasileirao que vai VENCER
- Acertou = avanca, Errou/Empate = eliminado
- Ultimo sobrevivente e campeao

**Sugestoes/Duvidas:**
- [ ] Premio alto (R$100) - intencional por ser dificil?
- [ ] 3 edicoes e suficiente?
- [ ] Restricao de repetir time e essencial para estrategia

---

## 12. RESTA UM (PLANEJADO)

**Tipo:** `competicao_eliminatoria` | **Status:** planejado | **Impacto Financeiro:** Por edicao

| # | Pergunta | Tipo | Default | OK? | Comentario |
|---|----------|------|---------|-----|------------|
| 1 | Quantas edicoes por temporada? | number | `2` | | |
| 2 | Eliminados por rodada | number | `1` | | |
| 3 | Premio do campeao (R$) | number | `100` | | |
| 4 | Premio do vice (R$) | number | `50` | | |
| 5 | Bonus por sobrevivencia? | boolean | `true` | | |

**Logica planejada:**
- Menor pontuacao da rodada e eliminado
- Processo se repete ate restar 1
- Bonus progressivo por cada rodada sobrevivida

**Sugestoes/Duvidas:**
- [ ] 2 edicoes (1o e 2o turno) faz sentido?
- [ ] Eliminar 1 por rodada pode demorar muito em ligas grandes
- [ ] Bonus sobrevivencia: quanto por rodada?

---

## Resumo Geral

| Modulo | Status | Perguntas | Impacto | Prioridade Revisao |
|--------|--------|-----------|---------|-------------------|
| Ranking Geral | ativo | 2 | Baixo | Baixa |
| Ranking Rodada | ativo | 5 | Alto | **Alta** |
| Pontos Corridos | ativo | 6 | Medio | Media |
| Mata-Mata | ativo | 5 | Alto | **Alta** |
| Top 10 | ativo | 5 | Medio | Media |
| Melhor Mes | ativo | 3 | Medio | Media |
| Turno/Returno | ativo | 2 | Baixo | Baixa |
| Luva de Ouro | ativo | 3 | Baixo | Baixa |
| Artilheiro | ativo | 4 | Baixo | Baixa |
| Capitao Luxo | planejado | 4 | Baixo | Baixa |
| Tiro Certo | planejado | 4 | Medio | Media |
| Resta Um | planejado | 5 | Medio | Media |

---

## Suas Respostas

### Decisoes Gerais:
- [ ] Todos os defaults estao OK para ligas novas?
- [ ] Algum modulo NAO deveria ter wizard (sempre usar JSON)?
- [ ] Ordem de prioridade para ajustes?

### Comentarios Adicionais:
```
(escreva aqui seus comentarios gerais)


```

---

*Apos revisao, submeta este documento para implementacao dos ajustes.*
