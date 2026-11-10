import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

// VIDEO_FORMAT=short (default): vertical 1080x1920 YouTube Shorts, max ~3 minutes.
// VIDEO_FORMAT=long: horizontal 1920x1080.
export const FORMATS = {
  short: { width: 1080, height: 1920, maxSeconds: 175, intro: 1.5, outro: 1.5, captionWords: [2, 5], fontSize: 84 },
  long: { width: 1920, height: 1080, maxSeconds: Infinity, intro: 3, outro: 3, captionWords: [6, 12], fontSize: 58 },
};
export const format = () => FORMATS[process.env.VIDEO_FORMAT || "short"] ?? FORMATS.short;

const FPS = 30;

export function audioDuration(file) {
  return parseFloat(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
      .toString()
      .trim(),
  );
}

/** scenes: [{ text }], images: one file per scene. */
export function renderVideo({ hook, title, scenes, images, narration, outDir }) {
  const f = format();
  const { width: W, height: H } = f;

  // Shorts must stay under 3 minutes: speed the voice up slightly if needed (max 1.25x).
  let narrationLen = audioDuration(narration);
  const budget = f.maxSeconds - f.intro - f.outro;
  const tempo = narrationLen > budget ? Math.min(narrationLen / budget, 1.25) : 1;
  narrationLen /= tempo;
  if (tempo > 1) console.log(`    speeding narration up ${tempo.toFixed(2)}x to fit the Shorts limit`);
  const total = f.intro + narrationLen + f.outro;

  // Each scene's picture stays on screen for as long as its text is being read.
  const weights = scenes.map((s) => s.text.length);
  const sum = weights.reduce((a, b) => a + b, 0);
  const durations = weights.map((w) => (narrationLen * w) / sum);
  durations[0] += f.intro;
  durations[durations.length - 1] += f.outro;

  const assFile = path.join(outDir, "captions.ass");
  writeFileSync(assFile, buildAss({ f, hook: hook || title, scenes, narrationLen, total }));

  const inputs = [];
  const chains = [];
  images.forEach((img, i) => {
    const d = durations[i];
    inputs.push("-loop", "1", "-framerate", String(FPS), "-t", d.toFixed(3), "-i", img);
    const frames = Math.ceil(d * FPS);
    const zoomIn = i % 2 === 0;
    const step = (0.15 / frames).toFixed(6);
    const z = zoomIn ? `min(1+${step}*on,1.15)` : `max(1.15-${step}*on,1)`;
    chains.push(
      // Crop off the generator's corner watermark, fill the frame, then a slow Ken Burns zoom.
      `[${i}:v]crop=iw:ih*0.93:0:0,scale=${W * 1.5}:${H * 1.5}:force_original_aspect_ratio=increase:flags=lanczos,` +
        `crop=${W * 1.5}:${H * 1.5},` +
        `zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},` +
        `eq=brightness=-0.04:contrast=1.12:saturation=0.85,` +
        `colorbalance=rs=-0.05:bs=0.07:rh=0.04:bh=-0.03,unsharp=5:5:0.7,setsar=1,` +
        `fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(d - 0.35, 0).toFixed(3)}:d=0.35[s${i}]`,
    );
  });
  const n = images.length;
  const a = n; // index of the first audio input
  const video =
    `${chains.join(";")};${images.map((_, i) => `[s${i}]`).join("")}concat=n=${n}:v=1:a=0,` +
    `noise=alls=5:allf=t,vignette=PI/4,subtitles='${escapeFilterPath(assFile)}'[v]`;
  const audio =
    `[${a}:a]lowpass=f=400,volume=0.3[noise];` +
    `[${a + 1}:a]volume=0.07[hum];` +
    `[${a + 2}:a]${tempo > 1 ? `atempo=${tempo.toFixed(4)},` : ""}adelay=${Math.round(f.intro * 1000)}:all=1[voice];` +
    `[noise][hum][voice]amix=inputs=3:duration=longest:normalize=0,` +
    `afade=t=in:d=1,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]`;

  const out = path.join(outDir, "video.mp4");
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-stats",
      ...inputs,
      "-f", "lavfi", "-i", `anoisesrc=color=brown:amplitude=0.2:d=${total.toFixed(2)}`,
      "-f", "lavfi", "-i", `sine=f=55:d=${total.toFixed(2)}`,
      "-i", narration,
      "-filter_complex", `${video};${audio}`,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "160k",
      "-t", total.toFixed(2), "-movflags", "+faststart",
      out,
    ],
    { stdio: "inherit" },
  );
  return { file: out, seconds: total };
}

