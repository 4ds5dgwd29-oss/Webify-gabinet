# Stan projektu: kanał „Szepty po Północy” (YouTube Shorts)

## Co to jest
Polski kanał YouTube z krótkimi strasznymi historiami (Shorts, pionowe 1080×1920, do 3 minut).
Wszystko jest darmowe:
- historie pisze Claude (codzienne zaplanowane zadanie o 19:43 czasu polskiego),
- obrazy: Pollinations.ai, lektor: Edge TTS `pl-PL-MarekNeural`, montaż: ffmpeg,
- render i upload robi GitHub Actions.

## Gdzie co jest
- Repozytorium: `github.com/4ds5dgwd29-oss/Webify-gabinet`, gałąź **`claude/daily-scary-story-videos-vb321d`** (nie `main`).
- Kod: `scary-stories/` (`src/main.mjs`, `src/images.mjs`, `src/tts.mjs`, `src/render-video.mjs`, `src/upload-youtube.mjs`).
- Workflow: `.github/workflows/daily-scary-story.yml`.
- **Kolejka publikacji:** `scary-stories/stories/001-…json` do `020-…json`. Każdy push pliku z historią uruchamia workflow, który publikuje **następną nieopublikowaną** historię (`node src/main.mjs --next`). Opublikowane są zapisywane w `scary-stories/history.json`.
- Historie sezonowe (publikowane ręcznie): `scary-stories/stories/sezonowe/` (pusty-talerz, kolednicy = grudzień; nagrobek = koniec października).
- Zasady pisania historii: `scary-stories/STORY_GUIDE.md`.
- Grafiki i opis kanału: `scary-stories/branding/` (`avatar.jpg`, `banner.jpg`, `KANAL.md`).

## Co działa
- Renderowanie filmów w GitHub Actions (zielone przebiegi).
- Codzienne zadanie Claude dopisuje nową historię na koniec kolejki.

## Czego brakuje: automatyczny upload na YouTube
Workflow potrzebuje 3 **sekretów repozytorium** (Settings → Secrets and variables → Actions → *Repository secrets*):
`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

⚠️ **Problem bezpieczeństwa:** przy pierwszej próbie te 3 wartości zostały dodane jako zwykłe **pliki** na gałęzi `main`
(`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` w katalogu głównym repozytorium). Trzeba je unieważnić i zrobić nowe.

## Kroki do zrobienia
1. Na https://myaccount.google.com/permissions usuń dostęp aplikacji z Google Cloud (stary token wyciekł).
2. Na https://console.cloud.google.com/auth/clients usuń starego klienta OAuth. Utwórz nowego: typ **Aplikacja internetowa**, URI przekierowania `https://developers.google.com/oauthplayground`.
   (Projekt w Google Cloud już istnieje, YouTube Data API v3 jest włączone, aplikacja jest opublikowana.)
3. Na https://developers.google.com/oauthplayground: ⚙️ → *Use your own OAuth credentials* (nowe ID i sekret) → zakres `https://www.googleapis.com/auth/youtube.upload` → *Authorize APIs* → zgoda kontem z kanałem → *Exchange authorization code for tokens* → skopiuj *Refresh token*.
4. Na https://github.com/4ds5dgwd29-oss/Webify-gabinet/settings/secrets/actions/new dodaj 3 sekrety (**Name** + **Secret** → *Add secret*). To muszą być sekrety, **nie pliki**.
5. Usuń 3 pliki z kluczami z gałęzi `main` (to porządek; ochroną jest krok 1).
6. Daj znać w rozmowie „Daily scary story videos” (sesja Code w chmurze): wtedy opublikuje się pierwsza rolka z kolejki i sprawdzimy wynik w zakładce Actions.

Nigdy nie wklejaj kluczy, haseł ani kodów na czat.

## Uwagi
- Nowy projekt API wgrywa filmy jako **prywatne**, dopóki nie przejdzie audytu: https://support.google.com/youtube/contact/yt_api_form. Do tego czasu każdy film trzeba ręcznie ustawić jako publiczny w YouTube Studio.
- Przy każdym filmie zaznaczone jest „Treści zmienione lub syntetyczne” (AI).
