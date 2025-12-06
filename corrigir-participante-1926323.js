
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExtratoFinanceiroCache from './models/ExtratoFinanceiroCache.js';
import FluxoFinanceiroCampos from './models/FluxoFinanceiroCampos.js';
import Liga from './models/Liga.js';
import Rodada from './models/Rodada.js';

dotenv.config();

async function corrigirParticipante1926323() {
    try {
        console.log('🔧 Iniciando correção do participante 1926323...\n');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ MongoDB conectado\n');

        const timeId = 1926323;
        const ligaNome = 'Cartoleiros do Sobral';

        // 1. Buscar liga
        console.log('📋 1. BUSCANDO DADOS DA LIGA...');
        const liga = await Liga.findOne({ nome: ligaNome });
        
        if (!liga) {
            throw new Error('Liga não encontrada!');
        }

        console.log(`✅ Liga encontrada: ${liga.nome} (ID: ${liga._id})\n`);

        // 2. Verificar participante
        const participante = liga.participantes.find(p => p.time_id === timeId);
        if (!participante) {
            throw new Error('Participante não encontrado na liga!');
        }

        console.log('👤 PARTICIPANTE:');
        console.log(`   Nome: ${participante.nome_cartola}`);
        console.log(`   Time: ${participante.nome_time}`);
        console.log(`   Ativo: ${participante.ativo !== false ? 'Sim' : 'Não'}\n`);

        // 3. Verificar rodadas processadas
        console.log('🎮 2. VERIFICANDO RODADAS...');
        const rodadas = await Rodada.find({
            ligaId: liga._id,
            timeId: timeId
        }).sort({ rodada: 1 });

        console.log(`✅ ${rodadas.length} rodadas encontradas`);
        
        if (rodadas.length === 0) {
            throw new Error('Nenhuma rodada encontrada! Execute o processamento de rodadas primeiro.');
        }

        console.log(`   Primeira: R${rodadas[0].rodada} - ${rodadas[0].pontos} pts`);
        console.log(`   Última: R${rodadas[rodadas.length - 1].rodada} - ${rodadas[rodadas.length - 1].pontos} pts\n`);

        // 4. Deletar cache corrompido
        console.log('🗑️ 3. LIMPANDO CACHE CORROMPIDO...');
        const cacheAntigo = await ExtratoFinanceiroCache.findOne({
            liga_id: liga._id,
            time_id: timeId
        });

        if (cacheAntigo) {
            console.log(`   Cache antigo encontrado:`);
            console.log(`   - Última rodada consolidada: ${cacheAntigo.ultima_rodada_consolidada}`);
            console.log(`   - Saldo consolidado: R$ ${cacheAntigo.saldo_consolidado}`);
            console.log(`   - Transações: ${cacheAntigo.historico_transacoes?.length || 0}`);
            
            await ExtratoFinanceiroCache.deleteOne({ _id: cacheAntigo._id });
            console.log('   ✅ Cache antigo deletado\n');
        } else {
            console.log('   ⚠️ Nenhum cache antigo encontrado\n');
        }

        // 5. Verificar campos editáveis
        console.log('✏️ 4. VERIFICANDO CAMPOS EDITÁVEIS...');
        const campos = await FluxoFinanceiroCampos.findOne({
            ligaId: liga._id.toString(),
            timeId: timeId.toString()
        });

        if (campos) {
            console.log('✅ Campos encontrados:');
            campos.campos.forEach((c, i) => {
                console.log(`   Campo ${i + 1} (${c.nome}): R$ ${c.valor}`);
            });
        } else {
            console.log('⚠️ Nenhum campo editável encontrado (será criado padrão)');
        }

        console.log('\n🔄 5. FORÇANDO RECÁLCULO VIA API...');
        console.log('   Execute manualmente no browser ou via curl:');
        console.log(`   GET http://localhost:5000/api/fluxo-financeiro/${liga._id}/extrato/${timeId}?refresh=true\n`);

        console.log('📊 6. VALIDAÇÃO FINAL:');
        console.log('   Após o recálculo, verifique:');
        console.log(`   1. Admin: http://localhost:5000/detalhe-liga.html?id=${liga._id}`);
        console.log(`   2. Selecione o participante "${participante.nome_cartola}"`);
        console.log(`   3. Verifique se o extrato está detalhado rodada por rodada\n`);

        console.log('✅ Correção preparada!');
        console.log('\n⚠️ PRÓXIMO PASSO OBRIGATÓRIO:');
        console.log('   Acesse o endpoint abaixo no navegador para forçar o recálculo:');
        console.log(`   http://localhost:5000/api/fluxo-financeiro/${liga._id}/extrato/${timeId}?refresh=true\n`);

    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('\n🔌 MongoDB desconectado');
        }
    }
}

corrigirParticipante1926323();
