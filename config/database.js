
// config/database.js
// =========================================================================
// 🔐 CONEXÃO MONGODB - BANCO ÚNICO (DEV e PROD)
// =========================================================================
// ESTRATÉGIA:
//   - DEV e PROD conectam no MESMO banco MongoDB
//   - Diferenciação apenas via NODE_ENV (logs e proteções)
//   - Dados são perpétuos após consolidação de rodadas
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
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const ENV_LABEL = IS_PRODUCTION ? '🟢 PROD' : '🔵 DEV';

// ✅ Banco único (REAL) para DEV e PROD
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(`${colors.red}${colors.bright}❌ ERRO FATAL: Variável MONGO_URI não configurada!${colors.reset}`);
  console.error('   Configure a Secret MONGO_URI nos Replit Secrets.');
  process.exit(1);
}

// Configurações modernas do Mongoose (sem opções deprecated)
const connectDB = async () => {
  try {
    // Configurações recomendadas para Mongoose 6+
    mongoose.set('strictQuery', false);

    // Configurações otimizadas para performance
    const options = {
      maxPoolSize: 50,        // Aumentar pool de conexões
      minPoolSize: 10,        // Manter conexões abertas
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(MONGO_URI, options);

    // Extrair nome do banco da URI
    const dbName = conn.connection.name || 'unknown';
    const host = conn.connection.host;

    console.log('');
    console.log(`${colors.green}${colors.bright}✅ MongoDB conectado [${ENV_LABEL}]${colors.reset}`);
    console.log(`   ${colors.blue}Host:${colors.reset} ${host}`);
    console.log(`   ${colors.blue}Banco:${colors.reset} ${dbName}`);
    
    // ⚠️ Avisar se estiver em DEV com banco real
    if (!IS_PRODUCTION) {
      console.log(`${colors.yellow}⚠️  Modo DEV: Conectado no banco REAL (somente leitura recomendado)${colors.reset}`);
    }
    console.log('');
    
    // Event listeners para monitoramento da conexão
    mongoose.connection.on('connected', () => {
      console.log(`Mongoose conectado ao MongoDB [${ENV_LABEL}]`);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error(`❌ Erro de conexão MongoDB [${ENV_LABEL}]:`, err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log(`Mongoose desconectado do MongoDB [${ENV_LABEL}]`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexão MongoDB fechada devido ao encerramento da aplicação');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error(`❌ Erro ao conectar ao MongoDB [${ENV_LABEL}]:`, error.message);
    process.exit(1);
  }
};

// Função helper para obter o banco de dados (usado em rotas)
export function getDB() {
  if (!mongoose.connection.readyState) {
    throw new Error('MongoDB não está conectado. Chame connectDB() primeiro.');
  }
  return mongoose.connection.db;
}

export default connectDB;
