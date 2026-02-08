/**
 * MAIOR DEVEDOR - Encontra o participante com menor saldo (mais negativo)
 * na temporada 2026 e exibe seu extrato completo.
 *
 * Liga: 684cb1c8af923da7c7df51de
 *
 * USO: node scripts/tmp-extrato-maior-devedor.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;
const LIGA_ID = '684cb1c8af923da7c7df51de';
const LIGA_OBJ_ID = new mongoose.Types.ObjectId(LIGA_ID);
const TEMPORADA = 2026;

async function main() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  RANKING DE DEVEDORES - TEMPORADA 2026');
    console.log(`  Liga: ${LIGA_ID}`);
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    // =========================================================================
    // 0. Get liga info and participant names
    // =========================================================================
    const liga = await db.collection('ligas').findOne({ _id: LIGA_OBJ_ID });
    if (!liga) {
        console.log('Liga nao encontrada!');
        await mongoose.disconnect();
        return;
    }

    console.log(`  Liga: ${liga.nome}\n`);

    // Build name map from liga.participantes
    const nomeMap = {};
    if (liga.participantes && Array.isArray(liga.participantes)) {
        for (const p of liga.participantes) {
            const id = Number(p.time_id || p.timeId || p.id);
            nomeMap[id] = p.nome_time || p.nome_cartoleiro || p.nome || `Time ${id}`;
        }
    }

    // Also check 'times' collection for names not in liga.participantes
    const timesArr = await db.collection('times').find({
        id: { $in: Object.keys(nomeMap).map(Number) }
    }).toArray();
    for (const t of timesArr) {
        if (!nomeMap[t.id]) {
            nomeMap[t.id] = t.nome_time || t.nome_cartoleiro || `Time ${t.id}`;
        }
    }

    // =========================================================================
    // 1. Get ALL extratofinanceirocaches for this liga/temporada
    // =========================================================================
    const caches = await db.collection('extratofinanceirocaches').find({
        liga_id: LIGA_ID,
        temporada: TEMPORADA
    }).toArray();

    console.log(`  Caches encontrados: ${caches.length}`);

    // =========================================================================
    // 2. Get ALL acertofinanceiros for this liga/temporada
    // =========================================================================
    const allAcertos = await db.collection('acertofinanceiros').find({
        ligaId: LIGA_ID,
        temporada: TEMPORADA
    }).toArray();

    console.log(`  Acertos encontrados: ${allAcertos.length}`);

    // Build acertos map by timeId
    const acertosMap = {};
    for (const a of allAcertos) {
        const tid = String(a.timeId);
        if (!acertosMap[tid]) acertosMap[tid] = [];
        acertosMap[tid].push(a);
    }

    // =========================================================================
    // 3. Get ALL inscricoestemporada for this liga/temporada
    // =========================================================================
    const allInscricoes = await db.collection('inscricoestemporada').find({
        liga_id: LIGA_OBJ_ID,
        temporada: TEMPORADA
    }).toArray();

    // Also try with string liga_id
    const allInscricoesStr = await db.collection('inscricoestemporada').find({
        liga_id: LIGA_ID,
        temporada: TEMPORADA
    }).toArray();

    // Merge (deduplicate by time_id)
    const inscricaoMap = {};
    for (const insc of [...allInscricoes, ...allInscricoesStr]) {
        const tid = Number(insc.time_id);
        if (!inscricaoMap[tid]) inscricaoMap[tid] = insc;
    }

    console.log(`  Inscricoes encontradas: ${Object.keys(inscricaoMap).length}\n`);

    // =========================================================================
    // 4. Calculate saldo for each participant
    // =========================================================================
    const participantes = [];

    for (const cache of caches) {
        const timeId = Number(cache.time_id);
        const nome = nomeMap[timeId] || `Time ${timeId}`;

        // Sum historico_transacoes
        const transacoes = cache.historico_transacoes || [];
        let somaTransacoes = 0;
        for (const t of transacoes) {
            somaTransacoes += (t.valor || 0);
        }

        // Sum acertos
        const acertos = acertosMap[String(timeId)] || [];
        let saldoAcertos = 0;
        for (const a of acertos) {
            const valor = Number(a.valor) || 0;
            if (a.tipo === 'pagamento') {
                // Participant paid -> positive for their saldo (reduces debt)
                saldoAcertos += valor;
            } else if (a.tipo === 'recebimento') {
                // Participant received money from league
                saldoAcertos += valor;
            }
        }

        const saldoFinal = somaTransacoes + saldoAcertos;

        participantes.push({
            timeId,
            nome,
            somaTransacoes,
            saldoAcertos,
            saldoFinal,
            numTransacoes: transacoes.length,
            numAcertos: acertos.length,
            cache
        });
    }

    // Sort by saldo (lowest/most negative first)
    participantes.sort((a, b) => a.saldoFinal - b.saldoFinal);

    // =========================================================================
    // 5. Show TOP 10 devedores
    // =========================================================================
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  TOP 10 MAIORES DEVEDORES (menor saldo)');
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    console.log('  #   | Time ID    | Nome                         | Transacoes    | Acertos       | SALDO FINAL');
    console.log('  ────┼────────────┼──────────────────────────────┼───────────────┼───────────────┼────────────────');

    const top10 = participantes.slice(0, 10);
    for (let i = 0; i < top10.length; i++) {
        const p = top10[i];
        const rank = String(i + 1).padStart(2);
        const tid = String(p.timeId).padStart(10);
        const nome = p.nome.substring(0, 28).padEnd(28);
        const trans = `R$ ${p.somaTransacoes.toFixed(2).padStart(9)}`;
        const acert = `R$ ${p.saldoAcertos.toFixed(2).padStart(9)}`;
        const saldo = `R$ ${p.saldoFinal.toFixed(2).padStart(9)}`;
        console.log(`  ${rank}  | ${tid} | ${nome} | ${trans} | ${acert} | ${saldo}`);
    }

    // Also show total participants and median
    console.log('');
    console.log(`  Total participantes: ${participantes.length}`);
    if (participantes.length > 0) {
        const median = participantes[Math.floor(participantes.length / 2)];
        const avg = participantes.reduce((s, p) => s + p.saldoFinal, 0) / participantes.length;
        console.log(`  Saldo medio: R$ ${avg.toFixed(2)}`);
        console.log(`  Saldo mediano: R$ ${median.saldoFinal.toFixed(2)}`);
    }

    // =========================================================================
    // 6. EXTRATO COMPLETO do #1 devedor
    // =========================================================================
    if (participantes.length === 0) {
        console.log('\nNenhum participante encontrado.');
        await mongoose.disconnect();
        return;
    }

    const devedor = participantes[0];
    const timeId = devedor.timeId;

    console.log('\n\n═══════════════════════════════════════════════════════════════════════');
    console.log(`  EXTRATO COMPLETO - #1 MAIOR DEVEDOR`);
    console.log(`  ${devedor.nome} (ID: ${devedor.timeId})`);
    console.log(`  SALDO FINAL: R$ ${devedor.saldoFinal.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════════════');

    // --- 6a. HISTORICO DE TRANSACOES ---
    console.log('\n  HISTORICO DE TRANSACOES\n');
    const transacoes = devedor.cache.historico_transacoes || [];
    if (transacoes.length === 0) {
        console.log('    Nenhuma transacao encontrada.');
    } else {
        let acumulado = 0;
        console.log('    #   | Rodada | Tipo                          | Valor          | Acumulado      | Descricao');
        console.log('    ────┼────────┼───────────────────────────────┼────────────────┼────────────────┼──────────────────────');
        transacoes.forEach((t, i) => {
            acumulado += (t.valor || 0);
            const idx = String(i).padStart(3);
            const rod = String(t.rodada || '-').padStart(4);
            const tipo = (t.tipo || 'N/A').substring(0, 29).padEnd(29);
            const sinal = t.valor >= 0 ? '+' : '';
            const valor = `${sinal}R$ ${t.valor.toFixed(2)}`.padStart(14);
            const acum = `R$ ${acumulado.toFixed(2)}`.padStart(14);
            const desc = (t.descricao || '').substring(0, 40);
            console.log(`    ${idx} | ${rod}   | ${tipo} | ${valor} | ${acum} | ${desc}`);
        });
        console.log(`\n    Soma transacoes: R$ ${devedor.somaTransacoes.toFixed(2)}`);
        console.log(`    saldo_consolidado (cache): R$ ${devedor.cache.saldo_consolidado || 'N/A'}`);
    }

    // --- 6b. INSCRICAO TEMPORADA ---
    console.log('\n  INSCRICAO TEMPORADA\n');
    const inscricao = inscricaoMap[timeId];
    if (inscricao) {
        console.log(`    Status:              ${inscricao.status}`);
        console.log(`    Tipo:                ${inscricao.tipo || 'N/A'}`);
        console.log(`    Taxa inscricao:      R$ ${inscricao.taxa_inscricao || 0}`);
        console.log(`    Pagou inscricao:     ${inscricao.pagou_inscricao}`);
        console.log(`    Saldo transferido:   R$ ${inscricao.saldo_transferido || 0}`);
        console.log(`    Divida anterior:     R$ ${inscricao.divida_anterior || 0}`);
        console.log(`    Data:                ${inscricao.createdAt || inscricao.data || 'N/A'}`);
    } else {
        console.log('    Nenhuma inscricao encontrada.');
    }

    // --- 6c. ACERTOS FINANCEIROS ---
    console.log('\n  ACERTOS FINANCEIROS\n');
    const acertosDevedor = acertosMap[String(timeId)] || [];
    if (acertosDevedor.length === 0) {
        console.log('    Nenhum acerto encontrado.');
    } else {
        let totalPagamento = 0;
        let totalRecebimento = 0;
        console.log('    #   | Tipo          | Valor          | Data                 | Descricao');
        console.log('    ────┼───────────────┼────────────────┼──────────────────────┼──────────────────────');
        acertosDevedor.forEach((a, i) => {
            const valor = Number(a.valor) || 0;
            if (a.tipo === 'pagamento') totalPagamento += valor;
            else totalRecebimento += valor;
            const idx = String(i).padStart(3);
            const tipo = (a.tipo || 'N/A').padEnd(13);
            const valStr = `R$ ${valor.toFixed(2)}`.padStart(14);
            const data = (a.createdAt || a.data || 'N/A').toString().substring(0, 20).padEnd(20);
            const desc = (a.descricao || '').substring(0, 40);
            console.log(`    ${idx} | ${tipo} | ${valStr} | ${data} | ${desc}`);
        });
        console.log(`\n    Total pagamentos:    R$ ${totalPagamento.toFixed(2)} (participante pagou -> + saldo)`);
        console.log(`    Total recebimentos:  R$ ${totalRecebimento.toFixed(2)}`);
        console.log(`    Saldo acertos:       R$ ${(totalPagamento + totalRecebimento).toFixed(2)}`);
    }

    // --- 6d. BREAKDOWN POR TIPO DE TRANSACAO ---
    console.log('\n  BREAKDOWN POR TIPO\n');
    const tipoMap = {};
    for (const t of transacoes) {
        const tipo = t.tipo || 'DESCONHECIDO';
        if (!tipoMap[tipo]) tipoMap[tipo] = { count: 0, total: 0 };
        tipoMap[tipo].count++;
        tipoMap[tipo].total += (t.valor || 0);
    }
    for (const [tipo, data] of Object.entries(tipoMap).sort((a, b) => a[1].total - b[1].total)) {
        const sinal = data.total >= 0 ? '+' : '';
        console.log(`    ${tipo.padEnd(35)} ${String(data.count).padStart(3)}x  ${sinal}R$ ${data.total.toFixed(2)}`);
    }

    // --- 6e. BREAKDOWN POR RODADA ---
    console.log('\n  BREAKDOWN POR RODADA\n');
    const rodadaMap = {};
    for (const t of transacoes) {
        const rod = t.rodada || 0;
        if (!rodadaMap[rod]) rodadaMap[rod] = [];
        rodadaMap[rod].push(t);
    }
    for (const [rod, ts] of Object.entries(rodadaMap).sort((a, b) => Number(a) - Number(b))) {
        const total = ts.reduce((s, t) => s + (t.valor || 0), 0);
        const detalhe = ts.map(t => `${t.tipo}=${t.valor >= 0 ? '+' : ''}${t.valor.toFixed(2)}`).join(', ');
        const sinal = total >= 0 ? '+' : '';
        const label = Number(rod) === 0 ? 'Pre-temp  ' : `Rodada ${String(rod).padStart(2)}`;
        console.log(`    ${label}: ${sinal}R$ ${total.toFixed(2).padStart(9)}  (${detalhe})`);
    }

    // --- 6f. CALCULO FINAL ---
    console.log('\n  ═══════════════════════════════════════════════════════════════════');
    console.log('  CALCULO FINAL DO SALDO');
    console.log('  ═══════════════════════════════════════════════════════════════════\n');

    const inscricaoTrans = transacoes.filter(t => t.tipo === 'INSCRICAO_TEMPORADA');
    const saldoAnteriorTrans = transacoes.filter(t => t.tipo === 'SALDO_TEMPORADA_ANTERIOR');
    const dividaAnteriorTrans = transacoes.filter(t => t.tipo === 'DIVIDA_TEMPORADA_ANTERIOR');
    const rodadaTrans = transacoes.filter(t => (t.rodada || 0) > 0);

    const somaInscricao = inscricaoTrans.reduce((s, t) => s + (t.valor || 0), 0);
    const somaSaldoAnterior = saldoAnteriorTrans.reduce((s, t) => s + (t.valor || 0), 0);
    const somaDividaAnterior = dividaAnteriorTrans.reduce((s, t) => s + (t.valor || 0), 0);
    const somaRodadas = rodadaTrans.reduce((s, t) => s + (t.valor || 0), 0);
    const somaOutros = devedor.somaTransacoes - somaInscricao - somaSaldoAnterior - somaDividaAnterior - somaRodadas;

    console.log(`    Inscricao:            R$ ${somaInscricao.toFixed(2)}`);
    console.log(`    Saldo anterior:       R$ ${somaSaldoAnterior.toFixed(2)}`);
    if (somaDividaAnterior !== 0) {
        console.log(`    Divida anterior:      R$ ${somaDividaAnterior.toFixed(2)}`);
    }
    console.log(`    Rodadas (B/O + mods): R$ ${somaRodadas.toFixed(2)}`);
    if (Math.abs(somaOutros) > 0.01) {
        console.log(`    Outros:               R$ ${somaOutros.toFixed(2)}`);
    }
    console.log(`    ──────────────────────────────`);
    console.log(`    Soma transacoes:      R$ ${devedor.somaTransacoes.toFixed(2)}`);
    console.log(`    Acertos:              R$ ${devedor.saldoAcertos.toFixed(2)}`);
    console.log(`    ══════════════════════════════`);
    console.log(`    SALDO FINAL:          R$ ${devedor.saldoFinal.toFixed(2)}`);
    console.log('');

    await mongoose.disconnect();
    console.log('Desconectado do MongoDB.\n');
}

main().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
