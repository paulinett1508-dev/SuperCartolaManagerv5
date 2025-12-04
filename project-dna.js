/**
 * 🧬 PROJECT DNA - Mapeador Inteligente de Projetos
 * Versão: 2.0.0
 * 
 * Unifica análise de UX + Arquitetura + Fluxo de Dados + Modos do Sistema
 * Gera documentação completa para onboarding de devs
 * 
 * FEATURES:
 * - Detecta automaticamente modos Admin vs App/Participante
 * - Mapeia funcionalidades por modo
 * - Extrai Design System (cores, fontes, espaçamentos)
 * - Lista rotas API e fluxo de dados
 * - Identifica débitos técnicos (TODO/FIXME)
 * - Gera diagrama visual da arquitetura
 * 
 * Uso: node project-dna.js [caminho-opcional]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectDNA {
  constructor() {
    // ===== CONFIGURAÇÕES =====
    this.config = {
      ignoredPaths: [
        "node_modules", ".git", "dist", "build", ".next", ".cache",
        ".vscode", ".idea", "coverage", ".nyc_output", "logs", ".replit"
      ],
      analyzableExtensions: [".js", ".jsx", ".ts", ".tsx", ".vue", ".html", ".css", ".scss", ".json", ".md", ".env"],
      maxPreviewLines: 5,
    };

    // ===== DADOS COLETADOS =====
    this.data = {
      // Estrutura
      files: new Map(),
      folders: new Set(),
      entryPoints: {},
      
      // Arquitetura
      apiRoutes: [],
      dependencies: {},
      modules: { frontend: [], backend: [], shared: [] },
      
      // Modos do Sistema (Admin vs App)
      systemModes: {
        admin: { 
          detected: false, 
          path: null, 
          modules: [], 
          features: new Set(),
          description: ""
        },
        participante: { 
          detected: false, 
          path: null, 
          modules: [], 
          features: new Set(),
          description: ""
        },
        public: {
          detected: false,
          path: null,
          modules: [],
          features: new Set(),
          description: ""
        }
      },
      
      // Resumo do Sistema
      systemSummary: {
        name: "",
        type: "",
        domain: "",
        mainFeatures: [],
        techStack: [],
      },
      
      // UX/Design System
      ux: {
        cssVariables: {},
        colors: { primary: new Set(), backgrounds: new Set(), text: new Set(), borders: new Set() },
        typography: { fonts: new Set(), sizes: new Set(), weights: new Set() },
        spacing: { paddings: new Set(), margins: new Set(), gaps: new Set() },
        breakpoints: new Set(),
        borderRadius: new Set(),
        shadows: new Set(),
        transitions: new Set(),
        icons: { library: null, used: new Set() },
        components: [],
        zIndex: new Set(),
      },
      
      // Qualidade
      technicalDebt: [],
      envVariables: new Set(),
      
      // Metadados
      packageJson: null,
      stats: { totalFiles: 0, totalSize: 0, byType: {} },
    };

    // ===== PADRÕES DE DETECÇÃO =====
    this.patterns = {
      // API Routes
      expressRoute: /router\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
      appRoute: /app\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
      
      // Fetch calls
      fetchCall: /fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi,
      apiCall: /["'`](\/api\/[^"'`]+)["'`]/gi,
      
      // Imports/Exports
      importStatement: /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+["'`]([^"'`]+)["'`]/gi,
      requireStatement: /require\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/gi,
      exportStatement: /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/gi,
      
      // CSS
      cssVariable: /--([\w-]+):\s*([^;]+);/gi,
      colorValue: /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi,
      mediaQuery: /@media[^{]+\{\s*/gi,
      breakpoint: /(?:min|max)-width:\s*(\d+(?:px|em|rem))/gi,
      
      // Classes e Funções
      classDeclaration: /class\s+(\w+)/gi,
      functionDeclaration: /(?:async\s+)?function\s+(\w+)/gi,
      arrowFunction: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/gi,
      
      // Technical Debt
      todo: /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]+(.+)/gi,
      
      // Env Variables
      envUsage: /process\.env\.(\w+)/gi,
      envFile: /^(\w+)=(.*)$/gm,
      
      // Icons
      materialIcon: /["'`]?(material-icons|material-symbols-outlined)["'`]?/gi,
      iconName: /<span[^>]*(?:material-icons|material-symbols)[^>]*>(\w+)<\/span>/gi,
      iconInClass: /class=["'][^"']*(?:material-icons|material-symbols)[^"']*["'][^>]*>(\w+)</gi,
    };
  }

  // ===== MÉTODO PRINCIPAL =====
  async analyze(rootPath = "./") {
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║            🧬 PROJECT DNA - Análise Inteligente           ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

    const startTime = Date.now();

    try {
      // Fase 1: Escanear estrutura
      console.log("📂 [1/6] Escaneando estrutura de arquivos...");
      await this.scanDirectory(rootPath);

      // Fase 2: Analisar package.json
      console.log("📦 [2/6] Analisando dependências do projeto...");
      await this.analyzePackageJson(rootPath);

      // Fase 3: Analisar arquivos
      console.log("🔍 [3/6] Analisando conteúdo dos arquivos...");
      await this.analyzeAllFiles();

      // Fase 4: Mapear fluxo de dados
      console.log("🔗 [4/7] Mapeando fluxo de dados e dependências...");
      this.mapDataFlow();

      // Fase 5: Analisar modos do sistema (Admin vs App)
      console.log("🎭 [5/7] Analisando modos do sistema...");
      this.analyzeSystemModes();

      // Fase 6: Identificar pontos críticos
      console.log("⚠️  [6/7] Identificando pontos críticos...");
      this.identifyCriticalPoints();

      // Fase 7: Gerar documento
      console.log("📝 [7/7] Gerando documentação...\n");
      const document = this.generateDocument();

      // Salvar
      const fileName = `PROJECT_DNA.md`;
      fs.writeFileSync(fileName, document, "utf8");

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║                 ✅ ANÁLISE CONCLUÍDA                      ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      console.log(`\n📄 Arquivo gerado: ${fileName}`);
      console.log(`📊 Arquivos analisados: ${this.data.stats.totalFiles}`);
      console.log(`⏱️  Tempo: ${elapsed}s`);
      console.log(`\n💡 Cole o conteúdo do ${fileName} nas instruções do projeto para a IA.\n`);

      return fileName;
    } catch (error) {
      console.error("\n❌ Erro durante análise:", error);
      throw error;
    }
  }

  // ===== ESCANEAR DIRETÓRIO =====
  async scanDirectory(dirPath, level = 0) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativePath = path.relative("./", fullPath);

        if (this.shouldIgnore(item, relativePath)) continue;

        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          this.data.folders.add(relativePath);
          await this.scanDirectory(fullPath, level + 1);
        } else {
          const ext = path.extname(item).toLowerCase();
          
          this.data.files.set(relativePath, {
            fullPath,
            relativePath,
            basename: path.basename(item, ext),
            extension: ext,
            size: stats.size,
            directory: path.dirname(relativePath),
            analyzed: false,
            content: null,
          });

          this.data.stats.totalFiles++;
          this.data.stats.totalSize += stats.size;
          this.data.stats.byType[ext] = (this.data.stats.byType[ext] || 0) + 1;
        }
      }
    } catch (error) {
      // Silently skip inaccessible directories
    }
  }

  shouldIgnore(item, relativePath) {
    if (item.startsWith(".")) return true;
    return this.config.ignoredPaths.some(ignored => 
      relativePath.includes(ignored) || item === ignored
    );
  }

  // ===== ANALISAR PACKAGE.JSON =====
  async analyzePackageJson(rootPath) {
    const pkgPath = path.join(rootPath, "package.json");
    
    if (fs.existsSync(pkgPath)) {
      try {
        const content = fs.readFileSync(pkgPath, "utf8");
        this.data.packageJson = JSON.parse(content);
      } catch (e) {
        // Invalid JSON
      }
    }
  }

  // ===== ANALISAR TODOS OS ARQUIVOS =====
  async analyzeAllFiles() {
    for (const [relativePath, fileInfo] of this.data.files) {
      const ext = fileInfo.extension.toLowerCase();
      
      if (!this.config.analyzableExtensions.includes(ext)) continue;

      try {
        const content = fs.readFileSync(fileInfo.fullPath, "utf8");
        fileInfo.content = content;
        fileInfo.lines = content.split("\n").length;
        fileInfo.analyzed = true;

        // Detectar entry points
        this.detectEntryPoint(relativePath, fileInfo);

        // Análise específica por tipo
        if ([".css", ".scss"].includes(ext)) {
          this.analyzeCSS(content, relativePath);
        }
        
        if ([".html"].includes(ext)) {
          this.analyzeHTML(content, relativePath);
        }
        
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          this.analyzeJS(content, relativePath, fileInfo);
        }

        if (ext === ".env" || fileInfo.basename.includes(".env")) {
          this.analyzeEnvFile(content);
        }

        // Buscar débitos técnicos em todos os arquivos
        this.findTechnicalDebt(content, relativePath);

      } catch (error) {
        // Skip unreadable files
      }
    }
  }

  // ===== DETECTAR ENTRY POINTS =====
  detectEntryPoint(relativePath, fileInfo) {
    const lower = relativePath.toLowerCase();
    const basename = fileInfo.basename.toLowerCase();

    // Backend
    if (basename === "index" && lower.includes("backend")) {
      this.data.entryPoints.backend = relativePath;
    } else if ((basename === "index" || basename === "server" || basename === "app") && 
               !lower.includes("public") && !lower.includes("frontend") && !lower.includes("participante")) {
      if (!this.data.entryPoints.backend) {
        this.data.entryPoints.backend = relativePath;
      }
    }

    // Frontend principal
    if (basename === "index" && fileInfo.extension === ".html") {
      if (lower.includes("admin")) {
        this.data.entryPoints.admin = relativePath;
      } else if (lower.includes("participante")) {
        this.data.entryPoints.participante = relativePath;
      } else if (lower.includes("public") && !this.data.entryPoints.frontend) {
        this.data.entryPoints.frontend = relativePath;
      }
    }
  }

  // ===== ANALISAR CSS =====
  analyzeCSS(content, filePath) {
    // CSS Variables
    let match;
    const varPattern = new RegExp(this.patterns.cssVariable.source, "gi");
    while ((match = varPattern.exec(content)) !== null) {
      const varName = `--${match[1]}`;
      const varValue = match[2].trim();
      this.data.ux.cssVariables[varName] = varValue;

      // Categorizar
      if (varName.includes("color") || varName.includes("primary") || varName.includes("accent")) {
        this.data.ux.colors.primary.add(`${varName}: ${varValue}`);
      } else if (varName.includes("bg") || varName.includes("background")) {
        this.data.ux.colors.backgrounds.add(`${varName}: ${varValue}`);
      } else if (varName.includes("text")) {
        this.data.ux.colors.text.add(`${varName}: ${varValue}`);
      } else if (varName.includes("border")) {
        this.data.ux.colors.borders.add(`${varName}: ${varValue}`);
      } else if (varName.includes("radius")) {
        this.data.ux.borderRadius.add(`${varName}: ${varValue}`);
      } else if (varName.includes("shadow")) {
        this.data.ux.shadows.add(`${varName}: ${varValue}`);
      }
    }

    // Cores diretas
    const colorProps = content.match(/(?:color|background|background-color|border-color):\s*([^;]+);/gi) || [];
    colorProps.forEach(prop => {
      const colors = prop.match(this.patterns.colorValue);
      if (colors) {
        colors.forEach(c => this.data.ux.colors.backgrounds.add(c));
      }
    });

    // Breakpoints
    const mediaQueries = content.match(this.patterns.mediaQuery) || [];
    mediaQueries.forEach(mq => {
      const bp = mq.match(this.patterns.breakpoint);
      if (bp) {
        this.data.ux.breakpoints.add(bp[1]);
      }
    });

    // Typography
    const fontFamilies = content.match(/font-family:\s*([^;]+);/gi) || [];
    fontFamilies.forEach(f => {
      const value = f.replace(/font-family:\s*/i, "").replace(";", "").trim();
      this.data.ux.typography.fonts.add(value);
    });

    const fontSizes = content.match(/font-size:\s*([^;]+);/gi) || [];
    fontSizes.forEach(f => {
      const value = f.replace(/font-size:\s*/i, "").replace(";", "").trim();
      this.data.ux.typography.sizes.add(value);
    });

    const fontWeights = content.match(/font-weight:\s*([^;]+);/gi) || [];
    fontWeights.forEach(f => {
      const value = f.replace(/font-weight:\s*/i, "").replace(";", "").trim();
      this.data.ux.typography.weights.add(value);
    });

    // Spacing
    const paddings = content.match(/padding(?:-\w+)?:\s*([^;]+);/gi) || [];
    paddings.forEach(p => this.data.ux.spacing.paddings.add(p.split(":")[1].replace(";", "").trim()));

    const margins = content.match(/margin(?:-\w+)?:\s*([^;]+);/gi) || [];
    margins.forEach(m => this.data.ux.spacing.margins.add(m.split(":")[1].replace(";", "").trim()));

    const gaps = content.match(/gap:\s*([^;]+);/gi) || [];
    gaps.forEach(g => this.data.ux.spacing.gaps.add(g.split(":")[1].replace(";", "").trim()));

    // Border radius
    const radiuses = content.match(/border-radius:\s*([^;]+);/gi) || [];
    radiuses.forEach(r => this.data.ux.borderRadius.add(r.split(":")[1].replace(";", "").trim()));

    // Shadows
    const shadows = content.match(/box-shadow:\s*([^;]+);/gi) || [];
    shadows.forEach(s => this.data.ux.shadows.add(s.split(":")[1].replace(";", "").trim()));

    // Transitions
    const transitions = content.match(/transition:\s*([^;]+);/gi) || [];
    transitions.forEach(t => this.data.ux.transitions.add(t.split(":")[1].replace(";", "").trim()));

    // Z-index
    const zIndexes = content.match(/z-index:\s*([^;]+);/gi) || [];
    zIndexes.forEach(z => this.data.ux.zIndex.add(z.split(":")[1].replace(";", "").trim()));

    // Detectar componentes (seletores de classe)
    const classSelectors = content.match(/\.([\w-]+)\s*\{[^}]+\}/g) || [];
    const componentPatterns = ["card", "btn", "button", "modal", "header", "footer", "nav", "sidebar", "form", "input", "table"];
    
    classSelectors.forEach(selector => {
      const className = selector.match(/\.([\w-]+)/)?.[1];
      if (className && componentPatterns.some(p => className.toLowerCase().includes(p))) {
        this.data.ux.components.push({
          selector: `.${className}`,
          file: filePath,
          preview: selector.substring(0, 100),
        });
      }
    });
  }

  // ===== ANALISAR HTML =====
  analyzeHTML(content, filePath) {
    // Detectar biblioteca de ícones
    if (content.includes("material-icons") || content.includes("material-symbols")) {
      this.data.ux.icons.library = content.includes("material-symbols") ? "material-symbols-outlined" : "material-icons";
    }

    // Extrair nomes de ícones
    const iconMatches = content.match(/>([a-z_]+)</gi) || [];
    iconMatches.forEach(match => {
      const iconName = match.replace(/[><]/g, "");
      if (iconName.length > 2 && iconName.length < 30 && !iconName.includes(" ")) {
        // Verificar se parece ser um ícone Material
        if (/^[a-z_]+$/.test(iconName)) {
          this.data.ux.icons.used.add(iconName);
        }
      }
    });

    // CSS inline e style tags
    const styleTags = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    styleTags.forEach(tag => {
      const cssContent = tag.replace(/<\/?style[^>]*>/gi, "");
      this.analyzeCSS(cssContent, filePath);
    });
  }

  // ===== ANALISAR JS =====
  analyzeJS(content, filePath, fileInfo) {
    const analysis = {
      classes: [],
      functions: [],
      exports: [],
      imports: [],
      apiCalls: [],
      routes: [],
    };

    // Classes
    let match;
    const classPattern = new RegExp(this.patterns.classDeclaration.source, "gi");
    while ((match = classPattern.exec(content)) !== null) {
      analysis.classes.push(match[1]);
    }

    // Functions
    const funcPattern = new RegExp(this.patterns.functionDeclaration.source, "gi");
    while ((match = funcPattern.exec(content)) !== null) {
      analysis.functions.push(match[1]);
    }

    const arrowPattern = new RegExp(this.patterns.arrowFunction.source, "gi");
    while ((match = arrowPattern.exec(content)) !== null) {
      analysis.functions.push(match[1]);
    }

    // Exports
    const exportPattern = new RegExp(this.patterns.exportStatement.source, "gi");
    while ((match = exportPattern.exec(content)) !== null) {
      analysis.exports.push(match[1]);
    }

    // Window exports (padrão do projeto)
    const windowExports = content.match(/window\.(\w+)\s*=/g) || [];
    windowExports.forEach(w => {
      const name = w.match(/window\.(\w+)/)?.[1];
      if (name) analysis.exports.push(`window.${name}`);
    });

    // Imports
    const importPattern = new RegExp(this.patterns.importStatement.source, "gi");
    while ((match = importPattern.exec(content)) !== null) {
      analysis.imports.push(match[1]);
    }

    const requirePattern = new RegExp(this.patterns.requireStatement.source, "gi");
    while ((match = requirePattern.exec(content)) !== null) {
      analysis.imports.push(match[1]);
    }

    // API Calls (frontend)
    const fetchPattern = new RegExp(this.patterns.fetchCall.source, "gi");
    while ((match = fetchPattern.exec(content)) !== null) {
      if (match[1].startsWith("/api") || match[1].includes("/api/")) {
        analysis.apiCalls.push(match[1]);
      }
    }

    const apiPattern = new RegExp(this.patterns.apiCall.source, "gi");
    while ((match = apiPattern.exec(content)) !== null) {
      if (!analysis.apiCalls.includes(match[1])) {
        analysis.apiCalls.push(match[1]);
      }
    }

    // Routes (backend)
    const routerPattern = new RegExp(this.patterns.expressRoute.source, "gi");
    while ((match = routerPattern.exec(content)) !== null) {
      analysis.routes.push({ method: match[1].toUpperCase(), path: match[2] });
    }

    const appPattern = new RegExp(this.patterns.appRoute.source, "gi");
    while ((match = appPattern.exec(content)) !== null) {
      analysis.routes.push({ method: match[1].toUpperCase(), path: match[2] });
    }

    // Env variables
    const envPattern = new RegExp(this.patterns.envUsage.source, "gi");
    while ((match = envPattern.exec(content)) !== null) {
      this.data.envVariables.add(match[1]);
    }

    // Salvar análise
    fileInfo.analysis = analysis;

    // Categorizar módulo
    const lower = filePath.toLowerCase();
    if (lower.includes("routes") || lower.includes("controllers") || lower.includes("services") || lower.includes("backend")) {
      this.data.modules.backend.push({ path: filePath, ...analysis });
      
      // Adicionar rotas ao mapa global
      analysis.routes.forEach(route => {
        this.data.apiRoutes.push({
          ...route,
          file: filePath,
          handler: this.inferHandler(content, route.path),
        });
      });
    } else if (lower.includes("public") || lower.includes("frontend") || lower.includes("modules")) {
      this.data.modules.frontend.push({ path: filePath, ...analysis });
    } else {
      this.data.modules.shared.push({ path: filePath, ...analysis });
    }
  }

  inferHandler(content, routePath) {
    // Tentar encontrar o nome do controller/handler
    const pathParts = routePath.split("/").filter(p => p && !p.startsWith(":"));
    const lastPart = pathParts[pathParts.length - 1];
    
    // Procurar função com nome similar
    const handlerMatch = content.match(new RegExp(`(\\w*${lastPart}\\w*)`, "i"));
    return handlerMatch ? handlerMatch[1] : null;
  }

  // ===== ANALISAR ENV FILE =====
  analyzeEnvFile(content) {
    const lines = content.split("\n");
    lines.forEach(line => {
      const match = line.match(/^(\w+)=/);
      if (match) {
        this.data.envVariables.add(match[1]);
      }
    });
  }

  // ===== BUSCAR DÉBITOS TÉCNICOS =====
  findTechnicalDebt(content, filePath) {
    const lines = content.split("\n");
    
    lines.forEach((line, index) => {
      const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE)[\s:]+(.+)/i);
      if (todoMatch) {
        this.data.technicalDebt.push({
          file: filePath,
          line: index + 1,
          type: todoMatch[1].toUpperCase(),
          text: todoMatch[2].trim(),
        });
      }
    });
  }

  // ===== MAPEAR FLUXO DE DADOS =====
  mapDataFlow() {
    // Criar mapa de dependências
    for (const [filePath, fileInfo] of this.data.files) {
      if (!fileInfo.analysis) continue;

      this.data.dependencies[filePath] = {
        imports: fileInfo.analysis.imports || [],
        exports: fileInfo.analysis.exports || [],
        apiCalls: fileInfo.analysis.apiCalls || [],
        routes: fileInfo.analysis.routes || [],
      };
    }
  }

  // ===== IDENTIFICAR PONTOS CRÍTICOS =====
  identifyCriticalPoints() {
    // Arquivos mais importados são críticos
    const importCount = {};
    
    for (const deps of Object.values(this.data.dependencies)) {
      deps.imports.forEach(imp => {
        importCount[imp] = (importCount[imp] || 0) + 1;
      });
    }

    this.data.criticalFiles = Object.entries(importCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, importedBy: count }));
  }

  // ===== ANALISAR MODOS DO SISTEMA =====
  analyzeSystemModes() {
    const pkg = this.data.packageJson || {};
    
    // Detectar nome e tipo do sistema
    this.data.systemSummary.name = pkg.name || this.inferProjectName();
    this.data.systemSummary.type = this.inferProjectType();
    this.data.systemSummary.domain = this.inferDomain();
    this.data.systemSummary.techStack = this.detectTechStack();

    // Detectar modo ADMIN
    this.detectAdminMode();
    
    // Detectar modo PARTICIPANTE/APP
    this.detectParticipanteMode();
    
    // Detectar área pública
    this.detectPublicMode();

    // Gerar features principais
    this.data.systemSummary.mainFeatures = this.extractMainFeatures();
  }

  inferProjectName() {
    // Tentar inferir do diretório ou arquivos
    for (const folder of this.data.folders) {
      if (folder.includes("cartola")) return "Sistema Cartola";
      if (folder.includes("ecommerce")) return "E-commerce";
      if (folder.includes("crm")) return "CRM";
    }
    return "Sistema Web";
  }

  inferProjectType() {
    const hasAdmin = Array.from(this.data.folders).some(f => f.includes("admin"));
    const hasParticipante = Array.from(this.data.folders).some(f => 
      f.includes("participante") || f.includes("cliente") || f.includes("user")
    );
    const hasApi = this.data.apiRoutes.length > 0;

    if (hasAdmin && hasParticipante && hasApi) {
      return "Plataforma Multi-tenant (Admin + App)";
    } else if (hasAdmin && hasApi) {
      return "Sistema de Gestão (Admin)";
    } else if (hasApi) {
      return "API Backend";
    } else {
      return "Aplicação Web";
    }
  }

  inferDomain() {
    const allPaths = Array.from(this.data.files.keys()).join(" ").toLowerCase();
    const allFolders = Array.from(this.data.folders).join(" ").toLowerCase();
    const combined = allPaths + " " + allFolders;

    // Detectar domínio baseado em palavras-chave
    const domains = {
      "Esportes/Fantasy Game": ["cartola", "futebol", "gol", "artilheiro", "rodada", "time", "liga", "campeonato", "escalacao"],
      "E-commerce": ["produto", "carrinho", "checkout", "pagamento", "pedido", "loja", "estoque"],
      "Financeiro": ["financeiro", "transacao", "saldo", "extrato", "pagamento", "fatura"],
      "Educação": ["curso", "aluno", "professor", "aula", "matricula", "nota"],
      "Saúde": ["paciente", "medico", "consulta", "prontuario", "exame"],
      "RH": ["funcionario", "folha", "ferias", "ponto", "salario"],
      "CRM": ["cliente", "lead", "oportunidade", "pipeline", "vendas"],
    };

    for (const [domain, keywords] of Object.entries(domains)) {
      const matches = keywords.filter(kw => combined.includes(kw)).length;
      if (matches >= 2) return domain;
    }

    return "Aplicação Genérica";
  }

  detectTechStack() {
    const stack = [];
    const pkg = this.data.packageJson || {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Backend
    if (deps.express) stack.push("Express.js");
    if (deps.fastify) stack.push("Fastify");
    if (deps.koa) stack.push("Koa");
    if (deps.mongoose || deps.mongodb) stack.push("MongoDB");
    if (deps.sequelize || deps.pg) stack.push("PostgreSQL");
    if (deps.mysql2) stack.push("MySQL");

    // Frontend
    if (deps.react) stack.push("React");
    if (deps.vue) stack.push("Vue.js");
    if (deps.angular) stack.push("Angular");
    if (deps.tailwindcss) stack.push("Tailwind CSS");
    if (deps.bootstrap) stack.push("Bootstrap");

    // Infra
    if (deps.redis) stack.push("Redis");
    if (deps.socket) stack.push("WebSocket");
    if (deps.axios || deps.fetch) stack.push("REST API");

    return stack.length > 0 ? stack : ["Node.js"];
  }

  detectAdminMode() {
    const admin = this.data.systemModes.admin;
    
    // Procurar pastas admin
    for (const folder of this.data.folders) {
      if (folder.toLowerCase().includes("admin")) {
        admin.detected = true;
        admin.path = folder;
        break;
      }
    }

    if (!admin.detected) return;

    // Coletar módulos do admin
    for (const [filePath, fileInfo] of this.data.files) {
      if (filePath.toLowerCase().includes("admin")) {
        const moduleName = this.extractModuleName(filePath, fileInfo);
        if (moduleName) {
          admin.modules.push({
            name: moduleName,
            file: filePath,
            type: this.inferModuleType(filePath, fileInfo),
          });
        }

        // Extrair features
        this.extractFeaturesFromFile(fileInfo, admin.features);
      }
    }

    // Gerar descrição do modo Admin
    admin.description = this.generateModeDescription("admin", admin);
  }

  detectParticipanteMode() {
    const participante = this.data.systemModes.participante;
    
    // Procurar pastas participante/cliente/user/app
    const appPatterns = ["participante", "cliente", "user", "app", "member"];
    
    for (const folder of this.data.folders) {
      const lower = folder.toLowerCase();
      if (appPatterns.some(p => lower.includes(p)) && !lower.includes("admin")) {
        participante.detected = true;
        participante.path = folder;
        break;
      }
    }

    if (!participante.detected) return;

    // Coletar módulos
    for (const [filePath, fileInfo] of this.data.files) {
      const lower = filePath.toLowerCase();
      if (appPatterns.some(p => lower.includes(p)) && !lower.includes("admin")) {
        const moduleName = this.extractModuleName(filePath, fileInfo);
        if (moduleName) {
          participante.modules.push({
            name: moduleName,
            file: filePath,
            type: this.inferModuleType(filePath, fileInfo),
          });
        }

        this.extractFeaturesFromFile(fileInfo, participante.features);
      }
    }

    participante.description = this.generateModeDescription("participante", participante);
  }

  detectPublicMode() {
    const pub = this.data.systemModes.public;
    
    // Procurar pasta public que não seja admin nem participante
    for (const folder of this.data.folders) {
      const lower = folder.toLowerCase();
      if (lower === "public" || lower.endsWith("/public")) {
        pub.detected = true;
        pub.path = folder;
        break;
      }
    }
  }

  extractModuleName(filePath, fileInfo) {
    const basename = fileInfo.basename.toLowerCase();
    const dir = fileInfo.directory.toLowerCase();

    // Ignorar arquivos genéricos
    if (["index", "main", "app", "utils", "helpers", "config"].includes(basename)) {
      return null;
    }

    // Limpar nome do módulo
    let name = fileInfo.basename
      .replace(/[-_]?module$/i, "")
      .replace(/[-_]?(controller|service|route|view|component)$/i, "")
      .replace(/^(participante|admin)[-_]?/i, "");

    // Capitalizar
    name = name.charAt(0).toUpperCase() + name.slice(1);
    
    // Converter camelCase/kebab-case para palavras
    name = name
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .trim();

    return name || null;
  }

  inferModuleType(filePath, fileInfo) {
    const lower = filePath.toLowerCase();
    
    if (lower.includes("template") || fileInfo.extension === ".html") return "template";
    if (lower.includes("module") || lower.includes("js/modules")) return "módulo JS";
    if (lower.includes("style") || fileInfo.extension === ".css") return "estilo";
    if (lower.includes("controller")) return "controller";
    if (lower.includes("service")) return "serviço";
    if (lower.includes("route")) return "rota";
    
    return "arquivo";
  }

  extractFeaturesFromFile(fileInfo, featuresSet) {
    if (!fileInfo.content) return;

    const content = fileInfo.content.toLowerCase();
    
    // Features comuns
    const featurePatterns = {
      "Dashboard": ["dashboard", "painel", "visao geral"],
      "Ranking": ["ranking", "classificacao", "colocacao"],
      "Rodadas": ["rodada", "round", "jornada"],
      "Escalação": ["escalacao", "lineup", "formacao"],
      "Financeiro": ["financeiro", "saldo", "extrato", "pagamento"],
      "Mata-Mata": ["mata-mata", "eliminatoria", "playoff"],
      "Ligas": ["liga", "league", "campeonato"],
      "Times": ["time", "team", "equipe"],
      "Gols": ["gol", "goal", "artilheiro"],
      "Estatísticas": ["estatistica", "stats", "grafico"],
      "Configurações": ["config", "setting", "preferencia"],
      "Usuários": ["usuario", "user", "participante"],
      "Notificações": ["notifica", "alert", "aviso"],
      "Relatórios": ["relatorio", "report", "export"],
      "Autenticação": ["login", "auth", "sessao", "logout"],
    };

    for (const [feature, keywords] of Object.entries(featurePatterns)) {
      if (keywords.some(kw => content.includes(kw))) {
        featuresSet.add(feature);
      }
    }
  }

  generateModeDescription(mode, modeData) {
    const features = Array.from(modeData.features);
    const moduleCount = modeData.modules.length;

    if (mode === "admin") {
      return `Área administrativa com ${moduleCount} módulos. ` +
        `Funcionalidades: ${features.slice(0, 5).join(", ") || "gestão geral"}.`;
    } else {
      return `Aplicativo do usuário final com ${moduleCount} módulos. ` +
        `Funcionalidades: ${features.slice(0, 5).join(", ") || "acesso geral"}.`;
    }
  }

  extractMainFeatures() {
    const allFeatures = new Set();
    
    // Combinar features de todos os modos
    for (const mode of Object.values(this.data.systemModes)) {
      if (mode.features) {
        mode.features.forEach(f => allFeatures.add(f));
      }
    }

    // Adicionar features baseadas em rotas API
    this.data.apiRoutes.forEach(route => {
      const path = route.path.toLowerCase();
      if (path.includes("liga")) allFeatures.add("Gestão de Ligas");
      if (path.includes("rodada")) allFeatures.add("Controle de Rodadas");
      if (path.includes("time")) allFeatures.add("Gestão de Times");
      if (path.includes("usuario") || path.includes("user")) allFeatures.add("Gestão de Usuários");
      if (path.includes("financ")) allFeatures.add("Sistema Financeiro");
      if (path.includes("auth") || path.includes("login")) allFeatures.add("Autenticação");
    });

    return Array.from(allFeatures).slice(0, 10);
  }

  // ===== GERAR DOCUMENTO MD =====
  generateDocument() {
    const now = new Date().toLocaleString("pt-BR");
    const pkg = this.data.packageJson || {};

    return `# 🧬 DNA DO PROJETO${pkg.name ? `: ${pkg.name}` : ""}

> Documentação gerada automaticamente em ${now}
> Este documento deve ser consultado ANTES de qualquer alteração no código

---

## 📋 ÍNDICE

1. [O Que É Este Sistema](#-o-que-é-este-sistema)
2. [Modos de Operação](#-modos-de-operação)
3. [Quick Start](#-quick-start)
4. [Stack Tecnológica](#-stack-tecnológica)
5. [Arquitetura](#-arquitetura)
6. [Fluxo de Dados](#-fluxo-de-dados)
7. [API Routes](#-api-routes)
8. [Design System](#-design-system)
9. [Componentes](#-componentes)
10. [Pontos Críticos](#-pontos-críticos)
11. [Débitos Técnicos](#-débitos-técnicos)
12. [Regras de Ouro](#-regras-de-ouro)

---

## 🎯 O QUE É ESTE SISTEMA

### Resumo Executivo

| Atributo | Descrição |
|----------|-----------|
| **Nome** | ${this.data.systemSummary.name} |
| **Tipo** | ${this.data.systemSummary.type} |
| **Domínio** | ${this.data.systemSummary.domain} |
| **Stack** | ${this.data.systemSummary.techStack.join(", ") || "Node.js"} |

### Funcionalidades Principais
${this.data.systemSummary.mainFeatures.map(f => `- ✅ ${f}`).join("\n") || "- Não detectadas automaticamente"}

---

## 🎭 MODOS DE OPERAÇÃO

${this.generateModesSection()}

---

## 🚀 QUICK START

### Instalação
\`\`\`bash
npm install
\`\`\`

### Variáveis de Ambiente
${this.data.envVariables.size > 0 ? 
  "Crie um arquivo `.env` com as seguintes variáveis:\n```env\n" + 
  Array.from(this.data.envVariables).map(v => `${v}=`).join("\n") + 
  "\n```" : 
  "Nenhuma variável de ambiente detectada."}

### Executar
\`\`\`bash
${pkg.scripts?.dev ? "npm run dev" : pkg.scripts?.start ? "npm start" : "node index.js"}
\`\`\`

### Entry Points
${Object.entries(this.data.entryPoints).map(([key, value]) => `- **${key}:** \`${value}\``).join("\n") || "- Não detectados automaticamente"}

