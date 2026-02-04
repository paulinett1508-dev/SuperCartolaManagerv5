// === GERENCIAR LIGAS - VERSÃO APRIMORADA ===
// Mantém 100% compatibilidade com sistema existente

// Cache simples para evitar requisições desnecessárias
let ligasCache = {
    data: null,
    timestamp: 0,
    TTL: 5 * 60 * 1000, // 5 minutos
};

// === FUNÇÃO PRINCIPAL: CARREGAR LIGAS ===
export async function carregarLigas(forceRefresh = false) {
    try {
        // Verificar cache se não forçar refresh
        if (
            !forceRefresh &&
            ligasCache.data &&
            Date.now() - ligasCache.timestamp < ligasCache.TTL
        ) {
            console.log("📦 Carregando ligas do cache local");
            return ligasCache.data;
        }

        console.log("🌐 Buscando ligas da API...");

        // ✅ FIX: Adicionar timeout de 10s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("/api/ligas", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log("✅ Resposta recebida, status:", res.status);

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
                `HTTP ${res.status}: ${errorText || "Erro ao buscar ligas"}`,
            );
        }

        const ligas = await res.json();
        console.log("✅ JSON parseado, total de ligas:", ligas.length);

        // Validar estrutura dos dados
        if (!Array.isArray(ligas)) {
            throw new Error(
                "Formato de dados inválido - esperado array de ligas",
            );
        }

        console.log("🔄 Processando ligas...");
        // Processar e enriquecer dados (preserva campos já calculados pela API)
        const ligasProcessadas = ligas.map((liga) => ({
            ...liga,
            timesCount: liga.timesCount ?? (liga.times ? liga.times.length : 0),
            status: liga.status || (liga.times && liga.times.length > 0 ? "ativa" : "configurando"),
            ultimaAtualizacao:
                liga.updatedAt || liga.criadaEm || new Date().toISOString(),
        }));

        // Ordenar por última atualização (mais recentes primeiro)
        ligasProcessadas.sort(
            (a, b) =>
                new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao),
        );

        // Atualizar cache (preserva TTL)
        ligasCache = {
            data: ligasProcessadas,
            timestamp: Date.now(),
            TTL: ligasCache.TTL || 5 * 60 * 1000,
        };

        console.log(
            `✅ ${ligasProcessadas.length} ligas carregadas com sucesso`,
        );
        return ligasProcessadas;
    } catch (err) {
        // Tratamento específico para timeout
        if (err.name === 'AbortError') {
            console.error("⏱️ Timeout ao carregar ligas (10s)");
            err.message = "Timeout: servidor não respondeu em 10 segundos";
        } else {
            console.error("❌ Erro ao carregar ligas:", err.message);
        }

        // Exibir erro no DOM se elemento existir
        const errorDiv = document.getElementById("errorMessage");
        if (errorDiv) {
            errorDiv.textContent = `Falha ao carregar ligas: ${err.message}`;
            const errorContainer = document.getElementById("errorContainer");
            if (errorContainer) {
                errorContainer.style.display = "block";
            }
        }

        // Retornar cache se disponível, senão array vazio
        if (ligasCache.data) {
            console.log("📦 Retornando dados do cache devido ao erro");
            return ligasCache.data;
        }

        return [];
    }
}

