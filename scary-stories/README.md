# Codzienne straszne historie na YouTube

Wszystko działa za darmo:

1. **Claude pisze historię.** Zaplanowane zadanie Claude (w ramach Twojego planu Claude, bez płatnego klucza API) codziennie dodaje nowy plik `stories/RRRR-MM-DD.json` i wypycha go do repozytorium. Zasady pisania są w `STORY_GUIDE.md`.
2. **GitHub Actions robi film.** Nowy plik uruchamia workflow `.github/workflows/daily-scary-story.yml`. Darmowy polski lektor (`pl-PL-MarekNeural`) czyta historię, ffmpeg robi film 1080p z napisami, tłem i miniaturką.
3. **Film trafia na YouTube**, oznaczony jako treść stworzona z pomocą AI.

## Bez żadnej konfiguracji
Jeśli nie dodasz sekretów YouTube, workflow i tak zrobi film. Pobierzesz go z zakładki **Actions → wybrany przebieg → Artifacts** i wrzucisz ręcznie na YouTube.

## Automatyczny upload na YouTube (jednorazowo, za darmo)
1. W https://console.cloud.google.com utwórz projekt i włącz **YouTube Data API v3**.
2. **APIs & Services → OAuth consent screen**: wybierz *External*, dodaj swoje konto jako *Test user*, potem kliknij **Publish app** (inaczej token wygaśnie po 7 dniach).
3. **Credentials → Create credentials → OAuth client ID → Desktop app**. Skopiuj Client ID i Client secret.
4. Na swoim komputerze (Node.js 22+), w tym folderze:
   ```bash
   npm install
   YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npm run youtube-token
   ```
   Otwórz link, zaloguj się kontem z kanałem, kliknij *Advanced → Go to app*. Terminal wypisze refresh token.
5. Na GitHubie: **Settings → Secrets and variables → Actions → New repository secret**. Dodaj `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

> Filmy wrzucone przez nowy projekt API są **prywatne**, dopóki projekt nie przejdzie darmowego audytu: https://support.google.com/youtube/contact/yt_api_form. Do tego czasu upubliczniasz je ręcznie w YouTube Studio. Miniaturki wymagają kanału zweryfikowanego telefonem: https://www.youtube.com/verify

## Ręczne uruchomienie
**Actions → Daily scary story video → Run workflow.** Możesz wskazać plik historii i odznaczyć *Upload*, żeby tylko zrobić film.

## Ustawienia (Settings → Secrets and variables → Actions → Variables)
| Zmienna | Domyślnie | Opis |
|---|---|---|
| `EDGE_TTS_VOICE` | `pl-PL-MarekNeural` | Głos lektora, np. `pl-PL-ZofiaNeural` |
| `YOUTUBE_PRIVACY` | `public` | `public`, `unlisted` albo `private` |
| `TTS_PROVIDER` | `edge` | `elevenlabs` dla płatnych, lepszych głosów (wtedy też sekret `ELEVENLABS_API_KEY` i zmienna `ELEVENLABS_VOICE_ID`) |

## Opcjonalnie: pisanie przez Claude API
`node src/main.mjs` bez `--story` pisze historię przez płatne Claude API (sekret `ANTHROPIC_API_KEY`, około $0.05–0.10 za historię). Nie jest to potrzebne, gdy historie pisze zaplanowane zadanie.
