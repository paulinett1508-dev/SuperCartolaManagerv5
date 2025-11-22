
# 📊 SISTEMA COMPLETO - REGRAS E FLUXO FINANCEIRO

**Super Cartola Manager - Documentação Técnica Completa**  
**Versão:** 2.5.0  
**Data:** 2025-01-22  
**Autor:** Sistema de IA

---

## 📑 ÍNDICE

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Fluxo Financeiro Central](#fluxo-financeiro-central)
3. [Módulo: Pontos Corridos](#módulo-pontos-corridos)
4. [Módulo: Mata-Mata](#módulo-mata-mata)
5. [Módulo: TOP 10 (Mitos e Micos)](#módulo-top-10)
6. [Módulo: Melhor do Mês](#módulo-melhor-do-mês)
7. [Módulo: Artilheiro Campeão](#módulo-artilheiro-campeão)
8. [Módulo: Luva de Ouro](#módulo-luva-de-ouro)
9. [Integração MongoDB](#integração-mongodb)
10. [Diferenças Admin vs Participante](#diferenças-admin-vs-participante)

---

## 🎯 VISÃO GERAL DO SISTEMA

### Propósito
Sistema de gestão de ligas customizadas de Cartola FC com múltiplos módulos de competição e controle financeiro automatizado.

### Ligas Ativas
1. **Super Cartola 2025** (`684cb1c8af923da7c7df51de`) - Módulos completos
2. **Cartoleiros do Sobral** (`684d821cf1a7ae16d1f89572`) - Valores financeiros reduzidos

### Fonte de Dados Principal
- **API Cartola FC**: `https://api.cartolafc.globo.com/`
- **Proxy Local**: `/api/cartola/*` (evita CORS)
- **Atualização**: Manual via botão "Processar Rodada" (Admin)
- **Cache**: IndexedDB (frontend) + MongoDB (backend)

---

## 💰 FLUXO FINANCEIRO CENTRAL

### Arquivo Principal
📂 `public/js/fluxo-financeiro/fluxo-financeiro-core.js`

### Collections MongoDB
- `extratofinanceirocache` - Cache de cálculos
- `fluxofinanceirocampos` - Campos editáveis por time

### Estrutura do Extrato

```javascript
{
  rodadas: [
    {
      rodada: 1,
      posicao: 15,           // Posição no ranking geral
      totalTimes: 32,
      bonusOnus: -5.00,      // Módulo bônus/ônus por rodada
      pontosCorridos: 5.00,  // Módulo Liga Pontos Corridos
      mataMata: -10.00,      // Módulo Mata-Mata
      melhorMes: 0,          // Módulo Melhor do Mês (final)
      top10: 30.00,          // Módulo TOP 10
      saldo: 20.00           // Saldo acumulado até esta rodada
    }
  ],
  resumo: {
    totalGanhos: 150.00,     // TUDO que ganhou (somatório)
    totalPerdas: -80.00,     // TUDO que perdeu (somatório)
    bonus: 50.00,            // Bônus de rodada acumulado
    onus: -30.00,            // Ônus de rodada acumulado
    pontosCorridos: 40.00,
    mataMata: -20.00,
    melhorMes: 0,
    top10: 60.00,
    campo1: 10.00,           // Campo editável (admin)
    campo2: -5.00,
    campo3: 0,
    campo4: 0,
    vezesMito: 2,
    vezesMico: 1,
    saldo: 70.00             // Saldo final consolidado
  }
}
```

### Campos Editáveis (Admin)
- **4 campos customizáveis** por participante
- Armazenados em `FluxoFinanceiroCampos` (MongoDB)
- Estrutura:
  ```javascript
  {
    ligaId: "684cb1c8af923da7c7df51de",
    timeId: "13935277",
    campos: [
      { nome: "Taxa de Inscrição", valor: -50.00 },
      { nome: "Ajuste Manual", valor: 10.00 },
      { nome: "Prêmio Extra", valor: 0 },
      { nome: "Outro", valor: 0 }
    ]
  }
  ```

### Cache de Extrato
- **TTL**: Infinito (não expira automaticamente)
- **Invalidação**: Manual ou mudança de rodada
- **Motivos de Recálculo**:
  - `nova_rodada` - Rodada do Cartola mudou
  - `admin_forcado` - Admin clicou em "Atualizar"
  - `campos_editados` - Campos customizados alterados
  - `calculo_automatico` - Primeiro cálculo

### API de Cache
```javascript
// Buscar cache
GET /api/extrato-cache/:ligaId/times/:timeId/cache?rodadaAtual=34

// Salvar cache
POST /api/extrato-cache/:ligaId/times/:timeId/cache
Body: {
  extrato: {...},
  ultimaRodadaCalculada: 34,
  motivoRecalculo: "nova_rodada"
}

// Invalidar cache de um time
DELETE /api/extrato-cache/:ligaId/times/:timeId/cache

// Invalidar cache de toda a liga
DELETE /api/extrato-cache/:ligaId/cache
```

---

## ⚡ MÓDULO: PONTOS CORRIDOS

### Visão Geral
Sistema de confrontos "todos contra todos" com valores financeiros por vitória/empate/derrota.

### Arquivos Principais
- 📂 `public/js/pontos-corridos/pontos-corridos-core.js` - Lógica de negócio
- 📂 `public/js/pontos-corridos/pontos-corridos-config.js` - Configurações
- 📂 `public/js/pontos-corridos/pontos-corridos-ui.js` - Interface

### Regras de Negócio

#### Geração de Confrontos
```javascript
// Algoritmo "todos contra todos"
function gerarConfrontos(times) {
  // Sistema round-robin
  // Se número ímpar de times, adiciona "bye"
  // Rotação circular para garantir confronto único
  // Total de rodadas: n-1 (onde n = número de times)
}
```

#### Rodadas
- **Rodada Inicial**: R7 do Brasileirão (configurável)
- **Mapeamento**: `rodadaLiga = rodadaBrasileirao - 6`
  - Exemplo: R7 Brasileirão = R1 da Liga Pontos Corridos
  - Exemplo: R26 Brasileirão = R20 da Liga Pontos Corridos

#### Critérios de Resultado

| Diferença de Pontos | Resultado | Pontuação Tabela | Valor Financeiro |
|---------------------|-----------|------------------|------------------|
| ≤ 0.3 pontos | **Empate** | 1 ponto cada | +R$ 3,00 cada |
| 0.4 a 49.9 pontos | **Vitória simples** | 3 pts (vencedor) / 0 (perdedor) | +R$ 5,00 / -R$ 5,00 |
| ≥ 50 pontos | **Goleada** | 4 pts (vencedor) / 0 (perdedor) | +R$ 7,00 / -R$ 7,00 |

**Configuração Cartoleiros Sobral**: Mesmas regras, valores não configurados (sistema de pontos apenas).

#### Critérios de Desempate (Classificação)
1. **Pontos** (vitórias, empates, derrotas)
2. **Número de vitórias**
3. **Pontos Goleada** (quantidade de goleadas aplicadas)
4. **Saldo de Pontos** (pontos pró - pontos contra)
5. **Pontos Pró**
6. **Ordem alfabética** (nome do cartoleiro)

### Cálculo Financeiro

```javascript
// Exemplo de confronto
Time A: 85.5 pontos
Time B: 60.2 pontos
Diferença: 25.3 pontos

// Resultado: Vitória simples de A
Financeiro A: +R$ 5,00
Financeiro B: -R$ 5,00

// Exemplo de goleada
Time C: 120.8 pontos
Time D: 50.1 pontos
Diferença: 70.7 pontos

// Resultado: Goleada de C
Financeiro C: +R$ 7,00
Financeiro D: -R$ 7,00
Pontos Goleada C: +1
```

### Integração com Fluxo Financeiro

```javascript
// fluxo-financeiro-core.js
calcularPontosCorridosParaRodada(timeId, rodada) {
  const confronto = buscarConfrontoDoTime(timeId, rodada);
  const ranking = getRankingRodada(rodada);
  
  const pontosTimeA = ranking[timeA.id];
  const pontosTimeB = ranking[timeB.id];
  
  const resultado = calcularFinanceiroConfronto(pontosTimeA, pontosTimeB);
  
  return isTimeA ? resultado.financeiroA : resultado.financeiroB;
}
```

### MongoDB
- **Collection**: Não possui collection própria
- **Dados**: Calculados em tempo real usando `rodadas` collection
- **Cache**: `cacheManager` (IndexedDB) para confrontos gerados

---

## 🏆 MÓDULO: MATA-MATA

### Visão Geral
Sistema de playoffs eliminatórios com 5 edições ao longo do ano.

### Arquivos Principais
- 📂 `public/js/mata-mata/mata-mata-config.js` - Edições e configurações
- 📂 `public/js/mata-mata/mata-mata-confrontos.js` - Lógica de chaveamento
- 📂 `public/js/mata-mata/mata-mata-financeiro.js` - Cálculos financeiros

### Edições Configuradas

```javascript
const edicoes = [
  { id: 1, nome: "1ª Edição", rodadaInicial: 2,  rodadaFinal: 7,  rodadaDefinicao: 2  },
  { id: 2, nome: "2ª Edição", rodadaInicial: 9,  rodadaFinal: 14, rodadaDefinicao: 9  },
  { id: 3, nome: "3ª Edição", rodadaInicial: 15, rodadaFinal: 21, rodadaDefinicao: 15 },
  { id: 4, nome: "4ª Edição", rodadaInicial: 22, rodadaFinal: 26, rodadaDefinicao: 21 },
  { id: 5, nome: "5ª Edição", rodadaInicial: 31, rodadaFinal: 35, rodadaDefinicao: 30 }
];
```

### Estrutura de Fases

| Fase | Rodada de Pontos | Nº de Jogos | Classificação |
|------|------------------|-------------|---------------|
| **1ª Fase** | rodadaDefinicao | 16 jogos | Ranking R2 (ou definição) |
| **Oitavas** | rodadaInicial + 1 | 8 jogos | Vencedores da 1ª Fase |
| **Quartas** | rodadaInicial + 2 | 4 jogos | Vencedores das Oitavas |
| **Semis** | rodadaInicial + 3 | 2 jogos | Vencedores das Quartas |
| **Final** | rodadaInicial + 4 | 1 jogo | Vencedores das Semis |

### Regras de Chaveamento

#### 1ª Fase
```javascript
// Chaveamento baseado no ranking da rodada de definição
// Exemplo: R2 para Edição 1
// 1º x 32º, 2º x 31º, 3º x 30º, ..., 16º x 17º

confrontos = [
  { timeA: ranking[0],  timeB: ranking[31] },  // 1º x 32º
  { timeA: ranking[1],  timeB: ranking[30] },  // 2º x 31º
  { timeA: ranking[2],  timeB: ranking[29] },  // 3º x 30º
  // ... até
  { timeA: ranking[15], timeB: ranking[16] }   // 16º x 17º
];
```

#### Fases Eliminatórias
```javascript
// Confrontos mantêm ordem sequencial
// Vencedor do Jogo 1 x Vencedor do Jogo 2
// Vencedor do Jogo 3 x Vencedor do Jogo 4
// ...

// Exemplo Oitavas:
confrontosOitavas = [
  { timeA: vencedor_jogo1, timeB: vencedor_jogo2 },   // Jogo 1 Oitavas
  { timeA: vencedor_jogo3, timeB: vencedor_jogo4 },   // Jogo 2 Oitavas
  // ...
];
```

### Critérios de Desempate

```javascript
// 1. Pontuação da rodada
if (pontosA > pontosB) {
  vencedor = timeA;
} else if (pontosB > pontosA) {
  vencedor = timeB;
} else {
  // 2. Melhor colocado na rodada de definição (rankR2)
  vencedor = (timeA.rankR2 < timeB.rankR2) ? timeA : timeB;
}
```

### Valores Financeiros

| Resultado | Vencedor | Perdedor |
|-----------|----------|----------|
| Qualquer confronto | **+R$ 10,00** | **-R$ 10,00** |

**Super Cartola 2025**: R$ 10,00 por fase  
**Cartoleiros Sobral**: R$ 10,00 por fase (mesma regra)

### Exemplo Completo - Edição 1

```
Rodada de Definição: R2 (Ranking usado para chaveamento)

1ª FASE (R2):
- Jogo 1: 1º (João) 95.2 x 32º (Pedro) 45.8  → Vencedor: João   (+R$ 10,00 / -R$ 10,00)
- Jogo 2: 2º (Maria) 88.5 x 31º (Ana) 55.1   → Vencedor: Maria  (+R$ 10,00 / -R$ 10,00)
- ... (14 jogos restantes)

OITAVAS (R3):
- Jogo 1: João 102.3 x Maria 98.7  → Vencedor: João   (+R$ 10,00 / -R$ 10,00)
- ... (7 jogos restantes)

QUARTAS (R4):
- Jogo 1: João 110.5 x Carlos 88.2 → Vencedor: João   (+R$ 10,00 / -R$ 10,00)
- ... (3 jogos restantes)

SEMIS (R5):
- Jogo 1: João 95.8 x Lucas 92.1   → Vencedor: João   (+R$ 10,00 / -R$ 10,00)
- Jogo 2: ...

FINAL (R6):
- João 105.2 x Fernanda 103.8      → Vencedor: João   (+R$ 10,00 / -R$ 10,00)

SALDO FINAL JOÃO (Campeão): +R$ 50,00 (5 vitórias x R$ 10)
```

### Integração com Fluxo Financeiro

```javascript
// mata-mata-financeiro.js
async function calcularResultadosEdicaoFluxo(ligaId, edicao, rodadaAtual) {
  // Processa cada fase da edição
  for (const fase of ['primeira', 'oitavas', 'quartas', 'semis', 'final']) {
    const rodadaPontos = rodadasFases[fase];
    
    // ✅ SÓ PROCESSA SE RODADA JÁ FOI CONSOLIDADA
    if (rodadaPontos > rodadaAtual) {
      break; // Para processamento
    }
    
    // Busca confrontos e calcula vencedores
    confrontosFase.forEach((confronto) => {
      const vencedor = calcularVencedor(confronto);
      
      // Adiciona ao array de resultados financeiros
      resultadosFinanceiros.push({
        timeId: vencedor.timeId,
        fase: fase,
        rodadaPontos: rodadaPontos,
        valor: 10.00
      });
      
      resultadosFinanceiros.push({
        timeId: perdedor.timeId,
        fase: fase,
        rodadaPontos: rodadaPontos,
        valor: -10.00
      });
    });
  }
  
  return resultadosFinanceiros;
}
```

### MongoDB
- **Collection**: Não possui collection própria
- **Dados**: Calculados dinamicamente
- **Cache**: Map interno (`mataMataMap`) para busca O(1)

---

## 🎯 MÓDULO: TOP 10

### Visão Geral
Premiação/penalização para os 10 melhores (MITOS) e 10 piores (MICOS) de cada rodada.

### Arquivos Principais
- 📂 `public/js/top10.js` - Módulo completo

### Regras de Negócio

#### Identificação
- **MITO**: Time com maior pontuação da rodada
- **MICO**: Time com menor pontuação da rodada
- **Ranking**: Top 10 melhores e Top 10 piores de TODAS as rodadas

#### Valores Financeiros

**Super Cartola 2025:**

| Posição | MITO (Bônus) | MICO (Ônus) |
|---------|--------------|-------------|
| 1º | +R$ 30,00 | -R$ 30,00 |
| 2º | +R$ 28,00 | -R$ 28,00 |
| 3º | +R$ 26,00 | -R$ 26,00 |
| 4º | +R$ 24,00 | -R$ 24,00 |
| 5º | +R$ 22,00 | -R$ 22,00 |
| 6º | +R$ 20,00 | -R$ 20,00 |
| 7º | +R$ 18,00 | -R$ 18,00 |
| 8º | +R$ 16,00 | -R$ 16,00 |
| 9º | +R$ 14,00 | -R$ 14,00 |
| 10º | +R$ 12,00 | -R$ 12,00 |

**Cartoleiros Sobral:**

| Posição | MITO (Bônus) | MICO (Ônus) |
|---------|--------------|-------------|
| 1º | +R$ 10,00 | -R$ 10,00 |
| 2º | +R$ 9,00 | -R$ 9,00 |
| 3º | +R$ 8,00 | -R$ 8,00 |
| ... | ... | ... |
| 10º | +R$ 1,00 | -R$ 1,00 |

### Exemplo de Cálculo

```
RODADA 15:
1º lugar: João - 150.8 pts  → TOP 10 MITOS #1  (+R$ 30,00)
2º lugar: Maria - 145.2 pts → TOP 10 MITOS #2  (+R$ 28,00)
...
32º lugar: Pedro - 35.1 pts → TOP 10 MICOS #1  (-R$ 30,00)
31º lugar: Ana - 40.5 pts   → TOP 10 MICOS #2  (-R$ 28,00)

RODADA 20:
1º lugar: Carlos - 155.3 pts → TOP 10 MITOS #1 (+R$ 30,00)
...
32º lugar: João - 38.2 pts   → TOP 10 MICOS #1 (-R$ 30,00) ⚠️ João estava no TOP MITOS antes!

RANKING CONSOLIDADO APÓS 20 RODADAS:
TOP 10 MITOS (maiores pontuações individuais):
1º - Carlos - R20 - 155.3 pts (+R$ 30,00)
2º - João - R15 - 150.8 pts   (+R$ 30,00)
3º - Maria - R15 - 145.2 pts  (+R$ 28,00)
...

TOP 10 MICOS (menores pontuações individuais):
1º - Pedro - R15 - 35.1 pts   (-R$ 30,00)
2º - João - R20 - 38.2 pts    (-R$ 30,00) ⚠️ João aparece nos dois!
```

### Integração com Fluxo Financeiro

```javascript
// fluxo-financeiro-core.js
async buscarDadosTop10(timeId) {
  const { mitos, micos } = await garantirDadosCarregados(); // De top10.js
  
  const historico = [];
  
  // Verificar MITOS
  mitos.forEach((mito, index) => {
    if (mito.timeId === timeId) {
      const posicao = index + 1;
      const valor = valoresMitos[posicao]; // R$ 30 para 1º, etc
      
      historico.push({
        rodada: mito.rodada,
        valor: valor,
        status: "MITO",
        posicao: posicao
      });
    }
  });
  
  // Verificar MICOS
  micos.forEach((mico, index) => {
    if (mico.timeId === timeId) {
      const posicao = index + 1;
      const valor = valoresMicos[posicao]; // -R$ 30 para 1º, etc
      
      historico.push({
        rodada: mico.rodada,
        valor: valor,
        status: "MICO",
        posicao: posicao
      });
    }
  });
  
  return historico; // Retorna array com todas as premiações/penalizações
}
```

### MongoDB
- **Collection**: Não possui collection própria
- **Dados**: Calculados em tempo real a partir de `rodadas`

---

## 🏅 MÓDULO: MELHOR DO MÊS

### Visão Geral
Competição mensal baseada em acúmulo de pontos em períodos específicos.

### Arquivos Principais
- 📂 `public/js/melhor-mes/melhor-mes-config.js` - Edições e configurações
- 📂 `public/js/melhor-mes/melhor-mes-core.js` - Lógica de negócio

### Edições Configuradas

```javascript
const edicoes = [
  { id: 1, nome: "Edição 01", inicio: 1,  fim: 6,  cor: "#e74c3c" },
  { id: 2, nome: "Edição 02", inicio: 7,  fim: 10, cor: "#f39c12" },
  { id: 3, nome: "Edição 03", inicio: 11, fim: 17, cor: "#f1c40f" },
  { id: 4, nome: "Edição 04", inicio: 18, fim: 22, cor: "#2ecc71" },
  { id: 5, nome: "Edição 05", inicio: 23, fim: 26, cor: "#3498db" },
  { id: 6, nome: "Edição 06", inicio: 27, fim: 30, cor: "#9b59b6" },
  { id: 7, nome: "Edição 07", inicio: 31, fim: 38, cor: "#34495e" }
];
```

### Regras de Negócio

#### Cálculo
- **Pontuação Total**: Soma dos pontos de TODAS as rodadas da edição
- **Critério de Desempate**:
  1. Maior pontuação total
  2. Maior número de vitórias (não aplicável)
  3. Ordem alfabética

#### Premiação

**Super Cartola 2025**: TROFÉU (sem valor financeiro configurado)

**Cartoleiros Sobral**:
- **1º lugar**: +R$ 15,00
- **Último lugar**: -R$ 15,00

```javascript
// melhor-mes-config.js
premios: {
  "684d821cf1a7ae16d1f89572": { // Cartoleiros Sobral
    primeiro: { valor: 15.0, label: "R$ 15,00", cor: "#28a745" },
    ultimo: { valor: -15.0, label: "-R$ 15,00", cor: "#dc3545" }
  },
  default: {
    primeiro: { valor: 0, label: "Troféu", cor: "#ffd700" },
    ultimo: { valor: 0, label: "-", cor: "#6c757d" }
  }
}
```

### Exemplo de Cálculo

```
EDIÇÃO 02 (Rodadas 7 a 10):

João:
- R7:  85.5 pts
- R8:  92.3 pts
- R9:  78.1 pts
- R10: 95.8 pts
TOTAL: 351.7 pts

Maria:
- R7:  88.2 pts
- R8:  85.5 pts
- R9:  90.3 pts
- R10: 82.1 pts
TOTAL: 346.1 pts

VENCEDOR: João (351.7 > 346.1)
Premiação (Cartoleiros Sobral): João +R$ 15,00 | Último -R$ 15,00
```

### Integração com Fluxo Financeiro

```javascript
// ⚠️ AINDA NÃO INTEGRADO COMPLETAMENTE
// Arquivo: fluxo-financeiro-core.js
// Campo: rodada.melhorMes

// Implementação futura:
async calcularMelhorMes(timeId, edicao) {
  const ranking = await obterRankingEdicao(edicao);
  
  if (ranking[0].timeId === timeId) {
    return premios.primeiro.valor; // +R$ 15,00
  } else if (ranking[ranking.length - 1].timeId === timeId) {
    return premios.ultimo.valor;   // -R$ 15,00
  }
  
  return 0;
}
```

### MongoDB
- **Collection**: Não possui collection própria
- **Dados**: Calculados agregando `rodadas`

---

## ⚽ MÓDULO: ARTILHEIRO CAMPEÃO

### Visão Geral
Competição baseada em saldo de gols (gols pró - gols contra).

### Arquivos Principais
- 📂 `public/js/artilheiro-campeao/artilheiro-campeao-core.js` - Lógica principal
- 📂 `services/golsService.js` - Integração com API
- 📂 `controllers/artilheiroCampeaoController.js` - Endpoints

### Regras de Negócio

#### Fonte de Dados
```javascript
// API Cartola FC - Escalação do time
GET https://api.cartolafc.globo.com/time/id/{timeId}/{rodada}

// Exemplo de resposta (simplificado):
{
  atletas: [
    {
      apelido: "Gabigol",
      posicao_id: 5, // Atacante
      scout: {
        G: 2,  // 2 gols marcados
        SG: 1  // 1 gol sofrido (se for goleiro)
      }
    }
  ]
}
```

#### Cálculo de Gols

```javascript
// golsService.js
function calcularGolsTimeRodada(escalacao) {
  let golsPro = 0;
  let golsContra = 0;
  
  escalacao.atletas.forEach(atleta => {
    // Gols marcados (todas as posições exceto goleiro)
    if (atleta.posicao_id !== 1 && atleta.scout?.G) {
      golsPro += atleta.scout.G;
    }
    
    // Gols sofridos (apenas goleiros)
    if (atleta.posicao_id === 1 && atleta.scout?.SG) {
      golsContra += atleta.scout.SG;
    }
  });
  
  return {
    golsPro,
    golsContra,
    saldoGols: golsPro - golsContra,
    jogadores: [...] // Lista de artilheiros
  };
}
```

#### Critérios de Classificação
1. **Saldo de Gols** (gols pró - gols contra) - DESC
2. **Gols Pró** - DESC
3. **Média de Gols** - DESC

### Valores Financeiros
⚠️ **NÃO CONFIGURADO** - Módulo apenas informativo

### MongoDB
- **Collection**: `gols`
  ```javascript
  {
    ligaId: "684cb1c8af923da7c7df51de",
    timeId: 13935277,
    rodada: 15,
    golsPro: 3,
    golsContra: 2,
    saldoGols: 1,
    jogadores: [
      { nome: "Gabigol", gols: 2, posicao: "Atacante" },
      { nome: "Pedro", gols: 1, posicao: "Atacante" }
    ],
    createdAt: "2025-01-22T10:00:00Z"
  }
  ```

- **Collection**: `artilheirocampeaos` (histórico de campeões)
  ```javascript
  {
    ligaId: "684cb1c8af923da7c7df51de",
    ano: 2025,
    mes: "Janeiro",
    campeao: {
      timeId: 13935277,
      nome: "João Silva",
      golsPro: 45,
      golsContra: 12,
      saldoGols: 33
    }
  }
  ```

---

## 🥅 MÓDULO: LUVA DE OURO

### Visão Geral
Competição para goleiros baseado em menos gols sofridos + mais rodadas jogadas.

### Arquivos Principais
- 📂 `public/js/luva-de-ouro/luva-de-ouro-core.js` - Lógica principal
- 📂 `services/goleirosService.js` - Integração com API
- 📂 `controllers/luvaDeOuroController.js` - Endpoints

### Regras de Negócio

#### Fonte de Dados
```javascript
// API Cartola FC - Pontuação parcial (durante rodada)
GET https://api.cartolafc.globo.com/atletas/pontuados

// Estrutura:
{
  atletas: {
    "123456": {
      apelido: "Weverton",
      clube_id: 275,
      posicao_id: 1, // Goleiro
      scout: {
        SG: 2  // Gols sofridos
      },
      pontos: 5.5
    }
  }
}
```

#### Sistema de Pontuação

```javascript
// Pontos por rodada
function calcularPontosGoleiro(golsSofridos) {
  if (golsSofridos === 0) return 10;  // Saldo zero
  if (golsSofridos === 1) return 5;   // 1 gol sofrido
  if (golsSofridos === 2) return 3;   // 2 gols sofridos
  return 0;                           // 3+ gols = 0 pontos
}
```

#### Critérios de Classificação
1. **Pontos Totais** (acumulado) - DESC
2. **Menos Gols Sofridos** - ASC
3. **Mais Rodadas Jogadas** - DESC

### Valores Financeiros
⚠️ **NÃO CONFIGURADO** - Módulo apenas informativo

### Exemplo de Ranking

```
LUVA DE OURO (Rodadas 1-15):

1º - Weverton (Palmeiras):
  - Rodadas jogadas: 15
  - Gols sofridos: 8
  - Pontos: 95 (7 rodadas com 0 gols + 5 rodadas com 1 gol + 3 rodadas com 2 gols)

2º - Santos (Flamengo):
  - Rodadas jogadas: 14
  - Gols sofridos: 10
  - Pontos: 85

3º - Cássio (Corinthians):
  - Rodadas jogadas: 15
  - Gols sofridos: 12
  - Pontos: 80
```

### MongoDB
- **Collection**: `goleiros`
  ```javascript
  {
    ligaId: "684cb1c8af923da7c7df51de",
    participanteId: "13935277",
    participanteNome: "João Silva",
    goleiros: [
      {
        nome: "Weverton",
        clube: "Palmeiras",
        clube_id: 275,
        rodadas: [
          { rodada: 1, golsSofridos: 0, pontos: 10, escalado: true },
          { rodada: 2, golsSofridos: 1, pontos: 5, escalado: true },
          { rodada: 3, golsSofridos: 2, pontos: 3, escalado: true }
        ],
        golsSofridosTotais: 3,
        pontosTotais: 18,
        rodadasJogadas: 3
      }
    ],
    pontosTotais: 18,
    golsSofridosTotais: 3,
    rodadasJogadas: 3,
    updatedAt: "2025-01-22T10:00:00Z"
  }
  ```

---

## 🗄️ INTEGRAÇÃO MONGODB

### Conexão
📂 `config/database.js`
```javascript
const uri = process.env.MONGODB_URI || "mongodb+srv://...";
mongoose.connect(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000
});
```

### Collections Principais

#### 1. `ligas`
```javascript
{
  _id: ObjectId("684cb1c8af923da7c7df51de"),
  nome: "Super Cartola 2025",
  tipo: "publica",
  times: [13935277, 13826644, ...],
  participantes: [
    {
      time_id: 13935277,
      nome_cartola: "João Silva",
      nome_time: "Urubu Play F.C.",
      clube_id: 262,
      senha_acesso: "acessocartola" // ⚠️ Plain text
    }
  ],
  modulos_ativos: {
    extrato: true,
    ranking: true,
    rodadas: true,
    top10: true,
    melhorMes: true,
    pontosCorridos: true,
    mataMata: true,
    artilheiro: false,
    luvaOuro: false
  },
  configuracoes: {
    pontos_corridos: { rodadaInicial: 7 },
    mata_mata: { edicoes: [...] }
  }
}
```

#### 2. `rodadas`
```javascript
{
  _id: ObjectId("..."),
  ligaId: "684cb1c8af923da7c7df51de",
  rodada: 15,
  timeId: 13935277,
  pontos: 95.80,
  patrimonio: 150.5,
  capitao: {
    nome: "Gabigol",
    pontos: 20.5,
    clube_id: 262
  },
  escalacao: [...]
}
```

#### 3. `extratofinanceirocache`
```javascript
{
  ligaId: "684cb1c8af923da7c7df51de",
  timeId: "13935277",
  ultimaRodadaCalculada: 34,
  extrato: {
    rodadas: [...],
    resumo: {...}
  },
  metadados: {
    versaoCalculo: "1.0.0",
    timestampCalculo: ISODate("2025-01-22T10:00:00Z"),
    motivoRecalculo: "nova_rodada"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

#### 4. `fluxofinanceirocampos`
```javascript
{
  ligaId: "684cb1c8af923da7c7df51de",
  timeId: "13935277",
  campos: [
    { nome: "Taxa de Inscrição", valor: -50.00 },
    { nome: "Ajuste Manual", valor: 10.00 },
    { nome: "Campo 3", valor: 0 },
    { nome: "Campo 4", valor: 0 }
  ],
  updatedAt: ISODate("...")
}
```

#### 5. `gols`
```javascript
{
  ligaId: "684cb1c8af923da7c7df51de",
  timeId: 13935277,
  rodada: 15,
  golsPro: 3,
  golsContra: 2,
  saldoGols: 1,
  jogadores: [
    { nome: "Gabigol", gols: 2, posicao: "Atacante", clube_id: 262 }
  ]
}
```

#### 6. `goleiros`
```javascript
{
  ligaId: "684cb1c8af923da7c7df51de",
  participanteId: "13935277",
  participanteNome: "João Silva",
  goleiros: [
    {
      nome: "Weverton",
      clube_id: 275,
      rodadas: [
        { rodada: 1, golsSofridos: 0, pontos: 10, escalado: true }
      ],
      pontosTotais: 95,
      golsSofridosTotais: 8,
      rodadasJogadas: 15
    }
  ]
}
```

### Índices Importantes

```javascript
// Índices compostos para performance
extratofinanceirocache.createIndex({ ligaId: 1, timeId: 1 }, { unique: true });
fluxofinanceirocampos.createIndex({ ligaId: 1, timeId: 1 }, { unique: true });
rodadas.createIndex({ ligaId: 1, rodada: 1, timeId: 1 });
gols.createIndex({ ligaId: 1, timeId: 1, rodada: 1 });
goleiros.createIndex({ ligaId: 1, participanteId: 1 });
```

---

## 👥 DIFERENÇAS ADMIN VS PARTICIPANTE

### Modo ADMIN

#### Acesso
- **URL**: `/admin.html`, `/dashboard.html`, `/detalhe-liga.html`
- **Autenticação**: Não implementada (⚠️ vulnerabilidade)
- **Sem banco de usuários**

#### Funcionalidades

##### 1. Gestão de Ligas
- **Criar Liga**: `/criar-liga.html`
  - Nome, descrição, tipo (pública/privada)
  - Seleção de módulos ativos
  
- **Editar Liga**: `/editar-liga.html`
  - Alterar configurações
  - Ativar/desativar módulos
  
- **Adicionar Participantes**: Manual
  - Busca por `time_id` do Cartola
  - Define `senha_acesso` (plain text)

##### 2. Processamento de Rodadas
```javascript
// Fluxo manual
1. Admin acessa "Processar Rodada"
2. Sistema busca dados da API Cartola
3. Popula collection `rodadas`
4. Atualiza estatísticas (gols, goleiros)
5. Invalida cache financeiro (se houver)
```

##### 3. Fluxo Financeiro
- **Visualizar extrato de qualquer participante**
- **Editar campos customizados** (4 campos por time)
- **Forçar recálculo** manual
- **Gerar relatório consolidado** (todos os times)
- **Exportar dados** (CSV, PNG)

##### 4. Campos Editáveis
```javascript
// API disponível apenas para Admin
PUT /api/fluxo-financeiro/:ligaId/times/:timeId/campo/:campoIndex
Body: {
  nome: "Taxa de Inscrição",
  valor: -50.00
}
```

##### 5. Gestão de Senhas
- **Ver senhas de todos**: `/gerir-senhas-participantes.html`
- **Alterar senhas**: Via edição da liga

---

### Modo PARTICIPANTE

#### Acesso
- **URL**: `/participante/index.html`
- **Login**: `time_id` + `senha_acesso`
- **Sessão**: `sessionStorage` (30s heartbeat)

#### Autenticação

```javascript
// participante-auth.js
async function fazerLogin(timeId, senha) {
  const response = await fetch('/api/participante/auth/login', {
    method: 'POST',
    body: JSON.stringify({ timeId, senha })
  });
  
  // Resposta de sucesso:
  {
    success: true,
    ligaId: "684cb1c8af923da7c7df51de",
    timeId: "13935277",
    participante: {...}
  }
  
  // Salva no sessionStorage
  sessionStorage.setItem('participanteAuth', JSON.stringify(data));
}
```

#### Funcionalidades (READ-ONLY)

##### 1. Dashboard (Boas-Vindas)
- **Cards condicionais** baseados em:
  - Posição no ranking
  - Sequência de vitórias/derrotas
  - Status financeiro
  - Conquistas recentes

##### 2. Extrato Financeiro
- **Visualização completa** do próprio extrato
- **Rodada por rodada** com detalhamento
- **Botão "Atualizar"** (força recálculo do cache)
- **Exportar PNG** do extrato individual
- **NÃO pode editar** campos customizados

##### 3. Classificação/Ranking
- **Ranking geral** da liga
- **Posição atual** destacada
- **Estatísticas pessoais**

##### 4. Módulos de Competição
- **TOP 10**: Ver se está nos mitos/micos
- **Melhor do Mês**: Posição na edição atual
- **Pontos Corridos**: Confrontos e classificação
- **Mata-Mata**: Chaveamento e confrontos
- **Artilheiro**: (se ativo) Ranking de gols
- **Luva de Ouro**: (se ativo) Ranking de goleiros

##### 5. Minhas Rodadas
- **Histórico de pontuações**
- **Escalações anteriores**
- **Gráficos de desempenho**

#### Limitações
- ❌ Não pode alterar dados da liga
- ❌ Não pode processar rodadas
- ❌ Não pode editar campos financeiros
- ❌ Não pode ver extratos de outros participantes
- ❌ Não pode gerenciar módulos
- ✅ Pode exportar apenas seus próprios dados

---

### Segurança Atual

#### ⚠️ VULNERABILIDADES IDENTIFICADAS

1. **Senhas em Plain Text**
   ```javascript
   // Liga.js
   participantes: [{
     senha_acesso: "acessocartola" // ❌ Sem hash
   }]
   ```

2. **Admin sem autenticação**
   - Qualquer pessoa pode acessar `/admin.html`
   - Não há controle de acesso

3. **Sem JWT**
   - Participante usa `sessionStorage`
   - Sem token de renovação

4. **CORS Aberto**
   - Proxy do Cartola sem rate limiting
   - Risco de bloqueio da API

#### ✅ Recomendações Firebase

```javascript
// Migração sugerida
1. Firebase Auth
   - createUserWithEmailAndPassword()
   - Usar time_id como identificador
   - Hash de senhas automático

2. Firestore Security Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Admin: grupo específico
       match /ligas/{ligaId} {
         allow read, write: if request.auth.token.admin == true;
       }
       
       // Participante: apenas seus dados
       match /extratos/{ligaId}/times/{timeId} {
         allow read: if request.auth.uid == timeId;
       }
     }
   }

3. Cloud Functions
   - Processar rodadas via cron
   - Proxy seguro para API Cartola
   - Rate limiting automático
```

---

## 📋 RESUMO EXECUTIVO

### Módulos Implementados

| Módulo | Financeiro | Admin | Participante | MongoDB |
|--------|------------|-------|--------------|---------|
| **Extrato Financeiro** | ✅ Completo | ✅ Edição | ✅ Visualização | `extratofinanceirocache` |
| **Pontos Corridos** | ✅ R$ 5/7 | ✅ Configuração | ✅ Visualização | Cache dinâmico |
| **Mata-Mata** | ✅ R$ 10/fase | ✅ Configuração | ✅ Visualização | Cache dinâmico |
| **TOP 10** | ✅ R$ 12-30 | ✅ Visualização | ✅ Visualização | Cache dinâmico |
| **Melhor do Mês** | ⚠️ Parcial | ✅ Visualização | ✅ Visualização | Cache dinâmico |
| **Artilheiro** | ❌ Não | ✅ Visualização | ✅ Visualização | `gols`, `artilheirocampeaos` |
| **Luva de Ouro** | ❌ Não | ✅ Visualização | ✅ Visualização | `goleiros` |

### Fluxo de Dados (Exemplo Completo)

```
RODADA 15 - João Silva (time_id: 13935277)
Pontos: 95.80

┌─────────────────────────────────────────────┐
│ 1. POSIÇÃO NO RANKING GERAL: 8º de 32      │
│    → Bônus/Ônus: R$ 0 (meio de tabela)     │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ 2. PONTOS CORRIDOS (R15)                    │
│    Confronto: João 95.80 x Maria 88.50      │
│    Diferença: 7.30 (vitória simples)        │
│    → Financeiro: +R$ 5,00                   │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ 3. MATA-MATA (Edição 3, Quartas)            │
│    João 95.80 x Carlos 102.30               │
│    → Resultado: DERROTA                     │
│    → Financeiro: -R$ 10,00                  │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ 4. TOP 10                                   │
│    Pontuação: 95.80 (12º melhor da rodada)  │
│    → Não entrou no TOP 10 MITOS             │
│    → Financeiro: R$ 0                       │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ 5. MELHOR DO MÊS (Edição 3, em andamento)  │
│    Rodadas 11-17: João acumula 650 pts     │
│    → Aguardando fim da edição               │
│    → Financeiro: R$ 0 (ainda)               │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ EXTRATO RODADA 15:                          │
│ • Bônus/Ônus: R$ 0                          │
│ • Pontos Corridos: +R$ 5,00                 │
│ • Mata-Mata: -R$ 10,00                      │
│ • TOP 10: R$ 0                              │
│ • SALDO RODADA: -R$ 5,00                    │
│                                             │
│ SALDO ACUMULADO ATÉ R15: +R$ 120,00         │
└─────────────────────────────────────────────┘
```

---

## 🔄 PRÓXIMOS PASSOS

### Pendências Técnicas
1. ✅ Integração financeira completa do **Melhor do Mês**
2. ✅ Sistema de autenticação seguro (Firebase Auth)
3. ✅ Hash de senhas (bcrypt)
4. ✅ Tokens JWT para sessões
5. ✅ Implementação de valores financeiros para **Artilheiro** e **Luva de Ouro**
6. ✅ Dashboard admin com autenticação
7. ✅ Testes automatizados (Jest)
8. ✅ Documentação da API (Swagger)

### Migração Firebase (Roadmap)
- **Semana 1-2**: Infraestrutura e migração de dados
- **Semana 3-4**: Adaptação do backend
- **Semana 5-6**: Atualização do frontend
- **Semana 7-8**: Testes e deploy

---

**FIM DO DOCUMENTO**  
**Última atualização**: 2025-01-22 às 19:00  
**Próxima revisão**: Após reunião de alinhamento com stakeholders
