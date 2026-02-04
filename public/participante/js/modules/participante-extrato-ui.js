// =====================================================
// MÓDULO: UI DO EXTRATO PARTICIPANTE - v10.22 FIX CRÍTICO ESCOPO
// =====================================================
// ✅ v10.22: FIX CRÍTICO - renderizarBotaoMeusAcertos exposta em window scope
//          - ReferenceError resolvido (função chamada antes de definida)
//          - Bug bloqueador P0 que causava tela branca no app
// ✅ v10.21: FIX SALDO INICIAL - Considera saldo anterior transferido
//          - Saldo = crédito anterior - taxa (não apenas -taxa)
//          - Créditos mostra valor do saldo transferido (não hardcoded 0)
//          - Exemplo: crédito 111.54 - taxa 180 = saldo -68.46
// ✅ v10.20: FIX GRAFICO - renderizarGraficoPreTemporada exposto no window
//          - Função era local e não acessível dentro do setTimeout
//          - Agora usa window.renderizarGraficoPreTemporada para escopo correto
// ✅ v10.19: FIX TELA BRANCA - Condição if(!isPreTemporada2026) mudada para if(true)
//          - A função renderizarConteudoRenovadoPreTemporada só é chamada em pré-temporada
//          - A condição nunca era verdadeira, deixando html vazio
// ✅ v10.16: FIX CRÍTICO - Removido código órfão no topo do arquivo
//          - Variáveis isPreTemporada2026 estavam fora de escopo
//          - Causava "extrato is not defined" ao carregar módulo
//          - Adicionado definições em renderizarConteudoRenovadoPreTemporada
// ✅ v10.15: FIX SELETOR TEMPORADA - Considera temporada selecionada pelo usuário
//          - Se usuário selecionou 2025 (histórico), mostra layout completo
//          - Se usuário selecionou 2026 (atual), mostra layout de pré-temporada
//          - Previne dados de 2025 aparecerem quando 2026 é selecionado
// ✅ v10.14: RENOVADOS - Layout específico para temporada 2026
//          - Créditos/Débitos mostram apenas realidade 2026
//          - Gráfico com curvas suaves prevendo 38 rodadas
//          - Histórico: "Aguardando a rodada 1"
//          - Desempenho zerado até campeonato começar
// ✅ v10.13: FORCE UPDATE - Limpeza obrigatória de cache IndexedDB
//          - Resolve dados desatualizados de temporada anterior
//          - Garante extrato 2026 com apenas taxa de inscrição
// ✅ v10.12: FIX - Exibe taxa de inscrição e saldo anterior transferido
//          - Dívida da temporada anterior aparece nos Débitos
//          - Crédito da temporada anterior aparece nos Créditos
// ✅ v10.11: FIX - Não preencher 38 rodadas fixas em pré-temporada
//          - Taxa de inscrição aparece no modal de Débitos
//          - Rodadas são carregadas progressivamente (só as que existem)
// ✅ v10.10: FIX - Inclui temporada nas URLs de API (evita criar cache de temporada futura)
// ✅ v10.9: FIX CRÍTICO - mostrarPopupDetalhamento usa resumo consolidado (igual admin)
//          Corrige discrepância de valores entre admin e app no modal de débitos/créditos
// ✅ v10.8: Refatorado para SaaS - remove liga ID hardcoded, usa config dinamica
// ✅ v10.7: FIX CRÍTICO - Usar saldo_atual como fonte primária (igual Inicio)
// ✅ v10.6: Mini botão refresh no Bottom Sheet Acertos (atualização pontual)
// ✅ v10.5: FIX - Campo dataAcerto corrigido (backend envia dataAcerto, não data)
// ✅ v10.4: Inclui acertos nos cards Créditos/Débitos
// ✅ v10.3: FIX - Botão Pill com CSS dedicado (alinhamento correto)
// ✅ v10.2: BOTTOM SHEET ACERTOS - Separação total Jogo vs Financeiro
//    - Botão "MEUS ACERTOS" pill discreto abaixo de Créditos/Débitos
//    - Bottom Sheet modal para detalhes de pagamentos/recebimentos
//    - Lista de rodadas limpa (apenas jogo)
//    - Saldo principal já inclui acertos no cálculo
// ✅ v10.1: ACERTOS FINANCEIROS - Exibe pagamentos/recebimentos
// ✅ v10.0: Novo design visual baseado em referência
//    - Cards com cores de fundo distintas: #0D1F18 (ganho), #1F0D0D (perda), #1c1c1e (neutro)
//    - Barra lateral esquerda como indicador visual (verde/vermelho)
//    - Badges com novo estilo: MITO (amarelo), MICO (vermelho), G/Z
//    - Layout em 2 linhas quando tem Top10
//    - Saldo com cores: text-green-400 / text-red-400 / text-zinc-500
// ✅ v9.1: Layout horizontal e nomes completos
// ✅ v9.0: Redesign - Badge BANCO unificado com valor
// ✅ v8.7: CORREÇÃO CRÍTICA - Campos manuais não duplicados

if (window.Log) Log.info("[EXTRATO-UI] v10.19 FIX TELA BRANCA (condição sempre true)");

// ===== v10.8: CACHE DE CONFIG DA LIGA =====
let ligaConfigCache = null;

// ✅ v10.14: Cache de status de renovação
let statusRenovacaoParticipante = null;

// ✅ v10.14: Detectar se é pré-temporada (antes da rodada 1)
function isPreTemporada(rodadas) {
    // Se não tem rodadas ou todas são rodada 0 (lançamentos iniciais), é pré-temporada
    if (!rodadas || rodadas.length === 0) return true;
    const rodadasValidas = rodadas.filter(r => r.rodada && r.rodada > 0);
    return rodadasValidas.length === 0;
}

// ✅ v10.14: Verificar se participante renovou para nova temporada
async function verificarStatusRenovacao() {
    // Usar cache global se disponível
    if (window.verificarRenovacaoParticipante) {
        const ligaId = window.PARTICIPANTE_IDS?.ligaId || window.participanteData?.ligaId;
        const timeId = window.PARTICIPANTE_IDS?.timeId || window.participanteData?.timeId;
        if (ligaId && timeId) {
            statusRenovacaoParticipante = await window.verificarRenovacaoParticipante(ligaId, timeId);
            return statusRenovacaoParticipante;
        }
    }
    return { renovado: false };
}

// Buscar config dinamica da liga
async function fetchLigaConfigSilent(ligaId) {
    if (ligaConfigCache?.liga_id === ligaId) return ligaConfigCache;
    try {
        const response = await fetch(`/api/ligas/${ligaId}/configuracoes`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                ligaConfigCache = data;
                window.ligaConfigCache = data; // Disponibilizar globalmente
                return data;
            }
        }
    } catch (e) { /* silencioso */ }
    return null;
}

// Obter faixas corretas para liga E rodada (v10.8: usa config dinamica)
function getFaixasParaRodada(ligaId, rodada) {
    // Usar cache local ou global
    const config = ligaConfigCache || window.ligaConfigCache;
    if (!config?.ranking_rodada) return detectarFaixasPorTotal(32);

    const rankingConfig = config.ranking_rodada;

    // Config temporal (ex: Sobral com fases)
    if (rankingConfig.temporal) {
        const rodadaTransicao = rankingConfig.rodada_transicao || 30;
        const fase = rodada < rodadaTransicao ? "fase1" : "fase2";
        const faseConfig = rankingConfig[fase];
        return {
            nome: config.liga_nome,
            totalTimes: faseConfig?.total_participantes || 32,
            ...faseConfig?.faixas
        };
    }

    // Config simples
    return {
        nome: config.liga_nome,
        totalTimes: rankingConfig.total_participantes || 32,
        ...rankingConfig.faixas
    };
}

// Fallback: detectar faixas pelo totalTimes
function detectarFaixasPorTotal(totalTimes) {
    if (totalTimes <= 6) {
        return {
            totalTimes,
            credito: { inicio: 1, fim: 2 },
            neutro: { inicio: 3, fim: Math.floor(totalTimes / 2) },
            debito: { inicio: Math.floor(totalTimes / 2) + 1, fim: totalTimes },
        };
    }
    const terco = Math.floor(totalTimes / 3);
    return {
        totalTimes,
        credito: { inicio: 1, fim: terco },
        neutro: { inicio: terco + 1, fim: totalTimes - terco },
        debito: { inicio: totalTimes - terco + 1, fim: totalTimes },
    };
}

// Classificar posição na faixa
function classificarPosicao(posicao, faixas) {
    if (!posicao) return "neutro";
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim)
        return "credito";
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim)
        return "debito";
    return "neutro";
}

// ✅ v8.4: Converter posição para label de zona (G1-G11 ou Z10-Z1)
function getPosicaoZonaLabel(posicao, faixas) {
    if (!posicao) return { label: null, tipo: "neutro" };

    // Zona de Ganho: G1, G2, G3...
    if (posicao >= faixas.credito.inicio && posicao <= faixas.credito.fim) {
        return { label: `G${posicao}`, tipo: "ganho" };
    }

    // Zona de Perda: Z10 (22º) até Z1 (32º) - inversão elegante
    if (posicao >= faixas.debito.inicio && posicao <= faixas.debito.fim) {
        const totalZona = faixas.debito.fim - faixas.debito.inicio + 1;
        const zNum = faixas.debito.fim - posicao + 1;
        return { label: `Z${zNum}`, tipo: "perda" };
    }

    // Zona Neutra: sem label
    return { label: null, tipo: "neutro" };
}

