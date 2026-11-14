// PART 4 — Why you forget your dreams
import * as E from './engine.js';
import * as ui from './ui.js';
const { THREE, cam, lights, bg, fog, ss, eo, eio, pop, lerp, lerp3, clamp, at, V, toScreen, worldPos } = E;

const NAVY = ['#0a0a26', '#141244', '#1b1a5a'];

function dreamIsle(scale = 1) {
  const gg = new THREE.Group();
  gg.add(E.island(1.6));
  const h = E.house(); h.scale.setScalar(0.7); h.position.set(-0.4, 0, -0.3); gg.add(h);
  const t = E.tree(0xd98ab0, 0.8, 3); t.position.set(0.9, 0, -0.2); gg.add(t);
  const c = E.character({ shirt: 0xf0a830 }); c.root.scale.setScalar(0.4); c.root.position.set(0.5, 0, 0.8); gg.add(c.root);
  gg.scale.setScalar(scale);
  return gg;
}
function sleeper(g) {
  const holder = new THREE.Group(); holder.position.set(0, 1.0, -0.36); holder.rotation.x = -Math.PI / 2;
  const c = E.character({ shirt: 0x2a8fa0 }); c.root.position.y = -0.95; holder.add(c.root); g.add(holder);
  return { holder, c };
}
function morningRoom(g, clock) {
  lights({ sky: 0xffe2c8, ground: 0x6a5a90, hi: 2.0, si: 2.8, sunColor: 0xffc890, pos: [6, 9, 5], size: 8 });
  const r = E.bedroom({ wall: 0x8a96e0, floor: 0x5a5fa8, windowColor: 0xffd7a0, windowE: 1.1, blanket: 0x3561e0, clock });
  g.add(r.group);
  return r;
}

