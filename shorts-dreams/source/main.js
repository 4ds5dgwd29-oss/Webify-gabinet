import { THREE, scene, camera, renderer, fog, clamp } from './engine.js';
import * as ui from './ui.js';

const n = new URLSearchParams(location.search).get('s') || '1';
const mod = await import(`./short${n}.js`);
await document.fonts.load('italic 64px Gelasio');
await document.fonts.load('900 54px Archivo');
await document.fonts.load('700 22px Archivo');
await document.fonts.load('96px DMSerif');
await document.fonts.ready;
const words = await (await fetch(`audio/w${n}.json`)).json();
const OFF = 0.5;
const S = mod.default;
const cues = ui.buildCues(words.words, OFF);
const fadeEl = document.getElementById('fadeEl');
let cur = null, g = null, st = null;
window.DURATION = S.duration;
window.CUES = cues;
window.renderAt = (t) => {
  const v = t - OFF;
  const shots = S.shots;
  const shot = shots.find(s => v >= s.a && v < s.b) || (v < shots[0].a ? shots[0] : shots[shots.length - 1]);
  if (shot !== cur) {
    if (g) scene.remove(g);
    g = new THREE.Group(); scene.add(g); fog(null);
    cur = shot; st = shot.build(g) || {};
  }
  ui.begin();
  shot.update(v, v - shot.a, st, g);
  ui.hud(v, S.keys);
  if (S.ui) S.ui(v);
  ui.subs(t, cues);
  let d = 0;
  for (const s of shots) if (s !== shots[0] && !s.nocut) d = Math.max(d, 1 - Math.abs(v - s.a) / 0.14);
  if (st && st.black) d = Math.max(d, st.black / 0.92);
  if (S.fadeOut) d = Math.max(d, clamp((v - S.fadeOut) / 0.8));
  d = Math.max(d, 1 - clamp((v + OFF) / 0.25));
  fadeEl.style.opacity = clamp(d) * (S.fadeOut && v > S.fadeOut ? 1 : 0.92);
  ui.end();
  renderer.render(scene, camera);
};
window.READY = true;
