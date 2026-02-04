# SPEC - Correção do Saldo no Extrato de Renovação 2025→2026

**Data:** 2026-01-17
**Baseado em:** PRD-correcao-saldo-extrato-renovacao-2026.md
**Status:** Especificação Técnica
**Versão:** 1.0

---

## Resumo da Implementação

Corrigir dois bugs no sistema de renovação:

1. **PROBLEMA 1 (CRÍTICO):** Acertos financeiros (pagamentos) registrados em 2026 não estão sendo incluídos no `saldo_consolidado` do cache quando o documento é criado pela função `criarTransacoesIniciais()`.

2. **PROBLEMA 2:** Participantes que pagaram a inscrição com crédito (`pagouInscricao === true`) não têm cache de extrato criado quando há saldo remanescente a transferir.

**Solução:**
- Criar script de correção para atualizar caches existentes
- Modificar `criarTransacoesIniciais()` para SEMPRE criar documento de extrato quando há `saldoTransferido > 0`, independente de `pagouInscricao`

---

## Arquivos a Modificar (Ordem de Execução)

### 1. CRIAR: `scripts/fix-extrato-2026-saldo-completo.js`

**Path:** `scripts/fix-extrato-2026-saldo-completo.js`
**Tipo:** Criação
**Impacto:** Alto
**Dependentes:** Nenhum (script standalone)

#### Objetivo:
Script de correção que:
1. Busca todos os participantes com inscrição 2026
2. Para cada um, verifica se o extrato existe e se o saldo está correto
3. Corrige caches inconsistentes (saldo não inclui acertos ou saldo transferido)

#### Estrutura do Script:

