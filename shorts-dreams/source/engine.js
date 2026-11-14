import * as THREE from 'three';
export { THREE };
export const W = 1080, H = 1920;

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);

const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x302040, 1.3);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 4;
scene.add(sun, sun.target);
const fill = new THREE.PointLight(0xffffff, 0, 30, 1.5);
scene.add(fill);

export function lights({ sky = 0xbfd4ff, ground = 0x302040, hi = 1.3, sunColor = 0xffffff, si = 2.4,
  pos = [6, 12, 8], target = [0, 0, 0], size = 10, fillColor = 0xffffff, fi = 0, fillPos = [0, 3, 3] } = {}) {
  hemi.color.set(sky); hemi.groundColor.set(ground); hemi.intensity = hi;
  sun.color.set(sunColor); sun.intensity = si;
  sun.position.set(pos[0] + target[0], pos[1] + target[1], pos[2] + target[2]);
  sun.target.position.set(...target);
  const c = sun.shadow.camera;
  c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 80;
  c.updateProjectionMatrix();
  fill.color.set(fillColor); fill.intensity = fi; fill.position.set(...fillPos);
}

const bgCache = {};
export function gradientTex(stops) {
  const key = stops.join('|');
  if (bgCache[key]) return bgCache[key];
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  bgCache[key] = t; return t;
}
// animated background: mix two gradients
const bgCanvas = document.createElement('canvas'); bgCanvas.width = 4; bgCanvas.height = 512;
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
export function bg(stops, stops2 = null, k = 0) {
  const g = bgCanvas.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  const n = stops.length;
  for (let i = 0; i < n; i++) {
    let c = new THREE.Color(stops[i]);
    if (stops2) c = c.lerp(new THREE.Color(stops2[i]), clamp(k));
    gr.addColorStop(i / (n - 1), '#' + c.getHexString());
  }
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  bgTex.needsUpdate = true;
  scene.background = bgTex;
}
export function fog(color, near, far) {
  if (color == null) { scene.fog = null; return; }
  if (!scene.fog) scene.fog = new THREE.Fog(color, near, far);
  scene.fog.color.set(color); scene.fog.near = near; scene.fog.far = far;
}

// ---------- math ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const eo = t => 1 - Math.pow(1 - clamp(t), 3);
export const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const pop = t => { t = clamp(t); if (t === 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function cam(pos, look, fov = null) {
  camera.position.set(...pos); camera.lookAt(...look);
  if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
export function lerp3(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
export function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
export function worldPos(obj, off = [0, 0, 0]) { obj.updateWorldMatrix(true, false); return obj.localToWorld(V(...off)); }

// ---------- materials & meshes ----------
const mc = {};
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!o.unique && mc[key]) return mc[key];
  const m = new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: o.r ?? 0.85, metalness: 0,
    emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    transparent: o.op != null, opacity: o.op ?? 1, side: o.side ?? THREE.FrontSide,
    depthWrite: o.dw ?? true,
  });
  if (!o.unique) mc[key] = m;
  return m;
}
export function mesh(geo, m, cast = true, recv = true) {
  const x = new THREE.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = recv; return x;
}
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'object' ? c : mat(c, o));
export const grp = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
export function at(o, x, y, z) { o.position.set(x, y, z); return o; }

