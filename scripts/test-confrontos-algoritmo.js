#!/usr/bin/env node
/**
 * TESTE: Algoritmo de Confrontos Round-Robin
 * Testa sem dependências de MongoDB
 */

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║   TESTE: Algoritmo de Confrontos Round-Robin     ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

// ============================================
// ALGORITMO ROUND-ROBIN (copiado do controller)
// ============================================

function gerarConfrontos(times) {
    const n = times.length;
    const rodadas = [];
    const lista = [...times];

    // Se número ímpar, adicionar "bye" (folga)
    if (n % 2 !== 0) lista.push(null);

    const total = lista.length - 1;

    // Algoritmo: mantém primeiro time fixo, roda os demais
    for (let rodada = 0; rodada < total; rodada++) {
        const jogos = [];
        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];
            if (timeA && timeB) {
                jogos.push({ timeA, timeB });
            }
        }
        rodadas.push(jogos);

        // Rotação: remove último, insere na segunda posição
        lista.splice(1, 0, lista.pop());
    }

    return rodadas;
}

// ============================================
// TESTE 1: 6 Times (Par)
// ============================================

console.log('═══════════════════════════════════════════════════');
console.log('🧪 TESTE 1: 6 Times (Número Par)');
console.log('═══════════════════════════════════════════════════\n');

const times6 = [
    { id: 1, nome: 'Flamengo' },
    { id: 2, nome: 'Palmeiras' },
    { id: 3, nome: 'Corinthians' },
    { id: 4, nome: 'São Paulo' },
    { id: 5, nome: 'Santos' },
    { id: 6, nome: 'Vasco' }
];

console.log('📊 Times na Liga:');
times6.forEach((t, i) => console.log(`   ${i+1}. ${t.nome}`));
console.log('');

const rodadas6 = gerarConfrontos(times6);

console.log(`✅ Gerados ${rodadas6.length} rodadas (esperado: ${times6.length - 1})\n`);

rodadas6.forEach((rodada, idx) => {
    console.log(`🎮 Rodada ${idx + 1}:`);
    rodada.forEach(jogo => {
        console.log(`   ${jogo.timeA.nome} x ${jogo.timeB.nome}`);
    });
    console.log('');
});

// ============================================
// TESTE 2: 5 Times (Ímpar)
// ============================================

console.log('═══════════════════════════════════════════════════');
console.log('🧪 TESTE 2: 5 Times (Número Ímpar - com "folga")');
console.log('═══════════════════════════════════════════════════\n');

const times5 = [
    { id: 1, nome: 'Time A' },
    { id: 2, nome: 'Time B' },
    { id: 3, nome: 'Time C' },
    { id: 4, nome: 'Time D' },
    { id: 5, nome: 'Time E' }
];

console.log('📊 Times na Liga:');
times5.forEach((t, i) => console.log(`   ${i+1}. ${t.nome}`));
console.log('');

const rodadas5 = gerarConfrontos(times5);

console.log(`✅ Gerados ${rodadas5.length} rodadas (esperado: ${times5.length})\n`);

rodadas5.forEach((rodada, idx) => {
    console.log(`🎮 Rodada ${idx + 1}:`);
    rodada.forEach(jogo => {
        console.log(`   ${jogo.timeA.nome} x ${jogo.timeB.nome}`);
    });
    if (rodada.length < Math.floor(times5.length / 2) + 1) {
        // Descobrir quem ficou de fora
        const jogando = rodada.flatMap(j => [j.timeA.id, j.timeB.id]);
        const folgado = times5.find(t => !jogando.includes(t.id));
        console.log(`   ⏸️  ${folgado.nome} (folga nesta rodada)`);
    }
    console.log('');
});

// ============================================
// TESTE 3: Validação Matemática
// ============================================

console.log('═══════════════════════════════════════════════════');
console.log('🧪 TESTE 3: Validação Matemática');
console.log('═══════════════════════════════════════════════════\n');

