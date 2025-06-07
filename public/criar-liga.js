const nomeLiga = document.getElementById("nomeLiga");
const listaTimes = document.getElementById("listaTimes");
const resposta = document.getElementById("resposta");
const loading = document.getElementById("loading");

// Recuperar times do localStorage
const times = JSON.parse(localStorage.getItem("timesSelecionados")) || [];

if (times.length === 0) {
  resposta.innerHTML = `
    <p style="color:red;">Nenhum time encontrado. Volte e adicione ao menos 1 time.</p>
    <a href="/buscar-times.html" class="back-btn">🔙 Voltar</a>
  `;
} else {
  const uniqueIds = new Set();
  times.forEach((t) => {
    if (uniqueIds.has(t.time_id)) return;
    uniqueIds.add(t.time_id);
    const li = document.createElement("li");
    li.innerHTML = `🛡️ <strong>${t.nome}</strong> — 👤 ${t.nome_cartola}`;
    listaTimes.appendChild(li);
  });
}

async function salvarLiga() {
  const nome = nomeLiga.value.trim();
  if (!nome) return alert("Digite o nome da liga!");

  const uniqueTimes = [];
  const uniqueIds = new Set();
  times.forEach((t) => {
    if (!uniqueIds.has(t.time_id)) {
      uniqueIds.add(t.time_id);
      uniqueTimes.push(t.time_id); // Salva apenas o ID
    }
  });

  if (uniqueTimes.length === 0) {
    resposta.innerHTML =
      '<p style="color:red;">Adicione ao menos 1 time antes de salvar a liga.</p>';
    return;
  }

  try {
    loading.style.display = "block";
    const res = await fetch("/api/ligas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        times: uniqueTimes, // Array de IDs
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.erro || "Erro desconhecido");
    }

    const data = await res.json();
    resposta.innerHTML = `<p style="color:green;">✅ Liga "${data.nome}" salva com sucesso!</p>`;
    localStorage.removeItem("timesSelecionados");
    setTimeout(
      () => (window.location.href = `/detalhe-liga.html?id=${data.id}`),
      1000,
    );
  } catch (err) {
    resposta.innerHTML = `<p style="color:red;">❌ Erro ao salvar a liga: ${err.message}</p>`;
  } finally {
    loading.style.display = "none";
  }
}
