# 🔍 INVESTIGAÇÃO: Hardcode de Chaveamento no Mata-Mata

**Data:** 07/02/2026  
**Issue:** Regra "1º x 32º" hardcoded sem verificar participantes reais  
**Status:** ⚠️ **CONFIRMADO - BUG CRÍTICO**  
**Prioridade:** 🔴 **ALTA** (bloqueia ligas com < 32 participantes)

---

## 📊 RESUMO EXECUTIVO

**Problema identificado:** O frontend assume **SEMPRE 32 times** baseado na configuração do wizard, ignorando o número **REAL** de participantes ativos na liga.

**Impacto:**
- Liga com 20 participantes → Backend calcula 16 times → Frontend mostra interface para 32 times → **QUEBRA**
- Confrontos fantasmas aparecem na UI
- Chaveamento incorreto
- Valores financeiros errados

---

## 🔬 ANÁLISE TÉCNICA

### 1. BACKEND (✅ CORRETO - DINÂMICO)

**Arquivo:** `controllers/mata-mata-backend.js`

```javascript
// Linhas 260-265 - CALCULA CORRETAMENTE
async function calcularResultadosEdicao(ligaId, edicao, rodadaAtual, config) {
    // 1. Conta participantes REAIS
    const totalParticipantes = await Time.countDocuments({ 
        liga_id: ligaId, 
        ativo: true, 
        temporada: CURRENT_SEASON 
    });

    // 2. Calcula tamanho ideal (potência de 2)
    const tamanhoTorneio = calcularTamanhoIdealMataMata(totalParticipantes);
    //   20 participantes → retorna 16
    //   45 participantes → retorna 32
    //   7 participantes  → retorna 0 (mínimo 8)
}
```

**Função `calcularTamanhoIdealMataMata()` (utils/tournamentUtils.js):**
```javascript
// Encontra maior potência de 2 ≤ totalParticipantes
export function calcularTamanhoIdealMataMata(totalParticipantes) {
    if (totalParticipantes < 8) return 0;
    
    // 7 → 0
    // 8 → 8
    // 15 → 8
    // 16 → 16
    // 29 → 16
    // 32 → 32
    // 45 → 32
    // 64 → 64
    
    let potenciaDeDois = Math.pow(2, Math.floor(Math.log2(totalParticipantes)));
    return potenciaDeDois >= 8 ? potenciaDeDois : 0;
}
```

**Lógica de chaveamento (linha 131):**
```javascript
function montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual, tamanhoTorneio) {
    const metade = tamanhoTorneio / 2;
    
    for (let i = 0; i < metade; i++) {
        const timeA = rankingBase[i];              // 1º, 2º, 3º...
        const timeB = rankingBase[tamanhoTorneio - 1 - i];  // último, penúltimo...
        
        // Se tamanhoTorneio = 16:
        //   Jogo 1: rankingBase[0] x rankingBase[15]  (1º x 16º)
        //   Jogo 2: rankingBase[1] x rankingBase[14]  (2º x 15º)
        //   ...
        //   Jogo 8: rankingBase[7] x rankingBase[8]   (8º x 9º)
    }
}
```

**✅ Backend está 100% correto e dinâmico!**

---

### 2. FRONTEND (❌ HARDCODED)

**Arquivo:** `public/js/mata-mata/mata-mata-config.js`

```javascript
// Linha 85 - HARDCODE
export const TAMANHO_TORNEIO_DEFAULT = 32;
```

**Arquivo:** `public/js/mata-mata/mata-mata-orquestrador.js`

```javascript
// Linha 65 - Inicializa com hardcode
let tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;  // 32

// Linhas 287-301 - TENTA carregar do wizard (ERRADO!)
const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
const wizardRespostas = configData?.config?.wizard_respostas;

const totalTimes = Number(wizardRespostas?.total_times);
if (totalTimes && [8, 16, 32].includes(totalTimes)) {
    tamanhoTorneio = totalTimes;  // ❌ Usa o que o ADMIN configurou
}
```

**Arquivo:** `public/js/mata-mata/mata-mata-confrontos.js`

```javascript
// Linha 85 - Parâmetro default hardcoded
export function montarConfrontosPrimeiraFase(
    rankingBase, 
    pontosRodadaAtual, 
    tamanhoTorneio = 32  // ❌ Default hardcoded
) {
    // Mesma lógica do backend, mas com valor errado!
}
```

---

### 3. O WIZARD (🤔 MAL PROJETADO)

