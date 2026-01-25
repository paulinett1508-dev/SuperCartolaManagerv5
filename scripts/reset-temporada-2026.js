/**
 * Script: reset-temporada-2026.js
 * Objetivo: Garantir que a temporada 2026 comece "zerada"
 * - Desabilita todos os módulos opcionais
 * - Arquiva configurações de 2025
 * - Cria ModuleConfigs para 2026 desabilitados
 *
 * Uso:
 *   node scripts/reset-temporada-2026.js --dry-run    # Simula
 *   node scripts/reset-temporada-2026.js --force      # Executa
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const isDryRun = process.argv.includes('--dry-run');
const isForced = process.argv.includes('--force');

if (!isDryRun && !isForced) {
    console.error('❌ Uso: node scripts/reset-temporada-2026.js [--dry-run|--force]');
    console.error('   --dry-run  Simula a operação sem modificar dados');
    console.error('   --force    Executa a atualização');
    process.exit(1);
}

const LIGA_ID = '684cb1c8af923da7c7df51de';

async function main() {
    console.log('🔄 Reset Temporada 2026 - Liga Super Cartola');
    console.log('=' .repeat(60));
    console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN (simulação)' : '⚡ FORCE (execução real)'}`);
    console.log();

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const ligaId = new mongoose.Types.ObjectId(LIGA_ID);

        // 1. Buscar liga atual
        const liga = await db.collection('ligas').findOne({ _id: ligaId });
        if (!liga) {
            throw new Error('Liga não encontrada!');
        }

        console.log('📋 Liga:', liga.nome);
        console.log('📅 Temporada:', liga.temporada);
        console.log();

        // 2. Mostrar módulos atuais
        console.log('📊 MÓDULOS ATUAIS:');
        console.log('------------------');
        Object.entries(liga.modulos_ativos || {}).forEach(([modulo, ativo]) => {
            console.log(`   ${modulo}: ${ativo ? '✅ ATIVO' : '🔒 Desabilitado'}`);
        });
        console.log();

        // 3. Mostrar configurações atuais
        console.log('⚙️  CONFIGURAÇÕES ATUAIS (de 2025):');
        console.log('-----------------------------------');
        if (liga.configuracoes) {
            Object.keys(liga.configuracoes).forEach(key => {
                const config = liga.configuracoes[key];
                const status = config?.habilitado !== undefined
                    ? (config.habilitado ? 'habilitado' : 'desabilitado')
                    : 'definido';
                console.log(`   ${key}: ${status}`);
            });
        }
        console.log();

        if (isDryRun) {
            console.log('🔍 DRY-RUN: Mostrando o que seria executado...\n');
        }

        // ========================================
        // AÇÃO 1: Desabilitar módulos opcionais
        // ========================================
        console.log('📌 AÇÃO 1: Desabilitar módulos opcionais');
        console.log('-----------------------------------------');

        const modulosDesabilitar = {
            'modulos_ativos.top10': false,
            'modulos_ativos.melhorMes': false,
            'modulos_ativos.pontosCorridos': false,
            'modulos_ativos.mataMata': false,
            'modulos_ativos.artilheiro': false,
            'modulos_ativos.luvaOuro': false
        };

        Object.entries(modulosDesabilitar).forEach(([path, valor]) => {
            const modulo = path.split('.')[1];
            const atual = liga.modulos_ativos?.[modulo];
            console.log(`   ${modulo}: ${atual ? 'ATIVO' : 'desab.'} → ${valor ? 'ATIVO' : 'desab.'}`);
        });

        if (!isDryRun) {
            await db.collection('ligas').updateOne(
                { _id: ligaId },
                { $set: modulosDesabilitar }
            );
            console.log('   ✅ Módulos desabilitados!\n');
        } else {
            console.log('   [DRY-RUN] Nenhuma alteração feita\n');
        }

        // ========================================
        // AÇÃO 2: Arquivar configurações 2025
        // ========================================
        console.log('📌 AÇÃO 2: Arquivar configurações 2025');
        console.log('---------------------------------------');

        const configsParaArquivar = {
            ranking_rodada: liga.configuracoes?.ranking_rodada || {},
            top10: liga.configuracoes?.top10 || {},
            pontos_corridos: liga.configuracoes?.pontos_corridos || {},
            mata_mata: liga.configuracoes?.mata_mata || {},
            melhor_mes: liga.configuracoes?.melhor_mes || {},
            artilheiro: liga.configuracoes?.artilheiro || {},
            luva_ouro: liga.configuracoes?.luva_ouro || {},
            temporada_2025: liga.configuracoes?.temporada_2025 || {},
            arquivado_em: new Date()
        };

        console.log('   Arquivando em configuracoes_historico.2025:');
        Object.keys(configsParaArquivar).forEach(key => {
            if (key !== 'arquivado_em') {
                console.log(`     - ${key}`);
            }
        });

        const novasConfigs = {
            ranking_rodada: {
                descricao: 'Aguardando configuração 2026',
                configurado: false
            },
            top10: { habilitado: false, configurado: false },
            pontos_corridos: { habilitado: false, configurado: false },
            mata_mata: { habilitado: false, configurado: false },
            melhor_mes: { habilitado: false, configurado: false },
            artilheiro: { habilitado: false, configurado: false },
            luva_ouro: { habilitado: false, configurado: false },
            temporada_2026: {
                status: 'aguardando_config',
                rodada_inicial: null,
                rodada_final: null
            }
        };

        if (!isDryRun) {
            await db.collection('ligas').updateOne(
                { _id: ligaId },
                {
                    $set: {
                        'configuracoes_historico.2025': configsParaArquivar,
                        configuracoes: novasConfigs
                    }
                }
            );
            console.log('   ✅ Configurações arquivadas e resetadas!\n');
        } else {
            console.log('   [DRY-RUN] Nenhuma alteração feita\n');
        }

        // ========================================
        // AÇÃO 3: Criar/Atualizar ModuleConfigs
        // ========================================
        console.log('📌 AÇÃO 3: Criar ModuleConfigs para 2026');
        console.log('-----------------------------------------');

        const modulos = ['top10', 'melhor_mes', 'pontos_corridos', 'mata_mata', 'ranking_rodada', 'artilheiro', 'luva_ouro'];

        for (const modulo of modulos) {
            const existente = await db.collection('moduleconfigs').findOne({
                liga_id: ligaId,
                modulo,
                temporada: 2026
            });

            console.log(`   ${modulo}: ${existente ? 'existe' : 'criar novo'} → ativo: false`);

            if (!isDryRun) {
                await db.collection('moduleconfigs').updateOne(
                    { liga_id: ligaId, modulo, temporada: 2026 },
                    {
                        $set: {
                            ativo: false,
                            configurado: false,
                            atualizado_em: new Date(),
                            atualizado_por: 'reset-temporada-2026'
                        },
                        $setOnInsert: {
                            liga_id: ligaId,
                            modulo,
                            temporada: 2026,
                            criado_em: new Date(),
                            configurado_por: 'sistema'
                        }
                    },
                    { upsert: true }
                );
            }
        }

        if (!isDryRun) {
            console.log('   ✅ ModuleConfigs atualizados!\n');
        } else {
            console.log('   [DRY-RUN] Nenhuma alteração feita\n');
        }

        // ========================================
        // VERIFICAÇÃO: Caches 2026
        // ========================================
        console.log('📌 VERIFICAÇÃO: Caches 2026 (devem estar vazios)');
        console.log('------------------------------------------------');

        const caches = [
            { nome: 'top10caches', collection: 'top10caches' },
            { nome: 'pontoscorridoscaches', collection: 'pontoscorridoscaches' },
            { nome: 'matamatacaches', collection: 'matamatacaches' },
            { nome: 'melhor_mes_cache', collection: 'melhor_mes_cache' },
            { nome: 'rankingeracionacaches', collection: 'rankingeracionacaches' }
        ];

        let cachesOk = true;
        for (const cache of caches) {
            try {
                const count = await db.collection(cache.collection).countDocuments({ temporada: 2026 });
                const status = count === 0 ? '✅ Vazio' : `⚠️  ${count} docs`;
                console.log(`   ${cache.nome}: ${status}`);
                if (count > 0) cachesOk = false;
            } catch (e) {
                console.log(`   ${cache.nome}: ⚠️  Collection não existe`);
            }
        }
        console.log();

        // ========================================
        // RESULTADO FINAL
        // ========================================
        console.log('=' .repeat(60));
        if (isDryRun) {
            console.log('🔍 DRY-RUN CONCLUÍDO');
            console.log('   Nenhuma alteração foi feita.');
            console.log('   Execute com --force para aplicar as mudanças.');
        } else {
            console.log('🎉 RESET CONCLUÍDO COM SUCESSO!');
            console.log('');
            console.log('📋 RESUMO:');
            console.log('   - Módulos opcionais: DESABILITADOS');
            console.log('   - Configurações 2025: ARQUIVADAS');
            console.log('   - ModuleConfigs 2026: CRIADOS (inativos)');
            console.log('   - Caches 2026:', cachesOk ? 'VAZIOS ✅' : 'ATENÇÃO - verificar');
            console.log('');
            console.log('📌 PRÓXIMOS PASSOS PARA O ADMIN:');
            console.log('   1. Acessar painel de configuração');
            console.log('   2. Definir valores de ranking por rodada');
            console.log('   3. Configurar cada módulo via wizard');
            console.log('   4. Habilitar módulos desejados');
        }

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado do MongoDB');
    }
}

main();