// ===== v10.8: CALCULAR POSIÇÃO NO TOP10 PELO VALOR (DINÂMICO) =====
// Deriva a posição no ranking histórico baseado no valor financeiro
// Usa config dinâmica ao invés de liga IDs hardcoded
function calcularPosicaoTop10(valor, ligaId) {
    const absValor = Math.abs(valor);

    // v10.8: Usar config dinâmica para determinar formato
    const config = ligaConfigCache || window.ligaConfigCache;
    const top10Config = config?.top10;

    // Detectar formato pelos valores ou total de participantes
    // Liga grande (>20 times): formato 30,28,26... (decremento de 2)
    // Liga pequena (<=20 times): formato 10,9,8... (decremento de 1)
    const totalParticipantes = config?.total_participantes ||
        config?.ranking_rodada?.total_participantes || 32;
    const isLigaGrande = totalParticipantes > 20;

    if (isLigaGrande) {
        // Liga grande: valor = 30 - (pos-1)*2 → pos = (30 - valor)/2 + 1
        const pos = Math.round((30 - absValor) / 2) + 1;
        return Math.min(Math.max(pos, 1), 10);
    } else {
        // Liga pequena: valor = 11 - pos → pos = 11 - valor
        const pos = 11 - absValor;
        return Math.min(Math.max(pos, 1), 10);
    }
}

// ===== v10.11: PREENCHER RODADAS DINÂMICO =====
// v10.11 FIX: NÃO preencher 38 rodadas fixas - mostrar apenas rodadas existentes
// Para temporada em andamento, preenche até a última rodada jogada
// Para pré-temporada (0 rodadas), retorna array vazio
function preencherTodasRodadas(rodadasExistentes, totalRodadas = 38) {
    // Se não há rodadas, retornar array vazio (não criar 38 rodadas vazias)
    if (!rodadasExistentes || rodadasExistentes.length === 0) {
        return [];
    }

    const rodadasMap = new Map();

    // Indexar rodadas existentes (ignorar rodada 0 = lançamentos iniciais)
    rodadasExistentes.forEach(r => {
        if (r.rodada && r.rodada > 0) {
            rodadasMap.set(r.rodada, r);
        }
    });

    // Se não há rodadas válidas (ex: só tem inscrição), retornar vazio
    if (rodadasMap.size === 0) {
        return [];
    }

    // Encontrar a última rodada jogada
    const ultimaRodada = Math.max(...Array.from(rodadasMap.keys()));

    // Criar array apenas até a última rodada jogada (não 38 fixas)
    const todasRodadas = [];
    for (let i = 1; i <= ultimaRodada; i++) {
        if (rodadasMap.has(i)) {
            todasRodadas.push(rodadasMap.get(i));
        } else {
            // Rodada neutra sem movimentação
            todasRodadas.push({
                rodada: i,
                posicao: null,
                bonusOnus: 0,
                pontosCorridos: 0,
                mataMata: 0,
                top10: 0,
                _preenchida: true // Flag para identificar
            });
        }
    }

    return todasRodadas;
}

// ===== RENDERIZAR CONTEÚDO COMPLETO =====
// ✅ v10.23: Movido para ANTES da função exportada para evitar erro "function is not defined"
window.renderizarConteudoCompleto = function renderizarConteudoCompleto(container, extrato) {
    const resumoBase = extrato.resumo || {
        saldo: 0,
        totalGanhos: 0,
        totalPerdas: 0,
    };
    // Detectar se é pré-temporada 2026
    const temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
    const temporadaSelecionada = window.seasonSelector?.getTemporadaSelecionada?.();
    const isPreTemporada2026 = (temporadaSelecionada || temporadaAtual) >= 2026 && isPreTemporada(extrato.rodadas);

    // Para 2026 pré-temporada, não processa campos manuais/editáveis
    let camposManuais = [];
    if (!isPreTemporada2026) {
        camposManuais = extrato.camposManuais || extrato.camposEditaveis || [];
    }

    // Para 2026 pré-temporada, não processa POS
    let rodadasSemPos = extrato.rodadas;
    if (isPreTemporada2026) {
        rodadasSemPos = extrato.rodadas.map(r => ({ ...r, posicao: null }));
    }

    // ✅ v8.7: resumo.saldo/totalGanhos/totalPerdas JÁ incluem campos manuais
    // Não duplicar somando novamente!
    const totalGanhosBase = resumoBase.totalGanhos || 0;
    const totalPerdasBase = Math.abs(resumoBase.totalPerdas || 0);

    // ✅ v10.1: Extrair acertos financeiros
    const acertos = extrato.acertos || { lista: [], resumo: {} };
    const listaAcertos = acertos.lista || [];
    const resumoAcertos = acertos.resumo || {};

    // ✅ v10.10 FIX CRÍTICO: NÃO somar acertos nos cards de Créditos/Débitos
    // Os cards mostram apenas débitos/créditos da TEMPORADA (igual ao admin)
    // Acertos (pagamentos/recebimentos) só afetam o SALDO FINAL, não os totais
    // Motivo: Pagamento QUITA dívida, não cria novo débito
    const totalGanhos = totalGanhosBase;
    const totalPerdas = totalPerdasBase;

    // ✅ v10.7: FIX CRÍTICO - Cálculo do saldo igual ao Inicio
    // O Inicio usa: extratoData?.saldo_atual ?? extratoData?.resumo?.saldo_final ?? 0
    // Precisamos fazer o mesmo aqui para consistência

    // Fonte primária: saldo_atual (já inclui acertos, calculado pelo backend)
    // Fallback: saldo_final + saldo_acertos (cálculo manual)
    const saldoAcertosCalculado =
        resumoAcertos?.saldo ??           // De extrato.acertos.resumo.saldo
        resumoBase?.saldo_acertos ??      // De resumo.saldo_acertos
        extrato?.acertos?.resumo?.saldo ?? // Acesso direto
        0;

    // Usar saldo_atual se disponível (como faz o Inicio), senão calcular
    const saldoTemporada = resumoBase.saldo_temporada ?? resumoBase.saldo_final ?? resumoBase.saldo ?? 0;
    const saldoAcertos = saldoAcertosCalculado; // Alias para uso no bottom sheet
    const saldo = resumoBase.saldo_atual ?? (saldoTemporada + saldoAcertos);

    if (window.Log) Log.info("[EXTRATO-UI] 💰 Cálculo saldo:", {
        saldo_atual: resumoBase.saldo_atual,
        saldoTemporada,
        saldoAcertosCalculado,
        saldoFinal: saldo,
        fonte: resumoBase.saldo_atual !== undefined ? "saldo_atual (backend)" : "calculado (temporada + acertos)"
    });

    const saldoPositivo = saldo >= 0;
    const saldoFormatado = `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`;
    const statusTexto = saldoPositivo ? "A RECEBER" : "A PAGAR";

    // ✅ v10.22: Dados de inscrição para exibição no card
    const taxaInscricao = resumoBase.taxaInscricao || 0;
    const pagouInscricao = resumoBase.pagouInscricao === true;

    const ligaId =
        extrato.liga_id ||
        extrato.ligaId ||
        window.PARTICIPANTE_IDS?.ligaId ||
        window.participanteData?.ligaId ||
        "";

    if (window.Log)
        Log.info(
            "[EXTRATO-UI] 🔍 LigaId:",
            ligaId,
            "| Campos manuais:",
            camposManuais.length,
        );

    window.ligaIdAtual = ligaId;

    // v8.8: Preencher todas as 38 rodadas (mesmo neutras) e ordenar decrescente
    const rodadasCompletas = preencherTodasRodadas(rodadasSemPos, 38);
    const rodadasOrdenadas = rodadasCompletas.sort(
        (a, b) => b.rodada - a.rodada,
    );

    container.innerHTML = `
        <!-- Card Saldo Principal -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-3xl ${saldoPositivo ? "text-emerald-400" : "text-rose-400"}">account_balance_wallet</span>
                    <div>
                        <p class="text-xs font-medium uppercase text-white/70">Saldo Financeiro</p>
                        <p class="text-2xl font-bold ${saldoPositivo ? "text-emerald-400" : "text-rose-400"}">${saldoPositivo ? "+" : "-"}${saldoFormatado}</p>
                        ${taxaInscricao > 0 ? `
                        <p class="text-xs mt-1 ${pagouInscricao ? 'text-emerald-400' : 'text-rose-400'}">
                            Inscrição ${temporadaSelecionada || temporadaAtual}: R$ ${taxaInscricao.toFixed(2).replace('.', ',')} ${pagouInscricao ? 'C' : 'D'}
                        </p>
                        ` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="${saldoPositivo ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"} text-[10px] font-semibold px-2 py-1 rounded-full">${statusTexto}</span>
                    <button id="btnRefreshExtrato" class="p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-lg">sync</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cards Ganhos/Perdas -->
        <div class="grid grid-cols-2 gap-3 mb-3">
            <div onclick="window.mostrarDetalhamentoGanhos(event)" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-emerald-400 text-base flex-shrink-0">arrow_upward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Créditos</p>
                </div>
                <span class="text-sm font-bold text-emerald-400 whitespace-nowrap ml-1">+${totalGanhos.toFixed(2).replace(".", ",")}</span>
            </div>
            <div onclick="window.mostrarDetalhamentoPerdas(event)" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-rose-400 text-base flex-shrink-0">arrow_downward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Débitos</p>
                </div>
                <span class="text-sm font-bold text-rose-400 whitespace-nowrap ml-1">-${totalPerdas.toFixed(2).replace(".", ",")}</span>
            </div>
        </div>

        <!-- ✅ v10.2: Botão MEUS ACERTOS (Pill discreto) -->
        ${renderizarBotaoMeusAcertos(listaAcertos, saldoAcertos)}

        <!-- Gráfico de Evolução -->
        <div class="bg-surface-dark p-4 rounded-xl mb-4 border border-white/5">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">show_chart</span>
                    <h3 class="text-sm font-bold text-white">Evolução Financeira</h3>
                </div>
                <div class="flex items-center gap-1 bg-white/5 p-1 rounded-lg text-xs">
                    <button class="filtro-btn px-2 py-1 rounded-md bg-primary/80 text-white font-semibold" data-range="all">Tudo</button>
                    <button class="filtro-btn px-2 py-1 rounded-md text-white/50 hover:text-white transition-colors" data-range="10">10R</button>
                    <button class="filtro-btn px-2 py-1 rounded-md text-white/50 hover:text-white transition-colors" data-range="5">5R</button>
                </div>
            </div>
            <div class="relative h-40">
                <svg id="graficoSVG" class="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="none" fill="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="#F97316" stop-opacity="0.3"></stop>
                            <stop offset="100%" stop-color="#F97316" stop-opacity="0"></stop>
                        </linearGradient>
                    </defs>
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="40" y2="40"></line>
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="80" y2="80"></line>
                    <line class="stroke-zinc-700/60" stroke-dasharray="2 2" x1="0" x2="300" y1="120" y2="120"></line>
                    <path id="graficoArea" fill="url(#chartGradient)" d=""></path>
                    <path id="graficoPath" fill="none" stroke="#F97316" stroke-width="2" d=""></path>
                </svg>
                <div id="graficoLabels" class="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gray-500 px-1"></div>
            </div>
        </div>

        <!-- Histórico por Rodada - v8.8: Espaçamento melhorado -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-primary text-xl">history</span>
                <h3 class="text-base font-bold text-white">Histórico por Rodada</h3>
                <span class="text-xs text-white/50 ml-auto">${rodadasOrdenadas.length} rodadas</span>
            </div>
            <div class="space-y-3">
                ${renderizarCardsRodadas(rodadasOrdenadas, ligaId)}
            </div>
        </div>

        <!-- Card Seu Desempenho -->
        ${renderizarCardDesempenho(rodadasOrdenadas, ligaId)}

        <!-- Modal TOP10 Info -->
        <div id="modalTop10Info" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4" onclick="this.classList.add('hidden'); this.classList.remove('flex');">
            <div onclick="event.stopPropagation()" class="bg-surface-dark rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div class="p-4 border-b border-white/10">
                    <div class="flex justify-between items-center">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons text-yellow-400">emoji_events</span>
                            Detalhe TOP 10
                        </h3>
                        <button class="text-white/50 hover:text-white" onclick="document.getElementById('modalTop10Info').classList.add('hidden'); document.getElementById('modalTop10Info').classList.remove('flex');">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>
                <div id="modalTop10Body" class="p-4"></div>
            </div>
        </div>

        <!-- ✅ v10.2: Bottom Sheet MEUS ACERTOS -->
        ${renderizarBottomSheetAcertos(listaAcertos, resumoAcertos, saldoTemporada, saldoAcertos)}
    `;
};

