# Arquitetura inicial

## Princípio
A lógica do futebol deve ser independente da interface. O núcleo recebe estado + comando + fonte de aleatoriedade e devolve novo estado/eventos. Isso facilita testes, saves e futuras interfaces Web/Desktop/Android.

## Camadas

### `src/core`
Tipos, utilitários determinísticos, relógio/calendário, IDs, random/seed e event bus de domínio.

### `src/domain`
Regras puras ou quase puras:
- `career`: ciclo e estado da carreira.
- `players`: atributos, OVR, POT, idade e desenvolvimento.
- `training`: sessões, carga e evolução.
- `youth`: avaliação e recrutamento da base.
- `clubs`: elenco, reputação, orçamento e necessidades.
- `competitions`: calendário, classificação e torneios.
- `transfers`: scouting, interesse, propostas, contratos e transferências.
- `world`: avanço dos sistemas de IA a cada rodada/evento.
- `media`: notícias, jornalistas, rumores e entrevistas.
- `health`: energia, lesões e recuperação.
- `retirement`: pressão/decisão de aposentadoria.
- `international`: seleção e competições internacionais.
- `economy`: salário, agente, patrocínio e vida financeira.

### `src/data`
Schemas e pacotes de dados. Clubes/jogadores/competições devem ser data-driven. Ativos oficiais não pertencem à engine.

### `src/application`
Casos de uso que coordenam domínios: criar save, concluir treino, jogar partida, avançar rodada, negociar contrato etc.

### `src/ui`
Interface e apresentação. Não implementar regras de domínio aqui.

### `src/persistence`
Serialização, versão de save e migrações.

## Estado mínimo do atleta
- identidade e nacionalidade
- nascimento/idade
- posição e pé preferido
- atributos técnicos/físicos/mentais
- OVR por posição
- POT real + percepção de potencial
- forma, moral, energia e saúde
- reputação
- clube, papel e confiança do treinador
- contrato e agente
- estatísticas/histórico
- desenvolvimento e pontos de treino

## Estado mínimo do jogador de IA
Além da identidade: idade, posição, OVR, POT, forma, valor, salário, contrato, clube, reputação, saúde e status de carreira.

## Mercado
Não sortear simplesmente dois clubes e um atleta. O pipeline deve ser:
1. clube detecta necessidade;
2. define perfil e orçamento;
3. encontra candidatos;
4. pontua adequação;
5. gera interesse/rumor;
6. negocia clube-clube;
7. negocia contrato do atleta;
8. conclui ou encerra;
9. atualiza elencos, orçamento e mídia.

## Simulação por partida
Após uma partida do protagonista, `WorldSimulation` processa uma quantidade controlada de eventos globais. Eventos podem representar dias transcorridos sem exigir que o usuário jogue dia por dia.

## Saves
Todo save contém `schemaVersion`. Migrações são sequenciais e nunca dependem da UI. Seeds importantes devem ser persistidas para facilitar reprodução e depuração.

## Dados e ativos
Criar interfaces como `ClubDataProvider`, `PlayerDataProvider` e `AssetResolver` (ou equivalentes adequados à linguagem escolhida) para permitir trocar datasets fictícios por dados licenciados sem reescrever a engine.

## Tecnologia inicial
Começar com TypeScript para domínio/aplicação e uma interface Web leve. A escolha de renderer 3D será isolada da lógica da carreira para permitir evolução sem reescrever a simulação.

## Adaptador web e publicação

`src/application/career.ts` coordena o fluxo de carreira em comandos imutáveis. Avaliação/recrutamento, treino, contratos e elegibilidade de promoção ficam nos módulos de domínio; o cálculo posicional existente foi mantido. `src/data/clubs.ts` fornece um pacote fictício substituível via `ClubDataProvider`. A interface `src/ui/browser.ts` somente coleta decisões e apresenta o estado público, sem mostrar o POT interno.

O codec `src/persistence/save.ts` valida o formato versionado 2 e migra v1, verificando estrutura, limites, datas e referências. Seed e estado do RNG ficam no save. O adaptador web grava primeiro no localStorage e adota o novo estado somente após sucesso. Saves inválidos são preservados para exportação; não há reset silencioso nem transmissão do save ao servidor. A migração v1 → v2 é determinística; futuras versões devem acrescentar migrações sequenciais.

O build estático copia apenas módulos executáveis de navegador para `dist-web/`, sem testes, fontes ou dependências Node. O workflow `.github/workflows/pages.yml` instala pelo lockfile, verifica tipos/testes, gera e publica o artefato via GitHub Pages. O job de build tem somente leitura; o deploy recebe `pages: write` e `id-token: write`. A ativação inicial do Pages é uma configuração do repositório.

