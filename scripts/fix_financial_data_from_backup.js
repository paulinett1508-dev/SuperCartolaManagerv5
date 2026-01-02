#!/usr/bin/env node
/**
 * FIX FINANCIAL DATA FROM BACKUP
 *
 * Corrige os dados financeiros no users_registry.json usando o backup
 * pre-wipe que tem os valores corretos.
 *
 * Problema: O turn_key usou nomes de campo errados:
 *   - Usou: saldo, totalBonus, totalOnus (nao existem)
 *   - Correto: saldo_consolidado, ganhos_consolidados, perdas_consolidadas
 *
 * @version 1.0.0
 * @date 2026-01-02
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Configuracao
const CONFIG = {
    BACKUP_DIR: join(ROOT_DIR, 'data', 'backups', 'pre-wipe-2026-01-01T22-22-59'),
    USERS_REGISTRY: join(ROOT_DIR, 'data', 'users_registry.json'),
    LIGAS: {
        'SUPERCARTOLA': '684cb1c8af923da7c7df51de',
        'SOBRAL': '684d821cf1a7ae16d1f89572'
    }
};

// Utilitarios
const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.log(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    success: (msg) => console.log(`[OK] ${msg}`)
};

async function main() {
    console.log('\n========================================');
    console.log('FIX FINANCIAL DATA FROM BACKUP');
    console.log('========================================\n');

    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) {
        log.warn('MODO DRY-RUN - Nenhuma alteracao sera feita\n');
    }

    // 1. Carregar backup de extratos
    const backupPath = join(CONFIG.BACKUP_DIR, 'extratofinanceirocaches.json');
    if (!existsSync(backupPath)) {
        log.error(`Backup nao encontrado: ${backupPath}`);
        process.exit(1);
    }

    const extratos = JSON.parse(readFileSync(backupPath, 'utf-8'));
    log.info(`Backup carregado: ${extratos.length} extratos`);

    // 2. Mapear extratos por time_id e liga_id
    const extratosPorTime = new Map();
    for (const extrato of extratos) {
        const timeId = String(extrato.time_id || extrato.timeId);
        const ligaId = String(extrato.liga_id || extrato.ligaId);

        if (!timeId || timeId === 'undefined') continue;

        const key = `${timeId}_${ligaId}`;
        extratosPorTime.set(key, {
            saldo: extrato.saldo_consolidado || 0,
            bonus: extrato.ganhos_consolidados || 0,
            onus: extrato.perdas_consolidadas || 0,
            rodadas: extrato.historico_transacoes?.length || 0
        });
    }
    log.info(`Extratos mapeados: ${extratosPorTime.size} registros`);

    // 3. Carregar users_registry
    if (!existsSync(CONFIG.USERS_REGISTRY)) {
        log.error(`Registry nao encontrado: ${CONFIG.USERS_REGISTRY}`);
        process.exit(1);
    }

    const registry = JSON.parse(readFileSync(CONFIG.USERS_REGISTRY, 'utf-8'));
    log.info(`Registry carregado: ${registry.users.length} usuarios`);

    // 4. Corrigir dados financeiros
    let corrigidos = 0;
    let semDados = 0;

    for (const user of registry.users) {
        const userId = user.id;

        // Corrigir cada entrada no historico
        for (const hist of (user.historico || [])) {
            const ligaId = hist.liga_id;
            const key = `${userId}_${ligaId}`;

            const extrato = extratosPorTime.get(key);

            if (extrato) {
                const antes = { ...hist.financeiro };

                hist.financeiro = {
                    saldo_final: extrato.saldo,
                    total_bonus: extrato.bonus,
                    total_onus: extrato.onus
                };

                // Atualizar tambem o status ativo baseado nas rodadas
                if (!hist.status) {
                    hist.status = { ativo: true, rodada_desistencia: null };
                }

                if (antes.saldo_final !== extrato.saldo) {
                    log.success(`${user.nome} (${hist.liga_nome}): saldo ${antes.saldo_final} -> ${extrato.saldo}`);
                    corrigidos++;
                }
            } else {
                semDados++;
            }
        }

        // Atualizar situacao_financeira geral
        // Somar saldos de todas as ligas
        let saldoTotal = 0;
        let bonusTotal = 0;
        let onusTotal = 0;

        for (const hist of (user.historico || [])) {
            saldoTotal += hist.financeiro?.saldo_final || 0;
            bonusTotal += hist.financeiro?.total_bonus || 0;
            onusTotal += hist.financeiro?.total_onus || 0;
        }

        // Verificar campos manuais do backup
        const camposManuaisPath = join(CONFIG.BACKUP_DIR, 'fluxofinanceirocampos.json');
        if (existsSync(camposManuaisPath)) {
            try {
                const camposManuais = JSON.parse(readFileSync(camposManuaisPath, 'utf-8'));
                const camposDoUser = camposManuais.filter(c =>
                    String(c.time_id || c.timeId) === userId
                );

                let saldoCampos = 0;
                for (const campo of camposDoUser) {
                    saldoCampos += parseFloat(campo.valor || 0);
                }

                if (saldoCampos !== 0) {
                    log.info(`${user.nome}: campos manuais = ${saldoCampos}`);
                }

                // Atualizar detalhamento
                if (user.situacao_financeira?.detalhamento?.temporada_2025) {
                    user.situacao_financeira.detalhamento.temporada_2025.saldo_extrato = saldoTotal;
                    user.situacao_financeira.detalhamento.temporada_2025.saldo_campos_manuais = saldoCampos;
                    user.situacao_financeira.detalhamento.temporada_2025.saldo_final = saldoTotal + saldoCampos;
                    user.situacao_financeira.detalhamento.temporada_2025.total_bonus = bonusTotal;
                    user.situacao_financeira.detalhamento.temporada_2025.total_onus = onusTotal;
                }

                // Atualizar saldo_atual
                const saldoFinal = saldoTotal + saldoCampos;
                user.situacao_financeira.saldo_atual = saldoFinal;
                user.situacao_financeira.tipo = saldoFinal > 0 ? 'credor' : saldoFinal < 0 ? 'devedor' : 'zerado';

            } catch (e) {
                log.warn(`Erro ao processar campos manuais: ${e.message}`);
            }
        }
    }

    log.info(`\nResultado: ${corrigidos} registros corrigidos, ${semDados} sem dados no backup`);

    // 5. Salvar registry atualizado
    if (!dryRun) {
        registry._metadata.ultima_atualizacao = new Date().toISOString();
        registry._metadata.correcoes_aplicadas = (registry._metadata.correcoes_aplicadas || 0) + corrigidos;

        writeFileSync(CONFIG.USERS_REGISTRY, JSON.stringify(registry, null, 2), 'utf-8');
        log.success(`Registry salvo: ${CONFIG.USERS_REGISTRY}`);
    } else {
        log.warn('DRY-RUN: Registry NAO foi salvo');
    }

    console.log('\n========================================');
    console.log('CORRECAO CONCLUIDA');
    console.log('========================================\n');
}

main().catch(err => {
    log.error(`Erro fatal: ${err.message}`);
    console.error(err);
    process.exit(1);
});
