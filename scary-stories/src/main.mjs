// Usage:
//   node src/main.mjs --next                             # next unpublished story from stories/ (queue)
//   node src/main.mjs --story stories/001-....json       # a specific story file
//   node src/main.mjs                                    # write the story with the Claude API (needs ANTHROPIC_API_KEY)
//   add --no-upload to only render the video
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { narrate } from "./tts.mjs";
import { format, FORMATS, renderThumbnail, renderVideo } from "./render-video.mjs";
import { sceneImages } from "./images.mjs";
import { uploadVideo } from "./upload-youtube.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyFile = path.join(root, "history.json");
const args = process.argv.slice(2);
let storyArg = args.includes("--story") ? args[args.indexOf("--story") + 1] : null;

const hasYouTube = Boolean(process.env.YOUTUBE_REFRESH_TOKEN);
const upload = !args.includes("--no-upload") && hasYouTube;
if (!args.includes("--no-upload") && !hasYouTube) {
  const missing = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"].filter((k) => !process.env[k]);
  const msg = `YouTube upload skipped: missing repository secrets ${missing.join(", ")}. Video is only rendered (see Artifacts).`;
  // "::warning::" shows up as a yellow annotation on the GitHub Actions run page.
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : msg);
}

const history = JSON.parse(readFileSync(historyFile, "utf8"));

// --next: publish the first story in stories/ (sorted by name) that is not on YouTube yet.
if (args.includes("--next")) {
  const published = new Set(history.filter((h) => h.videoId).map((h) => h.date));
  const queue = readdirSync(path.join(root, "stories"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .filter((f) => !published.has(path.basename(f, ".json")));
  if (!queue.length) {
    console.log("Queue is empty: every story is already on YouTube.");
    process.exit(0);
  }
  storyArg = path.join(root, "stories", queue[0]);
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
// Description: teaser, a question that invites comments, channel line, AI disclosure, hashtags.
const toTag = (t) => "#" + t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const hashtags = [...new Set(["#shorts", "#strasznehistorie", "#horror", ...story.tags.slice(0, 5).map(toTag)])]
  .filter((h) => h.length > 1)
  .slice(0, 8);
const question = story.question || "A Ty co byś zrobił na jego miejscu? Napisz w komentarzu 👇";
const description = process.env.YOUTUBE_DESCRIPTION_OVERRIDE ?? [
  story.description,
  question,
  "👻 Nowa straszna historia codziennie na kanale Szepty po Północy. Subskrybuj, jeśli się odważysz.\n" +
    "🎧 Najlepiej słuchać w słuchawkach, po zmroku.",
  "Ta historia jest fikcją. Tekst, obrazy i lektor zostały stworzone z pomocą AI.",
  hashtags.join(" "),
].join("\n\n");
const isShort = f === FORMATS.short;
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
