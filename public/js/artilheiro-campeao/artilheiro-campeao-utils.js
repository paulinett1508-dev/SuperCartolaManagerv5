// ✅ ARTILHEIRO-CAMPEAO-UTILS.JS v1.1 - Utilitários do módulo Artilheiro Campeão
console.log("🔧 [ARTILHEIRO-UTILS] Módulo de utilitários v1.1 carregando...");

// ===== UTILITÁRIOS PARA ARTILHEIRO CAMPEÃO =====
const ArtilheiroUtils = {
    version: "1.1.0",

    // ✅ CORREÇÃO: Logger centralizado
    logger: {
        info: (msg, ...args) => console.log(`ℹ️ [ARTILHEIRO]`, msg, ...args),
        success: (msg, ...args) => console.log(`✅ [ARTILHEIRO]`, msg, ...args),
        warn: (msg, ...args) => console.warn(`⚠️ [ARTILHEIRO]`, msg, ...args),
        error: (msg, ...args) => console.error(`❌ [ARTILHEIRO]`, msg, ...args),
    },

    // ✅ CORREÇÃO: Função para fazer requisições HTTP
    async fazerRequisicao(url, opcoes = {}) {
        try {
            const config = {
                method: opcoes.method || "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...opcoes.headers,
                },
                ...opcoes,
            };

            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            this.logger.error(`Erro na requisição ${url}:`, error.message);
            return { success: false, error: error.message };
        }
    },

    // Formatar saldo de gols
    formatarSaldo(numero) {
        if (typeof numero !== "number") return "0";
        if (numero > 0) return `+${numero}`;
        if (numero < 0) return `${numero}`;
        return "0";
    },

    // Truncar texto para exibição
    truncarTexto(texto, maxLength = 20) {
        if (!texto) return "N/D";
        if (typeof texto !== "string") return String(texto);
        return texto.length > maxLength
            ? texto.substring(0, maxLength - 3) + "..."
            : texto;
    },

    // Calcular saldo de gols
    calcularSaldoGols(golsPro, golsContra) {
        const pro = parseInt(golsPro) || 0;
        const contra = parseInt(golsContra) || 0;
        return pro - contra;
    },

    // Validar dados do participante
    validarParticipante(participante) {
        if (!participante) return false;
        return (
            !!(participante.nomeCartoleiro || participante.nome_cartola) &&
            !!(participante.timeId || participante.id)
        );
    },

    // ✅ CORREÇÃO: Validar array
    validarArray(arr, nome = "array") {
        if (!Array.isArray(arr)) {
            throw new Error(`${nome} deve ser um array`);
        }
        return true;
    },

    // ✅ CORREÇÃO: Delay utilitário
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },

    // ✅ CORREÇÃO: Calcular média
    calcularMedia(valores) {
        if (!Array.isArray(valores) || valores.length === 0) return 0;
        const soma = valores.reduce(
            (acc, val) => acc + (parseFloat(val) || 0),
            0,
        );
        return soma / valores.length;
    },

    // ✅ CORREÇÃO: Ordenar por múltiplos critérios
    ordenarPorCriterios(array, criterios) {
        return [...array].sort((a, b) => {
            for (const criterio of criterios) {
                const { campo, ordem = "asc" } = criterio;
                const valorA = parseFloat(a[campo]) || 0;
                const valorB = parseFloat(b[campo]) || 0;

                if (valorA !== valorB) {
                    return ordem === "desc" ? valorB - valorA : valorA - valorB;
                }
            }
            return 0;
        });
    },

    // Ordenar participantes por saldo de gols
    ordenarPorSaldoGols(participantes) {
        return [...participantes].sort((a, b) => {
            // Primeiro por saldo de gols (decrescente)
            const saldoA = this.calcularSaldoGols(a.golsPro, a.golsContra);
            const saldoB = this.calcularSaldoGols(b.golsPro, b.golsContra);

            if (saldoB !== saldoA) return saldoB - saldoA;

            // Depois por gols pró (decrescente)
            if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;

            // Por último por gols contra (crescente)
            return a.golsContra - b.golsContra;
        });
    },

    // Calcular estatísticas gerais
    calcularEstatisticas(participantes) {
        if (!Array.isArray(participantes) || participantes.length === 0) {
            return {
                totalGolsPro: 0,
                totalGolsContra: 0,
                participantesAtivos: 0,
                mediaGolsPro: 0,
                mediaGolsContra: 0,
            };
        }

        const totalGolsPro = participantes.reduce(
            (acc, p) => acc + (p.golsPro || 0),
            0,
        );
        const totalGolsContra = participantes.reduce(
            (acc, p) => acc + (p.golsContra || 0),
            0,
        );
        const participantesAtivos = participantes.filter((p) =>
            this.validarParticipante(p),
        ).length;

        return {
            totalGolsPro,
            totalGolsContra,
            participantesAtivos,
            mediaGolsPro:
                participantesAtivos > 0
                    ? (totalGolsPro / participantesAtivos).toFixed(1)
                    : 0,
            mediaGolsContra:
                participantesAtivos > 0
                    ? (totalGolsContra / participantesAtivos).toFixed(1)
                    : 0,
        };
    },

    // Formatar dados do participante para exibição
    formatarParticipante(participante, posicao) {
        if (!this.validarParticipante(participante)) {
            return null;
        }

        const golsPro = parseInt(participante.golsPro) || 0;
        const golsContra = parseInt(participante.golsContra) || 0;
        const saldoGols = this.calcularSaldoGols(golsPro, golsContra);

        return {
            ...participante,
            posicao: posicao + 1,
            golsPro,
            golsContra,
            saldoGols,
            nomeCartoleiro: this.truncarTexto(
                participante.nomeCartoleiro || participante.nome_cartola,
                25,
            ),
            nomeTime: this.truncarTexto(
                participante.nomeTime || participante.nome_time,
                20,
            ),
        };
    },

    // Filtrar participantes válidos
    filtrarParticipantesValidos(participantes) {
        if (!Array.isArray(participantes)) return [];
        return participantes.filter((p) => this.validarParticipante(p));
    },

    // Verificar se é o artilheiro (primeiro lugar)
    ehArtilheiro(participante, todosParticipantes) {
        if (!participante || !Array.isArray(todosParticipantes)) return false;

        const ordenados = this.ordenarPorSaldoGols(todosParticipantes);
        return (
            ordenados.length > 0 &&
            (ordenados[0].timeId === participante.timeId ||
                ordenados[0].id === participante.id)
        );
    },

    // Gerar resumo textual do participante
    gerarResumoParticipante(participante) {
        if (!this.validarParticipante(participante)) {
            return "Participante inválido";
        }

        const nome = participante.nomeCartoleiro || participante.nome_cartola;
        const saldo = this.calcularSaldoGols(
            participante.golsPro,
            participante.golsContra,
        );
        const saldoTexto = this.formatarSaldo(saldo);

        return `${nome}: ${participante.golsPro} gols pró, ${participante.golsContra} contra (${saldoTexto})`;
    },

    // Debugging - log detalhado do participante
    debugParticipante(participante, index) {
        console.log(`🔍 [DEBUG] Participante ${index}:`, {
            nomeCartoleiro:
                participante.nomeCartoleiro || participante.nome_cartola,
            nomeTime: participante.nomeTime || participante.nome_time,
            timeId: participante.timeId || participante.id,
            golsPro: participante.golsPro,
            golsContra: participante.golsContra,
            saldoCalculado: this.calcularSaldoGols(
                participante.golsPro,
                participante.golsContra,
            ),
            valido: this.validarParticipante(participante),
        });
    },

    // Criar dados de exemplo para testes
    criarDadosExemplo() {
        return [
            {
                nomeCartoleiro: "João Silva",
                nomeTime: "Time Exemplo 1",
                timeId: "123",
                golsPro: 15,
                golsContra: 3,
                clubeId: "1",
            },
            {
                nomeCartoleiro: "Maria Santos",
                nomeTime: "Time Exemplo 2",
                timeId: "456",
                golsPro: 12,
                golsContra: 5,
                clubeId: "2",
            },
        ];
    },

    // Validar estrutura dos dados de entrada
    validarEstruturaDados(dados) {
        if (!Array.isArray(dados)) {
            console.warn("⚠️ [ARTILHEIRO-UTILS] Dados não são um array");
            return false;
        }

        if (dados.length === 0) {
            console.warn("⚠️ [ARTILHEIRO-UTILS] Array de dados está vazio");
            return false;
        }

        const participantesValidos = dados.filter((p) =>
            this.validarParticipante(p),
        );
        if (participantesValidos.length === 0) {
            console.warn(
                "⚠️ [ARTILHEIRO-UTILS] Nenhum participante válido encontrado",
            );
            return false;
        }

        console.log(
            `✅ [ARTILHEIRO-UTILS] ${participantesValidos.length} participantes válidos de ${dados.length} total`,
        );
        return true;
    },

    // Formatar bytes para exibição
    formatarBytes(bytes) {
        if (bytes === 0) return "0 B";

        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    // Formatar data para exibição
    formatarData(data) {
        if (!data) return "N/D";
        const d = new Date(data);
        return d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    },

    // Gerar ID único
    gerarId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
};

// ===== FUNÇÕES UTILITÁRIAS GLOBAIS =====

// Função global para calcular saldo
window.calcularSaldoGols = (golsPro, golsContra) => {
    return ArtilheiroUtils.calcularSaldoGols(golsPro, golsContra);
};

// Função global para formatar saldo
window.formatarSaldoGols = (numero) => {
    return ArtilheiroUtils.formatarSaldo(numero);
};

// ===== DISPONIBILIZAR GLOBALMENTE =====
if (typeof window !== "undefined") {
    window.ArtilheiroUtils = ArtilheiroUtils;
}

console.log("✅ [ARTILHEIRO-UTILS] Utilitários v1.1 carregados com sucesso!");

export { ArtilheiroUtils };
export default ArtilheiroUtils;
