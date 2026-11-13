// Usage:
//   node src/main.mjs --next                             # next unpublished Short from stories/ (queue)
//   VIDEO_FORMAT=long node src/main.mjs --next --queue long   # next unpublished long video from long/
//   node src/main.mjs --story stories/001-....json       # a specific story file
//   node src/main.mjs                                    # write the story with the Claude API (needs ANTHROPIC_API_KEY)
//   add --no-upload to only render the video
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { narrate } from "./tts.mjs";
import { format, FORMATS, renderThumbnail, renderVideo } from "./render-video.mjs";
import { sceneImages, singleImage } from "./images.mjs";
import { uploadVideo } from "./upload-youtube.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyFile = path.join(root, "history.json");
const args = process.argv.slice(2);
let storyArg = args.includes("--story") ? args[args.indexOf("--story") + 1] : null;
const queueDir = args.includes("--queue") ? args[args.indexOf("--queue") + 1] : "stories";

const hasYouTube = Boolean(process.env.YOUTUBE_REFRESH_TOKEN);
const upload = !args.includes("--no-upload") && hasYouTube;
if (!args.includes("--no-upload") && !hasYouTube) {
  const missing = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"].filter((k) => !process.env[k]);
  const msg = `YouTube upload skipped: missing repository secrets ${missing.join(", ")}. Video is only rendered (see Artifacts).`;
  // "::warning::" shows up as a yellow annotation on the GitHub Actions run page.
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : msg);
}

const history = JSON.parse(readFileSync(historyFile, "utf8"));

// History key: "001-slug" for Shorts, "long/001-slug" for long videos.
const keyFor = (file) => {
  const dir = path.basename(path.dirname(path.resolve(file)));
  const stem = path.basename(file, ".json");
  return dir === "stories" ? stem : `${dir}/${stem}`;
};

// --next: publish the first story in the queue folder (sorted by name) that is not on YouTube yet.
if (args.includes("--next")) {
  const published = new Set(history.filter((h) => h.videoId).map((h) => h.date));
  const queue = readdirSync(path.join(root, queueDir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .filter((f) => !published.has(keyFor(path.join(root, queueDir, f))));
  if (!queue.length) {
    console.log("Queue is empty: every story is already on YouTube.");
    process.exit(0);
  }
  storyArg = path.join(root, queueDir, queue[0]);
  console.log(`Next in queue: ${queue[0]} (${queue.length} waiting)`);
}

let story;
if (storyArg) {
  console.log(`1/4 Reading story from ${storyArg}`);
  story = JSON.parse(readFileSync(path.resolve(storyArg), "utf8"));
  for (const key of ["title", "hook", "description", "tags"]) {
    if (!story[key]) throw new Error(`Story file is missing "${key}"`);
  }
  if (!story.scenes && !story.story) throw new Error('Story file needs "scenes" (or "story")');
} else {
  console.log("1/4 Writing story with the Claude API...");
  const { generateStory } = await import("./generate-story.mjs");
  story = await generateStory({
    history,
    language: process.env.STORY_LANGUAGE || "Polish",
    minutes: Number(process.env.STORY_MINUTES || 8),
  });
}
const day = storyArg ? keyFor(storyArg) : new Date().toISOString().slice(0, 10);
const outDir = path.join(root, "out", day.replace("/", "-"));
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "story.json"), JSON.stringify(story, null, 2));
// "scenes" = [{ text, image }]: the text is narrated, the image prompt becomes the picture behind it.
const scenes = story.scenes ?? [{ text: story.story, image: null }];
const fullText = scenes.map((s) => s.text.trim()).join("\n\n");
console.log(`    "${story.title}" (${fullText.split(/\s+/).length} words, ${scenes.length} scenes)`);

console.log("2/4 Narrating...");
const f = format();
const isShort = f === FORMATS.short;
const narration = await narrate(fullText, outDir, { short: isShort });

console.log("3/4 Generating images and rendering video...");
// Same base seed for every picture of a story keeps their look consistent.
const seed = [...story.title].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 1_000_000, 7);
const look = { width: f.width, height: f.height, visualStyle: story.visual_style || "", seed };
const images = await sceneImages(scenes, outDir, look);
const video = renderVideo({ hook: story.hook, title: story.title, scenes, images, narration, outDir });
let thumbImage = images[0];
if (!isShort && story.thumbnail_image) {
  thumbImage = (await singleImage(story.thumbnail_image, path.join(outDir, "thumb-src.jpg"), { ...look, width: 1280, height: 720 })) || images[0];
}
const thumbnail = renderThumbnail({ hook: story.thumbnail_text || story.hook, image: thumbImage, outDir });
console.log(`    ${video.file} (${Math.round(video.seconds)}s)`);

if (history.some((h) => h.date === day && h.videoId)) {
  console.log(`4/4 Story ${day} is already on YouTube, skipping upload`);
  process.exit(0);
}
if (!upload) {
  console.log("4/4 Skipping upload");
  process.exit(0);
}

console.log("4/4 Uploading to YouTube...");
// Description: teaser, a question that invites comments, channel line, AI disclosure, hashtags.
const toTag = (t) => "#" + t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const hashtags = [...new Set([...(isShort ? ["#shorts"] : []), "#strasznehistorie", "#horror", ...story.tags.slice(0, 5).map(toTag)])]
  .filter((h) => h.length > 1)
  .slice(0, 8);
const question = story.question || "A Ty co byś zrobił na jego miejscu? Napisz w komentarzu 👇";
// Long videos get chapters (YouTube needs the first at 0:00, at least 3, each 10 s or longer).
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
let chapters = "";
if (!isShort && story.chapters?.length >= 3) {
  const list = story.chapters.map((c, i) => ({ title: c.title, t: i === 0 ? 0 : video.sceneStarts[c.scene] ?? 0 }));
  if (list.every((c, i) => i === 0 || c.t - list[i - 1].t >= 10)) {
    chapters = "Rozdziały:\n" + list.map((c) => `${clock(c.t)} ${c.title}`).join("\n");
  }
}
const description = process.env.YOUTUBE_DESCRIPTION_OVERRIDE ?? [
  story.description,
  question,
  chapters,
  (isShort
    ? "👻 Nowe straszne historie codziennie na kanale Szepty po Północy. Subskrybuj, jeśli się odważysz.\n"
    : "👻 Nowa długa historia w poniedziałki, środy i piątki o 14:00, a codziennie krótkie historie w Shortach.\n") +
    "🎧 Najlepiej słuchać w słuchawkach, po zmroku.",
  "Ta historia jest fikcją. Tekst, obrazy i lektor zostały stworzone z pomocą AI.",
  hashtags.join(" "),
].filter(Boolean).join("\n\n");
const videoId = await uploadVideo({
  file: video.file,
  thumbnail: isShort ? null : thumbnail, // YouTube picks a frame for Shorts
  title: isShort && !/#shorts/i.test(story.title) ? `${story.title} #shorts` : story.title,
  description,
  tags: story.tags,
});

// Only published stories count towards the "don't repeat" list.
history.push({ date: day, title: story.title, videoId });
writeFileSync(historyFile, JSON.stringify(history, null, 2) + "\n");