Critérios do protótipo: aos 15 anos, promoção exige 6 atuações, 270 minutos e média recente ≥7,5; aos 16 ou mais, 4 atuações, 180 minutos e média ≥6,5. Também exige vaga e OVR compatível. Contratos de formação duram 104 semanas; salário reservado e bônus são debitados na assinatura. Transferências por acordo liberam vaga e salário reservado do clube anterior, sem devolver o bônus. Treinar/recuperar não avança o calendário; concluir as oportunidades da partida preparada avança uma semana. Mercado global, competição completa e partida controlável seguem nas fases futuras.

## Fundamentos jogáveis e referência Game-teste

Referência consultada somente para leitura: `Bonne13/Game-teste`, commit `a07d70cf9164fb7743ee4ff5066b1aa260e3aad6`, em especial `training-engine.js`, `training.js` e `match-input.js`. Foram reutilizados conceitos de arrasto reverso, três tentativas por fundamento, antecipação de passes, obstrução de trajetória, impedimento, barreira/efeito e condução. Não foram copiados banco de clubes, marcas, assets nem a arquitetura global do protótipo. O primeiro renderer foi Canvas 2D com perspectiva; ele permanece como fallback. A versão atual usa a apresentação 3D descrita abaixo.

- `src/domain/gameplay/trial.ts`: estado local de cada tentativa, entradas, tempo, movimento, colisões e resultados. Subpassos separam regras da frequência de renderização.
- `src/application/drills.ts`: sequência de fundamentos, histórico de notas, retomada e projeção dos resultados em atributos/atuação. Força, marcação, defesa de gol e compostura usam estimativas derivadas; não são testes específicos dessas habilidades nesta etapa.
- `src/ui/field.ts`: desenho e Pointer Events para toque/mouse, teclado e ciclo de animação descartável. Não calcula notas, gols ou elegibilidade. Pausa na mira e ao ocultar a aba, cancela gestos interrompidos e captura o ponteiro durante arrasto.
- `src/ui/browser.ts`: grava sessões confirmadas em armazenamento separado, independentemente do formato versionado da carreira. Ao concluir, aplica o resultado pelos casos de uso existentes. Falhas de persistência mantêm o estado anterior.

A estreia é um conjunto limitado de oportunidades controláveis, que pode produzir gols reais e uma nota de atuação calculada. Passe recebido não conta automaticamente como assistência. A integração não afirma que exista uma simulação completa de partidas ou equipes. O `Game-teste` permanece independente e inalterado.

## Apresentação 3D e ponto de contato

`src/ui/field3d.ts` traduz as coordenadas de domínio para metros, desenha a cena com Three.js r160 e expõe somente renderização e seleção por raycasting. Campo, gol com rede, personagens, arquibancada e textura da bola são criados por código. A biblioteca em `web/vendor/three.min.js` foi reutilizada do Game-teste (commit de referência acima), sem alterações, com a licença MIT em `web/vendor/THREE-LICENSE.txt`. O pacote `@types/three` é dependência somente de desenvolvimento. O Game-teste não foi alterado.

O contato, revelado somente após a escolha válida do destino, usa uma segunda cena com esfera e raycasting: lateral vira curva e metade inferior vira elevação. Selecionar contato é separado de finalizar. A força vem da distância de arrasto, enquanto a mira vem da interseção do toque com o plano do gol/gramado. A trajetória e o voo compartilham a interpolação de caminho do domínio. As regras de resultado e as notas continuam em `src/domain/gameplay`/`src/application`. Não se trata de física completa de corpos rígidos.

O adaptador `field.ts` mantém um único ciclo de animação e descarta ambos os renderizadores, geometrias, materiais, texturas, observadores e listeners ao sair. O tamanho do buffer só muda quando o layout muda; a densidade de pixels é limitada a 1,5. As cadeiras usam instanciamento para reduzir chamadas de desenho. Sem WebGL, os canvases são substituídos e o renderer 2D é ativado sem tentar reutilizar um contexto incompatível.

O build inclui a biblioteca e a licença em `dist-web/vendor/`. O grafo de módulos e as URLs dos recursos recebem versão de conteúdo para evitar a mistura de arquivos antigos após uma atualização no Pages.

## Revisão visual e correção da mira

