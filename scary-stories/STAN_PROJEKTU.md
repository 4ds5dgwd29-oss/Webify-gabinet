# Stan projektu: kanał „Szepty po Północy” (YouTube)

## Jak to działa (wszystko automatycznie i za darmo)
- **Shorty:** 6 dziennie (w pon/śr/pt 5, bo limit API to 6 uploadów na dobę).
  Godziny (czas polski): 07:43, 10:43, 12:43 (wt/czw/sob/nd), 16:43, 19:43, 21:43.
  Każde uruchomienie: Claude dopisuje nową historię do `scary-stories/stories/` i wypycha ją,
  a GitHub Actions publikuje **następną nieopublikowaną** historię z kolejki.
- **Długie filmy (~10 min):** pon/śr/pt. O 10:07 Claude dopisuje historię do `scary-stories/long/`,
  GitHub Actions robi film z miniaturką i rozdziałami, a YouTube publikuje go o **14:00**.
- **Styl:** kreskówkowe obrazy (Pollinations.ai), napisy po jednym słowie, głęboki głos Edge TTS
  `pl-PL-MarekNeural`, własna generowana muzyka (pozytywka + dron), dokładne czasy słów.
- Opublikowane filmy są zapisywane w `scary-stories/history.json`.

## Gdzie co jest
- Repozytorium: `github.com/4ds5dgwd29-oss/Webify-gabinet`, gałąź **`claude/daily-scary-story-videos-vb321d`**.
- Kod: `scary-stories/src/` (`main.mjs`, `render-video.mjs`, `images.mjs`, `tts.mjs`, `edge_tts_words.py`, `music.py`, `upload-youtube.mjs`).
- Workflowy: `.github/workflows/daily-scary-story.yml` (Shorty), `.github/workflows/long-scary-story.yml` (długie).
- Instrukcje pisania: `scary-stories/STORY_GUIDE.md` (Shorty), `scary-stories/LONG_GUIDE.md` (długie).
- Historie sezonowe (ręcznie): `scary-stories/stories/sezonowe/`.
- Grafiki i opis kanału: `scary-stories/branding/`.
- Sekrety GitHuba: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

## Uwagi
- Limit YouTube API: 10 000 punktów na dobę (od 09:00 czasu polskiego), upload = 1600, czyli 6 filmów.
  Większy limit: wniosek https://support.google.com/youtube/contact/yt_api_form
- Własne miniaturki (długie filmy) wymagają kanału zweryfikowanego telefonem: https://www.youtube.com/verify
- Pliki z dawnymi, już unieważnionymi kluczami leżą jeszcze na gałęzi `main` (do usunięcia).
- Nigdy nie wklejaj kluczy, haseł ani kodów na czat ani do plików w repozytorium.
