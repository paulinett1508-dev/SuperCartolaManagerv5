// SCRIPT DE BACKUP COMPLETO DO SISTEMA - PONTO DE PARTIDA
// Data/Hora: 01/09/2025, 16:46 (Horário de São Paulo - UTC-3)
// Status: Sistema funcional - Ranking Geral corrigido

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do backup
const BACKUP_CONFIG = {
  dataHora: new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }),
  versao: "v3.0.1-estavel",
  status: "FUNCIONAL - Ranking Geral corrigido",
  diretorioBackup: `backup-${new Date().toISOString().slice(0, 10)}-16h46`,
  arquivosExcluir: [
    "node_modules",
    ".git",
    ".replit",
    "backup-*",
    "*.log",
    "package-lock.json",
  ],
};

console.log(`Iniciando backup completo do sistema`);
console.log(`Data/Hora: ${BACKUP_CONFIG.dataHora}`);
console.log(`Versão: ${BACKUP_CONFIG.versao}`);
console.log(`Status: ${BACKUP_CONFIG.status}`);

// Função para verificar se deve excluir arquivo/pasta
function deveExcluir(itemPath) {
  const nomeItem = path.basename(itemPath);

  return BACKUP_CONFIG.arquivosExcluir.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace("*", ".*"));
      return regex.test(nomeItem);
    }
    return nomeItem === pattern;
  });
}

// Função recursiva para copiar arquivos
function copiarRecursivo(origem, destino) {
  try {
    // Verificar se deve excluir
    if (deveExcluir(origem)) {
      console.log(`Excluindo: ${path.relative(process.cwd(), origem)}`);
      return;
    }

    const stats = fs.statSync(origem);

    if (stats.isDirectory()) {
      // Criar diretório de destino
      if (!fs.existsSync(destino)) {
        fs.mkdirSync(destino, { recursive: true });
      }

      // Copiar conteúdo do diretório
      const items = fs.readdirSync(origem);
      items.forEach((item) => {
        const origemItem = path.join(origem, item);
        const destinoItem = path.join(destino, item);
        copiarRecursivo(origemItem, destinoItem);
      });
    } else if (stats.isFile()) {
      // Copiar arquivo
      fs.copyFileSync(origem, destino);
      console.log(`Copiado: ${path.relative(process.cwd(), origem)}`);
    }
  } catch (error) {
    console.warn(`Erro ao copiar ${origem}: ${error.message}`);
  }
}

// Criar estrutura do backup
function criarBackup() {
  const diretorioOrigem = process.cwd();
  const diretorioDestino = path.join(
    diretorioOrigem,
    BACKUP_CONFIG.diretorioBackup,
  );

  console.log(`Criando backup em: ${diretorioDestino}`);

  // Criar diretório principal do backup
  if (!fs.existsSync(diretorioDestino)) {
    fs.mkdirSync(diretorioDestino, { recursive: true });
  }

  // Copiar todos os arquivos
  copiarRecursivo(diretorioOrigem, diretorioDestino);

  // Criar arquivo de informações do backup
  const infoBackup = {
    timestamp: new Date().toISOString(),
    dataHoraBrasil: BACKUP_CONFIG.dataHora,
    versao: BACKUP_CONFIG.versao,
    status: BACKUP_CONFIG.status,
    totalArquivos: contarArquivos(diretorioDestino),
    estrutura: mapearEstrutura(diretorioDestino),
    correcoesAplicadas: [
      "cartolaController.js - Fallback para getMercadoStatus",
      "export-pontos-corridos.js - Removido comentário HTML",
      "Sistema de ranking restaurado",
    ],
    observacoes: [
      "Sistema funcionando completamente",
      "Ranking Geral soma rodadas corretamente",
      "APIs de integração com fallback",
      "Módulos de exportação funcionais",
    ],
  };

  const infoPath = path.join(diretorioDestino, "BACKUP-INFO.json");
  fs.writeFileSync(infoPath, JSON.stringify(infoBackup, null, 2));

  // Criar README do backup
  const readmePath = path.join(diretorioDestino, "README-BACKUP.md");
  const readmeContent = `# BACKUP SISTEMA SUPER CARTOLA MANAGER

## Informações do Backup
- **Data/Hora:** ${BACKUP_CONFIG.dataHora}
- **Versão:** ${BACKUP_CONFIG.versao}
- **Status:** ${BACKUP_CONFIG.status}
- **Total de Arquivos:** ${infoBackup.totalArquivos}

## Correções Aplicadas
${infoBackup.correcoesAplicadas.map((c) => `- ${c}`).join("\n")}

## Para Restaurar este Backup
\`\`\`bash
# 1. Fazer backup do estado atual (opcional)
mv workspace workspace-atual

# 2. Restaurar este backup
cp -r ${BACKUP_CONFIG.diretorioBackup} workspace

# 3. Instalar dependências
cd workspace
npm install

# 4. Iniciar sistema
npm start
\`\`\`

## Estado do Sistema
${infoBackup.observacoes.map((o) => `- ${o}`).join("\n")}

## Ponto de Partida Estabelecido
Este backup representa um sistema estável e completamente funcional.
Use como referência para futuras alterações.
`;

  fs.writeFileSync(readmePath, readmeContent);

  return {
    diretorio: diretorioDestino,
    totalArquivos: infoBackup.totalArquivos,
    tamanho: calcularTamanho(diretorioDestino),
  };
}