`src/ui/aim-state.ts` define fases explícitas (`aiming`, `preparing`, `flight`, `resolved`) e a transformação da puxada. O gesto no campo define e confirma mira/força; a esfera de curva aparece apenas após a confirmação. Captura/cancelamento não executam chute. O toque válido na esfera executa ao soltar, mantendo mira e força. No teclado, espaço confirma primeiro e depois executa. Refazer mira descarta os valores confirmados e oculta a esfera.

A apresentação usa gramado com ruído procedural e filtragem anisotrópica, céu em gradiente, iluminação com sombras limitadas a 1024 px, materiais de maior detalhe, arquibancada coberta, placares de marca própria e uniformes/cabelo/chuteiras procedurais. A câmera mantém o enquadramento por trás do jogador nas etapas de mira, curva e voo. A trajetória indica a direção, sem marcador no destino. Nenhum asset externo protegido foi adicionado.

`npm run test:browser` mantém uma regressão reproduzível por eventos de toque em tela de celular, além dos testes de validação e potência. O servidor e o navegador do teste são fechados ao terminar. A lógica da carreira e seu formato de save não mudaram nesta revisão.


## Controle móvel contínuo e pausa

A interface usa puxada reversa no campo com zona morta de 12 px: distância vertical controla potência e deslocamento horizontal reverso controla direção, incluindo finalizações fora das traves. Soltar confirma os dois valores, sem disparar. `freePullShot` mantém essa transformação testável e separada do domínio. Não há seleção prévia de um alvo por toque no gol.

Treinos e oportunidades de partida ocupam o viewport, respeitando as áreas seguras do celular. A pausa oferece retomada, som e saída; fica disponível entre ações e durante condução/corrida, e o navegador também pausa ao perder foco ou ocultar a aba. Pausa congela o relógio de domínio e de apresentação, cancela gestos e suspende áudio. Ao sair, uma tentativa resolvida é gravada uma única vez antes da navegação; tentativas incompletas recomeçam. Falha de gravação mantém o menu aberto. A preferência de som usa chave separada, fora do save da carreira. Os efeitos sonoros são sintetizados localmente por Web Audio após interação.

A animação 3D deriva deslocamento dos atletas para passada, direção, braços e oscilação do corpo; inclui preparação, aproximação e acompanhamento do chute e alcance do goleiro. Esse estado visual não decide gols, colisões ou notas. Não representa ainda uma partida completa com 22 atletas.


## Força pela mira e atributos

A esfera seleciona somente curva lateral e executa o chute ao soltar o toque válido; não carrega potência. A puxada da mira no campo fornece a carga, mostrada em percentual e velocidade estimada. `strikeVelocity` combina força, técnica e a habilidade do fundamento (finalização, passe ou bola parada) para calcular o teto; a carga multiplica esse teto. A velocidade determina o tempo de voo pela distância. É uma calibração de protótipo, sem simulação aerodinâmica. No teclado, espaço usa a carga confirmada ou máxima quando ainda não houve puxada.


## Sequência única de mira, força e curva

A puxada confirma simultaneamente destino e potência ao soltar, sem executar o chute. A bola ampliada só aparece após essa confirmação. A seleção fica bloqueada no campo até o botão explícito de alterar mira. Tocar na esfera seleciona apenas curva lateral e, ao soltar esse toque, executa o chute com o destino e a potência guardados; o centro produz chute reto. Não há segunda puxada nem seleção de elevação nesse fluxo. Pausa e cancelamento do contato preservam os valores confirmados. Cancelar a puxada antes da confirmação descarta a preparação sem chutar. Esta sequência substitui o disparo ao soltar a mira descrito nas revisões anteriores.

## Vestiário, pacotes de temporada e save v2

`src/domain/clubs/shirt.ts` mantém números de 1 a 99, donos persistentes e os requisitos para disputar um número ocupado: confiança do treinador ao menos 5 pontos acima do dono e OVR ao menos 2 pontos acima (limitados a 100). Ambos são exigidos. Números livres não exigem disputa. Se houver acordo, o antigo dono recebe o número liberado pelo protagonista, sem duplicação. Ingresso em outro clube/equipe refaz a distribuição; tenta o número preferido e reserva o primeiro livre se estiver ocupado. Não há sorteio por frame. Nos clubes fictícios, os 23 integrantes são um elenco de desenvolvimento gerado deterministicamente. Pacotes externos substituem esses registros por seus elencos.

`CareerState` passa à versão 2 com `shirt`, `coachTrust` e `dataPack`. A confiança varia após atuação: arredondamento de `(nota - 6) * 3`, limitada de 1 a 100. Transferência reinicia conforme papel; promoção limita a 40 na nova equipe. O codec migra v1 para v2 deterministicamente, sem alterar jogador, seed/RNG, calendário ou resultados. A chave local continua a mesma para descobrir os saves existentes. A migração é persistida no próximo commit; exportação/importação v2 conserva número, uniforme, confiança, elencos e pacote. JSON compacto reduz duplicação no armazenamento do navegador.

