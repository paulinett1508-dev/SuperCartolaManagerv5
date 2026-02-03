# ESPECIFICAÇÃO: Sistema de Grupos/Chaves - Pontos Corridos

**Versão:** 4.0.0
**Sprint:** 3
**Data:** 2026-02-03

---

## 📋 Visão Geral

Extensão do módulo Pontos Corridos para suportar:
1. **Formato Tradicional** (round-robin simples) - já implementado
2. **Formato com Grupos/Chaves** - novo
3. **Fases Eliminatórias** (playoffs) - novo

---

## 🎯 Requisitos Funcionais

### RF1: Configuração de Formato
- [ ] Admin escolhe formato no wizard: "Todos contra Todos" ou "Grupos + Playoffs"
- [ ] Se "Grupos + Playoffs":
  - Definir quantidade de grupos (2, 4, 8)
  - Definir critério de divisão (sorteio, ranking)
  - Definir quantos classificam por grupo (1, 2, 4)
  - Definir se playoffs são ida/volta ou jogo único

### RF2: Divisão em Grupos
- [ ] Algoritmo de sorteio aleatório balanceado
- [ ] Algoritmo por ranking (seed, serpente)
- [ ] Mínimo 5 times por grupo (validação)
- [ ] Grupos nomeados: A, B, C, D, etc.

### RF3: Fase de Grupos
- [ ] Confrontos gerados apenas dentro do grupo (round-robin)
- [ ] Classificação separada por grupo
- [ ] Critérios de desempate: pontos → saldo → vitórias
- [ ] Times classificados avançam para playoffs

### RF4: Fase de Playoffs (Eliminatórias)
- [ ] Bracket gerado automaticamente
- [ ] Cruzamento: 1º Grupo A vs 2º Grupo B, etc.
- [ ] Suporte a ida/volta ou jogo único
- [ ] Critérios de desempate em caso de empate agregado

### RF5: UI/UX
- [ ] Tabs: "Grupos" e "Playoffs"
- [ ] Cards visuais por grupo
- [ ] Bracket visual (chave eliminatória)
- [ ] Indicação de classificados (badge verde)

---

## 🏗️ Arquitetura de Dados

### Schema JSON (`pontos_corridos.json`)

```json
{
  "configuracao": {
    "formato": "round_robin" | "grupos",

    "sistema_grupos": {
      "habilitado": true,
      "quantidade_grupos": 2,
      "min_times_por_grupo": 5,
      "criterio_divisao": "sorteio" | "ranking",
      "classificados_por_grupo": 2,
      "divisao": [
        {
          "grupo": "A",
          "times": ["timeId1", "timeId2", "timeId3", ...]
        },
        {
          "grupo": "B",
          "times": ["timeId4", "timeId5", ...]
        }
      ]
    },

    "fases_eliminatorias": {
      "habilitado": true,
      "tipo": "ida_volta" | "jogo_unico",
      "criterio_desempate": "saldo_gols" | "gols_fora",
      "bracket": [
        {
          "fase": "quartas",
          "rodada_ida": 30,
          "rodada_volta": 31,
          "confrontos": [
            { "mandante": "1A", "visitante": "2B" },
            { "mandante": "1B", "visitante": "2A" }
          ]
        },
        {
          "fase": "final",
          "rodada_ida": 36,
          "rodada_volta": 37,
          "confrontos": [
            { "mandante": "vencedor_q1", "visitante": "vencedor_q2" }
          ]
        }
      ]
    }
  }
}
```

### Schema Cache (`pontoscorridoscaches`)

```javascript
{
  ligaId: ObjectId,
  temporada: Number,
  rodada_consolidada: Number,
  formato: "round_robin" | "grupos",

  // Formato tradicional
  classificacao: [...],
  confrontos: [...],

  // Formato grupos
  grupos: [
    {
      grupo: "A",
      classificacao: [
        { timeId, jogos, vitorias, empates, derrotas, pontos, saldo_gols, ... }
      ],
      confrontos: [...]
    },
    {
      grupo: "B",
      classificacao: [...],
      confrontos: [...]
    }
  ],

  // Playoffs
  playoffs: {
    fase_atual: "quartas" | "semis" | "final",
    bracket: [
      {
        fase: "quartas",
        confronto_id: 1,
        mandante: { timeId, nome, pontos_ida, pontos_volta, agregado },
        visitante: { timeId, nome, pontos_ida, pontos_volta, agregado },
        vencedor: "mandante" | "visitante" | null
      }
    ]
  }
}
```

