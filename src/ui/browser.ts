import { matchCrowd } from '../domain/match/crowd.js';
import { NATIONAL_TEAMS } from '../data/competitions.js';
import { loadCareerText, writeCareerText, deleteCareer } from '../persistence/browser-storage.js';
import { competitionHub, competitionDetail } from './competitions.js';
import { stadiumFor } from '../data/stadiums.js';
import { parseFootballPack, type FootballPack } from '../data/football-pack.js';
import { numberAvailability } from '../domain/clubs/shirt.js';
import { clubKits, trainingKit, nationalKit } from '../data/kits.js';
import { mountField } from './field.js';
import { createSession, restoreSession, assessmentScores, matchPerformance, sessionAverage, type DrillSession } from '../application/drills.js';
import type { Drill } from '../domain/gameplay/trial.js';
import { createCareer, advanceCareer, careerView, type Command } from '../application/career.js';
import { POSITIONS, type CareerState } from '../domain/career/state.js';
import type { Position } from '../domain/player/player.js';
import { FOCUSES, type Focus } from '../domain/training/training.js';
import { deserializeSave, serializeSave } from '../persistence/save.js';
const app = document.querySelector<HTMLElement>('#app')!; const notice = document.querySelector<HTMLElement>('#notice')!;
const names: Record<string, string> = { GK: 'Goleiro', CB: 'Zagueiro', FB: 'Lateral', DM: 'Volante', CM: 'Meia central', AM: 'Meia ofensivo', WG: 'Ponta', ST: 'Atacante', finishing: 'Finalização', passing: 'Passe', vision: 'Visão', technique: 'Técnica', pace: 'Velocidade', strength: 'Força', defending: 'Marcação', goalkeeping: 'Defesa de gol', setPieces: 'Bola parada', composure: 'Compostura' };
const titles = { created: 'Mostre seu talento', assessed: 'O primeiro treino', trained: 'Hora de ser observado', offers: 'Seu próximo escudo', contracted: 'Uma nova casa', ready: 'Seu lugar é no campo', active: 'Construa sua trajetória' };
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const date = (v: string) => v.split('-').reverse().join('/');
let selectedPack: FootballPack | null = null;
try { const raw = localStorage.getItem('football-rise.data-pack.v1'); if (raw) selectedPack = parseFootballPack(raw); } catch {}
let state: CareerState | null = null; let blocked = false; let timer: ReturnType<typeof setTimeout>;
function message(text: string, error = false) { clearTimeout(timer); notice.textContent = text; notice.className = error ? 'error' : ''; notice.hidden = false; timer = setTimeout(() => { notice.hidden = true; }, 7000); }
let saving = false;
async function persist(next: CareerState) {
  if (saving) throw new Error('Aguarde o salvamento atual.');
  saving = true; app.inert = true; app.setAttribute('aria-busy', 'true');
  try { await writeCareerText(serializeSave(next)); }
  finally { saving = false; app.inert = false; app.removeAttribute('aria-busy'); }
}
async function commit(next: CareerState) { await persist(next); state = next; blocked = false; render(); }
async function dispatch(command: Command) { if (state) { await commit(advanceCareer(state, command)); message('Carreira atualizada e salva neste navegador.'); } }
function field(label: string, name: string, value: string, extra = '') { return `<label ${['name', 'nationality'].includes(name) ? 'class="wide"' : ''}>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`; }
function button(text: string, action: string, primary = false) { return `<button type="button" data-action="${action}" class="${primary ? 'primary' : ''}">${text}</button>`; }
function tools() { return `<div class="tools">${state || blocked ? button('Baixar save', 'export') : ''}<label class="file">Importar save<input id="import" type="file" accept=".json,application/json" aria-label="Importar save"></label>${state ? button('Nova carreira', 'new') : ''}</div><p class="hint">Seu progresso fica neste navegador. Baixe uma cópia para guardar ou continuar em outro aparelho.</p>`; }
async function loadCommunityPack() { const response = await fetch('./data/community-2026-27.json'); if (!response.ok) throw new Error('Não foi possível carregar a base comunitária.'); const pack = parseFootballPack(await response.text()); localStorage.setItem('football-rise.data-pack.v1', JSON.stringify(pack)); selectedPack = pack; render(); message(`${pack.clubs.length} clubes disponíveis para uma nova carreira. Base comunitária, com lacunas documentadas.`); }
function rosterPanel(pack: FootballPack, id: string) { const profile = pack.clubs.find(p => p.club.id === id) ?? pack.clubs[0]!; return `<p class="hint">${esc(profile.club.name)} · ${profile.senior.length} jogadores disponíveis · vínculos comunitários, não oficiais.</p><ol class="squad-list">${profile.senior.map(h => `<li><b>${esc(h.name)}</b> · ${esc(h.position)} · OVR ${h.overall}<small>${esc(h.source)}</small></li>`).join('')}</ol>`; }
function creation() { return `<section class="hero"><span class="badge">SUA JORNADA COMEÇA NA BASE</span><h1>Todo ídolo teve<br>um <em>primeiro dia.</em></h1><p>Comece aos 14 anos. Encontre seu lugar em campo, conquiste um contrato e escreva sua própria história.</p></section><div class="grid"><section class="card"><h2>Quem vai entrar em campo?</h2><p class="muted">O primeiro nome da sua história é o seu.</p><form id="create"><div class="fields">${field('Nome do jogador', 'name', '', 'required maxlength="100" placeholder="Como você se chama?"')}${field('Número preferido', 'shirtNumber', '10', 'type="number" min="1" max="99" required')}${field('Nacionalidade', 'nationality', 'Brasil', 'required maxlength="100" list="nationality-options"')}<datalist id="nationality-options">${NATIONAL_TEAMS.map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist><label>Idade inicial<select name="age"><option>14</option><option>15</option><option>16</option></select></label><label>Pé preferido<select name="foot"><option value="right">Direito</option><option value="left">Esquerdo</option><option value="both">Ambos</option></select></label><label class="wide">Sua posição<select name="position">${POSITIONS.map(p => `<option value="${p}" ${p === 'CM' ? 'selected' : ''}>${names[p]} · ${p}</option>`).join('')}</select></label></div><button class="primary full" ${blocked ? 'disabled' : ''}>Começar minha história →</button></form><section class="data-pack"><h3>Clubes, jogadores e uniformes</h3><p class="hint">${selectedPack ? `${esc(selectedPack.season)} · ${selectedPack.clubs.length} clubes · ${esc(selectedPack.coverage)}<br>Fonte: ${esc(selectedPack.source)}` : 'Pacote atual: clubes fictícios. Dados oficiais de 2026/27 ainda não incluídos.'}</p>${button('Usar base comunitária 2026/27 · 238 clubes', 'community-pack')}<label class="file">Carregar pacote de temporada<input id="data-pack" type="file" accept=".json,application/json" aria-label="Carregar pacote de temporada"></label>${selectedPack ? button('Usar clubes fictícios', 'default-pack') : ''}${selectedPack ? `<details><summary>Consultar clubes e jogadores</summary><label>Clube do catálogo<select id="pack-club">${selectedPack.clubs.map(p => `<option value="${esc(p.club.id)}">${esc(p.club.name)} · ${esc(p.club.country)}</option>`).join('')}</select></label><div id="pack-roster">${rosterPanel(selectedPack, selectedPack.clubs[0]!.club.id)}</div></details>` : ''}<p class="hint">O pacote é aplicado ao criar uma nova carreira. Contratos em UC.</p></section>${tools()}</section><aside class="card"><h2>Conquiste cada etapa.</h2><ol class="steps"><li>Avalie seus fundamentos</li><li>Treine sua especialidade</li><li>Entre no radar dos clubes</li><li>Escolha seu primeiro contrato</li><li>Prepare-se para a estreia</li></ol></aside></div>`; }
function stage(s: CareerState): string {
  if (s.stage === 'created') return `<h2>Avaliação jogável da base</h2><p class="muted">Entre em campo: finalização, visão, passe, velocidade, condução e falta. São três tentativas por fundamento. Suas jogadas determinam as notas.</p>${button('Começar avaliação no campo →', 'assessment', true)}`;
  if (s.stage === 'offers') return `<h2>O futuro está nas suas mãos.</h2><p class="muted">Compare as condições e escolha seu próximo clube.</p>${careerView(s).offers.map(o => `<article class="offer"><span class="badge">${o.team === 'youth' ? 'Base' : 'Principal'}</span><h3>${esc(o.clubName)}</h3><p><strong>${o.weeklyWage} UC</strong> / semana · bônus ${o.signingBonus} UC</p><p class="muted">${o.durationWeeks} semanas · ${o.role === 'reserve' ? 'Reserva' : 'Promessa'}</p><button class="primary" data-accept="${esc(o.id)}">Escolher este clube</button></article>`).join('')}${s.contract ? `<div class="actions">${button('Continuar no clube atual', 'prepare')}</div>` : ''}`;
  if (s.stage === 'ready' && s.preparation) { const p = s.preparation; return `<span class="badge">PRÓXIMA PARTIDA</span><h2>${esc(p.competition)}</h2><p>${date(p.date)} · ${esc(p.opponent)}</p><p><strong>${p.expectedMinutes} minutos</strong> previstos</p><p>${esc(p.objective)}</p><p class="muted">Controle suas oportunidades: passe, finalização, condução e falta. Seus acertos definem gols e nota da atuação.</p>${button('Entrar em campo →', 'match', true)}`; }
  return `<h2>Faça cada dia valer.</h2><p class="muted">Escolha um fundamento. Recupere sua energia entre sessões.</p><form id="train"><div class="fields"><label class="wide">Foco do treino<select name="focus">${FOCUSES.map(f => `<option value="${f}">${names[f]}</option>`).join('')}</select></label></div><button class="primary full">Praticar no campo →</button></form><div class="actions">${button('Recuperar energia', 'recover')}${s.stage !== 'assessed' ? button('Buscar propostas', 'scout') : ''}</div>${s.contract ? `<div class="actions">${button('Preparar próxima partida →', 'prepare', true)}${s.contract.team === 'youth' ? button('Solicitar promoção', 'promote') : ''}${button('Renovar contrato', 'renew')}</div>` : ''}`;
}
function wardrobe(s: CareerState) {
  const kits = s.dataPack?.clubs.find(p => p.club.id === s.contract?.clubId)?.kits ?? clubKits.kitsFor(s.contract?.clubId ?? 'vale');
  return `<section class="card wardrobe"><span class="eyebrow">VESTIÁRIO</span><h2>Sua camisa · ${s.shirt.number}</h2>${s.shirt.number !== s.shirt.preferredNumber ? `<p class="hint">Seu número preferido, ${s.shirt.preferredNumber}, está ocupado. A camisa ${s.shirt.number} foi reservada para você enquanto conquista espaço.</p>` : ''}<p class="muted">Confiança do treinador: <b>${s.coachTrust}/100</b> · OVR: <b>${careerView(s).overall}</b></p>${s.dataPack ? `<p class="hint">${esc(s.dataPack.season)} · ${esc(s.dataPack.coverage)}</p>` : ''}<p class="hint">Números livres estão disponíveis. Para assumir um ocupado, você precisa superar a confiança e a habilidade do atual dono. Boas atuações aumentam sua confiança.</p><form id="shirt-number"><label>Número da camisa<select name="number">${Array.from({ length: 99 }, (_, i) => { const number = i + 1, status = numberAvailability(s, number); return `<option value="${number}" ${s.shirt.number === number ? 'selected' : ''}>${number} · ${status.holder ? `${esc(status.holder.name)} · exige confiança ${status.requiredTrust}, OVR ${status.requiredOverall}` : 'Livre'}</option>`; }).join('')}</select></label><button type="submit">Escolher número</button></form>${s.contract ? `<form id="club-kit"><label>Uniforme de jogo<select name="kit">${kits.map((k, i) => `<option value="${i}" ${i === s.shirt.kitIndex ? 'selected' : ''}>${i + 1} · ${k.name}</option>`).join('')}</select></label><div class="kit-swatches">${kits.map((k, i) => `<span style="--shirt:${k.shirt};--trim:${k.secondary}">${i + 1}</span>`).join('')}</div><button type="submit">Usar uniforme</button></form>` : '<p class="hint">Os uniformes do clube aparecem após assinar contrato. Nos treinos você usa colete laranja.</p>'}${s.contract ? `<details><summary>Elenco e donos dos números (${s.shirt.holders.length})</summary><p class="hint">${s.dataPack && s.contract.team === 'youth' ? 'A base comunitária não informa elencos juvenis: números livres, sem jogadores inventados.' : 'Números sem confirmação na fonte são distribuídos pela simulação.'}</p><ol class="squad-list">${s.shirt.holders.map(h => `<li><b>${h.number} · ${esc(h.name)}</b> · ${esc(h.position)} · OVR ${h.overall}<small>${esc(h.source)} · número ${h.numberVerified ? 'confirmado' : 'simulado'}</small></li>`).join('')}</ol></details>` : ''}</section>`;
}
function dashboard(s: CareerState) { const v = careerView(s); return `<section class="hero"><span class="badge">${esc(v.club ?? 'AVALIAÇÃO NA BASE')} · ${s.contract?.team === 'senior' ? 'PRINCIPAL' : 'BASE'}</span><h1>${esc(v.name)}<br><em>${titles[s.stage]}.</em></h1><p>${names[v.position]} · ${v.age} anos · ${date(v.date)}</p></section><div class="stats">${[['Overall', v.overall], ['Potencial estimado', v.potentialEstimate ? `${v.potentialEstimate.low}–${v.potentialEstimate.high}` : '—'], ['Energia', v.energy], ['Atuações', v.development.appearances]].map(([label, value]) => `<div class="stat"><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><div class="grid"><section class="card">${stage(s)}</section><aside><section class="card"><h2>${esc(v.club ?? 'Em busca de uma chance')}</h2><p class="muted">${s.contract ? `${s.contract.team === 'youth' ? 'Base' : 'Principal'} · ${s.contract.role === 'reserve' ? 'Reserva' : 'Promessa'}<br>${s.contract.weeklyWage} UC / semana<br>Contrato até ${date(s.contract.endDate)}` : 'Conclua sua avaliação e o primeiro treino para chamar a atenção dos clubes.'}</p><p class="hint">Promoção aos 15: 6 atuações, 270 minutos e média recente 7,5. Aos 16: 4 atuações, 180 minutos e média 6,5. OVR e vagas também contam.</p></section>${wardrobe(s)}<section class="card"><h3>Diário da carreira</h3><ol class="history">${s.history.slice(-6).map(e => `<li>${esc(e)}</li>`).join('')}</ol></section>${s.reports.length ? `<section class="card"><h3>No radar</h3>${s.reports.map(r => `<p class="hint"><b>${esc(s.clubs.find(c => c.id === r.clubId)?.name)} · ${r.team === 'youth' ? 'base' : 'principal'}</b><br>${esc(r.reason)}</p>`).join('')}</section>` : ''}</aside></div>${competitionHub(s)}${tools()}`; }
let playing: { mode: DrillSession['mode']; focus: Focus | null } | null = null;
let disposeField: (() => void) | undefined;
const drillForFocus: Record<Focus, Drill> = { finishing: 'shoot', passing: 'pass', defending: 'vision', goalkeeping: 'vision', pace: 'speed', technique: 'technique', vision: 'vision', setPieces: 'freekick' };
function startField(mode: DrillSession['mode'], focus: Focus | null = null) {
  playing = { mode, focus }; render(); app.scrollIntoView({ block: 'start' });
}
function render() {
  disposeField?.(); disposeField = undefined;
  if (playing && state) {
    const career = state; const selection = playing;
    const key = `football-rise.field.v1:${career.player.id}:${career.date}:${career.trainingSessions}:${selection.mode}:${selection.focus ?? ''}`;
    const expected = createSession(selection.mode, career.rng, selection.focus ? drillForFocus[selection.focus] : 'shoot');
    let session = expected;
    try { const raw = localStorage.getItem(key); if (raw) session = restoreSession(raw, expected); }
    catch { message('A sessão de campo não pôde ser retomada. Sua carreira foi preservada.', true); }
    app.innerHTML = '<div id="field-host"></div>';
    const fixture = career.world.fixtures.find(f => f.id === career.preparation?.fixtureId);
    const national = career.world.tournaments.find(t => t.id === fixture?.competitionId)?.level === 'national';
    const homeClub = career.clubs.find(c => c.id === fixture?.home) ?? career.clubs.find(c => c.id === career.contract?.clubId);
    const ground = stadiumFor(homeClub, selection.mode !== 'match');
    const tournament = career.world.tournaments.find(t => t.id === fixture?.competitionId);
    const homeKit = national ? nationalKit(career.world.teams.find(t => t.id === fixture?.home)?.country ?? career.player.nationality) : career.dataPack?.clubs.find(p => p.club.id === homeClub?.id)?.kits[0] ?? clubKits.kitsFor(homeClub?.id ?? 'vale')[0];
    const crowd = selection.mode === 'match' ? matchCrowd(career.world, fixture?.home ?? homeClub?.id ?? '', ground.capacity, homeClub?.reputation ?? 50, career.date, tournament?.level ?? career.contract?.team ?? 'senior', national ? career.world.teams.find(t => t.id === fixture?.home)?.country === career.player.nationality : (fixture?.home ?? homeClub?.id) === career.contract?.clubId) : undefined;
    disposeField = mountField(app.querySelector<HTMLElement>('#field-host')!, { session, fixtureLabel: selection.mode === 'match' ? `${career.preparation?.competition ?? 'Partida'} · ${career.preparation?.opponent ?? ''}` : 'Treino de fundamentos', attributes: career.player.attributes, appearance: { stadium: ground, crowd, homeColors: { primary: homeKit.shirt, secondary: homeKit.secondary }, number: career.shirt.number, training: selection.mode !== 'match', kit: selection.mode === 'match' ? national ? nationalKit(career.player.nationality) : (career.dataPack?.clubs.find(p => p.club.id === career.contract?.clubId)?.kits ?? clubKits.kitsFor(career.contract?.clubId ?? 'vale'))[career.shirt.kitIndex]! : trainingKit },
      onProgress: next => localStorage.setItem(key, JSON.stringify(next)),
      onComplete: async completed => {
        const command: Command = selection.mode === 'assessment' ? { type: 'assess', performances: assessmentScores(completed) }
          : selection.mode === 'practice' ? { type: 'practice', focus: selection.focus!, quality: sessionAverage(completed) }
          : { type: 'performance', performance: matchPerformance(completed, career.preparation!.expectedMinutes) };
        const next = advanceCareer(career, command);
        await persist(next);
        state = next; playing = null;
        try { localStorage.removeItem(key); } catch { /* career already saved */ }
        render(); message('Resultado aplicado à carreira e salvo.');
      },
      onExit: () => { playing = null; render(); },
    }); return;
  }
  app.innerHTML = (blocked ? '<section class="card"><h2>Seu save foi preservado</h2><p>Não foi possível carregar a carreira. Baixe o save antes de importar outro.</p></section>' : '') + (state ? dashboard(state) : creation());
}

app.addEventListener('submit', async e => {
  e.preventDefault(); const form = e.target as HTMLFormElement; const d = new FormData(form);
  try {
    if (form.id === 'create') { await commit(createCareer({ name: String(d.get('name')), nationality: String(d.get('nationality')), position: d.get('position') as Position, preferredFoot: d.get('foot') as 'right' | 'left' | 'both', ...(selectedPack ? { dataPack: selectedPack } : {}), shirtNumber: Number(d.get('shirtNumber')), startingAge: Number(d.get('age')) as 14 | 15 | 16, seed: crypto.getRandomValues(new Uint32Array(1))[0]! })); startField('assessment'); }
    else if (form.id === 'shirt-number') await dispatch({ type: 'shirt-number', number: Number(d.get('number')) });
    else if (form.id === 'club-kit') await dispatch({ type: 'kit', index: Number(d.get('kit')) });
    else if (form.id === 'train') { if (!state || state.player.energy < 20 || state.player.health < 60) throw new Error('Recupere energia e saúde antes de treinar.'); startField('practice', d.get('focus') as Focus); }
  } catch (err) { message(err instanceof Error ? err.message : 'Não foi possível salvar.', true); }
});
app.addEventListener('click', async e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return;
  try {
    if (b.dataset.accept) { if (confirm('Assinar com este clube e encerrar as outras propostas?')) await dispatch({ type: 'accept', offerId: b.dataset.accept }); return; }
    const action = b.dataset.action;
    if (action === 'community-pack') { b.disabled = true; try { await loadCommunityPack(); } finally { b.disabled = false; } return; }
    if (action === 'default-pack') { localStorage.removeItem('football-rise.data-pack.v1'); selectedPack = null; render(); return; }
    if (action === 'assessment' || action === 'match') { startField(action); return; }
    if (action === 'export') { const raw = await loadCareerText(); if (raw) { const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'football-rise-save.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); } }
    else if (action === 'new') { if (confirm('Baixou uma cópia? A nova carreira substituirá seu save.')) { await deleteCareer(); state = null; render(); } }
    else if (action === 'recover' || action === 'scout' || action === 'prepare' || action === 'promote' || action === 'advance-week' || action === 'renew') await dispatch({ type: action });
  } catch (err) { message(err instanceof Error ? err.message : 'Ação não concluída.', true); }
});
app.addEventListener('change', async e => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'competition-select' && state) { app.querySelector<HTMLElement>('#competition-detail')!.innerHTML = competitionDetail(state, input.value); return; }
  if (input.id === 'pack-club' && selectedPack) { app.querySelector<HTMLElement>('#pack-roster')!.innerHTML = rosterPanel(selectedPack, input.value); return; }
  if (input.id === 'data-pack' && input.files?.[0]) {
    try { if (input.files[0].size > 10 * 1024 * 1024) throw new Error('Pacote excede 10 MB.'); const pack = parseFootballPack(await input.files[0].text()); localStorage.setItem('football-rise.data-pack.v1', JSON.stringify(pack)); selectedPack = pack; render(); message(`${pack.clubs.length} clubes carregados para a próxima carreira.`); } catch (error) { message(error instanceof Error ? error.message : 'Pacote inválido.', true); } return;
  }
  if (input.id !== 'import' || !input.files?.[0]) return;
  try { const file = input.files[0]; if (file.size > 32 * 1024 * 1024) throw new Error('Save excede 32 MB.'); const next = deserializeSave(await file.text()); if ((state || blocked) && !confirm('Substituir o save deste navegador?')) return; await commit(next); message('Carreira importada.'); }
  catch (err) { message(err instanceof Error ? err.message : 'Save inválido.', true); } finally { input.value = ''; }
});
try { const raw = await loadCareerText(); if (raw) state = deserializeSave(raw); } catch { blocked = true; message('Não foi possível carregar o save. O original foi preservado.', true); }
render();
