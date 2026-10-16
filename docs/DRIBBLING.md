# Condução de bola — treino e partida

O domínio de jogabilidade mantém a física e as decisões; os adaptadores 3D/2D apenas desenham e capturam gestos.

## Controles

Arrastar no gramado cria um direcional flutuante. A distância do gesto dosa o ritmo; soltar freia. No computador, WASD ou setas movimentam; Shift acelera. No celular, é possível manter o direcional com um dedo e segurar o botão de aceleração com o outro. Cancelamento de toque, pausa e perda de foco liberam movimento e aceleração.

Acelerar aumenta a velocidade em 30%, reduz a resposta em curvas e alonga o toque na bola. Técnica e velocidade do jogador continuam influenciando controle e deslocamento. Movimento e colisões usam subpassos determinísticos. Animação dos pés e rotação da bola seguem a distância percorrida, evitando corrida parada.

## Treinamento

Três percursos: slalom, cortes e mudanças de direção e zigue-zague. Portões têm duas balizas físicas, numeração, marca no gramado e indicação do próximo trecho. Os cinco portões devem ser vencidos em ordem com bola e jogador próximos; os cones penalizam colisões. Avaliação, treino, pontuação e desenvolvimento continuam ligados às ações realizadas.

## Situação de partida

A condução ocorre na transição ofensiva. Não há cones nem balizas de treino. Dois defensores pressionam a bola, companheiros oferecem referências e os corredores indicam o avanço. Perder a posse encerra a oportunidade sem criar um gol. Completar a progressão prepara a oportunidade de finalização seguinte.

A nova sequência de oportunidades é passe → condução → finalização → falta. A posição física da bola na saída da condução é guardada no resultado da sessão e convertida para a coordenada da finalização; continua válida após salvar/retomar entre ações. A bola ampliada para curva continua aparecendo apenas depois de confirmar mira e força. Nenhum alvo circular foi adicionado ao final da mira.

Sessões antigas com passe → finalização → condução → falta continuam aceitas. Trials são transitórios; o save de carreira não é reescrito. O objetivo permanece uma vertical slice de oportunidades, com adversários simplificados, sem alegar futebol tático completo de onze contra onze.

## Verificação

Testes do domínio cobrem aceleração/frenagem, atributos, circuitos completos, pressão e perda de posse, condução bem-sucedida, continuidade física da bola e retomada de sessões antigas. `npm run test:dribble` usa Chromium para jogar os três circuitos por teclado, testar pausa/cancelamento, passar da condução ao chute, conferir a etapa única de mira/curva e controlar direcional/aceleração com dois dedos no celular. Capturas são feitas no próprio renderer do jogo.

## Corrida analógica, recepção e goleiros
O treino de velocidade aceita o direcional flutuante: intensidade do arrasto determina a fração da velocidade máxima por atributo; soltar desacelera. A troca de faixa desloca fisicamente o atleta com aceleração lateral, e as colisões usam sua posição intermediária. A câmera não salta de faixa. Na condução, técnica também influencia o limite de ritmo com a bola. A animação usa oito poses e cadência ligada à distância, com inclinação lateral moderada.

A prévia de chute cresce com a força, sem alvo na ponta; faltas mostram apenas parte da trajetória. O atributo de finalização/bola parada determina uma dispersão reproduzível por seed. O contato lateral curva para o lado indicado na bola. O controle ampliado é separado da esfera física de raio 11 cm no campo.

Finalizações alternam cruzamento esquerdo, direito e bola quicando. Após confirmar mira e força, a bola chega e a indicação AGORA abre uma janela dependente de técnica. Antecipar ou perder a janela encerra a tentativa sem gol; pausa e inspeção congelam a recepção. Cabeceio, bicicleta e voleio acompanham o tipo de chegada e a altura do contato alimenta a trajetória física. Tentativas erradas podem ser repetidas em treino/avaliação; partidas preservam suas consequências e acertos não oferecem repetição.

Goleiros observam a bola em voo com reação de 180 ms, antecipação curta, velocidade e alcance limitados. A defesa exige encontro físico antes da linha do gol, também nas faltas. Chutes lentos permitem mais recuperação; cantos, altura e curva podem superar o alcance. Não há decisão de defesa garantida no momento do chute. Esta IA continua sendo a do protótipo de oportunidades, sem alegar equivalência integral ao Football Legacy.
