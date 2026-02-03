/**
 * SCRIPT: Marcar Paulinett Miranda como Premium
 * Adiciona premium: true ao participante owner do sistema
 */

import mongoose from 'mongoose';
import Liga from '../models/Liga.js';

const PAULINETT_TIME_ID = 13935277;

async function setPaulinettPremium() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        // Buscar todas as ligas onde Paulinett participa
        const ligas = await Liga.find({
            'participantes.time_id': PAULINETT_TIME_ID
        });

        console.log(`📋 Encontradas ${ligas.length} liga(s) com Paulinett Miranda:\n`);

        for (const liga of ligas) {
            console.log(`Liga: ${liga.nome} (${liga.temporada})`);

            // Encontrar índice do participante
            const participanteIndex = liga.participantes.findIndex(
                p => p.time_id === PAULINETT_TIME_ID
            );

            if (participanteIndex === -1) {
                console.log('  ⚠️  Participante não encontrado (erro inesperado)');
                continue;
            }

            const participante = liga.participantes[participanteIndex];

            // Verificar status atual
            const premiumAtual = participante.premium;
            console.log(`  Status atual: premium = ${premiumAtual}`);

            if (premiumAtual === true) {
                console.log('  ℹ️  Já está marcado como premium\n');
                continue;
            }

            // Atualizar para premium: true
            liga.participantes[participanteIndex].premium = true;
            await liga.save();

            console.log('  ✅ Atualizado para premium: true\n');
        }

        console.log('✅ Processo concluído!');
        console.log('\nVerificação final:');

        // Verificar resultado
        const ligasAtualizadas = await Liga.find({
            'participantes.time_id': PAULINETT_TIME_ID
        });

        for (const liga of ligasAtualizadas) {
            const participante = liga.participantes.find(
                p => p.time_id === PAULINETT_TIME_ID
            );
            console.log(`  ${liga.nome}: premium = ${participante.premium}`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexão fechada');
    }
}

// Executar
setPaulinettPremium();
