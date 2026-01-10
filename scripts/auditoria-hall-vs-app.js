#!/usr/bin/env node
/**
 * AUDITORIA: Hall da Fama vs Módulo Financeiro (App)
 *
 * Compara o saldo mostrado no Hall da Fama (admin) com o saldo
 * mostrado no Módulo Financeiro do app do participante.
 *
 * Fontes de dados:
 * - Hall da Fama: users_registry.json (atualizado por scripts)
 * - App Participante: API /api/extrato-cache/:ligaId/times/:timeId/cache
 *
 * @version 1.0.0
 * @date 2026-01-10
 */

import mongoose from 'mongoose';
import { readFileSync, existsSync } from 'fs';
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
    LIGA_ID: '684cb1c8af923da7c7df51de',  // SuperCartola
    TEMPORADA: 2025,
    PATHS: {
        USERS_REGISTRY: join(ROOT_DIR, 'data', 'users_registry.json')
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
    console.log('  AUDITORIA: Hall da Fama vs Módulo Financeiro (App)');
    console.log('  Verifica discrepâncias entre os dois sistemas');
    console.log('='.repeat(70) + '\n');

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
    // STEP 1: Carregar dados do users_registry.json (Hall da Fama)
    // =========================================================================
    log.step(1, 'CARREGAR HALL DA FAMA (users_registry.json)');

    let registry = { users: [] };
    if (existsSync(CONFIG.PATHS.USERS_REGISTRY)) {
        const content = readFileSync(CONFIG.PATHS.USERS_REGISTRY, 'utf-8');
        registry = JSON.parse(content);
        log.success(`Arquivo carregado: ${registry.users?.length || 0} usuários`);
    } else {
        log.error('users_registry.json não encontrado!');
        process.exit(1);
    }

    // Mapear por timeId - estrutura correta do users_registry.json
    const hallDaFama = new Map();
    for (const user of registry.users || []) {
        // Verificar se participa da liga via ligas_participadas
        const participaLiga = user.ligas_participadas?.some(l => l.liga_id === CONFIG.LIGA_ID);

        if (user.id && participaLiga) {
            // Saldo vem de situacao_financeira.detalhamento.temporada_XXXX
            const detTemp = user.situacao_financeira?.detalhamento?.[`temporada_${CONFIG.TEMPORADA}`] || {};
            const saldo = detTemp.saldo_final ?? detTemp.saldo_extrato ?? user.situacao_financeira?.saldo_atual ?? 0;

            hallDaFama.set(String(user.id), {
                nome: user.nome || user.nome_cartola || 'Desconhecido',
                saldo: saldo,
                detalhes: {
                    saldo_extrato: detTemp.saldo_extrato ?? 0,
                    saldo_campos_manuais: detTemp.saldo_campos_manuais ?? 0,
                    saldo_final: detTemp.saldo_final ?? 0
                }
            });
        }
    }
    log.success(`Hall da Fama: ${hallDaFama.size} participantes da liga`);

    // =========================================================================
    // STEP 2: Carregar dados do MongoDB (mesma lógica da API do App)
    // =========================================================================
    log.step(2, 'CARREGAR DADOS DO MONGODB (fonte do App)');

    // Buscar caches de extrato - usando query nativa como a API corrigida
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
        const timeId = String(c.time_id);
        cachesMap.set(timeId, c);
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
        camposMap.set(timeId, { total: totalCampos, campos: doc.campos });
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
    // STEP 3: Calcular saldo do App (mesma lógica do controller)
    // =========================================================================
    log.step(3, 'CALCULAR SALDO DO APP (mesma lógica da API)');

    const appData = new Map();

    for (const [timeId, cache] of cachesMap) {
        // Saldo consolidado das rodadas
        const saldoRodadas = cache.saldo_consolidado ?? 0;

        // Campos manuais
        const campos = camposMap.get(timeId) || { total: 0 };
        const saldoCampos = campos.total;

        // Acertos
        const acerto = acertosMap.get(timeId) || { totalPago: 0, totalRecebido: 0 };
        // Lógica: Pagamento AUMENTA saldo (quita dívida), Recebimento DIMINUI (usa crédito)
        const saldoAcertos = acerto.totalPago - acerto.totalRecebido;

        // Saldo FINAL do App = rodadas + campos manuais + acertos
        const saldoApp = saldoRodadas + saldoCampos + saldoAcertos;

        appData.set(timeId, {
            saldoRodadas,
            saldoCampos,
            saldoAcertos,
            saldoFinal: saldoApp,
            acerto
        });
    }
    log.success(`App: ${appData.size} participantes calculados`);

    // =========================================================================
    // STEP 4: Comparar e Reportar Discrepâncias
    // =========================================================================
    log.step(4, 'COMPARAR HALL DA FAMA vs APP');

    const discrepancias = [];
    const corretos = [];
    const apenasHall = [];
    const apenasApp = [];

    // Verificar todos do Hall da Fama
    for (const [timeId, hall] of hallDaFama) {
        const app = appData.get(timeId);

        if (!app) {
            apenasHall.push({ timeId, nome: hall.nome, saldoHall: hall.saldo });
            continue;
        }

        const diff = Math.abs(hall.saldo - app.saldoFinal);

        if (diff > 0.01) { // Tolerância de 1 centavo
            discrepancias.push({
                timeId,
                nome: hall.nome,
                saldoHall: hall.saldo,
                saldoApp: app.saldoFinal,
                diferenca: hall.saldo - app.saldoFinal,
                detalhes: {
                    hall: hall.detalhes,
                    app: {
                        rodadas: app.saldoRodadas,
                        campos: app.saldoCampos,
                        acertos: app.saldoAcertos
                    }
                }
            });
        } else {
            corretos.push({ timeId, nome: hall.nome, saldo: hall.saldo });
        }
    }

    // Verificar participantes que estão só no App
    for (const [timeId, app] of appData) {
        if (!hallDaFama.has(timeId)) {
            // Buscar nome do time
            const time = await db.collection('times').findOne({ id: Number(timeId) });
            apenasApp.push({
                timeId,
                nome: time?.nome_cartoleiro || 'Desconhecido',
                saldoApp: app.saldoFinal
            });
        }
    }

    // =========================================================================
    // RELATÓRIO
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('  RELATÓRIO DE AUDITORIA');
    console.log('='.repeat(70));

    console.log(`\n✅ CORRETOS: ${corretos.length} participantes`);

    if (discrepancias.length > 0) {
        console.log(`\n❌ DISCREPÂNCIAS: ${discrepancias.length} participantes\n`);
        console.log('┌─────────────────────────────────────────────────────────────────────┐');
        console.log('│ PARTICIPANTE              │ HALL FAMA  │ APP        │ DIFERENÇA    │');
        console.log('├─────────────────────────────────────────────────────────────────────┤');

        for (const d of discrepancias) {
            const nome = d.nome.substring(0, 22).padEnd(22);
            const hall = `R$ ${d.saldoHall.toFixed(2)}`.padStart(10);
            const app = `R$ ${d.saldoApp.toFixed(2)}`.padStart(10);
            const diff = `R$ ${d.diferenca.toFixed(2)}`.padStart(12);
            console.log(`│ ${nome}   │ ${hall} │ ${app} │ ${diff} │`);
        }
        console.log('└─────────────────────────────────────────────────────────────────────┘');

        console.log('\n📊 DETALHAMENTO DAS DISCREPÂNCIAS:\n');
        for (const d of discrepancias) {
            console.log(`  🔍 ${d.nome} (ID: ${d.timeId})`);
            console.log(`     Hall da Fama:`);
            console.log(`       - Saldo Extrato: R$ ${(d.detalhes.hall?.saldo_extrato ?? 'N/A')}`);
            console.log(`       - Campos Manuais: R$ ${(d.detalhes.hall?.saldo_campos_manuais ?? 'N/A')}`);
            console.log(`       - TOTAL: R$ ${d.saldoHall.toFixed(2)}`);
            console.log(`     App Participante:`);
            console.log(`       - Saldo Rodadas: R$ ${d.detalhes.app.rodadas.toFixed(2)}`);
            console.log(`       - Campos Manuais: R$ ${d.detalhes.app.campos.toFixed(2)}`);
            console.log(`       - Acertos: R$ ${d.detalhes.app.acertos.toFixed(2)}`);
            console.log(`       - TOTAL: R$ ${d.saldoApp.toFixed(2)}`);
            console.log(`     ⚠️  DIFERENÇA: R$ ${d.diferenca.toFixed(2)}\n`);
        }
    }

    if (apenasHall.length > 0) {
        console.log(`\n⚠️  APENAS NO HALL DA FAMA: ${apenasHall.length} participantes`);
        for (const p of apenasHall) {
            console.log(`   - ${p.nome} (${p.timeId}): R$ ${p.saldoHall.toFixed(2)}`);
        }
    }

    if (apenasApp.length > 0) {
        console.log(`\n⚠️  APENAS NO APP (sem cache): ${apenasApp.length} participantes`);
        for (const p of apenasApp) {
            console.log(`   - ${p.nome} (${p.timeId}): R$ ${p.saldoApp.toFixed(2)}`);
        }
    }

    // =========================================================================
    // RESUMO
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('  RESUMO FINAL');
    console.log('='.repeat(70));
    console.log(`  Total Hall da Fama: ${hallDaFama.size}`);
    console.log(`  Total App (caches): ${appData.size}`);
    console.log(`  ✅ Corretos: ${corretos.length}`);
    console.log(`  ❌ Discrepâncias: ${discrepancias.length}`);
    console.log(`  ⚠️  Apenas Hall: ${apenasHall.length}`);
    console.log(`  ⚠️  Apenas App: ${apenasApp.length}`);

    if (discrepancias.length === 0 && apenasHall.length === 0 && apenasApp.length === 0) {
        console.log('\n🎉 AUDITORIA PASSOU! Nenhuma discrepância encontrada.');
    } else {
        console.log('\n⚠️  AUDITORIA ENCONTROU PROBLEMAS! Veja detalhes acima.');
    }
    console.log('='.repeat(70) + '\n');

    await mongoose.disconnect();
    process.exit(discrepancias.length > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
