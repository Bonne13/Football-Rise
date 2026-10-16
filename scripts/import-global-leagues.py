"""Read Openfootball JSON snapshots from a local checkout; never execute source code.
python scripts/import-global-leagues.py /path/to/football.json
Only club identities and league membership are imported. Existing player records are retained.
"""
from pathlib import Path
import json,re,sys,hashlib,unicodedata,subprocess
root=Path(__file__).resolve().parents[1]; source=Path(sys.argv[1]).resolve()
commit=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
base=json.loads((root/'web/data/community-2026-27.json').read_text())
profiles=json.loads(json.dumps(base['clubs']))
# Historical files remain explicitly historical; latest available file wins per division.
countries={'en':'Inglaterra','de':'Alemanha','es':'Espanha','fr':'França','it':'Itália','nl':'Países Baixos','pt':'Portugal','at':'Áustria','be':'Bélgica','gr':'Grécia','sco':'Escócia','tr':'Turquia','ar':'Argentina','br':'Brasil','co':'Colômbia','mx':'México','mls':'Estados Unidos'}
alias={'internazionale milano':'inter','internazionale':'inter','atletico mineiro':'atletico mg','athletico paranaense':'athletico pr','red bull bragantino':'bragantino','rb leipzig':'leipzig','bayern munchen':'bayern munchen','1 koln':'koln','borussia monchengladbach':'borussia monchengladbach','paris saint germain':'paris saint germain','stade brestois':'brest','stade rennais':'rennes','olympique lyonnais':'lyon','olympique marseille':'marseille','paris saintgermain':'paris saint germain','sport lisboa benfica':'benfica','sporting clube portugal':'sporting','sporting clube braga':'braga','brighton hove albion':'brighton','tottenham hotspur':'tottenham','west ham united':'west ham','wolverhampton wanderers':'wolverhampton','nottingham forest':'nottingham forest','queens park rangers':'queens park rangers','real valladolid':'valladolid','real zaragoza':'zaragoza','racing santander':'racing santander','deportivo alaves':'alaves','athletic bilbao':'athletic club','atletico madrid':'atletico madrid','atletico madrid':'atletico madrid','celta vigo':'celta vigo','leeds':'leeds united','1 mainz 05':'mainz','bayer leverkusen':'leverkusen','1 heidenheim':'heidenheim','vfb stuttgart':'stuttgart','vfl wolfsburg':'wolfsburg','vfl bochum':'bochum','1 union berlin':'union berlin','1 kaiserslautern':'kaiserslautern','1 nurnberg':'nurnberg','schalke 04':'schalke 04','eintracht braunschweig':'braunschweig','hertha bsc':'hertha berlin','hannover 96':'hannover','paderborn 07':'paderborn','darmstadt 98':'darmstadt','elversberg 07':'elversberg','greuther furth':'greuther furth','1 magdeburg':'magdeburg','racing strasbourg':'strasbourg','ogc nice':'nice','losc lille':'lille','as saint etienne':'saint etienne','stade reims':'reims','le mans 72':'le mans','stade lavallois':'laval','rodez aveyron':'rodez','clermont foot':'clermont','sport recife':'sport','atletico goianiense':'atletico go','nautico capibaribe':'nautico','botafogo sp':'botafogo sp'}
alias.update({'espanyol barcelona':'espanyol','rayo vallecano madrid':'rayo vallecano','real betis balompie':'real betis','strasbourg alsace':'strasbourg','racing lens':'lens','hertha':'hertha berlin','mineiro':'atletico mg','brasil al':'crb','rb bragantino':'bragantino','corinthians paulista':'corinthians','coritiba pr':'coritiba','cuiaba mt':'cuiaba','goias go':'goias','gremio novorizontino sp':'novorizontino','operario ferroviario pr':'operario pr','vila nova go':'vila nova','vasco gama':'vasco'})
def norm(name):
 s=''.join(c for c in unicodedata.normalize('NFKD',name).lower() if not unicodedata.combining(c))
 s=re.sub(r'\b(18|19|20)\d{2}\b','',s);s=re.sub(r'[^a-z0-9 ]',' ',s)
 s=' '.join(t for t in s.split() if not t.isdigit() and t not in {'fc','cf','afc','sc','ssc','ac','rc','cd','rcd','sd','ca','se','fk','sv','tsv','club','clube','de','do','da','futbol','calcio','bc','as','cr','ogc','losc','vfb','vfl','bsc','s','05','07','ud','acf','cfc','ss','us','ssd','tsg','fsv','spvgg','aj','osc','usl','ea','hsc','af','fr','ec','fbc','fbpa','sco','foot','estac','es'})
 return alias.get(s,s)
index={(p['club']['country'],norm(p['club']['name'])):p for p in profiles}
files={}
for directory in ['2026-27','2026','2025-26','2025','2024-25']:
 for p in sorted((source/directory).glob('*.json')):
  if 'full' in p.stem:continue
  code=p.stem.split('.')[0]
  if code not in countries:continue
  division=int(p.stem.split('.')[1]) if '.' in p.stem and p.stem.split('.')[1].isdigit() else 1
  if (code,division) not in files:files[(code,division)]=p