---

## 🛠️ STACK TECNOLÓGICA

### Dependências Principais
${pkg.dependencies ? 
  Object.keys(pkg.dependencies).slice(0, 15).map(dep => `- ${dep}`).join("\n") : 
  "- Não detectadas"}

### DevDependencies
${pkg.devDependencies ? 
  Object.keys(pkg.devDependencies).slice(0, 10).map(dep => `- ${dep}`).join("\n") : 
  "- Não detectadas"}

---

## 🏗️ ARQUITETURA

### Estatísticas
| Métrica | Valor |
|---------|-------|
| Total de arquivos | ${this.data.stats.totalFiles} |
| Tamanho total | ${Math.round(this.data.stats.totalSize / 1024)} KB |
| Módulos Frontend | ${this.data.modules.frontend.length} |
| Módulos Backend | ${this.data.modules.backend.length} |
| Rotas API | ${this.data.apiRoutes.length} |

### Distribuição por Tipo
${Object.entries(this.data.stats.byType)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([ext, count]) => `| ${ext} | ${count} |`)
  .join("\n")}

### Estrutura de Pastas
\`\`\`
${this.generateFolderTree()}
\`\`\`

---

## 🔗 FLUXO DE DADOS

### Frontend → Backend
${this.generateDataFlowSection()}

---

## 🛣️ API ROUTES

${this.data.apiRoutes.length > 0 ? `
| Método | Path | Arquivo |
|--------|------|---------|
${this.data.apiRoutes.slice(0, 30).map(r => 
  `| \`${r.method}\` | \`${r.path}\` | ${r.file} |`
).join("\n")}
${this.data.apiRoutes.length > 30 ? `\n*... e mais ${this.data.apiRoutes.length - 30} rotas*` : ""}
` : "Nenhuma rota API detectada."}

---

## 🎨 DESIGN SYSTEM

### CSS Variables
${Object.keys(this.data.ux.cssVariables).length > 0 ? `
\`\`\`css
:root {
${Object.entries(this.data.ux.cssVariables).slice(0, 30).map(([k, v]) => `  ${k}: ${v};`).join("\n")}
}
\`\`\`
` : "Nenhuma variável CSS detectada."}

