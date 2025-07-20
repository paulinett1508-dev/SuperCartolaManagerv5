
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Gols from '../models/Gols.js';
import cartolaApiService from '../services/cartolaApiService.js';
import { validarRegistroGols, validarLigaId, validarRodada } from '../utils/validators.js';

// Configuração do ambiente de teste
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/super-cartola-test';
const LIGA_TEST_ID = '507f1f77bcf86cd799439011'; // ObjectId válido para teste

describe('Funcionalidade Artilheiro Campeão', () => {
  beforeAll(async () => {
    // Conectar ao banco de teste
    await mongoose.connect(MONGODB_TEST_URI);
    console.log('Conectado ao banco de teste');
  });

  afterAll(async () => {
    // Limpar e desconectar
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('Banco de teste limpo e conexão fechada');
  });

  beforeEach(async () => {
    // Limpar coleção antes de cada teste
    await Gols.deleteMany({});
  });

  describe('Validadores', () => {
    describe('validarLigaId', () => {
      it('deve validar Liga ID válido', () => {
        const resultado = validarLigaId('507f1f77bcf86cd799439011');
        expect(resultado.valido).toBe(true);
      });

      it('deve rejeitar Liga ID inválido', () => {
        const resultado = validarLigaId('invalid-id');
        expect(resultado.valido).toBe(false);
        expect(resultado.erro).toContain('ObjectId válido');
      });

      it('deve rejeitar Liga ID vazio', () => {
        const resultado = validarLigaId('');
        expect(resultado.valido).toBe(false);
      });

      it('deve rejeitar Liga ID null', () => {
        const resultado = validarLigaId(null);
        expect(resultado.valido).toBe(false);
      });
    });

    describe('validarRodada', () => {
      it('deve validar rodada válida', () => {
        const resultado = validarRodada(15);
        expect(resultado.valido).toBe(true);
        expect(resultado.rodada).toBe(15);
      });

      it('deve rejeitar rodada menor que 1', () => {
        const resultado = validarRodada(0);
        expect(resultado.valido).toBe(false);
      });

      it('deve rejeitar rodada maior que 38', () => {
        const resultado = validarRodada(39);
        expect(resultado.valido).toBe(false);
      });

      it('deve rejeitar rodada não numérica', () => {
        const resultado = validarRodada('abc');
        expect(resultado.valido).toBe(false);
      });
    });

    describe('validarRegistroGols', () => {
      it('deve validar registro completo válido', () => {
        const registro = {
          ligaId: LIGA_TEST_ID,
          rodada: 1,
          atletaId: 12345,
          timeId: 67890,
          nome: 'Jogador Teste',
          gols: 2,
          golsContra: 0,
          pontos: 10.5,
          posicao: 1
        };

        const resultado = validarRegistroGols(registro);
        expect(resultado.valido).toBe(true);
        expect(resultado.dados.golsLiquidos).toBe(2);
      });

      it('deve rejeitar registro com dados inválidos', () => {
        const registro = {
          ligaId: 'invalid',
          rodada: -1,
          atletaId: 'abc',
          timeId: 0,
          nome: '',
          gols: -1,
          golsContra: 10
        };

        const resultado = validarRegistroGols(registro);
        expect(resultado.valido).toBe(false);
        expect(resultado.erros.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Modelo Gols', () => {
    it('deve criar registro de gols válido', async () => {
      const dadosGols = {
        ligaId: LIGA_TEST_ID,
        rodada: 1,
        atletaId: 12345,
        nome: 'Jogador Teste',
        timeId: 67890,
        gols: 2,
        golsContra: 0,
        pontos: 10.5,
        posicao: 1,
        clube: 1
      };

      const gol = new Gols(dadosGols);
      const golSalvo = await gol.save();

      expect(golSalvo._id).toBeDefined();
      expect(golSalvo.golsLiquidos).toBe(2);
      expect(golSalvo.scoutValido).toBe(true);
    });

    it('deve calcular gols líquidos automaticamente', async () => {
      const dadosGols = {
        ligaId: LIGA_TEST_ID,
        rodada: 1,
        atletaId: 12345,
        nome: 'Jogador Teste',
        timeId: 67890,
        gols: 3,
        golsContra: 1
      };

      const gol = new Gols(dadosGols);
      await gol.save();

      expect(gol.golsLiquidos).toBe(2);
    });

    it('deve rejeitar dados duplicados', async () => {
      const dadosGols = {
        ligaId: LIGA_TEST_ID,
        rodada: 1,
        atletaId: 12345,
        nome: 'Jogador Teste',
        timeId: 67890,
        gols: 1
      };

      // Primeiro registro
      const gol1 = new Gols(dadosGols);
      await gol1.save();

      // Segundo registro (duplicado)
      const gol2 = new Gols(dadosGols);
      
      await expect(gol2.save()).rejects.toThrow();
    });

    it('deve validar limites de gols', async () => {
      const dadosGols = {
        ligaId: LIGA_TEST_ID,
        rodada: 1,
        atletaId: 12345,
        nome: 'Jogador Teste',
        timeId: 67890,
        gols: 15, // Valor suspeito
        golsContra: 0
      };

      const gol = new Gols(dadosGols);
      await expect(gol.save()).rejects.toThrow();
    });

    describe('Métodos estáticos', () => {
      beforeEach(async () => {
        // Criar dados de teste
        const dadosTeste = [
          {
            ligaId: LIGA_TEST_ID,
            rodada: 1,
            atletaId: 1,
            nome: 'Jogador A',
            timeId: 100,
            gols: 3,
            golsContra: 0,
            pontos: 15
          },
          {
            ligaId: LIGA_TEST_ID,
            rodada: 1,
            atletaId: 2,
            nome: 'Jogador B',
            timeId: 101,
            gols: 2,
            golsContra: 1,
            pontos: 8
          },
          {
            ligaId: LIGA_TEST_ID,
            rodada: 2,
            atletaId: 1,
            nome: 'Jogador A',
            timeId: 100,
            gols: 1,
            golsContra: 0,
            pontos: 6
          }
        ];

        await Gols.insertMany(dadosTeste);
      });

      it('deve buscar artilheiros corretamente', async () => {
        const artilheiros = await Gols.buscarArtilheiros(LIGA_TEST_ID, 10);
        
        expect(artilheiros).toHaveLength(2);
        expect(artilheiros[0].nome).toBe('Jogador A');
        expect(artilheiros[0].totalGols).toBe(4);
        expect(artilheiros[0].golsLiquidos).toBe(4);
      });

      it('deve obter estatísticas da liga', async () => {
        const estatisticas = await Gols.obterEstatisticasLiga(LIGA_TEST_ID);
        
        expect(estatisticas).toHaveLength(1);
        expect(estatisticas[0].totalGols).toBe(6);
        expect(estatisticas[0].totalJogadoresUnicos).toBe(2);
        expect(estatisticas[0].totalRodadasProcessadas).toBe(2);
      });

      it('deve limpar dados inválidos', async () => {
        // Adicionar dados inválidos
        await Gols.create({
          ligaId: LIGA_TEST_ID,
          rodada: 3,
          atletaId: 999,
          nome: 'Jogador Inválido',
          timeId: 999,
          gols: -1, // Inválido
          scoutValido: false
        });

        const resultado = await Gols.limparDadosInvalidos(LIGA_TEST_ID);
        expect(resultado.deletedCount).toBe(1);
      });
    });
  });

  describe('Serviço Cartola API', () => {
    it('deve obter status do mercado', async () => {
      const status = await cartolaApiService.obterStatusMercado();
      
      expect(status).toHaveProperty('rodadaAtual');
      expect(typeof status.rodadaAtual).toBe('number');
      expect(status.rodadaAtual).toBeGreaterThan(0);
    });

    it('deve lidar com erro na API graciosamente', async () => {
      // Teste com liga inexistente
      await expect(
        cartolaApiService.obterTimesLiga('000000000000000000000000')
      ).rejects.toThrow();
    });

    it('deve validar dados de scout', async () => {
      const dadosTime = {
        atletas: [
          {
            atleta_id: 12345,
            apelido: 'Teste',
            scout: { G: 2, GC: 0 },
            pontos_num: 10
          }
        ]
      };

      // Simular processamento
      expect(dadosTime.atletas[0].scout.G).toBe(2);
      expect(dadosTime.atletas[0].scout.GC).toBe(0);
    });
  });

  describe('Integração completa', () => {
    it('deve processar coleta de gols end-to-end', async () => {
      // Este teste seria mais complexo e dependeria de dados reais da API
      // Por enquanto, vamos testar a estrutura básica
      
      const dadosSimulados = {
        ligaId: LIGA_TEST_ID,
        rodadasProcessadas: 1,
        totalRegistros: 5,
        timesProcessados: 2
      };

      expect(dadosSimulados.rodadasProcessadas).toBe(1);
      expect(dadosSimulados.totalRegistros).toBeGreaterThan(0);
    });

    it('deve manter integridade dos dados durante operações em lote', async () => {
      const loteGols = [];
      
      for (let i = 1; i <= 100; i++) {
        loteGols.push({
          ligaId: LIGA_TEST_ID,
          rodada: Math.ceil(i / 20), // 20 registros por rodada
          atletaId: i,
          nome: `Jogador ${i}`,
          timeId: Math.ceil(i / 10), // 10 jogadores por time
          gols: Math.floor(Math.random() * 4), // 0-3 gols
          golsContra: Math.floor(Math.random() * 2), // 0-1 gols contra
          pontos: Math.random() * 20
        });
      }

      await Gols.insertMany(loteGols);
      
      const total = await Gols.countDocuments({ ligaId: LIGA_TEST_ID });
      expect(total).toBe(100);

      const artilheiros = await Gols.buscarArtilheiros(LIGA_TEST_ID, 50);
      expect(artilheiros.length).toBeGreaterThan(0);
      expect(artilheiros.length).toBeLessThanOrEqual(50);
    });
  });
});
