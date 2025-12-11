import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

// Buscar IDs dos times da liga
const liga = await mongoose.connection.db.collection('ligas').findOne({
  _id: new mongoose.Types.ObjectId('684d821cf1a7ae16d1f89572')
});

console.log('=== TIMES DA LIGA ===');
console.log('IDs:', liga.times);

// Buscar dados dos times
const times = await mongoose.connection.db.collection('times').find({
  id: { $in: liga.times }
}).toArray();

console.log('\n=== STATUS DOS TIMES ===');
times.forEach(t => {
  console.log(`${t.id} | ${t.nome_time} | ativo: ${t.ativo} | rodada_desistencia: ${t.rodada_desistencia}`);
});

// Rodada 38
const r38 = await mongoose.connection.db.collection('rodadas').find({
  ligaId: new mongoose.Types.ObjectId('684d821cf1a7ae16d1f89572'),
  rodada: 38
}).sort({ posicao: 1 }).toArray();

console.log('\n=== RODADA 38 ===');
r38.forEach(r => {
  console.log(`${r.posicao}° ${r.nome_cartola}: ${r.pontos.toFixed(2)} pts | R$ ${r.valorFinanceiro}`);
});

process.exit(0);