// Teste da correção v9.5 - TOP10 no Hall da Fama
import 'dotenv/config';
import mongoose from 'mongoose';

async function testar() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar cache TOP10 da liga Sobral
    const cache = await db.collection('top10caches').findOne({
        liga_id: '684cb1c8af923da7c7df51de'
    });

    if (!cache) {
        console.log('❌ Cache não encontrado');
        process.exit(1);
    }

    const totalMitos = cache.mitos ? cache.mitos.length : 0;
    const totalMicos = cache.micos ? cache.micos.length : 0;

    console.log('📊 Cache TOP10 encontrado:');
    console.log('   - Total MITOS: ' + totalMitos);
    console.log('   - Total MICOS: ' + totalMicos + '\n');

    // Participantes para testar (baseado nos dados que vimos)
    const participantesTeste = [
        { timeId: 13935277, nome: 'Urubu Play F.C. (Paulinett Miranda)' },
        { timeId: 3027272, nome: 'Vitim 10 FC' },
        { timeId: 164131, nome: '51 Sportclub (JB Oliveira)' },
        { timeId: 5902324, nome: 'ALA PEDRINHAS FC' },
        { timeId: 45004009, nome: 'fc.catumbi (fucim)' },
    ];

    console.log('🧪 TESTANDO LÓGICA v9.5 (busca em TODO o array):\n');
    console.log('='.repeat(60));

    for (const p of participantesTeste) {
        let countMitos = 0;
        let countMicos = 0;
        let rodadasMito = [];
        let rodadasMico = [];
        let melhorMitoPos = null;
        let melhorMicoPos = null;

        // Buscar em TODO o array (correção v9.5)
        (cache.mitos || []).forEach((m, index) => {
            if (String(m.timeId) === String(p.timeId)) {
                countMitos++;
                rodadasMito.push(m.rodada);
                if (!melhorMitoPos) melhorMitoPos = index + 1;
            }
        });

        (cache.micos || []).forEach((m, index) => {
            if (String(m.timeId) === String(p.timeId)) {
                countMicos++;
                rodadasMico.push(m.rodada);
                if (!melhorMicoPos) melhorMicoPos = index + 1;
            }
        });

        console.log('\n👤 ' + p.nome + ' (ID: ' + p.timeId + ')');

        if (countMitos > 0) {
            console.log('   ⭐ MITO em ' + countMitos + ' rodada(s): [' + rodadasMito.join(', ') + ']');
            console.log('      Posição no ranking geral: ' + melhorMitoPos + 'º');
        }

        if (countMicos > 0) {
            console.log('   💀 MICO em ' + countMicos + ' rodada(s): [' + rodadasMico.join(', ') + ']');
            console.log('      Posição no ranking geral: ' + melhorMicoPos + 'º');
        }

        if (countMitos === 0 && countMicos === 0) {
            console.log('   ℹ️  Não aparece no TOP10 desta temporada');
        }
    }

    console.log('\n' + '='.repeat(60));

    // Comparar com lógica ANTIGA (slice(0,10))
    console.log('\n\n🔄 COMPARAÇÃO: Lógica ANTIGA vs NOVA\n');
    console.log('-'.repeat(60));

    for (const p of participantesTeste) {
        // LÓGICA ANTIGA (slice 0,10 - BUGADA)
        let antigaCountMitos = 0;
        let antigaCountMicos = 0;

        (cache.mitos || []).slice(0, 10).forEach((m) => {
            if (String(m.timeId) === String(p.timeId)) antigaCountMitos++;
        });

        (cache.micos || []).slice(0, 10).forEach((m) => {
            if (String(m.timeId) === String(p.timeId)) antigaCountMicos++;
        });

        // LÓGICA NOVA (todo o array - CORRIGIDA)
        let novaCountMitos = 0;
        let novaCountMicos = 0;

        (cache.mitos || []).forEach((m) => {
            if (String(m.timeId) === String(p.timeId)) novaCountMitos++;
        });

        (cache.micos || []).forEach((m) => {
            if (String(m.timeId) === String(p.timeId)) novaCountMicos++;
        });

        const diferencaMito = novaCountMitos - antigaCountMitos;
        const diferencaMico = novaCountMicos - antigaCountMicos;

        if (diferencaMito !== 0 || diferencaMico !== 0) {
            console.log('\n⚠️  ' + p.nome);
            if (diferencaMito !== 0) {
                console.log('   MITO: Antiga=' + antigaCountMitos + ' → Nova=' + novaCountMitos + ' (DIFERENÇA: +' + diferencaMito + ')');
            }
            if (diferencaMico !== 0) {
                console.log('   MICO: Antiga=' + antigaCountMicos + ' → Nova=' + novaCountMicos + ' (DIFERENÇA: +' + diferencaMico + ')');
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Teste concluído!\n');

    await mongoose.disconnect();
}

testar().catch(e => {
    console.error('❌ Erro:', e.message);
    process.exit(1);
});
