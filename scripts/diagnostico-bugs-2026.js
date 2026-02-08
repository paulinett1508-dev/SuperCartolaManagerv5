/**
 * DIAGNÓSTICO COMPLETO - Bugs Financeiros Temporada 2026
 * Liga Super Cartola (684cb1c8af923da7c7df51de)
 *
 * BUG 1: INSCRICAO_TEMPORADA ausente no historico_transacoes do cache
 * BUG 2: Pontos Corridos da R2 ausente no cache
 * BUG 3: Breakdown zerado (bonusOnus=0 mas valor preenchido)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function diagnosticar() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        const ligaId = '684cb1c8af923da7c7df51de';

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🔍 DIAGNÓSTICO COMPLETO - BUGS FINANCEIROS 2026');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // 1. Buscar todos os caches 2026
        const caches2026 = await db.collection('extratofinanceirocaches').find({
            liga_id: ligaId,
            temporada: 2026
        }).toArray();

        console.log(`📊 Total de caches 2026: ${caches2026.length}\n`);

        // 2. Buscar todas as inscrições 2026
        const inscricoes2026 = await db.collection('inscricoestemporada').find({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            temporada: 2026
        }).toArray();

        console.log(`📊 Total de inscrições 2026: ${inscricoes2026.length}\n`);

        // 3. Buscar liga para nomes
        const liga = await db.collection('ligas').findOne({
            _id: new mongoose.Types.ObjectId(ligaId)
        });
        const participantesMap = {};
        (liga.participantes || []).forEach(p => {
            participantesMap[p.time_id] = p.nome_cartola;
        });

        // 4. Buscar dados de Pontos Corridos para verificar se R2 foi consolidada
        const pcCache = await db.collection('pontoscorridoscaches').findOne({
            liga_id: ligaId,
            temporada: 2026
        });
        console.log('▓▓▓ PONTOS CORRIDOS CACHE 2026 ▓▓▓');
        if (pcCache) {
            console.log('  Existe: SIM');
            console.log('  Rodada atual:', pcCache.rodada_atual || pcCache.ultima_rodada || 'N/A');
            const confrontos = pcCache.confrontos || pcCache.historico || [];
            console.log('  Total confrontos:', confrontos.length);
            // Verificar se tem confrontos da R2
            const confrontosR2 = confrontos.filter(c => c.rodada === 2);
            console.log('  Confrontos R2:', confrontosR2.length);
            if (confrontosR2.length > 0) {
                console.log('  Exemplo R2:', JSON.stringify(confrontosR2[0]));
            }
        } else {
            console.log('  ❌ Não existe cache de Pontos Corridos para 2026');
        }
        console.log('');

        // 5. Buscar dados de Mata-Mata para R2
        const mmCache = await db.collection('matamataconfigs').findOne({
            liga_id: ligaId,
            temporada: 2026
        });
        console.log('▓▓▓ MATA-MATA CONFIG 2026 ▓▓▓');
        if (mmCache) {
            console.log('  Existe: SIM');
            console.log('  Edições:', mmCache.edicoes?.length || 0);
        } else {
            console.log('  Nenhuma config de mata-mata para 2026');
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════
        // BUG 1: INSCRICAO_TEMPORADA ausente no cache
        // ═══════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🐛 BUG 1: INSCRICAO_TEMPORADA no cache');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const semInscricaoNoCache = [];
        const comInscricaoNoCache = [];
        const semCacheMasComInscricao = [];

        for (const inscricao of inscricoes2026) {
            const timeId = inscricao.time_id;
            const nome = participantesMap[timeId] || `ID:${timeId}`;
            const cache = caches2026.find(c => c.time_id === timeId);

            if (!cache) {
                semCacheMasComInscricao.push({
                    timeId,
                    nome,
                    taxa: inscricao.taxa_inscricao,
                    pagou: inscricao.pagou_inscricao,
                    status: inscricao.status
                });
                continue;
            }

            const transacoes = cache.historico_transacoes || [];
            const temInscricao = transacoes.some(t => t.tipo === 'INSCRICAO_TEMPORADA');

            if (temInscricao) {
                comInscricaoNoCache.push({ timeId, nome });
            } else {
                semInscricaoNoCache.push({
                    timeId,
                    nome,
                    taxa: inscricao.taxa_inscricao,
                    pagou: inscricao.pagou_inscricao,
                    saldoCache: cache.saldo_consolidado,
                    totalTransacoes: transacoes.length
                });
            }
        }

        console.log(`✅ Com INSCRICAO_TEMPORADA no cache: ${comInscricaoNoCache.length}`);
        comInscricaoNoCache.forEach(p => {
            console.log(`   ${p.nome} (${p.timeId})`);
        });
        console.log('');

        console.log(`❌ SEM INSCRICAO_TEMPORADA no cache: ${semInscricaoNoCache.length}`);
        semInscricaoNoCache.forEach(p => {
            console.log(`   ${p.nome} (${p.timeId}) | taxa=${p.taxa} pagou=${p.pagou} | cache_saldo=${p.saldoCache} transacoes=${p.totalTransacoes}`);
        });
        console.log('');

        console.log(`⚠️  Com inscrição mas SEM cache 2026: ${semCacheMasComInscricao.length}`);
        semCacheMasComInscricao.forEach(p => {
            console.log(`   ${p.nome} (${p.timeId}) | taxa=${p.taxa} pagou=${p.pagou} status=${p.status}`);
        });
        console.log('');

        // ═══════════════════════════════════════════════════════════
        // BUG 2: PC da R2 ausente
        // ═══════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🐛 BUG 2: PONTOS CORRIDOS por rodada no cache');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const analiseRodadas = [];

        for (const cache of caches2026) {
            const timeId = cache.time_id;
            const nome = participantesMap[timeId] || `ID:${timeId}`;
            const transacoes = cache.historico_transacoes || [];

            // Agrupar por rodada
            const rodadasMap = {};
            transacoes.forEach(t => {
                if (!t.rodada || t.rodada === 0) return;
                if (!rodadasMap[t.rodada]) {
                    rodadasMap[t.rodada] = { tipos: [], valores: {} };
                }
                rodadasMap[t.rodada].tipos.push(t.tipo);
                rodadasMap[t.rodada].valores[t.tipo] = t.valor;
            });

            const rodadas = Object.keys(rodadasMap).map(Number).sort((a, b) => a - b);

            for (const rod of rodadas) {
                const info = rodadasMap[rod];
                const temPC = info.tipos.includes('PONTOS_CORRIDOS');
                const temBanco = info.tipos.includes('BONUS') || info.tipos.includes('ONUS') || info.tipos.includes('BANCO_RODADA');
                const temMM = info.tipos.includes('MATA_MATA');

                analiseRodadas.push({
                    timeId,
                    nome,
                    rodada: rod,
                    temBanco,
                    temPC,
                    temMM,
                    tipos: info.tipos.join(', '),
                    valores: info.valores
                });
            }
        }

        // Resumo por rodada
        const rodadasExistentes = [...new Set(analiseRodadas.map(a => a.rodada))].sort((a, b) => a - b);

        for (const rod of rodadasExistentes) {
            const dados = analiseRodadas.filter(a => a.rodada === rod);
            const comPC = dados.filter(d => d.temPC);
            const semPC = dados.filter(d => !d.temPC);
            const comBanco = dados.filter(d => d.temBanco);
            const comMM = dados.filter(d => d.temMM);

            console.log(`📋 RODADA ${rod}:`);
            console.log(`   Total participantes: ${dados.length}`);
            console.log(`   Com Banco (B/O): ${comBanco.length}`);
            console.log(`   Com PC: ${comPC.length}`);
            console.log(`   SEM PC: ${semPC.length}`);
            console.log(`   Com MM: ${comMM.length}`);

            if (semPC.length > 0 && semPC.length <= 10) {
                semPC.forEach(p => {
                    console.log(`   ❌ SEM PC: ${p.nome} (${p.timeId}) | tipos: ${p.tipos}`);
                });
            } else if (semPC.length > 10) {
                console.log(`   ❌ TODOS SEM PC (${semPC.length} participantes)`);
                // Mostrar primeiros 5
                semPC.slice(0, 5).forEach(p => {
                    console.log(`      ex: ${p.nome} (${p.timeId}) | tipos: ${p.tipos}`);
                });
            }
            console.log('');
        }

        // ═══════════════════════════════════════════════════════════
        // BUG 3: Breakdown zerado
        // ═══════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🐛 BUG 3: BREAKDOWN zerado (bonusOnus=0 mas valor preenchido)');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        let totalTransacoes = 0;
        let breakdownZerado = 0;
        let breakdownCorreto = 0;

        for (const cache of caches2026) {
            const transacoes = cache.historico_transacoes || [];
            transacoes.forEach(t => {
                if (!t.rodada || t.rodada === 0) return;
                totalTransacoes++;

                const temBreakdown = (t.bonusOnus !== 0) || (t.pontosCorridos !== 0) || (t.mataMata !== 0) || (t.top10 !== 0);
                const temValor = t.valor !== 0 && t.valor !== undefined;

                if (temValor && !temBreakdown) {
                    breakdownZerado++;
                } else if (temBreakdown) {
                    breakdownCorreto++;
                }
            });
        }

        console.log(`Total transações de rodada: ${totalTransacoes}`);
        console.log(`Com breakdown preenchido: ${breakdownCorreto}`);
        console.log(`Com breakdown ZERADO (usa campo valor): ${breakdownZerado}`);
        console.log(`Percentual zerado: ${totalTransacoes > 0 ? ((breakdownZerado/totalTransacoes)*100).toFixed(1) : 0}%`);
        console.log('');

        // ═══════════════════════════════════════════════════════════
        // Verificar LigaRules para PC
        // ═══════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('⚙️  CONFIGURAÇÃO PONTOS CORRIDOS 2026');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const ligarules = await db.collection('ligarules').findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            temporada: 2026
        });

        if (ligarules) {
            console.log('  taxaInscricao:', ligarules.taxa_inscricao || ligarules.taxaInscricao);
            const pc = ligarules.pontos_corridos || ligarules.pontosCorridos || {};
            console.log('  PC config:', JSON.stringify(pc));
            console.log('  PC rodada_inicio:', pc.rodada_inicio || pc.rodadaInicio || 'N/A');
        } else {
            // Buscar ligarules sem filtro de temporada
            const allRules = await db.collection('ligarules').find({
                liga_id: new mongoose.Types.ObjectId(ligaId)
            }).toArray();
            console.log('  Nenhuma ligarules com temporada 2026');
            console.log('  Total ligarules para esta liga:', allRules.length);
            if (allRules.length > 0) {
                allRules.forEach(r => {
                    console.log('    temporada:', r.temporada, '| taxa:', r.taxa_inscricao || r.taxaInscricao);
                    const pc = r.pontos_corridos || r.pontosCorridos || {};
                    console.log('    PC rodada_inicio:', pc.rodada_inicio || pc.rodadaInicio || 'N/A');
                });
            }
        }
        console.log('');

        // Verificar ModuleConfig
        const moduleConfig = await db.collection('moduleconfigs').findOne({
            liga_id: ligaId,
            temporada: 2026
        });
        if (!moduleConfig) {
            const moduleConfig2 = await db.collection('moduleconfigs').findOne({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                temporada: 2026
            });
            if (moduleConfig2) {
                console.log('  ModuleConfig 2026: EXISTE (ObjectId)');
                const pcConfig = moduleConfig2.pontos_corridos || moduleConfig2.pontosCorridos || {};
                console.log('  PC Config:', JSON.stringify(pcConfig));
            } else {
                console.log('  ModuleConfig 2026: NÃO ENCONTRADO');
            }
        } else {
            console.log('  ModuleConfig 2026: EXISTE');
            const pcConfig = moduleConfig.pontos_corridos || moduleConfig.pontosCorridos || {};
            console.log('  PC Config:', JSON.stringify(pcConfig));
        }

        // Verificar liga.modulos_ativos
        console.log('');
        console.log('  Liga modulos_ativos:', JSON.stringify(liga.modulos_ativos));

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('📊 RESUMO EXECUTIVO');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        console.log(`BUG 1 - INSCRICAO_TEMPORADA ausente no cache:`);
        console.log(`  Afetados: ${semInscricaoNoCache.length} participantes`);
        console.log(`  OK: ${comInscricaoNoCache.length} participantes`);
        console.log(`  Sem cache: ${semCacheMasComInscricao.length} participantes\n`);

        console.log(`BUG 2 - Pontos Corridos:`);
        for (const rod of rodadasExistentes) {
            const dados = analiseRodadas.filter(a => a.rodada === rod);
            const semPC = dados.filter(d => !d.temPC);
            console.log(`  R${rod}: ${semPC.length}/${dados.length} SEM PC`);
        }
        console.log('');

        console.log(`BUG 3 - Breakdown zerado: ${breakdownZerado}/${totalTransacoes} transações`);
        console.log('');

    } catch (error) {
        console.error('❌ Erro:', error.message, error.stack);
    } finally {
        await mongoose.disconnect();
    }
}

diagnosticar();