---

## 🔧 Implementação Técnica

### Fase 1: Backend - Divisão em Grupos

**Arquivo:** `utils/pontosCorridosGrupos.js`

```javascript
/**
 * Divide times em grupos usando critério especificado
 * @param {Array} times - Lista de timeIds
 * @param {Number} quantidadeGrupos - Quantidade de grupos
 * @param {String} criterio - "sorteio" ou "ranking"
 * @param {Object} rankingAtual - Ranking atual (se criterio = "ranking")
 * @returns {Array} Grupos com times
 */
export function dividirEmGrupos(times, quantidadeGrupos, criterio, rankingAtual) {
  // Validar mínimo de times
  const minTimesPorGrupo = 5;
  if (times.length < quantidadeGrupos * minTimesPorGrupo) {
    throw new Error(`Mínimo ${quantidadeGrupos * minTimesPorGrupo} times para ${quantidadeGrupos} grupos`);
  }

  let timesOrdenados;

  if (criterio === "ranking") {
    // Ordenar por ranking e distribuir em serpentina (seed)
    timesOrdenados = ordenarPorRanking(times, rankingAtual);
    return distribuirSerpentina(timesOrdenados, quantidadeGrupos);
  } else {
    // Sortear aleatoriamente
    timesOrdenados = embaralhar(times);
    return distribuirBalanceado(timesOrdenados, quantidadeGrupos);
  }
}

/**
 * Gera confrontos para fase de grupos
 * @param {Array} grupos - Array de grupos com times
 * @returns {Object} Confrontos por grupo e rodada
 */
export function gerarConfrontosGrupos(grupos) {
  const confrontosPorGrupo = {};

  grupos.forEach(grupo => {
    const { grupo: nome, times } = grupo;
    // Aplicar round-robin dentro do grupo
    confrontosPorGrupo[nome] = gerarConfrontosRoundRobin(times);
  });

  return confrontosPorGrupo;
}
```

### Fase 2: Backend - Playoffs

**Arquivo:** `utils/pontosCorridosPlayoffs.js`

```javascript
/**
 * Gera bracket de playoffs baseado em classificados
 * @param {Array} grupos - Grupos com classificação
 * @param {Number} classificadosPorGrupo - Quantos avançam
 * @returns {Array} Bracket de confrontos
 */
export function gerarBracketPlayoffs(grupos, classificadosPorGrupo) {
  const classificados = extrairClassificados(grupos, classificadosPorGrupo);

  // Cruzamento: 1º Grupo A vs 2º Grupo B, 1º Grupo B vs 2º Grupo A
  const confrontos = [];

  // Exemplo para 2 grupos, 2 classificados cada = 4 times
  // Semi 1: 1A vs 2B
  // Semi 2: 1B vs 2A
  // Final: vencedor Semi1 vs vencedor Semi2

  return montarBracket(classificados);
}

/**
 * Calcula resultado de confronto playoff (ida e volta)
 */
export function calcularResultadoPlayoff(pontosIda, pontosVolta, criterio) {
  const agregadoMandante = pontosIda.mandante + pontosVolta.visitante;
  const agregadoVisitante = pontosIda.visitante + pontosVolta.mandante;

  if (agregadoMandante > agregadoVisitante) {
    return { vencedor: "mandante", agregados: [agregadoMandante, agregadoVisitante] };
  } else if (agregadoVisitante > agregadoMandante) {
    return { vencedor: "visitante", agregados: [agregadoMandante, agregadoVisitante] };
  } else {
    // Desempate por critério (saldo, gols fora, etc.)
    return aplicarCriterioDesempate(pontosIda, pontosVolta, criterio);
  }
}
```

### Fase 3: Controller - Integração

**Arquivo:** `controllers/pontosCorridosCacheController.js`

Adicionar lógica condicional:

