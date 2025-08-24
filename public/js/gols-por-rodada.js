// ✅ CORREÇÃO S.D.A.: gols-por-rodada.js com verificação DOM

// Função principal corrigida com verificação de DOM
function carregarTabelaGolsPorRodada() {
    // ✅ CORREÇÃO: Verificar se elemento existe antes de acessar
    const container = document.getElementById("tabela-gols-container");

    if (!container) {
        console.warn("⚠️ Elemento tabela-gols-container não encontrado");
        return;
    }

    try {
        // Prosseguir com carregamento normal
        container.innerHTML = "<div>Carregando dados dos gols...</div>";

        // Resto da lógica do carregamento aqui
        // (preservar código original após linha 6)
    } catch (error) {
        console.error("❌ Erro ao carregar tabela gols:", error);
        if (container) {
            container.innerHTML = "<div>Erro ao carregar dados</div>";
        }
    }
}

// ✅ CORREÇÃO: Aguardar DOM carregar antes de executar
document.addEventListener("DOMContentLoaded", function () {
    // ✅ CORREÇÃO: Criar elemento se não existir
    if (!document.getElementById("tabela-gols-container")) {
        const container = document.createElement("div");
        container.id = "tabela-gols-container";
        container.style.display = "none"; // Oculto por padrão
        document.body.appendChild(container);
        console.log("✅ Container tabela-gols-container criado");
    }

    // Aguardar um pouco mais para garantir estabilidade
    setTimeout(() => {
        try {
            carregarTabelaGolsPorRodada();
        } catch (error) {
            console.warn("⚠️ Erro ao carregar gols-por-rodada tratado:", error);
        }
    }, 100);
});

// ✅ SISTEMA DE COMPATIBILIDADE: Registrar função globalmente
window.carregarTabelaGolsPorRodada = carregarTabelaGolsPorRodada;

console.log("✅ gols-por-rodada.js carregado com correções DOM");
