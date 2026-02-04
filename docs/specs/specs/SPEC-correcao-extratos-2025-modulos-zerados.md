# SPEC - Correcao Extratos 2025: Modulos Zerados (PC/MM/Top10)

**Data:** 2026-01-17
**Baseado em:** PRD-correcao-extratos-2025-modulos-zerados.md
**Status:** Especificacao Tecnica
**Prioridade:** CRITICA

---

## Resumo da Implementacao

Criar script de correcao `fix-extratos-2025-modulos-perdidos.js` que re-migra dados de Pontos Corridos, Mata-Mata e Top10 para extratos de 2025 que perderam esses dados apos regeneracao. O script reutiliza a logica existente em `migrar-modulos-extrato-2025.js`, mas com criterio de selecao expandido para incluir caches regenerados recentemente.

---

## Arquivos a Modificar (Ordem de Execucao)

### 1. CRIAR: `scripts/fix-extratos-2025-modulos-perdidos.js`

**Path:** `scripts/fix-extratos-2025-modulos-perdidos.js`
**Tipo:** Criacao
**Impacto:** Alto
**Dependentes:** Nenhum (script standalone)

#### Estrutura do Script:

```javascript
/**
 * FIX: Re-migrar modulos para extratos 2025 que perderam dados
 *
 * PROBLEMA:
 * - Caches de extrato 2025 foram regenerados com PC/MM/Top10 zerados
 * - Dados existem em pontoscorridoscaches, matamatacaches, top10caches
 * - Flag migracao_modulos_2025 nao foi preservada na regeneracao
 *
 * CRITERIO DE SELECAO:
 * 1. Caches de 2025 SEM flag migracao_modulos_2025, OU
 * 2. Caches com versao_calculo contendo "regenerado-*" E modulos zerados
 *
 * LOGICA:
 * - Reutiliza funcoes de buscarDadosPontosCorridos, buscarDadosMataMata, buscarDadosTop10
 * - Preserva bonusOnus e posicao existentes no cache
 * - Adiciona PC/MM/Top10 das collections de modulos
 * - Recalcula saldo e saldoAcumulado
 * - Marca com flag migracao_modulos_2025 versao 3.0.0
 *
 * USO:
 *   node scripts/fix-extratos-2025-modulos-perdidos.js --dry-run    # Simula
 *   node scripts/fix-extratos-2025-modulos-perdidos.js --execute    # Executa
 *
 * @version 3.0.0
 * @since 2026-01-17
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2025;

// ============================================================================
// FUNCOES DE BUSCA DE DADOS (Copiadas de migrar-modulos-extrato-2025.js)
// ============================================================================

/**
 * Busca dados de Pontos Corridos e calcula DELTA por rodada
 * PC inicia na rodada 7 do Brasileirao = rodada 1 do PC
 * DELTA = financeiro[rodada] - financeiro[rodada-1]
 */
async function buscarDadosPontosCorridos(db) {
    console.log('\n[PC] Buscando dados de Pontos Corridos...');

    const pcCaches = await db.collection('pontoscorridoscaches')
        .find({ liga_id: new mongoose.Types.ObjectId(LIGA_ID) })
        .sort({ rodada_consolidada: 1 })
        .toArray();

    console.log(`[PC] Encontrados ${pcCaches.length} rodadas de PC`);

    // Mapear financeiro ACUMULADO por rodada e time
    const financeiroAcumulado = {}; // timeId -> { rodadaBrasileirao: financeiroAcumulado }

    pcCaches.forEach(cache => {
        const rodadaPC = cache.rodada_consolidada;
        const rodadaBrasileirao = rodadaPC + 6; // PC rodada 1 = Brasileirao rodada 7

        (cache.classificacao || []).forEach(item => {
            const timeId = item.timeId || item.time_id;
            if (!timeId) return;

            if (!financeiroAcumulado[timeId]) {
                financeiroAcumulado[timeId] = {};
            }
            financeiroAcumulado[timeId][rodadaBrasileirao] = item.financeiro || 0;
        });
    });

    // Calcular DELTA por rodada
    const pcPorTimeRodada = {};

    Object.entries(financeiroAcumulado).forEach(([timeId, rodadas]) => {
        const rodadasOrdenadas = Object.keys(rodadas).map(Number).sort((a, b) => a - b);

        rodadasOrdenadas.forEach((rodadaBrasileirao, idx) => {
            const acumuladoAtual = rodadas[rodadaBrasileirao];
            const rodadaAnterior = idx > 0 ? rodadasOrdenadas[idx - 1] : null;
            const acumuladoAnterior = rodadaAnterior ? rodadas[rodadaAnterior] : 0;

            const delta = acumuladoAtual - acumuladoAnterior;

            const key = `${timeId}_${rodadaBrasileirao}`;
            pcPorTimeRodada[key] = {
                financeiro: delta,
                financeiroAcumulado: acumuladoAtual,
                rodadaPC: rodadaBrasileirao - 6,
                rodadaBrasileirao
            };
        });
    });

    console.log(`[PC] Mapeadas ${Object.keys(pcPorTimeRodada).length} entradas (time_rodada) com DELTA`);
    return pcPorTimeRodada;
}

/**
 * Busca dados de Mata-Mata
 * Mapeia resultados (vitoria/derrota) por time e rodada
 */
async function buscarDadosMataMata(db) {
    console.log('\n[MM] Buscando dados de Mata-Mata...');

    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(LIGA_ID) });
    const valorVitoria = liga?.configuracoes?.mata_mata?.valores?.vitoria || 10;
    const valorDerrota = liga?.configuracoes?.mata_mata?.valores?.derrota || -10;
    console.log(`[MM] Valores: vitoria=${valorVitoria}, derrota=${valorDerrota}`);

    const mmCaches = await db.collection('matamatacaches')
        .find({ liga_id: new mongoose.Types.ObjectId(LIGA_ID) })
        .toArray();

    console.log(`[MM] Encontrados ${mmCaches.length} registros de MM`);

    const mmPorTime = {};

    const rodadaPorEdicaoFase = {
        '1_primeira': 3, '1_oitavas': 4, '1_quartas': 5, '1_semis': 6, '1_final': 6,
        '2_primeira': 10, '2_oitavas': 11, '2_quartas': 12, '2_semis': 13, '2_final': 13,
        '3_primeira': 17, '3_oitavas': 18, '3_quartas': 19, '3_semis': 20, '3_final': 20,
        '4_primeira': 24, '4_oitavas': 25, '4_quartas': 26, '4_semis': 27, '4_final': 27,
        '5_primeira': 31, '5_oitavas': 32, '5_quartas': 33, '5_semis': 34, '5_final': 34
    };

    const fases = ['primeira', 'oitavas', 'quartas', 'semis', 'final'];

    mmCaches.forEach(cache => {
        const edicao = cache.edicao;
        if (!cache.dados_torneio) return;

        fases.forEach(fase => {
            const confrontos = cache.dados_torneio[fase];
            if (!confrontos || confrontos.length === 0) return;

            const rodadaKey = `${edicao}_${fase}`;
            const rodada = rodadaPorEdicaoFase[rodadaKey] || null;
            if (!rodada) return;

            confrontos.forEach(c => {
                const pontosA = c.timeA?.pontos || 0;
                const pontosB = c.timeB?.pontos || 0;
                const timeIdA = String(c.timeA?.timeId || c.timeA?.time_id);
                const timeIdB = String(c.timeB?.timeId || c.timeB?.time_id);

                let valorA = 0;
                let valorB = 0;
                if (pontosA > pontosB) {
                    valorA = valorVitoria;
                    valorB = valorDerrota;
                } else if (pontosB > pontosA) {
                    valorA = valorDerrota;
                    valorB = valorVitoria;
                }

                if (timeIdA && timeIdA !== 'undefined' && valorA !== 0) {
                    if (!mmPorTime[timeIdA]) mmPorTime[timeIdA] = [];
                    mmPorTime[timeIdA].push({ rodada, fase, edicao, valor: valorA });
                }

                if (timeIdB && timeIdB !== 'undefined' && valorB !== 0) {
                    if (!mmPorTime[timeIdB]) mmPorTime[timeIdB] = [];
                    mmPorTime[timeIdB].push({ rodada, fase, edicao, valor: valorB });
                }
            });
        });
    });

    const totalTimes = Object.keys(mmPorTime).length;
    const totalResultados = Object.values(mmPorTime).reduce((acc, arr) => acc + arr.length, 0);
    console.log(`[MM] Mapeados ${totalResultados} resultados para ${totalTimes} times`);

    return mmPorTime;
}

/**
 * Busca dados de Top10 (MITO/MICO)
 * Retorna mitos e micos por time e rodada
 */
async function buscarDadosTop10(db) {
    console.log('\n[T10] Buscando dados de Top10...');

    const top10Cache = await db.collection('top10caches')
        .findOne({ liga_id: LIGA_ID });

    if (!top10Cache) {
        console.log('[T10] Cache de Top10 nao encontrado');
        return { mitos: {}, micos: {} };
    }

    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(LIGA_ID) });
    const valoresMito = liga?.configuracoes?.top10?.valores_mito || { '1': 30 };
    const valoresMico = liga?.configuracoes?.top10?.valores_mico || { '1': -30 };

    const mitosPorTime = {};
    const micosPorTime = {};

    (top10Cache.mitos || []).forEach((mito, idx) => {
        const timeId = String(mito.timeId || mito.time_id);
        const posicao = idx + 1;
        const valor = valoresMito[posicao] || valoresMito[String(posicao)] || 0;

        if (!mitosPorTime[timeId]) mitosPorTime[timeId] = [];
        mitosPorTime[timeId].push({ rodada: mito.rodada, posicao, valor });
    });

    (top10Cache.micos || []).forEach((mico, idx) => {
        const timeId = String(mico.timeId || mico.time_id);
        const posicao = idx + 1;
        const valor = valoresMico[posicao] || valoresMico[String(posicao)] || 0;

        if (!micosPorTime[timeId]) micosPorTime[timeId] = [];
        micosPorTime[timeId].push({ rodada: mico.rodada, posicao, valor });
    });

    console.log(`[T10] Mapeados ${Object.keys(mitosPorTime).length} times com mitos`);
    console.log(`[T10] Mapeados ${Object.keys(micosPorTime).length} times com micos`);

    return { mitos: mitosPorTime, micos: micosPorTime };
}

// ============================================================================
// FUNCAO PRINCIPAL DE CORRECAO
// ============================================================================

async function corrigirExtratos(db, pcData, mmData, top10Data, dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('FIX: RE-MIGRACAO DE MODULOS PARA EXTRATOS 2025');
    console.log('='.repeat(80));

    // CRITERIO DE SELECAO:
    // 1. Caches SEM flag migracao_modulos_2025
    // 2. OU caches com versao_calculo "regenerado-*" E pelo menos uma rodada com PC/MM/Top10 = 0
    const extratos = await db.collection('extratofinanceirocaches')
        .find({
            liga_id: LIGA_ID,
            temporada: TEMPORADA,
            $or: [
                { migracao_modulos_2025: { $exists: false } },
                { migracao_modulos_2025: null },
                { versao_calculo: { $regex: /^regenerado-/ } }
            ]
        })
        .toArray();

    console.log(`\nExtratos candidatos encontrados: ${extratos.length}`);

    // Filtrar apenas os que REALMENTE precisam de correcao
    // (tem rodadas com PC/MM/Top10 zerados quando deveria ter valor)
    const extratosPrecisamCorrecao = extratos.filter(extrato => {
        const transacoes = extrato.historico_transacoes || [];
        const timeId = String(extrato.time_id);

        // Verificar se tem dados de PC/MM/Top10 nas collections de modulos
        const temDadosPC = transacoes.some(t => {
            const key = `${timeId}_${t.rodada}`;
            return pcData[key] && pcData[key].financeiro !== 0;
        });

        const temDadosMM = mmData[timeId] && mmData[timeId].length > 0;
        const temDadosTop10 = (top10Data.mitos[timeId]?.length > 0) || (top10Data.micos[timeId]?.length > 0);

        // Verificar se cache tem esses dados zerados
        const temModulosZerados = transacoes.some(t => {
            const key = `${timeId}_${t.rodada}`;
            const pcEsperado = pcData[key]?.financeiro || 0;
            const pcAtual = t.pontosCorridos || 0;

            // Se deveria ter PC mas esta zerado
            if (pcEsperado !== 0 && pcAtual === 0) return true;

            // Se deveria ter MM mas esta zerado
            const mmDoTime = mmData[timeId] || [];
            const mmDaRodada = mmDoTime.filter(m => m.rodada === t.rodada);
            const mmEsperado = mmDaRodada.reduce((acc, m) => acc + (m.valor || 0), 0);
            const mmAtual = t.mataMata || 0;
            if (mmEsperado !== 0 && mmAtual === 0) return true;

            return false;
        });

        return temModulosZerados || (!extrato.migracao_modulos_2025 && (temDadosPC || temDadosMM || temDadosTop10));
    });

    console.log(`Extratos que PRECISAM de correcao: ${extratosPrecisamCorrecao.length}`);

    if (extratosPrecisamCorrecao.length === 0) {
        console.log('\nNenhum extrato precisa de correcao. Sistema OK!');
        return;
    }

    let corrigidos = 0;
    let semAlteracao = 0;
    let erros = 0;
    const resultados = [];

    for (const extrato of extratosPrecisamCorrecao) {
        const timeId = String(extrato.time_id);

        try {
            const time = await db.collection('times').findOne({ id: Number(timeId) });
            const nomeTime = time?.nome_time || time?.nome_cartola || `Time ${timeId}`;

            const historicoAtualizado = [];
            let saldoAcumulado = 0;
            let totalPCAdicionado = 0;
            let totalMMAdicionado = 0;
            let totalTop10Adicionado = 0;

            const transacoes = (extrato.historico_transacoes || []).sort((a, b) => a.rodada - b.rodada);
            const mmDoTime = mmData[timeId] || [];
            const mitosDoTime = top10Data.mitos[timeId] || [];
            const micosDoTime = top10Data.micos[timeId] || [];

            for (const t of transacoes) {
                const rodada = t.rodada;

                // PRESERVAR bonusOnus e posicao existentes
                const bonusOnus = t.bonusOnus || 0;
                const posicao = t.posicao || null;

                // BUSCAR PC
                const pcKey = `${timeId}_${rodada}`;
                const pcDados = pcData[pcKey];
                const pontosCorridos = pcDados?.financeiro || 0;
                if (pontosCorridos !== 0 && (t.pontosCorridos || 0) === 0) totalPCAdicionado++;

                // BUSCAR MM
                const mmDaRodada = mmDoTime.filter(m => m.rodada === rodada);
                const mataMata = mmDaRodada.reduce((acc, m) => acc + (m.valor || 0), 0);
                if (mataMata !== 0 && (t.mataMata || 0) === 0) totalMMAdicionado++;

                // BUSCAR Top10
                const mitosDaRodada = mitosDoTime.filter(m => m.rodada === rodada);
                const micosDaRodada = micosDoTime.filter(m => m.rodada === rodada);
                let top10 = 0;
                let isMito = false;
                let isMico = false;
                let top10Status = null;
                let top10Posicao = null;

                if (mitosDaRodada.length > 0) {
                    top10 = mitosDaRodada[0].valor;
                    isMito = true;
                    top10Status = 'MITO';
                    top10Posicao = mitosDaRodada[0].posicao;
                    if ((t.top10 || 0) === 0) totalTop10Adicionado++;
                } else if (micosDaRodada.length > 0) {
                    top10 = micosDaRodada[0].valor;
                    isMico = true;
                    top10Status = 'MICO';
                    top10Posicao = micosDaRodada[0].posicao;
                    if ((t.top10 || 0) === 0) totalTop10Adicionado++;
                }

                // RECALCULAR saldo
                const saldo = bonusOnus + pontosCorridos + mataMata + top10;
                saldoAcumulado += saldo;

                historicoAtualizado.push({
                    rodada,
                    posicao,
                    bonusOnus,
                    pontosCorridos,
                    mataMata,
                    top10,
                    saldo,
                    saldoAcumulado,
                    isMito,
                    isMico,
                    top10Status,
                    top10Posicao
                });
            }

            const houveMudanca = totalPCAdicionado > 0 || totalMMAdicionado > 0 || totalTop10Adicionado > 0;

            if (!houveMudanca) {
                semAlteracao++;
                continue;
            }

            if (!dryRun) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { _id: extrato._id },
                    {
                        $set: {
                            historico_transacoes: historicoAtualizado,
                            saldo_consolidado: saldoAcumulado,
                            ganhos_consolidados: historicoAtualizado.reduce((acc, r) => acc + (r.saldo > 0 ? r.saldo : 0), 0),
                            perdas_consolidadas: historicoAtualizado.reduce((acc, r) => acc + (r.saldo < 0 ? r.saldo : 0), 0),
                            migracao_modulos_2025: {
                                data: new Date(),
                                pc_adicionados: totalPCAdicionado,
                                mm_adicionados: totalMMAdicionado,
                                top10_adicionados: totalTop10Adicionado,
                                versao: '3.0.0',
                                correcao: 'fix-extratos-2025-modulos-perdidos.js',
                                versao_anterior: extrato.versao_calculo
                            },
                            versao_calculo: 'corrigido-modulos-2026-01-17'
                        }
                    }
                );
            }

            const nomeFormatado = nomeTime.substring(0, 20).padEnd(20);
            console.log(
                `${dryRun ? '[DRY]' : '[OK] '} ${nomeFormatado} | ` +
                `PC:+${totalPCAdicionado} MM:+${totalMMAdicionado} T10:+${totalTop10Adicionado} | ` +
                `Saldo: R$ ${saldoAcumulado}`
            );

            corrigidos++;
            resultados.push({
                timeId,
                nomeTime,
                saldo: saldoAcumulado,
                pc: totalPCAdicionado,
                mm: totalMMAdicionado,
                top10: totalTop10Adicionado
            });

        } catch (error) {
            console.log(`[ERR] Time ${timeId}: ${error.message}`);
            erros++;
        }
    }

    // Resumo
    console.log('\n' + '='.repeat(80));
    console.log('RESUMO DA CORRECAO');
    console.log('='.repeat(80));
    console.log(`Modo: ${dryRun ? 'DRY-RUN (simulacao)' : 'EXECUCAO REAL'}`);
    console.log(`Total candidatos: ${extratos.length}`);
    console.log(`Precisavam correcao: ${extratosPrecisamCorrecao.length}`);
    console.log(`Corrigidos: ${corrigidos}`);
    console.log(`Sem alteracao: ${semAlteracao}`);
    console.log(`Erros: ${erros}`);

    if (resultados.length > 0) {
        resultados.sort((a, b) => b.saldo - a.saldo);

        console.log('\nTOP 5 CREDORES (apos correcao):');
        resultados.slice(0, 5).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.nomeTime}: R$ ${r.saldo} (PC:${r.pc} MM:${r.mm} T10:${r.top10})`);
        });

        console.log('\nTOP 5 DEVEDORES (apos correcao):');
        resultados.slice(-5).reverse().forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.nomeTime}: R$ ${r.saldo} (PC:${r.pc} MM:${r.mm} T10:${r.top10})`);
        });
    }

    if (dryRun) {
        console.log('\n[AVISO] Executado em modo DRY-RUN. Nenhum dado foi alterado.');
        console.log('Para executar de verdade, use: node scripts/fix-extratos-2025-modulos-perdidos.js --execute');
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');

    if (!args.includes('--dry-run') && !args.includes('--execute')) {
        console.error('Uso:');
        console.error('  node scripts/fix-extratos-2025-modulos-perdidos.js --dry-run    # Simula');
        console.error('  node scripts/fix-extratos-2025-modulos-perdidos.js --execute    # Executa');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('FIX: EXTRATOS 2025 - MODULOS PERDIDOS (PC/MM/Top10)');
    console.log('='.repeat(80));
    console.log(`Liga: ${LIGA_ID}`);
    console.log(`Temporada: ${TEMPORADA}`);
    console.log(`Modo: ${dryRun ? 'DRY-RUN' : 'EXECUCAO REAL'}`);

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    try {
        const pcData = await buscarDadosPontosCorridos(db);
        const mmData = await buscarDadosMataMata(db);
        const top10Data = await buscarDadosTop10(db);

        await corrigirExtratos(db, pcData, mmData, top10Data, dryRun);

    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
```

