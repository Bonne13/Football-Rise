/** Confederation membership and common league names; no commercial licence or verified season roster is implied. */
export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF';
export interface Association { id: string; country: string; confederation: Confederation; leagueName: string | null; continentalEligible: boolean; notice: string }
const rows: Record<Confederation,string> = {
"UEFA": `al|Albânia|Kategoria Superiore
ad|Andorra|Primera Divisió
am|Armênia|Premier League da Armênia
at|Áustria|Bundesliga austríaca
az|Azerbaijão|Premier League do Azerbaijão
by|Belarus|Vysshaya Liga
be|Bélgica|Belgian Pro League
ba|Bósnia e Herzegovina|Premijer Liga
bg|Bulgária|Primeira Liga búlgara
hr|Croácia|HNL
cy|Chipre|Primeira Divisão cipriota
cz|República Tcheca|Primeira Liga tcheca
dk|Dinamarca|Superliga dinamarquesa
en|Inglaterra|Premier League
ee|Estônia|Meistriliiga
fo|Ilhas Faroé|Betri Deildin
fi|Finlândia|Veikkausliiga
fr|França|Ligue 1
ge|Geórgia|Erovnuli Liga
de|Alemanha|Bundesliga
gi|Gibraltar|Gibraltar Football League
gr|Grécia|Super League grega
hu|Hungria|Nemzeti Bajnokság I
is|Islândia|Besta deild
il|Israel|Premier League de Israel
it|Itália|Serie A
kz|Cazaquistão|Premier League do Cazaquistão
xk|Kosovo|Superliga do Kosovo
lv|Letônia|Virslīga
li|Liechtenstein|-
lt|Lituânia|A Lyga
lu|Luxemburgo|Division Nationale
mt|Malta|Premier League de Malta
md|Moldávia|Super Liga moldava
me|Montenegro|Primeira Liga montenegrina
nl|Países Baixos|Eredivisie
mk|Macedônia do Norte|Primeira Liga da Macedônia do Norte
nir|Irlanda do Norte|NIFL Premiership
no|Noruega|Eliteserien
pl|Polônia|Ekstraklasa
pt|Portugal|Primeira Liga
ie|Irlanda|League of Ireland Premier Division
ro|Romênia|SuperLiga romena
ru|Rússia|Premier League russa
sm|San Marino|Campionato Sammarinese
sco|Escócia|Scottish Premiership
rs|Sérvia|SuperLiga sérvia
sk|Eslováquia|Super Liga eslovaca
si|Eslovênia|PrvaLiga
es|Espanha|LaLiga
se|Suécia|Allsvenskan
ch|Suíça|Swiss Super League
tr|Turquia|Süper Lig
ua|Ucrânia|Premier League ucraniana
wal|País de Gales|Cymru Premier`,
"CONMEBOL": `ar|Argentina|Liga Profesional
bo|Bolívia|División Profesional
br|Brasil|Campeonato Brasileiro Série A
cl|Chile|Primera División chilena
co|Colômbia|Categoría Primera A
ec|Equador|LigaPro
py|Paraguai|Primera División paraguaia
pe|Peru|Liga 1 peruana
uy|Uruguai|Primera División uruguaia
ve|Venezuela|Primera División venezuelana`,
"CONCACAF": `ai|Anguilla|Anguilla Football League
ag|Antígua e Barbuda|Premier Division de Antígua e Barbuda
aw|Aruba|Division di Honor
bs|Bahamas|BFA Senior League
bb|Barbados|Barbados Premier League
bz|Belize|Premier League of Belize
bm|Bermudas|Bermudian Premier Division
bq|Bonaire|Kampionato de Bonaire
vg|Ilhas Virgens Britânicas|BVIFA National Football League
ca|Canadá|Canadian Premier League
ky|Ilhas Cayman|Cayman Islands Premier League
cr|Costa Rica|Primera División da Costa Rica
cu|Cuba|Campeonato Nacional de Cuba
cw|Curaçao|Sekshon Pagá
dm|Dominica|Dominica Premier League
do|República Dominicana|Liga Dominicana de Fútbol
sv|El Salvador|Primera División de El Salvador
gf|Guiana Francesa|Régional 1 da Guiana Francesa
gd|Granada|Grenada Premier League
gp|Guadalupe|Régional 1 de Guadalupe
gt|Guatemala|Liga Nacional da Guatemala
gy|Guyana|GFF Elite League
ht|Haiti|Championnat National D1
hn|Honduras|Liga Nacional de Honduras
jm|Jamaica|Jamaica Premier League
mq|Martinica|Régional 1 da Martinica
mx|México|Liga MX
ms|Montserrat|Montserrat Championship
ni|Nicarágua|Liga Primera
pa|Panamá|Liga Panameña de Fútbol
pr|Porto Rico|Liga Puerto Rico
kn|São Cristóvão e Névis|Saint Kitts and Nevis Premier League
lc|Santa Lúcia|Saint Lucia Premier League
mf|Saint-Martin|Championnat de Saint-Martin
vc|São Vicente e Granadinas|NLA Premier League
sx|Sint Maarten|Sint Maarten Senior League
sr|Suriname|Suriname Major League
tt|Trinidad e Tobago|TT Premier Football League
tc|Ilhas Turcas e Caicos|Provo Premier League
vi|Ilhas Virgens Americanas|US Virgin Islands Premier League
us|Estados Unidos|Major League Soccer`,
};
export const ASSOCIATIONS: readonly Association[] = (Object.entries(rows) as [Confederation,string][]).flatMap(([confederation,text]) => text.split('\n').map(row => {
 const [id,country,league] = row.split('|');
 return {id:id!,country:country!,confederation,leagueName:league === '-' ? null : league!,continentalEligible:id !== 'ru',notice:id === 'li' ? 'Sem liga nacional própria: clubes participam do sistema suíço; a copa nacional permanece separada.' : id === 'ru' ? 'Participação continental desativada neste catálogo; situação regulatória exige revisão.' : 'Nome de referência; participantes, divisões e regulamentos exigem dados da edição. Não representa licença comercial.'};
}));
export const associationFor = (country: string) => ASSOCIATIONS.find(a => a.country === country);
export const countriesIn = (confederation: Confederation) => ASSOCIATIONS.filter(a => a.confederation === confederation).map(a => a.country);
