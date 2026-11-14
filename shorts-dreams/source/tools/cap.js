// usage: node cap.js short outdir fps from to   |  node cap.js short outdir preview t1,t2,...
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [s, out, a, b, c] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.log('PAGE', m.text()); });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(`http://localhost:8765/index.html?s=${s}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const dur = await page.evaluate(() => window.DURATION);
  let times = [];
  if (a === 'preview') times = b.split(',').map(Number).map((t, i) => [t, `p_${String(i).padStart(2, '0')}_${t}`]);
  else { const fps = +a; const total = Math.round(dur * fps); const from = +b, to = Math.min(+c, total); for (let i = from; i < to; i++) times.push([i / fps, String(i).padStart(5, '0')]); if (from === 0) console.log('TOTAL', total); }
  const t0 = Date.now();
  for (const [t, name] of times) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 92 });
  }
  console.log('done', times.length, 'frames', ((Date.now() - t0) / times.length).toFixed(0), 'ms/frame');
  await browser.close();
})();
