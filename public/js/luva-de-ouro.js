// js/luva-de-ouro.js - ARQUIVO COMPLETO CORRIGIDO
console.log("🥅 [LUVA-DE-OURO] Módulo carregado");

// ===== CONFIGURAÇÕES E CONSTANTES =====
const LIGA_SOBRAL_ID = "684d821cf1a7ae16d1f89572";
const API_BASE = "/api/luva-de-ouro";

// Estado global do módulo
let dadosLuvaDeOuro = {
  ranking: [],
  estatisticas: {},
  ultimaRodada: 0,
  rodadaDetectada: null,
  carregando: false,
};

// ===== FUNÇÕES DE API =====

async function buscarRankingGoleiros(
  inicio = 1,
  fim = null,
  forcarColeta = false,
) {
  console.log(`🔍 Buscando ranking goleiros: ${inicio} a ${fim || "atual"}`);

  try {
    const params = new URLSearchParams({
      inicio: inicio.toString(),
      ...(fim && { fim: fim.toString() }),
      ...(forcarColeta && { forcar_coleta: "true" }),
    });

    const response = await fetch(
      `${API_BASE}/${LIGA_SOBRAL_ID}/ranking?${params}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error("❌ Erro na API:", data);
      throw new Error(data.message || data.error || "Erro ao buscar ranking");
    }

    console.log("✅ Ranking obtido:", data.data.ranking.length, "participantes");

    // ✅ Log detalhado para debug
    if (data.data.ranking.length > 0) {
      const lider = data.data.ranking[0];
      console.log(`🏆 Líder: ${lider.participanteNome} com ${lider.pontosTotais} pontos`);
      console.log(`📊 Dados do ranking:`, {
        totalParticipantes: data.data.ranking.length,
        rodadaInicio: data.data.rodadaInicio,
        rodadaFim: data.data.rodadaFim
      });
    } else {
      console.warn("⚠️ Nenhum participante no ranking");
    }

    return data.data;
  } catch (error) {
    console.error("❌ Erro ao buscar ranking:", error);
    throw error;
  }
}

async function detectarUltimaRodada() {
  console.log("🔍 Detectando última rodada...");

  try {
    const response = await fetch(
      `${API_BASE}/${LIGA_SOBRAL_ID}/detectar-rodada`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao detectar rodada");
    }

    console.log(`✅ Rodada detectada:`, data.data);
    dadosLuvaDeOuro.rodadaDetectada = data.data;
    return data.data;
  } catch (error) {
    console.error("❌ Erro ao detectar rodada:", error);
    throw error;
  }
}

async function obterEstatisticas() {
  console.log("📊 Obtendo estatísticas...");

  try {
    const response = await fetch(`${API_BASE}/${LIGA_SOBRAL_ID}/estatisticas`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao obter estatísticas");
    }

    console.log(`✅ Estatísticas obtidas:`, data.data);
    dadosLuvaDeOuro.estatisticas = data.data;
    return data.data;
  } catch (error) {
    console.error("❌ Erro ao obter estatísticas:", error);
    throw error;
  }
}

// ===== FUNÇÕES DE INTERFACE =====

function criarControlesLuvaDeOuro() {
  return `
    <div class="luva-ouro-controles" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50;">🥅 Luva de Ouro - Ranking de Goleiros</h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rodada Início:</label>
          <input type="number" id="luvaRodadaInicio" min="1" max="38" value="1" 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rodada Fim:</label>
          <input type="number" id="luvaRodadaFim" min="1" max="38" value="" placeholder="Automático"
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
      </div>

      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
        <button id="luvaRankingBtn" class="btn-primary" style="flex: 1; min-width: 150px;">
          🏆 Gerar Ranking
        </button>
        <button id="luvaUltimaRodadaBtn" class="btn-secondary" style="flex: 1; min-width: 150px;">
          📅 Até Última Rodada
        </button>
        <button id="luvaForcarColetaBtn" class="btn-warning" style="flex: 1; min-width: 150px;">
          🔄 Forçar Coleta
        </button>
      </div>

      <div id="luvaInfoRodada" style="padding: 10px; background: #e8f4f8; border-radius: 4px; font-size: 14px;">
        <span id="luvaInfoTexto">Clique em "Até Última Rodada" para detectar automaticamente</span>
      </div>
    </div>
  `;
}

function criarTabelaRanking(dados) {
  const container = document.getElementById("luvaDeOuroContent");
  if (!dados || !dados.ranking) {
      container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666;">
              <h4>📊 Erro ao carregar dados</h4>
              <p>Tente novamente mais tarde.</p>
          </div>
      `;
      return;
  }
  const ranking = dados.ranking;

  if (!ranking || !Array.isArray(ranking) || ranking.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #888;">
        <h3>📊 Nenhum dado encontrado</h3>
        <p>Não há dados de goleiros para o período selecionado.</p>
        <p style="font-size: 0.9em; color: #666; margin: 15px 0;">
          Isso pode acontecer se:<br>
          • As rodadas ainda não foram coletadas<br>
          • Houve erro na API do Cartola FC<br>
          • Os dados ainda estão sendo processados
        </p>
        <div style="margin-top: 20px;">
          <button onclick="carregarRankingGoleiros(1, null, true)" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Forçar Coleta
          </button>
          <button onclick="carregarRankingGoleiros(1, null, false)" style="margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
            📊 Recarregar
          </button>
        </div>
      </div>
    `;
    return;
  }

  // ✅ Verificar se há dados válidos
  const participantesComDados = ranking.filter(p => p.pontosTotais > 0 || p.totalJogos > 0);
  if (participantesComDados.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #f39c12;">
        <h3>⚠️ Dados Incompletos</h3>
        <p>Os participantes foram encontrados, mas não há pontuações de goleiros registradas.</p>
        <p style="font-size: 0.9em; color: #666; margin: 15px 0;">
          Total de participantes: ${ranking.length}<br>
          Participantes com dados: ${participantesComDados.length}
        </p>
        <button onclick="carregarRankingGoleiros(1, null, true)" style="margin-top: 15px; padding: 8px 16px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">
          🚀 Forçar Coleta Completa
        </button>
      </div>
    `;
    return;
  }

  const { ranking: rankingData, rodadaInicio, rodadaFim, totalParticipantes } = dados;

  // Mapeamento correto dos participantes com seus escudos (baseado em participantes.js)
  const participantesEscudos = {
    1926323: 262,   // Daniel Barbosa - Flamengo
    13935277: 263,  // Paulinett Miranda - Botafogo
    14747183: 264,  // Carlos Henrique - Corinthians
    49149009: 266,  // Matheus Coutinho - Fluminense
    49149388: 267,  // Junior Brasilino - Vasco
    50180257: 275   // Hivisson - Palmeiras
  };

  let html = `
    <div class="luva-ranking-header" style="margin: 15px 0; text-align: center;">
      <h3 style="color: #2c3e50; margin-bottom: 8px; font-size: 20px;">
        🥅 Ranking Luva de Ouro - Rodadas ${rodadaInicio} a ${rodadaFim}
      </h3>
      <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
        ${totalParticipantes} participantes • Ordenado por pontos totais
      </p>
    </div>

    <div style="overflow-x: auto; margin: 0 -10px;">
      <table class="luva-ranking-table" style="width: 100%; min-width: 700px; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
        <thead>
          <tr style="background: linear-gradient(135deg, #2E8B57, #228B22); color: white; height: 40px;">
            <th style="padding: 8px 6px; text-align: center; width: 50px; font-size: 11px; font-weight: 600;">Pos</th>
            <th style="padding: 8px 6px; text-align: center; width: 40px; font-size: 11px; font-weight: 600;">❤️</th>
            <th style="padding: 8px 8px; text-align: left; min-width: 120px; font-size: 11px; font-weight: 600;">Cartoleiro</th>
            <th style="padding: 8px 6px; text-align: center; width: 70px; font-size: 11px; font-weight: 600;">Total</th>
            <th style="padding: 8px 8px; text-align: left; min-width: 130px; font-size: 11px; font-weight: 600;">Goleiro da última rodada</th>
            <th style="padding: 8px 6px; text-align: center; width: 90px; font-size: 11px; font-weight: 600;">Pontos R${rodadaFim}</th>
            <th style="padding: 8px 6px; text-align: center; width: 70px; font-size: 11px; font-weight: 600;">Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  rankingData.forEach((item, index) => {
    const posicao = index + 1;
    const posicaoTexto = `${posicao}º`;
    const posicaoIcon = 
      posicao === 1 ? "🏆" :
      posicao === 2 ? "🥈" :
      posicao === 3 ? "🥉" : "";

    const rowBg = posicao === 1 ? 
      "background: linear-gradient(135deg, #e8f5e9, #f1f8e9);" :
      posicao % 2 === 0 ? "background: #fafbfc;" : "background: white;";

    const escudoId = participantesEscudos[item.participanteId] || "default";

    html += `
      <tr class="ranking-row" style="border-bottom: 1px solid #e9ecef; transition: all 0.2s ease; ${rowBg} height: 48px;" 
          onmouseover="this.style.background='#f8f9fa'; this.style.transform='scale(1.005)'" 
          onmouseout="this.style.background='${rowBg.split(':')[1].split(';')[0]}'; this.style.transform='scale(1)'">
        <td style="padding: 8px 6px; text-align: center; font-weight: 600; vertical-align: middle; font-size: 12px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
            <span>${posicaoTexto}</span>
            ${posicaoIcon ? `<span style="font-size: 14px;">${posicaoIcon}</span>` : ""}
          </div>
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <img src="/escudos/${escudoId}.png" alt="Escudo" 
               style="width: 22px; height: 22px; border-radius: 50%; border: 1px solid #ddd; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: #fff;"
               onerror="this.src='/escudos/default.png';">
        </td>
        <td style="padding: 8px 8px; vertical-align: middle;">
          <div style="font-weight: 600; color: #2c3e50; font-size: 12px; line-height: 1.3; margin-bottom: 1px;">${item.participanteNome}</div>
          <div style="font-size: 10px; color: #6c757d; line-height: 1.2;">ID: ${item.participanteId}</div>
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <span style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; box-shadow: 0 1px 3px rgba(39, 174, 96, 0.3);">
            ${Math.floor(item.pontosTotais * 100) / 100}
          </span>
        </td>
        <td style="padding: 8px 8px; vertical-align: middle;">
          <div style="font-weight: 600; color: #2c3e50; font-size: 11px; line-height: 1.3; margin-bottom: 1px;">${item.ultimaRodada?.goleiroNome || "Sem goleiro"}</div>
          ${item.ultimaRodada?.goleiroClube ? `<div style="font-size: 9px; color: #6c757d; line-height: 1.2;">${item.ultimaRodada.goleiroClube}</div>` : ""}
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <div style="font-weight: 600; color: ${(item.ultimaRodada?.pontos || 0) >= 0 ? '#27ae60' : '#e74c3c'}; font-size: 11px; line-height: 1.3;">${Math.floor((item.ultimaRodada?.pontos || 0) * 100) / 100}</div>
          <div style="font-size: 9px; color: #6c757d; line-height: 1.2;">R${item.ultimaRodada?.rodada || "-"}</div>
        </td>
        <td style="padding: 8px 6px; text-align: center; vertical-align: middle;">
          <button class="btn-detalhes" onclick="mostrarDetalhesParticipante(${item.participanteId}, '${item.participanteNome.replace(/'/g, "\\'")}'))" 
                  style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(52, 152, 219, 0.3);"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(52, 152, 219, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(52, 152, 219, 0.3)'">
            Detalhes
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <!-- ESTATÍSTICAS MODERNIZADAS -->
    <div class="luva-estatisticas" style="margin-top: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${Math.floor((rankingData[0]?.pontosTotais || 0) * 100) / 100}</div>
        <div style="opacity: 0.95; font-size: 14px; font-weight: 600;">🏆 Melhor Pontuação</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">${rankingData[0]?.participanteNome || "-"}</div>
      </div>
      <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${totalParticipantes}</div>
        <div style="opacity: 0.95; font-size: 14px; font-weight: 600;">👥 Participantes</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">Liga ativa</div>
      </div>
      <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);">
        <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${Math.floor(Math.max(...rankingData.map((r) => r.ultimaRodada?.pontos || 0)) * 100) / 100}</div>
        <div style="opacity: 0.95; font-size: 14px; font-weight: 600;">🎯 Melhor Rodada</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">Individual</div>
      </div>
    </div>
  `;

  return html;
}

function criarBotaoExport(dados) {
  return `
    <button id="exportLuvaImagem" class="btn-export" 
            style="background: linear-gradient(135deg, #2E8B57 0%, #32CD32 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font: 500 14px Inter, sans-serif; display: inline-flex; align-items: center; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
      </svg>
      📊 Exportar Ranking
    </button>
  `;
}

async function exportarLuvaOuroComoImagem(dados) {
  if (!dados || !dados.ranking) {
    alert("Nenhum dado para exportar");
    return;
  }

  const btnExport = document.getElementById("exportLuvaImagem");
  const textoOriginal = btnExport ? btnExport.innerHTML : "";

  try {
    if (btnExport) {
      btnExport.innerHTML = `
        <div style="width: 16px; height: 16px; margin-right: 8px;">
          <div style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        Gerando Imagem...
      `;
      btnExport.disabled = true;
    }

    console.log("[LUVA-OURO] 🎨 Criando exportação de imagem...");

    // Verificar se html2canvas está disponível
    if (!window.html2canvas) {
      console.log("[LUVA-OURO] html2canvas não disponível, carregando...");
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => {
          console.log("[LUVA-OURO] Falha ao carregar html2canvas, usando CSV");
          exportarCSV(dados);
          reject(new Error("html2canvas não carregou"));
        };
        document.head.appendChild(script);
      });
    }

    // Criar container de exportação
    const exportDiv = document.createElement("div");
    exportDiv.id = "luva-ouro-export-temp";
    exportDiv.style.cssText = `
      position: absolute;
      top: -99999px;
      left: -99999px;
      width: 800px;
      background: white;
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      color: #2c2c2c;
    `;

    // Layout da exportação
    exportDiv.innerHTML = criarLayoutExportacao(dados);
    document.body.appendChild(exportDiv);

    // Aguardar renderização
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Gerar canvas
    const canvas = await html2canvas(exportDiv, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      logging: false,
      width: 800,
      height: exportDiv.scrollHeight,
      backgroundColor: "#ffffff",
    });

    // Download
    const timestamp = new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const filename = `luva-de-ouro-rodadas-${dados.rodadaInicio}-${dados.rodadaFim}-${timestamp}.png`;

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();

    console.log("[LUVA-OURO] ✅ Imagem exportada com sucesso");
    mostrarNotificacao("Imagem exportada com sucesso!", "success");
  } catch (error) {
    console.error("[LUVA-OURO] ❌ Erro na exportação:", error);
    mostrarNotificacao("Erro ao exportar imagem. Usando CSV.", "warning");
    // Fallback para CSV
    exportarCSV(dados);
  } finally {
    // Limpar
    const tempDiv = document.getElementById("luva-ouro-export-temp");
    if (tempDiv) {
      document.body.removeChild(tempDiv);
    }

    if (btnExport) {
      btnExport.innerHTML = textoOriginal;
      btnExport.disabled = false;
    }
  }
}

function criarLayoutExportacao(dados) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!-- HEADER PROFISSIONAL -->
    <div style="background: linear-gradient(135deg, #2E8B57 0%, #228B22 100%); color: white; padding: 24px; text-align: center; position: relative;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
        <img src="/img/logo-cartoleirossobral.png" style="height: 42px; width: auto; filter: brightness(1.1);" alt="Cartoleiros Sobral" onerror="this.outerHTML='<div style=\\'width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font:bold 14px Inter;\\'>CS</div>'">
        <div>
          <h1 style="font: 700 28px Inter, sans-serif; margin: 0 0 3px 0;">Cartoleiros Sobral 2025</h1>
          <h2 style="font: 600 18px Inter, sans-serif; margin: 0 0 6px 0;">🥅 Ranking Luva de Ouro</h2>
          <div style="background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 16px; display: inline-block;">
            <span style="font: 600 13px Inter, sans-serif;">RODADAS ${dados.rodadaInicio} A ${dados.rodadaFim}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="padding: 24px;">
      <!-- TABELA DE RANKING -->
      <div style="background: white; border-radius: 10px; padding: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e0e0e0;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background: #2E8B57; color: white;">
              <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">POS</th>
              <th style="width: 50px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">❤️</th>
              <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif;">CARTOLEIRO</th>
              <th style="width: 80px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">TOTAL</th>
              <th style="width: 70px; text-align: center; padding: 10px 6px; font: 600 11px Inter, sans-serif;">JOGOS</th>
              <th style="text-align: left; padding: 10px 6px; font: 600 11px Inter, sans-serif;">ÚLTIMO GOLEIRO</th>
            </tr>
          </thead>
          <tbody>
            ${dados.ranking
              .map((item, index) => {
                const posContent =
                  index === 0
                    ? "🏆"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : `${item.posicao}º`;
                const rowBg =
                  index === 0
                    ? "background: #e7f3ff;"
                    : index % 2 === 0
                      ? "background: #f8f9fa;"
                      : "";

                return `
                <tr style="border-bottom: 1px solid #e0e0e0; ${rowBg}">
                  <td style="text-align:center; padding: 8px 6px; font-weight: bold;">${posContent}</td>
                  <td style="text-align:center; padding: 8px 6px;">
                    <img src="/escudos/${item.clubeId || "default"}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display='none'"/>
                  </td>
                  <td style="text-align:left; padding: 8px 6px;">
                    <div style="font-weight:600; font-size: 12px;">${item.participanteNome}</div>
                    <div style="color:#666; font-size:10px;">ID: ${item.participanteId}</div>
                  </td>
                  <td style="text-align:center; padding: 8px 6px; font: 600 14px Inter, sans-serif; color: #2E8B57;">
                    ${item.pontosTotais}
                  </td>
                  <td style="text-align:center; padding: 8px 6px; color: #666; font-size: 11px;">
                    ${item.rodadasJogadas || item.totalJogos || 0}
                  </td>
                  <td style="text-align:left; padding: 8px 6px;">
                    <div style="font-size: 11px;">
                      <span style="font-weight: 500;">${item.ultimaRodada?.goleiroNome || "Sem goleiro"}</span>
                      ${item.ultimaRodada?.pontos ? `<span style="color: #27ae60; margin-left: 8px;">${item.ultimaRodada.pontos}pts</span>` : ""}
                    </div>
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- ESTATÍSTICAS -->
      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 14px; border-radius: 8px; text-align: center;">
          <h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🏆 LÍDER</h4>
          <p style="font: 700 16px Inter, sans-serif; margin: 0;">${dados.ranking[0]?.pontosTotais || 0} pts</p>
          <p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">${dados.ranking[0]?.participanteNome || "N/D"}</p>
        </div>
        <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 14px; border-radius: 8px; text-align: center;">
          <h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🎯 PARTICIPANTES</h4>
          <p style="font: 700 16px Inter, sans-serif; margin: 0;">${dados.ranking.length}</p>
          <p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">Cartoleiros ativos</p>
        </div>
        <div style="background: linear-gradient(135deg, #e67e22, #d35400); color: white; padding: 14px; border-radius: 8px; text-align: center;">
          <h4 style="font: 600 10px Inter, sans-serif; margin: 0 0 4px 0;">🥅 MELHOR RODADA</h4>
          <p style="font: 700 16px Inter, sans-serif; margin: 0;">${Math.max(...dados.ranking.map((r) => r.ultimaRodada?.pontos || 0))} pts</p>
          <p style="font: 400 9px Inter, sans-serif; margin: 2px 0 0 0;">Individual</p>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background: white; border-top: 1px solid #e0e0e0; padding: 12px 24px; text-align: center;">
      <p style="font: 11px Inter, sans-serif; margin: 0; color: #666;">
        Gerado em ${dataFormatada} • SuperCartola Manager v2.3.0<br>
        Sistema de Gerenciamento de Ligas do Cartola FC
      </p>
    </div>
  `;
}

function exportarCSV(dados) {
  if (!dados || !dados.ranking) {
    alert("Nenhum dado para exportar");
        return;
  }

  const { ranking, rodadaInicio, rodadaFim } = dados;

  // Cabeçalho do CSV
  let csv =
    "Posicao,Cartoleiro,ID_Participante,Pontos_Totais,Rodadas_Jogadas,Melhor_Rodada,Pior_Rodada,Ultimo_Goleiro,Ultimo_Clube,Ultimo_Pontos,Ultima_Rodada\n";

  // Dados
  ranking.forEach((item) => {
    csv +=
      [
        item.posicao,
        `"${item.participanteNome}"`,
        item.participanteId,
        item.pontosTotais,
        item.rodadasJogadas || item.totalJogos || 0,
        item.melhorRodada || 0,
        item.piorRodada || 0,
        `"${item.ultimaRodada?.goleiroNome || "Sem goleiro"}"`,
        `"${item.ultimaRodada?.goleiroClube || "N/A"}"`,
        item.ultimaRodada?.pontos || 0,
        item.ultimaRodada?.rodada || 0,
      ].join(",") + "\n";
  });

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    download",
    `luva_de_ouro_r${rodadaInicio}_a_r${rodadaFim}_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log("📊 CSV exportado com sucesso");
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const cores = {
    success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
    error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
    info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
    warning: { bg: "#fff3cd", border: "#ffeaa7", text: "#856404" },
  };

  const cor = cores[tipo] || cores.info;

  const notificacao = document.createElement("div");
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${cor.bg};
    border: 1px solid ${cor.border};
    color: ${cor.text};
    padding: 16px 24px;
    border-radius: 8px;
    font: 500 14px Inter, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  notificacao.textContent = mensagem;
  document.body.appendChild(notificacao);

  // Animação de entrada
  requestAnimationFrame(() => {
    notificacao.style.transform = "translateX(0)";
  });

  // Remover após 3 segundos
  setTimeout(() => {
    notificacao.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notificacao.parentNode) {
        document.body.removeChild(notificacao);
      }
    }, 300);
  }, 3000);
}

