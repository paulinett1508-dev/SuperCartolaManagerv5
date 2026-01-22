import mongoose from "mongoose";

// ==================================================
// CONTROLLER DE STATUS DE PARTICIPANTE (ADMIN)
// Gerencia ativo/inativo de participantes nas ligas
// ==================================================

// ✅ CORREÇÃO: Função para obter o Model de forma segura
function getTimeModel() {
    // Tentar obter modelo existente primeiro
    if (mongoose.models.Time) {
        return mongoose.models.Time;
    }

    // Se não existir, criar o schema e modelo
    const TimeSchema = new mongoose.Schema({
        id: { type: Number, required: true, unique: true, index: true },
        nome_time: { type: String, required: true },
        nome_cartoleiro: { type: String, required: true },
        url_escudo_png: { type: String },
        clube_id: { type: Number },
        ativo: { type: Boolean, default: true },
        rodada_desistencia: { type: Number, default: null },
        data_desistencia: { type: Date, default: null },
        senha_acesso: { type: String, default: "" },
    });

    return mongoose.model("Time", TimeSchema);
}

// ✅ Função para obter o Model Liga de forma segura
function getLigaModel() {
    if (mongoose.models.Liga) {
        return mongoose.models.Liga;
    }
    // Importar dinamicamente se necessário
    return null;
}

/**
 * ✅ NOVA FUNÇÃO: Obter participantes inativos de uma liga
 * Retorna array com { timeId, rodada_inativo, status }
 */
export const obterParticipantesInativos = async (ligaId) => {
    try {
        const Time = getTimeModel();

        // Buscar liga para obter lista de times
        let Liga = getLigaModel();
        if (!Liga) {
            const LigaModule = await import("../models/Liga.js");
            Liga = LigaModule.default;
        }

        const liga = await Liga.findById(ligaId).lean();
        if (!liga || !liga.times || liga.times.length === 0) {
            return [];
        }

        // Buscar times inativos que pertencem a esta liga
        const timesInativos = await Time.find({
            id: { $in: liga.times },
            ativo: false,
        }).lean();

        // Mapear para o formato esperado
        return timesInativos.map((time) => ({
            timeId: time.id,
            rodada_inativo: time.rodada_desistencia || null,
            status: "inativo",
        }));
    } catch (error) {
        console.error("[STATUS] Erro ao obter participantes inativos:", error);
        return [];
    }
};

/**
 * Inativa um participante a partir de uma rodada específica
 */
export const inativarParticipante = async (req, res) => {
    const { timeId } = req.params;
    const { rodada_desistencia } = req.body;

    try {
        const Time = getTimeModel();
        const timeIdNum = Number(timeId);
        const rodadaNum = Number(rodada_desistencia);

        if (isNaN(timeIdNum)) {
            return res.status(400).json({ erro: "ID do time inválido" });
        }

        // ✅ Buscar por 'id' (campo correto do schema)
        let time = await Time.findOne({ id: timeIdNum });

        // Se não encontrar, criar registro básico
        if (!time) {
            console.log(
                `[STATUS] Time ${timeIdNum} não existe no banco, criando...`,
            );
            time = new Time({
                id: timeIdNum,
                nome_time: `Time ${timeIdNum}`,
                nome_cartoleiro: "N/D",
                ativo: true,
            });
        }

        time.ativo = false;
        if (!isNaN(rodadaNum) && rodadaNum >= 1 && rodadaNum <= 38) {
            time.rodada_desistencia = rodadaNum;
        }
        time.data_desistencia = new Date();

        await time.save();

        console.log(
            `✅ [STATUS] Participante ${timeIdNum} inativado na rodada ${rodadaNum || "N/D"}`,
        );

        res.status(200).json({
            success: true,
            mensagem: `Participante inativado${rodadaNum ? ` a partir da rodada ${rodadaNum}` : ""}`,
            time: {
                id: time.id,
                ativo: time.ativo,
                rodada_desistencia: time.rodada_desistencia,
            },
        });
    } catch (err) {
        console.error("[STATUS] Erro ao inativar:", err);
        res.status(500).json({ erro: err.message });
    }
};

/**
 * Reativa um participante
 */
