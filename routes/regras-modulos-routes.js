import express from 'express';
import RegraModulo from '../models/RegraModulo.js';
import mongoose from 'mongoose';

const router = express.Router();

// Módulos padrão com conteúdo inicial em linguagem leiga
const MODULOS_DEFAULT = [
    {
        modulo: 'banco',
        titulo: 'Banco (Ranking da Rodada)',
        icone: 'account_balance',
        cor: '#ff5500',
        ordem: 1,
        conteudo_html: `<h3>💰 Como funciona o Banco?</h3>
<p>Toda rodada, os participantes são ranqueados pela pontuação que fizeram no Cartola FC. Dependendo da sua posição nesse ranking, você <strong>ganha</strong>, <strong>perde</strong> ou fica <strong>neutro</strong> financeiramente.</p>
<ul>
<li><strong>Zona de Ganho</strong> (primeiros colocados): Você recebe dinheiro no seu saldo! Quanto melhor a posição, mais ganha.</li>
<li><strong>Zona Neutra</strong> (meio da tabela): Não ganha nem perde. Ficou no zero a zero financeiro.</li>
<li><strong>Zona de Perda</strong> (últimos colocados): Você perde dinheiro do saldo. Quanto pior, mais perde.</li>
</ul>
<p>O <strong>Mito da Rodada</strong> (1º lugar) ganha o valor máximo e o <strong>Mico da Rodada</strong> (último) perde o valor máximo.</p>
<p><em>Resumo: Mande bem na rodada e ganhe dinheiro. Mande mal e perde. Simples assim!</em></p>`
    },
    {
        modulo: 'ranking_geral',
        titulo: 'Ranking Geral',
        icone: 'leaderboard',
        cor: '#8b5cf6',
        ordem: 2,
        conteudo_html: `<h3>🏆 Como funciona o Ranking Geral?</h3>
<p>O Ranking Geral é a classificação acumulada de <strong>todas as rodadas</strong> da temporada. Ele soma todos os seus pontos do Cartola FC ao longo do ano.</p>
<p>É como um campeonato de pontos corridos: quem fizer mais pontos no total da temporada, fica em primeiro.</p>
<h4>Critérios de desempate:</h4>
<ol>
<li>Melhor pontuação na rodada mais recente</li>
<li>Maior número de rodadas disputadas</li>
<li>Ordem alfabética do nome</li>
</ol>
<p><em>Dica: Consistência é tudo! Não adianta arrasar em uma rodada e sumir nas outras.</em></p>`
    },
    {
        modulo: 'top10',
        titulo: 'Top 10 Mitos e Micos',
        icone: 'emoji_events',
        cor: '#f59e0b',
        ordem: 3,
        conteudo_html: `<h3>🌟 Como funciona o Top 10?</h3>
<p>No final da temporada, olhamos <strong>todas as pontuações individuais de todas as rodadas</strong> e separamos:</p>
<ul>
<li><strong>Top 10 Mitos</strong>: As 10 maiores pontuações da temporada inteira. Quem aparece aqui <strong>ganha prêmio</strong>!</li>
<li><strong>Top 10 Micos</strong>: As 10 piores pontuações da temporada. Quem aparece aqui <strong>paga multa</strong>!</li>
</ul>
<p>O 1º Mito ganha o maior prêmio e vai diminuindo até o 10º. O 1º Mico paga a maior multa e vai diminuindo até o 10º.</p>
<p><em>Resumo: Uma única rodada espetacular pode te render um prêmio gordo. Mas cuidado: uma rodada desastrosa pode te custar caro!</em></p>`
    },
    {
        modulo: 'melhor_mes',
        titulo: 'Melhor do Mês',
        icone: 'calendar_month',
        cor: '#06b6d4',
        ordem: 4,
        conteudo_html: `<h3>📅 Como funciona o Melhor do Mês?</h3>
<p>A temporada é dividida em <strong>7 edições mensais</strong>. Em cada edição, quem somar mais pontos nas rodadas daquele período é o <strong>campeão do mês</strong> e leva o prêmio!</p>
<p>No final da temporada, quem acumular <strong>mais títulos mensais</strong> ganha um bônus extra.</p>
<p><em>É como se fosse um "artilheiro" mensal: a cada mês, uma nova chance de brilhar!</em></p>`
    },
    {
        modulo: 'pontos_corridos',
        titulo: 'Pontos Corridos',
        icone: 'sports',
        cor: '#22c55e',
        ordem: 5,
        conteudo_html: `<h3>⚽ Como funciona o Pontos Corridos?</h3>
<p>Funciona igual a um campeonato de futebol! A cada rodada, você é sorteado para enfrentar <strong>um adversário</strong> da liga.</p>
<p>Quem fizer mais pontos no Cartola FC naquela rodada, vence o confronto.</p>
<h4>Pontuação do confronto:</h4>
<ul>
<li><strong>Vitória</strong>: 3 pontos + bônus financeiro</li>
<li><strong>Empate</strong> (diferença menor que 0,3 pts): 1 ponto + valor menor</li>
<li><strong>Derrota</strong>: 0 pontos + multa</li>
<li><strong>Goleada</strong> (diferença maior que 50 pts): Bônus extra de 1 ponto + valor adicional</li>
</ul>
<p><em>Dica: Aqui não basta pontuar bem — você precisa pontuar mais que seu adversário direto!</em></p>`
    },
    {
        modulo: 'mata_mata',
        titulo: 'Mata-Mata',
        icone: 'whatshot',
        cor: '#ef4444',
        ordem: 6,
        conteudo_html: `<h3>🔥 Como funciona o Mata-Mata?</h3>
<p>São torneios de eliminação direta ao longo da temporada (tipo Copa do Mundo). Perdeu? Tá fora!</p>
<h4>Como funciona cada edição:</h4>
<ol>
<li>Os participantes são posicionados em um chaveamento (1º vs último, 2º vs penúltimo...)</li>
<li>A cada rodada, quem fizer mais pontos no Cartola avança</li>
<li>Quem perde, é eliminado</li>
<li>Até sobrar o campeão!</li>
</ol>
<p>São várias edições por temporada, então mesmo se for eliminado em uma, já tem outra vindo.</p>
<p><em>O Mata-Mata é adrenalina pura: uma rodada ruim e você já era!</em></p>`
    },
    {
        modulo: 'artilheiro',
        titulo: 'Artilheiro Campeão',
        icone: 'sports_soccer',
        cor: '#22c55e',
        ordem: 7,
        conteudo_html: `<h3>⚽ Como funciona o Artilheiro Campeão?</h3>
<p>Esse módulo acompanha os <strong>gols dos jogadores que você escalou</strong> no Cartola ao longo de toda a temporada.</p>
<p>A cada rodada, contamos quantos gols seus jogadores fizeram e quantos gols seus jogadores tomaram (se for goleiro/zagueiro).</p>
<p>O ranking é feito pelo <strong>saldo de gols</strong>: gols feitos menos gols sofridos.</p>
<h4>Premiação (final da temporada):</h4>
<ul>
<li>🥇 1º lugar: Maior prêmio</li>
<li>🥈 2º lugar: Prêmio intermediário</li>
<li>🥉 3º lugar: Menor prêmio</li>
</ul>
<p><em>Dica: Escale atacantes artilheiros e goleiros que não tomem gol!</em></p>`
    },
    {
        modulo: 'luva_ouro',
        titulo: 'Luva de Ouro',
        icone: 'sports_handball',
        cor: '#ffd700',
        ordem: 8,
        conteudo_html: `<h3>🧤 Como funciona a Luva de Ouro?</h3>
<p>Esse módulo é exclusivo sobre <strong>goleiros</strong>! A cada rodada, a pontuação do seu goleiro no Cartola é registrada.</p>
<p>O ranking é feito pela <strong>soma dos pontos de todos os seus goleiros</strong> ao longo da temporada.</p>
<h4>O que conta:</h4>
<ul>
<li>Defesas difíceis, penalti defendido, jogo sem sofrer gol = pontos altos</li>
<li>Gols sofridos, cartões = pontos negativos</li>
</ul>
<h4>Premiação (final da temporada):</h4>
<ul>
<li>🥇 1º lugar: Maior prêmio</li>
<li>🥈 2º lugar: Prêmio intermediário</li>
<li>🥉 3º lugar: Menor prêmio</li>
</ul>
<p><em>Dica: Escolher um bom goleiro toda rodada faz diferença enorme aqui!</em></p>`
    },
    {
        modulo: 'capitao_luxo',
        titulo: 'Capitão de Luxo',
        icone: 'military_tech',
        cor: '#8b5cf6',
        ordem: 9,
        conteudo_html: `<h3>👑 Como funciona o Capitão de Luxo?</h3>
<p>No Cartola FC, você escolhe um <strong>capitão</strong> que pontua em dobro. O módulo Capitão de Luxo acompanha a <strong>soma dos pontos dos seus capitães</strong> ao longo da temporada.</p>
<p>Quem acumular mais pontos de capitão no final, vence!</p>
<h4>O que acompanhamos:</h4>
<ul>
<li>Pontuação total dos capitães</li>
<li>Média por rodada</li>
<li>Melhor e pior capitão da temporada</li>
<li>Quantos capitães diferentes você usou</li>
</ul>
<h4>Premiação (final da temporada):</h4>
<ul>
<li>🥇 1º lugar: Maior prêmio</li>
<li>🥈 2º lugar: Prêmio intermediário</li>
<li>🥉 3º lugar: Menor prêmio</li>
</ul>
<p><em>Dica: A escolha do capitão é a decisão mais importante da rodada!</em></p>`
    },
    {
        modulo: 'turno_returno',
        titulo: 'Turno e Returno',
        icone: 'swap_horiz',
        cor: '#3b82f6',
        ordem: 10,
        conteudo_html: `<h3>🔄 Como funciona o Turno e Returno?</h3>
<p>A temporada é dividida em duas metades:</p>
<ul>
<li><strong>1º Turno</strong>: Rodadas 1 a 19</li>
<li><strong>2º Turno (Returno)</strong>: Rodadas 20 a 38</li>
</ul>
<p>Cada metade tem seu próprio <strong>campeão</strong>. E quem vencer os dois turnos leva um <strong>bônus extra</strong>!</p>
<p><em>É como no futebol brasileiro antigo: dois campeões, um por turno, e quem brilhar nos dois leva o melhor prêmio.</em></p>`
    },
    {
        modulo: 'extrato',
        titulo: 'Extrato Financeiro',
        icone: 'receipt_long',
        cor: '#10b981',
        ordem: 11,
        conteudo_html: `<h3>📊 Como funciona o Extrato Financeiro?</h3>
<p>O Extrato é o seu "extrato bancário" dentro da liga. Ele mostra <strong>tudo que você ganhou e perdeu</strong> ao longo da temporada.</p>
<p>Cada módulo que tem impacto financeiro (Banco, Top 10, Melhor do Mês, Pontos Corridos, Mata-Mata, etc.) aparece como uma linha no seu extrato.</p>
<h4>O que você vê:</h4>
<ul>
<li><strong>Créditos</strong> (verde): Dinheiro que entrou</li>
<li><strong>Débitos</strong> (vermelho): Dinheiro que saiu</li>
<li><strong>Saldo</strong>: Seu total atual</li>
</ul>
<p><em>É aqui que você acompanha se está no lucro ou no prejuízo!</em></p>`
    },
    {
        modulo: 'inscricao',
        titulo: 'Inscrição e Renovação',
        icone: 'how_to_reg',
        cor: '#f97316',
        ordem: 0,
        conteudo_html: `<h3>📝 Inscrição e Renovação</h3>
<p>Para participar da liga, é necessário pagar uma <strong>taxa de inscrição</strong> no início de cada temporada.</p>
<h4>Como funciona:</h4>
<ul>
<li>O administrador define o valor da taxa e o prazo para pagamento</li>
<li>Se você já era da liga na temporada passada, basta <strong>renovar</strong></li>
<li>Novos participantes fazem a <strong>inscrição</strong></li>
<li>A taxa pode ser parcelada (se o admin permitir)</li>
</ul>
<p><em>Fique atento ao prazo! Quem não renovar a tempo pode perder a vaga.</em></p>`
    }
];