function mostrarLoading(
  container,
  mensagem = "Carregando dados dos goleiros...",
) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px; color: #666;">
      <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
      <p style="margin: 0; font-size: 16px;">${mensagem}</p>
    </div>
  `;
}

function mostrarErro(container, erro, detalhes = null) {
  container.innerHTML = `
    <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin: 0 0 10px 0;">❌ Erro ao carregar Luva de Ouro</h4>
      <p style="margin: 0 0 10px 0;"><strong>Erro:</strong> ${erro}</p>
      ${detalhes ? `<p style="margin: 0; font-size: 14px; opacity: 0.8;">${detalhes}</p>` : ""}
      <button onclick="window.location.reload()" style="margin-top: 15px; background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        🔄 Recarregar Página
      </button>
    </div>
  `;
}

// ===== FUNÇÕES DE DETALHES =====

async function mostrarDetalhesParticipante(participanteId, participanteNome) {
  console.log(`🔍 Carregando detalhes de ${participanteNome} (${participanteId})`);

  try {
    // Obter parâmetros de rodada
    const inicio = parseInt(document.getElementById("luvaRodadaInicio")?.value) || 1;
    const fim = parseInt(document.getElementById("luvaRodadaFim")?.value) || 14;

    // Buscar detalhes na API
    const response = await fetch(
      `${API_BASE}/${LIGA_SOBRAL_ID}/participante/${participanteId}/detalhes?inicio=${inicio}&fim=${fim}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao buscar detalhes");
    }

    // Criar modal com detalhes
    criarModalDetalhes(data.data);

  } catch (error) {
    console.error("❌ Erro ao buscar detalhes:", error);
    alert(`Erro ao carregar detalhes de ${participanteNome}: ${error.message}`);
  }
}

