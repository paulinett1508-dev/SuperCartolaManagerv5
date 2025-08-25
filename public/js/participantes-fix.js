// participantes-fix.js - Correção para renderização dos brasões

// Aguardar o DOM e o orquestrador estarem prontos
document.addEventListener("DOMContentLoaded", function () {
    // Observer para detectar quando o módulo participantes é carregado
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            // Procura pelo grid de participantes
            const grid = document.getElementById("participantes-grid");

            if (
                grid &&
                grid.innerHTML.includes("Carregando dados dos participantes")
            ) {
                console.log(
                    "🔧 Fix: Grid de participantes detectado, aguardando carregamento...",
                );

                // Aguarda um pouco e força a renderização
                setTimeout(async () => {
                    await forcarRenderizacaoParticipantes();
                }, 2000);

                // Desconecta o observer após detectar
                observer.disconnect();
            }
        });
    });

    // Observa mudanças no body
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
});

// Função para forçar a renderização dos participantes com brasões
async function forcarRenderizacaoParticipantes() {
    const container = document.getElementById("participantes-grid");
    if (!container) {
        console.log("Container não encontrado");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ligaId = urlParams.get("id");

    if (!ligaId) {
        console.error("Liga ID não encontrado");
        return;
    }

    try {
        console.log(
            `🔧 Forçando renderização de participantes da liga: ${ligaId}`,
        );

        // Buscar dados da liga
        const resLiga = await fetch(`/api/ligas/${ligaId}`);
        if (!resLiga.ok) throw new Error("Erro ao buscar liga");
        const liga = await resLiga.json();

        if (!liga.times || liga.times.length === 0) {
            container.innerHTML =
                '<p style="text-align: center; padding: 60px; color: #95a5a6;">Nenhum participante cadastrado</p>';
            return;
        }

        console.log(`Processando ${liga.times.length} times...`);

        // Buscar dados de cada time
        const timesData = [];
        for (const timeId of liga.times) {
            try {
                const res = await fetch(`/api/time/${timeId}`);
                if (res.ok) {
                    const data = await res.json();
                    timesData.push({ ...data, id: timeId });
                }
            } catch (err) {
                console.error(`Erro ao buscar time ${timeId}:`, err);
            }
        }

        // Ordenar por nome
        timesData.sort((a, b) =>
            (a.nome_cartoleiro || "").localeCompare(b.nome_cartoleiro || ""),
        );

        // Limpar e configurar container
        container.innerHTML = "";
        container.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            padding: 20px 0;
        `;

        // Mapeamento de clubes - movido para fora do loop
        const clubeNomes = {
            262: "Flamengo",
            263: "Botafogo",
            264: "Corinthians",
            266: "Fluminense",
            267: "Vasco",
            275: "Palmeiras",
            276: "São Paulo",
            277: "Santos",
            283: "Cruzeiro",
            292: "Atlético-MG",
            344: "Atlético-GO",
        };

        // Adicionar CSS de animação com tema dark
        if (!document.getElementById("brasoes-animation-style")) {
            const style = document.createElement("style");
            style.id = "brasoes-animation-style";
            style.textContent = `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .participante-card:hover {
                    transform: translateY(-5px) !important;
                    box-shadow: 0 8px 20px rgba(255, 69, 0, 0.3) !important;
                    border: 1px solid rgba(255, 69, 0, 0.5) !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Renderizar cada card
        timesData.forEach((timeData, i) => {
            const card = document.createElement("div");
            card.className = "participante-card";

            // Estilos do card com tema dark
            card.style.cssText = `
                background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                padding: 20px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                animation: fadeInUp 0.5s ease forwards;
                animation-delay: ${Math.min(i * 0.05, 1)}s;
                opacity: 0;
                cursor: pointer;
            `;

            // Determinar se tem clube do coração

            const clubeNome = clubeNomes[timeData.clube_id] || null;

            // HTML do card
            card.innerHTML = `
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; justify-content: center; width: 35px; height: 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; color: white; font-size: 16px;">
                        👤
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #d4edda; color: #155724;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite;"></span>
                        Ativo
                    </div>
                </div>

                <!-- Info do Cartoleiro -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <h4 style="font-size: 18px; font-weight: 700; color: #2c3e50; margin: 0 0 5px 0;">
                        ${timeData.nome_cartoleiro || "Cartoleiro N/D"}
                    </h4>
                    <p style="font-size: 14px; color: #7f8c8d; margin: 0;">
                        ${timeData.nome_time || "Time N/D"}
                    </p>
                </div>

                <!-- Brasões -->
                <div style="display: flex; align-items: center; justify-content: space-around; padding: 20px 10px; background: linear-gradient(135deg, #f6f9fc 0%, #e9ecef 100%); border-radius: 10px;">

                    <!-- Brasão Time Fantasy -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; padding: 5px; background: rgba(255, 255, 255, 0.1); box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5); border: 2px solid #3498db; display: flex; align-items: center; justify-content: center;">
                            <img src="${timeData.url_escudo_png || "/escudos/default.png"}" 
                                 alt="Time no Cartola" 
                                 title="Time no Cartola FC"
                                 style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;"
                                 onerror="this.src='/escudos/default.png'">
                        </div>
                        <span style="font-size: 11px; color: #3498db; text-align: center; font-weight: 600;">
                            Time Cartola
                        </span>
                    </div>

                    <!-- Separador -->
                    <div style="display: flex; align-items: center; justify-content: center; color: #ff4500; font-size: 20px; margin: 0 10px;">
                        ⚡
                    </div>

                    <!-- Brasão Clube do Coração -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; padding: 5px; background: rgba(255, 255, 255, 0.1); box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5); border: 2px solid #e74c3c; display: flex; align-items: center; justify-content: center; ${!clubeNome ? "opacity: 0.5; filter: grayscale(100%);" : ""}">
                            <img src="/escudos/${timeData.clube_id || "placeholder"}.png" 
                                 alt="Clube do Coração" 
                                 title="${clubeNome || "Não definido"}"
                                 style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;"
                                 onerror="this.src='/escudos/placeholder.png'">
                        </div>
                        <span style="font-size: 11px; color: #e74c3c; text-align: center; font-weight: 600; max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${clubeNome ? "❤️ " + clubeNome : "Não definido"}
                        </span>
                    </div>
                </div>
            `;

            // Adicionar hover effects com tema dark
            card.addEventListener("mouseenter", function () {
                this.style.transform = "translateY(-5px)";
                this.style.boxShadow = "0 8px 20px rgba(255, 69, 0, 0.3)";
                this.style.borderColor = "rgba(255, 69, 0, 0.5)";
            });

            card.addEventListener("mouseleave", function () {
                this.style.transform = "translateY(0)";
                this.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.3)";
                this.style.borderColor = "rgba(255, 255, 255, 0.1)";
            });

            container.appendChild(card);
        });

        // Adicionar animação de pulse
        if (!document.getElementById("pulse-animation-style")) {
            const pulseStyle = document.createElement("style");
            pulseStyle.id = "pulse-animation-style";
            pulseStyle.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(pulseStyle);
        }

        // Atualizar estatísticas
        const totalEl = document.getElementById("total-participantes");
        if (totalEl) totalEl.textContent = timesData.length;

        const ativosEl = document.getElementById("participantes-ativos");
        if (ativosEl) ativosEl.textContent = timesData.length;

        const clubesUnicos = new Set(
            timesData.map((t) => t.clube_id).filter((id) => clubeNomes[id]),
        );
        const uniquesEl = document.getElementById("times-diferentes");
        if (uniquesEl) uniquesEl.textContent = clubesUnicos.size;

        console.log(
            `✅ ${timesData.length} participantes renderizados com sucesso!`,
        );
    } catch (error) {
        console.error("Erro ao renderizar participantes:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <p>❌ Erro ao carregar participantes: ${error.message}</p>
            </div>
        `;
    }
}

// Exportar globalmente
window.forcarRenderizacaoParticipantes = forcarRenderizacaoParticipantes;
