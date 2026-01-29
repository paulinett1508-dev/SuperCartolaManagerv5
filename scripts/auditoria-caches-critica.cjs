/**
 * AUDITORIA CRITICA DE CACHES FINANCEIROS
 *
 * Este script identifica:
 * 1. Caches duplicados (mesmo time_id + liga_id + temporada)
 * 2. Divergencias de saldo entre caches
 * 3. Participantes em risco de cobranca incorreta
 *
 * USO:
 *   node scripts/auditoria-caches-critica.js
 *   node scripts/auditoria-caches-critica.js --fix  (para corrigir)
 *
 * @version 1.0.0
 * @since 2026-01-05
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const FIX_MODE = process.argv.includes('--fix');
const VERBOSE = process.argv.includes('--verbose');

async function conectar() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI nao definido');
        process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('Conectado ao MongoDB');
    return mongoose.connection.db;
}

async function auditarCaches(db) {
    console.log('\n' + '='.repeat(70));
    console.log('AUDITORIA CRITICA DE CACHES FINANCEIROS');
    console.log('='.repeat(70));
    console.log(`Data: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`Modo: ${FIX_MODE ? 'CORRECAO' : 'SOMENTE LEITURA'}`);
    console.log('='.repeat(70));

    // 1. Buscar TODOS os caches
    const caches = await db.collection('extratofinanceirocaches').find({}).toArray();
    console.log(`\nTotal de registros em extratofinanceirocaches: ${caches.length}`);

    // 2. Agrupar por chave unica (time_id + liga_id + temporada)
    const grupos = {};
    for (const cache of caches) {
        const chave = `${cache.time_id}|${cache.liga_id}|${cache.temporada || 2026}`;
        if (!grupos[chave]) {
            grupos[chave] = [];
        }
        grupos[chave].push(cache);
    }

    // 3. Identificar duplicados e divergencias
    const duplicados = [];
    const divergencias = [];
    let totalParticipantes = Object.keys(grupos).length;

    for (const [chave, registros] of Object.entries(grupos)) {
        if (registros.length > 1) {
            // Ordenar por data de atualizacao (mais recente primeiro)
            registros.sort((a, b) => {
                const dataA = new Date(a.updatedAt || a.createdAt || 0);
                const dataB = new Date(b.updatedAt || b.createdAt || 0);
                return dataB - dataA;
            });

            const maisRecente = registros[0];
            const antigos = registros.slice(1);

            // Verificar se ha divergencia de saldo
            const saldoRecente = maisRecente.saldo_consolidado || 0;
            const divergentesEncontrados = antigos.filter(r =>
                (r.saldo_consolidado || 0) !== saldoRecente
            );

            duplicados.push({
                chave,
                time_id: maisRecente.time_id,
                liga_id: maisRecente.liga_id,
                temporada: maisRecente.temporada,
                totalRegistros: registros.length,
                maisRecente: {
                    _id: maisRecente._id,
                    saldo: saldoRecente,
                    atualizado: maisRecente.updatedAt || maisRecente.createdAt
                },
                antigos: antigos.map(r => ({
                    _id: r._id,
                    saldo: r.saldo_consolidado || 0,
                    atualizado: r.updatedAt || r.createdAt
                }))
            });

            if (divergentesEncontrados.length > 0) {
                divergencias.push({
                    chave,
                    time_id: maisRecente.time_id,
                    saldoCorreto: saldoRecente,
                    saldosErrados: divergentesEncontrados.map(r => r.saldo_consolidado || 0),
                    diferenca: divergentesEncontrados.map(r =>
                        Math.abs(saldoRecente - (r.saldo_consolidado || 0))
                    )
                });
            }
        }
    }

    // 4. Relatorio
    console.log('\n' + '-'.repeat(70));
    console.log('RESUMO');
    console.log('-'.repeat(70));
    console.log(`Participantes unicos: ${totalParticipantes}`);
    console.log(`Participantes com CACHES DUPLICADOS: ${duplicados.length}`);
    console.log(`Participantes com DIVERGENCIA DE SALDO: ${divergencias.length}`);

    if (duplicados.length > 0) {
        console.log('\n' + '-'.repeat(70));
        console.log('CACHES DUPLICADOS (RISCO DE COBRANCA INCORRETA)');
        console.log('-'.repeat(70));

        for (const dup of duplicados) {
            console.log(`\nTime ID: ${dup.time_id}`);
            console.log(`Liga: ${dup.liga_id}`);
            console.log(`Temporada: ${dup.temporada}`);
            console.log(`Total de registros: ${dup.totalRegistros}`);
            console.log(`Cache mais recente:`);
            console.log(`  ID: ${dup.maisRecente._id}`);
            console.log(`  Saldo: R$ ${dup.maisRecente.saldo.toFixed(2)}`);
            console.log(`  Atualizado: ${new Date(dup.maisRecente.atualizado).toLocaleString('pt-BR')}`);
            console.log(`Caches antigos (a remover):`);
            for (const antigo of dup.antigos) {
                const diff = dup.maisRecente.saldo - antigo.saldo;
                const alerta = diff !== 0 ? ` [DIVERGENCIA: ${diff > 0 ? '+' : ''}R$ ${diff.toFixed(2)}]` : '';
                console.log(`  ID: ${antigo._id} | Saldo: R$ ${antigo.saldo.toFixed(2)}${alerta}`);
            }
        }
    }

    if (divergencias.length > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('!!! ALERTA CRITICO: DIVERGENCIAS DE SALDO !!!');
        console.log('='.repeat(70));
        console.log('Estes participantes podem ter sido cobrados com valor ERRADO:\n');

        for (const div of divergencias) {
            console.log(`Time ID: ${div.time_id}`);
            console.log(`  Saldo CORRETO: R$ ${div.saldoCorreto.toFixed(2)}`);
            console.log(`  Saldos ERRADOS exibidos: ${div.saldosErrados.map(s => `R$ ${s.toFixed(2)}`).join(', ')}`);
            console.log(`  Diferenca: ${div.diferenca.map(d => `R$ ${d.toFixed(2)}`).join(', ')}`);
            console.log('');
        }
    }

    // 5. Buscar nomes dos participantes afetados
    if (duplicados.length > 0) {
        console.log('\n' + '-'.repeat(70));
        console.log('PARTICIPANTES AFETADOS (com nomes)');
        console.log('-'.repeat(70));

        const ligas = await db.collection('ligas').find({}).toArray();

        for (const dup of duplicados) {
            const liga = ligas.find(l => l._id.toString() === dup.liga_id);
            let nomeParticipante = 'Desconhecido';
            let nomeTime = '';

            if (liga && liga.participantes) {
                const part = liga.participantes.find(p => p.time_id === dup.time_id);
                if (part) {
                    nomeParticipante = part.nome_cartola || part.nome_time || 'Sem nome';
                    nomeTime = part.nome_time || '';
                }
            }

            const temDivergencia = dup.antigos.some(a => a.saldo !== dup.maisRecente.saldo);
            const icone = temDivergencia ? '!!!' : '   ';

            console.log(`${icone} ${nomeParticipante} (${nomeTime})`);
            console.log(`    Liga: ${liga?.nome || dup.liga_id}`);
            console.log(`    Saldo correto: R$ ${dup.maisRecente.saldo.toFixed(2)}`);
            if (temDivergencia) {
                const saldosErrados = dup.antigos.filter(a => a.saldo !== dup.maisRecente.saldo);
                console.log(`    Saldos ERRADOS: ${saldosErrados.map(a => `R$ ${a.saldo.toFixed(2)}`).join(', ')}`);
            }
            console.log('');
        }
    }

    // 6. Correcao (se --fix)
    if (FIX_MODE && duplicados.length > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('EXECUTANDO CORRECAO');
        console.log('='.repeat(70));

        let removidos = 0;
        for (const dup of duplicados) {
            const idsParaRemover = dup.antigos.map(a => a._id);

            if (VERBOSE) {
                console.log(`Removendo ${idsParaRemover.length} caches antigos do time ${dup.time_id}...`);
            }

            const result = await db.collection('extratofinanceirocaches').deleteMany({
                _id: { $in: idsParaRemover }
            });

            removidos += result.deletedCount;
        }

        console.log(`\nTotal de caches antigos removidos: ${removidos}`);
        console.log('Correcao concluida!');
    } else if (duplicados.length > 0) {
        console.log('\n' + '-'.repeat(70));
        console.log('ACAO RECOMENDADA');
        console.log('-'.repeat(70));
        console.log('Execute com --fix para remover caches duplicados:');
        console.log('  node scripts/auditoria-caches-critica.js --fix');
        console.log('\nATENCAO: Antes de corrigir, valide os saldos corretos!');
    }

    return { duplicados, divergencias };
}

async function main() {
    try {
        const db = await conectar();
        const resultado = await auditarCaches(db);

        console.log('\n' + '='.repeat(70));
        console.log('FIM DA AUDITORIA');
        console.log('='.repeat(70));

        if (resultado.divergencias.length > 0) {
            console.log('\n!!! ACAO URGENTE NECESSARIA !!!');
            console.log(`${resultado.divergencias.length} participantes podem ter pago valor ERRADO.`);
            console.log('Revise manualmente antes de qualquer correcao automatica.');
        }

        await mongoose.disconnect();
        process.exit(resultado.divergencias.length > 0 ? 1 : 0);
    } catch (error) {
        console.error('Erro na auditoria:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

main();
