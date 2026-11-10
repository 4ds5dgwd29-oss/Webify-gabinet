import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

// Free image generation through Pollinations.ai (no key needed).
// Keep this short: a long style suffix makes the generator drift away from the scene itself.
const STYLE = process.env.IMAGE_STYLE || "cinematic horror film still, dramatic low light, realistic photo, no text";

// visualStyle: optional per-story look (season, era, light) appended to every prompt so the
// pictures of one story belong together. seed: base seed shared by the story's images.
export async function sceneImages(scenes, outDir, { width, height, visualStyle = "", seed = 1 }) {
  const files = [];
  for (const [i, scene] of scenes.entries()) {
    const file = path.join(outDir, `scene-${String(i + 1).padStart(2, "0")}.jpg`);
    const prompt = [scene.image, visualStyle, STYLE].filter(Boolean).join(", ");
    const ok = scene.image ? await fetchImage(prompt, file, width, height, seed + i) : false;
    if (!ok) fallbackImage(file, width, height);
    files.push(file);
  }
  return files;
}

export async function singleImage(prompt, file, { width, height, visualStyle = "", seed = 1 }) {
  const ok = await fetchImage([prompt, visualStyle, STYLE].filter(Boolean).join(", "), file, width, height, seed);
  return ok ? file : null;
}

async function fetchImage(prompt, file, width, height, seed) {
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
