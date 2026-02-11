let timesSelecionados = [];
let timesDetalhados = [];

const inputTimeId = document.getElementById("inputTimeId");
const galeria = document.getElementById("galeria");
const criarLigaDiv = document.getElementById("criarLiga");

async function adicionarTime() {
  const id = inputTimeId.value.trim();
  if (!id) { SuperModal.toast.warning("Digite um ID de time!"); return; }
  if (timesSelecionados.includes(id))
    SuperModal.toast.warning("Esse time já foi adicionado!"); return;

  try {
    const res = await fetch(`/api/time/${id}`);
    if (!res.ok) throw new Error(`Erro ${res.status}: Time não encontrado`);
    const time = await res.json();

    timesSelecionados.push(id);
    timesDetalhados.push(time); // Estrutura simplificada
    inputTimeId.value = "";
    criarLigaDiv.style.display = "block";
    renderizarGaleria();
  } catch (err) {
    SuperModal.toast.error(`Erro: ${err.message}`);
  }
}

function renderizarGaleria() {
  galeria.innerHTML = "";
  timesDetalhados.forEach((time, index) => {
    const card = document.createElement("div");
    card.style = `
      background: white;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      transition: transform 0.2s ease;
      text-align: center;
    `;
    card.onmouseover = () => (card.style.transform = "scale(1.03)");
    card.onmouseout = () => (card.style.transform = "scale(1)");

    // Função para obter escudo (com fallback para escudo padrão)
    function obterEscudo(time) {
      if (time.url_escudo_png && time.url_escudo_png.trim() !== '') {
        return time.url_escudo_png;
      }
      if (time.clube_id) {
        return 'https://s.glbimg.com/es/sde/f/organizacoes/2014/04/14/escudo_' + time.clube_id + '_30x30.png';
      }
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNlOWVjZWYiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNmM3NTdkIj4KPHA+4pqgPC9wPgo8L3N2Zz4KPC9zdmc+';
    }

    card.innerHTML = `
      <img src="${obterEscudo(time)}" alt="Escudo" style="width: 60px; height: 60px; margin-bottom: 10px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNlOWVjZWYiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNmM3NTdkIj4KPHA+4pqgPC9wPgo8L3N2Zz4KPC9zdmc+'" />
      <div style="font-weight: bold; color: #2c3e50;">🛡️ ${time.nome}</div>
      <div style="color: #555; font-size: 14px; margin: 6px 0;">👤 ${time.nome_cartola}</div>
      <button onclick="removerTime(${index})" style="margin-top: 8px; background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Remover</button>
    `;
    galeria.appendChild(card);
  });
  criarLigaDiv.style.display = timesSelecionados.length > 0 ? "block" : "none";
}

function removerTime(index) {
  timesSelecionados.splice(index, 1);
  timesDetalhados.splice(index, 1);
  renderizarGaleria();
}

function criarLiga() {
  if (timesDetalhados.length === 0)
    SuperModal.toast.warning("Adicione ao menos um time antes de criar a liga."); return;
  try {
    localStorage.setItem("timesSelecionados", JSON.stringify(timesDetalhados));
    window.location.href = "/criar-liga.html";
  } catch (err) {
    SuperModal.toast.error(`Erro ao salvar no localStorage: ${err.message}`);
  }
}
