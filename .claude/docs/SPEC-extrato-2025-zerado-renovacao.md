# SPEC - Bug: Extrato 2025 Zerado Apos Renovacao

**Data:** 2026-01-17
**Baseado em:** PRD-extrato-2025-zerado-renovacao.md
**Status:** Especificacao Tecnica
**Criticidade:** ALTA - Afeta dados financeiros de participantes

---

## Resumo da Implementacao

Corrigir a inconsistencia de tipo do campo `liga_id` na funcao `processarDecisaoUnificada()` do inscricoesController.js. A query atual usa apenas `ObjectId`, mas os documentos existentes armazenam `liga_id` como `String`. Isso causa criacao de documentos duplicados vazios via `upsert: true`. A correcao aplica o padrao `$or` (String OU ObjectId) ja usado em outros locais do codigo, alem de remover o `upsert: true` para evitar criacao de documentos fantasmas.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. controllers/inscricoesController.js - Correcao Principal

**Path:** `controllers/inscricoesController.js`
**Tipo:** Modificacao
**Impacto:** Alto
**Dependentes:** `routes/inscricoes-routes.js` (apenas chama a funcao, nao precisa modificar)

#### Mudancas Cirurgicas:

**Linhas 917-937: MODIFICAR QUERY DE QUITACAO**

```javascript
// ANTES (Linhas 917-937):
    await db.collection('extratofinanceirocaches').updateOne(
        {
            liga_id: ligaObjId,
            time_id: Number(timeId),
            temporada: Number(temporadaAnterior)
        },
        {
            $set: {
                quitacao: {
                    quitado: true,
                    tipo: tipoQuitacao,
                    saldo_no_momento: saldo.saldoFinal,
                    valor_legado: valorLegado,
                    data_quitacao: agora,
                    admin_responsavel: decisao.aprovadoPor || 'admin',
                    observacao: decisao.observacoes || `Quitacao via modal unificado - ${decisao.decisao}`
                }
            }
        },
        { upsert: true }
    );

// DEPOIS (Linhas 917-940):
    // v1.2.1 FIX: Usar $or para buscar liga_id como String OU ObjectId
    // Documentos existentes usam String, novos podem usar ObjectId
    // REMOVIDO upsert: true para evitar criacao de documentos duplicados vazios
    const updateQuitacao = await db.collection('extratofinanceirocaches').updateOne(
        {
            $or: [
                { liga_id: String(ligaId) },
                { liga_id: ligaObjId }
            ],
            time_id: Number(timeId),
            temporada: Number(temporadaAnterior)
        },
        {
            $set: {
                quitacao: {
                    quitado: true,
                    tipo: tipoQuitacao,
                    saldo_no_momento: saldo.saldoFinal,
                    valor_legado: valorLegado,
                    data_quitacao: agora,
                    admin_responsavel: decisao.aprovadoPor || 'admin',
                    observacao: decisao.observacoes || `Quitacao via modal unificado - ${decisao.decisao}`
                }
            }
        }
    );

    // Log para debug (documento nao encontrado = cenario raro, mas nao deve criar vazio)
    if (updateQuitacao.matchedCount === 0) {
        console.warn(`[INSCRICOES] AVISO: Extrato ${temporadaAnterior} nao encontrado para time ${timeId}. Quitacao nao registrada no cache.`);
    }
```

**Motivo:**
1. Padrao `$or` ja usado em `buscarSaldoTemporada()` (linha 42-45) e `tesouraria-routes.js` (linha 503-510)
2. Remocao do `upsert: true` evita criacao de documentos vazios
3. Log de aviso para cenarios raros (documento inexistente)

---

### 2. scripts/fix-extrato-duplicados-liga-id.js - Script de Limpeza

**Path:** `scripts/fix-extrato-duplicados-liga-id.js`
**Tipo:** Criacao
**Impacto:** Medio (execucao manual)
**Dependentes:** Nenhum

#### Conteudo Completo:

