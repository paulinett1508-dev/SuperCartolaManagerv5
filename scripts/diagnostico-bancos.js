/**
 * DIAGNÓSTICO DE BANCOS DEV vs PROD
 * Mostra diferenças entre os dois ambientes
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI_DEV = process.env.MONGO_URI_DEV;
const MONGO_URI_PROD = process.env.MONGO_URI;

async function analisarBanco(uri, nome) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ANALISANDO BANCO: ${nome}`);
    console.log('='.repeat(60));
    
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        
        // Nome do banco
        const dbName = db.databaseName;
        console.log(`\n🗄️  Database Name: ${dbName}`);
        
        // 1. Total de participantes
        const totalTimes = await db.collection('times').countDocuments();
        const timesAtivos = await db.collection('times').countDocuments({ ativo: true });
        
        // 2. Acertos financeiros
        const totalAcertos = await db.collection('acertofinanceiros').countDocuments();
        const acertosAtivos = await db.collection('acertofinanceiros').countDocuments({ ativo: true });
        
        // 3. Cache de extratos
        const totalCache = await db.collection('extratofinanceirocaches').countDocuments();
        
        // 4. Último acerto registrado
        const ultimoAcerto = await db.collection('acertofinanceiros')
            .find()
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
        
        // 5. Sample de um participante com acertos
        const timeComAcerto = await db.collection('acertofinanceiros')
            .findOne({ ativo: true });
        
        let sampleExtrato = null;
        if (timeComAcerto) {
            sampleExtrato = await db.collection('extratofinanceirocaches')
                .findOne({ timeId: timeComAcerto.timeId });
        }
        
        console.log(`\n✅ Participantes:`);
        console.log(`   Total: ${totalTimes} | Ativos: ${timesAtivos}`);
        
        console.log(`\n💰 Acertos Financeiros:`);
        console.log(`   Total: ${totalAcertos} | Ativos: ${acertosAtivos}`);
        if (ultimoAcerto.length > 0) {
            console.log(`   Último acerto: ${ultimoAcerto[0].createdAt} (${ultimoAcerto[0].tipo})`);
        }
        
        console.log(`\n📦 Cache de Extratos:`);
        console.log(`   Total: ${totalCache}`);
        
        if (timeComAcerto && sampleExtrato) {
            console.log(`\n🔍 SAMPLE - Time ${timeComAcerto.timeId}:`);
            console.log(`   Nome: ${timeComAcerto.nomeTime}`);
            console.log(`   Acerto: ${timeComAcerto.tipo} de R$ ${timeComAcerto.valor}`);
            console.log(`   Cache existe: ${sampleExtrato ? 'SIM' : 'NÃO'}`);
            if (sampleExtrato) {
                console.log(`   Saldo no cache: R$ ${sampleExtrato.saldo_consolidado}`);
                console.log(`   Última atualização: ${sampleExtrato.updatedAt}`);
            }
        }
        
        await mongoose.disconnect();
        return {
            dbName,
            totalTimes,
            timesAtivos,
            totalAcertos,
            acertosAtivos,
            totalCache,
            ultimoAcerto: ultimoAcerto[0]?.createdAt || null
        };
        
    } catch (error) {
        console.error(`❌ ERRO ao conectar em ${nome}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('\n🔍 DIAGNÓSTICO DE BANCOS DEV vs PROD\n');
    
    if (!MONGO_URI_DEV) {
        console.log('⚠️  MONGO_URI_DEV não configurado nos Secrets!');
    }
    if (!MONGO_URI_PROD) {
        console.log('⚠️  MONGO_URI não configurado nos Secrets!');
    }
    
    const resultados = {};
    
    if (MONGO_URI_DEV) {
        resultados.dev = await analisarBanco(MONGO_URI_DEV, 'DEV');
    }
    
    if (MONGO_URI_PROD) {
        resultados.prod = await analisarBanco(MONGO_URI_PROD, 'PROD');
    }
    
    // Comparação
    if (resultados.dev && resultados.prod) {
        console.log(`\n${'='.repeat(60)}`);
        console.log('🔄 COMPARAÇÃO DEV vs PROD');
        console.log('='.repeat(60));
        
        console.log(`\n📋 NOME DOS BANCOS:`);
        console.log(`   DEV:  ${resultados.dev.dbName}`);
        console.log(`   PROD: ${resultados.prod.dbName}`);
        
        const diferencas = [];
        
        if (resultados.dev.totalTimes !== resultados.prod.totalTimes) {
            diferencas.push(`⚠️  Participantes diferentes: DEV=${resultados.dev.totalTimes} | PROD=${resultados.prod.totalTimes}`);
        }
        
        if (resultados.dev.totalAcertos !== resultados.prod.totalAcertos) {
            diferencas.push(`⚠️  Acertos diferentes: DEV=${resultados.dev.totalAcertos} | PROD=${resultados.prod.totalAcertos}`);
        }
        
        if (resultados.dev.totalCache !== resultados.prod.totalCache) {
            diferencas.push(`⚠️  Cache diferente: DEV=${resultados.dev.totalCache} | PROD=${resultados.prod.totalCache}`);
        }
        
        if (diferencas.length === 0) {
            console.log('\n✅ Bancos SINCRONIZADOS (mesma quantidade de dados)');
        } else {
            console.log('\n❌ Bancos DESINCRONIZADOS:\n');
            diferencas.forEach(d => console.log(`   ${d}`));
        }
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
}

main().catch(console.error);

