import { crowdReaction } from '../domain/match/crowd.js';
import type { OfficialsChoice } from '../data/official-kits.js';
import type { Attributes } from '../domain/player/player.js';
import { validTarget, freePullShot, dribbleStick, type ShotPhase } from './aim-state.js';
import { paintPixelPlayers, spriteFrame, SPRITE_SIZE, PLAYER_ANIMATIONS, type PlayerAnimation } from './pixel-player.js';
import { reviewIncident, reviewFrame, reviewVerdict, REVIEW_STAGES, type ReviewIncident } from '../domain/match/video-review.js';
import { VARroom } from './var-room.js';
import { Field3D, type FieldAppearance } from './field3d.js';
import { createTrial, strikeVelocity, controlTrial, tickTrial, ballPath, keeperAt, teammateAt, type Point, type Trial } from '../domain/gameplay/trial.js';
import { recordTrial, sessionAverage, type DrillSession } from '../application/drills.js';
export const DRILL_NAMES = { shoot: 'Finalização', vision: 'Visão de jogo', pass: 'Passe', speed: 'Velocidade', technique: 'Condução e drible', freekick: 'Falta' };
const hints = { shoot: 'Puxe no campo para mirar e dosar a força. Depois, toque na bola ampliada para escolher a curva e chutar.', vision: 'Passe para um companheiro livre. A linha laranja marca o impedimento. Puxe na direção oposta ao passe.', pass: 'Antecipe o companheiro azul em movimento. Puxe e solte, evitando os defensores vermelhos.', speed: 'Toque no lado esquerdo ou direito para mudar de faixa. Desvie dos obstáculos até os 100 metros.', technique: 'Arraste no gramado como um direcional para conduzir; solte para frear. Um toque manda correr até o ponto. Atravesse os portões em ordem com a bola.', freekick: 'Puxe no campo para definir mira e força. Depois toque na bola para escolher a curva e chutar.' };
interface Options { fixtureLabel: string; appearance: FieldAppearance; attributes: Attributes; session: DrillSession; onProgress: (session: DrillSession) => void; onComplete: (session: DrillSession) => void | Promise<void>; onExit: () => void }
const W = 880, H = 1320;
function project(p: Point): Point { const scale = .5 + p.y / 1320 * .5; return { x: 440 + (p.x - 440) * scale, y: 120 + p.y * .85 }; }
function unproject(p: Point): Point { const y = (p.y - 120) / .85; return { x: 440 + (p.x - 440) / (.5 + y / 1320 * .5), y }; }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
/** Canvas and pointer adapter. Outcomes and scoring live entirely in the domain. */
export function mountField(host: HTMLElement, options: Options): () => void {
  let session = options.session, trial: Trial | null = null, raf = 0, last = 0, disposed = false;
  let drag: { id: number; x: number; y: number } | null = null;
  let aim: Point | null = null, pullTip: Point | null = null;
  let selectedAim: Point = { x: 440, y: 65 };
  let dribbleDrag: { id: number; x: number; y: number; active: boolean } | null = null;
  let contactDrag: { id: number; x: number; y: number } | null = null;
  let power = 0, confirmed = false;
  let phase: ShotPhase = 'aiming';
  let review: { incident: ReviewIncident; elapsed: number; paused: boolean } | null = null;
  const reviewed = new Set<string>();
  let overview = false, portraitBack = false;
  const movementKeys = new Set<string>();
  let paused = false, presentationTime = 0, recorded = false;
  let muted = false;
  try { muted = localStorage.getItem('football-rise.sound-muted') === 'true'; } catch {}
  let audio: AudioContext | null = null;
  let crowdSource: AudioBufferSourceNode | null = null;
  const stopCrowdSound = () => { try { crowdSource?.stop(); } catch {} crowdSource = null; };
  function sound(frequency: number) {
    if (muted || paused) return;
    try { audio ??= new AudioContext(); void audio.resume(); const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.setValueAtTime(frequency, audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(frequency / 2, audio.currentTime + .16); gain.gain.setValueAtTime(.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .2); oscillator.start(); oscillator.stop(audio.currentTime + .21); } catch {}
  }
  const crowd = options.appearance.training ? undefined : options.appearance.crowd;
  function crowdSound(outcome: Trial['outcome']) {
    if (!crowd || muted || paused || session.mode !== 'match') return;
    try {
      audio ??= new AudioContext(); void audio.resume();
      const reaction = crowdReaction(crowd, outcome), duration = reaction.cheer ? 1.1 : .65;
      const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (.7 + .3 * Math.sin(i / audio.sampleRate * 35));
      stopCrowdSound();
      const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = reaction.cheer ? 1300 : 380;
      source.connect(filter); filter.connect(gain); gain.connect(audio.destination);
      gain.gain.setValueAtTime(.001, audio.currentTime); gain.gain.linearRampToValueAtTime(.18 * crowd.occupancy * reaction.strength, audio.currentTime + .1); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); }; crowdSource = source; source.start();
    } catch {}
  }
  document.body.classList.add('field-screen');
  host.innerHTML = `<section class="field-stage"><div class="field-heading"><div><small class="stadium-caption" id="stadium-caption"></small><span class="eyebrow">${session.mode === 'assessment' ? 'ACADEMIA / AVALIAÇÃO' : session.mode === 'match' ? 'DIA DE JOGO' : 'CENTRO DE TREINAMENTO'}</span><h2 id="drill-name"></h2><small class="fixture-caption" id="fixture-caption"></small></div><strong id="drill-counter"></strong></div><nav class="shot-steps" aria-label="Etapas do chute"><span data-step="aiming"><b>01</b> Mire</span><span data-step="preparing"><b>02</b> Prepare</span><span data-step="flight"><b>03</b> Finalize</span></nav><button type="button" id="field-return" hidden>Voltar ao exercício</button><p id="stadium-mode-note" hidden>Visão panorâmica · exercício pausado</p><button type="button" id="player-turn" hidden>Ver costas</button><label id="player-animation-control" hidden>Animações · demonstração<select id="player-animation"><option value="">Postura atual</option>${Object.entries(PLAYER_ANIMATIONS).map(([id, a]) => `<option value="${id}">${a.label}</option>`).join('')}</select></label><div class="field-wrap"><canvas id="football-field" width="880" height="1320" tabindex="0" aria-label="Campo de futebol interativo"></canvas><div class="field-coach"><span class="live-dot"></span><div><strong id="coach-title">Escolha seu canto.</strong><span id="drill-hint"></span><span id="crowd-status" aria-live="polite"></span></div></div><div id="pull-origin" hidden aria-hidden="true"></div><div id="pull-vector" hidden aria-hidden="true"></div><div id="contact-dock" hidden><small>ESCOLHA A CURVA</small><canvas id="contact-ball" width="200" height="200" aria-label="Bola: toque para escolher a curva e chutar"></canvas></div><div class="field-live"><span id="field-zone"></span><span id="field-clock"></span><span id="field-score"></span><span id="referee-decision"></span></div><button type="button" id="aim-reset" hidden>Refazer mira</button></div><section id="ball-control" class="ball-control" hidden><div><span>PUXE A MIRA PARA DOSAR A FORÇA</span><div class="power-track"><progress id="shot-power" value="0" max="100"></progress><output id="shot-power-value">0%</output></div></div></section><p id="field-feedback" role="status" aria-live="polite"></p><details id="shot-effects" hidden><summary>Ajuste fino de efeito e elevação</summary><div class="fields"><label>Efeito lateral<input id="field-curve" type="range" min="-1" max="1" step="0.05" value="0"></label><label>Elevação<input id="field-lift" type="range" min="0" max="1" step="0.05" value="0"></label></div></details><div class="actions" id="lane-buttons" hidden><button type="button" id="lane-left">← Esquerda</button><button type="button" id="lane-right">Direita →</button></div><div class="field-actions"><button type="button" id="field-pause" aria-label="Pausar">Pausar</button><button type="button" id="field-next" class="primary" hidden>Próxima tentativa →</button></div><dialog id="pause-menu" aria-labelledby="pause-title"><span class="eyebrow">FOOTBALL RISE</span><h2 id="pause-title">Jogo pausado</h2><p>A ação fica parada enquanto você estiver aqui.</p><button id="field-resume" class="primary">Continuar jogando</button><button id="field-goal-review" type="button" hidden>Rever bola e linha do gol</button><button id="field-var" type="button" hidden>Rever lance com VAR</button><button id="field-player" type="button">Ver jogador</button><button id="field-stadium" type="button">Conhecer o estádio</button><button id="field-sound" type="button"></button><label class="graphics-setting">Uniforme da arbitragem<select id="officials-kit"><option value="auto">Automático · contraste</option><option value="black">Preto</option><option value="yellow">Amarelo</option><option value="red">Vermelho</option></select></label><label class="graphics-setting">Qualidade gráfica<select id="field-quality"><option value="auto">Automática</option><option value="high">Alta · computador</option><option value="low">Leve · mais desempenho</option></select></label><button id="field-exit" type="button">Salvar e voltar à carreira</button><p class="hint" id="pause-status">As tentativas concluídas são guardadas. Uma ação em andamento recomeça ao voltar.</p></dialog><section id="var-overlay" hidden aria-label="Revisão do VAR"><div class="var-banner"><span>FOOTBALL RISE · REVISÃO</span><h2 id="var-title"></h2><p id="var-detail"></p></div><canvas id="var-room" aria-label="Sala do VAR com três integrantes e seis telas"></canvas><input id="var-progress" type="range" min="0" max="16.79" step="0.01" value="0" aria-label="Progresso da revisão"><div class="var-controls"><button id="var-pause" type="button">Pausar revisão</button><button id="var-next-scene" type="button">Próxima cena</button><button id="var-close" type="button">Voltar ao jogo</button></div><small class="var-protocol">Sequência cinematográfica simplificada · análise baseada no lance</small></section><p id="renderer-status" class="hint"></p></section>`;
  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>('#' + id)!;
  $('fixture-caption').textContent = options.fixtureLabel;
  $('stadium-caption').textContent = `${options.appearance.stadium.name} · ${options.appearance.stadium.city} · ${options.appearance.stadium.country} (${options.appearance.stadium.reference === 'historical' ? 'recriação aproximada' : 'cenário simulado'})`;
  let canvas = $<HTMLCanvasElement>('football-field');
  let contactCanvas = $<HTMLCanvasElement>('contact-ball');
  contactCanvas.className = 'contact-ball-overlay';

  let view3d: Field3D | null = null;
  try { view3d = new Field3D(canvas, contactCanvas, options.appearance); canvas.dataset.renderer = 'webgl'; $('renderer-status').textContent = ''; }
  catch {
    const fresh = canvas.cloneNode(true) as HTMLCanvasElement; canvas.replaceWith(fresh); canvas = fresh;
    const freshBall = contactCanvas.cloneNode(true) as HTMLCanvasElement; contactCanvas.replaceWith(freshBall); contactCanvas = freshBall;
    canvas.dataset.renderer = '2d'; $('renderer-status').textContent = '3D indisponível neste navegador. Modo leve ativado. Puxe para definir mira e força.';
  }
  const quality = $<HTMLSelectElement>('field-quality');
  try { const saved = localStorage.getItem('football-rise.graphics.v1'); if (saved && ['auto', 'high', 'low'].includes(saved)) quality.value = saved; } catch {}
  quality.disabled = !view3d; view3d?.setQuality(quality.value as 'auto' | 'high' | 'low');
  quality.onchange = () => { view3d?.setQuality(quality.value as 'auto' | 'high' | 'low'); try { localStorage.setItem('football-rise.graphics.v1', quality.value); } catch {} draw(); };
  const officials = $<HTMLSelectElement>('officials-kit');
  try { const saved = localStorage.getItem('football-rise.officials-kit'); if (saved && ['auto', 'black', 'yellow', 'red'].includes(saved)) officials.value = saved; } catch {}
  view3d?.setOfficialsKit(officials.value as OfficialsChoice);
  officials.onchange = () => { view3d?.setOfficialsKit(officials.value as OfficialsChoice); try { localStorage.setItem('football-rise.officials-kit', officials.value); } catch {} draw(); };
  const ctx = view3d ? null : canvas.getContext('2d');
  if (!view3d && !ctx) { host.textContent = 'Seu navegador não disponibilizou o campo. Atualize a página ou tente outro navegador.'; return () => {}; }
  const varRoom = new VARroom($<HTMLCanvasElement>('var-room'));
  const feedback = $('field-feedback'), next = $<HTMLButtonElement>('field-next');
  const contact2d = view3d ? null : contactCanvas.getContext('2d');
  const curve = $<HTMLInputElement>('field-curve'), lift = $<HTMLInputElement>('field-lift');
  function setup() {
    recorded = false; delete feedback.dataset.outcome;
    drag = null; contactDrag = null; aim = null; phase = 'aiming'; power = 0; confirmed = false; selectedAim = { x: 440, y: 65 }; curve.value = '0'; lift.value = '0'; view3d?.setContact(0, 0); last = 0;
    if (session.results.length === session.sequence.length) {
      trial = null; phase = 'resolved'; $('aim-reset').hidden = true; (host.querySelector('.shot-steps') as HTMLElement).hidden = true; $('coach-title').textContent = 'Sessão concluída.'; $('drill-name').textContent = 'Sessão concluída'; $('drill-counter').textContent = `${Math.round(sessionAverage(session))}/100`;
      $('drill-hint').textContent = 'As notas foram calculadas pelas suas jogadas.';
      feedback.textContent = session.sequence.filter((v, i, a) => a.indexOf(v) === i).map(kind => `${DRILL_NAMES[kind]}: ${Math.round(sessionAverage(session, kind))}/100`).join(' · ');
      next.hidden = false; next.textContent = session.mode === 'assessment' ? 'Concluir avaliação →' : session.mode === 'match' ? 'Concluir partida →' : 'Aplicar treino →';
      $('shot-effects').hidden = true; $('ball-control').hidden = true; $('contact-dock').hidden = true; $('lane-buttons').hidden = true; draw(); return;
    }
    const kind = session.sequence[session.results.length]!;
    trial = createTrial(kind, session.results.length + 1, session.seed, 100, options.attributes);
    selectedAim = kind === 'pass' ? teammateAt(.85, trial.layout) : kind === 'vision' ? { ...trial.mates[0]! } : { ...trial.target };
    $('drill-name').textContent = DRILL_NAMES[kind];
    $('drill-counter').textContent = `${session.results.length + 1} / ${session.sequence.length}`;
    $('field-zone').textContent = `${['shoot', 'freekick'].includes(kind) ? (trial.layout === 0 ? 'Frente do gol' : trial.layout === 1 ? 'Lado esquerdo' : 'Lado direito · longa distância') : trial.layout === 0 ? 'Meio-campo' : trial.layout === 1 ? 'Meio-campo · lado esquerdo' : 'Meio-campo · lado direito'} · cenário ${trial.layout + 1}/3`;
    $('drill-hint').textContent = hints[kind];
    $('shot-effects').hidden = true; $('shot-effects').removeAttribute('open'); $('ball-control').hidden = true; $('contact-dock').hidden = true; $('lane-buttons').hidden = kind !== 'speed'; next.hidden = true;
    feedback.textContent = kind === 'technique' ? 'Arraste para conduzir, solte para frear. No computador, use WASD ou as setas.' : kind === 'speed' ? 'Escolha uma faixa e desvie dos obstáculos.' : 'Puxe para trás, ajuste para os lados e solte para confirmar. Depois toque na bola para executar.';
    updatePhase();
    canvas.setAttribute('aria-label', `Campo de futebol: ${DRILL_NAMES[kind]}`); draw();
  }
  function point(event: PointerEvent): Point { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H }; }
  function groundMode() { return trial?.kind === 'pass' || trial?.kind === 'vision'; }
  function shotMode() { return trial && !['speed', 'technique'].includes(trial.kind); }
  function updatePhase() {
    host.querySelector('.field-stage')!.setAttribute('data-phase', phase);
    host.querySelector('.shot-steps')!.setAttribute('data-phase', phase);
    (host.querySelector('.shot-steps') as HTMLElement).hidden = !shotMode();
    const prepared = !!shotMode() && phase === 'preparing';
    $('contact-dock').hidden = !confirmed; $('ball-control').hidden = !prepared;
    $('shot-effects').hidden = true; $('aim-reset').hidden = !confirmed;
    $('coach-title').textContent = !shotMode() ? (trial?.kind === 'speed' ? 'Acelere. Desvie. Chegue.' : 'A bola obedece ao seu toque.') : phase === 'aiming' ? (groundMode() ? 'Encontre o passe.' : 'Escolha seu canto.') : phase === 'preparing' ? (confirmed ? 'Mira e força confirmadas.' : 'Mova para ajustar. Solte para confirmar.') : phase === 'flight' ? 'Acompanhe a jogada.' : 'Cada tentativa conta.';
    $('drill-hint').textContent = !shotMode() ? hints[trial!.kind] : phase === 'aiming' ? (groundMode() ? hints[trial!.kind] : 'Puxe o dedo para trás. Ajuste para os lados e solte para confirmar mira e força.') : phase === 'preparing' ? (confirmed ? 'Clique ou toque na bola para escolher a curva e chutar. Centro = chute reto.' : 'Continue puxando e ajuste para os lados. Solte para confirmar.') : phase === 'flight' ? 'Bola em jogo.' : 'Veja sua nota e siga para a próxima tentativa.';
  }
  function chooseTarget(target: Point) {
    selectedAim = { ...target }; aim = { ...target }; phase = 'preparing'; confirmed = true;
    feedback.textContent = 'Mira e força confirmadas. Clique ou toque na bola para escolher a curva e chutar.'; updatePhase();
  }
  function lane(direction: -1 | 1) { if (trial) controlTrial(trial, { type: 'lane', direction }); }
  canvas.onpointerdown = event => {
    if (overview || paused || !trial || trial.resolved || trial.shot || drag || dribbleDrag || contactDrag || event.isPrimary === false || event.button !== 0) return;
    event.preventDefault(); canvas.focus({ preventScroll: true });
    if (trial.kind === 'speed') { lane(event.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? -1 : 1); return; }
    if (trial.kind === 'technique') { dribbleDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false }; pullTip = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); return; }
    if (confirmed) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; pullTip = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  };
  function samplePull(event: PointerEvent) {
    if (!drag || !trial) return false;
    pullTip = { x: event.clientX, y: event.clientY };
    const sample = freePullShot(trial.origin, event.clientX - drag.x, event.clientY - drag.y, Math.min(120, canvas.clientHeight * .22), groundMode());
    power = sample.power;
    if (sample.active) { phase = 'preparing'; aim = sample.aim; feedback.textContent = 'Ajuste para os lados. Solte para confirmar; depois clique na bola para curvar e chutar.'; updatePhase(); }
    else { phase = 'aiming'; aim = null; updatePhase(); }
    return sample.active;
  }
  canvas.onpointermove = event => {
    if (dribbleDrag?.id === event.pointerId && trial && !paused) {
      pullTip = { x: event.clientX, y: event.clientY }; event.preventDefault(); const direction = dribbleStick(event.clientX - dribbleDrag.x, event.clientY - dribbleDrag.y);
      if (direction) dribbleDrag.active = true;
      if (dribbleDrag.active) controlTrial(trial, { type: 'steer', direction });
      return;
    }
    if (drag?.id !== event.pointerId || paused) return; event.preventDefault(); samplePull(event); };
  canvas.onpointerup = event => {
    if (dribbleDrag?.id === event.pointerId && trial) {
      event.preventDefault();
      if (dribbleDrag.active) controlTrial(trial, { type: 'steer', direction: null });
      else { const p = view3d ? view3d.pick(event.clientX, event.clientY, true) : unproject(point(event)); if (p) controlTrial(trial, { type: 'move', destination: { x: clamp(p.x, 20, 860), y: clamp(p.y, 100, 1290) } }); }
      dribbleDrag = null; return;
    }
    if (drag?.id !== event.pointerId || !trial) return;
    event.preventDefault();
    const active = samplePull(event);
    drag = null;
    if (active && aim) { chooseTarget(aim); return; }
    phase = 'aiming'; aim = null; power = 0; updatePhase();
    feedback.textContent = 'Puxe para trás para definir a mira e a força no mesmo gesto.';
  };
  const cancel = () => {
    drag = null; contactDrag = null;
    if ((dribbleDrag || movementKeys.size) && trial) controlTrial(trial, { type: 'steer', direction: null }); dribbleDrag = null; movementKeys.clear();
    if (confirmed) aim = { ...selectedAim };
    else if (phase !== 'flight' && phase !== 'resolved') { power = 0; aim = null; phase = 'aiming'; }
    last = 0; if (trial) updatePhase();
  };
  canvas.onpointercancel = cancel; canvas.onlostpointercapture = () => { if (drag || dribbleDrag) cancel(); };
  $('aim-reset').onclick = () => { cancel(); confirmed = false; power = 0; phase = 'aiming'; aim = null; curve.value = lift.value = '0'; view3d?.setContact(0, 0); updatePhase(); feedback.textContent = 'Escolha um novo destino. A bola aparece depois da mira.'; };
  canvas.onkeydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); setPaused(!paused); return; }
    if (overview || paused || !trial || trial.resolved || trial.shot) return;

    const direction: Record<string, Point> = { ArrowLeft: { x: -35, y: 0 }, ArrowRight: { x: 35, y: 0 }, ArrowUp: { x: 0, y: -35 }, ArrowDown: { x: 0, y: 35 } };
    if (event.key === ' ') { event.preventDefault(); if (shotMode()) { if (!confirmed) { if (!power) power = 1; chooseTarget(aim ?? selectedAim); } else if (phase === 'preparing') { controlTrial(trial, { type: 'kick', aim: selectedAim, curve: Number(curve.value), lift: Number(lift.value), velocity: strikeVelocity(options.attributes, trial.kind, power) }); phase = 'flight'; confirmed = false; sound(160); aim = null; updatePhase(); } } return; }
    const key = ({ w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' } as Record<string, string>)[event.key.toLowerCase()] ?? event.key;
    if (trial.kind === 'technique' && direction[key]) { event.preventDefault(); movementKeys.add(key); steerKeyboard(); return; }
    const d = direction[event.key]; if (!d) return; event.preventDefault();
    if (trial.kind === 'speed') { if (d.x) lane(d.x < 0 ? -1 : 1); }
    else if (!confirmed) { const nextAim = validTarget({ x: (aim ?? selectedAim).x + d.x, y: (aim ?? selectedAim).y + d.y / 3 }, groundMode()); if (nextAim) { aim = nextAim; if (phase === 'preparing') selectedAim = { ...nextAim }; } }
  };
  function steerKeyboard() {
    if (!trial) return;
    const x = Number(movementKeys.has('ArrowRight')) - Number(movementKeys.has('ArrowLeft'));
    const y = Number(movementKeys.has('ArrowDown')) - Number(movementKeys.has('ArrowUp'));
    controlTrial(trial, { type: 'steer', direction: x || y ? { x, y } : null });
  }
  canvas.onkeyup = event => {
    const key = ({ w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' } as Record<string, string>)[event.key.toLowerCase()] ?? event.key;
    if (movementKeys.delete(key)) { event.preventDefault(); steerKeyboard(); }
  };
  const ready = () => !overview && !paused && trial && confirmed && phase === 'preparing' && !trial.resolved && !trial.shot && !!shotMode();
  function sampleContact(event: PointerEvent) {
    const r = contactCanvas.getBoundingClientRect();
    const effects = view3d?.contact(event.clientX, event.clientY) ?? (!view3d ? { curve: clamp(-(event.clientX - r.left - r.width / 2) / (r.width * .4), -1, 1), lift: clamp((event.clientY - r.top - r.height / 2) / (r.height * .4), 0, 1) } : null);
    if (!effects) return false;
    curve.value = String(effects.curve); lift.value = '0';
    view3d?.setContact(-effects.curve, 0); return true;
  }
  contactCanvas.onpointerdown = event => {
    if (!ready() || contactDrag || drag || event.isPrimary === false || event.button !== 0) return;
    event.preventDefault(); if (!sampleContact(event)) return;
    contactDrag = { id: event.pointerId, x: event.clientX, y: event.clientY }; contactCanvas.setPointerCapture(event.pointerId);
  };
  contactCanvas.onpointermove = event => { if (contactDrag?.id !== event.pointerId) return; event.preventDefault(); sampleContact(event); };
  contactCanvas.onpointerup = event => {
    if (contactDrag?.id !== event.pointerId || !trial) return;
    event.preventDefault(); const valid = sampleContact(event); contactDrag = null;
    if (!valid) return;
    controlTrial(trial, { type: 'kick', aim: selectedAim, curve: Number(curve.value), lift: 0, velocity: strikeVelocity(options.attributes, trial.kind, power) });
    confirmed = false; phase = 'flight'; aim = null; sound(160); updatePhase();
  };
  contactCanvas.onpointercancel = cancel; contactCanvas.onlostpointercapture = () => { if (contactDrag) cancel(); };
  const syncContact = () => { view3d?.setContact(-Number(curve.value), -Number(lift.value)); };
  curve.oninput = syncContact; lift.oninput = syncContact;
  $('lane-left').onclick = () => lane(-1); $('lane-right').onclick = () => lane(1);
  const pauseMenu = $<HTMLDialogElement>('pause-menu');
  function saveResolved() {
    if (trial?.resolved && !recorded) { const result = recordTrial(session, trial); options.onProgress(result); session = result; recorded = true; }
  }
  function setPaused(value: boolean) {
    if (disposed || paused === value) return;
    paused = value; if (paused) stopCrowdSound(); cancel(); last = 0;
    host.querySelector('.field-stage')!.setAttribute('data-paused', String(paused));
    $('field-var').hidden = !trial || !reviewIncident(trial);
    $('field-goal-review').hidden = !view3d || !trial?.resolved || !trial.shot || !['shoot', 'freekick'].includes(trial.kind);
    if (paused) { void audio?.suspend(); pauseMenu.showModal(); $('field-sound').textContent = muted ? 'Som: desligado' : 'Som: ligado'; }
    else { pauseMenu.close(); if (!muted) void audio?.resume(); canvas.focus({ preventScroll: true }); }
  }
  $('field-pause').onclick = () => setPaused(true);
  $('field-stadium').hidden = $('field-player').hidden = !view3d;
  function setOverview(value: boolean, portrait = false) {
    cancel(); overview = value; view3d?.setOverview(value && !portrait); view3d?.setPortrait(value && portrait); view3d?.setGoalReview(false); view3d?.setVARView(null); portraitBack = false; view3d?.setPortraitBack(false); $('player-turn').hidden = !value || !portrait; $('player-turn').textContent = 'Ver costas'; $('player-animation-control').hidden = !value || !portrait; $<HTMLSelectElement>('player-animation').value = ''; view3d?.setAnimationPreview(null);
    $('stadium-mode-note').textContent = portrait ? 'Inspeção do atleta · exercício pausado' : 'Visão panorâmica · exercício pausado';
    host.querySelector('.field-stage')!.setAttribute('data-view', value ? 'stadium' : 'player');
    $('field-return').hidden = $('stadium-mode-note').hidden = !value;
    if (value) void audio?.suspend(); else if (!muted) void audio?.resume();
    last = 0; draw();
  }
  function closeReview() {
    review = null; $('var-overlay').hidden = true; view3d?.setVARView(null); setOverview(false);
  }
  function showReview() {
    if (!review) return;
    const frame = reviewFrame(review.elapsed);
    if (frame.phase === 'complete') { closeReview(); return; }
    const titles = { assistant: review.incident.kind === 'offside' ? 'O bandeirinha sinalizou' : 'Checagem da arbitragem', room: 'Dentro da sala do VAR', walk: 'Árbitro a caminho do monitor', monitor: 'Revisão à beira do campo', decision: reviewVerdict(review.incident) };
    $('var-title').textContent = titles[frame.phase];
    $('var-detail').textContent = frame.phase === 'decision' ? review.incident.explanation : review.incident.kind === 'offside' ? 'Verificando a posição no instante do passe.' : 'Verificando o cruzamento completo da bola na linha do gol.';
    $<HTMLInputElement>('var-progress').value = String(review.elapsed);
    $('var-pause').textContent = review.paused ? 'Continuar revisão' : 'Pausar revisão';
    host.querySelector('.field-stage')!.setAttribute('data-var-phase', frame.phase);
    $('var-room').hidden = frame.phase !== 'room'; $('var-overlay').dataset.room = String(frame.phase === 'room');
    view3d?.setVARView(frame);
    if (frame.phase === 'room' || !view3d) { $('var-room').hidden = false; varRoom.draw(review.incident, review.elapsed, frame.phase === 'decision'); }
  }
  function startReview(incident: ReviewIncident) {
    if (paused) setPaused(false);
    setOverview(true); view3d?.setVARIncident(incident); review = { incident, elapsed: 0, paused: false }; reviewed.add(incident.id);
    $('field-return').hidden = $('stadium-mode-note').hidden = true;
    host.querySelector('.field-stage')!.setAttribute('data-view', 'var'); $('var-overlay').hidden = false;
    showReview(); draw();
  }
  $('field-var').onclick = () => { if (!trial) return; const incident = reviewIncident(trial); if (incident) startReview(incident); };
  $('var-close').onclick = closeReview;
  $('var-progress').oninput = () => { if (review) { review.elapsed = Math.max(0, Math.min(16.79, Number($<HTMLInputElement>('var-progress').value))); showReview(); draw(); } };
  $('var-pause').onclick = () => { if (review) { review.paused = !review.paused; showReview(); } };
  $('var-next-scene').onclick = () => {
    if (!review) return; let at = 0;
    for (const stage of REVIEW_STAGES) { at += stage.duration; if (at > review.elapsed + .001) { review.elapsed = at; break; } }
    showReview(); draw();
  };
  const onReviewKey = (event: KeyboardEvent) => { if (review && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); review.paused = !review.paused; showReview(); } };
  window.addEventListener('keydown', onReviewKey, true);
  $('player-animation').onchange = () => { const action = $<HTMLSelectElement>('player-animation').value; view3d?.setAnimationPreview(action in PLAYER_ANIMATIONS ? action as PlayerAnimation : null); $('stadium-mode-note').textContent = action ? 'Demonstração de animação · não é um evento da carreira' : 'Inspeção do atleta · exercício pausado'; draw(); };
  $('player-turn').onclick = () => { portraitBack = !portraitBack; view3d?.setPortraitBack(portraitBack); $('player-turn').textContent = portraitBack ? 'Ver frente' : 'Ver costas'; draw(); };
  $('field-goal-review').onclick = () => { if (!trial?.shot) return; setPaused(false); setOverview(true); view3d?.setGoalReview(true); $('stadium-mode-note').textContent = trial.shot.decision === 'goal' ? 'Gol confirmado · bola inteira além da linha' : 'Sem gol · confira a posição da bola e da linha'; draw(); };
  $('field-player').onclick = () => { setPaused(false); setOverview(true, true); };
  $('field-stadium').onclick = () => { setPaused(false); setOverview(true); };
  $('field-return').onclick = () => setOverview(false);
  $('field-resume').onclick = () => setPaused(false);
  pauseMenu.oncancel = event => { event.preventDefault(); setPaused(false); };
  $('field-sound').onclick = () => { muted = !muted; if (muted) stopCrowdSound(); try { localStorage.setItem('football-rise.sound-muted', String(muted)); } catch {} $('field-sound').textContent = muted ? 'Som: desligado' : 'Som: ligado'; };
  $('field-exit').onclick = () => { try { saveResolved(); options.onExit(); } catch { $('pause-status').textContent = 'Não foi possível salvar. Continue aqui e tente novamente.'; } };
  next.onclick = async () => {
    try {
      if (!trial) { await options.onComplete(session); return; }
      saveResolved(); setup();
    } catch (error) { feedback.textContent = error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'; }
  };
  function line(points: Point[], color = '#d5ecd0', width = 3) {
    ctx!.strokeStyle = color; ctx!.lineWidth = width; ctx!.beginPath(); points.forEach((p, i) => { const v = project(p); if (i) ctx!.lineTo(v.x, v.y); else ctx!.moveTo(v.x, v.y); }); ctx!.stroke();
  }
  function disc(p: Point, radius: number, color: string) { const v = project(p), scale = .5 + p.y / 1320 * .5; ctx!.fillStyle = color; ctx!.beginPath(); ctx!.ellipse(v.x, v.y, radius * scale, radius * scale * .7, 0, 0, Math.PI * 2); ctx!.fill(); }
  const pixelSheets = new Map<string, HTMLCanvasElement>();
  function actor(p: Point, color: string, label = '') {
    const user = color === options.appearance.kit.shirt;
    const key = `${color}:${label}`; let sheet = pixelSheets.get(key);
    if (!sheet) {
      sheet = document.createElement('canvas');
      paintPixelPlayers(sheet, user ? options.appearance.kit : { ...options.appearance.kit, shirt: color, pattern: 'plain' }, user ? options.appearance.number : Number(label) || 1, options.appearance.training);
      pixelSheets.set(key, sheet);
    }
    const v = project(p), scale = .6 + p.y / 1320 * .4;
    const moving = user && !!trial?.started && !trial.resolved && (trial.kind === 'speed' || trial.kind === 'technique' && Math.hypot(trial.velocity.x, trial.velocity.y) > 4);
    const frame = spriteFrame(presentationTime, moving, user && trial?.shot ? trial.shot.elapsed : null);
    disc(p, 16, '#0005'); ctx!.imageSmoothingEnabled = false;
    ctx!.drawImage(sheet, frame * SPRITE_SIZE.width, (user ? 1 : 0) * SPRITE_SIZE.height, SPRITE_SIZE.width, SPRITE_SIZE.height, Math.round(v.x - 48 * scale), Math.round(v.y - 104 * scale), Math.round(96 * scale), Math.round(120 * scale));
  }
  function draw() {
    if (trial && !trial.resolved) {
      if (trial.kind === 'technique') {
        $('coach-title').textContent = `Portão ${Math.min(trial.gates.length, trial.gate + 1)} de ${trial.gates.length} · siga o verde-água`;
        feedback.textContent = `${trial.collisions} toques nos cones · ${Math.max(0, 22 - trial.time).toFixed(1)} s restantes. Atravesse com o jogador e a bola.`;
      } else if (trial.kind === 'speed') {
        $('coach-title').textContent = `Faixa ${trial.lane + 1} de 3 · ${Math.round(trial.velocity.y * 3.6)} km/h`;
        feedback.textContent = `${trial.collisions} colisões · ${Math.max(0, 100 - trial.distance).toFixed(0)} m até a chegada. Colidir reduz sua velocidade.`;
      }
    }
    $('crowd-status').hidden = !crowd;
    if (crowd) { const status = trial?.resolved ? crowdReaction(crowd, trial.outcome).message : `Público estimado: ${crowd.attendance.toLocaleString('pt-BR')} · ${Math.round(crowd.occupancy * 100)}% · torcida ${crowd.mood}`; if ($('crowd-status').textContent !== status) $('crowd-status').textContent = status; }
    canvas.dataset.aim = aim ? JSON.stringify(aim) : '';
    canvas.style.cursor = confirmed ? 'default' : drag ? 'grabbing' : 'grab';
    const gesture = drag ?? dribbleDrag;
    $('pull-origin').hidden = $('pull-vector').hidden = !gesture || !pullTip;
    $('pull-origin').classList.toggle('dribble-stick', !!dribbleDrag);
    if (gesture && pullTip) {
      const rect = canvas.getBoundingClientRect(), dx = pullTip.x - gesture.x, dy = pullTip.y - gesture.y;
      for (const id of ['pull-origin', 'pull-vector']) { $(id).style.left = `${gesture.x - rect.left}px`; $(id).style.top = `${gesture.y - rect.top}px`; }
      $('pull-vector').style.width = `${Math.hypot(dx, dy)}px`; $('pull-vector').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    }
    $<HTMLProgressElement>('shot-power').value = power * 100; $('shot-power-value').textContent = `${Math.round(power * 100)}% · ${Math.round(strikeVelocity(options.attributes, trial?.kind ?? 'shoot', power))} km/h`;
    $('referee-decision').textContent = trial?.referee.signal === 'goal' ? 'Árbitro: gol confirmado' : trial?.referee.signal === 'offside' ? 'Árbitro: impedimento' : trial?.referee.signal === 'no-goal' ? 'Árbitro: sem gol' : '';
    if (view3d) { view3d.render(trial, aim, Number(curve.value), Number(lift.value), phase, presentationTime);
      if (trial) { $('field-clock').textContent = !trial.started ? 'PREPARE SUA JOGADA' : `${trial.time.toFixed(1)} s`; $('field-score').textContent = trial.kind === 'speed' ? `${Math.min(100, Math.floor(trial.distance))} m` : trial.kind === 'technique' ? `${trial.gate}/5 portões` : power > 0 ? `POTÊNCIA ${Math.round(power * 100)}%` : 'MIRA + FORÇA → CURVA'; } return; }
    if (contact2d) { contact2d.clearRect(0, 0, 200, 200); const gradient = contact2d.createRadialGradient(75, 60, 5, 100, 100, 80); gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, '#8193a4'); contact2d.fillStyle = gradient; contact2d.beginPath(); contact2d.arc(100, 100, 80, 0, Math.PI * 2); contact2d.fill(); contact2d.fillStyle = '#102338'; for (const [x,y] of [[90,65],[50,120],[140,130]]) { contact2d.beginPath(); for (let k=0;k<5;k++) {const a=k*Math.PI*2/5;const px=x!+Math.cos(a)*19,py=y!+Math.sin(a)*19;if(k)contact2d.lineTo(px,py);else contact2d.moveTo(px,py);}contact2d.fill();} }
    ctx!.clearRect(0, 0, W, H); ctx!.fillStyle = '#102f25'; ctx!.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const a = i * 110, b = (i + 1) * 110, points = [{ x: 0, y: a }, { x: 880, y: a }, { x: 880, y: b }, { x: 0, y: b }].map(project);
      ctx!.fillStyle = i % 2 ? '#247a45' : '#2a864b'; ctx!.beginPath(); points.forEach((p, n) => n ? ctx!.lineTo(p.x, p.y) : ctx!.moveTo(p.x, p.y)); ctx!.closePath(); ctx!.fill();
    }
    line([{ x: 0, y: 0 }, { x: 880, y: 0 }, { x: 880, y: 1320 }, { x: 0, y: 1320 }, { x: 0, y: 0 }]);
    const midfield = trial && !['shoot', 'freekick'].includes(trial.kind);
    line([{ x: 0, y: 660 }, { x: 880, y: 660 }]);
    if (midfield) line(Array.from({ length: 49 }, (_, i) => ({ x: 440 + Math.cos(i * Math.PI / 24) * 180, y: 660 + Math.sin(i * Math.PI / 24) * 180 })));
    if (!midfield) { line([{ x: 175, y: 0 }, { x: 175, y: 300 }, { x: 705, y: 300 }, { x: 705, y: 0 }]);
    const left = project({ x: 240, y: 95 }), right = project({ x: 640, y: 95 });
    ctx!.fillStyle = '#e7f5e515'; ctx!.fillRect(left.x, 45, right.x - left.x, right.y - 45); ctx!.strokeStyle = '#e4efdf'; ctx!.lineWidth = 6; ctx!.strokeRect(left.x, 45, right.x - left.x, right.y - 45);
    ctx!.lineWidth = 1; for (let x = left.x; x < right.x; x += 17) { ctx!.beginPath(); ctx!.moveTo(x, 45); ctx!.lineTo(x, right.y); ctx!.stroke(); } for (let y = 45; y < right.y; y += 16) { ctx!.beginPath(); ctx!.moveTo(left.x, y); ctx!.lineTo(right.x, y); ctx!.stroke(); }
    }
    if (!trial) { ctx!.fillStyle = '#c7f36b'; ctx!.font = 'bold 44px system-ui'; ctx!.textAlign = 'center'; ctx!.fillText('SESSÃO CONCLUÍDA', 440, 640); return; }
    const t = trial;
    if (t.kind === 'speed') {
      for (const x of [293, 587]) line([{ x, y: 0 }, { x, y: 1320 }], '#e3f2d788');
      for (const o of t.obstacles) if (!o.passed && o.distance - t.distance < 55) { const p = { x: [147, 440, 733][o.lane]!, y: 1150 - (o.distance - t.distance) * 20 }; disc(p, 70, '#ef7049'); }
      actor({ x: [147, 440, 733][t.lane]!, y: 1160 }, options.appearance.kit.shirt, String(options.appearance.number));
    } else if (t.kind === 'technique') {
      t.gates.forEach((p, i) => { if (i >= t.gate) { line([{ x: p.x - 50, y: p.y }, { x: p.x + 50, y: p.y }], i === t.gate ? '#7cf5db' : '#718768', 12); const v = project(p); ctx!.font = 'bold 28px system-ui'; ctx!.fillStyle = '#fff'; ctx!.fillText(String(i + 1), v.x, v.y - 20); } });
      t.cones.forEach(p => disc(p, 30, '#ff873c')); actor(t.player, options.appearance.kit.shirt); disc(t.ball, 13, '#fff');
    } else {
      actor({ x: t.origin.x - 38, y: t.origin.y + 38 }, options.appearance.kit.shirt, String(options.appearance.number));
      if (t.kind === 'pass' || t.kind === 'vision') {
        t.defenders.forEach(p => actor(p, '#ee6659'));
        if (t.kind === 'pass') actor(teammateAt(t.time, t.layout), '#6fd8ff', 'COMPANHEIRO');
        else { line([{ x: 0, y: t.offsideLine }, { x: 880, y: t.offsideLine }], '#ffa348', 5); t.mates.forEach((p, i) => actor(p, '#6fd8ff', String(i + 1))); }
      } else {
        actor({ x: t.shot?.keeper ?? keeperAt(t.time), y: 95 }, '#6fd8ff');
        if (t.kind === 'freekick') [360, 410, 460, 510].forEach(x => actor({ x, y: 720 }, '#ee6659'));
      }
      if (aim && !t.shot) {
        ctx!.setLineDash([10, 14]); line(Array.from({ length: 25 }, (_, i) => ballPath(t.origin, aim!, i / 24, Number(curve.value))), '#dcff83', 6); ctx!.setLineDash([]);
      }
      if (t.shot) {
        const u = Math.min(1, t.shot.elapsed / t.shot.duration), p = ballPath(t.shot.from, t.shot.end, u, t.shot.curve), v = project(p);
        disc(p, 15, '#0005'); ctx!.fillStyle = '#fff'; ctx!.beginPath(); ctx!.arc(v.x, v.y - Math.sin(u * Math.PI) * (90 + t.shot.lift * 160), 13, 0, Math.PI * 2); ctx!.fill();
      } else if (phase !== 'aiming') disc(t.origin, 16, '#fff');
    }
    $('field-clock').textContent = !t.started ? 'AGUARDANDO SUA AÇÃO' : `${t.time.toFixed(1)} s`;
    $('field-score').textContent = t.kind === 'speed' ? `${Math.min(100, Math.floor(t.distance))} m` : t.kind === 'technique' ? `${t.gate}/5 portões` : 'PUXE → MIRE → SOLTE';
  }
  function frame(time: number) {
    if (disposed) return;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 0; last = time;
    if (!paused && !review?.paused) presentationTime += dt;
    if (review && !review.paused && !document.hidden) { review.elapsed += dt; showReview(); }
    if (!overview && !paused && trial && !drag && !contactDrag && !document.hidden) tickTrial(trial, dt);
    if (trial?.resolved) { if (phase !== 'resolved') { phase = 'resolved'; crowdSound(trial.outcome); sound(trial.outcome === 'goal' ? 740 : 280); updatePhase(); } feedback.dataset.outcome = trial.outcome ?? ''; feedback.textContent = `${trial.message} Nota: ${trial.score}/100.`; next.hidden = false; next.textContent = session.results.length + 1 === session.sequence.length ? 'Ver resultado →' : 'Próxima tentativa →'; }
    $<HTMLButtonElement>('field-pause').hidden = !!drag || !!contactDrag || phase === 'flight';
    if (!review && trial?.resolved && session.mode === 'match') { const incident = reviewIncident(trial); if (incident && ['goal', 'offside'].includes(trial.outcome ?? '') && !reviewed.has(incident.id)) startReview(incident); }
    if (!paused && !review?.paused) draw(); raf = requestAnimationFrame(frame);
  }
  const suspend = () => { stopCrowdSound(); if (review) { review.paused = true; showReview(); } else setPaused(true); };
  const onVisibility = () => { if (document.hidden) suspend(); }; const onBlur = suspend; document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', onBlur);
  setup(); raf = requestAnimationFrame(frame);
  return () => { disposed = true; window.removeEventListener('keydown', onReviewKey, true); cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); pauseMenu.close(); document.body.classList.remove('field-screen'); void audio?.close(); view3d?.dispose(); };
}
