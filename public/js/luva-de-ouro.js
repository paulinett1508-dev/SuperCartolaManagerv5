// public/js/luva-de-ouro.js

export function inicializarLuvaDeOuro() {
  console.log("Inicializando aba Luva de Ouro...");
  const container = document.getElementById("luva-de-ouro");
  if (!container) {
    console.warn("Container da aba Luva de Ouro não encontrado.");
    return;
  }

  // Limpa o conteúdo anterior
  container.innerHTML = "";

  // Carrega o template (quando existir) ou exibe mensagem padrão
  fetch("templates/luva-de-ouro-tabela.html")
    .then((res) => {
      if (!res.ok) throw new Error("Template não encontrado");
      return res.text();
    })
    .then((html) => {
      container.innerHTML = html;
      // Aqui pode-se adicionar lógica para popular a tabela no futuro
    })
    .catch(() => {
      container.innerHTML =
        "<p style='color: #888; text-align: center;'>Funcionalidade de Luva de Ouro em breve.</p>";
    });
}