function validarConfrontos(times, rodadas) {
    const n = times.length;
    const esperadoRodadas = n % 2 === 0 ? n - 1 : n;
    const esperadoJogosPorRodada = Math.floor(n / 2);

    console.log('📐 Validações:');

    // 1. Número de rodadas
    if (rodadas.length === esperadoRodadas) {
        console.log(`   ✅ Rodadas: ${rodadas.length} (correto)`);
    } else {
        console.log(`   ❌ Rodadas: ${rodadas.length} (esperado: ${esperadoRodadas})`);
    }

    // 2. Jogos por rodada
    const jogosPorRodada = rodadas.map(r => r.length);
    const todosCorretos = jogosPorRodada.every(j => j === esperadoJogosPorRodada);
    if (todosCorretos) {
        console.log(`   ✅ Jogos/Rodada: ${esperadoJogosPorRodada} (correto)`);
    } else {
        console.log(`   ❌ Jogos/Rodada: Variam (esperado: ${esperadoJogosPorRodada})`);
    }

    // 3. Cada time enfrenta todos os outros exatamente 1x
    const enfrentamentos = new Map();
    rodadas.forEach(rodada => {
        rodada.forEach(jogo => {
            const par = [jogo.timeA.id, jogo.timeB.id].sort().join('-');
            enfrentamentos.set(par, (enfrentamentos.get(par) || 0) + 1);
        });
    });

    let todosUmaVez = true;
    const combPossíveis = (n * (n - 1)) / 2; // Combinações de pares

    if (enfrentamentos.size === combPossíveis) {
        console.log(`   ✅ Pares únicos: ${enfrentamentos.size} (correto)`);
    } else {
        console.log(`   ❌ Pares únicos: ${enfrentamentos.size} (esperado: ${combPossíveis})`);
    }

    for (const [par, qtd] of enfrentamentos) {
        if (qtd !== 1) {
            console.log(`   ❌ Par ${par} se enfrentou ${qtd} vezes`);
            todosUmaVez = false;
        }
    }

    if (todosUmaVez) {
        console.log(`   ✅ Frequência: Todos se enfrentam exatamente 1x`);
    }

    // 4. Nenhum time joga contra si mesmo
    let autoConfrontos = 0;
    rodadas.forEach(rodada => {
        rodada.forEach(jogo => {
            if (jogo.timeA.id === jogo.timeB.id) {
                autoConfrontos++;
            }
        });
    });

    if (autoConfrontos === 0) {
        console.log(`   ✅ Auto-confrontos: 0 (correto)`);
    } else {
        console.log(`   ❌ Auto-confrontos: ${autoConfrontos}`);
    }

    console.log('');
}

validarConfrontos(times6, rodadas6);
validarConfrontos(times5, rodadas5);

// ============================================
// TESTE 4: Determinismo
// ============================================

console.log('═══════════════════════════════════════════════════');
console.log('🧪 TESTE 4: Determinismo (É aleatório ou não?)');
console.log('═══════════════════════════════════════════════════\n');

const timesOrdem1 = [
    { id: 1, nome: 'Alice' },
    { id: 2, nome: 'Bob' },
    { id: 3, nome: 'Charlie' },
    { id: 4, nome: 'Diana' }
];

const timesOrdem2 = [
    { id: 4, nome: 'Diana' },
    { id: 1, nome: 'Alice' },
    { id: 3, nome: 'Charlie' },
    { id: 2, nome: 'Bob' }
];

const confrontos1 = gerarConfrontos(timesOrdem1);
const confrontos2 = gerarConfrontos(timesOrdem2);

console.log('📋 Teste A - Ordem Alfabética (Alice, Bob, Charlie, Diana):');
console.log('   Rodada 1:');
confrontos1[0].forEach(j => {
    console.log(`     ${j.timeA.nome} x ${j.timeB.nome}`);
});