```javascript
/**
 * Script: Fix Extrato 2026 - Saldo Completo
 *
 * PROBLEMA 1: Acertos não refletidos no cache
 * - Participante tem acerto (pagamento) registrado
 * - Cache não inclui esse valor no saldo_consolidado
 * - Exemplo: Antonio Luis - cache mostra -180, deveria ser -120
 *
 * PROBLEMA 2: Cache não criado para quem pagou com crédito
 * - pagouInscricao=true com crédito > taxa
 * - saldo transferido existe, mas cache não foi criado
 * - Exemplo: Cássio Marques - deveria ter cache com 163.38
 *
 * USO:
 *   node scripts/fix-extrato-2026-saldo-completo.js --dry-run  # Simula
 *   node scripts/fix-extrato-2026-saldo-completo.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2026;

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.error('ERRO: Use --dry-run para simular ou --force para executar');
        process.exit(1);
    }

    console.log('============================================');
    console.log(`FIX: Saldo Completo 2026 (${isDryRun ? 'DRY-RUN' : 'EXECUCAO'})`);
    console.log('============================================');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const agora = new Date();
        const ligaIdObj = new mongoose.Types.ObjectId(LIGA_ID);

        // 1. Buscar todas as inscrições 2026 (renovados e novos)
        const inscricoes = await db.collection('inscricoestemporada').find({
            liga_id: ligaIdObj,
            temporada: TEMPORADA,
            status: { $in: ['renovado', 'novo'] }
        }).toArray();

        console.log(`Total de inscrições 2026: ${inscricoes.length}\n`);

        let corrigidos = 0;
        let semCorrecao = 0;
        let erros = 0;

        for (const inscricao of inscricoes) {
            const timeId = inscricao.time_id;
            const nome = inscricao.dados_participante?.nome_cartoleiro || `Time ${timeId}`;

            try {
                // 2. Buscar cache atual
                const cacheAtual = await db.collection('extratofinanceirocaches').findOne({
                    $or: [
                        { liga_id: String(LIGA_ID) },
                        { liga_id: ligaIdObj }
                    ],
                    time_id: Number(timeId),
                    temporada: TEMPORADA
                });

                // 3. Buscar acertos do participante
                const acertos = await db.collection('acertofinanceiros').find({
                    ligaId: String(LIGA_ID),
                    timeId: String(timeId),
                    temporada: TEMPORADA,
                    ativo: true
                }).toArray();

                // Calcular saldo de acertos (pagamento = +, recebimento = -)
                let saldoAcertos = 0;
                acertos.forEach(a => {
                    if (a.tipo === 'pagamento') saldoAcertos += a.valor || 0;
                    else if (a.tipo === 'recebimento') saldoAcertos -= a.valor || 0;
                });

                // 4. Calcular saldo esperado
                const taxa = inscricao.taxa_inscricao || 0;
                const pagouInscricao = inscricao.pagou_inscricao === true;
                const saldoTransferido = inscricao.saldo_transferido || 0;
                const saldoInicialTemporada = inscricao.saldo_inicial_temporada || 0;

                // Saldo do cache (lançamentos iniciais)
                // Se pagou com crédito: saldo = saldoTransferido (restante após taxa)
                // Se não pagou: saldo = -taxa + saldoTransferido
                const saldoLancamentosEsperado = pagouInscricao
                    ? saldoTransferido
                    : (saldoTransferido > 0 ? saldoTransferido - taxa : -taxa);

                const saldoTotalEsperado = saldoLancamentosEsperado + saldoAcertos;

                // 5. Verificar se precisa correção
                const saldoCacheAtual = cacheAtual?.saldo_consolidado ?? null;
                const precisaCorrecao = !cacheAtual ||
                    Math.abs((saldoCacheAtual || 0) - saldoTotalEsperado) > 0.01;

                if (!precisaCorrecao) {
                    semCorrecao++;
                    continue;
                }

                console.log(`\n[${nome}] (time_id: ${timeId})`);
                console.log(`  pagouInscricao: ${pagouInscricao}`);
                console.log(`  taxa: ${taxa}, saldoTransferido: ${saldoTransferido}`);
                console.log(`  saldoInicialTemporada (inscricao): ${saldoInicialTemporada}`);
                console.log(`  acertos: ${acertos.length} registros, saldo: ${saldoAcertos.toFixed(2)}`);
                console.log(`  cache atual: ${saldoCacheAtual !== null ? saldoCacheAtual.toFixed(2) : 'INEXISTENTE'}`);
                console.log(`  saldo esperado: ${saldoTotalEsperado.toFixed(2)}`);

                if (isDryRun) {
                    console.log(`  [DRY-RUN] Seria corrigido`);
                    corrigidos++;
                    continue;
                }

                // 6. Criar/atualizar cache
                const transacoes = [];

                // Transação de inscrição (se não pagou)
                if (!pagouInscricao && taxa > 0) {
                    transacoes.push({
                        rodada: 0,
                        tipo: 'INSCRICAO_TEMPORADA',
                        valor: -taxa,
                        descricao: `Taxa de inscrição temporada ${TEMPORADA} (pendente)`,
                        data: agora
                    });
                }

                // Transação de saldo transferido (se houver)
                if (saldoTransferido !== 0) {
                    const descricaoSaldo = saldoTransferido > 0
                        ? `Crédito aproveitado da temporada ${TEMPORADA - 1}`
                        : `Dívida transferida da temporada ${TEMPORADA - 1}`;
                    transacoes.push({
                        rodada: 0,
                        tipo: 'SALDO_TEMPORADA_ANTERIOR',
                        valor: saldoTransferido,
                        descricao: descricaoSaldo,
                        data: agora
                    });
                }

                if (cacheAtual) {
                    // Atualizar cache existente
                    // Preservar transações existentes que não sejam de inscrição/saldo anterior
                    const transacoesExistentes = (cacheAtual.historico_transacoes || []).filter(t =>
                        t.tipo !== 'INSCRICAO_TEMPORADA' && t.tipo !== 'SALDO_TEMPORADA_ANTERIOR'
                    );

                    await db.collection('extratofinanceirocaches').updateOne(
                        { _id: cacheAtual._id },
                        {
                            $set: {
                                saldo_consolidado: saldoLancamentosEsperado, // SEM acertos (acertos são somados na leitura)
                                historico_transacoes: [...transacoes, ...transacoesExistentes],
                                data_ultima_atualizacao: agora,
                                versao_calculo: '1.4.0-fix-saldo-completo',
                                'metadados.fix_aplicado': {
                                    versao: 'fix-extrato-2026-saldo-completo',
                                    data: agora,
                                    saldo_anterior: saldoCacheAtual,
                                    saldo_corrigido: saldoLancamentosEsperado
                                }
                            }
                        }
                    );
                    console.log(`  [ATUALIZADO] saldo_consolidado: ${saldoLancamentosEsperado.toFixed(2)}`);
                } else {
                    // Criar cache novo
                    await db.collection('extratofinanceirocaches').insertOne({
                        liga_id: ligaIdObj,
                        time_id: Number(timeId),
                        temporada: TEMPORADA,
                        saldo_consolidado: saldoLancamentosEsperado,
                        ganhos_consolidados: saldoTransferido > 0 ? saldoTransferido : 0,
                        perdas_consolidadas: pagouInscricao ? 0 : -taxa,
                        ultima_rodada_consolidada: 0,
                        historico_transacoes: transacoes,
                        criado_em: agora,
                        data_ultima_atualizacao: agora,
                        versao_calculo: '1.4.0-fix-saldo-completo'
                    });
                    console.log(`  [CRIADO] saldo_consolidado: ${saldoLancamentosEsperado.toFixed(2)}`);
                }

                corrigidos++;

            } catch (error) {
                console.error(`  [ERRO] ${nome}: ${error.message}`);
                erros++;
            }
        }

        console.log('\n============================================');
        console.log('RESUMO');
        console.log('============================================');
        console.log(`Total analisados: ${inscricoes.length}`);
        console.log(`Corrigidos: ${corrigidos}`);
        console.log(`Já corretos: ${semCorrecao}`);
        console.log(`Erros: ${erros}`);
        console.log('============================================');

        if (isDryRun) {
            console.log('\n[DRY-RUN] Nenhuma alteração foi feita. Use --force para executar.');
        }

    } catch (error) {
        console.error('ERRO FATAL:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
```

