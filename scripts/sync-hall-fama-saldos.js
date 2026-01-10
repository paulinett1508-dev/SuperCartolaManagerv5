#!/usr/bin/env node
/**
 * SINCRONIZAR HALL DA FAMA COM SALDOS REAIS
 *
 * Atualiza o users_registry.json com os saldos corretos do MongoDB.
 * Corrige discrepância criada pela virada de temporada que zerou saldos.
 *
 * @version 1.0.0
 * @date 2026-01-10
 */

import mongoose from 'mongoose';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const CONFIG = {
    LIGA_ID: '684cb1c8af923da7c7df51de',
    TEMPORADA: 2025,
    PATHS: {
        USERS_REGISTRY: join(ROOT_DIR, 'data', 'users_registry.json'),
        BACKUP: join(ROOT_DIR, 'data', 'users_registry.backup-pre-sync.json')
    }
};

// =============================================================================
// UTILITÁRIOS
// =============================================================================

const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
    step: (num, msg) => console.log(`\n${'='.repeat(60)}\n[STEP ${num}] ${msg}\n${'='.repeat(60)}`)
};

// =============================================================================
// FUNÇÕES PRINCIPAIS
// =============================================================================

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('  SINCRONIZAR HALL DA FAMA COM SALDOS REAIS');
    console.log('  Atualiza users_registry.json com dados do MongoDB');
    console.log('='.repeat(70) + '\n');

    const isDryRun = process.argv.includes('--dry-run');
    if (isDryRun) {
        log.warn('MODO DRY-RUN: Nenhuma alteração será salva');
    }

    // Conectar ao MongoDB
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        log.error('MONGO_URI não definida!');
        process.exit(1);
    }

    log.info('Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    log.success('Conectado!');

    // =========================================================================
    // STEP 1: Carregar dados do MongoDB
    // =========================================================================
    log.step(1, 'CARREGAR DADOS DO MONGODB');

    // Buscar caches de extrato
    const caches = await db.collection('extratofinanceirocaches').find({
        $or: [
            { liga_id: new mongoose.Types.ObjectId(CONFIG.LIGA_ID) },
            { liga_id: CONFIG.LIGA_ID }
        ],
        temporada: CONFIG.TEMPORADA
    }).toArray();
    log.success(`Caches de extrato: ${caches.length} registros`);

    // Buscar campos manuais
    const camposManuais = await db.collection('fluxofinanceirocampos').find({
        ligaId: CONFIG.LIGA_ID,
        temporada: CONFIG.TEMPORADA
    }).toArray();
    log.success(`Campos manuais: ${camposManuais.length} registros`);

    // Buscar acertos financeiros
    const acertos = await db.collection('acertofinanceiros').find({
        ligaId: CONFIG.LIGA_ID,
        temporada: CONFIG.TEMPORADA,
        ativo: true
    }).toArray();
    log.success(`Acertos financeiros: ${acertos.length} registros`);

    // Criar mapas
    const cachesMap = new Map();
    for (const c of caches) {
        cachesMap.set(String(c.time_id), c);
    }

    const camposMap = new Map();
    for (const doc of camposManuais) {
        const timeId = String(doc.timeId);
        let totalCampos = 0;
        if (doc.campos && Array.isArray(doc.campos)) {
            doc.campos.forEach(c => {
                totalCampos += c.valor || 0;
            });
        }
        camposMap.set(timeId, totalCampos);
    }

    const acertosMap = new Map();
    for (const a of acertos) {
        const timeId = String(a.timeId);
        if (!acertosMap.has(timeId)) {
            acertosMap.set(timeId, { totalPago: 0, totalRecebido: 0 });
        }
        const acc = acertosMap.get(timeId);
        if (a.tipo === 'pagamento') {
            acc.totalPago += a.valor || 0;
        } else {
            acc.totalRecebido += a.valor || 0;
        }
    }

    // =========================================================================
    // STEP 2: Carregar e fazer backup do users_registry.json
    // =========================================================================
    log.step(2, 'CARREGAR E FAZER BACKUP DO REGISTRY');

    if (!existsSync(CONFIG.PATHS.USERS_REGISTRY)) {
        log.error('users_registry.json não encontrado!');
        process.exit(1);
    }

    const content = readFileSync(CONFIG.PATHS.USERS_REGISTRY, 'utf-8');
    const registry = JSON.parse(content);
    log.success(`Arquivo carregado: ${registry.users?.length || 0} usuários`);

    if (!isDryRun) {
        writeFileSync(CONFIG.PATHS.BACKUP, content);
        log.success('Backup salvo em users_registry.backup-pre-sync.json');
    }

    // =========================================================================
    // STEP 3: Atualizar saldos
    // =========================================================================
    log.step(3, 'ATUALIZAR SALDOS');

    let atualizados = 0;
    let semCache = 0;

    for (const user of registry.users || []) {
        // Verificar se participa da liga
        const participaLiga = user.ligas_participadas?.some(l => l.liga_id === CONFIG.LIGA_ID);
        if (!participaLiga) continue;

        const timeId = String(user.id);
        const cache = cachesMap.get(timeId);

        if (!cache) {
            log.warn(`  ${user.nome}: sem cache no MongoDB`);
            semCache++;
            continue;
        }

        // Calcular saldos
        const saldoRodadas = cache.saldo_consolidado ?? 0;
        const saldoCampos = camposMap.get(timeId) ?? 0;
        const acerto = acertosMap.get(timeId) || { totalPago: 0, totalRecebido: 0 };
        const saldoAcertos = acerto.totalPago - acerto.totalRecebido;

        // Saldo total (base para determinar tipo)
        const saldoBase = saldoRodadas + saldoCampos;
        // Saldo final com acertos
        const saldoFinal = saldoBase + saldoAcertos;

        // Atualizar situacao_financeira
        const tempKey = `temporada_${CONFIG.TEMPORADA}`;

        if (!user.situacao_financeira) {
            user.situacao_financeira = {};
        }
        if (!user.situacao_financeira.detalhamento) {
            user.situacao_financeira.detalhamento = {};
        }

        const oldSaldo = user.situacao_financeira.detalhamento[tempKey]?.saldo_final ?? 0;

        // Atualizar campos da temporada
        user.situacao_financeira.detalhamento[tempKey] = {
            saldo_extrato: saldoRodadas,
            saldo_campos_manuais: saldoCampos,
            saldo_acertos: saldoAcertos,
            saldo_final: saldoFinal,
            total_bonus: cache.resumo?.totalGanhos ?? 0,
            total_onus: cache.resumo?.totalPerdas ?? 0,
            quitado: Math.abs(saldoFinal) < 0.01,
            data_sincronizacao: new Date().toISOString()
        };

        // Atualizar saldo_atual (referência rápida)
        user.situacao_financeira.saldo_atual = saldoFinal;

        // Determinar tipo
        if (saldoFinal > 0.01) {
            user.situacao_financeira.tipo = 'credor';
        } else if (saldoFinal < -0.01) {
            user.situacao_financeira.tipo = 'devedor';
        } else {
            user.situacao_financeira.tipo = 'zerado';
        }

        // Atualizar histórico também
        const hist2025 = user.historico?.find(h => h.ano === CONFIG.TEMPORADA && h.liga_id === CONFIG.LIGA_ID);
        if (hist2025) {
            hist2025.financeiro = {
                saldo_final: saldoFinal,
                saldo_extrato: saldoRodadas,
                saldo_campos_manuais: saldoCampos,
                saldo_acertos: saldoAcertos,
                total_bonus: cache.resumo?.totalGanhos ?? hist2025.financeiro?.total_bonus ?? 0,
                total_onus: cache.resumo?.totalPerdas ?? hist2025.financeiro?.total_onus ?? 0
            };
        }

        if (Math.abs(oldSaldo - saldoFinal) > 0.01) {
            log.info(`  ${user.nome}: R$ ${oldSaldo.toFixed(2)} → R$ ${saldoFinal.toFixed(2)}`);
            atualizados++;
        }
    }

    // =========================================================================
    // STEP 4: Salvar arquivo
    // =========================================================================
    log.step(4, 'SALVAR ALTERAÇÕES');

    // Atualizar metadata
    registry._metadata.ultima_atualizacao = new Date().toISOString();
    registry._metadata.sincronizacao_saldos = new Date().toISOString();

    if (isDryRun) {
        log.warn('DRY-RUN: Arquivo NÃO salvo');
    } else {
        writeFileSync(CONFIG.PATHS.USERS_REGISTRY, JSON.stringify(registry, null, 2));
        log.success('Arquivo salvo!');
    }

    // =========================================================================
    // RESUMO
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('  RESUMO');
    console.log('='.repeat(70));
    console.log(`  Participantes atualizados: ${atualizados}`);
    console.log(`  Sem cache (não atualizados): ${semCache}`);

    if (atualizados > 0 && !isDryRun) {
        console.log('\n✅ Hall da Fama sincronizado com MongoDB!');
    } else if (isDryRun) {
        console.log('\n⚠️  DRY-RUN: Execute sem --dry-run para aplicar alterações');
    }
    console.log('='.repeat(70) + '\n');

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
