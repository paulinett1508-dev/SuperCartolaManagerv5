import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PushSubscription from '../models/PushSubscription.js';

dotenv.config();

/**
 * Script para configurar a collection push_subscriptions
 * - Cria collection se não existir
 * - Cria índices necessários
 * - Valida estrutura
 */
async function setupPushCollection() {
  try {
    console.log('🔌 Conectando ao MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Conectado ao MongoDB!\n');

    // Criar índices
    console.log('📊 Criando índices...');
    await PushSubscription.createIndexes();
    console.log('✅ Índices criados!\n');

    // Listar índices existentes
    const indexes = await PushSubscription.collection.getIndexes();
    console.log('📋 Índices da collection push_subscriptions:');
    console.log(JSON.stringify(indexes, null, 2));
    console.log('');

    // Verificar quantidade de documentos
    const count = await PushSubscription.countDocuments();
    console.log(`📄 Total de subscriptions: ${count}\n`);

    // Testar inserção (dry-run)
    console.log('🧪 Testando estrutura do modelo...');
    const testDoc = new PushSubscription({
      timeId: '99999999',
      endpoint: 'https://test-endpoint.example.com/push/test',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      },
      preferences: {
        rodadaConsolidada: true,
        mitoMico: true,
        escalacaoPendente: false,
        acertosFinanceiros: false
      }
    });

    const validationError = testDoc.validateSync();
    if (validationError) {
      console.error('❌ Erro de validação:', validationError);
    } else {
      console.log('✅ Modelo validado com sucesso!\n');
    }

    console.log('🎉 Setup da collection concluído!\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Criar controllers/notificationsController.js');
    console.log('   2. Criar routes/notifications-routes.js');
    console.log('   3. Integrar rotas no index.js');

  } catch (erro) {
    console.error('❌ Erro ao configurar collection:', erro);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

setupPushCollection();
