import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
// Used once if the main model declines the request (stop_reason "refusal").
const FALLBACK_MODEL = process.env.CLAUDE_FALLBACK_MODEL || "claude-opus-5";

const StorySchema = z.object({
  title: z.string().describe("YouTube title, max 90 characters, intriguing, no clickbait lies"),
  hook: z.string().describe("One short line shown on the thumbnail, max 6 words"),
  story: z.string().describe("The full narration script, plain prose, no headings or stage directions"),
  description: z.string().describe("YouTube description, 2-4 sentences, no spoilers"),
  tags: z.array(z.string()).describe("8-15 YouTube tags"),
});

const SUBGENRES = [
  "folk horror in a remote village",
  "a haunted house told by the new owner",
  "a creepy encounter on a night shift job",
  "an urban legend that turns out to be real",
  "a cursed object bought second-hand",
  "a camping trip deep in the woods",
  "a strange neighbour who never sleeps",
  "a voicemail that should not exist",
  "a ghost ship or lighthouse at sea",
  "a babysitting job gone wrong",
  "a road trip on an empty highway at 3am",
  "a hospital or asylum after closing time",
  "a winter cabin cut off by snow",
  "a found journal from a missing hiker",
];

export async function generateStory({ history = [], language = "English", minutes = 8 }) {
  const client = new Anthropic();
  const words = Math.round(minutes * 150); // ~150 spoken words per minute
  const subgenre = SUBGENRES[Math.floor(Math.random() * SUBGENRES.length)];
  const recent = history.slice(-60).map((h) => `- ${h.title}`).join("\n") || "(none yet)";

  const system = `You write original scary stories for a faceless YouTube horror narration channel.
Write in ${language}. The script is read aloud by a text-to-speech voice, so write for the ear:
first person or close third person, short paragraphs, vivid sensory detail, slow-building dread,
and a memorable ending. No gore for its own sake, no real people or real crimes, nothing sexual,
and keep it suitable for a general teen+ YouTube audience. Do not include sound-effect cues,
headings, or text in brackets.`;

  const prompt = `Write a new, original scary story of about ${words} words.
Theme for today: ${subgenre}.
It must be clearly different from these titles already published on the channel:
${recent}`;

  for (const model of [MODEL, FALLBACK_MODEL]) {
    const stream = client.messages.stream({
      model,
      max_tokens: 32000,
      output_config: { effort: "medium", format: zodOutputFormat(StorySchema) },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      console.warn(`${model} declined (${message.stop_details?.category ?? "no category"}); trying fallback`);
      continue;
    }
    const text = message.content.find((b) => b.type === "text")?.text;
    if (!text) throw new Error(`No text in response (stop_reason: ${message.stop_reason})`);
    const parsed = StorySchema.parse(JSON.parse(text));
    return { ...parsed, subgenre, model };
  }
  throw new Error("Both models declined to write today's story");
}