const shots = [
  { a: -0.5, b: 2.2,
    build(g) {
      lights({ sky: 0xffe0f0, ground: 0x5a3a6a, hi: 1.3, si: 2.2, pos: [4, 9, 6], size: 8 });
      const isl = [dreamIsle(1.1), dreamIsle(0.8), dreamIsle(0.7)];
      isl[0].position.set(0, 0, 0); isl[1].position.set(-3.2, 2.6, -3); isl[2].position.set(3.0, 3.4, -4);
      isl.forEach(i => g.add(i));
      const sunM = E.mesh(new THREE.IcosahedronGeometry(1.6, 1), E.mat(0xffd27a, { e: 0xffb050, ei: 1.5 }), false, false); g.add(sunM);
      return { isl, sunM };
    },
    update(v, lt, { isl, sunM }) {
      const k = ss(0.2, 2.0, v);
      bg(['#2a1e60', '#6d4d9e', '#b98ab8'], ['#4a5aa8', '#f08a7a', '#ffd08a'], k);
      fog(new THREE.Color(0x9c7bb0).lerp(new THREE.Color(0xf0a080), k).getHex(), 16, 44);
      sunM.position.set(0.5, lerp(-6, 1.5, k), -14);
      isl.forEach((i, n) => { i.rotation.y = v * 0.3 + n; i.position.y += 0; });
      cam(lerp3([0, 3.4, 13.0], [0, 3.0, 11.5], eio((v + 0.5) / 2.7)), [0, 1.6, 0]);
    } },
  { a: 2.2, b: 6.65,
    build(g) {
      const r = morningRoom(g, '7:00');
      const s = sleeper(g);
      const bub = E.bubble(1.3); g.add(bub);
      const mini = dreamIsle(0.45); bub.add(mini); mini.position.y = -0.1;
      const sh = E.shards(70, undefined, 4); sh.scale.setScalar(0.5); bub.add(sh);
      return { r, s, bub, mini, sh };
    },
    update(v, lt, { r, s, bub, mini, sh }) {
      bg(['#ffb88a', '#ffd9a8']); fog(null);
      const blink = Math.floor(v * 4) % 2 === 0 ? 1 : 0.25;
      r.clockTex.set('7:00', v < 4.6 ? blink : 1);
      const shake = v > 2.3 && v < 4.6 ? Math.sin(v * 70) * 0.05 : 0;
      r.clock.position.x = shake; r.clock.rotation.z = shake * 1.5;
      const up = eio((v - 3.6) / 0.9);
      s.holder.rotation.x = lerp(-Math.PI / 2, -0.12, up);
      s.c.pose({ eyes: up > 0.3 ? 1 : 0.12, armLz: 0.2, armRz: 0.2, armL: up * 0.7, armR: up * 0.7, tilt: Math.sin(v * 2) * 0.05 * up });
      const bk = pop((v - 2.6) / 0.6);
      const gone = clamp((v - 4.9) / 1.5);
      bub.position.set(0.9, 4.6, -0.6);
      bub.userData.s.scale.setScalar(bk * (1 - ss(5.8, 6.5, v)) + 0.0001);
      bub.userData.dots.forEach((d, i) => { d.position.set(-0.55 + i * -0.25, -1.4 - i * 0.45, 0.2); d.scale.setScalar(bk * (1 - ss(5.6, 6.2, v)) + 0.0001); });
      mini.scale.setScalar(0.45 * bk * (1 - ss(4.85, 5.0, v)) + 0.0001); mini.rotation.y = v * 0.8;
      sh.visible = v > 4.85; sh.update(gone);
      cam(lerp3([4.8, 5.2, 9.6], [4.0, 4.6, 8.6], eio(lt / 4.4)), [0, 2.6, -0.8]);
      ui.chip('alarm', v, 2.4, 4.6, 400, 400, '⏰ 7:00', 'hot');
      ui.progress('mem', v, 4.6, 6.6, 90, 330, 900, 'DREAM MEMORY', lerp(1, 0.08, ss(4.9, 6.4, v)), '#ff8fd0', ss(4.9, 6.4, v) > 0.8 ? 'FADING…' : 'INTACT', '#ffd1cb');
    } },
  { a: 6.65, b: 14.9,
    build(g) {
      lights({ sky: 0xc8d0ff, ground: 0x2a2050, hi: 1.25, si: 2.3, pos: [3, 6, 6], size: 4 });
      const b = E.brain(); b.group.scale.setScalar(1.6); g.add(b.group);
      const R = E.rng(21); const mols = [];
      for (let i = 0; i < 26; i++) { const m = E.molecule(); m.userData = { r: 2.3 + R() * 0.9, a: R() * 6.28, y: (R() - .5) * 2.4, s: 0.3 + R() * 0.5, f: R() }; g.add(m); mols.push(m); }
      return { b, mols };
    },
    update(v, lt, { b, mols }) {
      bg(NAVY);
      const low = ss(13.4, 14.6, v), mid = ss(8.2, 9.2, v);
      const level = lerp(0.88, 0.45, mid) * (1 - low) + 0.06 * low;
      b.regions({ all: [0xffb070, 0.25 * (1 - low)] }); b.sparkle(v, 0.8);
      b.group.rotation.y = -1.1 + lt * 0.08; b.group.position.y = 0.3 + Math.sin(v) * 0.05;
      mols.forEach((m, i) => {
        const u = m.userData; const a = u.a + v * u.s;
        const vis = u.f < level ? 1 : 0;
        const fall = (1 - vis) * clamp((v - 9) / 3);
        m.position.set(Math.cos(a) * u.r, u.y + 0.3 - fall * 3, Math.sin(a) * u.r * 0.8);
        m.rotation.set(v * 2 + i, v, 0);
        m.scale.setScalar((vis ? pop((v - 7.0 - i * 0.03) / 0.5) : Math.max(0, 1 - fall * 1.5)) * 1.4 + 0.0001);
      });
      cam(lerp3([0, 0.8, 10.6], [0, 0.6, 9.4], eio(lt / 8)), [0, -0.75, 0]);
      ui.meter('ne', v, 9.6, 14.85, 90, 1000, 900, 'NORADRENALINE', level, level < 0.2 ? '#9aa3c7' : '#ffa040', level < 0.12 ? 'VERY LOW ▼' : null);
      ui.chip('rem', v, 7.8, 14.85, 90, 1110, 'DURING REM SLEEP', 'cool');
      ui.chip('mem', v, 11.3, 14.85, 470, 1110, 'HELPS SAVE MEMORIES', '');
    } },
  { a: 14.9, b: 18.8,
    build(g) {
      lights({ sky: 0xe6d6ff, ground: 0x4a3a6a, hi: 1.3, si: 2.3, pos: [4, 9, 6], size: 6 });
      const isl = dreamIsle(1.5); g.add(isl);
      const sh = E.shards(110, undefined, 7); sh.scale.setScalar(1.6); g.add(sh);
      return { isl, sh };
    },
    update(v, lt, { isl, sh }) {
      bg(['#2e2466', '#6d4d9e', '#b98ab8']); fog(0x9c7bb0, 18, 44);
      const brk = v > 17.76;
      isl.visible = !brk; isl.rotation.y = v * 0.5; isl.position.y = Math.sin(v * 2) * 0.1 + (v > 17.3 ? Math.sin(v * 80) * 0.04 : 0);
      sh.visible = brk; sh.update(clamp((v - 17.76) / 1.1));
      cam(lerp3([0, 3.6, 13.5], [0, 3.2, 12.0], eio(lt / 4)), [0, 0.8, 0]);
      const p = lerp(0, 0.64, eo((v - 15.3) / 1.9));
      const failed = v > 17.76;
      const e = ui.progress('save', v, 15.0, 18.75, 90, 330, 900, 'SAVING DREAM…', failed ? 0.64 : p, failed ? '#ff6b7d' : '#7fe3ff', failed ? 'NOT SAVED ✕' : 'WRITING TO MEMORY', failed ? '#ff7d6e' : '#d6f6ff');
      if (failed && v < 18.2) e.style.transform += ` translateX(${Math.sin(v * 90) * 8}px)`;
    } },
  { a: 18.8, b: 26.95,
    build(g) {
      const r = morningRoom(g, '7:01');
      const s = sleeper(g);
      const bub = E.bubble(1.3); g.add(bub);
      const mini = dreamIsle(0.45); bub.add(mini); mini.position.y = -0.1;
      return { r, s, bub, mini };
    },
    update(v, lt, { r, s, bub, mini }) {
      bg(['#ffb88a', '#ffd9a8']); fog(null);
      const eyesClosed = ss(23.6, 24.0, v);
      s.c.pose({ eyes: lerp(1, 0.12, eyesClosed) });
      const bk = pop((v - 25.3) / 0.7);
      bub.position.set(0.9, 4.4, -0.6);
      bub.userData.s.scale.setScalar(bk + 0.0001);
      bub.userData.dots.forEach((d, i) => { d.position.set(-0.55 + i * -0.25, -1.4 - i * 0.45, 0.2); d.scale.setScalar(bk + 0.0001); });
      mini.scale.setScalar(0.45 * pop((v - 25.6) / 0.7) + 0.0001); mini.rotation.y = v * 0.6;
      cam(lerp3([3.8, 6.2, 8.4], [2.8, 5.4, 7.0], eio(lt / 8)), [0, 2.0, -0.9]);
      ui.chip('tip', v, 19.2, 21.6, 330, 1060, 'TRY THIS ↓', 'good big');
    } },
  { a: 26.95, b: 28.6,
    build(g) {
      lights({ sky: 0xffe2c8, ground: 0x3a3060, hi: 1.3, si: 2.6, sunColor: 0xffc890, pos: [5, 7, 2], size: 4 });
      g.add(at(E.box(8, 0.3, 6, 0x2a1a16), 0, -0.15, 0));
      const n = E.notebook(); g.add(n.group);
      return { n };
    },
    update(v, lt, { n }) {
      bg(['#ffb88a', '#ffd9a8']); fog(null);
      const w = clamp((v - 27.0) / 1.5) * 7;
      n.lines.forEach((l, i) => { const k = clamp(w - i); l.scale.x = Math.max(0.001, k * (0.6 + 0.4 * ((i * 37) % 10) / 10)); });
      const li = Math.min(6, Math.floor(w)); const fr = w - Math.floor(w);
      n.pencil.position.set(-0.6 + fr * 1.1 + 0.15, 0.62, -0.75 + li * 0.24 - 0.2);
      n.pencil.rotation.z = -0.5 + Math.sin(v * 30) * 0.05;
      cam(lerp3([0.3, 5.4, 3.6], [0.2, 4.9, 3.1], eio(lt / 1.6)), [0, 0, -1.3]);
    } },
  { a: 28.6, b: 60,
    build(g) {
      lights({ sky: 0x7f80ff, ground: 0x1a1030, hi: 0.9, si: 1.1, sunColor: 0x9aa0ff, pos: [6, 10, 4], size: 16 });
      const c = E.city(14, 8, { base: 0x231d48, glow: 0xffc98a }); g.add(c);
      const st = E.stars(260, 3, 70); g.add(st);
      const isl = [dreamIsle(0.9), dreamIsle(0.7), dreamIsle(0.6)];
      isl[0].position.set(-3, 13, -10); isl[1].position.set(4, 15, -14); isl[2].position.set(0, 18, -20);
      isl.forEach(i => g.add(i));
      const moon = E.mesh(new THREE.IcosahedronGeometry(1.8, 1), E.mat(0xf6f0ff, { e: 0xe8e0ff, ei: 1.2 }), false, false); moon.position.set(6, 22, -30); g.add(moon);
      return { isl, st };
    },
    update(v, lt, { isl, st }) {
      const k = ss(28.6, 30.4, v);
      bg(['#ff9a7a', '#e8a27a', '#ffd08a'], ['#070a26', '#1a1650', '#4a2f78'], k);
      fog(new THREE.Color(0xd0907a).lerp(new THREE.Color(0x2a1f58), k).getHex(), 18, 60);
      st.material.opacity = k * 0.9;
      isl.forEach((i, n) => { const p = pop((v - 30.9 - n * 0.35) / 0.8); i.scale.setScalar([0.9, 0.7, 0.6][n] * p + 0.0001); i.rotation.y = v * 0.3 + n; });
      cam(lerp3([0, 7, 20], [0, 14, 15], eio(lt / 7)), lerp3([0, 3, 0], [0, 12, -10], eio(lt / 7)));
      ui.chip('end', v, 35.1, 38.4, 330, 1060, 'SWEET DREAMS ✦', 'big');
    } },
];

