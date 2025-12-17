
// config/database.js
// =========================================================================
// 🔐 CONEXÃO MONGODB - REPLIT WORKFLOW
// =========================================================================
// FLUXO:
//   - Run (Workspace)  → NODE_ENV=development → MONGO_URI_DEV (Banco de Testes)
//   - Deploy (Publish) → NODE_ENV=production  → MONGO_URI     (Banco Oficial)
// =========================================================================

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// =========================================================================
// 🎨 CORES ANSI PARA TERMINAL
// =========================================================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// =========================================================================
// 🔐 DETECÇÃO DE AMBIENTE
// =========================================================================
// Regra: APENAS 'production' explícito usa banco de produção
// Qualquer outro valor (undefined, 'development', 'dev', etc) → usa DEV
// =========================================================================
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const getMongoURI = () => {
  // Log do ambiente detectado
  console.log('');
  console.log(`${colors.cyan}[DATABASE] NODE_ENV detectado: "${NODE_ENV}"${colors.reset}`);

  if (IS_PRODUCTION) {
    // =========================================================================
    // 🔴 PRODUÇÃO - Banco de dados OFICIAL (dados reais)
    // =========================================================================
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error(`${colors.red}${colors.bright}❌ ERRO FATAL: Variável MONGO_URI não configurada!${colors.reset}`);
      console.error('   Configure a Secret MONGO_URI no Replit para produção.');
      process.exit(1);
    }
    console.log(`${colors.bgRed}${colors.bright}                                                               ${colors.reset}`);
    console.log(`${colors.bgRed}${colors.bright}  🚀 MODO PROD: Conectando ao Banco OFICIAL                    ${colors.reset}`);
    console.log(`${colors.bgRed}${colors.bright}     Cuidado! Alterações afetam dados reais.                   ${colors.reset}`);
    console.log(`${colors.bgRed}${colors.bright}                                                               ${colors.reset}`);
    console.log('');
    return uri;

  } else {
    // =========================================================================
    // 🧪 DESENVOLVIMENTO - Banco de TESTES (seguro para experimentos)
    // =========================================================================
    const uri = process.env.MONGO_URI_DEV;
    if (!uri) {
      console.error(`${colors.red}${colors.bright}❌ ERRO FATAL: Variável MONGO_URI_DEV não configurada!${colors.reset}`);
      console.error('   Configure a Secret MONGO_URI_DEV no Replit para desenvolvimento.');
      console.error('');
      console.error(`${colors.yellow}   Dica: Se quiser forçar produção, defina NODE_ENV=production${colors.reset}`);
      process.exit(1);
    }
    console.log(`${colors.bgGreen}${colors.bright}                                                               ${colors.reset}`);
    console.log(`${colors.bgGreen}${colors.bright}  🧪 MODO DEV: Conectando ao Banco de TESTES                   ${colors.reset}`);
    console.log(`${colors.bgGreen}${colors.bright}     Ambiente seguro para experimentos.                        ${colors.reset}`);
    console.log(`${colors.bgGreen}${colors.bright}                                                               ${colors.reset}`);
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

    // Extrair nome do banco da URI
    const dbName = conn.connection.name || 'unknown';
    const host = conn.connection.host;

    console.log(`${colors.green}${colors.bright}✅ MongoDB conectado com sucesso!${colors.reset}`);
    console.log(`   ${colors.blue}Host:${colors.reset} ${host}`);
    console.log(`   ${colors.blue}Banco:${colors.reset} ${dbName}`);
    console.log('');
    
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
