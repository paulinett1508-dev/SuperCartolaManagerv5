export function criarBotaoExportacaoMataMata({
  containerId,
  fase,
  confrontos,
  infoExtra = "",
  rodadaPontos = "",
  edicao = "",
  logoUrl = "/img/logo-supercartola.png",
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Evita múltiplos botões
  if (container.querySelector(".export-btn")) return;

  const btn = document.createElement("button");
  btn.className = "export-btn";
  btn.style.margin = "16px 0 10px 0";
  btn.textContent = "Exportar como Imagem";
  btn.onclick = () =>
    exportarMataMataComoImagem({
      fase,
      confrontos,
      infoExtra,
      rodadaPontos,
      edicao,
      logoUrl,
    });
  container.prepend(btn);
}

/**
 * Gera a imagem do mata-mata e faz o download.
 *
 * @param {Object} params - Mesmos parâmetros do botão
 */
export function exportarMataMataComoImagem({
  fase,
  confrontos,
  infoExtra = "",
  rodadaPontos = "",
  edicao = "",
  logoUrl = "/img/logo-supercartola.png",
}) {
  const temp = document.createElement("div");
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  temp.style.top = "0";
  temp.style.background = "#f7f7f7";
  temp.style.padding = "0";
  temp.style.zIndex = "9999";
  temp.innerHTML = `
    <div id="export-mata-mata-img" style="
      width: 410px;
      max-width: 100vw;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f7f7f7;
      border-radius: 18px;
      box-shadow: 0 4px 24px #0002;
      padding: 0 0 24px 0;
      margin: 0 auto;
      text-align: center;
    ">
      <div style="padding: 24px 0 8px 0;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 2px;">
          <img src="${logoUrl}" style="height: 38px; width: auto; display: block;" alt="Logo">
          <div style="text-align:left;">
            <div style="font-size: 26px; font-weight: bold; color: #1a237e; letter-spacing: 1px; line-height: 1;">
              SuperCartola 2025
            </div>
            <div style="font-size: 14px; color: #3949ab; font-weight: 600; margin-top: 2px;">
              ${edicao}
            </div>
          </div>
        </div>
        <div style="
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(90deg, #3949ab 60%, #1a237e 100%);
          display: inline-block;
          padding: 7px 32px;
          border-radius: 18px;
          margin: 18px 0 4px 0;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px #0001;
          text-shadow: 0 2px 8px #0002;
        ">
          Confronto das ${fase.toUpperCase()}
        </div>
        <div style="font-size: 13px; color: #3949ab; margin-bottom: 10px;">
          ${rodadaPontos}
        </div>
        ${infoExtra ? `<div style="margin: 10px 0; color: #3949ab; font-size: 14px; font-weight: 600;">${infoExtra}</div>` : ""}
      </div>
      <table style="
        width: 96%;
        margin: 0 auto;
        border-collapse: separate;
        border-spacing: 0;
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px #0001;
        font-size: 13px;
      ">
        <thead>
          <tr style="background: #e3e6f3;">
            <th style="padding: 7px 2px;">Jogo</th>
            <th style="padding: 7px 2px; min-width: 110px;">Time 1</th>
            <th style="padding: 7px 2px;">Pts</th>
            <th style="padding: 7px 2px;">X</th>
            <th style="padding: 7px 2px;">Pts</th>
            <th style="padding: 7px 2px; min-width: 110px;">Time 2</th>
          </tr>
        </thead>
        <tbody>
          ${confrontos
            .map(
              (c) => `
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="font-weight:600; color:#3949ab; padding:6px 2px;">${c.jogo}</td>
              <td style="text-align:left; padding:6px 2px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <img src="/escudos/${c.timeA.clube_id}.png" style="width:20px; height:20px; border-radius:50%; flex-shrink:0;">
                  <div style="display:flex; flex-direction:column; align-items:flex-start;">
                    <span style="font-weight:500; font-size:13px; color:#222;">${c.timeA.nome_time}</span>
                    <span style="font-size:11px; color:#888;">${c.timeA.nome_cartoleiro || c.timeA.nome_cartola || "—"}</span>
                  </div>
                </div>
              </td>

<td style="font-weight:600; min-width:54px; color:${c.timeA.valor > 0 ? "#27ae60" : c.timeA.valor < 0 ? "#c0392b" : "#222"}; padding:6px 2px;">
  <div>
    ${typeof c.timeA.pontos === "number" ? c.timeA.pontos.toFixed(2).replace(".", ",") : "—"}
  </div>
  <div style="font-size:8px; color:${c.timeA.valor === 10 ? "#1976d2" : c.timeA.valor === -10 ? "#c0392b" : "transparent"}; font-weight:400;">
    ${
      c.timeA.valor === 10
        ? "R$ 10,00"
        : c.timeA.valor === -10
          ? "-R$ 10,00"
          : ""
    }
  </div>
</td>
</td>



              
              <td style="font-weight:700; color:#3949ab; padding:6px 2px;">X</td>

<td style="font-weight:600; min-width:54px; color:${c.timeB.valor > 0 ? "#27ae60" : c.timeB.valor < 0 ? "#c0392b" : "#222"}; padding:6px 2px;">
  <div>
    ${typeof c.timeB.pontos === "number" ? c.timeB.pontos.toFixed(2).replace(".", ",") : "—"}
  </div>
  <div style="font-size:8px; color:${c.timeB.valor === 10 ? "#1976d2" : c.timeB.valor === -10 ? "#c0392b" : "transparent"}; font-weight:400;">
    ${
      c.timeB.valor === 10
        ? "R$ 10,00"
        : c.timeB.valor === -10
          ? "-R$ 10,00"
          : ""
    }
  </div>
</td>


              
              <td style="text-align:left; padding:6px 2px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <img src="/escudos/${c.timeB.clube_id}.png" style="width:20px; height:20px; border-radius:50%; flex-shrink:0;">
                  <div style="display:flex; flex-direction:column; align-items:flex-start;">
                    <span style="font-weight:500; font-size:13px; color:#222;">${c.timeB.nome_time}</span>
                    <span style="font-size:11px; color:#888;">${c.timeB.nome_cartoleiro || c.timeB.nome_cartola || "—"}</span>
                  </div>
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      <div style="font-size:12px; color:#3949ab; margin-top:18px; font-weight:600;">Ano XI</div>
    </div>
  `;
  document.body.appendChild(temp);

  // Aguarda imagens carregarem antes de capturar
  const imgs = temp.querySelectorAll("img");
  let loaded = 0;
  if (imgs.length === 0) {
    capturar();
  } else {
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth !== 0) {
        loaded++;
        if (loaded === imgs.length) capturar();
      } else {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === imgs.length) capturar();
        };
      }
    });
  }

  function capturar() {
    html2canvas(temp.querySelector("#export-mata-mata-img"), {
      backgroundColor: "#f7f7f7",
      scale: 2,
      useCORS: true,
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `SuperCartola_MataMata_${fase.replace(/\s/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      document.body.removeChild(temp);
    });
  }
}
