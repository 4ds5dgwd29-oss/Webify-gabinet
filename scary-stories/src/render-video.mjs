import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// VIDEO_FORMAT=short (default): vertical 1080x1920 YouTube Shorts, under 3 minutes.
// VIDEO_FORMAT=long: horizontal 1920x1080, about 10 minutes, with chapters and a thumbnail.
export const FORMATS = {
  short: {
    width: 1080, height: 1920, fps: 30, zoomScale: 1.4, maxSeconds: 178,
    intro: 0.25, outro: 1.2, shotSeconds: 3.2, xfade: 0.25,
    captionWords: [1, 1], fontSize: 112,
  },
  long: {
    width: 1920, height: 1080, fps: 25, zoomScale: 1.25, maxSeconds: Infinity,
    intro: 3.5, outro: 4, shotSeconds: 7, xfade: 0.6,
    captionWords: [5, 10], fontSize: 62,
  },
};
export const format = () => FORMATS[process.env.VIDEO_FORMAT || "short"] ?? FORMATS.short;

export function audioDuration(file) {
  return parseFloat(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
      .toString()
      .trim(),
  );
}

/**
 * scenes: [{ text }], images: one file per scene, narration: { file, words }.
 * Returns { file, seconds, sceneStarts } (scene start times in the final video).
 */
