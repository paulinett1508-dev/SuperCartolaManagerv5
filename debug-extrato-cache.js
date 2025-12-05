
import mongoose from 'mongoose';
import ExtratoFinanceiroCache from './models/ExtratoFinanceiroCache.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supercartola';

async function mostrarDocumento() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');

        // Buscar um documento qualquer
        const documento = await ExtratoFinanceiroCache.findOne().lean();

        if (!documento) {
            console.log('❌ Nenhum documento encontrado na collection');
            return;
        }

        console.log('\n📄 DOCUMENTO ENCONTRADO:\n');
        console.log(JSON.stringify(documento, null, 2));

        console.log('\n📊 ESTRUTURA DOS CAMPOS:\n');
        console.log('_id:', typeof documento._id);
        console.log('liga_id:', typeof documento.liga_id);
        console.log('time_id:', typeof documento.time_id);
        console.log('ultima_rodada_consolidada:', typeof documento.ultima_rodada_consolidada);
        console.log('data_ultima_atualizacao:', typeof documento.data_ultima_atualizacao);
        console.log('cache_permanente:', typeof documento.cache_permanente);
        console.log('versao_calculo:', typeof documento.versao_calculo);
        console.log('rodadas_imutaveis:', Array.isArray(documento.rodadas_imutaveis));
        console.log('saldo_consolidado:', typeof documento.saldo_consolidado);
        console.log('ganhos_consolidados:', typeof documento.ganhos_consolidados);
        console.log('perdas_consolidadas:', typeof documento.perdas_consolidadas);
        console.log('historico_transacoes:', Array.isArray(documento.historico_transacoes));
        
        if (documento.historico_transacoes && documento.historico_transacoes.length > 0) {
            console.log('\n📋 PRIMEIRA RODADA DO HISTÓRICO:\n');
            console.log(JSON.stringify(documento.historico_transacoes[0], null, 2));
        }

        // Contar documentos
        const total = await ExtratoFinanceiroCache.countDocuments();
        console.log(`\n📈 Total de documentos na collection: ${total}`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado do MongoDB');
    }
}

mostrarDocumento();
