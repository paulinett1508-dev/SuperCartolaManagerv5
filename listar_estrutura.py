import os
from datetime import datetime

ARQUIVOS_IMPORTANTES = {'.replit', '.env', 'package.json'}
PASTAS_LISTAR = [
    'backups', 'config', 'controllers', 'models', 'public', 'routes',
    'scripts', 'services', 'test', 'utils'
]


def deve_mostrar_item(nome_item):
    if not nome_item.startswith('.'):
        return True
    return nome_item in ARQUIVOS_IMPORTANTES


def formatar_tamanho(bytes):
    for unidade in ['B', 'KB', 'MB', 'GB']:
        if bytes < 1024.0:
            return f"{bytes:.1f} {unidade}"
        bytes /= 1024.0
    return f"{bytes:.1f} TB"


def listar_pasta_recursivo(caminho_pasta, nivel=0):
    linhas = []
    try:
        itens = [
            item for item in os.listdir(caminho_pasta)
            if deve_mostrar_item(item)
        ]
        itens.sort()
        for item in itens:
            caminho_item = os.path.join(caminho_pasta, item)
            padding = 16 * (nivel + 1)
            if os.path.isfile(caminho_item):
                try:
                    tamanho = os.path.getsize(caminho_item)
                    tamanho_str = formatar_tamanho(tamanho)
                except:
                    tamanho_str = ""
                emoji = "⚙️" if item in ARQUIVOS_IMPORTANTES else "📄"
                linhas.append(
                    f"<div class='item file' style='padding-left:{padding}px'>"
                    f"{emoji} <span>{item}</span> <span class='size'>{tamanho_str}</span></div>"
                )
            elif os.path.isdir(caminho_item):
                linhas.append(
                    f"<div class='item folder' style='padding-left:{padding}px'>"
                    f"📁 <span>{item}/</span></div>")
                linhas.extend(listar_pasta_recursivo(caminho_item, nivel + 1))
    except PermissionError:
        linhas.append(
            f"<div class='item error'>❌ Sem permissão para acessar</div>")
    return linhas


def gerar_html_estrutura(caminho_raiz='.'):
    linhas = []

    # Arquivos visíveis na raiz
    arquivos_raiz = [
        f for f in os.listdir(caminho_raiz) if
        os.path.isfile(os.path.join(caminho_raiz, f)) and deve_mostrar_item(f)
    ]
    arquivos_raiz.sort()
    linhas.append(
        f"<div class='section-title'>Arquivos na raiz do projeto</div>")
    for arquivo in arquivos_raiz:
        caminho = os.path.join(caminho_raiz, arquivo)
        try:
            tamanho = os.path.getsize(caminho)
            tamanho_str = formatar_tamanho(tamanho)
        except:
            tamanho_str = ""
        emoji = "⚙️" if arquivo in ARQUIVOS_IMPORTANTES else "📄"
        linhas.append(
            f"<div class='item file' style='padding-left:16px'>"
            f"{emoji} <span>{arquivo}</span> <span class='size'>{tamanho_str}</span></div>"
        )

    # Conteúdo das pastas específicas (recursivo)
    for pasta in PASTAS_LISTAR:
        caminho_pasta = os.path.join(caminho_raiz, pasta)
        if os.path.isdir(caminho_pasta):
            linhas.append(f"<div class='section-title'>📁 {pasta}/</div>")
            linhas.extend(listar_pasta_recursivo(caminho_pasta, 0))
        else:
            linhas.append(f"<div class='section-title'>📁 {pasta}/</div>")
            linhas.append(
                f"<div class='item error'>Pasta não encontrada.</div>")

    return "\n".join(linhas)


if __name__ == "__main__":
    html = f"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Conteúdo Selecionado do Projeto</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root {{
            --bg: #181c20;
            --fg: #e6e6e6;
            --folder: #6ec1e4;
            --file: #b3b3b3;
            --important: #ffe066;
            --error: #ff6b6b;
            --section: #22272e;
            --border: #23272f;
            --size: #888;
        }}
        html, body {{
            background: var(--bg);
            color: var(--fg);
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            font-size: 15px;
            margin: 0;
            padding: 0;
        }}
        body {{
            max-width: 700px;
            margin: 32px auto;
            border-radius: 12px;
            box-shadow: 0 2px 16px #0002;
            background: var(--section);
            padding: 32px 18px 24px 18px;
        }}
        h2 {{
            font-weight: 600;
            font-size: 1.5em;
            margin-bottom: 0.2em;
        }}
        .section-title {{
            margin-top: 1.5em;
            margin-bottom: 0.3em;
            font-weight: 500;
            color: var(--folder);
            font-size: 1.08em;
            letter-spacing: 0.01em;
        }}
        .item {{
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 2px;
            border-left: 2px solid transparent;
            padding: 2px 0 2px 0;
            transition: background 0.2s;
            border-radius: 4px;
        }}
        .item.folder {{
            color: var(--folder);
            font-weight: 500;
        }}
        .item.file {{
            color: var(--file);
        }}
        .item.file span:first-child {{
            font-weight: 400;
        }}
        .item.file span.important {{
            color: var(--important);
            font-weight: 600;
        }}
        .item.error {{
            color: var(--error);
            font-style: italic;
            margin-left: 16px;
        }}
        .size {{
            margin-left: auto;
            color: var(--size);
            font-size: 0.92em;
            font-family: monospace;
        }}
        @media (max-width: 600px) {{
            body {{
                max-width: 98vw;
                padding: 10px 2vw 20px 2vw;
            }}
        }}
        .copy-btn {{
            background: var(--folder);
            color: #222;
            border: none;
            border-radius: 6px;
            padding: 6px 16px;
            font-size: 1em;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 18px;
            margin-top: 8px;
            transition: background 0.2s;
        }}
        .copy-btn:hover {{
            background: #4fa3d1;
        }}
        .footer {{
            margin-top: 2.5em;
            color: #666;
            font-size: 0.95em;
            text-align: right;
        }}
    </style>
</head>
<body>
<h2>📂 Estrutura do Projeto</h2>
<p style="color:#aaa;font-size:0.98em;">Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
<button class="copy-btn" onclick="copyTree()">Copiar estrutura</button>
<div id="tree">
{gerar_html_estrutura('.')}
</div>
<div class="footer">
    <span>Gerado automaticamente • UX Clean</span>
</div>
<script>
function copyTree() {{
    let el = document.getElementById('tree');
    let temp = document.createElement('textarea');
    temp.value = el.innerText;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    let btn = document.querySelector('.copy-btn');
    btn.innerText = 'Copiado!';
    setTimeout(() => btn.innerText = 'Copiar estrutura', 1500);
}}
</script>
</body>
</html>
"""
    with open("estrutura_selecionada.html", "w", encoding="utf-8") as f:
        f.write(html)
    print(
        "✅ Estrutura salva em 'estrutura_selecionada.html'. Abra esse arquivo no navegador para visualizar."
    )
