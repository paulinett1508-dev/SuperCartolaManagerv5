/**
 * Teste Multi-Tenant - Verifica isolamento de ligas por admin
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function testarMultiTenant() {
    console.log('=== TESTE MULTI-TENANT ===\n');

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // IDs dos admins
    const OWNER_ID = '694f11e2df76d7f81b948523';
    const TESTE_ID = '695913c52c92d7371dc45212';

    // Buscar ligas do OWNER (Super Admin - ve todas)
    const ligasOwner = await db.collection('ligas').find({}).toArray();
    console.log('[OWNER] Total de ligas no banco: ' + ligasOwner.length);
    ligasOwner.forEach(l => console.log('  - ' + l.nome + ' (admin_id: ' + l.admin_id + ')'));

    console.log('');

    // Buscar ligas do ADMIN DE TESTE (ve apenas as dele)
    const ligasTeste = await db.collection('ligas').find({
        admin_id: new mongoose.Types.ObjectId(TESTE_ID)
    }).toArray();
    console.log('[TESTE] Ligas do admin de teste: ' + ligasTeste.length);

    if (ligasTeste.length === 0) {
        console.log('  (nenhuma liga - deve redirecionar para wizard)');
        console.log('\n✅ ISOLAMENTO FUNCIONANDO CORRETAMENTE!');
    } else {
        console.log('  ⚠️ Admin de teste nao deveria ver nenhuma liga');
    }

    // Contar ligas do owner
    const ligasDoOwner = ligasOwner.filter(l => l.admin_id && l.admin_id.toString() === OWNER_ID);

    console.log('\n=== RESUMO ===');
    console.log('Owner ID: ' + OWNER_ID);
    console.log('Teste ID: ' + TESTE_ID);
    console.log('Ligas vinculadas ao owner: ' + ligasDoOwner.length);
    console.log('Ligas do admin teste: ' + ligasTeste.length);

    await mongoose.disconnect();
}

testarMultiTenant().catch(console.error);
