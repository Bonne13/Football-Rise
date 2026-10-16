/** Immutable v1 references. URLs identify the organiser, not a successful 2026/27 audit.
 * Never change an existing ID's sporting rules: saved editions retain that ID. */
export interface Regulation {
  id: string; key: string; name: string; reference: string; source: string;
  format: string; tiebreak: string; movement: string;
  engine: 'double-round-robin' | 'scottish-split' | 'austrian-split' | 'continental' | 'reference-only' | 'belgian-split' | 'greek-split' | 'argentine-cups' | 'colombian-cups' | 'mexican-liguilla' | 'mls-playoffs';
  expected: number; ranking: 'goals' | 'wins' | 'head-to-head';
}
const league = (key: string, name: string, expected: number, source: string, ranking: Regulation['ranking'] = 'goals', movement = 'Acesso, descenso e vagas continentais ainda não são executados pelo motor.'): Regulation => ({ id:`rules-v1:${key}`,key,name,expected,source,ranking,reference:'Formato de referência; edição 2026/27 não conferida online',format:`${expected} clubes; turno e returno; ${(expected-1)*2} partidas por clube. Vitória 3 pontos; empate 1.`,tiebreak:ranking==='wins'?'Pontos, vitórias, saldo de gols e gols marcados; confronto direto para dois empatados. Disciplina/sorteio não modelados.':ranking==='head-to-head'?'Pontos; minitabela de confrontos diretos entre os empatados; saldo e gols gerais. Critérios finais específicos dependem da edição.':'Pontos, saldo de gols e gols marcados. Critérios finais específicos dependem da edição.',movement,engine:'double-round-robin' });
const refs: Regulation[] = [
 league('league:Inglaterra','Premier League',20,'https://www.premierleague.com/'),
 league('league2:Inglaterra','EFL Championship',24,'https://www.efl.com/'),
 league('league3:Inglaterra','EFL League One',24,'https://www.efl.com/'),
 league('league4:Inglaterra','EFL League Two',24,'https://www.efl.com/'),
 league('league:Alemanha','Bundesliga',18,'https://www.dfl.de/'),
 league('league2:Alemanha','2. Bundesliga',18,'https://www.dfl.de/'),
 league('league:Espanha','LaLiga',20,'https://www.laliga.com/','head-to-head'),
 league('league2:Espanha','Segunda División',22,'https://www.laliga.com/','head-to-head'),
 league('league:França','Ligue 1',18,'https://www.lfp.fr/'),
 league('league2:França','Ligue 2',18,'https://www.lfp.fr/'),
 league('league:Itália','Serie A',20,'https://www.legaseriea.it/','head-to-head'),
 league('league2:Itália','Serie B',20,'https://www.legab.it/','head-to-head'),
 league('league:Países Baixos','Eredivisie',18,'https://eredivisie.nl/'),
 league('league:Portugal','Primeira Liga',18,'https://www.ligaportugal.pt/','head-to-head'),
 league('league:Brasil','Campeonato Brasileiro Série A',20,'https://www.cbf.com.br/','wins'),
 league('league2:Brasil','Campeonato Brasileiro Série B',20,'https://www.cbf.com.br/','wins'),
 league('league:Turquia','Süper Lig',18,'https://www.tff.org/','head-to-head'),
 league('league2:Áustria','2. Liga',16,'https://www.2liga.at/'),
];
const special = (key:string,name:string,expected:number,source:string,format:string,engine:Regulation['engine']='reference-only'):Regulation => ({id:`rules-v1:${key}`,key,name,expected,source,format,engine,ranking:'goals',reference:'Referência histórica do catálogo; regulamento 2026/27 pendente de conferência',tiebreak:'Critérios específicos da edição precisam de conferência; não há certificação de reprodução integral.',movement:'Acesso, descenso, vagas e exceções da edição ainda não executados.'});
refs.push(
 special('league:Escócia','Scottish Premiership',12,'https://spfl.co.uk/','33 rodadas (três turnos); divisão em dois grupos de seis; mais cinco rodadas dentro de cada grupo. Pontos mantidos.', 'scottish-split'),
 special('league:Áustria','Bundesliga austríaca',12,'https://www.bundesliga.at/','22 rodadas; grupos de título e permanência com seis clubes; pontos divididos por dois e arredondados para baixo; mais dez rodadas.','austrian-split'),
 special('league:Bélgica','Belgian Pro League',16,'https://www.proleague.be/','Referência 2025/26: 30 rodadas; grupos de título (6), Europa (6) e permanência (4), com pontuação e séries próprias. Não presumir este formato para 2026/27.'),
 special('league:Grécia','Super League Greece',14,'https://www.slgr.gr/','Referência 2025/26: 26 rodadas; grupos 1–4, 5–8 e 9–14; número de turnos e transporte dos pontos variam por grupo.'),
 special('league:Argentina','Liga Profesional de Fútbol',30,'https://www.ligaprofesional.ar/','Referência 2025: Apertura e Clausura; duas zonas de 15, jogos interzonais e mata-mata com os oito primeiros de cada zona.'),
 special('league:Colômbia','Liga BetPlay DIMAYOR',20,'https://dimayor.com.co/','Referência 2025: Apertura e Finalización; fase regular, dois quadrangulares de quatro classificados e final em ida e volta em cada torneio.'),
 special('league:México','Liga MX',18,'https://ligamx.net/','Referência 2024/25: Apertura e Clausura; 17 rodadas cada, play-in e liguilla com ida e volta. Critérios de desempate diferem por fase.'),
 special('league:Estados Unidos','Major League Soccer',30,'https://www.mlssoccer.com/','Referência 2025: duas conferências; 34 jogos por clube, calendário não simétrico, wild cards, primeira rodada melhor de três e demais fases eliminatórias.')
);
const legacy: readonly Regulation[] = [...refs];
const engines: Record<string,Regulation['engine']> = {'league:Bélgica':'belgian-split','league:Grécia':'greek-split','league:Argentina':'argentine-cups','league:Colômbia':'colombian-cups','league:México':'mexican-liguilla','league:Estados Unidos':'mls-playoffs'};
const specialFormats:Record<string,string>={
 'league:Bélgica':'Referência 2025/26: 30 rodadas; grupos de título (6), Europa (6) e permanência (4). Mais dez jogos nos grupos de seis e seis no grupo de quatro. Pontos dos dois primeiros grupos divididos por dois, arredondados para cima; permanência mantém pontos.',
 'league:Grécia':'Referência 2025/26: 26 rodadas; grupos 1–4, 5–8 e 9–14 em turno e returno. Grupos de título e permanência mantêm pontos; grupo 5–8 recebe metade, arredondada para cima.',
 'league:Argentina':'Referência 2025: Apertura e Clausura independentes; duas zonas de 15, 16 jogos por clube incluindo dois interzonais; oito primeiros por zona; oitavas, quartas e semifinais em jogo único e final neutra.',
 'league:Colômbia':'Referência 2025: Apertura e Finalización independentes; 20 jogos na fase regular, incluindo rodada regional; oito classificados, dois quadrangulares de quatro em ida e volta; final em dois jogos.',
 'league:México':'Referência 2024/25: Apertura e Clausura independentes; 17 rodadas; 1º–6º nas quartas, 7º–10º no play-in (7×8, 9×10 e repescagem). Quartas, semifinais e final em ida e volta; chave resemeada pela fase regular.',
 'league:Estados Unidos':'Referência 2025: duas conferências de 15; 34 jogos (28 na conferência e seis cruzados). Sete classificados diretos e wild card entre 8º e 9º por conferência; primeira rodada melhor de três, demais fases em jogo único.'
};
const prior: readonly Regulation[] = refs.map(r=>engines[r.key]?{...r,id:`rules-v2:${r.key}`,engine:engines[r.key]!,format:specialFormats[r.key]!,reference:r.key==='league:México'?'Referência 2024/25 do catálogo': ['league:Bélgica','league:Grécia'].includes(r.key)?'Referência 2025/26 do catálogo':'Referência 2025 do catálogo',tiebreak:r.key==='league:Estados Unidos'?'Pontos, vitórias, saldo e gols; playoffs decididos por vitórias. Disciplina/sorteio final ainda não modelados.':r.key==='league:México'?'Play-in por pênaltis; quartas e semifinais pelo agregado e posição na fase regular; final empatada no agregado por pênaltis.':r.key==='league:Colômbia'?'Pontos, saldo e gols; cabeças de chave dos quadrangulares têm vantagem no empate em pontos.':r.tiebreak}:r);
export const REGULATIONS: readonly Regulation[] = prior.map(r=>['league:Inglaterra','league2:Inglaterra','league3:Inglaterra','league4:Inglaterra','league:Brasil','league2:Brasil'].includes(r.key)?{...r,id:r.id.replace('rules-v1:','rules-v3:'),movement:'Acesso/descenso entre divisões com participantes completos e temporadas concluídas; Inglaterra inclui playoffs. Pacotes parciais mantêm suas divisões.'}:r.id.startsWith('rules-v2:')?{...r,id:r.id+':extra-time-v1'}:r);
export const regulationFor = (key:string) => REGULATIONS.find(r=>r.key===key.replace('league-clausura:','league:'));
export const regulationById = (id:string|undefined) => [...REGULATIONS,...prior,...legacy].find(r=>r.id===id);
export const isSpecialRegulation = (t:{regulationId?:string}) => t.regulationId?.startsWith('rules-v2:')===true;
export const regulationMatchesKey = (id:string,key:string) => {
 const r=regulationById(id);return !!r && (r.key===key || id.startsWith('rules-v2:') && ['argentine-cups','colombian-cups','mexican-liguilla'].includes(r.engine) && r.key===key.replace('league-clausura:','league:'));
};
export const REAL_CUP_NAMES: Readonly<Record<string,string>> = {
 Brasil:'Copa do Brasil',Inglaterra:'FA Cup',Espanha:'Copa del Rey',Itália:'Coppa Italia',Alemanha:'DFB-Pokal',França:'Coupe de France',Portugal:'Taça de Portugal',Canadá:'Canadian Championship','Estados Unidos':'U.S. Open Cup',Argentina:'Copa Argentina',Áustria:'ÖFB-Cup',Bélgica:'Belgian Cup',Colômbia:'Copa Colombia',Escócia:'Scottish Cup',Grécia:'Greek Cup',Turquia:'Türkiye Kupası','Países Baixos':'KNVB Beker','País de Gales':'Welsh Cup',Liechtenstein:'Liechtenstein Cup'
};
