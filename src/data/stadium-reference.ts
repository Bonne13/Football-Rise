/** Historical home-ground references, not a verified 2026/27 venue schedule.
 * Capacity bands are rounded visual inputs, not certified seating capacities.
 * Common non-sponsored names are preferred; redevelopment/temporary moves may differ.
 */
export interface StadiumReference { club: string; country: string; name: string; city: string; capacity: number }
const rows: Record<string, string> = {
"Inglaterra": `Arsenal|Emirates Stadium|Londres|60
Aston Villa|Villa Park|Birmingham|43
Bournemouth|Dean Court|Bournemouth|11
Brentford|Brentford Community Stadium|Londres|17
Brighton|Falmer Stadium|Brighton|32
Chelsea|Stamford Bridge|Londres|40
Coventry City|Coventry Building Society Arena|Coventry|33
Crystal Palace|Selhurst Park|Londres|25
Everton|Hill Dickinson Stadium|Liverpool|53
Fulham|Craven Cottage|Londres|29
Hull City|MKM Stadium|Hull|25
Ipswich Town|Portman Road|Ipswich|30
Leeds United|Elland Road|Leeds|38
Liverpool|Anfield|Liverpool|61
Manchester City|City of Manchester Stadium|Manchester|55
Manchester United|Old Trafford|Manchester|74
Newcastle United|St James' Park|Newcastle upon Tyne|52
Nottingham Forest|City Ground|Nottingham|30
Sunderland|Stadium of Light|Sunderland|49
Tottenham|Tottenham Hotspur Stadium|Londres|63
Birmingham City|St Andrew's|Birmingham|30
Blackburn Rovers|Ewood Park|Blackburn|31
Bolton Wanderers|University of Bolton Stadium|Bolton|29
Bristol City|Ashton Gate|Bristol|27
Burnley|Turf Moor|Burnley|22
Cardiff City|Cardiff City Stadium|Cardiff|33
Charlton Athletic|The Valley|Londres|27
Derby County|Pride Park|Derby|34
Lincoln City|Sincil Bank|Lincoln|10
Middlesbrough|Riverside Stadium|Middlesbrough|34
Millwall|The Den|Londres|20
Norwich City|Carrow Road|Norwich|27
Portsmouth|Fratton Park|Portsmouth|21
Preston North End|Deepdale|Preston|23
Queens Park Rangers|Loftus Road|Londres|18
Sheffield United|Bramall Lane|Sheffield|32
Southampton|St Mary's Stadium|Southampton|32
Stoke City|Bet365 Stadium|Stoke-on-Trent|30
Swansea City|Swansea Stadium|Swansea|21
Watford|Vicarage Road|Watford|22
West Bromwich Albion|The Hawthorns|West Bromwich|27
West Ham|London Stadium|Londres|63
Wolverhampton|Molineux|Wolverhampton|32
Wrexham|Racecourse Ground|Wrexham|13`,
"Espanha": `Alavés|Mendizorrotza|Vitoria-Gasteiz|20
Athletic Club|San Mamés|Bilbau|53
Atlético de Madrid|Metropolitano|Madri|70
Barcelona|Camp Nou|Barcelona|99
Celta de Vigo|Balaídos|Vigo|25
Deportivo La Coruña|Riazor|A Coruña|32
Elche|Martínez Valero|Elche|34
Espanyol|RCDE Stadium|Cornellà de Llobregat|40
Getafe|Coliseum|Getafe|17
Levante|Ciutat de València|Valência|26
Málaga|La Rosaleda|Málaga|30
Osasuna|El Sadar|Pamplona|24
Racing Santander|El Sardinero|Santander|22
Rayo Vallecano|Vallecas|Madri|15
Real Betis|Benito Villamarín|Sevilha|60
Real Madrid|Santiago Bernabéu|Madri|83
Real Sociedad|Anoeta|San Sebastián|40
Sevilla|Ramón Sánchez-Pizjuán|Sevilha|43
Valencia|Mestalla|Valência|49
Villarreal|Estadio de la Cerámica|Villarreal|23
Albacete|Carlos Belmonte|Albacete|17
Almería|Estadio de los Juegos Mediterráneos|Almería|18
Andorra|Estadi Nacional|Andorra la Vella|3
Burgos|El Plantío|Burgos|12
Castellón|Castalia|Castelló de la Plana|15
Celta Fortuna|Barreiro|Vigo|5
Ceuta|Alfonso Murube|Ceuta|7
Cádiz|Nuevo Mirandilla|Cádiz|20
Córdoba|Nuevo Arcángel|Córdoba|22
Eibar|Ipurua|Eibar|8
Eldense|Nuevo Pepico Amat|Elda|6
Girona|Montilivi|Girona|15
Granada|Nuevo Los Cármenes|Granada|19
Las Palmas|Estadio de Gran Canaria|Las Palmas|32
Leganés|Butarque|Leganés|12
Mallorca|Son Moix|Palma|26
Real Oviedo|Carlos Tartiere|Oviedo|30
Real Sociedad B|Zubieta|San Sebastián|3
Sabadell|Nova Creu Alta|Sabadell|12
Sporting Gijón|El Molinón|Gijón|30
Tenerife|Heliodoro Rodríguez López|Santa Cruz de Tenerife|23
Valladolid|José Zorrilla|Valladolid|28`,
"Itália": `Atalanta|Stadio di Bergamo|Bérgamo|25
Bologna|Renato Dall'Ara|Bolonha|36
Cagliari|Unipol Domus|Cagliari|16
Como|Giuseppe Sinigaglia|Como|13
Fiorentina|Artemio Franchi|Florença|43
Frosinone|Benito Stirpe|Frosinone|16
Genoa|Luigi Ferraris|Gênova|36
Inter|San Siro|Milão|76
Juventus|Juventus Stadium|Turim|42
Lazio|Stadio Olimpico|Roma|70
Lecce|Via del Mare|Lecce|31
Milan|San Siro|Milão|76
Monza|Brianteo|Monza|17
Napoli|Diego Armando Maradona|Nápoles|55
Parma|Ennio Tardini|Parma|28
Roma|Stadio Olimpico|Roma|70
Sassuolo|Mapei Stadium|Reggio Emilia|22
Torino|Olimpico Grande Torino|Turim|28
Udinese|Stadio Friuli|Udine|25
Venezia|Pier Luigi Penzo|Veneza|12
Arezzo|Città di Arezzo|Arezzo|13
Ascoli|Cino e Lillo Del Duca|Ascoli Piceno|12
Avellino|Partenio-Lombardi|Avellino|26
Benevento|Ciro Vigorito|Benevento|17
Carrarese|Dei Marmi|Carrara|6
Catanzaro|Nicola Ceravolo|Catanzaro|15
Cesena|Dino Manuzzi|Cesena|24
Cremonese|Giovanni Zini|Cremona|20
Empoli|Carlo Castellani|Empoli|16
Hellas Verona|Marcantonio Bentegodi|Verona|39
Juve Stabia|Romeo Menti|Castellammare di Stabia|8
Mantova|Danilo Martelli|Mântua|15
Modena|Alberto Braglia|Modena|21
Padova|Euganeo|Pádua|32
Palermo|Renzo Barbera|Palermo|36
Pisa|Arena Garibaldi|Pisa|10
Sampdoria|Luigi Ferraris|Gênova|36
Südtirol|Druso|Bolzano|6
Vicenza|Romeo Menti|Vicenza|17
Virtus Entella|Comunale di Chiavari|Chiavari|6`,
"Alemanha": `Augsburg|Augsburg Arena|Augsburgo|31
Bayern München|Allianz Arena|Munique|75
Borussia Dortmund|Westfalenstadion|Dortmund|81
Borussia Mönchengladbach|Borussia-Park|Mönchengladbach|54
Eintracht Frankfurt|Waldstadion|Frankfurt|58
Elversberg|Waldstadion an der Kaiserlinde|Spiesen-Elversberg|10
Freiburg|Europa-Park Stadion|Friburgo|35
Hamburger SV|Volksparkstadion|Hamburgo|57
Hoffenheim|Rhein-Neckar-Arena|Sinsheim|30
Köln|Müngersdorfer Stadion|Colônia|50
Leipzig|Red Bull Arena|Leipzig|47
Leverkusen|BayArena|Leverkusen|30
Mainz|Mainz Arena|Mainz|33
Paderborn|Paderborn Arena|Paderborn|15
Schalke 04|Arena AufSchalke|Gelsenkirchen|62
Stuttgart|Neckarstadion|Stuttgart|60
Union Berlin|Stadion An der Alten Försterei|Berlim|22
Werder Bremen|Weserstadion|Bremen|42
Arminia Bielefeld|Bielefelder Alm|Bielefeld|27
Bochum|Ruhrstadion|Bochum|26
Braunschweig|Eintracht-Stadion|Braunschweig|23
Darmstadt|Böllenfalltor|Darmstadt|18
Dynamo Dresden|Rudolf-Harbig-Stadion|Dresden|32
Energie Cottbus|Stadion der Freundschaft|Cottbus|22
Greuther Fürth|Sportpark Ronhof|Fürth|16
Hannover|Niedersachsenstadion|Hanôver|49
Heidenheim|Albstadion|Heidenheim|15
Hertha Berlin|Olympiastadion|Berlim|74
Holstein Kiel|Holstein-Stadion|Kiel|15
Kaiserslautern|Fritz-Walter-Stadion|Kaiserslautern|50
Karlsruher SC|Wildparkstadion|Karlsruhe|34
Magdeburg|Heinz-Krügel-Stadion|Magdeburg|30
Nürnberg|Max-Morlock-Stadion|Nuremberg|50
Osnabrück|Bremer Brücke|Osnabrück|16
St. Pauli|Millerntor-Stadion|Hamburgo|30
Wolfsburg|Volkswagen Arena|Wolfsburg|30`,
"França": `Angers|Raymond Kopa|Angers|18
Auxerre|Abbé-Deschamps|Auxerre|18
Brest|Francis-Le Blé|Brest|15
Le Havre|Stade Océane|Le Havre|25
Le Mans|Stade Marie-Marvingt|Le Mans|25
Lens|Stade Bollaert-Delelis|Lens|38
Lille|Stade Pierre-Mauroy|Villeneuve-d'Ascq|50
Lorient|Stade du Moustoir|Lorient|18
Lyon|Parc Olympique Lyonnais|Décines-Charpieu|59
Marseille|Stade Vélodrome|Marselha|67
Monaco|Stade Louis II|Mônaco|18
Nice|Stade de Nice|Nice|36
Paris FC|Stade Jean-Bouin|Paris|20
Paris Saint-Germain|Parc des Princes|Paris|48
Rennes|Roazhon Park|Rennes|30
Strasbourg|Stade de la Meinau|Estrasburgo|26
Toulouse|Stadium de Toulouse|Toulouse|33
Troyes|Stade de l'Aube|Troyes|20
Annecy|Parc des Sports|Annecy|16
Bastia|Stade Armand-Cesari|Bastia|16
Clermont|Stade Gabriel-Montpied|Clermont-Ferrand|12
Dijon|Stade Gaston-Gérard|Dijon|16
Dunkerque|Stade Marcel-Tribut|Dunkerque|5
Grenoble|Stade des Alpes|Grenoble|20
Guingamp|Stade de Roudourou|Guingamp|19
Laval|Stade Francis-Le Basser|Laval|11
Metz|Stade Saint-Symphorien|Metz|29
Montpellier|Stade de la Mosson|Montpellier|33
Nancy|Stade Marcel-Picot|Tomblaine|20
Nantes|Stade de la Beaujoire|Nantes|35
Pau|Nouste Camp|Pau|4
Red Star|Stade Bauer|Saint-Ouen|10
Reims|Stade Auguste-Delaune|Reims|21
Rodez|Stade Paul-Lignon|Rodez|6
Saint-Étienne|Stade Geoffroy-Guichard|Saint-Étienne|42
Sochaux|Stade Auguste-Bonal|Montbéliard|20`,
"Brasil": `Athletico-PR|Arena da Baixada|Curitiba|42
Atlético-MG|Arena MRV|Belo Horizonte|46
Bahia|Arena Fonte Nova|Salvador|48
Botafogo|Estádio Nilton Santos|Rio de Janeiro|45
Bragantino|Nabi Abi Chedid|Bragança Paulista|17
Chapecoense|Arena Condá|Chapecó|20
Corinthians|Neo Química Arena|São Paulo|49
Coritiba|Couto Pereira|Curitiba|40
Cruzeiro|Mineirão|Belo Horizonte|62
Flamengo|Maracanã|Rio de Janeiro|79
Fluminense|Maracanã|Rio de Janeiro|79
Grêmio|Arena do Grêmio|Porto Alegre|56
Internacional|Beira-Rio|Porto Alegre|51
Mirassol|José Maria de Campos Maia|Mirassol|15
Palmeiras|Allianz Parque|São Paulo|44
Remo|Baenão|Belém|17
Santos|Vila Belmiro|Santos|16
São Paulo|Morumbi|São Paulo|67
Vasco|São Januário|Rio de Janeiro|22
Vitória|Barradão|Salvador|29
América-MG|Independência|Belo Horizonte|23
Athletic-MG|Joaquim Portugal|São João del-Rei|6
Atlético-GO|Antônio Accioly|Goiânia|12
Avaí|Ressacada|Florianópolis|18
Botafogo-SP|Santa Cruz|Ribeirão Preto|29
CRB|Rei Pelé|Maceió|19
Ceará|Castelão|Fortaleza|64
Criciúma|Heriberto Hülse|Criciúma|19
Cuiabá|Arena Pantanal|Cuiabá|42
Fortaleza|Castelão|Fortaleza|64
Goiás|Hailé Pinheiro|Goiânia|14
Juventude|Alfredo Jaconi|Caxias do Sul|20
Londrina|Estádio do Café|Londrina|31
Novorizontino|Jorge Ismael de Biasi|Novo Horizonte|16
Náutico|Aflitos|Recife|20
Operário-PR|Germano Krüger|Ponta Grossa|11
Ponte Preta|Moisés Lucarelli|Campinas|20
Sport|Ilha do Retiro|Recife|26
São Bernardo|Primeiro de Maio|São Bernardo do Campo|15
Vila Nova|Onésio Brasileiro Alvarenga|Goiânia|11`,
};
export const STADIUM_REFERENCES: readonly StadiumReference[] = Object.entries(rows).flatMap(([country, text]) => text.split('\n').map(row => {
  const [club, name, city, capacity] = row.split('|');
  return { club: club!, name: name!, city: city!, country, capacity: Number(capacity) * 1000 };
}));
export function stadiumReference(club: string, country: string) { return STADIUM_REFERENCES.find(s => s.club === club && s.country === country); }
