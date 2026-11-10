import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

// Free image generation through Pollinations.ai (no key needed).
const STYLE =
  process.env.IMAGE_STYLE ||
  "dark cinematic horror photo, eerie atmosphere, moody low light, film grain, muted colors, realistic, no text, no watermark";

export async function sceneImages(scenes, outDir, { width, height }) {
  const files = [];
  for (const [i, scene] of scenes.entries()) {
    const file = path.join(outDir, `scene-${String(i + 1).padStart(2, "0")}.jpg`);
    const ok = scene.image ? await fetchImage(`${scene.image}, ${STYLE}`, file, width, height) : false;
    if (!ok) fallbackImage(file, width, height);
    files.push(file);
  }
  return files;
}

async function fetchImage(prompt, file, width, height) {
  const seed = Math.floor(Math.random() * 1e9);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&seed=${seed}${process.env.IMAGE_MODEL ? `&model=${process.env.IMAGE_MODEL}` : ""}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      const type = res.headers.get("content-type") || "";
      if (res.ok && type.startsWith("image/")) {
        writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        return true;
      }
      console.warn(`    image attempt ${attempt}: HTTP ${res.status} ${type}`);
    } catch (err) {
      console.warn(`    image attempt ${attempt}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  console.warn(`    using a dark placeholder for: ${prompt.slice(0, 60)}...`);
  return false;
}

function fallbackImage(file, width, height) {
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `color=c=0x0c0d11:s=${width}x${height}`,
    "-vf", "noise=alls=20:allf=u,vignette=PI/3",
    "-frames:v", "1", file,
  ]);
}
