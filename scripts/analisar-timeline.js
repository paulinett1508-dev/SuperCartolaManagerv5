/**
 * Script para analisar o campo Timeline (bonusOnus) dos extratos
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function analisarTimeline() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const extratos = await db.collection('extratofinanceirocaches').find({}).toArray();

        console.log('='.repeat(100));
        console.log('ANÁLISE DE TIMELINE (bonusOnus) NOS EXTRATOS');
        console.log('='.repeat(100));
        console.log('');

        // Agrupar por liga
        const porLiga = {};

        extratos.forEach(ext => {
            const ligaId = String(ext.liga_id);
            if (!porLiga[ligaId]) {
                porLiga[ligaId] = {
                    participantes: [],
                    comTimeline: 0,
                    semTimeline: 0
                };
            }

            const historico = ext.historico_transacoes || [];
            let totalBonusOnus = 0;
            let rodadasComValor = 0;

            historico.forEach(h => {
                const valor = h.bonusOnus || 0;
                if (valor !== 0) {
                    totalBonusOnus += valor;
                    rodadasComValor++;
                }
            });

            const temTimeline = totalBonusOnus !== 0;
            if (temTimeline) {
                porLiga[ligaId].comTimeline++;
            } else {
                porLiga[ligaId].semTimeline++;
            }

            porLiga[ligaId].participantes.push({
                nome: ext.nome_time || 'Sem nome',
                timeId: ext.time_id,
                rodadas: historico.length,
                totalBonusOnus,
                rodadasComValor,
                saldoFinal: ext.saldo_final || 0
            });
        });

        // Exibir por liga
        for (const [ligaId, dados] of Object.entries(porLiga)) {
            console.log(`\n📊 LIGA: ${ligaId.substring(0, 24)}`);
            console.log(`   Com Timeline: ${dados.comTimeline} | Sem Timeline: ${dados.semTimeline}`);
            console.log('-'.repeat(100));

            // Ordenar por timeline (zerados primeiro para destacar)
            dados.participantes.sort((a, b) => a.totalBonusOnus - b.totalBonusOnus);

            dados.participantes.forEach(p => {
                const status = p.totalBonusOnus === 0 ? '⚠️ ZERADO' : '✅';
                console.log(
                    `   ${status} ${p.nome.substring(0, 25).padEnd(26)} | ` +
                    `Rodadas: ${String(p.rodadas).padStart(2)} | ` +
                    `Timeline: ${p.totalBonusOnus.toFixed(2).padStart(10)} | ` +
                    `c/ valor: ${String(p.rodadasComValor).padStart(2)} | ` +
                    `Saldo Final: ${p.saldoFinal.toFixed(2).padStart(10)}`
                );
            });
        }

        // Resumo geral
        console.log('\n' + '='.repeat(100));
        console.log('RESUMO GERAL');
        console.log('='.repeat(100));

        let totalCom = 0;
        let totalSem = 0;
        for (const dados of Object.values(porLiga)) {
            totalCom += dados.comTimeline;
            totalSem += dados.semTimeline;
        }

        console.log(`Total de participantes: ${totalCom + totalSem}`);
        console.log(`Com Timeline preenchido: ${totalCom}`);
        console.log(`Com Timeline ZERADO: ${totalSem}`);
        console.log(`Porcentagem zerada: ${((totalSem / (totalCom + totalSem)) * 100).toFixed(1)}%`);

        await mongoose.disconnect();
        console.log('\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

analisarTimeline();
