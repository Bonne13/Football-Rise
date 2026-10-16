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

## Jogar no navegador (celular)

O site está preparado para GitHub Pages. Acesse o endereço exibido na última execução bem-sucedida de **Actions → Publicar Football Rise**. O endereço padrão esperado é `https://bonne13.github.io/Football-Rise/`; ele só funciona depois de habilitar o Pages e concluir o deploy.

Para a primeira ativação, o proprietário deve abrir **Settings → Pages → Build and deployment → Source → GitHub Actions**. Depois, em **Actions → Publicar Football Rise → Run workflow**, execute na branch `main`. Não é necessário mudar a privacidade do ambiente Codex nem configurar túneis.

O fluxo começa aos 14 anos (opções 15/16), passa por avaliação, treino, propostas, contrato, papel na base e preparação da estreia. Desempenho permite promoção aos 15/16 e propostas de outras bases ou principais durante a temporada. A partida controlável pertence à Fase 2; atuações são registradas manualmente para testar a progressão.

O save fica no navegador. **Baixar save** e **Importar save** transferem a carreira entre aparelhos; guarde um arquivo antes de limpar os dados do site. Formato `schemaVersion: 1`, com estado do RNG e validação no carregamento. Clubes e valores são fictícios, sem ativos protegidos.

### Desenvolvimento

Requer Node.js 24:

```sh
npm ci
npm run check
npm test
npm run build:web
```

Publique somente `dist-web/`. Os caminhos relativos funcionam no subdiretório `/Football-Rise/`. A página não deve ser aberta diretamente por `file://`: use hospedagem HTTP/HTTPS.
