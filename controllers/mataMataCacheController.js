import MataMataCache from "../models/MataMataCache.js";

export const salvarCacheMataMata = async (req, res) => {
    try {
        const { ligaId, edicao } = req.params;
        const { rodada, dados } = req.body;

        if (!rodada || !dados) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        // Upsert: Salva ou Atualiza o estado desta edição
        await MataMataCache.findOneAndUpdate(
            { liga_id: ligaId, edicao: Number(edicao) },
            {
                rodada_atual: rodada,
                dados_torneio: dados,
                ultima_atualizacao: new Date(),
            },
            { new: true, upsert: true },
        );

        console.log(
            `[CACHE-MATA] Snapshot da Liga ${ligaId} (Edição ${edicao}) salvo.`,
        );
        res.json({ success: true });
    } catch (error) {
        console.error("[CACHE-MATA] Erro ao salvar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

export const lerCacheMataMata = async (req, res) => {
    try {
        const { ligaId, edicao } = req.params;

        const cache = await MataMataCache.findOne({
            liga_id: ligaId,
            edicao: Number(edicao),
        });

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        res.json({
            cached: true,
            rodada: cache.rodada_atual,
            dados: cache.dados_torneio,
            updatedAt: cache.ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-MATA] Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

export const deletarCacheMataMata = async (req, res) => {
    try {
        const { ligaId, edicao } = req.params;

        await MataMataCache.deleteOne({
            liga_id: ligaId,
            edicao: Number(edicao),
        });

        console.log(
            `[CACHE-MATA] Cache deletado: Liga ${ligaId}, Edição ${edicao}`,
        );
        res.json({ success: true, message: 'Cache deletado' });
    } catch (error) {
        console.error("[CACHE-MATA] Erro ao deletar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ============================================================================
// 🔒 FUNÇÃO PARA CONSOLIDAÇÃO DE SNAPSHOTS
// ============================================================================

export const obterConfrontosMataMata = async (ligaId, rodadaNumero) => {
    try {
        console.log(`[MATA-CONSOLIDAÇÃO] Processando liga ${ligaId} até R${rodadaNumero}`);
        
        // Buscar todos os caches de Mata-Mata desta liga
        const caches = await MataMataCache.find({ liga_id: ligaId }).sort({ edicao: 1 });
        
        if (caches.length === 0) {
            console.log('[MATA-CONSOLIDAÇÃO] Nenhum cache encontrado');
            return [];
        }
        
        const confrontosConsolidados = caches.map(cache => ({
            edicao: cache.edicao,
            rodada_atual: cache.rodada_atual,
            dados_torneio: cache.dados_torneio,
            ultima_atualizacao: cache.ultima_atualizacao
        }));
        
        console.log(`[MATA-CONSOLIDAÇÃO] ✅ ${confrontosConsolidados.length} edições processadas`);
        return confrontosConsolidados;
        
    } catch (error) {
        console.error('[MATA-CONSOLIDAÇÃO] ❌ Erro:', error);
        throw error;
    }
};
