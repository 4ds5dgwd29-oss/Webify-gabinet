import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const INTRO = 3; // seconds of title card before narration starts
const OUTRO = 3;

export function audioDuration(file) {
  return parseFloat(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
      .toString()
      .trim(),
  );
}

export function renderVideo({ title, story, narration, outDir }) {
  const narrationLen = audioDuration(narration);
  const total = INTRO + narrationLen + OUTRO;
  const assFile = path.join(outDir, "captions.ass");
  writeFileSync(assFile, buildAss(title, story, narrationLen, total));

  const out = path.join(outDir, "video.mp4");
  const video =
    // Dark grainy background with a slow flicker and vignette, then captions.
    `[0:v]noise=alls=6:allf=t,eq=brightness='-0.02+0.015*sin(t*1.7)*sin(t*0.37)',` +
    `vignette=PI/3.5,subtitles='${escapeFilterPath(assFile)}'[v]`;
  const audio =
    // Low brown-noise drone + 55 Hz hum under the narration.
    `[1:a]lowpass=f=400,volume=0.35[noise];` +
    `[2:a]volume=0.08[hum];` +
    `[3:a]adelay=${INTRO * 1000}:all=1,volume=1.0[voice];` +
    `[noise][hum][voice]amix=inputs=3:duration=longest:normalize=0,` +
    `afade=t=in:d=2,afade=t=out:st=${(total - 2).toFixed(2)}:d=2[a]`;

  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-stats",
      "-f", "lavfi", "-i", `color=c=0x0c0d11:s=1920x1080:r=15:d=${total.toFixed(2)}`,
      "-f", "lavfi", "-i", `anoisesrc=color=brown:amplitude=0.2:d=${total.toFixed(2)}`,
      "-f", "lavfi", "-i", `sine=f=55:d=${total.toFixed(2)}`,
      "-i", narration,
      "-filter_complex", `${video};${audio}`,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "30", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k",
      "-t", total.toFixed(2), "-movflags", "+faststart",
      out,
    ],
    { stdio: "inherit" },
  );
  return { file: out, seconds: total };
}

export function renderThumbnail({ hook, outDir }) {
  const out = path.join(outDir, "thumbnail.jpg");
  const font = fontFile();
  const lines = wrap(hook.toUpperCase(), 12);
  const draws = lines.map((line, i) => {
    const y = `(h-${lines.length}*130)/2+${i}*130`;
    return `drawtext=fontfile='${escapeFilterPath(font)}':text='${escapeDrawtext(line)}':` +
      `fontsize=112:fontcolor=0xd11a1a:borderw=6:bordercolor=black:x=(w-text_w)/2:y=${y}`;
  });
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=c=0x050505:s=1280x720",
    "-vf", ["noise=alls=25:allf=u", "vignette=PI/3", ...draws].join(","),
    "-frames:v", "1", "-q:v", "3", out,
  ]);
  return out;
}

function buildAss(title, story, narrationLen, total) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,58,&H00E6E6E6,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,3,1,2,160,160,140,1
Style: Title,DejaVu Sans,92,&H001A1AD1,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,5,0,5,120,120,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = [`Dialogue: 0,${ts(0)},${ts(INTRO)},Title,,0,0,0,,{\\fad(600,500)}${assText(title)}`];

  // Captions: ~10-word chunks, timed in proportion to their length.
  const words = story.replace(/\s+/g, " ").trim().split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; ) {
    let j = i;
    let len = 0;
    while (j < words.length && (j - i < 6 || (j - i < 12 && !/[.!?,;:]$/.test(words[j - 1])))) {
      len += words[j].length;
      j++;
    }
    chunks.push(words.slice(i, j).join(" "));
    i = j;
  }
  const totalChars = chunks.reduce((s, c) => s + c.length + 4, 0);
  let t = INTRO;
  for (const c of chunks) {
    const d = (narrationLen * (c.length + 4)) / totalChars;
    events.push(`Dialogue: 0,${ts(t)},${ts(t + d)},Caption,,0,0,0,,${assText(c)}`);
    t += d;
  }
  events.push(`Dialogue: 0,${ts(total - OUTRO + 0.3)},${ts(total)},Title,,0,0,0,,{\\fad(400,800)}${assText(process.env.OUTRO_TEXT || "Śpij spokojnie...")}`);
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
  return lines.slice(0, 3);
}
