#!/usr/bin/env node
/**
 * PROBE CARTOLA AUTH ENDPOINTS
 * Script de discovery para mapear endpoints autenticados da API Cartola FC.
 *
 * Uso:
 *   node scripts/probe-cartola-auth-endpoints.js
 *
 * Requer: Token de sistema configurado via admin panel
 *         (ou variavel de ambiente CARTOLA_GLB_TOKEN para teste direto)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_BASE = 'https://api.cartolafc.globo.com';

// Endpoints para testar (especulativos baseados em documentacao e engenharia reversa)
const ENDPOINTS_PARA_TESTAR = [
    // Alta prioridade
    { url: '/auth/time', metodo: 'GET', descricao: 'Time do usuario autenticado', prioridade: 'HIGH' },
    { url: '/auth/mercado/atleta/38894/pontuacao', metodo: 'GET', descricao: 'Historico de pontuacao do atleta', prioridade: 'HIGH' },
    { url: '/auth/scout/analise', metodo: 'GET', descricao: 'Analise de scout avancada', prioridade: 'HIGH' },
    { url: '/auth/dicas/sugestoes', metodo: 'GET', descricao: 'Sugestoes do GatoMestre', prioridade: 'HIGH' },
    { url: '/auth/mercado/destaques', metodo: 'GET', descricao: 'Destaques do mercado', prioridade: 'HIGH' },

    // Media prioridade
    { url: '/auth/comparativo', metodo: 'GET', descricao: 'Comparativo entre atletas', prioridade: 'MEDIUM' },
    { url: '/auth/mercado/alertas', metodo: 'GET', descricao: 'Alertas de preco', prioridade: 'MEDIUM' },
    { url: '/auth/time/historico', metodo: 'GET', descricao: 'Historico do time', prioridade: 'MEDIUM' },
    { url: '/auth/mercado/status', metodo: 'GET', descricao: 'Status do mercado autenticado', prioridade: 'MEDIUM' },
    { url: '/auth/liga', metodo: 'GET', descricao: 'Ligas do usuario', prioridade: 'MEDIUM' },

    // Baixa prioridade (exploratorio)
    { url: '/auth/favoritos', metodo: 'GET', descricao: 'Atletas favoritos', prioridade: 'LOW' },
    { url: '/auth/escalacao/sugestao', metodo: 'GET', descricao: 'Sugestao de escalacao', prioridade: 'LOW' },
    { url: '/auth/mercado/tendencias', metodo: 'GET', descricao: 'Tendencias do mercado', prioridade: 'LOW' },
    { url: '/auth/estatisticas', metodo: 'GET', descricao: 'Estatisticas do usuario', prioridade: 'LOW' },
    { url: '/auth/ranking', metodo: 'GET', descricao: 'Ranking do usuario', prioridade: 'LOW' },
    { url: '/auth/notificacoes', metodo: 'GET', descricao: 'Notificacoes', prioridade: 'LOW' },

    // Endpoints publicos para comparacao
    { url: '/mercado/status', metodo: 'GET', descricao: '[PUBLICO] Status do mercado', prioridade: 'CONTROL', auth: false },
    { url: '/pos-rodada/destaques', metodo: 'GET', descricao: '[PUBLICO] Destaques pos-rodada', prioridade: 'CONTROL', auth: false },
];

async function obterToken() {
    // 1. Tentar variavel de ambiente
    if (process.env.CARTOLA_GLB_TOKEN) {
        console.log('[PROBE] Usando token da variavel CARTOLA_GLB_TOKEN');
        return process.env.CARTOLA_GLB_TOKEN;
    }

    // 2. Tentar MongoDB
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('[PROBE] Sem MONGODB_URI configurado');
            return null;
        }

        await mongoose.connect(mongoUri);
        console.log('[PROBE] Conectado ao MongoDB');

        const db = mongoose.connection.db;
        const doc = await db.collection('systemconfig').findOne({ key: 'globo_system_token' });

        if (doc?.value?.glbid) {
            console.log(`[PROBE] Token encontrado no MongoDB (${doc.value.email})`);
            return doc.value.glbid;
        }

        if (doc?.value?.access_token) {
            console.log(`[PROBE] Access token encontrado (${doc.value.email})`);
            return doc.value.access_token;
        }

        console.error('[PROBE] Nenhum token de sistema encontrado no MongoDB');
        console.error('[PROBE] Configure via admin panel ou defina CARTOLA_GLB_TOKEN');
        return null;
    } catch (error) {
        console.error('[PROBE] Erro ao buscar token:', error.message);
        return null;
    }
}

async function probeEndpoint(endpoint, token) {
    const url = `${API_BASE}${endpoint.url}`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
        'Accept': 'application/json',
    };

    if (endpoint.auth !== false && token) {
        headers['X-GLB-Token'] = token;
    }

    try {
        const start = Date.now();
        const resp = await axios.get(url, { headers, timeout: 10000 });
        const elapsed = Date.now() - start;

        return {
            ...endpoint,
            status: resp.status,
            temDados: !!resp.data,
            tipoDados: typeof resp.data,
            tamanho: JSON.stringify(resp.data).length,
            preview: JSON.stringify(resp.data).substring(0, 200),
            keys: resp.data && typeof resp.data === 'object'
                ? Object.keys(resp.data).slice(0, 20)
                : [],
            tempoMs: elapsed,
            sucesso: true,
        };
    } catch (error) {
        return {
            ...endpoint,
            status: error.response?.status || 'ERRO',
            erro: error.message,
            responseData: error.response?.data
                ? JSON.stringify(error.response.data).substring(0, 200)
                : null,
            sucesso: false,
        };
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log('  PROBE CARTOLA AUTH ENDPOINTS - Discovery Script');
    console.log('='.repeat(70));
    console.log();

    const token = await obterToken();

    if (!token) {
        console.error('\n❌ Nenhum token disponivel. Abortando.');
        console.error('   Opcoes:');
        console.error('   1. Configure o token no admin panel (Doar Token)');
        console.error('   2. Defina CARTOLA_GLB_TOKEN=<glbid> no .env');
        process.exit(1);
    }

    console.log(`\n📡 Testando ${ENDPOINTS_PARA_TESTAR.length} endpoints...\n`);

    const resultados = [];

    for (const endpoint of ENDPOINTS_PARA_TESTAR) {
        process.stdout.write(`  [${endpoint.prioridade.padEnd(7)}] ${endpoint.url.padEnd(45)} `);

        const resultado = await probeEndpoint(endpoint, token);
        resultados.push(resultado);

        if (resultado.sucesso) {
            console.log(`✅ ${resultado.status} (${resultado.tamanho} bytes, ${resultado.tempoMs}ms)`);
        } else {
            console.log(`❌ ${resultado.status} - ${resultado.erro}`);
        }

        // Delay para nao sobrecarregar a API
        await new Promise(r => setTimeout(r, 500));
    }

    // Relatorio final
    console.log('\n' + '='.repeat(70));
    console.log('  RELATORIO DE DISCOVERY');
    console.log('='.repeat(70));

    const funcionando = resultados.filter(r => r.sucesso);
    const falharam = resultados.filter(r => !r.sucesso);

    console.log(`\n✅ Endpoints que funcionam (${funcionando.length}):`);
    for (const r of funcionando) {
        console.log(`   ${r.url}`);
        console.log(`     Descricao: ${r.descricao}`);
        console.log(`     Keys: [${r.keys.join(', ')}]`);
        console.log(`     Preview: ${r.preview}`);
        console.log();
    }

    console.log(`\n❌ Endpoints que falharam (${falharam.length}):`);
    for (const r of falharam) {
        console.log(`   ${r.url} → ${r.status} ${r.erro}`);
        if (r.responseData) {
            console.log(`     Response: ${r.responseData}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`  Total: ${funcionando.length}/${resultados.length} endpoints ativos`);
    console.log('='.repeat(70));

    // Salvar relatorio em JSON
    const relatorio = {
        executadoEm: new Date().toISOString(),
        tokenEmail: 'redacted',
        totalEndpoints: resultados.length,
        funcionando: funcionando.length,
        falharam: falharam.length,
        resultados: resultados.map(r => ({
            url: r.url,
            descricao: r.descricao,
            prioridade: r.prioridade,
            sucesso: r.sucesso,
            status: r.status,
            keys: r.keys,
            tamanho: r.tamanho,
            tempoMs: r.tempoMs,
            erro: r.erro,
        })),
    };

    const fs = await import('fs');
    const outputPath = './data/probe-auth-report.json';
    fs.writeFileSync(outputPath, JSON.stringify(relatorio, null, 2));
    console.log(`\n📄 Relatorio salvo em: ${outputPath}`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
