import express from 'express';
import { allRules, getRuleById } from '../config/rules/index.js';

const router = express.Router();

/**
 * Retorna o título da última atualização disponível na regra
 */
function getRuleUpdatedAt(rule) {
    return rule?.metadados?.atualizado_em
        || rule?.metadados?.criado_em
        || null;
}

/**
 * Constrói resumo leve sobre cada regra disponível
 */
function buildRuleSummary(rule) {
    return {
        id: rule.id || null,
        nome: rule.nome || null,
        descricao: rule.descricao || null,
        tipo: rule.tipo || null,
        status: rule.status || null,
        versao: rule.versao || null,
        wizard_disponivel: Boolean(rule.wizard),
        modulo_ativo: Boolean(rule.configuracao?.modulo_ativo),
        atualizado_em: getRuleUpdatedAt(rule)
    };
}

function getAvailableSummaries() {
    return Object.values(allRules)
        .filter(rule => rule && typeof rule === 'object')
        .map(buildRuleSummary);
}

function getAvailableIds() {
    return getAvailableSummaries()
        .map(summary => summary.id)
        .filter(Boolean);
}

router.get('/', (req, res) => {
    const summaries = getAvailableSummaries();

    res.json({
        sucesso: true,
        total: summaries.length,
        regras: summaries
    });
});

router.get('/:ruleId', (req, res) => {
    const { ruleId } = req.params;
    const regra = getRuleById(ruleId);

    if (!regra) {
        return res.status(404).json({
            sucesso: false,
            erro: 'Regra não encontrada',
            ruleId,
            disponiveis: getAvailableIds()
        });
    }

    res.json({
        sucesso: true,
        regra,
        resumo: buildRuleSummary(regra)
    });
});

export default router;
