// 🎯 MAPEADOR COMPLETO DO SISTEMA SUPER CARTOLA MANAGER
// Execute este script no terminal: node system-mapper.js

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SystemMapper {
  constructor() {
    this.fileMap = new Map();
    this.folderStructure = {};
    this.ignoredPaths = [
      "node_modules",
      ".git",
      ".env",
      "dist",
      "build",
      ".cache",
      ".vscode",
      ".idea",
      "coverage",
      ".nyc_output",
      "logs",
    ];
    this.fileTypes = {
      frontend: [".html", ".css", ".js"],
      backend: [".js"],
      config: [".json", ".env", ".yml", ".yaml"],
      docs: [".md", ".txt"],
      assets: [".png", ".jpg", ".ico", ".svg"],
    };
  }

  async mapSystem(rootPath = "./") {
    console.log("🔍 MAPEANDO SISTEMA SUPER CARTOLA MANAGER\n");
    console.log("=".repeat(60));

    await this.scanDirectory(rootPath);
    this.analyzeStructure();
    const report = this.generateSystemReport();

    // Salvar relatório em arquivo markdown na raiz
    const fileName = `system-analysis-${new Date().toISOString().split("T")[0]}.md`;
    const fullPath = path.resolve("./", fileName);

    try {
      fs.writeFileSync(fullPath, report, "utf8");
      console.log(`✅ Relatório salvo com sucesso!`);
      console.log(`📍 Localização: ${fullPath}`);
      console.log(`📄 Nome do arquivo: ${fileName}`);

      // Verificar se arquivo existe
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`📏 Tamanho: ${Math.round(stats.size / 1024)}KB`);
      }

      // Listar alguns arquivos na raiz para referência
      console.log("\n📁 Arquivos na raiz atual:");
      const rootFiles = fs
        .readdirSync("./")
        .filter(
          (f) => f.endsWith(".md") || f.endsWith(".js") || f.endsWith(".json"),
        );
      rootFiles.slice(0, 10).forEach((file) => {
        console.log(`  📄 ${file}`);
      });
    } catch (error) {
      console.error(`❌ Erro ao salvar arquivo: ${error.message}`);
      console.log("\n📄 Exibindo relatório no console:\n");
      console.log(report);
    }

    return fileName;
  }

  async scanDirectory(dirPath, level = 0) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativePath = path.relative("./", fullPath);

        // Ignorar arquivos/pastas ocultos e irrelevantes
        if (this.shouldIgnore(item, relativePath)) continue;

        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          await this.scanDirectory(fullPath, level + 1);
        } else {
          await this.analyzeFile(fullPath, relativePath);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao escanear ${dirPath}:`, error.message);
    }
  }

  shouldIgnore(item, relativePath) {
    // Ignorar arquivos ocultos
    if (item.startsWith(".")) return true;

    // Ignorar pastas específicas
    if (this.ignoredPaths.some((ignored) => relativePath.includes(ignored)))
      return true;

    return false;
  }

  async analyzeFile(fullPath, relativePath) {
    try {
      const ext = path.extname(fullPath);
      const basename = path.basename(fullPath, ext);
      const dirname = path.dirname(relativePath);

      const fileInfo = {
        fullPath,
        relativePath,
        dirname,
        basename,
        extension: ext,
        size: fs.statSync(fullPath).size,
        type: this.getFileType(ext),
        purpose: this.inferPurpose(relativePath, basename),
        content: await this.getFilePreview(fullPath, ext),
      };

      this.fileMap.set(relativePath, fileInfo);
    } catch (error) {
      console.error(`❌ Erro ao analisar ${relativePath}:`, error.message);
    }
  }

  getFileType(extension) {
    for (const [type, extensions] of Object.entries(this.fileTypes)) {
      if (extensions.includes(extension.toLowerCase())) {
        return type;
      }
    }
    return "other";
  }

  inferPurpose(relativePath, basename) {
    const path_lower = relativePath.toLowerCase();
    const base_lower = basename.toLowerCase();

    // Arquivos principais
    if (base_lower === "index") return "🏠 Página principal/Entry point";
    if (base_lower === "app") return "🚀 Aplicação principal";
    if (base_lower === "server") return "🌐 Servidor backend";
    if (base_lower === "main") return "⚡ Arquivo principal";

    // Configurações
    if (base_lower === "package") return "📦 Configuração npm/dependências";
    if (base_lower.includes("config")) return "⚙️ Arquivo de configuração";
    if (base_lower.includes("env")) return "🔧 Variáveis de ambiente";

    // Módulos/Controllers
    if (path_lower.includes("/modules/")) return "🧩 Módulo do sistema";
    if (path_lower.includes("/controllers/")) return "🎮 Controller da API";
    if (path_lower.includes("/routes/")) return "🛣️ Roteamento da API";
    if (path_lower.includes("/services/"))
      return "⚡ Serviço/Lógica de negócio";
    if (path_lower.includes("/models/")) return "📊 Modelo de dados";
    if (path_lower.includes("/middleware/")) return "🔀 Middleware";

    // Frontend específico
    if (base_lower.includes("dashboard"))
      return "📊 Dashboard/Painel principal";
    if (base_lower.includes("sidebar")) return "📋 Menu lateral/Navegação";
    if (base_lower.includes("navigation")) return "🧭 Sistema de navegação";
    if (base_lower.includes("admin")) return "👤 Administração/Gestão";
    if (base_lower.includes("liga")) return "🏆 Funcionalidades de Liga";

    // Funcionalidades específicas
    if (base_lower.includes("artilheiro"))
      return "⚽ Sistema Artilheiro Campeão";
    if (base_lower.includes("luva")) return "🥅 Sistema Luva de Ouro";
    if (base_lower.includes("cartola")) return "🎩 Integração Cartola FC";
    if (base_lower.includes("rodada")) return "📅 Gestão de Rodadas";
    if (base_lower.includes("ranking")) return "🏅 Sistema de Rankings";
    if (base_lower.includes("gols")) return "⚽ Gestão de Gols";

    // Estilos
    if (path_lower.includes("/css/") || path_lower.includes("/styles/"))
      return "🎨 Estilos CSS";

    // Assets
    if (path_lower.includes("/assets/") || path_lower.includes("/img/"))
      return "🖼️ Recursos estáticos";

    // Tipo genérico baseado na extensão
    const ext = path.extname(relativePath).toLowerCase();
    if (ext === ".js") return "📝 Script JavaScript";
    if (ext === ".html") return "📄 Página HTML";
    if (ext === ".css") return "🎨 Folha de estilos";
    if (ext === ".json") return "📋 Dados JSON";
    if (ext === ".md") return "📖 Documentação";

    return "❓ Arquivo genérico";
  }

  async getFilePreview(fullPath, extension) {
    try {
      if (
        ![".js", ".html", ".css", ".json", ".md", ".txt"].includes(
          extension.toLowerCase(),
        )
      ) {
        return null;
      }

      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n");

      // Para arquivos JS, procurar por classes, funções, exports
      if (extension === ".js") {
        const jsInfo = this.analyzeJavaScript(content);
        return {
          lines: lines.length,
          size_kb: Math.round(fs.statSync(fullPath).size / 1024),
          ...jsInfo,
        };
      }

      return {
        lines: lines.length,
        size_kb: Math.round(fs.statSync(fullPath).size / 1024),
        preview: lines.slice(0, 3).join("\n").substring(0, 100) + "...",
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  analyzeJavaScript(content) {
    const info = {
      classes: [],
      functions: [],
      exports: [],
      imports: [],
      apis: [],
    };

    // Procurar classes
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      info.classes = classMatches.map((match) => match.replace("class ", ""));
    }

    // Procurar funções
    const functionMatches = content.match(
      /(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\()/g,
    );
    if (functionMatches) {
      info.functions = functionMatches.slice(0, 5); // Primeiras 5 funções
    }

    // Procurar exports
    const exportMatches = content.match(/export\s+(?:default\s+)?(\w+)/g);
    if (exportMatches) {
      info.exports = exportMatches;
    }

    // Procurar imports
    const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      info.imports = importMatches.slice(0, 3); // Primeiros 3 imports
    }

    // Procurar endpoints de API
    const apiMatches = content.match(/['"`]\/api\/[^'"`]+['"`]/g);
    if (apiMatches) {
      info.apis = [...new Set(apiMatches)].slice(0, 5); // Únicos, primeiros 5
    }

    return info;
  }

  analyzeStructure() {
    const structure = {};

    for (const [relativePath, fileInfo] of this.fileMap.entries()) {
      const parts = relativePath.split(path.sep);
      let current = structure;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { _files: [], _subdirs: {} };
        }
        current = current[part]._subdirs || current[part];
      }

      const filename = parts[parts.length - 1];
      if (!current._files) current._files = [];
      current._files.push({ name: filename, info: fileInfo });
    }

    this.folderStructure = structure;
  }

  generateSystemReport() {
    let report = `# 📊 Análise do Sistema Super Cartola Manager\n\n`;
    report += `**Data da Análise:** ${new Date().toLocaleString("pt-BR")}\n\n`;
    report += `---\n\n`;

    report += this.generateFolderStructureMD();
    report += this.generateCategoryAnalysisMD();
    report += this.generateModuleAnalysisMD();
    report += this.generateStatisticsMD();

    return report;
  }

  generateFolderStructureMD() {
    let md = `## 📁 Estrutura do Sistema\n\n`;

    md += this.printFolderStructureMD(this.folderStructure, 0);

    // Arquivos na raiz
    if (this.folderStructure._files && this.folderStructure._files.length > 0) {
      md += `\n### 📄 Arquivos na Raiz\n\n`;
      for (const file of this.folderStructure._files) {
        const icon = this.getFileIcon(file.info.extension);
        md += `- ${icon} **${file.name}** - ${file.info.purpose}\n`;
      }
    }

    return md + "\n---\n\n";
  }

  printFolderStructureMD(structure, level) {
    let md = "";
    const indent = "  ".repeat(level);

    for (const [name, content] of Object.entries(structure)) {
      if (name === "_files" || name === "_subdirs") continue;

      md += `${indent}- 📁 **${name}/**\n`;

      // Imprimir arquivos na pasta
      if (content._files && content._files.length > 0) {
        for (const file of content._files) {
          const icon = this.getFileIcon(file.info.extension);
          md += `${indent}  - ${icon} **${file.name}** - ${file.info.purpose}\n`;

          if (
            file.info.content &&
            file.info.content.classes &&
            file.info.content.classes.length > 0
          ) {
            md += `${indent}    - 🏗️ Classes: \`${file.info.content.classes.join(", ")}\`\n`;
          }

          if (
            file.info.content &&
            file.info.content.apis &&
            file.info.content.apis.length > 0
          ) {
            md += `${indent}    - 🔗 APIs: \`${file.info.content.apis.join(", ")}\`\n`;
          }
        }
      }

      // Recursão para subpastas
      if (content._subdirs && Object.keys(content._subdirs).length > 0) {
        md += this.printFolderStructureMD(content._subdirs, level + 1);
      }
    }

    return md;
  }

  getFileIcon(extension) {
    const icons = {
      ".js": "📜",
      ".html": "🌐",
      ".css": "🎨",
      ".json": "📋",
      ".md": "📖",
      ".txt": "📝",
      ".png": "🖼️",
      ".jpg": "🖼️",
      ".ico": "🖼️",
    };
    return icons[extension] || "📄";
  }

  generateCategoryAnalysisMD() {
    let md = `## 🔍 Análise por Categoria\n\n`;

    const categories = {
      "Frontend (Cliente)": [],
      "Backend (Servidor)": [],
      Configuração: [],
      Documentação: [],
      Assets: [],
    };

    for (const [path, info] of this.fileMap.entries()) {
      if (
        info.type === "frontend" ||
        path.includes("css") ||
        path.includes("js/modules")
      ) {
        categories["Frontend (Cliente)"].push(info);
      } else if (
        path.includes("routes") ||
        path.includes("controllers") ||
        path.includes("services")
      ) {
        categories["Backend (Servidor)"].push(info);
      } else if (info.type === "config") {
        categories["Configuração"].push(info);
      } else if (info.type === "docs") {
        categories["Documentação"].push(info);
      } else if (info.type === "assets") {
        categories["Assets"].push(info);
      }
    }

    for (const [category, files] of Object.entries(categories)) {
      if (files.length > 0) {
        md += `### ${category} (${files.length} arquivos)\n\n`;
        files.forEach((file) => {
          md += `- 📄 **${file.relativePath}** - ${file.purpose}\n`;
          if (file.content && file.content.size_kb) {
            md += `  - 📏 Tamanho: ${file.content.size_kb}KB | Linhas: ${file.content.lines}\n`;
          }
        });
        md += "\n";
      }
    }

    return md + "---\n\n";
  }

  generateModuleAnalysisMD() {
    let md = `## 🧩 Módulos e Dependências\n\n`;

    const jsFiles = Array.from(this.fileMap.values()).filter(
      (f) => f.extension === ".js",
    );

    // Separar por tipo
    const frontendModules = jsFiles.filter(
      (f) =>
        f.relativePath.includes("js/modules") ||
        f.relativePath.includes("frontend"),
    );
    const backendModules = jsFiles.filter(
      (f) =>
        f.relativePath.includes("routes") ||
        f.relativePath.includes("controllers") ||
        f.relativePath.includes("services"),
    );
    const configModules = jsFiles.filter(
      (f) => f.basename.includes("config") || f.basename.includes("app"),
    );

    if (frontendModules.length > 0) {
      md += `### 🎨 Módulos Frontend\n\n`;
      frontendModules.forEach((file) => {
        md += `#### 📜 ${file.relativePath}\n\n`;
        if (
          file.content &&
          file.content.classes &&
          file.content.classes.length > 0
        ) {
          md += `- **Classes:** \`${file.content.classes.join(", ")}\`\n`;
        }
        if (file.content && file.content.apis && file.content.apis.length > 0) {
          md += `- **APIs utilizadas:** \`${file.content.apis.join(", ")}\`\n`;
        }
        if (
          file.content &&
          file.content.imports &&
          file.content.imports.length > 0
        ) {
          md += `- **Imports:** \`${file.content.imports.join(", ")}\`\n`;
        }
        md += `- **Tamanho:** ${file.content?.size_kb || 0}KB | **Linhas:** ${file.content?.lines || 0}\n\n`;
      });
    }

    if (backendModules.length > 0) {
      md += `### 🔧 Módulos Backend\n\n`;
      backendModules.forEach((file) => {
        md += `#### 📜 ${file.relativePath}\n\n`;
        if (
          file.content &&
          file.content.exports &&
          file.content.exports.length > 0
        ) {
          md += `- **Exports:** \`${file.content.exports.join(", ")}\`\n`;
        }
        if (file.content && file.content.apis && file.content.apis.length > 0) {
          md += `- **Endpoints:** \`${file.content.apis.join(", ")}\`\n`;
        }
        md += `- **Tamanho:** ${file.content?.size_kb || 0}KB | **Linhas:** ${file.content?.lines || 0}\n\n`;
      });
    }

    if (configModules.length > 0) {
      md += `### ⚙️ Módulos de Configuração\n\n`;
      configModules.forEach((file) => {
        md += `#### 📜 ${file.relativePath}\n\n`;
        md += `- **Propósito:** ${file.purpose}\n`;
        md += `- **Tamanho:** ${file.content?.size_kb || 0}KB | **Linhas:** ${file.content?.lines || 0}\n\n`;
      });
    }

    return md + "---\n\n";
  }

  generateStatisticsMD() {
    let md = `## 📊 Estatísticas Gerais\n\n`;

    const stats = {
      totalFiles: this.fileMap.size,
      byType: {},
      bySize: { small: 0, medium: 0, large: 0 },
      totalSize: 0,
    };

    for (const file of this.fileMap.values()) {
      stats.byType[file.type] = (stats.byType[file.type] || 0) + 1;
      stats.totalSize += file.size;

      if (file.size < 5000) stats.bySize.small++;
      else if (file.size < 50000) stats.bySize.medium++;
      else stats.bySize.large++;
    }

    md += `### 📈 Resumo Geral\n\n`;
    md += `| Métrica | Valor |\n`;
    md += `|---------|-------|\n`;
    md += `| **Total de arquivos** | ${stats.totalFiles} |\n`;
    md += `| **Tamanho total** | ${Math.round(stats.totalSize / 1024)} KB |\n`;
    md += `| **Tamanho médio** | ${Math.round(stats.totalSize / stats.totalFiles / 1024)} KB |\n\n`;

    md += `### 📋 Por Tipo de Arquivo\n\n`;
    md += `| Tipo | Quantidade |\n`;
    md += `|------|------------|\n`;
    Object.entries(stats.byType).forEach(([type, count]) => {
      const typeEmoji = {
        frontend: "🎨",
        backend: "🔧",
        config: "⚙️",
        docs: "📖",
        assets: "🖼️",
        other: "❓",
      };
      md += `| ${typeEmoji[type] || "❓"} **${type}** | ${count} |\n`;
    });

    md += `\n### 📏 Por Tamanho de Arquivo\n\n`;
    md += `| Categoria | Quantidade | Descrição |\n`;
    md += `|-----------|------------|----------|\n`;
    md += `| 🟢 **Pequenos** | ${stats.bySize.small} | < 5KB |\n`;
    md += `| 🟡 **Médios** | ${stats.bySize.medium} | 5-50KB |\n`;
    md += `| 🔴 **Grandes** | ${stats.bySize.large} | > 50KB |\n\n`;

    // Análise adicional
    md += `### 🔍 Insights da Arquitetura\n\n`;

    const frontendFiles = Array.from(this.fileMap.values()).filter(
      (f) =>
        f.relativePath.includes("js/modules") ||
        f.relativePath.includes("frontend"),
    ).length;

    const backendFiles = Array.from(this.fileMap.values()).filter(
      (f) =>
        f.relativePath.includes("routes") ||
        f.relativePath.includes("controllers"),
    ).length;

    md += `- **Arquitetura:** ${frontendFiles > 0 && backendFiles > 0 ? "Full-Stack" : frontendFiles > 0 ? "Frontend" : "Backend"}\n`;
    md += `- **Complexidade Frontend:** ${frontendFiles > 10 ? "Alta" : frontendFiles > 5 ? "Média" : "Baixa"} (${frontendFiles} módulos)\n`;
    md += `- **Complexidade Backend:** ${backendFiles > 10 ? "Alta" : backendFiles > 5 ? "Média" : "Baixa"} (${backendFiles} rotas/controllers)\n`;
    md += `- **Modularização:** ${stats.totalFiles > 50 ? "Muito modular" : stats.totalFiles > 20 ? "Bem modular" : "Simples"}\n\n`;

    return md;
  }
}

// Executar mapeamento
const mapper = new SystemMapper();
mapper
  .mapSystem()
  .then((fileName) => {
    console.log(`\n🎉 Análise completa!`);
    console.log(`📖 Procure pelo arquivo: ${fileName}`);
    console.log(
      `💡 Se não encontrar, verifique na pasta atual onde executou o comando.`,
    );

    // Comando para listar arquivos .md
    console.log(`\n🔍 Para encontrar o arquivo, execute:`);
    console.log(`   ls -la *.md`);
    console.log(`   ou`);
    console.log(`   find . -name "*.md" -type f`);
  })
  .catch((error) => {
    console.error("❌ Erro na execução:", error);
  });

export default SystemMapper;
