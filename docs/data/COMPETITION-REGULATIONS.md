# Nomes e regulamentos de referência

Atualizado em 16/10/2026. Dados esportivos textuais, sem escudos ou novos ativos.

## Fontes e limite de verificação

`src/data/competition-regulations.ts` registra nomes usuais, organizadores, formatos e cobertura do motor para as 26 divisões atualmente presentes nos snapshots. Os anos dos participantes continuam em `league-snapshots.ts`; não foram convertidos artificialmente para 2026/27.

Tentativas de consultar UEFA Documents, Premier League, CONCACAF, CONMEBOL e FIFA nesta execução receberam `Tunnel connection failed: 403 Forbidden`. Assim, links de organizadores são referências para conferência, não evidência de consulta bem-sucedida. **Nenhum regulamento integral de 2026/27 é anunciado como verificado.**

## Regras executadas nas novas edições

- 18 divisões regulares: turno e returno; 3/1/0 pontos. Inglaterra, Alemanha, França e Países Baixos usam saldo/gols; Brasil usa vitórias antes do saldo; Espanha, Itália, Portugal e Turquia usam minitabela dos empatados antes dos critérios gerais. São critérios principais: decisões especiais de título, reaplicação de minitabelas, disciplina e sorteios oficiais não estão integralmente modelados.
- Escócia: 33 rodadas; grupos superior/inferior de seis; cinco partidas adicionais; pontos mantidos. Campeão apenas no grupo superior. Balanceamento real de mandos ao longo dos quatro confrontos não reproduzido integralmente.
- Áustria: 22 rodadas; dois grupos de seis; pontos divididos por dois, arredondados para baixo; dez rodadas adicionais. Vantagem em empate por meio ponto removido e repescagens europeias ainda pendentes.
- UEFA: 36 clubes, 8 adversários (Champions/Europa) ou 6 (Conference), mandos 4/4 ou 3/3; top oito nas oitavas, 9–24 no playoff; ida e volta no playoff/mata-mata, final única. Potes, restrições por federação, pareamento oficial, acesso e preliminares ainda simulados.
- Libertadores/Sudamericana: grupos de quatro com seis jogos; eliminatórias em ida e volta e final única. Sudamericana ainda avança dois por grupo: integração com terceiros da Libertadores pendente, indicada na interface.
- Champions Cup: até 27 clubes, cinco byes com catálogo completo; ida/volta e final única. Central American Cup: quatro grupos de cinco; Caribbean Cup: dois grupos de cinco; quatro jogos por clube, dois classificados por grupo, ida/volta inclusive final. Acesso/vagas e critérios próprios de gol fora ainda exigem conferência; o motor usa agregado sem vantagem de gol fora.
- Copa do Mundo: mantém 48 seleções simuladas, 12 grupos, dois classificados e oito terceiros. Gols marcados foram incluídos na comparação dos terceiros. Matriz oficial do chaveamento, terceiro lugar, disciplina e prorrogação ainda pendentes.

Copas nacionais só são criadas quando existe nome de referência catalogado. Não se inventa mais uma copa nacional genérica em cada país nem uma Copa MX atual. Copas nacionais e estaduais continuam compactas, claramente indicadas, até receberem regulamentos próprios. Leagues Cup conserva seu modelo anterior com aviso explícito de revisão pendente.

## Formatos especiais executados em novas edições

`rules-v2:*` ativa seis controladores independentes em `special-formats.ts`. As definições `rules-v1:*` continuam disponíveis para saves anteriores, sem reinterpretação.

| Competição e referência | Execução | Jogos com pacote completo |
| --- | --- | --- |
| MLS 2025 | Leste/Oeste reais; 34 jogos por clube; wild card 8×9 por conferência; sete vagas diretas; primeira rodada melhor de três; semifinais/finais de conferência e MLS Cup em jogo único | 510 na fase regular; 2 wild cards; 16–24 na série; 7 nos demais mata-matas |
| Argentina 2025 | Apertura e Clausura separados; zonas A/B reais de 15; 14 confrontos intrazonais e dois interzonais por clube; oito classificados por zona; oitavas, quartas e semifinais em jogo único com mando por classificação; final neutra | 240 + 15 = 255 por torneio |
| Colômbia 2025 | Apertura e Finalización separados; 20 jogos por clube incluindo rodada regional; oito classificados; quadrangulares de quatro em ida/volta com pontos zerados e vantagem do cabeça de chave no empate em pontos; final em ida/volta | 200 + 24 + 2 = 226 por torneio |
| México 2024/25 | Apertura e Clausura separados; 17 jogos; seis vagas diretas; 7×8 e 9×10, depois perdedor do primeiro contra vencedor do segundo; quartas e semifinais resemeadas, em ida/volta com vantagem de classificação no empate agregado; final em ida/volta sem essa vantagem | 153 + 3 + 14 = 170 por torneio |
| Bélgica 2025/26 | 30 jogos; grupos 6/6/4; dez jogos adicionais nos dois primeiros, seis no terceiro; metade dos pontos arredondada para cima nos grupos de título/Europa; pontos integrais na permanência | 312 |
| Grécia 2025/26 | 26 jogos; grupos 4/4/6; seis ou dez jogos adicionais; grupo 5–8 recebe metade dos pontos arredondada para cima; demais mantêm os pontos | 236 |

