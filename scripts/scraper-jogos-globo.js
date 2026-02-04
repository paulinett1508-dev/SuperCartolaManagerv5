// scripts/scraper-jogos-globo.js
// v2.0 - Extrai agenda de jogos do dia via SSR data do ge.globo.com
// A página embute dados de jogos em window.dataSportsSchedule (Server-Side Rendered)
// ✅ Sem dependência de cheerio - usa fetch + parsing de JS object
// ✅ Cobre: Brasileirão, Estaduais, Copa do Brasil, Libertadores, etc.
// ✅ Retorna formato compatível com jogos-ao-vivo-routes.js

import fetch from 'node-fetch';

/**
 * Formata hora "HH:MM:SS" para "HH:MM"
 */
function formatarHora(hora) {
  if (!hora) return '--:--';
  return hora.substring(0, 5); // "21:30:00" → "21:30"
}

/**
 * Busca agenda de jogos do dia do ge.globo.com
 * Extrai dados SSR embutidos no HTML (window.dataSportsSchedule)
 *
 * @param {string} [data] - Data no formato YYYY-MM-DD (default: hoje SP timezone)
 * @returns {Promise<Array>} Array de jogos no formato padrão
 */
async function obterJogosGloboEsporte(data) {
  const dataAlvo = data || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  const response = await fetch('https://ge.globo.com/agenda/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    },
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`ge.globo.com retornou HTTP ${response.status}`);
  }

  const html = await response.text();

  // Extrair window.dataSportsSchedule (objeto JS, não JSON)
  const match = html.match(/window\.dataSportsSchedule\s*=\s*([\s\S]*?);\s*window\./);
  if (!match) {
    console.warn('[SCRAPER-GLOBO] window.dataSportsSchedule não encontrado no HTML');
    return [];
  }

  // Parse do objeto JS usando Function (keys não são quotadas)
  let scheduleData;
  try {
    scheduleData = new Function('return ' + match[1])();
  } catch (e) {
    console.error('[SCRAPER-GLOBO] Erro ao parsear dataSportsSchedule:', e.message);
    return [];
  }

  // Extrair jogos da data alvo
  const todayData = scheduleData?.sport?.[dataAlvo];
  if (!todayData || !todayData.championshipsAgenda) {
    console.log(`[SCRAPER-GLOBO] Nenhum dado para ${dataAlvo}`);
    return [];
  }

  const jogos = [];

  for (const champ of todayData.championshipsAgenda) {
    const ligaNome = champ.championship?.name || 'Liga';

    // Combinar jogos futuros, ao vivo e passados
    const allEvents = [
      ...(champ.future || []),
      ...(champ.now || []),
      ...(champ.past || [])
    ];

    for (const event of allEvents) {
      const m = event.match;
      if (!m) continue;

      const mandante = m.firstContestant?.popularName || m.firstContestant?.name || '';
      const visitante = m.secondContestant?.popularName || m.secondContestant?.name || '';

      if (!mandante || !visitante) continue;

      // Mapear moment para statusRaw
      let statusRaw = 'NS';
      if (m.moment === 'NOW') statusRaw = 'LIVE';
      else if (m.moment === 'PAST') statusRaw = 'FT';

      // Mapear status para texto
      let status = 'Agendado';
      if (m.moment === 'NOW') status = 'Ao vivo';
      else if (m.moment === 'PAST') status = 'Encerrado';

      const golsMandante = m.scoreboard?.home ?? 0;
      const golsVisitante = m.scoreboard?.away ?? 0;

      jogos.push({
        id: m.id || null,
        mandante,
        visitante,
        logoMandante: m.firstContestant?.badgePng || null,
        logoVisitante: m.secondContestant?.badgePng || null,
        golsMandante: typeof golsMandante === 'number' ? golsMandante : 0,
        golsVisitante: typeof golsVisitante === 'number' ? golsVisitante : 0,
        placar: `${golsMandante ?? 0} x ${golsVisitante ?? 0}`,
        placarHT: null,
        tempo: '',
        tempoExtra: null,
        status,
        statusRaw,
        liga: ligaNome,
        ligaId: null,
        ligaOriginal: ligaNome,
        ligaLogo: null,
        estadio: m.location?.popularName || null,
        cidade: null,
        horario: formatarHora(m.startHour),
        timestamp: m.startDate && m.startHour
          ? new Date(`${m.startDate}T${m.startHour}-03:00`).getTime()
          : Date.now(),
        fonte: 'globo',
        // Extras do Globo
        transmissao: m.liveWatchSources?.map(s => s.name).filter(Boolean) || []
      });
    }
  }

  // Ordenar: ao vivo primeiro, depois agendados por horário, depois encerrados
  jogos.sort((a, b) => {
    if (a.statusRaw === 'LIVE' && b.statusRaw !== 'LIVE') return -1;
    if (a.statusRaw !== 'LIVE' && b.statusRaw === 'LIVE') return 1;
    if (a.statusRaw === 'FT' && b.statusRaw !== 'FT') return 1;
    if (a.statusRaw !== 'FT' && b.statusRaw === 'FT') return -1;
    return a.timestamp - b.timestamp;
  });

  return jogos;
}

