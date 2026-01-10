/**
 * Auditoria Geral: Validar cálculo totalGanhos/totalPerdas
 * Verifica se a lógica v5.8 produz resultados consistentes para TODOS participantes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
dotenv.config();

async function auditoriaGeral() {
    await connectDB();
    console.log('AUDITORIA GERAL: Cálculo totalGanhos/totalPerdas (v5.8)\n');

    const ExtratoCache = mongoose.model('ExtratoCache',
        new mongoose.Schema({}, { strict: false }),
        'extratofinanceirocaches'
    );

    const caches = await ExtratoCache.find({ temporada: 2025 }).lean();
    console.log('Total de caches encontrados:', caches.length, '\n');

    let problemas = [];
    let estatisticas = { total: 0, consistentes: 0, inconsistentes: 0 };

    for (const cache of caches) {
        // Campo correto é historico_transacoes, não rodadas
        const rodadas = cache.historico_transacoes || cache.rodadas || [];
        if (!rodadas || rodadas.length === 0) continue;
        estatisticas.total++;

        let totalBonus = 0, totalOnus = 0;
        let totalPC = 0, totalMM = 0, totalTop10 = 0;

        rodadas.forEach(r => {
            const bonusOnus = parseFloat(r.bonusOnus) || 0;
            if (bonusOnus > 0) totalBonus += bonusOnus;
            else totalOnus += bonusOnus;
            totalPC += parseFloat(r.pontosCorridos) || 0;
            totalMM += parseFloat(r.mataMata) || 0;
            totalTop10 += parseFloat(r.top10) || 0;
        });

        // Calcular ganhos/perdas por COMPONENTES (v5.8)
        let calcGanhos = 0, calcPerdas = 0;
        if (totalBonus > 0) calcGanhos += totalBonus;
        if (totalPC > 0) calcGanhos += totalPC;
        if (totalMM > 0) calcGanhos += totalMM;
        if (totalTop10 > 0) calcGanhos += totalTop10;
        if (totalOnus < 0) calcPerdas += totalOnus;
        if (totalPC < 0) calcPerdas += totalPC;
        if (totalMM < 0) calcPerdas += totalMM;
        if (totalTop10 < 0) calcPerdas += totalTop10;

        // Simular o que o POPUP mostraria
        let popupGanhos = 0, popupPerdas = 0;
        if (totalBonus > 0) popupGanhos += totalBonus;
        if (totalOnus < 0) popupPerdas += Math.abs(totalOnus);
        if (totalPC > 0) popupGanhos += totalPC;
        if (totalPC < 0) popupPerdas += Math.abs(totalPC);
        if (totalMM > 0) popupGanhos += totalMM;
        if (totalMM < 0) popupPerdas += Math.abs(totalMM);
        if (totalTop10 > 0) popupGanhos += totalTop10;
        if (totalTop10 < 0) popupPerdas += Math.abs(totalTop10);

        const cardGanhos = calcGanhos;
        const cardPerdas = Math.abs(calcPerdas);
        const ganhosMatch = Math.abs(cardGanhos - popupGanhos) < 0.01;
        const perdasMatch = Math.abs(cardPerdas - popupPerdas) < 0.01;

        if (ganhosMatch && perdasMatch) {
            estatisticas.consistentes++;
        } else {
            estatisticas.inconsistentes++;
            problemas.push({ time_id: cache.time_id, cardGanhos, popupGanhos, cardPerdas, popupPerdas });
        }
    }

    console.log('='.repeat(60));
    console.log('ESTATÍSTICAS:');
    console.log('   Total analisados:', estatisticas.total);
    console.log('   Consistentes:', estatisticas.consistentes);
    console.log('   Inconsistentes:', estatisticas.inconsistentes);
    console.log('='.repeat(60));

    if (problemas.length > 0) {
        console.log('\nPARTICIPANTES COM INCONSISTÊNCIA:');
        problemas.forEach(p => {
            console.log('   Time ID:', p.time_id, '| Card:', p.cardGanhos + '/' + p.cardPerdas, '| Popup:', p.popupGanhos + '/' + p.popupPerdas);
        });
    } else {
        console.log('\nTODOS OS PARTICIPANTES ESTÃO CONSISTENTES!');
        console.log('A lógica v5.8 funciona corretamente para todos os casos.');
    }

    // Mostrar amostra de cenários diversos
    console.log('\n' + '='.repeat(60));
    console.log('AMOSTRA DE CENÁRIOS DIVERSOS:\n');

    const exemplos = caches.filter(c => (c.historico_transacoes || c.rodadas || []).length > 0).map(cache => {
        const rodadas = cache.historico_transacoes || cache.rodadas || [];
        let bonus = 0, onus = 0, pc = 0, mm = 0, t10 = 0;
        rodadas.forEach(r => {
            const bo = parseFloat(r.bonusOnus) || 0;
            if (bo > 0) bonus += bo; else onus += bo;
            pc += parseFloat(r.pontosCorridos) || 0;
            mm += parseFloat(r.mataMata) || 0;
            t10 += parseFloat(r.top10) || 0;
        });
        return { time_id: cache.time_id, bonus, onus, pc, mm, t10 };
    });

    const pcNegativos = exemplos.filter(e => e.pc < 0).slice(0, 3);
    const pcPositivos = exemplos.filter(e => e.pc > 0).slice(0, 3);
    const mmNegativos = exemplos.filter(e => e.mm < 0).slice(0, 3);
    const top10Negativos = exemplos.filter(e => e.t10 < 0).slice(0, 2);

    console.log('--- PC NEGATIVO (aparece em Débitos) ---');
    pcNegativos.forEach(e => {
        const g = e.bonus + (e.pc > 0 ? e.pc : 0) + (e.mm > 0 ? e.mm : 0) + (e.t10 > 0 ? e.t10 : 0);
        const p = Math.abs(e.onus) + (e.pc < 0 ? Math.abs(e.pc) : 0) + (e.mm < 0 ? Math.abs(e.mm) : 0) + (e.t10 < 0 ? Math.abs(e.t10) : 0);
        console.log('  Time ' + e.time_id + ': Bonus=' + e.bonus + ' Onus=' + e.onus + ' PC=' + e.pc + ' MM=' + e.mm + ' -> Ganhos=' + g + ' Perdas=' + p);
    });

    console.log('\n--- PC POSITIVO (aparece em Créditos) ---');
    pcPositivos.forEach(e => {
        const g = e.bonus + (e.pc > 0 ? e.pc : 0) + (e.mm > 0 ? e.mm : 0) + (e.t10 > 0 ? e.t10 : 0);
        const p = Math.abs(e.onus) + (e.pc < 0 ? Math.abs(e.pc) : 0) + (e.mm < 0 ? Math.abs(e.mm) : 0) + (e.t10 < 0 ? Math.abs(e.t10) : 0);
        console.log('  Time ' + e.time_id + ': Bonus=' + e.bonus + ' Onus=' + e.onus + ' PC=' + e.pc + ' MM=' + e.mm + ' -> Ganhos=' + g + ' Perdas=' + p);
    });

    console.log('\n--- MM NEGATIVO (aparece em Débitos) ---');
    mmNegativos.forEach(e => {
        const g = e.bonus + (e.pc > 0 ? e.pc : 0) + (e.mm > 0 ? e.mm : 0) + (e.t10 > 0 ? e.t10 : 0);
        const p = Math.abs(e.onus) + (e.pc < 0 ? Math.abs(e.pc) : 0) + (e.mm < 0 ? Math.abs(e.mm) : 0) + (e.t10 < 0 ? Math.abs(e.t10) : 0);
        console.log('  Time ' + e.time_id + ': Bonus=' + e.bonus + ' Onus=' + e.onus + ' PC=' + e.pc + ' MM=' + e.mm + ' -> Ganhos=' + g + ' Perdas=' + p);
    });

    console.log('\n--- TOP10 NEGATIVO (MICO - aparece em Débitos) ---');
    top10Negativos.forEach(e => {
        const g = e.bonus + (e.pc > 0 ? e.pc : 0) + (e.mm > 0 ? e.mm : 0) + (e.t10 > 0 ? e.t10 : 0);
        const p = Math.abs(e.onus) + (e.pc < 0 ? Math.abs(e.pc) : 0) + (e.mm < 0 ? Math.abs(e.mm) : 0) + (e.t10 < 0 ? Math.abs(e.t10) : 0);
        console.log('  Time ' + e.time_id + ': Bonus=' + e.bonus + ' Onus=' + e.onus + ' PC=' + e.pc + ' MM=' + e.mm + ' T10=' + e.t10 + ' -> Ganhos=' + g + ' Perdas=' + p);
    });

    await mongoose.disconnect();
}

auditoriaGeral().catch(console.error);
