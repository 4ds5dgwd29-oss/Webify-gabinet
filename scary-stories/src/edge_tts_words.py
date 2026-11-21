"""Narrate a text with Edge TTS and save word timings.

Usage: python3 edge_tts_words.py TEXT_FILE OUT_MP3 OUT_WORDS_JSON VOICE RATE PITCH [PROXY]

Writes OUT_WORDS_JSON as [{"text": "...", "start": seconds, "end": seconds}, ...],
so captions and scene cuts can follow the narration exactly.
"""

import asyncio
import json
import sys

import edge_tts


async def main() -> None:
    text_file, out_mp3, out_words, voice, rate, pitch = sys.argv[1:7]
    proxy = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] else None
    with open(text_file, encoding="utf-8") as f:
        text = f.read()

    communicate = edge_tts.Communicate(
        text, voice, rate=rate, pitch=pitch, boundary="WordBoundary", proxy=proxy
    )
    words = []
    with open(out_mp3, "wb") as audio:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 10_000_000  # 100 ns units
                words.append(
                    {
                        "text": chunk["text"],
                        "start": round(start, 3),
                        "end": round(start + chunk["duration"] / 10_000_000, 3),
                    }
                )
    with open(out_words, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)


if __name__ == "__main__":
    asyncio.run(main())
