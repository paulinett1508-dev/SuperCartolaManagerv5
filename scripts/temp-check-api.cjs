#!/usr/bin/env node
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf-8'));

if (!data.success || !data.ranking || data.ranking.length === 0) {
  console.log('❌ CACHE VAZIO ou erro na API');
  console.log(JSON.stringify(data, null, 2));
  process.exit(1);
}

const ranking = data.ranking;
console.log('═══════════════════════════════════════════════════════════');
console.log('🎖️  RESULTADO API - CAPITÃO DE LUXO');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Total participantes: ${ranking.length}`);
console.log('');

// Verificar rodadas presentes
const rodadas = new Set();
ranking.forEach(p => {
  if (p.historico_rodadas) {
    p.historico_rodadas.forEach(h => rodadas.add(h.rodada));
  }
});

const rodadasArray = Array.from(rodadas).sort((a,b) => a-b);
console.log(`Rodadas no cache: ${rodadasArray.join(', ')}`);

const temR3 = rodadasArray.includes(3);
console.log(`Rodada 3 presente: ${temR3 ? '✅ SIM' : '❌ NÃO'}`);
console.log('');

if (!temR3) {
  console.log('🔍 RODADA 3 AUSENTE DO CACHE!');
  console.log('');
  console.log('💡 CAUSA PROVÁVEL:');
  console.log('   - Script de consolidação não rodou após R3 finalizar');
  console.log('   - Auto-consolidação do frontend falhou');
  console.log('');
  console.log('🔧 SOLUÇÃO:');
  console.log('   node scripts/consolidar-capitao-luxo.js 684cb1c8af923da7c7df51de 3');
  process.exit(0);
}

// Analisar flags parciais na R3
let totalComR3 = 0;
let totalComParcial = 0;
let totalComJogouFalse = 0;

ranking.forEach(p => {
  const r3 = p.historico_rodadas?.find(h => h.rodada === 3);
  if (r3) {
    totalComR3++;
    if (r3.parcial === true) totalComParcial++;
    if (r3.jogou === false) totalComJogouFalse++;
  }
});

console.log('📊 ANÁLISE RODADA 3:');
console.log(`Times com R3:         ${totalComR3}/${ranking.length}`);
console.log(`Com parcial=true:     ${totalComParcial}/${totalComR3} ${totalComParcial > 0 ? '⚠️' : '✅'}`);
console.log(`Com jogou=false:      ${totalComJogouFalse}/${totalComR3} ${totalComJogouFalse > 0 ? '⚠️' : '✅'}`);
console.log('');

if (totalComParcial > 0) {
  console.log('⚠️  PROBLEMA DETECTADO: FLAGS PARCIAIS STALE');
  console.log('   → Rodada 3 marcada como "em andamento" nunca finalizou');
  console.log('   → Admin/App exibindo dados parciais travados');
  console.log('');
}

// Exemplo
const exemplo = ranking[0];
const r3Ex = exemplo.historico_rodadas?.find(h => h.rodada === 3);
if (r3Ex) {
  console.log('📝 EXEMPLO (primeiro participante):');
  console.log(`Time:      ${exemplo.nome_cartola}`);
  console.log(`Capitão:   ${r3Ex.atleta_nome || 'N/A'}`);
  console.log(`Pontos:    ${(r3Ex.pontuacao || 0).toFixed(2)}`);
  console.log(`parcial:   ${r3Ex.parcial === true ? '🔴 TRUE (STALE!)' : '✅ false'}`);
  console.log(`jogou:     ${r3Ex.jogou === false ? '⏳ FALSE (pendente)' : r3Ex.jogou === true ? '✅ TRUE' : '➖ null'}`);
  console.log('');
}

// Recomendações
console.log('💡 RECOMENDAÇÕES:');
console.log('───────────────────────────────────────────────────────────');
if (totalComParcial > 0 || totalComJogouFalse > 0) {
  console.log('1️⃣  Re-consolidar dados até rodada 3:');
  console.log('   node scripts/consolidar-capitao-luxo.js 684cb1c8af923da7c7df51de 3');
  console.log('');
  console.log('2️⃣  Aplicar fix de flags stale no admin:');
  console.log('   Ver: public/participante/js/modules/participante-capitao.js:181-193');
  console.log('   (App já tem, admin precisa do mesmo fix)');
} else {
  console.log('✅ Cache OK! Problema pode estar no frontend.');
  console.log('   - Verificar console do navegador');
  console.log('   - Limpar cache do browser');
}
console.log('═══════════════════════════════════════════════════════════');
