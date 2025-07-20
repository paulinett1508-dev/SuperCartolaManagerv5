const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const crypto = require("crypto");

const OUTPUT_FILE = "DOCUMENTACAO_COMPLETA.html";
const VERSION_FILE = "doc-version.json";

// Configurações
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.py', '.html', '.css', '.json', '.md', '.txt'];
const IGNORED_DIRS = ['node_modules', '.git', '.history', 'dist', 'build', 'coverage', '.nyc_output'];
const IGNORED_FILES = ['.gitignore', '.DS_Store', 'package-lock.json', 'yarn.lock'];
const SPECIAL_FILES = ['package.json', '.env', '.env.example', 'README.md', 'docker-compose.yml', 'Dockerfile'];

// Funções de versionamento
function generateProjectHash(files) {
  const hash = crypto.createHash('md5');
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const stat = fs.statSync(file);
      hash.update(path.relative(process.cwd(), file));
      hash.update(content);
      hash.update(stat.mtime.toISOString());
    } catch (err) {
      // Arquivo pode ter sido deletado durante o processo
    }
  });
  return hash.digest('hex');
}

function loadVersion() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('⚠️ Erro ao carregar versão anterior:', err.message);
  }
  return null;
}

function saveVersion(versionData) {
  try {
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Erro ao salvar versão:', err.message);
  }
}

function generateVersionInfo(files, dataByFile) {
  const now = new Date();
  const projectHash = generateProjectHash(files);

  // Estatísticas detalhadas
  const stats = {
    totalFiles: files.length,
    jsFiles: files.filter(f => f.endsWith('.js') || f.endsWith('.jsx')).length,
    pyFiles: files.filter(f => f.endsWith('.py')).length,
    htmlFiles: files.filter(f => f.endsWith('.html')).length,
    totalLines: 0,
    totalRoutes: 0,
    totalFunctions: 0,
    totalClasses: 0,
    totalModels: 0
  };

  // Contar linhas e elementos
  Object.values(dataByFile).forEach(data => {
    if (data.content) {
      stats.totalLines += data.content.split('\n').length;
    }

    if (data.analysis) {
      stats.totalRoutes += data.analysis.routes ? data.analysis.routes.length : 0;
      stats.totalFunctions += data.analysis.functions ? data.analysis.functions.length : 0;
      stats.totalClasses += data.analysis.classes ? data.analysis.classes.length : 0;
      stats.totalModels += data.analysis.mongooseModels ? data.analysis.mongooseModels.length : 0;
    }
  });

  return {
    version: `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`,
    timestamp: now.toISOString(),
    projectHash,
    stats,
    generatedBy: 'generate-full-docs.cjs',
    nodeVersion: process.version,
    platform: process.platform
  };
}

function parseJavaScript(code) {
  try {
    // Primeira tentativa: modo module
    return parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "classProperties", "decorators-legacy"],
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      strictMode: false
    });
  } catch (err) {
    try {
      // Segunda tentativa: modo script
      return parser.parse(code, {
        sourceType: "script",
        plugins: ["jsx", "typescript", "classProperties", "decorators-legacy"],
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        strictMode: false
      });
    } catch (err2) {
      try {
        // Terceira tentativa: modo unambiguous
        return parser.parse(code, {
          sourceType: "unambiguous",
          plugins: ["jsx", "typescript", "classProperties", "decorators-legacy"],
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          strictMode: false,
          errorRecovery: true
        });
      } catch (err3) {
        // Log apenas o nome do arquivo para não poluir o console
        return null;
      }
    }
  }
}

function extractJsDoc(comments) {
  if (!comments || comments.length === 0) return null;
  const comment = comments[comments.length - 1];
  if (comment.type === "CommentBlock" && comment.value.startsWith("*")) {
    return comment.value
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .filter(line => line.length > 0)
      .join("\n");
  }
  return null;
}

