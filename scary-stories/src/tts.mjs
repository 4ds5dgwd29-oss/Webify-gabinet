import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// TTS_PROVIDER=edge (free, default) or elevenlabs (needs ELEVENLABS_API_KEY).
// Returns { file, words }: words = [{ text, start, end }] in seconds (Edge only), else null.
export async function narrate(text, outDir, { short = true } = {}) {
  const provider = (process.env.TTS_PROVIDER || "edge").toLowerCase();
  const file = path.join(outDir, "narration.mp3");
  if (provider === "elevenlabs") {
    await elevenLabs(text, outDir, file);
    return { file, words: null };
  }
  return { file, words: edgeTts(text, outDir, file, short) };
}

function edgeTts(text, outDir, out, short) {
  const voice = process.env.EDGE_TTS_VOICE || "pl-PL-MarekNeural";
  // Shorts need a brisk pace to keep viewers; long videos can breathe a little more.
  const rate = process.env.EDGE_TTS_RATE || (short ? "+4%" : "-4%");
  // A lower pitch gives the deep "storyteller" voice of popular horror Shorts.
  const pitch = process.env.EDGE_TTS_PITCH || "-10Hz";
  const textFile = path.join(outDir, "story.txt");
  const wordsFile = path.join(outDir, "words.json");
  writeFileSync(textFile, text);
  // edge-tts does not read HTTPS_PROXY on its own, so pass it explicitly.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || "";
  const helper = path.join(path.dirname(fileURLToPath(import.meta.url)), "edge_tts_words.py");
  // The TTS service occasionally drops the end of a long text or restarts its timings.
  // Check that the narration covers the whole text with steadily rising timings; retry if not.
  const expected = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync("python3", [helper, textFile, out, wordsFile, voice, rate, pitch, proxy], { stdio: "inherit" });
      const words = JSON.parse(readFileSync(wordsFile, "utf8"));
      const monotonic = words.every((w, i) => i === 0 || w.start >= words[i - 1].start - 0.05);
      if (words.length >= expected * 0.95 && monotonic) return words;
      console.warn(`    narration incomplete (${words.length}/${expected} words, monotonic=${monotonic}), attempt ${attempt}/3`);
    } catch (err) {
      console.warn(`    narration failed: ${err.message.split("\n")[0]}, attempt ${attempt}/3`);
    }
  }
  throw new Error("Narration failed 3 times; not publishing an incomplete video");
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
