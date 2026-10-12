# Accent / similarity A/B (3 lines: st1_narrator_01, st4_story_01, st6_story_03)
Accent score = margin between the "us" and "england" scores from the SpeechBrain CommonAccent ECAPA model. Real Jason: +0.036 to +0.044. British game narrator (Kokoro / George): -0.011 / -0.032.
| option | accent margin (3 lines) | sim memo avg | sim held-out avg | Whisper | s/line |
|---|---|---|---|---|---|
| old round-3 IndexTTS (13.7 s ref + emotion vectors) | +0.006, -0.002 (Cheeseville lines) | — | — | — | — |
| IndexTTS plain, 26 s ref (15 s cap patched to 30) | +0.030, -0.003, +0.013 | 0.878 | 0.756 | 3/3 | 59–118 |
| IndexTTS very low emotion (calm .15, melancholic .05), 26 s ref | +0.029, +0.035, +0.007 | 0.871 | 0.749 | 3/3 | 69–82 |
| IndexTTS plain, 13.7 s ref | +0.017, +0.039, +0.032 | 0.877 | 0.759 | 3/3 | 37–61 |
| **CosyVoice 3 zero-shot, 26 s ref + transcript (chosen)** | **+0.033, +0.037, +0.038** | 0.846 | 0.743 | 3/3 | 34–40 |
