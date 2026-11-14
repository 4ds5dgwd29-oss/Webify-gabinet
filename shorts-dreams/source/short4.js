// BONUS — 24 hours without sleep
import * as E from './engine.js';
import * as ui from './ui.js';
const { THREE, cam, lights, bg, fog, ss, eo, eio, pop, lerp, lerp3, clamp, at, V, toScreen, worldPos } = E;

// sentence / word timings (voice time, seconds) — filled from transcript
export const T = {
  h16: 4.26, h19: 7.70, drink: 11.4, h21: 12.55, micro: 16.66, gone: 19.85, eyesOpen: 21.1,
  h24: 22.32, drunk: 26.26, amy: 27.0, sixty: 30.2, huge: 33.77, good: 34.75, undo: 36.65, tonight: 38.01, end: 40.59,
};
const NAVY = ['#0a0a26', '#141244', '#1b1a5a'];

function officeSet(g, dim = 0) {
  lights({ sky: 0xdfe6ff, ground: 0x3a3a60, hi: 1.6 - dim * 0.6, si: 2.2 - dim * 1.0, pos: [5, 9, 6], size: 7 });
  g.add(at(E.box(30, 0.2, 30, 0x4a4f8a), 0, -0.1, 0));
  g.add(at(E.box(30, 12, 0.2, 0x6a74c0), 0, 6, -3.2));
  const win = at(E.box(3, 2.4, 0.06, 0x8fa8ff, { e: 0x5a78ff, ei: 0.8 }), 2.4, 4.0, -3.08); g.add(win);
  const desk = new THREE.Group();
  desk.add(at(E.box(3.4, 0.14, 1.5, 0xc89a6a), 0, 1.45, 0));
  for (const x of [-1.55, 1.55]) for (const z of [-0.6, 0.6]) desk.add(at(E.box(0.1, 1.45, 0.1, 0x6a4a32), x, 0.72, z));
  const lap = new THREE.Group();
  lap.add(at(E.box(1.1, 0.05, 0.75, 0x30344a), 0, 0, 0));
  const scr = E.box(1.1, 0.72, 0.05, 0x30344a); scr.position.set(0, 0.36, -0.36); scr.rotation.x = -0.15; lap.add(scr);
  const glow = E.box(1.0, 0.62, 0.02, 0xbfe0ff, { e: 0x9fd0ff, ei: 1.2 }); glow.position.set(0, 0.36, -0.33); glow.rotation.x = -0.15; lap.add(glow);
  lap.position.set(-0.2, 1.55, -0.1); desk.add(lap);
  const mug = new THREE.Group();
  mug.add(E.mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.32, 8), E.mat(0xf2f2f2)));
  const hd = E.mesh(new THREE.TorusGeometry(0.09, 0.03, 4, 8), E.mat(0xf2f2f2)); hd.position.x = 0.18; mug.add(hd);
  mug.add(at(E.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 8), E.mat(0x5a3220)), 0, 0.15, 0));
  mug.position.set(1.0, 1.68, 0.2); desk.add(mug);
  desk.position.set(0, 0, 0); g.add(desk);
  const chair = new THREE.Group();
  chair.add(at(E.box(0.9, 0.12, 0.9, 0x2a2a3a), 0, 0.95, 0));
  chair.add(at(E.box(0.9, 1.0, 0.12, 0x2a2a3a), 0, 1.5, 0.45));
  chair.add(at(E.box(0.1, 0.95, 0.1, 0x1a1a24), 0, 0.47, 0));
  chair.position.set(-0.2, 0, 1.25); g.add(chair);
  const c = E.character({ shirt: 0x1f9e8a });
  c.root.position.set(-0.2, 0.0, 1.1); c.root.rotation.y = Math.PI;
  g.add(c.root);
  return { c, mug, desk, glow, win };
}
function seated(c, { head = 0, eyes = 1, type = 0, v = 0 } = {}) {
  // sitting: thighs forward, hands on keyboard
  c.root.position.y = 0.05;
  c.legs.forEach(l => l.rotation.x = -1.45);
  c.body.position.y = 0;
  const t = Math.sin(v * 18) * 0.12 * type;
  c.arms[0].rotation.set(-1.2 + t, 0, -0.1); c.arms[1].rotation.set(-1.2 - t, 0, 0.1);
  c.eyes.forEach(e => e.scale.y = Math.max(0.12, eyes));
  c.head.rotation.set(head, 0, 0);
}

