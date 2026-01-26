/**
 * Script: Migrar Logos das Ligas para o Banco de Dados
 *
 * Este script popula o campo 'logo' das ligas existentes
 * baseado nas regras que estavam hardcoded.
 *
 * Uso:
 *   node scripts/migrar-logos-ligas.js --dry-run   # Simula
 *   node scripts/migrar-logos-ligas.js --force     # Executa
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Mapeamento de logos (migração das regras hardcoded)
const LOGO_MAPPING = [
    { pattern: /super/i, logo: 'img/logo-supercartola.png' },
    { pattern: /sobral|cartoleiros/i, logo: 'img/logo-cartoleirossobral.png' },
    { pattern: /fulero/i, logo: 'img/logo-osfuleros.png' },
];

function obterLogoParaNome(nomeLiga) {
    const nome = (nomeLiga || '').toLowerCase();
    for (const mapping of LOGO_MAPPING) {
        if (mapping.pattern.test(nome)) {
            return mapping.logo;
        }
    }
    return null;
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (!isDryRun && !isForce) {
        console.log('❌ Use --dry-run para simular ou --force para executar');
        process.exit(1);
    }

    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado!\n');

    const Liga = mongoose.connection.collection('ligas');

    // Buscar todas as ligas
    const ligas = await Liga.find({}).toArray();
    console.log(`📊 Total de ligas: ${ligas.length}\n`);

    let atualizadas = 0;
    let semAlteracao = 0;

    for (const liga of ligas) {
        const logoAtual = liga.logo;
        const logoSugerida = obterLogoParaNome(liga.nome);

        if (logoAtual) {
            console.log(`⏭️  ${liga.nome}: já tem logo (${logoAtual})`);
            semAlteracao++;
            continue;
        }

        if (!logoSugerida) {
            console.log(`⚪ ${liga.nome}: sem logo mapeada`);
            semAlteracao++;
            continue;
        }

        console.log(`🔄 ${liga.nome}: ${logoAtual || 'null'} -> ${logoSugerida}`);

        if (isForce) {
            await Liga.updateOne(
                { _id: liga._id },
                { $set: { logo: logoSugerida, atualizadaEm: new Date() } }
            );
            atualizadas++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 RESUMO:`);
    console.log(`   - Atualizadas: ${atualizadas}`);
    console.log(`   - Sem alteração: ${semAlteracao}`);
    console.log(`   - Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'FORCE (executado)'}`);
    console.log('='.repeat(50));

    await mongoose.disconnect();
    console.log('\n✅ Concluído!');
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
