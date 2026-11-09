import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateStory } from "./generate-story.mjs";
import { narrate } from "./tts.mjs";
import { renderThumbnail, renderVideo } from "./render-video.mjs";
import { uploadVideo } from "./upload-youtube.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyFile = path.join(root, "history.json");
const upload = !process.argv.includes("--no-upload");

const day = new Date().toISOString().slice(0, 10);
const outDir = path.join(root, "out", day);
mkdirSync(outDir, { recursive: true });

const history = JSON.parse(readFileSync(historyFile, "utf8"));

console.log("1/4 Writing story...");
const story = await generateStory({
  history,
  language: process.env.STORY_LANGUAGE || "English",
  minutes: Number(process.env.STORY_MINUTES || 8),
});
writeFileSync(path.join(outDir, "story.json"), JSON.stringify(story, null, 2));
console.log(`    "${story.title}" (${story.story.split(/\s+/).length} words, ${story.model})`);

console.log("2/4 Narrating...");
const narration = await narrate(story.story, outDir);

console.log("3/4 Rendering video...");
const video = renderVideo({ title: story.title, story: story.story, narration, outDir });
const thumbnail = renderThumbnail({ hook: story.hook, outDir });
console.log(`    ${video.file} (${Math.round(video.seconds)}s)`);

let videoId = null;
if (upload) {
  console.log("4/4 Uploading to YouTube...");
  const footer = process.env.YOUTUBE_DESCRIPTION_FOOTER ??
    "\n\nNew scary story every day. Subscribe and turn on notifications if you dare.\n" +
    "This story is fiction. Script and narration were created with AI tools.\n\n#scarystories #horror #creepypasta";
  videoId = await uploadVideo({
    file: video.file,
    thumbnail,
    title: story.title,
    description: story.description + footer,
    tags: story.tags,
  });
} else {
  console.log("4/4 Skipping upload (--no-upload)");
}

// Only published stories count towards the "don't repeat" list.
if (upload) {
  history.push({ date: day, title: story.title, subgenre: story.subgenre, videoId });
  writeFileSync(historyFile, JSON.stringify(history, null, 2) + "\n");
}
