#!/usr/bin/env node

/**
 * Script de Geração de Snapshot de Temporada
 * 
 * Gera documentação markdown com estatísticas da temporada atual.
 * Salva em docs/TEMPORADA-[ANO].md
 * 
 * Uso:
 *   node scripts/gerar-snapshot-temporada.js
 *   node scripts/gerar-snapshot-temporada.js 2025
 *   node scripts/gerar-snapshot-temporada.js 2026
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================================
// CONFIGURAÇÕES
// =========================================================================
const temporada = process.argv[2] || new Date().getFullYear();
const RODADAS_TOTAIS = 38; // Temporada padrão do Cartola

// =========================================================================
// FUNÇÕES AUXILIARES
// =========================================================================

async function coletarEstatisticas(db) {
    console.log(`\n📊 Coletando estatísticas da temporada ${temporada}...\n`);

    // 1. Times
    const totalTimes = await db.collection('times').countDocuments({ temporada });
    const timesAtivos = await db.collection('times').countDocuments({ 
        temporada, 
        ativo: true 
    });
    const timesInativos = totalTimes - timesAtivos;

    // 2. Ligas ativas
    const ligas = await db.collection('ligas').find({ 
        temporada: String(temporada),
        ativa: true 
    }).toArray();

    // Contar participantes por liga
    const ligasComParticipantes = await Promise.all(
        ligas.map(async (liga) => {
            const participantes = liga.participantes || [];
            
            // Verificar quais participantes estão ativos
            const verificacoes = await Promise.all(
                participantes.map(async (p) => {
                    const time = await db.collection('times').findOne({
                        id: p.time_id,
                        temporada,
                        ativo: true
                    });
                    return time !== null;
                })
            );
            
            const participantesAtivos = verificacoes.filter(v => v === true).length;
            
            return {
                nome: liga.nome || 'Sem nome',
                total: participantes.length,
                ativos: participantesAtivos
            };
        })
    );

    // 3. Acertos Financeiros
    const totalAcertos = await db.collection('acertofinanceiros').countDocuments({ 
        temporada: String(temporada)
    });

    // 4. Rodadas consolidadas
    const rodadasConsolidadas = await db.collection('rodadas').countDocuments({
        temporada: String(temporada),
        consolidada: true
    });

    // 5. Rodadas únicas (distinct rodada)
    const rodadasUnicas = await db.collection('rodadas').distinct('rodada', {
        temporada: String(temporada),
        consolidada: true
    });
    const ultimaRodada = rodadasUnicas.length > 0 ? Math.max(...rodadasUnicas) : 0;

    return {
        totalTimes,
        timesAtivos,
        timesInativos,
        ligas: ligasComParticipantes,
        totalAcertos,
        rodadasConsolidadas,
        ultimaRodada,
        status: rodadasConsolidadas > 0 && ultimaRodada >= RODADAS_TOTAIS ? 'Finalizada' : 'Ativa'
    };
}

function gerarMarkdown(stats) {
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let markdown = `# Temporada ${temporada} - Snapshot de Dados\n\n`;
    markdown += `**Gerado em:** ${dataGeracao}  \n`;
    markdown += `**Status:** ${stats.status} (Rodada ${stats.ultimaRodada}/${RODADAS_TOTAIS})\n\n`;

    markdown += `## Participantes\n`;
    markdown += `- **Total:** ${stats.totalTimes} times\n`;
    markdown += `- **Ativos:** ${stats.timesAtivos}\n`;
    markdown += `- **Desistentes:** ${stats.timesInativos}\n\n`;

    if (stats.ligas.length > 0) {
        markdown += `## Ligas\n`;
        stats.ligas.forEach((liga, index) => {
            markdown += `${index + 1}. **${liga.nome}:** ${liga.ativos} participantes ativos (${liga.total} total)\n`;
        });
        markdown += `\n`;
    }

    markdown += `## Acertos Financeiros\n`;
    markdown += `- **Total registrado:** ${stats.totalAcertos} acertos\n`;
    markdown += `- **Período:** Temporada ${temporada}\n\n`;

    markdown += `## Rodadas\n`;
    markdown += `- **Consolidadas:** ${stats.ultimaRodada}/${RODADAS_TOTAIS}\n`;
    markdown += `- **Status:** ${stats.status}\n\n`;

    markdown += `---\n\n`;
    markdown += `**Documento gerado automaticamente. Para regras de negócio, consulte \`CLAUDE.md\`.**\n`;

    return markdown;
}

// =========================================================================
// FUNÇÃO PRINCIPAL
// =========================================================================

async function main() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        
        // Conectar usando a mesma lógica do database.js
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            console.error('❌ ERRO: Variável MONGO_URI não configurada!');
            console.error('   Configure a Secret MONGO_URI nos Replit Secrets.');
            process.exit(1);
        }

        await mongoose.connect(MONGO_URI);

        const db = mongoose.connection.db;
        console.log('✅ MongoDB conectado\n');

        // Coletar estatísticas
        const stats = await coletarEstatisticas(db);

        // Gerar markdown
        const markdown = gerarMarkdown(stats);

        // Criar diretório docs se não existir
        const docsDir = path.join(__dirname, '..', 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        // Salvar arquivo
        const filepath = path.join(docsDir, `TEMPORADA-${temporada}.md`);
        fs.writeFileSync(filepath, markdown, 'utf8');

        console.log(`✅ Snapshot salvo em: ${filepath}\n`);
        console.log('📋 Resumo:');
        console.log(`   - Times: ${stats.totalTimes} (${stats.timesAtivos} ativos)`);
        console.log(`   - Ligas: ${stats.ligas.length}`);
        console.log(`   - Acertos: ${stats.totalAcertos}`);
        console.log(`   - Rodadas: ${stats.ultimaRodada}/${RODADAS_TOTAIS}`);
        console.log(`   - Status: ${stats.status}\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao gerar snapshot:', error);
        process.exit(1);
    }
}

main();

