// Script para atualizar nome da liga no MongoDB para 'Super Cartola' (sem ano)

import mongoose from 'mongoose';
import dbConnect from '../config/database.js';

async function atualizarNomeLiga() {
  await dbConnect();
  const db = mongoose.connection.db;

  // Ligas
  const result = await db.collection('ligas').updateMany(
    { nome: { $regex: /^Super Cartola 20[0-9]{2}$/ } },
    { $set: { nome: 'Super Cartola' } }
  );
  console.log('Ligas atualizadas:', result.modifiedCount);

  // LigaRules
  const result2 = await db.collection('ligarules').updateMany(
    { nome: { $regex: /^Super Cartola 20[0-9]{2}$/ } },
    { $set: { nome: 'Super Cartola' } }
  );
  console.log('LigaRules atualizadas:', result2.modifiedCount);

  // InscricoesTemporada
  const result3 = await db.collection('inscricoestemporada').updateMany(
    { liga_nome: { $regex: /^Super Cartola 20[0-9]{2}$/ } },
    { $set: { liga_nome: 'Super Cartola' } }
  );
  console.log('InscricoesTemporada atualizadas:', result3.modifiedCount);

  process.exit(0);
}

atualizarNomeLiga().catch(e => { console.error(e); process.exit(1); });