// === FUNÇÃO: DELETAR LIGA ===
export async function deletarLiga(id) {
    try {
        if (!id || typeof id !== "string") {
            throw new Error("ID da liga inválido");
        }

        console.log(`🗑️ Excluindo liga ${id}...`);

        const res = await fetch(`/api/ligas/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
                `HTTP ${res.status}: ${errorText || "Erro ao excluir liga"}`,
            );
        }

        // Limpar cache após exclusão bem-sucedida
        ligasCache.data = null;
        ligasCache.timestamp = 0;

        console.log(`✅ Liga ${id} excluída com sucesso`);
        return true;
    } catch (err) {
        console.error("❌ Erro ao deletar liga:", err.message);
        throw err; // Re-throw para tratamento upstream
    }
}

// === FUNÇÃO ADICIONAL: BUSCAR LIGA POR ID ===
export async function buscarLigaPorId(id) {
    try {
        const ligas = await carregarLigas();
        const liga = ligas.find((l) => l._id === id);

        if (!liga) {
            throw new Error(`Liga com ID ${id} não encontrada`);
        }

        return liga;
    } catch (err) {
        console.error("❌ Erro ao buscar liga:", err.message);
        throw err;
    }
}

// === FUNÇÃO: LIMPAR CACHE ===
export function limparCache() {
    ligasCache = {
        data: null,
        timestamp: 0,
        TTL: 5 * 60 * 1000,
    };
    console.log("🗑️ Cache de ligas limpo");
}

// === FUNÇÃO: STATUS DO CACHE ===
export function statusCache() {
    const isValid =
        ligasCache.data && Date.now() - ligasCache.timestamp < ligasCache.TTL;
    const idade = Date.now() - ligasCache.timestamp;

    return {
        temDados: !!ligasCache.data,
        valido: isValid,
        idadeMinutos: Math.round(idade / 60000),
        itens: ligasCache.data ? ligasCache.data.length : 0,
    };
}

// === FUNÇÃO: ESTATÍSTICAS RÁPIDAS ===
export function calcularEstatisticas(ligas = null) {
    const dados = ligas || ligasCache.data || [];

    if (dados.length === 0) {
        return {
            totalLigas: 0,
            totalParticipantes: 0,
            ligasAtivas: 0,
            mediaParticipantes: 0,
        };
    }

    const totalLigas = dados.length;
    const totalParticipantes = dados.reduce(
        (total, liga) => total + (liga.times ? liga.times.length : 0),
        0,
    );
    const ligasAtivas = dados.filter(
        (liga) => liga.times && liga.times.length > 0,
    ).length;
    const mediaParticipantes =
        totalLigas > 0 ? Math.round(totalParticipantes / totalLigas) : 0;

    return {
        totalLigas,
        totalParticipantes,
        ligasAtivas,
        mediaParticipantes,
    };
}

// === UTILITÁRIOS ADICIONAIS ===

// Validar estrutura de liga
export function validarLiga(liga) {
    const camposObrigatorios = ["_id", "nome"];

    for (const campo of camposObrigatorios) {
        if (!liga[campo]) {
            return {
                valida: false,
                erro: `Campo obrigatório ausente: ${campo}`,
            };
        }
    }

    return { valida: true };
}

// Formatar dados para exibição
export function formatarLigaParaExibicao(liga) {
    return {
        ...liga,
        nomeFormatado:
            liga.nome.substring(0, 50) + (liga.nome.length > 50 ? "..." : ""),
        idCurto: liga._id.substring(0, 8),
        timesCount: liga.times ? liga.times.length : 0,
        statusTexto:
            liga.times && liga.times.length > 0 ? "Ativa" : "Configurando",
        statusCor: liga.times && liga.times.length > 0 ? "#059669" : "#f59e0b",
    };
}

// Detectar mudanças nos dados
export function detectarMudancas(ligasAntigas, ligasNovas) {
    if (!ligasAntigas || !ligasNovas) return [];

    const mudancas = [];

    // Ligas adicionadas
    ligasNovas.forEach((nova) => {
        if (!ligasAntigas.find((antiga) => antiga._id === nova._id)) {
            mudancas.push({ tipo: "adicionada", liga: nova });
        }
    });

    // Ligas removidas
    ligasAntigas.forEach((antiga) => {
        if (!ligasNovas.find((nova) => nova._id === antiga._id)) {
            mudancas.push({ tipo: "removida", liga: antiga });
        }
    });

    return mudancas;
}

// === DEBUG MODE ===
if (localStorage.getItem("debug-mode") === "true") {
    window.ligasDebug = {
        cache: () => console.table(statusCache()),
        limpar: limparCache,
        reload: () => carregarLigas(true),
        stats: () => console.table(calcularEstatisticas()),
    };
    console.log(
        "🔧 Debug mode ativo. Use: ligasDebug.cache(), ligasDebug.limpar(), etc.",
    );
}
