#!/usr/bin/env node
/**
 * TESTE: Wizard Pontos Corridos
 * Valida se as opções dos selects estão configuradas corretamente
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

console.log('🧪 TESTE: Wizard Pontos Corridos\n');
console.log('='.repeat(60));

async function testarWizard() {
    try {
        console.log('\n📡 Buscando wizard da API...');
        const response = await fetch(`${BASE_URL}/api/modulos/pontos_corridos/wizard`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.sucesso) {
            throw new Error(data.erro || 'Erro ao buscar wizard');
        }

        console.log('✅ API respondeu com sucesso\n');

        // Validar estrutura
        console.log('📋 VALIDAÇÕES:');
        console.log(`   - Módulo: ${data.modulo.nome}`);
        console.log(`   - Total de perguntas: ${data.wizard.perguntas.length}`);

        // Contar selects
        const selects = data.wizard.perguntas.filter(p => p.tipo === 'select');
        console.log(`   - Perguntas tipo SELECT: ${selects.length}\n`);

        // Validar cada select
        console.log('🔍 DETALHAMENTO DOS SELECTS:\n');

        let todosValidos = true;

        selects.forEach((pergunta, index) => {
            const numOpcoes = pergunta.opcoes?.length || 0;
            const status = numOpcoes > 0 ? '✅' : '❌';

            if (numOpcoes === 0) {
                todosValidos = false;
            }

            console.log(`${status} ${index + 1}. ${pergunta.label}`);
            console.log(`   ID: ${pergunta.id}`);
            console.log(`   Opções: ${numOpcoes}`);

            if (pergunta.condicional) {
                console.log(`   Condicional: ${pergunta.condicional.campo} === "${pergunta.condicional.valor}"`);
            }

            if (numOpcoes > 0) {
                pergunta.opcoes.forEach(op => {
                    const valor = typeof op === 'object' ? op.value : op;
                    const rotulo = typeof op === 'object' ? op.label : op;
                    console.log(`     - ${valor}: "${rotulo}"`);
                });
            } else {
                console.log('     ⚠️  SEM OPÇÕES!');
            }

            console.log('');
        });

        // Resultado final
        console.log('='.repeat(60));
        if (todosValidos) {
            console.log('✅ TODOS OS SELECTS ESTÃO VÁLIDOS!');
            console.log('\n💡 Se as opções não aparecem no navegador:');
            console.log('   1. Faça Hard Refresh: Ctrl + Shift + R');
            console.log('   2. Limpe o cache do navegador');
            console.log('   3. Verifique o Console (F12) por erros JavaScript');
        } else {
            console.log('❌ ALGUNS SELECTS ESTÃO SEM OPÇÕES!');
            console.log('\n🔧 AÇÃO NECESSÁRIA:');
            console.log('   - Verificar arquivo: config/rules/pontos_corridos.json');
            console.log('   - Garantir que cada pergunta tipo "select" tem array "opcoes"');
        }

        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        process.exit(1);
    }
}

// Executar teste
testarWizard();
