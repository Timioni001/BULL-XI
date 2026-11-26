# BULL-XI film

The 90-second demo film, made in code with [Remotion](https://www.remotion.dev). Everything here is free.

| Step | Command | Output |
|---|---|---|
| 1. Record the real app at iPhone size (3x, Chrome screencast) | `npm run clips` (app served locally, see the script header) | `public/clips/*.mp4` |
| 2. Narration (ElevenLabs free plan, about 1,000 characters) | `npm run voice` | `public/audio/vo/*.mp3`, `src/vo.json`, `src/timeline.json` |
| 3. Score, synthesised from scratch, mixed and ducked under the voice | `npm run music` | `public/audio/music.wav`, `public/audio/mix.wav` |
| 4. Preview and edit live | `npm run studio` | |
| 5. Render 1920x1080, loudness to -14 LUFS | `npm run render` | `out/bullxi-film.mp4` |

Set `REMOTION_BROWSER` (or pass `--browser-executable`) to a local Chromium if Remotion can't download its own.

Scenes live in `src/Film.tsx`; the iPhone frame, Dynamic Island, dotted audio orb, grain and type helpers in `src/parts.tsx`. Scene timing follows the narration (`scripts/timeline.mjs`), and on-screen words appear when they are spoken (`src/timing.ts`). The record list uses real signatures from `docs/devnet-runs/2026-11-24-e2e-v3.md`. The live gameweek clip is the app's demo replay, which the app labels as such.
