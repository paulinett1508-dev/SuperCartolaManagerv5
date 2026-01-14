#!/usr/bin/env node
/**
 * Script: Validar IDs de Times por Temporada
 * Verifica se os IDs do Cartola ainda são válidos consultando a API
 *
 * Uso:
 *   node scripts/validar-ids-temporada.js --temporada=2026
 *   node scripts/validar-ids-temporada.js --temporada=2026 --liga=684cb1c8af923da7c7df51de
 *   node scripts/validar-ids-temporada.js --temporada=2026 --fix (atualiza dados desatualizados)
 *
 * @module scripts/validar-ids-temporada
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Cores para output
const CORES = {
    reset: "\x1b[0m",
    verde: "\x1b[32m",
    amarelo: "\x1b[33m",
    vermelho: "\x1b[31m",
    azul: "\x1b[34m",
    cinza: "\x1b[90m",
    negrito: "\x1b[1m"
};

const log = {
    info: (msg) => console.log(`${CORES.azul}[INFO]${CORES.reset} ${msg}`),
    ok: (msg) => console.log(`${CORES.verde}[OK]${CORES.reset} ${msg}`),
    warn: (msg) => console.log(`${CORES.amarelo}[WARN]${CORES.reset} ${msg}`),
    erro: (msg) => console.log(`${CORES.vermelho}[ERRO]${CORES.reset} ${msg}`),
    titulo: (msg) => console.log(`\n${CORES.negrito}${CORES.azul}=== ${msg} ===${CORES.reset}\n`)
};

// Parse argumentos
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith("--")) {
            const [key, value] = arg.slice(2).split("=");
            args[key] = value || true;
        }
    });
    return args;
}

async function main() {
    const args = parseArgs();

    if (args.help) {
        console.log(`
${CORES.negrito}Validar IDs de Times por Temporada${CORES.reset}

${CORES.amarelo}Uso:${CORES.reset}
  node scripts/validar-ids-temporada.js --temporada=2026
  node scripts/validar-ids-temporada.js --temporada=2026 --liga=<ligaId>
  node scripts/validar-ids-temporada.js --temporada=2026 --fix

${CORES.amarelo}Opções:${CORES.reset}
  --temporada=YYYY   Temporada a validar (obrigatório)
  --liga=<id>        Filtrar por liga específica (opcional)
  --fix              Atualizar dados desatualizados automaticamente
  --help             Mostrar esta ajuda

${CORES.amarelo}Exemplo:${CORES.reset}
  node scripts/validar-ids-temporada.js --temporada=2026 --fix
`);
        process.exit(0);
    }

    const temporada = parseInt(args.temporada);
    if (!temporada) {
        log.erro("Parâmetro --temporada é obrigatório");
        log.info("Use --help para ver as opções");
        process.exit(1);
    }

    log.titulo(`VALIDAÇÃO DE IDs - TEMPORADA ${temporada}`);

    // Conectar ao MongoDB
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI não configurado");
        }

        log.info("Conectando ao MongoDB...");
        await mongoose.connect(mongoUri);
        log.ok("Conectado ao MongoDB");
    } catch (error) {
        log.erro(`Falha ao conectar: ${error.message}`);
        process.exit(1);
    }

    try {
        // Importar modelos e serviços após conexão
        const InscricaoTemporada = (await import("../models/InscricaoTemporada.js")).default;
        const cartolaApi = (await import("../services/cartolaApiService.js")).default;

        // Construir query
        const query = {
            temporada,
            time_id: { $gt: 0 }, // Apenas IDs reais
            status: { $in: ["renovado", "novo", "pendente"] }
        };

        if (args.liga) {
            query.liga_id = new mongoose.Types.ObjectId(args.liga);
        }

        // Buscar inscrições
        log.info("Buscando inscrições...");
        const inscricoes = await InscricaoTemporada.find(query).lean();

        if (inscricoes.length === 0) {
            log.warn("Nenhuma inscrição encontrada com os critérios");
            await mongoose.disconnect();
            process.exit(0);
        }

        log.info(`${inscricoes.length} inscrições para validar`);
        console.log("");

        // Resultados
        const resultados = {
            validos: [],
            donoDiferente: [],
            inexistentes: [],
            erros: []
        };

        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        // Processar cada inscrição
        for (let i = 0; i < inscricoes.length; i++) {
            const insc = inscricoes[i];
            const timeId = insc.time_id;
            const nomeRegistrado = insc.dados_participante?.nome_cartoleiro || "N/D";
            const nomeTimeRegistrado = insc.dados_participante?.nome_time || "N/D";

            process.stdout.write(`\r${CORES.cinza}[${i + 1}/${inscricoes.length}] Validando ${timeId}...${CORES.reset}`);

            try {
                await delay(500); // Rate limiting

                const dadosCartola = await cartolaApi.buscarTimePorId(timeId);

                if (!dadosCartola) {
                    resultados.inexistentes.push({
                        time_id: timeId,
                        nome_registrado: nomeRegistrado,
                        nome_time_registrado: nomeTimeRegistrado
                    });
                    continue;
                }

                const nomeAtual = dadosCartola.time?.nome_cartoleiro || dadosCartola.nome_cartoleiro || "N/D";
                const nomeTimeAtual = dadosCartola.time?.nome || dadosCartola.nome || "N/D";
                const escudoAtual = dadosCartola.time?.url_escudo_png || dadosCartola.url_escudo_png || "";

                const nomesIguais = normalizarNome(nomeRegistrado) === normalizarNome(nomeAtual);

                if (nomesIguais) {
                    resultados.validos.push({
                        time_id: timeId,
                        nome: nomeRegistrado,
                        nome_time_registrado: nomeTimeRegistrado,
                        nome_time_atual: nomeTimeAtual
                    });
                } else {
                    resultados.donoDiferente.push({
                        time_id: timeId,
                        nome_registrado: nomeRegistrado,
                        nome_atual: nomeAtual,
                        nome_time_registrado: nomeTimeRegistrado,
                        nome_time_atual: nomeTimeAtual,
                        escudo_atual: escudoAtual,
                        _insc: insc // Para fix
                    });
                }

            } catch (error) {
                resultados.erros.push({
                    time_id: timeId,
                    nome_registrado: nomeRegistrado,
                    erro: error.message
                });
            }
        }

        console.log("\r" + " ".repeat(60)); // Limpar linha

        // Exibir resultados
        log.titulo("RESULTADOS");

        // Válidos
        if (resultados.validos.length > 0) {
            console.log(`${CORES.verde}✅ VÁLIDOS (${resultados.validos.length})${CORES.reset}`);
            resultados.validos.forEach(r => {
                const mudouNome = r.nome_time_registrado !== r.nome_time_atual;
                console.log(`   ${r.time_id} - ${r.nome}${mudouNome ? ` (time: ${r.nome_time_registrado} → ${r.nome_time_atual})` : ""}`);
            });
            console.log("");
        }

        // Dono diferente
        if (resultados.donoDiferente.length > 0) {
            console.log(`${CORES.amarelo}⚠️  DONO DIFERENTE (${resultados.donoDiferente.length})${CORES.reset}`);
            resultados.donoDiferente.forEach(r => {
                console.log(`   ${r.time_id}`);
                console.log(`      Registrado: ${r.nome_registrado} (${r.nome_time_registrado})`);
                console.log(`      Atual:      ${r.nome_atual} (${r.nome_time_atual})`);
            });
            console.log("");

            // Atualizar se --fix
            if (args.fix && resultados.donoDiferente.length > 0) {
                log.info("Atualizando dados com --fix...");

                for (const r of resultados.donoDiferente) {
                    try {
                        await InscricaoTemporada.findByIdAndUpdate(r._insc._id, {
                            $set: {
                                "dados_participante.nome_cartoleiro": r.nome_atual,
                                "dados_participante.nome_time": r.nome_time_atual,
                                "dados_participante.escudo": r.escudo_atual,
                                atualizado_em: new Date()
                            }
                        });
                        log.ok(`Atualizado: ${r.time_id}`);
                    } catch (error) {
                        log.erro(`Erro ao atualizar ${r.time_id}: ${error.message}`);
                    }
                }
                console.log("");
            }
        }

        // Inexistentes
        if (resultados.inexistentes.length > 0) {
            console.log(`${CORES.vermelho}❌ INEXISTENTES NA API (${resultados.inexistentes.length})${CORES.reset}`);
            resultados.inexistentes.forEach(r => {
                console.log(`   ${r.time_id} - ${r.nome_registrado} (${r.nome_time_registrado})`);
            });
            console.log("");
        }

        // Erros
        if (resultados.erros.length > 0) {
            console.log(`${CORES.vermelho}🔴 ERROS (${resultados.erros.length})${CORES.reset}`);
            resultados.erros.forEach(r => {
                console.log(`   ${r.time_id} - ${r.erro}`);
            });
            console.log("");
        }

        // Resumo
        log.titulo("RESUMO");
        console.log(`   Total validado:    ${inscricoes.length}`);
        console.log(`   ${CORES.verde}Válidos:${CORES.reset}           ${resultados.validos.length}`);
        console.log(`   ${CORES.amarelo}Dono diferente:${CORES.reset}    ${resultados.donoDiferente.length}`);
        console.log(`   ${CORES.vermelho}Inexistentes:${CORES.reset}      ${resultados.inexistentes.length}`);
        console.log(`   ${CORES.vermelho}Erros:${CORES.reset}             ${resultados.erros.length}`);
        console.log("");

        if (resultados.inexistentes.length > 0) {
            log.warn("Times inexistentes precisam ter seus IDs atualizados manualmente");
        }

        if (resultados.donoDiferente.length > 0 && !args.fix) {
            log.info("Use --fix para atualizar automaticamente os dados divergentes");
        }

    } catch (error) {
        log.erro(`Erro: ${error.message}`);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        log.info("Desconectado do MongoDB");
    }
}

function normalizarNome(nome) {
    if (!nome) return "";
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

main();
