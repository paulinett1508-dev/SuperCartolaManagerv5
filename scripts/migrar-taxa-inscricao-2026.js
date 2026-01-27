/**
 * Script: Configurar Inscrição Liga "Os Fuleros" 2026 - R$ 100
 *
 * LIGA: Os Fuleros (6977a62071dee12036bb163e)
 * PARTICIPANTES: 7
 *
 * AÇÕES:
 * 1. Criar/atualizar ligarules com inscricao.taxa: 100
 * 2. Criar registros em inscricoestemporada para cada participante
 * 3. Gerar transações INSCRICAO_TEMPORADA nos extratos (-R$ 100)
 *
 * USO:
 *   node scripts/migrar-taxa-inscricao-2026.js --dry-run
 *   node scripts/migrar-taxa-inscricao-2026.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '6977a62071dee12036bb163e'; // Os Fuleros
const LIGA_NOME = 'Os Fuleros';
const TEMPORADA = 2026;
const TAXA_INSCRICAO = 100;

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.error('❌ Use --dry-run ou --force');
        console.log('');
        console.log('Exemplos:');
        console.log('  node scripts/migrar-taxa-inscricao-2026.js --dry-run  # Simula');
        console.log('  node scripts/migrar-taxa-inscricao-2026.js --force    # Executa');
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log(`CONFIGURAR INSCRIÇÕES: ${LIGA_NOME}`);
    console.log(`Taxa: R$ ${TAXA_INSCRICAO}`);
    console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN (simulação)' : '⚡ EXECUÇÃO REAL'}`);
    console.log('='.repeat(60));

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    const db = mongoose.connection.db;
    const ligaIdObj = new mongoose.Types.ObjectId(LIGA_ID);
    const agora = new Date();

    // ═══════════════════════════════════════════════════════════════
    // ETAPA 1: Buscar Liga e Participantes
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📋 ETAPA 1: Buscar Liga');

    const liga = await db.collection('ligas').findOne({ _id: ligaIdObj });

    if (!liga) {
        console.error(`❌ Liga não encontrada: ${LIGA_ID}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`   Liga: ${liga.nome}`);
    console.log(`   Participantes: ${liga.participantes?.length || 0}`);

    const participantes = liga.participantes || [];

    // ═══════════════════════════════════════════════════════════════
    // ETAPA 2: Criar/Atualizar LigaRules
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📋 ETAPA 2: LigaRules');

    const rulesExistente = await db.collection('ligarules').findOne({
        liga_id: ligaIdObj,
        temporada: TEMPORADA
    });

    if (rulesExistente) {
        console.log(`   Existente: taxa R$ ${rulesExistente.inscricao?.taxa || 'N/A'}`);

        if (!isDryRun) {
            await db.collection('ligarules').updateOne(
                { liga_id: ligaIdObj, temporada: TEMPORADA },
                { $set: { 'inscricao.taxa': TAXA_INSCRICAO } }
            );
            console.log(`   ✅ Atualizado para R$ ${TAXA_INSCRICAO}`);
        } else {
            console.log(`   🔍 Seria atualizado para R$ ${TAXA_INSCRICAO}`);
        }
    } else {
        console.log(`   Não existe, criando novo...`);

        const novoRules = {
            liga_id: ligaIdObj,
            temporada: TEMPORADA,
            inscricao: {
                taxa: TAXA_INSCRICAO,
                prazo_renovacao: new Date('2026-03-01'),
                permitir_devedor_renovar: true,
                aproveitar_saldo_positivo: true,
                permitir_parcelamento: false,
                max_parcelas: 1
            },
            status: 'aberto',
            criado_em: agora,
            criado_por: 'script'
        };

        if (!isDryRun) {
            await db.collection('ligarules').insertOne(novoRules);
            console.log(`   ✅ Criado com taxa R$ ${TAXA_INSCRICAO}`);
        } else {
            console.log(`   🔍 Seria criado com taxa R$ ${TAXA_INSCRICAO}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ETAPA 3: Criar Inscrições e Extratos
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📋 ETAPA 3: Inscrições e Extratos');
    console.log('-'.repeat(60));

    let inscricoesCriadas = 0;
    let extratosCriados = 0;
    let jaExistem = 0;

    for (const p of participantes) {
        const timeId = p.time_id;
        const nome = p.nome_cartola || p.nome_time || `Time ${timeId}`;

        // Verificar se já existe inscrição
        const inscricaoExistente = await db.collection('inscricoestemporada').findOne({
            liga_id: ligaIdObj,
            time_id: Number(timeId),
            temporada: TEMPORADA
        });

        if (inscricaoExistente) {
            console.log(`   ✓ ${nome}: já inscrito`);
            jaExistem++;
            continue;
        }

        console.log(`   👤 ${nome} (${timeId})`);

        // Criar inscrição
        const novaInscricao = {
            liga_id: ligaIdObj,
            time_id: Number(timeId),
            temporada: TEMPORADA,
            status: 'novo',
            taxa_inscricao: TAXA_INSCRICAO,
            pagou_inscricao: false,
            saldo_anterior: 0,
            saldo_inicial_temporada: -TAXA_INSCRICAO,
            dados_participante: {
                nome_cartoleiro: p.nome_cartola,
                nomeTime: p.nome_time,
                clube_id: p.clube_id
            },
            processado_em: agora,
            transacoes_criadas: [{
                tipo: 'INSCRICAO_TEMPORADA',
                valor: -TAXA_INSCRICAO,
                ref_id: `inscricao_${timeId}_${TEMPORADA}`
            }]
        };

        if (!isDryRun) {
            await db.collection('inscricoestemporada').insertOne(novaInscricao);
            inscricoesCriadas++;
            console.log(`      ✅ Inscrição criada`);
        } else {
            console.log(`      🔍 Inscrição seria criada`);
        }

        // Criar/atualizar extrato
        const cacheExistente = await db.collection('extratofinanceirocaches').findOne({
            liga_id: String(LIGA_ID),
            time_id: Number(timeId),
            temporada: TEMPORADA
        });

        if (cacheExistente) {
            // Verificar se já tem transação de inscrição
            const temTxInscricao = cacheExistente.historico_transacoes?.some(
                t => t.tipo === 'INSCRICAO_TEMPORADA'
            );

            if (!temTxInscricao && !isDryRun) {
                await db.collection('extratofinanceirocaches').updateOne(
                    { _id: cacheExistente._id },
                    {
                        $push: {
                            historico_transacoes: {
                                rodada: 0,
                                tipo: 'INSCRICAO_TEMPORADA',
                                valor: -TAXA_INSCRICAO,
                                descricao: `Taxa de inscrição temporada ${TEMPORADA}`,
                                data: agora
                            }
                        },
                        $inc: { saldo_consolidado: -TAXA_INSCRICAO }
                    }
                );
                extratosCriados++;
                console.log(`      ✅ Transação adicionada ao extrato`);
            } else if (!temTxInscricao) {
                console.log(`      🔍 Transação seria adicionada`);
            } else {
                console.log(`      ✓ Extrato já tem transação`);
            }
        } else {
            // Criar extrato novo
            const novoCache = {
                liga_id: String(LIGA_ID),
                time_id: Number(timeId),
                temporada: TEMPORADA,
                nome_time: p.nome_time,
                nome_cartoleiro: p.nome_cartola,
                saldo_consolidado: -TAXA_INSCRICAO,
                ganhos_consolidados: 0,
                perdas_consolidadas: -TAXA_INSCRICAO,
                rodadas: [],
                historico_transacoes: [{
                    rodada: 0,
                    tipo: 'INSCRICAO_TEMPORADA',
                    valor: -TAXA_INSCRICAO,
                    descricao: `Taxa de inscrição temporada ${TEMPORADA}`,
                    data: agora
                }],
                versao_calculo: '6.5.0',
                atualizado_em: agora
            };

            if (!isDryRun) {
                await db.collection('extratofinanceirocaches').insertOne(novoCache);
                extratosCriados++;
                console.log(`      ✅ Extrato criado com saldo -R$ ${TAXA_INSCRICAO}`);
            } else {
                console.log(`      🔍 Extrato seria criado com saldo -R$ ${TAXA_INSCRICAO}`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RESUMO FINAL
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO');
    console.log('='.repeat(60));
    console.log(`Liga:           ${liga.nome} (${LIGA_ID})`);
    console.log(`Temporada:      ${TEMPORADA}`);
    console.log(`Taxa:           R$ ${TAXA_INSCRICAO}`);
    console.log('-'.repeat(60));
    console.log(`Participantes:  ${participantes.length}`);
    console.log(`Já inscritos:   ${jaExistem}`);
    console.log(`Inscrições:     ${isDryRun ? (participantes.length - jaExistem) + ' (simulado)' : inscricoesCriadas + ' ✅'}`);
    console.log(`Extratos:       ${isDryRun ? (participantes.length - jaExistem) + ' (simulado)' : extratosCriados + ' ✅'}`);
    console.log('='.repeat(60));

    if (isDryRun) {
        console.log('\nℹ️  Execute com --force para aplicar as mudanças');
    } else {
        console.log('\n✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log(`   Cada participante agora tem débito de R$ ${TAXA_INSCRICAO} no extrato.`);
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