```javascript
/**
 * FIX: Extrato 2025 com Documentos Duplicados (liga_id String vs ObjectId)
 *
 * PROBLEMA: A funcao processarDecisaoUnificada usava liga_id: ObjectId com upsert: true.
 * Documentos originais tinham liga_id: String, causando duplicacao.
 * O documento duplicado tem apenas {quitacao}, sem historico_transacoes.
 *
 * SOLUCAO:
 * 1. Identificar duplicados (mesmo time_id + temporada, liga_ids diferentes)
 * 2. Manter documento com dados (historico_transacoes > 0)
 * 3. Migrar campo quitacao se necessario
 * 4. Remover documento vazio
 *
 * Uso:
 *   node scripts/fix-extrato-duplicados-liga-id.js --dry-run    # Simula
 *   node scripts/fix-extrato-duplicados-liga-id.js --force      # Executa
 *
 * @version 1.0.0
 * @since 2026-01-17
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function corrigirDuplicados() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForced = process.argv.includes('--force');

    if (!isDryRun && !isForced) {
        console.error('Uso: node scripts/fix-extrato-duplicados-liga-id.js --dry-run ou --force');
        process.exit(1);
    }

    console.log(`\n========================================`);
    console.log(`FIX: EXTRATO DUPLICADOS - LIGA_ID`);
    console.log(`========================================`);
    console.log(`Modo: ${isDryRun ? 'SIMULACAO (--dry-run)' : 'EXECUCAO REAL (--force)'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('extratofinanceirocaches');

        // 1. Identificar duplicados via aggregation
        console.log('Buscando duplicados (mesmo time_id + temporada)...\n');

        const duplicados = await collection.aggregate([
            {
                $group: {
                    _id: { time_id: '$time_id', temporada: '$temporada' },
                    count: { $sum: 1 },
                    docs: { $push: '$$ROOT' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        console.log(`Grupos duplicados encontrados: ${duplicados.length}\n`);

        if (duplicados.length === 0) {
            console.log('Nenhum duplicado encontrado. Sistema OK!');
            await mongoose.disconnect();
            return;
        }

        let corrigidos = 0;
        let removidos = 0;

        for (const grupo of duplicados) {
            console.log(`\n----------------------------------------`);
            console.log(`Time ID: ${grupo._id.time_id} | Temporada: ${grupo._id.temporada}`);
            console.log(`Documentos: ${grupo.count}`);

            // Separar documento com dados vs documento vazio
            const docComDados = grupo.docs.find(d =>
                (d.historico_transacoes?.length > 0) ||
                (d.saldo_consolidado && d.saldo_consolidado !== 0)
            );

            const docVazio = grupo.docs.find(d =>
                (!d.historico_transacoes || d.historico_transacoes.length === 0) &&
                (!d.saldo_consolidado || d.saldo_consolidado === 0)
            );

            if (!docComDados) {
                console.log(`  AVISO: Nenhum documento com dados encontrado. Pulando...`);
                continue;
            }

            console.log(`\n  DOC COM DADOS:`);
            console.log(`    _id: ${docComDados._id}`);
            console.log(`    liga_id: ${docComDados.liga_id} (tipo: ${typeof docComDados.liga_id})`);
            console.log(`    saldo: R$ ${docComDados.saldo_consolidado}`);
            console.log(`    transacoes: ${docComDados.historico_transacoes?.length || 0}`);
            console.log(`    quitacao: ${docComDados.quitacao?.quitado ? 'SIM' : 'NAO'}`);

            if (docVazio) {
                console.log(`\n  DOC VAZIO (a remover):`);
                console.log(`    _id: ${docVazio._id}`);
                console.log(`    liga_id: ${docVazio.liga_id} (tipo: ${typeof docVazio.liga_id})`);
                console.log(`    quitacao: ${docVazio.quitacao?.quitado ? 'SIM' : 'NAO'}`);

                // Migrar quitacao se documento vazio tem e o com dados nao
                const precisaMigrarQuitacao = docVazio.quitacao?.quitado && !docComDados.quitacao?.quitado;

                if (!isDryRun) {
                    if (precisaMigrarQuitacao) {
                        console.log(`\n  MIGRANDO quitacao do doc vazio para doc com dados...`);
                        await collection.updateOne(
                            { _id: docComDados._id },
                            { $set: { quitacao: docVazio.quitacao } }
                        );
                        console.log(`  Quitacao migrada com sucesso!`);
                    }

                    // Remover documento vazio
                    await collection.deleteOne({ _id: docVazio._id });
                    console.log(`\n  REMOVIDO: Documento vazio deletado`);
                    removidos++;
                } else {
                    if (precisaMigrarQuitacao) {
                        console.log(`\n  [DRY-RUN] Seria migrada quitacao`);
                    }
                    console.log(`  [DRY-RUN] Seria removido documento vazio`);
                }

                corrigidos++;
            } else {
                console.log(`\n  AVISO: Nao encontrado documento vazio obvio. Verificar manualmente.`);
                grupo.docs.forEach((d, i) => {
                    console.log(`    Doc ${i + 1}: _id=${d._id}, transacoes=${d.historico_transacoes?.length || 0}, saldo=${d.saldo_consolidado}`);
                });
            }
        }

        console.log(`\n========================================`);
        console.log(`RESUMO:`);
        console.log(`  - Grupos analisados: ${duplicados.length}`);
        console.log(`  - Corrigidos: ${isDryRun ? '0 (dry-run)' : corrigidos}`);
        console.log(`  - Docs removidos: ${isDryRun ? '0 (dry-run)' : removidos}`);
        console.log(`  - Modo: ${isDryRun ? 'SIMULACAO' : 'EXECUTADO'}`);
        console.log(`========================================\n`);

        if (isDryRun && duplicados.length > 0) {
            console.log('Para executar de verdade, rode:');
            console.log('  node scripts/fix-extrato-duplicados-liga-id.js --force\n');
        }

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

corrigirDuplicados();
```

---

## Mapa de Dependencias

```
processarDecisaoUnificada (controllers/inscricoesController.js:841-1018)
    |
    |-- Chamado por:
    |   └── routes/inscricoes-routes.js (linha 514)
    |       └── POST /api/inscricoes/:ligaId/:temporada/decisao/:timeId
    |
    |-- Usa internamente:
    |   └── mongoose.connection.db.collection('extratofinanceirocaches').updateOne
    |       └── [MODIFICAR] Linha 917-937: Query com $or + remover upsert
    |
    |-- Padrao correto ja usado em:
    |   └── buscarSaldoTemporada() (linha 42-45): $or String/ObjectId
    |   └── buscarDadosDecisao() (linha 740-747): $or String/ObjectId
    |   └── tesouraria-routes.js (linha 503-510): $or String/ObjectId
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Query inclui `liga_id` (via $or com String e ObjectId)
- [x] Query inclui `temporada` para segregacao de dados
- [x] Query inclui `time_id` para identificacao unica

**Query Corrigida:**
```javascript
// controllers/inscricoesController.js - Linha 917
await db.collection('extratofinanceirocaches').updateOne(
    {
        $or: [
            { liga_id: String(ligaId) },      // Docs existentes (String)
            { liga_id: ligaObjId }            // Docs novos (ObjectId)
        ],
        time_id: Number(timeId),              // VALIDADO
        temporada: Number(temporadaAnterior)  // VALIDADO
    },
    // ... $set
    // SEM upsert: true (evita criacao de docs fantasmas)
);
```

### Autenticacao
- [x] Rota protegida com middleware `verificarAdmin` (inscricoes-routes.js:498)
- [x] Funcao chamada apenas por admin autenticado

---

## Casos de Teste

### Teste 1: Renovar Participante Credor (Cenario do Bug)
**Setup:**
- Participante time_id=1097804 com extrato 2025 existente (liga_id: String)
- Saldo 2025 = R$ 166,00 (credor)

**Acao:**
1. Acessar Fluxo Financeiro > Participantes > Coluna 2026
2. Clicar no botao de renovacao
3. Escolher "Renovar com credito"
4. Confirmar

**Resultado Esperado:**
- Quitacao adicionada ao documento existente (nao criar novo)
- Temporada 2025 deve mostrar saldo R$ 166,00 (nao zerado)
- NAO deve existir documento duplicado com liga_id: ObjectId

**Verificacao MongoDB:**
```javascript
db.extratofinanceirocaches.find({
    time_id: 1097804,
    temporada: 2025
}).pretty()
// Deve retornar APENAS 1 documento
```

### Teste 2: Renovar Participante Devedor
**Setup:**
- Participante com saldo 2025 negativo (devedor)

**Acao:**
1. Renovar com opcao "Carregar divida para 2026"

**Resultado Esperado:**
- Quitacao registrada com tipo='integral'
- Divida transferida para 2026
- Documento 2025 preservado (nao duplicado)

### Teste 3: Quitacao sem Extrato Existente (Edge Case)
**Setup:**
- Participante novo (sem historico 2025)

**Acao:**
1. Tentar renovar para 2026

**Resultado Esperado:**
- Log de aviso: "Extrato 2025 nao encontrado... Quitacao nao registrada"
- NAO criar documento vazio
- Renovacao procede normalmente (cria apenas inscricao)

### Teste 4: Script de Limpeza (Dry Run)
**Acao:**
```bash
node scripts/fix-extrato-duplicados-liga-id.js --dry-run
```

**Resultado Esperado:**
- Lista documentos duplicados encontrados
- Mostra qual seria mantido (com dados) e qual removido (vazio)
- NAO modifica banco

### Teste 5: Script de Limpeza (Execucao)
**Acao:**
```bash
node scripts/fix-extrato-duplicados-liga-id.js --force
```

**Resultado Esperado:**
- Remove documento vazio
- Migra campo quitacao se necessario
- Documento com dados preservado

---

## Rollback Plan

### Em Caso de Falha na Correcao do Controller

**Passos de Reversao:**
1. Reverter commit com a mudanca:
   ```bash
   git revert [hash-do-commit]
   ```
2. Restart do servidor

**Impacto:** Bug volta a ocorrer em novas renovacoes

### Em Caso de Falha no Script de Limpeza

**Passos de Reversao:**
1. Script so modifica documentos vazios (sem historico)
2. Documentos com dados sao preservados
3. Pior caso: documento vazio removido incorretamente
   - Solucao: Re-executar renovacao para o participante
   - Nao ha perda de dados (documento vazio nao tinha dados)

---

## Checklist de Validacao

### Antes de Implementar
- [x] Arquivo original solicitado e analisado (inscricoesController.js completo)
- [x] Dependencias mapeadas (routes/inscricoes-routes.js)
- [x] Padrao correto identificado (buscarSaldoTemporada, tesouraria-routes)
- [x] Mudancas cirurgicas definidas linha por linha
- [x] Testes planejados
- [x] Rollback documentado

### Apos Implementar
- [ ] Renovar participante afetado (time_id=1097804)
- [ ] Verificar que extrato 2025 mostra dados corretos
- [ ] Executar script de limpeza com --dry-run primeiro
- [ ] Se dry-run OK, executar com --force
- [ ] Confirmar remocao de documento duplicado

---

## Ordem de Execucao (Critico)

1. **Backend primeiro:**
   - Modificar `controllers/inscricoesController.js` (linhas 917-937)

2. **Script de correcao:**
   - Criar `scripts/fix-extrato-duplicados-liga-id.js`
   - Executar com `--dry-run` para validar
   - Executar com `--force` apos validacao

3. **Testes:**
   - Renovar participante de teste
   - Verificar MongoDB (sem duplicados)
   - Verificar UI (dados nao zerados)

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-extrato-2025-zerado-renovacao.md
```

---

**Gerado por:** Spec Protocol v1.0
**Confianca na especificacao:** 100%
**Complexidade:** Baixa (mudanca cirurgica de 20 linhas + script de limpeza)