/**
 * Busca jogos de TODAS as datas disponíveis no SSR data do ge.globo.com
 * Retorna objeto { "YYYY-MM-DD": [jogos], ... }
 * Útil para "Jogos do Mês" - a página traz ~5 dias de dados
 *
 * @returns {Promise<Object>} Mapa de data → array de jogos
 */
async function obterJogosGloboMultiDatas() {
  const response = await fetch('https://ge.globo.com/agenda/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    },
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`ge.globo.com retornou HTTP ${response.status}`);
  }

  const html = await response.text();

  const match = html.match(/window\.dataSportsSchedule\s*=\s*([\s\S]*?);\s*window\./);
  if (!match) {
    console.warn('[SCRAPER-GLOBO] window.dataSportsSchedule não encontrado no HTML');
    return {};
  }

  let scheduleData;
  try {
    scheduleData = new Function('return ' + match[1])();
  } catch (e) {
    console.error('[SCRAPER-GLOBO] Erro ao parsear dataSportsSchedule:', e.message);
    return {};
  }

  const sport = scheduleData?.sport;
  if (!sport) return {};

  const resultado = {};

  for (const dataKey of Object.keys(sport)) {
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataKey)) continue;

    const dayData = sport[dataKey];
    if (!dayData?.championshipsAgenda) continue;

    const jogos = [];

    for (const champ of dayData.championshipsAgenda) {
      const ligaNome = champ.championship?.name || 'Liga';
      const allEvents = [
        ...(champ.future || []),
        ...(champ.now || []),
        ...(champ.past || [])
      ];

      for (const event of allEvents) {
        const m = event.match;
        if (!m) continue;

        const mandante = m.firstContestant?.popularName || m.firstContestant?.name || '';
        const visitante = m.secondContestant?.popularName || m.secondContestant?.name || '';
        if (!mandante || !visitante) continue;

        let statusRaw = 'NS';
        if (m.moment === 'NOW') statusRaw = 'LIVE';
        else if (m.moment === 'PAST') statusRaw = 'FT';

        let status = 'Agendado';
        if (m.moment === 'NOW') status = 'Ao vivo';
        else if (m.moment === 'PAST') status = 'Encerrado';

        const golsMandante = m.scoreboard?.home ?? 0;
        const golsVisitante = m.scoreboard?.away ?? 0;

        jogos.push({
          id: m.id || null,
          mandante,
          visitante,
          logoMandante: m.firstContestant?.badgePng || null,
          logoVisitante: m.secondContestant?.badgePng || null,
          golsMandante: typeof golsMandante === 'number' ? golsMandante : 0,
          golsVisitante: typeof golsVisitante === 'number' ? golsVisitante : 0,
          placar: `${golsMandante ?? 0} x ${golsVisitante ?? 0}`,
          placarHT: null,
          tempo: '',
          tempoExtra: null,
          status,
          statusRaw,
          liga: ligaNome,
          ligaId: null,
          ligaOriginal: ligaNome,
          ligaLogo: null,
          estadio: m.location?.popularName || null,
          cidade: null,
          horario: formatarHora(m.startHour),
          data: dataKey,
          timestamp: m.startDate && m.startHour
            ? new Date(`${m.startDate}T${m.startHour}-03:00`).getTime()
            : Date.now(),
          fonte: 'globo',
          transmissao: m.liveWatchSources?.map(s => s.name).filter(Boolean) || []
        });
      }
    }

    if (jogos.length > 0) {
      jogos.sort((a, b) => a.timestamp - b.timestamp);
      resultado[dataKey] = jogos;
    }
  }

  return resultado;
}

// Execução direta (ESM)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  obterJogosGloboEsporte()
    .then(jogos => {
      if (!jogos.length) {
        console.log('Nenhum jogo encontrado para hoje.');
      } else {
        console.log(`${jogos.length} jogos encontrados:`);
        jogos.forEach(j => {
          const score = j.statusRaw === 'NS' ? j.horario : `${j.golsMandante} x ${j.golsVisitante}`;
          console.log(`  [${j.status}] ${j.mandante} ${score} ${j.visitante} - ${j.liga}`);
        });
      }
    })
    .catch(err => {
      console.error('Erro ao buscar jogos:', err.message);
    });
}

export default obterJogosGloboEsporte;
export { obterJogosGloboMultiDatas };
