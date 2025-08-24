
/**
 * ========================================
 * DETALHE LIGA - JAVASCRIPT EXTERNALIZADO
 * Extraído de detalhe-liga.html
 * ========================================
 */

console.log("🏆 [DETALHE-LIGA] Módulo v2.0 carregando...");

// ✅ ESTADO GLOBAL
let currentLiga = null;
let currentTab = 'ranking';
let ligaData = {};
let participantes = [];
let rodadas = [];

// ✅ UTILITÁRIOS
const utils = {
  formatarNumero: (num) => {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatarMoeda: (valor) => {
    if (valor === null || valor === undefined) return 'C$ 0,00';
    return `C$ ${parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  obterEscudo: (escudo_id) => {
    if (!escudo_id) return '/escudos/default.png';
    return `/escudos/${escudo_id}.png`;
  },

  calcularClassePosicao: (posicao, totalTimes) => {
    const porcentagem = (posicao / totalTimes) * 100;
    if (porcentagem <= 5) return 'pos-mito';
    if (porcentagem <= 25) return 'pos-g';
    if (porcentagem <= 75) return 'pos-z';
    return 'pos-mico';
  }
};

// ✅ SISTEMA DE TABS
const TabSystem = {
  init() {
    console.log("📑 [TABS] Inicializando sistema...");
    this.bindEvents();
    this.showTab('ranking'); // Tab padrão
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button')) {
        const tabId = e.target.dataset.tab;
        this.showTab(tabId);
      }
    });
  },

  showTab(tabId) {
    console.log(`📑 [TABS] Ativando tab: ${tabId}`);
    
    // Remover active de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Ocultar todos os conteúdos
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Ativar tab atual
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`tab-${tabId}`);
    
    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    currentTab = tabId;
    this.loadTabContent(tabId);
  },

  async loadTabContent(tabId) {
    const contentDiv = document.getElementById(`tab-${tabId}`);
    if (!contentDiv) return;

    try {
      contentDiv.innerHTML = '<div class="liga-loading">Carregando...</div>';
      
      switch (tabId) {
        case 'ranking':
          await RankingModule.load(contentDiv);
          break;
        case 'participantes':
          await ParticipantesModule.load(contentDiv);
          break;
        case 'rodadas':
          await RodadasModule.load(contentDiv);
          break;
        case 'mata-mata':
          await MataMataMódule.load(contentDiv);
          break;
        case 'pontos-corridos':
          await PontosCorridosModule.load(contentDiv);
          break;
        case 'fluxo-financeiro':
          await FluxoFinanceiroModule.load(contentDiv);
          break;
        case 'artilheiro-campeao':
          await ArtilheiroCampeaoModule.load(contentDiv);
          break;
        case 'melhor-mes':
          await MelhorMesModule.load(contentDiv);
          break;
        case 'luva-de-ouro':
          await LuvaDeOuroModule.load(contentDiv);
          break;
        case 'top10':
          await Top10Module.load(contentDiv);
          break;
        default:
          contentDiv.innerHTML = '<div class="liga-empty">Conteúdo não encontrado</div>';
      }
    } catch (error) {
      console.error(`❌ [TABS] Erro ao carregar ${tabId}:`, error);
      contentDiv.innerHTML = `<div class="liga-error">Erro ao carregar ${tabId}: ${error.message}</div>`;
    }
  }
};

// ✅ CARREGAMENTO DE DADOS
const DataLoader = {
  async carregarLiga() {
    const ligaId = new URLSearchParams(window.location.search).get('id');
    if (!ligaId) {
      throw new Error('ID da liga não fornecido');
    }

    console.log(`📊 [DATA] Carregando liga ${ligaId}...`);
    
    try {
      const response = await fetch(`/api/ligas/${ligaId}`);
      if (!response.ok) throw new Error('Liga não encontrada');
      
      const liga = await response.json();
      currentLiga = liga;
      ligaData = liga;
      
      return liga;
    } catch (error) {
      console.error('❌ [DATA] Erro ao carregar liga:', error);
      throw error;
    }
  },

  async carregarParticipantes() {
    if (!currentLiga) return [];
    
    console.log(`👥 [DATA] Carregando participantes...`);
    
    try {
      const response = await fetch(`/api/ligas/${currentLiga.id}/participantes`);
      if (!response.ok) throw new Error('Erro ao carregar participantes');
      
      participantes = await response.json();
      return participantes;
    } catch (error) {
      console.error('❌ [DATA] Erro ao carregar participantes:', error);
      return [];
    }
  },

  async carregarRodadas() {
    if (!currentLiga) return [];
    
    console.log(`🎯 [DATA] Carregando rodadas...`);
    
    try {
      const response = await fetch(`/api/ligas/${currentLiga.id}/rodadas`);
      if (!response.ok) throw new Error('Erro ao carregar rodadas');
      
      rodadas = await response.json();
      return rodadas;
    } catch (error) {
      console.error('❌ [DATA] Erro ao carregar rodadas:', error);
      return [];
    }
  }
};

// ✅ MÓDULOS DE CONTEÚDO
const RankingModule = {
  async load(container) {
    const participantes = await DataLoader.carregarParticipantes();
    
    if (!participantes.length) {
      container.innerHTML = '<div class="liga-empty">Nenhum participante encontrado</div>';
      return;
    }

    const tableHTML = `
      <div class="liga-filters">
        <div class="filter-group">
          <label class="filter-label">Buscar Time</label>
          <input type="text" class="filter-input" id="search-time" placeholder="Nome do time...">
        </div>
      </div>
      <table class="liga-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Time</th>
            <th>Pontos</th>
            <th>Vitórias</th>
            <th>Patrimônio</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${participantes.map((p, index) => `
            <tr>
              <td class="posicao">
                <span class="${utils.calcularClassePosicao(index + 1, participantes.length)}">
                  ${index + 1}º
                </span>
              </td>
              <td class="time-nome">
                <img src="${utils.obterEscudo(p.escudo_id)}" alt="Escudo" class="escudo-time">
                ${p.nome}
              </td>
              <td class="pontos">${utils.formatarNumero(p.pontos || 0)}</td>
              <td>${p.vitorias || 0}</td>
              <td>${utils.formatarMoeda(p.patrimonio || 0)}</td>
              <td>
                <span class="valor-${p.pontos > 0 ? 'positivo' : 'neutro'}">
                  ${p.pontos > 0 ? 'Ativo' : 'Inativo'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    container.innerHTML = tableHTML;
    this.bindEvents(container);
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#search-time');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filtrarTabela(e.target.value, container);
      });
    }
  },

  filtrarTabela(termo, container) {
    const rows = container.querySelectorAll('tbody tr');
    const termoLower = termo.toLowerCase();
    
    rows.forEach(row => {
      const nomeTime = row.querySelector('.time-nome').textContent.toLowerCase();
      row.style.display = nomeTime.includes(termoLower) ? '' : 'none';
    });
  }
};

const ParticipantesModule = {
  async load(container) {
    const participantes = await DataLoader.carregarParticipantes();
    
    container.innerHTML = `
      <div class="liga-stats">
        <div class="stat-card">
          <div class="stat-value">${participantes.length}</div>
          <div class="stat-label">Total de Times</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${participantes.filter(p => p.pontos > 0).length}</div>
          <div class="stat-label">Times Ativos</div>
        </div>
      </div>
      <div id="participantes-lista">Carregando detalhes...</div>
    `;
    
    // Carregar detalhes específicos do módulo existente
    if (typeof window.carregarParticipantes === 'function') {
      setTimeout(() => window.carregarParticipantes(), 100);
    }
  }
};

const RodadasModule = {
  async load(container) {
    const rodadas = await DataLoader.carregarRodadas();
    
    container.innerHTML = `
      <div class="liga-stats">
        <div class="stat-card">
          <div class="stat-value">${rodadas.length}</div>
          <div class="stat-label">Rodadas Disputadas</div>
        </div>
      </div>
      <div id="rodadas-lista">Carregando rodadas...</div>
    `;
    
    // Carregar detalhes específicos do módulo existente
    if (typeof window.carregarRodadas === 'function') {
      setTimeout(() => window.carregarRodadas(), 100);
    }
  }
};

const MataMataMódule = {
  async load(container) {
    container.innerHTML = '<div id="mata-mata-content">Carregando mata-mata...</div>';
    
    if (typeof window.carregarMataMata === 'function') {
      setTimeout(() => window.carregarMataMata(), 100);
    }
  }
};

const PontosCorridosModule = {
  async load(container) {
    container.innerHTML = '<div id="pontos-corridos-content">Carregando pontos corridos...</div>';
    
    if (typeof window.carregarPontosCorridos === 'function') {
      setTimeout(() => window.carregarPontosCorridos(), 100);
    }
  }
};

const FluxoFinanceiroModule = {
  async load(container) {
    container.innerHTML = '<div id="fluxo-financeiro-content">Carregando fluxo financeiro...</div>';
    
    if (typeof window.carregarFluxoFinanceiro === 'function') {
      setTimeout(() => window.carregarFluxoFinanceiro(), 100);
    }
  }
};

const ArtilheiroCampeaoModule = {
  async load(container) {
    container.innerHTML = '<div id="artilheiro-campeao-content">Carregando artilheiro campeão...</div>';
    
    if (typeof window.carregarArtilheiroCampeao === 'function') {
      setTimeout(() => window.carregarArtilheiroCampeao(), 100);
    }
  }
};

const MelhorMesModule = {
  async load(container) {
    container.innerHTML = '<div id="melhor-mes-content">Carregando melhor do mês...</div>';
    
    if (typeof window.carregarMelhorMes === 'function') {
      setTimeout(() => window.carregarMelhorMes(), 100);
    }
  }
};

const LuvaDeOuroModule = {
  async load(container) {
    container.innerHTML = '<div id="luva-de-ouro-content">Carregando luva de ouro...</div>';
    
    if (typeof window.carregarLuvaDeOuro === 'function') {
      setTimeout(() => window.carregarLuvaDeOuro(), 100);
    }
  }
};

const Top10Module = {
  async load(container) {
    container.innerHTML = '<div id="top10-content">Carregando top 10...</div>';
    
    if (typeof window.carregarTop10 === 'function') {
      setTimeout(() => window.carregarTop10(), 100);
    }
  }
};

// ✅ SISTEMA DE EXPORT
const ExportSystem = {
  show() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
      <div class="export-content">
        <h3 class="export-header">Exportar Dados</h3>
        <div class="export-options">
          <div class="export-option" data-type="ranking">
            <span>📊</span>
            <span>Ranking Geral</span>
          </div>
          <div class="export-option" data-type="participantes">
            <span>👥</span>
            <span>Lista de Participantes</span>
          </div>
          <div class="export-option" data-type="rodadas">
            <span>🎯</span>
            <span>Relatório de Rodadas</span>
          </div>
        </div>
        <div class="export-actions">
          <button class="btn" onclick="this.closest('.export-modal').remove()">Cancelar</button>
          <button class="btn active" onclick="ExportSystem.execute()">Exportar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Bind events
    modal.querySelectorAll('.export-option').forEach(option => {
      option.addEventListener('click', () => {
        modal.querySelectorAll('.export-option').forEach(o => o.style.background = '');
        option.style.background = 'var(--laranja-alpha)';
        modal.dataset.selectedType = option.dataset.type;
      });
    });
  },

  execute() {
    const modal = document.querySelector('.export-modal');
    const type = modal?.dataset.selectedType;
    
    if (!type) {
      alert('Selecione um tipo de export');
      return;
    }
    
    console.log(`📤 [EXPORT] Exportando ${type}...`);
    
    // Aqui seria implementado o export real
    // Por ora, simular sucesso
    alert(`Export de ${type} iniciado!`);
    modal.remove();
  }
};

// ✅ INICIALIZAÇÃO PRINCIPAL
const DetalheLiga = {
  async init() {
    console.log("🏆 [DETALHE-LIGA] Inicializando aplicação...");
    
    try {
      // Mostrar loading inicial
      this.showLoading();
      
      // Carregar dados da liga
      const liga = await DataLoader.carregarLiga();
      
      // Atualizar header
      this.updateHeader(liga);
      
      // Inicializar sistemas
      TabSystem.init();
      
      // Remover loading
      this.hideLoading();
      
      console.log("✅ [DETALHE-LIGA] Aplicação inicializada com sucesso!");
      
    } catch (error) {
      console.error("❌ [DETALHE-LIGA] Erro na inicialização:", error);
      this.showError(error.message);
    }
  },

  showLoading() {
    const main = document.querySelector('.page-content');
    if (main) {
      main.innerHTML = `
        <div class="liga-loading">
          <div class="loading-spinner"></div>
          <p>Carregando dados da liga...</p>
        </div>
      `;
    }
  },

  hideLoading() {
    // O conteúdo será substituído pelos dados carregados
  },

  showError(message) {
    const main = document.querySelector('.page-content');
    if (main) {
      main.innerHTML = `
        <div class="liga-error">
          <h3>Erro ao carregar liga</h3>
          <p>${message}</p>
          <button class="btn" onclick="location.reload()">Tentar Novamente</button>
        </div>
      `;
    }
  },

  updateHeader(liga) {
    const title = document.querySelector('.page-title');
    const subtitle = document.querySelector('.page-subtitle');
    
    if (title) title.textContent = liga.nome || 'Liga';
    if (subtitle) subtitle.textContent = `${liga.participantes || 0} participantes • Rodada ${liga.rodada_atual || 1}`;
  }
};

// ✅ EXPOSIÇÃO GLOBAL (para compatibilidade)
window.DetalheLiga = DetalheLiga;
window.TabSystem = TabSystem;
window.ExportSystem = ExportSystem;
window.utils = utils;

// ✅ AUTO-INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  DetalheLiga.init();
});

console.log("✅ [DETALHE-LIGA] Módulo JavaScript carregado!");
