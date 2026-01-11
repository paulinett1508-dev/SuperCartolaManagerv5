// Remove participantes de teste/placeholder do banco
import mongoose from 'mongoose';
import dbConnect from '../config/database.js';

async function main() {
  await dbConnect();
  const db = mongoose.connection.db;

  // Critérios: nomes ou ids típicos de teste
  const idsTeste = [99999999, 123456];
  const nomesTeste = [/teste/i, /test/i, /placeholder/i, /dummy/i, /fake/i];

  // Times
  const resTimes = await db.collection('times').deleteMany({
    $or: [
      { id: { $in: idsTeste } },
      { nome_time: { $in: ['FLAMENGO TESTE FC', 'Time 123456'] } },
      { nome_time: { $in: nomesTeste } }
    ]
  });
  console.log('Times removidos:', resTimes.deletedCount);

  // Extratos
  const resExtratos = await db.collection('extratofinanceirocaches').deleteMany({
    time_id: { $in: idsTeste }
  });
  console.log('Extratos removidos:', resExtratos.deletedCount);

  // Inscricoes
  const resInscricoes = await db.collection('inscricoestemporada').deleteMany({
    time_id: { $in: idsTeste }
  });
  console.log('Inscricoes removidas:', resInscricoes.deletedCount);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
