// public/js/gols.js
export function setupExtrairGolsBtn(timeIds) {
  const btn = document.getElementById('extrairGolsBtn');
  if (!btn) return;
  btn.onclick = async () => {
    const rodada = parseInt(document.getElementById('rodadaInput').value, 10);
    btn.disabled = true;
    btn.innerText = "Extraindo...";
    const res = await fetch('/api/gols/extrair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeIds, rodada })
    });
    const data = await res.json();
    document.getElementById('resultado').innerText = data.message || JSON.stringify(data);
    btn.disabled = false;
    btn.innerText = "Extrair Gols da Rodada";
  };
}