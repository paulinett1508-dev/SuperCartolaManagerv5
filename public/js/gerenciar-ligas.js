// js/gerenciar-ligas.js

export async function carregarLigas() {
  try {
    const res = await fetch("/api/ligas");
    if (!res.ok) throw new Error("Erro ao buscar ligas");
    const ligas = await res.json();
    return ligas;
  } catch (err) {
    console.error("Erro ao carregar ligas:", err.message);
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.textContent = `Erro ao carregar as ligas: ${err.message}`;
      errorDiv.style.display = "block";
    }
    return [];
  }
}

export async function deletarLiga(id) {
  try {
    const res = await fetch(`/api/ligas/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir liga");
    return true;
  } catch (err) {
    console.error("Erro ao deletar liga:", err.message);
    throw err;
  }
}
