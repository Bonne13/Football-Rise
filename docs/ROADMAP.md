# Roadmap

## Fase 0 — Fundação
- Estrutura TypeScript.
- Testes automatizados.
- Estado versionado de save.
- RNG com seed.
- Dados fictícios mínimos para desenvolvimento.

## Fase 1 — Vertical slice da base
- Criar jogador.
- Escolher posição.
- Avaliação de fundamentos.
- OVR inicial por pesos da posição.
- POT interno e estimativa observável.
- Recrutamento por clubes da base.
- Primeiro contrato.
- Papel inicial no elenco.

**Pronto quando:** é possível começar um save e chegar ao primeiro jogo sem editar dados manualmente.

## Fase 2 — Partida e progressão
- Preparação pré-jogo.
- Minutos conforme papel/confiança.
- Sistema de oportunidades jogáveis.
- Chute, passe, condução/drible e bolas paradas.
- Nota por atuação.
- XP/pontos de desenvolvimento.
- Confiança, moral, energia e forma.

## Fase 3 — Mundo e competições
- Calendário.
- Ligas/tabelas.
- Copas.
- Resultados simulados.
- Estatísticas de jogadores de IA.
- Promoção/rebaixamento onde aplicável.
- Persistência entre temporadas.

## Fase 4 — Mercado global
- Necessidades de elenco.
- Scouting de IA.
- Valores e salários.
- Contratos e vencimentos.
- Rumores -> negociação -> acordo/fracasso.
- Empréstimos.
- Concorrência entre compradores.
- Transferências totalmente externas ao protagonista.

## Fase 5 — Imprensa e vida da carreira
- Feed de notícias.
- Perfis de jornalistas.
- Entrevistas e respostas.
- Agente.
- Patrocínio e finanças pessoais.
- Relações com treinador, elenco, torcida e imprensa.

## Fase 6 — Saúde, longevidade e aposentadoria
- Histórico de lesões.
- Recuperação e risco por carga.
- Curvas de desenvolvimento/declínio por posição.
- Motivação e objetivos.
- Pressão de aposentadoria multifatorial.
- Escolha de continuar/parar quando aplicável.
- Legado e resumo final da carreira.

## Fase 7 — Seleções e mundo expandido
- Elegibilidade e convocações.
- Torneios internacionais.
- Mais ligas/datasets.
- Geração de jovens.
- Evolução financeira/reputacional de clubes.

## Fase 8 — Apresentação e distribuição
- UI final.
- Áudio.
- Renderer de partida aprimorado.
- Performance.
- Desktop.
- Android.
- Pipeline de assets e pacotes de dados.

## Regra de execução
Não tentar terminar uma fase inteira antes de termos algo executável. Construir em pequenos cortes verticais e manter testes passando a cada mudança.

## Corte funcional de competições e apresentação (prévia em revisão)

O corte atual liga calendário, ligas por país/base, copas nacionais/estaduais, Libertadores, torneios europeus, Copa do Mundo simulada, estatísticas, premiações e histórico de temporadas à carreira. Os formatos são compactos; não concluem toda a Fase 3 nem eliminatórias/seleções completas da Fase 7. Permanecem pendentes separação integral das divisões, promoção/rebaixamento das ligas, regulamentos e qualificação oficiais completos, adversários táticos em partidas completas e os demais sistemas de mercado global.

Save v3 migra versões anteriores, sem criar estatísticas retroativas. A apresentação recebeu melhorias procedurais de estádio/gramado/atletas e opções de qualidade. A publicação do jogo segue aguardando aprovação visual do usuário; a galeria de capturas é independente do site jogável.

### Revisão de personagens, controles e arbitragem

Atletas em pixel art/2D por escolha do usuário, no estádio 3D existente; uniformes e números desenhados no sprite. Condução contínua por toque/mouse/teclado e calibração de mira/força. Biblioteca de animações com cabeceio, bicicleta, voleio, comemoração, cartões, lesão e sinais do árbitro; somente comemoração/sinais de gol/impedimento já ligados aos eventos jogáveis. Bola, linha externa do gol e corpos elegíveis para impedimento são objetos do domínio, com passagem inteira da esfera e snapshot no passe. Revisão visual da bola/linha pela pausa. Permanecem pendentes arbitragem disciplinar completa, lesões efetivas durante partidas, cruzamentos/disputas aéreas e integração competitiva de todos os movimentos especiais.

### Assistentes e apresentação do VAR

Dois bandeirinhas ligados à linha de impedimento e à participação do receptor; monitor à beira do campo, corrida do árbitro e take da central com VAR/AVAR/operador e seis telas com evidência congelada. Sequência automática para gols/impedimentos jogáveis e repetição pela pausa, sem alterar resultado ou duplicar registro. Protocolo cinematográfico simplificado; revisão disciplinar e demais classes oficiais continuam pendentes.

### Revisão de condução e troca de temporada

Três circuitos distintos, portões físicos numerados, ritmo analógico e aceleração por Shift/dois dedos. Oportunidades de partida usam defensores e corredores, com recuperação real da posse e continuidade da bola para a finalização. Playoffs e acesso/descenso ingleses e trocas Série A/B são executados somente com cadastros completos; o pacote parcial da Série B não inventa participantes. Divisões persistem após a virada. Prorrogação por fase em novos regulamentos; edições antigas preservadas. Vagas continentais oficiais e demais sistemas de acesso/descenso continuam pendentes. Prévia visual permanece separada da publicação do jogo.

### Menu inicial e múltiplas carreiras
- Tela de entrada com continuar, nova carreira, biblioteca de saves, configurações e conquistas.
- Slots independentes com importação/exportação, exclusão confirmada e migração não destrutiva do save anterior.
- Configurações compartilhadas com o pause; conquistas derivadas de avaliação, treinos, contrato, partidas, gols, assistências e premiações.
- Validação: testes de regras e persistência alternativa; teste de navegador `test:menu` em layout desktop/celular e integração com campo.

### Escolha inicial da base e controles por gesto
- País → liga/divisão → clube da base antes da avaliação e dos treinos; idades iniciais 14–16 sem acesso imediato ao principal.
- Número inicial atribuído no clube, três sugestões livres e disputa de números ocupados por atuações, confiança e habilidade.
- Navegação sem recarregar o documento, preservação de formulários, mira proporcional à força e curva corrigida.
- Recepção cronometrada com três trajetórias, repetição apenas de erros em treinos, goleiros reativos e faltas com prévia parcial.
- Corrida analógica com velocidade limitada por atributos, transição física entre faixas e oito poses de corrida.

### Revisão de recrutamento inicial, treino e banco
A escolha inicial manual foi substituída por recrutamento automático após a avaliação, conforme desempenho e requisitos da base, preservando contratos de saves existentes. Acertos avançam os exercícios após a apresentação da nota; erros mantêm repetição opcional. O corte de partida recebe nota ao vivo, entrada pelo banco, minutos efetivos e substituição por desgaste/desempenho/plano. Bancos variam pelo estádio, reservas têm pose sentada e treinador usa roupa casual/esportiva neutra com pequena marca do clube. Arbitragem e VAR ficam restritos às partidas. Formato, limites e testes: `docs/GAMEPLAY-FLOW.md`.
