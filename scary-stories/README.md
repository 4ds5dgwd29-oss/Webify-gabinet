# Daily scary story videos for YouTube

A GitHub Actions job runs once a day and:

1. **Writes** a new original horror story (~8 minutes of narration) with Claude, avoiding titles already published (`history.json`).
2. **Narrates** it with text-to-speech: free Microsoft Edge voices by default, or ElevenLabs.
3. **Renders** a 1080p video with ffmpeg: dark grainy background, title card, burned-in captions, low ambient drone. It also makes a thumbnail.
4. **Uploads** it to your YouTube channel, marked as AI-generated (altered or synthetic content), and sets the thumbnail.

Workflow: `.github/workflows/daily-scary-story.yml`. Code: `src/`.

## One-time setup

### 1. Claude API key
Create a key at https://platform.claude.com and save it as the repository secret `ANTHROPIC_API_KEY`
(GitHub → Settings → Secrets and variables → Actions → New repository secret).

### 2. YouTube API access
1. In https://console.cloud.google.com create a project and enable **YouTube Data API v3**.
2. Go to **APIs & Services → OAuth consent screen**, choose *External*, fill in the app name, and add your own Google account as a **test user**. Then click **Publish app** (set it to *In production*). If it stays in *Testing*, the refresh token expires after 7 days.
3. Go to **Credentials → Create credentials → OAuth client ID → Desktop app**. Copy the client ID and secret.
4. On your own computer, in this folder:
   ```bash
   npm install
   YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npm run youtube-token
   ```
   Open the printed link, sign in with the account that owns the channel, and allow access. Google will warn that the app is unverified; click *Advanced → Go to app*, since it's your own app. The terminal prints a refresh token.
5. Save three repository secrets: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

> **Important: API uploads start out private-only.** YouTube locks every video uploaded from an *unaudited* API project to **private**. To publish automatically you need to submit the free [YouTube API Services audit form](https://support.google.com/youtube/contact/yt_api_form). Until it's approved, videos still upload every day but stay private, and you make them public by hand in YouTube Studio.
>
> Custom thumbnails also need a phone-verified channel: https://www.youtube.com/verify

### 3. Turn it on
The workflow only runs on its schedule once it's on the repository's **default branch**, so merge this branch first.
Then open **Actions → Daily scary story video → Run workflow** and untick *Upload* for a test render. The finished video is attached to the run as a downloadable artifact. When it looks good, leave it to run on its own. It runs every day at 18:17 UTC; change the `cron` line to pick another time.

## Optional settings
Set these under Settings → Secrets and variables → Actions → **Variables**:

| Variable | Default | What it does |
|---|---|---|
| `STORY_LANGUAGE` | `English` | Language of the story, e.g. `Polish` |
| `STORY_MINUTES` | `8` | Approximate narration length |
| `TTS_PROVIDER` | `edge` | `edge` (free) or `elevenlabs` (better voices, paid) |
| `EDGE_TTS_VOICE` | `en-US-ChristopherNeural` | Any voice from `edge-tts --list-voices`, e.g. `pl-PL-MarekNeural` |
| `ELEVENLABS_VOICE_ID` | – | Voice ID when using ElevenLabs. Also set the `ELEVENLABS_API_KEY` secret |
| `YOUTUBE_PRIVACY` | `public` | `public`, `unlisted` or `private` |
| `YOUTUBE_LANGUAGE` | `en` | Video language code |

If you change `STORY_LANGUAGE`, change `EDGE_TTS_VOICE` and `YOUTUBE_LANGUAGE` to match.

## Running locally
Needs Node 22+, ffmpeg and `pip install edge-tts`.
```bash
npm install
ANTHROPIC_API_KEY=... npm run dry-run   # renders out/<date>/video.mp4 without uploading
```

## Costs
- Claude: about $0.05–0.10 per story.
- Edge TTS, ffmpeg and GitHub Actions minutes for a public repo: free. A private repo uses about 5–10 of its free Actions minutes a day.
- ElevenLabs (optional): about 7–8k characters a day, so a paid plan.
