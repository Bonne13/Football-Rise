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

O fluxo começa aos 14 anos (opções 15/16), passa por avaliação jogável, treino, propostas, contrato, papel na base e estreia por oportunidades controláveis. Desempenho permite promoção aos 15/16 e propostas de outras bases ou principais durante a temporada. A avaliação e a atuação recebem notas calculadas no campo, sem digitação manual. Partidas completas, ligas e mercado global continuam nas fases seguintes.

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

### Jogabilidade de fundamentos

O início foi inspirado na sequência do Game-teste: **finalização, visão, passe, velocidade, condução e falta**, com três tentativas por fundamento. As regras foram reimplementadas modularmente; o outro repositório não foi modificado.

- **Chute/passe/falta:** segure no campo, puxe na direção oposta à jogada e solte. A linha pontilhada mostra a trajetória; ajuste efeito lateral e elevação nos controles abaixo do campo.
- **Visão:** encontre um companheiro azul livre, observe a linha laranja de impedimento e evite os defensores vermelhos.
- **Velocidade:** toque no lado esquerdo/direito ou nos botões para trocar de faixa e desviar dos obstáculos.
- **Condução:** toque no destino para mover jogador e bola, complete os portões em ordem e evite cones.

O tempo começa na primeira ação. Na mira, o relógio pausa enquanto você segura. Use **Próxima tentativa** para salvar o resultado; **Pausar e voltar** permite continuar depois, inclusive após recarregar. Tentativas já confirmadas ficam no navegador; uma tentativa ainda não confirmada recomeça. A exportação do save da carreira não inclui sessões parciais de campo.

Depois da avaliação, **Praticar no campo** usa três tentativas e aplica desenvolvimento de acordo com a nota (nota zero gasta energia sem melhorar atributos). Na preparação da estreia, **Entrar em campo** oferece passe, finalização, condução e falta; gols e nota de atuação vêm dos resultados, sem formulário manual. Esta é uma partida por oportunidades, ainda sem simulação de 90 minutos ou companheiros controlados por IA. Saves existentes continuam funcionando; jogadores já avaliados podem testar os novos controles pelos treinos e pela próxima partida.
