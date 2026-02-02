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
  // DUMP / DATA LAKE
  // =====================================================================

  let dumpAtual = null;

  async function abrirModalDump(timeId, nomeCartola, nomeTime) {
    // Criar modal se nao existe
    let modal = document.getElementById("modalDump");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.id = "modalDump";
      document.body.appendChild(modal);
    }

    // Loading state
    modal.innerHTML = `
      <div class="modal-content modal-dump-content">
        <div class="modal-dump-header">
          <div>
            <h3 class="modal-title" style="margin-bottom:2px;">
              <span class="material-icons" style="color:#FF5500">cloud_sync</span>
              ${escapeHtml(nomeCartola)}
            </h3>
            <span style="font-size:0.75rem;color:#6b7280;">${escapeHtml(nomeTime)} | ID: ${timeId}</span>
          </div>
          <button class="btn-fechar-dump" onclick="document.getElementById('modalDump').classList.remove('active')">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-dump-body">
          <div class="loading-state"><div class="loading-spinner"></div><div>Buscando dados...</div></div>
        </div>
      </div>
    `;

    modal.classList.add("active");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });

    // Buscar dados
    try {
      const res = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50`);
      const data = await res.json();
      dumpAtual = { timeId, nomeCartola, nomeTime };
      renderizarModalDump(modal, data, timeId, nomeCartola, nomeTime);
    } catch (error) {
      console.error("[ANALISAR] Erro ao buscar dump:", error);
      modal.querySelector(".modal-dump-body").innerHTML = `
        <div class="empty-state">
          <span class="material-icons" style="font-size:48px;color:#ef4444;">wifi_off</span>
          <div>Erro ao buscar dados: ${error.message}</div>
        </div>
      `;
    }
  }

  function renderizarModalDump(modal, data, timeId, nomeCartola, nomeTime) {
    const body = modal.querySelector(".modal-dump-body");

    if (!data.success || !data.dump_atual) {
      // Sem dados - estado vazio
      body.innerHTML = `
        <div class="dump-empty-state">
          <span class="material-icons" style="font-size:64px;color:#4b5563;">cloud_off</span>
          <h4 style="color:#9ca3af;margin:12px 0 6px;">Nenhum dump encontrado para este participante</h4>
          <p style="font-size:0.75rem;color:#6b7280;max-width:380px;margin:0 auto 16px;">
            Os dados sao coletados automaticamente durante o processamento de rodadas.
            Use o <strong>Sync Cartola</strong> ou processe uma rodada para popular o Data Lake.
          </p>
          <button class="btn-sync-dump" data-time-id="${timeId}">
            <span class="material-icons">download</span>
            Buscar Dados da API Cartola
          </button>
        </div>
      `;
      body.querySelector(".btn-sync-dump")?.addEventListener("click", () => sincronizarDump(timeId, nomeCartola, nomeTime));
      return;
    }

    // Tem dados - mostrar resumo
    const dump = data.dump_atual;
    const rawJson = dump.raw_json || {};
    const time = rawJson.time || rawJson;
    const atletas = rawJson.atletas || [];
    const patrimonio = rawJson.patrimonio;
    const pontos = data.pontos_total_temporada || rawJson.pontos || rawJson.pontos_campeonato;
    const rodadas = data.rodadas_disponiveis || [];
    const dataColeta = new Date(dump.data_coleta).toLocaleString("pt-BR");

    body.innerHTML = `
      <div class="dump-meta-bar">
        <span class="dump-meta-item"><span class="material-icons" style="font-size:14px;">schedule</span> ${dataColeta}</span>
        <span class="dump-meta-item"><span class="material-icons" style="font-size:14px;">category</span> ${dump.tipo_coleta}</span>
        ${rodadas.length > 0 ? `<span class="dump-meta-item"><span class="material-icons" style="font-size:14px;">calendar_month</span> ${rodadas.length} rodadas</span>` : ""}
        <button class="btn-sync-mini" data-time-id="${timeId}" title="Atualizar dados">
          <span class="material-icons" style="font-size:16px;">refresh</span>
        </button>
      </div>
      <div class="dump-resumo-grid">
        <div class="dump-resumo-item">
          <span class="material-icons">person</span>
          <div><span class="dump-label">Cartoleiro</span><span class="dump-value">${escapeHtml(time.nome_cartola || nomeCartola)}</span></div>
        </div>
        <div class="dump-resumo-item">
          <span class="material-icons">sports_soccer</span>
          <div><span class="dump-label">Time</span><span class="dump-value">${escapeHtml(time.nome || nomeTime)}</span></div>
        </div>
        ${patrimonio !== undefined ? `
        <div class="dump-resumo-item">
          <span class="material-icons">account_balance</span>
          <div><span class="dump-label">Patrimonio</span><span class="dump-value">C$ ${patrimonio.toFixed(2)}</span></div>
        </div>` : ""}
        ${pontos !== undefined ? `
        <div class="dump-resumo-item dump-item-destaque">
          <span class="material-icons">emoji_events</span>
          <div><span class="dump-label">Pontos Total</span><span class="dump-value">${typeof pontos === 'number' ? pontos.toFixed(2) : pontos}</span></div>
        </div>` : ""}
        ${atletas.length > 0 ? `
        <div class="dump-resumo-item">
          <span class="material-icons">group</span>
          <div><span class="dump-label">Atletas</span><span class="dump-value">${atletas.length} jogadores</span></div>
        </div>` : ""}
      </div>
      ${rodadas.length > 0 ? `
      <div class="dump-rodadas">
        <span class="dump-label" style="margin-bottom:6px;display:block;">Rodadas disponiveis:</span>
        <div class="dump-rodadas-grid">
          ${rodadas.map(r => `<span class="dump-rodada-badge">${r}</span>`).join("")}
        </div>
      </div>` : ""}
    `;

    body.querySelector(".btn-sync-mini")?.addEventListener("click", () => sincronizarDump(timeId, nomeCartola, nomeTime));
  }

  async function sincronizarDump(timeId, nomeCartola, nomeTime) {
    const modal = document.getElementById("modalDump");
    const body = modal?.querySelector(".modal-dump-body");
    if (!body) return;

    body.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div>Sincronizando com API Cartola...</div>
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

      // Recarregar dados do dump
      const rawRes = await fetch(`/api/data-lake/raw/${timeId}?historico=true&limit=50`);
      const rawData = await rawRes.json();
      renderizarModalDump(modal, rawData, timeId, nomeCartola, nomeTime);

    } catch (error) {
      console.error("[ANALISAR] Erro ao sincronizar:", error);
      body.innerHTML = `
        <div class="empty-state">
          <span class="material-icons" style="font-size:48px;color:#ef4444;">error</span>
          <div style="margin-bottom:12px;">Erro: ${escapeHtml(error.message)}</div>
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