/** Thumbnail: first scene image with the hook in big red letters. */
export function renderThumbnail({ hook, image, outDir }) {
  const f = format();
  const [W, H] = f === FORMATS.short ? [1080, 1920] : [1280, 720];
  const out = path.join(outDir, "thumbnail.jpg");
  const font = fontFile();
  const lines = wrap(hook.toUpperCase(), f === FORMATS.short ? 10 : 12);
  const size = f === FORMATS.short ? 130 : 112;
  const draws = lines.map((line, i) => {
    const y = `(h-${lines.length}*${size + 20})/2+${i}*${size + 20}`;
    return `drawtext=fontfile='${escapeFilterPath(font)}':text='${escapeDrawtext(line)}':` +
      `fontsize=${size}:fontcolor=0xe01b1b:borderw=8:bordercolor=black:x=(w-text_w)/2:y=${y}`;
  });
  const input = image ? ["-i", image] : ["-f", "lavfi", "-i", `color=c=0x050505:s=${W}x${H}`];
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", ...input,
    "-vf", [
      "crop=iw:ih*0.93:0:0",
      `scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`,
      "eq=brightness=-0.12", "vignette=PI/3", ...draws,
    ].join(","),
    "-frames:v", "1", "-q:v", "3", out,
  ]);
  return out;
}

function buildAss({ f, hook, scenes, narrationLen, total }) {
  const { width: W, height: H, fontSize, intro, outro } = f;
  const short = f === FORMATS.short;
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,${fontSize},&H0000D7FF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,${short ? 7 : 3},2,${short ? 5 : 2},90,90,${short ? 0 : 140},1
Style: Title,DejaVu Sans,${short ? 84 : 92},&H00FFFFFF,&H00FFFFFF,&H001B1BC8,&H001B1BC8,1,0,0,0,100,100,2,0,${short ? 3 : 1},${short ? 18 : 6},0,${short ? 8 : 5},80,80,${short ? 260 : 0},1
Style: Outro,DejaVu Sans,${short ? 80 : 92},&H00E6E6E6,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,5,0,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = [];
  // Hook at the top during the first seconds (Shorts) or a title card (long).
  events.push(`Dialogue: 0,${ts(0)},${ts(short ? intro + 2.5 : intro)},Title,,0,0,0,,{\\fad(300,400)}${assText(hook.toUpperCase())}`);

  // Captions: short word groups, timed in proportion to their length.
  const [minW, maxW] = f.captionWords;
  const words = scenes.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim().split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; ) {
    let j = i;
    while (j < words.length && (j - i < minW || (j - i < maxW && !/[.!?,;:…]$/.test(words[j - 1])))) j++;
    chunks.push(words.slice(i, j).join(" "));
    i = j;
  }
  const totalChars = chunks.reduce((s, c) => s + c.length + 4, 0);
  let t = intro;
  for (const c of chunks) {
    const d = (narrationLen * (c.length + 4)) / totalChars;
    // Short captions pop in slightly larger, then settle (Shorts style).
    const fx = short ? "{\\fscx110\\fscy110\\t(0,100,\\fscx100\\fscy100)}" : "";
    // Karaoke: each word turns gold while it is being read.
    const ws = c.split(" ");
    const wsum = ws.reduce((acc, w) => acc + w.length + 1, 0);
    const karaoke = ws.map((w) => `{\\k${Math.max(1, Math.round((d * 100 * (w.length + 1)) / wsum))}}${assText(w)}`).join(" ");
    events.push(`Dialogue: 0,${ts(t)},${ts(t + d)},Caption,,0,0,0,,${fx}${karaoke}`);
    t += d;
  }
  const outroText = process.env.OUTRO_TEXT || (short ? "Subskrybuj, jeśli się odważysz..." : "Śpij spokojnie...");
  events.push(`Dialogue: 0,${ts(total - outro)},${ts(total)},Outro,,0,0,0,,{\\fad(300,500)}${assText(outroText)}`);
  return header + events.join("\n") + "\n";
}

function ts(s) {
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
  return lines.slice(0, 4);
}