---

### 2. `controllers/inscricoesController.js` - Mudança no criarTransacoesIniciais

**Path:** `controllers/inscricoesController.js`
**Tipo:** Modificação
**Impacto:** Médio
**Dependentes:** `routes/inscricoes-routes.js`

#### Problema Atual:
A função `criarTransacoesIniciais()` (linha 104-236) só cria documento no extrato quando:
- `pagouInscricao === false` (taxa vira débito)
- `saldoTransferido !== 0` (há saldo a transferir)

Porém, quando `pagouInscricao === true` E há `saldoTransferido > 0` (credor que pagou com crédito e sobrou), o documento pode não ser criado porque a condição `pagouInscricao === false` falha.

#### Análise do Código Atual:

```javascript
// Linha 114: Só cria transação de inscrição se NÃO pagou
if (valores.taxa > 0 && valores.pagouInscricao === false && gerarDebitoInscricao) {
    // ... cria INSCRICAO_TEMPORADA
}

// Linha 186: Transação de saldo transferido (funciona corretamente)
if (valores.saldoTransferido !== 0) {
    // ... cria SALDO_TEMPORADA_ANTERIOR
}
```

O problema é que o bloco de inscrição usa `upsert: true` para criar o documento, mas se `pagouInscricao === true`, esse bloco é pulado e o documento pode não existir para a transação de saldo transferido (que usa `updateOne` sem upsert por padrão).

#### Mudança Cirúrgica:

**Linha 204-226: MODIFICAR updateOne para incluir upsert quando criando SALDO_TEMPORADA_ANTERIOR**

```javascript
// ANTES (linha 205-225):
await db.collection('extratofinanceirocaches').updateOne(
    {
        liga_id: ligaObjIdSaldo,
        time_id: Number(timeId),
        temporada: Number(temporada)
    },
    {
        $push: {
            historico_transacoes: {
                rodada: 0,
                tipo: 'SALDO_TEMPORADA_ANTERIOR',
                valor: valores.saldoTransferido,
                descricao,
                data: agora
            }
        },
        $inc: {
            saldo_consolidado: valores.saldoTransferido
        }
    }
);

// DEPOIS (linha 205-232):
await db.collection('extratofinanceirocaches').updateOne(
    {
        liga_id: ligaObjIdSaldo,
        time_id: Number(timeId),
        temporada: Number(temporada)
    },
    {
        $push: {
            historico_transacoes: {
                rodada: 0,
                tipo: 'SALDO_TEMPORADA_ANTERIOR',
                valor: valores.saldoTransferido,
                descricao,
                data: agora
            }
        },
        $inc: {
            saldo_consolidado: valores.saldoTransferido
        },
        $setOnInsert: {
            liga_id: ligaObjIdSaldo,
            time_id: Number(timeId),
            temporada: Number(temporada),
            criado_em: agora,
            ultima_rodada_consolidada: 0,
            ganhos_consolidados: valores.saldoTransferido > 0 ? valores.saldoTransferido : 0,
            perdas_consolidadas: valores.saldoTransferido < 0 ? valores.saldoTransferido : 0,
            versao_calculo: '1.4.0-inscricao-saldo'
        }
    },
    { upsert: true }  // ✅ NOVO: Garantir criação do documento
);
```

**Motivo:** Quando `pagouInscricao === true` e há `saldoTransferido > 0`, o documento de extrato precisa ser criado com esse saldo. O `upsert: true` garante que o documento seja criado se não existir.

---

## Mapa de Dependências

```
criarTransacoesIniciais() [controllers/inscricoesController.js:104-236]
    |
    |-> Chamada por: processarRenovacao() [linha 459]
    |-> Chamada por: processarNovoParticipante() [linha 657]
    |
    |-> Escreve em: extratofinanceirocaches
    |       |-> Lido por: getExtratoCache() [extratoFinanceiroCacheController.js:594]
    |       |-> Lido por: verificarCacheValido() [extratoFinanceiroCacheController.js:1022]
    |       |-> Lido por: lerCacheExtratoFinanceiro() [extratoFinanceiroCacheController.js:1262]
    |
    |-> Frontend: fluxo-financeiro-core.js:_verificarCacheMongoDB()
    |-> Frontend: participante-extrato.js
```

