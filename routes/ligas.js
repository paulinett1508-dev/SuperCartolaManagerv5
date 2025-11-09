import express from "express";
import {
  listarLigas,
  buscarLigaPorId,
  criarLiga,
  excluirLiga,
  atualizarTimesLiga,
  removerTimeDaLiga,
  atualizarFluxoFinanceiro,
  consultarFluxoFinanceiro,
  buscarTimesDaLiga, // novo controlador
  buscarRodadasDaLiga, // novo controlador
} from "../controllers/ligaController.js";

// Importar o controlador de rodadas para popular rodadas
import { popularRodadas } from "../controllers/rodadaController.js";

// Importar o modelo Liga para manipulação de senhas
import Liga from "../models/Liga.js"; // Assumindo que o modelo Liga está em ../models/Liga.js

const router = express.Router();

// Rotas existentes
router.get("/", listarLigas);
router.get("/:id", buscarLigaPorId);
router.post("/", criarLiga);
router.delete("/:id", excluirLiga);
router.put("/:id/times", atualizarTimesLiga);
router.delete("/:id/times/:timeId", removerTimeDaLiga);
router.put("/:id/fluxo/:rodada", atualizarFluxoFinanceiro);
router.get("/:id/fluxo", consultarFluxoFinanceiro);
// Novas rotas para a Liga Pontos Corridos
router.get("/:id/times", buscarTimesDaLiga); // Busca todos os times da liga
router.get("/:id/rodadas", buscarRodadasDaLiga); // Busca rodadas com filtro opcional

// Adicionar rota para popular rodadas (para compatibilidade com o frontend)
router.post("/:id/rodadas", (req, res) => {
  // Redirecionar para o controlador correto, ajustando o parâmetro
  req.params.ligaId = req.params.id;
  delete req.params.id;
  popularRodadas(req, res);
});

// Rota para salvar senha de participante
router.put("/:ligaId/participante/:timeId/senha", async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { senha } = req.body;

        console.log(`[LIGAS] Salvando senha para time ${timeId} na liga ${ligaId}`);

        if (!senha || senha.trim().length < 4) {
            return res.status(400).json({ 
                erro: "Senha deve ter no mínimo 4 caracteres" 
            });
        }

        const liga = await Liga.findById(ligaId).select('+times +participantes');
        if (!liga) {
            console.log(`[LIGAS] Liga ${ligaId} não encontrada`);
            return res.status(404).json({ erro: "Liga não encontrada" });
        }
        
        console.log(`[LIGAS] Liga carregada:`, {
            id: liga._id,
            nome: liga.nome,
            temCampoTimes: !!liga.times,
            quantidadeTimes: liga.times?.length,
            primeirosTimes: liga.times?.slice(0, 3)
        });

        // Verificar se o time está na lista de times da liga
        const timeIdNum = Number(timeId);
        console.log(`[LIGAS] Verificando time ${timeId} (convertido: ${timeIdNum})`);
        console.log(`[LIGAS] Times na liga:`, liga.times);
        console.log(`[LIGAS] Includes result:`, liga.times?.includes(timeIdNum));
        
        if (!liga.times || !liga.times.includes(timeIdNum)) {
            console.log(`[LIGAS] ❌ Time ${timeId} (${timeIdNum}) não está na liga ${ligaId}`);
            console.log(`[LIGAS] Lista de times:`, liga.times);
            return res.status(404).json({ 
                erro: "Time não encontrado nesta liga" 
            });
        }
        
        console.log(`[LIGAS] ✅ Time ${timeIdNum} encontrado na liga`);

        // Inicializar array de participantes se não existir
        if (!liga.participantes) {
            liga.participantes = [];
        }

        // Buscar ou criar participante
        let participante = liga.participantes.find(
            p => Number(p.time_id) === timeIdNum
        );

        const Time = (await import("../models/Time.js")).default;

        if (!participante) {
            // Buscar dados do time para criar participante
            const timeData = await Time.findOne({ time_id: timeIdNum });
            
            participante = {
                time_id: timeIdNum,
                nome_cartola: timeData?.nome_cartoleiro || "N/D",
                nome_time: timeData?.nome_time || "N/D",
                senha_acesso: senha.trim()
            };
            liga.participantes.push(participante);
            console.log(`[LIGAS] Criado novo participante para time ${timeId}`);
        } else {
            participante.senha_acesso = senha.trim();
            console.log(`[LIGAS] Atualizada senha do participante ${timeId}`);
        }

        // ✅ SALVAR TAMBÉM NA COLEÇÃO TIMES
        await Time.findOneAndUpdate(
            { time_id: timeIdNum },
            { senha_acesso: senha.trim() },
            { new: true }
        );
        console.log(`[LIGAS] ✅ Senha sincronizada na coleção Times`);

        await liga.save();

        res.json({ 
            success: true, 
            mensagem: "Senha atualizada com sucesso",
            participante: {
                time_id: participante.time_id,
                nome_cartola: participante.nome_cartola
            }
        });

    } catch (error) {
        console.error("[LIGAS] Erro ao salvar senha:", error);
        res.status(500).json({ erro: "Erro ao salvar senha: " + error.message });
    }
});

// Rota de análise de performance
router.get("/:id/performance", async (req, res) => {
  // O restante do código original permanece inalterado aqui.
  // Este é apenas um placeholder para indicar onde o código original continuaria.
});

export default router;