const shots = [
  { a: -0.5, b: T.h16,
    build(g) {
      lights({ sky: 0x7f95ff, ground: 0x101040, hi: 1.0, si: 1.2, sunColor: 0xa8b8ff, pos: [6, 8, 5], size: 7 });
      const r = E.bedroom({ clock: '11:00' }); g.add(r.group);
      const holder = new THREE.Group(); holder.position.set(0, 1.0, -0.36);
      const c = E.character({ shirt: 0x2a8fa0 }); c.root.position.y = -0.95; holder.add(c.root); g.add(holder);
      const phone = E.box(0.3, 0.5, 0.04, 0xbfe0ff, { e: 0x9fd0ff, ei: 1.5 }); g.add(phone);
      return { r, holder, c, phone };
    },
    update(v, lt, { r, holder, c, phone }) {
      bg(['#0b1450', '#1b2a9a']); fog(null);
      holder.rotation.x = -0.12;
      c.pose({ armL: 1.1, armR: 1.1, armLz: 0.25, armRz: 0.25, nod: 0.35, eyes: 1 });
      phone.position.set(0, 2.55, 0.25); phone.rotation.x = -0.9;
      const hr = v < 1.0 ? '11:00' : v < 2.2 ? '3:00' : '7:00';
      r.clockTex.set(hr, 1);
      cam(lerp3([4.2, 5.0, 8.6], [3.4, 4.4, 7.4], eio((v + 0.5) / 5)), [0, 2.4, -0.6]);
    } },
  { a: T.h16, b: T.h21,
    build(g) { return officeSet(g); },
    update(v, lt, s) {
      bg(['#5a6ac8', '#8a96e0']); fog(null);
      const drop = v > T.drink - 0.6;
      const tired = ss(T.h19, T.h19 + 1.5, v);
      seated(s.c, { head: 0.25 * tired, eyes: 1 - tired * 0.45, type: 1 - tired * 0.7, v });
      // mug knocked off & falls in slow motion
      const f = clamp((v - (T.drink - 0.6)) / 1.6);
      s.mug.position.set(1.0 + f * 0.6, 1.68 - f * f * 1.6, 0.2 + f * 0.2);
      s.mug.rotation.z = -f * 2.2;
      cam(lerp3([6.4, 3.4, 3.4], [5.4, 3.1, 2.9], eio(lt / 9)), [0.1, 1.75, 0.3]);
      ui.meter('focus', v, T.h16 + 0.3, T.h21, 90, 330, 900, 'FOCUS', lerp(1, 0.68, ss(T.h19, T.h19 + 2, v)), '#7ff0b0');
      ui.meter('react', v, T.h16 + 0.6, T.h21, 90, 440, 900, 'REACTION SPEED', lerp(1, 0.7, ss(T.h19 + 0.5, T.h19 + 2.5, v)), '#7fe3ff');
      ui.chip('bac1', v, T.drink - 0.6, T.h21, 330, 570, '🍷 ≈ 0.05% BAC', 'hot');
    } },
  { a: T.h21, b: T.h24,
    build(g) { return officeSet(g, 0.4); },
    update(v, lt, s) {
      bg(['#3a4490', '#5a6ac8']); fog(null);
      // microsleep blackouts
      const blk = (a, d) => ss(a, a + 0.08, v) * (1 - ss(a + d, a + d + 0.12, v));
      const b = Math.max(blk(T.micro + 0.2, 0.5), blk(T.gone - 0.1, 1.0));
      const nod = 0.35 + b * 0.35;
      seated(s.c, { head: nod, eyes: v > T.eyesOpen - 0.3 ? 0.8 : 0.35 + 0.3 * Math.sin(v * 2), type: 0.15, v });
      s.mug.visible = false;
      const zoom = ss(T.eyesOpen - 0.4, T.eyesOpen + 0.6, v);
      if (zoom <= 0) cam(lerp3([5.4, 3.1, 2.9], [4.6, 2.9, 2.6], eio(lt / 6)), [0.1, 1.85, 0.4]);
      else cam([-0.2, 2.55, -0.85], [-0.2, 2.15, 0.9], 50);
      const fe = document.getElementById('fadeEl');
      ui.chip('ms', v, T.micro, T.h24, 330, 570, '⚠ MICROSLEEP', 'hot').style.opacity *= (b > 0.5 ? 1 : 0.85 + 0.15 * Math.sin(v * 12));
      ui.meter('focus', v, T.h21, T.h24, 90, 330, 900, 'FOCUS', lerp(0.6, 0.35, ss(T.h21, T.micro, v)), '#ffd36b');
      s.black = b;
    } },
  { a: T.h24, b: T.amy,
    build(g) {
      lights({ sky: 0x7f80ff, ground: 0x1a1030, hi: 1.1, si: 1.2, sunColor: 0x9aa0ff, pos: [6, 10, 4], size: 12 });
      for (const sx of [-1, 1]) for (const zz of [0, -19, -38]) { const c = E.city(4, 6 + zz + sx, { base: 0x2a2458, glow: 0xffc98a }); c.position.set(sx * 8.5, -0.05, zz - 4); g.add(c); }
      g.add(at(E.box(60, 0.1, 60, 0x1e1a3a), 0, -0.05, 0));
      const road = E.box(4, 0.04, 80, 0x3a3a4a); g.add(road);
      const lines = []; for (let i = 0; i < 20; i++) { const l = E.box(0.12, 0.05, 1.2, 0xfff0b0, { e: 0xffe9a0, ei: 0.8 }); g.add(l); lines.push(l); }
      const car = E.car(0xe8633a); g.add(car); car.rotation.y = Math.PI / 2;
      const beams = E.mesh(new THREE.ConeGeometry(1.3, 5, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), false, false);
      beams.rotation.x = -Math.PI / 2; car.add(beams); beams.position.set(0, 0.45, 0); beams.rotation.set(0, 0, Math.PI / 2); beams.position.x = 3.2;
      const st = E.stars(200, 7, 60); g.add(st);
      return { car, lines };
    },
    update(v, lt, { car, lines }) {
      bg(['#070a26', '#1a1650', '#4a2f78']); fog(0x1a1650, 14, 50);
      const z = -lt * 9;
      const sw = Math.sin(lt * 2.4) * 1.1 * ss(T.h24 + 0.8, T.h24 + 2.0, v);
      car.position.set(sw, 0, z); car.rotation.y = Math.PI / 2 + Math.cos(lt * 2.4) * 0.35 * ss(T.h24 + 0.8, T.h24 + 2.0, v);
      lines.forEach((l, i) => { l.position.set(0, 0.03, Math.floor(z / 4) * 4 - i * 4 + 20); });
      cam([2.2, 2.6, z + 6.5], [0, 0.7, z - 3]);
      ui.chip('bac2', v, T.drunk - 0.5, T.amy, 290, 570, '🍷🍷 ≈ 0.10% BAC', 'hot');
      ui.meter('react', v, T.h24 + 0.4, T.amy, 90, 330, 900, 'REACTION SPEED', lerp(0.6, 0.38, ss(T.h24, T.drunk, v)), '#ff6b7d');
    } },
  { a: T.amy, b: T.good,
    build(g) {
      lights({ sky: 0xc8d0ff, ground: 0x2a2050, hi: 1.2, si: 2.0, pos: [3, 6, 6], size: 4 });
      const b = E.brain(); b.group.scale.setScalar(1.6); g.add(b.group);
      const prob = E.box(0.6, 0.6, 0.6, 0xff4f5e, { e: 0xff2040, ei: 0.3 }); g.add(prob);
      return { b, prob };
    },
    update(v, lt, { b, prob }) {
      bg(['#0b0a26', '#1a0f3f', '#2a0f3a']);
      const a = ss(T.amy + 0.6, T.amy + 2.0, v);
      b.xray(ss(T.amy, T.amy + 0.8, v));
      b.amyM.emissiveIntensity = a * (0.6 + 0.6 * Math.abs(Math.sin(v * 6)));
      b.amyM.opacity = 0.25 + 0.75 * a;
      b.amy.forEach(m => m.scale.setScalar(0.8 + a * 0.3));
      b.sparkle(v, 0.5);
      const bigger = eio((v - T.huge + 0.6) / 1.2);
      b.group.position.set(0, 0.3 + bigger * 1.2, -bigger * 4);
      b.group.rotation.y = -0.65 + Math.sin(v * 0.4) * 0.15;
      prob.position.set(0, lerp(-1.6, 0.6, bigger), 1.5);
      prob.scale.setScalar(pop((v - T.huge + 1.6) / 0.5) * lerp(0.6, 4.0, bigger) + 0.0001);
      prob.rotation.set(v * 0.6, v * 0.8, 0);
      cam([0, 0.6, 9.4], [0, -0.6, 0]);
      const [px, py] = toScreen(worldPos(b.group, [0.3, -0.18, 0.28]));
      ui.callout('amy', v, T.amy + 0.5, T.huge - 0.8, px, py, 720, 560, 'AMYGDALA', 'ALARM SYSTEM', '#ff6b7d');
      ui.meter('amyr', v, T.amy + 0.8, T.good, 90, 1000, 900, 'EMOTIONAL REACTIVITY', lerp(0.5, 0.8, ss(T.sixty - 0.8, T.sixty + 0.6, v)), '#ff6b7d', ss(T.sixty - 0.8, T.sixty + 0.6, v) > 0.9 ? '+60%' : null);
      ui.chip('small', v, T.huge - 1.6, T.good, 330, 400, 'SMALL PROBLEM → HUGE', 'hot');
    } },
  { a: T.good, b: 99,
    build(g) {
      lights({ sky: 0x7f95ff, ground: 0x101040, hi: 1.0, si: 1.2, sunColor: 0xa8b8ff, pos: [6, 8, 5], size: 7 });
      const r = E.bedroom({ clock: '11:00' }); g.add(r.group);
      const holder = new THREE.Group(); holder.position.set(0, 1.0, -0.36); holder.rotation.x = -Math.PI / 2;
      const c = E.character({ shirt: 0x2a8fa0 }); c.root.position.y = -0.95; holder.add(c.root); g.add(holder);
      const z = []; for (let i = 0; i < 3; i++) { const q = E.box(0.25, 0.25, 0.05, 0xffffff, { e: 0xffffff, ei: 0.5 }); g.add(q); z.push(q); }
      return { r, c, z };
    },
    update(v, lt, { r, c, z }) {
      const morning = ss(T.undo - 0.5, T.undo + 0.8, v) * (1 - ss(T.tonight, T.tonight + 1.2, v));
      bg(['#0b1450', '#1b2a9a'], ['#ffb88a', '#ffd9a8'], morning);
      r.win.material.color.set(new THREE.Color(0x6f8fff).lerp(new THREE.Color(0xffd7a0), morning));
      r.win.material.emissive.set(new THREE.Color(0x6f8fff).lerp(new THREE.Color(0xffd7a0), morning));
      lights({ sky: morning > 0.5 ? 0xffe2c8 : 0x7f95ff, ground: 0x101040, hi: 1.0 + morning, si: 1.2 + morning * 1.4, sunColor: morning > 0.5 ? 0xffc890 : 0xa8b8ff, pos: [6, 8, 5], size: 7 });
      const hrs = ['11:00', '1:00', '3:00', '5:00', '7:00'];
      const hk = clamp((v - T.good - 0.4) / (T.undo + 0.6 - T.good - 0.4));
      r.clockTex.set(v > T.tonight ? '11:00' : hrs[Math.min(4, Math.floor(hk * 4.999))], 1);
      c.pose({ eyes: 0.12 });
      z.forEach((q, i) => { const p = ((v * 0.6 + i / 3) % 1); q.position.set(0.4 + p * 0.8, 1.6 + p * 2.2, -1.5); q.scale.setScalar(Math.sin(p * Math.PI) + 0.001); q.rotation.z = 0.3; });
      cam(lerp3([4.6, 5.6, 9.6], [5.6, 7.4, 12.4], eio((v - T.tonight) / 3)), [0, 2.0, -0.6]);
      const rec = ss(T.good + 0.5, T.undo + 0.8, v);
      ui.meter('focus', v, T.good + 0.3, T.tonight, 90, 330, 900, 'FOCUS', lerp(0.3, 0.95, rec), '#7ff0b0', rec > 0.95 ? 'RESTORED ✓' : null);
      ui.meter('react', v, T.good + 0.5, T.tonight, 90, 440, 900, 'REACTION SPEED', lerp(0.35, 0.95, rec), '#7fe3ff');
      ui.chip('end', v, T.end - 0.2, T.end + 3, 330, 1060, 'SWEET DREAMS ✦', 'big');
    } },
];

