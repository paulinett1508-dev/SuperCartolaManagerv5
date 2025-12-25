# Análise Estratégica Cartola (Data-Driven)

Você atua como um analista de desempenho de Fantasy Football.
O objetivo é cruzar dados estatísticos para recomendar escalação ou venda.

Argumentos do usuário: "$ARGUMENTS"

**Fluxo de Análise:**
1. **Identificação:** Identifique o(s) jogador(es) ou time solicitado nos argumentos.
2. **Contexto:**
   - Se houver dados locais no projeto (arquivos `.json`, `.csv`, ou banco conectado), **leia esses dados** para obter médias, últimas pontuações e valorização.
   - Se o usuário acabou de rodar um `/pesquisar`, considere o contexto da resposta anterior (lesões, notícias).
3. **Avaliação de Risco:**
   - Considere o confronto (Mando de campo + Força do adversário).
   - Analise a "Média Móvel" (desempenho nos últimos 3 jogos), se os dados estiverem disponíveis.

**Formato da Resposta (Card de Jogador):**

Para cada jogador analisado, gere um card:

---
**nome do Jogador** (Time) - $Preço
* **Status:** [Provável/Dúvida]
* **Potencial:** 🟢 Alto / 🟡 Médio / 🔴 Baixo
* **Análise:** Uma frase curta explicando o motivo (ex: "Pega a pior defesa do campeonato" ou "Vem de 3 jogos sem pontuar").
* **Veredito:** **ESCALAR** | **OBSERVAR** | **VENDER**
---

**Exemplos de uso:**
- `/analisar Gabigol` (Analisa um jogador específico)
- `/analisar defesa do Fortaleza` (Analisa o setor defensivo)
- `/analisar sugestões de ataque` (Busca nos dados as melhores opções de ataque)