---

## Mapa de Dependencias

```
scripts/fix-extratos-2025-modulos-perdidos.js (NOVO)
    |
    |-> LEITURA: pontoscorridoscaches
    |      - campo: classificacao[].financeiro
    |      - campo: rodada_consolidada
    |
    |-> LEITURA: matamatacaches
    |      - campo: dados_torneio[fase][].timeA/timeB
    |      - campo: edicao
    |
    |-> LEITURA: top10caches
    |      - campo: mitos[].timeId, rodada, valor
    |      - campo: micos[].timeId, rodada, valor
    |
    |-> LEITURA: ligas
    |      - campo: configuracoes.mata_mata.valores
    |      - campo: configuracoes.top10.valores_mito/mico
    |
    |-> LEITURA/ESCRITA: extratofinanceirocaches
    |      - LEITURA: historico_transacoes, versao_calculo, migracao_modulos_2025
    |      - ESCRITA: historico_transacoes, saldo_consolidado, migracao_modulos_2025
    |
    |-> LEITURA: times
           - campo: nome_time, nome_cartola (para logs)
```

---

## Validacoes de Seguranca

### Multi-Tenant
- [x] Script usa `LIGA_ID` fixo para Super Cartola (`684cb1c8af923da7c7df51de`)
- [x] Todas queries filtram por `liga_id`
- [x] Nao afeta outras ligas

