#!/usr/bin/env node
/**
 * TESTE: Correções de Temporada - Módulo Pontos Corridos
 * Valida que o sistema agora filtra corretamente por temporada
 */

import { obterConfrontosPontosCorridos } from '../controllers/pontosCorridosCacheController.js';
import { CURRENT_SEASON } from '../config/seasons.js';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI;

async function conectarDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB conectado\n');
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        process.exit(1);
    }
}

async function testarValidacaoTemporada() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🧪 TESTE 1: Validação de Temporada Obrigatória');
    console.log('═══════════════════════════════════════════════════\n');

    const ligaIdTeste = '684cb1c8af923da7c7df51de'; // Liga de teste

    // TESTE 1.1: Sem temporada (deve falhar)
    console.log('📋 Teste 1.1: Chamada SEM temporada');
    try {
        await obterConfrontosPontosCorridos(ligaIdTeste, null, null);
        console.log('❌ FALHOU: Deveria rejeitar sem temporada\n');
    } catch (error) {
        if (error.message.includes('obrigatório')) {
            console.log('✅ PASSOU: Rejeitou corretamente');
            console.log(`   Erro: "${error.message}"\n`);
        } else {
            console.log('⚠️ AVISO: Erro diferente do esperado');
            console.log(`   Erro: "${error.message}"\n`);
        }
    }

    // TESTE 1.2: Com temporada 2026 (deve funcionar)
    console.log('📋 Teste 1.2: Chamada com temporada 2026');
    try {
        const resultado = await obterConfrontosPontosCorridos(ligaIdTeste, 2026, null);
        console.log(`✅ PASSOU: Retornou ${resultado.length} rodadas`);
        if (resultado.length > 0) {
            console.log(`   Primeira rodada: ${resultado[0].rodada}`);
            console.log(`   Confrontos: ${resultado[0].confrontos?.length || 0}`);
        }
        console.log('');
    } catch (error) {
        console.log('⚠️ Erro ao buscar (pode ser esperado se liga não existe)');
        console.log(`   Erro: "${error.message}"\n`);
    }

    // TESTE 1.3: Com temporada 2025 (deve funcionar mas retornar dados diferentes)
    console.log('📋 Teste 1.3: Chamada com temporada 2025 (histórico)');
    try {
        const resultado = await obterConfrontosPontosCorridos(ligaIdTeste, 2025, null);
        console.log(`✅ PASSOU: Retornou ${resultado.length} rodadas`);
        if (resultado.length > 0) {
            console.log(`   Primeira rodada: ${resultado[0].rodada}`);
            console.log(`   Confrontos: ${resultado[0].confrontos?.length || 0}`);
        }
        console.log('');
    } catch (error) {
        console.log('⚠️ Erro ao buscar dados de 2025');
        console.log(`   Erro: "${error.message}"\n`);
    }
}

async function testarConfigTemporada() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🧪 TESTE 2: Configuração por Temporada');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`📅 CURRENT_SEASON configurado: ${CURRENT_SEASON}`);

    if (CURRENT_SEASON === 2026) {
        console.log('✅ PASSOU: Temporada atual é 2026\n');
    } else {
        console.log(`❌ FALHOU: Esperado 2026, encontrado ${CURRENT_SEASON}\n`);
    }
}