Nos grupos com arredondamento para cima, o benefício do meio ponto é removido no desempate em pontos. Critérios disciplinares, reaplicações específicas de confronto direto e sorteios oficiais ainda não são completos; a interface mantém essa indicação.

O controlador cria o terceiro jogo de uma série MLS **somente** se os dois primeiros terminarem 1–1 em vitórias. Cada partida empatada da série é decidida por pênaltis, sem somar gols entre jogos. Quartas/semifinais mexicanas empatadas no agregado classificam o melhor da fase regular e não aceitam pênaltis; a final empatada exige desempate. Prorrogação continua fora do motor.

### Dados locais e reprodução

`scripts/import-special-schedules.py` lê apenas JSON do checkout CC0 Openfootball fixado em `e6744429ee395bc86f247348c6184bb08d4eb361`. Gera `src/data/special-schedules.ts` com 510 confrontos da MLS (`2025/mls.json`), 240 da Argentina (`2025/ar.1.json`) e 200 da Colômbia (`2025/co.1.json`). Não importa placares, campeões ou ativos gráficos. A licença já está em `docs/data/OPENFOOTBALL-LICENSE.md`.

O importador verifica as conferências/zonas e os números de jogos cruzados por clube. Para o segundo torneio argentino/colombiano, os mandos da referência são invertidos; isso não é anunciado como cópia do calendário oficial do Clausura/Finalización. México usa sorteio circular da fase regular. Calendários são posicionados dentro do ano de carreira julho–junho; datas reais não foram importadas.

Pacotes completos fictícios recebem zonas/conferências e confrontos procedurais, com aviso. Se faltar a quantidade necessária de clubes em um dos seis formatos, a edição fica indisponível em vez de simular uma fase de tamanho incorreto. Acesso/descenso, tabela anual para vagas externas, repescagens europeias e decisões de vagas dependentes de outras copas ainda não são executados. As temporadas históricas acima **não confirmam as regras de 2026/27**.

## Persistência e arquitetura

O ID opcional `Tournament.regulationId` seleciona uma definição imutável (`rules-v1:*`, `rules-v2:*` ou `continental-v1:*`). Saves v3/world v1 anteriores, sem esse campo, continuam aceitos e preservam seu calendário e comportamento compacto. Não há migração que reescreva resultados. IDs desconhecidos ou incompatíveis com a competição são recusados. Mudanças futuras de regras exigem novos IDs. Os dois torneios semestrais têm IDs de competição e premiações próprios (`league:*` e `league-clausura:*`), evitando sobrescrever um campeão pelo outro.

Ida/volta compartilha competição, fase, rodada e adversários, com mandos invertidos; a decisão usa soma dos placares. O primeiro jogo pode terminar empatado sem pênaltis. No segundo, pênaltis só são válidos com empate no agregado, inclusive quando o placar daquele jogo não é um empate. Prorrogação não é simulada nesta versão.

Domínio calcula classificação, calendário, grupos e vencedores; dados descrevem referências; UI apenas apresenta; persistência valida os estados.

## Validação

`npm test` inclui calendário completo, mandos, adversários, minitabelas, divisões escocesa/austríaca, transporte dos pontos, agregado e pênaltis, 51 partidas na Champions Cup completa, grupos de cinco, finais continentais, rejeição de IDs inválidos e preservação de calendário sem ID. `special-formats.test.ts` cobre as seis ligas, série MLS 2–0/1–1, bracket de conferência, play-in mexicano, desempate por posição, quadrangulares com pontos zerados, transporte dos pontos, títulos semestrais e retomada determinística. `npm run build:web` gera o site. `scripts/test-leagues.cjs` verifica o pacote de 526 clubes e 552 jogos da Championship no navegador, além de filtros, save, simulação semanal e layout móvel.

`npm run test:special-leagues` verifica conferências, wild cards, série, play-in, grupos e campeões no navegador; inclui persistência de um mundo completo de aproximadamente 11 MB e layout móvel.

Publicação do jogo continua condicionada à aprovação visual já solicitada pelo usuário. A galeria de imagens pode ser atualizada separadamente.
