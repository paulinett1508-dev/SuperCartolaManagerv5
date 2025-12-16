#!/usr/bin/env node
/**
 * ADMIN RENEW USER - Script de Renovação de Participantes
 *
 * Adiciona "2026" ao array `active_seasons` dos usuários aprovados.
 * Modelo OPT-IN: participantes devem ser renovados manualmente pelo Admin.
 *
 * Uso:
 *   node scripts/admin_renew_user.js --user <userId>           # Renova um usuário
 *   node scripts/admin_renew_user.js --user <userId> --revoke  # Revoga renovação
 *   node scripts/admin_renew_user.js --list-pending            # Lista pendentes
 *   node scripts/admin_renew_user.js --bulk-file <arquivo.json> # Renovação em lote
 *   node scripts/admin_renew_user.js --stats                   # Estatísticas
 *
 * @version 1.0.0
 * @author DevOps Team
 * @date 2025-12-15
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const CONFIG = {
    TEMPORADA_ATUAL: '2026',
    TEMPORADA_ANTERIOR: '2025',
    REGISTRY_PATH: join(ROOT_DIR, 'data', 'users_registry.json'),
    BACKUP_DIR: join(ROOT_DIR, 'data', 'backups'),
    STATUS: {
        PENDENTE: 'pendente',
        RENOVADO: 'renovado',
        NAO_RENOVADO: 'nao_renovado',
        QUITADO: 'quitado',
        INADIMPLENTE: 'inadimplente'
    }
};

// =============================================================================
// UTILITÁRIOS
// =============================================================================

const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.log(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    success: (msg) => console.log(`[SUCCESS] ${msg}`)
};

function carregarRegistry() {
    if (!existsSync(CONFIG.REGISTRY_PATH)) {
        throw new Error(`Registry não encontrado: ${CONFIG.REGISTRY_PATH}`);
    }

    const content = readFileSync(CONFIG.REGISTRY_PATH, 'utf-8');
    return JSON.parse(content);
}

function salvarRegistry(registry) {
    // Criar backup antes de salvar
    const backupPath = join(
        CONFIG.BACKUP_DIR,
        `users_registry_backup_${Date.now()}.json`
    );

    // Garantir que o diretório de backup existe
    if (!existsSync(CONFIG.BACKUP_DIR)) {
        mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    }

    // Salvar backup
    const registryAtual = readFileSync(CONFIG.REGISTRY_PATH, 'utf-8');
    writeFileSync(backupPath, registryAtual, 'utf-8');
    log.info(`Backup criado: ${backupPath}`);

    // Atualizar metadata
    registry._metadata.ultima_atualizacao = new Date().toISOString();

    // Salvar registry atualizado
    writeFileSync(CONFIG.REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
    log.success(`Registry salvo: ${CONFIG.REGISTRY_PATH}`);
}

// =============================================================================
// FUNÇÕES PRINCIPAIS
// =============================================================================

/**
 * Renova um usuário específico para a temporada atual
 */
async function renovarUsuario(userId, observacoes = null) {
    const registry = carregarRegistry();

    const user = registry.users.find(u =>
        u.id === userId ||
        u.nome?.toLowerCase().includes(userId.toLowerCase())
    );

    if (!user) {
        throw new Error(`Usuário não encontrado: ${userId}`);
    }

    log.info(`Processando renovação de: ${user.nome} (${user.id})`);

    // Verificar se já está renovado
    if (user.active_seasons?.includes(CONFIG.TEMPORADA_ATUAL)) {
        log.warn(`Usuário já possui a temporada ${CONFIG.TEMPORADA_ATUAL} ativa`);
        return { success: true, action: 'already_active', user };
    }

    // Adicionar temporada ao array active_seasons
    if (!user.active_seasons) {
        user.active_seasons = [];
    }
    user.active_seasons.push(CONFIG.TEMPORADA_ATUAL);

    // Atualizar status de renovação
    if (!user.status_renovacao) {
        user.status_renovacao = {};
    }
    user.status_renovacao[`temporada_${CONFIG.TEMPORADA_ATUAL}`] = {
        status: CONFIG.STATUS.RENOVADO,
        data_decisao: new Date().toISOString(),
        observacoes: observacoes || 'Renovação aprovada pelo Admin'
    };

    // Liberar acesso à temporada atual
    if (!user.acesso_permitido) {
        user.acesso_permitido = {};
    }
    user.acesso_permitido.temporada_atual = true;
    user.acesso_permitido.hall_da_fama = true;
    user.acesso_permitido.extrato_financeiro = true;

    await salvarRegistry(registry);

    log.success(`Usuário ${user.nome} renovado para ${CONFIG.TEMPORADA_ATUAL}`);

    return { success: true, action: 'renewed', user };
}

