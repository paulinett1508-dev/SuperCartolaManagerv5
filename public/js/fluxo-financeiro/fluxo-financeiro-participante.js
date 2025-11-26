// FLUXO-FINANCEIRO-PARTICIPANTE.JS
// ⚠️ IMPORTANTE: Este módulo é 100% READ-ONLY
// - NÃO cria dados próprios
// - NÃO modifica configurações
// - Apenas VISUALIZA dados criados pelo ADMIN
// - Toda alimentação vem do modo ADMIN via API

import { FluxoFinanceiroCore } from './fluxo-financeiro-core.js';
import { FluxoFinanceiroUI } from './fluxo-financeiro-ui.js';
import { FluxoFinanceiroCache } from './fluxo-financeiro-cache.js';

console.log('[FLUXO-PARTICIPANTE] 📦 Módulo carregado (READ-ONLY, sem vida própria)');

class FluxoFinanceiroParticipante {
    constructor() {
        this.cache = null;
        this.core = null;
        this.ui = null;
        this.participanteData = null;
        this.isInitialized = false;
    }

    async inicializar(participanteData) {
        if (this.isInitialized) {
            console.log('[FLUXO-PARTICIPANTE] Já inicializado, reutilizando instância');
            return;
        }

        console.log('[FLUXO-PARTICIPANTE] Inicializando para participante:', participanteData);

        this.participanteData = participanteData;

        // Validar dados obrigatórios
        if (!participanteData.ligaId || !participanteData.timeId) {
            throw new Error('Dados do participante incompletos (ligaId ou timeId faltando)');
        }

        // Inicializar componentes
        this.cache = new FluxoFinanceiroCache();
        await this.cache.inicializar(participanteData.ligaId);

        this.core = new FluxoFinanceiroCore(this.cache);
        this.ui = new FluxoFinanceiroUI();

        this.isInitialized = true;
        console.log('[FLUXO-PARTICIPANTE] ✅ Inicialização completa');
    }

