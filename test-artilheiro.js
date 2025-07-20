// test-artilheiro.js - Script para testar a API do Artilheiro Campeão

const BASE_URL =
  "https://e1034b6e-dfb9-401a-8e7f-80ffa6030f79-00-2dc692elmitoe.spock.replit.dev";
const LIGA_ID = "684d821cf1a7ae16d1f89572";

async function testarArtilheiro() {
  console.log("🧪 Testando API do Artilheiro Campeão...\n");

  try {
    // Teste 1: Rodadas disponíveis
    console.log("📋 1. Testando rodadas disponíveis...");
    const rodadasUrl = `${BASE_URL}/api/artilheiro-campeao/${LIGA_ID}/rodadas`;
    const rodadasResponse = await fetch(rodadasUrl);
    const rodadasData = await rodadasResponse.json();

    if (rodadasData.success) {
      console.log(`✅ Rodadas: ${rodadasData.rodadas.join(", ")}`);
      console.log(`📊 Total: ${rodadasData.totalRodadas} rodadas\n`);
    } else {
      console.log("❌ Erro:", rodadasData.message);
    }

    // Teste 2: Dados acumulados
    console.log("🏆 2. Testando dados acumulados...");
    const acumuladoUrl = `${BASE_URL}/api/artilheiro-campeao/${LIGA_ID}/acumulado`;
    const acumuladoResponse = await fetch(acumuladoUrl);
    const acumuladoData = await acumuladoResponse.json();

    if (acumuladoData.success && acumuladoData.dados.length > 0) {
      console.log("✅ Dados acumulados obtidos!");
      console.log(`📊 ${acumuladoData.dados.length} participantes processados`);

      // Mostrar top 3
      console.log("\n🥇 Top 3 Artilheiros:");
      acumuladoData.dados.slice(0, 3).forEach((time, index) => {
        const medalha = ["🥇", "🥈", "🥉"][index];
        console.log(
          `${medalha} ${time.nomeCartoleiro} (${time.nomeTime}): ${time.saldoGols} saldo de gols`,
        );
      });
    } else {
      console.log("❌ Erro:", acumuladoData.message);
    }

    // Teste 3: Rodada específica
    console.log("\n⚽ 3. Testando rodada específica (rodada 1)...");
    const rodadaUrl = `${BASE_URL}/api/artilheiro-campeao/${LIGA_ID}/1`;
    const rodadaResponse = await fetch(rodadaUrl);
    const rodadaData = await rodadaResponse.json();

    if (rodadaData.success && rodadaData.dados.length > 0) {
      console.log("✅ Dados da rodada 1 obtidos!");
      console.log(`📊 ${rodadaData.dados.length} participantes na rodada`);
      console.log(
        `🏆 Artilheiro da rodada: ${rodadaData.dados[0].nomeCartoleiro}`,
      );
    } else {
      console.log("❌ Erro:", rodadaData.message);
    }

    console.log("\n🎉 Testes concluídos!");
  } catch (error) {
    console.error("❌ Erro durante os testes:", error.message);
  }
}

// Função fetch para Node.js
async function fetch(url) {
  const { default: fetch } = await import("node-fetch");
  return fetch(url);
}

// Executar testes
testarArtilheiro();
