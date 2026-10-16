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