export function renderVideo({ hook, title, scenes, images, narration, outDir }) {
  const f = format();
  const short = f === FORMATS.short;
  const { width: W, height: H, fps: FPS } = f;

  // Shorts must stay under 3 minutes: speed the voice up slightly if needed (max 1.25x).
  const rawLen = audioDuration(narration.file);
  const budget = f.maxSeconds - f.intro - f.outro;
  const tempo = rawLen > budget ? Math.min(rawLen / budget, 1.25) : 1;
  if (tempo > 1) console.log(`    speeding narration up ${tempo.toFixed(2)}x to fit the Shorts limit`);
  const narrationLen = rawLen / tempo;
  const total = f.intro + narrationLen + f.outro;

  // Word timings drive both the captions and the picture changes.
  const tokens = timeTokens(scenes, narration.words, rawLen).map((t) => ({
    ...t,
    start: f.intro + t.start / tempo,
    end: f.intro + t.end / tempo,
  }));
  const sceneStarts = scenes.map((_, i) => {
    if (i === 0) return 0;
    const first = tokens.find((t) => t.scene === i);
    return first ? first.start : 0;
  });
  for (let i = 1; i < sceneStarts.length; i++) sceneStarts[i] = Math.max(sceneStarts[i], sceneStarts[i - 1] + 0.5);
  const sceneEnds = sceneStarts.map((s, i) => (i + 1 < sceneStarts.length ? sceneStarts[i + 1] : total));

  // Each scene picture is shown as several "shots" with different camera moves, so the
  // image changes every few seconds (Shorts viewers swipe away from static frames).
  const shots = [];
  scenes.forEach((_, i) => {
    const d = sceneEnds[i] - sceneStarts[i];
    const n = Math.max(1, Math.round(d / f.shotSeconds));
    for (let k = 0; k < n; k++) {
      const finalPunch = i === scenes.length - 1 && k === n - 1;
      shots.push({ image: images[i], start: sceneStarts[i] + (d * k) / n, d: d / n, motion: finalPunch ? 4 : (i + k) % 4 });
    }
  });

  const assFile = path.join(outDir, "captions.ass");
  writeFileSync(assFile, buildAss({ f, short, hook, title, tokens, total }));

  const T = f.xfade;
  const inputs = [];
  const chains = [];
  shots.forEach((s, i) => {
    const clip = s.d + T; // each clip overlaps the next one by T for the crossfade
    const frames = Math.max(2, Math.ceil(clip * FPS));
    inputs.push("-loop", "1", "-framerate", String(FPS), "-t", clip.toFixed(3), "-i", s.image);
    const [z, x, y] = motion(s.motion, frames);
    const sw = Math.round(W * f.zoomScale);
    const sh = Math.round(H * f.zoomScale);
    chains.push(
      // Crop off the generator's corner watermark, fill the frame, then the camera move,
      // a cinematic colour grade (teal shadows, warm highlights) and a little sharpening.
      `[${i}:v]crop=iw:ih*0.93:0:0,scale=${sw}:${sh}:force_original_aspect_ratio=increase:flags=lanczos,crop=${sw}:${sh},` +
        `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${W}x${H}:fps=${FPS},` +
        `eq=brightness=-0.04:contrast=1.12:saturation=0.85,` +
        `colorbalance=rs=-0.05:bs=0.07:rh=0.04:bh=-0.03,unsharp=5:5:0.7,setsar=1,format=yuv420p[s${i}]`,
    );
  });
  // Crossfade chain: shot i fades in exactly at its scheduled start time.
  let last = "s0";
  for (let i = 1; i < shots.length; i++) {
    const out = `x${i}`;
    chains.push(`[${last}][s${i}]xfade=transition=fade:duration=${T}:offset=${shots[i].start.toFixed(3)}[${out}]`);
    last = out;
  }
  const video =
    `${chains.join(";")};[${last}]trim=duration=${total.toFixed(3)},` +
    `noise=alls=4:allf=t,vignette=PI/4.5,subtitles='${escapeFilterPath(assFile)}'[v]`;

  const a = shots.length; // index of the first audio input
  const lastScene = sceneStarts[sceneStarts.length - 1];
  const musicFile = path.join(outDir, "music.wav");
  const musicSeed = [...(title || "")].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 100000, 3);
  const audio =
    // Narrator: warmer, deeper and more even (bass lift + compression).
    `[${a + 2}:a]${tempo > 1 ? `atempo=${tempo.toFixed(4)},` : ""}adelay=${Math.round(f.intro * 1000)}:all=1,` +
    `equalizer=f=110:t=q:w=1.2:g=4,equalizer=f=3200:t=q:w=1.5:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.3,asplit=2[voice][key];` +
    // Original creepy music box + drone, ducked automatically while the narrator speaks.
    `[${a}:a]volume=${short ? 0.42 : 0.3}[music0];[music0][key]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=400[music];` +
    `[${a + 1}:a]lowpass=f=300,volume=0.12[noise];` +
    // A deep "boom" at the very start and when the final scene (the twist) begins.
    `[${a + 3}:a]asplit=2[b1][b2];[b1]volume=0.9[boom1];[b2]adelay=${Math.round(lastScene * 1000)}:all=1,volume=0.8[boom2];` +
    `[music][noise][voice][boom1][boom2]amix=inputs=5:duration=longest:normalize=0,` +
    `alimiter=limit=0.95,afade=t=out:st=${(total - 1).toFixed(2)}:d=1[a]`;

  const file = path.join(outDir, "video.mp4");
  execFileSync(
    "python3",
    [path.join(path.dirname(fileURLToPath(import.meta.url)), "music.py"), musicFile, total.toFixed(2), String(musicSeed)],
    { stdio: "inherit" },
  );
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-stats",
      ...inputs,
      "-i", musicFile,
      "-f", "lavfi", "-i", `anoisesrc=color=brown:amplitude=0.2:d=${total.toFixed(2)}`,
      "-i", narration.file,
      "-f", "lavfi", "-i", "aevalsrc=exprs='0.9*sin(2*PI*46*t)*exp(-3.2*t)+0.25*sin(2*PI*92*t)*exp(-5*t)':d=1.6:s=44100",
      "-filter_complex", `${video};${audio}`,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", short ? "22" : "23", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "160k",
      "-t", total.toFixed(2), "-movflags", "+faststart",
      file,
    ],
    { stdio: "inherit" },
  );
  return { file, seconds: total, sceneStarts };
}

/** Camera moves for zoompan: [zoom, x, y] expressions. F = frames in the shot. */
function motion(kind, F) {
  const p = `min(on/${F},1)`;
  const cx = "iw/2-(iw/zoom/2)";
  const cy = "ih/2-(ih/zoom/2)";
  switch (kind) {
    case 0: return [`1+0.12*${p}`, cx, cy]; // slow push in
    case 1: return ["1.2", `(iw-iw/zoom)*${p}`, cy]; // pan left to right
    case 2: return [`1.18-0.14*${p}`, cx, cy]; // pull out
    case 3: return ["1.22", cx, `(ih-ih/zoom)*(1-${p})`]; // tilt up
    default: return [`1+0.3*${p}*${p}`, cx, cy]; // final punch-in for the twist
  }
}