    async carregarExtrato() {
        if (!this.isInitialized) {
            throw new Error('Módulo não inicializado. Chame inicializar() primeiro.');
        }

        const container = document.getElementById('fluxoFinanceiroContent');
        if (!container) {
            throw new Error('Container #fluxoFinanceiroContent não encontrado');
        }

        console.log('[FLUXO-PARTICIPANTE] Carregando extrato para time:', this.participanteData.timeId);

        // Mostrar loading
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                            border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 20px; color: var(--text-primary);">Carregando seu extrato financeiro...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;

        try {
            // Buscar rodada atual
            const mercadoStatus = await fetch('/api/cartola/mercado-status');
            const mercadoData = await mercadoStatus.json();
            const rodadaAtual = mercadoData.rodada_atual || 1;
            const ultimaRodadaCompleta = Math.max(1, rodadaAtual - 1);

            // Buscar dados do participante
            const participantes = await this.cache.carregarParticipantes();
            const participante = participantes.find(p => 
                String(p.time_id || p.id) === String(this.participanteData.timeId)
            );

            if (!participante) {
                throw new Error('Participante não encontrado na liga');
            }

            // Calcular extrato
            const extrato = await this.core.calcularExtratoFinanceiro(
                this.participanteData.timeId,
                ultimaRodadaCompleta
            );

            // Renderizar
            await this.ui.renderizarExtratoFinanceiro(extrato, participante);

            console.log('[FLUXO-PARTICIPANTE] ✅ Extrato renderizado com sucesso');

        } catch (error) {
            console.error('[FLUXO-PARTICIPANTE] ❌ Erro ao carregar extrato:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(239, 68, 68, 0.1); 
                            border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="color: #ef4444; margin-bottom: 12px;">Erro ao Carregar Extrato</h3>
                    <p style="color: #e0e0e0;">${error.message}</p>
                    <button onclick="window.location.reload()" 
                            style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #ff4500 0%, #e8472b 100%); 
                                   color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        🔄 Recarregar Página
                    </button>
                </div>
            `;
        }
    }

    async atualizarExtrato() {
        if (!this.isInitialized) {
            console.warn('[FLUXO-PARTICIPANTE] Tentativa de atualizar sem inicializar');
            return;
        }

        console.log('[FLUXO-PARTICIPANTE] 🔄 Forçando atualização do extrato');
        await this.carregarExtrato();
    }

    // ===== MÉTODO PARA RETORNAR DADOS SEM RENDERIZAÇÃO =====
    async buscarExtratoCalculado(ligaId, timeId, rodadaAtual, forcarRecalculo = false) {
        try {
            console.log(`[FLUXO-PARTICIPANTE] 💰 Buscando extrato para time ${timeId} (rodada ${rodadaAtual})`);
            console.log(`[FLUXO-PARTICIPANTE] 📊 Usando rodada para cálculo: ${rodadaAtual}`);

            // ✅ CACHE INTELIGENTE: Verificar status do mercado e validar cache
            if (!forcarRecalculo) {
                try {
                    // Buscar status do mercado
                    const mercadoRes = await fetch('/api/cartola/mercado/status');
                    const mercadoData = await mercadoRes.json();
                    const mercadoAberto = mercadoData.mercado_aberto || mercadoData.status_mercado === 1;

                    // Validar cache com contexto do mercado
                    const cacheValidoRes = await fetch(
                        `/api/extrato-cache/${ligaId}/times/${timeId}/cache/valido?rodadaAtual=${rodadaAtual}&mercadoAberto=${mercadoAberto}`
                    );

                    if (cacheValidoRes.ok) {
                        const validacao = await cacheValidoRes.json();

                        // ✅ CACHE VÁLIDO PERMANENTE (mercado fechado)
                        if (validacao.valido && validacao.permanente) {
                            console.log('[FLUXO-PARTICIPANTE] 💎 Cache PERMANENTE encontrado - rodadas fechadas');
                            const cacheRes = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`);
                            const cacheData = await cacheRes.json();
                            return cacheData.data;
                        }

                        // ✅ CACHE VÁLIDO RECENTE (mercado aberto, mas ainda fresco)
                        if (validacao.valido && !validacao.permanente) {
                            console.log(`[FLUXO-PARTICIPANTE] ⚡ Cache válido - TTL restante: ${validacao.ttlRestante}s`);
                            const cacheRes = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`);
                            const cacheData = await cacheRes.json();
                            return cacheData.data;
                        }

                        // ⚠️ CACHE PARCIAL - Recalcular apenas rodada atual
                        if (!validacao.valido && validacao.recalcularApenas === 'rodada_atual') {
                            console.log('[FLUXO-PARTICIPANTE] 🔄 Recalculando APENAS rodada atual...');
                            // Continua para cálculo, mas reutilizará cache das rodadas anteriores
                        }
                    }
                } catch (cacheError) {
                    console.log('[FLUXO-PARTICIPANTE] ⚠️ Erro ao validar cache, recalculando...', cacheError.message);
                }
            } else {
                console.log('[FLUXO-PARTICIPANTE] 🔄 Recálculo forçado pelo admin - pulando cache');
            }


            // Se não encontrou cache válido ou forçou recálculo, calcular
            console.log('[FLUXO-PARTICIPANTE] 🧮 Calculando extrato...');
            const extratoCompleto = await this.core.calcularExtratoFinanceiro(timeId, rodadaAtual, forcarRecalculo);

            // Salvar no cache via API
            try {
                console.log('[FLUXO-PARTICIPANTE] 💾 Salvando extrato no cache...');
                await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        extrato: extratoCompleto,
                        ultimaRodadaCalculada: rodadaAtual,
                        motivoRecalculo: 'participante_visualizacao'
                    })
                });
                console.log('[FLUXO-PARTICIPANTE] ✅ Extrato salvo no cache');
            } catch (saveError) {
                console.warn('[FLUXO-PARTICIPANTE] ⚠️ Erro ao salvar cache:', saveError.message);
            }

            return extratoCompleto;

        } catch (error) {
            console.error('[FLUXO-PARTICIPANTE] Erro ao buscar extrato:', error);
            throw error;
        }
    }
}

// Exportar instância única
export const fluxoFinanceiroParticipante = new FluxoFinanceiroParticipante();

// Expor globalmente para compatibilidade
window.fluxoFinanceiroParticipante = fluxoFinanceiroParticipante;