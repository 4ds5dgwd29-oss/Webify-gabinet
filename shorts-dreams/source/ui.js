import { clamp, ss, eo, pop, W, H } from './engine.js';

const root = document.getElementById('ui');
const svg = document.getElementById('lines');
const pool = {}; let touched = new Set();
export function begin() { touched = new Set(); }
export function end() { for (const id in pool) if (!touched.has(id)) pool[id].style.display = 'none'; }
export function U(id, cls = '', parent = root, tag = 'div') {
  let e = pool[id];
  if (!e) { e = document.createElementNS(tag === 'svgline' || tag === 'circle' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag === 'svgline' ? 'line' : tag); if (cls) e.setAttribute('class', cls); (tag === 'svgline' || tag === 'circle' ? svg : parent).appendChild(e); pool[id] = e; }
  touched.add(id); e.style.display = ''; return e;
}
export function html(e, h) { if (e._h !== h) { e.innerHTML = h; e._h = h; } }
function place(e, x, y, op, extra = '') {
  e.style.opacity = op; e.style.transform = `translate(${x}px, ${y}px) ${extra}`;
}

// ---------- HUD (stage / state / clock) ----------
// keys: [{t, stage, state, clock, hot}]
export function hud(t, keys) {
  let k = keys[0]; let prev = null;
  for (const x of keys) if (t >= x.t) { prev = k; k = x; }
  const age = t - k.t;
  const tl = U('hud-tl', 'hud tl');
  const tr = U('hud-tr', 'hud tr');
  const chg = (a, b, f) => prev && a[f] !== b[f] && k.t > keys[0].t;
  const fs = chg(prev || {}, k, 'stage') ? eo(age / 0.45) : 1;
  const fa = chg(prev || {}, k, 'state') ? eo(age / 0.45) : 1;
  const fc = chg(prev || {}, k, 'clock') ? eo(age / 0.3) : 1;
  html(tl, `<div class="lbl">SLEEP STAGE</div><div class="stage" style="opacity:${fs};transform:translateY(${(1 - fs) * 18}px)">${k.stage}</div>`);
  html(tr, `<div class="lbl">YOU ARE</div><div class="state ${k.hot ? 'hot' : ''}" style="opacity:${fa};letter-spacing:${0.04 + (1 - fa) * 0.25}em">${k.state}</div><div class="lbl clk" style="opacity:${fc}">${k.clock}</div>`);
}