### Cores
**Primárias/Accent:**
${Array.from(this.data.ux.colors.primary).slice(0, 8).map(c => `- \`${c}\``).join("\n") || "- Não detectadas"}

**Backgrounds:**
${Array.from(this.data.ux.colors.backgrounds).slice(0, 8).map(c => `- \`${c}\``).join("\n") || "- Não detectadas"}

**Texto:**
${Array.from(this.data.ux.colors.text).slice(0, 6).map(c => `- \`${c}\``).join("\n") || "- Não detectadas"}

### Tipografia
**Fontes:**
${Array.from(this.data.ux.typography.fonts).slice(0, 5).map(f => `- ${f}`).join("\n") || "- Não detectadas"}

**Tamanhos:**
${Array.from(this.data.ux.typography.sizes).slice(0, 10).map(s => `\`${s}\``).join(", ") || "Não detectados"}

**Pesos:**
${Array.from(this.data.ux.typography.weights).slice(0, 6).map(w => `\`${w}\``).join(", ") || "Não detectados"}

### Espaçamento
**Paddings comuns:**
${Array.from(this.data.ux.spacing.paddings).slice(0, 10).map(p => `\`${p}\``).join(", ") || "Não detectados"}

**Gaps comuns:**
${Array.from(this.data.ux.spacing.gaps).slice(0, 8).map(g => `\`${g}\``).join(", ") || "Não detectados"}

