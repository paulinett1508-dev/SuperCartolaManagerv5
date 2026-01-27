/**
 * Script para criar registros de inscrição na collection inscricoestemporada
 * para a liga "Os Fuleros" (6977a62071dee12036bb163e)
 *
 * Problema: A liga foi criada com taxa de inscrição R$ 100 no cache,
 * mas sem registros na collection inscricoestemporada.
 * Isso impede o backend de enviar taxaInscricao e pagouInscricao ao frontend.
 *
 * Uso: node scripts/fix-osfuleros-inscricoes.js [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '6977a62071dee12036bb163e';
const TEMPORADA = 2026;
const TAXA_INSCRICAO = 100; // R$ 100 conforme registrado nos caches

const isDryRun = process.argv.includes('--dry-run');

// Participantes da liga Os Fuleros
const participantes = [
    {
        time_id: 13935277,
        nome_cartola: 'Paulinett Miranda',
        nome_time: 'Urubu Play F.C.',
        escudo: 'https://s2-cartola.glbimg.com/UNl1ReGPyphtwv69CqhMbYDZrTc=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_assets_2/escudo/f8/24/14/00681760d8-c096-4ce7-8896-13b4cc8b71f820260113162414'
    },
    {
        time_id: 50988035,
        nome_cartola: 'Enderson',
        nome_time: 'Obraga04',
        escudo: 'https://s2-cartola.glbimg.com/SujcmLlRuhSzehIJRroxD6wJxsw=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_assets_2/escudo/da/35/17/00d5cec5ae-f4bf-4b53-b2e7-63ceb8b77fda20260113143517'
    },
    {
        time_id: 9232824,
        nome_cartola: 'Padé Papito',
        nome_time: "Papito's Football Club",
        escudo: 'https://s2-cartola.glbimg.com/MT-TkCJqZ8-UkJMjF1IUfUQbhYA=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_assets_2/escudo/76/20/29/001f747d9c-9076-4461-a9cf-95113b075b7620260113122029'
    },
    {
        time_id: 25330294,
        nome_cartola: 'jhones Prado',
        nome_time: 'j.Prado fc',
        escudo: 'https://s2-cartola.glbimg.com/8bvpJhaAqvM7zzEpP_dK7wkXqLY=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_186/escudo/ac/15/59/005b898a19-755f-4888-9cc3-2ab70cd8cfac20210508131559'
    },
    {
        time_id: 47664680,
        nome_cartola: 'Erivaldo',
        nome_time: 'CR ErySoldado',
        escudo: 'https://s2-cartola.glbimg.com/-LQVXWj1bU7rJvJauo0GkeQRxe8=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_assets_2/escudo/99/40/12/00c8ae6c0c-a4a3-4aad-a38f-d05a5560969920260113174012'
    },
    {
        time_id: 4223845,
        nome_cartola: 'bruno',
        nome_time: 'TriiMundial sp',
        escudo: 'https://s2-cartola.glbimg.com/nWIkiO8ihiMQmAQl8Nft6OlF0tI=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_svg_222/escudo/0b/35/49/00248061c7-9d11-405d-a9a9-84d9a3b8540b20240321093549'
    },
    {
        time_id: 4021507,
        nome_cartola: 'Thyago Martins',
        nome_time: 'TCMV Futebol club',
        escudo: 'https://s2-cartola.glbimg.com/1yVKMBWKBWCDFDJQfDS23cX96EI=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_assets_3/escudo/04/40/30/00b91d8cd7-afed-4453-ba2b-6e70b679250420260126204030'
    }
];

async function main() {
    console.log('='.repeat(60));
    console.log('Fix Inscrições Liga Os Fuleros');
    console.log('='.repeat(60));
    console.log(`Liga ID: ${LIGA_ID}`);
    console.log(`Temporada: ${TEMPORADA}`);
    console.log(`Taxa Inscrição: R$ ${TAXA_INSCRICAO}`);
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}`);
    console.log('='.repeat(60));

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const InscricaoTemporada = mongoose.connection.collection('inscricoestemporada');

        let criados = 0;
        let jaExistem = 0;
        let erros = 0;

        for (const p of participantes) {
            // Verificar se já existe
            const existente = await InscricaoTemporada.findOne({
                liga_id: LIGA_ID,
                time_id: p.time_id,
                temporada: TEMPORADA
            });

            if (existente) {
                console.log(`⏭️  ${p.nome_cartola} (${p.time_id}) - Já existe inscrição`);
                jaExistem++;
                continue;
            }

            const inscricao = {
                liga_id: LIGA_ID,
                temporada: TEMPORADA,
                time_id: p.time_id,
                origem: 'inscricao_manual',
                status: 'inscrito',
                taxa_inscricao: TAXA_INSCRICAO,
                pagou_inscricao: false,
                saldo_inicial_temporada: -TAXA_INSCRICAO,
                saldo_transferido: 0,
                divida_anterior: 0,
                dados_participante: {
                    nome_time: p.nome_time,
                    nome_cartoleiro: p.nome_cartola,
                    escudo: p.escudo,
                    id_cartola_oficial: p.time_id
                },
                processado: true,
                aprovado_por: 'script-fix',
                observacoes: 'Inscrição criada via script fix-osfuleros-inscricoes.js',
                criado_em: new Date(),
                atualizado_em: new Date(),
                data_decisao: new Date(),
                data_processamento: new Date(),
                transacoes_criadas: [
                    {
                        tipo: 'INSCRICAO_TEMPORADA',
                        valor: -TAXA_INSCRICAO,
                        ref_id: `inscricao_${LIGA_ID}_${p.time_id}_${TEMPORADA}`
                    }
                ]
            };

            if (isDryRun) {
                console.log(`🔍 [DRY-RUN] Criaria inscrição para ${p.nome_cartola} (${p.time_id})`);
                console.log(`   Taxa: R$ ${TAXA_INSCRICAO} | Saldo inicial: R$ ${-TAXA_INSCRICAO}`);
                criados++;
            } else {
                try {
                    await InscricaoTemporada.insertOne(inscricao);
                    console.log(`✅ Criada inscrição para ${p.nome_cartola} (${p.time_id})`);
                    criados++;
                } catch (err) {
                    console.error(`❌ Erro ao criar inscrição para ${p.nome_cartola}: ${err.message}`);
                    erros++;
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('RESUMO:');
        console.log(`  Criados: ${criados}`);
        console.log(`  Já existiam: ${jaExistem}`);
        console.log(`  Erros: ${erros}`);
        console.log('='.repeat(60));

        if (isDryRun) {
            console.log('\n⚠️  Modo DRY-RUN: Nenhuma alteração foi feita.');
            console.log('   Execute sem --dry-run para aplicar as mudanças.');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado do MongoDB');
    }
}

main();
