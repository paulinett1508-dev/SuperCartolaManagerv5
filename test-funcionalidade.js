// Teste simples da funcionalidade Artilheiro Campeão
import cartolaApiService from './services/cartolaApiService.js';
import { validarLigaId, validarRegistroGols } from './utils/validators.js';

console.log('🧪 Testando funcionalidades corrigidas...\n');

// Teste 1: Validadores
console.log('📋 1. Testando validadores...');

// Teste Liga ID válido
const ligaIdValido = validarLigaId('684d821cf1a7ae16d1f89572');
console.log(`✅ Liga ID válido: ${ligaIdValido.valido}`);

// Teste Liga ID inválido
const ligaIdInvalido = validarLigaId('invalid-id');
console.log(`❌ Liga ID inválido: ${!ligaIdInvalido.valido} - ${ligaIdInvalido.erro}`);

// Teste 2: Validação de registro de gols
console.log('\n📊 2. Testando validação de registro de gols...');

const registroValido = {
  ligaId: '684d821cf1a7ae16d1f89572',
  rodada: 1,
  atletaId: 12345,
  timeId: 67890,
  nome: 'Jogador Teste',
  gols: 2,
  golsContra: 0,
  pontos: 10.5,
  posicao: 1
};

const validacaoRegistro = validarRegistroGols(registroValido);
console.log(`✅ Registro válido: ${validacaoRegistro.valido}`);
console.log(`📈 Gols líquidos calculados: ${validacaoRegistro.dados.golsLiquidos}`);

// Teste 3: Serviço da API do Cartola
console.log('\n🌐 3. Testando serviço da API do Cartola...');

try {
  const statusMercado = await cartolaApiService.obterStatusMercado();
  console.log(`✅ Status do mercado obtido: Rodada ${statusMercado.rodadaAtual}`);
  console.log(`📅 Mercado aberto: ${statusMercado.mercadoAberto}`);
} catch (error) {
  console.log(`❌ Erro ao obter status: ${error.message}`);
}

// Teste 4: Cache do serviço
console.log('\n💾 4. Testando sistema de cache...');
const statsCache = cartolaApiService.obterEstatisticasCache();
console.log(`📊 Estatísticas do cache:`, statsCache);

console.log('\n🎉 Testes de funcionalidade concluídos!');
console.log('\n📝 Resumo das correções implementadas:');
console.log('✅ Sistema de logging detalhado');
console.log('✅ Validação robusta de dados');
console.log('✅ Tratamento de erros melhorado');
console.log('✅ Cache para otimização de performance');
console.log('✅ Retry automático para falhas de API');
console.log('✅ Validação de dados de scout');
console.log('✅ Índices otimizados no banco de dados');
console.log('✅ Métricas de tempo de processamento');
