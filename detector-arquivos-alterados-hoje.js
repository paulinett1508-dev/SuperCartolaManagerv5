// DETECTOR DE ARQUIVOS ALTERADOS HOJE - REPLIT
// Script para identificar arquivos modificados na data atual

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data de hoje (ajustar timezone se necessário)
const hoje = new Date();
hoje.setHours(0, 0, 0, 0); // Início do dia

const amanha = new Date(hoje);
amanha.setDate(amanha.getDate() + 1); // Início de amanhã

console.log(
  `Buscando arquivos alterados em: ${hoje.toLocaleDateString("pt-BR")}`,
);
console.log(`Range: ${hoje.toISOString()} até ${amanha.toISOString()}`);

// Função para verificar se arquivo foi modificado hoje
function foiModificadoHoje(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const modificado = stats.mtime;
    return modificado >= hoje && modificado < amanha;
  } catch (err) {
    return false;
  }
}

// Função recursiva para escanear diretórios
function escanearDiretorio(dirPath, arquivosAlterados = []) {
  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      // Pular node_modules, .git, backups gigantes
      if (
        item === "node_modules" ||
        item === ".git" ||
        item === ".replit" ||
        item.startsWith(".")
      ) {
        continue;
      }

      if (stats.isDirectory()) {
        escanearDiretorio(fullPath, arquivosAlterados);
      } else if (stats.isFile()) {
        if (foiModificadoHoje(fullPath)) {
          const tamanho = (stats.size / 1024).toFixed(1); // KB
          const modificado = stats.mtime.toLocaleString("pt-BR");

          arquivosAlterados.push({
            arquivo: path.relative(process.cwd(), fullPath),
            tamanho: `${tamanho} KB`,
            modificado: modificado,
            timestamp: stats.mtime,
          });
        }
      }
    }
  } catch (err) {
    console.warn(`Erro ao escanear ${dirPath}: ${err.message}`);
  }

  return arquivosAlterados;
}

// Executar escaneamento
const arquivosAlterados = escanearDiretorio(process.cwd());

// Ordenar por hora de modificação (mais recente primeiro)
arquivosAlterados.sort((a, b) => b.timestamp - a.timestamp);

console.log("\n" + "=".repeat(80));
console.log(
  `ARQUIVOS ALTERADOS HOJE (${arquivosAlterados.length} encontrados)`,
);
console.log("=".repeat(80));

if (arquivosAlterados.length === 0) {
  console.log("Nenhum arquivo foi alterado hoje.");
} else {
  // Agrupar por extensão
  const porExtensao = {};

  arquivosAlterados.forEach((arquivo) => {
    const ext = path.extname(arquivo.arquivo) || "sem extensão";
    if (!porExtensao[ext]) porExtensao[ext] = [];
    porExtensao[ext].push(arquivo);
  });

  // Mostrar resumo por extensão
  console.log("\n📊 RESUMO POR TIPO:");
  Object.keys(porExtensao).forEach((ext) => {
    console.log(`${ext}: ${porExtensao[ext].length} arquivos`);
  });

  console.log("\n📋 LISTA DETALHADA:");
  console.log("-".repeat(80));

  arquivosAlterados.forEach((arquivo, index) => {
    console.log(`${index + 1}. ${arquivo.arquivo}`);
    console.log(
      `   Tamanho: ${arquivo.tamanho} | Modificado: ${arquivo.modificado}`,
    );
    console.log("");
  });

  // Gerar comando git para reverter (se estiver em git)
  console.log("\n🔧 COMANDOS PARA REVERSÃO:");
  console.log("-".repeat(80));

  console.log("\n# Para reverter TODOS os arquivos de hoje:");
  arquivosAlterados.forEach((arquivo) => {
    console.log(`git checkout HEAD~1 "${arquivo.arquivo}"`);
  });

  console.log("\n# Para ver diferenças antes de reverter:");
  arquivosAlterados.forEach((arquivo) => {
    console.log(`git diff HEAD~1 "${arquivo.arquivo}"`);
  });

  console.log("\n# Para criar backup antes de reverter:");
  console.log("mkdir backup-hoje");
  arquivosAlterados.forEach((arquivo) => {
    const backupPath = path.join("backup-hoje", path.basename(arquivo.arquivo));
    console.log(`cp "${arquivo.arquivo}" "${backupPath}"`);
  });
}

console.log("\n" + "=".repeat(80));
console.log("Script concluído. Execute comandos com cuidado!");
console.log("=".repeat(80));
