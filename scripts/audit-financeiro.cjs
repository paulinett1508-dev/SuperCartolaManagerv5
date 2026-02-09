#!/usr/bin/env node
/**
 * DEPRECATED - Use auditoria-financeira-completa.js
 *
 * Este script foi substituído pelo novo script ESM que:
 * - Compara saldo de TODOS os participantes
 * - Usa a fonte da verdade (calcularSaldoParticipante)
 * - Detecta divergências entre caminhos de cálculo
 *
 * Uso do novo script:
 *   node scripts/auditoria-financeira-completa.js --dry-run
 *   node scripts/auditoria-financeira-completa.js --dry-run --liga=ID
 *   node scripts/auditoria-financeira-completa.js --dry-run --temporada=2026
 *
 * @deprecated desde v3.2 (2026-02-09)
 * @see auditoria-financeira-completa.js
 */

console.log('\x1b[33m');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  ⚠️  SCRIPT DEPRECADO                                          ║');
console.log('║                                                                ║');
console.log('║  Este script foi substituído por:                              ║');
console.log('║  node scripts/auditoria-financeira-completa.js --dry-run       ║');
console.log('║                                                                ║');
console.log('║  O novo script:                                                ║');
console.log('║  ✓ Audita TODOS participantes de uma vez                       ║');
console.log('║  ✓ Compara fonte-da-verdade vs cálculo bulk                    ║');
console.log('║  ✓ Detecta divergências automáticamente                        ║');
console.log('║  ✓ Suporta filtro por liga e temporada                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('\x1b[0m');

console.log('\nExemplos de uso:');
console.log('  node scripts/auditoria-financeira-completa.js --dry-run');
console.log('  node scripts/auditoria-financeira-completa.js --dry-run --liga=684cb1c8af923da7c7df51de');
console.log('  node scripts/auditoria-financeira-completa.js --dry-run --temporada=2025\n');

process.exit(0);