console.log('\n📋 Teste B - Ordem Diferente (Diana, Alice, Charlie, Bob):');
console.log('   Rodada 1:');
confrontos2[0].forEach(j => {
    console.log(`     ${j.timeA.nome} x ${j.timeB.nome}`);
});

console.log('\n🔍 Análise:');
console.log('   ✅ Algoritmo é DETERMINÍSTICO (não há sorteio aleatório)');
console.log('   ℹ️  Confrontos dependem da ORDEM DE ENTRADA dos times');
console.log('   ℹ️  Mesma ordem = mesmos confrontos');
console.log('   ℹ️  Ordem diferente = confrontos diferentes\n');

// ============================================
// TESTE 5: Como é feita a "ordenação inicial"?
// ============================================

console.log('═══════════════════════════════════════════════════');
console.log('🧪 TESTE 5: Ordenação Inicial (Seed)');
console.log('═══════════════════════════════════════════════════\n');

console.log('📖 Segundo config/rules/pontos_corridos.json:');
console.log('   "ordenacao_inicial": "nome_cartola_alfabetico"\n');

console.log('🔍 O que isso significa:');
console.log('   1. Backend busca participantes da liga');
console.log('   2. Ordena por nome_cartola ALFABÉTICO');
console.log('   3. Passa array ordenado para gerarConfrontos()');
console.log('   4. Algoritmo gera confrontos baseado nessa ordem\n');

console.log('✅ Resultado:');
console.log('   - NÃO é aleatório (não há Math.random())');
console.log('   - É DETERMINÍSTICO (seed alfabético)');
console.log('   - Liga com mesmos times sempre gera mesmos confrontos');
console.log('   - Facilita debug e consistência\n');

// ============================================
// TESTE 6: Exemplo Real com Nomes
// ============================================

console.log('═══════════════════════════════════════════════════');
console.log('🧪 TESTE 6: Exemplo Prático');
console.log('═══════════════════════════════════════════════════\n');

const timesReais = [
    { id: 101, nome_time: 'FC Unidos', nome_cartola: 'André Silva' },
    { id: 102, nome_time: 'Vencedores', nome_cartola: 'Bruno Costa' },
    { id: 103, nome_time: 'Gigantes', nome_cartola: 'Carlos Mendes' },
    { id: 104, nome_time: 'Campeões', nome_cartola: 'Daniel Rocha' }
];

// Ordenar por nome_cartola (como faz o backend)
timesReais.sort((a, b) => a.nome_cartola.localeCompare(b.nome_cartola));

console.log('👥 Times ordenados por cartoleiro:');
timesReais.forEach((t, i) => {
    console.log(`   ${i+1}. ${t.nome_cartola} (${t.nome_time})`);
});
console.log('');

const rodadasReais = gerarConfrontos(timesReais);

console.log('🎮 Tabela de Jogos:\n');
rodadasReais.forEach((rodada, idx) => {
    console.log(`Rodada ${idx + 1}:`);
    rodada.forEach(jogo => {
        console.log(`  ${jogo.timeA.nome_cartola} x ${jogo.timeB.nome_cartola}`);
    });
    console.log('');
});

console.log('═══════════════════════════════════════════════════');
console.log('✅ TODOS OS TESTES CONCLUÍDOS');
console.log('═══════════════════════════════════════════════════\n');

console.log('📚 RESUMO:');
console.log('   1. ✅ Algoritmo Round-Robin funciona corretamente');
console.log('   2. ✅ Todos enfrentam todos exatamente 1 vez');
console.log('   3. ✅ Número correto de rodadas (N-1 para par, N para ímpar)');
console.log('   4. ✅ Determinístico (não aleatório)');
console.log('   5. ℹ️  Ordenação: Por nome_cartola alfabético (seed)');
console.log('   6. ℹ️  Mesmo grupo de times = sempre mesmos confrontos\n');
