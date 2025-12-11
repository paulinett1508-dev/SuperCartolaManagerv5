# Super Cartola Manager - Diretrizes de Desenvolvimento

## 🛠️ Comandos Principais
- **Start Dev:** `npm run dev` (Nodemon + Hot Reload)
- **Start Prod:** `npm start`
- **Testes:** `npm test` (Roda todos os testes via Jest)
- **Lint:** `npm run lint` e `npm run lint:fix`
- **Consolidação Manual:** `npm run consolidar` (Processa rodadas pendentes)
- **MCP Database:** Certifique-se de que o servidor MCP está ativo (`/mcp add mongo node mongo-server.js`) para consultas seguras.

## 🏗️ Arquitetura e Tech Stack
- **Runtime:** Node.js (ES Modules habilitado).
- **Backend:** Express.js (MVC Pattern).
- **Database:** MongoDB + Mongoose.
- **Frontend Admin:** HTML/CSS/Vanilla JS (Desktop) - `public/admin/`.
- **Frontend App:** Mobile-First Modular JS - `public/participante/`.
- **Auth:** Replit Auth (Admin) e Express Session (Participantes).

## 🧠 Regras de Negócio Críticas (Cartola)
1.  **Precisão Numérica (CRÍTICO):**
    - Todas as exibições de pontuação e valores financeiros devem ser truncadas em **2 casas decimais** (ex: `105.40`). Nunca exiba dízimas longas.
2.  **Lógica de Inativos (Liga Cartoleiros):**
    - Para as rodadas **30 a 35**, deve-se aplicar **EXATAMENTE** a mesma lógica de exclusão de times inativos usada nas rodadas finais (35, 37, 38). Inativos não rankeiam.
3.  **Formatos de Disputa:**
    - *SuperCartola:* 32 times, regras financeiras complexas.
    - *Cartoleiros Sobral:* 6 times, regras simplificadas.
    - *Mitos/Micos:* Top 10 e Bottom 10. (Atenção: O join de times deve ser feito via `lookup` robusto para evitar nomes "N/D").
4.  **Consolidação:** Dados processados (`RodadaSnapshot`) são imutáveis.

## 💻 Diretrizes de Código (Style Guide)
- **Frontend Visual:**
    - **Ícones:** Use **Material Icons** (Google) para todos os ícones do app. **PROIBIDO** usar Emojis (🚫) em interfaces oficiais (Pontos Corridos, Melhor do Mês, etc) para manter consistência visual.
    - **UX Mobile:** Intercepte o botão "Voltar" do navegador nas telas Home/Bem-Vindo para mostrar modal de confirmação.
- **Banco de Dados:**
    - Use a ferramenta MCP `get_collection_schema` antes de criar queries.
    - Garanta que queries de agregação (Top 10) tratem campos nulos corretamente.
- **Idioma:** Comentários e documentação em **Português (PT-BR)**.
- **Tratamento de Erros:** Sempre envolva chamadas de API externa e Banco em `try/catch`.

## 📂 Estrutura de Pastas Relevante
- `controllers/`: Lógica de negócio (19 arquivos).
- `services/`: Integrações externas e lógica pura.
- `models/`: Schemas do Mongoose.
- `public/participante/js/modules/`: Lógica do frontend mobile (carregamento preguiçoso).

## ⚠️ Restrições do Ambiente (Replit)
- Use a variável `MONGODB_URI` dos Secrets.
- Configuração de persistência de login (`.claude_auth_store`) já está ativa. Não delete a pasta.