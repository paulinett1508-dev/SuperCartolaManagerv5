
// config/database.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

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
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    
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
