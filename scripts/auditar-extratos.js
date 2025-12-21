/**
 * AUDITAR-EXTRATOS.js - Auditoria Completa de Extratos Financeiros
 *
 * Verifica:
 * 1. Todas as 38 rodadas presentes no cache
 * 2. Saldo consolidado = soma de todas as transações
 * 3. SaldoAcumulado calculado progressivamente
 * 4. Comparação com collection rodadas
 * 5. Pontos Corridos calculados corretamente
 * 6. Top10 (Mitos/Micos) incluídos
 * 7. Mata-Mata incluído
 *
 * Uso:
 *   node scripts/auditar-extratos.js
 *   node scripts/auditar-extratos.js --detalhado
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de';
const RODADA_FINAL = 38;

// Cores para output
const CORES = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function cor(texto, cor) {
    return `${CORES[cor]}${texto}${CORES.reset}`;
}

async function main() {
    const args = process.argv.slice(2);
    const detalhado = args.includes('--detalhado') || args.includes('-d');

    console.log(cor('═══════════════════════════════════════════════════════════════', 'cyan'));
    console.log(cor('           AUDITORIA COMPLETA DE EXTRATOS FINANCEIROS          ', 'cyan'));
    console.log(cor('═══════════════════════════════════════════════════════════════', 'cyan'));
    console.log(`Modo: ${detalhado ? 'DETALHADO' : 'RESUMIDO'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const ObjectId = mongoose.Types.ObjectId;

        console.log(cor('✅ Conectado ao MongoDB\n', 'green'));

        // Buscar liga
        const liga = await db.collection('ligas').findOne({ _id: new ObjectId(LIGA_ID) });
        if (!liga) {
            console.error(cor('❌ Liga não encontrada', 'red'));
            return;
        }

        console.log(`Liga: ${cor(liga.nome, 'cyan')}`);
        console.log(`Participantes: ${liga.participantes?.length || 0}`);
        console.log(`Rodada Final: ${RODADA_FINAL}\n`);

        // Estatísticas gerais
        const stats = {
            total: 0,
            ok: 0,
            erros: 0,
            semCache: 0,
            rodadasIncompletas: 0,
            saldoErrado: 0,
            acumuladoErrado: 0,
            semTop10: 0,
            semMataMata: 0,
            semPontosCorridos: 0,
        };

        const problemas = [];

        // Buscar configuração de ranking
        const configRanking = liga.configuracoes?.ranking_rodada?.valores || {};
        const modulosAtivos = liga.modulos_ativos || {};

        console.log(cor('─────────────────────────────────────────────────────────────────', 'blue'));
        console.log(cor('                    VERIFICANDO PARTICIPANTES                    ', 'blue'));
        console.log(cor('─────────────────────────────────────────────────────────────────', 'blue'));

        for (const participante of liga.participantes) {
            const timeId = participante.time_id;
            const nome = participante.nome_cartola;
            stats.total++;

            // Buscar cache
            const cache = await db.collection('extratofinanceirocaches').findOne({
                liga_id: new ObjectId(LIGA_ID),
                time_id: timeId
            });

            if (!cache) {
                stats.semCache++;
                problemas.push({ timeId, nome, tipo: 'SEM_CACHE', desc: 'Sem cache de extrato' });
                console.log(`${cor('❌', 'red')} ${nome} (${timeId}): ${cor('SEM CACHE', 'red')}`);
                continue;
            }

            const transacoes = cache.historico_transacoes || [];
            const rodadasNoCache = [...new Set(transacoes.map(t => t.rodada))].sort((a, b) => a - b);
            const errosParticipante = [];

            // 1. Verificar se tem todas as 38 rodadas
            if (rodadasNoCache.length < RODADA_FINAL) {
                const faltando = [];
                for (let r = 1; r <= RODADA_FINAL; r++) {
                    if (!rodadasNoCache.includes(r)) faltando.push(r);
                }
                stats.rodadasIncompletas++;
                errosParticipante.push(`Faltam rodadas: ${faltando.join(', ')}`);
            }

            // 2. Verificar saldo consolidado
            const saldoCalculado = transacoes.reduce((acc, t) => acc + (parseFloat(t.saldo) || 0), 0);
            const saldoCache = cache.saldo_consolidado || 0;
            const diffSaldo = Math.abs(saldoCalculado - saldoCache);

            if (diffSaldo > 0.01) {
                stats.saldoErrado++;
                errosParticipante.push(`Saldo errado: cache=${saldoCache.toFixed(2)}, calculado=${saldoCalculado.toFixed(2)}`);
            }

            // 3. Verificar saldoAcumulado progressivo
            let acumuladoEsperado = 0;
            let acumuladoOk = true;
            const transacoesOrdenadas = [...transacoes].sort((a, b) => a.rodada - b.rodada);

            for (const t of transacoesOrdenadas) {
                acumuladoEsperado += parseFloat(t.saldo) || 0;
                const diffAcum = Math.abs((t.saldoAcumulado || 0) - acumuladoEsperado);
                if (diffAcum > 0.01) {
                    acumuladoOk = false;
                    break;
                }
            }

            if (!acumuladoOk) {
                stats.acumuladoErrado++;
                errosParticipante.push('SaldoAcumulado progressivo incorreto');
            }

            // 4. Verificar Top10 (se módulo ativo)
            if (modulosAtivos.top10 !== false) {
                const temTop10 = transacoes.some(t => (t.top10 || 0) !== 0 || t.isMito || t.isMico);
                if (!temTop10) {
                    stats.semTop10++;
                    errosParticipante.push('Sem transações Top10 (Mito/Mico)');
                }
            }

            // 5. Verificar Mata-Mata (se módulo ativo)
            if (modulosAtivos.mataMata !== false) {
                const temMM = transacoes.some(t => (t.mataMata || 0) !== 0);
                if (!temMM) {
                    stats.semMataMata++;
                    errosParticipante.push('Sem transações Mata-Mata');
                }
            }

            // 6. Verificar Pontos Corridos (se módulo ativo)
            if (modulosAtivos.pontosCorridos !== false) {
                const temPC = transacoes.some(t => (t.pontosCorridos || 0) !== 0);
                if (!temPC) {
                    stats.semPontosCorridos++;
                    errosParticipante.push('Sem transações Pontos Corridos');
                }
            }

            // 7. Comparar com collection rodadas
            const rodadasDB = await db.collection('rodadas').find({
                $or: [
                    { ligaId: LIGA_ID, timeId: timeId },
                    { ligaId: new ObjectId(LIGA_ID), timeId: timeId }
                ]
            }).toArray();

            if (rodadasDB.length !== rodadasNoCache.length) {
                errosParticipante.push(`Rodadas DB (${rodadasDB.length}) != Cache (${rodadasNoCache.length})`);
            }

            // Resultado do participante
            if (errosParticipante.length === 0) {
                stats.ok++;
                if (detalhado) {
                    console.log(`${cor('✅', 'green')} ${nome}: OK (${rodadasNoCache.length} rodadas, saldo: ${saldoCache.toFixed(2)})`);
                }
            } else {
                stats.erros++;
                problemas.push({ timeId, nome, tipo: 'ERROS', erros: errosParticipante });
                console.log(`${cor('❌', 'red')} ${nome} (${timeId}):`);
                errosParticipante.forEach(e => console.log(`   - ${e}`));
            }
        }

        // Resumo final
        console.log(cor('\n═══════════════════════════════════════════════════════════════', 'cyan'));
        console.log(cor('                         RESUMO DA AUDITORIA                    ', 'cyan'));
        console.log(cor('═══════════════════════════════════════════════════════════════', 'cyan'));

        console.log(`\nTotal de participantes: ${stats.total}`);
        console.log(`${cor('✅ OK:', 'green')} ${stats.ok}`);
        console.log(`${cor('❌ Com problemas:', 'red')} ${stats.erros}`);
        console.log(`${cor('⚠️  Sem cache:', 'yellow')} ${stats.semCache}`);

        console.log(cor('\n─── Detalhamento de Problemas ───', 'blue'));
        console.log(`Rodadas incompletas: ${stats.rodadasIncompletas}`);
        console.log(`Saldo consolidado errado: ${stats.saldoErrado}`);
        console.log(`SaldoAcumulado errado: ${stats.acumuladoErrado}`);
        console.log(`Sem Top10: ${stats.semTop10}`);
        console.log(`Sem Mata-Mata: ${stats.semMataMata}`);
        console.log(`Sem Pontos Corridos: ${stats.semPontosCorridos}`);

        // Verificação de acertos financeiros
        console.log(cor('\n─── Verificando Acertos Financeiros ───', 'blue'));

        const acertos = await db.collection('acertofinanceiros').find({
            ligaId: LIGA_ID,
            ativo: true
        }).toArray();

        console.log(`Total de acertos: ${acertos.length}`);

        const acertosPorTipo = {};
        acertos.forEach(a => {
            acertosPorTipo[a.tipo] = (acertosPorTipo[a.tipo] || 0) + 1;
        });
        Object.entries(acertosPorTipo).forEach(([tipo, count]) => {
            console.log(`  - ${tipo}: ${count}`);
        });

        // Status final
        console.log(cor('\n═══════════════════════════════════════════════════════════════', 'cyan'));
        if (stats.erros === 0 && stats.semCache === 0) {
            console.log(cor('✅ TODOS OS EXTRATOS ESTÃO CORRETOS!', 'green'));
        } else {
            console.log(cor(`⚠️  ${stats.erros + stats.semCache} PARTICIPANTES COM PROBLEMAS`, 'yellow'));
        }
        console.log(cor('═══════════════════════════════════════════════════════════════', 'cyan'));

    } catch (error) {
        console.error(cor(`❌ Erro: ${error.message}`, 'red'));
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado do MongoDB');
    }
}

main();
