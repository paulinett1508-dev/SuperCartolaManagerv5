# Super Cartola Manager - Diretrizes de Desenvolvimento

## 🛠️ Comandos Principais
- **Start Dev:** `npm run dev` (Nodemon + Hot Reload)
- **Start Prod:** `npm start`
- **Testes:** `npm test` (Roda todos os testes via Jest)
- **Lint:** `npm run lint` e `npm run lint:fix`
- **Consolidação Manual:** `npm run consolidar` (Processa rodadas pendentes)
- **MCP Database:** Certifique-se de que o servidor MCP está ativo para consultas ao Mongo (`/mcp add mongo node mongo-server.js`).

## 🏗️ Arquitetura e Tech Stack
- **Runtime:** Node.js (ES Modules habilitado).
- **Backend:** Express.js (MVC Pattern).
- **Database:** MongoDB + Mongoose. Use o servidor MCP para inspecionar schemas reais.
- **Frontend Admin:** HTML/CSS/Vanilla JS (Desktop) - `public/admin/`.
- **Frontend App:** Mobile-First Modular JS - `public/participante/`.
- **Auth:** Replit Auth (Admin) e Express Session (Participantes).

## 🧠 Regras de Negócio Críticas (Cartola)
1.  **Pontuação:** Baseada na API oficial do Cartola FC.
2.  **Ligas:**
    - *SuperCartola:* 32 times. Regra financeira complexa (Top/Bottom tier).
    - *Cartoleiros Sobral:* 6 times. Regra simplificada + Luva de Ouro.
3.  **Formatos de Disputa:**
    - *Pontos Corridos:* Todos contra todos. Vitória (+5), Empate (+3), Derrota (-5).
    - *Mata-Mata:* Chaveamento (1º vs 32º). 5 edições por temporada.
    - *Mitos/Micos:* Top 10 e Bottom 10 da rodada geram bônus/multa financeira.
4.  **Consolidação:** Os dados de rodada tornam-se imutáveis após processados (`RodadaSnapshot`). Nunca recalcule uma rodada consolidada sem backup.

## 💻 Diretrizes de Código (Style Guide)
- **Idioma:** Comentários e documentação em **Português (PT-BR)**. Nomes de variáveis/funções em camelCase (híbrido PT/EN aceito, ex: `rodadaController`, `getTeamStats`).
- **Banco de Dados:**
    - NÃO adivinhe nomes de campos. Use a tool `get_collection_schema` do MCP para verificar a estrutura antes de criar queries complexas.
    - Use `async/await` para todas as chamadas de banco.
- **Frontend:**
    - Evite frameworks complexos (React/Vue) neste projeto. Mantenha Vanilla JS modular.
    - Use `fetch` para API calls.
- **Tratamento de Erros:** Sempre envolva chamadas de API externa e Banco em `try/catch`. Logs de erro devem ser descritivos.

## 📂 Estrutura de Pastas Relevante
- `controllers/`: Lógica de negócio (19 arquivos).
- `services/`: Integrações externas (API Cartola) e lógica pura.
- `models/`: Schemas do Mongoose.
- `public/participante/js/modules/`: Lógica do frontend mobile (carregamento preguiçoso).

## ⚠️ Restrições do Ambiente (Replit)
- Não tente usar `sudo` ou instalar pacotes de sistema globalmente.
- Use a variável `MONGODB_URI` dos Secrets.
- Respeite o rate-limit da API do Cartola FC.