### Breakpoints (Responsividade)
${Array.from(this.data.ux.breakpoints).slice(0, 6).map(b => `- \`${b}\``).join("\n") || "- Não detectados"}

### Border Radius
${Array.from(this.data.ux.borderRadius).slice(0, 8).map(r => `\`${r}\``).join(", ") || "Não detectados"}

### Shadows
${Array.from(this.data.ux.shadows).slice(0, 5).map(s => `- \`${s}\``).join("\n") || "- Não detectadas"}

### Transições
${Array.from(this.data.ux.transitions).slice(0, 6).map(t => `- \`${t}\``).join("\n") || "- Não detectadas"}

### Z-Index
${Array.from(this.data.ux.zIndex).slice(0, 8).map(z => `\`${z}\``).join(", ") || "Não detectados"}

### Ícones
**Biblioteca:** \`${this.data.ux.icons.library || "Não detectada"}\`

**Ícones utilizados:**
${Array.from(this.data.ux.icons.used).slice(0, 30).map(i => `\`${i}\``).join(", ") || "Não detectados"}

---

## 🧩 COMPONENTES

${this.data.ux.components.length > 0 ? `
| Seletor | Arquivo |
|---------|---------|
${this.data.ux.components.slice(0, 20).map(c => `| \`${c.selector}\` | ${c.file} |`).join("\n")}
` : "Nenhum componente padrão detectado."}

---

## ⚠️ PONTOS CRÍTICOS

### Arquivos Mais Importados (NÃO ALTERAR SEM CUIDADO)
${this.data.criticalFiles?.length > 0 ? 
  this.data.criticalFiles.map(f => `- \`${f.file}\` (usado por ${f.importedBy} arquivos)`).join("\n") : 
  "- Nenhum arquivo crítico detectado"}