/**
 * Revoga a renovação de um usuário
 */
async function revogarRenovacao(userId, motivo = null) {
    const registry = carregarRegistry();

    const user = registry.users.find(u =>
        u.id === userId ||
        u.nome?.toLowerCase().includes(userId.toLowerCase())
    );

    if (!user) {
        throw new Error(`Usuário não encontrado: ${userId}`);
    }

    log.info(`Revogando renovação de: ${user.nome} (${user.id})`);

    // Remover temporada do array
    if (user.active_seasons) {
        user.active_seasons = user.active_seasons.filter(s => s !== CONFIG.TEMPORADA_ATUAL);
    }

    // Atualizar status
    if (!user.status_renovacao) {
        user.status_renovacao = {};
    }
    user.status_renovacao[`temporada_${CONFIG.TEMPORADA_ATUAL}`] = {
        status: CONFIG.STATUS.NAO_RENOVADO,
        data_decisao: new Date().toISOString(),
        observacoes: motivo || 'Renovação revogada pelo Admin'
    };

    // Bloquear acesso à temporada
    if (user.acesso_permitido) {
        user.acesso_permitido.temporada_atual = false;
    }

    await salvarRegistry(registry);

    log.success(`Renovação de ${user.nome} revogada`);

    return { success: true, action: 'revoked', user };
}

/**
 * Lista todos os usuários com renovação pendente
 */
