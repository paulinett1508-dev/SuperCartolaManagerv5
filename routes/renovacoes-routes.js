/**
 * ROTAS DE GESTÃO DE RENOVAÇÕES - Temporada 2026
 *
 * Endpoints para gerenciar o users_registry.json
 * - Leitura dos participantes
 * - Atualização de status de renovação
 * - Registro de pagamentos
 *
 * @version 1.0.0
 */

import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REGISTRY_PATH = join(__dirname, '..', 'data', 'users_registry.json');

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Carrega o registry do disco
 */
function loadRegistry() {
    try {
        if (!existsSync(REGISTRY_PATH)) {
            return { users: [], _metadata: {}, config_renovacao: {} };
        }
        const content = readFileSync(REGISTRY_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('[RENOVACOES] Erro ao carregar registry:', error.message);
        return { users: [], _metadata: {}, config_renovacao: {} };
    }
}

/**
 * Salva o registry no disco
 */
function saveRegistry(registry) {
    try {
        registry._metadata.ultima_atualizacao = new Date().toISOString();
        writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('[RENOVACOES] Erro ao salvar registry:', error.message);
        return false;
    }
}

// =============================================================================
// ROTAS
// =============================================================================

/**
 * GET /api/renovacoes/registry
 * Retorna todos os usuários do registry
 */
router.get('/registry', (req, res) => {
    try {
        const registry = loadRegistry();

        // Filtrar dados sensíveis se necessário
        const users = registry.users.map(u => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            telefone: u.telefone,
            primeiro_registro: u.primeiro_registro,
            active_seasons: u.active_seasons,
            status_renovacao: u.status_renovacao,
            situacao_financeira: u.situacao_financeira,
            ligas_participadas: u.ligas_participadas,
            historico: u.historico,
            stats_agregadas: u.stats_agregadas,
            acesso_permitido: u.acesso_permitido
        }));

        res.json({
            success: true,
            config: registry.config_renovacao,
            metadata: registry._metadata,
            users,
            total: users.length
        });
    } catch (error) {
        console.error('[RENOVACOES] Erro ao buscar registry:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/renovacoes/estatisticas
 * Retorna estatísticas consolidadas
 */
router.get('/estatisticas', (req, res) => {
    try {
        const registry = loadRegistry();

        let pendentes = 0;
        let renovados = 0;
        let naoRenovados = 0;
        let credores = 0;
        let devedores = 0;
        let quitados = 0;
        let totalCredito = 0;
        let totalDebito = 0;

        registry.users.forEach(u => {
            const status = u.status_renovacao?.temporada_2026?.status || 'pendente';
            const saldo = u.situacao_financeira?.saldo_atual || 0;

            if (status === 'pendente') pendentes++;
            else if (status === 'renovado') renovados++;
            else if (status === 'nao_renovado') naoRenovados++;

            if (saldo > 0) {
                credores++;
                totalCredito += saldo;
            } else if (saldo < 0) {
                devedores++;
                totalDebito += Math.abs(saldo);
            } else {
                quitados++;
            }
        });

        res.json({
            success: true,
            estatisticas: {
                total: registry.users.length,
                pendentes,
                renovados,
                naoRenovados,
                credores,
                devedores,
                quitados,
                totalCredito: parseFloat(totalCredito.toFixed(2)),
                totalDebito: parseFloat(totalDebito.toFixed(2))
            }
        });
    } catch (error) {
        console.error('[RENOVACOES] Erro ao calcular estatísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/renovacoes/:id
 * Retorna um participante específico
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const registry = loadRegistry();

        const user = registry.users.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'Participante não encontrado' });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('[RENOVACOES] Erro ao buscar participante:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/renovacoes/:id/status
 * Atualiza o status de renovação de um participante
 */
router.put('/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status, observacoes } = req.body;

        const statusValidos = ['pendente', 'renovado', 'nao_renovado', 'quitado', 'inadimplente'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Status inválido. Valores aceitos: ${statusValidos.join(', ')}`
            });
        }

        const registry = loadRegistry();
        const userIndex = registry.users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'Participante não encontrado' });
        }

        // Atualizar status
        if (!registry.users[userIndex].status_renovacao) {
            registry.users[userIndex].status_renovacao = {};
        }

        registry.users[userIndex].status_renovacao.temporada_2026 = {
            status,
            data_decisao: new Date().toISOString(),
            observacoes: observacoes || null
        };

        // Atualizar acesso_permitido
        if (!registry.users[userIndex].acesso_permitido) {
            registry.users[userIndex].acesso_permitido = {};
        }

        registry.users[userIndex].acesso_permitido.temporada_atual = (status === 'renovado');

        // Se renovado, adicionar 2026 ao active_seasons
        if (status === 'renovado') {
            if (!registry.users[userIndex].active_seasons.includes('2026')) {
                registry.users[userIndex].active_seasons.push('2026');
            }
        }

        if (saveRegistry(registry)) {
            res.json({
                success: true,
                message: `Status atualizado para '${status}'`,
                user: registry.users[userIndex]
            });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao salvar alterações' });
        }
    } catch (error) {
        console.error('[RENOVACOES] Erro ao atualizar status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/renovacoes/:id/pagamento
 * Registra um pagamento para um participante
 */
router.post('/:id/pagamento', (req, res) => {
    try {
        const { id } = req.params;
        const { valor, observacoes } = req.body;

        if (!valor || isNaN(valor)) {
            return res.status(400).json({ success: false, error: 'Valor inválido' });
        }

        const valorNumerico = parseFloat(valor);
        const registry = loadRegistry();
        const userIndex = registry.users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: 'Participante não encontrado' });
        }

        const user = registry.users[userIndex];

        // Atualizar saldo
        if (!user.situacao_financeira) {
            user.situacao_financeira = { saldo_atual: 0, tipo: 'zerado', historico_pagamentos: [] };
        }

        const saldoAnterior = user.situacao_financeira.saldo_atual || 0;
        const novoSaldo = parseFloat((saldoAnterior + valorNumerico).toFixed(2));

        user.situacao_financeira.saldo_atual = novoSaldo;

        // Atualizar tipo
        if (novoSaldo > 0) {
            user.situacao_financeira.tipo = 'credor';
        } else if (novoSaldo < 0) {
            user.situacao_financeira.tipo = 'devedor';
        } else {
            user.situacao_financeira.tipo = 'zerado';
        }

        // Adicionar ao histórico de pagamentos
        if (!user.situacao_financeira.historico_pagamentos) {
            user.situacao_financeira.historico_pagamentos = [];
        }

        user.situacao_financeira.historico_pagamentos.push({
            data: new Date().toISOString(),
            valor: valorNumerico,
            saldo_anterior: saldoAnterior,
            saldo_novo: novoSaldo,
            observacoes: observacoes || null
        });

        // Se saldo zerou, marcar quitação na temporada 2025
        if (novoSaldo === 0 && user.situacao_financeira.detalhamento?.temporada_2025) {
            user.situacao_financeira.detalhamento.temporada_2025.quitado = true;
            user.situacao_financeira.detalhamento.temporada_2025.data_quitacao = new Date().toISOString();
        }

        if (saveRegistry(registry)) {
            res.json({
                success: true,
                message: `Pagamento de R$ ${valorNumerico.toFixed(2)} registrado`,
                saldo_anterior: saldoAnterior,
                saldo_atual: novoSaldo,
                user
            });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao salvar pagamento' });
        }
    } catch (error) {
        console.error('[RENOVACOES] Erro ao registrar pagamento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/renovacoes/bulk/status
 * Atualiza status de múltiplos participantes
 */
router.put('/bulk/status', (req, res) => {
    try {
        const { ids, status, observacoes } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Lista de IDs inválida' });
        }

        const statusValidos = ['pendente', 'renovado', 'nao_renovado', 'quitado', 'inadimplente'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ success: false, error: 'Status inválido' });
        }

        const registry = loadRegistry();
        let atualizados = 0;

        ids.forEach(id => {
            const userIndex = registry.users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                if (!registry.users[userIndex].status_renovacao) {
                    registry.users[userIndex].status_renovacao = {};
                }

                registry.users[userIndex].status_renovacao.temporada_2026 = {
                    status,
                    data_decisao: new Date().toISOString(),
                    observacoes: observacoes || null
                };

                if (!registry.users[userIndex].acesso_permitido) {
                    registry.users[userIndex].acesso_permitido = {};
                }
                registry.users[userIndex].acesso_permitido.temporada_atual = (status === 'renovado');

                if (status === 'renovado') {
                    if (!registry.users[userIndex].active_seasons.includes('2026')) {
                        registry.users[userIndex].active_seasons.push('2026');
                    }
                }

                atualizados++;
            }
        });

        if (saveRegistry(registry)) {
            res.json({
                success: true,
                message: `${atualizados} participante(s) atualizado(s)`,
                atualizados
            });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao salvar alterações' });
        }
    } catch (error) {
        console.error('[RENOVACOES] Erro ao atualização em massa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