export const reativarParticipante = async (req, res) => {
    const { timeId } = req.params;

    try {
        const Time = getTimeModel();
        const timeIdNum = Number(timeId);

        if (isNaN(timeIdNum)) {
            return res.status(400).json({ erro: "ID do time inválido" });
        }

        // ✅ Buscar por 'id' (campo correto do schema)
        const time = await Time.findOne({ id: timeIdNum });

        if (!time) {
            return res.status(404).json({
                erro: "Participante não encontrado no banco de dados",
            });
        }

        time.ativo = true;
        time.rodada_desistencia = null;
        time.data_desistencia = null;

        await time.save();

        console.log(`✅ [STATUS] Participante ${timeIdNum} reativado`);

        res.status(200).json({
            success: true,
            mensagem: "Participante reativado com sucesso",
            time: {
                id: time.id,
                ativo: time.ativo,
            },
        });
    } catch (err) {
        console.error("[STATUS] Erro ao reativar:", err);
        res.status(500).json({ erro: err.message });
    }
};

/**
 * Buscar status de um participante
 */
export const buscarStatusParticipante = async (req, res) => {
    const { timeId } = req.params;

    try {
        const Time = getTimeModel();
        const timeIdNum = Number(timeId);

        if (isNaN(timeIdNum)) {
            return res.status(400).json({ erro: "ID do time inválido" });
        }

        // ✅ Buscar por 'id' (campo correto do schema)
        const time = await Time.findOne({ id: timeIdNum }).lean();

        if (!time) {
            // Retornar status padrão (ativo) se não existir no banco
            return res.status(200).json({
                id: timeIdNum,
                ativo: true,
                status: "ativo",
                rodada_desistencia: null,
                existeNoBanco: false,
            });
        }

        res.status(200).json({
            id: time.id,
            ativo: time.ativo !== false,
            status: time.ativo !== false ? "ativo" : "inativo",
            rodada_desistencia: time.rodada_desistencia,
            data_desistencia: time.data_desistencia,
            existeNoBanco: true,
        });
    } catch (err) {
        console.error("[STATUS] Erro ao buscar status:", err);
        res.status(500).json({ erro: err.message });
    }
};

/**
 * Alias para compatibilidade com index.js
 */
export const verificarStatusParticipante = buscarStatusParticipante;

/**
 * Toggle rápido de status (alterna ativo/inativo)
 */
export const alternarStatusParticipante = async (req, res) => {
    const { timeId } = req.params;

    try {
        const Time = getTimeModel();
        const timeIdNum = Number(timeId);

        if (isNaN(timeIdNum)) {
            return res.status(400).json({ erro: "ID do time inválido" });
        }

        // ✅ Buscar por 'id' (campo correto do schema)
        let time = await Time.findOne({ id: timeIdNum });

        if (!time) {
            return res.status(404).json({
                success: false,
                message: "Time não encontrado",
            });
        }

        // Toggle
        const novoStatus = !time.ativo;
        time.ativo = novoStatus;

        if (novoStatus) {
            // Reativando - limpar dados de desistência
            time.rodada_desistencia = null;
            time.data_desistencia = null;
        } else {
            // Inativando - marcar data
            time.data_desistencia = new Date();
        }

        await time.save();

        console.log(
            `[TOGGLE] Time ${timeIdNum} alterado para: ${novoStatus ? "Ativo" : "Inativo"}`,
        );

        return res.json({
            success: true,
            ativo: novoStatus,
            status: novoStatus ? "ativo" : "inativo",
        });
    } catch (error) {
        console.error("[TOGGLE] Erro:", error);
        return res
            .status(500)
            .json({ erro: "Erro interno ao alternar status" });
    }
};

/**
 * Verifica se participante estava ativo em uma rodada específica
 * (Útil para cálculos retroativos)
 */
export const verificarAtivoNaRodada = async (timeId, rodada) => {
    try {
        const Time = getTimeModel();
        const time = await Time.findOne({ id: Number(timeId) }).lean();

        if (!time) return true; // Assume ativo se não existir

        // Se está ativo, sempre participou
        if (time.ativo !== false) return true;

        // Se inativo, verificar se a rodada é anterior à desistência
        if (time.rodada_desistencia && rodada < time.rodada_desistencia) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("[STATUS] Erro ao verificar ativo na rodada:", error);
        return true; // Em caso de erro, assume ativo
    }
};
