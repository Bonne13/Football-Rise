# AGENTS.md — Footbal-Choyse

## Missão
Construir um jogo de carreira individual no futebol em que o jogador vive a trajetória dentro e fora de campo, começando na base e podendo chegar ao auge, seleção, declínio e aposentadoria. A partida jogável é o coração do jogo; o projeto não deve virar apenas um simulador de menus ou manager.

## Regra principal
O mundo do futebol existe independentemente do protagonista. Clubes contratam e vendem entre si, atletas evoluem, envelhecem, lesionam-se e se aposentam, competições avançam e notícias surgem mesmo quando não envolvem o jogador do usuário.

## Referência do projeto anterior
`Bonne13/Game-teste` é uma referência funcional e de ideias. Não modificar esse repositório a partir deste projeto e não copiar arquitetura ruim apenas por compatibilidade. Reaproveitar conceitos e, quando fizer sentido, lógica comprovada, reimplementando-a de forma modular.

## Pilares obrigatórios
1. Carreira partida a partida, com ações relevantes entre jogos.
2. Início na base: avaliação, treinamento, recrutamento e primeiro contrato.
3. OVR calculado por atributos e posição; potencial (POT) separado e parcialmente oculto.
4. Desenvolvimento influenciado por treino, minutos, desempenho, idade, potencial, treinador, instalações, moral, disciplina, lesões e decisões.
5. Mercado global autônomo e realista, não centrado no protagonista.
6. Clubes avaliam posição necessária, qualidade, potencial, idade, valor, salário, contrato, desempenho, orçamento, reputação e adequação esportiva.
7. Negociações possuem etapas: interesse/rumor, contato, proposta, negociação, acordo ou fracasso.
8. Jornalismo simulado com perfis e especialidades. Quando nomes de pessoas reais forem representados, todo conteúdo deve ser claramente tratado como simulação fictícia do save, sem sugerir declaração, participação ou endosso real.
9. Aposentadoria multifatorial: idade, físico, histórico de lesões, queda técnica, minutos, ofertas, contrato, motivação, conquistas, papel no clube e contexto pessoal.
10. Mundo persistente: temporadas mudam o futebol, não apenas os números do protagonista.
11. Preservar grande variedade de ligas e competições; a arquitetura de dados não deve limitar o número de países/ligas.
12. Saves devem ser versionados e preparados para migrações futuras.

## Gameplay
- O usuário controla o próprio jogador nas partidas.
- Desempenho em campo deve alimentar reputação, OVR/desenvolvimento, confiança do treinador, imprensa, mercado e seleção.
- Chances e participação dependem de posição, papel, minutos, confiança, tática e contexto da partida.
- Evitar resultados totalmente roteirizados.
- Sistemas do mundo devem usar aleatoriedade controlável/seed quando possível para permitir testes.

## Arquitetura
Organizar regras de domínio em módulos independentes da interface. UI não deve conter regras centrais de transferências, evolução, aposentadoria ou simulação mundial.

Domínios previstos:
- career
- player-development
- match
- training
- scouting/youth
- clubs
- competitions
- transfers/contracts
- world-simulation
- media
- injuries/health
- retirement
- international
- economy/life
- saves

## Dados reais e propriedade intelectual
A engine deve suportar nomes, escudos e elencos por pacotes de dados substituíveis. Não embutir automaticamente ativos protegidos obtidos da internet. Dados/licenças oficiais podem ser conectados depois. O código deve funcionar também com dados fictícios de desenvolvimento.

## Qualidade
- Preferir funções pequenas e testáveis.
- Evitar estado global mutável quando possível.
- Validar dados externos.
- Não quebrar saves sem migração.
- Criar testes para regras econômicas e probabilísticas importantes.
- Documentar decisões arquiteturais relevantes.
- Não adicionar dependências pesadas sem necessidade.

## Fluxo de desenvolvimento
Antes de uma mudança grande, verificar `docs/VISION.md`, `docs/ARCHITECTURE.md` e `docs/ROADMAP.md`. Implementar vertical slices jogáveis em vez de dezenas de sistemas incompletos. Cada etapa deve deixar o projeto executável e testável.
