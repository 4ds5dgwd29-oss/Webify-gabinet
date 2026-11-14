# Dreams Shorts: source

Three.js scenes (low-poly 3D) rendered frame by frame in headless Chromium (Playwright), with the HUD and subtitles drawn in HTML.

1. `npm i` (three@0.160.0), then `python3 -m http.server 8765` in this folder
2. `node tools/cap.js <1|2|3> out/sN 30 0 99999` renders the frames
3. `tools/music.py` and `tools/sfx.py` generate the music and the sound effects. The voiceover is from ElevenLabs (voice "Udem"); `audio/w*.json` holds the word timings used for the subtitles.
4. Encode with ffmpeg: frames + mix → H.264 1080×1920 30 fps.