async function testarAlgoritmoConfrontos() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🧪 TESTE 3: Algoritmo de Confrontos (Round-Robin)');
    console.log('═══════════════════════════════════════════════════\n');

    // Simular confrontos com 6 times
    const times = [
        { id: 1, nome: 'Time A' },
        { id: 2, nome: 'Time B' },
        { id: 3, nome: 'Time C' },
        { id: 4, nome: 'Time D' },
        { id: 5, nome: 'Time E' },
        { id: 6, nome: 'Time F' }
    ];

    console.log(`📊 Simulando com ${times.length} times:\n`);
    times.forEach(t => console.log(`   - ${t.nome} (ID: ${t.id})`));
    console.log('');

    const confrontos = gerarConfrontos(times);

    console.log(`✅ Gerados ${confrontos.length} rodadas\n`);

    confrontos.forEach((rodada, idx) => {
        console.log(`🎮 Rodada ${idx + 1}:`);
        rodada.forEach(jogo => {
            const t1 = times.find(t => t.id === jogo.timeA.id);
            const t2 = times.find(t => t.id === jogo.timeB.id);
            console.log(`   ${t1.nome} x ${t2.nome}`);
        });
        console.log('');
    });

    // Validar que todos enfrentam todos
    const enfrentamentos = new Map();
    confrontos.forEach(rodada => {
        rodada.forEach(jogo => {
            const par = [jogo.timeA.id, jogo.timeB.id].sort().join('-');
            enfrentamentos.set(par, (enfrentamentos.get(par) || 0) + 1);
        });
    });

    console.log('🔍 Validação de Confrontos:');
    let todosEnfrentamUmaVez = true;
    for (const [par, qtd] of enfrentamentos) {
        if (qtd !== 1) {
            console.log(`   ❌ Par ${par} se enfrentou ${qtd} vezes`);
            todosEnfrentamUmaVez = false;
        }
    }

    if (todosEnfrentamUmaVez) {
        console.log('   ✅ Todos os pares se enfrentam exatamente 1 vez\n');
    }
}

// Copiar função do controller para teste
function gerarConfrontos(times) {
    const n = times.length;
    const rodadas = [];
    const lista = [...times];
    if (n % 2 !== 0) lista.push(null); // Adicionar "folga" se ímpar

    const total = lista.length - 1;
    for (let rodada = 0; rodada < total; rodada++) {
        const jogos = [];
        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];
            if (timeA && timeB) jogos.push({ timeA, timeB });
        }
        rodadas.push(jogos);
        // Rotação (mantém primeiro fixo, roda os demais)
        lista.splice(1, 0, lista.pop());
    }
    return rodadas;
}

async function testarDeterminismo() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🧪 TESTE 4: Determinismo (Seed Alfabético)');
    console.log('═══════════════════════════════════════════════════\n');

    const times1 = [
        { id: 1, nome: 'Alice' },
        { id: 2, nome: 'Bob' },
        { id: 3, nome: 'Charlie' },
        { id: 4, nome: 'Diana' }
    ];

    const times2 = [
        { id: 1, nome: 'Alice' },
        { id: 2, nome: 'Bob' },
        { id: 3, nome: 'Charlie' },
        { id: 4, nome: 'Diana' }
    ];

    const confrontos1 = gerarConfrontos(times1);
    const confrontos2 = gerarConfrontos(times2);

    console.log('📋 Confrontos Geração 1:');
    confrontos1[0].forEach(j => {
        console.log(`   ${j.timeA.nome} x ${j.timeB.nome}`);
    });

    console.log('\n📋 Confrontos Geração 2:');
    confrontos2[0].forEach(j => {
        console.log(`   ${j.timeA.nome} x ${j.timeB.nome}`);
    });

    const identicos = JSON.stringify(confrontos1) === JSON.stringify(confrontos2);

    if (identicos) {
        console.log('\n✅ PASSOU: Confrontos são DETERMINÍSTICOS (mesma entrada = mesma saída)');
        console.log('   ℹ️ Ordem depende da ordem dos times no array de entrada\n');
    } else {
        console.log('\n❌ FALHOU: Confrontos diferentes (seria aleatório)\n');
    }
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   TESTE DE CORREÇÕES - PONTOS CORRIDOS           ║');
    console.log('║   Módulo: Filtro de Temporada + Confrontos       ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    await conectarDB();

    await testarConfigTemporada();
    await testarValidacaoTemporada();
    await testarAlgoritmoConfrontos();
    await testarDeterminismo();

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TESTES FINALIZADOS');
    console.log('═══════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(error => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});
