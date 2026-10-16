# Fontes e limites dos snapshots

Referência solicitada: Europa 2026/27; Brasil 2026. A importação mantém os nomes reais disponíveis e não inventa nomes para preencher elencos.

- [openfootball/football.json](https://github.com/openfootball/football.json): clubes dos calendários 2026/27 das cinco primeiras divisões europeias e Championship; Brasil A de 2026. Fonte CC0. Resultados oficiais não são utilizados como resultados da carreira.
- [openfootball/deutschland](https://github.com/openfootball/deutschland): clubes da 2. Bundesliga 2026/27, a partir do arquivo OpenLigaDB.
- [mattabelhom/fc-27-players-dataset](https://github.com/mattabelhom/fc-27-players-dataset): snapshot comunitário de 11/10/2026, extraído do FIFPlay. Nomes, posições, clubes e atributos, sem imagens. Ratings não são uma classificação oficial deste projeto. Não há vínculo com EA ou FIFPlay.
- [payamhabibi/Football_Players_Stats_2026-2027](https://github.com/payamhabibi/Football_Players_Stats_2026-2027): nomes e vínculos dos jogadores das cinco grandes ligas, provenientes de uma base FBref da temporada. Prioridade sobre cadastros históricos.
- [glauber-molinari/BRASIM26](https://github.com/glauber-molinari/BRASIM26): snapshot nominal do Brasil A, de junho de 2026. A própria fonte declara vínculos aproximados. Não foram copiados imagens, áudio nem o código do jogo.
- [salimt/football-datasets](https://github.com/salimt/football-datasets): cadastro nominal Transfermarkt de 2025 para lacunas. A atualização de lesões de setembro de 2026 não atualiza os elencos de 2025. Jogadores desta fonte têm o vínculo 2026 explicitamente marcado como não confirmado.

## Cobertura incompleta

A composição das segundas divisões espanhola, italiana e francesa é um cadastro comunitário auxiliar de acesso, ainda sem confirmação integral de 2026/27. A lista brasileira B é um cadastro comunitário de 2026. Esses níveis têm nomes de clubes reais, mas não devem ser tratados como uma base oficial validada. A composição e os vínculos podem ser corrigidos pela atualização do snapshot.

`coverage.json` registra por clube a quantidade de atletas e as fontes utilizadas. Elencos que não oferecem onze jogadores reais disponíveis ficam incompletos, sem substitutos inventados. Parte dos ratings é uma estimativa própria do protótipo, identificada na origem. Toda estatística, resultado, promoção e premiação produzida durante a carreira é uma simulação.

`tools/import-football-data.py` documenta a transformação dos fatos locais para `club-database.js`. Os snapshots são incorporados no executável para permitir jogar sem internet.

## Nacionalidades / seleções (menu de carreira)

`nationalities.js` reúne 193 membros da ONU, os dois Estados observadores (Santa Sé e Palestina) e as 211 associações da FIFA em 220 opções sem duplicatas. Membros FIFA como Inglaterra, Escócia, País de Gales e Irlanda do Norte aparecem separadamente do Reino Unido; associações de territórios são identificadas pelo nome da seleção. A lista não representa licença comercial nem afirmação de reconhecimento estatal pela FIFA.

Fontes: https://www.un.org/en/about-us/member-states · https://www.un.org/en/about-us/non-member-states · https://inside.fifa.com/associations . Nomes de países em português pelo Intl.DisplayNames; nomes de associações específicos estão explícitos no arquivo.
