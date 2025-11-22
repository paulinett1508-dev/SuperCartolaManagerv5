**ALTERAÇÕES CRÍTICAS E MINUCIOSAS NO MODO DO APP DO PARTICIPANTE.**

1. Crie uma solução robusta de cache, para que o sistema não recarregue todas as informações de cada módulo, a cada refresh feito. Lembrando que o sistema usa o MongoDB para armazenar as informações pertinentes. Isso vale para o modo admin e o modo do app do participante  
2. Crie um botão “Home” para que quando o usuário quiser, volte sempre pra tela de Boas Vindas. CORREÇÃO: Esse botão precisa ficar no header, discreto e bem posicionado  
3. Não faça com que o arrasta-solta que por padrão se dá um refresh, volte pra tela de bem vindo e sim dê o refresh na tela que estiver em evidência.  
4. Olhando para os cards da tela de Bem Vindo, atualize com as informações pertinentes, pois o sistema não traz as informações ainda. Além disso, implemente também os pontos abaixo:  
   4.1 Card “Sua posição”, deduzo que seja a posição no Ranking Geral, então altere o nome para “Ranking Geral”  
   4.2. Se a ideia é fazer um overview do usuario conectado nessa tela de bem vindo, então traga dados pertinentes e focado de cada módulo presente, do usuário logado.  
5. No card inferior “Navegue pelo Menu”, substitua por algo super relevante pra o usuário: informações do time do coração do usuário logado, pesquisados em sites pertinentes e com informações públicas do time.

6. **OPÇÃO EXTRATO**  
   6.1. existe um botão de refresh que está mal posicionado e feio.  
   6.2. O modal que dispara ao clicar nos cards “TUDO QUE GANHOU” e “TUDO QUE PERDEU” é totalmente incompatível com o estilo para telas verticais, no celular.  
   NOVA SOLICITAÇÃO: ajustar melhor a tabela com o detalhamento do fluxo financeiro. Tá percorrendo a tela mto para a direita.

     
7. **OPÇÃO Classificação , alterar nome para RANKING GERAL**  
   7.1. Nesta opção, destaque visualmente e elegantemente as 3 primeiras posições, onde o primeiro será o grande campeão. Faça com que, apenas nas 3 primeiras posições, ao clicar no círculo que traz a posição, traga informações dessa premiação, que é:   
   CAMPEÃO R$ 1.000,00  
   2º LUGAR: R$     700,00

3º LUGAR : R$    400,00  
CORREÇÕES: a coluna time está trazendo N/D

* a mensagem formato window é mto amadora e traga as 3 premiações descritas. Repita para o segundo colocado e para o terceiro colocado a mesma alteração  
* retire a coluna Vitórias  
    
  7.2. Retire a coluna Media, e na coluna Pontos coloque casas decimais e de milhar

8. **OPÇÃO “MINHAS RODADAS”**  
   8.1. Altere o nome “MINHAS RODADAS” para “RODADAS” em cada card disponibilizado, retire o texto “32 times” de cada card e modifique visualmente, seguindo a mesma lógica que é presente em admin, ou seja, coloque a fonte de verde quando o participante tiver entrado na zona de bônus, a fonte branca quando não tiver ganhado nada naquela rodada e de vermelho qdo tiver sido da zona de ônus. Incremente esse destaque visual e, qdo o participante tiver sido MITO ou MICO, destaque no card.  
   8.2. ao clicar num card de uma rodada, cheque a coluna FINANCEIRO pois os valores estão incorretos (o correto é o formato como está no módulo admin)  
   8.3. na coluna pontos, traga em formato de casa decimal e milhar em vez de ponto.  
   Observe como a tabela é mostrada no modo admin, toda a parte visual e elegante e de integração visual com quem explora o app. Reproduza a ideia no modo participante (exemplo: destaque para as zonas de bônus, neutra, ônus, o mico da rodada, o mito da rodada me etc)  
     
9. **OPÇÃO TOP 10**  
   9.1. o módulo Top10 (mico e mito), precisa espelhar exatamente o que tem no modo admin, trazendo toda a compatibilidade de como precisa ser visualizado com compatibilidade em telas verticais.  
     
10. **OPÇÃO MELHOR DO MÊS**  
    10.1. o módulo Melhor do Mês, está bem interessante mostrar o desempenho individual do usuário logado, implemente fazendo com que ao clicar no card, apareça as mesmas informações consolidadas do modo admin (ou seja, informações do geral, inclusive destacando o campeão de cada edição). Ahh e se o usuario logado tiver sido campeão de alguma edição, destaque no card  
      
11. **OPÇÃO PONTOS CORRIDOS**  
      
    11.1no módulo Pontos Corridos, dê mais vida a tabela, com mais destaques visuais, tal qual é demonstrado em admin. Altere o formato numerário para as casas decimais com vírgula, ponto de milhar e etc.  
    E precisa trazer além da Classificação, o modo de visualização de cada rodada disputada. Crie logo abaixo do título “Sistema de Confrontos” os botões “CONFRONTOS” e “CLASSIFICAÇÃO”

12. **OPÇÃO MATA-MATA**  
    12.1 o módulo MATAMATA ainda não traz informações oriundas do admin. Implemente-o.