// LUVA DE OURO - Ponto de Entrada (REFATORADO)
// public/js/luva-de-ouro/luva-de-ouro.js

console.log("🥅 [LUVA-DE-OURO] Sistema modular carregando...");

/**
 * Verifica se todos os módulos foram carregados
 */
function verificarModulosCarregados() {
  const modulos = [
    "LuvaDeOuroConfig",
    "LuvaDeOuroCore",
    "LuvaDeOuroUI",
    "LuvaDeOuroCache",
    "LuvaDeOuroOrquestrador",
  ];

  const faltando = modulos.filter((mod) => !window[mod]);

  if (faltando.length > 0) {
    console.warn("⏳ [LUVA-DE-OURO] Módulos pendentes:", faltando);
    return false;
  }

  console.log("✅ [LUVA-DE-OURO] Todos os módulos carregados");
  return true;
}

/**
 * Função principal de inicialização
 */
async function inicializarLuvaDeOuro() {
  console.log("🚀 [LUVA-DE-OURO] Inicializando sistema...");

  if (!verificarModulosCarregados()) {
    console.error(
      "❌ [LUVA-DE-OURO] Sistema não pode inicializar - módulos faltando",
    );
    return;
  }

  try {
    await window.LuvaDeOuroOrquestrador.inicializar();
    console.log("✅ [LUVA-DE-OURO] Sistema inicializado com sucesso");
  } catch (error) {
    console.error("❌ [LUVA-DE-OURO] Erro na inicialização:", error);
  }
}

// ===== FUNÇÕES DE COMPATIBILIDADE GLOBAL =====

/**
 * Compatibilidade com HTML inline
 */
window.mostrarDetalhesParticipante = (participanteId, participanteNome) => {
  if (window.LuvaDeOuroOrquestrador) {
    window.LuvaDeOuroOrquestrador.mostrarDetalhes(
      participanteId,
      participanteNome,
    );
  }
};

window.carregarRankingGoleiros = (forcarColeta = false) => {
  if (window.LuvaDeOuroOrquestrador) {
    window.LuvaDeOuroOrquestrador.carregarRanking(forcarColeta);
  }
};

window.fecharModalDetalhes = () => {
  if (window.LuvaDeOuroUtils) {
    window.LuvaDeOuroUtils.fecharModalDetalhes();
  }
};

/**
 * Função de emergência para debug
 */
window.forcarLuvaDeOuroAgora = async () => {
  console.log("🆘 [EMERGÊNCIA] Forçando Luva de Ouro...");
  try {
    await inicializarLuvaDeOuro();
    console.log("✅ Luva de Ouro forçado com sucesso");
  } catch (error) {
    console.error("❌ Falha no modo emergência:", error);
  }
};

/**
 * Função de teste manual
 */
window.testarLuvaDeOuro = function () {
  console.log("🧪 [TESTE] Testando sistema Luva de Ouro...");
  console.log("📦 Módulos disponíveis:");
  console.log("  - Config:", !!window.LuvaDeOuroConfig);
  console.log("  - Core:", !!window.LuvaDeOuroCore);
  console.log("  - UI:", !!window.LuvaDeOuroUI);
  console.log("  - Cache:", !!window.LuvaDeOuroCache);
  console.log("  - Orquestrador:", !!window.LuvaDeOuroOrquestrador);
  console.log("  - Utils:", !!window.LuvaDeOuroUtils);

  if (window.LuvaDeOuroCache) {
    console.log("📊 Stats do cache:", window.LuvaDeOuroCache.stats());
  }

  if (window.LuvaDeOuroOrquestrador) {
    console.log(
      "📊 Estado do orquestrador:",
      window.LuvaDeOuroOrquestrador.estado,
    );
  }
};

/**
 * Diagnóstico completo
 */
window.diagnosticoLuvaDeOuro = async function () {
  console.log("🔍 [DIAGNÓSTICO] Executando diagnóstico completo...");

  if (window.LuvaDeOuroCore) {
    try {
      const resultado = await window.LuvaDeOuroCore.executarDiagnostico();
      console.log("📊 Resultado do diagnóstico:", resultado);
      return resultado;
    } catch (error) {
      console.error("❌ Erro no diagnóstico:", error);
    }
  }
};

// ===== EXPORTAÇÕES ES6 =====
export { inicializarLuvaDeOuro };
export default inicializarLuvaDeOuro;

// ===== REGISTRO NO SISTEMA DE MÓDULOS =====
if (!window.modulosCarregados) {
  window.modulosCarregados = {};
}

window.modulosCarregados["luva-de-ouro"] = {
  nome: "Luva de Ouro",
  versao: "3.0.0",
  inicializar: inicializarLuvaDeOuro,
  carregado: true,
  modular: true,
  submodulos: [
    "luva-de-ouro-config",
    "luva-de-ouro-core",
    "luva-de-ouro-ui",
    "luva-de-ouro-cache",
    "luva-de-ouro-orquestrador",
  ],
};

// ===== EXPORTAR FUNÇÃO GLOBAL =====
window.inicializarLuvaDeOuro = inicializarLuvaDeOuro;

console.log("✅ [LUVA-DE-OURO] Sistema modular v3.0.0 carregado");
console.log("🆘 Em caso de erro: window.forcarLuvaDeOuroAgora()");
console.log("🧪 Para testar: window.testarLuvaDeOuro()");
console.log("🔍 Diagnóstico: window.diagnosticoLuvaDeOuro()");
