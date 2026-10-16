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

## Formatos especiais ainda não executados

Bélgica, Grécia, Argentina, Colômbia, México e MLS têm seus formatos históricos descritos na tela, com **execução simplificada** explícita. Não confundir cadastro do regulamento com implementação. Acesso/descenso, play-ins e torneios semestrais não foram implementados. Pacotes parciais mostram `clubes presentes / quantidade de referência`; o calendário se adapta aos clubes disponíveis sem inventar participantes.

## Persistência e arquitetura

O ID opcional `Tournament.regulationId` seleciona uma definição imutável (`rules-v1:*` ou `continental-v1:*`). Saves v3/world v1 anteriores, sem esse campo, continuam aceitos e preservam seu calendário e comportamento compacto. Não há migração que reescreva resultados. IDs desconhecidos ou incompatíveis com a competição são recusados. Mudanças futuras de regras exigem novos IDs.

Ida/volta compartilha competição, fase, rodada e adversários, com mandos invertidos; a decisão usa soma dos placares. O primeiro jogo pode terminar empatado sem pênaltis. No segundo, pênaltis só são válidos com empate no agregado, inclusive quando o placar daquele jogo não é um empate. Prorrogação não é simulada nesta versão.

Domínio calcula classificação, calendário, grupos e vencedores; dados descrevem referências; UI apenas apresenta; persistência valida os estados.

## Validação

`npm test` inclui calendário completo, mandos, adversários, minitabelas, divisões escocesa/austríaca, transporte dos pontos, agregado e pênaltis, 51 partidas na Champions Cup completa, grupos de cinco, finais continentais, rejeição de IDs inválidos e preservação de calendário sem ID. `npm run build:web` gera o site. `scripts/test-leagues.cjs` verifica o pacote de 526 clubes e 552 jogos da Championship no navegador, além de filtros, save, simulação semanal e layout móvel.

Publicação do jogo continua condicionada à aprovação visual já solicitada pelo usuário. A galeria de imagens pode ser atualizada separadamente.