**Arquivo:** `config/rules/mata_mata.json` (linhas 158-171)

```json
{
  "id": "total_times",
  "tipo": "select",
  "label": "Quantos times participam?",
  "descricao": "Define o formato do chaveamento",
  "default": 32,
  "required": true,
  "options": [
    { "valor": 8, "label": "8 times (3 fases)" },
    { "valor": 16, "label": "16 times (4 fases)" },
    { "valor": 32, "label": "32 times (5 fases)" }
  ]
}
```

**❌ Problema:** Pergunta ao admin "quantos times participam?", mas deveria perguntar **"Qual o mínimo de times para ativar mata-mata?"** ou simplesmente **não perguntar** (calcular automaticamente).

---

## 🐛 CENÁRIOS DE FALHA

### Cenário 1: Liga com 20 Participantes

```
Config do Wizard: 32 times
Participantes Ativos: 20

Backend calcula: 16 times (2^4 = 16 ≤ 20)
Frontend usa: 32 times

Resultado:
- UI mostra 16 confrontos fantasmas (32/2 = 16)
- Última linha do chaveamento: rankingBase[31] → undefined
- Confrontos quebrados, sem escudos, sem nomes
```

### Cenário 2: Liga com 10 Participantes

```
Config do Wizard: 32 times
Participantes Ativos: 10

Backend calcula: 8 times (2^3 = 8 ≤ 10)
Frontend usa: 32 times

Resultado:
- Backend monta 4 confrontos reais
- Frontend tenta renderizar 16 confrontos
- 12 confrontos vazios na tela
```

### Cenário 3: Liga com 7 Participantes

```
Config do Wizard: 32 times
Participantes Ativos: 7

Backend calcula: 0 (menos que mínimo de 8)
Frontend usa: 32 times

Resultado:
- Backend: Retorna [] (array vazio)
- Frontend: Tenta montar 16 confrontos com ranking vazio
- CRASH ou tela em branco
```

---

## 🔄 FLUXO ATUAL (INCORRETO)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN configura no wizard: "32 times"                   │
│    (salvo em ModuleConfig.wizard_respostas.total_times)    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND calcula (calcularResultadosEdicao):             │
│    - Conta participantes ativos: 20                         │
│    - calcularTamanhoIdealMataMata(20) → 16                  │
│    - Monta 8 confrontos (16/2) com ranking[0..15]          │
│    - Salva no MataMataCache.dados_torneio                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FRONTEND (mata-mata-orquestrador.js):                   │
│    - Busca /api/liga/{ligaId}/modulos/mata_mata            │
│    - Lê wizard_respostas.total_times → 32                  │
│    - Define tamanhoTorneio = 32                             │
│    - Passa para montarConfrontosPrimeiraFase(ranking, 32)  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RENDERIZAÇÃO (mata-mata-ui.js):                         │
│    - Tenta acessar ranking[31] → undefined                 │
│    - Mostra confrontos com "undefined x undefined"          │
│    - Escudos quebrados, valores errados                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ FLUXO CORRETO (PROPOSTO)

### Opção A: Backend retorna tamanho calculado

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BACKEND calcula (calcularResultadosEdicao):             │
│    - Conta participantes ativos: 20                         │
│    - calcularTamanhoIdealMataMata(20) → 16                  │
│    - Monta confrontos com tamanho 16                        │
│    - Salva no MataMataCache:                                │
│      {                                                       │
│        dados_torneio: { primeira: [...], oitavas: [...] },  │
│        tamanhoTorneio: 16,  ← ADICIONAR ESTE CAMPO          │
│        participantesAtivos: 20                              │
│      }                                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (mata-mata-orquestrador.js):                   │
│    - Busca /api/mata-mata/cache/{ligaId}/{edicao}          │
│    - Lê cached.tamanhoTorneio → 16                          │
│    - Define tamanhoTorneio = 16                             │
│    - Passa para montarConfrontosPrimeiraFase(ranking, 16)  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RENDERIZAÇÃO (mata-mata-ui.js):                         │
│    - Acessa ranking[0..15] corretamente                    │
│    - Mostra 8 confrontos reais (16/2)                      │
│    - UI consistente com dados reais                         │
└─────────────────────────────────────────────────────────────┘
```

### Opção B: Frontend calcula dinamicamente (menos seguro)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND busca ranking completo da rodada de definição  │
│    - GET /api/rodadas/${ligaId}/${rodadaDefinicao}         │
│    - Conta times com ativo: true                            │
│    - calcularTamanhoIdealMataMata(totalAtivos) localmente  │
└─────────────────────────────────────────────────────────────┘
```

