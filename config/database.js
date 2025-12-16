
// config/database.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// =========================================================================
// 🔐 SELEÇÃO DE AMBIENTE DE BANCO DE DADOS (Prod vs Dev)
// =========================================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const getMongoURI = () => {
  if (IS_PRODUCTION) {
    // 🔴 PRODUÇÃO - Banco de dados real
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ ERRO FATAL: Variável MONGO_URI não configurada!');
      console.error('   Configure a secret MONGO_URI no Replit para produção.');
      process.exit(1);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔴  ATENÇÃO: RODANDO EM PRODUÇÃO - BANCO DE DADOS REAL!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    return uri;
  } else {
    // 🟢 DESENVOLVIMENTO - Banco de dados seguro para testes
    const uri = process.env.MONGO_URI_DEV;
    if (!uri) {
      console.error('❌ ERRO FATAL: Variável MONGO_URI_DEV não configurada!');
      console.error('   Configure a secret MONGO_URI_DEV no Replit para desenvolvimento.');
      process.exit(1);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🟢  AMBIENTE DE DESENVOLVIMENTO (SAFE) - Banco de testes');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    return uri;
  }
};

// Configurações modernas do Mongoose (sem opções deprecated)
const connectDB = async () => {
  try {
    // Configurações recomendadas para Mongoose 6+
    mongoose.set('strictQuery', false);

    // Obter URI baseada no ambiente
    const mongoURI = getMongoURI();

    // Configurações otimizadas para performance
    const options = {
      maxPoolSize: 50,        // Aumentar pool de conexões
      minPoolSize: 10,        // Manter conexões abertas
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    
    // Event listeners para monitoramento da conexão
    mongoose.connection.on('connected', () => {
      console.log('Mongoose conectado ao MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Erro na conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose desconectado do MongoDB');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexão MongoDB fechada devido ao encerramento da aplicação');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;
