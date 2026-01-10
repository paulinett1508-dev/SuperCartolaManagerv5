#!/usr/bin/env node
/**
 * CORRIGIR HALL DA FAMA - Script de Correção de Dados
 *
 * Este script corrige o arquivo users_registry.json com base nos dados
 * reais do MongoDB (rankinggeralcaches).
 *
 * Problemas corrigidos:
 * 1. Posições erradas no users_registry.json
 * 2. Participantes faltantes da liga Sobral
 * 3. Campo 'id' faltando em registros
 * 4. Badges de conquistas não atribuídos
 *
 * @version 1.0.0
 * @date 2025-12-26
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
    LIGAS: {
        SUPERCARTOLA: {
            id: '684cb1c8af923da7c7df51de',
            nome: 'SUPERCARTOLA',
            totalParticipantes: 32
        },
        SOBRAL: {
            id: '684d821cf1a7ae16d1f89572',
            nome: 'SOBRAL',
            totalParticipantes: 6
        }
    },
    PATHS: {
        USERS_REGISTRY: join(ROOT_DIR, 'data', 'users_registry.json'),
        BACKUP: join(ROOT_DIR, 'data', 'users_registry.backup.json')
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
    console.log('\n' + '='.repeat(60));
    console.log('  CORRIGIR HALL DA FAMA - Script de Correção');
    console.log('='.repeat(60) + '\n');

    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

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

    // Buscar ranking real de todas as ligas
    const rankingsDB = {};
    const ligasDB = {};
    const extratosDB = {};

    for (const [key, liga] of Object.entries(CONFIG.LIGAS)) {
        log.info(`Buscando dados da liga: ${liga.nome}`);

        // Ranking Geral
        const ranking = await db.collection('rankinggeralcaches').findOne({
            $or: [
                { ligaId: liga.id },
                { ligaId: new mongoose.Types.ObjectId(liga.id) }
            ]
        });

        if (ranking && ranking.ranking && ranking.ranking[0]?.timeId) {
            rankingsDB[liga.id] = ranking.ranking;
            log.success(`  Ranking: ${ranking.ranking.length} participantes`);
        } else {
            // Ranking inválido ou sem timeIds - usar dados da liga diretamente
            log.warn(`  Ranking não encontrado ou inválido para ${liga.nome}`);
            log.info(`  Tentando usar participantes da collection 'ligas'...`);
            rankingsDB[liga.id] = [];
        }

        // Liga info
        const ligaInfo = await db.collection('ligas').findOne({
            $or: [
                { _id: liga.id },
                { _id: new mongoose.Types.ObjectId(liga.id) }
            ]
        });

        if (ligaInfo) {
            ligasDB[liga.id] = ligaInfo;
            log.success(`  Liga: ${ligaInfo.nome} - ${ligaInfo.participantes?.length || 0} participantes`);

            // Se não temos ranking válido, criar a partir dos participantes da liga
            if (rankingsDB[liga.id].length === 0 && ligaInfo.participantes?.length > 0) {
                log.info(`  Construindo ranking a partir dos participantes da liga...`);
                const participantesOrdenados = ligaInfo.participantes.map((p, i) => ({
                    timeId: p.time_id,
                    nome_cartola: p.nome_cartola || 'N/D',
                    nome_time: p.nome_time || 'N/D',
                    escudo: p.foto_time || '',
                    pontos_totais: 0,
                    rodadas_jogadas: 38,
                    posicao: i + 1 // Posição provisória
                }));
                rankingsDB[liga.id] = participantesOrdenados;
                log.success(`  Ranking construído: ${participantesOrdenados.length} participantes`);
            }
        }

        // Extratos Financeiros - filtrar por temporada 2025
        const extratos = await db.collection('extratofinanceirocaches').find({
            $or: [
                { liga_id: liga.id },
                { ligaId: liga.id },
                { ligaId: new mongoose.Types.ObjectId(liga.id) }
            ],
            temporada: 2025  // ✅ v1.1: Filtrar apenas temporada 2025
        }).toArray();

        // ✅ v1.1: Buscar campos manuais para incluir no saldo
        const camposManuais = await db.collection('fluxofinanceirocampos').find({
            ligaId: liga.id
        }).toArray();
        
        // Criar mapa de campos manuais por timeId
        const camposManuaisMap = {};
        for (const doc of camposManuais) {
            const timeId = String(doc.timeId);
            let totalCampos = 0;
            if (doc.campos && Array.isArray(doc.campos)) {
                doc.campos.forEach(c => {
                    totalCampos += c.valor || 0;
                });
            }
            camposManuaisMap[timeId] = totalCampos;
        }
        log.success(`  Campos Manuais: ${camposManuais.length} registros`);

        extratosDB[liga.id] = {};
        for (const ext of extratos) {
            const timeId = String(ext.time_id || ext.timeId);
            const saldoExtrato = ext.resumo?.saldo_final ?? ext.resumo?.saldo ?? ext.saldo_consolidado ?? 0;
            const saldoCampos = camposManuaisMap[timeId] || 0;
            
            extratosDB[liga.id][timeId] = {
                saldo: saldoExtrato + saldoCampos,  // ✅ Incluir campos manuais no saldo
                saldo_extrato: saldoExtrato,
                saldo_campos_manuais: saldoCampos,
                ganhos: ext.resumo?.totalGanhos ?? ext.ganhos_consolidados ?? 0,
                perdas: ext.resumo?.totalPerdas ?? ext.perdas_consolidadas ?? 0
            };
        }
        log.success(`  Extratos: ${extratos.length} registros`);
    }

    // =========================================================================
    // STEP 2: Carregar users_registry.json atual
    // =========================================================================
    log.step(2, 'CARREGAR USERS_REGISTRY.JSON');

    let registry = { _metadata: {}, config_renovacao: {}, users: [] };

    if (existsSync(CONFIG.PATHS.USERS_REGISTRY)) {
        const content = readFileSync(CONFIG.PATHS.USERS_REGISTRY, 'utf-8');
        registry = JSON.parse(content);
        log.success(`Arquivo carregado: ${registry.users?.length || 0} usuários`);

        // Fazer backup
        if (!isDryRun) {
            writeFileSync(CONFIG.PATHS.BACKUP, content);
            log.success('Backup salvo em users_registry.backup.json');
        }
    } else {
        log.warn('Arquivo não encontrado - será criado do zero');
    }

    // =========================================================================
    // STEP 3: Identificar e corrigir problemas
    // =========================================================================
    log.step(3, 'IDENTIFICAR E CORRIGIR PROBLEMAS');

    const problemas = [];
    const correcoes = [];

    // Mapear usuários existentes por ID
    const usuariosPorId = new Map();
    for (const user of registry.users || []) {
        if (user.id) {
            usuariosPorId.set(String(user.id), user);
        }
    }

    // Verificar cada liga
    for (const [key, liga] of Object.entries(CONFIG.LIGAS)) {
        log.info(`\nAnalisando liga: ${liga.nome}`);

        const ranking = rankingsDB[liga.id] || [];
        const ligaInfo = ligasDB[liga.id];

        if (ranking.length === 0) {
            log.warn(`  Liga ${liga.nome} não tem ranking - verificar dados`);
            continue;
        }

        // Verificar cada participante do ranking
        for (let i = 0; i < ranking.length; i++) {
            const participante = ranking[i];
            const posicaoReal = participante.posicao || (i + 1);
            const timeId = String(participante.timeId);

            // Verificar se existe no registry
            let usuario = usuariosPorId.get(timeId);

            if (!usuario) {
                // Participante não existe - criar
                problemas.push({
                    tipo: 'PARTICIPANTE_FALTANDO',
                    liga: liga.nome,
                    timeId,
                    nome: participante.nome_cartola || 'Desconhecido',
                    posicao: posicaoReal
                });

                // Buscar info de atividade do participante
                const participanteInfoNovo = ligaInfo?.participantes?.find(p =>
                    String(p.time_id) === timeId
                );
                usuario = criarNovoUsuario(timeId, participante, liga, posicaoReal, participanteInfoNovo);
                registry.users.push(usuario);
                usuariosPorId.set(timeId, usuario);

                correcoes.push(`Criado usuário ${timeId} (${participante.nome_cartola}) - ${liga.nome} - ${posicaoReal}º`);
                continue;
            }

            // Verificar histórico da liga
            let historico = usuario.historico?.find(h =>
                h.ano === 2025 && String(h.liga_id) === liga.id
            );

            if (!historico) {
                // Adicionar histórico da liga
                if (!usuario.historico) usuario.historico = [];

                historico = {
                    ano: 2025,
                    liga_id: liga.id,
                    liga_nome: liga.nome,
                    time_escudo: participante.escudo || '',
                    estatisticas: {
                        posicao_final: posicaoReal,
                        pontos_totais: participante.pontos_totais || 0,
                        rodadas_jogadas: participante.rodadas_jogadas || 38
                    },
                    financeiro: {
                        saldo_final: 0,
                        total_bonus: 0,
                        total_onus: 0
                    },
                    conquistas: {
                        badges: []
                    }
                };

                usuario.historico.push(historico);
                correcoes.push(`Adicionado histórico ${liga.nome} para ${timeId}`);
            }

            // Verificar posição
            if (historico.estatisticas?.posicao_final !== posicaoReal) {
                const posicaoAntiga = historico.estatisticas?.posicao_final;
                problemas.push({
                    tipo: 'POSICAO_ERRADA',
                    liga: liga.nome,
                    timeId,
                    posicaoAntiga,
                    posicaoReal
                });

                if (!historico.estatisticas) historico.estatisticas = {};
                historico.estatisticas.posicao_final = posicaoReal;
                historico.estatisticas.pontos_totais = participante.pontos_totais || 0;
                historico.estatisticas.rodadas_jogadas = participante.rodadas_jogadas || 38;

                correcoes.push(`Corrigida posição ${timeId}: ${posicaoAntiga}º -> ${posicaoReal}º (${liga.nome})`);
            }

            // Atualizar escudo
            if (participante.escudo && !historico.time_escudo) {
                historico.time_escudo = participante.escudo;
            }

            // Corrigir nome "Desconhecido"
            if (usuario.nome === 'Desconhecido' && participante.nome_cartola) {
                const nomeAntigo = usuario.nome;
                usuario.nome = participante.nome_cartola;
                correcoes.push(`Corrigido nome ${timeId}: "${nomeAntigo}" -> "${participante.nome_cartola}"`);
            }

            // Atualizar badges baseado na posição
            const badges = [];
            if (posicaoReal === 1) badges.push('campeao_2025');
            if (posicaoReal === 2) badges.push('vice_2025');
            if (posicaoReal === 3) badges.push('terceiro_2025');

            if (badges.length > 0) {
                if (!historico.conquistas) historico.conquistas = {};
                historico.conquistas.badges = badges;
            }

            // Verificar status de atividade (participantes inativos)
            const participanteInfo = ligaInfo?.participantes?.find(p =>
                String(p.time_id) === timeId
            );

            if (participanteInfo) {
                const isAtivo = participanteInfo.ativo !== false;
                const rodadaDesistencia = participanteInfo.rodada_desistencia || null;

                if (!isAtivo) {
                    historico.status = {
                        ativo: false,
                        rodada_desistencia: rodadaDesistencia
                    };

                    if (!historico.observacoes) historico.observacoes = [];
                    const msgDesistencia = rodadaDesistencia
                        ? `Desistiu na rodada ${rodadaDesistencia}`
                        : 'Participante inativo';

                    if (!historico.observacoes.includes(msgDesistencia)) {
                        historico.observacoes.push(msgDesistencia);
                        correcoes.push(`Marcado como inativo: ${timeId} (${participante.nome_cartola}) - R${rodadaDesistencia}`);
                    }
                } else {
                    historico.status = { ativo: true, rodada_desistencia: null };
                }
            }

            // Atualizar stats agregadas
            if (!usuario.stats_agregadas) usuario.stats_agregadas = {};

            const melhorPosicao = Math.min(
                usuario.stats_agregadas.melhor_posicao_geral || 999,
                posicaoReal
            );
            usuario.stats_agregadas.melhor_posicao_geral = melhorPosicao;
            usuario.stats_agregadas.total_temporadas = 1;
            usuario.stats_agregadas.total_titulos = posicaoReal === 1 ? 1 : 0;

            // Atualizar dados financeiros
            const extrato = extratosDB[liga.id]?.[timeId];
            if (extrato) {
                historico.financeiro = {
                    saldo_final: extrato.saldo,
                    saldo_extrato: extrato.saldo_extrato || extrato.saldo,  // ✅ v1.1: Detalhar saldo do extrato
                    saldo_campos_manuais: extrato.saldo_campos_manuais || 0,  // ✅ v1.1: Detalhar campos manuais
                    total_bonus: extrato.ganhos,
                    total_onus: extrato.perdas
                };
            }

            // Garantir que ligas_participadas está atualizado
            if (!usuario.ligas_participadas) usuario.ligas_participadas = [];
            const ligaParticipada = usuario.ligas_participadas.find(l => l.liga_id === liga.id);
            if (!ligaParticipada) {
                usuario.ligas_participadas.push({
                    liga_id: liga.id,
                    liga_nome: liga.nome,
                    temporadas: ['2025']
                });
            }
        }
    }

    // =========================================================================
    // STEP 4: Verificar registros sem ID
    // =========================================================================
    log.step(4, 'VERIFICAR REGISTROS SEM ID');

    for (let i = 0; i < registry.users.length; i++) {
        const user = registry.users[i];
        if (!user.id) {
            problemas.push({
                tipo: 'REGISTRO_SEM_ID',
                index: i,
                nome: user.nome
            });

            // Tentar extrair ID do histórico
            const historico = user.historico?.[0];
            if (historico) {
                // Buscar no ranking
                for (const [ligaId, ranking] of Object.entries(rankingsDB)) {
                    const found = ranking.find(r =>
                        r.posicao === historico.estatisticas?.posicao_final
                    );
                    if (found) {
                        user.id = String(found.timeId);
                        correcoes.push(`Atribuído ID ${user.id} ao registro index ${i}`);
                        break;
                    }
                }
            }
        }
    }

    // =========================================================================
    // STEP 5: Relatório
    // =========================================================================
    log.step(5, 'RELATÓRIO');

    console.log('\n--- PROBLEMAS ENCONTRADOS ---');
    if (problemas.length === 0) {
        log.success('Nenhum problema encontrado!');
    } else {
        for (const p of problemas) {
            if (p.tipo === 'POSICAO_ERRADA') {
                log.warn(`[${p.liga}] ${p.timeId}: Posição ${p.posicaoAntiga}º -> ${p.posicaoReal}º`);
            } else if (p.tipo === 'PARTICIPANTE_FALTANDO') {
                log.warn(`[${p.liga}] ${p.timeId} (${p.nome}): Não existia - criado como ${p.posicao}º`);
            } else if (p.tipo === 'REGISTRO_SEM_ID') {
                log.warn(`Index ${p.index}: Registro sem ID`);
            }
        }
    }

    console.log('\n--- CORREÇÕES APLICADAS ---');
    if (correcoes.length === 0) {
        log.info('Nenhuma correção necessária');
    } else {
        for (const c of correcoes) {
            log.success(c);
        }
    }

    // =========================================================================
    // STEP 6: Salvar arquivo corrigido
    // =========================================================================
    log.step(6, 'SALVAR ARQUIVO');

    // Atualizar metadata
    registry._metadata.ultima_atualizacao = new Date().toISOString();
    registry._metadata.versao = '2.1.0';
    registry._metadata.correcoes_aplicadas = correcoes.length;

    if (isDryRun) {
        log.warn('DRY-RUN: Arquivo NÃO foi salvo');
        log.info(`Total de ${correcoes.length} correções seriam aplicadas`);
    } else {
        writeFileSync(
            CONFIG.PATHS.USERS_REGISTRY,
            JSON.stringify(registry, null, 2)
        );
        log.success('Arquivo salvo com sucesso!');
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('  RESUMO');
    console.log('='.repeat(60));
    console.log(`  Total usuários: ${registry.users.length}`);
    console.log(`  Problemas encontrados: ${problemas.length}`);
    console.log(`  Correções aplicadas: ${correcoes.length}`);
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    log.success('Concluído!');
}

// =============================================================================
// HELPER: Criar novo usuário
// =============================================================================

function criarNovoUsuario(timeId, participante, liga, posicao, participanteInfo = null) {
    const badges = [];
    if (posicao === 1) badges.push('campeao_2025');
    if (posicao === 2) badges.push('vice_2025');
    if (posicao === 3) badges.push('terceiro_2025');

    // Verificar status de atividade
    const isAtivo = participanteInfo?.ativo !== false;
    const rodadaDesistencia = participanteInfo?.rodada_desistencia || null;

    // Construir objeto de histórico
    const historicoObj = {
        ano: 2025,
        liga_id: liga.id,
        liga_nome: liga.nome,
        time_escudo: participante.escudo || '',
        estatisticas: {
            posicao_final: posicao,
            pontos_totais: participante.pontos_totais || 0,
            rodadas_jogadas: participante.rodadas_jogadas || 38
        },
        financeiro: {
            saldo_final: 0,
            total_bonus: 0,
            total_onus: 0
        },
        conquistas: {
            badges
        },
        status: {
            ativo: isAtivo,
            rodada_desistencia: rodadaDesistencia
        }
    };

    // Adicionar observação se inativo
    if (!isAtivo) {
        historicoObj.observacoes = [
            rodadaDesistencia
                ? `Desistiu na rodada ${rodadaDesistencia}`
                : 'Participante inativo'
        ];
    }

    return {
        id: timeId,
        nome: participante.nome_cartola || 'Desconhecido',
        email: null,
        telefone: null,
        primeiro_registro: '2025',
        active_seasons: ['2025'],
        status_renovacao: {
            temporada_2026: {
                status: 'pendente',
                data_decisao: null,
                observacoes: null
            }
        },
        situacao_financeira: {
            saldo_atual: 0,
            tipo: 'zerado',
            detalhamento: {
                temporada_2025: {
                    saldo_extrato: 0,
                    saldo_campos_manuais: 0,
                    saldo_final: 0,
                    total_bonus: 0,
                    total_onus: 0,
                    quitado: false,
                    data_quitacao: null
                }
            },
            historico_pagamentos: []
        },
        ligas_participadas: [{
            liga_id: liga.id,
            liga_nome: liga.nome,
            temporadas: ['2025']
        }],
        historico: [historicoObj],
        stats_agregadas: {
            total_temporadas: 1,
            total_titulos: posicao === 1 ? 1 : 0,
            melhor_posicao_geral: posicao,
            total_pontos_historico: participante.pontos_totais || 0
        },
        acesso_permitido: {
            hall_da_fama: true,
            extrato_financeiro: true,
            temporada_atual: false
        }
    };
}

// =============================================================================
// EXECUÇÃO
// =============================================================================

main().catch(err => {
    log.error(err.message);
    console.error(err);
    process.exit(1);
});
