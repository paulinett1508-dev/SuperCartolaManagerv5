/**
 * Script: Propagar valores de ranking_rodada do moduleconfigs → liga.configuracoes
 * Para: Super Cartola 2026 (35 participantes)
 */
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const LIGA_ID = '684cb1c8af923da7c7df51de';

async function main() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db();

    // 1. Buscar valores do moduleconfigs (tentar string e ObjectId)
    let moduleConfig = await db.collection('moduleconfigs').findOne({
        liga_id: LIGA_ID,
        modulo: 'ranking_rodada'
    });

    if (!moduleConfig) {
        moduleConfig = await db.collection('moduleconfigs').findOne({
            liga_id: new ObjectId(LIGA_ID),
            modulo: 'ranking_rodada'
        });
    }

    if (!moduleConfig) {
        // Fallback: buscar qualquer ranking_rodada
        const all = await db.collection('moduleconfigs').find({ modulo: 'ranking_rodada' }).toArray();
        console.log('Todos moduleconfigs ranking_rodada:', all.length, all.map(m => ({ id: m._id, liga: m.liga_id, tipo: typeof m.liga_id })));
        console.error('❌ ModuleConfig não encontrado para ranking_rodada');
        process.exit(1);
    }

    console.log('✅ ModuleConfig encontrado:', moduleConfig._id, 'liga_id tipo:', typeof moduleConfig.liga_id);

    const valoresManuais = moduleConfig.wizard_respostas?.valores_manual;
    if (!valoresManuais || Object.keys(valoresManuais).length === 0) {
        console.error('❌ valores_manual vazio no moduleconfig');
        process.exit(1);
    }

    console.log('✅ valores_manual encontrados:', Object.keys(valoresManuais).length, 'posições');

    // 2. Converter para formato { posicao: valor (Number) }
    const valores = {};
    let inicioCredito = null, fimCredito = null;
    let inicioNeutro = null, fimNeutro = null;
    let inicioDebito = null, fimDebito = null;

    const posicoes = Object.keys(valoresManuais).map(Number).sort((a, b) => a - b);
    const totalParticipantes = posicoes.length;

    for (const pos of posicoes) {
        const val = Number(valoresManuais[pos]) || 0;
        valores[String(pos)] = val;

        if (val > 0) {
            if (inicioCredito === null) inicioCredito = pos;
            fimCredito = pos;
        } else if (val < 0) {
            if (inicioDebito === null) inicioDebito = pos;
            fimDebito = pos;
        } else {
            if (inicioNeutro === null) inicioNeutro = pos;
            fimNeutro = pos;
        }
    }

    const faixas = {
        credito: { inicio: inicioCredito || 1, fim: fimCredito || 1 },
        neutro: { inicio: inicioNeutro || fimCredito + 1, fim: fimNeutro || inicioDebito - 1 },
        debito: { inicio: inicioDebito || totalParticipantes, fim: fimDebito || totalParticipantes }
    };

    console.log('📊 Faixas calculadas:', JSON.stringify(faixas));
    console.log(`   Crédito: ${faixas.credito.inicio}-${faixas.credito.fim} (${faixas.credito.fim - faixas.credito.inicio + 1} posições)`);
    console.log(`   Neutro:  ${faixas.neutro.inicio}-${faixas.neutro.fim} (${faixas.neutro.fim - faixas.neutro.inicio + 1} posições)`);
    console.log(`   Débito:  ${faixas.debito.inicio}-${faixas.debito.fim} (${faixas.debito.fim - faixas.debito.inicio + 1} posições)`);

    // 3. Montar objeto de configuração
    const rankingRodadaConfig = {
        descricao: 'Bônus/ônus por posição na rodada',
        configurado: true,
        total_participantes: totalParticipantes,
        valores,
        faixas
    };

    console.log('\n📝 Config a ser gravada:');
    console.log(JSON.stringify(rankingRodadaConfig, null, 2));

    // 4. Atualizar liga
    const result = await db.collection('ligas').updateOne(
        { _id: new ObjectId(LIGA_ID) },
        {
            $set: {
                'configuracoes.ranking_rodada': rankingRodadaConfig
            }
        }
    );

    console.log('\n✅ Liga atualizada:', result.modifiedCount, 'documento(s)');

    // 5. Também marcar moduleconfig como configurado
    await db.collection('moduleconfigs').updateOne(
        { _id: moduleConfig._id },
        {
            $set: {
                configurado: true,
                atualizado_em: new Date(),
                atualizado_por: 'script-propagacao'
            }
        }
    );

    console.log('✅ ModuleConfig marcado como configurado');

    await client.close();
    console.log('\n🏁 Propagação concluída com sucesso!');
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