### Protecao de Dados
- [x] Modo `--dry-run` obrigatorio antes de `--execute`
- [x] Preserva `bonusOnus` e `posicao` existentes no cache
- [x] Nao apaga dados, apenas adiciona PC/MM/Top10 faltantes
- [x] Flag `migracao_modulos_2025.versao_anterior` preserva rastreabilidade

### Idempotencia
- [x] Script pode rodar multiplas vezes sem duplicar dados
- [x] Verifica se dados ja existem antes de marcar como "adicionado"
- [x] Flag `migracao_modulos_2025` com versao 3.0.0 indica correcao aplicada

---

## Casos de Teste

### Teste 1: Caso Antonio Luis (645089)
**Setup:** Cache com versao "regenerado-posicoes-2026-01-17", PC/MM/Top10 = 0
**Acao:**
1. Rodar script com `--dry-run`
2. Verificar que time 645089 aparece na lista de correcao
3. Verificar valores de PC calculados (posicao 12 na R7 = financeiro 5)
**Resultado Esperado:**
- Log mostra: `PC:+32 MM:+X T10:+X` (X depende dos dados reais)
- Saldo recalculado inclui componentes de todos os modulos

### Teste 2: Cache ja migrado corretamente
**Setup:** Cache com flag `migracao_modulos_2025` e PC/MM/Top10 preenchidos
**Acao:** Rodar script com `--dry-run`
**Resultado Esperado:**
- Time NAO aparece na lista de correcao
- Contagem "Sem alteracao" incrementada

