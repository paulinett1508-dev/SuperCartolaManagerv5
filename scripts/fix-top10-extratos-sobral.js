/**
 * FIX: Corrigir valores TOP10 nos extratos da Liga Cartoleiros do Sobral
 *
 * PROBLEMA: O sistema estava marcando como MITO/MICO quem foi 1º/último da RODADA,
 *           em vez de verificar se está no TOP10 GLOBAL da TEMPORADA.
 *
 * SOLUÇÃO: Este script corrige os campos TOP10 baseado no cache top10caches correto.
 *
 * USO:
 *   node scripts/fix-top10-extratos-sobral.js --dry-run  # Simula correções
 *   node scripts/fix-top10-extratos-sobral.js --force    # Aplica correções
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONSTANTES
// ============================================================================

const LIGA_SOBRAL_ID = '684d821cf1a7ae16d1f89572';
const TEMPORADA = 2025;

// Tabela de premiação TOP10 da Liga Sobral (de config/rules/top_10.json)
const PREMIACAO_SOBRAL = {
  mitos: {
    1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1
  },
  micos: {
    1: -10, 2: -9, 3: -8, 4: -7, 5: -6, 6: -5, 7: -4, 8: -3, 9: -2, 10: -1
  }
};

// ============================================================================
// CONEXÃO MONGODB
// ============================================================================

async function conectarMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI não definido no ambiente');
  }

  await mongoose.connect(uri);
  console.log('✓ Conectado ao MongoDB');
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
}

// ============================================================================
// BUSCAR DADOS
// ============================================================================

async function buscarTop10Cache() {
  const db = mongoose.connection.db;
  const cache = await db.collection('top10caches').findOne({
    liga_id: LIGA_SOBRAL_ID,
    temporada: TEMPORADA
  });

  if (!cache) {
    // Tentar buscar com ObjectId
    const ObjectId = mongoose.Types.ObjectId;
    const cacheObjId = await db.collection('top10caches').findOne({
      liga_id: new ObjectId(LIGA_SOBRAL_ID),
      temporada: TEMPORADA
    });
    if (!cacheObjId) {
      throw new Error(`TOP10 cache não encontrado para Liga Sobral ${TEMPORADA}`);
    }
    return cacheObjId;
  }
  return cache;
}

async function buscarExtratos() {
  const db = mongoose.connection.db;
  return await db.collection('extratofinanceirocaches')
    .find({
      liga_id: LIGA_SOBRAL_ID,
      temporada: TEMPORADA
    })
    .toArray();
}

// ============================================================================
// CONSTRUIR MAPA DE TOP10 CORRETO
// ============================================================================

function construirMapaTop10(cache) {
  const mapa = {
    mitos: new Map(), // chave: "time_id-rodada", valor: { posicao, valor }
    micos: new Map()
  };

  // Processar MITOS (ordenar por pontos DESC e pegar top 10)
  const mitosSorted = [...cache.mitos]
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 10);

  mitosSorted.forEach((m, idx) => {
    const posicao = idx + 1;
    const key = `${m.time_id}-${m.rodada}`;
    mapa.mitos.set(key, {
      posicao,
      valor: PREMIACAO_SOBRAL.mitos[posicao],
      pontos: m.pontos,
      nome: m.nome_cartola
    });
  });

  // Processar MICOS (ordenar por pontos ASC e pegar top 10)
  const micosSorted = [...cache.micos]
    .sort((a, b) => a.pontos - b.pontos)
    .slice(0, 10);

  micosSorted.forEach((m, idx) => {
    const posicao = idx + 1;
    const key = `${m.time_id}-${m.rodada}`;
    mapa.micos.set(key, {
      posicao,
      valor: PREMIACAO_SOBRAL.micos[posicao],
      pontos: m.pontos,
      nome: m.nome_cartola
    });
  });

  return mapa;
}

// ============================================================================
// CORRIGIR EXTRATO
// ============================================================================

function corrigirExtrato(extrato, mapaTop10, verbose) {
  const timeId = extrato.time_id;
  const correcoes = [];
  let saldoAnterior = 0;
  let ganhosTotal = 0;
  let perdasTotal = 0;

  // Processar cada rodada
  const historicoCorrigido = extrato.historico_transacoes.map(rodada => {
    const key = `${timeId}-${rodada.rodada}`;
    const mitoInfo = mapaTop10.mitos.get(key);
    const micoInfo = mapaTop10.micos.get(key);

    // Valores originais
    const top10Original = rodada.top10 || 0;
    const isMitoOriginal = rodada.isMito || false;
    const isMicoOriginal = rodada.isMico || false;

    // Valores corretos
    let top10Correto = 0;
    let isMitoCorreto = false;
    let isMicoCorreto = false;
    let top10StatusCorreto = null;
    let top10PosicaoCorreto = null;

    if (mitoInfo) {
      top10Correto = mitoInfo.valor;
      isMitoCorreto = true;
      top10StatusCorreto = 'MITO';
      top10PosicaoCorreto = mitoInfo.posicao;
    } else if (micoInfo) {
      top10Correto = micoInfo.valor;
      isMicoCorreto = true;
      top10StatusCorreto = 'MICO';
      top10PosicaoCorreto = micoInfo.posicao;
    }

    // Verificar se houve mudança
    const mudou =
      top10Original !== top10Correto ||
      isMitoOriginal !== isMitoCorreto ||
      isMicoOriginal !== isMicoCorreto;

    if (mudou) {
      correcoes.push({
        rodada: rodada.rodada,
        antes: { top10: top10Original, isMito: isMitoOriginal, isMico: isMicoOriginal },
        depois: { top10: top10Correto, isMito: isMitoCorreto, isMico: isMicoCorreto, posicao: top10PosicaoCorreto }
      });
    }

    // Recalcular saldo da rodada
    const bonusOnus = rodada.bonusOnus || 0;
    const pontosCorridos = rodada.pontosCorridos || 0;
    const mataMata = rodada.mataMata || 0;
    const saldoRodada = bonusOnus + pontosCorridos + mataMata + top10Correto;
    saldoAnterior += saldoRodada;

    // Contabilizar ganhos/perdas
    if (bonusOnus > 0) ganhosTotal += bonusOnus;
    else if (bonusOnus < 0) perdasTotal += bonusOnus;

    if (pontosCorridos > 0) ganhosTotal += pontosCorridos;
    else if (pontosCorridos < 0) perdasTotal += pontosCorridos;

    if (mataMata > 0) ganhosTotal += mataMata;
    else if (mataMata < 0) perdasTotal += mataMata;

    if (top10Correto > 0) ganhosTotal += top10Correto;
    else if (top10Correto < 0) perdasTotal += top10Correto;

    return {
      ...rodada,
      top10: top10Correto,
      isMito: isMitoCorreto,
      isMico: isMicoCorreto,
      top10Status: top10StatusCorreto,
      top10Posicao: top10PosicaoCorreto,
      saldo: saldoRodada,
      saldoAcumulado: saldoAnterior
    };
  });

  return {
    historicoCorrigido,
    correcoes,
    saldoFinal: saldoAnterior,
    ganhosTotal,
    perdasTotal
  };
}

// ============================================================================
// APLICAR CORREÇÕES NO MONGODB
// ============================================================================

async function aplicarCorrecao(db, extrato, resultado) {
  await db.collection('extratofinanceirocaches').updateOne(
    { _id: extrato._id },
    {
      $set: {
        historico_transacoes: resultado.historicoCorrigido,
        saldo_consolidado: resultado.saldoFinal,
        ganhos_consolidados: resultado.ganhosTotal,
        perdas_consolidadas: resultado.perdasTotal,
        'metadados.fix_top10': new Date().toISOString(),
        'metadados.versaoCalculo': '5.0.0-top10-fix',
        versao_correcao: 'top10-sobral-2025-01-15'
      }
    }
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { dryRun, force, verbose } = parseArgs();

  console.log('='.repeat(80));
  console.log('FIX TOP10 - LIGA CARTOLEIROS DO SOBRAL (2025)');
  console.log('='.repeat(80));
  console.log(`Modo: ${dryRun ? 'DRY-RUN (simulação)' : force ? 'FORCE (execução real)' : 'NENHUM FLAG'}`);
  console.log('');

  if (!dryRun && !force) {
    console.error('❌ Use --dry-run para simular ou --force para executar');
    process.exit(1);
  }

  await conectarMongo();
  const db = mongoose.connection.db;

  // 1. Buscar TOP10 cache correto
  console.log('📊 Buscando TOP10 cache correto...');
  const top10Cache = await buscarTop10Cache();
  console.log(`   Encontrado: ${top10Cache.mitos.length} mitos, ${top10Cache.micos.length} micos`);

  // 2. Construir mapa de TOP10
  console.log('🗺️  Construindo mapa de TOP10 correto...');
  const mapaTop10 = construirMapaTop10(top10Cache);

  console.log('\n📋 TOP 10 MITOS (correto):');
  [...mapaTop10.mitos.entries()].forEach(([key, val]) => {
    console.log(`   ${val.posicao}º ${val.nome} (R${key.split('-')[1]}) = R$${val.valor} (${val.pontos.toFixed(2)} pts)`);
  });

  console.log('\n📋 TOP 10 MICOS (correto):');
  [...mapaTop10.micos.entries()].forEach(([key, val]) => {
    console.log(`   ${val.posicao}º ${val.nome} (R${key.split('-')[1]}) = R$${val.valor} (${val.pontos.toFixed(2)} pts)`);
  });

  // 3. Buscar extratos
  console.log('\n📁 Buscando extratos da Liga Sobral...');
  const extratos = await buscarExtratos();
  console.log(`   Encontrados: ${extratos.length} extratos`);

  // 4. Processar correções
  console.log('\n🔧 Processando correções...\n');

  let totalCorrecoes = 0;
  let extratosCorrigidos = 0;
  const resumoPorParticipante = {};

  for (const extrato of extratos) {
    const resultado = corrigirExtrato(extrato, mapaTop10, verbose);

    if (resultado.correcoes.length > 0) {
      extratosCorrigidos++;
      totalCorrecoes += resultado.correcoes.length;

      // Buscar nome do participante
      const participante = await db.collection('times').findOne({ id: extrato.time_id });
      const nome = participante?.nome_cartola || `Time ${extrato.time_id}`;

      console.log(`\n👤 ${nome} (time_id: ${extrato.time_id}):`);

      let impactoTotal = 0;
      resultado.correcoes.forEach(c => {
        const delta = c.depois.top10 - c.antes.top10;
        impactoTotal += delta;
        const tipo = c.depois.isMito ? 'MITO' : c.depois.isMico ? 'MICO' : 'NADA';
        const tipoAntes = c.antes.isMito ? 'MITO' : c.antes.isMico ? 'MICO' : 'NADA';
        console.log(`   R${c.rodada}: ${tipoAntes}(R$${c.antes.top10}) → ${tipo}(R$${c.depois.top10}) [Δ ${delta >= 0 ? '+' : ''}${delta}]`);
      });

      console.log(`   📊 Impacto total: ${impactoTotal >= 0 ? '+' : ''}R$${impactoTotal}`);
      console.log(`   💰 Saldo corrigido: R$${resultado.saldoFinal}`);

      resumoPorParticipante[nome] = {
        correcoes: resultado.correcoes.length,
        impacto: impactoTotal,
        saldoFinal: resultado.saldoFinal
      };

      // Aplicar correção se não for dry-run
      if (force) {
        await aplicarCorrecao(db, extrato, resultado);
        console.log(`   ✅ Correção aplicada!`);
      }
    }
  }

  // 5. Resumo final
  console.log('\n' + '='.repeat(80));
  console.log('RESUMO FINAL');
  console.log('='.repeat(80));
  console.log(`Extratos analisados: ${extratos.length}`);
  console.log(`Extratos corrigidos: ${extratosCorrigidos}`);
  console.log(`Total de correções: ${totalCorrecoes}`);
  console.log('');
  console.log('Impacto por participante:');

  Object.entries(resumoPorParticipante)
    .sort((a, b) => Math.abs(b[1].impacto) - Math.abs(a[1].impacto))
    .forEach(([nome, dados]) => {
      const sinal = dados.impacto >= 0 ? '+' : '';
      console.log(`   ${nome}: ${sinal}R$${dados.impacto} (${dados.correcoes} correções, saldo final: R$${dados.saldoFinal})`);
    });

  if (dryRun) {
    console.log('\n⚠️  MODO DRY-RUN: Nenhuma alteração foi feita no banco');
    console.log('   Execute com --force para aplicar as correções');
  } else {
    console.log('\n✅ Todas as correções foram aplicadas com sucesso!');
  }

  await mongoose.disconnect();
  console.log('\n✓ Desconectado do MongoDB');
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