/**
 * Splits the scenes into words and gives each word a start/end time (seconds from the
 * start of the narration). Uses the TTS word timings when they line up with the text,
 * otherwise spreads the words over the narration in proportion to their length.
 */
function timeTokens(scenes, ttsWords, narrationLen) {
  const tokens = [];
  scenes.forEach((s, scene) => {
    for (const w of s.text.replace(/\s+/g, " ").trim().split(" ")) if (w) tokens.push({ text: w, scene });
  });
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

  if (ttsWords?.length) {
    // Align letter by letter: the TTS sometimes merges two words ("budynek z") or splits one,
    // so map every letter of the text to the TTS word it was spoken in.
    const ttsLetterWord = [];
    ttsWords.forEach((w, k) => {
      for (const _ of norm(w.text)) ttsLetterWord.push(k);
    });
    const textLetters = tokens.reduce((n, t) => n + [...norm(t.text)].length, 0);
    const ttsText = ttsWords.map((w) => norm(w.text)).join("");
    const ok = textLetters === ttsLetterWord.length && tokens.map((t) => norm(t.text)).join("") === ttsText;
    if (ok) {
      let pos = 0;
      for (const t of tokens) {
        const n = [...norm(t.text)].length;
        if (!n) continue; // punctuation-only token, timed below
        const first = ttsWords[ttsLetterWord[pos]];
        const last = ttsWords[ttsLetterWord[pos + n - 1]];
        // Two tokens spoken as one TTS word share its time span: split it by letters.
        const firstIdx = ttsLetterWord[pos];
        const lastIdx = ttsLetterWord[pos + n - 1];
        if (firstIdx === lastIdx) {
          const wordLetters = ttsLetterWord.filter((k) => k === firstIdx).length;
          const offset = pos - ttsLetterWord.indexOf(firstIdx);
          const dur = first.end - first.start;
          t.start = first.start + (dur * offset) / wordLetters;
          t.end = first.start + (dur * (offset + n)) / wordLetters;
        } else {
          t.start = first.start;
          t.end = last.end;
        }
        pos += n;
      }
      tokens.forEach((t, i) => {
        if (t.start === undefined) t.start = t.end = i ? tokens[i - 1].end : 0;
      });
      return tokens;
    }
    console.warn("    word timings did not match the text, using proportional timing");
  }
  const totalChars = tokens.reduce((s, t) => s + t.text.length + 1, 0);
  let t0 = 0;
  for (const t of tokens) {
    const d = (narrationLen * (t.text.length + 1)) / totalChars;
    t.start = t0;
    t.end = t0 + d;
    t0 += d;
  }
  return tokens;
}

