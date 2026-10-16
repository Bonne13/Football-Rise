# Football Rise

## From Rookie to Legend

**Football Rise** é um jogo de carreira individual no futebol em que você começa como uma jovem promessa e constrói sua própria trajetória até tentar se tornar uma lenda.

O projeto combina partidas jogáveis com um mundo de futebol persistente e dinâmico. O universo continua evoluindo independentemente do protagonista: clubes negociam, jogadores se transferem, evoluem, envelhecem e se aposentam, enquanto competições, rivalidades e histórias acontecem ao redor da carreira.

## Visão

A experiência acompanha toda a vida esportiva do atleta: base, primeiro contrato, disputa por minutos, evolução, transferências, seleção, auge, declínio e aposentadoria.

O jogador controla o próprio atleta nas partidas. **Football Rise não é apenas um simulador de menus ou de gestão**: jogar futebol é o núcleo da experiência.

## Pilares iniciais

- Carreira começando na base e avançando até a aposentadoria.
- Partidas jogáveis como núcleo da experiência.
- Treinamentos, atributos, OVR e potencial.
- Recrutamento e conquista de espaço no elenco.
- Mercado global de transferências entre clubes controlados pela IA.
- Contratos, salários, agentes, empréstimos e negociações.
- Notícias, rumores, entrevistas e jornalistas dentro de um universo simulado.
- Lesões, saúde, forma, moral e confiança do treinador.
- Aposentadoria baseada em múltiplos fatores, não somente idade.
- Competições nacionais, continentais e seleções.
- Mundo persistente com evolução de clubes e jogadores.
- Saves independentes e carreiras de longa duração.

## Identidade

**Nome:** Football Rise  
**Slogan:** *From Rookie to Legend*

## Estado

Em desenvolvimento — fundação da engine de carreira e primeira vertical slice.

## Jogar no navegador (computador e celular)

O site está preparado para GitHub Pages. Acesse o endereço exibido na última execução bem-sucedida de **Actions → Publicar Football Rise**. O endereço padrão esperado é `https://bonne13.github.io/Football-Rise/`; ele só funciona depois de habilitar o Pages e concluir o deploy.

Para a primeira ativação, o proprietário deve abrir **Settings → Pages → Build and deployment → Source → GitHub Actions**. Depois, em **Actions → Publicar Football Rise → Run workflow**, execute na branch `main`. Não é necessário mudar a privacidade do ambiente Codex nem configurar túneis.

O fluxo começa aos 14 anos (opções 15/16), passa por avaliação jogável, treino, propostas, contrato, papel na base e estreia por oportunidades controláveis. Desempenho permite promoção aos 15/16 e propostas de outras bases ou principais durante a temporada. A avaliação e a atuação recebem notas calculadas no campo, sem digitação manual. Partidas completas, ligas e mercado global continuam nas fases seguintes.

O save fica no navegador. **Baixar save** e **Importar save** transferem a carreira entre aparelhos; guarde um arquivo antes de limpar os dados do site. Formato `schemaVersion: 2`, com migração automática de saves v1 e validação no carregamento. Há clubes fictícios e uma base comunitária opcional de 238 clubes e 4.605 registros nominais de jogadores. Ela cobre parcialmente Europa 2026/27 e Brasil 2026. Vínculos, números e uniformes têm limitações explícitas em [Fontes e cobertura](docs/data/SOURCES.md); os uniformes não são reproduções oficiais verificadas.

### Desenvolvimento

Requer Node.js 24:

```sh
npm ci
npm run check
npm test
npm run build:web
```

Publique somente `dist-web/`. Os caminhos relativos funcionam no subdiretório `/Football-Rise/`. A página não deve ser aberta diretamente por `file://`: use hospedagem HTTP/HTTPS.

### Jogabilidade de fundamentos

O início foi inspirado na sequência do Game-teste: **finalização, visão, passe, velocidade, condução e falta**, com três tentativas por fundamento. As regras foram reimplementadas modularmente; o outro repositório não foi modificado.

