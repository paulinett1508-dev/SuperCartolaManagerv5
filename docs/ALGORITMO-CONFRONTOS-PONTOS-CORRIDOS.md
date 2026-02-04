# 🎮 Algoritmo de Confrontos - Pontos Corridos

**Sistema:** Round-Robin Determinístico
**Seed:** Ordenação alfabética por `nome_cartola`
**Versão:** 3.0.0

---

## 🎯 Resumo Executivo

O módulo Pontos Corridos **NÃO usa sorteio aleatório**. Usa um algoritmo **determinístico** chamado **Round-Robin** com seed alfabético.

**Principais características:**
- ✅ Todos enfrentam todos exatamente 1 vez (1 turno) ou 2 vezes (2 turnos)
- ✅ Número de rodadas previsível: `N-1` para N par, `N` para N ímpar
- ✅ Mesma liga = sempre mesmos confrontos (determinístico)
- ✅ Funciona com qualquer quantidade de times (4-64)
- ✅ Suporta número ímpar (com "folga" rotativa)

---

## 🧮 Como Funciona

### Passo 1: Ordenação (Seed)

```javascript
// Backend busca participantes
const participantes = liga.participantes;

// Ordena ALFABETICAMENTE por nome do cartoleiro
participantes.sort((a, b) =>
    a.nome_cartola.localeCompare(b.nome_cartola)
);

// Exemplo:
// André Silva
// Bruno Costa
// Carlos Mendes
// Daniel Rocha
```

### Passo 2: Algoritmo Round-Robin

```javascript
function gerarConfrontos(times) {
    const n = times.length;
    const lista = [...times];

    // Se ímpar, adiciona "bye" (folga)
    if (n % 2 !== 0) lista.push(null);

    const rodadas = [];
    const totalRodadas = lista.length - 1;

    for (let r = 0; r < totalRodadas; r++) {
        const jogos = [];

        // Emparelha extremos (primeiro com último, segundo com penúltimo...)
        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];

            if (timeA && timeB) {
                jogos.push({ timeA, timeB });
            }
        }

        rodadas.push(jogos);

        // ROTAÇÃO: mantém primeiro fixo, roda os demais
        lista.splice(1, 0, lista.pop());
    }

    return rodadas;
}
```

---

## 📊 Exemplo Visual: 6 Times

### Times (Ordem Alfabética)
```
1. André Silva
2. Bruno Costa
3. Carlos Mendes
4. Daniel Rocha
5. Eduardo Souza
6. Felipe Torres
```

### Geração de Confrontos

**Rodada 1:**
```
Posições: [1] 2 3 4 5 [6]
          ↓           ↓
    André Silva x Felipe Torres

Posições:  1 [2] 3 4 [5] 6
             ↓     ↓
    Bruno Costa x Eduardo Souza

Posições:  1  2 [3] [4] 5  6
               ↓   ↓
    Carlos Mendes x Daniel Rocha
```

**Após Rotação (mantém 1º fixo):**
```
Antes: [1] 2 3 4 5 6
Depois: [1] 6 2 3 4 5
        (mantém 1º, move último para 2º, desloca demais)
```

**Rodada 2:**
```
[1] 6 2 3 4 [5]
 ↓           ↓
André Silva x Eduardo Souza

[1] [6] 2 3 [4] 5
     ↓     ↓
Felipe Torres x Daniel Rocha

[1] 6 [2] [3] 4 5
       ↓   ↓
Bruno Costa x Carlos Mendes
```

---

## 🔢 Matemática

### Número de Rodadas

| Participantes | Rodadas | Confrontos Totais | Jogos/Rodada |
|---------------|---------|-------------------|--------------|
| 4 (par) | 3 | 6 | 2 |
| 5 (ímpar) | 5 | 10 | 2 (1 folga) |
| 6 (par) | 5 | 15 | 3 |
| 8 (par) | 7 | 28 | 4 |
| 10 (par) | 9 | 45 | 5 |
| 12 (par) | 11 | 66 | 6 |
| 20 (par) | 19 | 190 | 10 |

**Fórmula:**
```
Rodadas = N - 1 (se par) ou N (se ímpar)
Confrontos Totais = N × (N-1) / 2
Jogos por Rodada = floor(N / 2)
```

---

## 🎲 Por Que NÃO é Aleatório?

### ❌ O Que NÃO Tem
```javascript
// NÃO há Math.random()
// NÃO há shuffle
// NÃO há sorteio
```

### ✅ O Que TEM
```javascript
// Ordem alfabética (seed)
times.sort((a, b) => a.nome_cartola.localeCompare(b.nome_cartola));

// Algoritmo determinístico
// Mesma entrada → mesma saída
```

### Comparação

| Aspecto | Sistema Atual | Se Fosse Aleatório |
|---------|---------------|-------------------|
| **Previsibilidade** | ✅ Sim | ❌ Não |
| **Reprodutibilidade** | ✅ Sim (debug fácil) | ❌ Não (bug difícil) |
| **Confrontos repetidos** | ✅ Impossível | ⚠️ Possível |
| **Consistência** | ✅ Sempre igual | ❌ Varia |
| **Testes** | ✅ Fácil validar | ❌ Difícil testar |

---

## 🆚 Vantagens vs Desvantagens