// ---------- title / chips ----------
export function title(id, t, a, b, top, main, sub) {
  const e = U(id, 'title');
  const k = ss(a, a + 0.5, t) * (1 - ss(b - 0.5, b, t));
  html(e, `<div class="tsub">${sub}</div><div class="tmain">${main}</div>`);
  e.style.top = top + 'px';
  e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * -20}px)`;
  if (k <= 0) e.style.display = 'none';
}
export function chip(id, t, a, b, x, y, text, cls = '') {
  const k = ss(a, a + 0.35, t) * (1 - ss(b - 0.35, b, t));
  const e = U(id, 'chip ' + cls); html(e, text);
  place(e, x, y + (1 - k) * 16, k);
  if (k <= 0) e.style.display = 'none';
  return e;
}
// meter: value 0..1
export function meter(id, t, a, b, x, y, w, label, value, color, valueText) {
  const k = ss(a, a + 0.4, t) * (1 - ss(b - 0.4, b, t));
  const e = U(id, 'panel meter');
  html(e, `<div class="row"><span class="lbl">${label}</span><span class="val" style="color:${color}"></span></div><div class="bar"><i></i></div>`);
  e.style.width = w + 'px';
  e.querySelector('.val').textContent = valueText ?? Math.round(value * 100) + '%';
  const i = e.querySelector('i'); i.style.width = clamp(value) * 100 + '%'; i.style.background = color; i.style.boxShadow = `0 0 18px ${color}`;
  place(e, x, y + (1 - k) * 20, k);
  if (k <= 0) e.style.display = 'none';
}
// list with checks: items [{text, at}]
export function checklist(id, t, a, b, x, y, w, head, items) {
  const k = ss(a, a + 0.4, t) * (1 - ss(b - 0.4, b, t));
  const e = U(id, 'panel check');
  html(e, `<div class="lbl head">${head}</div>` + items.map((it, i) => `<div class="it" data-i="${i}"><b></b><span>${it.text}</span></div>`).join(''));
  e.style.width = w + 'px';
  e.querySelectorAll('.it').forEach((el, i) => {
    const it = items[i]; const d = ss(it.at, it.at + 0.25, t);
    el.style.opacity = 0.35 + 0.65 * d;
    const bx = el.querySelector('b'); bx.style.background = d > 0.5 ? (it.color || '#7ff0b0') : 'transparent';
    bx.style.transform = `scale(${0.6 + 0.4 * pop(clamp((t - it.at) / 0.3))})`;
    bx.textContent = d > 0.5 ? (it.mark || '✓') : '';
  });
  place(e, x, y + (1 - k) * 20, k);
  if (k <= 0) e.style.display = 'none';
}
// callout: dot at (px,py) with leader line to label at (lx,ly)
export function callout(id, t, a, b, px, py, lx, ly, label, sub = '', color = '#ffffff') {
  const k = ss(a, a + 0.45, t) * (1 - ss(b - 0.35, b, t));
  const ln = U(id + '-l', 'lead', null, 'svgline');
  const draw = eo((t - a) / 0.5);
  const ex = px + (lx - px) * draw, ey = py + (ly - py) * draw;
  ln.setAttribute('x1', px); ln.setAttribute('y1', py); ln.setAttribute('x2', ex); ln.setAttribute('y2', ey);
  ln.style.opacity = k; ln.style.stroke = color;
  const dot = U(id + '-d', 'leaddot', null, 'circle');
  dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('r', 9 + 4 * Math.sin(t * 6)); dot.style.opacity = k; dot.style.fill = color;
  const e = U(id, 'callout');
  html(e, `<div class="cl">${label}</div>${sub ? `<div class="cs">${sub}</div>` : ''}`);
  e.style.borderColor = color;
  const kk = ss(a + 0.3, a + 0.7, t) * (1 - ss(b - 0.35, b, t));
  place(e, lx, ly, kk, 'translate(-50%, -50%)');
  if (k <= 0) { e.style.display = 'none'; ln.style.display = 'none'; dot.style.display = 'none'; }
}
export function progress(id, t, a, b, x, y, w, label, value, color, status, statusColor) {
  const k = ss(a, a + 0.4, t) * (1 - ss(b - 0.4, b, t));
  const e = U(id, 'panel prog');
  html(e, `<div class="row"><span class="lbl">${label}</span><span class="val"></span></div><div class="bar big"><i></i></div><div class="status"></div>`);
  e.style.width = w + 'px';
  e.querySelector('.val').textContent = Math.round(value * 100) + '%';
  const i = e.querySelector('i'); i.style.width = clamp(value) * 100 + '%'; i.style.background = color;
  const st = e.querySelector('.status'); st.textContent = status; st.style.color = statusColor;
  place(e, x, y + (1 - k) * 20, k);
  if (k <= 0) e.style.display = 'none';
  return e;
}

// ---------- subtitles ----------
export function buildCues(words, offset) {
  const cues = []; let cur = [];
  const len = a => a.map(w => w.text).join(' ').length;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]; cur.push(w);
    const txt = w.text; const L = len(cur);
    const next = words[i + 1];
    const endSent = /[.?!]$/.test(txt) && !/\.\.\.$/.test(txt);
    const comma = /[,:;]$/.test(txt) || /\.\.\.$/.test(txt);
    const gap = next ? next.start - w.end : 9;
    if (!next || endSent || L > 52 || (comma && L > 26) || (gap > 0.45 && L > 14)) { cues.push(cur); cur = []; }
  }
  if (cur.length) cues.push(cur);
  return cues.map((c, i) => {
    const s = c[0].start + offset - 0.12;
    const nx = cues[i + 1] ? cues[i + 1][0].start + offset - 0.12 : c[c.length - 1].end + offset + 1.2;
    const e = Math.min(nx, c[c.length - 1].end + offset + 1.2);
    return { s, e, words: c.map(w => ({ text: w.text, s: w.start + offset, e: w.end + offset })) };
  });
}
function lines(words) {
  const full = words.map(w => w.text).join(' ');
  if (full.length <= 24) return [words];
  let best = 1, bd = 1e9;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).map(w => w.text).join(' ').length, b = words.slice(i).map(w => w.text).join(' ').length;
    const d = Math.abs(a - b) + (a < b ? 0 : 2); if (d < bd) { bd = d; best = i; }
  }
  return [words.slice(0, best), words.slice(best)];
}
export function subs(t, cues) {
  const c = cues.find(c => t >= c.s && t < c.e);
  const e = U('sub', 'sub');
  if (!c) { e.style.opacity = 0; return; }
  const k = ss(c.s, c.s + 0.18, t) * (1 - ss(c.e - 0.15, c.e, t));
  const key = c.s;
  if (e._k !== key) {
    e._k = key;
    e.innerHTML = lines(c.words).map(l => '<div>' + l.map(w => `<span>${w.text}</span>`).join(' ') + '</div>').join('');
  }
  const spans = e.querySelectorAll('span');
  c.words.forEach((w, i) => { const d = ss(w.s - 0.05, w.s + 0.12, t); spans[i].style.opacity = 0.32 + 0.68 * d; });
  e.style.opacity = k; e.style.transform = `translate(-50%, ${(1 - k) * 14}px)`;
}
export function fade(op, color = '#05030f') {
  const e = U('fade', 'fade'); e.style.opacity = op; e.style.background = color;
}