- **Chute/passe/falta:** arraste para trás no campo para definir mira e força. Solte para confirmar. Só então aparece a bola: clique/toque nela para escolher a curva e executar com a mira e força guardadas. Não há segunda puxada.
- **Visão:** encontre um companheiro azul livre, observe a linha laranja de impedimento e evite os defensores vermelhos.
- **Velocidade:** toque no lado esquerdo/direito ou nos botões para trocar de faixa e desviar dos obstáculos.
- **Condução:** toque no destino para mover jogador e bola, complete os portões em ordem e evite cones.

O tempo da tentativa começa quando a jogada é executada; a preparação da mira não consome tempo. Use **Próxima tentativa** para salvar o resultado; **Pausar e voltar** permite continuar depois, inclusive após recarregar. Tentativas já confirmadas ficam no navegador; uma tentativa ainda não confirmada recomeça. A exportação do save da carreira não inclui sessões parciais de campo.

Depois da avaliação, **Praticar no campo** usa três tentativas e aplica desenvolvimento de acordo com a nota (nota zero gasta energia sem melhorar atributos). Na preparação da estreia, **Entrar em campo** oferece passe, finalização, condução e falta; gols e nota de atuação vêm dos resultados, sem formulário manual. Esta é uma partida por oportunidades, ainda sem simulação de 90 minutos ou companheiros controlados por IA. Saves existentes continuam funcionando; jogadores já avaliados podem testar os novos controles pelos treinos e pela próxima partida.

### Campo e mira 3D

O campo usa WebGL/Three.js com câmera por trás do jogador, bola esférica texturizada, jogadores, goleiro, trave/rede, trajetória e rastro em 3D. As geometrias são procedurais; a biblioteca Three.js é distribuída localmente com sua licença MIT, sem depender de CDN.

1. **Puxe para trás no campo** com mouse ou dedo. O deslocamento lateral reverso mira, e a distância da puxada dosa força. A barra mostra percentual e velocidade calculada pelos atributos do atleta.
2. **Solte para confirmar mira e força.** A bola de curva aparece somente depois. Clique/toque no centro para chute reto ou nas laterais para curva; soltar esse toque executa.
3. **Refazer mira** é opcional: descarta a preparação e permite outro gesto. Pausar conserva os valores já confirmados. A câmera mantém o enquadramento entre as etapas, sem ampliar o gol antes da mira.

Passe, visão, técnica e velocidade usam zonas de meio-campo; chutes/faltas variam lado e distância. Há três cenários por fundamento, reproduzíveis pela seed e tentativa. A câmera acompanha o jogador na condução. No teclado, setas ajustam antes de confirmar, espaço confirma/executa e Escape pausa.

No **Vestiário**, escolha número de 1 a 99 e um dos três uniformes. Números livres são imediatos; ocupados exigem a confiança e OVR exibidos. Nos treinos o atleta veste colete laranja. Na nova carreira, o botão **Usar base comunitária 2026/27** carrega o catálogo de clubes e jogadores; a seleção não altera carreiras existentes. Pacotes próprios podem ser importados pelo formato documentado em [docs/data/SOURCES.md](docs/data/SOURCES.md).

Para celulares sem WebGL, o jogo avisa e abre o campo 2D automaticamente, mantendo a seleção da mira e um controle de bola desenhado em 2D. O modo gráfico não modifica o formato dos saves ou as regras de resultados.

### Teste de regressão dos controles

`npm run test:browser` verifica a sequência com toque, cancelamento, potência guardada, curva, pausa/som, saída com salvamento, retomada e layout de 320 px. `npm run test:desktop` verifica catálogo comunitário, disputa por número, escolha de uniforme, persistência e o mesmo fluxo com mouse, incluindo câmera sem salto ao confirmar. Ambos geram o site e fecham servidor/navegador ao terminar.

