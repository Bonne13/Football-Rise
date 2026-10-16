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

O codec `src/persistence/save.ts` valida o formato versionado 1, estrutura, limites, datas e referências. Seed e estado do RNG ficam no save. O adaptador web grava primeiro no localStorage e adota o novo estado somente após sucesso. Saves inválidos são preservados para exportação; não há reset silencioso nem transmissão do save ao servidor. Futuras versões devem adicionar migrações sequenciais.

O build estático copia apenas módulos executáveis de navegador para `dist-web/`, sem testes, fontes ou dependências Node. O workflow `.github/workflows/pages.yml` instala pelo lockfile, verifica tipos/testes, gera e publica o artefato via GitHub Pages. O job de build tem somente leitura; o deploy recebe `pages: write` e `id-token: write`. A ativação inicial do Pages é uma configuração do repositório.

Critérios do protótipo: aos 15 anos, promoção exige 6 atuações, 270 minutos e média recente ≥7,5; aos 16 ou mais, 4 atuações, 180 minutos e média ≥6,5. Também exige vaga e OVR compatível. Contratos de formação duram 104 semanas; salário reservado e bônus são debitados na assinatura. Transferências por acordo liberam vaga e salário reservado do clube anterior, sem devolver o bônus. Treinar/recuperar não avança o calendário; concluir as oportunidades da partida preparada avança uma semana. Mercado global, competição completa e partida controlável seguem nas fases futuras.

## Fundamentos jogáveis e referência Game-teste

Referência consultada somente para leitura: `Bonne13/Game-teste`, commit `a07d70cf9164fb7743ee4ff5066b1aa260e3aad6`, em especial `training-engine.js`, `training.js` e `match-input.js`. Foram reutilizados conceitos de arrasto reverso, três tentativas por fundamento, antecipação de passes, obstrução de trajetória, impedimento, barreira/efeito e condução. Não foram copiados banco de clubes, marcas, assets nem a arquitetura global do protótipo. O primeiro renderer foi Canvas 2D com perspectiva; ele permanece como fallback. A versão atual usa a apresentação 3D descrita abaixo.

- `src/domain/gameplay/trial.ts`: estado local de cada tentativa, entradas, tempo, movimento, colisões e resultados. Subpassos separam regras da frequência de renderização.
- `src/application/drills.ts`: sequência de fundamentos, histórico de notas, retomada e projeção dos resultados em atributos/atuação. Força, marcação, defesa de gol e compostura usam estimativas derivadas; não são testes específicos dessas habilidades nesta etapa.
- `src/ui/field.ts`: desenho e Pointer Events para toque/mouse, teclado e ciclo de animação descartável. Não calcula notas, gols ou elegibilidade. Pausa na mira e ao ocultar a aba, cancela gestos interrompidos e captura o ponteiro durante arrasto.
- `src/ui/browser.ts`: grava sessões confirmadas em armazenamento separado, sem alterar o formato versionado 1 da carreira. Ao concluir, aplica o resultado pelos casos de uso existentes. Falhas de persistência mantêm o estado anterior.

A estreia é um conjunto limitado de oportunidades controláveis, que pode produzir gols reais e uma nota de atuação calculada. Passe recebido não conta automaticamente como assistência. A integração não afirma que exista uma simulação completa de partidas ou equipes. O `Game-teste` permanece independente e inalterado.

## Apresentação 3D e ponto de contato

`src/ui/field3d.ts` traduz as coordenadas de domínio para metros, desenha a cena com Three.js r160 e expõe somente renderização e seleção por raycasting. Campo, gol com rede, personagens, arquibancada e textura da bola são criados por código. A biblioteca em `web/vendor/three.min.js` foi reutilizada do Game-teste (commit de referência acima), sem alterações, com a licença MIT em `web/vendor/THREE-LICENSE.txt`. O pacote `@types/three` é dependência somente de desenvolvimento. O Game-teste não foi alterado.

O contato, revelado somente após a escolha válida do destino, usa uma segunda cena com esfera e raycasting: lateral vira curva e metade inferior vira elevação. Selecionar contato é separado de finalizar. A força vem da distância de arrasto, enquanto a mira vem da interseção do toque com o plano do gol/gramado. A trajetória e o voo compartilham a interpolação de caminho do domínio. As regras de resultado e as notas continuam em `src/domain/gameplay`/`src/application`. Não se trata de física completa de corpos rígidos.