/**
 * GET /api/regras-modulos/:ligaId
 * Retorna todas as regras de módulos da liga (para o participante)
 */
router.get('/:ligaId', async (req, res) => {
    try {
        const { ligaId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(ligaId)) {
            return res.status(400).json({ sucesso: false, erro: 'Liga ID inválido' });
        }

        const includeInactive = req.query.includeInactive === 'true';
        const filter = includeInactive
            ? { liga_id: ligaId }
            : { liga_id: ligaId, ativo: true };

        let regras = await RegraModulo.find(filter)
            .sort({ ordem: 1 })
            .lean();

        // Merge: completar com defaults faltantes
        const modulosSalvos = new Set(regras.map(r => r.modulo));
        const faltantes = MODULOS_DEFAULT
            .filter(m => !modulosSalvos.has(m.modulo))
            .map(m => ({
                ...m,
                liga_id: ligaId,
                ativo: true,
                _isDefault: true
            }));

        regras = [...regras, ...faltantes].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));

        res.json({ sucesso: true, regras });
    } catch (error) {
        console.error('[REGRAS-MODULOS] Erro ao buscar:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro interno' });
    }
});

/**
 * GET /api/regras-modulos/:ligaId/:modulo
 * Retorna a regra de um módulo específico
 */
router.get('/:ligaId/:modulo', async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        if (!mongoose.Types.ObjectId.isValid(ligaId)) {
            return res.status(400).json({ sucesso: false, erro: 'Liga ID inválido' });
        }

        let regra = await RegraModulo.findOne({ liga_id: ligaId, modulo }).lean();

        if (!regra) {
            const defaultRegra = MODULOS_DEFAULT.find(m => m.modulo === modulo);
            if (defaultRegra) {
                regra = { ...defaultRegra, liga_id: ligaId, ativo: true, _isDefault: true };
            } else {
                return res.status(404).json({ sucesso: false, erro: 'Regra não encontrada' });
            }
        }

        res.json({ sucesso: true, regra });
    } catch (error) {
        console.error('[REGRAS-MODULOS] Erro ao buscar módulo:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro interno' });
    }
});