function listarPendentes() {
    const registry = carregarRegistry();

    const pendentes = registry.users.filter(user => {
        const statusRenovacao = user.status_renovacao?.[`temporada_${CONFIG.TEMPORADA_ATUAL}`];
        return !statusRenovacao || statusRenovacao.status === CONFIG.STATUS.PENDENTE;
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           USUÁRIOS COM RENOVAÇÃO PENDENTE                  ║');
    console.log('╠════════════════════════════════════════════════════════════╣');

    if (pendentes.length === 0) {
        console.log('║  Nenhum usuário com renovação pendente                      ║');
    } else {
        console.log(`║  Total: ${pendentes.length} usuário(s)                                         ║`);
        console.log('╠════════════════════════════════════════════════════════════╣');

        for (const user of pendentes) {
            const saldo = user.situacao_financeira?.saldo_atual || 0;
            const tipo = saldo > 0 ? 'CREDOR' : saldo < 0 ? 'DEVEDOR' : 'ZERADO';
            const saldoStr = saldo.toFixed(2).replace('.', ',');

            console.log(`║  ID: ${user.id.substring(0, 20).padEnd(20)}`);
            console.log(`║  Nome: ${(user.nome || 'N/A').substring(0, 40).padEnd(40)}`);
            console.log(`║  Saldo: R$ ${saldoStr.padStart(10)} (${tipo.padEnd(7)})`);
            console.log('║────────────────────────────────────────────────────────────║');
        }
    }

    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return pendentes;
}

/**
 * Renovação em lote via arquivo JSON
 */
async function renovarEmLote(arquivoPath) {
    if (!existsSync(arquivoPath)) {
        throw new Error(`Arquivo não encontrado: ${arquivoPath}`);
    }

    const content = readFileSync(arquivoPath, 'utf-8');
    const { usuarios } = JSON.parse(content);

    if (!Array.isArray(usuarios)) {
        throw new Error('Arquivo deve conter array "usuarios" com IDs');
    }

    log.info(`Processando ${usuarios.length} usuários para renovação em lote`);

    const resultados = {
        sucesso: [],
        erro: [],
        jaRenovados: []
    };

    for (const userId of usuarios) {
        try {
            const result = await renovarUsuario(userId);

            if (result.action === 'already_active') {
                resultados.jaRenovados.push(userId);
            } else {
                resultados.sucesso.push(userId);
            }
        } catch (err) {
            log.error(`Erro ao renovar ${userId}: ${err.message}`);
            resultados.erro.push({ id: userId, erro: err.message });
        }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              RESULTADO DA RENOVAÇÃO EM LOTE                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Renovados: ${resultados.sucesso.length.toString().padStart(3)}`);
    console.log(`║  ⚠️  Já ativos: ${resultados.jaRenovados.length.toString().padStart(3)}`);
    console.log(`║  ❌ Erros: ${resultados.erro.length.toString().padStart(3)}`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return resultados;
}

/**
 * Exibe estatísticas de renovação
 */
function exibirEstatisticas() {
    const registry = carregarRegistry();

    const stats = {
        total: registry.users.length,
        renovados: 0,
        pendentes: 0,
        naoRenovados: 0,
        credores: 0,
        devedores: 0,
        zerados: 0,
        totalCredito: 0,
        totalDebito: 0
    };

    for (const user of registry.users) {
        const statusRenovacao = user.status_renovacao?.[`temporada_${CONFIG.TEMPORADA_ATUAL}`];

        if (statusRenovacao?.status === CONFIG.STATUS.RENOVADO ||
            user.active_seasons?.includes(CONFIG.TEMPORADA_ATUAL)) {
            stats.renovados++;
        } else if (statusRenovacao?.status === CONFIG.STATUS.NAO_RENOVADO) {
            stats.naoRenovados++;
        } else {
            stats.pendentes++;
        }

        const saldo = user.situacao_financeira?.saldo_atual || 0;
        if (saldo > 0) {
            stats.credores++;
            stats.totalCredito += saldo;
        } else if (saldo < 0) {
            stats.devedores++;
            stats.totalDebito += Math.abs(saldo);
        } else {
            stats.zerados++;
        }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           ESTATÍSTICAS DE RENOVAÇÃO 2026                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total de Usuários: ${stats.total.toString().padStart(5)}                               ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Renovados:      ${stats.renovados.toString().padStart(5)} (${((stats.renovados/stats.total)*100).toFixed(1).padStart(5)}%)                    ║`);
    console.log(`║  ⏳ Pendentes:      ${stats.pendentes.toString().padStart(5)} (${((stats.pendentes/stats.total)*100).toFixed(1).padStart(5)}%)                    ║`);
    console.log(`║  ❌ Não Renovados:  ${stats.naoRenovados.toString().padStart(5)} (${((stats.naoRenovados/stats.total)*100).toFixed(1).padStart(5)}%)                    ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  SITUAÇÃO FINANCEIRA                                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  💰 Credores:  ${stats.credores.toString().padStart(3)} | Total: R$ ${stats.totalCredito.toFixed(2).padStart(10)}            ║`);
    console.log(`║  💸 Devedores: ${stats.devedores.toString().padStart(3)} | Total: R$ ${stats.totalDebito.toFixed(2).padStart(10)}            ║`);
    console.log(`║  ⚖️  Zerados:   ${stats.zerados.toString().padStart(3)}                                        ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return stats;
}

// =============================================================================
// CLI - Processamento de Argumentos
// =============================================================================

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║           ADMIN RENEW USER - Renovação de Usuários         ║
╠════════════════════════════════════════════════════════════╣
║  Uso:                                                      ║
║    --user <id>              Renova um usuário              ║
║    --user <id> --revoke     Revoga renovação               ║
║    --list-pending           Lista pendentes                ║
║    --bulk-file <arquivo>    Renovação em lote              ║
║    --stats                  Estatísticas                   ║
║                                                            ║
║  Exemplos:                                                 ║
║    node admin_renew_user.js --user 123456                  ║
║    node admin_renew_user.js --list-pending                 ║
║    node admin_renew_user.js --bulk-file renovar.json       ║
╚════════════════════════════════════════════════════════════╝
        `);
        process.exit(0);
    }

    try {
        // --stats
        if (args.includes('--stats')) {
            exibirEstatisticas();
            process.exit(0);
        }

        // --list-pending
        if (args.includes('--list-pending')) {
            listarPendentes();
            process.exit(0);
        }

        // --bulk-file <arquivo>
        const bulkIndex = args.indexOf('--bulk-file');
        if (bulkIndex !== -1) {
            const arquivo = args[bulkIndex + 1];
            if (!arquivo) {
                throw new Error('Especifique o arquivo JSON para renovação em lote');
            }
            await renovarEmLote(arquivo);
            process.exit(0);
        }

        // --user <id> [--revoke]
        const userIndex = args.indexOf('--user');
        if (userIndex !== -1) {
            const userId = args[userIndex + 1];
            if (!userId) {
                throw new Error('Especifique o ID do usuário');
            }

            if (args.includes('--revoke')) {
                const motivoIndex = args.indexOf('--motivo');
                const motivo = motivoIndex !== -1 ? args[motivoIndex + 1] : null;
                await revogarRenovacao(userId, motivo);
            } else {
                const obsIndex = args.indexOf('--obs');
                const observacoes = obsIndex !== -1 ? args[obsIndex + 1] : null;
                await renovarUsuario(userId, observacoes);
            }
            process.exit(0);
        }

        log.error('Comando não reconhecido. Use --help para ver opções.');
        process.exit(1);

    } catch (err) {
        log.error(err.message);
        process.exit(1);
    }
}

// Executar
main();