O adaptador `field.ts` mantém um único ciclo de animação e descarta ambos os renderizadores, geometrias, materiais, texturas, observadores e listeners ao sair. O tamanho do buffer só muda quando o layout muda; a densidade de pixels é limitada a 1,5. As cadeiras usam instanciamento para reduzir chamadas de desenho. Sem WebGL, os canvases são substituídos e o renderer 2D é ativado sem tentar reutilizar um contexto incompatível.

O build inclui a biblioteca e a licença em `dist-web/vendor/`. O grafo de módulos e as URLs dos recursos recebem versão de conteúdo para evitar a mistura de arquivos antigos após uma atualização no Pages.

## Revisão visual e correção da mira

O campo deixou de disparar por distância de arrasto. `src/ui/aim-state.ts` define fases explícitas (`aiming`, `preparing`, `flight`, `resolved`), valida alvos e calcula a potência da puxada. Tocar/deslizar no campo seleciona somente o destino. O controle de bola e a bola física ficam ocultos na fase de mira; um alvo válido revela o controle. Alterar mira volta ao enquadramento ampliado e oculta novamente a bola. A captura de ponteiro e o cancelamento não executam chute. No teclado, espaço confirma primeiro a mira e só um segundo comando finaliza.

A apresentação usa gramado com ruído procedural e filtragem anisotrópica, céu em gradiente, iluminação com sombras limitadas a 1024 px, materiais de maior detalhe, arquibancada coberta, placares de marca própria e uniformes/cabelo/chuteiras procedurais. A câmera amplia o gol durante a seleção; a preparação e o voo usam o enquadramento por trás do jogador. Um marcador HTML de tamanho legível acompanha a projeção 3D. Nenhum asset externo protegido foi adicionado.

`npm run test:browser` mantém uma regressão reproduzível por eventos de toque em tela de celular, além dos testes de validação e potência. O servidor e o navegador do teste são fechados ao terminar. A lógica da carreira e seu formato de save não mudaram nesta revisão.


## Controle móvel contínuo e pausa

A interface também aceita puxar para trás no campo: após uma zona morta de 12 px, a bola aparece, a distância vertical controla potência e o deslocamento horizontal reverso controla direção, incluindo finalizações fora das traves. Soltar executa; cancelar não executa. `freePullShot` mantém essa transformação testável e separada do domínio. Tocar em um alvo continua como alternativa para selecionar contato/efeito e finalizar pela bola ampliada.

Treinos e oportunidades de partida ocupam o viewport, respeitando as áreas seguras do celular. A pausa oferece retomada, som e saída; fica disponível entre ações e durante condução/corrida, e o navegador também pausa ao perder foco ou ocultar a aba. Pausa congela o relógio de domínio e de apresentação, cancela gestos e suspende áudio. Ao sair, uma tentativa resolvida é gravada uma única vez antes da navegação; tentativas incompletas recomeçam. Falha de gravação mantém o menu aberto. A preferência de som usa chave separada, sem alterar o save v1. Os efeitos sonoros são sintetizados localmente por Web Audio após interação.

A animação 3D deriva deslocamento dos atletas para passada, direção, braços e oscilação do corpo; inclui preparação, aproximação e acompanhamento do chute e alcance do goleiro. Esse estado visual não decide gols, colisões ou notas. Não representa ainda uma partida completa com 22 atletas.


## Força pela mira e atributos

A seleção do ponto de contato não carrega potência nem executa chute: seus gestos ajustam somente curva e elevação. A puxada da mira no campo fornece a carga, mostrada em percentual e velocidade estimada. `strikeVelocity` no domínio combina força, técnica e a habilidade do fundamento (finalização, passe ou bola parada) para calcular o teto; a carga multiplica esse teto. O chute recebe a velocidade calculada, que determina seu tempo de voo pela distância. É uma calibração de protótipo, sem simulação aerodinâmica. No teclado, espaço executa com carga máxima. Saves e resultados confirmados continuam no formato existente.


## Sequência única de mira, força e curva

A puxada confirma simultaneamente destino e potência ao soltar, sem executar o chute. A bola ampliada só aparece após essa confirmação. A seleção fica bloqueada no campo até o botão explícito de alterar mira. Tocar na esfera seleciona apenas curva lateral e, ao soltar esse toque, executa o chute com o destino e a potência guardados; o centro produz chute reto. Não há segunda puxada nem seleção de elevação nesse fluxo. Pausa e cancelamento do contato preservam os valores confirmados. Cancelar a puxada antes da confirmação descarta a preparação sem chutar. Esta sequência substitui o disparo ao soltar a mira descrito nas revisões anteriores.
