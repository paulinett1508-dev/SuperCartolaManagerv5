import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";

// Buscar campos de um time específico
export const getCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        let campos = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });

        // Se não existir, criar com valores padrão
        if (!campos) {
            campos = new FluxoFinanceiroCampos({
                ligaId,
                timeId,
                campos: [
                    { nome: "Campo 1", valor: 0 },
                    { nome: "Campo 2", valor: 0 },
                    { nome: "Campo 3", valor: 0 },
                    { nome: "Campo 4", valor: 0 },
                ],
            });
            await campos.save();
        }

        res.json(campos);
    } catch (error) {
        console.error("[FLUXO-CONTROLLER] Erro ao buscar campos:", error);
        res.status(500).json({ error: "Erro ao buscar campos editáveis" });
    }
};

// Buscar campos de todos os times de uma liga
export const getCamposLiga = async (req, res) => {
    try {
        const { ligaId } = req.params;

        const campos = await FluxoFinanceiroCampos.find({ ligaId });

        res.json(campos);
    } catch (error) {
        console.error(
            "[FLUXO-CONTROLLER] Erro ao buscar campos da liga:",
            error,
        );
        res.status(500).json({ error: "Erro ao buscar campos da liga" });
    }
};

// Salvar/atualizar campos de um time
export const salvarCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { campos } = req.body;

        // Validar que tem exatamente 4 campos
        if (!Array.isArray(campos) || campos.length !== 4) {
            return res
                .status(400)
                .json({ error: "Deve fornecer exatamente 4 campos" });
        }

        // Validar estrutura de cada campo
        for (let i = 0; i < campos.length; i++) {
            if (
                typeof campos[i].nome !== "string" ||
                typeof campos[i].valor !== "number"
            ) {
                return res.status(400).json({
                    error: `Campo ${i + 1} inválido. Deve ter 'nome' (string) e 'valor' (number)`,
                });
            }
        }

        // Buscar ou criar
        let documento = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });

        if (documento) {
            // Atualizar existente
            documento.campos = campos;
            documento.updatedAt = new Date();
            await documento.save();
        } else {
            // Criar novo
            documento = new FluxoFinanceiroCampos({
                ligaId,
                timeId,
                campos,
            });
            await documento.save();
        }

        res.json(documento);
    } catch (error) {
        console.error("[FLUXO-CONTROLLER] Erro ao salvar campos:", error);
        res.status(500).json({ error: "Erro ao salvar campos editáveis" });
    }
};

// Salvar campo individual (nome ou valor)
export const salvarCampo = async (req, res) => {
    try {
        const { ligaId, timeId, campoIndex } = req.params;
        const { nome, valor } = req.body;

        const index = parseInt(campoIndex);
        if (isNaN(index) || index < 0 || index > 3) {
            return res
                .status(400)
                .json({ error: "Índice de campo inválido (0-3)" });
        }

        // Buscar ou criar
        let documento = await FluxoFinanceiroCampos.findOne({ ligaId, timeId });

        if (!documento) {
            documento = new FluxoFinanceiroCampos({
                ligaId,
                timeId,
                campos: [
                    { nome: "Campo 1", valor: 0 },
                    { nome: "Campo 2", valor: 0 },
                    { nome: "Campo 3", valor: 0 },
                    { nome: "Campo 4", valor: 0 },
                ],
            });
        }

        // Atualizar campo específico
        if (nome !== undefined) {
            documento.campos[index].nome = nome;
        }
        if (valor !== undefined) {
            documento.campos[index].valor = parseFloat(valor) || 0;
        }

        documento.updatedAt = new Date();
        await documento.save();

        res.json(documento);
    } catch (error) {
        console.error(
            "[FLUXO-CONTROLLER] Erro ao salvar campo individual:",
            error,
        );
        res.status(500).json({ error: "Erro ao salvar campo" });
    }
};

// Resetar campos de um time para padrão
export const resetarCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        const documento = await FluxoFinanceiroCampos.findOneAndUpdate(
            { ligaId, timeId },
            {
                campos: [
                    { nome: "Campo 1", valor: 0 },
                    { nome: "Campo 2", valor: 0 },
                    { nome: "Campo 3", valor: 0 },
                    { nome: "Campo 4", valor: 0 },
                ],
                updatedAt: new Date(),
            },
            { new: true, upsert: true },
        );

        res.json(documento);
    } catch (error) {
        console.error("[FLUXO-CONTROLLER] Erro ao resetar campos:", error);
        res.status(500).json({ error: "Erro ao resetar campos" });
    }
};

// Deletar campos de um time
export const deletarCampos = async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;

        await FluxoFinanceiroCampos.findOneAndDelete({ ligaId, timeId });

        res.json({ message: "Campos deletados com sucesso" });
    } catch (error) {
        console.error("[FLUXO-CONTROLLER] Erro ao deletar campos:", error);
        res.status(500).json({ error: "Erro ao deletar campos" });
    }
};