export default {
  duration: 38.4,
  fadeOut: 37.6,
  keys: [
    { t: -1, stage: 'REM', state: 'DREAMING', clock: '6:59 AM' },
    { t: 1.0, stage: 'REM', state: 'WAKING UP', clock: '6:59 AM', hot: true },
    { t: 2.6, stage: 'WAKE', state: 'AWAKE', clock: '7:00 AM', hot: true },
    { t: 6.65, stage: 'REM', state: 'DREAMING', clock: '3:12 AM' },
    { t: 14.9, stage: 'WAKE', state: 'FORGETTING', clock: '7:00 AM', hot: true },
    { t: 18.8, stage: 'WAKE', state: 'AWAKE', clock: '7:01 AM' },
    { t: 28.6, stage: 'N1', state: 'FALLING ASLEEP', clock: '11:02 PM' },
    { t: 32.3, stage: 'REM', state: 'DREAMING', clock: '2:47 AM', hot: true },
  ],
  shots,
  ui(v) {
    ui.title('ttl', v, -0.5, 2.15, 360, 'Why you forget<br>your dreams', 'PART 4 · HOW DREAMS WORK');
    ui.checklist('steps', v, 21.4, 28.6, 90, 330, 600, 'REMEMBER YOUR DREAM', [
      { text: 'STAY STILL', at: 22.76 }, { text: 'KEEP EYES CLOSED', at: 23.84 },
      { text: 'REPLAY THE DREAM', at: 25.44 }, { text: 'WRITE IT DOWN', at: 27.04 }]);
  },
};
