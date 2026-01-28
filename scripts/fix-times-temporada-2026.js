#!/usr/bin/env node
/**
 * Script para corrigir times da Super Cartola que estão sem temporada 2026
 * 
 * Times faltantes identificados:
 * - 22623329 (WorldTreta FC - Emerson)
 * - 164131 (51 Sportclub - JB Oliveira)
 * - 1233737 (Wil08 - Wildemar Silva)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

const TIMES_FALTANDO = [22623329, 164131, 1233737];
const LIGA_SUPERCARTOLA = '684cb1c8af923da7c7df51de';

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const force = args.includes('--force');
    
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   FIX TIMES TEMPORADA 2026 - Super Cartola               ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🔧 Modo: ${dryRun ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}`);
    console.log('');
    
    // Verificar URI do MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ ERRO: Variável MONGODB_URI não definida');
        process.exit(1);
    }
    
    // Conectar ao MongoDB
    console.log('📡 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');
    console.log('');
    
    const db = mongoose.connection.db;
    const timesCollection = db.collection('times');
    
    // 1. Verificar estado atual dos times
    console.log('🔍 DIAGNÓSTICO DOS TIMES FALTANDO:');
    console.log('─'.repeat(50));
    
    for (const timeId of TIMES_FALTANDO) {
        const time = await timesCollection.findOne({ id: timeId });
        
        if (!time) {
            console.log(`❌ Time ${timeId}: NÃO EXISTE no banco`);
        } else {
            const temTemporada = time.temporada !== undefined && time.temporada !== null;
            console.log(`📋 Time ${timeId}:`);
            console.log(`   Nome: ${time.nome_time || 'N/D'}`);
            console.log(`   Cartoleiro: ${time.nome_cartoleiro || 'N/D'}`);
            console.log(`   Temporada: ${time.temporada || 'NÃO DEFINIDA'}`);
            console.log(`   Liga ID: ${time.liga_id || 'NÃO DEFINIDA'}`);
            console.log(`   Ativo: ${time.ativo !== false}`);
            console.log('');
        }
    }
    
    // 2. Executar correção
    if (!dryRun) {
        console.log('');
        console.log('🔧 APLICANDO CORREÇÕES...');
        console.log('─'.repeat(50));
        
        let corrigidos = 0;
        
        for (const timeId of TIMES_FALTANDO) {
            const time = await timesCollection.findOne({ id: timeId });
            
            if (!time) {
                console.log(`⚠️  Time ${timeId} não existe - pulando`);
                continue;
            }
            
            // Verificar se precisa atualizar
            if (time.temporada === 2026 && time.liga_id === LIGA_SUPERCARTOLA) {
                console.log(`✅ Time ${timeId} já está correto`);
                continue;
            }
            
            // Atualizar
            const resultado = await timesCollection.updateOne(
                { id: timeId },
                {
                    $set: {
                        temporada: 2026,
                        liga_id: LIGA_SUPERCARTOLA,
                        ativo: true,
                        updatedAt: new Date()
                    }
                }
            );
            
            if (resultado.modifiedCount > 0) {
                console.log(`✅ Time ${timeId} (${time.nome_time}) ATUALIZADO`);
                console.log(`   → temporada: 2026`);
                console.log(`   → liga_id: ${LIGA_SUPERCARTOLA}`);
                corrigidos++;
            } else {
                console.log(`⚠️  Time ${timeId} não foi modificado`);
            }
        }
        
        console.log('');
        console.log('═'.repeat(50));
        console.log(`📊 RESUMO: ${corrigidos}/${TIMES_FALTANDO.length} times corrigidos`);
    }
    
    // 3. Verificar resultado final
    console.log('');
    console.log('🔍 VERIFICAÇÃO FINAL:');
    console.log('─'.repeat(50));
    
    const timesCom2026 = await timesCollection.countDocuments({ temporada: 2026 });
    const timesSuperCartola2026 = await timesCollection.countDocuments({
        temporada: 2026,
        liga_id: LIGA_SUPERCARTOLA
    });
    
    console.log(`📊 Total de times com temporada 2026: ${timesCom2026}`);
    console.log(`📊 Times da Super Cartola 2026: ${timesSuperCartola2026}`);
    
    // Verificar os 3 times específicos
    console.log('');
    console.log('📋 Status dos 3 times específicos:');
    for (const timeId of TIMES_FALTANDO) {
        const time = await timesCollection.findOne({ id: timeId });
        const status = time && time.temporada === 2026 ? '✅' : '❌';
        const nome = time?.nome_time || 'N/A';
        console.log(`   ${status} ${timeId}: ${nome} (temporada: ${time?.temporada || 'N/D'})`);
    }
    
    await mongoose.disconnect();
    console.log('');
    console.log('🏁 Script finalizado');
}

main().catch(err => {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
});
