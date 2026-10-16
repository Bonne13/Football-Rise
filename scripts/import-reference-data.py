"""Normalize factual names from a read-only Game-teste snapshot, never execute its JS.
Usage: python scripts/import-reference-data.py /path/to/Game-teste/club-database.js
Uniforms, economic values, shirt numbers and trust are prototype estimates, not official data.
"""
import hashlib, json, sys, re
from pathlib import Path
source = Path(sys.argv[1]).read_text()
data = json.JSONDecoder().raw_decode(source[source.index('{'):])[0]
colors = {}
themes = Path(sys.argv[1]).with_name('themes.js')
if themes.exists():
    for block in re.findall(r"registerClubColors\('([^']+)'\)", themes.read_text()):
        for entry in block.split('|'):
            name, pair = entry.split('='); colors[name] = tuple('#'+x for x in pair.split(','))
colors['Osasuna'] = ('#d91a21', '#192b51')
profiles = []
seen = set()
for league in data['leagues']:
    for name in league['teams']:
        if name in seen:
            continue
        seen.add(name)
        players = [p for p in data['rosters'].get(name, []) if 'não confirmado' not in p['source'] and 'snapshot 2025' not in p['source']]
        players = list({p['id']: p for p in players}.values())
        club_id = 'community-' + hashlib.sha256(name.encode()).hexdigest()[:12]
        overall = round(sum(p['overall'] for p in players) / max(1, len(players))) if players else 60
        club = dict(id=club_id, name=name, country=league['country'], reputation=overall, facilities=overall, coach=overall, squadOverall=overall, minimumOverall=25, minimumPotential=40, needs=['GK','CB','FB','DM','CM','AM','WG','ST'], youthPlaces=5, seniorPlaces=3, wageBudget=10000, maxWeeklyWage=300)
        # Original provisional designs, explicitly not official 2026/27 kits.
        primary, secondary = colors.get(name, ('#194a88', '#f5f4eb'))
        palettes = [(primary, secondary, primary),(secondary, primary, secondary),('#142e51', primary, '#142e51')]
        kits = [dict(name=label+' · provisório',shirt=a,secondary=b,shorts=c,socks=a,ink='#142e51' if a.lower() in ['#ffffff','#f5f4eb','#fff200','#ffdf00','#ffe667','#ffdd00','#ffdf00'] else '#ffffff',pattern=['stripe','plain','hoops'][i]) for i,((a,b,c),label) in enumerate(zip(palettes,['Principal','Visitante','Alternativo']))]
        senior = [dict(id=p['id'],name=p['name'],number=i+1,overall=max(1,min(100,p['overall'])),coachTrust=55,position=p['position'],source=p['source'],numberVerified=False) for i,p in enumerate(players)]
        if len(senior)>98: raise ValueError('Squad too large: '+name)
        profiles.append(dict(club=club,kits=kits,youth=[],senior=senior))
pack = dict(version=1,id='community-2026-27-reference-a07d70c',season='2026/27',source='https://github.com/Bonne13/Game-teste/tree/a07d70cf9164fb7743ee4ff5066b1aa260e3aad6/data',license='Snapshot factual comunitário; origens e limitações em docs/data/SOURCES.md. Sem imagens ou marcas gráficas.',coverage='Europa 2026/27 e Brasil 2026; cobertura parcial. Elencos juvenis ausentes; números simulados; uniformes provisórios, não oficiais.',clubs=profiles)
Path('web/data/community-2026-27.json').write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(profiles),'clubes;',sum(len(p['senior']) for p in profiles),'registros atuais de jogadores.')