function extractRoutesFromAST(ast) {
  const routes = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      if (
        callee.type === "MemberExpression" &&
        ["get", "post", "put", "delete", "patch", "use"].includes(callee.property.name)
      ) {
        const method = callee.property.name.toUpperCase();
        const args = path.node.arguments;

        if (args.length > 0 && args[0].type === "StringLiteral") {
          const routePath = args[0].value;
          const jsDoc = extractJsDoc(path.node.leadingComments);

          const middlewares = [];
          for (let i = 1; i < args.length - 1; i++) {
            if (args[i].type === "Identifier") {
              middlewares.push(args[i].name);
            }
          }

          routes.push({ method, routePath, jsDoc, middlewares });
        }
      }
    },
  });

  return routes;
}

function extractFunctionsFromAST(ast) {
  const functions = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id ? path.node.id.name : "anonymous";
      const jsDoc = extractJsDoc(path.node.leadingComments);
      const params = path.node.params.map(p => p.name || p.type);
      const isAsync = path.node.async;

      functions.push({ name, jsDoc, params, isAsync, type: 'function' });
    },
    VariableDeclaration(path) {
      path.node.declarations.forEach((decl) => {
        if (
          decl.init &&
          (decl.init.type === "ArrowFunctionExpression" ||
            decl.init.type === "FunctionExpression")
        ) {
          const name = decl.id.name;
          const jsDoc = extractJsDoc(path.node.leadingComments);
          const params = decl.init.params.map(p => p.name || p.type);
          const isAsync = decl.init.async;

          functions.push({ name, jsDoc, params, isAsync, type: 'arrow' });
        }
      });
    },
  });

  return functions;
}

function extractClassesFromAST(ast) {
  const classes = [];

  traverse(ast, {
    ClassDeclaration(path) {
      const name = path.node.id ? path.node.id.name : "anonymous";
      const jsDoc = extractJsDoc(path.node.leadingComments);

      const methods = [];
      const properties = [];

      path.node.body.body.forEach(member => {
        if (member.type === "MethodDefinition") {
          methods.push({
            name: member.key.name,
            kind: member.kind,
            static: member.static,
            async: member.value.async
          });
        } else if (member.type === "ClassProperty") {
          properties.push({
            name: member.key.name,
            static: member.static
          });
        }
      });

      classes.push({ name, jsDoc, methods, properties });
    },
  });

  return classes;
}

function extractImportsFromAST(ast) {
  const imports = [];

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      const specifiers = path.node.specifiers.map(spec => {
        if (spec.type === "ImportDefaultSpecifier") {
          return { type: "default", name: spec.local.name };
        } else if (spec.type === "ImportSpecifier") {
          return { type: "named", name: spec.local.name, imported: spec.imported.name };
        } else if (spec.type === "ImportNamespaceSpecifier") {
          return { type: "namespace", name: spec.local.name };
        }
      });

      imports.push({ source, specifiers });
    },
    CallExpression(path) {
      if (path.node.callee.name === "require" && path.node.arguments[0]?.type === "StringLiteral") {
        imports.push({
          source: path.node.arguments[0].value,
          type: "require"
        });
      }
    }
  });

  return imports;
}

function extractMongooseModelsFromAST(ast) {
  const models = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      if (
        callee.type === "MemberExpression" &&
        (callee.object.name === "mongoose" ||
          (callee.object.type === "MemberExpression" && callee.object.property.name === "model")) &&
        callee.property.name === "model"
      ) {
        const args = path.node.arguments;
        if (args.length >= 2) {
          const modelName = args[0].value || "unknown";
          let schemaFields = [];

          if (
            args[1].type === "NewExpression" &&
            args[1].callee.name === "Schema"
          ) {
            const schemaArg = args[1].arguments[0];
            if (schemaArg && schemaArg.type === "ObjectExpression") {
              schemaFields = schemaArg.properties.map(prop => {
                const key = prop.key.name || prop.key.value;
                let type = "unknown";

                if (prop.value.type === "Identifier") {
                  type = prop.value.name;
                } else if (prop.value.type === "ObjectExpression") {
                  const typeProp = prop.value.properties.find(p => p.key.name === "type");
                  if (typeProp) {
                    type = typeProp.value.name;
                  }
                }

                return { field: key, type };
              });
            }
          }

          models.push({ modelName, schemaFields });
        }
      }
    },
  });

  return models;
}

