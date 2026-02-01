/**
 * MIGRAÇÃO: Normalizar liga_id para String no ExtratoFinanceiroCache
 *
 * PROBLEMA:
 * O campo liga_id no ExtratoFinanceiroCache é do tipo Mixed, aceitando
 * tanto String quanto ObjectId. Isso causa inconsistências em queries
 * e impede validação pelo Mongoose.
 *
 * SOLUÇÃO:
 * Converter todos os liga_id que são ObjectId para String, uniformizando
 * o formato para queries consistentes.
 *
 * USO:
 *   node scripts/migrar-liga-id-para-string.js --dry-run    # Simular
 *   node scripts/migrar-liga-id-para-string.js --force       # Executar
 *
 * @version 1.0.0
 * @since 2026-02-01
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function migrarLigaIdParaString() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.log('❌ Use --dry-run para simular ou --force para executar');
        console.log('   node scripts/migrar-liga-id-para-string.js --dry-run');
        console.log('   node scripts/migrar-liga-id-para-string.js --force');
        process.exit(1);
    }

    console.log(`\n🔧 MIGRAÇÃO: Normalizar liga_id para String`);
    console.log(`   Modo: ${isDryRun ? '🔍 DRY-RUN (simulação)' : '⚡ EXECUÇÃO REAL'}`);
    console.log(`   Collection: extratofinanceirocaches\n`);

    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('extratofinanceirocaches');

    // =========================================================================
    // 1. DIAGNÓSTICO: Verificar tipos atuais de liga_id
    // =========================================================================
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Total de documentos: ${totalDocs}`);

    // Buscar documentos onde liga_id é ObjectId (não é string)
    const docsComObjectId = await collection.find({
        liga_id: { $type: 'objectId' }
    }).toArray();

    const docsComString = await collection.countDocuments({
        liga_id: { $type: 'string' }
    });

    const docsOutrosTipos = totalDocs - docsComObjectId.length - docsComString;

    console.log(`   - liga_id como String:   ${docsComString}`);
    console.log(`   - liga_id como ObjectId: ${docsComObjectId.length}`);
    if (docsOutrosTipos > 0) {
        console.log(`   - liga_id outros tipos:  ${docsOutrosTipos}`);
    }
    console.log('');

    if (docsComObjectId.length === 0) {
        console.log('✅ Nenhum documento com ObjectId encontrado. Nada a fazer.');
        await mongoose.disconnect();
        process.exit(0);
    }

    // =========================================================================
    // 2. LISTAR documentos que serão alterados
    // =========================================================================
    console.log(`📋 Documentos a converter (${docsComObjectId.length}):`);
    const alteracoes = [];

    for (const doc of docsComObjectId) {
        const ligaIdOriginal = doc.liga_id;
        const ligaIdString = ligaIdOriginal.toString();

        // Verificar se já existe um documento com a versão String (conflito de unique index)
        const conflito = await collection.findOne({
            liga_id: ligaIdString,
            time_id: doc.time_id,
            temporada: doc.temporada
        });

        const temConflito = conflito && conflito._id.toString() !== doc._id.toString();

        alteracoes.push({
            _id: doc._id,
            time_id: doc.time_id,
            temporada: doc.temporada,
            liga_id_original: ligaIdOriginal,
            liga_id_novo: ligaIdString,
            conflito: temConflito,
            conflito_id: temConflito ? conflito._id : null,
        });

        const statusConflito = temConflito ? ' ⚠️  CONFLITO (já existe doc com String)' : '';
        console.log(`   - time_id=${doc.time_id} temporada=${doc.temporada} | ${ligaIdOriginal} → "${ligaIdString}"${statusConflito}`);
    }

    const comConflito = alteracoes.filter(a => a.conflito);
    const semConflito = alteracoes.filter(a => !a.conflito);

    console.log(`\n📊 Resumo:`);
    console.log(`   - Conversões simples:  ${semConflito.length}`);
    console.log(`   - Com conflito unique: ${comConflito.length}`);

    if (comConflito.length > 0) {
        console.log('\n⚠️  Documentos com conflito serão REMOVIDOS (o doc String já existe):');
        for (const c of comConflito) {
            console.log(`   - _id=${c._id} (ObjectId) será removido em favor de _id=${c.conflito_id} (String)`);
        }
    }

    // =========================================================================
    // 3. EXECUTAR migração (se --force)
    // =========================================================================
    if (isDryRun) {
        console.log('\n🔍 DRY-RUN: Nenhuma alteração realizada.');
        console.log('   Execute com --force para aplicar as alterações.');
        await mongoose.disconnect();
        process.exit(0);
    }

    console.log('\n⚡ Executando migração...\n');

    let convertidos = 0;
    let removidos = 0;
    let erros = 0;

    // 3a. Converter documentos sem conflito
    for (const alt of semConflito) {
        try {
            await collection.updateOne(
                { _id: alt._id },
                { $set: { liga_id: alt.liga_id_novo } }
            );
            convertidos++;
            console.log(`   ✅ Convertido: time_id=${alt.time_id} temporada=${alt.temporada}`);
        } catch (error) {
            erros++;
            console.error(`   ❌ Erro ao converter _id=${alt._id}: ${error.message}`);
        }
    }

    // 3b. Remover documentos com conflito (o String já existe)
    for (const alt of comConflito) {
        try {
            await collection.deleteOne({ _id: alt._id });
            removidos++;
            console.log(`   🗑️  Removido duplicado ObjectId: time_id=${alt.time_id} temporada=${alt.temporada}`);
        } catch (error) {
            erros++;
            console.error(`   ❌ Erro ao remover _id=${alt._id}: ${error.message}`);
        }
    }

    // =========================================================================
    // 4. RESULTADO
    // =========================================================================
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 RESULTADO DA MIGRAÇÃO`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   Convertidos (ObjectId → String): ${convertidos}`);
    console.log(`   Removidos (duplicados):          ${removidos}`);
    console.log(`   Erros:                           ${erros}`);
    console.log(`${'='.repeat(60)}\n`);

    // Verificação pós-migração
    const remainingObjectId = await collection.countDocuments({
        liga_id: { $type: 'objectId' }
    });

    if (remainingObjectId === 0) {
        console.log('✅ Migração concluída com sucesso! Todos os liga_id são String agora.');
    } else {
        console.log(`⚠️  Ainda restam ${remainingObjectId} documentos com ObjectId.`);
    }

    await mongoose.disconnect();
}

migrarLigaIdParaString().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