function buildAss({ f, short, hook, title, tokens, total }) {
  const { width: W, height: H, fontSize, intro, outro } = f;
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,${fontSize},${short ? "&H00FFFFFF" : "&H0000D7FF"},&H00FFFFFF,&H00000000,&H96000000,1,${short ? 1 : 0},0,0,100,100,0,0,1,${short ? 9 : 4},${short ? 3 : 2},${short ? 5 : 2},90,90,${short ? 0 : 90},1
Style: Hook,DejaVu Sans,${short ? 84 : 72},&H00FFFFFF,&H00FFFFFF,&H001B1BC8,&H001B1BC8,1,0,0,0,100,100,2,0,3,18,0,8,80,80,${short ? 260 : 120},1
Style: Title,DejaVu Serif,${short ? 90 : 96},&H001B1BE0,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,6,0,5,120,120,0,1
Style: Outro,DejaVu Sans,${short ? 72 : 64},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,5,0,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = [];
  if (short) {
    // Hook in a red box at the top for the first seconds: the reason to keep watching.
    events.push(`Dialogue: 1,${ts(0)},${ts(2.8)},Hook,,0,0,0,,{\\fad(120,300)}${assText(hook.toUpperCase())}`);
  } else {
    events.push(`Dialogue: 1,${ts(0.3)},${ts(intro - 0.2)},Title,,0,0,0,,{\\fad(500,400)}${assText(title)}`);
  }

  // Captions: short word groups; each word turns gold exactly while it is being spoken.
  const [minW, maxW] = f.captionWords;
  for (let i = 0; i < tokens.length; ) {
    let j = i;
    while (j < tokens.length && (j - i < minW || (j - i < maxW && !/[.!?,;:…]$/.test(tokens[j - 1].text)))) {
      if (j > i && tokens[j].scene !== tokens[j - 1].scene) break; // never span two scenes
      j++;
    }
    const group = tokens.slice(i, j);
    const start = group[0].start;
    const end = j < tokens.length ? Math.max(tokens[j].start, group.at(-1).end) : group.at(-1).end + 0.4;
    // Shorts: one big word at a time (as in popular horror Shorts). Long: karaoke groups.
    const karaoke = short
      ? assText(group.map((t) => t.text).join(" ").toUpperCase().replace(/[.,;:!?…]+$/u, ""))
      : group
          .map((t, k) => {
            const next = k + 1 < group.length ? group[k + 1].start : end;
            return `{\\k${Math.max(1, Math.round((next - t.start) * 100))}}${assText(t.text)}`;
          })
          .join(" ");
    const pop = short ? "{\\fscx115\\fscy115\\t(0,80,\\fscx100\\fscy100)}" : "{\\fad(80,0)}";
    events.push(`Dialogue: 0,${ts(start)},${ts(end)},Caption,,0,0,0,,${pop}${karaoke}`);
    i = j;
  }
  const outroText = process.env.OUTRO_TEXT || "Subskrybuj, jeśli się odważysz...";
  events.push(`Dialogue: 1,${ts(total - outro)},${ts(total)},Outro,,0,0,0,,{\\fad(150,300)}${assText(outroText)}`);
  return header + events.join("\n") + "\n";
}

/** Thumbnail: a striking scene picture, dark gradient and 2 lines of huge text. */
export function renderThumbnail({ hook, image, outDir }) {
  const short = format() === FORMATS.short;
  const [W, H] = short ? [1080, 1920] : [1280, 720];
  const out = path.join(outDir, "thumbnail.jpg");
  const font = fontFile();
  const lines = wrap(hook.toUpperCase(), short ? 10 : 11).slice(0, 2);
  const size = short ? 140 : 118;
  const gap = short ? 24 : 22;
  const x = short ? "(w-text_w)/2" : "60";
  const top = `(h-${lines.length * (size + gap)})/2`;
  const draws = lines.map((line, i) =>
    `drawtext=fontfile='${escapeFilterPath(font)}':text='${escapeDrawtext(line)}':fontsize=${size}:` +
    `fontcolor=${i === lines.length - 1 ? "0xffd700" : "white"}:borderw=10:bordercolor=black:` +
    `x=${x}:y=${top}+${i * (size + gap)}`);
  const input = image ? ["-i", image] : ["-f", "lavfi", "-i", `color=c=0x050505:s=${W}x${H}`];
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", ...input,
    "-vf", [
      "crop=iw:ih*0.93:0:0",
      `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos`, `crop=${W}:${H}`,
      "eq=brightness=-0.05:contrast=1.2:saturation=1.1", "unsharp=5:5:0.8", "vignette=PI/3.5",
      ...(short ? [] : ["drawbox=x=0:y=0:w=iw*0.62:h=ih:color=black@0.35:t=fill", "drawbox=x=0:y=ih-14:w=iw:h=14:color=0xc81b1b:t=fill"]),
      ...draws,
    ].join(","),
    "-frames:v", "1", "-q:v", "2", out,
  ]);
  return out;
}

function ts(s) {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${sec}`;
}

const assText = (s) => s.replace(/[{}\\]/g, "").replace(/\n/g, " ");
const escapeFilterPath = (p) => path.resolve(p).replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
const escapeDrawtext = (s) => s.replace(/\\/g, "\\\\\\\\").replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/%/g, "\\%");

function fontFile() {
  try {
    return execFileSync("fc-match", ["-f", "%{file}", "DejaVu Sans:bold"]).toString().trim();
  } catch {
    return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  }
}

function wrap(text, width) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + " " + w).length > width) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}
