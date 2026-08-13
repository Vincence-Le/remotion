# Portfolio Motion Graphic (Remotion)

60-second motion reel for web portfolio embeds — **1920×1080 · 30fps · 1800 frames**.

## Stack

- Remotion 4 + TypeScript
- Tailwind CSS v4 via `@remotion/tailwind-v4`
- Native Remotion `spring` / `interpolate` only (no CSS-in-JS, no WebGL)

## Scripts

```bash
npm run dev      # Remotion Studio
npm run build    # Bundle site
npm run lint     # ESLint + tsc
npx remotion render PortfolioMotion out/portfolio.mp4
```

## Structure

```
public/
  audio/          # background-music.mp3, sfx/*
  logos/          # logo.svg, mark.svg
src/
  components/     # Glass, Floating, Code/Prompt, MatchCut
  scenes/         # Short cuts stitched in Composition
  Composition.tsx # Sequence timeline
  Root.tsx        # Composition registration
  constants.ts    # Video + scene timing
```

## Scene timeline

| Scene        | Frames   | Seconds |
|--------------|----------|---------|
| Intro        | 0–150    | 0–5s    |
| Floating UI  | 150–450  | 5–15s   |
| Code / Prompt| 450–750  | 15–25s  |
| Match Cut    | 750–1050 | 25–35s  |
| Features     | 1050–1500| 35–50s  |
| Outro        | 1500–1800| 50–60s  |

Drop audio files into `public/audio/` and uncomment the `<Audio>` block in `src/Composition.tsx`.