### Módulos Core do Sistema
${this.data.modules.backend.filter(m => 
  m.path.includes("middleware") || m.path.includes("config") || m.path.includes("app")
).slice(0, 10).map(m => `- \`${m.path}\``).join("\n") || "- Não detectados"}

### Funções Globais (window.*)
${this.getWindowExports().map(e => `- \`${e}\``).join("\n") || "- Nenhuma detectada"}

---

## 📋 DÉBITOS TÉCNICOS

${this.data.technicalDebt.length > 0 ? `
| Tipo | Arquivo | Linha | Descrição |
|------|---------|-------|-----------|
${this.data.technicalDebt.slice(0, 20).map(d => 
  `| ${d.type} | ${d.file} | ${d.line} | ${d.text.substring(0, 50)}${d.text.length > 50 ? "..." : ""} |`
).join("\n")}
${this.data.technicalDebt.length > 20 ? `\n*... e mais ${this.data.technicalDebt.length - 20} itens*` : ""}
` : "✅ Nenhum TODO/FIXME encontrado."}

---

## 🏆 REGRAS DE OURO

### Antes de Alterar Qualquer Arquivo:
1. **SOLICITAR** o arquivo original completo
2. **ANALISAR** linha por linha
3. **IDENTIFICAR** todas as dependências
4. **VERIFICAR** quais arquivos referenciam este
5. **SÓ ENTÃO** propor alterações mínimas