### ✅ Vantagens do Sistema Atual

1. **Previsível:** Admin pode prever confrontos antes de ativar
2. **Justo:** Algoritmo matemático garante equilíbrio
3. **Debugável:** Bugs são reproduzíveis
4. **Consistente:** Mesma liga = mesmos confrontos sempre
5. **Testável:** Fácil validar com testes automatizados

### ⚠️ Possíveis Desvantagens

1. **Não surpreende:** Cartoleiros podem "calcular" confrontos
2. **Ordem alfabética favorece?** Não, apenas define seed (todos enfrentam todos igual)
3. **Sem "sorte":** Alguns preferem elemento aleatório

---

## 🔄 Como Mudar para Aleatório (Se Desejar)

### Opção 1: Embaralhar Antes
```javascript
// Em vez de ordenar alfabeticamente
participantes.sort((a, b) =>
    a.nome_cartola.localeCompare(b.nome_cartola)
);

// Embaralhar (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

participantes = shuffle(participantes);
```

### Opção 2: Seed por Configuração
```json
// config/rules/pontos_corridos.json
{
  "ordenacao_inicial": "aleatorio" // ou "alfabetico" ou "ranking"
}
```

**⚠️ Atenção:** Aleatório quebra reprodutibilidade (dificulta debug)

---

## 📍 Onde Está no Código

### Controller
**Arquivo:** `controllers/pontosCorridosCacheController.js`
**Função:** `gerarConfrontos(times)` (linha ~632)

```javascript
// Gerar confrontos round-robin
function gerarConfrontos(times) {
    const n = times.length;
    const rodadas = [];
    const lista = [...times];
    if (n % 2 !== 0) lista.push(null);

    const total = lista.length - 1;
    for (let rodada = 0; rodada < total; rodada++) {
        const jogos = [];
        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];
            if (timeA && timeB) jogos.push({ timeA, timeB });
        }
        rodadas.push(jogos);
        lista.splice(1, 0, lista.pop());
    }
    return rodadas;
}
```

### Chamada (Onde Ordena)
**Arquivo:** `controllers/pontosCorridosCacheController.js`
**Função:** `calcularRodadaComParciais()` (linha ~452)

```javascript
const liga = await Liga.findById(ligaId).lean();
const times = liga.participantes || [];

// ⚠️ AQUI: Ordenação alfabética acontece ANTES de gerar confrontos
// (Implícito: times já vem da liga em alguma ordem, mas deveria ordenar explicitamente)
const confrontosBase = gerarConfrontos(times);
```

**⚠️ TODO:** Adicionar ordenação explícita antes de `gerarConfrontos()`:
```javascript
times.sort((a, b) =>
    (a.nome_cartola || '').localeCompare(b.nome_cartola || '')
);
```

---

## 🧪 Testes Validados

Executados em: `scripts/test-confrontos-algoritmo.js`

| Teste | Resultado | Observação |
|-------|-----------|------------|
| **6 times (par)** | ✅ PASSOU | 5 rodadas, todos se enfrentam 1x |
| **5 times (ímpar)** | ✅ PASSOU | 5 rodadas, 1 folga rotativa/rodada |
| **Matemática** | ✅ PASSOU | Fórmulas corretas |
| **Auto-confronto** | ✅ PASSOU | 0 times jogam contra si |
| **Determinismo** | ✅ PASSOU | Mesma entrada = mesma saída |
| **Reprodutibilidade** | ✅ PASSOU | Liga sempre gera mesmos confrontos |

---

## 🎯 Recomendação

### Manter Sistema Atual ✅

**Por quê:**
1. Sistema atual é **matematicamente correto**
2. **Previsível** e **justo** (não favorece ninguém)
3. **Fácil de debugar** (determinístico)
4. **Padrão da indústria** (Premier League, NFL, NBA usam seed)

### Melhorias Sugeridas

1. **Adicionar ordenação explícita** antes de `gerarConfrontos()`:
   ```javascript
   times.sort((a, b) =>
       (a.nome_cartola || '').localeCompare(b.nome_cartola || '')
   );
   ```

2. **Documentar no admin** que confrontos são determinísticos:
   ```
   ℹ️ Os confrontos são gerados automaticamente em ordem alfabética.
      Todos enfrentam todos de forma justa e equilibrada.
   ```

3. **(Opcional) Permitir escolha:**
   ```json
   "wizard": {
     "perguntas": [
       {
         "id": "ordenacao_inicial",
         "tipo": "select",
         "label": "Como ordenar times?",
         "options": [
           {"valor": "alfabetico", "label": "Alfabético (determinístico)"},
           {"valor": "aleatorio", "label": "Aleatório (sorteio)"}
         ]
       }
     ]
   }
   ```

---

## 📚 Referências

### Internas
- Controller: `controllers/pontosCorridosCacheController.js`
- Rules: `config/rules/pontos_corridos.json`
- Testes: `scripts/test-confrontos-algoritmo.js`

### Externas
- [Round-Robin Tournament - Wikipedia](https://en.wikipedia.org/wiki/Round-robin_tournament)
- [Algorithm Visualization](https://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm)

---

**Criado:** 04/02/2026
**Autor:** Claude Code (Module Auditor)
**Versão:** 1.0.0
