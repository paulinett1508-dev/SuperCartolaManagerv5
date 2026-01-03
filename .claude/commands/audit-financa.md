# Auditoria Financeira de Participante - Super Cartola

Você é um **Auditor Financeiro** do sistema Super Cartola.
Sua função é analisar a situação financeira completa de um participante específico.

Argumentos: $ARGUMENTS

---

## 📦 Collections Necessárias

| Collection | Descrição | Campo ID |
|:-----------|:----------|:---------|
| `times` | Dados do participante | `id` (Number) |
| `extratofinanceirocaches` | Cache do saldo das rodadas | `time_id` (Number) |
| `fluxofinanceirocampos` | **Campos manuais (prêmios)** | `timeId` (String!) |
| `acertofinanceiros` | Pagamentos/Recebimentos | `timeId` (String) |
| `rodadas` | Histórico de rodadas | `time_id` (Number) |

> ⚠️ **IMPORTANTE:** A collection `fluxofinanceirocampos` usa `timeId` como STRING, diferente das outras!

---

## 🔍 Protocolo de Auditoria Financeira

### 1. Identificar o Participante
Extraia o nome do participante dos argumentos fornecidos.

### 2. Buscar Dados no Banco
Execute os seguintes passos para encontrar e auditar o participante:

```javascript
// Passo 1: Conectar ao MongoDB e buscar o participante pelo nome
// Use o modelo Time para buscar por nome_cartola ou nome_time (case-insensitive)

// Busca aproximada no MongoDB:
db.times.find({ 
  $or: [
    { nome_cartola: { $regex: "<NOME>", $options: "i" } },
    { nome_time: { $regex: "<NOME>", $options: "i" } }
  ]
})

// Passo 2: Para cada time encontrado, buscar:
// - Acertos financeiros: db.acertofinanceiros.find({ timeId: <timeId> })
// - Cache de extrato: db.extratofinanceirocaches.find({ time_id: <timeId> })
// - Campos manuais: db.fluxofinanceirocampos.find({ timeId: "<timeId>" }) // IMPORTANTE: timeId é STRING!
// - Rodadas jogadas: db.rodadas.find({ time_id: <timeId> })
```

### 3. Executar Script de Auditoria
Execute o seguinte comando no terminal para obter os dados:

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

