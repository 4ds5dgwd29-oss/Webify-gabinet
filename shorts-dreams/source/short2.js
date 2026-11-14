// PART 3 — Why dreams feel so real
import * as E from './engine.js';
import * as ui from './ui.js';
const { THREE, cam, lights, bg, fog, ss, eo, eio, pop, lerp, lerp3, clamp, at, V, toScreen, worldPos } = E;

const NAVY = ['#0a0a26', '#141244', '#1b1a5a'];
const PURPLE = ['#2e2466', '#6d4d9e', '#b98ab8'];

function sleeper(g, room) {
  const holder = new THREE.Group(); holder.position.set(0, 1.0, -0.36); holder.rotation.x = -Math.PI / 2;
  const c = E.character({ shirt: 0x2a8fa0 }); c.root.position.y = -0.95; holder.add(c.root); g.add(holder);
  return { holder, c };
}

const shots = [
  { a: -0.5, b: 2.85,
    build(g) {
      lights({ sky: 0x7f95ff, ground: 0x101040, hi: 1.0, si: 1.2, sunColor: 0xa8b8ff, pos: [6, 8, 5], size: 7 });
      const r = E.bedroom({ clock: '3:31' }); g.add(r.group);
      const s = sleeper(g, r);
      s.c.pose({ eyes: 0.1 });
      const b = E.brain(); b.group.scale.setScalar(0.75); g.add(b.group);
      const dots = [];
      for (let i = 0; i < 6; i++) { const d = E.mesh(new THREE.IcosahedronGeometry(0.08, 1), E.mat(0xffffff, { e: 0xffffff, ei: 0.8 }), false); g.add(d); dots.push(d); }
      return { b, dots };
    },
    update(v, lt, { b, dots }) {
      bg(['#0b1450', '#1b2a9a']); fog(null);
      const k = pop((v - 1.7) / 0.7);
      b.group.scale.setScalar(0.75 * k + 0.0001); b.group.position.set(0, 4.3 + Math.sin(v * 2) * 0.08, -1.4);
      b.group.rotation.y = -1.2 + v * 0.3; b.sparkle(v, 1);
      dots.forEach((d, i) => { const f = (i + 1) / 7; d.position.set(0, lerp(1.4, 3.6, f), lerp(-1.5, -1.4, f)); d.scale.setScalar(ss(1.4 + i * 0.1, 1.7 + i * 0.1, v) + 0.001); });
      cam(lerp3([4.5, 5.6, 9.5], [3.6, 5.0, 8.2], eio((v + 0.5) / 3.4)), [0, 2.3, -0.8]);
    } },
  { a: 2.85, b: 7.15,
    build(g) {
      lights({ sky: 0xc8d0ff, ground: 0x2a2050, hi: 1.25, si: 2.3, pos: [3, 6, 6], size: 4 });
      const b = E.brain(); b.group.scale.setScalar(1.6); g.add(b.group);
      return { b };
    },
    update(v, lt, { b }) {
      bg(NAVY);
      const on = ss(3.4, 4.6, v);
      b.regions({ back: [0xffd36b, on], motor: [0x7fe3ff, ss(5.0, 6.0, v) * 0.9], front: [0xff9ad0, ss(5.6, 6.4, v) * 0.5] });
      b.sparkle(v, 1);
      b.group.rotation.y = -1.6 + lt * 0.12; b.group.position.y = 0.3 + Math.sin(v) * 0.05;
      cam(lerp3([0, 0.8, 10.0], [0, 0.6, 9.0], eio(lt / 4.3)), [0, -0.75, 0]);
      ui.meter('aw', v, 3.6, 7.1, 90, 1000, 900, 'BRAIN ACTIVITY · AWAKE', ss(3.7, 4.6, v) * 0.92, '#ffd36b');
      ui.meter('dr', v, 4.3, 7.1, 90, 1130 - 30, 900, 'BRAIN ACTIVITY · DREAMING', ss(4.4, 5.6, v) * 0.88, '#ff8fd0');
    } },
  { a: 7.15, b: 13.5,
    build(g) {
      lights({ sky: 0xf0e0ff, ground: 0x5a4a7a, hi: 1.35, si: 2.3, pos: [4, 10, 7], size: 6 });
      const i = E.island(3.6); g.add(i);
      const R = E.rng(11);
      const shapes = [];
      const kinds = [() => E.box(0.7, 0.7, 0.7, 0x7fe3ff), () => E.mesh(new THREE.ConeGeometry(0.45, 0.9, 5), E.mat(0xffd36b)), () => E.mesh(new THREE.IcosahedronGeometry(0.42, 0), E.mat(0xff8fb0))];
      for (let k = 0; k < 3; k++) { const s = kinds[k](); s.position.set(-1.2 + k * 1.2, 3.2, 1.2); g.add(s); shapes.push(s); }
      const c = E.character({ shirt: 0xe0613a, hair: 0x2a1a10 }); c.root.position.set(0.9, 0, 1.2); c.root.rotation.y = -0.3; g.add(c.root);
      const h = E.house(); h.position.set(-1.3, 0, -1.2); g.add(h);
      const t = E.tree(0x3f8f4a, 1.2, 2); t.position.set(1.8, 0, -1.4); g.add(t);
      const l = E.lamp(); l.position.set(-2.6, 0, 0.6); g.add(l);
      const rd = E.box(1.0, 0.04, 6.6, 0x6a6a7a); rd.position.set(0.2, 0.02, 0.2); rd.rotation.y = 0.9; g.add(rd);
      return { shapes, c, h, t, l, rd, i };
    },
    update(v, lt, s) {
      bg(PURPLE); fog(0x9c7bb0, 18, 44);
      s.shapes.forEach((m, k) => { const p = pop((v - 8.4 - k * 0.15) / 0.5); const away = eio((v - 10.4) / 0.8); m.scale.setScalar(p * (1 - away) + 0.0001); m.rotation.set(v + k, v * 1.3, 0); m.position.y = 3.6 + Math.sin(v * 2 + k) * 0.15; });
      s.c.root.scale.setScalar(pop((v - 9.5) / 0.5) + 0.0001); s.c.pose({ armRz: 0.1 + 1.6 * ss(9.9, 10.3, v) * (1 - ss(11, 11.4, v)), eyes: 1 });
      const rise = k => eo((v - k) / 0.7);
      s.h.scale.set(1, rise(10.05) + 0.001, 1); s.t.scale.setScalar(pop((v - 10.25) / 0.6) + 0.001); s.l.scale.set(1, rise(10.4) + 0.001, 1); s.rd.scale.set(1, 1, rise(10.1) + 0.001);
      cam(lerp3([0, 5.5, 15.5], [0, 4.6, 13.0], eio(lt / 6.3)), [0, 0.6, 0]);
      ui.checklist('see', v, 7.4, 13.45, 90, 330, 470, 'VISUAL AREAS', [
        { text: 'SHAPES', at: 8.72 }, { text: 'FACES', at: 9.68 }, { text: 'PLACES', at: 10.16 }]);
      ui.chip('eyes', v, 11.75, 13.45, 600, 360, 'EYES: CLOSED', 'cool');
      ui.chip('eyes2', v, 12.3, 13.45, 600, 440, 'STILL SEEING ✓', 'good');
    } },
  { a: 13.5, b: 19.75,
    build(g) {
      lights({ sky: 0xffe0f0, ground: 0x5a3a6a, hi: 1.35, si: 2.4, pos: [3, 10, 8], size: 10, target: [3, 0, 0] });
      const i = E.island(3.4); g.add(i);
      g.add(at(E.box(6.4, 0.04, 1.0, 0x6a6a7a), 0, 0.02, 0));
      const t = E.tree(0x2f7d46, 1.3, 7); t.position.set(-1.6, 0, -1.6); g.add(t);
      const city = E.city(12, 4); city.position.set(10, -16, -4); g.add(city);
      const holder = new THREE.Group(); const c = E.character(); holder.add(c.root); holder.rotation.y = Math.PI / 2; g.add(holder);
      const st = E.stars(150, 9, 60); g.add(st);
      return { holder, c };
    },
    update(v, lt, { holder, c }) {
      bg(['#2a2350', '#8a5aa0', '#e8a27a']); fog(0xb07a9a, 20, 60);
      // run 15.4 -> 17.2 to edge; fall 17.2 -> 17.85; fly after
      let x = -2.4, y = 0, pitch = 0;
      if (v < 15.4) { c.pose({ eyes: 1 }); c.body.position.y = 0; }
      const runK = clamp((v - 15.4) / 1.8);
      if (v >= 15.4) { x = lerp(-2.4, 3.3, runK); c.walk(v * 11, 0.85); }
      if (v >= 17.2) { const f = clamp((v - 17.2) / 0.65); x = 3.3 + f * 1.6; y = -f * f * 3.2; c.pose({ armLz: 2.6, armRz: 2.6, legL: 0.5, legR: -0.4 }); pitch = f * 0.6; }
      if (v >= 17.85) { const f = eo((v - 17.85) / 1.9); x = 4.9 + f * 5.5; y = -3.2 + f * 4.4; pitch = lerp(0.6, 1.35, eo((v - 17.85) / 0.5)); c.pose({ armLz: 1.45, armRz: 1.45, armL: 0, armR: 0, legL: 0.1, legR: -0.1 }); c.body.position.y = 0; }
      holder.position.set(x, y, 0); c.root.rotation.x = pitch;
      const follow = ss(15.2, 16.0, v);
      const cx = lerp(-0.5, x, follow), cy = lerp(0.6, y + 0.6, follow);
      cam([cx - 0.8, cy + 3.0, 12.5], [cx, cy + 0.2, 0]);
      ui.meter('mot', v, 14.3, 19.7, 90, 330, 470, 'MOTOR AREAS', lerp(0.2, 0.95, ss(14.6, 15.6, v)), '#7fe3ff');
    } },
  { a: 19.75, b: 25.15,
    build(g) {
      lights({ sky: 0xf0e0ff, ground: 0x4a3a6a, hi: 1.3, si: 2.3, pos: [4, 10, 6], size: 8, target: [0, 0, -6] });
      const fr = E.cinema(); fr.position.set(0, 2.2, 0); g.add(fr);
      const se = E.seats(2, 7); se.position.set(0, -1.6, 4.0); se.rotation.y = Math.PI; g.add(se);
      const world = new THREE.Group(); world.position.set(0, -0.6, -7); g.add(world);
      const i = E.island(4.2); world.add(i);
      const items = [];
      const h = E.house(); h.position.set(-1.4, 0, -1.2); world.add(h); items.push(h);
      const t = E.tree(0xd98ab0, 1.3, 3); t.position.set(1.6, 0, -1.5); world.add(t); items.push(t);
      const t2 = E.tree(0x3f8f4a, 1.1, 6); t2.position.set(2.6, 0, 0.8); world.add(t2); items.push(t2);
      const cr = E.car(); cr.position.set(-2.4, 0, 1.4); cr.rotation.y = 0.6; world.add(cr); items.push(cr);
      const lp = E.lamp(); lp.position.set(0.6, 0, 1.8); world.add(lp); items.push(lp);
      const c = E.character({ shirt: 0x1f9e8a }); world.add(c.root);
      const dark = E.mesh(new THREE.PlaneGeometry(6.6, 3.8), new THREE.MeshBasicMaterial({ color: 0x05030f, transparent: true, opacity: 0 }), false, false); dark.position.set(0, 2.2, 0.05); g.add(dark);
      return { fr, se, world, items, c, i };
    },
    update(v, lt, { fr, se, world, items, c, i }) {
      bg(PURPLE); fog(0x9c7bb0, 20, 50);
      const thru = eio((v - 21.9) / 1.4);
      const fk = 1 - ss(22.2, 22.9, v);
      fr.scale.setScalar(1 + thru * 0.6); fr.visible = fk > 0.01; se.visible = thru < 0.6;
      items.forEach((m, k) => m.scale.setScalar(k < 2 ? 1 : pop((v - 22.5 - k * 0.15) / 0.5) + 0.001));
      const drop = clamp((v - 23.6) / 0.6);
      c.root.position.set(0, lerp(7, 0, drop * drop), 0.4);
      const land = ss(24.2, 24.35, v) * (1 - ss(24.35, 24.7, v));
      c.root.scale.set(1 + land * 0.15, 1 - land * 0.2, 1 + land * 0.15);
      c.pose({ armLz: 0.1 + (1 - drop) * 2.4 * ss(23.5, 23.7, v), armRz: 0.1 + (1 - drop) * 2.4 * ss(23.5, 23.7, v), eyes: 1 });
      c.root.visible = v > 23.55;
      world.rotation.y = Math.sin(v * 0.3) * 0.2;
      cam(lerp3([0, 3.0, 14.5], [0, 3.8, 6.5], thru), lerp3([0, 2.0, 0], [0, 0.6, -7], thru));
      ui.chip('mv', v, 20.4, 21.95, 300, 370, '▶ MOVIE?', '');
      ui.chip('wd', v, 22.5, 25.1, 290, 370, 'BUILDING A WORLD…', 'cool');
      ui.chip('you', v, 24.1, 25.1, 380, 450, '+ YOU', 'hot');
    } },
  { a: 25.15, b: 60,
    build(g) {
      lights({ sky: 0xe6d6ff, ground: 0x4a3a6a, hi: 1.3, si: 2.2, pos: [5, 10, 6], size: 8 });
      const i = E.island(3.6); g.add(i);
      const c = E.character(); c.root.position.set(-1.2, 0, 0.6); c.root.rotation.y = 0.9; g.add(c.root);
      const m = E.monster(); m.position.set(1.6, 0, -0.8); m.rotation.y = -0.7; g.add(m);
      const hrt = E.heart(); g.add(hrt);
      const d = E.dome(4.0); g.add(d);
      const st = E.stars(160, 2, 60); g.add(st);
      return { c, m, hrt, d };
    },
    update(v, lt, { c, m, hrt, d }) {
      bg(['#1e1748', '#5a3f8e', '#a4709f']); fog(0x7a5a9a, 18, 50);
      const brave = eio((v - 28.6) / 1.2);
      c.root.position.x = -1.2 + brave * 0.7;
      c.walk(v * 7, 0.5 * ss(28.6, 28.8, v) * (1 - ss(29.6, 29.8, v)));
      if (v > 29.8 || v < 28.6) c.pose({ armRz: 0.1 + 0.6 * ss(29.9, 30.3, v), armR: 1.3 * ss(29.9, 30.3, v), eyes: 1 });
      const shrink = eio((v - 29.4) / 1.4);
      m.scale.setScalar(lerp(1.05, 0.28, shrink)); m.position.x = lerp(1.6, 1.1, shrink);
      m.position.y = Math.abs(Math.sin(v * 5)) * 0.1 * shrink;
      const hk = pop((v - 27.5) / 0.6) * (1 - ss(29.0, 29.4, v));
      hrt.scale.setScalar(0.35 * hk + 0.0001); hrt.position.set(-1.2 + brave * 0.7, 3.2 + Math.sin(v * 3) * 0.1, 0.6); hrt.rotation.y = v * 2;
      const dk = eo((v - 31.1) / 0.8);
      d.scale.setScalar(dk + 0.0001); d.visible = dk > 0.01;
      cam(lerp3([0, 3.6, 15.5], [0, 3.0, 13.5], eio(lt / 8)), [0, 1.4, 0]);
      ui.meter('thr', v, 26.0, 33.4, 90, 330, 470, 'THREAT SIMULATION', lerp(0.9, 0.0, ss(29.5, 31.6, v)), lerp(0, 1, ss(29.5, 31.6, v)) > 0.5 ? '#7ff0b0' : '#ff6b7d', ss(29.5, 31.6, v) > 0.95 ? 'RISK 0%' : null);
      ui.chip('safe', v, 31.3, 33.4, 620, 360, 'SAFE MODE ✓', 'good');
      ui.chip('nxt', v, 33.6, 36.3, 170, 1060, 'NEXT → WHY YOU FORGET YOUR DREAMS', 'big cool');
    } },
];

export default {
  duration: 36.3,
  fadeOut: 35.5,
  keys: [
    { t: -1, stage: 'REM', state: 'DREAMING', clock: '3:31 AM' },
    { t: 7.15, stage: 'REM', state: 'SEEING', clock: '3:31 AM' },
    { t: 13.5, stage: 'REM', state: 'DREAMING', clock: '3:32 AM' },
    { t: 16.45, stage: 'REM', state: 'RUNNING', clock: '3:32 AM', hot: true },
    { t: 17.2, stage: 'REM', state: 'FALLING', clock: '3:32 AM', hot: true },
    { t: 17.85, stage: 'REM', state: 'FLYING', clock: '3:32 AM', hot: true },
    { t: 19.75, stage: 'REM', state: 'DREAMING', clock: '3:33 AM' },
    { t: 25.15, stage: 'REM', state: 'PRACTICING', clock: '3:34 AM', hot: true },
  ],
  shots,
  ui(v) {
    ui.title('ttl', v, -0.5, 2.0, 360, 'Why dreams<br>feel so real', 'PART 3 · HOW DREAMS WORK');
  },
};
