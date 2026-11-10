import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

// TTS_PROVIDER=edge (free, default) or elevenlabs (needs ELEVENLABS_API_KEY).
export async function narrate(text, outDir) {
  const provider = (process.env.TTS_PROVIDER || "edge").toLowerCase();
  const out = path.join(outDir, "narration.mp3");
  if (provider === "elevenlabs") await elevenLabs(text, outDir, out);
  else edgeTts(text, outDir, out);
  return out;
}

function edgeTts(text, outDir, out) {
  const voice = process.env.EDGE_TTS_VOICE || "pl-PL-MarekNeural";
  const rate = process.env.EDGE_TTS_RATE || "-8%";
  const pitch = process.env.EDGE_TTS_PITCH || "-4Hz";
  const textFile = path.join(outDir, "story.txt");
  writeFileSync(textFile, text);
  // edge-tts ignores HTTPS_PROXY unless it is passed explicitly.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  execFileSync(
    "edge-tts",
    [...(proxy ? ["--proxy", proxy] : []), "--voice", voice, `--rate=${rate}`, `--pitch=${pitch}`, "--file", textFile, "--write-media", out],
    { stdio: "inherit" },
  );
}

async function elevenLabs(text, outDir, out) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set");
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) throw new Error("Set ELEVENLABS_VOICE_ID (find it in your ElevenLabs voice library)");
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  const parts = [];
  for (const [i, chunk] of chunkText(text, 4000).entries()) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          text: chunk,
          model_id: model,
          voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.3 },
        }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    const file = path.join(outDir, `part-${i}.mp3`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    parts.push(file);
  }
  const list = path.join(outDir, "parts.txt");
  writeFileSync(list, parts.map((p) => `file '${path.resolve(p)}'`).join("\n"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
}

function chunkText(text, max) {
  const chunks = [];
  let cur = "";
  for (const para of text.split(/\n\s*\n/)) {
    if (cur && cur.length + para.length + 2 > max) {
      chunks.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n\n${para}` : para;
  }
  if (cur) chunks.push(cur);
  return chunks;
}
