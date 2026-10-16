import { validTarget, pulledShot, type ShotPhase } from './aim-state.js';
import { Field3D } from './field3d.js';
import { createTrial, controlTrial, tickTrial, ballPath, keeperAt, teammateAt, type Point, type Trial } from '../domain/gameplay/trial.js';
import { recordTrial, sessionAverage, type DrillSession } from '../application/drills.js';
export const DRILL_NAMES = { shoot: 'Finalização', vision: 'Visão de jogo', pass: 'Passe', speed: 'Velocidade', technique: 'Condução e drible', freekick: 'Falta' };
const hints = { shoot: 'Toque no gol para mirar. Escolha o contato na bola ampliada, puxe para baixo e solte. Você também pode arrastar no gramado.', vision: 'Passe para um companheiro livre. A linha laranja marca o impedimento. Puxe na direção oposta ao passe.', pass: 'Antecipe o companheiro azul em movimento. Puxe e solte, evitando os defensores vermelhos.', speed: 'Toque no lado esquerdo ou direito para mudar de faixa. Desvie dos obstáculos até os 100 metros.', technique: 'Toque no gramado para conduzir a bola. Passe pelos portões numerados em ordem, sem tocar nos cones.', freekick: 'Toque no canto do gol. Na bola ampliada, selecione uma lateral ou a parte de baixo para efeito/elevação; puxe e solte.' };
interface Options { session: DrillSession; onProgress: (session: DrillSession) => void; onComplete: (session: DrillSession) => void; onExit: () => void }
const W = 880, H = 1320;
function project(p: Point): Point { const scale = .5 + p.y / 1320 * .5; return { x: 440 + (p.x - 440) * scale, y: 120 + p.y * .85 }; }
function unproject(p: Point): Point { const y = (p.y - 120) / .85; return { x: 440 + (p.x - 440) / (.5 + y / 1320 * .5), y }; }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
/** Canvas and pointer adapter. Outcomes and scoring live entirely in the domain. */
export function mountField(host: HTMLElement, options: Options): () => void {
  let session = options.session, trial: Trial | null = null, raf = 0, last = 0, disposed = false;
  let drag: { id: number; x: number; y: number } | null = null;
  let aim: Point | null = null;
  let selectedAim: Point = { x: 440, y: 65 };
  let contactDrag: { id: number; x: number; y: number } | null = null;
  let power = 0;
  let phase: ShotPhase = 'aiming';
  host.innerHTML = `<section class="field-stage"><div class="field-heading"><div><span class="eyebrow">${session.mode === 'assessment' ? 'ACADEMIA / AVALIAÇÃO' : session.mode === 'match' ? 'DIA DE JOGO' : 'CENTRO DE TREINAMENTO'}</span><h2 id="drill-name"></h2></div><strong id="drill-counter"></strong></div><nav class="shot-steps" aria-label="Etapas do chute"><span data-step="aiming"><b>01</b> Mire</span><span data-step="preparing"><b>02</b> Prepare</span><span data-step="flight"><b>03</b> Finalize</span></nav><div class="field-wrap"><canvas id="football-field" width="880" height="1320" tabindex="0" aria-label="Campo de futebol interativo"></canvas><div class="field-coach"><span class="live-dot"></span><div><strong id="coach-title">Escolha seu canto.</strong><span id="drill-hint"></span></div></div><div id="aim-reticle" hidden aria-hidden="true"><i></i></div><div id="contact-dock" hidden><small>PONTO DE CONTATO</small><canvas id="contact-ball" width="200" height="200" aria-label="Bola: escolha o ponto de contato e puxe para chutar"></canvas></div><div class="field-live"><span id="field-clock"></span><span id="field-score"></span></div><button type="button" id="aim-reset" hidden>↖ Alterar mira</button></div><section id="ball-control" class="ball-control" hidden><div><span>PUXE A BOLA PARA CARREGAR</span><div class="power-track"><progress id="shot-power" value="0" max="100"></progress><output id="shot-power-value">0%</output></div></div></section><p id="field-feedback" role="status" aria-live="polite"></p><details id="shot-effects" hidden><summary>Ajuste fino de efeito e elevação</summary><div class="fields"><label>Efeito lateral<input id="field-curve" type="range" min="-1" max="1" step="0.05" value="0"></label><label>Elevação<input id="field-lift" type="range" min="0" max="1" step="0.05" value="0"></label></div></details><div class="actions" id="lane-buttons" hidden><button type="button" id="lane-left">← Esquerda</button><button type="button" id="lane-right">Direita →</button></div><div class="field-actions"><button type="button" id="field-exit">← Voltar à carreira</button><button type="button" id="field-next" class="primary" hidden>Próxima tentativa →</button></div><p id="renderer-status" class="hint"></p></section>`;
  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>('#' + id)!;
  let canvas = $<HTMLCanvasElement>('football-field');
  let contactCanvas = $<HTMLCanvasElement>('contact-ball');
  contactCanvas.className = 'contact-ball-overlay';

  let view3d: Field3D | null = null;
  try { view3d = new Field3D(canvas, contactCanvas); canvas.dataset.renderer = 'webgl'; $('renderer-status').textContent = ''; }
  catch {
    const fresh = canvas.cloneNode(true) as HTMLCanvasElement; canvas.replaceWith(fresh); canvas = fresh;
    const freshBall = contactCanvas.cloneNode(true) as HTMLCanvasElement; contactCanvas.replaceWith(freshBall); contactCanvas = freshBall;
    canvas.dataset.renderer = '2d'; $('renderer-status').textContent = '3D indisponível neste navegador. Modo leve ativado. Toque no gol para mirar.';
  }
  const ctx = view3d ? null : canvas.getContext('2d');
  if (!view3d && !ctx) { host.textContent = 'Seu navegador não disponibilizou o campo. Atualize a página ou tente outro navegador.'; return () => {}; }
  const feedback = $('field-feedback'), next = $<HTMLButtonElement>('field-next');
  const contact2d = view3d ? null : contactCanvas.getContext('2d');
  const curve = $<HTMLInputElement>('field-curve'), lift = $<HTMLInputElement>('field-lift');
  function setup() {
    delete feedback.dataset.outcome;
    drag = null; contactDrag = null; aim = null; phase = 'aiming'; power = 0; selectedAim = { x: 440, y: 65 }; curve.value = '0'; lift.value = '0'; view3d?.setContact(0, 0); last = 0;
    if (session.results.length === session.sequence.length) {
      trial = null; phase = 'resolved'; $('aim-reticle').hidden = true; $('aim-reset').hidden = true; (host.querySelector('.shot-steps') as HTMLElement).hidden = true; $('coach-title').textContent = 'Sessão concluída.'; $('drill-name').textContent = 'Sessão concluída'; $('drill-counter').textContent = `${Math.round(sessionAverage(session))}/100`;
      $('drill-hint').textContent = 'As notas foram calculadas pelas suas jogadas.';
      feedback.textContent = session.sequence.filter((v, i, a) => a.indexOf(v) === i).map(kind => `${DRILL_NAMES[kind]}: ${Math.round(sessionAverage(session, kind))}/100`).join(' · ');
      next.hidden = false; next.textContent = session.mode === 'assessment' ? 'Concluir avaliação →' : session.mode === 'match' ? 'Concluir partida →' : 'Aplicar treino →';
      $('shot-effects').hidden = true; $('ball-control').hidden = true; $('contact-dock').hidden = true; $('lane-buttons').hidden = true; draw(); return;
    }
    const kind = session.sequence[session.results.length]!;
    trial = createTrial(kind, session.results.length + 1, session.seed);
    selectedAim = kind === 'pass' ? teammateAt(.85) : kind === 'vision' ? { ...trial.mates[0]! } : { ...trial.target };
    $('drill-name').textContent = DRILL_NAMES[kind];
    $('drill-counter').textContent = `${session.results.length + 1} / ${session.sequence.length}`;
    $('drill-hint').textContent = hints[kind];
    $('shot-effects').hidden = true; $('shot-effects').removeAttribute('open'); $('ball-control').hidden = true; $('contact-dock').hidden = true; $('lane-buttons').hidden = kind !== 'speed'; next.hidden = true;
    feedback.textContent = kind === 'technique' ? 'Toque nos portões em ordem para conduzir a bola.' : kind === 'speed' ? 'Escolha uma faixa e desvie dos obstáculos.' : 'Primeiro escolha a mira. Nenhum toque no campo dispara a bola.';
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
    $('contact-dock').hidden = !prepared; $('ball-control').hidden = !prepared;
    $('shot-effects').hidden = !prepared; $('aim-reset').hidden = !prepared;
    $('coach-title').textContent = !shotMode() ? (trial?.kind === 'speed' ? 'Acelere. Desvie. Chegue.' : 'A bola obedece ao seu toque.') : phase === 'aiming' ? (groundMode() ? 'Encontre o passe.' : 'Escolha seu canto.') : phase === 'preparing' ? 'Agora, prepare seu chute.' : phase === 'flight' ? 'Acompanhe a jogada.' : 'Cada tentativa conta.';
    $('drill-hint').textContent = !shotMode() ? hints[trial!.kind] : phase === 'aiming' ? (groundMode() ? 'Toque ou deslize no gramado para escolher o destino.' : 'Toque ou deslize DENTRO DO GOL para mirar.') : phase === 'preparing' ? 'Ajuste o contato na bola, puxe para baixo e solte.' : phase === 'flight' ? 'Bola em jogo.' : 'Veja sua nota e siga para a próxima tentativa.';
  }
  function pickTarget(event: PointerEvent) {
    if (view3d) return validTarget(view3d.pick(event.clientX, event.clientY, groundMode()), groundMode());
    const p = point(event);
    if (groundMode()) return validTarget(unproject(p), true);
    const bottom = project({ x: 440, y: 95 }).y;
    return validTarget({ x: 440 + (p.x - 440) / (.5 + 95 / 1320 * .5), y: 95 - (bottom - p.y) / (bottom - 45) * 70 }, false);
  }
  function chooseTarget(target: Point) {
    selectedAim = { ...target }; aim = { ...target }; phase = 'preparing'; power = 0;
    feedback.textContent = 'Mira confirmada. Agora escolha o ponto na bola e puxe para chutar.'; updatePhase();
  }
  function lane(direction: -1 | 1) { if (trial) controlTrial(trial, { type: 'lane', direction }); }
  canvas.onpointerdown = event => {
    if (!trial || trial.resolved || trial.shot || drag || contactDrag || event.isPrimary === false || event.button !== 0) return;
    event.preventDefault(); canvas.focus({ preventScroll: true });
    if (trial.kind === 'speed') { lane(event.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? -1 : 1); return; }
    if (trial.kind === 'technique') { const p = view3d?.pick(event.clientX, event.clientY, true) ?? unproject(point(event)); controlTrial(trial, { type: 'move', destination: { x: clamp(p.x, 20, 860), y: clamp(p.y, 100, 1290) } }); return; }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    const target = pickTarget(event); if (target) aim = target;
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => { if (drag?.id !== event.pointerId) return; event.preventDefault(); const target = pickTarget(event); if (target) aim = target; };
  canvas.onpointerup = event => {
    if (drag?.id !== event.pointerId || !trial) return;
    event.preventDefault(); drag = null; const target = pickTarget(event);
    if (target) chooseTarget(target);
    else { aim = phase === 'preparing' ? { ...selectedAim } : null; feedback.textContent = groundMode() ? 'Escolha um destino dentro do gramado.' : 'Toque dentro da rede. Você pode deslizar para ajustar o canto.'; }
  };
  const cancel = () => { drag = null; contactDrag = null; power = 0; aim = phase === 'preparing' ? { ...selectedAim } : null; last = 0; };
  canvas.onpointercancel = cancel; canvas.onlostpointercapture = () => { if (drag) cancel(); };
  $('aim-reset').onclick = () => { cancel(); phase = 'aiming'; aim = null; curve.value = lift.value = '0'; view3d?.setContact(0, 0); updatePhase(); feedback.textContent = 'Escolha um novo destino. A bola aparece depois da mira.'; };
  canvas.onkeydown = event => {
    if (!trial || trial.resolved || trial.shot) return;
    if (event.key === 'Escape') { if (phase === 'preparing') $('aim-reset').click(); else cancel(); return; }
    const direction: Record<string, Point> = { ArrowLeft: { x: -35, y: 0 }, ArrowRight: { x: 35, y: 0 }, ArrowUp: { x: 0, y: -35 }, ArrowDown: { x: 0, y: 35 } };
    if (event.key === ' ') { event.preventDefault(); if (shotMode()) { if (phase === 'aiming') chooseTarget(aim ?? selectedAim); else if (phase === 'preparing') { controlTrial(trial, { type: 'kick', aim: selectedAim, curve: Number(curve.value), lift: Number(lift.value) }); phase = 'flight'; aim = null; updatePhase(); } } return; }
    const d = direction[event.key]; if (!d) return; event.preventDefault();
    if (trial.kind === 'speed') { if (d.x) lane(d.x < 0 ? -1 : 1); }
    else if (trial.kind === 'technique') controlTrial(trial, { type: 'move', destination: { x: clamp(trial.player.x + d.x * 3, 20, 860), y: clamp(trial.player.y + d.y * 3, 100, 1290) } });
    else { const nextAim = validTarget({ x: (aim ?? selectedAim).x + d.x, y: (aim ?? selectedAim).y + d.y / 3 }, groundMode()); if (nextAim) { aim = nextAim; if (phase === 'preparing') selectedAim = { ...nextAim }; } }
  };
  const ready = () => trial && phase === 'preparing' && !trial.resolved && !trial.shot && !!shotMode();
  function sampleContact(event: PointerEvent) {
    if (!contactDrag || !trial) return;
    const sample = pulledShot(trial.origin, selectedAim, event.clientX - contactDrag.x, event.clientY - contactDrag.y, Math.max(60, contactCanvas.clientHeight * .5)); power = sample.power; aim = sample.aim;
  }
  contactCanvas.onpointerdown = event => {
    if (!ready() || contactDrag || drag || event.isPrimary === false || event.button !== 0) return;
    const r = contactCanvas.getBoundingClientRect();
    const effects = view3d?.contact(event.clientX, event.clientY) ?? (!view3d ? { curve: clamp(-(event.clientX - r.left - r.width / 2) / (r.width * .4), -1, 1), lift: clamp((event.clientY - r.top - r.height / 2) / (r.height * .4), 0, 1) } : null);
    if (!effects) return;
    event.preventDefault(); curve.value = String(effects.curve); lift.value = String(effects.lift);
    contactDrag = { id: event.pointerId, x: event.clientX, y: event.clientY }; power = 0; contactCanvas.setPointerCapture(event.pointerId);
  };
  contactCanvas.onpointermove = event => { if (contactDrag?.id !== event.pointerId) return; event.preventDefault(); sampleContact(event); };
  contactCanvas.onpointerup = event => {
    if (contactDrag?.id !== event.pointerId || !trial) return;
    event.preventDefault(); sampleContact(event);
    if (power > .1 && aim) { controlTrial(trial, { type: 'kick', aim, curve: Number(curve.value), lift: Number(lift.value) }); phase = 'flight'; aim = null; updatePhase(); }
    else { aim = { ...selectedAim }; feedback.textContent = 'Contato escolhido. Puxe a bola para baixo para carregar a força.'; }
    contactDrag = null; power = 0;
  };
  contactCanvas.onpointercancel = cancel; contactCanvas.onlostpointercapture = () => { if (contactDrag) cancel(); };
  const syncContact = () => { view3d?.setContact(-Number(curve.value), -Number(lift.value)); };
  curve.oninput = syncContact; lift.oninput = syncContact;
  $('lane-left').onclick = () => lane(-1); $('lane-right').onclick = () => lane(1);
  $('field-exit').onclick = () => { options.onExit(); };
  next.onclick = () => {
    try {
      if (!trial) { options.onComplete(session); return; }
      const result = recordTrial(session, trial); options.onProgress(result); session = result; setup();
    } catch (error) { feedback.textContent = error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'; }
  };
  function line(points: Point[], color = '#d5ecd0', width = 3) {
    ctx!.strokeStyle = color; ctx!.lineWidth = width; ctx!.beginPath(); points.forEach((p, i) => { const v = project(p); if (i) ctx!.lineTo(v.x, v.y); else ctx!.moveTo(v.x, v.y); }); ctx!.stroke();
  }
  function disc(p: Point, radius: number, color: string) { const v = project(p), scale = .5 + p.y / 1320 * .5; ctx!.fillStyle = color; ctx!.beginPath(); ctx!.ellipse(v.x, v.y, radius * scale, radius * scale * .7, 0, 0, Math.PI * 2); ctx!.fill(); }
  function actor(p: Point, color: string, label = '') {
    const v = project(p), s = .6 + p.y / 1320 * .4; disc(p, 21, '#0005'); ctx!.fillStyle = color; ctx!.fillRect(v.x - 14 * s, v.y - 46 * s, 28 * s, 32 * s);
    ctx!.fillStyle = '#f1bc8e'; ctx!.beginPath(); ctx!.arc(v.x, v.y - 59 * s, 10 * s, 0, Math.PI * 2); ctx!.fill();
    ctx!.strokeStyle = '#edf5f0'; ctx!.lineWidth = 7 * s; ctx!.beginPath(); ctx!.moveTo(v.x - 7 * s, v.y - 14 * s); ctx!.lineTo(v.x - 10 * s, v.y); ctx!.moveTo(v.x + 7 * s, v.y - 14 * s); ctx!.lineTo(v.x + 12 * s, v.y); ctx!.stroke();
    if (label) { ctx!.font = 'bold 27px system-ui'; ctx!.fillStyle = '#fff'; ctx!.textAlign = 'center'; ctx!.fillText(label, v.x, v.y - 83 * s); }
  }
  function draw() {
    $<HTMLProgressElement>('shot-power').value = power * 100; $('shot-power-value').textContent = `${Math.round(power * 100)}%`;
    if (view3d) { view3d.render(trial, aim, Number(curve.value), Number(lift.value), phase);
      const reticle = $('aim-reticle'); reticle.hidden = !aim || !trial || !!trial.shot; if (aim && trial && !trial.shot) { const p = view3d.screenPoint(aim, !groundMode()); reticle.style.left = `${p.x}px`; reticle.style.top = `${p.y}px`; } if (trial) { $('field-clock').textContent = !trial.started ? 'PREPARE SUA JOGADA' : `${trial.time.toFixed(1)} s`; $('field-score').textContent = trial.kind === 'speed' ? `${Math.min(100, Math.floor(trial.distance))} m` : trial.kind === 'technique' ? `${trial.gate}/5 portões` : power > 0 ? `POTÊNCIA ${Math.round(power * 100)}%` : 'MIRA · CONTATO · POTÊNCIA'; } return; }
    if (contact2d) { contact2d.clearRect(0, 0, 200, 200); const gradient = contact2d.createRadialGradient(75, 60, 5, 100, 100, 80); gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, '#8193a4'); contact2d.fillStyle = gradient; contact2d.beginPath(); contact2d.arc(100, 100, 80, 0, Math.PI * 2); contact2d.fill(); contact2d.fillStyle = '#102338'; for (const [x,y] of [[90,65],[50,120],[140,130]]) { contact2d.beginPath(); for (let k=0;k<5;k++) {const a=k*Math.PI*2/5;const px=x!+Math.cos(a)*19,py=y!+Math.sin(a)*19;if(k)contact2d.lineTo(px,py);else contact2d.moveTo(px,py);}contact2d.fill();} }
    ctx!.clearRect(0, 0, W, H); ctx!.fillStyle = '#102f25'; ctx!.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const a = i * 110, b = (i + 1) * 110, points = [{ x: 0, y: a }, { x: 880, y: a }, { x: 880, y: b }, { x: 0, y: b }].map(project);
      ctx!.fillStyle = i % 2 ? '#247a45' : '#2a864b'; ctx!.beginPath(); points.forEach((p, n) => n ? ctx!.lineTo(p.x, p.y) : ctx!.moveTo(p.x, p.y)); ctx!.closePath(); ctx!.fill();
    }
    line([{ x: 0, y: 0 }, { x: 880, y: 0 }, { x: 880, y: 1320 }, { x: 0, y: 1320 }, { x: 0, y: 0 }]);
    line([{ x: 0, y: 660 }, { x: 880, y: 660 }]); line([{ x: 175, y: 0 }, { x: 175, y: 300 }, { x: 705, y: 300 }, { x: 705, y: 0 }]);
    const left = project({ x: 240, y: 95 }), right = project({ x: 640, y: 95 });
    ctx!.fillStyle = '#e7f5e515'; ctx!.fillRect(left.x, 45, right.x - left.x, right.y - 45); ctx!.strokeStyle = '#e4efdf'; ctx!.lineWidth = 6; ctx!.strokeRect(left.x, 45, right.x - left.x, right.y - 45);
    ctx!.lineWidth = 1; for (let x = left.x; x < right.x; x += 17) { ctx!.beginPath(); ctx!.moveTo(x, 45); ctx!.lineTo(x, right.y); ctx!.stroke(); } for (let y = 45; y < right.y; y += 16) { ctx!.beginPath(); ctx!.moveTo(left.x, y); ctx!.lineTo(right.x, y); ctx!.stroke(); }
    if (!trial) { ctx!.fillStyle = '#c7f36b'; ctx!.font = 'bold 44px system-ui'; ctx!.textAlign = 'center'; ctx!.fillText('SESSÃO CONCLUÍDA', 440, 640); return; }
    const t = trial;
    if (t.kind === 'speed') {
      for (const x of [293, 587]) line([{ x, y: 0 }, { x, y: 1320 }], '#e3f2d788');
      for (const o of t.obstacles) if (!o.passed && o.distance - t.distance < 55) { const p = { x: [147, 440, 733][o.lane]!, y: 1150 - (o.distance - t.distance) * 20 }; disc(p, 70, '#ef7049'); }
      actor({ x: [147, 440, 733][t.lane]!, y: 1160 }, '#f6dc53', 'VOCÊ');
    } else if (t.kind === 'technique') {
      t.gates.forEach((p, i) => { if (i >= t.gate) { line([{ x: p.x - 50, y: p.y }, { x: p.x + 50, y: p.y }], i === t.gate ? '#e0ff67' : '#b8e8cc77', 12); const v = project(p); ctx!.font = 'bold 28px system-ui'; ctx!.fillStyle = '#fff'; ctx!.fillText(String(i + 1), v.x, v.y - 20); } });
      t.cones.forEach(p => disc(p, 30, '#ff873c')); actor(t.player, '#f6dc53'); disc({ x: t.player.x, y: t.player.y - 22 }, 13, '#fff');
    } else {
      actor({ x: t.origin.x - 38, y: t.origin.y + 38 }, '#f6dc53', 'VOCÊ');
      if (t.kind === 'pass' || t.kind === 'vision') {
        t.defenders.forEach(p => actor(p, '#ee6659'));
        if (t.kind === 'pass') actor(teammateAt(t.time), '#6fd8ff', 'COMPANHEIRO');
        else { line([{ x: 0, y: t.offsideLine }, { x: 880, y: t.offsideLine }], '#ffa348', 5); t.mates.forEach((p, i) => actor(p, '#6fd8ff', String(i + 1))); }
      } else {
        actor({ x: t.shot?.keeper ?? keeperAt(t.time), y: 95 }, '#6fd8ff'); disc(t.target, 25, '#dfff61');
        if (t.kind === 'freekick') [360, 410, 460, 510].forEach(x => actor({ x, y: 720 }, '#ee6659'));
      }
      if (aim && !t.shot) {
        ctx!.setLineDash([10, 14]); line(Array.from({ length: 25 }, (_, i) => ballPath(t.origin, aim!, i / 24, Number(curve.value))), '#dcff83', 6); ctx!.setLineDash([]); disc(aim, 20, '#dcff83');
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
    if (trial && !drag && !contactDrag && !document.hidden) tickTrial(trial, dt);
    if (trial?.resolved) { if (phase !== 'resolved') { phase = 'resolved'; updatePhase(); } feedback.dataset.outcome = trial.outcome ?? ''; feedback.textContent = `${trial.message} Nota: ${trial.score}/100.`; next.hidden = false; next.textContent = session.results.length + 1 === session.sequence.length ? 'Ver resultado →' : 'Próxima tentativa →'; }
    draw(); raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => cancel(); document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', cancel);
  setup(); raf = requestAnimationFrame(frame);
  return () => { disposed = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', cancel); view3d?.dispose(); };
}
