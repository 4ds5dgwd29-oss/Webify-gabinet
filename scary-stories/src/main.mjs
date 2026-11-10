// Usage:
//   node src/main.mjs --story stories/2026-11-10.json   # story written ahead of time (free)
//   node src/main.mjs                                    # write the story with the Claude API (needs ANTHROPIC_API_KEY)
//   add --no-upload to only render the video
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { narrate } from "./tts.mjs";
import { format, FORMATS, renderThumbnail, renderVideo } from "./render-video.mjs";
import { sceneImages } from "./images.mjs";
import { uploadVideo } from "./upload-youtube.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyFile = path.join(root, "history.json");
const args = process.argv.slice(2);
const storyArg = args.includes("--story") ? args[args.indexOf("--story") + 1] : null;

const hasYouTube = Boolean(process.env.YOUTUBE_REFRESH_TOKEN);
const upload = !args.includes("--no-upload") && hasYouTube;
if (!args.includes("--no-upload") && !hasYouTube) {
  console.warn("YouTube secrets not set: rendering only. Download the video from the run's artifacts.");
}

const history = JSON.parse(readFileSync(historyFile, "utf8"));

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
const day = storyArg ? path.basename(storyArg, ".json") : new Date().toISOString().slice(0, 10);
const outDir = path.join(root, "out", day);
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "story.json"), JSON.stringify(story, null, 2));
// "scenes" = [{ text, image }]: the text is narrated, the image prompt becomes the picture behind it.
const scenes = story.scenes ?? [{ text: story.story, image: null }];
const fullText = scenes.map((s) => s.text.trim()).join("\n\n");
console.log(`    "${story.title}" (${fullText.split(/\s+/).length} words, ${scenes.length} scenes)`);

console.log("2/4 Narrating...");
const narration = await narrate(fullText, outDir);

console.log("3/4 Generating images and rendering video...");
const f = format();
const images = await sceneImages(scenes, outDir, { width: f.width, height: f.height });
const video = renderVideo({ hook: story.hook, title: story.title, scenes, images, narration, outDir });
const thumbnail = renderThumbnail({ hook: story.hook, image: images[0], outDir });
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
const footer = process.env.YOUTUBE_DESCRIPTION_FOOTER ??
  "\n\nNowa straszna historia codziennie. Subskrybuj, jeśli się odważysz.\n" +
  "Ta historia jest fikcją. Tekst i lektor zostały stworzone z pomocą AI.\n\n" +
  "#shorts #strasznehistorie #horror #creepypasta";
const isShort = f === FORMATS.short;
const videoId = await uploadVideo({
  file: video.file,
  thumbnail: isShort ? null : thumbnail, // YouTube picks a frame for Shorts
  title: isShort && !/#shorts/i.test(story.title) ? `${story.title} #shorts` : story.title,
  description: story.description + footer,
  tags: story.tags,
});

// Only published stories count towards the "don't repeat" list.
history.push({ date: day, title: story.title, videoId });
writeFileSync(historyFile, JSON.stringify(history, null, 2) + "\n");
