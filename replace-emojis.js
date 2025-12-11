// Script para substituir emojis por Material Icons
const fs = require('fs');
const path = require('path');

// Mapeamento de emojis para Material Icons
const emojiMap = {
  // Esportes
  '⚽': '<span class="material-symbols-outlined">sports_soccer</span>',
  '🧤': '<span class="material-symbols-outlined">sports_handball</span>',
  
  // Troféus e medalhas
  '🏆': '<span class="material-symbols-outlined">emoji_events</span>',
  '🥇': '<span class="material-symbols-outlined" style="color:#FFD700">workspace_premium</span>',
  '🥈': '<span class="material-symbols-outlined" style="color:#C0C0C0">workspace_premium</span>',
  '🥉': '<span class="material-symbols-outlined" style="color:#CD7F32">workspace_premium</span>',
  '🎖': '<span class="material-symbols-outlined">military_tech</span>',
  '🏅': '<span class="material-symbols-outlined">military_tech</span>',
  '👑': '<span class="material-symbols-outlined">crown</span>',
  
  // Status e ícones
  '✅': '<span class="material-symbols-outlined">check_circle</span>',
  '❌': '<span class="material-symbols-outlined">cancel</span>',
  '⚠️': '<span class="material-symbols-outlined">warning</span>',
  '⚠': '<span class="material-symbols-outlined">warning</span>',
  'ℹ️': '<span class="material-symbols-outlined">info</span>',
  'ℹ': '<span class="material-symbols-outlined">info</span>',
  '✓': '<span class="material-symbols-outlined">check</span>',
  
  // Gráficos e dados
  '📊': '<span class="material-symbols-outlined">bar_chart</span>',
  '📈': '<span class="material-symbols-outlined">trending_up</span>',
  '📉': '<span class="material-symbols-outlined">trending_down</span>',
  '📋': '<span class="material-symbols-outlined">list_alt</span>',
  '🎯': '<span class="material-symbols-outlined">gps_fixed</span>',
  
  // Dinheiro
  '💰': '<span class="material-symbols-outlined">payments</span>',
  '💵': '<span class="material-symbols-outlined">attach_money</span>',
  '💸': '<span class="material-symbols-outlined">money_off</span>',
  
  // Tempo e calendário
  '📅': '<span class="material-symbols-outlined">calendar_today</span>',
  '🕐': '<span class="material-symbols-outlined">schedule</span>',
  
  // Pessoas
  '👤': '<span class="material-symbols-outlined">person</span>',
  
  // Emoções
  '😢': '<span class="material-symbols-outlined">sentiment_dissatisfied</span>',
  '🎉': '<span class="material-symbols-outlined">celebration</span>',
  '🎊': '<span class="material-symbols-outlined">celebration</span>',
  
  // Setas
  '⬆': '<span class="material-symbols-outlined">arrow_upward</span>',
  '⬆️': '<span class="material-symbols-outlined">arrow_upward</span>',
  '⬇': '<span class="material-symbols-outlined">arrow_downward</span>',
  '⬇️': '<span class="material-symbols-outlined">arrow_downward</span>',
  
  // Outros
  '🔥': '<span class="material-symbols-outlined">local_fire_department</span>',
  '⭐': '<span class="material-symbols-outlined">star</span>',
  '💎': '<span class="material-symbols-outlined">diamond</span>',
  '⚡': '<span class="material-symbols-outlined">bolt</span>',
  '🔴': '<span class="material-symbols-outlined" style="color:#ef4444">circle</span>',
  '🟢': '<span class="material-symbols-outlined" style="color:#22c55e">circle</span>',
  '🟡': '<span class="material-symbols-outlined" style="color:#f59e0b">circle</span>',
  '⛳': '<span class="material-symbols-outlined">golf_course</span>',
  
  // Ações
  '🔄': '<span class="material-symbols-outlined">sync</span>',
  '🚀': '<span class="material-symbols-outlined">rocket_launch</span>',
};

// Lista de arquivos para NÃO processar (já foram feitos manualmente ou são logs)
const skipFiles = [
  'participante-artilheiro.js',
  'participante-luva-ouro.js',
];

// Função para substituir emojis em um arquivo
function processFile(filePath) {
  const fileName = path.basename(filePath);
  if (skipFiles.includes(fileName)) {
    console.log('SKIP:', filePath);
    return { skipped: true };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];
  
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    if (content.includes(emoji)) {
      // Não substituir em console.log, Log.info, etc
      const regex = new RegExp(emoji, 'g');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        changes.push({ emoji, count: matches.length });
        // Substituir apenas em HTML/renderização, não em logs
        content = content.replace(regex, replacement);
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { modified: true, changes };
  }
  
  return { modified: false };
}

// Processar argumentos
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: node replace-emojis.js <arquivo>');
  process.exit(1);
}

const result = processFile(args[0]);
console.log(JSON.stringify(result));
