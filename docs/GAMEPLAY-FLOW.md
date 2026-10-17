# Avaliação, treino e participação na partida

## Entrada automática na base
Novas carreiras começam sem clube, no centro de avaliação. Ao concluir a avaliação, a aplicação usa a média das ações jogadas para procurar uma base compatível: nível esportivo, posição, país, vagas e orçamento. `domain/youth/placement.ts` ordena as opções deterministicamente; `application/career.ts` assina o primeiro contrato, reserva vaga/orçamento e atribui o número. Desempenho maior permite uma base de reputação mais alta, desde que os requisitos sejam atendidos. Idades iniciais 14–16 continuam exclusivamente na base. Não há clube inventado se o pacote não tiver uma opção elegível: o atleta pode continuar treinando e ser avaliado novamente.

Essa escolha automática substitui o seletor manual inicial por pedido do usuário. Carreiras antigas com clube escolhido preservam seu contrato. `startingClubId` continua aceito pela API para compatibilidade; não é enviado pela nova tela de criação. O contrato após a avaliação mantém a etapa do primeiro treino, sem inventar uma sessão realizada; depois desse treino a preparação da estreia é liberada. Trocas de clube durante a carreira mantêm as negociações existentes.

## Avanço dos exercícios
Acertos de treino/avaliação mostram o resultado e avançam após 1,2 s. Pausa, inspeção e perda de visibilidade congelam essa contagem. Erros continuam aguardando a escolha entre repetir e avançar. O botão de avanço manual continua disponível. Uma única função protege o registro contra duplicação por clique/avanço automático. O resumo final mantém a confirmação para aplicar o resultado à carreira. Sair pelo pause guarda as tentativas concluídas.

## Nota e substituição
`domain/match/participation.ts` calcula nota ao vivo entre 3,0 e 10,0, partindo de 6,0. Gols, passes dominados e conduções concluídas somam; interceptações, impedimentos e erros reduzem; uma defesa adversária tem impacto menor que perder um passe. Apenas ações realmente jogadas entram na nota.

Novas promessas entram aos 75 minutos e reservas aos 60. Confiança de pelo menos 70 e três notas recentes com média 7 permitem começar como titular, com previsão de 60 ou 75 minutos conforme energia. O treinador pode tirar o atleta após pelo menos duas oportunidades por desgaste, desempenho ruim ou no fim da minutagem planejada. A ordem das oportunidades não é alterada; as posteriores à saída ficam sem execução e não recebem gols/notas fictícios. O resumo explica o motivo e os minutos efetivos alimentam desenvolvimento, confiança, competições e gasto de energia.

O corte continua sendo uma partida por oportunidades, com minuto de participação ligado ao progresso delas. Não se apresenta como simulação contínua de onze contra onze, nem permite ao protagonista controlar substituições de todo o elenco.

## Banco e comissão técnica
Cada estádio deriva bancos de seu porte, fachada e seed: estrutura aberta de madeira, cobertura leve, abrigo ou vidro; sete, nove ou doze assentos por lado, fora das linhas do campo. Reservas usam uma pose sentada própria, com textura compacta, sem manter atlas completos de corrida para cada assento. O treinador usa roupa neutra casual, polo ou agasalho com marca de cores do clube, calça, prancheta e gestos. Perfil por clube/categoria é estável. Não foram confirmados nomes ou aparência exata dos treinadores atuais: os personagens são simulados.

A chamada do banco mostra o jogador sentado e o minuto de entrada. A entrada é salva antes de liberar os controles. Após substituição, o jogador retorna sentado. A inspeção do banco está disponível pelo pause. Equipe e treinador do protagonista ocupam o banco visitante quando aplicável. Árbitro, assistentes, monitor e revisão de VAR não aparecem no treino/avaliação.

## Persistência e verificação
O save de carreira mantém o schema v3. Sessões de campo v1 podem ter `participation` opcional, validada contra suas ações ao retomar; sessões antigas sem esse campo continuam aceitas. Entrada e saída não são registradas duas vezes.

`npm test` cobre ranking inicial, orçamento/vagas, rolagem, recepção, nota, minutagem, decisões do treinador e retomada. `npm run test:career-flow` exercita a transição final da avaliação para o contrato automático, sucesso que avança, erro que aguarda, banco, entrada/retomada, substituição e minutos reais. `npm run test:staff` verifica treino/avaliação sem arbitragem e partida com arbitragem/revisão, além da inspeção do banco em tela de celular.