`src/data/kits.ts` define os três uniformes originais de cada clube fictício. `src/data/football-pack.ts` valida importação de clubes, elencos e três uniformes por clube, com procedência e cobertura. A base comunitária opcional traz 238 clubes e 4.605 registros atuais de jogadores; limites, transformação e fontes estão em [data/SOURCES.md](data/SOURCES.md). Não representa cobertura mundial completa ou uniformes oficiais. Novas carreiras adotam o pacote selecionado; carreiras existentes conservam os dados originais.

O renderer recebe aparência (número, uniforme e modo de treino), sem decidir disputa de camisa. Exibe colete laranja no treino, cores/shorts/meias do uniforme escolhido na partida, numeração e detalhes de rosto, gola e mangas. A câmera permanece atrás do atleta durante mira, confirmação e voo, sem o zoom anterior por fase. A puxada mostra origem e vetor na tela; só aparece a esfera de curva depois de confirmar mira/força, e seu clique executa com os valores guardados. Mouse e toque compartilham Pointer Events. `npm run test:desktop` verifica o catálogo, vestiário, persistência e sequência com mouse, incluindo preservação da mira confirmada.

## Variações dos exercícios e zonas do campo

`Trial.layout` escolhe um de três cenários por seed e tentativa, sem consumir RNG da carreira. Chutes e faltas variam origem lateral e distância. Passes variam origem e movimento do receptor; visão muda posições de companheiros e defensores; condução varia largada, portões e cones; velocidade varia distribuição de obstáculos. Reabrir a mesma tentativa mantém seu cenário. Notas e colisões continuam no domínio.

O renderer desloca passe, visão, técnica e velocidade para zonas de 28, 35 ou 42 metros a partir da linha de fundo, acrescentando as coordenadas locais do exercício. A linha central e o círculo de meio-campo são desenhados. Raycasting subtrai esse deslocamento para que clicar no gramado continue produzindo o destino local correto. A linha de impedimento acompanha a zona e o cenário. Finalização e falta permanecem orientadas para o gol; a câmera usa a mesma regra antes e depois de confirmar a mira. O HUD identifica a zona e o cenário. O fallback 2D usa marcação central para os exercícios de meio-campo.

## Estádios completos e paisagens

`src/data/stadiums.ts` seleciona perfis determinísticos por clube/país, com cidades catalogadas e indicação explícita para cidade desconhecida. Reputação escolhe estádio local, regional ou arena; treinos usam campo local. O perfil mantém a classificação de cenário simulado: não reproduz estádio oficial nem afirma equivalência geográfica precisa.

`src/ui/stadium3d.ts` constrói quatro arquibancadas, assentos instanciados, coberturas conforme porte, pilares, cercamento, iluminação e entorno urbano, montanhoso, rural ou litorâneo. O renderer do campo completa os dois gols, as duas áreas, linha/círculo central e placas laterais. Objetos e materiais são descartados pelo ciclo de vida existente da cena, incluindo os InstancedMesh. Paisagens usam seed do perfil e não alteram RNG ou regras da carreira.

O menu de pausa oferece **Conhecer o estádio**. A visão panorâmica permite ver o conjunto inteiro, mantendo o exercício congelado; **Voltar ao exercício** recupera a câmera e a preparação anterior. Esse modo não aceita entradas de gameplay. `scripts/capture-review.cjs` gera capturas do aplicativo real em quatro perfis de estádio, além da mira e do treino, sem publicar nem modificar repositórios externos.

### Refinamento visual dos estádios

A revisão seguinte acrescenta corredores, escadas, fachadas com acessos, nervuras e acabamento das coberturas, bancos de reservas e um painel procedural. Arenas têm público estilizado por instanciamento. As cidades usam mais variedade de alturas/posições, janelas, vias e veículos estáticos; o litoral recebe faixas de espuma, e árvores/relevo usam volumes menos angulosos. Exposição e neblina foram ajustadas para preservar contraste e profundidade. As texturas procedurais adicionais são registradas no descarte do renderer. Essas alterações são de apresentação e não mudam seed ou resultados da carreira.

## Competições, calendário e premiações — save v3

