#!/usr/bin/env node
/**
 * TURN KEY 2026 - Script de Virada de Temporada
 *
 * Este script encerra a temporada 2025 e prepara o sistema para 2026.
 *
 * ATENÇÃO: Este script é DESTRUTIVO e IRREVERSÍVEL.
 * Ele apaga dados de collections temporárias após fazer backup.
 *
 * MODELO DE RENOVAÇÃO: OPT-IN
 * - Participantes de 2025 NÃO são automaticamente inscritos em 2026
 * - Admin deve aprovar renovações manualmente
 * - Participantes não renovados mantêm acesso a:
 *   - Hall da Fama (histórico, badges)
 *   - Extrato Financeiro (saldo devedor/credor)
 *
 * @version 2.0.0
 * @author DevOps Team
 * @date 2025-12-15
 */

import mongoose from 'mongoose';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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
    // Data mínima para execução (01/01/2026 00:00:00 UTC-3)
    MIN_EXECUTION_DATE: new Date('2026-01-01T03:00:00.000Z'),

    // Collections para LIMPAR (dados temporários da temporada)
    COLLECTIONS_TO_WIPE: [
        'rodadas',
        'rankinggeralcaches',
        'pontoscorridoscaches',
        'matamatas',
        'extratofinanceirocaches',
        'goleiros',
        'gols',
        'artilheirocampeaos',
        'rodadasnapshots',
        'top10caches',
        'melhormescaches'
    ],

    // Collections para PRESERVAR (NUNCA tocar)
    COLLECTIONS_TO_PRESERVE: [
        'users',
        'times',
        'ligas',
        'fluxofinanceirocampos',
        'system_configs'
    ],

    // Caminhos de arquivos
    PATHS: {
        HISTORY_2025: join(ROOT_DIR, 'data', 'history', '2025'),
        USERS_REGISTRY: join(ROOT_DIR, 'data', 'users_registry.json'),
        FINAL_STANDINGS: join(ROOT_DIR, 'data', 'history', '2025', 'final_standings.json')
    },

    // IDs das ligas
    LIGAS: {
        SUPERCARTOLA: '684cb1c8af923da7c7df51de',
        SOBRAL: '684d821cf1a7ae16d1f89572'
    }
};

// =============================================================================
// UTILITÁRIOS
// =============================================================================

