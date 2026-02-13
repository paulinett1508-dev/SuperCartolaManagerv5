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
    els.statPremium = document.getElementById("statPremium");
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
    els.statPremium.textContent = t.premium || 0;
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
            <label class="toggle-premium-mini" title="${p.premium ? 'Premium ativo' : 'Ativar Premium'}">
              <input type="checkbox" ${p.premium ? "checked" : ""} data-action="toggle-premium" data-time-id="${p.timeId}" data-liga-id="${p.ligaId}" />
              <span class="toggle-slider-premium"></span>
              <span class="material-icons toggle-premium-icon" style="font-size:14px;color:${p.premium ? '#fbbf24' : '#4b5563'}">workspace_premium</span>
            </label>
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
      if (btn.type === "checkbox" && btn.dataset.action === "toggle-premium") {
        btn.addEventListener("change", handleTogglePremium);
      } else {
        btn.addEventListener("click", handleAcao);
      }
    });
  }

  // =====================================================================
  // ACTIONS
  // =====================================================================

  async function handleTogglePremium(e) {
    const checkbox = e.currentTarget;
    const timeId = checkbox.dataset.timeId;
    const ligaId = checkbox.dataset.ligaId;
    const premium = checkbox.checked;

    try {
      const res = await fetch(`/api/ligas/${ligaId}/participantes/${timeId}/premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premium }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.erro || res.statusText);
      }

      // Atualizar ícone visual
      const icon = checkbox.closest(".toggle-premium-mini")?.querySelector(".toggle-premium-icon");
      if (icon) icon.style.color = premium ? "#fbbf24" : "#4b5563";

      const msg = `Premium ${premium ? "ativado" : "desativado"}`;
      if (window.SuperModal?.toast) SuperModal.toast.success(msg);
      else console.log("[ANALISAR] " + msg);
    } catch (err) {
      checkbox.checked = !premium; // Reverter
      const icon = checkbox.closest(".toggle-premium-mini")?.querySelector(".toggle-premium-icon");
      if (icon) icon.style.color = !premium ? "#fbbf24" : "#4b5563";
      if (window.SuperModal?.toast) SuperModal.toast.error("Erro: " + err.message);
      else console.error("[ANALISAR] Erro premium:", err.message);
    }
  }

  let senhaEditando = null;

  async function handleAcao(e) {
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
        const input = await SuperModal.prompt({ title: 'Rodada de desistência', message: 'Rodada de desistencia (opcional, pressione OK para deixar vazio):' });
        if (input !== null && input.trim()) {
          rodadaDesistencia = parseInt(input.trim());
        }
      }

      const confirmar = await SuperModal.confirm({
        title: 'Confirmar',
        message: novoStatus
          ? `Reativar participante ${timeId}?`
          : `Desativar participante ${timeId}?`
      });

      if (!confirmar) return;

      toggleStatus(timeId, novoStatus, rodadaDesistencia)
        .then(() => {
          carregarParticipantes();
          carregarResumo();
        })
        .catch((err) => SuperModal.toast.error("Erro: " + err.message));
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
      SuperModal.toast.warning("Senha deve ter pelo menos 3 caracteres");
      return;
    }

    salvarSenha(senhaEditando.timeId, senha, senhaEditando.ligaId)
      .then(() => {
        fecharModalSenha();
        carregarParticipantes();
        carregarResumo();
      })
      .catch((err) => SuperModal.toast.error("Erro ao salvar senha: " + err.message));
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

  async function aplicarSenhaLote() {
    const senha = els.modalLoteSenhaInput.value.trim();
    if (senha.length < 3) {
      SuperModal.toast.warning("Senha deve ter pelo menos 3 caracteres");
      return;
    }

    const semSenha = participantes.filter((p) => !p.temSenha);
    if (semSenha.length === 0) {
      SuperModal.toast.info("Todos os participantes ja possuem senha");
      fecharModalLote();
      return;
    }

    const confirmar = await SuperModal.confirm({
      title: 'Confirmar',
      message: `Aplicar senha "${senha}" para ${semSenha.length} participante(s)?`
    });
    if (!confirmar) return;

    const lista = semSenha.map((p) => ({
      timeId: p.timeId,
      senha,
      ligaId: p.ligaId,
    }));

    salvarSenhaLote(lista)
      .then((res) => {
        SuperModal.toast.success(`${res.atualizados} senhas atualizadas, ${res.erros} erros`);
        fecharModalLote();
        carregarParticipantes();
        carregarResumo();
      })
      .catch((err) => SuperModal.toast.error("Erro: " + err.message));
  }

  // Exportar CSV
  function exportarCSV() {
    if (participantes.length === 0) {
      SuperModal.toast.info("Nenhum participante para exportar");
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

  // =====================================================================
  // HELPERS - Agrupamento por posição e stats (estilo participante)
  // =====================================================================

  function agruparPorPosicao(atletas) {
    const lista = Array.isArray(atletas) ? atletas : [];
    const groups = {
      goleiros: [], laterais: [], zagueiros: [],
      meias: [], atacantes: [], tecnicos: [], defensores: []
    };
    lista.forEach(a => {
      const pos = Number(a.posicao_id ?? a.posicaoId ?? a.posicao);
      if (pos === 1) groups.goleiros.push(a);
      else if (pos === 2) groups.laterais.push(a);
      else if (pos === 3) groups.zagueiros.push(a);
      else if (pos === 4) groups.meias.push(a);
      else if (pos === 5) groups.atacantes.push(a);
      else if (pos === 6) groups.tecnicos.push(a);
    });
    groups.defensores = [...groups.laterais, ...groups.zagueiros];
    return groups;
  }

  function calcularStatsJogoDump(titulares, reservas) {
    const STATUS_NAO_JOGOU = [2, 3, 5, 6];
    const totalEscalados = titulares.length;
    const titularesQueJogaram = titulares.filter(a => {
      const pts = parseFloat(a.pontos_num ?? a.pontos ?? 0);
      const status = a.status_id ?? a.statusId ?? a.status ?? 7;
      return !isNaN(pts) && !STATUS_NAO_JOGOU.includes(Number(status));
    });
    const titularesQueSairam = titulares.filter(a => {
      const pts = parseFloat(a.pontos_num ?? a.pontos ?? 0);
      const status = a.status_id ?? a.statusId ?? a.status ?? 7;
      return isNaN(pts) || STATUS_NAO_JOGOU.includes(Number(status));
    });
    const reservasQueEntraram = reservas.filter(a => {
      const pts = parseFloat(a.pontos_num ?? a.pontos ?? 0);
      return !isNaN(pts) && pts !== 0;
    });
    let sairam = titularesQueSairam.length;
    let entraram = reservasQueEntraram.length;
    if (entraram > sairam && sairam === 0) entraram = 0;
    return {
      escalados: totalEscalados,
      jogaram: titularesQueJogaram.length + entraram,
      sairam, entraram
    };
  }

  function calcularPontosComMultiplicadores(atletas, capitaoId, reservaLuxoId) {
    if (!Array.isArray(atletas)) return 0;
    return atletas.reduce((total, a) => {
      const id = Number(a.atleta_id ?? a.atletaId ?? a.id);
      let pts = parseFloat(a.pontos_num ?? a.pontos ?? 0) || 0;
      if (id && Number(capitaoId) && id === Number(capitaoId)) pts *= 1.5;
      else if (id && Number(reservaLuxoId) && id === Number(reservaLuxoId) && pts !== 0) pts *= 1.5;
      return total + pts;
    }, 0);
  }

  function renderizarGrupoPosicao(label, icone, atletas, capitaoId, reservaLuxoId) {
    if (!Array.isArray(atletas) || atletas.length === 0) return '';
    return `
      <div class="dl-esc-grupo">
        <div class="dl-esc-grupo-title">
          <span class="material-icons dl-esc-grupo-icon">${icone}</span>
          <span>${label}</span>
          <span class="dl-esc-grupo-count">(${atletas.length})</span>
        </div>
        ${atletas.map(a => renderizarLinhaJogador(a, capitaoId, reservaLuxoId, false)).join('')}
      </div>
    `;
  }

  function renderizarLinhaJogador(atleta, capitaoId, reservaLuxoId, isReserva) {
    if (!atleta) return '';
    const atletaId = Number(atleta.atleta_id ?? atleta.atletaId ?? atleta.id);
    const pos = POSICOES[atleta.posicao_id ?? atleta.posicaoId ?? atleta.posicao] || { nome: '?', abreviacao: '?' };
    const nome = atleta.apelido || atleta.nome || 'Jogador';
    const clubeId = atleta.clube_id || atleta.clubeId || 'default';
    const isCapitao = Number(capitaoId) && atletaId === Number(capitaoId);
    const isLuxo = Number(reservaLuxoId) && atletaId === Number(reservaLuxoId);

    let pontos = parseFloat(atleta.pontos_num ?? atleta.pontos ?? 0) || 0;
    let pontosExibir = pontos;
    let multiplicador = '';
    if (isCapitao) { pontosExibir = pontos * 1.5; multiplicador = '1.5x'; }
    else if (isLuxo && pontos !== 0) { pontosExibir = pontos * 1.5; multiplicador = '1.5x'; }

    const scoreClass = pontosExibir > 0 ? 'positive' : (pontosExibir < 0 ? 'negative' : 'neutral');
    const cardClass = isCapitao ? 'capitao' : isLuxo ? 'luxo' : '';
    const reservaClass = isReserva ? 'reserva' : '';
    const negClass = pontosExibir < 0 ? 'negativo-bg' : '';

    let badgeHtml = '';
    if (isCapitao) badgeHtml = '<div class="dl-esc-badge badge-c"><span>C</span></div>';
    else if (isLuxo) badgeHtml = '<div class="dl-esc-badge badge-l"><span>L</span></div>';

    const multHtml = multiplicador && pontos !== 0
      ? `<span class="dl-esc-multiplicador ${isCapitao ? 'cap' : 'lux'}">(${pontos.toFixed(2)} x${multiplicador.replace('x', '')})</span>`
      : '';

    return `
      <div class="dl-esc-jogador ${cardClass} ${reservaClass} ${negClass}">
        <div class="dl-esc-escudo">
          <img src="/escudos/${clubeId}.png" onerror="this.onerror=null;this.src='/escudos/default.png'" />
          ${badgeHtml}
        </div>
        <div class="dl-esc-info">
          <span class="dl-esc-nome">${escapeHtml(nome)}</span>
          <span class="dl-esc-pos">${pos.abreviacao}${isCapitao ? ' - Capitao (1.5x)' : ''}${isLuxo ? ' - Luxo (1.5x)' : ''}</span>
        </div>
        <div class="dl-esc-pontos">
          <span class="dl-esc-pontos-valor ${scoreClass}">${pontosExibir.toFixed(2)}</span>
          ${multHtml}
        </div>
      </div>
    `;
  }

  // =====================================================================
  // DUMP / DATA LAKE MODAL
  // =====================================================================

  function fecharModalDump() {
    const modal = document.getElementById("modalDump");
    if (modal) modal.classList.remove("active");
  }

  async function abrirModalDump(timeId, nomeCartola, nomeTime) {
    let modal = document.getElementById("modalDump");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.id = "modalDump";
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest(".dl-close-btn")) {
          fecharModalDump();
        }
      });
    }

    modal.innerHTML = `
      <div class="modal-content modal-dump-content">
        <div style="text-align:center;padding:40px;">
          <div class="loading-spinner"></div>
          <div style="color:#9ca3af;font-size:0.85rem;margin-top:8px;">Buscando dados do Data Lake...</div>
        </div>
      </div>
    `;

    modal.classList.add("active");

    try {
      const res = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50`);
      const data = await res.json();
      dumpAtual = { timeId, nomeCartola, nomeTime };
      dumpHistorico = data.historico || [];

      // Auto-detectar e carregar última rodada disponível
      const rodadasDisp = data.rodadas_disponiveis || [];
      if (rodadasDisp.length > 0) {
        const ultimaRodada = Math.max(...rodadasDisp);
        carregarRodadaDump(timeId, nomeCartola, nomeTime, ultimaRodada);
      } else {
        // Sem rodadas - mostra estado vazio com opção de sincronizar
        renderizarDumpGlobo(modal, data, timeId, nomeCartola, nomeTime);
      }
    } catch (error) {
      console.error("[ANALISAR] Erro ao buscar dump:", error);
      modal.querySelector(".modal-content").innerHTML = `
        <button class="dl-close-btn" aria-label="Fechar">
          <span class="material-icons">close</span>
        </button>
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
        <button class="dl-close-btn" aria-label="Fechar">
          <span class="material-icons">close</span>
        </button>
        <div class="dl-empty-state">
          <span class="material-icons" style="font-size:64px;color:#4b5563;">cloud_off</span>
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
    const escudo = time.url_escudo_png || time.url_escudo_svg || '';
    const fotoPerfil = time.foto_perfil || '';
    const assinante = time.assinante || false;
    const nomeTimeApi = time.nome || nomeTime;
    const nomeCartolaApi = time.nome_cartola || nomeCartola;
    const dataColeta = dump.data_coleta ? new Date(dump.data_coleta).toLocaleString("pt-BR") : '';

    const capitaoId = raw.capitao_id;
    const reservaLuxoId = raw.reserva_luxo_id;
    const rodadaAtual = dump.rodada || raw.rodada_atual || null;
    const rodadasDisp = data.rodadas_disponiveis || [];
    const historico = data.historico || [];
    const pontosTotal = data.pontos_total_temporada;
    const patrimonio = raw.patrimonio;
    const variacao = raw.variacao_patrimonio || 0;

    // Separar titulares e reservas corretamente (Cartola API: atletas = titulares, reservas = banco)
    const atletasRaw = Array.isArray(raw.atletas) ? raw.atletas : Object.values(raw.atletas || {});
    const reservasRaw = Array.isArray(raw.reservas) ? raw.reservas : Object.values(raw.reservas || {});
    const titulares = reservasRaw.length > 0 ? atletasRaw : atletasRaw.slice(0, 12);
    const reservas = reservasRaw.length > 0 ? reservasRaw : atletasRaw.slice(12);

    // Agrupamento por posição (estilo participante)
    const grupos = agruparPorPosicao(titulares);
    const totalEscalados = grupos.goleiros.length + grupos.defensores.length + grupos.meias.length + grupos.atacantes.length + grupos.tecnicos.length;
    const formacao = `${grupos.defensores.length}-${grupos.meias.length}-${grupos.atacantes.length}`;
    const statsJogo = calcularStatsJogoDump(titulares, reservas);
    const pontos = raw.pontos !== undefined ? raw.pontos : calcularPontosComMultiplicadores(titulares, capitaoId, reservaLuxoId);

    let html = '';

    // ── HEADER (info do time) ──
    html += `
      <div class="dl-header">
        <button class="dl-close-btn" aria-label="Fechar">
          <span class="material-icons">close</span>
        </button>
        <div class="dl-team-badge">
          ${escudo ? `<img src="${escapeHtml(escudo)}" onerror="this.style.display='none'" alt="" />` : '<span class="material-icons" style="font-size:40px;color:#4b5563;">shield</span>'}
          ${fotoPerfil ? `<img class="dl-foto-perfil" src="${escapeHtml(fotoPerfil)}" onerror="this.style.display='none'" alt="" />` : ''}
        </div>
        ${assinante ? '<div class="dl-pro-badge">PRO</div>' : ''}
        <div class="dl-team-name">${escapeHtml(nomeTimeApi)}</div>
        <div class="dl-cartoleiro-name">${escapeHtml(nomeCartolaApi)}</div>
      </div>
    `;

    // ── SELETOR DE RODADA + REFRESH (topo) ──
    html += `
      <div class="dl-round-control">
        <div class="dl-round-control-left">
          <select class="dl-round-select" id="dlRoundSelect">
            ${rodadasDisp.length > 0
              ? rodadasDisp.map(r => `<option value="${r}" ${r === rodadaAtual ? 'selected' : ''}>Rodada ${r}${r === rodadaAtual ? ' (visualizando)' : ''}</option>`).join('')
              : '<option value="">Sem rodadas disponíveis</option>'
            }
          </select>
        </div>
        <div class="dl-round-control-right">
          <span class="dl-sync-info">${dataColeta}</span>
          <button class="dl-refresh-btn" id="dlSyncBtn" title="Re-coletar da API Globo e regravar no banco">
            <span class="material-icons">refresh</span>
          </button>
        </div>
      </div>
    `;

    html += '<div class="dl-body">';

    // ── CARD DESEMPENHO (estilo participante) ──
    if (titulares.length > 0 || pontos !== undefined) {
      const variacaoIcone = variacao > 0 ? '&#x25B2;' : variacao < 0 ? '&#x25BC;' : '';
      const variacaoClasse = variacao >= 0 ? 'up' : 'down';

      html += `
        <div class="dl-desemp-card">
          <div class="dl-desemp-header">
            <span class="material-icons">bar_chart</span>
            <span>Desempenho</span>
            ${rodadaAtual ? `<span class="dl-desemp-rodada">Rodada ${rodadaAtual}</span>` : ''}
          </div>
          <div class="dl-desemp-main">
            <div class="dl-desemp-pontos-box">
              <span class="dl-desemp-pontos-valor">${typeof pontos === 'number' ? pontos.toFixed(2) : (pontos || '0.00')}</span>
              <span class="dl-desemp-pontos-label">Pontos na Rodada</span>
            </div>
          </div>
          <div class="dl-desemp-stats">
            ${patrimonio !== undefined ? `
            <div class="dl-desemp-stat">
              <span class="dl-desemp-stat-valor">C$ ${patrimonio.toFixed(2)}</span>
              <span class="dl-desemp-stat-label">Patrimonio</span>
            </div>` : ''}
            ${variacao !== 0 ? `
            <div class="dl-desemp-stat">
              <span class="dl-desemp-stat-valor ${variacaoClasse}">${variacao >= 0 ? '+' : ''}${variacao.toFixed(2)} ${variacaoIcone}</span>
              <span class="dl-desemp-stat-label">Variacao</span>
            </div>` : ''}
            ${pontosTotal !== undefined && pontosTotal !== pontos ? `
            <div class="dl-desemp-stat">
              <span class="dl-desemp-stat-valor">${typeof pontosTotal === 'number' ? pontosTotal.toFixed(2) : pontosTotal}</span>
              <span class="dl-desemp-stat-label">Total Temp.</span>
            </div>` : ''}
          </div>
          ${titulares.length > 0 ? `
          <div class="dl-desemp-esc-stats">
            <div class="dl-desemp-esc-item"><span class="dl-esc-dot escalados">&#x25CF;</span> <strong>${statsJogo.escalados}</strong> escalados</div>
            <div class="dl-desemp-esc-item"><span class="dl-esc-dot jogaram">&#x25CF;</span> <strong>${statsJogo.jogaram}</strong> jogaram</div>
            <div class="dl-desemp-esc-item"><span class="dl-esc-dot sairam">&#x25BC;</span> <strong>${statsJogo.sairam}</strong> saiu</div>
            <div class="dl-desemp-esc-item"><span class="dl-esc-dot entraram">&#x25B2;</span> <strong>${statsJogo.entraram}</strong> entrou</div>
          </div>` : ''}
        </div>
      `;
    }

    // ── ESCALACAO POR POSICAO (estilo participante) ──
    if (titulares.length > 0) {
      html += `
        <div class="dl-escalacao-section">
          <div class="dl-escalacao-header-bar">
            <div class="dl-escalacao-header-left">
              <span class="material-icons">stadium</span>
              <span>Titulares</span>
              <span class="dl-escalacao-count">(${totalEscalados})</span>
            </div>
            <div class="dl-escalacao-header-right">
              <span class="dl-escalacao-formacao">${formacao}</span>
            </div>
          </div>
          <div class="dl-escalacao-body">
            ${renderizarGrupoPosicao('GOL', 'sports_soccer', grupos.goleiros, capitaoId, reservaLuxoId)}
            ${renderizarGrupoPosicao('LAT', 'directions_run', grupos.laterais, capitaoId, reservaLuxoId)}
            ${renderizarGrupoPosicao('ZAG', 'shield', grupos.zagueiros, capitaoId, reservaLuxoId)}
            ${renderizarGrupoPosicao('MEI', 'sync_alt', grupos.meias, capitaoId, reservaLuxoId)}
            ${renderizarGrupoPosicao('ATA', 'sports_score', grupos.atacantes, capitaoId, reservaLuxoId)}
            ${renderizarGrupoPosicao('TEC', 'person', grupos.tecnicos, capitaoId, reservaLuxoId)}
          </div>
      `;

      // Banco de Reservas
      if (reservas.length > 0) {
        html += `
          <div class="dl-escalacao-divisoria"></div>
          <div class="dl-escalacao-banco">
            <div class="dl-escalacao-banco-title">
              <span class="material-icons">event_seat</span>
              <span>Banco de Reservas</span>
              <span class="dl-escalacao-count">(${reservas.length})</span>
            </div>
            ${reservas.map(a => renderizarLinhaJogador(a, capitaoId, reservaLuxoId, true)).join('')}
          </div>
        `;
      }

      html += '</div>'; // close dl-escalacao-section
    }

    // ── GRAFICO DE PERFORMANCE ──
    if (historico.length > 0) {
      const maxPontos = Math.max(...historico.map(h => Math.abs(h.pontos || 0)), 1);
      html += `
        <div class="dl-chart-section">
          <div class="dl-chart-title">Performance rodada a rodada</div>
          <div class="dl-chart-container">
      `;
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
        html += `<div class="dl-chart-label ${r === rodadaAtual ? 'selected' : ''}">${r}</div>`;
      }
      html += '</div></div>';
    }

    html += '</div>'; // close dl-body

    content.innerHTML = html;

    // ── EVENT LISTENERS ──
    // Seletor de rodada
    content.querySelector("#dlRoundSelect")?.addEventListener("change", (e) => {
      const rodada = parseInt(e.target.value);
      if (rodada) carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
    });

    // Refresh = re-coletar da Globo e regravar no Mongo
    content.querySelector("#dlSyncBtn")?.addEventListener("click", () => {
      if (rodadaAtual) {
        sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodadaAtual);
      } else {
        sincronizarDump(timeId, nomeCartola, nomeTime);
      }
    });

    // Click na barra do gráfico carrega rodada
    content.querySelectorAll(".dl-chart-bar-wrap[data-rodada]").forEach(bar => {
      bar.addEventListener("click", async () => {
        const rodada = parseInt(bar.dataset.rodada);
        const h = dumpHistorico.find(x => x.rodada === rodada);
        if (h) {
          carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
        } else if (rodada) {
          if (await SuperModal.confirm({ title: 'Sincronizar', message: `Rodada ${rodada} nao esta no Data Lake. Deseja buscar da API Cartola?` })) {
            sincronizarRodadaDump(timeId, nomeCartola, nomeTime, rodada);
          }
        }
      });
    });
  }

  async function carregarRodadaDump(timeId, nomeCartola, nomeTime, rodada) {
    const modal = document.getElementById("modalDump");
    if (!modal) return;

    const content = modal.querySelector(".modal-content");
    content.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div class="loading-spinner"></div>
        <div style="color:#9ca3af;font-size:0.85rem;margin-top:8px;">Carregando Rodada ${rodada}...</div>
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
          <button class="dl-sync-btn" aria-label="Fechar">Fechar</button>
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
        <div style="color:#9ca3af;font-size:0.85rem;margin-top:8px;">Sincronizando Rodada ${rodada} com API Cartola...</div>
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
        <div style="color:#9ca3af;font-size:0.85rem;margin-top:8px;">Sincronizando com API Cartola...</div>
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
          <button class="btn-sync-dump" aria-label="Fechar">Fechar</button>
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
    els.filtroLiga?.addEventListener("change", () => {
      ligaSelecionada = els.filtroLiga.value;
      if (resumoData) renderizarLigasResumo(resumoData.porLiga);
      carregarParticipantes();
    });
    els.filtroStatus?.addEventListener("change", carregarParticipantes);
    els.filtroSenha?.addEventListener("change", carregarParticipantes);
    els.filtroBusca?.addEventListener("input", debounceBusca);

    // Modal senha
    els.modalSenhaSalvar?.addEventListener("click", salvarSenhaModal);
    els.modalSenhaFechar?.addEventListener("click", fecharModalSenha);
    els.modalSenha?.addEventListener("click", (e) => {
      if (e.target === els.modalSenha) fecharModalSenha();
    });
    els.modalSenhaInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") salvarSenhaModal();
      if (e.key === "Escape") fecharModalSenha();
    });

    // Modal lote
    els.btnSenhaLote?.addEventListener("click", abrirModalLote);
    els.modalLoteSalvar?.addEventListener("click", aplicarSenhaLote);
    els.modalLoteFechar?.addEventListener("click", fecharModalLote);
    els.modalSenhaLote?.addEventListener("click", (e) => {
      if (e.target === els.modalSenhaLote) fecharModalLote();
    });
    els.modalLoteSenhaInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") aplicarSenhaLote();
      if (e.key === "Escape") fecharModalLote();
    });

    // Exportar
    els.btnExportarCSV?.addEventListener("click", exportarCSV);

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

  // ✅ FIX: Expor init para re-execução via SPA navigation
  window.__analisarParticipantesInit = init;

  // ✅ FIX: Re-init ao navegar via SPA (DOM substituído, refs precisam ser rebindadas)
  window.addEventListener("spa:navigated", (e) => {
    const page = e.detail?.pageName || "";
    if (page === "analisar-participantes.html") {
      init();
    }
  });
})();
