# Catálogo de ligas e pacote ampliado

O catálogo registra 106 associações: 55 UEFA, 10 CONMEBOL e 41 CONCACAF. São 105 referências de primeira divisão; Liechtenstein não possui liga nacional própria. Guyana e Suriname pertencem à CONCACAF. Nomes comuns não significam licença comercial, aquisição de direitos de marca ou reprodução integral de regulamentos.

O pacote opcional `web/data/world-leagues.json` contém 526 clubes e 26 divisões com snapshots disponíveis em 17 países/sistemas de ligas. Todas as divisões encontradas na fonte são incluídas, conforme a preferência do usuário. Há dados de 2024/25 a 2026/27; temporadas históricas não confirmam participantes de 2026/27. Clubes não mapeados ficam em grupos auxiliares explicitamente identificados, sem supor que sejam da primeira divisão. Países sem participantes suficientes permanecem indisponíveis, embora catalogados.

Fonte das identidades e inscrições adicionais: https://github.com/openfootball/football.json/tree/e6744429ee395bc86f247348c6184bb08d4eb361 . Dados CC0; licença original preservada em OPENFOOTBALL-LICENSE.md. Importador: `python3 scripts/import-global-leagues.py /caminho/football.json`. Lê JSON local sem executar código externo, prioriza a fonte disponível mais recente e resolve aliases conhecidos. Não copia placares para a carreira.

Jogadores previamente existentes mantêm suas fontes comunitárias. Clubes novos não recebem elencos reais inventados; a simulação de NPCs continua identificando atletas genéricos como simulados. Parâmetros econômicos, avaliações e uniformes adicionais são procedurais, não dados oficiais. Estádios sem referência específica usam o fallback procedural. Não foi modificado Game-teste.

Ligas estrangeiras e divisões inferiores são separadas. Clubes canadenses da MLS continuam na liga dos Estados Unidos; clubes galeses do sistema inglês permanecem nesse sistema. A classificação continental usa a primeira divisão e a confederação apropriada. Libertadores/Sudamericana não repetem vagas entre si. Foram adicionadas Champions Cup da CONCACAF, copas Centro-Americana e Caribenha e Leagues Cup em formatos compactos. As divisões históricas são parciais quando inscrições posteriores de um clube têm precedência. Não há promoção/rebaixamento integral implementado.

O pacote é selecionado na criação de uma carreira. O calendário de um save existente é preservado; novas definições são aplicadas em nova carreira/temporada. O formato de save continua v3.

## Validação nesta alteração

Passaram a suíte de regras (16 arquivos) e o build web, incluindo composição das confederações, divisões distintas, classificação continental, clubes transfronteiriços, simulação, salvamento e recarga do mundo ampliado. O primeiro teste de navegador aguardou o painel sem sair da avaliação inicial, que é aberta automaticamente ao criar a carreira; o teste foi corrigido para percorrer essa saída. A repetição desse teste, as capturas e a publicação da galeria ficaram pendentes: a revisão automática de execução recusou a operação por limite de uso, sem determinação de insegurança. Com a execução restabelecida: `npm run test:leagues`, `npm run test:desktop` e `npm run test:browser`. Não publicar o jogo antes da revisão visual solicitada pelo usuário.