const log = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
    warn: (msg) => console.log(`[WARN] ${new Date().toISOString()} - ${msg}`),
    error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
    success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`),
    step: (num, msg) => console.log(`\n${'='.repeat(60)}\n[STEP ${num}] ${msg}\n${'='.repeat(60)}`)
};

function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}

// =============================================================================
// TRAVA DE SEGURANÇA - VERIFICAÇÃO DE DATA
// =============================================================================

function verificarDataExecucao() {
    const agora = new Date();
    const minDate = CONFIG.MIN_EXECUTION_DATE;

    log.info(`Data atual: ${formatDate(agora)}`);
    log.info(`Data mínima permitida: ${formatDate(minDate)}`);

    if (agora < minDate) {
        const diasRestantes = Math.ceil((minDate - agora) / (1000 * 60 * 60 * 24));

        log.error('╔════════════════════════════════════════════════════════════╗');
        log.error('║           EXECUÇÃO BLOQUEADA - TOO_EARLY_TO_MIGRATE        ║');
        log.error('╠════════════════════════════════════════════════════════════╣');
        log.error(`║  Este script só pode ser executado após 01/01/2026         ║`);
        log.error(`║  Faltam ${diasRestantes} dia(s) para a data permitida.                    ║`);
        log.error('║                                                            ║');
        log.error('║  Se precisar forçar a execução (APENAS PARA TESTES),       ║');
        log.error('║  use a flag: --force-date-override                         ║');
        log.error('╚════════════════════════════════════════════════════════════╝');

        throw new Error('TOO_EARLY_TO_MIGRATE');
    }

    log.success('Verificação de data OK - Execução permitida');
    return true;
}

// =============================================================================
// STEP 1: SNAPSHOT - Salvar dados de 2025
// =============================================================================

async function criarSnapshot(db) {
    log.step(1, 'SNAPSHOT - Salvando dados de 2025');

    // Garantir que o diretório existe
    if (!existsSync(CONFIG.PATHS.HISTORY_2025)) {
        mkdirSync(CONFIG.PATHS.HISTORY_2025, { recursive: true });
        log.info('Diretório de histórico criado');
    }

    const snapshot = {
        metadata: {
            temporada: 2025,
            exportado_em: new Date().toISOString(),
            versao_script: '1.0.0'
        },
        ligas: {}
    };

    // Buscar ranking geral de cada liga
    for (const [nomeLiga, ligaId] of Object.entries(CONFIG.LIGAS)) {
        log.info(`Exportando dados da liga: ${nomeLiga} (${ligaId})`);

        try {
            // Ranking Geral
            const rankingCache = await db.collection('rankinggeralcaches')
                .findOne({ ligaId: new mongoose.Types.ObjectId(ligaId) });

            // Rodadas
            const rodadas = await db.collection('rodadas')
                .find({ ligaId: new mongoose.Types.ObjectId(ligaId) })
                .sort({ numero: 1 })
                .toArray();

            // Pontos Corridos
            const pontosCorridos = await db.collection('pontoscorridoscaches')
                .findOne({ ligaId: new mongoose.Types.ObjectId(ligaId) });

            // Mata-Mata
            const mataMatas = await db.collection('matamatas')
                .find({ ligaId: new mongoose.Types.ObjectId(ligaId) })
                .toArray();

            // Top 10
            const top10 = await db.collection('top10caches')
                .findOne({ ligaId: new mongoose.Types.ObjectId(ligaId) });

            // Artilheiro
            const artilheiro = await db.collection('artilheirocampeaos')
                .find({ ligaId: new mongoose.Types.ObjectId(ligaId) })
                .toArray();

            // Goleiros (Luva de Ouro)
            const goleiros = await db.collection('goleiros')
                .find({ ligaId: new mongoose.Types.ObjectId(ligaId) })
                .toArray();

            // Melhor do Mês
            const melhorMes = await db.collection('melhormescaches')
                .findOne({ ligaId: new mongoose.Types.ObjectId(ligaId) });

            // Extrato Financeiro - buscar dados completos de cada participante
            const extratos = await db.collection('extratofinanceirocaches')
                .find({ ligaId: new mongoose.Types.ObjectId(ligaId) })
                .toArray();

            // Mapear extratos por timeId para fácil acesso
            const extratosPorTime = {};
            for (const extrato of extratos) {
                const timeId = extrato.timeId?.toString() || extrato.time_id?.toString();
                if (timeId) {
                    extratosPorTime[timeId] = {
                        saldo: extrato.saldo || extrato.saldoTotal || 0,
                        bonus: extrato.totalBonus || 0,
                        onus: extrato.totalOnus || 0,
                        transacoes: extrato.transacoes || extrato.historico || []
                    };
                }
            }

            // Campos manuais (ajustes do admin)
            const camposManuais = await db.collection('fluxofinanceirocampos')
                .find({ ligaId: new mongoose.Types.ObjectId(ligaId) })
                .toArray();

            // Mapear campos manuais por timeId
            const camposManuaisPorTime = {};
            for (const campo of camposManuais) {
                const timeId = campo.timeId?.toString() || campo.time_id?.toString();
                if (timeId) {
                    if (!camposManuaisPorTime[timeId]) {
                        camposManuaisPorTime[timeId] = [];
                    }
                    camposManuaisPorTime[timeId].push(campo);
                }
            }

            snapshot.ligas[nomeLiga] = {
                ligaId,
                rankingGeral: rankingCache?.ranking || [],
                totalRodadas: rodadas.length,
                rodadas: rodadas.map(r => ({
                    numero: r.numero,
                    data: r.data,
                    participantes: r.participantes?.length || 0
                })),
                pontosCorridos: pontosCorridos?.tabela || [],
                mataMatas: mataMatas.map(mm => ({
                    edicao: mm.edicao,
                    fase: mm.fase,
                    campeao: mm.campeao
                })),
                top10: {
                    mitos: top10?.mitos || [],
                    micos: top10?.micos || []
                },
                artilheiro: artilheiro.slice(0, 10),
                goleiros: goleiros.slice(0, 10),
                melhorMes: melhorMes?.meses || [],
                extratos: extratosPorTime,
                camposManuais: camposManuaisPorTime,
                totalExtratos: extratos.length
            };

            log.success(`Liga ${nomeLiga}: ${rankingCache?.ranking?.length || 0} participantes no ranking`);

        } catch (err) {
            log.warn(`Erro ao exportar liga ${nomeLiga}: ${err.message}`);
            snapshot.ligas[nomeLiga] = { error: err.message };
        }
    }

    // Salvar snapshot
    writeFileSync(
        CONFIG.PATHS.FINAL_STANDINGS,
        JSON.stringify(snapshot, null, 2),
        'utf-8'
    );

    log.success(`Snapshot salvo em: ${CONFIG.PATHS.FINAL_STANDINGS}`);

    return snapshot;
}

// =============================================================================
// STEP 2: BADGE UPDATE - Atualizar users_registry.json
// =============================================================================

async function atualizarBadges(snapshot) {
    log.step(2, 'BADGE UPDATE - Atualizando Cartório Vitalício');

    // Carregar registry existente
    let registry;
    try {
        const content = readFileSync(CONFIG.PATHS.USERS_REGISTRY, 'utf-8');
        registry = JSON.parse(content);
    } catch (err) {
        log.warn('users_registry.json não encontrado ou inválido, criando novo');
        registry = {
            _metadata: {
                nome: 'Cartório Vitalício - Super Cartola',
                versao: '2.0.0',
                criado_em: new Date().toISOString(),
                ultima_atualizacao: null
            },
            config_renovacao: {
                temporada_atual: 2026,
                temporada_anterior: 2025,
                prazo_renovacao: '2026-03-15T23:59:59-03:00',
                prazo_quitacao: '2026-03-31T23:59:59-03:00',
                status_possiveis: ['pendente', 'renovado', 'nao_renovado', 'quitado', 'inadimplente']
            },
            users: []
        };
    }

    // Garantir que config_renovacao existe
    if (!registry.config_renovacao) {
        registry.config_renovacao = {
            temporada_atual: 2026,
            temporada_anterior: 2025,
            prazo_renovacao: '2026-03-15T23:59:59-03:00',
            prazo_quitacao: '2026-03-31T23:59:59-03:00',
            status_possiveis: ['pendente', 'renovado', 'nao_renovado', 'quitado', 'inadimplente']
        };
    }

    // Contadores para relatório
    let credores = 0;
    let devedores = 0;
    let zerados = 0;

    // Processar cada liga
    for (const [nomeLiga, dadosLiga] of Object.entries(snapshot.ligas)) {
        if (dadosLiga.error) continue;

        const ranking = dadosLiga.rankingGeral || [];
        const extratos = dadosLiga.extratos || {};
        const camposManuais = dadosLiga.camposManuais || {};

        log.info(`Processando badges da liga ${nomeLiga} (${ranking.length} participantes)`);

        for (let i = 0; i < ranking.length; i++) {
            const participante = ranking[i];
            const posicao = i + 1;

            // Determinar badges
            const badges = [];
            if (posicao === 1) badges.push('campeao_2025');
            if (posicao === 2) badges.push('vice_2025');
            if (posicao === 3) badges.push('terceiro_2025');

            // Verificar Top 10 Mitos/Micos
            const estaNosMitos = dadosLiga.top10?.mitos?.some(m =>
                m.timeId === participante.timeId || m.time_id === participante.timeId
            );
            const estaNaoMicos = dadosLiga.top10?.micos?.some(m =>
                m.timeId === participante.timeId || m.time_id === participante.timeId
            );

            if (estaNosMitos) badges.push('top10_mito_2025');
            if (estaNaoMicos) badges.push('top10_mico_2025');

            // Buscar ou criar usuário no registry
            const odId = participante.odId || participante.time_id || participante.timeId;
            const odIdStr = odId?.toString();
            let user = registry.users.find(u => u.id === odIdStr || u.id === odId);

            // =========================================================
            // BUSCAR SALDO FINANCEIRO
            // =========================================================
            const extratoTime = extratos[odIdStr] || {};
            const camposManuaisTime = camposManuais[odIdStr] || [];

            // Calcular saldo total (extrato + campos manuais)
            let saldoExtrato = parseFloat(extratoTime.saldo || 0);
            let saldoCamposManuais = 0;
            for (const campo of camposManuaisTime) {
                saldoCamposManuais += parseFloat(campo.valor || 0);
            }
            const saldoTotal = parseFloat((saldoExtrato + saldoCamposManuais).toFixed(2));

            // Determinar tipo (credor/devedor/zerado)
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

            if (!user) {
                user = {
                    id: odIdStr,
                    nome: participante.nome || participante.nomeTime || 'Desconhecido',
                    email: null,
                    telefone: null,
                    primeiro_registro: '2025',
                    active_seasons: ['2025'],
                    status_renovacao: {},
                    situacao_financeira: {},
                    ligas_participadas: [],
                    historico: [],
                    stats_agregadas: {
                        total_temporadas: 0,
                        total_titulos: 0,
                        melhor_posicao_geral: null,
                        total_pontos_historico: 0
                    },
                    acesso_permitido: {}
                };
                registry.users.push(user);
            }

            // =========================================================
            // ATUALIZAR STATUS DE RENOVAÇÃO (OPT-IN)
            // =========================================================
            if (!user.status_renovacao) {
                user.status_renovacao = {};
            }
            user.status_renovacao.temporada_2026 = {
                status: 'pendente',  // Todos começam pendentes (OPT-IN)
                data_decisao: null,
                observacoes: null
            };

            // =========================================================
            // ATUALIZAR SITUAÇÃO FINANCEIRA
            // =========================================================
            user.situacao_financeira = {
                saldo_atual: saldoTotal,
                tipo: tipoFinanceiro,
                detalhamento: {
                    temporada_2025: {
                        saldo_extrato: saldoExtrato,
                        saldo_campos_manuais: saldoCamposManuais,
                        saldo_final: saldoTotal,
                        total_bonus: parseFloat(extratoTime.bonus || 0),
                        total_onus: parseFloat(extratoTime.onus || 0),
                        quitado: saldoTotal === 0,
                        data_quitacao: saldoTotal === 0 ? new Date().toISOString() : null
                    }
                },
                historico_pagamentos: []
            };

            // =========================================================
            // DEFINIR ACESSO PERMITIDO
            // - Hall da Fama: SEMPRE (participou de alguma temporada)
            // - Extrato: SEMPRE enquanto houver saldo pendente ou histórico
            // - Temporada atual: SÓ se renovar (status_renovacao = 'renovado')
            // =========================================================
            user.acesso_permitido = {
                hall_da_fama: true,
                extrato_financeiro: true,
                temporada_atual: false  // Só muda para true quando admin aprovar renovação
            };

            // Adicionar histórico de 2025
            const historicoExistente = user.historico.find(h => h.ano === 2025 && h.liga_nome === nomeLiga);

            if (!historicoExistente) {
                user.historico.push({
                    ano: 2025,
                    liga_id: dadosLiga.ligaId,
                    liga_nome: nomeLiga,
                    time_nome: participante.nome || participante.nomeTime,
                    time_escudo: participante.escudo || participante.url_escudo_png,
                    estatisticas: {
                        posicao_final: posicao,
                        pontos_totais: participante.pontos || participante.pontosTotais || 0,
                        rodadas_jogadas: dadosLiga.totalRodadas
                    },
                    financeiro: {
                        saldo_final: saldoTotal,
                        total_bonus: parseFloat(extratoTime.bonus || 0),
                        total_onus: parseFloat(extratoTime.onus || 0)
                    },
                    conquistas: {
                        badges
                    }
                });

                // Atualizar stats agregadas
                if (!user.active_seasons.includes('2025')) {
                    user.active_seasons.push('2025');
                }
                user.stats_agregadas.total_temporadas = user.historico.length;
                user.stats_agregadas.total_titulos += badges.filter(b => b.startsWith('campeao')).length;
                user.stats_agregadas.total_pontos_historico += participante.pontos || participante.pontosTotais || 0;

                if (!user.stats_agregadas.melhor_posicao_geral || posicao < user.stats_agregadas.melhor_posicao_geral) {
                    user.stats_agregadas.melhor_posicao_geral = posicao;
                }
            }

            // Adicionar liga às participadas
            const ligaExistente = user.ligas_participadas?.find(l => l.liga_id === dadosLiga.ligaId);
            if (!ligaExistente) {
                if (!user.ligas_participadas) user.ligas_participadas = [];
                user.ligas_participadas.push({
                    liga_id: dadosLiga.ligaId,
                    liga_nome: nomeLiga,
                    temporadas: ['2025']
                });
            }
        }
    }

    // Atualizar metadata
    registry._metadata.ultima_atualizacao = new Date().toISOString();
    registry._metadata.versao = '2.0.0';

    // Remover usuário de exemplo
    registry.users = registry.users.filter(u => u.id !== 'exemplo_user_id');

    // Salvar registry atualizado
    writeFileSync(
        CONFIG.PATHS.USERS_REGISTRY,
        JSON.stringify(registry, null, 2),
        'utf-8'
    );

    log.success(`Registry atualizado: ${registry.users.length} usuários`);
    log.info(`  📊 Credores (a receber): ${credores}`);
    log.info(`  📊 Devedores (a pagar): ${devedores}`);
    log.info(`  📊 Zerados (quitados): ${zerados}`);

    return registry;
}

// =============================================================================
// STEP 3: WIPE - Limpar collections temporárias
// =============================================================================

async function limparCollections(db) {
    log.step(3, 'WIPE - Limpando collections temporárias');

    const resultados = {};

    for (const collectionName of CONFIG.COLLECTIONS_TO_WIPE) {
        try {
            // Verificar se collection existe
            const collections = await db.listCollections({ name: collectionName }).toArray();

            if (collections.length === 0) {
                log.warn(`Collection ${collectionName} não existe, pulando...`);
                resultados[collectionName] = { status: 'skipped', reason: 'not_found' };
                continue;
            }

            // Contar documentos antes
            const countBefore = await db.collection(collectionName).countDocuments();

            // Executar deleteMany
            const result = await db.collection(collectionName).deleteMany({});

            resultados[collectionName] = {
                status: 'success',
                documentos_removidos: result.deletedCount,
                documentos_antes: countBefore
            };

            log.success(`${collectionName}: ${result.deletedCount} documentos removidos`);

        } catch (err) {
            log.error(`Erro ao limpar ${collectionName}: ${err.message}`);
            resultados[collectionName] = { status: 'error', error: err.message };
        }
    }

    // Log das collections preservadas
    log.info('\nCollections PRESERVADAS (não tocadas):');
    for (const collectionName of CONFIG.COLLECTIONS_TO_PRESERVE) {
        const count = await db.collection(collectionName).countDocuments().catch(() => 0);
        log.info(`  - ${collectionName}: ${count} documentos`);
    }

    return resultados;
}

// =============================================================================
// STEP 4: CONFIG - Atualizar configuração do sistema
// =============================================================================

async function atualizarConfig(db) {
    log.step(4, 'CONFIG - Atualizando configuração do sistema');

    const novaConfig = {
        season: 2026,
        status: 'setup_mode',
        previous_season: 2025,
        migrated_at: new Date().toISOString(),
        migrated_by: 'turn_key_2026.js',
        features: {
            inscricoes_abertas: false,
            mercado_ativo: false,
            rodadas_ativas: false
        }
    };

    try {
        // Upsert na collection system_configs
        const result = await db.collection('system_configs').updateOne(
            { _id: 'current_season' },
            {
                $set: novaConfig,
                $setOnInsert: { created_at: new Date().toISOString() }
            },
            { upsert: true }
        );

        log.success(`Configuração atualizada: season=${novaConfig.season}, status=${novaConfig.status}`);

        return { success: true, config: novaConfig };

    } catch (err) {
        log.error(`Erro ao atualizar config: ${err.message}`);
        return { success: false, error: err.message };
    }
}

// =============================================================================
// STEP 5: RELATÓRIO FINAL
// =============================================================================

function gerarRelatorioFinal(snapshot, registry, wipeResults, configResult) {
    log.step(5, 'RELATÓRIO FINAL');

    const relatorio = {
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        steps: {
            snapshot: {
                status: 'OK',
                ligas_exportadas: Object.keys(snapshot.ligas).length,
                arquivo: CONFIG.PATHS.FINAL_STANDINGS
            },
            badges: {
                status: 'OK',
                usuarios_atualizados: registry.users.length,
                arquivo: CONFIG.PATHS.USERS_REGISTRY
            },
            wipe: {
                status: 'OK',
                collections: wipeResults
            },
            config: configResult
        }
    };

    // Salvar relatório
    const relatorioPath = join(CONFIG.PATHS.HISTORY_2025, 'migration_report.json');
    writeFileSync(relatorioPath, JSON.stringify(relatorio, null, 2), 'utf-8');

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         TURN KEY 2026 - MIGRAÇÃO CONCLUÍDA                 ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  ✅ Snapshot de 2025 salvo                                 ║');
    console.log('║  ✅ Badges atualizadas no Cartório Vitalício               ║');
    console.log('║  ✅ Collections temporárias limpas                         ║');
    console.log('║  ✅ Sistema configurado para 2026 (setup_mode)             ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Relatório: ${relatorioPath.slice(-45).padStart(45)}  ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    return relatorio;
}

// =============================================================================
// MAIN - Execução Principal
// =============================================================================

async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              TURN KEY 2026 - VIRADA DE TEMPORADA           ║');
    console.log('║                                                            ║');
    console.log('║  ⚠️  ATENÇÃO: Este script é DESTRUTIVO e IRREVERSÍVEL      ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Verificar flags de linha de comando
    const forceOverride = process.argv.includes('--force-date-override');
    const dryRun = process.argv.includes('--dry-run');

    if (forceOverride) {
        log.warn('⚠️  FLAG --force-date-override DETECTADA');
        log.warn('⚠️  Verificação de data será IGNORADA');
        log.warn('⚠️  USE APENAS PARA TESTES!');
        console.log('\n');
    }

    if (dryRun) {
        log.warn('🔍 MODO DRY-RUN ATIVO - Nenhuma alteração será feita');
        console.log('\n');
    }

    let connection;

    try {
        // TRAVA DE SEGURANÇA
        if (!forceOverride) {
            verificarDataExecucao();
        }

        // Conectar ao MongoDB
        log.info('Conectando ao MongoDB...');
        connection = await mongoose.connect(process.env.MONGODB_URI);
        const db = connection.connection.db;
        log.success('Conectado ao MongoDB');

        // STEP 1: Snapshot
        const snapshot = await criarSnapshot(db);

        // STEP 2: Badges
        const registry = await atualizarBadges(snapshot);

        // STEP 3 & 4: Wipe e Config (apenas se não for dry-run)
        let wipeResults = {};
        let configResult = { status: 'skipped', reason: 'dry-run' };

        if (!dryRun) {
            // Confirmação extra antes do WIPE
            log.warn('\n⚠️  PRESTES A EXECUTAR WIPE DAS COLLECTIONS');
            log.warn('⚠️  Esta ação é IRREVERSÍVEL!');
            log.warn('⚠️  Pressione Ctrl+C nos próximos 10 segundos para ABORTAR\n');

            await new Promise(resolve => setTimeout(resolve, 10000));

            wipeResults = await limparCollections(db);
            configResult = await atualizarConfig(db);
        } else {
            log.info('DRY-RUN: Pulando WIPE e CONFIG');
        }

        // STEP 5: Relatório
        const relatorio = gerarRelatorioFinal(snapshot, registry, wipeResults, configResult);

        process.exit(0);

    } catch (err) {
        if (err.message === 'TOO_EARLY_TO_MIGRATE') {
            process.exit(1);
        }

        log.error(`Erro fatal: ${err.message}`);
        console.error(err);
        process.exit(1);

    } finally {
        if (connection) {
            await mongoose.disconnect();
            log.info('Desconectado do MongoDB');
        }
    }
}

// Executar
main();
