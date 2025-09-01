#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectHandover {
  constructor() {
    this.projectRoot = __dirname;
    this.structure = {};
    this.technologies = new Set();
    this.dependencies = {};
    this.scripts = {};
    this.envVars = [];
    this.databases = [];
    this.apis = [];
  }

  // Executa análise completa
  async generate() {
    console.log("🔍 Analisando projeto...");

    this.analyzeStructure();
    this.analyzeTechnologies();
    this.analyzeDependencies();
    this.analyzeScripts();
    this.analyzeEnvironment();
    this.analyzeDatabase();
    this.analyzeAPIs();

    const markdown = this.generateMarkdown();

    fs.writeFileSync("HANDOVER.md", markdown);
    console.log("✅ HANDOVER.md gerado com sucesso!");
  }

  // Mapeia estrutura de pastas relevantes
  analyzeStructure() {
    const ignore = [
      ".git",
      "node_modules",
      ".replit",
      "dist",
      "build",
      ".cache",
      "coverage",
    ];

    const scan = (dir, level = 0) => {
      if (level > 3) return; // Limita profundidade

      const items = fs
        .readdirSync(dir)
        .filter((item) => !ignore.includes(item));

      return items.reduce((acc, item) => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          acc[item] = scan(fullPath, level + 1);
        } else if (this.isRelevantFile(item)) {
          acc[item] = "file";
        }
        return acc;
      }, {});
    };

    this.structure = scan(this.projectRoot);
  }

  // Identifica se arquivo é relevante
  isRelevantFile(filename) {
    const relevant = [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".vue",
      ".svelte",
      ".py",
      ".java",
      ".go",
      ".rs",
      ".php",
      ".html",
      ".css",
      ".scss",
      ".less",
      ".json",
      ".yaml",
      ".yml",
      ".toml",
      ".md",
      ".txt",
      ".env",
      "Dockerfile",
      "docker-compose",
      "Makefile",
      "Procfile",
    ];

    return (
      relevant.some((ext) => filename.endsWith(ext)) ||
      [
        "package.json",
        "requirements.txt",
        "composer.json",
        "Cargo.toml",
      ].includes(filename)
    );
  }

  // Detecta tecnologias principais
  analyzeTechnologies() {
    const checkFile = (filepath, patterns) => {
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, "utf8");
        patterns.forEach(({ pattern, tech }) => {
          if (pattern.test(content)) this.technologies.add(tech);
        });
      }
    };

    // Verificações por arquivo
    const checks = [
      [
        "package.json",
        [
          { pattern: /"react"/, tech: "React" },
          { pattern: /"vue"/, tech: "Vue.js" },
          { pattern: /"angular"/, tech: "Angular" },
          { pattern: /"express"/, tech: "Express.js" },
          { pattern: /"next"/, tech: "Next.js" },
          { pattern: /"nuxt"/, tech: "Nuxt.js" },
          { pattern: /"typescript"/, tech: "TypeScript" },
          { pattern: /"tailwindcss"/, tech: "Tailwind CSS" },
        ],
      ],
      [
        "requirements.txt",
        [
          { pattern: /django/i, tech: "Django" },
          { pattern: /flask/i, tech: "Flask" },
          { pattern: /fastapi/i, tech: "FastAPI" },
        ],
      ],
      [
        "composer.json",
        [
          { pattern: /"laravel/, tech: "Laravel" },
          { pattern: /"symfony/, tech: "Symfony" },
        ],
      ],
    ];

    checks.forEach(([file, patterns]) => checkFile(file, patterns));

    // Verifica por estrutura de pastas
    if (this.structure.src) this.technologies.add("Source Structure");
    if (this.structure.public) this.technologies.add("Static Assets");
    if (this.structure.api || this.structure.server)
      this.technologies.add("Backend API");
    if (this.structure.components)
      this.technologies.add("Component Architecture");
  }

  // Analisa dependências principais
  analyzeDependencies() {
    const packageJson = path.join(this.projectRoot, "package.json");
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
        this.dependencies.frontend = Object.keys(pkg.dependencies || {}).slice(
          0,
          10,
        );
        this.dependencies.devDependencies = Object.keys(
          pkg.devDependencies || {},
        ).slice(0, 8);
      } catch (err) {
        console.warn("⚠️ Erro ao ler package.json:", err.message);
      }
    }

    const reqTxt = path.join(this.projectRoot, "requirements.txt");
    if (fs.existsSync(reqTxt)) {
      try {
        this.dependencies.python = fs
          .readFileSync(reqTxt, "utf8")
          .split("\n")
          .filter((line) => line.trim())
          .slice(0, 10);
      } catch (err) {
        console.warn("⚠️ Erro ao ler requirements.txt:", err.message);
      }
    }
  }

  // Extrai scripts importantes
  analyzeScripts() {
    const packageJson = path.join(this.projectRoot, "package.json");
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
        this.scripts = pkg.scripts || {};
      } catch (err) {
        console.warn("⚠️ Erro ao ler scripts do package.json:", err.message);
      }
    }
  }

  // Analisa variáveis de ambiente
  analyzeEnvironment() {
    const envFiles = [".env", ".env.example", ".env.local"];

    envFiles.forEach((file) => {
      const filepath = path.join(this.projectRoot, file);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, "utf8");
        const vars = content
          .split("\n")
          .filter((line) => line.includes("="))
          .map((line) => line.split("=")[0])
          .slice(0, 15);
        this.envVars.push(...vars);
      }
    });
  }

  // Detecta databases e storage
  analyzeDatabase() {
    const patterns = [
      { file: "package.json", pattern: /"mongoose"|"mongodb"/, db: "MongoDB" },
      { file: "package.json", pattern: /"pg"|"postgres"/, db: "PostgreSQL" },
      { file: "package.json", pattern: /"mysql"/, db: "MySQL" },
      { file: "package.json", pattern: /"redis"/, db: "Redis" },
      { file: "requirements.txt", pattern: /pymongo/i, db: "MongoDB" },
      { file: "requirements.txt", pattern: /psycopg2/i, db: "PostgreSQL" },
    ];

    patterns.forEach(({ file, pattern, db }) => {
      const filepath = path.join(this.projectRoot, file);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, "utf8");
        if (pattern.test(content)) this.databases.push(db);
      }
    });
  }

  // Detecta APIs e integrações
  analyzeAPIs() {
    const searchInFiles = (dir, extensions = [".js", ".ts", ".py"]) => {
      const apis = new Set();

      const scanDir = (currentDir) => {
        if (currentDir.includes("node_modules")) return;

        try {
          const items = fs.readdirSync(currentDir);
          items.forEach((item) => {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              scanDir(fullPath);
            } else if (extensions.some((ext) => item.endsWith(ext))) {
              const content = fs.readFileSync(fullPath, "utf8");

              // Padrões de APIs comuns
              const patterns = [
                /\/api\/v\d+/g,
                /https?:\/\/api\./g,
                /fetch\(['"`].*api/g,
                /axios\./g,
                /\.get\(['"`]\/api/g,
                /\.post\(['"`]\/api/g,
              ];

              patterns.forEach((pattern) => {
                const matches = content.match(pattern);
                if (matches) {
                  matches.forEach((match) =>
                    apis.add(match.replace(/['"`;]/g, "")),
                  );
                }
              });
            }
          });
        } catch (err) {
          // Ignora erros de permissão
        }
      };

      scanDir(dir);
      return Array.from(apis).slice(0, 8);
    };

    this.apis = searchInFiles(this.projectRoot);
  }

  // Gera markdown final
  generateMarkdown() {
    return `# 🚀 PROJECT HANDOVER

**Data:** ${new Date().toLocaleDateString("pt-BR")}  
**Ambiente:** Replit

## 📋 RESUMO EXECUTIVO

${this.getProjectSummary()}

## 🛠️ STACK TECNOLÓGICA

${Array.from(this.technologies)
  .map((tech) => `- ${tech}`)
  .join("\n")}

## 📁 ESTRUTURA DO PROJETO

\`\`\`
${this.renderStructure(this.structure)}
\`\`\`

## ⚡ COMANDOS ESSENCIAIS

${this.renderScripts()}

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente
${this.envVars.length ? this.envVars.map((env) => `- \`${env}\``).join("\n") : "- Nenhuma variável encontrada"}

### Dependências Principais
${this.renderDependencies()}

## 💾 BANCO DE DADOS

${this.databases.length ? this.databases.map((db) => `- ${db}`).join("\n") : "- Nenhum banco detectado"}

## 🌐 APIs/INTEGRAÇÕES

${this.apis.length ? this.apis.map((api) => `- \`${api}\``).join("\n") : "- Nenhuma API externa detectada"}

## 🚀 COMO INICIAR

1. **Clone/Fork o projeto no Replit**
2. **Instale dependências:**
   ${this.getInstallCommand()}
3. **Configure variáveis de ambiente**
4. **Execute o projeto:**
   ${this.getRunCommand()}

## 📝 PRÓXIMOS PASSOS

- [ ] Revisar configurações de ambiente
- [ ] Testar funcionalidades principais  
- [ ] Verificar integrações externas
- [ ] Atualizar documentação específica

## 🆘 TROUBLESHOOTING

### Problemas Comuns
- **Erro de dependências:** Execute \`npm install\` ou \`pip install -r requirements.txt\`
- **Variáveis não definidas:** Verifique arquivo \`.env\`
- **Porta ocupada:** Mude a porta no Replit ou no código

---
*Handover gerado automaticamente em ${new Date().toLocaleString("pt-BR")}*`;
  }

  getProjectSummary() {
    const hasBackend =
      this.technologies.has("Express.js") ||
      this.technologies.has("Django") ||
      this.technologies.has("Flask");
    const hasFrontend =
      this.technologies.has("React") ||
      this.technologies.has("Vue.js") ||
      this.technologies.has("Angular");

    if (hasBackend && hasFrontend) return "Projeto Full-Stack";
    if (hasBackend) return "Projeto Backend/API";
    if (hasFrontend) return "Projeto Frontend";
    return "Projeto em análise";
  }

  renderStructure(obj, level = 0) {
    const indent = "  ".repeat(level);
    return Object.entries(obj)
      .slice(0, level === 0 ? 20 : 8) // Limita itens
      .map(([key, value]) => {
        if (value === "file") return `${indent}📄 ${key}`;
        if (typeof value === "object") {
          return `${indent}📁 ${key}/\n${this.renderStructure(value, level + 1)}`;
        }
        return `${indent}${key}`;
      })
      .join("\n");
  }

  renderScripts() {
    const essential = ["start", "dev", "build", "test", "deploy"];
    const scripts = Object.entries(this.scripts)
      .filter(([name]) => essential.some((e) => name.includes(e)))
      .slice(0, 6);

    return scripts.length
      ? scripts.map(([name, cmd]) => `- **${name}:** \`${cmd}\``).join("\n")
      : "- Nenhum script configurado";
  }

  renderDependencies() {
    let output = "";
    if (this.dependencies.frontend?.length) {
      output += `**Frontend:** ${this.dependencies.frontend.slice(0, 6).join(", ")}\n`;
    }
    if (this.dependencies.python?.length) {
      output += `**Python:** ${this.dependencies.python.slice(0, 6).join(", ")}\n`;
    }
    return output || "- Nenhuma dependência detectada";
  }

  getInstallCommand() {
    if (this.dependencies.frontend?.length) return "`npm install`";
    if (this.dependencies.python?.length)
      return "`pip install -r requirements.txt`";
    return "`Verifique tipo do projeto`";
  }

  getRunCommand() {
    if (this.scripts.dev) return "`npm run dev`";
    if (this.scripts.start) return "`npm start`";
    return "`Verifique scripts disponíveis`";
  }
}

// Execução
const handover = new ProjectHandover();
handover.generate().catch(console.error);