```javascript
async function calcularRodadaComParciais(ligaId, rodadaAtual, config) {
  const formato = config.formato || "round_robin";

  if (formato === "grupos") {
    return calcularRodadaGrupos(ligaId, rodadaAtual, config);
  } else {
    return calcularRodadaTradicional(ligaId, rodadaAtual, config);
  }
}

async function calcularRodadaGrupos(ligaId, rodadaAtual, config) {
  // 1. Buscar divisão de grupos da config
  const grupos = config.sistema_grupos.divisao;

  // 2. Gerar confrontos por grupo
  const confrontosPorGrupo = gerarConfrontosGrupos(grupos);

  // 3. Calcular classificação por grupo
  const classificacoesPorGrupo = grupos.map(grupo => {
    return calcularClassificacaoGrupo(grupo, confrontosPorGrupo[grupo.grupo]);
  });

  // 4. Verificar se deve iniciar playoffs
  const faseGruposCompleta = verificarFaseGruposCompleta(config, rodadaAtual);
  let playoffs = null;

  if (faseGruposCompleta) {
    playoffs = gerarBracketPlayoffs(classificacoesPorGrupo, config.sistema_grupos.classificados_por_grupo);
  }

  return {
    formato: "grupos",
    grupos: classificacoesPorGrupo,
    playoffs
  };
}
```

### Fase 4: Frontend - UI de Grupos

**Arquivo:** `public/js/pontos-corridos/pontos-corridos-ui-grupos.js`

