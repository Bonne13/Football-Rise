import { createTrial, controlTrial, tickTrial, ballPath, keeperAt, teammateAt, type Point, type Trial } from '../domain/gameplay/trial.js';
import { recordTrial, sessionAverage, type DrillSession } from '../application/drills.js';
export const DRILL_NAMES = { shoot: 'Finalização', vision: 'Visão de jogo', pass: 'Passe', speed: 'Velocidade', technique: 'Condução e drible', freekick: 'Falta' };
const hints = { shoot: 'Segure no campo, puxe para trás e solte para chutar. Busque o canto e evite o goleiro.', vision: 'Passe para um companheiro livre. A linha laranja marca o impedimento. Puxe na direção oposta ao passe.', pass: 'Antecipe o companheiro azul em movimento. Puxe e solte, evitando os defensores vermelhos.', speed: 'Toque no lado esquerdo ou direito para mudar de faixa. Desvie dos obstáculos até os 100 metros.', technique: 'Toque no gramado para conduzir a bola. Passe pelos portões numerados em ordem, sem tocar nos cones.', freekick: 'Puxe e solte para bater a falta. Ajuste efeito e elevação para superar a barreira.' };
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
  host.innerHTML = `<section class="field-stage"><div class="field-heading"><div><span class="badge">${session.mode === 'assessment' ? 'AVALIAÇÃO DA BASE' : session.mode === 'match' ? 'SUA OPORTUNIDADE' : 'TREINO JOGÁVEL'}</span><h2 id="drill-name"></h2></div><strong id="drill-counter"></strong></div><p id="drill-hint" class="muted"></p><div class="field-wrap"><canvas id="football-field" width="880" height="1320" tabindex="0" aria-label="Campo de futebol interativo"></canvas><div class="field-live"><span id="field-clock"></span><span id="field-score"></span></div></div><p id="field-feedback" role="status" aria-live="polite">Toque no campo para começar. O tempo só corre depois da primeira ação.</p><div id="shot-effects" class="fields"><label>Efeito lateral<input id="field-curve" type="range" min="-1" max="1" step="0.05" value="0"></label><label>Elevação<input id="field-lift" type="range" min="0" max="1" step="0.05" value="0"></label></div><div class="actions" id="lane-buttons"><button type="button" id="lane-left">← Esquerda</button><button type="button" id="lane-right">Direita →</button></div><div class="actions"><button type="button" id="field-next" class="primary" hidden>Próxima tentativa →</button><button type="button" id="field-exit">Pausar e voltar</button></div><p class="hint">No computador: arraste com o mouse; use setas para conduzir ou mudar de faixa. Em chutes, ajuste a mira com as setas e pressione espaço para finalizar.</p></section>`;
  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>('#' + id)!;
  const canvas = $<HTMLCanvasElement>('football-field'); const ctx = canvas.getContext('2d');
  if (!ctx) { host.textContent = 'Seu navegador não disponibilizou o campo. Atualize a página ou tente outro navegador.'; return () => {}; }
  const feedback = $('field-feedback'), next = $<HTMLButtonElement>('field-next');
  const curve = $<HTMLInputElement>('field-curve'), lift = $<HTMLInputElement>('field-lift');
  function setup() {
    drag = null; aim = null; curve.value = '0'; lift.value = '0'; last = 0;
    if (session.results.length === session.sequence.length) {
      trial = null; $('drill-name').textContent = 'Sessão concluída'; $('drill-counter').textContent = `${Math.round(sessionAverage(session))}/100`;
      $('drill-hint').textContent = 'As notas foram calculadas pelas suas jogadas.';
      feedback.textContent = session.sequence.filter((v, i, a) => a.indexOf(v) === i).map(kind => `${DRILL_NAMES[kind]}: ${Math.round(sessionAverage(session, kind))}/100`).join(' · ');
      next.hidden = false; next.textContent = session.mode === 'assessment' ? 'Concluir avaliação →' : session.mode === 'match' ? 'Concluir partida →' : 'Aplicar treino →';
      $('shot-effects').hidden = true; $('lane-buttons').hidden = true; draw(); return;
    }
    const kind = session.sequence[session.results.length]!;
    trial = createTrial(kind, session.results.length + 1, session.seed);
    $('drill-name').textContent = DRILL_NAMES[kind];
    $('drill-counter').textContent = `${session.results.length + 1} / ${session.sequence.length}`;
    $('drill-hint').textContent = hints[kind];
    $('shot-effects').hidden = kind === 'speed' || kind === 'technique'; $('lane-buttons').hidden = kind !== 'speed'; next.hidden = true;
    feedback.textContent = 'Toque no campo para começar. O tempo só corre depois da primeira ação.';
    canvas.setAttribute('aria-label', `Campo de futebol: ${DRILL_NAMES[kind]}`); draw();
  }
  function point(event: PointerEvent): Point { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H }; }
  function aimFrom(event: PointerEvent): Point {
    if (!drag || !trial) return { x: 440, y: 65 };
    const maxPull = Math.min(130, Math.max(75, canvas.clientWidth * .3));
    // Reverse drag: pulling back sends the ball forward, matching the reference game.
    return { x: clamp(trial.origin.x - (event.clientX - drag.x) / maxPull * 1100, -1500, 2500), y: clamp(trial.origin.y - (event.clientY - drag.y) / maxPull * 1100, -1500, 2500) };
  }
  function lane(direction: -1 | 1) { if (trial) controlTrial(trial, { type: 'lane', direction }); }
  canvas.onpointerdown = event => {
    if (!trial || trial.resolved || trial.shot || drag || event.isPrimary === false || event.button !== 0) return;
    event.preventDefault(); canvas.focus({ preventScroll: true });
    if (trial.kind === 'speed') { lane(event.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? -1 : 1); return; }
    if (trial.kind === 'technique') { const p = unproject(point(event)); controlTrial(trial, { type: 'move', destination: { x: clamp(p.x, 20, 860), y: clamp(p.y, 100, 1290) } }); return; }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; aim = { ...trial.aim }; canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => { if (drag?.id !== event.pointerId) return; event.preventDefault(); aim = aimFrom(event); };
  canvas.onpointerup = event => {
    if (drag?.id !== event.pointerId || !trial) return;
    event.preventDefault(); const p = aimFrom(event); const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y); drag = null;
    if (moved > 8) controlTrial(trial, { type: 'kick', aim: p, curve: Number(curve.value), lift: Number(lift.value) });
    aim = null;
  };
  const cancel = () => { drag = null; aim = null; last = 0; };
  canvas.onpointercancel = cancel; canvas.onlostpointercapture = cancel;
  canvas.onkeydown = event => {
    if (!trial || trial.resolved || trial.shot) return;
    if (event.key === 'Escape') { cancel(); return; }
    const direction: Record<string, Point> = { ArrowLeft: { x: -35, y: 0 }, ArrowRight: { x: 35, y: 0 }, ArrowUp: { x: 0, y: -35 }, ArrowDown: { x: 0, y: 35 } };
    if (event.key === ' ') { event.preventDefault(); if (!['speed', 'technique'].includes(trial.kind)) { controlTrial(trial, { type: 'kick', aim: aim ?? trial.aim, curve: Number(curve.value), lift: Number(lift.value) }); aim = null; } return; }
    const d = direction[event.key]; if (!d) return; event.preventDefault();
    if (trial.kind === 'speed') { if (d.x) lane(d.x < 0 ? -1 : 1); }
    else if (trial.kind === 'technique') controlTrial(trial, { type: 'move', destination: { x: clamp(trial.player.x + d.x * 3, 20, 860), y: clamp(trial.player.y + d.y * 3, 100, 1290) } });
    else { aim ??= { ...trial.aim }; aim = { x: clamp(aim.x + d.x, -1000, 2000), y: clamp(aim.y + d.y / 3, -1000, 2000) }; }
  };
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
      } else disc(t.origin, 16, '#fff');
    }
    $('field-clock').textContent = !t.started ? 'AGUARDANDO SUA AÇÃO' : `${t.time.toFixed(1)} s`;
    $('field-score').textContent = t.kind === 'speed' ? `${Math.min(100, Math.floor(t.distance))} m` : t.kind === 'technique' ? `${t.gate}/5 portões` : 'PUXE → MIRE → SOLTE';
  }
  function frame(time: number) {
    if (disposed) return;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 0; last = time;
    if (trial && !drag && !document.hidden) tickTrial(trial, dt);
    if (trial?.resolved) { feedback.textContent = `${trial.message} Nota: ${trial.score}/100.`; next.hidden = false; next.textContent = session.results.length + 1 === session.sequence.length ? 'Ver resultado →' : 'Próxima tentativa →'; }
    draw(); raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => cancel(); document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', cancel);
  setup(); raf = requestAnimationFrame(frame);
  return () => { disposed = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', cancel); };
}