/**
 * PUT /api/regras-modulos/:ligaId/:modulo
 * Atualiza ou cria a regra de um módulo (admin)
 */
router.put('/:ligaId/:modulo', async (req, res) => {
    try {
        const { ligaId, modulo } = req.params;
        if (!mongoose.Types.ObjectId.isValid(ligaId)) {
            return res.status(400).json({ sucesso: false, erro: 'Liga ID inválido' });
        }

        const { titulo, conteudo_html, icone, cor, ordem, ativo } = req.body;

        const update = {
            liga_id: ligaId,
            modulo,
            atualizado_em: new Date()
        };

        if (titulo !== undefined) update.titulo = titulo;
        if (conteudo_html !== undefined) update.conteudo_html = conteudo_html;
        if (icone !== undefined) update.icone = icone;
        if (cor !== undefined) update.cor = cor;
        if (ordem !== undefined) update.ordem = ordem;
        if (ativo !== undefined) update.ativo = ativo;

        const regra = await RegraModulo.findOneAndUpdate(
            { liga_id: ligaId, modulo },
            { $set: update },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({ sucesso: true, regra });
    } catch (error) {
        console.error('[REGRAS-MODULOS] Erro ao salvar:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro interno' });
    }
});

/**
 * POST /api/regras-modulos/:ligaId/seed
 * Popula regras padrão para a liga (admin)
 */
router.post('/:ligaId/seed', async (req, res) => {
    try {
        const { ligaId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(ligaId)) {
            return res.status(400).json({ sucesso: false, erro: 'Liga ID inválido' });
        }

        const existentes = await RegraModulo.find({ liga_id: ligaId }).lean();
        const modulosExistentes = existentes.map(r => r.modulo);

        const faltantes = MODULOS_DEFAULT.filter(m => !modulosExistentes.includes(m.modulo));

        if (faltantes.length === 0) {
            return res.json({ sucesso: true, mensagem: 'Todas as regras já existem', total: existentes.length });
        }

        const regras = faltantes.map(m => ({
            ...m,
            liga_id: ligaId
        }));

        await RegraModulo.insertMany(regras);

        res.json({ sucesso: true, mensagem: `${regras.length} regras criadas (${existentes.length} já existiam)`, total: existentes.length + regras.length });
    } catch (error) {
        console.error('[REGRAS-MODULOS] Erro ao seed:', error);
        res.status(500).json({ sucesso: false, erro: 'Erro interno' });
    }
});

export default router;
