// scripts/save-jogos-globo.js
// v2.0 - Executa o scraper SSR e salva o resultado em data/jogos-globo.json
import obterJogosGloboEsporte from './scraper-jogos-globo.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const jogos = await obterJogosGloboEsporte();
  const filePath = path.join(process.cwd(), 'data', 'jogos-globo.json');
  await fs.writeFile(filePath, JSON.stringify(jogos, null, 2), 'utf-8');
  console.log(`Salvo ${jogos.length} jogos em ${filePath}`);
}

// Execução direta (ESM)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch(err => {
    console.error('Erro ao salvar jogos:', err.message);
  });
}