❌ **Problema:** Duplicação de lógica + risco de inconsistência

---

## 🎯 RECOMENDAÇÃO: OPÇÃO A

**Por quê?**
1. ✅ Única fonte de verdade (backend)
2. ✅ Frontend não precisa duplicar lógica
3. ✅ Garante consistência entre cálculo e renderização
4. ✅ Permite auditoria (saber qual tamanho foi usado em cada edição)

---

## 🛠️ IMPLEMENTAÇÃO PROPOSTA

### PASSO 1: Backend - Adicionar `tamanhoTorneio` ao cache

**Arquivo:** `controllers/mata-mata-backend.js`

```javascript
// Dentro de calcularResultadosEdicao(), APÓS linha 289
const rankingClassificados = rankingBase.slice(0, tamanhoTorneio);

console.log(
    `[MATA-BACKEND] ${edicao.nome}: Torneio com ${tamanhoTorneio} times. Ranking base com ${rankingClassificados.length} times.`,
);

// ✅ ADICIONAR: Retornar metadados junto com resultados
return {
    resultados: resultadosFinanceiros,
    metadata: {
        tamanhoTorneio: tamanhoTorneio,
        participantesAtivos: totalParticipantes,
        rankingBase: rankingClassificados.length
    }
};
```

**Modificar `mataMataCacheController.js`:**
```javascript
// Adicionar metadata ao salvar
const cacheData = {
    liga_id: ligaId,
    edicao: edicao,
    temporada: temporada,
    rodada_atual: rodadaAtual,
    dados_torneio: dados,
    tamanhoTorneio: dados.metadata?.tamanhoTorneio || 32,  // ← NOVO CAMPO
    participantesAtivos: dados.metadata?.participantesAtivos || null,
    ultima_atualizacao: new Date()
};
```

### PASSO 2: Frontend - Usar tamanho do cache

**Arquivo:** `public/js/mata-mata/mata-mata-orquestrador.js`

```javascript
// REMOVER linhas 287-301 (busca do wizard)

// SUBSTITUIR POR (linha ~400):
async function calcularResultadosEdicaoFluxo(ligaId, edicao, rodadaAtual) {
    // ... código existente ...
    
    // ✅ ADICIONAR: Buscar tamanho do cache primeiro
    try {
        const resCache = await fetch(`/api/mata-mata/cache/${ligaId}/${edicao.id}`);
        if (resCache.ok) {
            const cacheData = await resCache.json();
            if (cacheData.cached && cacheData.dados?.tamanhoTorneio) {
                const tamanhoDoCache = Number(cacheData.dados.tamanhoTorneio);
                if (tamanhoDoCache && tamanhoDoCache >= 8) {
                    tamanhoTorneio = tamanhoDoCache;
                    setTamanhoTorneioFinanceiro(tamanhoTorneio);
                    console.log(`[MATA-ORQUESTRADOR] Tamanho do torneio (cache): ${tamanhoTorneio}`);
                }
            }
        }
    } catch (err) {
        console.warn("[MATA-ORQUESTRADOR] Cache não disponível, usando cálculo local");
    }
    
    // Fallback: calcular localmente se cache não disponível
    if (!tamanhoTorneio || tamanhoTorneio === TAMANHO_TORNEIO_DEFAULT) {
        const rankingCompleto = await getRankingRodadaEspecifica(ligaId, edicao.rodadaDefinicao);
        const timesAtivos = rankingCompleto.filter(t => t.ativo !== false).length;
        tamanhoTorneio = calcularTamanhoIdealFrontend(timesAtivos);
        console.log(`[MATA-ORQUESTRADOR] Tamanho calculado localmente: ${tamanhoTorneio} (${timesAtivos} ativos)`);
    }
}

// Função auxiliar (copiar do backend)
function calcularTamanhoIdealFrontend(totalParticipantes) {
    if (totalParticipantes < 8) return 0;
    let potenciaDeDois = Math.pow(2, Math.floor(Math.log2(totalParticipantes)));
    return potenciaDeDois >= 8 ? potenciaDeDois : 0;
}
```

### PASSO 3: Modelo - Adicionar campo no schema

**Arquivo:** `models/MataMataCache.js`

