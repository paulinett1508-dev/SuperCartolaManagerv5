import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const client = new MongoClient(uri);

async function verificar() {
  try {
    await client.connect();
    const db = client.db();
    
    const count = await db.collection('rodadasnapshots').countDocuments({ 
      liga_id: '684d821cf1a7ae16d1f89572' 
    });
    
    console.log('\n📊 RESULTADO:');
    console.log('Documentos:', count);
    
    if (count > 0) {
      console.log('✅ TEM DADOS!\n');
      
      const ex = await db.collection('rodadasnapshots').findOne({ 
        liga_id: '684d821cf1a7ae16d1f89572' 
      });
      
      console.log('Rodada:', ex.rodada);
      console.log('Tem ranking?', !!ex.dados_consolidados?.ranking_rodada);
      console.log('Times:', ex.dados_consolidados?.ranking_rodada?.length || 0);
    } else {
      console.log('❌ SEM DADOS');
    }
    
  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await client.close();
  }
}

verificar();