function analyzeJavaScript(code) {
  const ast = parseJavaScript(code);
  if (!ast) return null;

  return {
    routes: extractRoutesFromAST(ast),
    functions: extractFunctionsFromAST(ast),
    classes: extractClassesFromAST(ast),
    imports: extractImportsFromAST(ast),
    mongooseModels: extractMongooseModelsFromAST(ast)
  };
}

function analyzePython(code) {
  const imports = [];
  const functions = [];
  const classes = [];

  const importMatches = code.match(/^(import|from)\s+.+$/gm);
  if (importMatches) {
    importMatches.forEach(match => {
      imports.push(match.trim());
    });
  }

  const functionMatches = code.match(/^def\s+(\w+)\s*\([^)]*\):/gm);
  if (functionMatches) {
    functionMatches.forEach(match => {
      const name = match.match(/def\s+(\w+)/)[1];
      functions.push({ name, type: 'function' });
    });
  }

  const classMatches = code.match(/^class\s+(\w+).*:/gm);
  if (classMatches) {
    classMatches.forEach(match => {
      const name = match.match(/class\s+(\w+)/)[1];
      classes.push({ name });
    });
  }

  return { imports, functions, classes };
}

function analyzeHTML(code) {
  const scripts = [];
  const links = [];

  const scriptMatches = code.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
  if (scriptMatches) {
    scriptMatches.forEach((match, index) => {
      scripts.push({ index, content: match });
    });
  }

  const linkMatches = code.match(/<link[^>]*stylesheet[^>]*>/gi);
  if (linkMatches) {
    linkMatches.forEach(match => {
      links.push(match);
    });
  }

  return { scripts, links };
}

function getFileAnalysis(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.js':
    case '.jsx':
      return analyzeJavaScript(content);
    case '.py':
      return analyzePython(content);
    case '.html':
      return analyzeHTML(content);
    default:
      return null;
  }
}

function walkDir(dir, filelist = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file) && !file.startsWith('.')) {
        walkDir(fullPath, filelist);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      const shouldInclude = SUPPORTED_EXTENSIONS.includes(ext) ||
        SPECIAL_FILES.includes(file) ||
        SPECIAL_FILES.includes(path.basename(file));

      if (shouldInclude && !IGNORED_FILES.includes(file)) {
        filelist.push(fullPath);
      }
    }
  });

  return filelist;
}

function generateProjectStructure(files, projectRoot) {
  const structure = {};

  files.forEach(file => {
    const relativePath = path.relative(projectRoot, file);
    const parts = relativePath.split(path.sep);

    let current = structure;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        if (!current.files) current.files = [];
        current.files.push(part);
      } else {
        if (!current.folders) current.folders = {};
        if (!current.folders[part]) current.folders[part] = {};
        current = current.folders[part];
      }
    });
  });

  return structure;
}

function renderStructureHTML(structure, indent = 0) {
  let result = '';

  if (structure.folders) {
    Object.keys(structure.folders).forEach(folder => {
      result += `<div class="folder" style="margin-left: ${indent * 20}px">`;
      result += `<span class="folder-icon">📁</span> ${folder}/`;
      result += `</div>`;
      result += renderStructureHTML(structure.folders[folder], indent + 1);
    });
  }

  if (structure.files) {
    structure.files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      const emoji = {
        '.js': '🟨',
        '.jsx': '⚛️',
        '.py': '🐍',
        '.html': '🌐',
        '.css': '🎨',
        '.json': '📋',
        '.md': '📝'
      }[ext] || '📄';

      result += `<div class="file" style="margin-left: ${indent * 20}px">`;
      result += `<span class="file-icon">${emoji}</span> ${file}`;
      result += `</div>`;
    });
  }

  return result;
}