```javascript
export function renderizarGrupos(grupos) {
  const container = document.getElementById('grupos-container');

  grupos.forEach(grupo => {
    const card = criarCardGrupo(grupo);
    container.appendChild(card);
  });
}

function criarCardGrupo(grupo) {
  const div = document.createElement('div');
  div.className = 'grupo-card bg-gray-800 rounded-lg p-6 mb-6';

  div.innerHTML = `
    <h3 class="text-2xl font-bold russo-one mb-4">
      <span class="text-green-500">GRUPO ${grupo.grupo}</span>
    </h3>

    <table class="w-full">
      <thead>
        <tr class="text-gray-400 text-sm">
          <th>Pos</th>
          <th class="text-left">Time</th>
          <th>P</th>
          <th>J</th>
          <th>V</th>
          <th>E</th>
          <th>D</th>
          <th>SG</th>
        </tr>
      </thead>
      <tbody>
        ${grupo.classificacao.map((time, idx) => `
          <tr class="${time.classificado ? 'bg-green-900/20' : ''}">
            <td class="font-bold">${idx + 1}</td>
            <td class="text-left">${time.nome}</td>
            <td class="jetbrains-mono">${time.pontos}</td>
            <td>${time.jogos}</td>
            <td>${time.vitorias}</td>
            <td>${time.empates}</td>
            <td>${time.derrotas}</td>
            <td class="${time.saldo_gols >= 0 ? 'text-green-500' : 'text-red-500'}">
              ${time.saldo_gols > 0 ? '+' : ''}${time.saldo_gols}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return div;
}
```

### Fase 5: Frontend - UI de Playoffs

**Arquivo:** `public/js/pontos-corridos/pontos-corridos-ui-playoffs.js`

```javascript
export function renderizarBracket(bracket) {
  const container = document.getElementById('playoffs-container');

  // Agrupar por fase
  const fases = agruparPorFase(bracket);

  const html = `
    <div class="bracket-grid">
      ${Object.keys(fases).map(fase => `
        <div class="fase-column">
          <h4 class="fase-titulo russo-one">${traduzirFase(fase)}</h4>
          ${fases[fase].map(confronto => renderizarConfrontoPlayoff(confronto)).join('')}
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

function renderizarConfrontoPlayoff(confronto) {
  return `
    <div class="confronto-playoff bg-gray-800 rounded-lg p-4 mb-4">
      <!-- Mandante -->
      <div class="time-playoff flex items-center justify-between ${confronto.vencedor === 'mandante' ? 'border-l-4 border-green-500' : ''}">
        <span class="font-semibold">${confronto.mandante.nome}</span>
        <span class="jetbrains-mono">${confronto.mandante.agregado || '-'}</span>
      </div>

      <!-- Placar -->
      <div class="placar-agregado text-center text-xs text-gray-500 my-2">
        ${confronto.mandante.pontos_ida} x ${confronto.visitante.pontos_ida} (ida)
        ${confronto.mandante.pontos_volta} x ${confronto.visitante.pontos_volta} (volta)
      </div>

      <!-- Visitante -->
      <div class="time-playoff flex items-center justify-between ${confronto.vencedor === 'visitante' ? 'border-l-4 border-green-500' : ''}">
        <span class="font-semibold">${confronto.visitante.nome}</span>
        <span class="jetbrains-mono">${confronto.visitante.agregado || '-'}</span>
      </div>
    </div>
  `;
}
```

---

## 🧪 Casos de Teste

### Teste 1: Divisão em Grupos (Sorteio)
```javascript
// Input
const times = ["time1", "time2", ..., "time12"];
const quantidadeGrupos = 2;
const criterio = "sorteio";

// Output esperado
const grupos = [
  { grupo: "A", times: ["time1", "time3", "time5", "time7", "time9", "time11"] },
  { grupo: "B", times: ["time2", "time4", "time6", "time8", "time10", "time12"] }
];
```

### Teste 2: Divisão em Grupos (Ranking/Seed)
```javascript
// Input
const times = ["time1", "time2", ..., "time8"];
const ranking = { time1: 1, time2: 2, ..., time8: 8 };
const quantidadeGrupos = 2;
const criterio = "ranking";

// Output esperado (serpentina)
const grupos = [
  { grupo: "A", times: ["time1", "time4", "time5", "time8"] }, // 1º, 4º, 5º, 8º
  { grupo: "B", times: ["time2", "time3", "time6", "time7"] }  // 2º, 3º, 6º, 7º
];
```

### Teste 3: Geração de Bracket
```javascript
// Input: 2 grupos, 2 classificados por grupo
const grupos = [
  { grupo: "A", classificacao: [time1, time2, ...] },
  { grupo: "B", classificacao: [time3, time4, ...] }
];

// Output
const bracket = [
  { fase: "final", confrontos: [
    { mandante: time1, visitante: time4 }, // 1A vs 2B
    { mandante: time3, visitante: time2 }  // 1B vs 2A
  ]}
];
```

---

## 📊 Wizard - Novas Perguntas

Adicionar ao `pontos_corridos.json`:

```json
{
  "id": "formato",
  "tipo": "select",
  "label": "Formato do torneio",
  "opcoes": [
    { "value": "round_robin", "label": "Todos contra Todos" },
    { "value": "grupos", "label": "Grupos + Playoffs" }
  ],
  "default": "round_robin",
  "afeta": "regras_override.formato"
},
{
  "id": "quantidade_grupos",
  "tipo": "select",
  "label": "Quantidade de grupos",
  "opcoes": [
    { "value": 2, "label": "2 grupos" },
    { "value": 4, "label": "4 grupos" }
  ],
  "default": 2,
  "condicional": { "campo": "formato", "valor": "grupos" },
  "afeta": "regras_override.sistema_grupos.quantidade_grupos"
},
{
  "id": "criterio_divisao",
  "tipo": "select",
  "label": "Como dividir os times?",
  "opcoes": [
    { "value": "sorteio", "label": "Sorteio aleatório" },
    { "value": "ranking", "label": "Por ranking (seed)" }
  ],
  "default": "sorteio",
  "condicional": { "campo": "formato", "valor": "grupos" },
  "afeta": "regras_override.sistema_grupos.criterio_divisao"
}
```

---

## 🚀 Cronograma de Implementação

| Fase | Tarefa | Estimativa | Status |
|------|--------|------------|--------|
| 1 | Criar `utils/pontosCorridosGrupos.js` | 2h | 🟡 Pendente |
| 2 | Criar `utils/pontosCorridosPlayoffs.js` | 2h | 🟡 Pendente |
| 3 | Atualizar `pontosCorridosCacheController.js` | 3h | 🟡 Pendente |
| 4 | Atualizar `pontos_corridos.json` (wizard) | 1h | 🟡 Pendente |
| 5 | Criar `pontos-corridos-ui-grupos.js` | 2h | 🟡 Pendente |
| 6 | Criar `pontos-corridos-ui-playoffs.js` | 2h | 🟡 Pendente |
| 7 | Integrar UI com orquestrador | 1h | 🟡 Pendente |
| 8 | Testes end-to-end | 2h | 🟡 Pendente |

**Total:** ~15h de desenvolvimento

---

## ✅ Critérios de Aceitação

- [ ] Admin pode escolher formato "Grupos + Playoffs" no wizard
- [ ] Times são divididos em grupos conforme critério escolhido
- [ ] Confrontos gerados apenas dentro de cada grupo
- [ ] Classificação exibida separadamente por grupo
- [ ] Indicação visual de times classificados (top N por grupo)
- [ ] Bracket de playoffs gerado automaticamente após fase de grupos
- [ ] UI de bracket mostra confrontos ida/volta com agregado
- [ ] Vencedores avançam até a final
- [ ] Sistema mantém compatibilidade com formato tradicional

---

**Documentação criada para Sprint 3 - Sistema de Grupos/Chaves**
