import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function auditarAntonioLuis2026() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        const timeId = 645089;
        const ligaId = '684cb1c8af923da7c7df51de';

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🔍 AUDITORIA FINANCEIRA DEFINITIVA - Antonio Luis - TEMPORADA 2026');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // ===== 1. INSCRIÇÃO TEMPORADA =====
        console.log('▓▓▓ 1. INSCRIÇÃO TEMPORADA 2026 ▓▓▓');
        const inscricao = await db.collection('inscricoestemporada').findOne({
            time_id: timeId,
            temporada: 2026
        });
        console.log(JSON.stringify(inscricao, null, 2));
        console.log('');

        // ===== 2. LIGARULES =====
        console.log('▓▓▓ 2. LIGARULES (taxa inscrição configurada) ▓▓▓');
        const ligarules = await db.collection('ligarules').findOne({
            liga_id: new mongoose.Types.ObjectId(ligaId),
            temporada: 2026
        });
        if (ligarules) {
            console.log('Taxa Inscrição: R$', ligarules.taxaInscricao);
            console.log('Prazo:', ligarules.prazoInscricao);
            console.log('Parcelamento:', JSON.stringify(ligarules.parcelamento));
        } else {
            console.log('Nenhuma ligarules para 2026 encontrada');
        }
        console.log('');

        // ===== 3. EXTRATO CACHE 2026 - COMPLETO =====
        console.log('▓▓▓ 3. EXTRATO CACHE 2026 (COMPLETO) ▓▓▓');
        const cache2026 = await db.collection('extratofinanceirocaches').findOne({
            liga_id: ligaId,
            time_id: timeId,
            temporada: 2026
        });
        if (cache2026) {
            console.log('_id:', cache2026._id);
            console.log('saldo_consolidado:', cache2026.saldo_consolidado);
            console.log('cache_permanente:', cache2026.cache_permanente);
            console.log('ultima_rodada_consolidada:', cache2026.ultima_rodada_consolidada);
            console.log('totalGanhos:', cache2026.totalGanhos);
            console.log('totalPerdas:', cache2026.totalPerdas);
            console.log('quitacao:', JSON.stringify(cache2026.quitacao));
            console.log('');
            console.log('--- TODAS AS TRANSAÇÕES (historico_transacoes) ---');
            if (cache2026.historico_transacoes) {
                console.log('Total transações:', cache2026.historico_transacoes.length);
                cache2026.historico_transacoes.forEach((t, i) => {
                    console.log(`[${i}]`, JSON.stringify(t));
                });
            }
        } else {
            console.log('❌ Sem cache 2026');
        }
        console.log('');

        // ===== 4. ACERTOS FINANCEIROS 2026 =====
        console.log('▓▓▓ 4. ACERTOS FINANCEIROS 2026 ▓▓▓');
        const acertos = await db.collection('acertofinanceiros').find({
            timeId: String(timeId),
            temporada: 2026
        }).toArray();
        if (acertos.length > 0) {
            acertos.forEach((a, i) => {
                console.log(`[${i}]`, JSON.stringify({
                    _id: a._id,
                    tipo: a.tipo,
                    valor: a.valor,
                    descricao: a.descricao,
                    ativo: a.ativo,
                    data: a.data || a.createdAt,
                    ehPagamentoInscricao: a.ehPagamentoInscricao
                }));
            });
        } else {
            console.log('Sem acertos 2026');
        }
        console.log('');

        // ===== 5. AJUSTES FINANCEIROS 2026 =====
        console.log('▓▓▓ 5. AJUSTES FINANCEIROS 2026 ▓▓▓');
        const ajustes = await db.collection('ajustesfinanceiros').find({
            time_id: timeId,
            temporada: 2026
        }).toArray();
        if (ajustes.length > 0) {
            ajustes.forEach((a, i) => {
                console.log(`[${i}]`, JSON.stringify({
                    _id: a._id,
                    tipo: a.tipo,
                    valor: a.valor,
                    descricao: a.descricao,
                    ativo: a.ativo,
                    data: a.data || a.createdAt
                }));
            });
        } else {
            console.log('Sem ajustes 2026');
        }
        console.log('');

        // ===== 6. CAMPOS MANUAIS 2026 (LEGADO - NÃO DEVEM EXISTIR) =====
        console.log('▓▓▓ 6. CAMPOS MANUAIS 2026 (deve estar vazio p/ 2026) ▓▓▓');
        const campos2026 = await db.collection('fluxofinanceirocampos').findOne({
            timeId: String(timeId),
            temporada: 2026
        });
        if (campos2026) {
            console.log('⚠️  EXISTE registro fluxofinanceirocampos 2026:');
            console.log(JSON.stringify(campos2026, null, 2));
        } else {
            console.log('✅ Nenhum campo manual 2026 (correto - sistema novo usa ajustes)');
        }
        console.log('');

        // ===== 7. QUITAÇÃO 2025 =====
        console.log('▓▓▓ 7. SITUAÇÃO 2025 (aposentada - apenas referência) ▓▓▓');
        const cache2025 = await db.collection('extratofinanceirocaches').findOne({
            liga_id: ligaId,
            time_id: timeId,
            temporada: 2025
        });
        if (cache2025) {
            console.log('saldo_consolidado 2025:', cache2025.saldo_consolidado);
            console.log('cache_permanente:', cache2025.cache_permanente);
            console.log('quitacao:', JSON.stringify(cache2025.quitacao));
        }

        const acertos2025 = await db.collection('acertofinanceiros').find({
            timeId: String(timeId),
            temporada: 2025,
            ativo: true
        }).toArray();
        let totalPago2025 = 0, totalRecebido2025 = 0;
        acertos2025.forEach(a => {
            if (a.tipo === 'pagamento') totalPago2025 += a.valor;
            if (a.tipo === 'recebimento') totalRecebido2025 += a.valor;
        });
        console.log('Acertos 2025: pago=' + totalPago2025 + ' recebido=' + totalRecebido2025 + ' saldo=' + (totalPago2025 - totalRecebido2025));

        const campos2025 = await db.collection('fluxofinanceirocampos').findOne({
            timeId: String(timeId),
            temporada: 2025
        });
        if (campos2025) {
            const tc = (campos2025.campo1||0)+(campos2025.campo2||0)+(campos2025.campo3||0)+(campos2025.campo4||0);
            console.log('Campos 2025: total=' + tc);
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // CÁLCULO DEFINITIVO
        // ═══════════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🧮 CÁLCULO DEFINITIVO - EXTRATO 2026');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // Inscrição
        const taxaInscricao = inscricao ? (inscricao.taxaInscricao || 0) : 0;
        const pagouInscricao = inscricao ? (inscricao.pagouInscricao || false) : false;
        const saldoTransferido = inscricao ? (inscricao.saldoAnteriorTransferido || 0) : 0;
        const dividaAnterior = inscricao ? (inscricao.dividaAnterior || 0) : 0;

        console.log('INSCRIÇÃO:');
        console.log('  taxaInscricao:', taxaInscricao);
        console.log('  pagouInscricao:', pagouInscricao);
        console.log('  saldoAnteriorTransferido:', saldoTransferido);
        console.log('  dividaAnterior:', dividaAnterior);
        console.log('');

        // Check: inscrição está no cache?
        let inscricaoNoCache = false;
        let tiposNoCache = [];
        if (cache2026 && cache2026.historico_transacoes) {
            cache2026.historico_transacoes.forEach(t => {
                if (t.tipo) tiposNoCache.push(t.tipo);
            });
            inscricaoNoCache = tiposNoCache.includes('INSCRICAO_TEMPORADA') ||
                               tiposNoCache.includes('SALDO_TEMPORADA_ANTERIOR');
        }
        console.log('  Tipos de transação no cache:', tiposNoCache.join(', '));
        console.log('  Inscrição já no cache:', inscricaoNoCache);
        console.log('');

        // Separar transações
        const transacoes = cache2026 ? (cache2026.historico_transacoes || []) : [];

        // Transações de rodada
        const rodadas = transacoes.filter(t => {
            const tiposEspeciais = ['INSCRICAO_TEMPORADA', 'SALDO_TEMPORADA_ANTERIOR', 'AJUSTE'];
            return !tiposEspeciais.includes(t.tipo);
        });

        // Transações especiais
        const especiais = transacoes.filter(t => {
            const tiposEspeciais = ['INSCRICAO_TEMPORADA', 'SALDO_TEMPORADA_ANTERIOR', 'AJUSTE'];
            return tiposEspeciais.includes(t.tipo);
        });

        console.log('RODADAS NO CACHE:');
        let saldoRodadas = 0;
        rodadas.forEach(r => {
            const saldo = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);
            saldoRodadas += saldo;
            console.log('  R' + r.rodada + ': B/O=' + (r.bonusOnus||0) + ' PC=' + (r.pontosCorridos||0) + ' MM=' + (r.mataMata||0) + ' T10=' + (r.top10||0) + ' => saldo=' + saldo + ' acum=' + saldoRodadas);
        });
        console.log('  TOTAL Rodadas: R$', saldoRodadas);
        console.log('');

        if (especiais.length > 0) {
            console.log('TRANSAÇÕES ESPECIAIS NO CACHE:');
            especiais.forEach(e => {
                console.log('  tipo=' + e.tipo + ' valor=' + (e.valor || e.bonusOnus || 0) + ' desc=' + (e.descricao || ''));
            });
            console.log('');
        }

        // Ajustes
        console.log('AJUSTES FINANCEIROS:');
        let totalAjustes = 0;
        if (ajustes.length > 0) {
            ajustes.filter(a => a.ativo !== false).forEach(a => {
                const val = a.tipo === 'credito' ? a.valor : -a.valor;
                totalAjustes += val;
                console.log('  ' + a.tipo + ': R$ ' + a.valor + ' (' + (a.descricao || '') + ') => efeito: ' + val);
            });
        } else {
            console.log('  Nenhum ajuste');
        }
        console.log('  TOTAL Ajustes: R$', totalAjustes);
        console.log('');

        // Acertos
        console.log('ACERTOS (PAGAMENTOS/RECEBIMENTOS):');
        let saldoAcertos = 0;
        const acertosAtivos = acertos.filter(a => a.ativo !== false);
        acertosAtivos.forEach(a => {
            if (a.tipo === 'pagamento') {
                saldoAcertos += a.valor;
                console.log('  PAGAMENTO: +R$ ' + a.valor + ' (' + (a.descricao || '') + ')');
            }
            if (a.tipo === 'recebimento') {
                saldoAcertos -= a.valor;
                console.log('  RECEBIMENTO: -R$ ' + a.valor + ' (' + (a.descricao || '') + ')');
            }
        });
        console.log('  TOTAL Acertos: R$', saldoAcertos);
        console.log('');

        // ═══════ MONTAGEM DO EXTRATO ESPERADO ═══════
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('📋 EXTRATO ESPERADO PELO USUÁRIO vs REALIDADE');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // Saldo legado
        console.log('1️⃣  SALDO LEGADO (Início 2026):');
        console.log('   Esperado pelo usuário: R$ 0,00 (quitou dívidas 2025)');
        console.log('   Encontrado no sistema: saldoTransferido=' + saldoTransferido + ' dividaAnterior=' + dividaAnterior);
        console.log('   Líquido legado: R$', (saldoTransferido - dividaAnterior));
        console.log('');

        // Inscrição
        console.log('2️⃣  INSCRIÇÃO 2026:');
        console.log('   Esperado pelo usuário: R$ -180,00 (débito de inscrição)');
        console.log('   taxaInscricao na inscrição:', taxaInscricao);
        console.log('   pagouInscricao:', pagouInscricao);
        if (!pagouInscricao && taxaInscricao > 0) {
            console.log('   ✅ DEVE gerar débito de -R$', taxaInscricao);
        } else if (pagouInscricao) {
            console.log('   ⚠️  pagouInscricao=true, NÃO gera débito');
        } else {
            console.log('   ⚠️  taxaInscricao=0, NÃO gera débito');
        }
        console.log('');

        // Rodadas
        console.log('3️⃣  RODADAS CONSOLIDADAS:');
        console.log('   Esperado pelo usuário: R1=+R$9, R2=-R$9');
        console.log('   Encontrado: ver acima');
        console.log('');

        // Saldo Final
        console.log('4️⃣  SALDO FINAL:');
        console.log('   Esperado pelo usuário: R$ -120,00');
        console.log('   (= -180 inscrição + 60 acerto + 9 R1 - 9 R2 = -120)');
        console.log('');

        // Cálculo real
        let saldoTemporada = saldoRodadas + totalAjustes;

        // Inscrição (se não está no cache)
        if (!inscricaoNoCache && inscricao) {
            if (!pagouInscricao && taxaInscricao > 0) {
                saldoTemporada -= taxaInscricao;
            }
            saldoTemporada += saldoTransferido;
            saldoTemporada -= dividaAnterior;
        }

        // Se inscrição está no cache, já está contabilizada no saldo_consolidado
        if (inscricaoNoCache) {
            console.log('   ⚠️  Inscrição JÁ está no cache - usar saldo_consolidado direto');
            saldoTemporada = (cache2026.saldo_consolidado || 0) + totalAjustes;
        }

        const saldoFinal = saldoTemporada + saldoAcertos;

        console.log('');
        console.log('─────────────────────────────────────────');
        console.log('  Saldo Rodadas:      R$', saldoRodadas);
        console.log('  Inscrição (débito): R$', (!pagouInscricao && taxaInscricao > 0) ? -taxaInscricao : 0);
        console.log('  Legado:             R$', (saldoTransferido - dividaAnterior));
        console.log('  Ajustes:            R$', totalAjustes);
        console.log('  Acertos:            R$', saldoAcertos);
        console.log('─────────────────────────────────────────');
        console.log('  ★ SALDO TEMPORADA:  R$', saldoTemporada);
        console.log('  ★ SALDO FINAL:      R$', saldoFinal);
        console.log('');

        if (saldoFinal === -120) {
            console.log('  ✅ CONFERE com expectativa do usuário (-R$ 120,00)');
        } else {
            console.log('  ❌ NÃO CONFERE com expectativa do usuário (-R$ 120,00)');
            console.log('  Diferença: R$', (saldoFinal - (-120)));
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message, error.stack);
    } finally {
        await mongoose.disconnect();
    }
}

auditarAntonioLuis2026();