```javascript
const MataMataCacheSchema = new mongoose.Schema({
    liga_id: { type: String, required: true, index: true },
    edicao: { type: Number, required: true },
    rodada_atual: { type: Number, required: true },
    temporada: { type: Number, required: true, default: CURRENT_SEASON, index: true },
    
    // ✅ ADICIONAR
    tamanhoTorneio: { 
        type: Number, 
        required: false,
        default: 32,
        min: 4,
        max: 64
    },
    participantesAtivos: { 
        type: Number, 
        required: false 
    },
    
    dados_torneio: { type: mongoose.Schema.Types.Mixed },
    ultima_atualizacao: { type: Date, default: Date.now }
});
```

### PASSO 4: Remover/Deprecar pergunta do wizard

**Arquivo:** `config/rules/mata_mata.json`

```json
// OPÇÃO 1: Remover completamente (recomendado)
// Deletar linhas 158-171

// OPÇÃO 2: Manter mas renomear (para compatibilidade)
{
  "id": "tamanho_minimo",
  "tipo": "number",
  "label": "Mínimo de participantes para ativar mata-mata",
  "descricao": "Torneio só acontece se houver pelo menos este número de participantes ativos",
  "default": 8,
  "min": 4,
  "max": 64,
  "step": 1,
  "required": false,
  "afeta": "configuracao.minimo_participantes"
}
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] `mata-mata-backend.js`: Retornar `metadata` com `tamanhoTorneio` em `calcularResultadosEdicao()`
- [ ] `mataMataCacheController.js`: Salvar `tamanhoTorneio` e `participantesAtivos` no cache
- [ ] `MataMataCache.js`: Adicionar campos `tamanhoTorneio` e `participantesAtivos` ao schema
- [ ] Testar com liga de 20 participantes

### Frontend
- [ ] `mata-mata-orquestrador.js`: Buscar `tamanhoTorneio` do cache via API
- [ ] `mata-mata-orquestrador.js`: Implementar fallback com cálculo local
- [ ] `mata-mata-orquestrador.js`: Remover dependência de `wizard_respostas.total_times`
- [ ] `mata-mata-config.js`: Adicionar função `calcularTamanhoIdealFrontend()`
- [ ] Testar renderização com 8, 16, 32 times

### Configuração
- [ ] `mata_mata.json`: Deprecar ou renomear pergunta `total_times`
- [ ] Documentar nova lógica em `AUDITORIA-MATA-MATA-COMPLETA-2026-02-07.md`

### Testes
- [ ] Liga com 7 participantes → Mensagem "Mínimo 8 participantes"
- [ ] Liga com 10 participantes → Torneio de 8 times (4 confrontos)
- [ ] Liga com 20 participantes → Torneio de 16 times (8 confrontos)
- [ ] Liga com 35 participantes → Torneio de 32 times (16 confrontos)

---

## 🚀 PRIORIDADE DE EXECUÇÃO

**🔴 CRÍTICO (Bloqueia ligas pequenas):**
1. Backend: Retornar `tamanhoTorneio` no cache
2. Frontend: Usar valor do cache ao invés do wizard
3. Testar com liga < 32 participantes

**🟠 ALTA (Melhoria de UX):**
4. Adicionar mensagem quando liga tem < 8 participantes
5. Mostrar "Torneio de X times" na UI

**🟡 MÉDIA (Limpeza de código):**
6. Remover/deprecar pergunta do wizard
7. Atualizar documentação

---

## 📊 ESTIMATIVA DE ESFORÇO

| Tarefa | Tempo | Complexidade |
|--------|-------|--------------|
| Backend: Adicionar metadata | 30 min | Baixa |
| Model: Adicionar campos | 10 min | Baixa |
| Frontend: Buscar do cache | 45 min | Média |
| Frontend: Fallback local | 30 min | Média |
| Testes integração | 60 min | Média |
| Documentação | 20 min | Baixa |
| **TOTAL** | **~3h** | **Média** |

---

## ✅ CRITÉRIOS DE SUCESSO

1. ✅ Liga com 20 participantes mostra 8 confrontos (16 times)
2. ✅ Liga com 10 participantes mostra 4 confrontos (8 times)
3. ✅ Liga com 7 participantes mostra mensagem de mínimo
4. ✅ Wizard não influencia mais o tamanho do torneio
5. ✅ Backend e frontend sempre consistentes
6. ✅ Auditoria mostra tamanho usado em cada edição

---

**Próximo passo:** Implementar PASSO 1 (Backend - metadata) ou aguardar aprovação?

**Documento gerado em:** 2026-02-07  
**Por:** GitHub Copilot (Claude Sonnet 4.5)
