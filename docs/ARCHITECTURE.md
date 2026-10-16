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

Referência consultada somente para leitura: `Bonne13/Game-teste`, commit `a07d70cf9164fb7743ee4ff5066b1aa260e3aad6`, em especial `training-engine.js`, `training.js` e `match-input.js`. Foram reutilizados conceitos de arrasto reverso, três tentativas por fundamento, antecipação de passes, obstrução de trajetória, impedimento, barreira/efeito e condução. Não foram copiados banco de clubes, marcas, assets nem a arquitetura global do protótipo. O renderer é Canvas 2D com perspectiva, sem biblioteca 3D externa.

- `src/domain/gameplay/trial.ts`: estado local de cada tentativa, entradas, tempo, movimento, colisões e resultados. Subpassos separam regras da frequência de renderização.
- `src/application/drills.ts`: sequência de fundamentos, histórico de notas, retomada e projeção dos resultados em atributos/atuação. Força, marcação, defesa de gol e compostura usam estimativas derivadas; não são testes específicos dessas habilidades nesta etapa.
- `src/ui/field.ts`: desenho e Pointer Events para toque/mouse, teclado e ciclo de animação descartável. Não calcula notas, gols ou elegibilidade. Pausa na mira e ao ocultar a aba, cancela gestos interrompidos e captura o ponteiro durante arrasto.
- `src/ui/browser.ts`: grava sessões confirmadas em armazenamento separado, sem alterar o formato versionado 1 da carreira. Ao concluir, aplica o resultado pelos casos de uso existentes. Falhas de persistência mantêm o estado anterior.

A estreia é um conjunto limitado de oportunidades controláveis, que pode produzir gols reais e uma nota de atuação calculada. Passe recebido não conta automaticamente como assistência. A integração não afirma que exista uma simulação completa de partidas ou equipes. O `Game-teste` permanece independente e inalterado.
