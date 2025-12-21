/**
 * Script para gerar cache Top10 para liga Cartoleiros do Sobral
 * Baseado nos dados de extrato financeiro existentes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_SOBRAL_ID = "684d821cf1a7ae16d1f89572";
const TEMPORADA = 2025;

async function main() {
    try {
        // Conectar ao MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI não configurado");
        }

        await mongoose.connect(mongoUri);
        console.log("[TOP10-SOBRAL] ✅ Conectado ao MongoDB");

        // Buscar todos os extratos da liga Sobral
        // Usar collections diretamente para evitar problemas de schema
        const db = mongoose.connection.db;
        const extratosCollection = db.collection('extratofinanceirocaches');
        const top10Collection = db.collection('top10caches');
        const ligasCollection = db.collection('ligas');

        // Buscar dados da liga para pegar info dos participantes
        const { ObjectId } = mongoose.Types;
        const liga = await ligasCollection.findOne({ _id: new ObjectId(LIGA_SOBRAL_ID) });
        if (!liga) {
            throw new Error("Liga Sobral não encontrada");
        }
        console.log(`[TOP10-SOBRAL] 📋 Liga: ${liga.nome}, ${liga.participantes?.length || 0} participantes`);

        // Criar mapa de participantes
        const participantesMap = {};
        (liga.participantes || []).forEach(p => {
            participantesMap[p.time_id] = {
                nome_time: p.nome_time,
                nome_cartola: p.nome_cartola,
                escudo_url: p.foto_time
            };
        });

        // Buscar extratos da liga
        // Debug: verificar quantos extratos existem no total
        const totalExtratos = await extratosCollection.countDocuments({});
        console.log(`[TOP10-SOBRAL] 📊 Total de extratos no banco: ${totalExtratos}`);

        // Verificar as ligas distintas
        const ligasDistintas = await extratosCollection.distinct('liga_id');
        console.log(`[TOP10-SOBRAL] 📊 Ligas distintas nos extratos: ${JSON.stringify(ligasDistintas)}`);

        // Buscar especificamente pelo time 1926323 que sabemos que existe na liga Sobral
        const extrato1926323 = await extratosCollection.findOne({ time_id: 1926323 });
        console.log(`[TOP10-SOBRAL] 🔍 Extrato time 1926323:`, extrato1926323 ? `liga_id=${extrato1926323.liga_id}, tipo=${typeof extrato1926323.liga_id}` : 'NÃO ENCONTRADO');

        // Se encontramos, buscar todos os extratos com o mesmo liga_id desse extrato
        if (extrato1926323) {
            const extratosMesmaLiga = await extratosCollection.find({ liga_id: extrato1926323.liga_id }).toArray();
            console.log(`[TOP10-SOBRAL] 🔍 Extratos com mesma liga_id: ${extratosMesmaLiga.length}`);
        }

        // Usar o liga_id do extrato encontrado (que pode ser ObjectId ou string)
        const ligaIdParaBusca = extrato1926323 ? extrato1926323.liga_id : LIGA_SOBRAL_ID;

        const extratos = await extratosCollection.find({ liga_id: ligaIdParaBusca }).toArray();
        console.log(`[TOP10-SOBRAL] 📊 ${extratos.length} extratos encontrados para liga Sobral`);

        if (extratos.length === 0) {
            console.log("[TOP10-SOBRAL] ⚠️ Nenhum extrato encontrado, não é possível gerar cache");
            await mongoose.disconnect();
            return;
        }

        // Agregar dados de Top10 por time
        const mitosAgregados = {};
        const micosAgregados = {};

        for (const extrato of extratos) {
            const timeId = extrato.time_id;
            const transacoes = extrato.historico_transacoes || [];

            for (const tx of transacoes) {
                if (tx.isMito && tx.top10 > 0) {
                    if (!mitosAgregados[timeId]) {
                        mitosAgregados[timeId] = {
                            time_id: timeId,
                            nome_time: participantesMap[timeId]?.nome_time || "N/D",
                            nome_cartola: participantesMap[timeId]?.nome_cartola || "N/D",
                            escudo_url: participantesMap[timeId]?.escudo_url || "",
                            pontos: 0,
                            aparicoes: 0,
                            melhor_posicao: 99,
                            rodadas: []
                        };
                    }
                    mitosAgregados[timeId].pontos += tx.top10;
                    mitosAgregados[timeId].aparicoes += 1;
                    mitosAgregados[timeId].rodadas.push(tx.rodada);
                    if (tx.top10Posicao && tx.top10Posicao < mitosAgregados[timeId].melhor_posicao) {
                        mitosAgregados[timeId].melhor_posicao = tx.top10Posicao;
                    }
                }

                if (tx.isMico && tx.top10 < 0) {
                    if (!micosAgregados[timeId]) {
                        micosAgregados[timeId] = {
                            time_id: timeId,
                            nome_time: participantesMap[timeId]?.nome_time || "N/D",
                            nome_cartola: participantesMap[timeId]?.nome_cartola || "N/D",
                            escudo_url: participantesMap[timeId]?.escudo_url || "",
                            pontos: 0,
                            aparicoes: 0,
                            pior_posicao: 0,
                            rodadas: []
                        };
                    }
                    micosAgregados[timeId].pontos += Math.abs(tx.top10);
                    micosAgregados[timeId].aparicoes += 1;
                    micosAgregados[timeId].rodadas.push(tx.rodada);
                    if (tx.top10Posicao && tx.top10Posicao > micosAgregados[timeId].pior_posicao) {
                        micosAgregados[timeId].pior_posicao = tx.top10Posicao;
                    }
                }
            }
        }

        // Ordenar por pontos (decrescente)
        const mitos = Object.values(mitosAgregados)
            .sort((a, b) => b.pontos - a.pontos)
            .map((m, idx) => ({
                time_id: m.time_id,
                nome_time: m.nome_time,
                nome_cartola: m.nome_cartola,
                escudo_url: m.escudo_url,
                pontos: m.pontos,
                posicao: idx + 1,
                valor: m.pontos,
                aparicoes: m.aparicoes,
                rodadas: m.rodadas
            }));

        const micos = Object.values(micosAgregados)
            .sort((a, b) => b.pontos - a.pontos)
            .map((m, idx) => ({
                time_id: m.time_id,
                nome_time: m.nome_time,
                nome_cartola: m.nome_cartola,
                escudo_url: m.escudo_url,
                pontos: -m.pontos, // Negativo para micos
                posicao: idx + 1,
                valor: -m.pontos,
                aparicoes: m.aparicoes,
                rodadas: m.rodadas
            }));

        console.log(`[TOP10-SOBRAL] 🏆 Mitos: ${mitos.length} times`);
        mitos.forEach(m => console.log(`  - ${m.nome_time}: ${m.pontos} pts (${m.aparicoes} aparições)`));

        console.log(`[TOP10-SOBRAL] 💀 Micos: ${micos.length} times`);
        micos.forEach(m => console.log(`  - ${m.nome_time}: ${m.pontos} pts (${m.aparicoes} aparições)`));

        // Salvar cache
        await top10Collection.updateOne(
            {
                liga_id: LIGA_SOBRAL_ID,
                rodada_consolidada: 38,
                temporada: TEMPORADA
            },
            {
                $set: {
                    mitos,
                    micos,
                    cache_permanente: true,
                    ultima_atualizacao: new Date()
                }
            },
            { upsert: true }
        );

        console.log(`[TOP10-SOBRAL] ✅ Cache salvo com sucesso!`);

        await mongoose.disconnect();
        console.log("[TOP10-SOBRAL] 🔌 Desconectado do MongoDB");

    } catch (error) {
        console.error("[TOP10-SOBRAL] ❌ Erro:", error);
        process.exit(1);
    }
}

main();
