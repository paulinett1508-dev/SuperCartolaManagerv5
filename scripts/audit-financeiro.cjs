#!/usr/bin/env node
/**
 * Auditoria Financeira de Participantes
 * Super Cartola Manager
 * 
 * Uso: node scripts/audit-financeiro.cjs "nome do participante"
 * 
 * v1.0 - 03/01/2026
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// A variável é MONGO_URI (não MONGODB_URI)
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI não encontrado no .env');
    console.error('   Configure a Secret MONGO_URI nos Replit Secrets.');
    process.exit(1);
}

// Cores para o terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

async function auditarParticipante(nomeBusca) {
    console.log(c('cyan', '\n═══════════════════════════════════════════════════════════════'));
    console.log(c('bright', '  🔍 AUDITORIA FINANCEIRA - Super Cartola Manager'));
    console.log(c('cyan', '═══════════════════════════════════════════════════════════════\n'));
    
    if (!nomeBusca) {
        console.log(c('red', '❌ Erro: Informe o nome do participante'));
        console.log(c('gray', '   Uso: node scripts/audit-financeiro.js "nome do participante"\n'));
        process.exit(1);
    }

    console.log(c('gray', `📡 Conectando ao banco de dados...`));
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log(c('green', '✅ Conectado ao MongoDB\n'));
    } catch (err) {
        console.log(c('red', `❌ Erro ao conectar: ${err.message}`));
        process.exit(1);
    }

    // Definir modelos dinamicamente
    const Liga = mongoose.model('Liga', new mongoose.Schema({}, { strict: false }), 'ligas');
    const Acerto = mongoose.model('Acerto', new mongoose.Schema({}, { strict: false }), 'acertofinanceiros');
    const Extrato = mongoose.model('Extrato', new mongoose.Schema({}, { strict: false }), 'extratofinanceirocaches');
    const Rodada = mongoose.model('Rodada', new mongoose.Schema({}, { strict: false }), 'rodadas');

    console.log(c('blue', `🔎 Buscando participante: "${nomeBusca}"\n`));

    // Buscar participantes únicos a partir das rodadas (fonte mais confiável)
    const participantesRaw = await Rodada.aggregate([
        {
            $match: {
                $or: [
                    { nome_cartola: { $regex: nomeBusca, $options: 'i' } },
                    { nome_time: { $regex: nomeBusca, $options: 'i' } }
                ]
            }
        },
        {
            $group: {
                _id: { ligaId: '$ligaId', timeId: '$timeId' },
                nome_cartola: { $first: '$nome_cartola' },
                nome_time: { $first: '$nome_time' },
                escudo: { $first: '$escudo' },
                temporada: { $first: '$temporada' }
            }
        }
    ]);

    const times = participantesRaw.map(p => ({
        ligaId: p._id.ligaId,
        timeId: p._id.timeId,
        nome_cartola: p.nome_cartola,
        nome_time: p.nome_time,
        escudo: p.escudo,
        temporada: p.temporada
    }));

    if (times.length === 0) {
        console.log(c('yellow', '⚠️  Nenhum participante encontrado com esse nome\n'));
        console.log(c('gray', 'Dica: Tente buscar por parte do nome ou apelido'));
        await mongoose.disconnect();
        process.exit(0);
    }

    console.log(c('green', `✅ Encontrado(s) ${times.length} participante(s)\n`));

    // Processar cada time encontrado
    for (const time of times) {
        // Buscar nome da liga
        const liga = await Liga.findById(time.ligaId).lean();
        const nomeLiga = liga?.nome || 'Liga não encontrada';

        console.log(c('magenta', '┌─────────────────────────────────────────────────────────────┐'));
        console.log(c('magenta', `│  ${c('bright', time.nome_cartola || 'N/A')}`));
        console.log(c('magenta', `│  ${c('gray', time.nome_time || 'N/A')}`));
        console.log(c('magenta', '├─────────────────────────────────────────────────────────────┤'));
        console.log(c('gray', `│  Liga: ${nomeLiga}`));
        console.log(c('gray', `│  Liga ID: ${time.ligaId}`));
        console.log(c('gray', `│  Time ID: ${time.timeId}`));
        console.log(c('gray', `│  Temporada: ${time.temporada || 'N/A'}`));
        console.log(c('magenta', '└─────────────────────────────────────────────────────────────┘\n'));

        // ==================== ACERTOS FINANCEIROS ====================
        const acertos = await Acerto.find({ 
            timeId: time.timeId,
            ligaId: time.ligaId 
        }).sort({ createdAt: -1 }).lean();

        let totalPago = 0;
        let totalRecebido = 0;

        console.log(c('cyan', `  💰 ACERTOS FINANCEIROS (${acertos.length})`));
        console.log(c('gray', '  ─────────────────────────────────────────────'));

        if (acertos.length > 0) {
            for (const a of acertos) {
                const valor = parseFloat(a.valor || 0);
                const tipo = a.tipo || 'desconhecido';
                
                if (tipo === 'pago' || tipo === 'pagamento') {
                    totalPago += valor;
                } else {
                    totalRecebido += valor;
                }

                const sinal = tipo === 'pago' || tipo === 'pagamento' ? c('red', '-') : c('green', '+');
                const data = a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : 'S/D';
                const desc = a.descricao || a.observacao || 'Sem descrição';
                
                console.log(`  ${sinal} R$ ${valor.toFixed(2).padStart(8)} │ ${tipo.padEnd(10)} │ ${data} │ ${desc.substring(0, 30)}`);
            }

            const saldoAcertos = totalRecebido - totalPago;
            console.log(c('gray', '  ─────────────────────────────────────────────'));
            console.log(`  ${c('gray', 'Total Pago:')}     ${c('red', 'R$ ' + totalPago.toFixed(2).padStart(8))}`);
            console.log(`  ${c('gray', 'Total Recebido:')} ${c('green', 'R$ ' + totalRecebido.toFixed(2).padStart(8))}`);
            console.log(`  ${c('bright', 'Saldo Acertos:')}  ${saldoAcertos >= 0 ? c('green', 'R$ ' + saldoAcertos.toFixed(2)) : c('red', '-R$ ' + Math.abs(saldoAcertos).toFixed(2))}`);
        } else {
            console.log(c('gray', '  Nenhum acerto registrado'));
        }

        // ==================== CAMPOS LIVRES/MANUAIS ====================
        console.log('');
        console.log(c('cyan', '  📝 CAMPOS LIVRES (Ajustes Manuais)'));
        console.log(c('gray', '  ─────────────────────────────────────────────'));

        const CamposLivres = mongoose.connection.collection('fluxofinanceirocampos');
        const camposLivres = await CamposLivres.findOne({ 
            ligaId: String(time.ligaId), 
            timeId: String(time.timeId) 
        });

        let totalCamposLivres = 0;

        if (camposLivres && camposLivres.campos && camposLivres.campos.length > 0) {
            const camposAtivos = camposLivres.campos.filter(c => c.valor !== 0);
            
            if (camposAtivos.length > 0) {
                camposAtivos.forEach((campo, i) => {
                    const valor = parseFloat(campo.valor) || 0;
                    totalCamposLivres += valor;
                    const sinal = valor >= 0 ? c('green', '+') : c('red', '-');
                    const nome = campo.nome || `Campo ${i + 1}`;
                    console.log(`  ${sinal} R$ ${Math.abs(valor).toFixed(2).padStart(8)} │ ${nome}`);
                });

                console.log(c('gray', '  ─────────────────────────────────────────────'));
                const corTotal = totalCamposLivres >= 0 ? 'green' : 'red';
                console.log(`  ${c('bright', 'Total Campos:')}  ${c(corTotal, (totalCamposLivres >= 0 ? '+' : '') + 'R$ ' + totalCamposLivres.toFixed(2))}`);
                
                if (camposLivres.updatedAt) {
                    console.log(`  ${c('gray', 'Atualizado:')}    ${new Date(camposLivres.updatedAt).toLocaleString('pt-BR')}`);
                }
            } else {
                console.log(c('gray', '  Campos existem mas todos com valor R$ 0,00'));
            }
        } else {
            console.log(c('gray', '  Nenhum campo livre cadastrado'));
        }

        // ==================== EXTRATO CACHE ====================
        console.log('');
        console.log(c('cyan', '  📈 EXTRATO CACHE'));
        console.log(c('gray', '  ─────────────────────────────────────────────'));

        const extrato = await Extrato.findOne({ 
            timeId: time.timeId, 
            ligaId: time.ligaId 
        }).lean();

        if (extrato) {
            const resumo = extrato.resumo || {};
            const saldoConsolidado = parseFloat(resumo.saldo) || parseFloat(resumo.saldo_final) || 0;
            const saldoTemporada = parseFloat(resumo.saldo_temporada) || saldoConsolidado;
            const saldoComCampos = saldoConsolidado + totalCamposLivres;
            
            console.log(`  ${c('gray', 'Temporada:')}      ${extrato.temporada || 'N/A'}`);
            console.log(`  ${c('gray', 'Última Rodada:')} ${extrato.ultimaRodada || 'N/A'}`);
            console.log(`  ${c('gray', 'Saldo Jogo:')}    ${saldoTemporada >= 0 ? c('green', 'R$ ' + saldoTemporada.toFixed(2)) : c('red', '-R$ ' + Math.abs(saldoTemporada).toFixed(2))}`);
            console.log(`  ${c('gray', 'Saldo Cache:')}   ${saldoConsolidado >= 0 ? c('green', 'R$ ' + saldoConsolidado.toFixed(2)) : c('red', '-R$ ' + Math.abs(saldoConsolidado).toFixed(2))}`);
            
            if (totalCamposLivres !== 0) {
                console.log(`  ${c('gray', 'Campos Livres:')} ${totalCamposLivres >= 0 ? c('green', '+R$ ' + totalCamposLivres.toFixed(2)) : c('red', '-R$ ' + Math.abs(totalCamposLivres).toFixed(2))}`);
            }
            
            console.log(`  ${c('bright', 'SALDO FINAL:')}   ${saldoComCampos >= 0 ? c('green', 'R$ ' + saldoComCampos.toFixed(2)) : c('red', '-R$ ' + Math.abs(saldoComCampos).toFixed(2))}`);
            console.log(`  ${c('gray', 'Atualizado:')}    ${extrato.updatedAt ? new Date(extrato.updatedAt).toLocaleString('pt-BR') : 'N/A'}`);

            // Status
            let status;
            if (Math.abs(saldoComCampos) < 0.01) {
                status = c('gray', '✓ QUITADO');
            } else if (saldoComCampos > 0) {
                status = c('green', '↑ A RECEBER');
            } else {
                status = c('red', '↓ DEVE');
            }
            console.log(`  ${c('bright', 'Status:')}        ${status}`);
        } else {
            console.log(c('yellow', '  ⚠️  Nenhum cache de extrato encontrado'));
            console.log(c('gray', '  Dica: Execute o cálculo do extrato na interface'));
        }

        // ==================== RODADAS ====================
        console.log('');
        console.log(c('cyan', '  🎮 DESEMPENHO NAS RODADAS'));
        console.log(c('gray', '  ─────────────────────────────────────────────'));

        const rodadas = await Rodada.find({ 
            timeId: time.timeId, 
            ligaId: time.ligaId 
        }).sort({ rodada: 1 }).lean();

        if (rodadas.length > 0) {
            const totalPontos = rodadas.reduce((s, r) => s + (parseFloat(r.pontos) || 0), 0);
            const totalFinanceiro = rodadas.reduce((s, r) => s + (parseFloat(r.valorFinanceiro) || 0), 0);
            const melhorRodada = rodadas.reduce((best, r) => (parseFloat(r.pontos) || 0) > (parseFloat(best.pontos) || 0) ? r : best);
            const piorRodada = rodadas.reduce((worst, r) => (parseFloat(r.pontos) || 0) < (parseFloat(worst.pontos) || 0) ? r : worst);

            console.log(`  ${c('gray', 'Rodadas Jogadas:')} ${rodadas.length}`);
            console.log(`  ${c('gray', 'Pontos Total:')}    ${totalPontos.toFixed(2)} pts`);
            console.log(`  ${c('gray', 'Média/Rodada:')}    ${(totalPontos / rodadas.length).toFixed(2)} pts`);
            console.log(`  ${c('gray', 'Valor Financeiro:')} R$ ${totalFinanceiro.toFixed(2)}`);
            console.log(`  ${c('green', 'Melhor Rodada:')}   R${melhorRodada.rodada} (${parseFloat(melhorRodada.pontos).toFixed(2)} pts)`);
            console.log(`  ${c('red', 'Pior Rodada:')}     R${piorRodada.rodada} (${parseFloat(piorRodada.pontos).toFixed(2)} pts)`);

            // Top 5 rodadas
            const top5 = [...rodadas].sort((a, b) => (parseFloat(b.pontos) || 0) - (parseFloat(a.pontos) || 0)).slice(0, 5);
            console.log(`\n  ${c('gray', 'Top 5 Rodadas:')}`);
            top5.forEach((r, i) => {
                const pos = r.posicao ? `${r.posicao}º` : '-';
                console.log(`    ${i + 1}. R${String(r.rodada).padStart(2)} │ ${parseFloat(r.pontos).toFixed(2).padStart(7)} pts │ Pos: ${pos}`);
            });
        } else {
            console.log(c('yellow', '  ⚠️  Nenhuma rodada encontrada'));
        }

        // ==================== ALERTAS ====================
        console.log('');
        console.log(c('cyan', '  ⚠️  ALERTAS'));
        console.log(c('gray', '  ─────────────────────────────────────────────'));

        let alertas = [];

        // Verificar divergências
        if (extrato && rodadas.length > 0) {
            const saldoCache = parseFloat(extrato.resumo?.saldo_temporada) || 0;
            const saldoCalculado = rodadas.reduce((s, r) => s + (parseFloat(r.valorFinanceiro) || 0), 0);
            if (Math.abs(saldoCache - saldoCalculado) > 1) {
                alertas.push(`Divergência: Cache (R$ ${saldoCache.toFixed(2)}) ≠ Calculado (R$ ${saldoCalculado.toFixed(2)})`);
            }
        }

        // Acertos sem descrição
        const acertosSemDesc = acertos.filter(a => !a.descricao && !a.observacao);
        if (acertosSemDesc.length > 0) {
            alertas.push(`${acertosSemDesc.length} acerto(s) sem descrição`);
        }

        // Cache desatualizado
        if (extrato && extrato.updatedAt) {
            const diasCache = Math.floor((Date.now() - new Date(extrato.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
            if (diasCache > 7) {
                alertas.push(`Cache desatualizado (${diasCache} dias)`);
            }
        }

        // Time inativo com saldo
        if (time.inativo && extrato) {
            const saldo = parseFloat(extrato.resumo?.saldo) || 0;
            if (Math.abs(saldo) > 0.01) {
                alertas.push(`Time INATIVO com saldo pendente: R$ ${saldo.toFixed(2)}`);
            }
        }

        if (alertas.length > 0) {
            alertas.forEach(a => console.log(`  ${c('yellow', '⚠️')} ${a}`));
        } else {
            console.log(c('green', '  ✅ Nenhum alerta'));
        }

        console.log('\n');
    }

    await mongoose.disconnect();
    console.log(c('gray', '📡 Desconectado do banco de dados\n'));
}

// Executar
const nome = process.argv.slice(2).join(' ');
auditarParticipante(nome).catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
});