`src/domain/competitions/world.ts` coordena o calendário independente do protagonista, com RNG próprio persistido e ordenação canônica de IDs. `src/data/competitions.ts` fornece catálogo de competições, associações de clubes aos estados brasileiros e seleções. Regras de tabela, progressão, desempate e premiação ficam no domínio; `src/ui/competitions.ts` somente exibe classificação, grupos, chave, resultados, artilharia e sala de troféus.

Esta é uma primeira vertical slice com **formatos e calendários compactos simulados**, não uma reprodução integral de regulamentos ou participantes oficiais:

- Liga nacional e liga da base por país com os clubes disponíveis, em turno único. As divisões nacionais do snapshot ainda não são separadas neste calendário.
- Copas nacionais, incluindo Copa do Brasil, em mata-mata de jogo único com byes quando necessário. Empate é decidido por pênaltis; não há campeão por sorteio sem partidas.
- Catálogo dos 27 estaduais brasileiros, com clubes associados explicitamente à UF. Uma edição só funciona com pelo menos dois clubes cadastrados daquele estado. Ausências e estados não identificados permanecem visíveis, sem inventar filiações ou participantes.
- Champions e Europa League: fase classificatória de até 36 clubes/8 rodadas, top 8 direto ao mata-mata e 9º–24º em playoffs. Conference: até 36/6 rodadas. Cada clube disputa somente uma das três. Vagas iniciais usam nível do elenco e cotas por país; temporadas seguintes priorizam as classificações simuladas anteriores. Faltam coeficientes, sorteios e regulamentos oficiais completos.
- Libertadores: até 32 clubes sul-americanos disponíveis, com limite inicial de oito por país, grupos de até quatro em turno/returno e dois classificados por grupo. O pacote atual limita a representação sul-americana ao Brasil. Mata-mata permanece em jogo único nesta versão.
- Copa do Mundo: 48 seleções simuladas, 12 grupos de quatro, top 2 mais oito melhores terceiros, mata-mata de 32 até a final. Edição de quatro em quatro anos; calendário compacto em junho. Não foram implementadas eliminatórias oficiais ou escalações nacionais reais. Nacionalidades/forças deste cadastro são parâmetros de simulação.

Datas ocupadas pelo mesmo clube/equipe na mesma categoria são remarcadas, sem dois jogos no mesmo dia. Ao preparar uma partida, a aplicação escolhe o primeiro compromisso elegível nos próximos sete dias; sem compromisso, preserva o amistoso semanal. Base e principal são separados. A seleção exige principal, idade ≥16, OVR ≥máximo(65, força da seleção−12), pelo menos 180 minutos reais, média recente ≥7 e confiança ≥60, com Copa cadastrada. Ao concluir a oportunidade, os gols/assistências do usuário alimentam o placar e suas estatísticas, e o mundo simula as outras partidas até aquela data. Avançar semana sem atuar simula os jogos e não credita aparições ao protagonista.

Os atletas NPC têm namespace próprio para não colidir com o protagonista. Estatísticas usam jogadores do snapshot quando disponíveis; identidades de preenchimento/seleções/base são explicitamente chamadas de atletas simulados. Nomes reais não transformam resultados do save em fatos reais.

Ao encerrar uma edição, o domínio concede título coletivo, artilharia, melhor jogador, revelação sub-21 (somente com nascimento conhecido), melhor goleiro e seleção por posição. Medalha do protagonista exige ao menos uma atuação na equipe campeã daquela edição, inclusive quando houve transferência posterior. Melhor jogador usa média das notas mais contribuição ofensiva limitada, com mínimo de três aparições ou o máximo registrado na edição se menor. Melhor goleiro considera jogos sem sofrer gols. A seleção usa cotas de posição, sem preencher com atletas inexistentes. Ao encerrar temporada, o prêmio global exige ao menos dez atuações e 300 minutos. Prêmios têm IDs únicos e não são concedidos novamente ao recarregar/avançar a mesma data. A sala de troféus conserva as conquistas pessoais através das temporadas.

`CareerState` v3 adiciona `world` e `Preparation.fixtureId`. O codec migra v1→v2→v3 preservando jogador, contratos, desenvolvimento, RNG da carreira e preferências; o calendário inicial da migração não inventa atuações ou troféus passados. `src/persistence/world.ts` valida estruturas, referências, datas, placares, pênaltis, unicidade, conflitos de calendário e premiações. Saves podem ter até 32 MB. `src/persistence/browser-storage.ts` usa IndexedDB com transações, importando o texto legado no próximo salvamento bem-sucedido; localStorage é fallback para navegadores sem IndexedDB. Exportação/importação inclui o mundo e as premiações. Sessões parciais de exercício continuam separadas. A UI bloqueia novas ações durante a gravação e só adota o estado depois do commit.

