// Lista todos os participantes sem extrato financeiro para 2025

import mongoose from 'mongoose';
import dbConnect from '../config/database.js';

async function main() {
  await dbConnect();
  const db = mongoose.connection.db;

  // Buscar todos os times ativos em 2025
  const times = await db.collection('times').find({ temporada: 2025, ativo: true }).toArray();
  const timeIds = times.map(t => t.id);

  // Buscar todos os extratos de 2025
  const extratos = await db.collection('extratofinanceirocaches').find({ temporada: 2025 }).toArray();
  const extratoIds = extratos.map(e => e.time_id);

  // Participantes sem extrato
  const semExtrato = times.filter(t => !extratoIds.includes(t.id));

  if (semExtrato.length === 0) {
    console.log('Todos os participantes ativos possuem extrato para 2025.');
  } else {
    console.log('Participantes SEM extrato financeiro 2025:');
    semExtrato.forEach(t => {
      console.log(`- ${t.nome_time} (${t.nome_cartoleiro}) | time_id: ${t.id}`);
    });
    console.log(`Total: ${semExtrato.length}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
