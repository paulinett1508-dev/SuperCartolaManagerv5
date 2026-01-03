/**
 * AUDITORIA COMPLETA - PÓS TURN_KEY
 * Verifica integridade de TODAS as collections para TODAS as ligas
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../data/backups/pre-wipe-2026-01-01T22-52-14');

const LIGAS = {
    SOBRAL: '684d821cf1a7ae16d1f89572',
    SUPERCARTOLA: '684cb1c8af923da7c7df51de'
};

// Collections críticas e seus campos de liga
const COLLECTIONS_CONFIG = [
    { name: 'rodadas', ligaField: 'ligaId', critical: true },
    { name: 'goleiros', ligaField: 'ligaId', critical: true },
    { name: 'golsconsolidados', ligaField: 'ligaId', critical: true },
    { name: 'gols', ligaField: 'ligaId', critical: false },
    { name: 'rodadasnapshots', ligaField: 'ligaId', critical: true },
    { name: 'top10caches', ligaField: 'liga_id', critical: true },
    { name: 'melhor_mes_cache', ligaField: 'liga_id', critical: true },
    { name: 'matamatacaches', ligaField: 'liga_id', critical: true },
    { name: 'pontoscorridoscaches', ligaField: 'liga_id', critical: true },
    { name: 'rankinggeralcaches', ligaField: 'liga_id', critical: true },
    { name: 'extratofinanceirocaches', ligaField: 'liga_id', critical: true },
    { name: 'ranking_turno_caches', ligaField: 'liga_id', critical: false },
    { name: 'rankingturnos', ligaField: 'ligaId', critical: false },
    { name: 'artilheirocampeaos', ligaField: 'ligaId', critical: true },
    { name: 'defesasconsolidadas', ligaField: 'ligaId', critical: true },
    { name: 'times', ligaField: null, critical: true }, // Sem liga, verificar por temporada
    { name: 'ligas', ligaField: null, critical: true },
];

async function contarDocumentos(db, collectionName, ligaField, ligaId) {
    if (!ligaField) return null;

    const query = {};
    // Tentar com string e ObjectId
    query[ligaField] = { $in: [ligaId, new ObjectId(ligaId)] };

    try {
        return await db.collection(collectionName).countDocuments(query);
    } catch (e) {
        // Se falhar, tentar só com string
        const simpleQuery = {};
        simpleQuery[ligaField] = ligaId;
        return await db.collection(collectionName).countDocuments(simpleQuery);
    }
}

async function contarBackup(collectionName, ligaField, ligaId) {
    const filePath = path.join(BACKUP_DIR, `${collectionName}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!ligaField) return data.length;

        return data.filter(doc => {
            const value = doc[ligaField];
            if (!value) return false;
            if (typeof value === 'string') return value === ligaId;
            if (value['$oid']) return value['$oid'] === ligaId;
            return false;
        }).length;
    } catch (e) {
        return null;
    }
}

async function verificarRodadas(db, ligaId, ligaName) {
    // Verificar se todas as 38 rodadas existem
    const rodadas = await db.collection('rodadas').find({
        ligaId: { $in: [ligaId, new ObjectId(ligaId)] }
    }).toArray();

    const rodadasNumeros = rodadas.map(r => r.rodada_atual || r.rodada);
    const rodadasSet = new Set(rodadasNumeros);

    const faltando = [];
    for (let i = 1; i <= 38; i++) {
        if (!rodadasSet.has(i)) faltando.push(i);
    }

    return {
        total: rodadas.length,
        rodadasUnicas: rodadasSet.size,
        faltando: faltando,
        completo: faltando.length === 0
    };
}

async function main() {
    console.log('═'.repeat(70));
    console.log('🔍 AUDITORIA COMPLETA - PÓS TURN_KEY');
    console.log('═'.repeat(70));
    console.log(`📅 Data: ${new Date().toISOString()}`);
    console.log('═'.repeat(70));

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    const report = {
        timestamp: new Date().toISOString(),
        ligas: {},
        problemas: [],
        acoes_necessarias: []
    };

    for (const [ligaName, ligaId] of Object.entries(LIGAS)) {
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`📊 LIGA: ${ligaName} (${ligaId})`);
        console.log('─'.repeat(70));

        report.ligas[ligaName] = { collections: {}, rodadas: null };

        // Verificar rodadas primeiro
        console.log('\n🗓️  Verificando rodadas (1-38):');
        const rodadasInfo = await verificarRodadas(db, ligaId, ligaName);
        report.ligas[ligaName].rodadas = rodadasInfo;

        if (rodadasInfo.completo) {
            console.log(`   ✅ Completo: ${rodadasInfo.total} documentos, todas 38 rodadas`);
        } else {
            console.log(`   ❌ INCOMPLETO: ${rodadasInfo.total} docs, faltam rodadas: ${rodadasInfo.faltando.join(', ')}`);
            report.problemas.push(`${ligaName}: Faltam rodadas ${rodadasInfo.faltando.join(', ')}`);
        }

        console.log('\n📦 Collections:');
        console.log('   ' + 'Collection'.padEnd(25) + 'Atual'.padStart(8) + 'Backup'.padStart(10) + '  Status');
        console.log('   ' + '─'.repeat(55));

        for (const config of COLLECTIONS_CONFIG) {
            const atual = await contarDocumentos(db, config.name, config.ligaField, ligaId);
            const backup = await contarBackup(config.name, config.ligaField, ligaId);

            report.ligas[ligaName].collections[config.name] = { atual, backup };

            let status = '';
            if (atual === null && backup === null) {
                status = '⏭️  N/A';
            } else if (atual === backup) {
                status = '✅ OK';
            } else if (atual === 0 && backup > 0) {
                status = '❌ VAZIO';
                if (config.critical) {
                    report.problemas.push(`${ligaName}/${config.name}: Vazio (backup: ${backup})`);
                    report.acoes_necessarias.push(`Restaurar ${config.name} para ${ligaName}`);
                }
            } else if (atual < backup) {
                status = `⚠️  -${backup - atual}`;
                if (config.critical && (backup - atual) > 5) {
                    report.problemas.push(`${ligaName}/${config.name}: Faltam ${backup - atual} docs`);
                }
            } else if (atual > backup) {
                status = `📈 +${atual - backup}`;
            } else if (backup === null) {
                status = '📦 Novo';
            }

            const atualStr = atual !== null ? String(atual) : '-';
            const backupStr = backup !== null ? String(backup) : '-';
            console.log(`   ${config.name.padEnd(25)}${atualStr.padStart(8)}${backupStr.padStart(10)}  ${status}`);
        }
    }

    // Verificar ligas cadastradas
    console.log(`\n${'─'.repeat(70)}`);
    console.log('📋 LIGAS CADASTRADAS:');
    const ligas = await db.collection('ligas').find({}).toArray();
    for (const liga of ligas) {
        const timesCount = liga.times?.length || 0;
        const modulos = liga.modulos_ativos || {};
        const modulosAtivos = Object.entries(modulos).filter(([k, v]) => v).map(([k]) => k);
        console.log(`   ${liga.nome}: ${timesCount} times, módulos: ${modulosAtivos.join(', ') || 'nenhum'}`);
    }

    // Verificar times
    console.log(`\n${'─'.repeat(70)}`);
    console.log('👥 TIMES (collection times):');
    const timesTotal = await db.collection('times').countDocuments({});
    const timesAtivos = await db.collection('times').countDocuments({ ativo: { $ne: false } });
    const timesInativos = await db.collection('times').countDocuments({ ativo: false });
    console.log(`   Total: ${timesTotal}, Ativos: ${timesAtivos}, Inativos: ${timesInativos}`);

    // Resumo
    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 RESUMO DA AUDITORIA');
    console.log('═'.repeat(70));

    if (report.problemas.length === 0) {
        console.log('✅ NENHUM PROBLEMA CRÍTICO ENCONTRADO');
    } else {
        console.log(`❌ ${report.problemas.length} PROBLEMAS ENCONTRADOS:`);
        report.problemas.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
    }

    if (report.acoes_necessarias.length > 0) {
        console.log(`\n🔧 AÇÕES NECESSÁRIAS:`);
        report.acoes_necessarias.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
    }

    console.log('═'.repeat(70));

    await client.close();

    // Salvar relatório
    const reportPath = path.join(__dirname, '../data/audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
