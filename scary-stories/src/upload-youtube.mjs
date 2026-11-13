import { createReadStream } from "node:fs";
import { google } from "googleapis";

export function youtubeClient() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN");
  }
  const auth = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  return google.youtube({ version: "v3", auth });
}

// PUBLISH_AT_LOCAL="14:00": upload as private and let YouTube publish it today at that time
// (Europe/Warsaw). If that time has already passed, the video goes public right away.
function scheduledPublishAt() {
  const hhmm = process.env.PUBLISH_AT_LOCAL;
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(":").map(Number);
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const asUtc = new Date(`${day}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
  const warsawHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(asUtc));
  const offsetHours = (warsawHour - asUtc.getUTCHours() + 24) % 24; // 1 in winter, 2 in summer
  const at = new Date(asUtc.getTime() - offsetHours * 3600_000);
  return at.getTime() - now.getTime() > 5 * 60_000 ? at.toISOString() : null;
}

export async function uploadVideo({ file, thumbnail, title, description, tags }) {
  const youtube = youtubeClient();
  const publishAt = scheduledPublishAt();
  const privacyStatus = publishAt ? "private" : process.env.YOUTUBE_PRIVACY || "public";
  if (publishAt) console.log(`    scheduled to go public at ${publishAt}`);

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: tags.slice(0, 30),
        categoryId: process.env.YOUTUBE_CATEGORY_ID || "24", // Entertainment
        defaultLanguage: process.env.YOUTUBE_LANGUAGE || "pl",
      },
      status: {
        privacyStatus,
        ...(publishAt ? { publishAt } : {}),
        selfDeclaredMadeForKids: false,
        // Narration and script are AI-generated: YouTube asks creators to disclose this.
        containsSyntheticMedia: true,
      },
    },
    media: { body: createReadStream(file) },
  });
  const videoId = res.data.id;
  console.log(`Uploaded: https://youtu.be/${videoId} (${res.data.status?.privacyStatus})`);

  if (thumbnail) {
    try {
      await youtube.thumbnails.set({ videoId, media: { body: createReadStream(thumbnail) } });
    } catch (err) {
      // Custom thumbnails need a phone-verified channel; the upload itself still succeeded.
      console.warn(`Thumbnail not set: ${err.message}`);
    }
  }
  return videoId;
}
