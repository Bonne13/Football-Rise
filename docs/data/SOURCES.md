# Base comunitária 2026/27

O arquivo estático `web/data/community-2026-27.json` contém 238 clubes de 12 ligas e 4.605 registros nominais de jogadores. Europa: referência 2026/27; Brasil: referência 2026. Isso não equivale a todos os clubes do mundo nem a um cadastro oficial validado. Há 21 clubes sem jogadores após o filtro de vínculos antigos. Jogadores podem aparecer em mais de um registro de clube em fontes comunitárias; o total não afirma 4.605 pessoas únicas.

## Origem e transformação

Referência factual consultada somente para leitura: [Game-teste, snapshot a07d70c](https://github.com/Bonne13/Game-teste/tree/a07d70cf9164fb7743ee4ff5066b1aa260e3aad6), arquivos `club-database.js`, `themes.js` e `data/SOURCES.md`. O repositório de referência não foi modificado. A relação original de fontes e limitações está preservada em [REFERENCE-SOURCES.md](REFERENCE-SOURCES.md).

`python scripts/import-reference-data.py /caminho/Game-teste/club-database.js` normaliza os fatos locais sem executar JavaScript externo. Mantém nomes, posição, avaliação comunitária e origem por jogador. Exclui registros cuja origem diz `não confirmado` ou `snapshot 2025`. Não copia código da engine, imagens, escudos, fotografias, áudio, patrocinadores ou desenhos oficiais de camisas.

As fontes originais citadas pelo snapshot incluem [openfootball](https://github.com/openfootball/football.json), [FC27 comunitário](https://github.com/mattabelhom/fc-27-players-dataset), [Football_Players_Stats_2026-2027](https://github.com/payamhabibi/Football_Players_Stats_2026-2027) e [BRASIM26](https://github.com/glauber-molinari/BRASIM26). Esta normalização não verifica novamente cada transferência contra o clube ou transforma o snapshot em uma base oficial. A atribuição e as limitações são conservadas; novas imagens e pacotes devem ter autorização de uso adequada.

## O que é simulado ou ainda falta

- Elencos juvenis não constam do snapshot. Permanecem vazios, com números disponíveis, sem cadastrar jovens reais em equipes inventadas.
- A numeração não está na fonte: é atribuída pela simulação e marcada como não confirmada. Confiança, instalações, vagas e valores econômicos também são parâmetros do protótipo, não fatos reais.
- Ratings comunitários são estimativas para o jogo. Resultados e desenvolvimento são fictícios do save.
- Os três uniformes são desenhos procedurais provisórios com cores de referência dos clubes. **Não são reproduções verificadas dos três uniformes oficiais de 2026/27.** Faltam fonte e ativos autorizados para completar essa parte.
- Composição integral de algumas segundas divisões e vínculos individuais têm as limitações descritas nas fontes originais.

## Atualizar ou importar outro pacote

A tela de nova carreira permite selecionar a base embarcada, consultar os jogadores e importar um JSON. O formato é `FootballPack` em `src/data/football-pack.ts`; o arquivo embarcado serve como exemplo completo. Exige versão, identificador, temporada, fonte HTTPS, licença/condições de uso, descrição da cobertura e perfis de clube com três uniformes e elencos separados de base/principal.

Cada jogador fornece `id`, `name`, `position`, `number`, `numberVerified`, `overall`, `coachTrust` e `source`. IDs e números devem ser únicos dentro da equipe. Cada uniforme fornece nome, cores hexadecimais de camisa, detalhe, shorts, meias e número, mais padrão `plain`, `stripe` ou `hoops`. Imagens remotas e CSS arbitrário não são aceitos. A importação valida a estrutura; a correção histórica depende das fontes do pacote.

O pacote é copiado para o save de uma nova carreira, acompanha sua exportação e não substitui silenciosamente os clubes de uma carreira já iniciada. O limite por pacote/save é 10 MB; o navegador ainda pode impor um limite menor de armazenamento, e erros são exibidos sem descartar o save anterior.

O catálogo embarcado não inclui todos os clubes mundiais: contém as duas primeiras divisões de Inglaterra, Espanha, Itália, Alemanha, França e Brasil presentes no snapshot de referência. As cores de referência vêm de `themes.js`; os padrões e as combinações dos uniformes foram redesenhados proceduralmente e não atestam o catálogo oficial de camisas dessa temporada.
