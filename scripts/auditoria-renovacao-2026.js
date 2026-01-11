/**
 * AUDITORIA COMPLETA - RENOVAÇÃO 2026
 * ===================================
 * Script de pente fino para validar:
 * - Saldos 2025 (extratos consolidados)
 * - Inscrições 2026 (flags, valores, cálculos)
 * - Consistência entre modal Quitação e Renovação
 * - Reflexo correto no app do participante
 *
 * Uso: node scripts/auditoria-renovacao-2026.js [--liga=ID] [--fix]
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const TAXA_INSCRICAO_2026 = 180;

// Cores para console
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'bold');
    console.log('='.repeat(60));
}

function logSubSection(title) {
    console.log('\n' + '-'.repeat(40));
    log(title, 'cyan');
    console.log('-'.repeat(40));
}

async function main() {
    const args = process.argv.slice(2);
    const ligaIdArg = args.find(a => a.startsWith('--liga='))?.split('=')[1];
    const shouldFix = args.includes('--fix');
    const verbose = args.includes('--verbose');

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        logSection('🔍 AUDITORIA COMPLETA - RENOVAÇÃO 2026');
        log(`Data: ${new Date().toLocaleString('pt-BR')}`, 'cyan');
        log(`Modo: ${shouldFix ? 'CORREÇÃO ATIVA' : 'APENAS ANÁLISE'}`, shouldFix ? 'red' : 'yellow');

        // Buscar liga
        const ligaQuery = ligaIdArg ? { _id: new ObjectId(ligaIdArg) } : {};
        const ligas = await db.collection('ligas').find(ligaQuery).toArray();

        if (ligas.length === 0) {
            log('Nenhuma liga encontrada!', 'red');
            return;
        }

        const resultadosGlobais = {
            totalParticipantes: 0,
            errosGraves: [],
            avisos: [],
            correcoesPendentes: []
        };

        for (const liga of ligas) {
            logSection(`📋 LIGA: ${liga.nome}`);
            log(`ID: ${liga._id}`, 'cyan');

            const ligaId = liga._id;
            const participantes = liga.participantes || [];

            log(`Total participantes na liga: ${participantes.length}`, 'cyan');
            resultadosGlobais.totalParticipantes += participantes.length;

            // 1. BUSCAR DADOS DE TODAS AS FONTES
            logSubSection('1. Carregando dados...');

            // Extratos 2025
            const extratos2025 = await db.collection('extratofinanceirocaches').find({
                liga_id: ligaId,
                temporada: 2025
            }).toArray();
            const extratos2025Map = new Map(extratos2025.map(e => [e.time_id, e]));
            log(`  Extratos 2025: ${extratos2025.length}`, 'green');

            // Extratos 2026
            const extratos2026 = await db.collection('extratofinanceirocaches').find({
                liga_id: ligaId,
                temporada: 2026
            }).toArray();
            const extratos2026Map = new Map(extratos2026.map(e => [e.time_id, e]));
            log(`  Extratos 2026: ${extratos2026.length}`, 'green');

            // Inscrições 2026
            const inscricoes2026 = await db.collection('inscricoestemporada').find({
                liga_id: ligaId,
                temporada: 2026
            }).toArray();
            const inscricoes2026Map = new Map(inscricoes2026.map(i => [i.time_id, i]));
            log(`  Inscrições 2026: ${inscricoes2026.length}`, 'green');

            // Acertos financeiros 2025
            const acertos2025 = await db.collection('acertofinanceiros').find({
                ligaId: ligaId.toString(),
                temporada: 2025
            }).toArray();
            log(`  Acertos 2025: ${acertos2025.length}`, 'green');

            // 2. ANÁLISE POR PARTICIPANTE
            logSubSection('2. Análise por participante...');

            for (const p of participantes) {
                const timeId = Number(p.time_id);
                const nome = p.nome_cartola || p.nome_time || `ID:${timeId}`;

                const extrato2025 = extratos2025Map.get(timeId);
                const extrato2026 = extratos2026Map.get(timeId);
                const inscricao2026 = inscricoes2026Map.get(timeId);

                const analise = {
                    timeId,
                    nome,
                    erros: [],
                    avisos: [],
                    correcoes: []
                };

                // ============================================
                // VERIFICAÇÃO 1: Saldo 2025
                // ============================================
                const saldo2025Extrato = extrato2025?.saldo_consolidado ?? null;
                const saldo2025Inscricao = inscricao2026?.temporada_anterior?.saldo_final ?? null;

                if (extrato2025) {
                    if (verbose) {
                        log(`\n${nome} (${timeId}):`, 'bold');
                        log(`  Saldo 2025 (extrato): R$ ${saldo2025Extrato?.toFixed(2) || 'N/A'}`);
                    }

                    // Verificar consistência
                    if (inscricao2026 && saldo2025Inscricao !== null) {
                        if (Math.abs(saldo2025Extrato - saldo2025Inscricao) > 0.01) {
                            analise.avisos.push(
                                `Saldo 2025 divergente: extrato=${saldo2025Extrato?.toFixed(2)}, inscricao=${saldo2025Inscricao?.toFixed(2)}`
                            );
                        }
                    }
                }

                // ============================================
                // VERIFICAÇÃO 2: Inscrição 2026
                // ============================================
                if (inscricao2026) {
                    const status = inscricao2026.status;
                    const pagouInscricao = inscricao2026.pagou_inscricao;
                    const saldoTransferido = inscricao2026.saldo_transferido || 0;
                    const taxaInscricao = inscricao2026.taxa_inscricao || TAXA_INSCRICAO_2026;
                    const saldoInicial = inscricao2026.saldo_inicial_temporada;
                    const legado = inscricao2026.legado_manual;

                    if (verbose) {
                        log(`  Status 2026: ${status}`);
                        log(`  pagou_inscricao: ${pagouInscricao}`);
                        log(`  saldo_transferido: R$ ${saldoTransferido?.toFixed(2)}`);
                        log(`  taxa_inscricao: R$ ${taxaInscricao?.toFixed(2)}`);
                        log(`  saldo_inicial: R$ ${saldoInicial?.toFixed(2)}`);
                        if (legado) {
                            log(`  legado_manual: ${legado.tipo_quitacao} (${legado.valor_original} -> ${legado.valor_definido})`);
                        }
                    }

                    // VERIFICAÇÃO 2.1: Cálculo do saldo_inicial_temporada
                    let saldoInicialEsperado;
                    if (pagouInscricao === true) {
                        // Se pagou, taxa não vira débito
                        saldoInicialEsperado = saldoTransferido;
                    } else {
                        // Taxa vira débito
                        saldoInicialEsperado = saldoTransferido - taxaInscricao;
                    }

                    if (saldoInicial !== undefined && Math.abs(saldoInicial - saldoInicialEsperado) > 0.01) {
                        analise.erros.push(
                            `saldo_inicial INCORRETO: atual=${saldoInicial?.toFixed(2)}, esperado=${saldoInicialEsperado.toFixed(2)} ` +
                            `(pagou=${pagouInscricao}, transf=${saldoTransferido}, taxa=${taxaInscricao})`
                        );
                        analise.correcoes.push({
                            campo: 'saldo_inicial_temporada',
                            atual: saldoInicial,
                            correto: saldoInicialEsperado
                        });
                    }

                    // VERIFICAÇÃO 2.2: Flag pagou_inscricao
                    // Se tem legado.tipo_quitacao='zerado' mas pagou_inscricao=true, está errado
                    if (legado?.tipo_quitacao === 'zerado' && pagouInscricao === true) {
                        analise.erros.push(
                            `pagou_inscricao=true COM legado.tipo_quitacao='zerado' - INCONSISTENTE! ` +
                            `(zerado é sobre saldo 2025, não pagamento de inscrição 2026)`
                        );
                        analise.correcoes.push({
                            campo: 'pagou_inscricao',
                            atual: true,
                            correto: false
                        });
                    }

                    // VERIFICAÇÃO 2.3: Quitação de inscrição
                    const creditoCobriuTaxa = saldoTransferido >= taxaInscricao && taxaInscricao > 0;
                    const inscricaoQuitada = pagouInscricao === true || creditoCobriuTaxa;

                    if (verbose) {
                        log(`  inscricao_quitada: ${inscricaoQuitada ? 'SIM' : 'NÃO'} ` +
                            `(pagou=${pagouInscricao}, creditoCobriu=${creditoCobriuTaxa})`);
                    }

                    // VERIFICAÇÃO 2.4: Extrato 2026 consistente
                    if (extrato2026) {
                        const saldo2026Extrato = extrato2026.saldo_consolidado || 0;

                        // Verificar se tem transação de INSCRICAO_TEMPORADA
                        const transacaoInscricao = extrato2026.historico_transacoes?.find(
                            t => t.tipo === 'INSCRICAO_TEMPORADA'
                        );

                        if (!pagouInscricao && !transacaoInscricao) {
                            analise.avisos.push(
                                `Não pagou inscrição mas extrato 2026 não tem transação INSCRICAO_TEMPORADA`
                            );
                        }

                        if (pagouInscricao && transacaoInscricao) {
                            analise.avisos.push(
                                `Pagou inscrição mas extrato 2026 ainda tem transação INSCRICAO_TEMPORADA (deveria ter sido removida)`
                            );
                        }
                    }

                } else {
                    // Não tem inscrição 2026
                    if (p.ativo !== false) {
                        analise.avisos.push(`Participante ativo sem inscrição 2026`);
                    }
                }

                // ============================================
                // VERIFICAÇÃO 3: Consistência do legado_manual
                // ============================================
                if (inscricao2026?.legado_manual) {
                    const legado = inscricao2026.legado_manual;

                    // Se tipo_quitacao = 'zerado', valor_definido deve ser 0
                    if (legado.tipo_quitacao === 'zerado' && legado.valor_definido !== 0) {
                        analise.erros.push(
                            `legado.tipo_quitacao='zerado' mas valor_definido=${legado.valor_definido} (deveria ser 0)`
                        );
                    }

                    // Se tipo_quitacao = 'total' ou 'customizado', deve ter valor_definido
                    if (['total', 'customizado'].includes(legado.tipo_quitacao) &&
                        legado.valor_definido === undefined) {
                        analise.erros.push(
                            `legado.tipo_quitacao='${legado.tipo_quitacao}' sem valor_definido`
                        );
                    }
                }

                // Consolidar resultados do participante
                if (analise.erros.length > 0 || analise.avisos.length > 0) {
                    console.log(`\n${colors.bold}${nome} (${timeId}):${colors.reset}`);

                    for (const erro of analise.erros) {
                        log(`  ❌ ERRO: ${erro}`, 'red');
                        resultadosGlobais.errosGraves.push(`${nome}: ${erro}`);
                    }

                    for (const aviso of analise.avisos) {
                        log(`  ⚠️  AVISO: ${aviso}`, 'yellow');
                        resultadosGlobais.avisos.push(`${nome}: ${aviso}`);
                    }

                    if (analise.correcoes.length > 0) {
                        resultadosGlobais.correcoesPendentes.push({
                            timeId,
                            nome,
                            liga: liga.nome,
                            ligaId: liga._id.toString(),
                            correcoes: analise.correcoes
                        });
                    }
                }
            }
        }

        // ============================================
        // RELATÓRIO FINAL
        // ============================================
        logSection('📊 RELATÓRIO FINAL');

        log(`Total de participantes analisados: ${resultadosGlobais.totalParticipantes}`, 'cyan');
        log(`Erros graves encontrados: ${resultadosGlobais.errosGraves.length}`,
            resultadosGlobais.errosGraves.length > 0 ? 'red' : 'green');
        log(`Avisos: ${resultadosGlobais.avisos.length}`,
            resultadosGlobais.avisos.length > 0 ? 'yellow' : 'green');
        log(`Correções pendentes: ${resultadosGlobais.correcoesPendentes.length}`,
            resultadosGlobais.correcoesPendentes.length > 0 ? 'magenta' : 'green');

        if (resultadosGlobais.errosGraves.length > 0) {
            logSubSection('❌ ERROS GRAVES');
            for (const erro of resultadosGlobais.errosGraves) {
                log(`  • ${erro}`, 'red');
            }
        }

        if (resultadosGlobais.correcoesPendentes.length > 0) {
            logSubSection('🔧 CORREÇÕES PENDENTES');
            for (const item of resultadosGlobais.correcoesPendentes) {
                log(`\n${item.nome} (${item.timeId}):`, 'magenta');
                for (const correcao of item.correcoes) {
                    log(`  ${correcao.campo}: ${correcao.atual} → ${correcao.correto}`, 'yellow');
                }
            }

            if (shouldFix) {
                logSubSection('🔄 APLICANDO CORREÇÕES...');

                for (const item of resultadosGlobais.correcoesPendentes) {
                    const updateData = {};
                    for (const correcao of item.correcoes) {
                        updateData[correcao.campo] = correcao.correto;
                    }

                    const result = await db.collection('inscricoestemporada').updateOne(
                        {
                            liga_id: new ObjectId(item.ligaId),
                            time_id: item.timeId,
                            temporada: 2026
                        },
                        { $set: updateData }
                    );

                    log(`  ${item.nome}: ${result.modifiedCount > 0 ? '✅ Corrigido' : '⚠️ Não modificado'}`,
                        result.modifiedCount > 0 ? 'green' : 'yellow');
                }
            } else {
                log('\n💡 Para aplicar correções, execute com: --fix', 'cyan');
            }
        }

        // Resumo para reflexo no app
        logSubSection('📱 IMPACTO NO APP DO PARTICIPANTE');
        log('As seguintes informações devem ser validadas no app:', 'cyan');
        log('  1. Saldo 2026 inicial correto na tela de extrato');
        log('  2. Badge de "Deve inscrição" aparece para quem não pagou');
        log('  3. Histórico de transações inclui INSCRICAO_TEMPORADA se não pagou');
        log('  4. Crédito de 2025 aparece corretamente transferido');

        log('\n✅ Auditoria concluída!', 'green');

    } catch (error) {
        log(`\n❌ Erro durante auditoria: ${error.message}`, 'red');
        console.error(error);
    } finally {
        await client.close();
    }
}

main();
