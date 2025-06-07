// Função utilitária para obter dados da liga ativa
function getLigaAtivaInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  const ligaId = urlParams.get("id");
  const ligas = {
    "67f02282465c9749496b59e2": {
      nome: "SuperCartola 2025",
      logo: "/img/logo-supercartola.png",
    },
    "6818c6125b30e1ad70847192": {
      nome: "Cartoleiros Sobral 2025",
      logo: "/img/logo-cartoleirossobral.png",
    },
  };
  return ligas[ligaId] || ligas["67f02282465c9749496b59e2"];
}

// Função para criar o cabeçalho e container de exportação
export function criarDivExportacao(titulo, subtitulo = "", maxWidth = "900px") {
  const { nome, logo } = getLigaAtivaInfo();
  const exportDiv = document.createElement("div");
  exportDiv.style = `background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0002; padding: 24px; min-width: 600px; max-width: ${maxWidth}; margin: 0 auto; font-family: 'Roboto', Arial, sans-serif;`;

  exportDiv.innerHTML = `
    <div style="text-align:center; margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
      <div style="display:flex; align-items:center; justify-content:center; gap:10px; font-size: 1.8rem; font-weight: bold; color: #2c3e50;">
        <img src="${logo}" alt="${nome}" style="height:35px; vertical-align:middle; margin-right:5px;"/>
        <span>${nome}</span>
      </div>
      ${titulo ? `<div style="font-size: 1.4rem; font-weight: 600; margin-top: 8px; color: #34495e;">${titulo}</div>` : ""}
      ${subtitulo ? `<div style="font-size: 1.1rem; font-weight: 400; margin-top: 4px; color: #888;">${subtitulo}</div>` : ""}
    </div>
  `;
  return exportDiv;
}

// Função para formatar moeda
function formatarMoedaExport(valor) {
  const abs = Math.abs(valor).toFixed(2).replace(".", ",");
  return valor >= 0 ? `R$ ${abs}` : `-R$ ${abs}`;
}

