
import mongoose from 'mongoose';
import ExtratoFinanceiroCache from './models/ExtratoFinanceiroCache.js';
import FluxoFinanceiroCampos from './models/FluxoFinanceiroCampos.js';
import Liga from './models/Liga.js';
import Rodada from './models/Rodada.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lucaseduardobarbosa:19841984@cluster0.fjcat.mongodb.net/super_cartola?retryWrites=true&w=majority';

async function debugParticipante1926323() {
    try {
        console.log('🔍 Iniciando investigação do participante 1926323...\n');
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB conectado\n');

        const timeId = 1926323;

        // 1. Buscar informações na Liga
        console.log('📋 1. INFORMAÇÕES NA LIGA:');
        const liga = await Liga.findOne({ 'participantes.time_id': timeId });
        
        if (liga) {
            const participante = liga.participantes.find(p => p.time_id === timeId);
            console.log('Liga:', liga.nome);
            console.log('Participante:', {
                time_id: participante.time_id,
                nome_cartola: participante.nome_cartola,
                nome_time: participante.nome_time,
                ativo: participante.ativo,
                assinante: participante.assinante
            });
        } else {
            console.log('❌ Participante NÃO encontrado em nenhuma liga!');
        }

        // 2. Verificar Cache do Extrato
        console.log('\n💾 2. CACHE DO EXTRATO FINANCEIRO:');
        const cacheExtrato = await ExtratoFinanceiroCache.findOne({
            liga_id: liga?._id,
            time_id: timeId
        });

        if (cacheExtrato) {
            console.log('✅ Cache encontrado:');
            console.log({
                ultima_rodada_consolidada: cacheExtrato.ultima_rodada_consolidada,
                saldo_consolidado: cacheExtrato.saldo_consolidado,
                ganhos_consolidados: cacheExtrato.ganhos_consolidados,
                perdas_consolidadas: cacheExtrato.perdas_consolidadas,
                cache_permanente: cacheExtrato.cache_permanente,
                versao_calculo: cacheExtrato.versao_calculo,
                data_ultima_atualizacao: cacheExtrato.data_ultima_atualizacao,
                total_transacoes: cacheExtrato.historico_transacoes?.length || 0
            });

            // Mostrar últimas 5 transações
            if (cacheExtrato.historico_transacoes?.length > 0) {
                console.log('\n📊 Últimas 5 transações:');
                cacheExtrato.historico_transacoes
                    .slice(-5)
                    .forEach(t => {
                        console.log(`  R${t.rodada}: Saldo=${t.saldo}, Acum=${t.saldoAcumulado}, Pos=${t.posicao}`);
                    });
            }
        } else {
            console.log('❌ Cache NÃO encontrado!');
        }

        // 3. Verificar Campos Editáveis
        console.log('\n✏️ 3. CAMPOS EDITÁVEIS:');
        const campos = await FluxoFinanceiroCampos.findOne({
            ligaId: liga?._id?.toString(),
            timeId: timeId.toString()
        });

        if (campos) {
            console.log('✅ Campos encontrados:');
            campos.campos.forEach((campo) => {
                console.log(`  ${campo.nome}: R$ ${campo.valor}`);
            });
        } else {
            console.log('❌ Campos editáveis NÃO encontrados!');
        }

        // 4. Verificar Rodadas
        console.log('\n🎮 4. RODADAS CADASTRADAS:');
        const rodadas = await Rodada.find({
            ligaId: liga?._id,
            timeId: timeId
        }).sort({ rodada: 1 });

        console.log(`Total de rodadas: ${rodadas.length}`);
        
        if (rodadas.length > 0) {
            console.log('Primeira rodada:', {
                rodada: rodadas[0].rodada,
                pontos: rodadas[0].pontos,
                nao_jogada: rodadas[0].rodadaNaoJogada
            });
            console.log('Última rodada:', {
                rodada: rodadas[rodadas.length - 1].rodada,
                pontos: rodadas[rodadas.length - 1].pontos,
                nao_jogada: rodadas[rodadas.length - 1].rodadaNaoJogada
            });

            const rodadasNaoJogadas = rodadas.filter(r => r.rodadaNaoJogada).length;
            console.log(`Rodadas não jogadas: ${rodadasNaoJogadas}`);
        }

        // 5. Comparação com outros participantes
        console.log('\n👥 5. COMPARAÇÃO COM OUTROS PARTICIPANTES DA LIGA:');
        if (liga) {
            for (const p of liga.participantes.slice(0, 3)) {
                const outroCache = await ExtratoFinanceiroCache.findOne({
                    liga_id: liga._id,
                    time_id: p.time_id
                });

                console.log(`\nTime ${p.time_id} (${p.nome_time}):`);
                if (outroCache) {
                    console.log(`  Saldo: R$ ${outroCache.saldo_consolidado}`);
                    console.log(`  Rodadas consolidadas: ${outroCache.ultima_rodada_consolidada}`);
                } else {
                    console.log('  ❌ Sem cache');
                }
            }
        }

        // 6. Verificar duplicatas ou inconsistências
        console.log('\n🔍 6. VERIFICAÇÃO DE INCONSISTÊNCIAS:');
        
        const duplicataCaches = await ExtratoFinanceiroCache.find({
            time_id: timeId
        });
        
        if (duplicataCaches.length > 1) {
            console.log(`⚠️ ANOMALIA: ${duplicataCaches.length} caches encontrados para o mesmo time!`);
            duplicataCaches.forEach((cache, index) => {
                console.log(`  Cache ${index + 1}:`);
                console.log(`    Liga ID: ${cache.liga_id}`);
                console.log(`    Saldo: R$ ${cache.saldo_consolidado}`);
                console.log(`    Última atualização: ${cache.data_ultima_atualizacao}`);
            });
        } else {
            console.log('✅ Sem duplicatas de cache');
        }

        // 7. Análise de valores atípicos
        console.log('\n💰 7. ANÁLISE DE VALORES:');
        if (cacheExtrato) {
            const saldo = cacheExtrato.saldo_consolidado;
            const ganhos = cacheExtrato.ganhos_consolidados;
            const perdas = cacheExtrato.perdas_consolidadas;

            console.log(`Saldo consolidado: R$ ${saldo}`);
            console.log(`Ganhos totais: R$ ${ganhos}`);
            console.log(`Perdas totais: R$ ${perdas}`);
            console.log(`Diferença (ganhos - perdas): R$ ${ganhos - perdas}`);

            if (Math.abs(saldo) > 100000) {
                console.log('⚠️ VALOR ATÍPICO: Saldo muito alto!');
            }

            if (saldo !== (ganhos - perdas)) {
                console.log('⚠️ INCONSISTÊNCIA: Saldo não bate com ganhos - perdas');
            }
        }

        console.log('\n✅ Investigação concluída!');

    } catch (error) {
        console.error('❌ Erro na investigação:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 MongoDB desconectado');
    }
}

debugParticipante1926323();