// ===== EXPORTAR FUNÇÃO PRINCIPAL =====
export async function renderizarExtratoParticipante(extrato, participanteId) {
    const container = document.getElementById("fluxoFinanceiroContent");
    if (!container) {
        if (window.Log) Log.error("[EXTRATO-UI] ❌ Container não encontrado!");
        return;
    }

    if (!extrato || !extrato.rodadas || !Array.isArray(extrato.rodadas)) {
        container.innerHTML = renderizarErro();
        return;
    }

    // ✅ v10.14: Verificar status de renovação
    await verificarStatusRenovacao();
    const renovado = statusRenovacaoParticipante?.renovado || false;
    const preTemporada = isPreTemporada(extrato.rodadas);

    // ✅ v10.15: Verificar temporada selecionada pelo usuário
    // Se usuário selecionou 2025 (histórico), não é pré-temporada
    const temporadaSelecionada = window.seasonSelector?.getTemporadaSelecionada?.();
    const CONFIG = window.ParticipanteConfig || {};
    const temporadaAtual = CONFIG.CURRENT_SEASON || 2026;
    const visualizandoHistorico = temporadaSelecionada && temporadaSelecionada < temporadaAtual;

    if (window.Log) Log.info("[EXTRATO-UI] 📊 Status:", {
        renovado,
        preTemporada,
        rodadas: extrato.rodadas.length,
        temporadaSelecionada,
        visualizandoHistorico
    });

    window.extratoAtual = extrato;

    // ✅ v10.15: Renderização condicional
    // - Se visualizando histórico (2025), sempre usa layout completo
    // - Se renovado E pré-temporada E temporada atual, usa layout de pré-temporada
    if (!visualizandoHistorico && renovado && preTemporada) {
        renderizarConteudoRenovadoPreTemporada(container, extrato);
    } else {
        window.renderizarConteudoCompleto(container, extrato);
    }

    setTimeout(() => {
        // ✅ v10.15: Gráfico diferente para pré-temporada (apenas se não estiver vendo histórico)
        if (!visualizandoHistorico && renovado && preTemporada) {
            window.renderizarGraficoPreTemporada();
        } else {
            renderizarGraficoEvolucao(extrato.rodadas);
        }
        configurarFiltrosGrafico(extrato.rodadas);
        configurarBotaoRefresh();
    }, 100);
}

