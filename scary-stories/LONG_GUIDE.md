# How to write a long video (instructions for the scheduled Claude session)

On **Monday, Wednesday and Friday at 14:00** the channel "Szepty po Północy" publishes a **horizontal
~10 minute** horror story (1920×1080) with chapters and a custom thumbnail.

`scary-stories/long/` is the queue: `001-slug.json`, `002-slug.json`, ... Each run, add **one** new story
(highest number + 1) and push it. The push starts `.github/workflows/long-scary-story.yml`, which publishes
the next unpublished long video.

## Format
```json
{
  "title": "Tytuł, max 70 znaków, z ciekawością | Straszna historia",
  "hook": "2-4 słowa",
  "thumbnail_text": "2-4 SŁOWA NA MINIATURCE, np. PACJENCI WCIĄŻ CZEKAJĄ",
  "thumbnail_image": "English prompt for the thumbnail picture: one striking, readable subject, high contrast",
  "visual_style": "English: shared look of all pictures (place, era, season, light)",
  "description": "Ciekawy opis w 3 akapitach (oddzielonych \\n\\n), bez zdradzania zakończenia: 1) hak i miejsce akcji, 2) jak narasta groza (bez puenty), 3) zachęta, np. 🕯️ Zgaś światło, załóż słuchawki...",
  "question": "Pytanie do widzów + emoji + Napisz w komentarzu 👇",
  "tags": ["10-15 tagów po polsku"],
  "chapters": [
    { "title": "Nazwa rozdziału", "scene": 0 },
    { "title": "...", "scene": 7 }
  ],
  "scenes": [
    { "text": "2-4 zdania lektora.", "image": "English prompt, one concrete subject" }
  ]
}
```

## Rules
- **Polish**, original, **950-1100 words** (about 10 minutes), **35-45 scenes** of 2-4 sentences each.
- Structure: hook in the first 2 sentences (why should the viewer stay?), then the setting, slow escalation
  with 2-3 scary set pieces, a reveal of the backstory (diary, old photo, a witness), a climax and a twist
  in the very last lines.
- **4-6 chapters**: the first must have `"scene": 0`, each chapter at least 10 seconds long, short titles.
- Image prompts follow the same rules as Shorts in `STORY_GUIDE.md` (literal, one subject, under 25 words,
  no style words, no text, no gore). Vary wide shots, close-ups of objects, interiors and exteriors.
- Description: write it like a book blurb that makes people click: concrete details from the story
  (place, year, one strange rule or object), a cliffhanger at the end of the second paragraph, never the twist.
  Chapters, the comment question, the channel line and hashtags are added automatically.
- Thumbnail: `thumbnail_text` max 4 words, intriguing, not a spoiler. `thumbnail_image` one clear subject
  that is readable at small size (a figure at the end of a corridor, a door ajar with light, a face in a window).
- Same content rules as Shorts: no gore for its own sake, nothing sexual, no real people or crimes, 13+.
- Must differ from every story in `scary-stories/long/`, `scary-stories/stories/` and `scary-stories/stories/sezonowe/`.
- Check the JSON is valid before pushing: `python3 -m json.tool < file.json`.
