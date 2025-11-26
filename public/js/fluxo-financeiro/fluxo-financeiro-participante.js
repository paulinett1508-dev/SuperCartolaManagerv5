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
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`[TESTE-CACHE] 🎯 INICIANDO BUSCA DE EXTRATO`);
            console.log(`[TESTE-CACHE] 📊 Time: ${timeId} | Rodada: ${rodadaAtual}`);
            console.log(`[TESTE-CACHE] 🔄 Forçar Recálculo: ${forcarRecalculo ? 'SIM' : 'NÃO'}`);
            console.log('═══════════════════════════════════════════════════════════════');

            // ✅ CACHE INTELIGENTE: Verificar status do mercado e validar cache
            if (!forcarRecalculo) {
                try {
                    console.log('[TESTE-CACHE] 🔍 Verificando status do mercado...');
                    const mercadoRes = await fetch('/api/cartola/mercado/status');
                    const mercadoData = await mercadoRes.json();
                    const mercadoAberto = mercadoData.mercado_aberto || mercadoData.status_mercado === 1;

                    console.log(`[TESTE-CACHE] 📡 Mercado: ${mercadoAberto ? '🟢 ABERTO' : '🔴 FECHADO'}`);
                    console.log(`[TESTE-CACHE] 🎲 Rodada Atual Cartola: ${mercadoData.rodada_atual}`);

                    // Validar cache com contexto do mercado
                    console.log('[TESTE-CACHE] 🔍 Consultando validação de cache...');
                    const cacheValidoRes = await fetch(
                        `/api/extrato-cache/${ligaId}/times/${timeId}/cache/valido?rodadaAtual=${rodadaAtual}&mercadoAberto=${mercadoAberto}`
                    );

                    if (cacheValidoRes.ok) {
                        const validacao = await cacheValidoRes.json();
                        console.log('[TESTE-CACHE] 📋 Resposta da validação:', JSON.stringify(validacao, null, 2));

                        // ✅ VALIDAR SE O CAMPO "valido" EXISTE
                        const cacheEhValido = validacao.valido === true;
                        console.log(`[TESTE-CACHE] 🔍 Cache válido? ${cacheEhValido} (tipo: ${typeof validacao.valido})`);

                        // ✅ LÓGICA DE DECISÃO BASEADA NO CACHE
                        if (cacheEhValido) {
                            // ✅ CACHE VÁLIDO PERMANENTE (mercado fechado)
                            if (validacao.permanente) {
                                console.log('┌─────────────────────────────────────────────────────────────┐');
                                console.log('│ 💎 CACHE PERMANENTE ENCONTRADO!                             │');
                                console.log('│ ✅ Rodadas fechadas - NUNCA recalcular                      │');
                                console.log(`│ 📅 Última rodada: ${validacao.ultimaRodada}                              │`);
                                console.log('└─────────────────────────────────────────────────────────────┘');

                                const inicio = performance.now();
                                const cacheRes = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`);
                                const cacheData = await cacheRes.json();
                                const fim = performance.now();

                                console.log(`[TESTE-CACHE] ⚡ Tempo de resposta: ${(fim - inicio).toFixed(2)}ms`);
                                console.log(`[TESTE-CACHE] 📊 Rodadas no cache: ${cacheData.data?.rodadas?.length || 0}`);
                                console.log('═══════════════════════════════════════════════════════════════');
                                return cacheData.data;
                            }

                            // ✅ CACHE VÁLIDO RECENTE (mercado aberto, mas ainda fresco)
                            if (!validacao.permanente) {
                                console.log('┌─────────────────────────────────────────────────────────────┐');
                                console.log('│ ⚡ CACHE RECENTE VÁLIDO!                                     │');
                                console.log(`│ ⏱️  TTL restante: ${validacao.ttlRestante}s                              │`);
                                console.log('└─────────────────────────────────────────────────────────────┘');

                                const inicio = performance.now();
                                const cacheRes = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`);
                                const cacheData = await cacheRes.json();
                                const fim = performance.now();

                                console.log(`[TESTE-CACHE] ⚡ Tempo de resposta: ${(fim - inicio).toFixed(2)}ms`);
                                console.log('═══════════════════════════════════════════════════════════════');
                                return cacheData.data;
                            }
                        }

                        // ⚠️ CACHE PARCIAL/EXPIRADO - REUTILIZAR DADOS ANTIGOS
                        if (validacao.usarCacheAntigo || validacao.recalcularApenas === 'rodada_atual') {
                            console.log('┌─────────────────────────────────────────────────────────────┐');
                            console.log('│ 💎 CACHE ENCONTRADO - Reutilizando dados consolidados       │');
                            console.log(`│ 💾 Rodadas consolidadas: ${validacao.rodadasConsolidadas}                    │`);
                            console.log('│ ⚡ ZERO recálculos - apenas buscando do banco              │');
                            console.log('└─────────────────────────────────────────────────────────────┘');

                            const inicio = performance.now();
                            const cacheRes = await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`);
                            const cacheData = await cacheRes.json();
                            const fim = performance.now();

                            console.log(`[TESTE-CACHE] ⚡ Tempo de resposta: ${(fim - inicio).toFixed(2)}ms`);
                            console.log(`[TESTE-CACHE] 📊 Rodadas no cache: ${cacheData.data?.rodadas?.length || 0}`);
                            console.log('═══════════════════════════════════════════════════════════════');
                            return cacheData.data;
                        }

                        if (!cacheEhValido) {
                            console.log('┌─────────────────────────────────────────────────────────────┐');
                            console.log('│ ❌ CACHE INVÁLIDO - Recalculando tudo                       │');
                            console.log(`│ 📋 Motivo: ${validacao.motivo}                    │`);
                            console.log('└─────────────────────────────────────────────────────────────┘');
                        }
                    }
                } catch (cacheError) {
                    console.log(`[TESTE-CACHE] ⚠️ Erro ao validar cache: ${cacheError.message}`);
                }
            } else {
                console.log('┌─────────────────────────────────────────────────────────────┐');
                console.log('│ 🔄 RECÁLCULO FORÇADO PELO ADMIN                             │');
                console.log('│ ⚠️  Ignorando todo o cache                                  │');
                console.log('└─────────────────────────────────────────────────────────────┘');
            }


            // Se não encontrou cache válido ou forçou recálculo, calcular
            console.log('[TESTE-CACHE] 🧮 Iniciando cálculo completo...');
            const inicioCalculo = performance.now();

            const extratoCompleto = await this.core.calcularExtratoFinanceiro(timeId, rodadaAtual, forcarRecalculo);

            const fimCalculo = performance.now();
            console.log(`[TESTE-CACHE] ⏱️  Tempo de cálculo: ${(fimCalculo - inicioCalculo).toFixed(2)}ms`);

            // Salvar no cache via API
            try {
                console.log('[TESTE-CACHE] 💾 Salvando extrato no cache MongoDB...');
                const inicioSave = performance.now();

                await fetch(`/api/extrato-cache/${ligaId}/times/${timeId}/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        extrato: extratoCompleto,
                        ultimaRodadaCalculada: rodadaAtual,
                        motivoRecalculo: 'participante_visualizacao'
                    })
                });

                const fimSave = performance.now();
                console.log(`[TESTE-CACHE] ✅ Cache salvo em ${(fimSave - inicioSave).toFixed(2)}ms`);
            } catch (saveError) {
                console.warn('[TESTE-CACHE] ⚠️ Erro ao salvar cache:', saveError.message);
            }

            console.log('═══════════════════════════════════════════════════════════════');
            console.log('[TESTE-CACHE] ✅ EXTRATO FINALIZADO');
            console.log(`[TESTE-CACHE] 📊 Total de rodadas: ${extratoCompleto.rodadas?.length || 0}`);
            console.log('═══════════════════════════════════════════════════════════════');

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