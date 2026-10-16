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
