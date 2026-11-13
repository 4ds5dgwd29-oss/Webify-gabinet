// One-time helper: run on your own computer to get a YouTube refresh token.
//   YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npm run youtube-token
// Then sign in with the Google account that owns the channel and copy the printed token
// into the YOUTUBE_REFRESH_TOKEN repository secret.
import http from "node:http";
import { google } from "googleapis";

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET } = process.env;
if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
  console.error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first.");
  process.exit(1);
}
const PORT = 5555;
const redirect = `http://localhost:${PORT}/callback`;
const auth = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, redirect);
const url = auth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/youtube.upload"],
});

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get("code");
  if (!code) return res.end("Waiting for Google sign-in...");
  try {
    const { tokens } = await auth.getToken(code);
    res.end("Done. You can close this tab and go back to the terminal.");
    console.log("\nYOUTUBE_REFRESH_TOKEN =\n" + tokens.refresh_token + "\n");
  } catch (err) {
    res.end("Failed: " + err.message);
    console.error(err);
  } finally {
    server.close();
  }
});
server.listen(PORT, () => console.log(`Open this URL in your browser:\n\n${url}\n`));
