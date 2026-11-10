# How to write the daily story (instructions for the scheduled Claude session)

The channel posts **YouTube Shorts**: vertical videos, under 3 minutes, with an AI-generated picture behind each scene.

`scary-stories/stories/` is a **publishing queue**, numbered `001-slug.json`, `002-slug.json`, ...
Every day, add **one** new story at the end of the queue (highest number + 1, e.g. `021-latarnia.json`) and push it.
The push starts the GitHub Actions workflow, which publishes the **next unpublished** story from the queue
(not necessarily the one just added), so exactly one Short goes out per day.
`scary-stories/stories/sezonowe/` holds seasonal stories that are published by hand; never move or edit them.

## Format
```json
{
  "title": "Tytuł po polsku, max 70 znaków (#shorts dodaje się automatycznie)",
  "hook": "2-4 słowa, pokazywane na górze ekranu w pierwszych sekundach",
  "description": "1-3 zdania zachęty bez zdradzania zakończenia",
  "tags": ["8-12 tagów po polsku"],
  "scenes": [
    { "text": "Zdania czytane przez lektora w tej scenie.", "image": "English image prompt for this scene" }
  ]
}
```

## Rules for the story
- **Polish**, original, **150-260 words in total** (the voice reads about 100 words per minute; the Short must stay under 3 minutes).
- **6-9 scenes**, each 1-4 sentences. The first scene must hook the viewer in the first sentence. The last scene is a short, chilling final line.
- Written to be **read aloud by a TTS voice**: simple sentences, no headings, no brackets, no emoji, no sound-effect cues. Write numbers as words.
- `image`: a concrete visual description **in English** of what is on screen in that scene (place, objects, light, framing). No text or words in the picture, no real people, no gore. Vary the shots: wide, close-up, interior, exterior. The visual style is added automatically.
- Prefer Polish settings: villages, blocks of flats (bloki), forests, PKP trains, old tenement houses, lakes in Masuria, the mountains, night shifts, Wigilia.
- No gore for its own sake, nothing sexual, no real people, no real crimes. Suitable for a general 13+ audience.
- **Must differ** from every story already in `scary-stories/stories/` and `scary-stories/stories/sezonowe/`: read their titles and avoid repeating the premise, setting, or twist.
- Check the JSON is valid before pushing: `python3 -m json.tool < file.json`.
