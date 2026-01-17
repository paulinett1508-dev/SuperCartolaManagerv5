// public/js/gols.js
// ✅ v2.0: Adicionado ligaId obrigatório (multi-tenant fix)
export function setupExtrairGolsBtn(timeIds, ligaId) {
  const btn = document.getElementById('extrairGolsBtn');
  if (!btn) return;

  // Validar ligaId obrigatório
  if (!ligaId) {
    console.error('[GOLS] ligaId é obrigatório para extrair gols');
    btn.disabled = true;
    btn.title = 'Liga ID não configurado';
    return;
  }

  btn.onclick = async () => {
    const rodada = parseInt(document.getElementById('rodadaInput').value, 10);
    btn.disabled = true;
    btn.innerText = "Extraindo...";
    const res = await fetch('/api/gols/extrair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeIds, rodada, ligaId })
    });
    const data = await res.json();
    document.getElementById('resultado').innerText = data.message || JSON.stringify(data);
    btn.disabled = false;
    btn.innerText = "Extrair Gols da Rodada";
  };
}