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
