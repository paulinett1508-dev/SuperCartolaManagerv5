/**
 * TooltipRegrasFinanceiras
 * 
 * Componente reutilizável para exibir tooltips com regras financeiras de módulos.
 * Busca as regras via API e renderiza em formato dark theme.
 * 
 * @version 1.0.0
 * @since 2026-02-06
 * 
 * Uso:
 * ```javascript
 * const tooltip = new TooltipRegrasFinanceiras();
 * await tooltip.anexarAoElemento(elemento, ligaId, 'top10');
 * ```
 */

class TooltipRegrasFinanceiras {
    constructor() {
        this.cache = new Map(); // Cache de regras já carregadas
        this.tooltipElement = null;
        this.hideTimeout = null;
    }

    /**
     * Carrega regras financeiras de um módulo via API
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do módulo (camelCase: top10, pontosCorridos, etc)
     * @param {number} temporada - Temporada (opcional)
     * @returns {Promise<Object>} Regras do módulo
     */
    async carregar(ligaId, modulo, temporada = null) {
        const cacheKey = `${ligaId}_${modulo}_${temporada || 'current'}`;
        
        // Retornar do cache se já carregado
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = temporada 
                ? `/api/ligas/${ligaId}/modulos/${modulo}/regras?temporada=${temporada}`
                : `/api/ligas/${ligaId}/modulos/${modulo}/regras`;

            const response = await fetch(url);
            const data = await response.json();

            if (!data.success) {
                console.warn(`[TOOLTIP] Erro ao carregar regras de ${modulo}:`, data.erro);
                return null;
            }

            // Salvar no cache
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`[TOOLTIP] Erro ao buscar regras de ${modulo}:`, error);
            return null;
        }
    }

    /**
     * Renderiza conteúdo HTML do tooltip baseado nas regras
     * @param {Object} regrasData - Dados retornados pela API
     * @returns {string} HTML formatado
     */
    renderizar(regrasData) {
        if (!regrasData || !regrasData.valores) {
            return `
                <div class="tooltip-regras-financeiras">
                    <div class="tooltip-header">
                        <span class="material-icons">info</span>
                        <span>Regras não configuradas</span>
                    </div>
                    <div class="tooltip-body">
                        <p class="tooltip-info">Este módulo não possui regras financeiras definidas.</p>
                    </div>
                </div>
            `;
        }

        const { modulo, valores, fonte, ativo } = regrasData;
        
        // Renderizar baseado no tipo de valores
        let conteudo = '';

        // Tipo 1: Valores por posição (top10, artilheiro, luvaOuro)
        if (valores.mitos || valores.micos || valores['1'] || valores['2'] || valores['3']) {
            conteudo = this._renderizarValoresPorPosicao(valores);
        }
        // Tipo 2: Valores por fase (mata-mata)
        else if (valores.primeira || valores.segunda || valores.terceira) {
            conteudo = this._renderizarValoresPorFase(valores);
        }
        // Tipo 3: Valores simples (pontos corridos)
        else if (valores.vitoria !== undefined || valores.derrota !== undefined) {
            conteudo = this._renderizarValoresSimples(valores);
        }
        // Fallback: renderizar JSON genérico
        else {
            conteudo = this._renderizarGenerico(valores);
        }

        const moduloLabel = this._getNomeModulo(modulo);
        const fonteLabel = fonte === 'override_fase' || fonte === 'override_posicao' || fonte === 'override_simples' 
            ? 'Customizado' 
            : 'Padrão';

        return `
            <div class="tooltip-regras-financeiras">
                <div class="tooltip-header">
                    <span class="material-icons">${this._getIconeModulo(modulo)}</span>
                    <span>${moduloLabel}</span>
                    <span class="tooltip-badge ${fonte.includes('override') ? 'badge-custom' : 'badge-default'}">
                        ${fonteLabel}
                    </span>
                </div>
                <div class="tooltip-body">
                    ${conteudo}
                </div>
                ${!ativo ? '<div class="tooltip-footer inactive">Módulo inativo</div>' : ''}
            </div>
        `;
    }

    /**
     * Renderiza valores por posição (top10, melhores/piores)
     * @private
     */
    _renderizarValoresPorPosicao(valores) {
        let html = '';

        // Top 10 com mitos e micos
        if (valores.mitos && valores.micos) {
            html += '<div class="valores-coluna">';
            html += '<div class="valores-grupo positivo">';
            html += '<h4>🏆 Mitos</h4>';
            html += '<ul>';
            for (const [pos, config] of Object.entries(valores.mitos)) {
                const valor = config.valor || config;
                html += `<li><span class="pos">${pos}º</span><span class="valor positivo">${this._formatarValor(valor)}</span></li>`;
            }
            html += '</ul>';
            html += '</div>';

            html += '<div class="valores-grupo negativo">';
            html += '<h4>💀 Micos</h4>';
            html += '<ul>';
            for (const [pos, config] of Object.entries(valores.micos)) {
                const valor = config.valor || config;
                html += `<li><span class="pos">${pos}º</span><span class="valor negativo">${this._formatarValor(valor)}</span></li>`;
            }
            html += '</ul>';
            html += '</div>';
            html += '</div>';
        }
        // Ranking simples (1º, 2º, 3º...)
        else {
            html += '<div class="valores-lista">';
            html += '<ul>';
            for (const [pos, config] of Object.entries(valores)) {
                const valor = config.valor || config;
                const classe = valor > 0 ? 'positivo' : valor < 0 ? 'negativo' : 'neutro';
                html += `<li><span class="pos">${pos}º</span><span class="valor ${classe}">${this._formatarValor(valor)}</span></li>`;
            }
            html += '</ul>';
            html += '</div>';
        }

        return html;
    }

    /**
     * Renderiza valores por fase (mata-mata)
     * @private
     */
    _renderizarValoresPorFase(valores) {
        let html = '<div class="valores-fase">';
        html += '<ul>';
        
        const fases = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta'];
        const nomeFases = ['Primeira Fase', 'Segunda Fase', 'Terceira Fase', 'Quarta Fase', 'Quinta Fase', 'Sexta Fase'];
        
        fases.forEach((fase, idx) => {
            if (valores[fase]) {
                const config = valores[fase];
                html += `<li class="fase-item">`;
                html += `<strong>${nomeFases[idx]}</strong>`;
                html += `<div class="fase-valores">`;
                if (config.vitoria !== undefined) {
                    html += `<span class="valor positivo">Vitória: ${this._formatarValor(config.vitoria)}</span>`;
                }
                if (config.derrota !== undefined) {
                    html += `<span class="valor negativo">Derrota: ${this._formatarValor(config.derrota)}</span>`;
                }
                if (config.empate !== undefined) {
                    html += `<span class="valor neutro">Empate: ${this._formatarValor(config.empate)}</span>`;
                }
                html += `</div>`;
                html += `</li>`;
            }
        });
        
        html += '</ul>';
        html += '</div>';
        return html;
    }

    /**
     * Renderiza valores simples (pontos corridos)
     * @private
     */
    _renderizarValoresSimples(valores) {
        let html = '<div class="valores-simples">';
        html += '<ul>';
        
        if (valores.vitoria !== undefined) {
            html += `<li><span class="label">Vitória</span><span class="valor positivo">${this._formatarValor(valores.vitoria)}</span></li>`;
        }
        if (valores.empate !== undefined) {
            html += `<li><span class="label">Empate</span><span class="valor neutro">${this._formatarValor(valores.empate)}</span></li>`;
        }
        if (valores.derrota !== undefined) {
            html += `<li><span class="label">Derrota</span><span class="valor negativo">${this._formatarValor(valores.derrota)}</span></li>`;
        }
        
        html += '</ul>';
        html += '</div>';
        return html;
    }

    /**
     * Renderiza valores genéricos (fallback)
     * @private
     */
    _renderizarGenerico(valores) {
        return `
            <div class="valores-generico">
                <pre>${JSON.stringify(valores, null, 2)}</pre>
            </div>
        `;
    }

    /**
     * Formata valor monetário
     * @private
     */
    _formatarValor(valor) {
        if (typeof valor === 'object' && valor.valor !== undefined) {
            valor = valor.valor;
        }
        
        const num = Number(valor);
        const sinal = num >= 0 ? '+' : '';
        return `${sinal}R$ ${Math.abs(num).toFixed(2).replace('.', ',')}`;
    }

    /**
     * Retorna nome legível do módulo
     * @private
     */
    _getNomeModulo(modulo) {
        const nomes = {
            top10: 'Top 10 Mitos/Micos',
            pontosCorridos: 'Pontos Corridos',
            mataMata: 'Mata-Mata',
            melhorMes: 'Melhor do Mês',
            artilheiro: 'Artilheiro',
            luvaOuro: 'Luva de Ouro',
            banco: 'Banco da Rodada',
            capitaoLuxo: 'Capitão de Luxo',
        };
        return nomes[modulo] || modulo;
    }

    /**
     * Retorna ícone do módulo
     * @private
     */
    _getIconeModulo(modulo) {
        const icones = {
            top10: 'stars',
            pontosCorridos: 'emoji_events',
            mataMata: 'sports_mma',
            melhorMes: 'calendar_month',
            artilheiro: 'sports_soccer',
            luvaOuro: 'sports_handball',
            banco: 'casino',
            capitaoLuxo: 'military_tech',
        };
        return icones[modulo] || 'info';
    }

    /**
     * Cria elemento DOM do tooltip
     * @private
     */
    _criarElementoTooltip() {
        if (this.tooltipElement) {
            return this.tooltipElement;
        }

        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip-regras-financeiras-container';
        tooltip.style.cssText = `
            position: absolute;
            z-index: 99999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        document.body.appendChild(tooltip);
        
        this.tooltipElement = tooltip;
        return tooltip;
    }

    /**
     * Posiciona tooltip próximo ao elemento
     * @private
     */
    _posicionarTooltip(elemento) {
        if (!this.tooltipElement) return;

        const rect = elemento.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        // Posicionar abaixo do elemento por padrão
        let top = rect.bottom + window.scrollY + 8;
        let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Ajustar se sair da tela
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        // Se não couber abaixo, posicionar acima
        if (top + tooltipRect.height > window.innerHeight + window.scrollY - 10) {
            top = rect.top + window.scrollY - tooltipRect.height - 8;
        }

        this.tooltipElement.style.top = `${top}px`;
        this.tooltipElement.style.left = `${left}px`;
    }

    /**
     * Mostra tooltip
     * @private
     */
    _mostrar() {
        if (this.tooltipElement) {
            clearTimeout(this.hideTimeout);
            this.tooltipElement.style.opacity = '1';
        }
    }

    /**
     * Esconde tooltip
     * @private
     */
    _esconder() {
        if (this.tooltipElement) {
            this.hideTimeout = setTimeout(() => {
                this.tooltipElement.style.opacity = '0';
            }, 100);
        }
    }

    /**
     * Anexa tooltip a um elemento DOM
     * @param {HTMLElement} elemento - Elemento que receberá o tooltip
     * @param {string} ligaId - ID da liga
     * @param {string} modulo - Nome do módulo
     * @param {number} temporada - Temporada (opcional)
     */
    async anexarAoElemento(elemento, ligaId, modulo, temporada = null) {
        if (!elemento) {
            console.warn('[TOOLTIP] Elemento não encontrado');
            return;
        }

        // Carregar regras
        const regras = await this.carregar(ligaId, modulo, temporada);
        if (!regras) {
            console.warn(`[TOOLTIP] Regras não disponíveis para ${modulo}`);
            return;
        }

        // Criar elemento do tooltip
        const tooltip = this._criarElementoTooltip();

        // Adicionar atributo para identificação
        elemento.setAttribute('data-tooltip-modulo', modulo);
        elemento.style.cursor = 'help';

        // Event listeners
        elemento.addEventListener('mouseenter', () => {
            tooltip.innerHTML = this.renderizar(regras);
            this._injetarEstilos();
            this._posicionarTooltip(elemento);
            this._mostrar();
        });

        elemento.addEventListener('mouseleave', () => {
            this._esconder();
        });

        // Reposicionar ao scrollar
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (tooltip.style.opacity === '1') {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this._posicionarTooltip(elemento);
                }, 50);
            }
        }, { passive: true });
    }

    /**
     * Injeta estilos CSS do tooltip
     * @private
     */
    _injetarEstilos() {
        if (document.getElementById('tooltip-regras-financeiras-styles')) {
            return; // Já injetado
        }

        const style = document.createElement('style');
        style.id = 'tooltip-regras-financeiras-styles';
        style.textContent = `
            .tooltip-regras-financeiras {
                background: #1a1a1a;
                border: 2px solid #FF5500;
                border-radius: 8px;
                padding: 0;
                min-width: 280px;
                max-width: 420px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #ffffff;
            }

            .tooltip-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: #2d2d2d;
                border-bottom: 1px solid #3d3d3d;
                border-radius: 6px 6px 0 0;
            }

            .tooltip-header .material-icons {
                font-size: 20px;
                color: #FF5500;
            }

            .tooltip-header span:not(.material-icons):not(.tooltip-badge) {
                font-weight: 600;
                font-size: 14px;
                flex: 1;
            }

            .tooltip-badge {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 500;
            }

            .tooltip-badge.badge-custom {
                background: #FF5500;
                color: #ffffff;
            }

            .tooltip-badge.badge-default {
                background: #3d3d3d;
                color: #9ca3af;
            }

            .tooltip-body {
                padding: 16px;
            }

            .tooltip-info {
                color: #9ca3af;
                font-size: 13px;
                margin: 0;
            }

            /* Valores por posição (2 colunas) */
            .valores-coluna {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            .valores-grupo h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                opacity: 0.8;
            }

            .valores-grupo.positivo h4 {
                color: #10b981;
            }

            .valores-grupo.negativo h4 {
                color: #ef4444;
            }

            .valores-grupo ul,
            .valores-lista ul,
            .valores-simples ul,
            .valores-fase ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .valores-grupo li,
            .valores-lista li,
            .valores-simples li {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                font-size: 13px;
            }

            .valores-grupo li:not(:last-child),
            .valores-lista li:not(:last-child),
            .valores-simples li:not(:last-child) {
                border-bottom: 1px solid #2d2d2d;
            }

            .pos {
                color: #9ca3af;
                font-weight: 500;
                min-width: 30px;
            }

            .label {
                color: #9ca3af;
                font-weight: 500;
            }

            .valor {
                font-weight: 600;
                font-size: 13px;
                font-family: 'Courier New', monospace;
            }

            .valor.positivo {
                color: #10b981;
            }

            .valor.negativo {
                color: #ef4444;
            }

            .valor.neutro {
                color: #f59e0b;
            }

            /* Valores por fase */
            .fase-item {
                padding: 8px 0;
            }

            .fase-item:not(:last-child) {
                border-bottom: 1px solid #2d2d2d;
            }

            .fase-item strong {
                display: block;
                font-size: 12px;
                color: #9ca3af;
                margin-bottom: 4px;
            }

            .fase-valores {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .fase-valores .valor {
                font-size: 12px;
            }

            /* Genérico */
            .valores-generico pre {
                margin: 0;
                padding: 8px;
                background: #0d0d0d;
                border: 1px solid #2d2d2d;
                border-radius: 4px;
                font-size: 11px;
                color: #9ca3af;
                overflow-x: auto;
            }

            /* Footer */
            .tooltip-footer {
                padding: 8px 16px;
                background: #2d2d2d;
                border-top: 1px solid #3d3d3d;
                border-radius: 0 0 6px 6px;
                text-align: center;
                font-size: 12px;
                color: #9ca3af;
            }

            .tooltip-footer.inactive {
                color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Limpa cache de regras
     */
    limparCache() {
        this.cache.clear();
    }

    /**
     * Destrói o componente
     */
    destruir() {
        if (this.tooltipElement) {
            this.tooltipElement.remove();
            this.tooltipElement = null;
        }
        this.cache.clear();
        clearTimeout(this.hideTimeout);
    }
}

// Export para uso global
window.TooltipRegrasFinanceiras = TooltipRegrasFinanceiras;