O calendário passa de temporada conservando campeões e prêmios, refazendo vagas a partir das tabelas anteriores. Renovação contratual fica disponível nos últimos seis meses, com confiança ≥40, por 104 semanas e mantendo salário/papel; há tolerância de 30 dias após o término. Esta implementação não substitui a negociação econômica avançada do roadmap.

## Apresentação revisada e inspeção do atleta

O renderer mantém mira/força/curva em uma sequência única e recebe o contexto da competição/adversário. Jogos fora usam o perfil do clube mandante quando disponível; seleção usa uniforme procedural próprio. Rosto, gola, pescoço, mangas, joelhos/cotovelos articulados, meias e chuteiras foram detalhados. Pernas/braços acompanham deslocamento e o atleta se orienta para a finalização; goleiro olha para o campo. Gramado usa textura procedural mais fina, marcas de corte, pontos, arcos das áreas e bandeirinhas. Arenas ganham cantos curvos que conectam as arquibancadas, relevo por malha de altura e céu procedural com nuvens. Boxes estáticos são consolidados em instâncias para reduzir chamadas de desenho.

Pausa oferece inspeção do estádio e do jogador, sem consumir tempo da tentativa, além das opções gráficas automática, alta (sombras 2048) e leve (sem sombras/público). A preferência é validada e persistida separadamente; ela não muda resultados da simulação. Ativos continuam procedurais e uniformes não passam a ser oficiais por causa desses detalhes.

## Jogadores em pixel art e controles de condução

Por escolha do usuário, os bonecos volumétricos foram substituídos por atletas 2D em pixel art, preservando os estádios/campo 3D. `src/ui/pixel-player.ts` desenha um atlas original com quatro direções e poses de repouso, corrida, chute, goleiro, cabeceio, bicicleta, voleio, comemoração, cartões amarelo/vermelho, lesão e sinalização do árbitro. O renderer usa planos verticais voltados à câmera e escolhe a orientação pela direção real do atleta; filtro de pixel mais próximo evita borrar os sprites. Os números usam glifos de pixel integrados ao uniforme, com contorno para leitura sobre listras, sem placas flutuantes. O fallback Canvas 2D compartilha o atlas. Materiais/atlases são reutilizados e descartados ao sair do campo.

O menu de inspeção mostra frente/costas e oferece demonstrações das animações, sem alterar a saúde, os cartões ou o desempenho da carreira. Gols efetivamente validados disparam comemoração; os árbitros aparecem em campo e sinalizam gol/impedimento. Cabeceio/bicicleta/voleio e cartões/lesão ficam na biblioteca de apresentação: não fingem que cruzamentos, arbitragem disciplinar e saúde completa do roadmap já foram implementados. Ativos são originais, sem copiar sprites dos jogos citados como referência.

A puxada mantém a sequência única mira+força → toque de curva → chute. `freePullShot` usa inclinação da puxada para direção e comprimento vertical para carga, reduzindo a sensibilidade lateral anterior. Alongar a mesma inclinação aumenta a potência sem deslocar o alvo no gol. Passes usam a carga para alcance no gramado. A altura do chute por gesto permanece central; ajustes no teclado continuam disponíveis.

Condução aceita um direcional flutuante no gramado (arraste, solte para frear), WASD/setas mantidos e clique/toque breve em um destino. `dribbleStick` fornece direção/intensidade com zona morta; o domínio normaliza diagonais, aplica aceleração/frenagem e usa técnica/velocidade do atleta para resposta e teto. A bola tem posição própria e acompanha toques à frente do movimento; portões exigem passagem da bola com o atleta próximo, e cones consideram ambos. Pausa, perda de foco e cancelamento liberam o direcional para evitar movimento preso. Não é uma simulação física completa de posse/disputa de bola.

`npm run test:controls` exercita o renderer real no Chromium: três números/uniformes, inspeção frente/costas, direção preservada ao aumentar carga, sequência de finalização, condução por mouse/toque, teclado, pausa e cancelamento. Capturas locais são geradas sem publicar o jogo nem editar saves do usuário. Testes de domínio cobrem resposta por atributos, bola próxima, portões, frenagem e passos de tempo reproduzíveis.

## Objetos de bola, linha do gol e impedimento