function escapeHTML(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHTML(dataByFile, projectStructure, projectRoot, versionInfo) {
  const projectName = path.basename(projectRoot);

  const configFiles = [];
  const sourceFiles = [];
  const otherFiles = [];

  Object.keys(dataByFile).forEach(file => {
    if (SPECIAL_FILES.includes(path.basename(file))) {
      configFiles.push(file);
    } else if (['.js', '.jsx', '.py', '.html'].includes(path.extname(file).toLowerCase())) {
      sourceFiles.push(file);
    } else {
      otherFiles.push(file);
    }
  });

  const totalFiles = Object.keys(dataByFile).length;
  const jsFiles = sourceFiles.filter(f => f.endsWith('.js') || f.endsWith('.jsx')).length;
  const pyFiles = sourceFiles.filter(f => f.endsWith('.py')).length;

  let totalRoutes = 0;
  let totalFunctions = 0;
  let totalClasses = 0;

  Object.values(dataByFile).forEach(data => {
    if (data.analysis) {
      totalRoutes += data.analysis.routes ? data.analysis.routes.length : 0;
      totalFunctions += data.analysis.functions ? data.analysis.functions.length : 0;
      totalClasses += data.analysis.classes ? data.analysis.classes.length : 0;
    }
  });

  let navIndex = '';
  navIndex += `<li><a href="#overview">📊 Visão Geral</a></li>`;
  navIndex += `<li><a href="#structure">🏗️ Estrutura</a></li>`;

  if (configFiles.length > 0) {
    navIndex += `<li><a href="#config">⚙️ Configuração</a><ul>`;
    configFiles.forEach(file => {
      const id = file.replace(/[^a-zA-Z0-9]/g, '_');
      navIndex += `<li><a href="#config_${id}">${path.basename(file)}</a></li>`;
    });
    navIndex += `</ul></li>`;
  }

  if (sourceFiles.length > 0) {
    navIndex += `<li><a href="#source">💻 Código Fonte</a><ul>`;
    sourceFiles.forEach(file => {
      const id = file.replace(/[^a-zA-Z0-9]/g, '_');
      navIndex += `<li><a href="#source_${id}">${path.basename(file)}</a></li>`;
    });
    navIndex += `</ul></li>`;
  }

  if (otherFiles.length > 0) {
    navIndex += `<li><a href="#other">📁 Outros</a></li>`;
  }

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentação: ${projectName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
        .container { display: flex; min-height: 100vh; }
        .sidebar { width: 300px; background: #2d3748; color: white; padding: 20px; position: fixed; height: 100vh; overflow-y: auto; }
        .sidebar h2 { color: #63b3ed; margin-bottom: 20px; font-size: 1.2rem; }
        .sidebar ul { list-style: none; }
        .sidebar li { margin-bottom: 5px; }
        .sidebar a { color: #e2e8f0; text-decoration: none; padding: 5px 10px; display: block; border-radius: 4px; transition: background 0.2s; }
        .sidebar a:hover { background: #4a5568; }
        .sidebar ul ul { margin-left: 15px; margin-top: 5px; }
        .sidebar ul ul a { font-size: 0.9rem; color: #cbd5e0; }
        .search-box { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #4a5568; border-radius: 4px; background: #1a202c; color: white; }
        .search-box:focus { outline: none; border-color: #63b3ed; }
        .version-info { background: #1a202c; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; }
        .version-info h3 { color: #63b3ed; margin-bottom: 10px; font-size: 1rem; }
        .version-info .version { color: #68d391; font-weight: bold; }
        .version-info .timestamp { color: #cbd5e0; }
        .version-info .hash { color: #fbb6ce; font-family: monospace; font-size: 0.8rem; }
        .content { flex: 1; margin-left: 300px; padding: 40px; max-width: calc(100% - 300px); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; margin: -40px -40px 40px -40px; border-radius: 0 0 20px 20px; position: relative; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .header .version-badge { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .stat-card h3 { font-size: 2rem; color: #667eea; margin-bottom: 5px; }
        .stat-card p { color: #666; font-size: 0.9rem; }
        .section { background: white; margin-bottom: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .section-header { background: #f7fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; }
        .section-header:hover { background: #edf2f7; }
        .section-header h2 { color: #2d3748; font-size: 1.4rem; display: flex; align-items: center; gap: 10px; }
        .section-header .toggle { margin-left: auto; font-size: 1.2rem; transition: transform 0.2s; }
        .section-content { padding: 20px; }
        .section-content.collapsed { display: none; }
        .file-card { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; overflow: hidden; transition: box-shadow 0.2s; }
        .file-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .file-header { background: #2d3748; color: white; padding: 15px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; display: flex; align-items: center; gap: 10px; }
        .file-content { padding: 20px; }
        .analysis-section { margin-bottom: 20px; }
        .analysis-section h4 { color: #2d3748; margin-bottom: 10px; font-size: 1.1rem; }
        .analysis-list { background: #f7fafc; border-radius: 6px; padding: 15px; }
        .analysis-item { margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px; border-left: 4px solid #667eea; transition: background 0.2s; }
        .analysis-item:hover { background: #f7fafc; }
        .analysis-item:last-child { margin-bottom: 0; }
        .analysis-item strong { color: #2d3748; }
        .analysis-item .description { color: #666; font-size: 0.9rem; margin-top: 5px; }
        pre { background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; line-height: 1.4; max-height: 600px; overflow-y: auto; }
        .project-structure { background: #f7fafc; border-radius: 8px; padding: 20px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; }
        .folder, .file { padding: 3px 0; line-height: 1.4; }
        .folder-icon, .file-icon { margin-right: 8px; }
        .method-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; color: white; margin-right: 8px; }
        .method-GET { background: #38a169; }
        .method-POST { background: #3182ce; }
        .method-PUT { background: #d69e2e; }
        .method-DELETE { background: #e53e3e; }
        .method-PATCH { background: #805ad5; }
        .method-USE { background: #718096; }
        .sidebar a.active { background: #667eea; color: white; }
        .changelog { background: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .changelog h4 { color: #2d3748; margin-bottom: 15px; }
        .changelog-item { background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #38a169; }
        .changelog-item:last-child { margin-bottom: 0; }
        .changelog-item .version { font-weight: bold; color: #38a169; }
        .changelog-item .date { color: #666; font-size: 0.9rem; }
        .changelog-item .changes { margin-top: 8px; color: #4a5568; }
        @media (max-width: 768px) {
            .sidebar { width: 100%; position: relative; height: auto; }
            .content { margin-left: 0; max-width: 100%; }
            .container { flex-direction: column; }
            .stats { grid-template-columns: 1fr; }
            .header .version-badge { position: static; margin-top: 10px; display: inline-block; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h2>📋 Navegação</h2>
            <input type="text" class="search-box" placeholder="Buscar..." id="searchBox">

            <div class="version-info">
                <h3>📋 Versão da Documentação</h3>
                <div class="version">v${versionInfo.version}</div>
                <div class="timestamp">${new Date(versionInfo.timestamp).toLocaleString('pt-BR')}</div>
                <div class="hash">${versionInfo.projectHash.substring(0, 8)}</div>
            </div>

            <ul id="navIndex">${navIndex}</ul>
        </div>
        <div class="content">
            <div class="header">
                <h1>📚 ${projectName}</h1>
                <p>Documentação Completa do Projeto</p>
                <div class="version-badge">v${versionInfo.version}</div>
            </div>

            <section id="overview" class="section">
                <div class="section-header">
                    <h2>📊 Visão Geral</h2>
                </div>
                <div class="section-content">
                    <div class="stats">
                        <div class="stat-card"><h3>${totalFiles}</h3><p>Total de Arquivos</p></div>
                        <div class="stat-card"><h3>${jsFiles}</h3><p>Arquivos JavaScript</p></div>
                        <div class="stat-card"><h3>${pyFiles}</h3><p>Arquivos Python</p></div>
                        <div class="stat-card"><h3>${versionInfo.stats.totalLines.toLocaleString()}</h3><p>Linhas de Código</p></div>
                        <div class="stat-card"><h3>${totalRoutes}</h3><p>Rotas API</p></div>
                        <div class="stat-card"><h3>${totalFunctions}</h3><p>Funções</p></div>
                        <div class="stat-card"><h3>${totalClasses}</h3><p>Classes</p></div>
                        <div class="stat-card"><h3>${versionInfo.stats.totalModels}</h3><p>Modelos</p></div>
                    </div>

                    <div class="changelog">
                        <h4>📝 Informações da Versão</h4>
                        <div class="changelog-item">
                            <div class="version">Versão ${versionInfo.version}</div>
                            <div class="date">Gerada em ${new Date(versionInfo.timestamp).toLocaleString('pt-BR')}</div>
                            <div class="changes">
                                • ${versionInfo.stats.totalFiles} arquivos analisados<br>
                                • ${versionInfo.stats.totalLines.toLocaleString()} linhas de código<br>
                                • Hash do projeto: ${versionInfo.projectHash.substring(0, 16)}<br>
                                • Node.js ${versionInfo.nodeVersion} (${versionInfo.platform})
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="structure" class="section">
                <div class="section-header">
                    <h2>🏗️ Estrutura do Projeto</h2>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="project-structure">${renderStructureHTML(projectStructure)}</div>
                </div>
            </section>`;

  // Arquivos de configuração
  if (configFiles.length > 0) {
    html += `<section id="config" class="section">
                <div class="section-header">
                    <h2>⚙️ Arquivos de Configuração</h2>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">`;

    configFiles.forEach(file => {
      const data = dataByFile[file];
      const id = file.replace(/[^a-zA-Z0-9]/g, '_');

      html += `<div class="file-card" id="config_${id}">
                        <div class="file-header">
                            <span>📄</span>
                            <span>${escapeHTML(file)}</span>
                        </div>
                        <div class="file-content">
                            <pre><code>${escapeHTML(data.content || '')}</code></pre>
                        </div>
                    </div>`;
    });

    html += `</div></section>`;
  }

  // Código fonte
  if (sourceFiles.length > 0) {
    html += `<section id="source" class="section">
                <div class="section-header">
                    <h2>💻 Código Fonte</h2>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">`;

    sourceFiles.forEach(file => {
      const data = dataByFile[file];
      const id = file.replace(/[^a-zA-Z0-9]/g, '_');
      const ext = path.extname(file).toLowerCase();

      html += `<div class="file-card" id="source_${id}">
                        <div class="file-header">
                            <span>${{ '.js': '🟨', '.jsx': '⚛️', '.py': '🐍', '.html': '🌐' }[ext] || '📄'}</span>
                            <span>${escapeHTML(file)}</span>
                        </div>
                        <div class="file-content">`;

      // Análise do arquivo
      if (data.analysis) {
        const analysis = data.analysis;

        if (analysis.imports && analysis.imports.length > 0) {
          html += `<div class="analysis-section">
                                <h4>📦 Imports/Dependências</h4>
                                <div class="analysis-list">`;

          analysis.imports.forEach(imp => {
            if (imp.specifiers && imp.specifiers.length > 0) {
              const specs = imp.specifiers.map(s => s.name || 'unknown').join(', ');
              html += `<div class="analysis-item">
                                        <strong>${escapeHTML(imp.source || 'unknown')}</strong>
                                        <div class="description">${escapeHTML(specs)}</div>
                                    </div>`;
            } else {
              html += `<div class="analysis-item">
                                        <strong>${escapeHTML(imp.source || 'unknown')}</strong>
                                    </div>`;
            }
          });

          html += `</div></div>`;
        }

        if (analysis.routes && analysis.routes.length > 0) {
          html += `<div class="analysis-section">
                                <h4>🛣️ Rotas</h4>
                                <div class="analysis-list">`;

          analysis.routes.forEach(route => {
            html += `<div class="analysis-item">
                                        <span class="method-badge method-${route.method || 'GET'}">${route.method || 'GET'}</span>
                                        <strong>${escapeHTML(route.routePath || '/')}</strong>`;

            if (route.middlewares && route.middlewares.length > 0) {
              html += `<div class="description">Middlewares: ${escapeHTML(route.middlewares.join(', '))}</div>`;
            }

            if (route.jsDoc) {
              html += `<div class="description">${escapeHTML(route.jsDoc)}</div>`;
            }

            html += `</div>`;
          });

          html += `</div></div>`;
        }

        if (analysis.functions && analysis.functions.length > 0) {
          html += `<div class="analysis-section">
                                <h4>🔧 Funções</h4>
                                <div class="analysis-list">`;

          analysis.functions.forEach(func => {
            const asyncLabel = func.isAsync ? 'async ' : '';
            const params = func.params && func.params.length > 0 ? func.params.join(', ') : '';
            const funcName = func.name || 'anonymous';

            html += `<div class="analysis-item">
                                        <strong>${escapeHTML(asyncLabel)}${escapeHTML(funcName)}(${escapeHTML(params)})</strong>`;

            if (func.jsDoc) {
              html += `<div class="description">${escapeHTML(func.jsDoc)}</div>`;
            }

            html += `</div>`;
          });

          html += `</div></div>`;
        }

        if (analysis.classes && analysis.classes.length > 0) {
          html += `<div class="analysis-section">
                                <h4>🏛️ Classes</h4>
                                <div class="analysis-list">`;

          analysis.classes.forEach(cls => {
            const className = cls.name || 'AnonymousClass';
            html += `<div class="analysis-item">
                                        <strong>${escapeHTML(className)}</strong>`;

            if (cls.jsDoc) {
              html += `<div class="description">${escapeHTML(cls.jsDoc)}</div>`;
            }

            if (cls.methods && cls.methods.length > 0) {
              const methodNames = cls.methods.map(m => m.name || 'unknown').join(', ');
              html += `<div class="description">Métodos: ${escapeHTML(methodNames)}</div>`;
            }

            if (cls.properties && cls.properties.length > 0) {
              const propNames = cls.properties.map(p => p.name || 'unknown').join(', ');
              html += `<div class="description">Propriedades: ${escapeHTML(propNames)}</div>`;
            }

            html += `</div>`;
          });

          html += `</div></div>`;
        }

        if (analysis.mongooseModels && analysis.mongooseModels.length > 0) {
          html += `<div class="analysis-section">
                                <h4>🗄️ Modelos Mongoose</h4>
                                <div class="analysis-list">`;

          analysis.mongooseModels.forEach(model => {
            const modelName = model.modelName || 'UnknownModel';
            html += `<div class="analysis-item">
                                        <strong>${escapeHTML(modelName)}</strong>`;

            if (model.schemaFields && model.schemaFields.length > 0) {
              const fields = model.schemaFields.map(f => `${f.field || 'unknown'}(${f.type || 'unknown'})`).join(', ');
              html += `<div class="description">Campos: ${escapeHTML(fields)}</div>`;
            }

            html += `</div>`;
          });

          html += `</div></div>`;
        }
      }

      // Código completo
      html += `<div class="analysis-section">
                                <h4>📝 Código Completo</h4>
                                <pre><code>${escapeHTML(data.content || '')}</code></pre>
                            </div>
                        </div>
                    </div>`;
    });

    html += `</div></section>`;
  }

  // Outros arquivos
  if (otherFiles.length > 0) {
    html += `<section id="other" class="section">
                <div class="section-header">
                    <h2>📁 Outros Arquivos</h2>
                    <span class="toggle">▼</span>
                </div>
                <div class="section-content">`;

    otherFiles.forEach(file => {
      const data = dataByFile[file];
      const id = file.replace(/[^a-zA-Z0-9]/g, '_');

      html += `<div class="file-card" id="other_${id}">
                        <div class="file-header">
                            <span>📄</span>
                            <span>${escapeHTML(file)}</span>
                        </div>
                        <div class="file-content">
                            <pre><code>${escapeHTML(data.content || '')}</code></pre>
                        </div>
                    </div>`;
    });

    html += `</div></section>`;
  }

  // Finalizar HTML
  html += `</div></div>
    <script>
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const navItems = document.querySelectorAll('#navIndex a');

            navItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                const listItem = item.parentElement;

                if (text.includes(searchTerm)) {
                    listItem.style.display = 'block';
                } else {
                    listItem.style.display = 'none';
                }
            });
        });

        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', function() {
                const content = this.nextElementSibling;
                const toggle = this.querySelector('.toggle');

                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    toggle.textContent = '▼';
                } else {
                    content.classList.add('collapsed');
                    toggle.textContent = '▶';
                }
            });
        });

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        window.addEventListener('scroll', function() {
            const sections = document.querySelectorAll('.section');
            const navLinks = document.querySelectorAll('#navIndex a');

            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                const sectionHeight = section.offsetHeight;

                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });
    </script>
</body>
</html>`;

  return html;
}

function main() {
  const projectRoot = process.cwd();
  const files = walkDir(projectRoot);

  console.log(`🔍 Analisando ${files.length} arquivos...`);

  // Verificar se há mudanças
  const previousVersion = loadVersion();
  const currentHash = generateProjectHash(files);

  if (previousVersion && previousVersion.projectHash === currentHash) {
    console.log(`✅ Projeto não alterado desde a última versão (${previousVersion.version})`);
    console.log(`📄 Documentação atual: ${OUTPUT_FILE}`);
    console.log(`💡 Para forçar regeneração, delete o arquivo ${VERSION_FILE}`);
    return;
  }

  const dataByFile = {};
  let processedCount = 0;
  let errorCount = 0;
  const errorFiles = [];

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(projectRoot, file);
      const analysis = getFileAnalysis(file, content);

      dataByFile[relativePath] = {
        content,
        analysis
      };

      processedCount++;
      console.log(`✅ [${processedCount}/${files.length}] ${relativePath}`);
    } catch (err) {
      errorCount++;
      errorFiles.push({ file: path.relative(projectRoot, file), error: err.message });
      console.warn(`⚠️ Erro ao processar ${path.relative(projectRoot, file)}: ${err.message}`);
    }
  });

  console.log('\n📊 Gerando documentação HTML...');

  // Gerar informações de versão
  const versionInfo = generateVersionInfo(files, dataByFile);

  // Verificar se houve mudanças significativas
  if (previousVersion) {
    const changes = [];
    if (versionInfo.stats.totalFiles !== previousVersion.stats.totalFiles) {
      changes.push(`Arquivos: ${previousVersion.stats.totalFiles} → ${versionInfo.stats.totalFiles}`);
    }
    if (versionInfo.stats.totalLines !== previousVersion.stats.totalLines) {
      changes.push(`Linhas: ${previousVersion.stats.totalLines.toLocaleString()} → ${versionInfo.stats.totalLines.toLocaleString()}`);
    }
    if (versionInfo.stats.totalFunctions !== previousVersion.stats.totalFunctions) {
      changes.push(`Funções: ${previousVersion.stats.totalFunctions} → ${versionInfo.stats.totalFunctions}`);
    }
    if (versionInfo.stats.totalRoutes !== previousVersion.stats.totalRoutes) {
      changes.push(`Rotas: ${previousVersion.stats.totalRoutes} → ${versionInfo.stats.totalRoutes}`);
    }

    if (changes.length > 0) {
      console.log('\n📈 Mudanças detectadas:');
      changes.forEach(change => console.log(`   • ${change}`));
    }
  }

  const projectStructure = generateProjectStructure(files, projectRoot);
  const html = generateHTML(dataByFile, projectStructure, projectRoot, versionInfo);

  fs.writeFileSync(OUTPUT_FILE, html, "utf-8");
  saveVersion(versionInfo);

  console.log('\n🎉 Documentação completa gerada!');
  console.log(`📄 Arquivo: ${OUTPUT_FILE}`);
  console.log(`🔖 Versão: ${versionInfo.version}`);
  console.log(`📊 Total de arquivos: ${Object.keys(dataByFile).length}`);
  console.log(`📝 Total de linhas: ${versionInfo.stats.totalLines.toLocaleString()}`);
  console.log(`✅ Processados com sucesso: ${processedCount}`);

  if (errorCount > 0) {
    console.log(`⚠️ Arquivos com erro: ${errorCount}`);
    console.log('\n📝 Arquivos problemáticos:');
    errorFiles.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error.split('\n')[0]}`);
    });
    console.log('\n💡 Esses arquivos foram incluídos na documentação apenas com o código fonte.');
  }

  console.log('\n🌐 Abra o arquivo HTML no navegador para visualizar');
  console.log(`💾 Informações de versão salvas em: ${VERSION_FILE}`);
}

main();