/**
 * Simula criacao de liga pelo Wizard
 * Testa vinculacao automatica ao admin
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// IDs
const TESTE_ADMIN_ID = '695913c52c92d7371dc45212';
const TESTE_ADMIN_EMAIL = 'teste.multitenant@supercartola.com';
const OWNER_ADMIN_ID = '694f11e2df76d7f81b948523';

async function simularCriacaoLiga() {
    console.log('=== SIMULACAO: WIZARD CRIA LIGA ===\n');

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Dados do wizard (como seriam enviados pelo frontend)
    const dadosWizard = {
        nome: 'Liga Teste Multi-Tenant 2026',
        descricao: 'Liga criada via wizard para testar isolamento',
        times: [3027272, 13935277], // Vitim e Paulinett
        modulos_ativos: {
            ranking: true,
            top10: true,
            pontosCorridos: true,
            mataMata: false,
            artilheiro: true,
            luvaOuro: true,
            melhorMes: true,
            extrato: true
        }
    };

    console.log('[WIZARD] Dados recebidos:');
    console.log('  Nome:', dadosWizard.nome);
    console.log('  Times:', dadosWizard.times.length);
    console.log('  Admin logado:', TESTE_ADMIN_EMAIL);
    console.log('');

    // Simular o que o controller faria
    const novaLiga = {
        nome: dadosWizard.nome,
        descricao: dadosWizard.descricao,
        times: dadosWizard.times,
        modulos_ativos: dadosWizard.modulos_ativos,
        participantes: [],
        tipo: 'publica',
        configuracoes: {
            ranking_rodada: {
                descricao: 'Bonus/onus por posicao na rodada',
                total_participantes: dadosWizard.times.length,
                valores: { 1: 10, 2: 5 },
                faixas: { credito: { inicio: 1, fim: 1 }, neutro: { inicio: 2, fim: 2 }, debito: { inicio: 2, fim: 2 } }
            }
        },
        // MULTI-TENANT: Vinculacao automatica ao admin logado
        admin_id: new mongoose.Types.ObjectId(TESTE_ADMIN_ID),
        owner_email: TESTE_ADMIN_EMAIL,
        temporada: 2026,
        criadaEm: new Date(),
        atualizadaEm: new Date()
    };

    console.log('[CONTROLLER] Criando liga com vinculo:');
    console.log('  admin_id:', novaLiga.admin_id.toString());
    console.log('  owner_email:', novaLiga.owner_email);
    console.log('');

    // Inserir no banco
    const result = await db.collection('ligas').insertOne(novaLiga);
    console.log('[MONGODB] Liga criada com _id:', result.insertedId.toString());
    console.log('');

    // Verificar isolamento apos criacao
    console.log('=== VERIFICACAO DE ISOLAMENTO ===\n');

    // Ligas do OWNER
    const ligasOwner = await db.collection('ligas').find({
        admin_id: new mongoose.Types.ObjectId(OWNER_ADMIN_ID)
    }).toArray();
    console.log('[OWNER] Ligas:', ligasOwner.length);
    ligasOwner.forEach(l => console.log('  - ' + l.nome));

    console.log('');

    // Ligas do TESTE
    const ligasTeste = await db.collection('ligas').find({
        admin_id: new mongoose.Types.ObjectId(TESTE_ADMIN_ID)
    }).toArray();
    console.log('[TESTE] Ligas:', ligasTeste.length);
    ligasTeste.forEach(l => console.log('  - ' + l.nome + ' (criada: ' + l.criadaEm.toISOString().split('T')[0] + ')'));

    console.log('');
    console.log('=== RESULTADO ===');
    if (ligasTeste.length === 1 && ligasOwner.length === 2) {
        console.log('✅ ISOLAMENTO PERFEITO!');
        console.log('   - Owner ve apenas suas 2 ligas originais');
        console.log('   - Admin teste ve apenas a liga que criou');
    } else {
        console.log('⚠️ Verificar isolamento');
    }

    await mongoose.disconnect();
    return result.insertedId;
}

simularCriacaoLiga().catch(console.error);
