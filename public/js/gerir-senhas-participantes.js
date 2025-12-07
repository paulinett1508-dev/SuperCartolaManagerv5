/**
 * gerir-senhas-participantes.js
 * Módulo de gestão de senhas dos participantes para o APP
 * @version 1.1.0
 */

(function () {
    "use strict";

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        carregarLigasParaSenhas();
        configurarEventos();
    }

    function configurarEventos() {
        // Liga select
        const ligaSelect = document.getElementById("ligaSelect");
        if (ligaSelect) {
            ligaSelect.addEventListener("change", carregarParticipantes);
        }

        // Busca com debounce
        const buscaInput = document.getElementById("buscaParticipante");
        if (buscaInput) {
            buscaInput.addEventListener(
                "input",
                debounce(buscarParticipante, 300),
            );
        }
    }

    // ============================================
    // CARREGAR LIGAS (renomeado para evitar conflito)
    // ============================================

    async function carregarLigasParaSenhas() {
        try {
            const response = await fetch("/api/ligas");
            const ligas = await response.json();

            const select = document.getElementById("ligaSelect");
            select.innerHTML =
                '<option value="">Selecione uma liga...</option>';

            ligas.forEach((liga) => {
                const option = document.createElement("option");
                option.value = liga._id;
                option.textContent = liga.nome;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("[GERIR-SENHAS] Erro ao carregar ligas:", error);
            alert("Erro ao carregar ligas");
        }
    }

    // ============================================
    // CARREGAR PARTICIPANTES
    // ============================================

    async function carregarParticipantes() {
        const ligaId = document.getElementById("ligaSelect").value;
        const container = document.getElementById("participantesContainer");
        const statsContainer = document.getElementById("statsContainer");

        if (!ligaId) {
            container.innerHTML = renderLoading(
                "Selecione uma liga para começar",
            );
            statsContainer.style.display = "none";
            document.getElementById("senhaGeralSection").style.display = "none";
            document.getElementById("buscaSection").style.display = "none";
            return;
        }

        // Mostrar seções
        document.getElementById("senhaGeralSection").style.display = "block";
        document.getElementById("buscaSection").style.display = "block";

        container.innerHTML = renderLoading("Carregando participantes...");

        try {
            const response = await fetch(`/api/ligas/${ligaId}`);
            const liga = await response.json();

            if (!liga.times || liga.times.length === 0) {
                container.innerHTML = renderLoading(
                    "Nenhum participante encontrado",
                );
                statsContainer.style.display = "none";
                return;
            }

            const participantesData = await Promise.all(
                liga.times.map((timeId) => buscarDadosTime(timeId, liga)),
            );

            const participantes = participantesData
                .filter((p) => p !== null)
                .sort((a, b) => a.nome_cartola.localeCompare(b.nome_cartola));

            if (participantes.length === 0) {
                container.innerHTML = renderLoading(
                    "Nenhum participante encontrado",
                );
                statsContainer.style.display = "none";
                return;
            }

            // Atualizar stats
            atualizarStatsLocais(participantes);
            statsContainer.style.display = "flex";

            // Renderizar tabela
            renderizarTabela(participantes, ligaId);
        } catch (error) {
            console.error(
                "[GERIR-SENHAS] Erro ao carregar participantes:",
                error,
            );
            container.innerHTML = renderLoading(
                "Erro ao carregar participantes",
            );
            statsContainer.style.display = "none";
        }
    }

    async function buscarDadosTime(timeId, liga) {
        try {
            // Busca do MongoDB local (rápido) - dados já populados pela migração
            const response = await fetch(`/api/times/${timeId}`);
            if (!response.ok) return null;

            const data = await response.json();

            // Buscar senha do array participantes da liga
            const participanteLiga = liga.participantes?.find(
                (p) => p.time_id === timeId,
            );
            const senha = participanteLiga?.senha_acesso || "";

            return {
                time_id: timeId,
                nome_cartola:
                    data.nome_cartoleiro || data.nome_cartola || "N/D",
                nome_time: data.nome_time || "Time N/A",
                senha_acesso: senha,
            };
        } catch {
            return null;
        }
    }

    // ============================================
    // RENDERIZAÇÃO
    // ============================================

    function renderLoading(mensagem) {
        return `
            <div class="loading">
                <div class="loading-spinner"></div>
                ${mensagem}
            </div>
        `;
    }

    function renderizarTabela(participantes, ligaId) {
        const container = document.getElementById("participantesContainer");

        container.innerHTML = `
            <div class="participantes-table">
                <table>
                    <thead>
                        <tr>
                            <th>Participante</th>
                            <th>Time ID</th>
                            <th>Status</th>
                            <th>Senha</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody id="participantesTableBody"></tbody>
                </table>
            </div>
        `;

        const tbody = document.getElementById("participantesTableBody");

        participantes.forEach((p) => {
            const temSenha = p.senha_acesso && p.senha_acesso.length > 0;
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <div class="participante-nome">${escapeHtml(p.nome_cartola)}</div>
                    <div class="participante-time">${escapeHtml(p.nome_time)}</div>
                </td>
                <td>
                    <span class="time-id">${p.time_id}</span>
                </td>
                <td>
                    <span class="status-badge ${temSenha ? "definida" : "nao-definida"}">
                        ${temSenha ? "Definida" : "Pendente"}
                    </span>
                </td>
                <td>
                    <input 
                        type="text" 
                        class="senha-input" 
                        placeholder="Digite a senha"
                        value="${escapeHtml(p.senha_acesso)}"
                        data-time-id="${p.time_id}"
                        maxlength="20"
                    >
                </td>
                <td>
                    <button 
                        class="btn-salvar" 
                        data-time-id="${p.time_id}"
                        data-liga-id="${ligaId}"
                    >
                        Salvar
                    </button>
                </td>
            `;

            // Event listener no botão
            const btnSalvar = row.querySelector(".btn-salvar");
            btnSalvar.addEventListener("click", () =>
                salvarSenha(p.time_id, ligaId),
            );

            tbody.appendChild(row);
        });
    }

    function atualizarStatsLocais(participantes) {
        const comSenha = participantes.filter((p) => p.senha_acesso).length;
        const semSenha = participantes.length - comSenha;

        document.getElementById("totalParticipantes").textContent =
            participantes.length;
        document.getElementById("comSenha").textContent = comSenha;
        document.getElementById("semSenha").textContent = semSenha;
    }

    // ============================================
    // ESTATÍSTICAS
    // ============================================

    async function atualizarEstatisticas(ligaId) {
        try {
            const response = await fetch(`/api/ligas/${ligaId}`);
            if (!response.ok) throw new Error("Erro ao buscar liga");

            const liga = await response.json();
            const totalParticipantes = liga.times?.length || 0;
            let comSenha = 0;
            let semSenha = 0;

            if (liga.participantes && Array.isArray(liga.participantes)) {
                comSenha = liga.participantes.filter(
                    (p) => p.senha_acesso && p.senha_acesso.trim() !== "",
                ).length;
                semSenha = totalParticipantes - comSenha;
            } else {
                semSenha = totalParticipantes;
            }

            document.getElementById("totalParticipantes").textContent =
                totalParticipantes;
            document.getElementById("comSenha").textContent = comSenha;
            document.getElementById("semSenha").textContent = semSenha;
        } catch (error) {
            console.error(
                "[GERIR-SENHAS] Erro ao atualizar estatísticas:",
                error,
            );
        }
    }

    // ============================================
    // SALVAR SENHA
    // ============================================

    async function salvarSenha(timeId, ligaId) {
        const senhaInput = document.querySelector(
            `input[data-time-id="${timeId}"]`,
        );
        const senha = senhaInput.value.trim();

        if (!senha || senha.length < 4) {
            alert("A senha deve ter no mínimo 4 caracteres");
            return;
        }

        try {
            const response = await fetch(
                `/api/ligas/${ligaId}/participante/${timeId}/senha`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ senha }),
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || "Erro ao salvar senha");
            }

            // Atualizar visualmente
            senhaInput.value = senha;
            const row = senhaInput.closest("tr");
            const statusBadge = row.querySelector(".status-badge");
            if (statusBadge) {
                statusBadge.className = "status-badge definida";
                statusBadge.textContent = "Definida";
            }

            alert("✅ Senha salva com sucesso!");
            await atualizarEstatisticas(ligaId);
        } catch (error) {
            console.error("[GERIR-SENHAS] Erro ao salvar senha:", error);
            alert(`❌ Erro: ${error.message}`);
        }
    }

    // ============================================
    // SENHA GERAL
    // ============================================

    function gerarSenhaGeral() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let senha = "";
        for (let i = 0; i < 8; i++) {
            senha += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const input = document.getElementById("senhaGeral");
        if (input) {
            input.value = senha;
            input.select();
        }
    }

    async function aplicarSenhaGeral() {
        const ligaId = document.getElementById("ligaSelect").value;
        const senhaGeral = document.getElementById("senhaGeral").value.trim();

        if (!ligaId) {
            alert("Selecione uma liga primeiro");
            return;
        }

        if (!senhaGeral || senhaGeral.length < 4) {
            alert("A senha deve ter no mínimo 4 caracteres");
            return;
        }

        const confirmacao = confirm(
            `🔐 ATENÇÃO!\n\n` +
                `Você está prestes a aplicar a senha "${senhaGeral}" para TODOS os participantes desta liga.\n\n` +
                `Esta ação irá sobrescrever as senhas existentes.\n\n` +
                `Deseja continuar?`,
        );

        if (!confirmacao) return;

        const btnAplicar = document.querySelector(".btn-aplicar");

        try {
            const response = await fetch(`/api/ligas/${ligaId}`);
            const liga = await response.json();

            if (!liga.times || liga.times.length === 0) {
                alert("Nenhum participante encontrado nesta liga");
                return;
            }

            if (btnAplicar) {
                btnAplicar.disabled = true;
                btnAplicar.textContent = "⏳ Aplicando...";
            }

            let sucessos = 0;
            let falhas = 0;

            for (const timeId of liga.times) {
                try {
                    const resp = await fetch(
                        `/api/ligas/${ligaId}/participante/${timeId}/senha`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ senha: senhaGeral }),
                        },
                    );

                    if (resp.ok) {
                        sucessos++;
                    } else {
                        falhas++;
                    }
                } catch {
                    falhas++;
                }
            }

            alert(
                `✅ Processo concluído!\n\n` +
                    `Sucessos: ${sucessos}\n` +
                    `Falhas: ${falhas}\n\n` +
                    `Senha aplicada: ${senhaGeral}`,
            );

            await carregarParticipantes();
            await atualizarEstatisticas(ligaId);
        } catch (error) {
            console.error("[GERIR-SENHAS] Erro ao aplicar senha geral:", error);
            alert(`❌ Erro: ${error.message}`);
        } finally {
            if (btnAplicar) {
                btnAplicar.disabled = false;
                btnAplicar.textContent = "✨ Aplicar a Todos";
            }
        }
    }

    // ============================================
    // BUSCA
    // ============================================

    function buscarParticipante() {
        const termo = document
            .getElementById("buscaParticipante")
            .value.toLowerCase()
            .trim();
        const rows = document.querySelectorAll("#participantesTableBody tr");
        const resultadosDiv = document.getElementById("resultadosBusca");

        if (!termo) {
            rows.forEach((row) => (row.style.display = ""));
            resultadosDiv.classList.remove("visible");
            return;
        }

        let countVisible = 0;

        rows.forEach((row) => {
            const nomeCartola =
                row
                    .querySelector(".participante-nome")
                    ?.textContent.toLowerCase() || "";
            const nomeTime =
                row
                    .querySelector(".participante-time")
                    ?.textContent.toLowerCase() || "";
            const timeId =
                row.querySelector(".time-id")?.textContent.toLowerCase() || "";

            const matches =
                nomeCartola.includes(termo) ||
                nomeTime.includes(termo) ||
                timeId.includes(termo);

            if (matches) {
                row.style.display = "";
                countVisible++;
            } else {
                row.style.display = "none";
            }
        });

        if (countVisible === 0) {
            resultadosDiv.textContent = `❌ Nenhum participante encontrado para "${termo}"`;
        } else if (countVisible === 1) {
            resultadosDiv.textContent = `✅ 1 participante encontrado`;
        } else {
            resultadosDiv.textContent = `✅ ${countVisible} participantes encontrados`;
        }
        resultadosDiv.classList.add("visible");
    }

    function limparBusca() {
        const input = document.getElementById("buscaParticipante");
        input.value = "";

        document
            .querySelectorAll("#participantesTableBody tr")
            .forEach((row) => {
                row.style.display = "";
            });

        document.getElementById("resultadosBusca").classList.remove("visible");
        input.focus();
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ============================================
    // EXPOR FUNÇÕES GLOBAIS (para onclick no HTML)
    // ============================================

    window.gerarSenhaGeral = gerarSenhaGeral;
    window.aplicarSenhaGeral = aplicarSenhaGeral;
    window.limparBusca = limparBusca;
})();
