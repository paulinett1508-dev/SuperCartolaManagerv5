// scripts/scraper-jogos-globo.js
// Scraper de jogos do dia do Globo Esporte (https://ge.globo.com/futebol/agenda/)
// Uso: node scripts/scraper-jogos-globo.js

import axios from 'axios';
import cheerio from 'cheerio';

async function obterJogosGloboEsporte() {
  const url = 'https://ge.globo.com/futebol/agenda/';
  const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(html);
  const jogos = [];

  $('.jogos-dia .jogo__informacoes').each((i, el) => {
    const campeonato = $(el).find('.jogo__campeonato').text().trim();
    const horario = $(el).find('.jogo__hora').text().trim();
    const times = $(el).find('.jogo__equipes').text().replace(/\s+/g, ' ').trim();
    const local = $(el).find('.jogo__local').text().trim();
    jogos.push({ campeonato, horario, times, local });
  });
  return jogos;
}

// Execução direta
if (require.main === module) {
  obterJogosGloboEsporte()
    .then(jogos => {
      if (!jogos.length) {
        console.log('Nenhum jogo encontrado para hoje.');
      } else {
        console.table(jogos);
      }
    })
    .catch(err => {
      console.error('Erro ao buscar jogos:', err.message);
    });
}

export default obterJogosGloboEsporte;
