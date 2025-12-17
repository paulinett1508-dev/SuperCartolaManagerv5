import os
import sys
import time
import click
from google import genai

# Configura o cliente
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("❌ Erro: GEMINI_API_KEY não encontrada nos Secrets.")
    sys.exit(1)

client = genai.Client(api_key=api_key)

# Modelos disponíveis (do mais rápido ao mais capaz)
AVAILABLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]


def read_files(directory, extensions):
    """Lê arquivos do projeto ignorando pastas pesadas."""
    content = ""
    file_count = 0
    ignored_dirs = {
        'node_modules', '.git', '.upm', 'dist', 'build', '.replit', '.cache'
    }

    print(f"📂 Lendo arquivos em: {directory}...")

    for root, dirs, files in os.walk(directory):
        # Remove diretórios ignorados da busca
        dirs[:] = [d for d in dirs if d not in ignored_dirs]

        for file in files:
            if file.endswith(tuple(extensions)):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                        content += f"\n--- ARQUIVO: {path} ---\n"
                        content += file_content
                        file_count += 1
                except Exception as e:
                    print(f"⚠️ Erro ao ler {path}: {e}")

    print(f"✅ Total de arquivos lidos: {file_count}")
    return content


def call_gemini_with_retry(client, model_name, prompt, max_retries=3):
    """Chama a API do Gemini com retry e exponential backoff."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            error_msg = str(e)

            # Se for erro 429 (rate limit), faz retry com backoff
            if '429' in error_msg:
                wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s
                print(f"⏳ Rate limit atingido. Aguardando {wait_time}s... (tentativa {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue

            # Outros erros, propaga imediatamente
            raise e

    raise Exception(f"Falha após {max_retries} tentativas devido a rate limiting.")


@click.command()
@click.argument('prompt')
@click.option('--dir',
              default='./public',
              help='Diretório para analisar (default: ./public)')
@click.option('--model',
              default='gemini-2.5-flash',
              type=click.Choice(AVAILABLE_MODELS, case_sensitive=False),
              help='Modelo Gemini a usar (default: gemini-2.5-flash)')
@click.option('--retries',
              default=3,
              help='Número máximo de retries em caso de rate limit (default: 3)')
def analyze(prompt, dir, model, retries):
    """Envia o código para o Gemini analisar."""

    # Define quais arquivos ler
    extensions = ['.html', '.css', '.js', '.json', '.ejs']

    codebase = read_files(dir, extensions)

    if not codebase:
        print("❌ Nenhum arquivo encontrado nas extensões especificadas.")
        return

    # Estima tokens (aproximadamente 4 chars por token)
    estimated_tokens = len(codebase) // 4
    print(f"📊 Tokens estimados: ~{estimated_tokens:,}")

    if estimated_tokens > 200000:
        print("⚠️ Aviso: Muitos tokens. Considere usar --dir com um escopo menor.")

    full_prompt = f"""
    Você é um Arquiteto de Software Sênior.
    Analise o seguinte código do projeto 'Super Cartola Manager':

    {codebase}

    ---
    PEDIDO DO USUÁRIO:
    {prompt}
    ---

    Responda de forma direta, técnica e estruturada em Português.
    """

    print(f"🤖 Enviando para {model} (com retry automático)...")

    try:
        result = call_gemini_with_retry(client, model, full_prompt, max_retries=retries)

        print("\n" + "=" * 50)
        print(f"RELATÓRIO GEMINI ({model}):")
        print("=" * 50 + "\n")
        print(result)

    except Exception as e:
        print(f"❌ Erro na API do Gemini: {e}")


if __name__ == '__main__':
    analyze()