export default {
  duration: T.end + 0.5 + 2.6,
  fadeOut: T.end + 2.3,
  keys: [
    { t: -1, stage: '—', state: 'AWAKE', clock: '11:00 PM' },
    { t: 1.0, stage: '—', state: 'STILL AWAKE', clock: '3:00 AM', hot: true },
    { t: 2.2, stage: '—', state: 'STILL AWAKE', clock: '7:00 AM', hot: true },
    { t: T.h16, lbl: 'HOURS AWAKE', stage: '16', state: 'AWAKE', clock: '3:00 PM' },
    { t: T.h19, lbl: 'HOURS AWAKE', stage: '19', state: 'SLOWING', clock: '6:00 PM', hot: true },
    { t: T.h21, lbl: 'HOURS AWAKE', stage: '21', state: 'NODDING OFF', clock: '8:00 PM', hot: true },
    { t: T.h24, lbl: 'HOURS AWAKE', stage: '24', state: 'IMPAIRED', clock: '11:00 PM', hot: true },
    { t: T.amy, lbl: 'HOURS AWAKE', stage: '24', state: 'ON EDGE', clock: '11:05 PM', hot: true },
    { t: T.good, stage: 'N3', state: 'RECOVERING', clock: '1:00 AM' },
    { t: T.undo - 0.2, stage: 'REM', state: 'RESTORED', clock: '7:00 AM' },
    { t: T.tonight, stage: 'N1', state: 'FALLING ASLEEP', clock: '11:00 PM' },
  ],
  shots,
  ui(v) {
    ui.title('ttl', v, -0.5, T.h16 - 0.6, 360, '24 hours<br>without sleep', 'BONUS · HOW SLEEP WORKS');
  },
};