// ---------- builders ----------
export function character({ shirt = 0x1f9e8a, pants = 0xc9a46b, skin = 0xe2a77e, hair = 0x3a2418, shoes = 0x2a2a2a, bald = false, hairColorTop = null } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.15 * s, 0.95, 0);
    const m = box(0.22, 0.86, 0.26, pants); m.position.y = -0.43; p.add(m);
    const sh = box(0.24, 0.12, 0.34, shoes); sh.position.set(0, -0.9, 0.04); p.add(sh);
    body.add(p); legs.push(p);
  }
  const torso = box(0.66, 0.8, 0.38, shirt); torso.position.y = 1.35; body.add(torso);
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.42 * s, 1.68, 0);
    const m = box(0.17, 0.66, 0.2, shirt); m.position.y = -0.3; p.add(m);
    const h = box(0.15, 0.14, 0.17, skin); h.position.y = -0.7; p.add(h);
    body.add(p); arms.push(p);
  }
  const neck = box(0.16, 0.12, 0.16, skin); neck.position.y = 1.8; body.add(neck);
  const head = new THREE.Group(); head.position.y = 2.14; body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.38, 10, 8), mat(skin)));
  if (!bald) {
    const hr = mesh(new THREE.SphereGeometry(0.405, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(hair));
    hr.rotation.x = -0.4; hr.position.set(0, 0.03, -0.04); head.add(hr);
  }
  const eyes = [];
  for (const s of [-1, 1]) { const e = box(0.065, 0.095, 0.05, 0x161616, { r: 0.4 }); e.position.set(0.13 * s, 0.03, 0.35); e.castShadow = false; head.add(e); eyes.push(e); }
  const mouth = box(0.13, 0.03, 0.04, 0x4a2020); mouth.position.set(0, -0.16, 0.35); mouth.castShadow = false; head.add(mouth);
  const c = { root, body, legs, arms, head, eyes, mouth };
  c.pose = ({ armL = 0, armR = 0, armLz = 0.08, armRz = 0.08, legL = 0, legR = 0, eyes: eo_ = 1, tilt = 0, turn = 0, nod = 0 } = {}) => {
    arms[0].rotation.set(-armL, 0, -armLz); arms[1].rotation.set(-armR, 0, armRz);
    legs[0].rotation.set(-legL, 0, 0); legs[1].rotation.set(-legR, 0, 0);
    eyes.forEach(e => e.scale.y = Math.max(0.15, eo_));
    head.rotation.set(nod, turn, tilt);
  };
  c.walk = (ph, amp = 0.6) => {
    const s = Math.sin(ph);
    c.pose({ legL: s * amp, legR: -s * amp, armL: -s * amp * 0.9, armR: s * amp * 0.9 });
    body.position.y = Math.abs(Math.cos(ph)) * 0.06;
  };
  c.pose();
  return c;
}

export function brain({ seed = 7 } = {}) {
  const g = new THREE.Group();
  const R = rng(seed);
  const parts = [];
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7, transparent: true, opacity: 1 });
  const base = new THREE.Color(0xf3a3c4);
  for (const s of [-1, 1]) {
    const geo = new THREE.IcosahedronGeometry(1, 3);
    const pos = geo.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); const n = v.clone().normalize();
      const d = 1 + 0.075 * Math.sin(n.x * 9 + n.y * 7) * Math.sin(n.z * 8 + n.y * 5) + 0.045 * Math.sin(n.z * 17 + n.x * 3 + n.y * 11);
      v.copy(n).multiplyScalar(d);
      v.x *= 0.6; v.y *= 0.8; v.z *= 1.15;
      if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.55;
      if (s * v.x < -0.1) v.x = s * -0.1 + (v.x - s * -0.1) * 0.3;
      v.x += s * 0.34;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const cols = new Float32Array(pos.count * 3);
    const shade = [], cent = [];
    for (let f = 0; f < pos.count / 3; f++) {
      shade.push(0.86 + R() * 0.2);
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += pos.getX(f * 3 + k); cy += pos.getY(f * 3 + k); cz += pos.getZ(f * 3 + k); }
      cent.push([cx / 3, cy / 3, cz / 3]);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = mesh(geo, material); g.add(m);
    parts.push({ geo, shade, cent, cols });
  }
  const stem = mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.7, 6), mat(0xd98aa8)); stem.position.set(0, -0.55, -0.3); stem.rotation.x = 0.35; g.add(stem);
  const cb = mesh(new THREE.IcosahedronGeometry(0.5, 1), mat(0xe596b6)); cb.scale.set(1.15, 0.55, 0.6); cb.position.set(0, -0.32, -0.78); g.add(cb);
  const amyM = mat(0xff3b4f, { e: 0xff2040, ei: 0, unique: true }); amyM.depthTest = false; amyM.transparent = true; amyM.opacity = 0;
  const amy = [];
  for (const s of [-1, 1]) { const a = mesh(new THREE.IcosahedronGeometry(0.13, 1), amyM, false, false); a.position.set(0.3 * s, -0.18, 0.28); a.renderOrder = 10; g.add(a); amy.push(a); }
  // sparkles
  const sp = [];
  const spM = mat(0xffffff, { e: 0xffffff, ei: 1.2 });
  for (let i = 0; i < 46; i++) {
    const th = R() * Math.PI * 2, ph = R() * Math.PI * 0.5;
    const n = V(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    const p = V(n.x * 0.95, n.y * 0.82 + 0.02, n.z * 1.1);
    const sm = mesh(new THREE.SphereGeometry(0.035 + R() * 0.03, 6, 4), spM, false, false);
    sm.position.copy(p); sm.userData = { ph: R() * 10, sp: 2 + R() * 4, region: p };
    g.add(sm); sp.push(sm);
  }
  const b = { group: g, material, amy, amyM, sp, stem, cb };
  // regions: { front:[hex,amt], back:[hex,amt], motor:[hex,amt], all:[hex,amt] }
  b.regions = (r = {}) => {
    const tmp = new THREE.Color();
    for (const p of parts) {
      for (let f = 0; f < p.shade.length; f++) {
        const [x, y, z] = p.cent[f];
        tmp.copy(base).multiplyScalar(p.shade[f]);
        const masks = {
          front: ss(0.3, 0.85, z),
          back: ss(-0.3, -0.9, z),
          motor: Math.exp(-Math.pow((z - 0.05) / 0.22, 2)) * ss(0.15, 0.55, y),
          all: 1,
        };
        for (const k in r) {
          const [hex, amt] = r[k]; const m = (masks[k] ?? 0) * amt;
          if (m > 0) tmp.lerp(new THREE.Color(hex).multiplyScalar(p.shade[f]), clamp(m));
        }
        for (let q = 0; q < 3; q++) { p.cols[(f * 3 + q) * 3] = tmp.r; p.cols[(f * 3 + q) * 3 + 1] = tmp.g; p.cols[(f * 3 + q) * 3 + 2] = tmp.b; }
      }
      p.geo.attributes.color.needsUpdate = true;
    }
  };
  b.sparkle = (t, amt = 1, filter = null) => {
    for (const s of sp) {
      const u = s.userData; const ok = filter ? filter(u.region) : 1;
      const k = Math.max(0, Math.sin(t * u.sp + u.ph)) * amt * ok;
      s.scale.setScalar(k + 0.0001); s.visible = k > 0.02;
    }
  };
  b.xray = (k) => {
    material.opacity = 1 - 0.68 * k; material.depthWrite = k < 0.5;
    stem.material.transparent = true;
  };
  b.regions();
  b.sparkle(0, 0);
  return b;
}

