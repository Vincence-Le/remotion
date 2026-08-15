/** Portfolio motion graphic @ 30fps, 16:9 */
export const VIDEO = {
  id: "PortfolioMotion",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 2150,
} as const;

/** Scene timeline (frames). Sum = VIDEO.durationInFrames. */
export const SCENES = {
  intro: { from: 0, durationInFrames: 2150 },
} as const;

/**
 * Shared Introduce timing (legacy Scene1 values). Scene1Test overrides
 * HOOK_CARD / INTRODUCE_START locally for beat-sync.
 */
export const HOOK_CARD_EXIT_START = 82;
export const HOOK_CARD_EXIT_END = 98;

/** "Introduce" starts flying in here, overlapping the card's fade-out. */
export const INTRODUCE_START = 73;
/** Fly-in-from-the-right duration. */
export const INTRODUCE_TRAVEL_FRAMES = 45;
/**
 * Shrink-and-rise + n8n logo start this many frames before the fly-in
 * fully ends, so the two beats overlap slightly.
 */
export const INTRODUCE_PHASE2_EARLY = 6;
/** Shrink-and-rise + n8n logo reveal duration. */
export const INTRODUCE_SPLIT_FRAMES = 45;

export const COLORS = {
  bg: "#0a0e17",
  bgAlt: "#111827",
  accent: "#38bdf8",
  accentSoft: "#7dd3fc",
  text: "#f8fafc",
  muted: "#94a3b8",
  glass: "rgba(255, 255, 255, 0.08)",
  glassBorder: "rgba(255, 255, 255, 0.18)",
} as const;
