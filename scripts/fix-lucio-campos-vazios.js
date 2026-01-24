/**
 * fix-lucio-campos-vazios.js
 *
 * Corrige os campos vazios no registro do Lúcio de Souza (ID 19615809)
 * que não aparecem corretamente no admin.
 *
 * Problema: Os campos nome_cartola e url_escudo_png estavam vazios
 * Causa: Bug no inscricoesController.js (já corrigido em v2.14)
 *
 * Uso:
 *   node scripts/fix-lucio-campos-vazios.js --dry-run  # Simula
 *   node scripts/fix-lucio-campos-vazios.js --force    # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TIME_ID = 19615809;
const NOME_CARTOLEIRO = "Lúcio de Souza";
const NOME_TIME = "Bela Bosta FCPE";
const ESCUDO_URL = "https://s2-cartola.glbimg.com/bzb3YnZFQ4ySa3VDcp2xkvrWIiA=/https://s3.glbimg.com/v1/AUTH_58d78b787ec34892b5aaa0c7a146155f/cartola_assets_2/escudo/d7/01/05/00a90f6647-24df-4ea1-b3fb-49b2895536d720260114160105";

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForced = process.argv.includes('--force');

    if (!isDryRun && !isForced) {
        console.log('Uso: node scripts/fix-lucio-campos-vazios.js [--dry-run|--force]');
        console.log('  --dry-run  Simula sem alterar o banco');
        console.log('  --force    Executa a correção');
        process.exit(1);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`FIX: Lúcio de Souza - Campos Vazios`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'FORCE (execução real)'}\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const timesCollection = db.collection('times');

        // Buscar registro atual
        const timeAtual = await timesCollection.findOne({ id: TIME_ID });

        if (!timeAtual) {
            console.log(`❌ Time ${TIME_ID} não encontrado!`);
            process.exit(1);
        }

        console.log('📋 REGISTRO ATUAL:');
        console.log(`   ID: ${timeAtual.id}`);
        console.log(`   nome_time: "${timeAtual.nome_time}"`);
        console.log(`   nome_cartoleiro: "${timeAtual.nome_cartoleiro}"`);
        console.log(`   nome_cartola: "${timeAtual.nome_cartola || '(vazio)'}"`);
        console.log(`   url_escudo_png: "${timeAtual.url_escudo_png || '(vazio)'}"`);
        console.log(`   temporada: ${timeAtual.temporada}`);
        console.log();

        // Verificar se precisa correção
        const precisaCorrecao = !timeAtual.nome_cartola || !timeAtual.url_escudo_png;

        if (!precisaCorrecao) {
            console.log('✅ Registro já está correto! Nenhuma ação necessária.');
            process.exit(0);
        }

        console.log('🔧 CORREÇÕES A APLICAR:');
        if (!timeAtual.nome_cartola) {
            console.log(`   nome_cartola: "" → "${NOME_CARTOLEIRO}"`);
        }
        if (!timeAtual.url_escudo_png) {
            console.log(`   url_escudo_png: "" → "${ESCUDO_URL.substring(0, 50)}..."`);
        }
        console.log();

        if (isDryRun) {
            console.log('🔍 DRY-RUN: Nenhuma alteração realizada.');
            console.log('   Para aplicar as correções, execute com --force');
        } else {
            // Aplicar correção
            const resultado = await timesCollection.updateOne(
                { id: TIME_ID },
                {
                    $set: {
                        nome_cartola: NOME_CARTOLEIRO,
                        url_escudo_png: ESCUDO_URL,
                        updatedAt: new Date()
                    }
                }
            );

            if (resultado.modifiedCount > 0) {
                console.log('✅ CORREÇÃO APLICADA COM SUCESSO!');

                // Verificar resultado
                const timeCorrigido = await timesCollection.findOne({ id: TIME_ID });
                console.log('\n📋 REGISTRO ATUALIZADO:');
                console.log(`   nome_cartola: "${timeCorrigido.nome_cartola}"`);
                console.log(`   url_escudo_png: "${timeCorrigido.url_escudo_png?.substring(0, 50)}..."`);
            } else {
                console.log('⚠️ Nenhum documento foi modificado.');
            }
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
