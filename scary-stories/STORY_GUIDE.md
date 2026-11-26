# How to write a Short (instructions for the scheduled Claude session)

The channel "Szepty po Północy" posts **YouTube Shorts**: vertical videos, 45-90 seconds, Polish narration,
an AI-generated picture behind each scene, word-by-word karaoke captions.

`scary-stories/stories/` is a **publishing queue**, numbered `001-slug.json`, `002-slug.json`, ...
Each run, add **one** new story at the end of the queue (highest number + 1, e.g. `031-latarnia.json`) and push it.
The push starts the GitHub Actions workflow, which publishes the **next unpublished** story from the queue
(not necessarily the one just added), so one Short goes out per run (6 a day).
`scary-stories/stories/sezonowe/` holds seasonal stories that are published by hand; never move or edit them.
Long 10-minute videos have their own guide: `LONG_GUIDE.md`.

## Format
```json
{
  "title": "Tytuł po polsku, max 60 znaków, budzi ciekawość (#shorts dodaje się automatycznie)",
  "hook": "2-4 słowa na czerwonym pasku w pierwszych sekundach, np. NIE OTWIERAJ DRZWI",
  "description": "1-2 zdania zachęty bez zdradzania zakończenia",
  "question": "Pytanie do widzów, np. Otworzyłbyś te drzwi? 🚪 Napisz w komentarzu 👇",
  "visual_style": "wspólny wygląd wszystkich obrazów tej historii, PO ANGIELSKU, np. snowy village, 1990s Poland, cold blue night",
  "tags": ["8-12 tagów po polsku"],
  "scenes": [
    { "text": "1-2 zdania czytane przez lektora.", "image": "English prompt: one concrete subject, what is on screen" }
  ]
}
```

## What makes a Short go viral (follow all of these)
1. **First sentence = hook.** The viewer decides in 1-2 seconds. Start in the middle of the action or with a
   shocking fact: "Każdej nocy o trzeciej ktoś puka do moich drzwi. Mieszkam na dziesiątym piętrze."
   Never start with an introduction ("Nazywam się...", "To było dawno temu...").
2. **Short and fast:** **110-170 words** in total (45-75 seconds). Short sentences, 5-10 words each.
3. **10-14 scenes**, each **1-2 sentences**, so the picture changes every 3-5 seconds.
4. **Escalate:** every scene adds new information or a new threat. No filler, no repetition.
5. **Twist in the last scene:** one short line that reframes the story. Ideally it makes the viewer want to
   rewatch the start (loop), e.g. it explains the hook in a new, worse way.
6. **Relatable Polish setting** (blok, wieś, PKP, las, Wigilia, babcia, działka, nocna zmiana) and first person.
7. Title and hook must create curiosity without spoiling the twist.

## Invent fresh ideas: rotate the format
Do not write the same kind of story twice in a row. Look at the last 5 stories in the queue and pick a
format that was not used recently. Invent new premises yourself; never reuse a premise, setting or twist.
1. **First-person encounter:** "Pracuję na nocnej zmianie w...", "Wynająłem mieszkanie, w którym..."
2. **Rules story:** "Jeśli dostaniesz pracę stróża w starym kinie, przestrzegaj tych zasad." Each scene is one rule; the last rule breaks the pattern.
3. **Polish folk legend retold:** strzygoń, mamuna, południca, utopiec, Czarna Wołga, Biała Dama. Tell it as a legend ("Mówi się, że...", "Na Kurpiach opowiadają..."), never as a documented fact.
4. **Messages:** the story told through SMS, voicemails or notes ("O trzeciej dostałem wiadomość od mamy. Mama nie żyje od roku.").
5. **POV "Ty":** second person, the viewer is the hero ("Wracasz nocnym autobusem. Kierowca nie ma twarzy.").
6. **Something is wrong at home:** small wrong details that escalate (an extra toothbrush, a new photo on the wall).
7. **Workplace of the night:** stacja benzynowa, szpital, ochrona parkingu, dyspozytor taksówek, kierowca TIR-a.

Never present an invented story as a true event or as news, and never name real people or real crimes.

## Rules for the image prompts (pictures must match the narration)
- **In English**, **one concrete subject** per prompt, described literally: who/what, where, light, framing.
  Good: "close up of a rusty padlock on an old wooden cellar door, flashlight beam".
  Bad: "the feeling of dread", "he realised the truth" (abstract, the generator cannot draw it).
- Describe only what is **visible**. Keep it **under 25 words**. The style is added automatically, so do not
  add style words (cinematic, 4k, horror style).
- Vary framing: wide shot, close-up of an object, interior, exterior, silhouette. Avoid faces in close-up
  (the generator makes them uncanny) unless the scene is about a face.
- `visual_style` keeps all pictures of one story consistent (season, era, place, light).
- No text or letters in the picture, no real people, no gore, nothing sexual.

## Rules for the text
- **Polish**, original, written to be **read aloud by a TTS voice**: no headings, brackets, emoji or
  sound-effect cues. Write numbers as words ("trzecia siedemnaście", not "3:17").
- No gore for its own sake, nothing sexual, no real people, no real crimes. Suitable for 13+.
- **Must differ** from every story already in `scary-stories/stories/`, `scary-stories/stories/sezonowe/`
  and `scary-stories/long/`: read their titles and avoid repeating the premise, setting or twist.
- Check the JSON is valid before pushing: `python3 -m json.tool < file.json`.
