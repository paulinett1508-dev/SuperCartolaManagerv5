
import RodadaSnapshot from '../models/RodadaSnapshot.js';
import { calcularRankingCompleto } from './rankingGeralCacheController.js';
import { getFluxoFinanceiroLiga } from './fluxoFinanceiroController.js';
import { obterConfrontosPontosCorridos } from './pontosCorridosCacheController.js';
import { obterConfrontosMataMata } from './mataMataCacheController.js';

// ============================================================================
// 📊 BUSCAR HISTÓRICO COMPLETO CONSOLIDADO (Evita múltiplas requisições)
// ============================================================================

export const buscarHistoricoCompleto = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodadaInicio = 1, rodadaFim } = req.query;
        
        console.log(`[CONSOLIDAÇÃO-HISTÓRICO] Buscando snapshots consolidados: R${rodadaInicio}-${rodadaFim || 'atual'}`);
        
        const query = {
            liga_id: ligaId,
            rodada: { $gte: parseInt(rodadaInicio) }
        };
        
        if (rodadaFim) {
            query.rodada.$lte = parseInt(rodadaFim);
        }
        
        const snapshots = await RodadaSnapshot.find(query)
            .sort({ rodada: 1 })
            .lean();
        
        console.log(`[CONSOLIDAÇÃO-HISTÓRICO] ✅ ${snapshots.length} snapshots encontrados`);
        
        res.json({
            success: true,
            total: snapshots.length,
            rodadas: snapshots.map(s => ({
                rodada: s.rodada,
                dados: s.dados_consolidados,
                status_mercado: s.status_mercado,
                atualizado_em: s.atualizado_em
            }))
        });
        
    } catch (error) {
        console.error('[CONSOLIDAÇÃO-HISTÓRICO] ❌ Erro:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Consolida UMA rodada específica
export const consolidarRodada = async (req, res) => {
    try {
        const { ligaId, rodada } = req.params;
        const rodadaNum = parseInt(rodada);
        
        console.log(`[CONSOLIDAÇÃO] 🔒 Iniciando snapshot R${rodadaNum} da liga ${ligaId}`);
        
        // 1. Calcular tudo pela ÚLTIMA vez
        const [ranking, financeiro, pontosCorridos, mataMata] = await Promise.all([
            calcularRankingCompleto(ligaId, rodadaNum),
            getFluxoFinanceiroLiga(ligaId, rodadaNum),
            obterConfrontosPontosCorridos(ligaId, rodadaNum),
            obterConfrontosMataMata(ligaId, rodadaNum)
        ]);
        
        // 2. Montar snapshot
        const statusMercado = await fetch('https://api.cartolafc.globo.com/mercado/status')
            .then(r => r.json())
            .catch(() => ({ rodada_atual: 38, mes_atual: 12 }));
        
        const snapshot = {
            liga_id: ligaId,
            rodada: rodadaNum,
            dados_consolidados: {
                ranking_geral: ranking,
                times_stats: financeiro,
                confrontos_pontos_corridos: pontosCorridos,
                confrontos_mata_mata: mataMata
            },
            status_mercado: {
                rodada_atual: statusMercado.rodada_atual,
                mes_atual: statusMercado.mes_atual,
                timestamp_consolidacao: new Date()
            }
        };
        
        // 3. Salvar (upsert para permitir reconsolidações)
        const resultado = await RodadaSnapshot.findOneAndUpdate(
            { liga_id: ligaId, rodada: rodadaNum },
            snapshot,
            { upsert: true, new: true }
        );
        
        console.log(`[CONSOLIDAÇÃO] ✅ Snapshot R${rodadaNum} salvo (${resultado._id})`);
        
        res.json({
            success: true,
            rodada: rodadaNum,
            snapshotId: resultado._id,
            datosConsolidados: resultado.dados_consolidados
        });
        
    } catch (error) {
        console.error('[CONSOLIDAÇÃO] ❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
};

// Consolida TODAS as rodadas passadas de uma liga (script de recuperação)
export const consolidarTodasRodadasPassadas = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodadaInicio = 1, rodadaFim = 35 } = req.query;
        
        console.log(`[CONSOLIDAÇÃO-MASSA] 🏭 Consolidando R${rodadaInicio}-${rodadaFim} da liga ${ligaId}`);
        
        const resultados = [];
        
        for (let r = parseInt(rodadaInicio); r <= parseInt(rodadaFim); r++) {
            try {
                console.log(`[CONSOLIDAÇÃO-MASSA] Processando R${r}...`);
                
                // Simula request para reutilizar função existente
                const mockReq = { params: { ligaId, rodada: r } };
                const mockRes = {
                    json: (data) => resultados.push({ rodada: r, success: true, data }),
                    status: () => mockRes
                };
                
                await consolidarRodada(mockReq, mockRes);
                
            } catch (error) {
                console.error(`[CONSOLIDAÇÃO-MASSA] ❌ Erro na R${r}:`, error);
                resultados.push({ rodada: r, success: false, error: error.message });
            }
        }
        
        console.log(`[CONSOLIDAÇÃO-MASSA] ✅ Concluído: ${resultados.filter(r => r.success).length}/${resultados.length} rodadas`);
        
        res.json({
            total: resultados.length,
            sucessos: resultados.filter(r => r.success).length,
            falhas: resultados.filter(r => !r.success).length,
            detalhes: resultados
        });
        
    } catch (error) {
        console.error('[CONSOLIDAÇÃO-MASSA] ❌ Erro fatal:', error);
        res.status(500).json({ error: error.message });
    }
};