members={}; snapshots=[]
# Later seasons take precedence when a club appears in older divisional snapshots.
for (code,division),p in sorted(files.items(),key=lambda e:(-int(e[1].parent.name[:4]),e[0][1],e[0][0])):
 data=json.loads(p.read_text());matches=data.get('matches',[])
 names=sorted({m[k] for m in matches for k in ['team1','team2']})
 country=countries[code]; key=('league:' if division==1 else f'league{division}:')+country
 ids=[]
 for name in names:
  if not isinstance(name,str) or not 1<=len(name)<=100:raise ValueError('Invalid club name')
  profile=index.get((country,norm(name)))
  club_country='Canadá' if code=='mls' and any(s in name.lower() for s in ['toronto','montréal','montreal','vancouver']) else 'País de Gales' if code=='en' and any(s in name.lower() for s in ['cardiff','swansea','wrexham','newport county']) else country
  if profile is None:
   club_id='world-'+hashlib.sha256((country+':'+norm(name)).encode()).hexdigest()[:12]
   profile={'club':{'id':club_id,'name':name,'country':club_country,'reputation':60,'facilities':60,'coach':60,'squadOverall':60,'minimumOverall':25,'minimumPotential':40,'needs':['GK','CB','FB','DM','CM','AM','WG','ST'],'youthPlaces':5,'seniorPlaces':3,'wageBudget':10000,'maxWeeklyWage':300},'kits':[],'youth':[],'senior':[]}
   h=hashlib.sha256(name.encode()).hexdigest();color='#'+h[:6]
   for i,c in enumerate([color,'#e4e8df','#23384a']):profile['kits'].append({'name':['Principal','Visitante','Alternativo'][i]+' · procedural, não oficial','shirt':c,'secondary':'#dfc28a','shorts':c,'socks':c,'ink':'#ffffff','pattern':['plain','stripe','hoops'][i]})
   profiles.append(profile);index[(country,norm(name))]=profile
  club=profile['club'];club['country']=club_country
  if club['id'] in members:continue
  ids.append(club['id']);members[club['id']]={'name':club['name'],'country':club_country,'leagueCountry':country,'key':key,'division':division,'season':p.parent.name,'source':f'https://github.com/openfootball/football.json/blob/{commit}/{p.parent.name}/{p.name}'}
 snapshots.append({'key':key,'country':country,'division':division,'name':data.get('name',key),'season':p.parent.name,'source':f'https://github.com/openfootball/football.json/blob/{commit}/{p.parent.name}/{p.name}','clubIds':ids})
# Retain all original records, but never pretend unmapped clubs are verified first-division participants.
for profile in profiles:
 c=profile['club']
 if c['id'] not in members:members[c['id']]={'name':c['name'],'country':c['country'],'leagueCountry':c['country'],'key':'unclassified:'+c['country'],'division':0,'season':'não confirmado','source':base['source']}
profiles.sort(key=lambda p:(p['club']['country'],p['club']['name']))
pack={**base,'id':'world-leagues-openfootball-'+commit[:12],'source':'https://github.com/openfootball/football.json/tree/'+commit,'license':'Identidades/divisões adicionais CC0 Openfootball. Jogadores herdados: origens do pacote comunitário. Sem escudos ou ativos licenciados.','coverage':f'{len(profiles)} clubes; {len(snapshots)} divisões com snapshots de 2024/25 a 2026/27. Participantes históricos não confirmam 2026/27. Novos clubes sem elencos reais; parâmetros e uniformes procedurais.','clubs':profiles}
(root/'web/data/world-leagues.json').write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':'))+'\n')
text='''// Generated by scripts/import-global-leagues.py. Factual membership snapshots, not official season certification.
import type { Club } from '../domain/career/state.js';
export interface LeagueSnapshot { key: string; country: string; division: number; name: string; season: string; source: string; clubIds: string[] }
interface Membership { name: string; country: string; leagueCountry: string; key: string; division: number; season: string; source: string }
export const LEAGUE_SNAPSHOTS: readonly LeagueSnapshot[] = '''+json.dumps(snapshots,ensure_ascii=False,separators=(',',':'))+''';
const MEMBERS: Record<string,Membership> = '''+json.dumps(members,ensure_ascii=False,separators=(',',':'))+''';
export function membershipFor(c: Pick<Club,'id'|'name'|'country'>) { const m = MEMBERS[c.id]; return m && m.name === c.name && (m.country === c.country || m.leagueCountry === c.country) ? m : undefined; }
'''
(root/'src/data/league-snapshots.ts').write_text(text)
print(json.dumps({'clubs':len(profiles),'divisions':len(snapshots),'countriesWithLeagueSnapshots':len({x['country'] for x in snapshots}),'unclassified':sum(m['division']==0 for m in members.values()),'sourceCommit':commit},ensure_ascii=False))
