// PART 2 — Why your brain believes dreams
import * as E from './engine.js';
import * as ui from './ui.js';
const { THREE, cam, lights, bg, fog, ss, eo, eio, pop, lerp, lerp3, clamp, at, V, toScreen, worldPos } = E;

const PURPLE = ['#2e2466', '#6d4d9e', '#b98ab8'];
const NAVY = ['#0a0a26', '#141244', '#1b1a5a'];

const shots = [
  { // And somehow... you accept it.
    a: -0.5, b: 3.0,
    build(g) {
      lights({ sky: 0xe6d6ff, ground: 0x6a5a8a, hi: 1.3, si: 2.2, pos: [5, 10, 7], size: 9 });
      g.add(at(E.box(40, 0.2, 40, 0x86c29a), 0, -0.1, 0));
      const h = E.house(); h.position.set(-1.3, 0, -1.6); h.scale.setScalar(1.25); g.add(h);
      const l = E.lockers(9); l.position.set(-3.2, 0, -4.2); g.add(l);
      const t = E.tree(0xd98ab0, 1.6, 3); t.position.set(-3.3, 0, 0.3); g.add(t);
      const t2 = E.tree(0x2f7d46, 1.8, 5); t2.position.set(3.4, 0, -2.5); g.add(t2);
      const c = E.character(); c.root.position.set(0.9, 0, 0.9); c.root.rotation.y = -0.25; g.add(c.root);
      return { c };
    },
    update(v, lt, { c }) {
      bg(PURPLE); fog(0x9c7bb0, 14, 40);
      const sh = eo((v - 1.6) / 0.5) * (1 - ss(2.9, 3.0, v));
      c.pose({ armLz: 0.1 + sh * 0.9, armRz: 0.1 + sh * 0.9, armL: sh * 0.4, armR: sh * 0.4, tilt: sh * 0.15, eyes: 1 });
      cam(lerp3([1.6, 2.8, 11.5], [1.3, 2.5, 9.6], eio(lt / 3.5)), [0.4, 2.3, 0]);
    },
  },
  { // But why doesn't your brain notice...
    a: 3.0, b: 7.0,
    build(g) {
      lights({ sky: 0xe6d6ff, ground: 0x5a4a7a, hi: 1.4, si: 2.0, pos: [4, 10, 6], size: 10 });
      const mk = (x, y, z, kind) => {
        const i = E.island(1.5); const gg = new THREE.Group(); gg.add(i);
        if (kind === 0) { const h = E.house(); h.scale.setScalar(0.8); gg.add(h); const t = E.tree(0x3f8f4a, 0.7); t.position.set(1.0, 0, -0.4); gg.add(t); }
        if (kind === 1) { const cl = [0xd84a3a, 0xf0a830, 0x7a4fd0]; cl.forEach((c, k) => { const p = E.character({ shirt: c, bald: k === 2, hair: k === 1 ? 0xd9a050 : 0x2a1a10 }); p.root.scale.setScalar(0.5); p.root.position.x = (k - 1) * 0.42; gg.add(p.root); }); }
        if (kind === 2) { const c = E.car(); c.scale.setScalar(0.7); gg.add(c); const lp = E.lamp(); lp.scale.setScalar(0.7); lp.position.set(0.8, 0, -0.5); gg.add(lp); }
        gg.position.set(x, y, z); g.add(gg); return gg;
      };
      const isl = [mk(-2.6, 1.2, 0, 0), mk(0, -0.2, 0.6, 1), mk(2.6, 1.0, -0.3, 2)];
      const q = E.question(); q.scale.setScalar(1.3); g.add(q);
      return { isl, q };
    },
    update(v, lt, { isl, q }) {
      bg(['#271d5c', '#5f3f92', '#a4709f']); fog(0x7a5a9a, 16, 40);
      isl.forEach((i, k) => {
        const spread = eio((lt - 0.8) / 2.5);
        i.position.x = [-2.6, 0, 2.6][k] * (1 + spread * 0.35);
        i.position.y = [1.2, -0.2, 1.0][k] + Math.sin(v * 1.3 + k * 2) * 0.12 - spread * 0.6;
        i.rotation.y = v * 0.25 * (k - 1) + k;
        i.rotation.z = spread * 0.25 * (k - 1);
      });
      const qk = pop((lt - 1.2) / 0.7);
      q.scale.setScalar(0.85 * qk + 0.0001); q.position.set(0, 3.6 + Math.sin(v * 2) * 0.1, 0.5); q.rotation.y = Math.sin(v * 1.5) * 0.5;
      cam(lerp3([0, 2.4, 15.5], [0, 2.2, 13.5], eio(lt / 4)), [0, 1.2, 0]);
    },
  },
  { // prefrontal cortex quieter / logic, planning, is this real?
    a: 7.0, b: 19.4,
    build(g) {
      lights({ sky: 0xc8d0ff, ground: 0x2a2050, hi: 1.25, si: 2.3, pos: [3, 6, 6], size: 4, fi: 0 });
      const b = E.brain(); b.group.scale.setScalar(1.6); g.add(b.group);
      return { b };
    },
    update(v, lt, { b }) {
      bg(NAVY); fog(null);
      const on = ss(7.4, 8.6, v), off = ss(11.9, 13.6, v);
      const frontColor = new THREE.Color(0x7fe3ff).lerp(new THREE.Color(0x4a5070), off);
      b.regions({ front: [frontColor.getHex(), on * (0.85 - off * 0.05)] });
      b.sparkle(v, 1, p => (p.z > 0.35 ? (1 - off) : 1) * 1);
      b.group.rotation.y = -1.15 + Math.sin(v * 0.35) * 0.12 + lt * 0.015;
      b.group.position.y = 0.3 + Math.sin(v * 1.2) * 0.05;
      const k = eio(lt / 5);
      cam(lerp3([0, 0.8, 10.2], [0, 0.6, 9.0], k), [0, -0.75 + 0.1 * ss(13.5, 15, v), 0]);
      // callout to frontal lobe (+z in brain space)
      const fp = worldPos(b.group, [0, 0.35, 0.95]);
      const [px, py] = toScreen(fp);
      ui.callout('pfc', v, 9.2, 19.3, px, py, 330, 470, 'PREFRONTAL CORTEX', 'LOGIC · PLANNING · DOUBT', off > 0.5 ? '#9aa3c7' : '#7fe3ff');
      const act = lerp(0.18, 0.92, on) - off * 0.74;
      ui.meter('m-pfc', v, 10.4, 19.3, 600, 1010, 400, 'ACTIVITY', act, off > 0.5 ? '#8a93b5' : '#7fe3ff', off > 0.6 ? 'LOW ▼' : Math.round(act * 100) + '%');
      // chips
      const dim = ss(18.7, 19.0, v);
      ui.chip('c1', v, 14.95, 19.3, 90, 960, 'LOGIC', dim ? '' : 'cool').style.opacity *= 1 - dim * 0.6;
      ui.chip('c2', v, 15.7, 19.3, 90, 1040, 'PLANNING', dim ? '' : 'cool').style.opacity *= 1 - dim * 0.6;
      ui.chip('c3', v, 17.4, 19.3, 90, 1120, '“WAIT… IS THIS REAL?”', dim ? '' : 'cool').style.opacity *= 1 - dim * 0.6;
    },
  },
  { // amygdala highly active, emotions
    a: 19.4, b: 29.15,
    build(g) {
      lights({ sky: 0xc8d0ff, ground: 0x2a2050, hi: 1.2, si: 2.0, pos: [3, 6, 6], size: 4, fillColor: 0xff3050, fi: 0, fillPos: [0, 0, 0] });
      const b = E.brain(); b.group.scale.setScalar(1.6); g.add(b.group);
      const icons = [E.bolt(), E.star(), E.heart()];
      icons.forEach(i => { i.scale.setScalar(0.0001); g.add(i); });
      return { b, icons };
    },
    update(v, lt, { b, icons }) {
      bg(['#0b0a26', '#1a0f3f', '#2a0f3a'], null, 0);
      const x = ss(19.6, 20.9, v);
      b.xray(x);
      b.regions({ front: [0x4a5070, 0.8] });
      const a = ss(22.9, 24.6, v);
      const pulse = 0.6 + 0.4 * Math.sin(v * 7);
      b.amyM.emissiveIntensity = a * (0.5 + pulse * 0.6); b.amyM.opacity = 0.25 + 0.75 * a;
      b.amy.forEach(m => m.scale.setScalar(0.8 + a * (0.15 + 0.12 * pulse)));
      b.sparkle(v, 0.6 * (1 - x * 0.5));
      b.group.rotation.y = -0.65 + Math.sin(v * 0.4) * 0.15;
      b.group.position.y = 0.3 + Math.sin(v * 1.2) * 0.05;
      cam(lerp3([0, 0.7, 9.8], [0, 0.5, 8.0], eio(lt / 5.5)), [0, -0.6, 0]);
      const ap = worldPos(b.group, [0.3, -0.18, 0.28]);
      const [px, py] = toScreen(ap);
      ui.callout('amy', v, 21.0, 29.1, px, py, 720, 560, 'AMYGDALA', 'EMOTION CENTER', '#ff6b7d');
      const ev = lerp(0.22, 0.97, ss(22.9, 24.7, v));
      ui.meter('m-amy', v, 22.0, 29.1, 600, 1010, 400, 'EMOTION', ev, '#ff6b7d', ev > 0.9 ? 'HIGH ▲' : Math.round(ev * 100) + '%');
      // icons orbit
      const at_ = [26.7, 27.4, 28.3];
      icons.forEach((ic, k) => {
        const s = pop((v - at_[k]) / 0.5);
        const ang = v * 0.6 + k * 2.1;
        ic.position.set(Math.cos(ang) * 2.0, 0.3 + Math.sin(ang * 1.3) * 0.5 + (k - 1) * 0.5, Math.sin(ang) * 1.6);
        ic.rotation.y = v * 1.5 + k; ic.scale.setScalar(0.45 * s + 0.0001);
      });
      ui.chip('e1', v, 26.75, 29.1, 80, 960, 'FEAR', 'cool');
      ui.chip('e2', v, 27.45, 29.1, 80, 1040, 'EXCITEMENT');
      ui.chip('e3', v, 28.35, 29.1, 80, 1120, 'JOY', 'hot');
    },
  },
  { // inner critic quiet, emotions lead — seesaw
    a: 29.15, b: 33.5,
    build(g) {
      lights({ sky: 0xf0dcff, ground: 0x6a4a7a, hi: 1.3, si: 2.3, pos: [4, 9, 6], size: 6 });
      const i = E.island(3.4); g.add(i);
      const s = E.seesaw(); g.add(s.group);
      const L = E.brain(); L.group.scale.setScalar(0.55); L.regions({ all: [0x8a90b0, 1] }); L.sparkle(0, 0);
      const Lg = new THREE.Group(); Lg.add(L.group); L.group.position.y = 0.5; Lg.position.set(-2.1, 0.08, 0); s.plank.add(Lg);
      const hrt = E.heart(); hrt.scale.setScalar(0.6); hrt.position.set(2.1, 0.75, 0); s.plank.add(hrt);
      const t = E.tree(0xd98ab0, 1.2, 4); t.position.set(-2.2, 0, -2.0); g.add(t);
      return { s, L, hrt };
    },
    update(v, lt, { s, L, hrt }) {
      bg(['#3a2470', '#8a4f9e', '#e09aa8']); fog(0xb07aa8, 14, 40);
      const tilt = eio((v - 30.0) / 1.6) * 0.32 - (1 - eio((v - 30.0) / 1.6)) * 0.12;
      s.plank.rotation.z = -tilt;
      hrt.rotation.y = v * 1.2; hrt.scale.setScalar(0.6 + 0.08 * Math.sin(v * 6) * ss(31.5, 32.0, v) + 0.25 * ss(31.6, 32.4, v));
      L.group.rotation.y = v * 0.4;
      cam(lerp3([0.5, 4.0, 14.0], [0, 3.4, 12.5], eio(lt / 4.5)), [0, 0.2, 0]);
      ui.meter('m-l', v, 29.2, 33.5, 90, 330, 430, 'INNER CRITIC', lerp(0.6, 0.12, ss(29.5, 31.2, v)), '#9aa3c7');
      ui.meter('m-e', v, 29.5, 33.5, 560, 330, 430, 'EMOTIONS', lerp(0.5, 0.96, ss(31.5, 33.0, v)), '#ff6b7d');
    },
  },
  { // thrilling / terrifying / nothing adds up
    a: 33.5, b: 50,
    build(g) {
      lights({ sky: 0xffe0f0, ground: 0x6a3a5a, hi: 1.3, si: 2.3, pos: [4, 9, 6], size: 7 });
      const i = E.island(2.6); g.add(i);
      const c = E.character(); g.add(c.root);
      const m = E.monster(); m.position.set(0, -8, -6); m.scale.setScalar(1.6); g.add(m);
      const h = E.house(); const hi = E.island(1.4); hi.add(h); hi.position.set(-4.5, 6, -6); g.add(hi);
      const c2 = E.car(); const ci = E.island(1.2); ci.add(c2); ci.position.set(4.2, 5, -5); g.add(ci);
      const st = E.stars(200, 4, 50); g.add(st);
      const sparks = [];
      for (let k = 0; k < 18; k++) { const sp = E.star(0xffe27a); sp.scale.setScalar(0.12); g.add(sp); sparks.push(sp); }
      return { c, m, hi, ci, sparks, st };
    },
    update(v, lt, { c, m, hi, ci, sparks, st }) {
      const terror = ss(35.4, 36.2, v);
      bg(['#ff9a7a', '#ff6fa0', '#7a4fd0'], ['#07030c', '#2a0612', '#4a0a1a'], terror);
      fog(new THREE.Color(0xd77ab0).lerp(new THREE.Color(0x2a0612), terror).getHex(), 16, 44);
      lights({ sky: terror > 0.5 ? 0xff9090 : 0xffe0f0, ground: 0x3a1a2a, hi: 1.3 - terror * 0.6, si: 2.3 - terror * 1.2, pos: [4, 9, 6], size: 7, sunColor: terror > 0.5 ? 0xff7070 : 0xffffff });
      const fly = ss(33.7, 34.6, v) * (1 - terror);
      c.root.position.y = fly * 2.2 + Math.sin(v * 3) * 0.1 * fly;
      c.pose({ armLz: 0.1 + fly * 2.3, armRz: 0.1 + fly * 2.3, legL: fly * -0.2, legR: fly * 0.2, eyes: 1 });
      c.root.rotation.y = terror * Math.PI * 0.95;
      c.root.position.z = terror * 1.2;
      sparks.forEach((s, k) => { const a = k / 18 * Math.PI * 2 + v; const r = 2.3 + Math.sin(v * 2 + k) * 0.4; s.position.set(Math.cos(a) * r, 2 + fly * 2 + Math.sin(a * 2) * 1.2, Math.sin(a) * r); s.rotation.z = v * 2 + k; s.scale.setScalar((0.14 + 0.05 * Math.sin(v * 5 + k)) * fly + 0.0001); });
      m.position.y = lerp(-9, -1.5, eo((v - 35.6) / 1.4)); m.visible = v > 35.5;
      m.rotation.y = Math.sin(v * 0.8) * 0.15;
      const absurd = eio((v - 36.9) / 1.3);
      hi.rotation.z = absurd * Math.PI; hi.position.y = 6 - absurd * 1.5;
      ci.rotation.x = absurd * Math.PI * 0.9; ci.rotation.y = v * 0.6;
      st.material.opacity = 0.2 + terror * 0.7;
      cam(lerp3([0, 3.0, 15.0], [0, 3.8, 16.5], eio(lt / 5)), [0, 2.2 + terror * 0.8, 0]);
      ui.chip('thr', v, 34.75, 35.6, 380, 400, 'THRILLING ✦', 'hot');
      ui.chip('ter', v, 35.95, 37.0, 370, 400, 'TERRIFYING ✕', 'hot');
      ui.chip('nxt', v, 39.1, 41.8, 205, 1060, 'NEXT → WHY DREAMS FEEL SO REAL', 'big cool');
    },
  },
];

export default {
  duration: 41.8,
  fadeOut: 41.0,
  keys: [
    { t: -1, stage: 'REM', state: 'DREAMING', clock: '3:12 AM' },
    { t: 7.0, stage: 'REM', state: 'DREAMING', clock: '3:13 AM' },
    { t: 13.4, stage: 'REM', state: 'NOT DOUBTING', clock: '3:13 AM', hot: false },
    { t: 23.0, stage: 'REM', state: 'FEELING IT', clock: '3:14 AM', hot: true },
    { t: 29.15, stage: 'REM', state: 'DREAMING', clock: '3:14 AM', hot: true },
  ],
  shots,
  ui(v) {
    ui.title('ttl', v, -0.5, 2.9, 360, 'Why your brain<br>believes dreams', 'PART 2 · HOW DREAMS WORK');
  },
};
