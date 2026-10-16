import type { FootballPack } from '../data/football-pack.js';
import { membershipFor, LEAGUE_SNAPSHOTS } from '../data/league-snapshots.js';
export interface CatalogFilters { country: string; league: string; query: string }
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function catalogSelection(pack: FootballPack, filters: CatalogFilters) {
  const countryOf = (p: FootballPack['clubs'][number]) => membershipFor(p.club)?.leagueCountry ?? p.club.country;
  const countries = [...new Set(pack.clubs.map(countryOf))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const country = countries.includes(filters.country) ? filters.country : countries.includes('Brasil') ? 'Brasil' : countries[0]!;
  const local = pack.clubs.filter(p=>countryOf(p)===country);
  const keys = [...new Set(local.map(p=>membershipFor(p.club)?.key ?? 'unclassified'))];
  const leagues = keys.map(key=>({key,name: LEAGUE_SNAPSHOTS.find(l=>l.key===key)?.name ?? 'Divisão não confirmada'}));
  const league = filters.league==='all' || keys.includes(filters.league) ? filters.league : 'all';
  const clubs = local.filter(p=>(league==='all'||(membershipFor(p.club)?.key??'unclassified')===league)&&normalize(p.club.name).includes(normalize(filters.query))).sort((a,b)=>a.club.name.localeCompare(b.club.name,'pt-BR'));
  return { countries,country,leagues,league,clubs };
}
export function clubCatalog(pack: FootballPack, filters: CatalogFilters, age = 14): string {
  const selected = catalogSelection(pack,filters);
  return `<section class="club-browser"><h3>Escolha seu clube inicial</h3><p class="hint">1. País → 2. Liga/divisão → 3. Clube. Você entrará na base do clube escolhido antes da avaliação e dos treinos. O acesso ao principal depende de idade e desempenho.</p><div class="fields"><label>1 · País<select id="catalog-country">${selected.countries.map(c=>`<option ${c===selected.country?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label>2 · Liga/divisão<select id="catalog-league"><option value="all">Todas as divisões disponíveis</option>${selected.leagues.map(l=>`<option value="${esc(l.key)}" ${l.key===selected.league?'selected':''}>${esc(l.name)}</option>`).join('')}</select></label><label class="wide">Buscar clube<input id="catalog-query" type="search" value="${esc(filters.query)}" placeholder="Nome do clube"></label></div><p id="catalog-count" class="hint">${selected.clubs.length} clubes encontrados neste filtro.</p><label>3 · Clube inicial · Base<select id="pack-club" name="startingClubId" form="create" required ${selected.clubs.length?'':'disabled'}>${selected.clubs.map(p=>`<option value="${esc(p.club.id)}" ${p.club.youthPlaces<1?'disabled':''}>${esc(p.club.name)} · Base</option>`).join('')}</select></label><p class="hint">Categoria inicial: <b>Base · ${age} anos</b>. O elenco principal fica bloqueado até você cumprir as regras de promoção.</p><div id="pack-roster"></div></section>`;
}