// Função para contar arquivos no backup
function contarArquivos(diretorio) {
  let total = 0;

  function contar(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          contar(fullPath);
        } else {
          total++;
        }
      });
    } catch (err) {
      // Ignorar erros de permissão
    }
  }

  contar(diretorio);
  return total;
}

// Função para mapear estrutura (primeiros 2 níveis)
function mapearEstrutura(diretorio) {
  const estrutura = {};

  try {
    const items = fs.readdirSync(diretorio);
    items.forEach((item) => {
      const fullPath = path.join(diretorio, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        estrutura[item] = { tipo: "diretorio", arquivos: [] };
        try {
          const subItems = fs.readdirSync(fullPath);
          estrutura[item].arquivos = subItems.slice(0, 10); // Primeiros 10
          if (subItems.length > 10) {
            estrutura[item].arquivos.push(
              `... e mais ${subItems.length - 10} itens`,
            );
          }
        } catch (err) {
          estrutura[item].arquivos = ["Erro ao ler conteúdo"];
        }
      } else {
        estrutura[item] = {
          tipo: "arquivo",
          tamanho: `${(stats.size / 1024).toFixed(1)} KB`,
        };
      }
    });
  } catch (err) {
    return { erro: err.message };
  }

  return estrutura;
}

// Função para calcular tamanho do backup
function calcularTamanho(diretorio) {
  let tamanhoTotal = 0;

  function calcular(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          calcular(fullPath);
        } else {
          tamanhoTotal += stats.size;
        }
      });
    } catch (err) {
      // Ignorar erros
    }
  }

  calcular(diretorio);
  return `${(tamanhoTotal / 1024 / 1024).toFixed(1)} MB`;
}

// Executar backup
try {
  console.log("\n" + "=".repeat(80));
  console.log("INICIANDO BACKUP COMPLETO DO SISTEMA");
  console.log("=".repeat(80));

  const resultado = criarBackup();

  console.log("\n" + "=".repeat(80));
  console.log("BACKUP CONCLUÍDO COM SUCESSO");
  console.log("=".repeat(80));
  console.log(`Diretório: ${resultado.diretorio}`);
  console.log(`Total de Arquivos: ${resultado.totalArquivos}`);
  console.log(`Tamanho: ${resultado.tamanho}`);
  console.log(`Data/Hora: ${BACKUP_CONFIG.dataHora}`);
  console.log(`Status: ${BACKUP_CONFIG.status}`);

  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("1. Verificar se sistema está funcionando");
  console.log("2. Testar Ranking Geral");
  console.log("3. Validar módulos de exportação");
  console.log("4. Este backup serve como ponto de partida estável");

  console.log("\n🔄 PARA RESTAURAR ESTE BACKUP:");
  console.log(`cp -r ${BACKUP_CONFIG.diretorioBackup}/* ./`);
} catch (error) {
  console.error("ERRO NO BACKUP:", error.message);
  process.exit(1);
}