### Ao Criar Novos Componentes:
1. **USAR** as variáveis CSS existentes (\`--primary\`, \`--bg-*\`, etc.)
2. **MANTER** os border-radius padrão do projeto
3. **SEGUIR** os breakpoints existentes para responsividade
4. **UTILIZAR** a mesma biblioteca de ícones
5. **PRESERVAR** o padrão de nomenclatura de classes

### Ao Modificar APIs:
1. **VERIFICAR** quais frontends consomem o endpoint
2. **MANTER** compatibilidade retroativa
3. **DOCUMENTAR** mudanças no contrato

### ❌ NUNCA FAZER:
- Alterar arquivo sem ver o original
- Modificar IDs/classes sem verificar uso
- Remover funções sem mapear dependências
- Reescrever código que funciona
- Assumir que arquivo é independente
- Mudar cores primárias sem solicitação
- Alterar estrutura de rotas sem necessidade

---

## 🔄 ATUALIZAÇÃO

Para regenerar este documento:
\`\`\`bash
node project-dna.js
\`\`\`

---

*🧬 Documento gerado pelo PROJECT DNA v2.0*
*Cole este conteúdo nas instruções do projeto para manter a IA alinhada com os padrões.*
*Regenere sempre que houver mudanças estruturais significativas no projeto.*
`;
  }

  // ===== HELPERS DE GERAÇÃO =====
  
  generateFolderTree() {
    const folders = Array.from(this.data.folders).sort();
    const tree = [];
    
    folders.slice(0, 30).forEach(folder => {
      const depth = folder.split(path.sep).length - 1;
      const indent = "  ".repeat(depth);
      const name = path.basename(folder);
      tree.push(`${indent}📁 ${name}/`);
    });

    if (folders.length > 30) {
      tree.push(`  ... e mais ${folders.length - 30} pastas`);
    }

    return tree.join("\n") || "Estrutura não disponível";
  }

  generateDataFlowSection() {
    const flows = [];

    this.data.modules.frontend.forEach(mod => {
      if (mod.apiCalls && mod.apiCalls.length > 0) {
        flows.push(`**${mod.path}** chama:\n${mod.apiCalls.slice(0, 5).map(api => `  - \`${api}\``).join("\n")}`);
      }
    });

    return flows.slice(0, 15).join("\n\n") || "Nenhum fluxo detectado automaticamente.";
  }

  getWindowExports() {
    const exports = [];
    
    for (const [filePath, fileInfo] of this.data.files) {
      if (fileInfo.analysis?.exports) {
        fileInfo.analysis.exports
          .filter(e => e.startsWith("window."))
          .forEach(e => exports.push(`${e} (${filePath})`));
      }
    }

    return exports.slice(0, 15);
  }

  generateModesSection() {
    let md = "";
    const admin = this.data.systemModes.admin;
    const participante = this.data.systemModes.participante;

    // Se detectou os dois modos
    if (admin.detected && participante.detected) {
      md += `Este sistema opera em **dois modos distintos**:\n\n`;
      md += `| Aspecto | 👨‍💼 MODO ADMIN | 👤 MODO APP (Participante) |\n`;
      md += `|---------|--------------|---------------------------|\n`;
      md += `| **Propósito** | Gestão e administração | Uso pelo usuário final |\n`;
      md += `| **Acesso** | Restrito (administradores) | Público (usuários cadastrados) |\n`;
      md += `| **Path** | \`${admin.path || "/admin"}\` | \`${participante.path || "/participante"}\` |\n`;
      md += `| **Módulos** | ${admin.modules.length} | ${participante.modules.length} |\n\n`;
    }

    // Detalhe do modo ADMIN
    if (admin.detected) {
      md += `### 👨‍💼 MODO ADMIN\n\n`;
      md += `**Descrição:** ${admin.description}\n\n`;
      md += `**Path base:** \`${admin.path}\`\n\n`;
      
      if (admin.features.size > 0) {
        md += `**Funcionalidades:**\n`;
        md += Array.from(admin.features).map(f => `- ${f}`).join("\n");
        md += "\n\n";
      }

      if (admin.modules.length > 0) {
        md += `**Módulos Detectados:**\n`;
        md += `| Módulo | Arquivo | Tipo |\n`;
        md += `|--------|---------|------|\n`;
        
        // Agrupar por nome único
        const uniqueModules = new Map();
        admin.modules.forEach(m => {
          if (!uniqueModules.has(m.name)) {
            uniqueModules.set(m.name, m);
          }
        });

        Array.from(uniqueModules.values()).slice(0, 15).forEach(m => {
          md += `| ${m.name} | \`${m.file}\` | ${m.type} |\n`;
        });
        md += "\n";
      }
    }

    // Detalhe do modo PARTICIPANTE/APP
    if (participante.detected) {
      md += `### 👤 MODO APP (Participante)\n\n`;
      md += `**Descrição:** ${participante.description}\n\n`;
      md += `**Path base:** \`${participante.path}\`\n\n`;
      
      if (participante.features.size > 0) {
        md += `**Funcionalidades:**\n`;
        md += Array.from(participante.features).map(f => `- ${f}`).join("\n");
        md += "\n\n";
      }

      if (participante.modules.length > 0) {
        md += `**Módulos Detectados:**\n`;
        md += `| Módulo | Arquivo | Tipo |\n`;
        md += `|--------|---------|------|\n`;
        
        const uniqueModules = new Map();
        participante.modules.forEach(m => {
          if (!uniqueModules.has(m.name)) {
            uniqueModules.set(m.name, m);
          }
        });

        Array.from(uniqueModules.values()).slice(0, 15).forEach(m => {
          md += `| ${m.name} | \`${m.file}\` | ${m.type} |\n`;
        });
        md += "\n";
      }
    }

    // Se não detectou nenhum modo específico
    if (!admin.detected && !participante.detected) {
      md += `Sistema de modo único (sem separação Admin/App detectada).\n`;
    }

    // Diagrama visual
    if (admin.detected || participante.detected) {
      md += `### 📊 Diagrama de Modos\n\n`;
      md += "```\n";
      md += "┌─────────────────────────────────────────────────────────────┐\n";
      md += "│                        SISTEMA                              │\n";
      md += "├─────────────────────────────┬───────────────────────────────┤\n";
      
      if (admin.detected && participante.detected) {
        md += "│      👨‍💼 MODO ADMIN          │      👤 MODO APP              │\n";
        md += "│                             │                               │\n";
        md += `│  Path: ${(admin.path || "/admin").padEnd(18)} │  Path: ${(participante.path || "/participante").padEnd(19)} │\n`;
        md += "│                             │                               │\n";
        const adminFeats = Array.from(admin.features).slice(0, 3);
        const appFeats = Array.from(participante.features).slice(0, 3);
        for (let i = 0; i < 3; i++) {
          const af = adminFeats[i] || "";
          const pf = appFeats[i] || "";
          md += `│  • ${af.padEnd(22)} │  • ${pf.padEnd(24)} │\n`;
        }
      } else if (admin.detected) {
        md += "│                    👨‍💼 MODO ADMIN                          │\n";
        md += `│                    Path: ${admin.path}                      │\n`;
      } else if (participante.detected) {
        md += "│                    👤 MODO APP                             │\n";
        md += `│                    Path: ${participante.path}               │\n`;
      }
      
      md += "├─────────────────────────────┴───────────────────────────────┤\n";
      md += "│                     🔧 BACKEND (API)                        │\n";
      md += `│                     ${this.data.apiRoutes.length} rotas detectadas                       │\n`;
      md += "│                     MongoDB + Express                       │\n";
      md += "└─────────────────────────────────────────────────────────────┘\n";
      md += "```\n";
    }

    return md;
  }
}

// ===== EXECUÇÃO =====
const dna = new ProjectDNA();
const targetPath = process.argv[2] || "./";

dna.analyze(targetPath).catch(console.error);

export default ProjectDNA;
