// Debug: Testar API-Football diretamente
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.API_FOOTBALL_KEY;
const dataHoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

console.log('Data hoje:', dataHoje);
console.log('API Key:', apiKey ? apiKey.substring(0,8) + '...' : 'NÃO CONFIGURADA');

if (!apiKey) process.exit(1);

const url = `https://v3.football.api-sports.io/fixtures?date=${dataHoje}`;

const response = await fetch(url, {
  headers: { 'x-apisports-key': apiKey }
});

const data = await response.json();

console.log('\nTotal de jogos:', data.response?.length || 0);

const jogosBrasil = (data.response || []).filter(jogo => {
  return jogo.league?.country?.toLowerCase() === 'brazil';
});

console.log('Jogos brasileiros:', jogosBrasil.length);

if (jogosBrasil.length > 0) {
  const ligas = [...new Set(jogosBrasil.map(j => j.league.name))];
  console.log('Ligas:', ligas.join(', '));
} else {
  const paises = [...new Set((data.response || []).map(j => j.league?.country).filter(Boolean))].sort();
  console.log('\nPaíses (amostra):', paises.slice(0, 15).join(', '));
  
  if (paises.includes('Brazil')) {
    console.log('\n⚠️ "Brazil" EXISTE mas nenhum jogo passou no filtro!');
  }
}

console.log('\nErros:', JSON.stringify(data.errors) || 'Nenhum');