// =====================================================================
// ✅ v10.14: RENDERIZAÇÃO PARA RENOVADOS EM PRÉ-TEMPORADA
// =====================================================================
function renderizarConteudoRenovadoPreTemporada(container, extrato) {
    const resumoBase = extrato.resumo || {};
    const inscricaoInfo = statusRenovacaoParticipante || {};

    // Taxa de inscrição (débito se não pagou)
    const taxaInscricao = inscricaoInfo.taxaInscricao || resumoBase.taxaInscricao || 180;
    // ✅ v10.15: Verificar pagamento tanto do status de renovação quanto do resumo do backend
    const pagouInscricao = inscricaoInfo.pagouInscricao === true || resumoBase.pagouInscricao === true;

    // ✅ v10.21 FIX: Considerar saldo anterior transferido (crédito da temporada anterior)
    // Exemplo: crédito 111.54 - taxa 180 = saldo -68.46 (deve)
    const saldoAnteriorTransferido = resumoBase.saldoAnteriorTransferido || 0;
    const debitoTaxa = pagouInscricao ? 0 : taxaInscricao;

    // Saldo: usar do backend se disponível, senão calcular (crédito - taxa)
    const saldoCalculado = saldoAnteriorTransferido - debitoTaxa;
    const saldo = resumoBase.saldo_atual ?? resumoBase.saldo ?? saldoCalculado;
    const saldoPositivo = saldo >= 0;
    const saldoFormatado = `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`;
    const statusTexto = saldoPositivo ? (saldo === 0 ? "QUITADO" : "A RECEBER") : "A PAGAR";

    // ✅ v10.21 FIX: Créditos inclui saldo anterior transferido, Débitos inclui taxa
    const totalGanhos = saldoAnteriorTransferido > 0 ? saldoAnteriorTransferido : 0;
    const totalPerdas = debitoTaxa;
    
    // Acertos
    const acertos = extrato.acertos || { lista: [], resumo: {} };
    const listaAcertos = acertos.lista || [];
    const saldoAcertos = acertos.resumo?.saldo || 0;

    // ✅ v10.16 FIX: Definir variáveis de temporada dentro do escopo da função
    const temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
    const temporadaSelecionada = window.seasonSelector?.getTemporadaSelecionada?.() || temporadaAtual;
    const isPreTemporada2026 = temporadaSelecionada >= 2026 && isPreTemporada(extrato.rodadas);

    let html = ``;
    // ✅ v10.19 FIX: Condição SEMPRE TRUE - a função só é chamada em pré-temporada de renovados
    // A condição original (!isPreTemporada2026) nunca era true, deixando html vazio
    if (true) { // Era: if (!isPreTemporada2026)
        html += `
        <!-- Card Saldo Principal -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-3xl ${saldoPositivo ? "text-emerald-400" : "text-rose-400"}">account_balance_wallet</span>
                    <div>
                        <p class="text-xs font-medium uppercase text-white/70">Saldo Financeiro</p>
                        <p class="text-2xl font-bold ${saldoPositivo ? "text-emerald-400" : "text-rose-400"}">${saldoPositivo ? "+" : "-"}${saldoFormatado}</p>
                        <p class="text-xs mt-1 ${pagouInscricao ? 'text-emerald-400' : 'text-rose-400'}">
                            Inscrição 2026: R$ ${taxaInscricao.toFixed(2).replace('.', ',')} ${pagouInscricao ? 'C' : 'D'}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="${saldoPositivo ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"} text-[10px] font-semibold px-2 py-1 rounded-full">${statusTexto}</span>
                    <button id="btnRefreshExtrato" class="p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 active:scale-95 transition-all">
                        <span class="material-symbols-outlined text-lg">sync</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cards Ganhos/Perdas - Apenas 2026 -->
        <div class="grid grid-cols-2 gap-3 mb-3">
            <div onclick="window.mostrarDetalhamentoGanhos(event)" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-emerald-400 text-base flex-shrink-0">arrow_upward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Créditos</p>
                </div>
                <span class="text-sm font-bold text-emerald-400 whitespace-nowrap ml-1">+${totalGanhos.toFixed(2).replace(".", ",")}</span>
            </div>
            <div onclick="window.mostrarDetalhamentoPerdas(event)" class="bg-surface-dark p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-icons text-rose-400 text-base flex-shrink-0">arrow_downward</span>
                    <p class="text-xs text-white/70 uppercase truncate">Débitos</p>
                </div>
                <span class="text-sm font-bold text-rose-400 whitespace-nowrap ml-1">-${totalPerdas.toFixed(2).replace(".", ",")}</span>
            </div>
        </div>

        <!-- Botão MEUS ACERTOS -->
        ${renderizarBotaoMeusAcertos(listaAcertos, saldoAcertos)}

        <!-- Gráfico de Evolução - PRÉ-TEMPORADA -->
        <div class="bg-surface-dark p-4 rounded-xl mb-4 border border-white/5">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">show_chart</span>
                    <h3 class="text-sm font-bold text-white">Evolução Financeira</h3>
                </div>
                <span class="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-semibold">
                    PRÉ-TEMPORADA
                </span>
            </div>
            <div class="relative h-40">
                <svg id="graficoSVG" class="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="none" fill="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="#F97316" stop-opacity="0.2"></stop>
                            <stop offset="100%" stop-color="#F97316" stop-opacity="0"></stop>
                        </linearGradient>
                    </defs>
                    <!-- Grid lines -->
                    <line class="stroke-zinc-700/40" stroke-dasharray="3 3" x1="0" x2="300" y1="40" y2="40"></line>
                    <line class="stroke-zinc-700/40" stroke-dasharray="3 3" x1="0" x2="300" y1="80" y2="80"></line>
                    <line class="stroke-zinc-700/40" stroke-dasharray="3 3" x1="0" x2="300" y1="120" y2="120"></line>
                    <path id="graficoArea" fill="url(#chartGradient)" d=""></path>
                    <path id="graficoPath" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d=""></path>
                </svg>
                <div id="graficoLabels" class="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gray-500 px-1"></div>
            </div>
        </div>

        <!-- Histórico por Rodada - AGUARDANDO -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-primary text-xl">history</span>
                <h3 class="text-base font-bold text-white">Histórico por Rodada</h3>
                <span class="text-xs text-white/50 ml-auto">0 rodadas</span>
            </div>
            <div class="flex flex-col items-center justify-center py-8 text-center">
                <div class="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-3xl text-amber-400">hourglass_empty</span>
                </div>
                <p class="text-base font-semibold text-white mb-1">Aguardando a rodada 1</p>
                <p class="text-sm text-white/50">O Brasileirão 2026 ainda não começou</p>
                <p class="text-xs text-white/30 mt-2">Início previsto: 28/01/2026</p>
            </div>
        </div>

        <!-- Card Seu Desempenho - ZERADO -->
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary">analytics</span>
                <h3 class="text-sm font-bold text-white">Seu Desempenho</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-amber-400/50 text-lg">star</span>
                    <p class="text-lg font-bold text-white/30">0</p>
                    <p class="text-[10px] text-white/50">Mitos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400/50 text-lg">sentiment_very_dissatisfied</span>
                    <p class="text-lg font-bold text-white/30">0</p>
                    <p class="text-[10px] text-white/50">Micos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-emerald-400/50 text-lg">trending_up</span>
                    <p class="text-lg font-bold text-white/30">0</p>
                    <p class="text-[10px] text-white/50">Zona Ganho</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400/50 text-lg">trending_down</span>
                    <p class="text-lg font-bold text-white/30">0</p>
                    <p class="text-[10px] text-white/50">Zona Perda</p>
                </div>
            </div>
            <div class="mt-3 bg-white/5 rounded-lg p-3 text-center">
                <p class="text-xs text-white/40">Estatísticas serão atualizadas após a rodada 1</p>
            </div>
        </div>

        <!-- Modal TOP10 Info (mantido para compatibilidade) -->
        <div id="modalTop10Info" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4" onclick="this.classList.add('hidden'); this.classList.remove('flex');"></div>

        <!-- Bottom Sheet MEUS ACERTOS -->
        ${renderizarBottomSheetAcertos(listaAcertos, acertos.resumo || {}, saldo, saldoAcertos)}
    `;
}

// =====================================================================
// ✅ v10.14: GRÁFICO PRÉ-TEMPORADA - Curvas suaves prevendo 38 rodadas
// ✅ v10.20: Exposto no window para ser acessível dentro do setTimeout
// =====================================================================
window.renderizarGraficoPreTemporada = function renderizarGraficoPreTemporada() {
    const path = document.getElementById("graficoPath");
    const area = document.getElementById("graficoArea");
    const labels = document.getElementById("graficoLabels");

    if (!path || !area || !labels) return;

    const width = 300;
    const height = 140;
    const paddingY = 10;
    const centerY = height / 2; // Linha central (saldo 0)
    
    // ✅ Criar linha horizontal no centro (estagnada) com curva suave no início
    // Representa que ainda não começou - linha reta no nível 0
    const startX = 10;
    const endX = width - 10;
    
    // Path com curva Bezier suave - linha horizontal
    const pathD = `M ${startX} ${centerY} C ${startX + 30} ${centerY}, ${endX - 30} ${centerY}, ${endX} ${centerY}`;
    
    // Área abaixo da curva (muito sutil)
    const areaD = `${pathD} L ${endX} ${height} L ${startX} ${height} Z`;

    path.setAttribute("d", pathD);
    area.setAttribute("d", areaD);

    // Labels para rodadas (R1 a R38 espaçadas)
    const rodadasMarcadas = [1, 8, 15, 22, 29, 36, 38];
    labels.innerHTML = rodadasMarcadas.map((rodada, i) => {
        const x = startX + ((endX - startX) * (rodada - 1) / 37);
        return `<span style="position: absolute; left: ${(x / width) * 100}%; transform: translateX(-50%);">R${rodada}</span>`;
    }).join("");
}

// ===== v10.0: CARDS DE RODADAS - NOVO DESIGN COM BARRA LATERAL =====
function renderizarCardsRodadas(rodadas, ligaId) {
    if (!rodadas || rodadas.length === 0) {
        return `
            <div class="text-center py-4 text-white/50">
                <span class="material-icons text-3xl mb-2 block">inbox</span>
                Nenhuma rodada registrada
            </div>
        `;
    }

    // Detectar se é pré-temporada 2026
    const temporadaAtual = window.ParticipanteConfig?.CURRENT_SEASON || 2026;
    const temporadaSelecionada = window.seasonSelector?.getTemporadaSelecionada?.();
    const isPreTemporada2026 = (temporadaSelecionada || temporadaAtual) >= 2026 && isPreTemporada(rodadas);

    return rodadas
        .map((r) => {
            const faixas = getFaixasParaRodada(ligaId, r.rodada);
            const { label: zonaLabel, tipo: tipoZona } = getPosicaoZonaLabel(
                r.posicao,
                faixas,
            );

            const bonusOnus = r.bonusOnus || 0;
            const pontosCorridos = r.pontosCorridos || 0;
            const mataMata = r.mataMata || 0;
            const top10 = r.top10 || 0;

            const saldo = bonusOnus + pontosCorridos + mataMata + top10;
            const saldoFormatado = saldo.toFixed(2).replace(".", ",");
            const positivo = saldo >= 0;

            // ===== v10.0: CORES DO CARD E BARRA LATERAL =====
            const ultimaPosicao = faixas.debito?.fim || faixas.totalTimes;
            const isMito = r.posicao === 1;
            const isMico = r.posicao === ultimaPosicao;

            // Cores de fundo e borda baseadas no tipo
            let cardBg, cardBorder, barraLateral;

            if (tipoZona === "ganho" || saldo > 0) {
                cardBg = "bg-[#0D1F18]";
                cardBorder = "border-green-900/30";
                barraLateral = isMito ? "bg-green-500" : "bg-green-500/50";
            } else if (tipoZona === "perda" || saldo < 0) {
                cardBg = "bg-[#1F0D0D]";
                cardBorder = "border-red-900/30";
                barraLateral = isMico ? "bg-red-600" : "bg-red-800/50";
            } else {
                cardBg = "bg-[#1c1c1e]";
                cardBorder = "border-zinc-800";
                barraLateral = null;
            }

            // BADGES: ocultar para pré-temporada 2026
            let badgeBanco = "";
            if (!isPreTemporada2026) {
                const bonusFormatado = Math.abs(bonusOnus).toFixed(2).replace(".", ",");
                const sinalBonus = bonusOnus > 0 ? "+" : "-";
                if (isMito && bonusOnus !== 0) {
                    badgeBanco = `<span class=\"inline-flex items-center gap-1 text-[10px] bg-yellow-900/40 text-yellow-400 border border-yellow-700/30 px-2 py-1 rounded font-bold\">\n                        <span class=\"material-symbols-outlined text-[12px]\">emoji_events</span>\n                        MITO ${sinalBonus}${bonusFormatado}\n                    </span>`;
                } else if (isMico && bonusOnus !== 0) {
                    badgeBanco = `<span class=\"inline-flex items-center gap-1 text-[10px] bg-red-900/40 text-red-400 border border-red-700/30 px-2 py-1 rounded font-bold\">\n                        <span class=\"material-symbols-outlined text-[12px]\">thumb_down</span>\n                        MICO ${sinalBonus}${bonusFormatado}\n                    </span>`;
                } else if (zonaLabel && bonusOnus !== 0) {
                    if (tipoZona === "ganho") {
                        badgeBanco = `<span class=\"inline-flex items-center text-[10px] bg-green-900/40 text-green-400 border border-green-700/30 px-2 py-1 rounded font-bold\">\n                            ${zonaLabel} ${sinalBonus}${bonusFormatado}\n                        </span>`;
                    } else {
                        badgeBanco = `<span class=\"inline-flex items-center text-[10px] bg-red-900/30 text-red-300 border border-red-800/30 px-2 py-1 rounded font-bold\">\n                            ${zonaLabel} ${sinalBonus}${bonusFormatado}\n                        </span>`;
                    }
                }
            }

            // Badge TOP10 histórico - "Xº MELHOR MITO" ou "Xº PIOR MICO"
            let badgeTop10 = "";
            if (top10 !== 0) {
                const posTop10 = calcularPosicaoTop10(top10, ligaId);
                const valorTop10 = Math.abs(top10).toFixed(2).replace(".", ",");
                if (top10 > 0) {
                    badgeTop10 = `<span class="inline-flex items-center gap-1 text-[10px] bg-yellow-900/20 text-yellow-500 border border-yellow-800/20 px-2 py-0.5 rounded font-medium">
                        <span class="material-symbols-outlined text-[12px]">military_tech</span>
                        ${posTop10}º MELHOR MITO +${valorTop10}
                    </span>`;
                } else {
                    badgeTop10 = `<span class="inline-flex items-center gap-1 text-[10px] bg-rose-900/20 text-rose-400 border border-rose-800/20 px-2 py-0.5 rounded font-medium">
                        <span class="material-symbols-outlined text-[12px]">sentiment_sad</span>
                        ${posTop10}º PIOR MICO -${valorTop10}
                    </span>`;
                }
            }

            // Itens extras inline (Pontos Corridos e Mata-Mata)
            const extrasInline = [];

            if (pontosCorridos !== 0) {
                const corPC = pontosCorridos > 0 ? "text-green-400" : "text-red-400";
                const sinalPC = pontosCorridos > 0 ? "+" : "";
                extrasInline.push(
                    `<span class="inline-flex items-center gap-1 text-[10px] ${corPC}">
                        <span class="w-1 h-1 rounded-full bg-amber-400"></span>
                        <span class="text-amber-300">Pontos Corridos</span> ${sinalPC}${pontosCorridos.toFixed(2).replace(".", ",")}
                    </span>`
                );
            }

            if (mataMata !== 0) {
                const corMM = mataMata > 0 ? "text-green-400" : "text-red-400";
                const sinalMM = mataMata > 0 ? "+" : "";
                extrasInline.push(
                    `<span class="inline-flex items-center gap-1 text-[10px] ${corMM}">
                        <span class="w-1 h-1 rounded-full bg-sky-400"></span>
                        <span class="text-sky-300">Mata-Mata</span> ${sinalMM}${mataMata.toFixed(2).replace(".", ",")}
                    </span>`
                );
            }

            // Texto "Sem movimentação" para rodadas neutras
            const semMovimentacao = (saldo === 0 && !badgeBanco && !badgeTop10 && extrasInline.length === 0)
                ? `<span class="text-xs text-zinc-500">Sem movimentação</span>` : "";

            // ===== v10.0: LAYOUT COM BARRA LATERAL =====
            // Se tem Top10, usar layout em 2 linhas
            const temTop10 = badgeTop10 !== "";

            if (temTop10) {
                // Layout 2 linhas para cards com Top10
                return `
                <div class="${cardBg} rounded-xl border ${cardBorder} p-4 relative overflow-hidden">
                    ${barraLateral ? `<div class="absolute left-0 top-0 bottom-0 w-1 ${barraLateral}"></div>` : ""}
                    <div class="flex justify-between items-start">
                        <div class="flex flex-col space-y-2">
                            <div class="flex items-center space-x-3">
                                <span class="text-white font-bold text-sm w-8">R${r.rodada}</span>
                                ${badgeBanco}
                            </div>
                            <div class="ml-11">
                                ${badgeTop10}
                            </div>
                            ${extrasInline.length > 0 ? `<div class="flex items-center gap-2 ml-11 flex-wrap">${extrasInline.join("")}</div>` : ""}
                        </div>
                        <span class="text-lg font-bold ${saldo === 0 ? "text-zinc-500" : positivo ? "text-green-400" : "text-red-400"}">${saldo > 0 ? "+" : ""}${saldoFormatado}</span>
                    </div>
                </div>
            `;
            } else {
                // Layout 1 linha para cards simples
                return `
                <div class="${cardBg} rounded-xl border ${cardBorder} p-4 relative overflow-hidden">
                    ${barraLateral ? `<div class="absolute left-0 top-0 bottom-0 w-1 ${barraLateral}"></div>` : ""}
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-3 flex-wrap gap-y-1">
                            <span class="text-white font-bold text-sm w-8">R${r.rodada}</span>
                            ${badgeBanco}
                            ${semMovimentacao}
                            ${extrasInline.join("")}
                        </div>
                        <span class="text-lg font-bold ${saldo === 0 ? "text-zinc-500" : positivo ? "text-green-400" : "text-red-400"}">${saldo > 0 ? "+" : ""}${saldoFormatado}</span>
                    </div>
                </div>
            `;
            }
        })
        .join("");
}

// ===== v10.3: BOTÃO MEUS ACERTOS (Pill corrigido - window scope) =====
window.renderizarBotaoMeusAcertos = function renderizarBotaoMeusAcertos(listaAcertos, saldoAcertos) {
    const temAcertos = listaAcertos && listaAcertos.length > 0;
    const qtdAcertos = listaAcertos?.length || 0;

    // Determinar classe e texto do badge
    let badgeClass = "badge-neutral";
    let badgeTexto = "Nenhum";

    if (temAcertos) {
        if (saldoAcertos > 0) {
            badgeClass = "badge-positive";
            badgeTexto = `+R$ ${Math.abs(saldoAcertos).toFixed(0)}`;
        } else if (saldoAcertos < 0) {
            badgeClass = "badge-negative";
            badgeTexto = `-R$ ${Math.abs(saldoAcertos).toFixed(0)}`;
        } else {
            badgeClass = "badge-positive";
            badgeTexto = "Quitado";
        }
    }

    return `
        <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <button onclick="window.abrirBottomSheetAcertos()" class="btn-pill-acertos">
                <span class="material-symbols-outlined pill-icon">receipt_long</span>
                <span class="pill-text">Meus Acertos</span>
                <span class="pill-badge ${badgeClass}">${temAcertos ? qtdAcertos : badgeTexto}</span>
            </button>
        </div>
    `;
}

// ===== v10.2: BOTTOM SHEET ACERTOS FINANCEIROS =====
function renderizarBottomSheetAcertos(listaAcertos, resumoAcertos, saldoTemporada, saldoAcertos) {
    const totalPago = resumoAcertos?.totalPago || 0;
    const totalRecebido = resumoAcertos?.totalRecebido || 0;
    const saldoFinal = saldoTemporada + saldoAcertos;
    const quitado = Math.abs(saldoFinal) < 0.01;
    const temAcertos = listaAcertos && listaAcertos.length > 0;

    // Ordenar acertos por data (mais recente primeiro)
    const acertosOrdenados = temAcertos
        ? [...listaAcertos].sort((a, b) => new Date(b.dataAcerto || b.data || 0) - new Date(a.dataAcerto || a.data || 0))
        : [];

    // Renderizar lista de acertos
    const listaHTML = temAcertos
        ? acertosOrdenados.map(acerto => {
            const isPagamento = acerto.tipo === "pagamento";
            const valor = Math.abs(acerto.valor || 0);
            const dataFormatada = (acerto.dataAcerto || acerto.data)
                ? new Date(acerto.dataAcerto || acerto.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
                : "--/--/--";

            // Ícone e label do método de pagamento
            const metodos = {
                pix: { icon: "qr_code_2", label: "PIX" },
                transferencia: { icon: "account_balance", label: "TED" },
                dinheiro: { icon: "payments", label: "Dinheiro" },
                outro: { icon: "receipt", label: "Outro" }
            };
            const metodo = metodos[acerto.metodoPagamento] || metodos.outro;

            // Cores: Verde = você PAGOU (abateu dívida), Vermelho = admin PAGOU (prêmio)
            // Pagamento do usuário = verde (reduziu sua dívida)
            // Recebimento do usuário = vermelho (admin pagou prêmio)
            const corCard = isPagamento ? "border-emerald-500/20" : "border-rose-500/20";
            const corIcone = isPagamento ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400";
            const corValor = isPagamento ? "text-emerald-400" : "text-rose-400";
            const labelTipo = isPagamento ? "Você pagou" : "Você recebeu";

            return `
                <div class="bg-white/5 rounded-xl p-3 border ${corCard}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center ${corIcone}">
                                <span class="material-symbols-outlined text-lg">
                                    ${isPagamento ? "arrow_upward" : "arrow_downward"}
                                </span>
                            </div>
                            <div>
                                <p class="text-sm text-white font-medium">${acerto.descricao || labelTipo}</p>
                                <div class="flex items-center gap-2 text-[10px] text-white/40">
                                    <span class="flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[10px]">${metodo.icon}</span>
                                        ${metodo.label}
                                    </span>
                                    <span>•</span>
                                    <span>${dataFormatada}</span>
                                </div>
                            </div>
                        </div>
                        <span class="text-base font-bold ${corValor}">
                            ${isPagamento ? "-" : "+"}R$ ${valor.toFixed(2).replace(".", ",")}
                        </span>
                    </div>
                </div>
            `;
        }).join("")
        : `
            <div class="text-center py-8 text-white/50">
                <span class="material-symbols-outlined text-4xl mb-2 block opacity-50">receipt_long</span>
                <p class="text-sm">Nenhum acerto registrado</p>
                <p class="text-xs text-white/30 mt-1">Acertos e pagamentos aparecerão aqui</p>
            </div>
        `;

    return `
        <div id="bottomSheetAcertos" class="fixed inset-0 z-[60] hidden">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="window.fecharBottomSheetAcertos()"></div>

            <!-- Sheet -->
            <div class="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl max-h-[85vh] flex flex-col transform translate-y-full transition-transform duration-300 ease-out" id="bottomSheetContent">
                <!-- Handle -->
                <div class="flex justify-center pt-3 pb-2">
                    <div class="w-10 h-1 rounded-full bg-white/20"></div>
                </div>

                <!-- Header -->
                <div class="px-5 pb-4 border-b border-white/10">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">receipt_long</span>
                            Meus Acertos
                        </h3>
                        <div class="flex items-center gap-1">
                            <!-- Mini Refresh Button -->
                            <button id="btnRefreshAcertos" onclick="window.refreshAcertosBottomSheet()" class="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all" title="Atualizar acertos">
                                <span class="material-icons text-white/50 text-lg">sync</span>
                            </button>
                            <button onclick="window.fecharBottomSheetAcertos()" class="p-2 rounded-full hover:bg-white/10 transition-colors">
                                <span class="material-icons text-white/50">close</span>
                            </button>
                        </div>
                    </div>
                    <p class="text-xs text-white/50 mt-1">Acertos e Pagamentos</p>
                </div>

                <!-- Resumo Cards -->
                <div class="px-5 py-4 grid grid-cols-2 gap-3">
                    <div class="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                        <span class="material-icons text-emerald-400 text-lg">arrow_upward</span>
                        <p class="text-lg font-bold text-emerald-400">R$ ${totalPago.toFixed(2).replace(".", ",")}</p>
                        <p class="text-[10px] text-white/50 uppercase">Você pagou</p>
                    </div>
                    <div class="bg-rose-500/10 rounded-xl p-3 text-center border border-rose-500/20">
                        <span class="material-icons text-rose-400 text-lg">arrow_downward</span>
                        <p class="text-lg font-bold text-rose-400">R$ ${totalRecebido.toFixed(2).replace(".", ",")}</p>
                        <p class="text-[10px] text-white/50 uppercase">Você recebeu</p>
                    </div>
                </div>

                <!-- Lista de Acertos (scrollable) -->
                <div class="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
                    ${listaHTML}
                </div>

                <!-- Footer: Saldo Final -->
                <div class="px-5 py-4 border-t border-white/10 bg-[#141414]">
                    <div class="${saldoFinal >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"} rounded-xl p-4 border">
                        <div class="flex justify-between items-center mb-2 text-xs text-white/50">
                            <span>Saldo do Jogo</span>
                            <span class="${saldoTemporada >= 0 ? "text-emerald-400" : "text-rose-400"}">
                                ${saldoTemporada >= 0 ? "+" : ""}R$ ${Math.abs(saldoTemporada).toFixed(2).replace(".", ",")}
                            </span>
                        </div>
                        <div class="flex justify-between items-center mb-3 text-xs text-white/50">
                            <span>Ajuste Acertos</span>
                            <span class="${saldoAcertos >= 0 ? "text-emerald-400" : "text-rose-400"}">
                                ${saldoAcertos >= 0 ? "+" : ""}R$ ${Math.abs(saldoAcertos).toFixed(2).replace(".", ",")}
                            </span>
                        </div>
                        <div class="border-t border-white/10 pt-3 flex justify-between items-center">
                            <span class="flex items-center gap-2 text-sm font-bold text-white">
                                <span class="material-icons text-white/70">account_balance_wallet</span>
                                Saldo Final
                            </span>
                            <span class="text-2xl font-extrabold ${saldoFinal >= 0 ? "text-emerald-400" : "text-rose-400"}">
                                R$ ${Math.abs(saldoFinal).toFixed(2).replace(".", ",")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== v10.2: FUNÇÕES GLOBAIS PARA BOTTOM SHEET =====
window.abrirBottomSheetAcertos = function() {
    const sheet = document.getElementById('bottomSheetAcertos');
    const content = document.getElementById('bottomSheetContent');

    if (sheet && content) {
        sheet.classList.remove('hidden');
        // Força um reflow antes de animar
        content.offsetHeight;
        setTimeout(() => {
            content.style.transform = 'translateY(0)';
        }, 10);

        // Prevenir scroll do body
        document.body.style.overflow = 'hidden';
    }
};

window.fecharBottomSheetAcertos = function() {
    const sheet = document.getElementById('bottomSheetAcertos');
    const content = document.getElementById('bottomSheetContent');

    if (sheet && content) {
        content.style.transform = 'translateY(100%)';
        setTimeout(() => {
            sheet.classList.add('hidden');
            // Restaurar scroll do body
            document.body.style.overflow = '';
        }, 300);
    }
};

// ===== v10.5: MINI REFRESH - Atualizar apenas acertos =====
window.refreshAcertosBottomSheet = async function() {
    const btn = document.getElementById('btnRefreshAcertos');
    const iconEl = btn?.querySelector('.material-icons');

    // Obter IDs do participante
    const ligaId = window.PARTICIPANTE_IDS?.ligaId || window.participanteData?.ligaId;
    const timeId = window.PARTICIPANTE_IDS?.timeId || window.participanteData?.timeId;

    if (!ligaId || !timeId) {
        if (window.Log) Log.warn("[EXTRATO-UI] ⚠️ IDs não disponíveis para refresh");
        return;
    }

    // Loading state
    if (btn) btn.disabled = true;
    if (iconEl) iconEl.classList.add('animate-spin');

    try {
        if (window.Log) Log.info("[EXTRATO-UI] 🔄 Refresh pontual de acertos...");

        // Buscar dados atualizados do cache (que inclui acertos frescos)
        // ✅ v10.11 FIX: Usar getFinancialSeason() para pegar temporada correta
        const CONFIG = window.ParticipanteConfig || {};
        const temporada = CONFIG.getFinancialSeason ? CONFIG.getFinancialSeason() : (CONFIG.CURRENT_SEASON || 2026);
        const url = `/api/extrato-cache/${ligaId}/times/${timeId}/cache?temporada=${temporada}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro ao buscar: ${response.status}`);
        }

        const data = await response.json();
        const acertos = data.acertos || { lista: [], resumo: {} };
        const resumo = data.resumo || {};

        if (window.Log) Log.info("[EXTRATO-UI] ✅ Acertos atualizados:", {
            qtd: acertos.lista?.length || 0,
            saldo: acertos.resumo?.saldo || 0
        });

        // ✅ v10.7: Calcular saldo_atual corretamente (igual ao Inicio)
        const saldoAcertosAtualizado = acertos.resumo?.saldo ?? resumo.saldo_acertos ?? 0;
        const saldoTemporadaAtual = resumo.saldo_temporada ?? resumo.saldo_final ?? resumo.saldo ?? 0;
        const saldoAtualCalculado = saldoTemporadaAtual + saldoAcertosAtualizado;

        if (window.Log) Log.info("[EXTRATO-UI] 🔄 Refresh - Novos valores:", {
            saldoTemporada: saldoTemporadaAtual,
            saldoAcertos: saldoAcertosAtualizado,
            saldoAtual: saldoAtualCalculado
        });

        // Atualizar extratoAtual global
        if (window.extratoAtual) {
            window.extratoAtual.acertos = acertos;
            window.extratoAtual.resumo = {
                ...window.extratoAtual.resumo,
                ...resumo,
                saldo_acertos: saldoAcertosAtualizado,
                saldo_atual: saldoAtualCalculado  // ✅ Incluir saldo_atual calculado
            };
        }

        // Atualizar cache local (IndexedDB)
        if (window.ParticipanteCache) {
            const cacheAtual = await window.ParticipanteCache.getExtratoAsync?.(ligaId, timeId)
                || window.ParticipanteCache.getExtrato?.(ligaId, timeId);
            if (cacheAtual) {
                cacheAtual.acertos = acertos;
                cacheAtual.resumo = {
                    ...cacheAtual.resumo,
                    ...resumo,
                    saldo_acertos: saldoAcertosAtualizado,
                    saldo_atual: saldoAtualCalculado  // ✅ Incluir saldo_atual calculado
                };
                window.ParticipanteCache.setExtrato(ligaId, timeId, cacheAtual);
            }
        }

        // Fechar e reabrir para atualizar conteúdo
        const wasOpen = !document.getElementById('bottomSheetAcertos')?.classList.contains('hidden');

        // Re-renderizar extrato completo para atualizar cards principais também
        const container = document.getElementById("fluxoFinanceiroContent");
        if (container && window.extratoAtual) {
            window.renderizarConteudoCompleto(container, window.extratoAtual);

            // Reabrir bottom sheet se estava aberto
            if (wasOpen) {
                setTimeout(() => {
                    window.abrirBottomSheetAcertos();
                }, 100);
            }
        }

        // Toast de sucesso
        mostrarToastSucesso('Acertos atualizados!');

    } catch (error) {
        if (window.Log) Log.error("[EXTRATO-UI] ❌ Erro no refresh:", error);
        mostrarToastErro('Erro ao atualizar');
    } finally {
        // Remove loading state
        if (btn) btn.disabled = false;
        if (iconEl) iconEl.classList.remove('animate-spin');
    }
};

// ===== v10.5: Toast de sucesso =====
function mostrarToastSucesso(mensagem) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium z-[9999] animate-fade-in';
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ===== CARD DE DESEMPENHO =====
function renderizarCardDesempenho(rodadas, ligaId) {
    if (!rodadas || rodadas.length === 0) return "";

    let totalMito = 0,
        totalMico = 0;
    let zonaCredito = 0,
        zonaDebito = 0;
    let melhorRodada = { rodada: 0, saldo: -Infinity };
    let piorRodada = { rodada: 0, saldo: Infinity };

    rodadas.forEach((r) => {
        const faixas = getFaixasParaRodada(ligaId, r.rodada);
        const saldo =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);

        if (r.top10 > 0) totalMito++;
        if (r.top10 < 0) totalMico++;

        if (r.posicao && r.posicao <= faixas.credito.fim) zonaCredito++;
        if (r.posicao && r.posicao >= faixas.debito.inicio) zonaDebito++;

        if (saldo > melhorRodada.saldo)
            melhorRodada = { rodada: r.rodada, saldo };
        if (saldo < piorRodada.saldo) piorRodada = { rodada: r.rodada, saldo };
    });

    return `
        <div class="bg-surface-dark rounded-xl p-4 mb-4 border border-white/5">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary">analytics</span>
                <h3 class="text-sm font-bold text-white">Seu Desempenho</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-amber-400 text-lg">star</span>
                    <p class="text-lg font-bold text-white">${totalMito}</p>
                    <p class="text-[10px] text-white/50">Mitos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400 text-lg">sentiment_very_dissatisfied</span>
                    <p class="text-lg font-bold text-white">${totalMico}</p>
                    <p class="text-[10px] text-white/50">Micos</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-emerald-400 text-lg">trending_up</span>
                    <p class="text-lg font-bold text-white">${zonaCredito}</p>
                    <p class="text-[10px] text-white/50">Zona Ganho</p>
                </div>
                <div class="bg-white/5 rounded-lg p-3 text-center">
                    <span class="material-icons text-rose-400 text-lg">trending_down</span>
                    <p class="text-lg font-bold text-white">${zonaDebito}</p>
                    <p class="text-[10px] text-white/50">Zona Perda</p>
                </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="bg-emerald-500/10 rounded-lg p-2 text-center">
                    <p class="text-[10px] text-white/50">Melhor Rodada</p>
                    <p class="text-sm font-bold text-emerald-400">R${melhorRodada.rodada} (+${melhorRodada.saldo.toFixed(2).replace(".", ",")})</p>
                </div>
                <div class="bg-rose-500/10 rounded-lg p-2 text-center">
                    <p class="text-[10px] text-white/50">Pior Rodada</p>
                    <p class="text-sm font-bold text-rose-400">R${piorRodada.rodada} (${piorRodada.saldo.toFixed(2).replace(".", ",")})</p>
                </div>
            </div>
        </div>
    `;
}

// ===== GRÁFICO DE EVOLUÇÃO =====
function renderizarGraficoEvolucao(rodadas, range = "all") {
    const svg = document.getElementById("graficoSVG");
    const path = document.getElementById("graficoPath");
    const area = document.getElementById("graficoArea");
    const labels = document.getElementById("graficoLabels");

    if (!svg || !path || !area || !labels) return;

    let dadosOrdenados = [...rodadas].sort((a, b) => a.rodada - b.rodada);

    if (range !== "all") {
        const n = parseInt(range);
        dadosOrdenados = dadosOrdenados.slice(-n);
    }

    if (dadosOrdenados.length === 0) {
        path.setAttribute("d", "");
        area.setAttribute("d", "");
        labels.innerHTML = "";
        return;
    }

    let saldoAcumulado = 0;
    const pontos = dadosOrdenados.map((r) => {
        const saldo =
            (r.bonusOnus || 0) +
            (r.pontosCorridos || 0) +
            (r.mataMata || 0) +
            (r.top10 || 0);
        saldoAcumulado += saldo;
        return { rodada: r.rodada, saldo: saldoAcumulado };
    });

    const valores = pontos.map((p) => p.saldo);
    const min = Math.min(...valores, 0);
    const max = Math.max(...valores, 0);
    const range2 = Math.max(Math.abs(max), Math.abs(min)) || 1;

    const width = 300;
    const height = 140;
    const paddingY = 10;

    const mapY = (val) => {
        const normalized = (val - min) / (range2 * 2 || 1);
        return height - paddingY - normalized * (height - paddingY * 2);
    };

    let pathD = "";
    let areaD = "";

    pontos.forEach((p, i) => {
        const x = (i / (pontos.length - 1 || 1)) * width;
        const y = mapY(p.saldo);

        if (i === 0) {
            pathD = `M ${x} ${y}`;
            areaD = `M ${x} ${height - paddingY}`;
        }
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
    });

    if (pontos.length > 0) {
        const lastX = width;
        areaD += ` L ${lastX} ${height - paddingY} Z`;
    }

    path.setAttribute("d", pathD);
    area.setAttribute("d", areaD);

    const step = Math.ceil(pontos.length / 6);
    labels.innerHTML = pontos
        .filter((_, i) => i % step === 0 || i === pontos.length - 1)
        .map((p) => `<span>R${p.rodada}</span>`)
        .join("");
}

// ===== CONFIGURAR FILTROS DO GRÁFICO =====
function configurarFiltrosGrafico(rodadas) {
    const btns = document.querySelectorAll(".filtro-btn");
    btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            btns.forEach((b) => {
                b.classList.remove("bg-primary/80", "font-semibold");
                b.classList.add("text-white/50");
            });
            btn.classList.add("bg-primary/80", "font-semibold");
            btn.classList.remove("text-white/50");
            renderizarGraficoEvolucao(rodadas, btn.dataset.range);
        });
    });
}

// ===== CONFIGURAR BOTÃO REFRESH =====
function configurarBotaoRefresh() {
    const btn = document.getElementById("btnRefreshExtrato");
    if (btn) {
        btn.addEventListener("click", () => {
            if (window.forcarRefreshExtratoParticipante) {
                window.forcarRefreshExtratoParticipante();
            }
        });
    }
}

// ===== RENDERIZAR ERRO =====
function renderizarErro() {
    return `
        <div class="text-center py-8 text-white/50">
            <span class="material-icons text-4xl mb-2 block">error_outline</span>
            <p>Erro ao carregar extrato</p>
            <button onclick="window.forcarRefreshExtratoParticipante()" class="mt-4 px-4 py-2 bg-primary rounded-lg text-white text-sm">
                Tentar Novamente
            </button>
        </div>
    `;
}

// ===== DETALHAMENTO DE GANHOS/PERDAS =====
// ✅ v8.6: Prevenção de propagação de eventos + feedback visual
window.mostrarDetalhamentoGanhos = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    try {
        mostrarPopupDetalhamento(true);
    } catch (error) {
        if (window.Log) Log.error('[EXTRATO-UI] ❌ Erro ao mostrar créditos:', error);
        mostrarToastErro('Erro ao carregar detalhamento');
    }
};

window.mostrarDetalhamentoPerdas = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    try {
        mostrarPopupDetalhamento(false);
    } catch (error) {
        if (window.Log) Log.error('[EXTRATO-UI] ❌ Erro ao mostrar débitos:', error);
        mostrarToastErro('Erro ao carregar detalhamento');
    }
};

// ✅ v8.6: Toast de feedback para erros
function mostrarToastErro(mensagem) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium z-[9999] animate-fade-in';
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ✅ v10.9: REFATORADO - Usa resumo consolidado do backend (igual ao admin)
// O resumo contém valores LÍQUIDOS (ex: pontosCorridos = +65 se ganhou mais do que perdeu)
// Para o modal de DÉBITOS, verificamos se o valor líquido é NEGATIVO
function mostrarPopupDetalhamento(isGanhos) {
    const extrato = window.extratoAtual;

    if (window.Log) Log.debug('[EXTRATO-UI] 📊 Abrindo popup:', { isGanhos, temExtrato: !!extrato, temResumo: !!extrato?.resumo });

    if (!extrato || !extrato.resumo) {
        if (window.Log) Log.warn('[EXTRATO-UI] ⚠️ Extrato não disponível para detalhamento');
        mostrarToastErro('Aguarde o carregamento do extrato');
        return;
    }

    const titulo = isGanhos
        ? "Detalhamento de Créditos"
        : "Detalhamento de Débitos";
    const icon = isGanhos ? "arrow_upward" : "arrow_downward";

    const resumo = extrato.resumo || {};
    const categorias = {};
    const ligaId = window.ligaIdAtual || "";

    // ✅ v10.9: Extrair valores LÍQUIDOS do resumo (como admin faz)
    // Esses são os mesmos valores que o admin usa para mostrar no modal
    const bonus = resumo.bonus || 0;
    const onus = resumo.onus || 0;
    const pontosCorridos = resumo.pontosCorridos || 0;
    const mataMata = resumo.mataMata || 0;
    const top10 = resumo.top10 || 0;

    // Totais consolidados pelo backend
    const somaGanhos = resumo.totalGanhos || 0;
    const somaPerdas = Math.abs(resumo.totalPerdas || 0);

    // ✅ v10.9: Verificar se é participante inativo e filtrar rodadas
    const isInativo = extrato.inativo || false;
    const rodadaDesistencia = extrato.rodadaDesistencia || null;
    const rodadaLimite = isInativo && rodadaDesistencia ? rodadaDesistencia - 1 : 999;

    // Contadores de estatísticas (baseado nas rodadas válidas)
    let rodadasComGanho = 0, rodadasComPerda = 0;
    let totalMito = 0, totalMico = 0;
    let totalZonaCredito = 0, totalZonaDebito = 0;

    // Contar estatísticas das rodadas (apenas para exibição, não para valores)
    if (extrato.rodadas && Array.isArray(extrato.rodadas)) {
        extrato.rodadas
            .filter(r => r.rodada <= rodadaLimite) // ✅ v10.9: Filtrar rodadas válidas
            .forEach((r) => {
                const faixas = getFaixasParaRodada(ligaId, r.rodada);
                const saldo = (r.bonusOnus || 0) + (r.pontosCorridos || 0) + (r.mataMata || 0) + (r.top10 || 0);

                if (saldo > 0) rodadasComGanho++;
                if (saldo < 0) rodadasComPerda++;
                if (r.top10 > 0) totalMito++;
                if (r.top10 < 0) totalMico++;
                if (r.posicao && r.posicao <= faixas.credito.fim) totalZonaCredito++;
                if (r.posicao && r.posicao >= faixas.debito.inicio) totalZonaDebito++;
            });
    }

    // ✅ v10.9: Montar categorias usando valores LÍQUIDOS do resumo (igual admin)
    // O admin verifica: if (resumo.pontosCorridos < 0) -> mostra nas perdas
    // O admin verifica: if (resumo.pontosCorridos > 0) -> mostra nos ganhos
    if (isGanhos) {
        // CRÉDITOS - valores positivos
        if (bonus > 0) {
            addCategoria(categorias, "Zona de Ganho", bonus, "Total", "add_circle");
        }
        if (pontosCorridos > 0) {
            addCategoria(categorias, "Pontos Corridos", pontosCorridos, "Total", "sports_soccer");
        }
        if (mataMata > 0) {
            addCategoria(categorias, "Mata-Mata", mataMata, "Total", "emoji_events");
        }
        if (top10 > 0) {
            addCategoria(categorias, "Top 10 (MITO)", top10, "Total", "star");
        }
        // ✅ v10.12: Crédito transferido da temporada anterior (positivo = crédito)
        const saldoAnteriorGanho = resumo.saldoAnteriorTransferido || 0;
        if (saldoAnteriorGanho > 0) {
            addCategoria(categorias, "Crédito Temporada Anterior", saldoAnteriorGanho, "Transferido", "savings");
        }
    } else {
        // DÉBITOS - valores negativos (mostrar como positivo)
        // ✅ v10.11: Taxa de inscrição como débito (nova temporada)
        const taxaInscricao = resumo.taxaInscricao || 0;
        if (taxaInscricao > 0) {
            addCategoria(categorias, "Inscrição Temporada", taxaInscricao, "Inscrição", "receipt_long");
        }
        // ✅ v10.12: Dívida transferida da temporada anterior (negativo = débito)
        const saldoAnterior = resumo.saldoAnteriorTransferido || 0;
        if (saldoAnterior < 0) {
            addCategoria(categorias, "Dívida Temporada Anterior", Math.abs(saldoAnterior), "Transferido", "history");
        }
        if (onus < 0) {
            addCategoria(categorias, "Zona de Perda", Math.abs(onus), "Total", "remove_circle");
        }
        if (pontosCorridos < 0) {
            addCategoria(categorias, "Pontos Corridos", Math.abs(pontosCorridos), "Total", "sports_soccer");
        }
        if (mataMata < 0) {
            addCategoria(categorias, "Mata-Mata", Math.abs(mataMata), "Total", "sports_mma");
        }
        if (top10 < 0) {
            addCategoria(categorias, "Top 10 (MICO)", Math.abs(top10), "Total", "sentiment_very_dissatisfied");
        }
    }

    // ✅ v10.9: Campos manuais (verificar array ou valor único)
    const camposManuais = extrato.camposManuais || extrato.camposEditaveis || [];
    if (Array.isArray(camposManuais) && camposManuais.length > 0) {
        camposManuais.forEach((campo) => {
            const valor = parseFloat(campo.valor) || 0;
            const nome = campo.nome || "Ajuste Manual";
            if (isGanhos && valor > 0) {
                addCategoria(categorias, nome, valor, "Manual", "edit");
            } else if (!isGanhos && valor < 0) {
                addCategoria(categorias, nome, Math.abs(valor), "Manual", "edit");
            }
        });
    }

    const total = isGanhos ? somaGanhos : somaPerdas;
    const mediaGanho = rodadasComGanho > 0 ? somaGanhos / rodadasComGanho : 0;
    const mediaPerda = rodadasComPerda > 0 ? somaPerdas / rodadasComPerda : 0;

    const categoriasArray = Object.values(categorias)
        .map((cat) => ({
            ...cat,
            percentual: total > 0 ? (cat.valor / total) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor);

    document.getElementById("popupDetalhamento")?.remove();

    const html = `
        <div id="popupDetalhamento" onclick="this.remove()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div onclick="event.stopPropagation()" class="bg-surface-dark rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl">
                <div class="p-4 border-b border-white/10">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-base font-bold text-white flex items-center gap-2">
                            <span class="material-icons ${isGanhos ? "text-emerald-400" : "text-rose-400"}">${icon}</span>
                            ${titulo}
                        </h3>
                        <button class="text-white/50 hover:text-white transition-colors" onclick="document.getElementById('popupDetalhamento').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">Rodadas</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? rodadasComGanho : rodadasComPerda}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">Média</p>
                            <p class="text-lg font-bold text-white">${(isGanhos ? mediaGanho : mediaPerda).toFixed(2).replace(".", ",")}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">${isGanhos ? "Mitos" : "Micos"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalMito : totalMico}x</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-white/50">${isGanhos ? "Zona G" : "Zona Z"}</p>
                            <p class="text-lg font-bold text-white">${isGanhos ? totalZonaCredito : totalZonaDebito}x</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 overflow-y-auto max-h-[50vh] space-y-3">
                    ${
                        categoriasArray.length === 0
                            ? `
                        <div class="text-center py-8 text-white/50">
                            <span class="material-icons text-4xl mb-2 block">inbox</span>
                            Nenhum registro encontrado
                        </div>
                    `
                            : categoriasArray
                                  .map(
                                      (cat) => `
                        <div class="bg-white/5 rounded-xl p-3">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center ${isGanhos ? "bg-emerald-500/20" : "bg-rose-500/20"}">
                                        <span class="material-icons text-sm ${isGanhos ? "text-emerald-400" : "text-rose-400"}">${cat.icon}</span>
                                    </div>
                                    <span class="text-sm font-medium text-white">${cat.nome}</span>
                                </div>
                                <span class="text-base font-bold ${isGanhos ? "text-emerald-400" : "text-rose-400"}">R$ ${cat.valor.toFixed(2).replace(".", ",")}</span>
                            </div>
                            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                                <div class="h-full rounded-full ${isGanhos ? "bg-emerald-500" : "bg-rose-500"}" style="width: ${cat.percentual}%;"></div>
                            </div>
                            <div class="flex justify-between text-[10px] text-white/40">
                                <span>${Array.isArray(cat.rodadas) ? cat.rodadas.length + " rodada(s)" : cat.rodadas}</span>
                                <span>${cat.percentual.toFixed(1)}%</span>
                            </div>
                        </div>
                    `,
                                  )
                                  .join("")
                    }
                    <div class="rounded-xl p-4 ${isGanhos ? "bg-emerald-500/10" : "bg-rose-500/10"}">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center gap-2 text-sm font-bold text-white">
                                <span class="material-icons ${isGanhos ? "text-emerald-400" : "text-rose-400"}">account_balance_wallet</span>
                                TOTAL ${isGanhos ? "CRÉDITOS" : "DÉBITOS"}
                            </span>
                            <span class="text-xl font-extrabold ${isGanhos ? "text-emerald-400" : "text-rose-400"}">R$ ${total.toFixed(2).replace(".", ",")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

function addCategoria(obj, nome, valor, rodada, icon) {
    if (!obj[nome]) {
        obj[nome] = { nome, valor: 0, rodadas: [], icon };
    }
    obj[nome].valor += valor;
    if (rodada !== "Manual") {
        obj[nome].rodadas.push(rodada);
    } else {
        obj[nome].rodadas = "Ajuste manual";
    }
}

if (window.Log) Log.info("[EXTRATO-UI] ✅ Módulo v10.22 carregado (FIX CRÍTICO renderizarBotaoMeusAcertos)");
}
