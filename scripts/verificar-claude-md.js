#!/usr/bin/env node
/**
 * Verificador de CLAUDE.md
 *
 * Verifica se todas as skills e commands estão documentados no CLAUDE.md.
 * Executado automaticamente pelo hook pre-push.
 *
 * Uso:
 *   node scripts/verificar-claude-md.js          # Verifica e mostra warnings
 *   node scripts/verificar-claude-md.js --strict # Falha se houver pendências
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const isStrict = process.argv.includes('--strict');

console.log('🔍 Verificando CLAUDE.md...\n');

// Ler CLAUDE.md
const claudeMdPath = path.join(rootDir, 'CLAUDE.md');
const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8').toLowerCase();

let warnings = [];
let errors = [];

// 1. Verificar Skills
console.log('📦 Verificando Skills...');
const skillsDir = path.join(rootDir, '.claude', 'skills');

if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    skills.forEach(skill => {
        if (!claudeMd.includes(skill.toLowerCase())) {
            warnings.push(`Skill "${skill}" não documentada no CLAUDE.md`);
            console.log(`   ⚠️  Skill "${skill}" - NÃO DOCUMENTADA`);
        } else {
            console.log(`   ✅ Skill "${skill}" - OK`);
        }
    });
} else {
    console.log('   ℹ️  Pasta .claude/skills não encontrada');
}

// 2. Verificar Commands
console.log('\n🎯 Verificando Commands...');
const commandsDir = path.join(rootDir, '.claude', 'commands');

if (fs.existsSync(commandsDir)) {
    const commands = fs.readdirSync(commandsDir)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));

    commands.forEach(cmd => {
        // Busca por /comando ou pelo nome do comando
        const cmdLower = cmd.toLowerCase();
        if (!claudeMd.includes(`/${cmdLower}`) && !claudeMd.includes(cmdLower)) {
            warnings.push(`Command "/${cmd}" não documentado no CLAUDE.md`);
            console.log(`   ⚠️  Command "/${cmd}" - NÃO DOCUMENTADO`);
        } else {
            console.log(`   ✅ Command "/${cmd}" - OK`);
        }
    });
} else {
    console.log('   ℹ️  Pasta .claude/commands não encontrada');
}

// 3. Resumo
console.log('\n' + '='.repeat(50));

if (warnings.length === 0) {
    console.log('\n✅ CLAUDE.md está atualizado!\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${warnings.length} pendência(s) encontrada(s):\n`);
    warnings.forEach(w => console.log(`   - ${w}`));

    console.log('\n💡 Para corrigir, adicione a documentação em CLAUDE.md');
    console.log('   Seções: "Project Skills" e "Slash Commands"\n');

    if (isStrict) {
        console.log('❌ Push bloqueado (modo --strict)\n');
        process.exit(1);
    } else {
        console.log('ℹ️  Continuando push (modo warning)...\n');
        process.exit(0);
    }
}
