# Stage 7 status: Rhuidean and the Aiel Waste

Playable end to end behind `?s7=1` (e.g. `?stage=7&s7=1`). Not enabled by default:
the T15 flip waits on Jason's playtest sign-off.

- Gameplay complete per `docs/STAGE7-PLAN.md`: 4 zones (Chaendaer, Imre Stand/Waste,
  Rhuidean streets, glass-column plaza), Shaido dancer + veiled archer (they yield),
  reused fadelt, sandstorm, waking street, Asmodean in 3 phases (96 BPM note phrases
  with a guaranteed free band and a reflectable gold note, column resonance, the
  interruptible access-key channel), beaten and bound at the end.
- Call-ins are Moiraine and Lan (`callInFor(7) === 'moilan'`): one shared charge,
  `pickHelper` chooses Moiraine / Lan / duo, HUD slot shows the predicted helper.
  Stages 1–5 keep Loial, Stage 6 keeps Rand.
- Art: code-drawn stand-ins for every Stage 7 key, plus reused `s6fade`/`s6streak`.
  Painted art, voice mp3s, Stage 7 music loops and all cutscene clips are still to
  come — see `docs/STAGE7-ASSETS-NEEDED.md`. Stage 6 music loops stand in meanwhile.
- Bot: campaign clears 9/9 seeds with and without the call-in (aggregate boss-time
  ratio 0.91), 250 ms lag bot 9/9. See `docs/STAGE7-MUSE-REPORT.md` for the table.
- Budgets: pre-fight gate 24,948,767 / 25,000,000 bytes (51,233 spare); Stage 7
  source 132,118 / 196,608; estimated boss-peak textures ≈71.6 MiB (gate 105).
- Browser hardening (`tools/stage7/browser-hardening.mjs`) is written but not yet run:
  it needs Playwright and a static server, neither available in the build session.
