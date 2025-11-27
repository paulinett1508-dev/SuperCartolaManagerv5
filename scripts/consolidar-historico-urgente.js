
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684cb1c8af923da7c7df51de'; // Super Cartola 2025
const RODADA_INICIO = 1;
const RODADA_FIM = 35;

async function executarConsolidacao() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado');
        
        const baseUrl = 'http://localhost:5000';
        
        console.log(`🚀 Consolidando rodadas ${RODADA_INICIO}-${RODADA_FIM}...`);
        
        const response = await fetch(
            `${baseUrl}/api/consolidacao/ligas/${LIGA_ID}/consolidar-historico?rodadaInicio=${RODADA_INICIO}&rodadaFim=${RODADA_FIM}`,
            { method: 'POST' }
        );
        
        const resultado = await response.json();
        
        console.log('\n📊 RESULTADO:');
        console.log(`Total: ${resultado.total} rodadas`);
        console.log(`✅ Sucessos: ${resultado.sucessos}`);
        console.log(`❌ Falhas: ${resultado.falhas}`);
        
        if (resultado.falhas > 0) {
            console.log('\n⚠️ Rodadas com erro:');
            resultado.detalhes.filter(d => !d.success).forEach(d => {
                console.log(`  R${d.rodada}: ${d.error}`);
            });
        }
        
        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

executarConsolidacao();
