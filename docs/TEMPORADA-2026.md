# Temporada 2026 - Cartola FC

## Calendario

| Evento | Data |
|--------|------|
| Abertura do Mercado | **12/01/2026** |
| Inicio do Brasileirao | **28/01/2026** |
| Primeira Rodada Super Cartola | **R1 - 28/01/2026** |

---

## Mudancas 2026

### Sistema "Bom e Barato" - Precos Variaveis

A principal mudanca de 2026. Antes era C$ 5 fixo para todas posicoes. Agora cada posicao tem preco diferente:

| Posicao | Preco 2026 | Preco Anterior |
|---------|------------|----------------|
| Goleiro | C$ 5 | C$ 5 |
| Zagueiro | C$ 6 | C$ 5 |
| Lateral | C$ 7 | C$ 5 |
| Meia | C$ 8 | C$ 5 |
| Atacante | C$ 9 | C$ 5 |

**Justificativa:** Atacantes e meias ofensivos geram mais pontuacao e tem maior demanda, justificando precos iniciais mais elevados.

### Eleitos "Bom e Barato" 2026

| Posicao | Jogador | Time | Votos | Preco |
|---------|---------|------|-------|-------|
| Goleiro | Walter | Mirassol | 50,48% | C$ 5 |
| Zagueiro | *votacao em andamento* | - | - | C$ 6 |
| Lateral | *votacao em andamento* | - | - | C$ 7 |
| Meia | *votacao em andamento* | - | - | C$ 8 |
| Atacante | *votacao em andamento* | - | - | C$ 9 |

---

## Sistema de Pontuacao - SEM MUDANCAS

Os scouts continuam identicos a 2025:

### Scouts Positivos

| Acao | Pontos |
|------|--------|
| Gol | +8.0 |
| Assistencia | +5.0 |
| Defesa de Penalti | +7.0 |
| Saldo de Gols (SG) | +5.0 |
| Finalizacao na Trave | +3.0 |
| Desarme | +1.5 |
| Falta Sofrida | +0.5 |
| Defesa (goleiro) | +1.3 |
| Finalizacao Defendida | +1.0 |
| Finalizacao pra Fora | +0.8 |
| Penalti Sofrido | +1.0 |

### Scouts Negativos

| Acao | Pontos |
|------|--------|
| Gol Contra | -3.0 |
| Cartao Vermelho | -3.0 |
| Cartao Amarelo | -1.0 |
| Gol Sofrido (goleiro) | -1.0 |
| Penalti Perdido | -4.0 |
| Penalti Cometido | -1.0 |
| Falta Cometida | -0.5 |
| Impedimento | -0.1 |

---

## Referencia: Top Pontuadores 2025

Jogadores que mais pontuaram na temporada anterior (usar como referencia para estrategias):

### Por Posicao

| Posicao | Jogador | Time | Pontos |
|---------|---------|------|--------|
| **Atacante** | Kaio Jorge | Cruzeiro | 311.5 |
| **Atacante** | Vitor Roque | Palmeiras | 257.6 |
| **Atacante** | Rayan | Vasco | 233.8 |
| **Meia** | Arrascaeta | Flamengo | 298.4 |
| **Meia** | Matheus Pereira | Cruzeiro | 239.0 |
| **Lateral** | Reinaldo | Mirassol | 253.8 |
| **Lateral** | Kaiki Bruno | Cruzeiro | 249.9 |
| **Zagueiro** | Villalba | Cruzeiro | 167.2 |
| **Zagueiro** | Fabricio Bruno | Flamengo | 161.7 |
| **Goleiro** | Rossi | Flamengo | 196.8 |
| **Goleiro** | Cassio | Cruzeiro | 192.8 |
| **Goleiro** | Walter | Mirassol | 184.1 |

### Observacoes Estrategicas

1. **Cruzeiro dominou 2025** - 6 jogadores no top por posicao
2. **Mirassol surpreendeu** - Walter e Reinaldo entre os melhores
3. **Atacantes pontuam mais** - Kaio Jorge (311.5) superou Arrascaeta (298.4)
4. **Goleiros variam muito** - Diferenca de 12 pts entre 1o e 3o

---

## Impacto no Super Cartola Manager

### Ajustes Necessarios

1. **Calendario:** Primeira rodada em 28/01 (mais tarde que 2025)
2. **Renovacoes:** Prazo ate 15/03 permanece adequado
3. **Quitacoes:** Prazo ate 31/03 permanece adequado

### Config a Atualizar

Quando iniciar a temporada, atualizar em `config/seasons.js`:
```javascript
status: 'ativa' // mudar de 'preparando' para 'ativa'
```

---

## Fontes

- [GE Cartola - Bom e Barato 2026](https://ge.globo.com/cartola/noticia/2025/12/29/ja-e-2026-no-cartola-vote-no-goleiro-bom-e-barato-para-o-inicio-do-brasileirao.ghtml)
- [GE Cartola - Walter eleito goleiro](https://ge.globo.com/cartola/noticia/2025/12/30/cartola-2026-walter-do-mirassol-e-eleito-o-goleiro-bom-e-barato-veja-precos-de-gabriel-brazao-e-rafael.ghtml)
- [Dicas Cartola - Quando comeca](https://www.dicascartola.com.br/cartola-fc/news/quando-comeca-o-cartola/)
- [Terra - Ranking pontuadores 2025](https://www.terra.com.br/esportes/futebol/veja-o-ranking-de-jogadores-que-mais-pontuaram-no-cartola)

---

*Documento gerado em: 01/01/2026*
*Atualizar conforme novas informacoes forem divulgadas*