`src/domain/match/adjudication.ts` mantém geometria em metros, independente do renderer. `BallBody` contém centro e raio de 0,11 m; `GoalLine` descreve plano externo, largura, altura e direção de ataque. A faixa pintada tem 0,10 m e a referência da baliza próxima fica em z=-0,05 m. `judgeGoal` usa a passagem varrida da esfera: centro ou parte da bola além da linha não bastam, tocar o plano não basta, e o cruzamento deve ocorrer entre as traves e abaixo do travessão. Retorno de trás do gol não gera um novo gol. Passagem em impedimento envolvido invalida o gol. Não há simulação completa de colisões/rebotes em traves nesta slice.

`Shot` mantém o objeto físico de bola e a decisão. O domínio atualiza esse objeto e o renderer desenha a mesma trajetória/posição, sem teleportar uma bola para dentro do gol depois de decidir o resultado. Goleiro/barreira interrompem antes da linha. Apenas a decisão válida concede gol e alimenta estatísticas/premiações; sem cruzamento completo o resultado é sem gol. A trajetória continua a calibração procedural do protótipo, não aerodinâmica completa.

`PlayerBody` representa partes elegíveis por posição e alcance longitudinal (sem braços/mãos). O impedimento compara o receptor com a bola inteira e o penúltimo oponente, independente de quem é goleiro, no campo adversário; estar na mesma linha é legal. O snapshot é copiado no momento do passe, sem depender da posição posterior. O receptor só é punido quando participa da recepção; não basta estar adiantado sem envolvimento. A regra suporta direções opostas e a exceção de recepção direta de lateral, escanteio e tiro de meta. Os exercícios atuais usam passe em jogo aberto e não implementam toda a árvore de interferência/disputa de uma partida completa. A linha exibida vem dos mesmos corpos/snapshot. Árbitros recebem um sinal de decisão; cartões e lesões não são sorteados só para mostrar animações.

Após uma finalização resolvida, a pausa oferece “Rever bola e linha do gol”. A câmera mostra a posição real do objeto de bola e a marcação; voltar restaura a câmera do exercício. Essa inspeção não altera a decisão nem consome tempo.

## Assistentes e sequência de revisão do VAR

`src/domain/match/video-review.ts` extrai evidência somente de uma oportunidade resolvida: bola/linha e decisão de gol, ou snapshot de impedimento com participação na recepção. Clona a evidência para impedir que animação, avanço de tempo ou nova tentativa alterem o lance analisado. O relógio da sequência é determinístico e separado do exercício; pular ou mover a barra não muda placar, avaliação, saúde ou estatísticas. Resultados continuam sendo registrados uma única vez pelo fluxo existente.

Dois assistentes em pixel art ocupam laterais/ metades opostas. O assistente do ataque acompanha a linha usada pela regra e levanta a bandeira após impedimento confirmado com envolvimento, sem sinalizar só por uma posição adiantada sem participação. O árbitro corre ao monitor de campo construído por `src/ui/var3d.ts`. Câmeras acompanham assistente, deslocamento, monitor e sinal final. O monitor e os seis painéis da central usam `drawReviewEvidence` e o mesmo incidente congelado.

`src/ui/var-room.ts` apresenta uma sala 2D com três profissionais sentados (VAR, AVAR, operador de replay), headsets, consoles e seis telas. As telas são reconstruções esquemáticas dos dados geométricos do lance, com aproximações da posição no passe/bola/linha; não são seis gravações independentes. A sala ocupa um take próprio, mantendo a escolha de personagens em pixel art.

Em partidas, gols e impedimentos envolvidos iniciam a sequência automaticamente. Após uma finalização resolvida, a pausa também oferece “Rever lance com VAR”. A revisão aceita pausa, Escape, próximo take, barra de tempo e retorno ao jogo; perda de foco/visibilidade pausa a cena. A celebração pode recomeçar ao voltar de um gol confirmado. Em navegadores sem WebGL, a central de dados substitui os takes 3D.

**Protocolo cinematográfico simplificado:** a ida ao monitor é usada para apresentar a revisão, inclusive em fatos geométricos que no protocolo oficial normalmente seriam comunicados diretamente pelo VAR. Não implementa revisão oficial completa de pênaltis, faltas, vermelhos diretos, identificação equivocada ou lances ainda ausentes do motor. A cinemática não sorteia decisões nem inventa infrações para justificar cenas. Saves não mudam de versão; evidência/timeline são transitórias, como a tentativa em andamento. `npm run test:var` verifica o encadeamento real de impedimento e gol, pausa, mobile, salto da cena e registro único.

### Roupas dos oficiais e postura da central

