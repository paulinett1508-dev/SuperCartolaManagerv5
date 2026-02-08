import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function query() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const ligaId = '684cb1c8af923da7c7df51de';
    
    // All moduleconfigs for this liga with pontos_corridos
    const configs = await db.collection('moduleconfigs').find({
        liga_id: ligaId,
        modulo: 'pontos_corridos'
    }).toArray();
    
    // Also try with ObjectId
    const configs2 = await db.collection('moduleconfigs').find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        modulo: 'pontos_corridos'
    }).toArray();
    
    console.log('=== STRING liga_id ===');
    console.log(JSON.stringify(configs, null, 2));
    
    console.log('\n=== OBJECTID liga_id ===');
    console.log(JSON.stringify(configs2, null, 2));
    
    // Also get ALL configs for 2025 regardless of module
    console.log('\n=== ALL CONFIGS 2025 ===');
    const all2025 = await db.collection('moduleconfigs').find({
        liga_id: ligaId,
        temporada: 2025
    }).toArray();
    console.log('Count:', all2025.length);
    all2025.forEach(c => {
        console.log(`  modulo: ${c.modulo} | configurado: ${c.configurado} | ativo: ${c.ativo}`);
        if (c.modulo === 'pontos_corridos') {
            console.log('  FULL:', JSON.stringify(c, null, 2));
        }
    });
    
    // Also try 2025 with ObjectId
    console.log('\n=== ALL CONFIGS 2025 (ObjectId) ===');
    const all2025oid = await db.collection('moduleconfigs').find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: 2025
    }).toArray();
    console.log('Count:', all2025oid.length);
    all2025oid.forEach(c => {
        console.log(`  modulo: ${c.modulo} | configurado: ${c.configurado} | ativo: ${c.ativo}`);
        if (c.modulo === 'pontos_corridos') {
            console.log('  FULL:', JSON.stringify(c, null, 2));
        }
    });
    
    // Also get ALL configs for 2026
    console.log('\n=== ALL CONFIGS 2026 (String) ===');
    const all2026 = await db.collection('moduleconfigs').find({
        liga_id: ligaId,
        temporada: 2026
    }).toArray();
    console.log('Count:', all2026.length);
    all2026.forEach(c => {
        console.log(`  modulo: ${c.modulo} | configurado: ${c.configurado} | ativo: ${c.ativo}`);
        if (c.modulo === 'pontos_corridos') {
            console.log('  FULL:', JSON.stringify(c, null, 2));
        }
    });
    
    console.log('\n=== ALL CONFIGS 2026 (ObjectId) ===');
    const all2026oid = await db.collection('moduleconfigs').find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: 2026
    }).toArray();
    console.log('Count:', all2026oid.length);
    all2026oid.forEach(c => {
        console.log(`  modulo: ${c.modulo} | configurado: ${c.configurado} | ativo: ${c.ativo}`);
        if (c.modulo === 'pontos_corridos') {
            console.log('  FULL:', JSON.stringify(c, null, 2));
        }
    });
    
    await mongoose.disconnect();
}

query();