async function auditarParticipante(nome) {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Buscar time pelo nome
    const Time = mongoose.model('Time', new mongoose.Schema({}, { strict: false }), 'times');
    const times = await Time.find({
        \$or: [
            { nome_cartola: { \$regex: nome, \$options: 'i' } },
            { nome_time: { \$regex: nome, \$options: 'i' } }
        ]
    }).lean();
    
    if (times.length === 0) {
        console.log('❌ Nenhum participante encontrado com esse nome');
        process.exit(1);
    }
    
    console.log('\\n📊 PARTICIPANTES ENCONTRADOS:\\n');
    for (const t of times) {
        console.log(\`  🎯 \${t.nome_cartola} - \${t.nome_time}\`);
        console.log(\`     Liga: \${t.ligaId} | Time ID: \${t.timeId}\`);
    }
    
    // Para cada time, buscar dados financeiros
    const Acerto = mongoose.model('Acerto', new mongoose.Schema({}, { strict: false }), 'acertofinanceiros');
    const Extrato = mongoose.model('Extrato', new mongoose.Schema({}, { strict: false }), 'extratofinanceirocaches');
    const CamposManuais = mongoose.model('CamposManuais', new mongoose.Schema({}, { strict: false }), 'fluxofinanceirocampos');
    const Rodada = mongoose.model('Rodada', new mongoose.Schema({}, { strict: false }), 'rodadas');
    
    for (const t of times) {
        console.log(\`\\n${'='.repeat(60)}\`);
        console.log(\`📋 AUDITORIA: \${t.nome_cartola}\`);
        console.log(\`${'='.repeat(60)}\`);
        
        // Acertos
        const acertos = await Acerto.find({ timeId: t.timeId }).sort({ createdAt: -1 }).lean();
        let totalPago = 0, totalRecebido = 0;
        
        console.log(\`\\n💰 ACERTOS FINANCEIROS (\${acertos.length}):\`);
        if (acertos.length > 0) {
            for (const a of acertos) {
                const sinal = a.tipo === 'pago' ? '-' : '+';
                const valor = parseFloat(a.valor || 0);
                if (a.tipo === 'pago') totalPago += valor;
                else totalRecebido += valor;
                console.log(\`   \${sinal}R\$ \${valor.toFixed(2)} | \${a.tipo} | \${a.descricao || 'Sem descrição'} | \${new Date(a.createdAt).toLocaleDateString('pt-BR')}\`);
            }
            console.log(\`\\n   📊 Resumo Acertos:\`);
            console.log(\`      Total Pago: R\$ \${totalPago.toFixed(2)}\`);
            console.log(\`      Total Recebido: R\$ \${totalRecebido.toFixed(2)}\`);
            console.log(\`      Saldo Acertos: R\$ \${(totalRecebido - totalPago).toFixed(2)}\`);
        } else {
            console.log('   Nenhum acerto registrado');
        }

        // Campos Manuais (prêmios, ajustes, etc)
        const camposManuais = await CamposManuais.findOne({ timeId: String(t.id), ligaId: t.ligaId }).lean();
        let totalCamposManuais = 0;

        console.log(\`\\n🏆 CAMPOS MANUAIS (Prêmios/Ajustes):\`);
        if (camposManuais && camposManuais.campos) {
            for (const campo of camposManuais.campos) {
                if (campo.valor && campo.valor !== 0) {
                    totalCamposManuais += parseFloat(campo.valor);
                    console.log(\`   +R\$ \${parseFloat(campo.valor).toFixed(2)} | \${campo.nome}\`);
                }
            }
            if (totalCamposManuais > 0) {
                console.log(\`\\n   📊 Total Campos Manuais: R\$ \${totalCamposManuais.toFixed(2)}\`);
            } else {
                console.log('   Nenhum valor manual registrado');
            }
        } else {
            console.log('   Nenhum campo manual encontrado');
        }

        // Extrato Cache
        const extrato = await Extrato.findOne({ time_id: t.id, liga_id: t.ligaId }).sort({ temporada: -1 }).lean();
        let saldoRodadas = 0;
        if (extrato) {
            saldoRodadas = extrato.saldo_consolidado || 0;
            console.log(\`\\n📈 EXTRATO CACHE:\`);
            console.log(\`   Temporada: \${extrato.temporada}\`);
            console.log(\`   Última Rodada: \${extrato.ultima_rodada_consolidada || extrato.ultima_rodada}\`);
            console.log(\`   Saldo Rodadas: R\$ \${saldoRodadas.toFixed(2)}\`);
            console.log(\`   Atualizado: \${new Date(extrato.updatedAt).toLocaleString('pt-BR')}\`);
        }

        // Rodadas jogadas
        const rodadas = await Rodada.find({ time_id: t.id, liga_id: t.ligaId }).sort({ rodada: 1 }).lean();
        if (rodadas.length > 0) {
            const totalPontos = rodadas.reduce((s, r) => s + (r.pontos || 0), 0);
            const ultimaRodada = rodadas[rodadas.length - 1];
            console.log(\`\\n🎮 RODADAS JOGADAS (\${rodadas.length}):\`);
            console.log(\`   Pontos Total: \${totalPontos.toFixed(2)}\`);
            console.log(\`   Saldo Acumulado (última rodada): R\$ \${(ultimaRodada.saldoAcumulado || 0).toFixed(2)}\`);
        }

        // RESUMO FINAL
        const saldoTotal = saldoRodadas + totalCamposManuais;
        const saldoComAcertos = saldoTotal + totalPago - totalRecebido; // pagamento soma, recebimento subtrai
        console.log(\`\\n${'='.repeat(60)}\`);
        console.log(\`📊 RESUMO FINAL:\`);
        console.log(\`   Saldo Rodadas:        R\$ \${saldoRodadas.toFixed(2)}\`);
        console.log(\`   Campos Manuais:       R\$ \${totalCamposManuais.toFixed(2)}\`);
        console.log(\`   ─────────────────────────────\`);
        console.log(\`   Crédito/Débito Base:  R\$ \${saldoTotal.toFixed(2)}\`);
        console.log(\`   Pagamentos (+):       R\$ \${totalPago.toFixed(2)}\`);
        console.log(\`   Recebimentos (-):     R\$ \${totalRecebido.toFixed(2)}\`);
        console.log(\`   ─────────────────────────────\`);
        console.log(\`   SALDO FINAL:          R\$ \${saldoComAcertos.toFixed(2)}\`);
        if (saldoComAcertos > 0) {
            console.log(\`   Status: 🟢 A RECEBER\`);
        } else if (saldoComAcertos < 0) {
            console.log(\`   Status: 🔴 DEVE\`);
        } else {
            console.log(\`   Status: ✅ QUITADO\`);
        }
    }
    
    await mongoose.disconnect();
}

auditarParticipante('$1');
"
```

### 4. Análise via API (Alternativa)
Se o servidor estiver rodando, também pode usar:

```bash
# Buscar dados do participante via API
curl -s "http://localhost:5000/api/ligas/<LIGA_ID>/times" | jq '.[] | select(.nome_cartola | test("<NOME>"; "i"))'

# Buscar acertos
curl -s "http://localhost:5000/api/acertos/<LIGA_ID>/<TIME_ID>?temporada=2025"

# Buscar extrato completo
curl -s "http://localhost:5000/api/extrato-cache/<LIGA_ID>/times/<TIME_ID>?temporada=2025"
```

---

## 📝 Formato do Relatório

Após executar a auditoria, apresente os resultados no seguinte formato:

### 🔍 Auditoria Financeira: [Nome do Participante]

**Data:** [Data atual]
**Time:** [Nome do Time]
**Liga:** [Nome da Liga]

#### 💰 Resumo Financeiro

| Categoria | Valor |
|:----------|------:|
| Saldo das Rodadas | R$ X.XX |
| Campos Manuais (prêmios) | R$ X.XX |
| **Crédito/Débito Base** | **R$ X.XX** |
| Pagamentos (participante → admin) | +R$ X.XX |
| Recebimentos (admin → participante) | -R$ X.XX |
| **Saldo Final** | **R$ X.XX** |

> **Lógica dos Acertos:**
> - `pagamento` = participante paga o admin (abate dívida) → SOMA ao saldo
> - `recebimento` = admin paga o participante (abate crédito) → SUBTRAI do saldo

#### 📊 Status

- **Situação:** 🟢 QUITADO / 🟡 A RECEBER / 🔴 DEVE
- **Última Atualização:** [Data]
- **Rodadas Jogadas:** X de 38

#### 📋 Histórico de Acertos

| Data | Tipo | Valor | Descrição |
|:-----|:-----|------:|:----------|
| DD/MM/YYYY | Pago/Recebido | R$ X.XX | Descrição |

#### 🏆 Campos Manuais (se houver)

| Campo | Valor |
|:------|------:|
| Melhor do Mês - Edição X | R$ X.XX |
| Liga Pontos Corridos | R$ X.XX |
| etc... | R$ X.XX |

#### ⚠️ Alertas (se houver)

- Divergência entre saldo calculado e cache
- Caches duplicados (verificar collection `extratofinanceirocaches`)
- Campos manuais não considerados
- Acertos sem descrição
- Rodadas faltantes

---

## 🛠️ Comandos Úteis

```bash
# Recalcular cache do participante
curl -X POST "http://localhost:5000/api/extrato-cache/<LIGA_ID>/times/<TIME_ID>/cache"

# Invalidar cache
curl -X DELETE "http://localhost:5000/api/extrato-cache/<LIGA_ID>/times/<TIME_ID>/cache"
```