// Função para gerar canvas e download
export async function gerarCanvasDownload(element, filename) {
  try {
    const canvas = await window.html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2.5,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();
  } catch (error) {
    console.error("Erro no html2canvas ou download:", error);
    throw error;
  } finally {
    if (element && element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  }
}

// Função para criar o botão de exportação de rodada
export function criarBotaoExportacaoRodada({
  containerId,
  rodada,
  rankings,
  tipo = "rodada",
  customExport = null,
}) {
  const container =
    typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
  if (!container) {
    console.warn(
      `Container para botão de exportação não encontrado:`,
      containerId,
    );
    return;
  }

  container.innerHTML = "";

  const btn = document.createElement("button");
  btn.textContent = "Exportar Imagem";
  btn.className = "btn-exportar-imagem";
  btn.style.padding = "5px 12px";
  btn.style.fontSize = "0.85rem";
  btn.style.background = "#34495e";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.fontWeight = "bold";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 1px 4px #0001";
  btn.style.marginLeft = "5px";

  btn.onclick = (e) => {
    e.stopPropagation();
    btn.textContent = "Exportando...";
    btn.disabled = true;

    setTimeout(async () => {
      try {
        if (typeof customExport === "function") {
          await customExport(rankings, rodada, tipo);
        } else {
          await exportarRodadaComoImagem(rankings, rodada, tipo);
        }
      } finally {
        btn.textContent = "Exportar Imagem";
        btn.disabled = false;
      }
    }, 100);
  };

  container.appendChild(btn);
}

// Função para exportar rodada como imagem
export async function exportarRodadaComoImagem(
  rankings,
  rodada,
  tipo = "rodada",
) {
  const titulo =
    tipo === "rodada" ? `Ranking da Rodada ${rodada}` : "Ranking Geral";
  const exportDiv = criarDivExportacao(titulo);

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 50px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Cartoleiro</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Time</th>
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Escudo</th>
          <th style="width: 70px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pontos</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Banco</th>
        </tr>
      </thead>
      <tbody>
        ${rankings
          .map((t, i) => {
            let posContent = "";
            if (i === 0) {
              posContent = `<span style="background:#198754; color:#fff; font-weight:bold; border-radius:4px; padding:2px 8px; font-size:0.9em;">MITO</span>`;
            } else if (i === rankings.length - 1 && rankings.length > 1) {
              posContent = `<span style="background:#dc3545; color:#fff; font-weight:bold; border-radius:4px; padding:2px 8px; font-size:0.9em;">MICO</span>`;
            } else {
              posContent = `${i + 1}º`;
            }

            let banco =
              t.banco !== undefined && t.banco !== null
                ? t.banco >= 0
                  ? `<span style="color:#198754;font-weight:600;">$${t.banco.toFixed(2)}</span>`
                  : `<span style="color:#dc3545;font-weight:600;">-$${Math.abs(t.banco).toFixed(2)}</span>`
                : "—";

            const nomeCartoleiro = t.nome_cartola || t.nome_cartoleiro || "N/D";
            const nomeTime = t.nome_time || t.nome || "N/D";

            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 7px 5px;">${posContent}</td>
                <td style="text-align:left; padding: 7px 5px; font-weight:600;">${nomeCartoleiro}</td>
                <td style="text-align:left; padding: 7px 5px;">${nomeTime}</td>
                <td style="text-align:center; padding: 7px 5px;">
                  ${t.clube_id ? `<img src="/escudos/${t.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee; vertical-align: middle;" onerror="this.style.display=\'none\'"/>` : "—"}
                </td>
                <td style="text-align:center; padding: 7px 5px; font-weight:600;">${t.pontos.toFixed(2)}</td>
                <td style="text-align:center; padding: 7px 5px;">${banco}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(exportDiv, `rodada_${rodada}.png`);
}

// Exportação de Ranking Geral
export async function exportarRankingGeralComoImagem(rankings, rodada) {
  const titulo = `Ranking Geral`;
  const subtitulo = `Pontuação até a ${rodada}ª rodada`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "700px");

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">❤️</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Cartoleiro / Time</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pontos</th>
        </tr>
      </thead>
      <tbody>
        ${rankings
          .map((time, index) => {
            const nomeCartoleiro =
              time.nome_cartola || time.nome_cartoleiro || "N/D";
            const nomeTime = time.nome_time || time.nome || "N/D";
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 7px 5px;">
                  ${index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`}
                </td>
                <td style="text-align:center; padding: 7px 5px;">
                  ${time.clube_id ? `<img src="/escudos/${time.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee; vertical-align: middle;" onerror="this.style.display=\'none\'"/>` : "—"}
                </td>
                <td style="text-align:left; padding: 7px 5px;">
                  <span style="font-weight:600;">${nomeCartoleiro}</span>
                  <span style="color:#6c757d; font-size:0.9em; margin-left:8px;">${nomeTime}</span>
                </td>
                <td style="text-align:center; padding: 7px 5px; font-weight:600;">${time.pontos.toFixed(2)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(exportDiv, `ranking_geral_rodada${rodada}.png`);
}

// Exportação Melhor do Mês
export async function exportarMelhorMesComoImagem(rankings, edicao) {
  const titulo = `Ranking Melhor do Mês - ${edicao.nome}`;
  const subtitulo = `Pontuação das rodadas ${edicao.inicio} a ${edicao.fim}`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "700px");

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Cartoleiro</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Time</th>
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Escudo</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pontos</th>
        </tr>
      </thead>
      <tbody>
        ${rankings
          .map((t, i) => {
            const nomeCartoleiro = t.nome_cartola || t.nome_cartoleiro || "N/D";
            const nomeTime = t.nome_time || t.nome || "N/D";
            return `
              <tr style="border-bottom: 1px solid #eee; ${i === 0 ? "background:#e7f3ff; font-weight:bold;" : ""}">
                <td style="text-align:center; padding: 7px 5px;">${i === 0 ? "🏆" : i + 1}</td>
                <td style="text-align:left; padding: 7px 5px;">${nomeCartoleiro}</td>
                <td style="text-align:left; padding: 7px 5px;">${nomeTime}</td>
                <td style="text-align:center; padding: 7px 5px;">
                  ${t.clube_id ? `<img src="/escudos/${t.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee; vertical-align: middle;" onerror="this.style.display=\'none\'"/>` : "—"}
                </td>
                <td style="text-align:center; padding: 7px 5px; font-weight:600;">${t.pontos.toFixed(2)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(
    exportDiv,
    `melhor_mes_${edicao.nome.replace(/\s/g, "_")}.png`,
  );
}

// Exportação específica para Pontos Corridos Rodada
export async function exportarPontosCorridosRodadaComoImagem(
  jogos,
  rodadaLiga,
  rodadaCartola,
  times,
) {
  const titulo = `Liga Pontos Corridos - ${rodadaLiga}ª Rodada`;
  const subtitulo = `Rodada ${rodadaCartola}ª do Brasileirão`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "900px");

  let tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">#</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Time 1</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pts 1</th>
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">X</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pts 2</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Time 2</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Dif</th>
        </tr>
      </thead>
      <tbody>
  `;

  jogos.forEach((jogo, i) => {
    const timeA = jogo.timeA || {};
    const timeB = jogo.timeB || {};
    const temPontuacao =
      timeA.pontos !== undefined &&
      timeA.pontos !== null &&
      timeB.pontos !== undefined &&
      timeB.pontos !== null;

    let classPtsA = "font-weight: 600;";
    let classPtsB = "font-weight: 600;";
    let goleadaA = false;
    let goleadaB = false;

    if (temPontuacao) {
      if (timeA.pontos > timeB.pontos) {
        classPtsA += " color: #198754;";
        classPtsB += " color: #dc3545;";
      } else if (timeB.pontos > timeA.pontos) {
        classPtsB += " color: #198754;";
        classPtsA += " color: #dc3545;";
      }
      goleadaA = timeA.pontosGoleada > 0;
      goleadaB = timeB.pontosGoleada > 0;
    }

    const dif =
      jogo.diferenca !== null
        ? jogo.diferenca.toFixed(2).replace(".", ",")
        : "-";

    const pontosA = temPontuacao
      ? `${timeA.pontos.toFixed(2).replace(".", ",")}${goleadaA ? " 🔥" : ""}`
      : "-";

    const pontosB = temPontuacao
      ? `${timeB.pontos.toFixed(2).replace(".", ",")}${goleadaB ? " 🔥" : ""}`
      : "-";

    const financeiroA =
      temPontuacao && timeA.financeiro !== 0
        ? `<span style="font-size: 0.8em; color: ${timeA.financeiro > 0 ? "#198754" : "#dc3545"};">(${timeA.financeiro > 0 ? "+" : ""}R$ ${timeA.financeiro.toFixed(2).replace(".", ",")})</span>`
        : "";

    const financeiroB =
      temPontuacao && timeB.financeiro !== 0
        ? `<span style="font-size: 0.8em; color: ${timeB.financeiro > 0 ? "#198754" : "#dc3545"};">(${timeB.financeiro > 0 ? "+" : ""}R$ ${timeB.financeiro.toFixed(2).replace(".", ",")})</span>`
        : "";

    const linhaGoleadaClass =
      goleadaA || goleadaB ? "background-color: #fff3e0;" : "";

    tabelaHtml += `
      <tr style="border-bottom: 1px solid #eee; ${linhaGoleadaClass}">
        <td style="text-align:center; padding: 7px 5px; font-weight: 600;">${i + 1}</td>
        <td style="text-align:left; padding: 7px 5px;">
          <div style="display:flex; align-items:center; gap:5px;">
            ${timeA.clube_id ? `<img src="/escudos/${timeA.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>` : ""}
            <div>
              <div style="font-weight: 500; font-size: 0.9em;">${timeA.nome_time || "N/D"}</div>
              <div style="font-size: 0.8em; color: #777;">${timeA.nome_cartola || "N/D"}</div>
            </div>
          </div>
        </td>
        <td style="text-align:center; padding: 7px 5px;">
          <span style="${classPtsA}">${pontosA}</span>
          ${financeiroA}
        </td>
        <td style="text-align:center; padding: 7px 5px; font-weight: 600;">X</td>
        <td style="text-align:center; padding: 7px 5px;">
          <span style="${classPtsB}">${pontosB}</span>
          ${financeiroB}
        </td>
        <td style="text-align:left; padding: 7px 5px;">
          <div style="display:flex; align-items:center; gap:5px;">
            ${timeB.clube_id ? `<img src="/escudos/${timeB.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>` : ""}
            <div>
              <div style="font-weight: 500; font-size: 0.9em;">${timeB.nome_time || "N/D"}</div>
              <div style="font-size: 0.8em; color: #777;">${timeB.nome_cartola || "N/D"}</div>
            </div>
          </div>
        </td>
        <td style="text-align:center; padding: 7px 5px; font-weight: 600;">${dif}</td>
      </tr>
    `;
  });

  tabelaHtml += `
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(
    exportDiv,
    `pontos_corridos_rodada${rodadaLiga}.png`,
  );
}

// Exportação específica para Classificação Pontos Corridos
export async function exportarClassificacaoPontosCorridosComoImagem(
  classificacao,
  rodadaLiga,
  rodadaCartola,
) {
  const titulo = `Classificação Pontos Corridos - ${rodadaLiga}ª Rodada`;
  const subtitulo = `Pontuação até a ${rodadaCartola}ª rodada do Brasileirão`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "900px");

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Cartoleiro / Time</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">P</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">J</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">V</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">E</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">D</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">GP</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">GC</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">SG</th>
        </tr>
      </thead>
      <tbody>
        ${classificacao
          .map((time, index) => {
            const nomeCartoleiro =
              time.nome_cartola || time.nome_cartoleiro || "N/D";
            const nomeTime = time.nome_time || time.nome || "N/D";
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 7px 5px;">${index + 1}</td>
                <td style="text-align:left; padding: 7px 5px;">
                  <div style="display:flex; align-items:center; gap:5px;">
                    ${time.clube_id ? `<img src="/escudos/${time.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>` : ""}
                    <div>
                      <div style="font-weight: 500; font-size: 0.9em;">${nomeCartoleiro}</div>
                      <div style="font-size: 0.8em; color: #777;">${nomeTime}</div>
                    </div>
                  </div>
                </td>
                <td style="text-align:center; padding: 7px 5px; font-weight:600;">${time.pontos}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.jogos}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.vitorias}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.empates}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.derrotas}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.golsPro}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.golsContra}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.saldoGols}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(
    exportDiv,
    `classificacao_pontos_corridos_rodada${rodadaLiga}.png`,
  );
}

// Exportação Top 10
export async function exportarTop10ComoImagem(top10, rodada) {
  const titulo = `Top 10 da Rodada ${rodada}`;
  const exportDiv = criarDivExportacao(titulo, "", "700px");

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Cartoleiro</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Time</th>
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Escudo</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pontos</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Banco</th>
        </tr>
      </thead>
      <tbody>
        ${top10
          .map((t, i) => {
            let posContent = "";
            if (i === 0) {
              posContent = `<span style="background:#ffc107; color:#343a40; font-weight:bold; border-radius:4px; padding:2px 8px; font-size:0.9em;">#1</span>`;
            } else {
              posContent = `#${i + 1}`;
            }

            let banco =
              t.banco !== undefined && t.banco !== null
                ? t.banco >= 0
                  ? `<span style="color:#198754;font-weight:600;">$${t.banco.toFixed(2)}</span>`
                  : `<span style="color:#dc3545;font-weight:600;">-$${Math.abs(t.banco).toFixed(2)}</span>`
                : "—";

            const nomeCartoleiro = t.nome_cartola || t.nome_cartoleiro || "N/D";
            const nomeTime = t.nome_time || t.nome || "N/D";

            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 7px 5px;">${posContent}</td>
                <td style="text-align:left; padding: 7px 5px; font-weight:600;">${nomeCartoleiro}</td>
                <td style="text-align:left; padding: 7px 5px;">${nomeTime}</td>
                <td style="text-align:center; padding: 7px 5px;">
                  ${t.clube_id ? `<img src="/escudos/${t.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee; vertical-align: middle;" onerror="this.style.display=\'none\'"/>` : "—"}
                </td>
                <td style="text-align:center; padding: 7px 5px; font-weight:600;">${t.pontos.toFixed(2)}</td>
                <td style="text-align:center; padding: 7px 5px;">${banco}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(exportDiv, `top10_rodada${rodada}.png`);
}

// Exportação Extrato Financeiro
export async function exportarExtratoFinanceiroComoImagem(
  extrato,
  time,
  rodadaAtual,
) {
  const titulo = `Extrato Financeiro - ${time.nome_cartola}`;
  const subtitulo = `Até a ${rodadaAtual}ª rodada`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "700px");

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Rodada</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Descrição</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Crédito</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Débito</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${extrato
          .map((item) => {
            const credito =
              item.valor > 0 ? formatarMoedaExport(item.valor) : "-";
            const debito =
              item.valor < 0 ? formatarMoedaExport(item.valor) : "-";
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 7px 5px;">${item.rodada || "-"}</td>
                <td style="text-align:left; padding: 7px 5px;">${item.descricao}</td>
                <td style="text-align:center; padding: 7px 5px; color:#198754;">${credito}</td>
                <td style="text-align:center; padding: 7px 5px; color:#dc3545;">${debito}</td>
                <td style="text-align:center; padding: 7px 5px; font-weight:600;">${formatarMoedaExport(item.saldoAcumulado)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(
    exportDiv,
    `extrato_financeiro_${time.nome_cartola}.png`,
  );
}

// Exportação Artilheiro Campeão
export async function exportarArtilheiroCampeaoComoImagem(
  dadosArtilheiro,
  rodadaAtual,
) {
  const titulo = `Artilheiro Campeão`;
  const subtitulo = `Pontuação até a ${rodadaAtual}ª rodada`;
  const exportDiv = criarDivExportacao(titulo, subtitulo, "900px");

  // Filtrar para as últimas 5 rodadas
  const rodadasDisponiveis =
    dadosArtilheiro[0]?.golsPorRodada
      ?.filter((r) => r.ocorreu)
      .map((r) => r.rodada) || [];
  const ultimas5Rodadas = rodadasDisponiveis.slice(
    Math.max(rodadasDisponiveis.length - 5, 0),
  );

  const tabelaHtml = `
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-top: 15px;">
      <thead>
        <tr style="background: #f8f9fa; color: #495057;">
          <th style="width: 40px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pos</th>
          <th style="text-align: left; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Cartoleiro / Time</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">GP</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">GC</th>
          <th style="width: 60px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">SG</th>
          <th style="width: 80px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">Pts RG</th>
          ${ultimas5Rodadas
            .map(
              (rodadaNum) =>
                `<th style="width: 50px; text-align: center; padding: 8px 5px; border-bottom: 2px solid #dee2e6;">R${String(rodadaNum).padStart(2, "0")}</th>`,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${dadosArtilheiro
          .map((time, index) => {
            const nomeCartoleiro =
              time.nome_cartola || time.nome_cartoleiro || "N/D";
            const nomeTime = time.nome_time || time.nome || "N/D";
            const saldoGols = time.golsPro - time.golsContra;
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 7px 5px;">${index + 1}</td>
                <td style="text-align:left; padding: 7px 5px;">
                  <div style="display:flex; align-items:center; gap:5px;">
                    ${time.clube_id ? `<img src="/escudos/${time.clube_id}.png" alt="" style="width:20px; height:20px; border-radius:50%; background:#fff; border:1px solid #eee;" onerror="this.style.display=\'none\'"/>` : ""}
                    <div>
                      <div style="font-weight: 500; font-size: 0.9em;">${nomeTime}</div>
                      <div style="font-size: 0.8em; color: #777;">${nomeCartoleiro}</div>
                    </div>
                  </div>
                </td>
                <td style="text-align:center; padding: 7px 5px;">${time.golsPro}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.golsContra}</td>
                <td style="text-align:center; padding: 7px 5px;">${saldoGols}</td>
                <td style="text-align:center; padding: 7px 5px;">${time.pontosRankingGeral.toFixed(2)}</td>
                ${ultimas5Rodadas
                  .map((rodadaNum) => {
                    const golsRodada = time.golsPorRodada.find(
                      (g) => g.rodada === rodadaNum,
                    );
                    if (golsRodada && golsRodada.ocorreu) {
                      const gp = golsRodada.golsPro;
                      const gc = golsRodada.golsContra;
                      return `<td style="text-align:center; padding: 7px 5px;">${gp}${gc > 0 ? `(-${gc})` : ""}</td>`;
                    } else {
                      return `<td style="text-align:center; padding: 7px 5px; color:#bbb;">-</td>`;
                    }
                  })
                  .join("")}
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
  exportDiv.innerHTML += tabelaHtml;
  document.body.appendChild(exportDiv);
  await gerarCanvasDownload(
    exportDiv,
    `artilheiro_campeao_rodada${rodadaAtual}.png`,
  );
}
