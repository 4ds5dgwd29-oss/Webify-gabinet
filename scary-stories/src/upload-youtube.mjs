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

export async function uploadVideo({ file, thumbnail, title, description, tags }) {
  const youtube = youtubeClient();
  const privacyStatus = process.env.YOUTUBE_PRIVACY || "public";

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: tags.slice(0, 30),
        categoryId: process.env.YOUTUBE_CATEGORY_ID || "24", // Entertainment
        defaultLanguage: process.env.YOUTUBE_LANGUAGE || "en",
      },
      status: {
        privacyStatus,
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