O atlas recebe o papel explícito `official` para árbitro, assistentes e demonstrações de arbitragem: não desenha números nem distintivos/inscrições em nenhuma pose ou direção. Atletas conservam sua numeração. `src/data/official-kits.ts` oferece camisa preta, amarela ou vermelha, com calção/meias pretos e acabamento simples. A pausa permite escolher a variação ou seleção automática por contraste com as cores representadas no exercício; a preferência é local e não muda o save da carreira. São desenhos originais, não certificação nem reprodução de uniforme oficial FIFA. O princípio de distinguir os oficiais dos times segue a regra de cores da Lei 4 da IFAB (https://www.theifab.com/laws/latest/the-players-equipment/#colours); as três opções são a paleta solicitada pelo usuário.

Na central, os três operadores têm troncos apoiados em cadeiras, braços dobrados no console, calças, joelhos dobrados, pés e cadeiras com assento/base/rodízios visíveis. As roupas são lisas, sem inscrições. O teste de navegador compara atlas de oficiais com números de entrada distintos em todas as poses: o raster deve ser idêntico; atletas com números distintos devem continuar diferentes. Capturas cobrem as três cores e a postura sentada.

## Identificação do VAR e mira sem alvo final

Cada posto da central identifica sua função: VAR (árbitro de vídeo), AVAR (assistente VAR) e operador de replay. As placas ficam nas bancadas; roupas continuam lisas. A mira mantém apenas a trajetória e o vetor de puxada, sem retículo HTML, anel 3D ou disco no destino no fallback 2D. A inclinação da puxada preserva a direção também em cargas curtas; uma pequena zona angular neutra reduz tremores laterais. Soltar confirma direção/força; tocar na esfera revelada depois seleciona curva e executa com os valores confirmados.

## Central do VAR de costas e leitura dos treinos

A câmera da central vê a equipe por trás: nuca/cabelo sem rosto, costas e encosto da cadeira, braços dirigidos ao console e mãos no teclado diante das telas. Placas individuais continuam nas bancadas. Evidências e decisões não mudam.

Nos exercícios de meio-campo, a câmera sobe para 8 m, preservando enquadramento nas fases de mira e curva. Condução distingue o portão ativo em verde-água dos posteriores e informa ordem, tempo e contatos com cones, também no fallback 2D. Corrida mostra divisórias das faixas, km/h e distância restante; domínio acelera até um teto dependente de pace, reduz velocidade em 35% por obstáculo atingido e concede até 18 s para completar os 100 m. Técnica continua usando aceleração/frenagem e controle próximo da bola por atributos. Nenhum formato de save é alterado. `TRAINING_REVIEW=1 node scripts/test-controls.cjs` verifica quatro exercícios, confirmação única de passe, pausa e tela estreita; testes de domínio cobrem velocidade/atributos e recuperação após impacto.

## Estádios por equipe e referências históricas

`src/data/stadium-reference.ts` associa os 238 clubes do pacote embarcado a nome de estádio, cidade e faixa arredondada de capacidade. São referências históricas de mando, com nomes comuns alternativos aos patrocinados, sem verificação do calendário 2026/27. Obras, sedes temporárias e novas arenas podem exigir atualização: Camp Nou, Benito Villamarín, Estadi Nacional e Nabi Abi Chedid são exemplos sensíveis. As capacidades servem apenas para escala visual. Não foram importadas fotografias, modelos, texturas ou marcas oficiais.

`stadiumFor` identifica separadamente clube e local: clubes que dividem Maracanã, San Siro, Olimpico, Luigi Ferraris ou Castelão compartilham venueId e seed. Treinos usam instalação própria menor; clubes externos sem referência continuam com perfil procedural explicitamente identificado. O renderer mantém campo de 105×68 m e varia formato retangular/bowl/oval, faixa de capacidade, divisões de arquibancada, cobertura integral/parcial, fachada em vidro/concreto/ripas e pista nos locais catalogados. Cores de assentos do Maracanã/Mineirão e Allianz Arena têm overrides; demais cores são aproximações. Vegetação, relevo e cidade são cenários interpretados, sem precisão geográfica. Toda referência histórica é rotulada na tela como recriação aproximada. Modelos não reproduzem uma planta arquitetônica certificada nem a contagem real de cadeiras.

Os ovais usam anéis elípticos contínuos de degraus/assentos e cobertura com vão central, em vez de quatro blocos retos. San Siro acrescenta torres e travessas de cobertura vermelhas como referência visual simplificada. `npm run test:stadiums` percorre sete perfis no WebGL, testa a legenda de aproximação, retorno da panorâmica sem consumir tempo e viewport de celular, e gera capturas. Testes de dados exigem referência para cada um dos 238 clubes e identidade compartilhada para mandantes do mesmo estádio.