export function island(r = 2, top = 0x6fbf73, rock = 0x4a3842, seed = 1) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(r, r * 0.96, 0.3, 8), mat(top)); t.position.y = -0.15; g.add(t);
  const dirt = mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.9, 0.25, 8), mat(0x7a5a4a)); dirt.position.y = -0.42; g.add(dirt);
  const c = mesh(new THREE.ConeGeometry(r * 0.9, r * 1.5, 8), mat(rock)); c.rotation.x = Math.PI; c.position.y = -0.55 - r * 0.75; g.add(c);
  return g;
}
export function house({ wall = 0xf2d7a8, roof = 0xe8633a, door = 0x7a3a22 } = {}) {
  const g = new THREE.Group();
  g.add(at(box(1.8, 1.2, 1.5, wall), 0, 0.6, 0));
  const r = mesh(new THREE.ConeGeometry(1.45, 0.9, 4), mat(roof)); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.85); r.position.y = 1.65; g.add(r);
  g.add(at(box(0.36, 0.62, 0.06, door), 0, 0.31, 0.76));
  for (const s of [-1, 1]) g.add(at(box(0.36, 0.32, 0.06, 0xa9d3e8, { e: 0x335566, ei: 0.4 }), 0.55 * s, 0.72, 0.76));
  return g;
}
export function tree(leaf = 0x3f8f4a, s = 1, seed = 2) {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.9 * s, 6), mat(0x6b4632)), 0, 0.45 * s, 0));
  const l = mesh(new THREE.IcosahedronGeometry(0.6 * s, 0), mat(leaf)); l.position.y = 1.15 * s; l.rotation.set(seed, seed * 2, 0); g.add(l);
  const l2 = mesh(new THREE.IcosahedronGeometry(0.42 * s, 0), mat(leaf)); l2.position.set(0.3 * s, 1.5 * s, 0.1 * s); l2.rotation.set(seed * 3, 0, seed); g.add(l2);
  return g;
}
export function car(color = 0xf0a830) {
  const g = new THREE.Group();
  g.add(at(box(1.7, 0.42, 0.85, color), 0, 0.4, 0));
  g.add(at(box(0.95, 0.38, 0.8, color), -0.1, 0.8, 0));
  g.add(at(box(0.9, 0.28, 0.82, 0x9fd0e6, { e: 0x224455, ei: 0.3 }), -0.1, 0.8, 0));
  for (const x of [-0.55, 0.55]) for (const z of [-0.43, 0.43]) {
    const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 8), mat(0x222222)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, z); g.add(w);
  }
  return g;
}
export function lamp() {
  const g = new THREE.Group();
  g.add(at(box(0.08, 2.2, 0.08, 0x2d4a3a), 0, 1.1, 0));
  g.add(at(box(0.5, 0.08, 0.1, 0x2d4a3a), 0.22, 2.2, 0));
  g.add(at(box(0.18, 0.08, 0.14, 0xfff3c0, { e: 0xffe9a0, ei: 1.5 }), 0.42, 2.14, 0));
  return g;
}
export function lockers(n = 8) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    g.add(at(box(0.62, 2.2, 0.5, 0x4a72a0), i * 0.66, 1.1, 0));
    g.add(at(box(0.04, 0.3, 0.02, 0x23384f), i * 0.66 + 0.18, 1.5, 0.26));
    g.add(at(box(0.4, 0.03, 0.02, 0x23384f), i * 0.66, 1.95, 0.26));
    g.add(at(box(0.4, 0.03, 0.02, 0x23384f), i * 0.66, 1.88, 0.26));
  }
  return g;
}
export function clockTex(text, color = '#ff9a6a') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.set = (txt, on = 1) => {
    const g = cv.getContext('2d'); g.fillStyle = '#1a0d0a'; g.fillRect(0, 0, 256, 128);
    g.globalAlpha = on; g.fillStyle = color; g.font = '900 84px Archivo'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 128, 68); g.globalAlpha = 1; t.needsUpdate = true;
  };
  t.set(text); return t;
}
export function bedroom({ wall = 0x1c2c9a, floor = 0x15206e, windowColor = 0x6f8fff, windowE = 0.9, blanket = 0x3561e0, clock = '3:12' } = {}) {
  const g = new THREE.Group();
  g.add(at(box(16, 0.2, 16, floor), 0, -0.1, 0));
  g.add(at(box(16, 10, 0.2, wall), 0, 5, -4));
  g.add(at(box(0.2, 10, 16, wall), -5.5, 5, 0));
  // window on back wall right
  const win = at(box(2.6, 3.4, 0.05, windowColor, { e: windowColor, ei: windowE, unique: true }), 3.3, 4.6, -3.88); win.castShadow = false; g.add(win);
  g.add(at(box(0.14, 3.4, 0.12, 0x101a55), 3.3, 4.6, -3.8));
  g.add(at(box(3.0, 0.18, 0.5, 0x101a55), 3.3, 2.82, -3.7));
  // bed
  const bed = new THREE.Group();
  bed.add(at(box(2.6, 0.5, 4.2, 0x3a2216), 0, 0.25, 0));
  bed.add(at(box(2.7, 1.6, 0.25, 0x3a2216), 0, 0.8, -2.1));
  bed.add(at(box(2.45, 0.35, 4.0, 0xe8e8f0), 0, 0.67, 0));
  bed.add(at(box(1.5, 0.25, 0.7, 0xf4f4fa), 0, 0.95, -1.55));
  const bl = at(box(2.55, 0.32, 2.9, blanket), 0, 0.98, 0.6); bed.add(bl);
  bed.add(at(box(2.56, 0.04, 0.55, 0x2a8fa0), 0, 1.15, -0.65));
  g.add(bed);
  const ns = new THREE.Group();
  ns.add(at(box(1.0, 1.0, 0.9, 0x2a1a16), 0, 0.5, 0));
  const ct = clockTex(clock);
  const ck = new THREE.Group();
  ck.add(at(box(0.62, 0.36, 0.3, 0x111111), 0, 0, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: ct, toneMapped: false }));
  face.position.z = 0.152; ck.add(face);
  ck.position.set(0, 1.18, 0.05); ns.add(ck);
  ns.position.set(2.0, 0, -1.4); g.add(ns);
  return { group: g, bed, blanket: bl, win, clock: ck, clockTex: ct, nightstand: ns };
}
export function city(n = 9, seed = 3, { base = 0x2a2350, glow = 0xffc98a } = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const cnt = n * n;
  const im = new THREE.InstancedMesh(geo, mat(base, { r: 0.9 }), cnt);
  const gl = new THREE.InstancedMesh(geo, mat(glow, { e: glow, ei: 1.4 }), cnt);
  im.castShadow = im.receiveShadow = true;
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const h = 0.6 + Math.pow(R(), 1.6) * 4.2; const w = 0.9 + R() * 0.5;
    const x = (i - n / 2) * 1.9 + R() * 0.3, z = (j - n / 2) * 1.9 + R() * 0.3;
    m4.compose(V(x, h / 2, z), new THREE.Quaternion(), V(w, h, w)); im.setMatrixAt(k, m4);
    const glowOn = R() < 0.55;
    m4.compose(V(x, h - 0.12, z), new THREE.Quaternion(), glowOn ? V(w + 0.04, 0.06, w + 0.04) : V(0, 0, 0)); gl.setMatrixAt(k, m4);
    k++;
  }
  g.add(im, gl);
  return g;
}
export function monster() {
  const g = new THREE.Group();
  const b = mesh(new THREE.IcosahedronGeometry(1.6, 1), mat(0x24132e, { r: 1 })); b.scale.set(1, 1.35, 0.85); b.position.y = 2; g.add(b);
  const eM = mat(0xff3355, { e: 0xff2244, ei: 3 });
  for (const s of [-1, 1]) {
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.2, 0), eM, false), 0.5 * s, 2.7, 1.25));
    const horn = mesh(new THREE.ConeGeometry(0.25, 0.9, 5), mat(0x3a1f45)); horn.position.set(0.8 * s, 4.0, 0); horn.rotation.z = -0.4 * s; g.add(horn);
    const arm = mesh(new THREE.ConeGeometry(0.35, 1.8, 5), mat(0x24132e)); arm.position.set(1.7 * s, 1.6, 0.2); arm.rotation.z = (Math.PI / 2 + 0.6) * s; g.add(arm);
  }
  return g;
}
function shapeMesh(shape, color, o = {}, depth = 0.4) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.12, bevelThickness: 0.12, curveSegments: 6 });
  geo.center();
  return mesh(geo, mat(color, o));
}
export function heart(color = 0xff4f6e) {
  const s = new THREE.Shape();
  s.moveTo(0, -1); s.bezierCurveTo(-0.25, -0.65, -1.15, -0.3, -1.15, 0.35); s.bezierCurveTo(-1.15, 0.95, -0.5, 1.15, 0, 0.65);
  s.bezierCurveTo(0.5, 1.15, 1.15, 0.95, 1.15, 0.35); s.bezierCurveTo(1.15, -0.3, 0.25, -0.65, 0, -1);
  return shapeMesh(s, color, { e: color, ei: 0.35 });
}
export function star(color = 0xffd23f) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1.05, a = Math.PI / 2 + i * Math.PI / 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  return shapeMesh(s, color, { e: color, ei: 0.35 });
}
export function bolt(color = 0x7fd8ff) {
  const s = new THREE.Shape();
  const p = [[0.2, 1.2], [-0.6, -0.1], [-0.05, -0.1], [-0.3, -1.2], [0.6, 0.25], [0.05, 0.25], [0.45, 1.2]];
  p.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
  return shapeMesh(s, color, { e: color, ei: 0.4 });
}
export function question(color = 0xfff1d6) {
  const g = new THREE.Group();
  const m = mat(color, { e: color, ei: 0.25 });
  const arc = mesh(new THREE.TorusGeometry(0.55, 0.2, 6, 12, Math.PI * 1.35), m); arc.rotation.z = -Math.PI * 0.42; arc.position.y = 0.75; g.add(arc);
  const st = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 6), m); st.position.set(0, -0.05, 0); g.add(st);
  const d = mesh(new THREE.IcosahedronGeometry(0.24, 0), m); d.position.y = -0.75; g.add(d);
  return g;
}
export function dome(r = 3.2) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  const sh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8fe8ff, emissive: 0x4fc8ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.16, flatShading: true, depthWrite: false, side: THREE.DoubleSide }));
  const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.7 }));
  g.add(sh, ed); g.userData = { sh, ed };
  return g;
}
export function molecule(color = 0xffa040) {
  const g = new THREE.Group();
  const m = mat(color, { e: color, ei: 0.5 });
  const a = mesh(new THREE.IcosahedronGeometry(0.16, 1), m, false); g.add(a);
  const b = mesh(new THREE.IcosahedronGeometry(0.11, 1), m, false); b.position.set(0.22, 0.12, 0); g.add(b);
  const c = mesh(new THREE.IcosahedronGeometry(0.11, 1), m, false); c.position.set(-0.2, 0.15, 0.05); g.add(c);
  return g;
}
export function notebook() {
  const g = new THREE.Group();
  g.add(at(box(1.7, 0.06, 2.2, 0x2a3f6e), 0, 0.03, 0));
  g.add(at(box(1.58, 0.04, 2.08, 0xf7f3ea), 0, 0.08, 0));
  const lines = [];
  for (let i = 0; i < 7; i++) {
    const l = at(box(1.2, 0.012, 0.045, 0x3a3a58), -0.6, 0.105, -0.75 + i * 0.24);
    l.geometry.translate(0.6, 0, 0); l.castShadow = false; g.add(l); lines.push(l);
  }
  const pencil = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), mat(0xf2b632)); body.position.y = 0.55; pencil.add(body);
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.16, 6), mat(0xe8c9a0)); tip.rotation.x = Math.PI; tip.position.y = -0.08; pencil.add(tip);
  pencil.rotation.set(0.5, 0, -0.5);
  g.add(pencil);
  return { group: g, lines, pencil };
}
export function seesaw() {
  const g = new THREE.Group();
  const piv = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.6, 3), mat(0x5a4a7a)); piv.rotation.z = Math.PI / 2; piv.rotation.y = Math.PI / 2; piv.position.y = 0.3; g.add(piv);
  const plank = new THREE.Group(); plank.position.y = 0.72;
  plank.add(at(box(5.2, 0.16, 0.9, 0xd8c3a5), 0, 0, 0));
  g.add(plank);
  return { group: g, plank };
}
export function cinema() {
  const g = new THREE.Group();
  const fr = 0x15111f;
  g.add(at(box(7.2, 0.4, 0.3, fr), 0, 2.0, 0));
  g.add(at(box(7.2, 0.4, 0.3, fr), 0, -2.0, 0));
  g.add(at(box(0.4, 4.4, 0.3, fr), -3.4, 0, 0));
  g.add(at(box(0.4, 4.4, 0.3, fr), 3.4, 0, 0));
  return g;
}
export function seats(rows = 2, n = 7) {
  const g = new THREE.Group();
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const s = new THREE.Group();
    s.add(at(box(0.8, 0.2, 0.8, 0x8a1f2c), 0, 0.5, 0));
    s.add(at(box(0.8, 1.0, 0.18, 0x8a1f2c), 0, 1.0, 0.4));
    s.position.set((i - (n - 1) / 2) * 0.95, r * 0.4, r * 1.3);
    g.add(s);
  }
  return g;
}
export function bubble(r = 1) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, flatShading: true, depthWrite: false, emissive: 0xffffff, emissiveIntensity: 0.15 });
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); g.add(s);
  const dots = [];
  for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + i * 0.06, 1), mat(0xffffff, { e: 0xffffff, ei: 0.6 })); g.add(d); dots.push(d); }
  g.userData = { s, dots, m };
  return g;
}
export function shards(n = 60, colors = [0x6fbf73, 0xe8633a, 0xf2d7a8, 0x4a3842], seed = 9) {
  const R = rng(seed); const g = new THREE.Group(); const list = [];
  for (let i = 0; i < n; i++) {
    const s = 0.08 + R() * 0.22;
    const m = box(s, s, s, colors[Math.floor(R() * colors.length)]);
    m.userData = { p: V((R() - .5) * 3, R() * 2 - 0.8, (R() - .5) * 3), v: V((R() - .5) * 3, R() * 2.5, (R() - .5) * 3), r: V(R() * 6, R() * 6, R() * 6) };
    g.add(m); list.push(m);
  }
  g.userData.list = list;
  g.update = (k) => { for (const m of list) { const u = m.userData; m.position.copy(u.p).addScaledVector(u.v, k).add(V(0, -2.5 * k * k, 0)); m.rotation.set(u.r.x * k, u.r.y * k, u.r.z * k); m.scale.setScalar(Math.max(0.001, 1 - k * 0.8)); } };
  return g;
}
export function stars(n = 160, seed = 5, rad = 60) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = R() * Math.PI * 2, ph = R() * Math.PI * 0.45; pos.set([Math.sin(ph) * Math.cos(th) * rad, Math.cos(ph) * rad * 0.8 + 5, Math.sin(ph) * Math.sin(th) * rad], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8, fog: false });
  return new THREE.Points(geo, m);
}
export function setOpacity(obj, op) {
  obj.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (!m.userData.cloned) { } m.transparent = true; m.opacity = op; }); } });
}
export function cloneMats(obj) {
  obj.traverse(o => { if (o.material && !o.material.userData.cloned) { o.material = o.material.clone(); o.material.userData.cloned = true; } });
  return obj;
}
