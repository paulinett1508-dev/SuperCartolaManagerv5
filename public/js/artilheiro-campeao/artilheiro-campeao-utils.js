// ✅ ARTILHEIRO-CAMPEAO-UTILS.JS - Utilitários do módulo Artilheiro Campeão
console.log("🔧 [ARTILHEIRO-UTILS] Módulo de utilitários carregando...");

// ===== UTILITÁRIOS PARA ARTILHEIRO CAMPEÃO =====
const ArtilheiroUtils = {
    version: "1.0.0",

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
        return !!(participante.nomeCartoleiro && participante.timeId);
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
            nomeCartoleiro: this.truncarTexto(participante.nomeCartoleiro, 25),
            nomeTime: this.truncarTexto(participante.nomeTime, 20),
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
            ordenados.length > 0 && ordenados[0].timeId === participante.timeId
        );
    },

    // Gerar resumo textual do participante
    gerarResumoParticipante(participante) {
        if (!this.validarParticipante(participante)) {
            return "Participante inválido";
        }

        const saldo = this.calcularSaldoGols(
            participante.golsPro,
            participante.golsContra,
        );
        const saldoTexto = this.formatarSaldo(saldo);

        return `${participante.nomeCartoleiro}: ${participante.golsPro} gols pró, ${participante.golsContra} contra (${saldoTexto})`;
    },

    // Debugging - log detalhado do participante
    debugParticipante(participante, index) {
        console.log(`🔍 [DEBUG] Participante ${index}:`, {
            nomeCartoleiro: participante.nomeCartoleiro,
            nomeTime: participante.nomeTime,
            timeId: participante.timeId,
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

console.log("✅ [ARTILHEIRO-UTILS] Utilitários carregados com sucesso!");

export { ArtilheiroUtils };
export default ArtilheiroUtils;
