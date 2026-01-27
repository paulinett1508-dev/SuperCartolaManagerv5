(function () {
  "use strict";

  if (window.SeasonContext) {
    return;
  }

  const nowYear = new Date().getFullYear();
  const fallbackCurrent = typeof window.CURRENT_SEASON === "number" ? window.CURRENT_SEASON : nowYear;
  const configCurrent = typeof window.SEASON_CONFIG?.current === "number" ? window.SEASON_CONFIG.current : null;
  const current = configCurrent || fallbackCurrent;

  function getUrlSeason() {
    try {
      const params = new URLSearchParams(window.location.search);
      const temporadaUrl = params.get("temporada");
      return temporadaUrl ? parseInt(temporadaUrl, 10) : null;
    } catch (_) {
      return null;
    }
  }

  function getTemporadaSistema() {
    return current;
  }

  function getTemporadaContexto() {
    if (typeof window.temporadaAtual === "number") return window.temporadaAtual;
    if (typeof window.temporadaContexto === "number") return window.temporadaContexto;
    const urlSeason = getUrlSeason();
    return typeof urlSeason === "number" ? urlSeason : getTemporadaSistema();
  }

  function setTemporadaContexto(value) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      window.temporadaAtual = parsed;
      window.temporadaContexto = parsed;
    }
  }

  function getTemporadaRenovacao() {
    return typeof window.temporadaRenovacao === "number"
      ? window.temporadaRenovacao
      : getTemporadaSistema();
  }

  window.SeasonContext = {
    current,
    getUrlSeason,
    getTemporadaSistema,
    getTemporadaContexto,
    setTemporadaContexto,
    getTemporadaRenovacao,
  };

  if (typeof window.temporadaContexto !== "number") {
    window.temporadaContexto = getTemporadaContexto();
  }

  if (typeof window.temporadaAtual !== "number") {
    window.temporadaAtual = getTemporadaContexto();
  }

  if (typeof window.temporadaRenovacao !== "number") {
    window.temporadaRenovacao = getTemporadaRenovacao();
  }
})();
