#!/usr/bin/env node
const mongoose = require('mongoose');
const http = require('http');

const LIGA_ID = '684cb1c8af923da7c7df51de';
const TIME_ID = 645089;
const TEMPORADA = 2026;

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 Conectado ao MongoDB\n');

    // 1. Deletar cache
    const result = await mongoose.connection.db
      .collection('extratofinanceirocaches')
      .deleteOne({
        liga_id: LIGA_ID,
        time_id: TIME_ID,
        temporada: TEMPORADA
      });

    console.log('✅ Cache deletado:', result.deletedCount, '\n');

    // 2. Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Buscar extrato
    const url = `http://localhost:3000/api/fluxo-financeiro/${LIGA_ID}/extrato/${TIME_ID}?temporada=${TEMPORADA}`;

    console.log('🔄 Recalculando extrato...\n');

    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);

        console.log('═══════════════════════════════════════');
        console.log('📊 EXTRATO RECALCULADO');
        console.log('═══════════════════════════════════════');
        console.log('Saldo Final:      R$', json.saldo_final);
        console.log('Saldo Temporada:  R$', json.saldo_temporada);
        console.log('Saldo Acertos:    R$', json.saldo_acertos);
        console.log('═══════════════════════════════════════\n');

        console.log('📋 TRANSAÇÕES:\n');
        json.extrato.forEach(t => {
          const valor = t.valor >= 0 ? `+${t.valor}` : t.valor;
          console.log(`  ${t.tipo.padEnd(25)} R$ ${String(valor).padStart(7)} - ${t.descricao}`);
        });

        console.log('\n═══════════════════════════════════════');

        // Verificar se inscrição apareceu
        const temInscricao = json.extrato.some(t => t.tipo === 'INSCRICAO_TEMPORADA');
        const temPC = json.extrato.some(t => t.tipo === 'PONTOS_CORRIDOS');

        console.log('\n✅ VERIFICAÇÕES:');
        console.log('  Inscrição (-180):', temInscricao ? '✅ SIM' : '❌ NÃO');
        console.log('  PC (-5):         ', temPC ? '✅ SIM' : '❌ NÃO');
        console.log('  Saldo esperado:  -120');
        console.log('  Saldo obtido:   ', json.saldo_final);
        console.log('  Diferença:      ', -120 - json.saldo_final);

        process.exit(0);
      });
    }).on('error', (err) => {
      console.error('❌ Erro ao buscar extrato:', err.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