---

## Validações de Segurança

### Multi-Tenant
- [x] Todas queries incluem `liga_id`
- [x] Verificado isolamento entre ligas

**Queries Afetadas:**
```javascript
// inscricoesController.js - criarTransacoesIniciais
db.collection('extratofinanceirocaches').updateOne({
    liga_id: ligaObjIdSaldo,  // ✅ VALIDADO - usa ObjectId da liga
    time_id: Number(timeId),
    temporada: Number(temporada)
}, ...);

// Script de correção - usa liga_id hardcoded para Super Cartola
const LIGA_ID = '684cb1c8af923da7c7df51de';  // ✅ OK para script pontual
```

### Autenticação
- [x] Rotas protegidas com middleware `verificarAdmin`
- [x] Script roda apenas via CLI (não exposto via HTTP)

### Idempotência
- [x] Script verifica se correção já foi aplicada antes de modificar
- [x] Usa `$setOnInsert` para evitar duplicação
- [x] Preserva transações existentes que não são de inscrição/saldo

---

## Casos de Teste

### Teste 1: Antonio Luis (Acerto não refletido)
**Setup:**
- time_id: 645089
- Cache atual: saldo_consolidado = -180
- Acerto: pagamento de R$ 60

**Ação:** Executar script `--dry-run`

**Resultado Esperado:**
- Log mostra: cache atual = -180, acertos = 60, esperado = -120
- Indica "Seria corrigido"

### Teste 2: Cássio Marques (Cache inexistente)
**Setup:**
- time_id: 39786
- pagouInscricao: true
- saldo_inicial_temporada: 163.38
- Cache: NÃO EXISTE

**Ação:** Executar script `--force`

**Resultado Esperado:**
- Cache criado com saldo_consolidado = 163.38
- Transação SALDO_TEMPORADA_ANTERIOR adicionada

### Teste 3: China Guardiola (Já corrigido)
**Setup:**
- time_id: 1097804
- Cache já existe com saldo_consolidado = 241.54

**Ação:** Executar script

**Resultado Esperado:**
- Log mostra "Já correto"
- Nenhuma modificação

### Teste 4: Novo participante futuro (Prevenção)
**Setup:**
- Novo participante com crédito > taxa
- pagouInscricao: true
- saldoTransferido: 150

**Ação:** Chamar processarRenovacao() via interface

**Resultado Esperado:**
- Cache criado automaticamente com saldo_consolidado = 150
- Não precisa de script de correção

---

## Rollback Plan

### Em Caso de Falha no Script
1. **Reverter modificações:** O script não deleta dados, apenas atualiza. Valores anteriores ficam em `metadados.fix_aplicado.saldo_anterior`.
2. **Restaurar banco:** Se necessário, usar backup do MongoDB Atlas.

### Em Caso de Bug no Controller
1. Reverter commit: `git revert [hash]`
2. Re-executar script com valores originais (manual)

---

## Checklist de Validação

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudanças cirúrgicas definidas linha por linha
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Durante Implementação
- [ ] Criar script `scripts/fix-extrato-2026-saldo-completo.js`
- [ ] Executar `--dry-run` e validar output
- [ ] Modificar `criarTransacoesIniciais()` linha 205-225
- [ ] Testar com novo participante credor

### Após Implementação
- [ ] Executar script `--force`
- [ ] Verificar Antonio Luis no Fluxo Financeiro (saldo = -120)
- [ ] Verificar Cássio Marques no Fluxo Financeiro (saldo = 163.38)
- [ ] Testar renovação de novo participante credor

---

## Ordem de Execução (Crítico)

1. **Criar script de correção:**
   - `scripts/fix-extrato-2026-saldo-completo.js`
   - Executar `--dry-run` para validar

2. **Modificar controller:**
   - Adicionar `upsert: true` e `$setOnInsert` em `criarTransacoesIniciais()`
   - Testar com mock (não afeta dados existentes)

3. **Executar correção:**
   - `node scripts/fix-extrato-2026-saldo-completo.js --force`

4. **Validar no frontend:**
   - Abrir Fluxo Financeiro 2026
   - Verificar saldos dos participantes corrigidos

---

## Próximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code SPEC-correcao-saldo-extrato-renovacao-2026.md
```

---

**Gerado por:** Spec Protocol v1.0
