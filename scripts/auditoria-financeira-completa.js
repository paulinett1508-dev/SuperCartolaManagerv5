/**
 * AUDITORIA FINANCEIRA COMPLETA
 *
 * Compara o saldo de cada participante calculado pela FONTE DA VERDADE
 * (calcularSaldoParticipante) com o saldo que os endpoints bulk
 * (/participantes, /liga/:ligaId, /resumo) produziriam.
 *
 * DETECTA:
 * 1. AjusteFinanceiro ausente do bulk (BUG-001, fixado v3.2)
 * 2. Double-counting inscrição/legado (BUG-002)
 * 3. Campos errados em caches
 * 4. Divergência de saldo final
 *
 * USO:
 *   node scripts/auditoria-financeira-completa.js --dry-run
 *   node scripts/auditoria-financeira-completa.js --dry-run --liga=684cb1c8af923da7c7df51de
 *   node scripts/auditoria-financeira-completa.js --dry-run --temporada=2025
 *
 * @version 1.0.0
 * @since 2026-02-08
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { CURRENT_SEASON } from '../config/seasons.js';
import { calcularSaldoParticipante, aplicarAjusteInscricaoBulk } from '../utils/saldo-calculator.js';
import ExtratoFinanceiroCache from '../models/ExtratoFinanceiroCache.js';
import FluxoFinanceiroCampos from '../models/FluxoFinanceiroCampos.js';
import AcertoFinanceiro from '../models/AcertoFinanceiro.js';
import AjusteFinanceiro from '../models/AjusteFinanceiro.js';
import InscricaoTemporada from '../models/InscricaoTemporada.js';
import Liga from '../models/Liga.js';
import {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
} from '../controllers/extratoFinanceiroCacheController.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const TOLERANCIA = 0.02;

// Cores terminal
const c = {
    reset: '\x1b[0m', bright: '\x1b[1m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

function cor(color, text) { return `${c[color]}${text}${c.reset}`; }

async function auditar() {
    const isDryRun = process.argv.includes('--dry-run');
    if (!isDryRun) {
        console.log('❌ Use --dry-run para executar a auditoria');
        console.log('   node scripts/auditoria-financeira-completa.js --dry-run');
        process.exit(1);
    }

    const temporadaArg = process.argv.find(a => a.startsWith('--temporada='));
    const ligaArg = process.argv.find(a => a.startsWith('--liga='));
    const temporada = temporadaArg ? Number(temporadaArg.split('=')[1]) : CURRENT_SEASON;
    const ligaFiltro = ligaArg ? ligaArg.split('=')[1] : null;

    console.log(cor('cyan', '\n═══════════════════════════════════════════════════════════════'));
    console.log(cor('bright', '  AUDITORIA FINANCEIRA COMPLETA - Super Cartola Manager'));
    console.log(cor('cyan', '═══════════════════════════════════════════════════════════════'));
    console.log(cor('gray', `  Temporada: ${temporada} | Liga: ${ligaFiltro || 'TODAS'}`));
    console.log(cor('gray', `  Data: ${new Date().toLocaleString('pt-BR')}\n`));

    if (!MONGO_URI) {
        console.error('❌ MONGO_URI não encontrado');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log(cor('green', '✅ Conectado ao MongoDB\n'));

    // Buscar ligas
    const filtroLiga = { ativo: { $ne: false } };
    if (ligaFiltro) filtroLiga._id = new mongoose.Types.ObjectId(ligaFiltro);
    const ligas = await Liga.find(filtroLiga).lean();

    const temporadaNum = Number(temporada);
    const resultados = {
        total: 0,
        ok: 0,
        divergentes: 0,
        semCache: 0,
        divergencias: [],
    };

    for (const liga of ligas) {
        const ligaId = liga._id.toString();
        const ligaNome = liga.nome || 'Liga sem nome';

        console.log(cor('blue', `\n📋 ${ligaNome} (${ligaId})`));
        console.log(cor('gray', '─'.repeat(60)));

        // Filtrar participantes por inscrição para 2026+
        let participantes = liga.participantes || [];
        let inscricoesMap = new Map();

        if (temporadaNum >= 2026) {
            const inscricoes = await InscricaoTemporada.find({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                temporada: temporadaNum,
                status: { $in: ['renovado', 'novo'] }
            }).lean();

            inscricoes.forEach(i => inscricoesMap.set(String(i.time_id), i));

            // Filtrar para apenas inscritos
            const inscritosIds = new Set(inscricoes.map(i => String(i.time_id)));
            participantes = participantes.filter(p => inscritosIds.has(String(p.time_id)));
        }

        // Bulk queries (simulando o que os endpoints fazem)
        const [todosExtratos, todosCampos, todosAcertos, todosAjustes] = await Promise.all([
            ExtratoFinanceiroCache.find({
                liga_id: ligaId,
                temporada: temporadaNum
            }).lean(),
            FluxoFinanceiroCampos.find({
                ligaId: ligaId,
                temporada: temporadaNum
            }).lean(),
            AcertoFinanceiro.find({
                ligaId: ligaId,
                temporada: temporadaNum,
                ativo: true
            }).lean(),
            temporadaNum >= 2026
                ? AjusteFinanceiro.find({
                    liga_id: { $in: [ligaId, new mongoose.Types.ObjectId(ligaId)] },
                    temporada: temporadaNum,
                    ativo: true
                }).lean()
                : Promise.resolve([])
        ]);

        // Mapas
        const extratoMap = new Map();
        todosExtratos.forEach(e => extratoMap.set(String(e.time_id), e));

        const camposMap = new Map();
        todosCampos.forEach(c => camposMap.set(String(c.timeId), c));

        const acertosMap = new Map();
        todosAcertos.forEach(a => {
            const key = String(a.timeId);
            if (!acertosMap.has(key)) acertosMap.set(key, []);
            acertosMap.get(key).push(a);
        });

        const ajustesMap = new Map();
        todosAjustes.forEach(a => {
            const key = String(a.time_id);
            if (!ajustesMap.has(key)) ajustesMap.set(key, []);
            ajustesMap.get(key).push(a);
        });

        for (const participante of participantes) {
            const timeId = String(participante.time_id);
            const nomeTime = participante.nome_time || 'N/D';
            resultados.total++;

            // ═══════════════════════════════════════════════════════
            // CAMINHO 1: Fonte da verdade (calcularSaldoParticipante)
            // ═══════════════════════════════════════════════════════
            let saldoVerdade;
            try {
                saldoVerdade = await calcularSaldoParticipante(ligaId, timeId, temporadaNum);
            } catch (err) {
                console.log(cor('red', `  ❌ ${nomeTime} (${timeId}): Erro calcularSaldoParticipante: ${err.message}`));
                resultados.divergentes++;
                resultados.divergencias.push({
                    liga: ligaNome, ligaId, timeId, nomeTime,
                    erro: err.message
                });
                continue;
            }

            // ═══════════════════════════════════════════════════════
            // CAMINHO 2: Bulk (simulando /participantes endpoint)
            // ═══════════════════════════════════════════════════════
            const extrato = extratoMap.get(timeId);
            const historico = extrato?.historico_transacoes || [];

            if (!extrato) {
                // Sem cache - usar apenas inscrição + acertos
                const inscricaoData = inscricoesMap.get(timeId);
                let bulkSaldo = 0;

                if (temporadaNum >= 2026 && inscricaoData) {
                    const ajusteInsc = aplicarAjusteInscricaoBulk(0, inscricaoData, []);
                    bulkSaldo = ajusteInsc.saldoAjustado;
                }

                // Ajustes
                const ajustesList = ajustesMap.get(timeId) || [];
                const saldoAjustesBulk = ajustesList.reduce((acc, a) => acc + (a.valor || 0), 0);
                bulkSaldo += saldoAjustesBulk;

                // Acertos
                const acertosList = acertosMap.get(timeId) || [];
                let totalPago = 0, totalRecebido = 0;
                acertosList.forEach(a => {
                    if (a.tipo === 'pagamento') totalPago += a.valor || 0;
                    else if (a.tipo === 'recebimento') totalRecebido += a.valor || 0;
                });
                bulkSaldo += totalPago - totalRecebido;

                const diff = Math.abs(saldoVerdade.saldoFinal - bulkSaldo);
                if (diff > TOLERANCIA) {
                    console.log(cor('yellow', `  ⚠️  ${nomeTime} (${timeId}): SEM CACHE | Verdade=${saldoVerdade.saldoFinal.toFixed(2)} | Bulk=${bulkSaldo.toFixed(2)} | Diff=${diff.toFixed(2)}`));
                    resultados.divergentes++;
                    resultados.divergencias.push({
                        liga: ligaNome, ligaId, timeId, nomeTime,
                        saldoVerdade: saldoVerdade.saldoFinal,
                        saldoBulk: bulkSaldo,
                        diff,
                        motivo: 'SEM_CACHE'
                    });
                } else {
                    resultados.ok++;
                    resultados.semCache++;
                }
                continue;
            }

            // Com cache - simular bulk
            // v3.2 FIX: Apenas tipos especiais (pre-temporada) usam saldo_consolidado
            const TIPOS_ESPECIAIS = ['INSCRICAO_TEMPORADA', 'SALDO_TEMPORADA_ANTERIOR', 'LEGADO_ANTERIOR'];
            const apenasTransacoesEspeciais = historico.length > 0 &&
                historico.every(t => TIPOS_ESPECIAIS.includes(t.tipo));

            const camposDoc = camposMap.get(timeId);
            const camposAtivos = camposDoc?.campos?.filter(c => c.valor !== 0) || [];

            let bulkSaldoConsolidado = 0;
            if (apenasTransacoesEspeciais) {
                // ✅ v1.1 FIX BUG-002: Para 2026+, NÃO usar saldo_consolidado direto
                // (mesmo fix aplicado nos endpoints de tesouraria v3.3)
                if (temporadaNum >= 2026) {
                    bulkSaldoConsolidado = 0;
                    historico.forEach(t => {
                        if (t.tipo && t.tipo !== 'INSCRICAO_TEMPORADA' && t.tipo !== 'SALDO_TEMPORADA_ANTERIOR') {
                            bulkSaldoConsolidado += t.valor || 0;
                        }
                    });
                } else {
                    bulkSaldoConsolidado = extrato?.saldo_consolidado || 0;
                }
            } else {
                const rodadasProcessadas = transformarTransacoesEmRodadas(historico, ligaId);
                const resumoCalculado = calcularResumoDeRodadas(rodadasProcessadas, camposAtivos);
                bulkSaldoConsolidado = resumoCalculado.saldo;
            }

            // Inscrição
            if (temporadaNum >= 2026) {
                const inscricaoData = inscricoesMap.get(timeId);
                const ajusteInsc = aplicarAjusteInscricaoBulk(bulkSaldoConsolidado, inscricaoData, historico);
                bulkSaldoConsolidado = ajusteInsc.saldoAjustado;
            }

            // Ajustes (v3.2 fix)
            if (temporadaNum >= 2026) {
                const ajustesList = ajustesMap.get(timeId) || [];
                const saldoAjustesBulk = ajustesList.reduce((acc, a) => acc + (a.valor || 0), 0);
                bulkSaldoConsolidado += saldoAjustesBulk;
            }

            // Acertos
            const acertosList = acertosMap.get(timeId) || [];
            let totalPago = 0, totalRecebido = 0;
            acertosList.forEach(a => {
                if (a.tipo === 'pagamento') totalPago += a.valor || 0;
                else if (a.tipo === 'recebimento') totalRecebido += a.valor || 0;
            });
            const saldoAcertos = totalPago - totalRecebido;

            const bulkSaldoFinal = bulkSaldoConsolidado + saldoAcertos;

            // ═══════════════════════════════════════════════════════
            // COMPARAÇÃO
            // ═══════════════════════════════════════════════════════
            const diff = Math.abs(saldoVerdade.saldoFinal - bulkSaldoFinal);

            if (diff > TOLERANCIA) {
                resultados.divergentes++;

                // Detalhar a divergência
                const detalhes = [];
                if (saldoVerdade.saldoAjustes !== 0) detalhes.push(`ajustes=${saldoVerdade.saldoAjustes}`);
                if (saldoVerdade.taxaInscricao !== 0) detalhes.push(`taxa=${saldoVerdade.taxaInscricao}`);
                if (saldoVerdade.saldoAnteriorTransferido !== 0) detalhes.push(`legado=${saldoVerdade.saldoAnteriorTransferido}`);
                if (saldoVerdade.dividaAnterior !== 0) detalhes.push(`divida=${saldoVerdade.dividaAnterior}`);

                console.log(cor('red', `  ❌ ${nomeTime} (${timeId}): Verdade=${saldoVerdade.saldoFinal.toFixed(2)} | Bulk=${bulkSaldoFinal.toFixed(2)} | Diff=${diff.toFixed(2)} [${detalhes.join(', ')}]`));

                resultados.divergencias.push({
                    liga: ligaNome, ligaId, timeId, nomeTime,
                    saldoVerdade: saldoVerdade.saldoFinal,
                    saldoBulk: bulkSaldoFinal,
                    diff,
                    detalhes: {
                        saldoTemporada: saldoVerdade.saldoTemporada,
                        saldoAcertos: saldoVerdade.saldoAcertos,
                        saldoAjustes: saldoVerdade.saldoAjustes,
                        taxaInscricao: saldoVerdade.taxaInscricao,
                        pagouInscricao: saldoVerdade.pagouInscricao,
                        saldoAnteriorTransferido: saldoVerdade.saldoAnteriorTransferido,
                        dividaAnterior: saldoVerdade.dividaAnterior,
                        bulkSaldoConsolidado,
                        bulkSaldoAcertos: saldoAcertos,
                        apenasTransacoesEspeciais,
                        cacheSaldoConsolidado: extrato.saldo_consolidado,
                        cacheVersao: extrato.versao_calculo,
                    },
                    motivo: 'DIVERGENCIA_SALDO'
                });
            } else {
                resultados.ok++;
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // RELATÓRIO FINAL
    // ═══════════════════════════════════════════════════════
    console.log(cor('cyan', '\n═══════════════════════════════════════════════════════════════'));
    console.log(cor('bright', '  RESULTADO DA AUDITORIA'));
    console.log(cor('cyan', '═══════════════════════════════════════════════════════════════'));

    console.log(`  Total auditados:   ${resultados.total}`);
    console.log(cor('green', `  ✅ OK:              ${resultados.ok}`));
    console.log(cor('red', `  ❌ Divergentes:     ${resultados.divergentes}`));
    console.log(cor('gray', `  ⚠️  Sem cache:      ${resultados.semCache}`));

    if (resultados.divergencias.length > 0) {
        console.log(cor('yellow', '\n  DIVERGÊNCIAS ENCONTRADAS:'));
        for (const d of resultados.divergencias) {
            console.log(cor('red', `\n  ${d.nomeTime} (${d.timeId}) - ${d.liga}`));
            console.log(cor('gray', `    Verdade: R$ ${d.saldoVerdade?.toFixed(2) || 'N/A'}`));
            console.log(cor('gray', `    Bulk:    R$ ${d.saldoBulk?.toFixed(2) || 'N/A'}`));
            console.log(cor('gray', `    Diff:    R$ ${d.diff?.toFixed(2) || 'N/A'}`));
            if (d.detalhes) {
                console.log(cor('gray', `    Cache saldo_consolidado: ${d.detalhes.cacheSaldoConsolidado}`));
                console.log(cor('gray', `    Cache versão: ${d.detalhes.cacheVersao}`));
                console.log(cor('gray', `    apenasTransacoesEspeciais: ${d.detalhes.apenasTransacoesEspeciais}`));
                console.log(cor('gray', `    Breakdown verdade: temp=${d.detalhes.saldoTemporada} acertos=${d.detalhes.saldoAcertos} ajustes=${d.detalhes.saldoAjustes} inscricao=${d.detalhes.taxaInscricao} legado=${d.detalhes.saldoAnteriorTransferido} divida=${d.detalhes.dividaAnterior}`));
            }
            if (d.erro) {
                console.log(cor('red', `    Erro: ${d.erro}`));
            }
        }
    } else {
        console.log(cor('green', '\n  ✅ ZERO DIVERGÊNCIAS! Todos os caminhos de cálculo estão sincronizados.'));
    }

    console.log('');
    await mongoose.disconnect();
}

auditar().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