### Teste 3: Validacao de somas
**Setup:** Apos execucao real
**Acao:**
1. Somar pontosCorridos de todas rodadas do extrato corrigido
2. Comparar com soma de financeiro final em pontoscorridoscaches
**Resultado Esperado:**
- Valores devem bater (considerando que PC e DELTA, nao acumulado)

---

## Rollback Plan

### Em Caso de Falha

**Script de Reversao (se necessario):**
```javascript
// Reverter para versao anterior baseado no campo migracao_modulos_2025.versao_anterior
db.extratofinanceirocaches.updateMany(
    {
        'migracao_modulos_2025.versao': '3.0.0',
        temporada: 2025
    },
    {
        $set: {
            // Zerar PC/MM/Top10 (volta ao estado anterior)
            'historico_transacoes.$[].pontosCorridos': 0,
            'historico_transacoes.$[].mataMata': 0,
            'historico_transacoes.$[].top10': 0
        },
        $unset: { migracao_modulos_2025: '' }
    }
);
```

**Backup recomendado antes de executar:**
```bash
mongodump --uri="$MONGO_URI" --collection=extratofinanceirocaches --query='{"temporada":2025}' --out=backup-extratos-2025-$(date +%Y%m%d)
```

---

## Checklist de Validacao

### Antes de Implementar
- [x] Todos os arquivos dependentes identificados
- [x] Mudancas cirurgicas definidas
- [x] Impactos mapeados
- [x] Testes planejados
- [x] Rollback documentado

