/**
 * FLUXO-FINANCEIRO-STYLES.JS - v1.0
 * 
 * Módulo extraído de fluxo-financeiro-ui.js para reduzir o tamanho do arquivo principal.
 * Contém todas as funções de injeção de CSS do módulo Fluxo Financeiro.
 * 
 * HISTÓRICO:
 * ✅ v1.0 (2026-01-22): Extraído de fluxo-financeiro-ui.js (~1.850 linhas de CSS)
 *    - injetarEstilosWrapper (ex _injetarEstilosWrapper)
 *    - injetarEstilosTabelaCompacta (ex _injetarEstilosTabelaCompacta)
 *    - injetarEstilosTabelaExpandida (ex _injetarEstilosTabelaExpandida)
 *    - injetarEstilosModal (ex _injetarEstilosModal)
 *    - injetarEstilosModalAuditoriaFinanceira (já era standalone)
 * 
 * ROLLBACK: git checkout HEAD~1 -- public/js/fluxo-financeiro/fluxo-financeiro-ui.js
 */

/**
 * Estilos do wrapper e controles do Fluxo Financeiro
 */
export function injetarEstilosWrapper() {
    if (document.getElementById("participante-wrapper-styles")) return;

    const style = document.createElement("style");
    style.id = "participante-wrapper-styles";
    style.textContent = `
        /* ✅ v4.5: Layout profissional do header */
        .fluxo-controls-header {
            background: linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(25, 25, 30, 0.98) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .fluxo-controls-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .fluxo-search-row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .search-container {
            flex: 1;
            min-width: 200px;
            position: relative;
            display: flex;
            align-items: center;
        }
        .search-container .search-icon {
            position: absolute;
            left: 12px;
            color: #888;
            font-size: 18px;
            pointer-events: none;
        }
        .input-search {
            width: 100%;
            padding: 10px 12px 10px 40px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        .input-search:focus {
            outline: none;
            border-color: var(--laranja, #ff6b35);
            background: rgba(255, 255, 255, 0.08);
        }
        .input-search::placeholder {
            color: #666;
        }
        .participantes-count {
            color: #888;
            font-size: 13px;
            white-space: nowrap;
        }

        /* ✅ v4.5: Botões profissionais */
        .btn-fluxo {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .btn-fluxo .material-icons {
            font-size: 18px;
        }
        .btn-fluxo:hover {
            transform: translateY(-2px);
        }
        .btn-fluxo:active {
            transform: translateY(0);
        }
        .btn-fluxo:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }
        .btn-fluxo.loading .material-icons {
            animation: spin 1s linear infinite;
        }

        /* Cores dos botões */
        .btn-relatorio {
            background: linear-gradient(135deg, #ff6b35 0%, #f54d00 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }
        .btn-relatorio:hover {
            box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
        }

        .btn-limpar {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }
        .btn-limpar:hover {
            box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
        }

        .btn-recalcular {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
        }
        .btn-recalcular:hover {
            box-shadow: 0 4px 16px rgba(5, 150, 105, 0.4);
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Responsivo */
        @media (max-width: 600px) {
            .fluxo-controls-row {
                flex-direction: column;
            }
            .btn-fluxo {
                width: 100%;
                justify-content: center;
            }
            .fluxo-search-row {
                flex-direction: column;
                align-items: stretch;
            }
            .participantes-count {
                text-align: center;
            }
        }

        /* Cards de participante */
        .participante-card-wrapper {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .participante-card-wrapper .btn-auditar {
            width: 100%;
            justify-content: center;
        }

        /* Botão limpar cache individual */
        .btn-recalc-cache {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
        }
        .btn-recalc-cache:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        .btn-recalc-cache:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .btn-recalc-cache.loading .material-icons {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Estilos da tabela compacta de participantes
 */
export function injetarEstilosTabelaCompacta() {
    if (document.getElementById("fluxo-tabela-compacta-styles")) return;

    const style = document.createElement("style");
    style.id = "fluxo-tabela-compacta-styles";
    style.textContent = `
        /* ========================================
           TABELA COMPACTA DE PARTICIPANTES
           v2.2 - Scroll Horizontal Visível
           ======================================== */

        /* ✅ v2.5: Container COM altura máxima - sticky funciona com scroll interno */
        .fluxo-tabela-container {
            background: #1a1a1a;
            border: 1px solid rgba(255, 85, 0, 0.25);
            border-radius: 12px;
            position: relative;
            overflow-x: auto !important;    /* SCROLL horizontal quando necessário */
            overflow-y: auto !important;    /* ✅ v2.5: Scroll vertical para sticky */
            max-height: 70vh !important;    /* ✅ v2.5: Altura máxima = sticky funciona */
        }

        /* Scrollbar elegante - VERTICAL */
        .fluxo-tabela-container::-webkit-scrollbar {
            width: 8px;   /* Barra vertical */
            height: 10px; /* Barra horizontal */
        }
        .fluxo-tabela-container::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 5px;
        }
        .fluxo-tabela-container::-webkit-scrollbar-thumb {
            background: linear-gradient(90deg, #FF5500, #ff6b1a);
            border-radius: 5px;
        }
        .fluxo-tabela-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(90deg, #ff6b1a, #FF5500);
        }
        /* Scrollbar Firefox */
        .fluxo-tabela-container {
            scrollbar-width: thin;
            scrollbar-color: #FF5500 #1a1a1a;
        }

        .fluxo-participantes-tabela {
            min-width: 900px;  /* ✅ v2.2: Força scroll horizontal em telas pequenas */
            border-collapse: separate;  /* ✅ CRITICAL: separate é OBRIGATÓRIO para sticky funcionar */
            border-spacing: 0;
            font-size: 0.9rem;
        }

        .fluxo-participantes-tabela thead {
            position: sticky;
            top: 0;
            z-index: 20;
        }

        /* ✅ v2.0: Cada TH precisa de sticky + background sólido */
        .fluxo-participantes-tabela th {
            position: sticky;
            top: 0;
            z-index: 20;
            background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            color: #FF5500;
            font-weight: 700;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 8px;
            text-align: left;
            border-bottom: 2px solid #FF5500;
        }

        .fluxo-participantes-tabela th.col-num {
            width: 36px;
            text-align: center;
        }

        .fluxo-participantes-tabela th.col-acoes {
            width: 150px;
            text-align: center;
        }

        .fluxo-participantes-tabela th.col-time {
            width: 140px;
        }

        /* Linhas da tabela */
        .participante-row-tabela {
            transition: all 0.15s ease;
            border-bottom: 1px solid rgba(255, 85, 0, 0.08);
        }

        .participante-row-tabela:nth-child(even) {
            background: rgba(255, 85, 0, 0.03);
        }

        .participante-row-tabela:hover {
            background: rgba(255, 85, 0, 0.12);
        }

        .participante-row-tabela.filtered-hidden {
            display: none;
        }

        .participante-row-tabela td {
            padding: 6px 8px;
            vertical-align: middle;
        }

        .participante-row-tabela td.col-num {
            text-align: center;
            color: #FF5500;
            font-size: 0.8rem;
            font-weight: 600;
        }

        /* Botão do participante */
        .participante-btn-tabela {
            display: flex;
            align-items: center;
            gap: 8px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 6px;
            transition: all 0.15s ease;
            width: 100%;
            text-align: left;
        }

        .participante-btn-tabela:hover {
            background: rgba(255, 85, 0, 0.15);
        }

        .participante-avatar-mini {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255, 85, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
            border: 2px solid rgba(255, 85, 0, 0.4);
        }

        .participante-avatar-mini img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .participante-avatar-mini .material-icons {
            font-size: 18px;
            color: #FF5500;
        }

        .participante-nome-tabela {
            color: #fff;
            font-weight: 600;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .time-nome-tabela {
            color: #aaa;
            font-size: 0.85rem;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
        }

        /* Botões de ação - CORES VIVAS */
        .col-acoes {
            text-align: center !important;
        }

        .btn-tabela {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
            margin: 0 2px;
        }

        .btn-tabela .material-icons {
            font-size: 16px;
        }

        .btn-tabela:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        }

        /* Botão Extrato - Laranja vivo */
        .btn-extrato {
            background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%);
            border: none;
            color: #fff;
        }
        .btn-extrato:hover {
            background: linear-gradient(135deg, #ff6611 0%, #FF5500 100%);
        }

        /* Botão Auditar - Azul vivo */
        .btn-auditar-tabela {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            color: #fff;
        }
        .btn-auditar-tabela:hover {
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
        }

        /* Contador de resultados */
        .fluxo-resultados-busca {
            padding: 8px 16px;
            background: rgba(255, 85, 0, 0.05);
            border-top: 1px solid rgba(255, 85, 0, 0.1);
            font-size: 0.75rem;
            color: #888;
            text-align: center;
        }

        .fluxo-resultados-busca strong {
            color: #FF5500;
        }

        /* Responsivo */
        @media (max-width: 600px) {
            .fluxo-participantes-tabela th.col-time,
            .fluxo-participantes-tabela td.col-time {
                display: none;
            }

            .fluxo-participantes-tabela th.col-num,
            .fluxo-participantes-tabela td.col-num {
                width: 35px;
            }

            .participante-nome-tabela {
                font-size: 0.8rem;
            }

            .btn-tabela {
                width: 28px;
                height: 28px;
            }

            .btn-tabela .material-icons {
                font-size: 14px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Estilos da tabela expandida com saldos e cards de resumo
 * v6.0 - Integração Tesouraria/Prestação de Contas
 */
export function injetarEstilosTabelaExpandida() {
    if (document.getElementById("fluxo-tabela-expandida-styles")) return;

    const style = document.createElement("style");
    style.id = "fluxo-tabela-expandida-styles";
    style.textContent = `
        /* ========================================
           TABELA EXPANDIDA + CARDS RESUMO
           v6.0 - Prestação de Contas Integrada
           ======================================== */

        /* Loading */
        .fluxo-loading-saldos {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            gap: 16px;
        }
        .fluxo-loading-saldos p {
            color: #888;
            font-size: 0.9rem;
        }

        /* Cards de Resumo */
        .fluxo-resumo-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }

        .resumo-card {
            background: #1a1a1a;
            border-radius: 10px;
            padding: 14px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid #2d2d2d;
            position: relative;
            transition: all 0.2s ease;
        }

        .resumo-card.clickable {
            cursor: pointer;
        }
        .resumo-card.clickable:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .resumo-card.clickable:active {
            transform: translateY(0);
        }
        .resumo-card.clickable.active {
            transform: scale(1.02);
            box-shadow: 0 0 0 2px currentColor;
        }
        .resumo-card.card-areceber.active {
            box-shadow: 0 0 0 2px #10b981, 0 4px 16px rgba(16, 185, 129, 0.3);
        }
        .resumo-card.card-apagar.active {
            box-shadow: 0 0 0 2px #ef4444, 0 4px 16px rgba(239, 68, 68, 0.3);
        }
        .resumo-card.card-quitados.active {
            box-shadow: 0 0 0 2px #9ca3af, 0 4px 16px rgba(156, 163, 175, 0.3);
        }

        .resumo-card.card-apagar {
            border-color: rgba(239, 68, 68, 0.3);
        }
        .resumo-card.card-areceber {
            border-color: rgba(16, 185, 129, 0.3);
        }
        .resumo-card.card-quitados {
            border-color: rgba(156, 163, 175, 0.3);
        }

        .resumo-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .card-apagar .resumo-icon {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }
        .card-areceber .resumo-icon {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }
        .card-quitados .resumo-icon {
            background: rgba(156, 163, 175, 0.15);
            color: #9ca3af;
        }

        .resumo-icon .material-icons {
            font-size: 22px;
        }

        .resumo-info {
            display: flex;
            flex-direction: column;
        }

        .resumo-valor {
            font-size: 1.2rem;
            font-weight: 700;
            color: #fff;
        }
        .card-apagar .resumo-valor { color: #ef4444; }
        .card-areceber .resumo-valor { color: #10b981; }

        .resumo-label {
            font-size: 0.7rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .resumo-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255,255,255,0.1);
            color: #fff;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 10px;
        }

        /* Filtro de Situação */
        .toolbar-select {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 8px 12px;
            color: #fff;
            font-size: 0.85rem;
            cursor: pointer;
            outline: none;
        }
        .toolbar-select:focus {
            border-color: #FF5500;
        }

        /* ✅ v7.9: Seletor de Temporada */
        .temporada-selector {
            background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%);
            border: none;
            border-radius: 8px;
            padding: 8px 16px;
            color: #fff;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            outline: none;
            margin-left: 12px;
            box-shadow: 0 2px 8px rgba(255, 85, 0, 0.3);
            transition: all 0.2s ease;
        }
        .temporada-selector:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 85, 0, 0.4);
        }
        .temporada-selector:focus {
            box-shadow: 0 0 0 3px rgba(255, 85, 0, 0.3);
        }
        .temporada-selector option {
            background: #1a1a1a;
            color: #fff;
            padding: 8px;
        }

        /* Tabela Expandida */
        .tabela-expandida {
            table-layout: auto !important;
        }

        .tabela-expandida th.col-participante {
            width: auto;
            min-width: 180px;
        }

        .tabela-expandida th.col-saldo-temp,
        .tabela-expandida th.col-saldo-acertos,
        .tabela-expandida th.col-saldo-final {
            width: 100px;
            text-align: right;
        }

        .tabela-expandida th.col-situacao {
            width: 95px;
            text-align: center;
        }

        .tabela-expandida th.col-acoes-expandida {
            width: 110px;
            text-align: center;
        }

        /* ✅ Cabeçalhos Ordenáveis */
        .tabela-expandida th.sortable {
            cursor: pointer;
            user-select: none;
            transition: background 0.15s ease;
            padding: 10px 8px !important;
        }
        .tabela-expandida th.sortable:hover {
            background: rgba(255, 85, 0, 0.1);
        }
        .tabela-expandida th.sortable.sorted {
            background: rgba(255, 85, 0, 0.15);
        }
        .tabela-expandida th.sortable.sorted .th-text {
            color: #FF5500;
        }

        /* Conteúdo do cabeçalho com flexbox */
        .tabela-expandida .th-content {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .tabela-expandida .th-content.th-right {
            justify-content: flex-end;
            width: 100%;
        }
        .tabela-expandida .th-content.th-center {
            justify-content: center;
            width: 100%;
        }
        .tabela-expandida .th-text {
            white-space: nowrap;
        }

        /* Ícone de ordenação */
        .tabela-expandida th .sort-icon {
            font-size: 14px;
            opacity: 0.35;
            transition: all 0.15s ease;
            flex-shrink: 0;
        }
        .tabela-expandida th.sortable:hover .sort-icon {
            opacity: 0.7;
        }
        .tabela-expandida th.sortable.sorted .sort-icon {
            opacity: 1;
            color: #FF5500;
        }

        .tabela-expandida td.col-saldo-temp,
        .tabela-expandida td.col-saldo-acertos,
        .tabela-expandida td.col-saldo-final {
            text-align: right;
            font-size: 0.85rem;
            font-family: 'JetBrains Mono', monospace;
            white-space: nowrap;
        }

        .tabela-expandida td.col-situacao {
            text-align: center;
        }

        .tabela-expandida td.col-acoes-expandida {
            text-align: center;
        }

        /* Cores de Saldo */
        .saldo-positivo {
            color: #10b981 !important;
        }
        .saldo-negativo {
            color: #ef4444 !important;
        }
        .saldo-zero {
            color: #666;
        }

        /* Badges de Situação */
        .situacao-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.65rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .situacao-badge .material-icons {
            font-size: 12px;
        }

        .situacao-badge.devedor {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }
        .situacao-badge.credor {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }
        .situacao-badge.quitado {
            background: rgba(156, 163, 175, 0.15);
            color: #9ca3af;
        }

        /* ========================================
           BADGES DE STATUS - TABELA 2026
           v4.0 - Layout Pré-Temporada
           ======================================== */
        .badge-status {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-status.status-pago {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .badge-status.status-abatido {
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .badge-status.status-quitado {
            background: rgba(156, 163, 175, 0.2);
            color: #9ca3af;
            border: 1px solid rgba(156, 163, 175, 0.3);
        }

        .badge-status.status-deve {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        /* Botão Ajuste - Laranja */
        .btn-ajuste {
            background: linear-gradient(135deg, #FF5500 0%, #e04d00 100%);
            border: none;
            color: #fff;
        }
        .btn-ajuste:hover {
            background: linear-gradient(135deg, #ff7733 0%, #FF5500 100%);
            transform: scale(1.05);
        }

        /* Info do participante na célula */
        .participante-info-cell {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            overflow: hidden;
        }
        .participante-time-tabela {
            font-size: 0.7rem;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Botão Acerto - Verde */
        .btn-acerto {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            color: #fff;
        }
        .btn-acerto:hover {
            background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        }

        /* Botão Histórico - Cinza */
        .btn-historico {
            background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
            border: none;
            color: #fff;
        }
        .btn-historico:hover {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }

        /* Responsivo */
        @media (max-width: 900px) {
            .tabela-expandida th.col-saldo-temp,
            .tabela-expandida td.col-saldo-temp,
            .tabela-expandida th.col-saldo-acertos,
            .tabela-expandida td.col-saldo-acertos {
                display: none;
            }
        }

        @media (max-width: 600px) {
            .fluxo-resumo-cards {
                grid-template-columns: 1fr 1fr;
            }
            .resumo-card {
                padding: 10px 12px;
            }
            .resumo-valor {
                font-size: 1rem;
            }
            .tabela-expandida th.col-situacao,
            .tabela-expandida td.col-situacao {
                display: none;
            }
        }

        /* ========================================
           TABELA FINANCEIRA v3.1 - Colunas por Módulo + Sticky Header
           ======================================== */

        .tabela-financeira {
            width: 100%;
            border-collapse: separate !important;  /* ✅ CRITICAL: separate é OBRIGATÓRIO para sticky */
            border-spacing: 0 !important;
            font-size: 0.8rem;
            table-layout: auto;
        }

        .tabela-financeira th,
        .tabela-financeira td {
            padding: 8px 10px;
            border-bottom: 1px solid #2d2d2d;
            vertical-align: middle;
        }

        /* ✅ v2.3: Sticky header - thead E th precisam de position: sticky */
        .tabela-financeira thead {
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
        }

        .tabela-financeira th {
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
            background: linear-gradient(135deg, #1f1f1f 0%, #181818 100%) !important;
            color: #FF5500;
            font-weight: 600;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
            border-bottom: 2px solid #FF5500;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        .tabela-financeira th.sortable {
            cursor: pointer;
            transition: background 0.15s;
        }
        .tabela-financeira th.sortable:hover {
            background: rgba(255, 85, 0, 0.15);
        }
        .tabela-financeira th.sortable.sorted {
            background: rgba(255, 85, 0, 0.12);
        }

        /* Ícone de ordenação */
        .th-sort {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .sort-icon {
            font-size: 16px;
            opacity: 0.5;
            transition: all 0.15s;
        }
        .sortable:hover .sort-icon {
            opacity: 0.8;
        }
        .sortable.sorted .sort-icon {
            opacity: 1;
            color: #FF5500;
        }

        .tabela-financeira .col-num {
            width: 40px;
            text-align: center;
            color: #666;
        }

        .tabela-financeira .col-participante {
            min-width: 160px;
            width: 18%;
        }

        .tabela-financeira .col-modulo {
            min-width: 90px;
            width: auto;
            text-align: right;
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-size: 0.75rem;
            padding-right: 12px;
        }

        .tabela-financeira .col-saldo {
            min-width: 110px;
            width: 12%;
            text-align: right;
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-size: 0.85rem;
            font-weight: 700;
            padding-right: 12px;
        }

        .tabela-financeira .col-acoes {
            width: 150px;
            text-align: center;
            white-space: nowrap;
        }

        /* Linha de ações - NUNCA quebra */
        .acoes-row {
            display: flex;
            flex-wrap: nowrap;
            gap: 6px;
            justify-content: center;
        }

        /* Valores coloridos */
        .val-positivo { color: #10b981; font-weight: 600; }
        .val-negativo { color: #ef4444; font-weight: 600; }
        .val-zero { color: #555; }

        /* Linha do Participante */
        .linha-participante {
            transition: background 0.1s;
        }
        .linha-participante:hover {
            background: rgba(255, 85, 0, 0.06);
        }
        .linha-participante:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);
        }
        .linha-participante:nth-child(even):hover {
            background: rgba(255, 85, 0, 0.06);
        }
        .row-devedor {
            background: rgba(239, 68, 68, 0.04) !important;
        }
        .row-devedor:hover {
            background: rgba(239, 68, 68, 0.08) !important;
        }

        /* Célula Participante */
        .participante-cell {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 2px 0;
        }
        .participante-cell:hover .nome {
            color: #FF5500;
        }

        .avatar-mini {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #2d2d2d;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
        }
        .avatar-mini img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .avatar-mini .material-icons {
            font-size: 14px;
            color: #555;
        }

        .info-participante {
            display: flex;
            flex-direction: column;
            min-width: 0;
            line-height: 1.2;
        }
        .info-participante .nome {
            font-weight: 500;
            color: #fff;
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.15s;
        }
        .info-participante .time {
            font-size: 0.65rem;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Botões de Ação */
        .btn-acao {
            width: 28px;
            height: 28px;
            min-width: 28px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            flex-shrink: 0;
        }
        .btn-acao .material-icons {
            font-size: 16px;
        }
        .btn-acao:hover {
            opacity: 0.8;
        }

        .btn-acerto { background: #10b981; }
        .btn-acerto:hover { background: #059669; }
        .btn-extrato { background: #FF5500; }
        .btn-extrato:hover { background: #cc4400; }
        .btn-auditoria { background: #3b82f6; }
        .btn-auditoria:hover { background: #2563eb; }
        .btn-hist { background: #4b5563; }
        .btn-hist:hover { background: #374151; }
        .btn-whatsapp { background: #25D366; }
        .btn-whatsapp:hover { background: #128C7E; }
        .btn-quitar { background: #f97316; }
        .btn-quitar:hover { background: #ea580c; }

        /* Responsivo */
        @media (max-width: 900px) {
            .tabela-financeira .col-modulo {
                width: 45px;
                padding: 6px 4px;
                font-size: 0.7rem;
            }
            .tabela-financeira th {
                font-size: 0.65rem;
                padding: 6px 4px;
            }
        }
        @media (max-width: 700px) {
            .tabela-financeira .col-participante {
                min-width: 100px;
                max-width: 120px;
            }
            .info-participante .time {
                display: none;
            }
            .btn-acao {
                width: 24px;
                height: 24px;
                min-width: 24px;
            }
            .btn-acao .material-icons {
                font-size: 14px;
            }
        }

        /* ========================================
           COLUNA 2026 - RENOVAÇÃO
           ======================================== */

        .col-2026 {
            text-align: center;
            min-width: 90px;
            white-space: nowrap;
        }

        .renovacao-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            transition: all 0.2s ease;
        }
        .renovacao-badge:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
        }

        .badge-2026-pendente {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .badge-2026-renovado {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-2026-nao-participa {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-2026-novo {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .badge-2026-renovado-devendo {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(245, 158, 11, 0.5);
            box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
        }

        /* Toolbar 2026 */
        .toolbar-separator {
            width: 1px;
            height: 24px;
            background: #333;
            margin: 0 8px;
        }

        .toolbar-btn.btn-outline-warning {
            border: 1px solid #f59e0b;
            color: #f59e0b;
            background: transparent;
        }
        .toolbar-btn.btn-outline-warning:hover {
            background: rgba(245, 158, 11, 0.15);
        }

        .toolbar-btn.btn-outline-info {
            border: 1px solid #3b82f6;
            color: #3b82f6;
            background: transparent;
        }
        .toolbar-btn.btn-outline-info:hover {
            background: rgba(59, 130, 246, 0.15);
        }

        @media (max-width: 900px) {
            .col-2026 {
                min-width: 70px;
            }
            .renovacao-badge {
                font-size: 0.6rem;
                padding: 3px 6px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Estilos do modal de acerto financeiro
 */
export function injetarEstilosModal() {
    if (document.getElementById("fluxo-modal-acerto-styles")) return;

    const style = document.createElement("style");
    style.id = "fluxo-modal-acerto-styles";
    style.textContent = `
        .modal-overlay-fluxo {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .modal-overlay-fluxo.active {
            display: flex;
        }

        .modal-content-fluxo {
            background: #1a1a1a;
            border-radius: 12px;
            border: 1px solid #333;
            width: 90%;
            max-width: 420px;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header-fluxo {
            padding: 16px 20px;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .modal-header-fluxo h3 {
            font-size: 1.1rem;
            font-weight: 700;
            color: #fff;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .modal-close-fluxo {
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 4px;
        }
        .modal-close-fluxo:hover {
            color: #fff;
        }

        .modal-body-fluxo {
            padding: 20px;
        }

        .modal-participante-info-fluxo {
            background: #252525;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
        }
        .modal-participante-info-fluxo h4 {
            font-size: 0.95rem;
            font-weight: 600;
            color: #fff;
            margin: 0 0 4px 0;
        }
        .modal-participante-info-fluxo span {
            font-size: 0.8rem;
            color: #888;
        }

        .form-group-fluxo {
            margin-bottom: 16px;
        }
        .form-group-fluxo label {
            display: block;
            font-size: 0.8rem;
            font-weight: 500;
            color: #888;
            margin-bottom: 6px;
        }
        .form-group-fluxo input,
        .form-group-fluxo select {
            width: 100%;
            background: #252525;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 0.9rem;
            color: #fff;
            outline: none;
            box-sizing: border-box;
        }
        .form-group-fluxo input:focus,
        .form-group-fluxo select:focus {
            border-color: #FF5500;
        }

        .tipo-acerto-btns {
            display: flex;
            gap: 10px;
        }
        .tipo-btn {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            border: 2px solid #333;
            background: transparent;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #888;
            font-size: 0.8rem;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .tipo-btn .material-icons {
            font-size: 22px;
        }
        .tipo-btn:hover {
            border-color: #555;
        }
        .tipo-btn.pagamento.active {
            border-color: #10b981;
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
        }
        .tipo-btn.recebimento.active {
            border-color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }

        .btn-zerar-saldo-fluxo {
            width: 100%;
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px dashed #3b82f6;
            border-radius: 6px;
            padding: 10px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .btn-zerar-saldo-fluxo:hover {
            background: rgba(59, 130, 246, 0.2);
        }
        .btn-zerar-saldo-fluxo .material-icons {
            font-size: 18px;
        }

        .modal-footer-fluxo {
            padding: 16px 20px;
            border-top: 1px solid #333;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .btn-cancelar-fluxo {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            background: #333;
            border: none;
            color: #888;
        }
        .btn-confirmar-fluxo {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            background: #10b981;
            border: none;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .btn-confirmar-fluxo:hover {
            background: #059669;
        }
        .btn-confirmar-fluxo .material-icons {
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Estilos do modal de auditoria financeira
 */
export function injetarEstilosModalAuditoriaFinanceira() {
    if (document.getElementById('auditoria-modal-financeira-styles')) return;

    const style = document.createElement('style');
    style.id = 'auditoria-modal-financeira-styles';
    style.textContent = `
        /* ========================================
           MODAL DE AUDITORIA FINANCEIRA
           ======================================== */
        .modal-auditoria-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        .modal-auditoria-overlay.active {
            display: flex;
        }

        .modal-auditoria-container {
            background: linear-gradient(180deg, #1a1a1a 0%, #121212 100%);
            border-radius: 16px;
            border: 1px solid rgba(255, 85, 0, 0.3);
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 85, 0, 0.1);
        }

        .modal-auditoria-header {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 85, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(90deg, rgba(255, 85, 0, 0.1) 0%, transparent 100%);
        }
        .modal-auditoria-header .header-info {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .modal-auditoria-header .header-icon {
            font-size: 32px;
            color: #FF5500;
        }
        .modal-auditoria-header h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 700;
            color: #fff;
        }
        .modal-auditoria-header .header-sub {
            font-size: 0.8rem;
            color: #888;
        }
        .modal-auditoria-close {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: #888;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .modal-auditoria-close:hover {
            background: rgba(255, 85, 0, 0.2);
            color: #FF5500;
        }

        .modal-auditoria-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }

        /* Loading state */
        .auditoria-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #888;
        }
        .loading-spinner-audit {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top-color: #FF5500;
            border-radius: 50%;
            animation: spinAudit 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spinAudit {
            to { transform: rotate(360deg); }
        }

        /* Seções da auditoria */
        .audit-section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
        }
        .audit-section-header {
            background: rgba(255, 85, 0, 0.08);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .audit-section-header .material-icons {
            color: #FF5500;
            font-size: 20px;
        }
        .audit-section-header h4 {
            margin: 0;
            font-size: 0.9rem;
            font-weight: 600;
            color: #fff;
        }
        .audit-section-body {
            padding: 16px;
        }

        /* Tabela de resumo */
        .audit-table {
            width: 100%;
            border-collapse: collapse;
        }
        .audit-table tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .audit-table tr:last-child {
            border-bottom: none;
        }
        .audit-table td {
            padding: 10px 0;
            font-size: 0.9rem;
        }
        .audit-table td:first-child {
            color: #999;
        }
        .audit-table td:last-child {
            text-align: right;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }
        .audit-table tr.total-row td {
            padding-top: 14px;
            font-size: 1rem;
            color: #fff;
        }
        .audit-table tr.total-row td:last-child {
            font-size: 1.1rem;
        }
        .audit-table .separator-row td {
            padding: 4px 0;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
        }

        /* Status badge */
        .audit-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.95rem;
        }
        .audit-status.status-quitado {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .audit-status.status-devedor {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .audit-status.status-credor {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        /* Valores */
        .val-positivo { color: #10b981; }
        .val-negativo { color: #ef4444; }
        .val-neutro { color: #888; }

        /* Lista de histórico */
        .audit-history-list {
            max-height: 200px;
            overflow-y: auto;
        }
        .audit-history-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
            margin-bottom: 6px;
        }
        .audit-history-item:last-child {
            margin-bottom: 0;
        }
        .history-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .history-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .history-icon.pagamento {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }
        .history-icon.recebimento {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }
        .history-info {
            display: flex;
            flex-direction: column;
        }
        .history-desc {
            font-size: 0.85rem;
            color: #fff;
        }
        .history-date {
            font-size: 0.75rem;
            color: #666;
        }
        .history-valor {
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Campos manuais */
        .audit-campos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 10px;
        }
        .audit-campo-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .campo-nome {
            font-size: 0.75rem;
            color: #888;
        }
        .campo-valor {
            font-size: 1rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Empty state */
        .audit-empty {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.85rem;
        }

        /* Footer */
        .modal-auditoria-footer {
            padding: 16px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        .btn-audit-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #888;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn-audit-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        .btn-audit-pdf {
            background: linear-gradient(135deg, #FF5500 0%, #cc4400 100%);
            border: none;
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(255, 85, 0, 0.3);
        }
        .btn-audit-pdf:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 85, 0, 0.4);
        }
        .btn-audit-pdf .material-icons,
        .btn-audit-secondary .material-icons {
            font-size: 18px;
        }

        /* Responsivo */
        @media (max-width: 600px) {
            .modal-auditoria-container {
                max-height: 95vh;
                border-radius: 12px 12px 0 0;
                position: fixed;
                bottom: 0;
                max-width: 100%;
            }
            .audit-campos-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}