function criarModalDetalhes(dados) {
  // Remover modal existente se houver
  const modalExistente = document.getElementById("modalDetalhesParticipante");
  if (modalExistente) {
    modalExistente.remove();
  }

  // Criar modal
  const modal = document.createElement("div");
  modal.id = "modalDetalhesParticipante";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
        <div>
          <h3 style="margin: 0; color: #2c3e50;">${dados.participanteNome}</h3>
          <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">Rodadas ${dados.rodadaInicio} a ${dados.rodadaFim}</p>
        </div>
        <button onclick="fecharModalDetalhes()" style="background: #e74c3c; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px;">×</button>
      </div>

      <!-- Estatísticas Resumo -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: #27ae60; color: white; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold;">${Math.floor(dados.totalPontos * 100) / 100}</div>
          <div style="font-size: 12px; opacity: 0.9;">Total de Pontos</div>
        </div>
        <div style="background: #3498db; color: white; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold;">${dados.totalRodadas}</div>
          <div style="font-size: 12px; opacity: 0.9;">Rodadas Jogadas</div>
        </div>
        <div style="background: #f39c12; color: white; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold;">${Math.floor(dados.estatisticas.melhorRodada * 100) / 100}</div>
          <div style="font-size: 12px; opacity: 0.9;">Melhor Rodada</div>
        </div>
        <div style="background: #e74c3c; color: white; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold;">${Math.floor(dados.estatisticas.mediaPontos * 100) / 100}</div>
          <div style="font-size: 12px; opacity: 0.9;">Média por Rodada</div>
        </div>
      </div>

      <!-- Histórico Detalhado -->
      <h4 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Histórico por Rodada</h4>
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="background: #f8f9fa; position: sticky; top: 0;">
            <tr>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">R</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Goleiro</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Clube</th>
              <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">Pontos</th>
            </tr>
          </thead>
          <tbody>
            ${dados.rodadas.map(rodada => `
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px; text-align: center; font-weight: bold;">${rodada.rodada}</td>
                <td style="padding: 8px; text-align: left;">${rodada.goleiroNome || 'Sem goleiro'}</td>
                <td style="padding: 8px; text-align: left; font-size: 12px; color: #666;">${rodada.goleiroClube || '-'}</td>
                <td style="padding: 8px; text-align: center; font-weight: bold; color: ${rodada.pontos >= 0 ? '#27ae60' : '#e74c3c'};">
                  ${Math.floor(rodada.pontos * 100) / 100}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fechar ao clicar fora
  modal.onclick = (e) => {
    if (e.target === modal) {
      fecharModalDetalhes();
    }
  };
}

function fecharModalDetalhes() {
  const modal = document.getElementById("modalDetalhesParticipante");
  if (modal) {
    modal.remove();
  }
}

// ===== FUNÇÕES PRINCIPAIS =====

async function carregarRankingLuvaDeOuro(forcarColeta = false) {
  const container = document.getElementById("luvaDeOuroContent");
  const exportContainer = document.getElementById(
    luvaDeOuroExportBtnContainer",
  );

  if (!container) {
    console.error("❌ Container #luvaDeOuroContent não encontrado");
    return;
  }

  try {
    dadosLuvaDeOuro.carregando = true;

    // Obter valores dos inputs
    const inicio =
      parseInt(document.getElementById("luvaRodadaInicio")?.value) || 1;
    const fim =
      parseInt(document.getElementById("luvaRodadaFim")?.value) || null;

    console.log(
      `🎯 Carregando ranking: ${inicio} a ${fim || "atual"} (forçar: ${forcarColeta})`,
    );

    mostrarLoading(
      container,
      forcarColeta ? "Coletando novos dados..." : "Buscando ranking...",
    );

    // Buscar dados
    const dados = await buscarRankingGoleiros(inicio, fim, forcarColeta);
    dadosLuvaDeOuro.ranking = dados;

    // Renderizar tabela
    container.innerHTML = criarTabelaRanking(dados);

    // Criar botão de export
    if (exportContainer) {
      exportContainer.innerHTML = criarBotaoExport(dados);

      // Configurar evento de export
      const btnExport = document.getElementById("exportLuvaImagem");
      if (btnExport) {
        btnExport.onclick = () => exportarLuvaOuroComoImagem(dados);

        // Efeitos hover
        btnExport.onmouseover = () => {
          btnExport.style.transform = "translateY(-2px)";
          btnExport.style.boxShadow = "0 6px 20px rgba(46, 139, 87, 0.4)";
        };

        btnExport.onmouseout = () => {
          btnExport.style.transform = "translateY(0)";
          btnExport.style.boxShadow = "0 4px 12px rgba(46, 139, 87, 0.3)";
        };
      }
    }

    console.log("✅ Ranking Luva de Ouro carregado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao carregar ranking:", error);
    mostrarErro(
      container,
      error.message,
      "Verifique a conexão ou tente novamente",
    );
  } finally {
    dadosLuvaDeOuro.carregando = false;
  }
}

async function carregarUltimaRodada() {
  try {
    const infoContainer = document.getElementById("luvaInfoTexto");
    const fimInput = document.getElementById("luvaRodadaFim");

    if (infoContainer) {
      infoContainer.textContent = "Detectando última rodada...";
    }

    // Detectar rodada
    const deteccao = await detectarUltimaRodada();

    // Atualizar interface
    if (fimInput) {
      fimInput.value = deteccao.recomendacao;
    }

    if (infoContainer) {
      infoContainer.innerHTML = `
        <strong>Rodada atual:</strong> ${deteccao.rodadaAtualCartola} | 
        <strong>Mercado:</strong> ${deteccao.mercadoFechado ? "Fechado" : "Aberto"} | 
        <strong>Recomendado:</strong> até rodada ${deteccao.recomendacao}
      `;
    }

    console.log("✅ Rodada detectada e interface atualizada");
  } catch (error) {
    console.error("❌ Erro ao detectar rodada:", error);
    const infoContainer = document.getElementById("luvaInfoTexto");
    if (infoContainer) {
      infoContainer.textContent = `Erro: ${error.message}`;
    }
  }
}

// ===== FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO =====

async function inicializarLuvaDeOuro() {
  console.log("🥅 [LUVA-DE-OURO] Inicializando módulo...");

  try {
    const container = document.getElementById("luvaDeOuroContent");
    const exportContainer = document.getElementById(
      luvaDeOuroExportBtnContainer",
    );

    if (!container) {
      console.error("❌ Container #luvaDeOuroContent não encontrado");
      return;
    }

    console.log("🎛️ Criando interface...");

    // Criar interface inicial
    container.innerHTML = criarControlesLuvaDeOuro();
    if (exportContainer) {
      exportContainer.innerHTML = "";
    }

    // Configurar event listeners
    const btnRanking = document.getElementById("luvaRankingBtn");
    const btnUltimaRodada = document.getElementById("luvaUltimaRodadaBtn");
    const btnForcarColeta = document.getElementById("luvaForcarColetaBtn");

    if (btnRanking) {
      btnRanking.onclick = () => carregarRankingLuvaDeOuro(false);
    }

    if (btnUltimaRodada) {
      btnUltimaRodada.onclick = async () => {
        await carregarUltimaRodada();
        // Após detectar, carregar automaticamente
        setTimeout(() => carregarRankingLuvaDeOuro(false), 500);
      };
    }

    if (btnForcarColeta) {
      btnForcarColeta.onclick = () => carregarRankingLuvaDeOuro(true);
    }

    console.log("✅ Luva de Ouro inicializado com sucesso");
    console.log(
      "📋 Controles disponíveis: Gerar Ranking, Última Rodada, Forçar Coleta",
    );
  } catch (error) {
    console.error("❌ Erro ao inicializar Luva de Ouro:", error);
    const container = document.getElementById("luvaDeOuroContent");
    if (container) {
      mostrarErro(container, "Erro na inicialização", error.message);
    }
  }
}

// ===== FUNÇÕES DE EMERGÊNCIA =====

// Função global para depuração
window.forcarLuvaDeOuroAgora = async () => {
  console.log("🆘 [EMERGÊNCIA] Forçando Luva de Ouro...");
  try {
    await inicializarLuvaDeOuro();
    console.log("✅ Luva de Ouro forçado com sucesso");
  } catch (error) {
    console.error("❌ Falha no modo emergência:", error);
  }
};

// Função de teste manual
window.testarLuvaDeOuro = function () {
  console.log("🧪 [TESTE] Forçando inicialização do Luva de Ouro...");
  try {
    inicializarLuvaDeOuro();
    console.log("✅ [TESTE] Sucesso!");
  } catch (error) {
    console.error("❌ [TESTE] Erro:", error);
  }
};

// ===== ADICIONAR ESTILOS CSS =====

if (!document.getElementById("luva-ouro-styles")) {
  const styleElement = document.createElement("style");
  styleElement.id = "luva-ouro-styles";
  styleElement.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .luva-ranking-table {
      font-size: 11px !important;
    }

    .luva-ranking-table th {
      white-space: nowrap;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .luva-ranking-table td {
      white-space: nowrap;
    }

    .luva-ranking-table td:nth-child(3),
    .luva-ranking-table td:nth-child(5) {
      white-space: normal;
      word-wrap: break-word;
    }

    @media (max-width: 768px) {
      .luva-ranking-table {
        font-size: 10px !important;
      }

      .luva-ranking-table th,
      .luva-ranking-table td {
        padding: 6px 3px !important;
      }

      .luva-ranking-table th {
        font-size: 9px !important;
      }
    }

    @media (max-width: 600px) {
      .luva-ranking-table th:nth-child(6),
      .luva-ranking-table td:nth-child(6) {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .luva-ranking-table th:nth-child(5),
      .luva-ranking-table td:nth-child(5) {
        display: none;
      }

      .luva-ranking-table th,
      .luva-ranking-table td {
        padding: 4px 2px !important;
      }
    }
  `;
  document.head.appendChild(styleElement);
}

// Log de status
console.log("🥅 [LUVA-DE-OURO] Módulo pronto para uso");
console.log("🆘 Em caso de erro: window.forcarLuvaDeOuroAgora()");
console.log("🧪 Para testar manualmente: window.testarLuvaDeOuro()");

// ===== EXPORTAÇÃO GLOBAL PARA COMPATIBILIDADE COM HTML =====
window.mostrarDetalhesParticipante = mostrarDetalhesParticipante;
window.inicializarLuvaDeOuro = inicializarLuvaDeOuro;

// ===== VERIFICAÇÃO DE EXPORTAÇÕES =====
console.log("🥅 [LUVA-DE-OURO] Verificando exportações...");
console.log("🔍 inicializarLuvaDeOuro definida:", typeof inicializarLuvaDeOuro);
console.log("🔍 mostrarDetalhesParticipante definida:", typeof mostrarDetalhesParticipante);

// ===== EXPORTAÇÃO ES6 PARA COMPATIBILIDADE =====
export { inicializarLuvaDeOuro, mostrarDetalhesParticipante };
export default inicializarLuvaDeOuro;
console.log(
  "📤 [LUVA-DE-OURO] Exportações ES6 adicionadas para compatibilidade",
);
console.log("🔍 Exportações disponíveis:", { inicializarLuvaDeOuro, mostrarDetalhesParticipante });