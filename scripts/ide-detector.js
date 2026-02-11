/**
 * IDE Detector - Sistema Híbrido de Skills
 *
 * Detecta automaticamente qual IDE está sendo usado para rotear skills corretamente.
 * Suporta: VS Code, Cursor, Windsurf, Antigravity
 *
 * @module ide-detector
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {'vscode' | 'cursor' | 'windsurf' | 'antigravity' | 'unknown'} IDEType
 */

/**
 * Verifica se um arquivo ou diretório existe
 * @param {string} filePath - Caminho para verificar
 * @returns {boolean}
 */
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

/**
 * Verifica variáveis de ambiente com prefixo
 * @param {string} prefix - Prefixo a buscar (ex: 'VSCODE_')
 * @returns {boolean}
 */
function hasEnvPrefix(prefix) {
    return Object.keys(process.env).some(key => key.startsWith(prefix));
}

/**
 * Detecta VS Code
 * Indicadores:
 * - Variáveis env: VSCODE_*, TERM_PROGRAM='vscode'
 * - Diretórios: .vscode/, .claude/ (com confirmação adicional)
 *
 * @param {string} rootPath - Diretório raiz do projeto
 * @returns {number} Score de confiança (0-100)
 */
function detectVSCode(rootPath) {
    let score = 0;

    // Variáveis env (alta confiança)
    if (hasEnvPrefix('VSCODE_')) score += 50;
    if (process.env.TERM_PROGRAM === 'vscode') score += 40;

    // Diretórios (confiança média)
    if (fileExists(path.join(rootPath, '.vscode'))) score += 20;
    if (fileExists(path.join(rootPath, '.claude')) && !hasEnvPrefix('CURSOR_')) {
        score += 15; // .claude/ pode ser VS Code ou Cursor
    }

    return Math.min(score, 100);
}

/**
 * Detecta Cursor
 * Indicadores:
 * - Variáveis env: CURSOR_*, TERM_PROGRAM='Cursor'
 * - Arquivos: .cursorrules
 * - Diretório: .claude/ (compartilhado com VS Code)
 *
 * @param {string} rootPath - Diretório raiz do projeto
 * @returns {number} Score de confiança (0-100)
 */
function detectCursor(rootPath) {
    let score = 0;

    // Variáveis env (alta confiança)
    if (hasEnvPrefix('CURSOR_')) score += 50;
    if (process.env.TERM_PROGRAM === 'Cursor') score += 40;

    // Arquivo .cursorrules (indicador forte)
    if (fileExists(path.join(rootPath, '.cursorrules'))) score += 30;

    // Diretório .claude/ (confiança baixa, compartilhado)
    if (fileExists(path.join(rootPath, '.claude'))) score += 10;

    return Math.min(score, 100);
}

/**
 * Detecta Windsurf
 * Indicadores:
 * - Variáveis env: WINDSURF_*, CODEIUM_*
 * - Processos: windsurf, codeium (análise de parent process)
 *
 * @param {string} rootPath - Diretório raiz do projeto
 * @returns {number} Score de confiança (0-100)
 */
function detectWindsurf(rootPath) {
    let score = 0;

    // Variáveis env (alta confiança)
    if (hasEnvPrefix('WINDSURF_')) score += 50;
    if (hasEnvPrefix('CODEIUM_')) score += 40;

    // Análise de processos (se disponível)
    try {
        const ppid = process.ppid;
        if (ppid) {
            // Em Linux, podemos verificar /proc/[ppid]/comm
            const procPath = `/proc/${ppid}/comm`;
            if (fileExists(procPath)) {
                const comm = fs.readFileSync(procPath, 'utf8').trim().toLowerCase();
                if (comm.includes('windsurf') || comm.includes('codeium')) {
                    score += 30;
                }
            }
        }
    } catch (error) {
        // Ignora erros de leitura de processos
    }

    // Windsurf pode usar .windsurf/ no futuro
    if (fileExists(path.join(rootPath, '.windsurf'))) score += 20;

    return Math.min(score, 100);
}

/**
 * Detecta Antigravity
 * Indicadores:
 * - Variáveis env: ANTIGRAVITY_*, AG_*
 * - Estrutura: .agent/, agent.config.json
 *
 * @param {string} rootPath - Diretório raiz do projeto
 * @returns {number} Score de confiança (0-100)
 */
function detectAntigravity(rootPath) {
    let score = 0;

    // Variáveis env (alta confiança)
    if (hasEnvPrefix('ANTIGRAVITY_')) score += 50;
    if (hasEnvPrefix('AG_')) score += 30;

    // Estrutura de diretórios (indicador forte)
    const agentDir = path.join(rootPath, '.agent');
    if (fileExists(agentDir)) score += 40;

    // Arquivos de configuração Antigravity
    if (fileExists(path.join(rootPath, 'agent.config.json'))) score += 30;
    if (fileExists(path.join(agentDir, 'config.json'))) score += 20;

    return Math.min(score, 100);
}

/**
 * Detecta qual IDE está sendo usado
 *
 * Estratégia: Sistema de scoring
 * - Cada detector retorna score 0-100
 * - IDE com maior score vence (threshold mínimo: 30)
 * - Se nenhum atingir threshold → 'unknown'
 *
 * @param {string} [rootPath=process.cwd()] - Diretório raiz do projeto
 * @returns {IDEType} Tipo de IDE detectado
 */
function detectIDE(rootPath = process.cwd()) {
    const THRESHOLD = 30; // Score mínimo para detecção válida

    const scores = {
        vscode: detectVSCode(rootPath),
        cursor: detectCursor(rootPath),
        windsurf: detectWindsurf(rootPath),
        antigravity: detectAntigravity(rootPath)
    };

    // Encontra IDE com maior score
    let maxScore = 0;
    let detectedIDE = 'unknown';

    for (const [ide, score] of Object.entries(scores)) {
        if (score > maxScore && score >= THRESHOLD) {
            maxScore = score;
            detectedIDE = ide;
        }
    }

    return detectedIDE;
}

/**
 * Retorna scores detalhados de todos os detectores (útil para debug)
 *
 * @param {string} [rootPath=process.cwd()] - Diretório raiz do projeto
 * @returns {Object} Objeto com scores de cada IDE
 */
function getDetectionScores(rootPath = process.cwd()) {
    return {
        vscode: detectVSCode(rootPath),
        cursor: detectCursor(rootPath),
        windsurf: detectWindsurf(rootPath),
        antigravity: detectAntigravity(rootPath)
    };
}

export {
    detectIDE,
    getDetectionScores,
    // Exporta detectores individuais para testes
    detectVSCode,
    detectCursor,
    detectWindsurf,
    detectAntigravity
};
