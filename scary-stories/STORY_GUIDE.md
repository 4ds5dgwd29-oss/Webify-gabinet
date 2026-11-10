# How to write the daily story (instructions for the scheduled Claude session)

Every day, add **one** new file `scary-stories/stories/YYYY-MM-DD.json` (today's date, Europe/Warsaw) and push it.
Pushing the file starts the GitHub Actions workflow, which narrates it, renders the video and uploads it to YouTube.

## Format
```json
{
  "title": "Tytuł na YouTube, max 90 znaków, kończy się na: | Straszna historia",
  "hook": "3-5 słów na miniaturkę",
  "description": "2-4 zdania zachęty bez zdradzania zakończenia",
  "tags": ["8-15 tagów po polsku"],
  "story": "Pełny tekst do przeczytania przez lektora. Akapity oddzielone \n\n."
}
```

## Rules for the story
- **Polish**, original, 900–1300 words (about 6–9 minutes of narration).
- Written to be **read aloud by a TTS voice**: short paragraphs, simple sentences, no headings, no brackets, no sound-effect cues, no emoji. Write numbers as words.
- Slow-building dread, concrete sensory details, a strong twist or final line.
- Prefer Polish settings: villages, blocks of flats (bloki), forests, PKP trains, old tenement houses, lakes in Masuria, the mountains, night shifts, Wigilia.
- No gore for its own sake, nothing sexual, no real people, no real crimes, no real places that could be harmed by rumours. Suitable for a general 13+ audience.
- **Must differ** from every story already in `scary-stories/stories/`: read their titles and avoid repeating the premise, setting, or twist.
- Check the JSON is valid before pushing: `python3 -m json.tool < file.json`.