Use Chromium em `/usr/bin/chromium`, informe `CHROMIUM_PATH` ou instale com `npx playwright install chromium`. Playwright é dependência só de desenvolvimento. Capturas ficam em `football-rise-browser/` no diretório temporário do sistema.

### Estádios e revisão visual

Os estádios procedurais têm quatro arquibancadas, dois gols, tamanhos local/regional/arena e paisagens urbanas, montanhosas, rurais ou costeiras. Clube, país e cidades catalogadas selecionam o perfil; são cenários simulados, sem reprodução oficial de estádios reais. **Pausar → Conhecer o estádio** abre a visão panorâmica com o exercício congelado.

Após `npm run build:web`, `node scripts/capture-review.cjs` produz capturas reais em `/tmp/football-rise-review/` para revisão antes de publicar. A geração de capturas não faz commit ou deploy.

### Competições e sala de troféus — prévia v3

A carreira agora integra liga da base/principal, copas nacionais, catálogo dos 27 estaduais brasileiros, Libertadores, Champions League, Europa League, Conference League e Copa do Mundo. No painel **Calendário e competições**, acompanhe tabelas, grupos, mata-mata, pênaltis, resultados e artilharia. Os outros clubes jogam mesmo sem participação do protagonista. Competições sem clubes suficientes ficam identificadas como indisponíveis. Os formatos/calendários são compactos e simulados; participantes e regulamentos oficiais completos ainda não são reproduzidos. As limitações estão em [ARCHITECTURE.md](docs/ARCHITECTURE.md#competições-calendário-e-premiações--save-v3).

A base não disputa automaticamente torneios adultos. Convocação para a Copa exige principal, idade, habilidade, confiança, minutos e desempenho. Há premiações de campeão, artilheiro, melhor jogador, revelação, goleiro, seleção do torneio e jogador da temporada, calculadas a partir das atuações. A **Sala de troféus** conserva suas conquistas. **Avançar uma semana sem atuar** simula o calendário sem inventar estatísticas para seu atleta.

O formato atual é `schemaVersion: 3`, com migração de saves v1/v2. O navegador usa IndexedDB para acomodar o calendário, preservando exportação/importação e fallback legado. O limite por save é 32 MB; pacotes de dados mantêm o limite de 10 MB. Renovação permite continuar além do primeiro contrato, nos últimos seis meses e com confiança suficiente.

O menu de pausa também tem **Ver jogador** e qualidade gráfica **Automática / Alta / Leve**. O jogo permanece por oportunidades controláveis, sem afirmar uma partida completa de 90 minutos com 22 jogadores de IA.

Para verificar os controles e gerar capturas de revisão dos uniformes: `npm run test:controls` (Chromium disponível no ambiente). A condução aceita arraste contínuo no campo, WASD/setas e clique em destino; solte o direcional para frear. Na inspeção do atleta, “Ver costas” mostra a numeração integrada ao tecido.

Os atletas agora usam pixel art/2D no campo 3D. “Ver jogador” na pausa oferece frente/costas e uma biblioteca demonstrativa de cabeceio, bicicleta, voleio, comemoração, cartões e lesão. Comemoração e sinais do árbitro acompanham gols/impedimentos reais da oportunidade; as demais demonstrações não aplicam eventos na carreira. Gol exige a bola inteira além da linha; impedimento usa snapshot dos corpos no passe.

VAR e bandeirinhas: após uma oportunidade resolvida, use **Pausar → Rever lance com VAR**. Em partidas, gols/impedimentos envolvidos abrem a sequência automaticamente. Há take da sala com três integrantes, monitor de campo e deslocamento do árbitro; pausa, barra e retorno preservam o resultado. O protocolo é cinematográfico simplificado, com telas de evidência geométrica. Verificação: `npm run test:var`.

Na pausa, **Uniforme da arbitragem** oferece preto, amarelo, vermelho e escolha automática por contraste. Árbitros/bandeirinhas usam roupas sem números ou inscrições; os três profissionais da central aparecem sentados.
