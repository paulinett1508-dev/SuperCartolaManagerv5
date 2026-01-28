import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function verificarFinal() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   VERIFICAÇÃO FINAL - Times Temporada 2026              ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Buscar todas as ligas ativas em 2026
    const ligas = await db.collection('ligas').find({
        ativa: true,
        temporada: 2026
    }).toArray();
    
    console.log('📊 LIGAS ATIVAS 2026:', ligas.length);
    console.log('');
    
    // Buscar todos os times com temporada 2026
    const times2026 = await db.collection('times').find({ temporada: 2026 }).toArray();
    const timesIds = new Set(times2026.map(t => t.id));
    
    console.log('📊 TIMES COM TEMPORADA 2026:', times2026.length);
    console.log('');
    
    let totalParticipantes = 0;
    let totalEncontrados = 0;
    let totalFaltando = [];
    
    for (const liga of ligas) {
        const timesLiga = liga.times || [];
        const participantes = liga.participantes || [];
        
        console.log(`🏆 ${liga.nome} (${timesLiga.length} times):`);
        
        const faltando = [];
        for (const timeId of timesLiga) {
            if (!timesIds.has(timeId)) {
                const participante = participantes.find(p => p.time_id === timeId);
                faltando.push({
                    id: timeId,
                    nome: participante?.nome_time || 'N/D',
                    cartoleiro: participante?.nome_cartola || 'N/D'
                });
            }
        }
        
        totalParticipantes += timesLiga.length;
        totalEncontrados += (timesLiga.length - faltando.length);
        totalFaltando.push(...faltando);
        
        if (faltando.length === 0) {
            console.log(`   ✅ Todos os ${timesLiga.length} times estão no MongoDB`);
        } else {
            console.log(`   ⚠️ ${faltando.length} times FALTANDO:`);
            faltando.forEach(f => {
                console.log(`      - ${f.id}: ${f.nome} (${f.cartoleiro})`);
            });
        }
        console.log('');
    }
    
    console.log('═'.repeat(60));
    console.log('📊 RESUMO GERAL:');
    console.log(`   Total de participantes em ligas 2026: ${totalParticipantes}`);
    console.log(`   Times encontrados no MongoDB: ${totalEncontrados}`);
    console.log(`   Times faltando: ${totalFaltando.length}`);
    console.log('');
    
    if (totalFaltando.length === 0) {
        console.log('🎉 TODOS OS TIMES ESTÃO CORRETAMENTE PERSISTIDOS NO MONGODB!');
    } else {
        console.log('⚠️ ATENÇÃO: Existem times que precisam ser adicionados');
    }
    
    await mongoose.disconnect();
}

verificarFinal().catch(console.error);
