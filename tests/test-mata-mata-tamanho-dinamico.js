/**
 * TESTE: Verificação de Tamanho Dinâmico do Mata-Mata
 * 
 * Propósito: Validar que o sistema calcula corretamente o tamanho
 * do torneio baseado no número de participantes ativos.
 * 
 * Cenários:
 * - 8 participantes → torneio de 8
 * - 10 participantes → torneio de 8
 * - 20 participantes → torneio de 16
 * - 32 participantes → torneio de 32
 * - 35 participantes → torneio de 32
 * - 7 participantes → erro (mínimo 8)
 */

import { calcularTamanhoIdealMataMata } from '../utils/tournamentUtils.js';

const testCases = [
  { participantes: 7, esperado: 0, descricao: "Menos que mínimo (8)" },
  { participantes: 8, esperado: 8, descricao: "Exatamente 8" },
  { participantes: 10, esperado: 8, descricao: "Entre 8 e 16" },
  { participantes: 15, esperado: 8, descricao: "Quase 16" },
  { participantes: 16, esperado: 16, descricao: "Exatamente 16" },
  { participantes: 20, esperado: 16, descricao: "Entre 16 e 32" },
  { participantes: 30, esperado: 16, descricao: "Quase 32" },
  { participantes: 32, esperado: 32, descricao: "Exatamente 32" },
  { participantes: 35, esperado: 32, descricao: "Entre 32 e 64" },
  { participantes: 50, esperado: 32, descricao: "Próximo de 64" },
  { participantes: 64, esperado: 64, descricao: "Máximo (64)" },
  { participantes: 70, esperado: 64, descricao: "Acima do máximo" }
];

function runTests() {
  console.log('🧪 TESTE: Cálculo de Tamanho Dinâmico do Mata-Mata\n');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(({ participantes, esperado, descricao }) => {
    const resultado = calcularTamanhoIdealMataMata(participantes);
    const sucesso = resultado === esperado;
    
    if (sucesso) {
      console.log(`✅ ${descricao}: ${participantes} → ${resultado} (esperado: ${esperado})`);
      passed++;
    } else {
      console.error(`❌ ${descricao}: ${participantes} → ${resultado} (esperado: ${esperado})`);
      failed++;
    }
  });
  
  console.log(`\n📊 RESULTADO: ${passed} passaram, ${failed} falharam`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
