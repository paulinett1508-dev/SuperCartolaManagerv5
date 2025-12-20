import mongoose from 'mongoose';
import Liga from '../models/Liga.js';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
await mongoose.connect(uri);

const liga = await Liga.findById('684d821cf1a7ae16d1f89572');
console.log('Liga encontrada:', liga ? 'SIM' : 'NAO');
console.log('Nome:', liga?.nome);
console.log('Configuracoes existe:', liga?.configuracoes ? 'SIM' : 'NAO');
console.log('ranking_rodada existe:', liga?.configuracoes?.ranking_rodada ? 'SIM' : 'NAO');
console.log('Chaves em configuracoes:', Object.keys(liga?.configuracoes || {}));
console.log('\nEstrutura ranking_rodada:');
console.log(JSON.stringify(liga?.configuracoes?.ranking_rodada, null, 2));

await mongoose.disconnect();
