// public/js/analisar-participantes.js
// Painel Admin Unificado - Analisar Participantes v1.0
(function () {
  "use strict";

  // State
  let participantes = [];
  let resumoData = null;
  let ligaSelecionada = "";

  // DOM refs
  const els = {};

  function initRefs() {
    els.statsGrid = document.getElementById("statsGrid");
    els.statTotal = document.getElementById("statTotal");
    els.statAtivos = document.getElementById("statAtivos");
    els.statInativos = document.getElementById("statInativos");
    els.statComSenha = document.getElementById("statComSenha");
    els.statSemSenha = document.getElementById("statSemSenha");
    els.statIncompletos = document.getElementById("statIncompletos");
    els.ligasResumo = document.getElementById("ligasResumo");
    els.filtroLiga = document.getElementById("filtroLiga");
    els.filtroStatus = document.getElementById("filtroStatus");
    els.filtroSenha = document.getElementById("filtroSenha");
    els.filtroBusca = document.getElementById("filtroBusca");
    els.tabelaBody = document.getElementById("tabelaBody");
    els.tabelaCount = document.getElementById("tabelaCount");
    els.btnExportarCSV = document.getElementById("btnExportarCSV");
    els.btnSenhaLote = document.getElementById("btnSenhaLote");
    // Modal senha
    els.modalSenha = document.getElementById("modalSenha");
    els.modalSenhaInfo = document.getElementById("modalSenhaInfo");
    els.modalSenhaInput = document.getElementById("modalSenhaInput");
    els.modalSenhaSalvar = document.getElementById("modalSenhaSalvar");
    els.modalSenhaFechar = document.getElementById("modalSenhaFechar");
    // Modal lote
    els.modalSenhaLote = document.getElementById("modalSenhaLote");
    els.modalLoteSenhaInput = document.getElementById("modalLoteSenhaInput");
    els.modalLotePreview = document.getElementById("modalLotePreview");
    els.modalLoteSalvar = document.getElementById("modalLoteSalvar");
    els.modalLoteFechar = document.getElementById("modalLoteFechar");
  }

  // =====================================================================
  // API CALLS
  // =====================================================================

  async function carregarResumo() {
    try {
      const res = await fetch("/api/analisar-participantes/resumo");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      resumoData = await res.json();
      renderizarStats(resumoData);
      renderizarLigasResumo(resumoData.porLiga);
      popularSelectLigas(resumoData.porLiga);
    } catch (error) {
      console.error("[ANALISAR] Erro ao carregar resumo:", error);
    }
  }

  async function carregarParticipantes() {
    try {
      const params = new URLSearchParams();
      if (els.filtroLiga.value) params.set("ligaId", els.filtroLiga.value);
      if (els.filtroStatus.value) params.set("status", els.filtroStatus.value);
      if (els.filtroSenha.value) params.set("senha", els.filtroSenha.value);
      if (els.filtroBusca.value.trim()) params.set("busca", els.filtroBusca.value.trim());

      els.tabelaBody.innerHTML = `<tr><td colspan="7"><div class="loading-state"><div class="loading-spinner"></div><div>Carregando...</div></div></td></tr>`;

      const res = await fetch(`/api/analisar-participantes/lista?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      participantes = data.participantes || [];
      renderizarTabela(participantes);
    } catch (error) {
      console.error("[ANALISAR] Erro ao carregar lista:", error);
      els.tabelaBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="material-icons">error_outline</span><div>Erro ao carregar participantes</div></div></td></tr>`;
    }
  }

  async function salvarSenha(timeId, senha, ligaId) {
    const res = await fetch(`/api/analisar-participantes/senha/${timeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha, ligaId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function salvarSenhaLote(lista) {
    const res = await fetch("/api/analisar-participantes/senha-lote", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantes: lista }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function toggleStatus(timeId, ativo, rodadaDesistencia) {
    const res = await fetch(`/api/analisar-participantes/toggle-status/${timeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo, rodadaDesistencia }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // =====================================================================
  // RENDER
  // =====================================================================

  function renderizarStats(data) {
    const t = data.totais;
    els.statTotal.textContent = t.participantes;
    els.statAtivos.textContent = t.ativos;
    els.statInativos.textContent = t.inativos;
    els.statComSenha.textContent = t.comSenha;
    els.statSemSenha.textContent = t.semSenha;
    els.statIncompletos.textContent = t.dadosIncompletos;
  }

  function renderizarLigasResumo(ligas) {
    if (!ligas || ligas.length === 0) {
      els.ligasResumo.innerHTML = "";
      return;
    }

    els.ligasResumo.innerHTML = ligas
      .map(
        (liga) => `
      <div class="liga-resumo-card ${ligaSelecionada === liga.ligaId ? "selected" : ""}" data-liga-id="${liga.ligaId}">
        <div class="liga-resumo-nome">${liga.nome}</div>
        <div class="liga-resumo-stats">
          <span><span class="material-icons">people</span> ${liga.total}</span>
          <span style="color: ${liga.semSenha > 0 ? "#f59e0b" : "#22c55e"}">
            <span class="material-icons">${liga.semSenha > 0 ? "lock_open" : "lock"}</span>
            ${liga.semSenha > 0 ? liga.semSenha + " sem senha" : "OK"}
          </span>
          <span style="color: ${liga.inativos > 0 ? "#ef4444" : "#22c55e"}">
            ${liga.inativos > 0 ? liga.inativos + " inativos" : ""}
          </span>
        </div>
      </div>
    `
      )
      .join("");

    // Click handler para filtrar por liga
    els.ligasResumo.querySelectorAll(".liga-resumo-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.ligaId;
        if (ligaSelecionada === id) {
          ligaSelecionada = "";
          els.filtroLiga.value = "";
        } else {
          ligaSelecionada = id;
          els.filtroLiga.value = id;
        }
        renderizarLigasResumo(resumoData.porLiga);
        carregarParticipantes();
      });
    });
  }

  function popularSelectLigas(ligas) {
    els.filtroLiga.innerHTML = '<option value="">Todas</option>';
    for (const liga of ligas) {
      const opt = document.createElement("option");
      opt.value = liga.ligaId;
      opt.textContent = `${liga.nome} (${liga.total})`;
      els.filtroLiga.appendChild(opt);
    }
  }

  function renderizarTabela(lista) {
    els.tabelaCount.textContent = lista.length;

    if (lista.length === 0) {
      els.tabelaBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="material-icons">search_off</span><div>Nenhum participante encontrado</div></div></td></tr>`;
      return;
    }

    els.tabelaBody.innerHTML = lista
      .map(
        (p) => `
      <tr data-time-id="${p.timeId}">
        <td>
          <div class="participante-info">
            <div class="participante-escudo">
              ${
                p.clubeId
                  ? `<img src="/escudos/${p.clubeId}.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span class="material-icons" style="display:none;">sports_soccer</span>`
                  : `<span class="material-icons">sports_soccer</span>`
              }
            </div>
            <div class="participante-nomes">
              <div class="nome-cartola">${escapeHtml(p.nomeCartola)}</div>
              <div class="nome-time">${escapeHtml(p.nomeTime)}</div>
            </div>
          </div>
        </td>
        <td><span class="time-id-mono">${p.timeId}</span></td>
        <td><span class="liga-badge" title="${escapeHtml(p.ligaNome)}">${escapeHtml(p.ligaNome)}</span></td>
        <td><span class="badge-status ${p.ativo ? "badge-ativo" : "badge-inativo"}">${p.ativo ? "Ativo" : "Inativo"}</span></td>
        <td><span class="badge-status ${p.temSenha ? "badge-com-senha" : "badge-sem-senha"}">${p.temSenha ? "Definida" : "Pendente"}</span></td>
        <td>${p.dadosCompletos ? '<span style="color:#22c55e;font-size:14px;" class="material-icons">check</span>' : '<span class="badge-status badge-incompleto">N/D</span>'}</td>
        <td>
          <div class="acoes-cell">
            <button class="btn-acao-inline" title="Definir senha" data-action="senha" data-time-id="${p.timeId}" data-liga-id="${p.ligaId}" data-nome="${escapeHtml(p.nomeCartola)}">
              <span class="material-icons">vpn_key</span>
            </button>
            <button class="btn-acao-inline" title="${p.ativo ? "Desativar" : "Ativar"}" data-action="toggle" data-time-id="${p.timeId}" data-ativo="${p.ativo}">
              <span class="material-icons">${p.ativo ? "person_off" : "person_add"}</span>
            </button>
            <button class="btn-acao-inline" title="Ver dados Data Lake" data-action="ver-dump" data-time-id="${p.timeId}" data-nome="${escapeHtml(p.nomeCartola)}" data-time-nome="${escapeHtml(p.nomeTime)}">
              <span class="material-icons">cloud_sync</span>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");

    // Bind action buttons
    els.tabelaBody.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", handleAcao);
    });
  }

  // =====================================================================
  // ACTIONS
  // =====================================================================

  let senhaEditando = null;

  function handleAcao(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const timeId = btn.dataset.timeId;

    if (action === "senha") {
      senhaEditando = {
        timeId,
        ligaId: btn.dataset.ligaId,
        nome: btn.dataset.nome,
      };
      els.modalSenhaInfo.textContent = `${senhaEditando.nome} (ID: ${timeId})`;
      els.modalSenhaInput.value = "";
      els.modalSenha.classList.add("active");
      els.modalSenhaInput.focus();
    }

    if (action === "ver-dump") {
      abrirModalDump(timeId, btn.dataset.nome, btn.dataset.timeNome);
    }

    if (action === "toggle") {
      const atualmenteAtivo = btn.dataset.ativo === "true";
      const novoStatus = !atualmenteAtivo;

      let rodadaDesistencia = null;
      if (!novoStatus) {
        const input = prompt("Rodada de desistencia (opcional, pressione OK para deixar vazio):");
        if (input !== null && input.trim()) {
          rodadaDesistencia = parseInt(input.trim());
        }
      }

      const confirmar = confirm(
        novoStatus
          ? `Reativar participante ${timeId}?`
          : `Desativar participante ${timeId}?`
      );

      if (!confirmar) return;

      toggleStatus(timeId, novoStatus, rodadaDesistencia)
        .then(() => {
          carregarParticipantes();
          carregarResumo();
        })
        .catch((err) => alert("Erro: " + err.message));
    }
  }

  function fecharModalSenha() {
    els.modalSenha.classList.remove("active");
    senhaEditando = null;
  }

  function salvarSenhaModal() {
    if (!senhaEditando) return;

    const senha = els.modalSenhaInput.value.trim();
    if (senha.length < 3) {
      alert("Senha deve ter pelo menos 3 caracteres");
      return;
    }

    salvarSenha(senhaEditando.timeId, senha, senhaEditando.ligaId)
      .then(() => {
        fecharModalSenha();
        carregarParticipantes();
        carregarResumo();
      })
      .catch((err) => alert("Erro ao salvar senha: " + err.message));
  }

  // Senha em lote
  function abrirModalLote() {
    const semSenha = participantes.filter((p) => !p.temSenha);
    els.modalLotePreview.textContent = `${semSenha.length} participante(s) sem senha serao atualizados`;
    els.modalLoteSenhaInput.value = "";
    els.modalSenhaLote.classList.add("active");
    els.modalLoteSenhaInput.focus();
  }

  function fecharModalLote() {
    els.modalSenhaLote.classList.remove("active");
  }

  function aplicarSenhaLote() {
    const senha = els.modalLoteSenhaInput.value.trim();
    if (senha.length < 3) {
      alert("Senha deve ter pelo menos 3 caracteres");
      return;
    }

    const semSenha = participantes.filter((p) => !p.temSenha);
    if (semSenha.length === 0) {
      alert("Todos os participantes ja possuem senha");
      fecharModalLote();
      return;
    }

    const confirmar = confirm(
      `Aplicar senha "${senha}" para ${semSenha.length} participante(s)?`
    );
    if (!confirmar) return;

    const lista = semSenha.map((p) => ({
      timeId: p.timeId,
      senha,
      ligaId: p.ligaId,
    }));

    salvarSenhaLote(lista)
      .then((res) => {
        alert(`${res.atualizados} senhas atualizadas, ${res.erros} erros`);
        fecharModalLote();
        carregarParticipantes();
        carregarResumo();
      })
      .catch((err) => alert("Erro: " + err.message));
  }

  // Exportar CSV
  function exportarCSV() {
    if (participantes.length === 0) {
      alert("Nenhum participante para exportar");
      return;
    }

    const headers = ["ID", "Cartoleiro", "Time", "Liga", "Status", "Senha", "Dados Completos"];
    const rows = participantes.map((p) => [
      p.timeId,
      `"${p.nomeCartola}"`,
      `"${p.nomeTime}"`,
      `"${p.ligaNome}"`,
      p.ativo ? "Ativo" : "Inativo",
      p.temSenha ? "Definida" : "Pendente",
      p.dadosCompletos ? "Sim" : "Nao",
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =====================================================================
  // DUMP / DATA LAKE - Estilo Cartola/Globo
  // =====================================================================

  const POSICOES = {
    1: { nome: 'Goleiro', abreviacao: 'GOL' },
    2: { nome: 'Lateral', abreviacao: 'LAT' },
    3: { nome: 'Zagueiro', abreviacao: 'ZAG' },
    4: { nome: 'Meia', abreviacao: 'MEI' },
    5: { nome: 'Atacante', abreviacao: 'ATA' },
    6: { nome: 'Tecnico', abreviacao: 'TEC' },
  };

  // Cores das camisas por clube (aproximadas)
  const CORES_CLUBES = {
    262: '#d42a2a', 263: '#111', 264: '#111', 265: '#0055a4',
    266: '#7b2d3a', 267: '#111', 275: '#006437', 276: '#fff',
    277: '#fff', 280: '#fff', 282: '#111', 283: '#003DA5',
    284: '#0097d6', 285: '#d42a2a', 286: '#006633', 287: '#d42a2a',
    290: '#006633', 292: '#d42a2a', 293: '#d42a2a', 354: '#111',
    356: '#003DA5', 1371: '#006437', 2305: '#ffe600',
  };

  let dumpAtual = null;
  let dumpHistorico = [];
  let dumpRodadaAtual = null;

  async function abrirModalDump(timeId, nomeCartola, nomeTime) {
    let modal = document.getElementById("modalDump");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.id = "modalDump";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content modal-dump-content">
        <div style="text-align:center;padding:40px;">
          <div class="loading-spinner"></div>
          <div style="color:#888;font-size:0.85rem;margin-top:8px;">Buscando dados do Data Lake...</div>
        </div>
      </div>
    `;

    modal.classList.add("active");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });

    try {
      const res = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50`);
      const data = await res.json();
      dumpAtual = { timeId, nomeCartola, nomeTime };
      dumpHistorico = data.historico || [];
      renderizarDumpGlobo(modal, data, timeId, nomeCartola, nomeTime);
    } catch (error) {
      console.error("[ANALISAR] Erro ao buscar dump:", error);
      modal.querySelector(".modal-content").innerHTML = `
        <div class="dl-empty-state">
          <span class="material-icons" style="font-size:48px;color:#ef4444;">wifi_off</span>
          <div style="margin-top:8px;">Erro: ${error.message}</div>
        </div>
      `;
    }
  }

  function renderizarDumpGlobo(modal, data, timeId, nomeCartola, nomeTime) {
    const content = modal.querySelector(".modal-content");

    if (!data.success || !data.dump_atual) {
      content.innerHTML = `
        <div class="dl-empty-state">
          <span class="material-icons" style="font-size:64px;color:#ccc;">cloud_off</span>
          <h4>Nenhum dump encontrado</h4>
          <p>Os dados sao coletados durante o processamento de rodadas. Use o botao abaixo para buscar dados da API Cartola.</p>
          <button class="btn-sync-dump" data-time-id="${timeId}">
            <span class="material-icons">download</span>
            Buscar Dados da API Cartola
          </button>
        </div>
      `;
      content.querySelector(".btn-sync-dump")?.addEventListener("click", () => sincronizarDump(timeId, nomeCartola, nomeTime));
      return;
    }

    const dump = data.dump_atual;
    const raw = dump.raw_json || {};
    const time = raw.time || {};
    const atletas = raw.atletas || [];
    const patrimonio = raw.patrimonio;
    const pontos = raw.pontos;
    const capitaoId = raw.capitao_id;
    const rodadaAtual = dump.rodada || raw.rodada_atual || null;
    const rodadasDisp = data.rodadas_disponiveis || [];
    const pontosTotal = data.pontos_total_temporada;
    const historico = data.historico || [];
    const escudo = time.url_escudo_png || time.url_escudo_svg || '';
    const fotoPerfil = time.foto_perfil || '';
    const assinante = time.assinante || false;
    const nomeTimeApi = time.nome || nomeTime;
    const nomeCartolaApi = time.nome_cartola || nomeCartola;
    const dataColeta = dump.data_coleta ? new Date(dump.data_coleta).toLocaleString("pt-BR") : '';

    // Separate titulares (first 12) and reservas
    // In Cartola, the lineup has 12 players (11 starters + 1 coach)
    // The bench is typically the 13th player onward
    const titulares = atletas.slice(0, 12);
    const reservas = atletas.slice(12);

    // Find captain, best and worst scorer
    let capitao = null;
    let maiorPontuador = null;
    let menorPontuador = null;

    if (titulares.length > 0) {
      for (const a of titulares) {
        if (a.atleta_id === capitaoId) capitao = a;
        if (!maiorPontuador || a.pontos_num > maiorPontuador.pontos_num) maiorPontuador = a;
        if (!menorPontuador || a.pontos_num < menorPontuador.pontos_num) menorPontuador = a;
      }
    }

    // Build the modal HTML
    let html = '';

    // Header
    html += `
      <div class="dl-header">
        <button class="dl-close-btn" onclick="document.getElementById('modalDump').classList.remove('active')">
          <span class="material-icons">close</span>
        </button>
        <div class="dl-header-label">${rodadaAtual ? 'Rodada ' + rodadaAtual : 'Dados do Time'}</div>
        <div class="dl-team-badge">
          ${escudo ? `<img src="${escapeHtml(escudo)}" onerror="this.style.display='none'" alt="" />` : '<span class="material-icons" style="font-size:40px;color:#ccc;">shield</span>'}
          ${fotoPerfil ? `<img class="dl-foto-perfil" src="${escapeHtml(fotoPerfil)}" onerror="this.style.display='none'" alt="" />` : ''}
        </div>
        ${assinante ? '<div class="dl-pro-badge">PRO</div>' : ''}
        <div class="dl-team-name">${escapeHtml(nomeTimeApi)}</div>
        <div class="dl-cartoleiro-name">${escapeHtml(nomeCartolaApi)}</div>
      </div>
    `;

    // Sync bar
    html += `
      <div class="dl-sync-bar">
        <span class="dl-sync-info">${dataColeta}</span>
        <button class="dl-sync-btn" id="dlSyncBtn" data-time-id="${timeId}">
          <span class="material-icons">refresh</span> Atualizar
        </button>
      </div>
    `;

    // Round slider (if we know the round)
    if (rodadaAtual) {
      const pct = ((rodadaAtual - 1) / 37 * 100).toFixed(1);
      html += `
        <div class="dl-round-bar">
          <div class="dl-round-slider">
            <div class="dl-round-track">
              <div class="dl-round-fill" style="width:${pct}%"></div>
              <div class="dl-round-ball" style="left:${pct}%">${rodadaAtual}</div>
            </div>
          </div>
          <div class="dl-round-labels">
            <span>1</span><span>38</span>
          </div>
          <div class="dl-round-cta">Veja como voce se saiu na <strong>Rodada ${rodadaAtual}</strong></div>
        </div>
      `;
    }

    html += '<div class="dl-body">';

    // Score section (pontos + patrimonio)
    if (pontos !== undefined || patrimonio !== undefined) {
      html += '<div class="dl-score-section">';

      if (pontos !== undefined) {
        html += `
          <div class="dl-score-row">
            <div class="dl-score-left">
              <div class="dl-score-icon"><span class="material-icons" style="font-size:36px;color:#3b82f6;">sports_soccer</span></div>
              <div>
                <div class="dl-score-label">Pontuacao${rodadaAtual ? ' Rodada ' + rodadaAtual : ''}</div>
                <div class="dl-score-value">${typeof pontos === 'number' ? pontos.toFixed(2) : pontos}</div>
              </div>
            </div>
            ${pontosTotal !== undefined && pontosTotal !== pontos ? `
            <div class="dl-score-right">
              <div class="dl-score-label">Total Temporada</div>
              <div class="dl-score-value">${typeof pontosTotal === 'number' ? pontosTotal.toFixed(2) : pontosTotal}</div>
            </div>` : ''}
          </div>
        `;
      }

      if (patrimonio !== undefined) {
        html += `
          <div class="dl-score-row">
            <div class="dl-score-left">
              <div class="dl-score-icon"><span class="material-icons" style="font-size:36px;color:#22c55e;">account_balance_wallet</span></div>
              <div>
                <div class="dl-score-label">Patrimonio</div>
                <div class="dl-score-value">C$${patrimonio.toFixed(2)}</div>
              </div>
            </div>
          </div>
        `;
      }

      html += '</div>';
    }

    // Player highlight cards (Capitao, Maior, Menor)
    if (titulares.length > 0 && (capitao || maiorPontuador || menorPontuador)) {
      html += '<div class="dl-players-section"><div class="dl-players-grid">';

      if (capitao) {
        html += renderPlayerCard('Capitao', capitao, true);
      }
      if (maiorPontuador) {
        html += renderPlayerCard('Maior Pontuador', maiorPontuador, false, true);
      }
      if (menorPontuador) {
        html += renderPlayerCard('Menor Pontuador', menorPontuador, false, false, true);
      }

      html += '</div></div>';
    }

    // Full lineup
    if (titulares.length > 0) {
      html += `
        <div class="dl-lineup-section">
          <div class="dl-lineup-title">Escalacao Completa</div>
          <div class="dl-lineup-grid">
      `;
      for (const a of titulares) {
        const isCap = a.atleta_id === capitaoId;
        const pos = POSICOES[a.posicao_id] || { nome: '?', abreviacao: '?' };
        const cor = CORES_CLUBES[a.clube_id] || '#555';
        const scoreClass = a.pontos_num > 0 ? 'positive' : (a.pontos_num < 0 ? 'negative' : 'neutral');
        let pontosDisplay = typeof a.pontos_num === 'number' ? a.pontos_num.toFixed(2) : (a.pontos_num || '0.00');
        html += `
          <div class="dl-lineup-player ${isCap ? 'is-captain' : ''}">
            <div class="dl-bench-jersey" style="background:${cor}">
              <img class="dl-jersey-badge" src="/escudos/${a.clube_id}.png" onerror="this.style.display='none'" />
            </div>
            <div class="dl-bench-info">
              <div class="dl-bench-name">${escapeHtml(a.apelido)}${isCap ? ' <span style="color:#FF5500;font-size:0.6rem;">C</span>' : ''}</div>
              <div class="dl-bench-pos">${pos.abreviacao}</div>
            </div>
            <div class="dl-bench-score dl-player-score ${scoreClass}">${pontosDisplay}</div>
          </div>
        `;
      }
      html += '</div></div>';
    }

    // Bench / Reservas
    if (reservas.length > 0) {
      html += `
        <div class="dl-bench-section">
          <div class="dl-bench-title">Banco de Reservas</div>
          <div class="dl-bench-grid">
      `;
      for (const a of reservas) {
        const pos = POSICOES[a.posicao_id] || { nome: '?', abreviacao: '?' };
        const cor = CORES_CLUBES[a.clube_id] || '#888';
        const scoreClass = a.pontos_num > 0 ? 'positive' : (a.pontos_num < 0 ? 'negative' : 'neutral');
        let pontosDisplay = typeof a.pontos_num === 'number' ? a.pontos_num.toFixed(2) : (a.pontos_num || '0.00');
        html += `
          <div class="dl-bench-player">
            <div class="dl-bench-jersey" style="background:${cor};position:relative;">
              <img class="dl-jersey-badge" src="/escudos/${a.clube_id}.png" onerror="this.style.display='none'" style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;border:1px solid #ddd;background:#fff;object-fit:contain;" />
            </div>
            <div class="dl-bench-info">
              <div class="dl-bench-name">${escapeHtml(a.apelido)}</div>
              <div class="dl-bench-pos">${pos.abreviacao}</div>
            </div>
            <div class="dl-bench-score dl-player-score ${scoreClass}">${pontosDisplay}</div>
          </div>
        `;
      }
      html += '</div></div>';
    }

    // Performance chart
    if (historico.length > 0) {
      const maxPontos = Math.max(...historico.map(h => Math.abs(h.pontos || 0)), 1);
      html += `
        <div class="dl-chart-section">
          <div class="dl-chart-title">Sua performance rodada a rodada</div>
          <div class="dl-chart-container">
      `;
      // Show all 38 rounds
      for (let r = 1; r <= 38; r++) {
        const h = historico.find(x => x.rodada === r);
        const pts = h ? (h.pontos || 0) : 0;
        const hasData = !!h;
        const heightPct = hasData ? (Math.abs(pts) / maxPontos * 80 + 5) : 3;
        const barClass = !hasData ? 'empty' : (r === rodadaAtual ? 'selected' : (pts >= 0 ? 'positive' : 'negative'));
        html += `
          <div class="dl-chart-bar-wrap" data-rodada="${r}" title="Rodada ${r}: ${hasData ? pts.toFixed(2) + ' pts' : 'sem dados'}">
            ${hasData ? `<div class="dl-chart-tooltip">${pts.toFixed(0)}</div>` : ''}
            <div class="dl-chart-bar ${barClass}" style="height:${heightPct}%"></div>
          </div>
        `;
      }
      html += '</div>';
      html += '<div class="dl-chart-labels">';
      for (let r = 1; r <= 38; r++) {
        const isSelected = r === rodadaAtual;
        html += `<div class="dl-chart-label ${isSelected ? 'selected' : ''}">${r}</div>`;
      }
      html += '</div></div>';
    }

    // Round selector
    if (rodadasDisp.length > 0) {
      html += `
        <div class="dl-round-selector">
          <select class="dl-round-select" id="dlRoundSelect">
            <option value="">Selecionar rodada...</option>
            ${rodadasDisp.map(r => `<option value="${r}" ${r === rodadaAtual ? 'selected' : ''}>Rodada ${r}${r === rodadaAtual ? ' (atual)' : ''}</option>`).join('')}
          </select>
        </div>
      `;
    }

    html += '</div>'; // close dl-body

    content.innerHTML = html;

    // Event listeners
    content.querySelector("#dlSyncBtn")?.addEventListener("click", () => sincronizarDump(timeId, nomeCartola, nomeTime));

    content.querySelector("#dlRoundSelect")?.addEventListener("change", (e) => {
      const rodada = parseInt(e.target.value);
      if (rodada) carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
    });

    // Chart bar click to load round
    content.querySelectorAll(".dl-chart-bar-wrap[data-rodada]").forEach(bar => {
      bar.addEventListener("click", () => {
        const rodada = parseInt(bar.dataset.rodada);
        const h = dumpHistorico.find(x => x.rodada === rodada);
        if (h) {
          carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
        } else if (rodada) {
          if (confirm(`Rodada ${rodada} nao esta no Data Lake. Deseja sincronizar da API Cartola?`)) {
            sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
          }
        }
      });
    });
  }

  function renderPlayerCard(label, atleta, isCaptain, isBest, isWorst) {
    const pos = POSICOES[atleta.posicao_id] || { nome: '?', abreviacao: '?' };
    const cor = CORES_CLUBES[atleta.clube_id] || '#555';
    let pontosDisplay = typeof atleta.pontos_num === 'number' ? atleta.pontos_num.toFixed(2) : (atleta.pontos_num || '0.00');
    const scoreClass = atleta.pontos_num > 0 ? 'positive' : (atleta.pontos_num < 0 ? 'negative' : 'neutral');

    let thumbHtml = '';
    if (isBest) thumbHtml = '<div class="dl-thumb-icon" style="color:#22c55e;">&#x1F44D;</div>';
    if (isWorst) thumbHtml = '<div class="dl-thumb-icon" style="color:#ef4444;">&#x1F44E;</div>';

    return `
      <div class="dl-player-card">
        <div class="dl-player-card-label">${escapeHtml(label)}</div>
        <div class="dl-jersey" style="background:${cor}">
          <div class="dl-jersey-badge"><img src="/escudos/${atleta.clube_id}.png" onerror="this.style.display='none'" /></div>
          ${isCaptain ? '<div class="dl-captain-icon">C</div>' : ''}
          ${thumbHtml}
        </div>
        <div class="dl-player-name">${escapeHtml(atleta.apelido)}</div>
        <div class="dl-player-pos">${pos.nome}</div>
        <div class="dl-player-score ${scoreClass}">${pontosDisplay}</div>
        ${isCaptain ? '<div class="dl-captain-multiplier">Pontuacao em dobro</div>' : ''}
      </div>
    `;
  }

  async function carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada) {
    const modal = document.getElementById("modalDump");
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    content.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div class="loading-spinner"></div>
        <div style="color:#888;font-size:0.85rem;margin-top:8px;">Carregando Rodada ${rodada}...</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/data-lake/raw/${timeId}?rodada=${rodada}&historico=true&limit=50`);
      const data = await res.json();

      if (!data.success || !data.dump_atual) {
        // No data for this round, offer to sync
        content.innerHTML = `
          <div class="dl-empty-state">
            <span class="material-icons" style="font-size:48px;color:#f59e0b;">cloud_queue</span>
            <h4>Rodada ${rodada} nao disponivel no Data Lake</h4>
            <p>Os dados desta rodada ainda nao foram coletados. Clique abaixo para buscar da API Cartola.</p>
            <button class="btn-sync-dump" id="dlSyncRodadaBtn">
              <span class="material-icons">download</span>
              Buscar Rodada ${rodada}
            </button>
            <br/><br/>
            <button class="dl-sync-btn" id="dlBackBtn">
              <span class="material-icons">arrow_back</span> Voltar
            </button>
          </div>
        `;
        content.querySelector("#dlSyncRodadaBtn")?.addEventListener("click", () => sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodada));
        content.querySelector("#dlBackBtn")?.addEventListener("click", () => abrirModalDump(timeId, nomeCartola, nomeTime));
        return;
      }

      dumpHistorico = data.historico || dumpHistorico;
      renderizarDumpGlobo(modal, data, timeId, nomeCartola, nomeTime);
    } catch (error) {
      console.error("[ANALISAR] Erro ao carregar rodada:", error);
      content.innerHTML = `
        <div class="dl-empty-state">
          <span class="material-icons" style="font-size:48px;color:#ef4444;">error</span>
          <div style="margin-top:8px;">Erro: ${error.message}</div>
          <br/>
          <button class="dl-sync-btn" onclick="document.getElementById('modalDump').classList.remove('active')">Fechar</button>
        </div>
      `;
    }
  }

  async function sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodada) {
    const modal = document.getElementById("modalDump");
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    content.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div class="loading-spinner"></div>
        <div style="color:#888;font-size:0.85rem;margin-top:8px;">Sincronizando Rodada ${rodada} com API Cartola...</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/data-lake/sincronizar/${timeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rodada }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Erro ao sincronizar");
      }

      // Reload the round
      await carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
    } catch (error) {
      console.error("[ANALISAR] Erro ao sincronizar rodada:", error);
      content.innerHTML = `
        <div class="dl-empty-state">
          <span class="material-icons" style="font-size:48px;color:#ef4444;">error</span>
          <div style="margin-top:8px;">Erro: ${escapeHtml(error.message)}</div>
          <br/>
          <button class="dl-sync-btn" id="dlBackBtn">
            <span class="material-icons">arrow_back</span> Voltar
          </button>
        </div>
      `;
      content.querySelector("#dlBackBtn")?.addEventListener("click", () => abrirModalDump(timeId, nomeCartola, nomeTime));
    }
  }

  async function sincronizarDump(timeId, nomeCartola, nomeTime) {
    const modal = document.getElementById("modalDump");
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    content.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div class="loading-spinner"></div>
        <div style="color:#888;font-size:0.85rem;margin-top:8px;">Sincronizando com API Cartola...</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/data-lake/sincronizar/${timeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Erro ao sincronizar");
      }

      // Reload
      const rawRes = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50`);
      const rawData = await rawRes.json();
      dumpHistorico = rawData.historico || [];
      renderizarDumpGlobo(modal, rawData, timeId, nomeCartola, nomeTime);
    } catch (error) {
      console.error("[ANALISAR] Erro ao sincronizar:", error);
      content.innerHTML = `
        <div class="dl-empty-state">
          <span class="material-icons" style="font-size:48px;color:#ef4444;">error</span>
          <div style="margin-top:8px;">Erro: ${escapeHtml(error.message)}</div>
          <br/>
          <button class="btn-sync-dump" onclick="document.getElementById('modalDump').classList.remove('active')">Fechar</button>
        </div>
      `;
    }
  }

  // =====================================================================
  // UTILS
  // =====================================================================

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Debounce para busca
  let debounceTimer;
  function debounceBusca() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(carregarParticipantes, 400);
  }

  // =====================================================================
  // INIT
  // =====================================================================

  function init() {
    initRefs();

    // Event listeners - filtros
    els.filtroLiga.addEventListener("change", () => {
      ligaSelecionada = els.filtroLiga.value;
      if (resumoData) renderizarLigasResumo(resumoData.porLiga);
      carregarParticipantes();
    });
    els.filtroStatus.addEventListener("change", carregarParticipantes);
    els.filtroSenha.addEventListener("change", carregarParticipantes);
    els.filtroBusca.addEventListener("input", debounceBusca);

    // Modal senha
    els.modalSenhaSalvar.addEventListener("click", salvarSenhaModal);
    els.modalSenhaFechar.addEventListener("click", fecharModalSenha);
    els.modalSenha.addEventListener("click", (e) => {
      if (e.target === els.modalSenha) fecharModalSenha();
    });
    els.modalSenhaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") salvarSenhaModal();
      if (e.key === "Escape") fecharModalSenha();
    });

    // Modal lote
    els.btnSenhaLote.addEventListener("click", abrirModalLote);
    els.modalLoteSalvar.addEventListener("click", aplicarSenhaLote);
    els.modalLoteFechar.addEventListener("click", fecharModalLote);
    els.modalSenhaLote.addEventListener("click", (e) => {
      if (e.target === els.modalSenhaLote) fecharModalLote();
    });
    els.modalLoteSenhaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") aplicarSenhaLote();
      if (e.key === "Escape") fecharModalLote();
    });

    // Exportar
    els.btnExportarCSV.addEventListener("click", exportarCSV);

    // ESC para fechar modal dump
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modalDump = document.getElementById("modalDump");
        if (modalDump?.classList.contains("active")) {
          modalDump.classList.remove("active");
        }
      }
    });

    // Carregar dados
    carregarResumo();
    carregarParticipantes();
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
