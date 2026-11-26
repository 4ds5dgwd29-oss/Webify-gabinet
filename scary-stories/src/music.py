"""Generate an original, copyright-free creepy background track (broken music box over a dark drone).

Usage: python3 music.py OUT_WAV SECONDS SEED

The seed picks the key, tempo and melody, so every story gets its own variation.
"""

import sys
import wave

import numpy as np

SR = 44100


def note_freq(semitones_from_a4: float) -> float:
    return 440.0 * 2 ** (semitones_from_a4 / 12)


def music_box_note(freq: float, length: float, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(int(SR * length)) / SR
    # Slightly out of tune, like an old, worn music box.
    f = freq * 2 ** (rng.normal(0, 12) / 1200)
    wobble = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
    phase = 2 * np.pi * f * np.cumsum(wobble) / SR
    tone = np.sin(phase) + 0.35 * np.sin(2.76 * phase) + 0.12 * np.sin(5.4 * phase)
    env = np.exp(-t * 3.2) * np.minimum(1, t * 400)
    return tone * env


def drone(seconds: float, root: float) -> np.ndarray:
    t = np.arange(int(SR * seconds)) / SR
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * t / 11.0)
    d = (
        np.sin(2 * np.pi * root * t)
        + 0.6 * np.sin(2 * np.pi * root * 1.003 * t)
        + 0.35 * np.sin(2 * np.pi * root * 1.5 * t)  # fifth
        + 0.15 * np.sin(2 * np.pi * root * 1.189 * t)  # minor third, dissonant shimmer
    )
    return d * swell


def reverb(x: np.ndarray, seconds: float = 1.8, mix: float = 0.45) -> np.ndarray:
    rng = np.random.default_rng(1)
    n = int(SR * seconds)
    ir = rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR * 4.0)
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    dry = x / (np.max(np.abs(x)) + 1e-9)
    return (1 - mix) * dry + mix * wet


def main() -> None:
    out, seconds, seed = sys.argv[1], float(sys.argv[2]), int(sys.argv[3])
    rng = np.random.default_rng(seed)
    key = int(rng.choice([0, -2, -4, 3]))  # A, G, F, C minor
    beat = float(rng.choice([0.42, 0.48, 0.55]))
    melodies = [
        [0, 3, 7, 12, 10, 7, 3, 2, 0, None, -5, None],
        [12, 10, 7, 8, 7, 3, None, 2, 3, 0, None, None],
        [0, 7, 3, 7, 0, 8, 7, None, 5, 3, 2, None],
    ]
    melody = melodies[int(rng.integers(len(melodies)))]

    total = int(SR * seconds)
    box = np.zeros(total + SR * 3)
    pos, i = 0.0, 0
    while pos < seconds:
        semis = melody[i % len(melody)]
        # Every few bars the box "skips" a note, which makes it more unsettling.
        if semis is not None and rng.random() > 0.08:
            s = int(pos * SR)
            n = music_box_note(note_freq(key + semis), 1.6, rng)
            box[s : s + len(n)] += n
        pos += beat
        i += 1
    box = box[:total]

    track = 0.55 * reverb(box) + 0.45 * drone(seconds, note_freq(key - 36)) / 2.1
    t = np.arange(total) / SR
    fade = np.minimum(1, t / 2.0) * np.minimum(1, (seconds - t) / 2.5)
    track = track * fade
    track /= np.max(np.abs(track)) + 1e-9
    pcm = (track * 0.9 * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
