// ux-analyzer.js
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UXPatternAnalyzer {
    constructor() {
        this.patterns = {
            colors: {
                primary: new Set(),
                backgrounds: new Set(),
                text: new Set(),
                borders: new Set(),
                shadows: new Set(),
                gradients: new Set(),
            },
            typography: {
                fonts: new Set(),
                sizes: new Set(),
                weights: new Set(),
            },
            spacing: {
                paddings: new Set(),
                margins: new Set(),
                gaps: new Set(),
            },
            components: {
                cards: [],
                buttons: [],
                forms: [],
                modals: [],
            },
            animations: {
                transitions: new Set(),
                durations: new Set(),
            },
            layout: {
                displays: new Set(),
                flexPatterns: [],
                gridPatterns: [],
            },
            borderRadius: new Set(),
            zIndex: new Set(),
        };

        this.fileCount = 0;
        this.cssVariables = {};
    }

    async analyzeProject(startPath = ".") {
        console.log("🔍 Iniciando análise do projeto...\n");

        // Analisar arquivos
        await this.scanDirectory(startPath);

        // Gerar documento
        const document = this.generateDocument();

        // Salvar documento
        await fs.writeFile("UX_PATTERNS.md", document);
        console.log("\n✅ Documento gerado: UX_PATTERNS.md");

        return document;
    }

    async scanDirectory(dirPath) {
        try {
            const items = await fs.readdir(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = await fs.stat(fullPath);

                // Ignorar diretórios específicos
                if (stat.isDirectory()) {
                    if (
                        ![
                            "node_modules",
                            ".git",
                            "dist",
                            "build",
                            ".next",
                        ].includes(item)
                    ) {
                        await this.scanDirectory(fullPath);
                    }
                } else {
                    // Processar arquivos
                    const ext = path.extname(item).toLowerCase();
                    if (
                        [
                            ".html",
                            ".css",
                            ".scss",
                            ".js",
                            ".jsx",
                            ".tsx",
                            ".vue",
                        ].includes(ext)
                    ) {
                        await this.analyzeFile(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Erro ao escanear ${dirPath}:`, error.message);
        }
    }

    async analyzeFile(filePath) {
        try {
            const content = await fs.readFile(filePath, "utf8");
            const ext = path.extname(filePath).toLowerCase();

            console.log(`📄 Analisando: ${filePath}`);
            this.fileCount++;

            // Extrair CSS variables
            this.extractCSSVariables(content);

            // Análise específica por tipo de arquivo
            if ([".css", ".scss"].includes(ext)) {
                this.analyzeCSSContent(content);
            } else if ([".html"].includes(ext)) {
                this.analyzeHTMLContent(content);
                this.analyzeInlineStyles(content);
            } else if ([".js", ".jsx", ".tsx", ".vue"].includes(ext)) {
                this.analyzeJSContent(content);
            }
        } catch (error) {
            console.error(`Erro ao analisar ${filePath}:`, error.message);
        }
    }

    extractCSSVariables(content) {
        const varPattern = /--[\w-]+:\s*([^;]+);/g;
        let match;

        while ((match = varPattern.exec(content)) !== null) {
            const varName = match[0].split(":")[0].trim();
            const varValue = match[1].trim();
            this.cssVariables[varName] = varValue;

            // Categorizar variável
            if (varName.includes("color") || varName.includes("bg")) {
                this.patterns.colors.backgrounds.add(varValue);
            } else if (varName.includes("text")) {
                this.patterns.colors.text.add(varValue);
            } else if (varName.includes("border")) {
                this.patterns.colors.borders.add(varValue);
            } else if (varName.includes("shadow")) {
                this.patterns.colors.shadows.add(varValue);
            } else if (
                varName.includes("spacing") ||
                varName.includes("padding")
            ) {
                this.patterns.spacing.paddings.add(varValue);
            } else if (varName.includes("margin")) {
                this.patterns.spacing.margins.add(varValue);
            } else if (varName.includes("radius")) {
                this.patterns.borderRadius.add(varValue);
            }
        }
    }

    analyzeCSSContent(content) {
        // Cores
        const colorPatterns = [
            /color:\s*([^;]+);/gi,
            /background-color:\s*([^;]+);/gi,
            /background:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)(?:;|\s)/gi,
            /border(?:-\w+)?:\s*\d+px\s+\w+\s+([^;]+);/gi,
        ];

        colorPatterns.forEach((pattern, index) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const value = match[1].trim();
                if (index === 0) this.patterns.colors.text.add(value);
                else if (index <= 2)
                    this.patterns.colors.backgrounds.add(value);
                else this.patterns.colors.borders.add(value);
            }
        });

        // Gradientes
        const gradientPattern =
            /background(?:-image)?:\s*(linear-gradient|radial-gradient)[^;]+;/gi;
        let match;
        while ((match = gradientPattern.exec(content)) !== null) {
            this.patterns.colors.gradients.add(
                match[0].split(":")[1].trim().replace(";", ""),
            );
        }

        // Box shadows
        const shadowPattern = /box-shadow:\s*([^;]+);/gi;
        while ((match = shadowPattern.exec(content)) !== null) {
            this.patterns.colors.shadows.add(match[1].trim());
        }

        // Tipografia
        const fontPatterns = {
            family: /font-family:\s*([^;]+);/gi,
            size: /font-size:\s*([^;]+);/gi,
            weight: /font-weight:\s*([^;]+);/gi,
        };

        for (const [key, pattern] of Object.entries(fontPatterns)) {
            while ((match = pattern.exec(content)) !== null) {
                this.patterns.typography[
                    key === "family" ? "fonts" : key + "s"
                ].add(match[1].trim());
            }
        }

        // Espaçamento
        const spacingPatterns = {
            padding: /padding(?:-\w+)?:\s*([^;]+);/gi,
            margin: /margin(?:-\w+)?:\s*([^;]+);/gi,
            gap: /gap:\s*([^;]+);/gi,
        };

        for (const [key, pattern] of Object.entries(spacingPatterns)) {
            while ((match = pattern.exec(content)) !== null) {
                this.patterns.spacing[key + "s"].add(match[1].trim());
            }
        }

        // Border radius
        const radiusPattern = /border-radius:\s*([^;]+);/gi;
        while ((match = radiusPattern.exec(content)) !== null) {
            this.patterns.borderRadius.add(match[1].trim());
        }

        // Animações
        const transitionPattern = /transition:\s*([^;]+);/gi;
        while ((match = transitionPattern.exec(content)) !== null) {
            this.patterns.animations.transitions.add(match[1].trim());
        }

        // Z-index
        const zIndexPattern = /z-index:\s*([^;]+);/gi;
        while ((match = zIndexPattern.exec(content)) !== null) {
            this.patterns.zIndex.add(match[1].trim());
        }

        // Layout patterns
        const displayPattern =
            /display:\s*(flex|grid|block|inline-block|none)/gi;
        while ((match = displayPattern.exec(content)) !== null) {
            this.patterns.layout.displays.add(match[1]);
        }

        // Flex patterns
        if (
            content.includes("display: flex") ||
            content.includes("display:flex")
        ) {
            const flexPattern = /display:\s*flex[^}]*}/gs;
            while ((match = flexPattern.exec(content)) !== null) {
                const block = match[0];
                const flexProps = {
                    direction: block
                        .match(/flex-direction:\s*([^;]+)/)?.[1]
                        ?.trim(),
                    justify: block
                        .match(/justify-content:\s*([^;]+)/)?.[1]
                        ?.trim(),
                    align: block.match(/align-items:\s*([^;]+)/)?.[1]?.trim(),
                    gap: block.match(/gap:\s*([^;]+)/)?.[1]?.trim(),
                };
                if (
                    flexProps.direction ||
                    flexProps.justify ||
                    flexProps.align
                ) {
                    this.patterns.layout.flexPatterns.push(flexProps);
                }
            }
        }

        // Grid patterns
        if (
            content.includes("display: grid") ||
            content.includes("display:grid")
        ) {
            const gridPattern = /display:\s*grid[^}]*}/gs;
            while ((match = gridPattern.exec(content)) !== null) {
                const block = match[0];
                const gridProps = {
                    columns: block
                        .match(/grid-template-columns:\s*([^;]+)/)?.[1]
                        ?.trim(),
                    rows: block
                        .match(/grid-template-rows:\s*([^;]+)/)?.[1]
                        ?.trim(),
                    gap: block.match(/gap:\s*([^;]+)/)?.[1]?.trim(),
                };
                if (gridProps.columns || gridProps.rows) {
                    this.patterns.layout.gridPatterns.push(gridProps);
                }
            }
        }

        // Componentes específicos
        this.extractComponents(content);
    }

    extractComponents(content) {
        // Cards
        const cardPattern = /\.(card|panel|box)[^{]*{[^}]+}/gi;
        let match;
        while ((match = cardPattern.exec(content)) !== null) {
            const block = match[0];
            const cardProps = {
                background: block
                    .match(/background(?:-color)?:\s*([^;]+)/)?.[1]
                    ?.trim(),
                borderRadius: block
                    .match(/border-radius:\s*([^;]+)/)?.[1]
                    ?.trim(),
                boxShadow: block.match(/box-shadow:\s*([^;]+)/)?.[1]?.trim(),
                padding: block.match(/padding:\s*([^;]+)/)?.[1]?.trim(),
            };
            if (Object.values(cardProps).some((v) => v)) {
                this.patterns.components.cards.push(cardProps);
            }
        }

        // Buttons
        const buttonPattern = /\.(btn|button)[^{]*{[^}]+}|button[^{]*{[^}]+}/gi;
        while ((match = buttonPattern.exec(content)) !== null) {
            const block = match[0];
            const buttonProps = {
                background: block
                    .match(/background(?:-color)?:\s*([^;]+)/)?.[1]
                    ?.trim(),
                color: block
                    .match(/(?<!background-)color:\s*([^;]+)/)?.[1]
                    ?.trim(),
                borderRadius: block
                    .match(/border-radius:\s*([^;]+)/)?.[1]
                    ?.trim(),
                padding: block.match(/padding:\s*([^;]+)/)?.[1]?.trim(),
                fontSize: block.match(/font-size:\s*([^;]+)/)?.[1]?.trim(),
            };
            if (Object.values(buttonProps).some((v) => v)) {
                this.patterns.components.buttons.push(buttonProps);
            }
        }

        // Forms
        const formPattern =
            /input[^{]*{[^}]+}|textarea[^{]*{[^}]+}|select[^{]*{[^}]+}/gi;
        while ((match = formPattern.exec(content)) !== null) {
            const block = match[0];
            const formProps = {
                border: block.match(/border:\s*([^;]+)/)?.[1]?.trim(),
                borderRadius: block
                    .match(/border-radius:\s*([^;]+)/)?.[1]
                    ?.trim(),
                padding: block.match(/padding:\s*([^;]+)/)?.[1]?.trim(),
                background: block
                    .match(/background(?:-color)?:\s*([^;]+)/)?.[1]
                    ?.trim(),
            };
            if (Object.values(formProps).some((v) => v)) {
                this.patterns.components.forms.push(formProps);
            }
        }
    }

    analyzeHTMLContent(content) {
        // Extrair classes usadas
        const classPattern = /class="([^"]+)"/gi;
        const classes = new Set();
        let classMatch;

        while ((classMatch = classPattern.exec(content)) !== null) {
            classMatch[1].split(" ").forEach((cls) => classes.add(cls));
        }

        // Identificar frameworks CSS
        const frameworks = {
            bootstrap: ["container", "row", "col-", "btn-primary"],
            tailwind: ["flex", "px-", "py-", "bg-", "text-"],
            bulma: ["columns", "column", "button", "is-primary"],
        };

        for (const [framework, indicators] of Object.entries(frameworks)) {
            if (
                indicators.some((ind) =>
                    Array.from(classes).some((cls) => cls.includes(ind)),
                )
            ) {
                console.log(`  📦 Framework detectado: ${framework}`);
            }
        }
    }

    analyzeInlineStyles(content) {
        const stylePattern = /style="([^"]+)"/gi;
        let styleMatch;

        while ((styleMatch = stylePattern.exec(content)) !== null) {
            const styles = styleMatch[1];

            // Processar estilos inline como CSS
            this.analyzeCSSContent(styles);
        }
    }

    analyzeJSContent(content) {
        // Detectar styled-components ou CSS-in-JS
        if (
            content.includes("styled.") ||
            content.includes("makeStyles") ||
            content.includes("css`")
        ) {
            console.log("  🎨 CSS-in-JS detectado");

            // Extrair estilos de template literals
            const styledPattern = /`([^`]+)`/gs;
            let styledMatch;

            while ((styledMatch = styledPattern.exec(content)) !== null) {
                const possibleCSS = styledMatch[1];
                if (possibleCSS.includes(":") && possibleCSS.includes(";")) {
                    this.analyzeCSSContent(possibleCSS);
                }
            }
        }

        // Detectar Tailwind classes em JSX
        const classNamePattern = /className="([^"]+)"/gi;
        let classNameMatch;
        while ((classNameMatch = classNamePattern.exec(content)) !== null) {
            const classes = classNameMatch[1];
            // Analisar classes Tailwind
            this.analyzeTailwindClasses(classes);
        }
    }

    analyzeTailwindClasses(classes) {
        const classList = classes.split(" ");

        classList.forEach((cls) => {
            // Cores Tailwind
            if (cls.startsWith("bg-")) {
                this.patterns.colors.backgrounds.add(cls);
            } else if (cls.startsWith("text-")) {
                this.patterns.colors.text.add(cls);
            } else if (cls.startsWith("border-")) {
                this.patterns.colors.borders.add(cls);
            }
            // Espaçamento Tailwind
            else if (
                cls.startsWith("p-") ||
                cls.startsWith("px-") ||
                cls.startsWith("py-")
            ) {
                this.patterns.spacing.paddings.add(cls);
            } else if (
                cls.startsWith("m-") ||
                cls.startsWith("mx-") ||
                cls.startsWith("my-")
            ) {
                this.patterns.spacing.margins.add(cls);
            }
            // Border radius Tailwind
            else if (cls.startsWith("rounded")) {
                this.patterns.borderRadius.add(cls);
            }
            // Shadow Tailwind
            else if (cls.includes("shadow")) {
                this.patterns.colors.shadows.add(cls);
            }
        });
    }

    generateDocument() {
        const timestamp = new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const uniqueColors = this.getUniqueColors();

        return `# 🎨 PADRÕES UX DO SISTEMA
# Gerado em: ${timestamp}
# Arquivos analisados: ${this.fileCount}

## 🎨 CORES DO SISTEMA

### CSS Variables Detectadas
${
    Object.entries(this.cssVariables)
        .slice(0, 20)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n") || "- Nenhuma variável CSS encontrada"
}

### Cores Primárias
${
    Array.from(uniqueColors.primary)
        .slice(0, 5)
        .map((c) => `- ${c}`)
        .join("\n") || "- Não identificadas"
}

### Backgrounds
${
    Array.from(this.patterns.colors.backgrounds)
        .slice(0, 10)
        .map((c) => `- ${c}`)
        .join("\n") || "- Não identificados"
}

### Cores de Texto
${
    Array.from(this.patterns.colors.text)
        .slice(0, 10)
        .map((c) => `- ${c}`)
        .join("\n") || "- Não identificadas"
}

### Bordas
${
    Array.from(this.patterns.colors.borders)
        .slice(0, 8)
        .map((c) => `- ${c}`)
        .join("\n") || "- Não identificadas"
}

### Sombras
${
    Array.from(this.patterns.colors.shadows)
        .slice(0, 8)
        .map((c) => `- ${c}`)
        .join("\n") || "- Nenhuma sombra detectada"
}

### Gradientes
${
    Array.from(this.patterns.colors.gradients)
        .slice(0, 5)
        .map((c) => `- ${c}`)
        .join("\n") || "- Nenhum gradiente detectado"
}

## 📐 TIPOGRAFIA

### Fontes
${
    Array.from(this.patterns.typography.fonts)
        .slice(0, 8)
        .map((f) => `- ${f}`)
        .join("\n") || "- Não identificadas"
}

### Tamanhos de Fonte
${
    Array.from(this.patterns.typography.sizes)
        .slice(0, 15)
        .map((s) => `- ${s}`)
        .join("\n") || "- Não identificados"
}

### Pesos de Fonte
${
    Array.from(this.patterns.typography.weights)
        .slice(0, 8)
        .map((w) => `- ${w}`)
        .join("\n") || "- Não identificados"
}

## 🏗️ COMPONENTES

### Cards/Panels
${
    this.patterns.components.cards
        .slice(0, 3)
        .map(
            (c, i) => `
**Card ${i + 1}:**
- Background: ${c.background || "não definido"}
- Border Radius: ${c.borderRadius || "não definido"}
- Box Shadow: ${c.boxShadow || "não definido"}
- Padding: ${c.padding || "não definido"}`,
        )
        .join("\n") || "- Padrão não identificado"
}

### Botões
${
    this.patterns.components.buttons
        .slice(0, 3)
        .map(
            (b, i) => `
**Botão ${i + 1}:**
- Background: ${b.background || "não definido"}
- Color: ${b.color || "não definido"}
- Border Radius: ${b.borderRadius || "não definido"}
- Padding: ${b.padding || "não definido"}
- Font Size: ${b.fontSize || "não definido"}`,
        )
        .join("\n") || "- Padrão não identificado"
}

### Formulários
${
    this.patterns.components.forms
        .slice(0, 3)
        .map(
            (f, i) => `
**Input ${i + 1}:**
- Border: ${f.border || "não definido"}
- Border Radius: ${f.borderRadius || "não definido"}
- Padding: ${f.padding || "não definido"}
- Background: ${f.background || "não definido"}`,
        )
        .join("\n") || "- Padrão não identificado"
}

## 📏 ESPAÇAMENTO

### Paddings Comuns
${
    Array.from(this.patterns.spacing.paddings)
        .slice(0, 15)
        .map((p) => `- ${p}`)
        .join("\n") || "- Não identificados"
}

### Margins Comuns
${
    Array.from(this.patterns.spacing.margins)
        .slice(0, 15)
        .map((m) => `- ${m}`)
        .join("\n") || "- Não identificados"
}

### Gaps
${
    Array.from(this.patterns.spacing.gaps)
        .slice(0, 10)
        .map((g) => `- ${g}`)
        .join("\n") || "- Não identificados"
}

## 🎬 ANIMAÇÕES

### Transições
${
    Array.from(this.patterns.animations.transitions)
        .slice(0, 10)
        .map((t) => `- ${t}`)
        .join("\n") || "- Nenhuma transição detectada"
}

## 🖼️ LAYOUT

### Display Types Utilizados
${
    Array.from(this.patterns.layout.displays)
        .map((d) => `- ${d}`)
        .join("\n") || "- Não identificados"
}

### Padrões Flex
${
    this.patterns.layout.flexPatterns
        .slice(0, 5)
        .map(
            (f, i) => `
**Flex ${i + 1}:**
- Direction: ${f.direction || "row"}
- Justify: ${f.justify || "flex-start"}
- Align: ${f.align || "stretch"}
- Gap: ${f.gap || "não definido"}`,
        )
        .join("\n") || "- Não detectados"
}

### Padrões Grid
${
    this.patterns.layout.gridPatterns
        .slice(0, 5)
        .map(
            (g, i) => `
**Grid ${i + 1}:**
- Columns: ${g.columns || "não definido"}
- Rows: ${g.rows || "não definido"}
- Gap: ${g.gap || "não definido"}`,
        )
        .join("\n") || "- Não detectados"
}

## 🎯 BORDER RADIUS

${
    Array.from(this.patterns.borderRadius)
        .slice(0, 10)
        .map((r) => `- ${r}`)
        .join("\n") || "- Não identificados"
}

## 📊 Z-INDEX

${
    Array.from(this.patterns.zIndex)
        .slice(0, 10)
        .map((z) => `- ${z}`)
        .join("\n") || "- Não identificados"
}

## 📋 REGRAS DE IMPLEMENTAÇÃO

### Cores
1. **SEMPRE** usar as variáveis CSS quando disponíveis
2. **NUNCA** alterar cores primárias sem solicitação
3. **MANTER** consistência com o esquema de cores detectado

### Componentes
1. **PRESERVAR** border-radius dos componentes existentes
2. **MANTER** box-shadows conforme padrão
3. **RESPEITAR** paddings e margins estabelecidos

### Layout
1. **USAR** flexbox/grid conforme padrões detectados
2. **MANTER** gaps e espaçamentos consistentes
3. **PRESERVAR** estrutura de z-index

### Tipografia
1. **UTILIZAR** apenas as fontes já definidas
2. **MANTER** hierarquia de tamanhos
3. **PRESERVAR** pesos de fonte estabelecidos

## ⚠️ OBSERVAÇÕES IMPORTANTES

- Este documento deve ser consultado ANTES de qualquer alteração de UI
- Padrões identificados devem ser mantidos em novos componentes
- Qualquer desvio desses padrões requer aprovação explícita
- Use essas informações como referência primária para manter consistência

## 🔄 ATUALIZAÇÃO

Para atualizar este documento, execute novamente:
\`\`\`bash
node ux-analyzer.js
\`\`\`

---
*Documento gerado automaticamente pelo UX Pattern Analyzer*`;
    }

    getUniqueColors() {
        const primary = new Set();

        // Identificar cores primárias baseado em frequência e contexto
        this.patterns.colors.backgrounds.forEach((color) => {
            if (color.includes("#") || color.includes("rgb")) {
                if (
                    !color.includes("fff") &&
                    !color.includes("000") &&
                    !color.includes("gray")
                ) {
                    primary.add(color);
                }
            }
        });

        return { primary };
    }
}

// Executar análise
async function main() {
    const analyzer = new UXPatternAnalyzer();

    console.log("╔════════════════════════════════════════╗");
    console.log("║     🎨 UX PATTERN ANALYZER 2.0        ║");
    console.log("╚════════════════════════════════════════╝\n");

    try {
        await analyzer.analyzeProject();

        console.log("\n╔════════════════════════════════════════╗");
        console.log("║         ✅ ANÁLISE CONCLUÍDA          ║");
        console.log("╚════════════════════════════════════════╝");
        console.log("\n📄 Arquivo UX_PATTERNS.md criado com sucesso!");
        console.log("📌 Cole o conteúdo nas instruções do projeto.\n");
    } catch (error) {
        console.error("\n❌ Erro durante análise:", error);
    }
}

// Executar
main();

export default UXPatternAnalyzer;
