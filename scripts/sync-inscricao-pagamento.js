/**
 * Script GENÉRICO para sincronizar status de pagamento de inscrição
 * com os acertos financeiros registrados.
 *
 * Problema: Participantes pagam inscrição via Fluxo Financeiro (acertofinanceiros),
 * mas o flag `pagou_inscricao` em inscricoestemporada não é atualizado automaticamente.
 *
 * Lógica:
 * 1. Busca todas inscrições da temporada com pagou_inscricao: false
 * 2. Para cada inscrição, verifica se existe acertofinanceiros do tipo "pagamento"
 *    com valor >= taxa_inscricao e descrição contendo "inscrição"
 * 3. Se encontrar, atualiza pagou_inscricao: true
 *
 * Uso:
 *   node scripts/sync-inscricao-pagamento.js --dry-run           # Simula
 *   node scripts/sync-inscricao-pagamento.js                     # Executa
 *   node scripts/sync-inscricao-pagamento.js --liga 6977a62...   # Liga específica
 *   node scripts/sync-inscricao-pagamento.js --temporada 2026    # Temporada específica
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Parsear argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const ligaIndex = args.indexOf('--liga');
const temporadaIndex = args.indexOf('--temporada');

const LIGA_ID = ligaIndex !== -1 ? args[ligaIndex + 1] : null;
const TEMPORADA = temporadaIndex !== -1 ? parseInt(args[temporadaIndex + 1]) : 2026;

async function main() {
    console.log('='.repeat(60));
    console.log('Sincronizar Status de Pagamento de Inscrição');
    console.log('='.repeat(60));
    console.log(`Temporada: ${TEMPORADA}`);
    console.log(`Liga: ${LIGA_ID || 'TODAS'}`);
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}`);
    console.log('='.repeat(60));

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const InscricaoTemporada = mongoose.connection.collection('inscricoestemporada');
        const AcertoFinanceiro = mongoose.connection.collection('acertofinanceiros');

        // 1. Buscar inscrições não pagas
        const filtroInscricao = {
            temporada: TEMPORADA,
            pagou_inscricao: false
        };
        if (LIGA_ID) {
            filtroInscricao.liga_id = LIGA_ID;
        }

        const inscricoes = await InscricaoTemporada.find(filtroInscricao).toArray();
        console.log(`📋 Encontradas ${inscricoes.length} inscrições com pagou_inscricao: false\n`);

        if (inscricoes.length === 0) {
            console.log('✅ Nenhuma inscrição pendente de sincronização.');
            return;
        }

        let atualizados = 0;
        let semPagamento = 0;
        let erros = 0;

        for (const inscricao of inscricoes) {
            const timeId = String(inscricao.time_id);
            const ligaId = inscricao.liga_id;
            const taxaInscricao = inscricao.taxa_inscricao || 0;

            // 2. Buscar acerto de pagamento correspondente
            // Descrição pode variar: "Pagamento da inscrição", "Inscrição", etc.
            const acerto = await AcertoFinanceiro.findOne({
                ligaId: ligaId,
                timeId: timeId,
                temporada: TEMPORADA,
                tipo: 'pagamento',
                valor: { $gte: taxaInscricao },
                ativo: true,
                $or: [
                    { descricao: { $regex: /inscri[çc][ãa]o/i } },
                    { descricao: { $regex: /taxa/i } }
                ]
            });

            const nomeCartoleiro = inscricao.dados_participante?.nome_cartoleiro || timeId;
            const nomeTime = inscricao.dados_participante?.nome_time || '';

            if (acerto) {
                console.log(`✅ ${nomeCartoleiro} (${nomeTime})`);
                console.log(`   Acerto encontrado: R$ ${acerto.valor} - "${acerto.descricao}"`);
                console.log(`   Data: ${new Date(acerto.dataAcerto).toLocaleString('pt-BR')}`);

                if (!isDryRun) {
                    try {
                        await InscricaoTemporada.updateOne(
                            { _id: inscricao._id },
                            {
                                $set: {
                                    pagou_inscricao: true,
                                    atualizado_em: new Date(),
                                    observacoes: (inscricao.observacoes || '') +
                                        ` | Sincronizado em ${new Date().toISOString()} - Acerto ${acerto._id}`
                                }
                            }
                        );
                        console.log(`   ✅ pagou_inscricao atualizado para TRUE\n`);
                        atualizados++;
                    } catch (err) {
                        console.error(`   ❌ Erro ao atualizar: ${err.message}\n`);
                        erros++;
                    }
                } else {
                    console.log(`   [DRY-RUN] Atualizaria pagou_inscricao para TRUE\n`);
                    atualizados++;
                }
            } else {
                console.log(`⏳ ${nomeCartoleiro} (${nomeTime}) - Sem acerto de pagamento encontrado`);
                semPagamento++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('RESUMO:');
        console.log(`  ✅ Atualizados: ${atualizados}`);
        console.log(`  ⏳ Sem pagamento: ${semPagamento}`);
        console.log(`  ❌ Erros: ${erros}`);
        console.log('='.repeat(60));

        if (isDryRun) {
            console.log('\n⚠️  Modo DRY-RUN: Nenhuma alteração foi feita.');
            console.log('   Execute sem --dry-run para aplicar as mudanças.');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Desconectado do MongoDB');
    }
}

main();
