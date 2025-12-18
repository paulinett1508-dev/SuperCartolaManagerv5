#!/usr/bin/env node
// =====================================================================
// ATUALIZAR SALDOS NO USERS_REGISTRY.JSON
// =====================================================================
// Script para buscar saldos financeiros reais do banco PROD
// e atualizar o arquivo users_registry.json
// =====================================================================

import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

async function main() {
    console.log('\n========================================');
    console.log('  ATUALIZAR SALDOS - USERS REGISTRY');
    console.log('========================================\n');

    // Usar banco PROD para buscar dados reais
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        log.error('MONGO_URI não definida!');
        process.exit(1);
    }

    log.info('Conectando ao banco PROD...');
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    log.success('Conectado!');

    // Ler arquivo atual
    const registryPath = path.join(__dirname, '../data/users_registry.json');
    log.info(`Lendo ${registryPath}...`);

    const registryContent = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent);

    log.success(`${registry.users?.length || 0} usuários no registro`);

    // Buscar extratos do PROD
    log.info('Buscando extratos financeiros...');
    const extratos = await db.collection('extratofinanceirocaches').find({}).toArray();
    log.success(`${extratos.length} extratos encontrados`);

    // Mapear extratos por timeId
    const extratosPorTime = {};
    for (const extrato of extratos) {
        const timeId = String(extrato.time_id || extrato.timeId);
        extratosPorTime[timeId] = {
            saldo: extrato.saldo_consolidado || extrato.saldo || 0,
            ganhos: extrato.ganhos_consolidados || 0,
            perdas: extrato.perdas_consolidadas || 0,
            transacoes: extrato.historico_transacoes || []
        };
    }

    // Buscar campos manuais
    log.info('Buscando campos manuais...');
    const camposManuais = await db.collection('fluxofinanceirocampos').find({}).toArray();
    log.success(`${camposManuais.length} campos manuais encontrados`);

    // Mapear campos por timeId
    const camposPorTime = {};
    for (const campo of camposManuais) {
        const timeId = String(campo.timeId || campo.time_id);
        if (!camposPorTime[timeId]) {
            camposPorTime[timeId] = [];
        }
        camposPorTime[timeId].push({
            nome: campo.nome || campo.campo,
            valor: parseFloat(campo.valor || 0)
        });
    }

    // Estatísticas
    let atualizados = 0;
    let credores = 0;
    let devedores = 0;
    let zerados = 0;

    // Atualizar cada usuário
    log.info('Atualizando saldos dos usuários...');

    for (const user of registry.users || []) {
        const timeId = String(user.id);
        const extrato = extratosPorTime[timeId] || { saldo: 0, ganhos: 0, perdas: 0 };
        const campos = camposPorTime[timeId] || [];

        // Calcular saldo total
        const saldoExtrato = parseFloat(extrato.saldo || 0);
        let saldoCampos = 0;
        for (const campo of campos) {
            saldoCampos += parseFloat(campo.valor || 0);
        }
        const saldoTotal = parseFloat((saldoExtrato + saldoCampos).toFixed(2));

        // Determinar tipo
        let tipoFinanceiro = 'zerado';
        if (saldoTotal > 0) {
            tipoFinanceiro = 'credor';
            credores++;
        } else if (saldoTotal < 0) {
            tipoFinanceiro = 'devedor';
            devedores++;
        } else {
            zerados++;
        }

        // Atualizar situação financeira
        user.situacao_financeira = {
            saldo_atual: saldoTotal,
            tipo: tipoFinanceiro,
            detalhamento: {
                temporada_2025: {
                    saldo_extrato: saldoExtrato,
                    saldo_campos_manuais: saldoCampos,
                    saldo_final: saldoTotal,
                    total_bonus: parseFloat(extrato.ganhos || 0),
                    total_onus: parseFloat(extrato.perdas || 0),
                    quitado: saldoTotal === 0,
                    data_quitacao: saldoTotal === 0 ? new Date().toISOString() : null
                }
            },
            historico_pagamentos: user.situacao_financeira?.historico_pagamentos || []
        };

        // Atualizar histórico (temporada 2025)
        const historico2025 = user.historico?.find(h => h.ano === 2025);
        if (historico2025) {
            historico2025.financeiro = {
                saldo_final: saldoTotal,
                total_bonus: parseFloat(extrato.ganhos || 0),
                total_onus: parseFloat(extrato.perdas || 0)
            };
        }

        // Log se tem saldo diferente de zero
        if (saldoTotal !== 0) {
            log.info(`  ${user.id}: R$ ${saldoTotal.toFixed(2)} (${tipoFinanceiro})`);
            atualizados++;
        }
    }

    // Atualizar metadata
    registry._metadata.ultima_atualizacao = new Date().toISOString();

    // Salvar arquivo
    log.info('Salvando arquivo atualizado...');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    log.success('Arquivo salvo!');

    // Resumo
    console.log('\n========================================');
    console.log('  RESUMO');
    console.log('========================================');
    console.log(`  Total usuários: ${registry.users?.length || 0}`);
    console.log(`  Com saldo atualizado: ${atualizados}`);
    console.log(`  Credores: ${credores}`);
    console.log(`  Devedores: ${devedores}`);
    console.log(`  Zerados: ${zerados}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    log.success('Concluído!');
}

main().catch(err => {
    log.error(err.message);
    process.exit(1);
});
