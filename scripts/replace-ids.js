import fs from "fs";
import path from "path";

const rootDir = "./"; // Diretório raiz do projeto (ajuste se necessário)

const replacements = [
  {
    oldId: "684d821cf1a7ae16d1f89572",
    newId: "684d821cf1a7ae16d1f89572",
  },
  {
    oldId: "684cb1c8af923da7c7df51de",
    newId: "684cb1c8af923da7c7df51de",
  },
];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let originalContent = content;

    replacements.forEach(({ oldId, newId }) => {
      const regex = new RegExp(oldId, "g");
      content = content.replace(regex, newId);
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Atualizado: ${filePath}`);
    }
  } catch (err) {
    console.error(`Erro ao processar arquivo ${filePath}:`, err.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (
      fullPath.endsWith(".js") ||
      fullPath.endsWith(".json") ||
      fullPath.endsWith(".html") ||
      fullPath.endsWith(".txt")
    ) {
      replaceInFile(fullPath);
    }
  });
}

walkDir(rootDir);
console.log("Substituição concluída.");