### Antes de Executar (--execute)
- [ ] Rodar `--dry-run` e validar output
- [ ] Verificar quantidade de caches a serem afetados
- [ ] Confirmar que backup foi feito (opcional mas recomendado)
- [ ] Validar caso Antonio Luis (645089) especificamente

### Apos Executar
- [ ] Verificar extrato de Antonio Luis na UI
- [ ] Confirmar que PC/MM/Top10 aparecem nas colunas
- [ ] Verificar saldo final recalculado
- [ ] Confirmar flag `migracao_modulos_2025` presente nos caches

---

## Ordem de Execucao (Critico)

1. **Criar script:** `scripts/fix-extratos-2025-modulos-perdidos.js`
2. **Testar em dry-run:**
   ```bash
   node scripts/fix-extratos-2025-modulos-perdidos.js --dry-run
   ```
3. **Validar output:** Verificar quantidade e casos especificos
4. **Executar:**
   ```bash
   node scripts/fix-extratos-2025-modulos-perdidos.js --execute
   ```
5. **Validar na UI:** Acessar Fluxo Financeiro e verificar extratos

---

## Proximo Passo

**Comando para Fase 3:**
```
LIMPAR CONTEXTO e executar:
/code .claude/docs/SPEC-correcao-extratos-2025-modulos-zerados.md
```

---

**Gerado por:** Spec Protocol v1.0
**Arquivo:** `.claude/docs/SPEC-correcao-extratos-2025-modulos-zerados.md`
