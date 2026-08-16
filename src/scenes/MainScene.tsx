import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { measureText } from "@remotion/layout-utils";
import {
  COLORS,
  INTRODUCE_PHASE2_EARLY,
  INTRODUCE_SPLIT_FRAMES,
  INTRODUCE_TRAVEL_FRAMES,
  VIDEO,
} from "../constants";
import {
  DRIVE_START,
  DRIVE_MORPH_START,
  DRIVE_MORPH_DURATION,
  DRIVE_NODE_POP_START,
  DRIVE_NODE_SIZE,
  DRIVE_NODE_X_RATIO,
  DriveIntegrationScene,
} from "../drive_scene/DriveIntegrationScene";
import {
  TELEGRAM_SLIDE_START,
  TELEGRAM_SLIDE_DURATION,
  TG_ARROW_START,
  TG_NODE_POP_START,
  TG_FADE_SCALE_TO,
  TG_CODE_FADE_START,
  TG_CODE_FADE_DURATION,
  TG_SIDE_FADE_END,
  TelegramOutboundArrow,
  TelegramNode,
  TelegramLogoFlight,
  IPhoneTelegramReveal,
  TelegramCameraRig,
  TelegramTickConfirm,
  TelegramEndExit,
} from "../telegram_scene/TelegramPhoneReveal";

/**
 * Mounts children only while `from … from+duration` is active, but keeps
 * `useCurrentFrame()` on the composition clock (absolute). Remotion's
 * Sequence normally resets the clock to 0 — the nested negative offset
 * undoes that so existing absolute-frame math stays valid.
 */
const AbsoluteSequence: React.FC<{
  from: number;
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ from, durationInFrames, children }) => (
  <Sequence from={from} durationInFrames={durationInFrames} layout="none">
    <Sequence
      from={0 - from}
      durationInFrames={from + durationInFrames}
      layout="none"
    >
      {children}
    </Sequence>
  </Sequence>
);

const FULL_TEXT = "How I automate my social presence";
/** Typewriter starts after the glass card has mostly sprung in. */
const TYPE_START = 12;
/** Tuned so the full line finishes at frame 53 (beat sync). */
const FRAMES_PER_CHAR = (53 - TYPE_START) / FULL_TEXT.length;
/** Apple-like ease-out: soft deceleration into the dissolve. */
const CARD_EXIT_EASING = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * MainScene beat-sync retimes (earlier than Scene1 shared constants).
 * Introduce settles at centre on frame 92; card exit overlaps that fly-in.
 * Downstream absolute beats are shifted earlier by the same delta (19).
 */
const HOOK_CARD_EXIT_START = 63;
const HOOK_CARD_EXIT_END = 79;
const INTRODUCE_START = 54;

/**
 * Glass card + typewriter headline. Fades out in place starting at
 * `HOOK_CARD_EXIT_START` — which overlaps with "Introduce" already flying
 * in below (see `IntroduceText`) — so the handoff reads as one continuous
 * move instead of a hard cut.
 */
const HookCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- 1. GLASS CARD ENTRY (spring pop-up) ---
  const cardSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 100 },
  });
  const enterScale = interpolate(cardSpring, [0, 1], [0.9, 1]);
  const enterOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // --- 2. TYPEWRITER ---
  const charsShown = Math.floor(
    interpolate(
      frame - TYPE_START,
      [0, FULL_TEXT.length * FRAMES_PER_CHAR],
      [0, FULL_TEXT.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
  const currentText = FULL_TEXT.slice(0, charsShown);

  // Cursor blinks until the exit starts, then disappears cleanly.
  const cursorOpacity =
    frame >= HOOK_CARD_EXIT_START
      ? 0
      : Math.floor(frame / 15) % 2 === 0
        ? 1
        : 0;

  // --- 3. SOFT EXIT (scale down + fade in place) ---
  const exitProgress = interpolate(
    frame,
    [HOOK_CARD_EXIT_START, HOOK_CARD_EXIT_END],
    [0, 1],
    {
      easing: CARD_EXIT_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.85]);
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);

  return (
    <AbsoluteFill className="flex items-center justify-center font-sans">
      <div
        style={{
          transform: `scale(${enterScale * exitScale})`,
          opacity: enterOpacity * exitOpacity,
          willChange: "transform, opacity",
        }}
        className="z-10 w-fit max-w-[92%] rounded-3xl border border-white/15 bg-white/5 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl sm:p-12"
      >
        <div className="relative">
          <span
            aria-hidden
            className="invisible block whitespace-nowrap text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          >
            {FULL_TEXT}
            <span className="ml-1 inline-block w-[3px]" />
          </span>
          <h1 className="absolute inset-0 flex items-center whitespace-nowrap text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            <span>{currentText}</span>
            <span
              style={{ opacity: cursorOpacity }}
              className="ml-1 inline-block h-[1em] w-[3px] translate-y-[0.15em] bg-blue-400"
            />
          </h1>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Shared easing for every "Introduce" / pipeline move: fast start, long
 * glide into a soft stop.
 */
const INTRODUCE_EASING = Easing.bezier(0.85, 0, 0.15, 1);

/** ~4x the original headline; sized to fill the frame on a single line.
 * Phase 2 scales this down to 0.5x via transform, not a font-size swap, so
 * the shrink animates continuously instead of jumping. */
const INTRODUCE_FONT_SIZE = 384;

/** Phase 1 comes to rest before its frames run out, leaving a short hold. */
const INTRODUCE_PHASE1_STOP = Math.round(INTRODUCE_TRAVEL_FRAMES * 0.87);
/** Phase 2 starts while the fly-in is still finishing (overlap by EARLY). */
const INTRODUCE_PHASE2_START = INTRODUCE_TRAVEL_FRAMES - INTRODUCE_PHASE2_EARLY;
/** Phase 2 (split + logo) follows the same stop-early-and-hold pattern. */
const INTRODUCE_PHASE2_STOP = Math.round(INTRODUCE_SPLIT_FRAMES * 0.87);

const LOGO_SIZE = 220;
/** Logo scale: start oversized, settle at 2× the base asset. */
const LOGO_SCALE_START = 3.5;
const LOGO_SCALE_END = 2;

/**
 * Phase 3 (MainScene only): logo slides left and "births" the pipeline
 * label from its right edge via an overflow mask. The logo+label row is
 * always `translate(-50%)`-centred, so as the mask grows the whole group
 * rebalances around the frame centre automatically.
 *
 * Reveal animates `maxWidth` to the *real* text width (via `measureText`),
 * not an oversized ceiling — so the shared ease-out curve actually brakes
 * over the last visible pixels of the label.
 */
const N8N_PINK = "#EA4B71";
const PIPELINE_LINES = ["Automated Post", "Creation Pipeline"] as const;
/** 3× the earlier single-line size. */
const PIPELINE_FONT_SIZE = 44 * 3;
const PIPELINE_LINE_HEIGHT = 1.1;
/** Gap between the logo's right edge and the text block, inside the mask. */
const PIPELINE_GAP = 28;
/** Matches Tailwind `font-sans` + `font-semibold` + `tracking-tight`. */
const PIPELINE_FONT_FAMILY =
  'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
/** Short beat of rest after the logo settles, then the pull starts. */
const PIPELINE_HOLD = 8;
const PIPELINE_START =
  INTRODUCE_PHASE2_START + INTRODUCE_PHASE2_STOP + PIPELINE_HOLD;
const PIPELINE_DURATION = 50;
const PIPELINE_STOP = Math.round(PIPELINE_DURATION * 0.87);

/** Intrinsic width of the wider pipeline line + gap — only valid in-browser. */
const measurePipelineRevealWidth = () => {
  const lineWidth = Math.max(
    ...PIPELINE_LINES.map(
      (line) =>
        measureText({
          text: line,
          fontFamily: PIPELINE_FONT_FAMILY,
          fontSize: PIPELINE_FONT_SIZE,
          fontWeight: 600,
          letterSpacing: "-0.025em",
        }).width,
    ),
  );
  return PIPELINE_GAP + Math.ceil(lineWidth);
};

/**
 * "Introduce" headline. Starts flying in from the right at
 * `INTRODUCE_START` — while `HookCard` is still mid fade-out above it —
 * then, once the fly-in settles, shrinks to half size and rises into the
 * top half's centre.
 *
 * Must live in its own component (not be computed in the parent and
 * passed down) because `CameraMotionBlur` re-renders this exact element
 * several times via `<Freeze>`, each time overriding what `useCurrentFrame()`
 * returns to a slightly earlier frame. If the position were calculated in
 * the parent instead, every sample would get the same, real "now" position
 * and the blur would have nothing to average.
 */
const IntroduceText: React.FC = () => {
  const frame = useCurrentFrame() - INTRODUCE_START;
  const { width, height } = useVideoConfig();

  // Phase 1: fly in from the right, settle at centre.
  const travelDistance = width * 0.92;
  const phase1Progress = interpolate(
    frame,
    [0, INTRODUCE_PHASE1_STOP - 1],
    [1, 0],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const translateX = phase1Progress * travelDistance;

  // Phase 2: shrink to half size, rise into the top half's centre.
  const phase2Frame = frame - INTRODUCE_PHASE2_START;
  const phase2Progress = interpolate(
    phase2Frame,
    [0, INTRODUCE_PHASE2_STOP - 1],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const scale = interpolate(phase2Progress, [0, 1], [1, 0.5]);
  const translateY = interpolate(phase2Progress, [0, 1], [0, -height / 4]);

  return (
    <AbsoluteFill className="flex items-center justify-center font-sans">
      <h1
        className="select-none whitespace-nowrap font-bold leading-none tracking-tight text-white"
        style={{
          fontSize: INTRODUCE_FONT_SIZE,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          willChange: "transform",
        }}
      >
        Introduce
      </h1>
    </AbsoluteFill>
  );
};

/**
 * n8n logo + pipeline label reveal.
 *
 * Phase 2: logo fades/scales in at its resting spot.
 * Phase 3: a flex row (logo | masked label) stays horizontally centred via
 * `translate(-50%)`. The mask's `maxWidth` grows from 0 → measured text
 * width so `bezier(0.85, 0, 0.15, 1)` brakes across the last visible
 * letters — same feel as "Introduce".
 */
const N8nLogoPipeline: React.FC = () => {
  const frame = useCurrentFrame() - INTRODUCE_START;
  const { height } = useVideoConfig();

  const phase2Frame = frame - INTRODUCE_PHASE2_START;
  const phase2Progress = interpolate(
    phase2Frame,
    [0, INTRODUCE_PHASE2_STOP - 1],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const opacity = phase2Progress;
  const scale = interpolate(
    phase2Progress,
    [0, 1],
    [LOGO_SCALE_START, LOGO_SCALE_END],
  );
  const displaySize = LOGO_SIZE * scale;

  const pipelineFrame = frame - PIPELINE_START;
  const pipelineProgress = interpolate(
    pipelineFrame,
    [0, PIPELINE_STOP - 1],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  // Map the full ease-out onto the real label width (not a padded ceiling).
  const revealEndWidth = measurePipelineRevealWidth();
  const revealMaxWidth = interpolate(
    pipelineProgress,
    [0, 1],
    [0, revealEndWidth],
  );

  // Midpoint of the gap between the settled "Introduce" text bottom and
  // the screen's bottom edge.
  const introduceCenterY = height / 4;
  const introduceHalfHeight = (INTRODUCE_FONT_SIZE * 0.5) / 2;
  const gapTop = introduceCenterY + introduceHalfHeight;
  const logoCenterY = (gapTop + height) / 2;

  return (
    <AbsoluteFill>
      {/* Non-zero-size flex row (logo always present) — safe under
          CameraMotionBlur's overflow:hidden, unlike a 0×0 anchor. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: logoCenterY,
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          opacity,
          willChange: "transform, opacity",
        }}
      >
        <Img
          src={staticFile("logos/n8n.svg")}
          style={{
            width: displaySize,
            height: displaySize,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            overflow: "hidden",
            width: revealMaxWidth,
            height: PIPELINE_FONT_SIZE * PIPELINE_LINE_HEIGHT * 2,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            willChange: "width",
          }}
        >
          <div
            className="select-none font-sans font-semibold tracking-tight"
            style={{
              paddingLeft: PIPELINE_GAP,
              color: N8N_PINK,
              fontSize: PIPELINE_FONT_SIZE,
              lineHeight: PIPELINE_LINE_HEIGHT,
            }}
          >
            {PIPELINE_LINES.map((line) => (
              <div key={line} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Beat 4 (MainScene only): everything above clears out to make room for
 * the "Execute workflow" button + cursor-click beat.
 */
/** Clear-out starts here (absolute) — short admire hold after pipeline. */
const EXIT_START = 199;
const EXIT_DURATION = 18;
/** Snap-out ease-in — opposite feel from every slow ease-out used so far,
 * so the clear-away reads as decisive, not another slow glide. */
const EXIT_EASING = Easing.bezier(0.55, 0, 1, 0.45);

/** Button pop-in starts before the exit finishes — momentum carries
 * through the cut instead of leaving a dead beat. */
const BUTTON_START = EXIT_START + 8;
/** Underdamped spring: naturally overshoots past 1 before settling — used
 * directly as the button's scale, no manual overshoot math needed. */
const BUTTON_SPRING_CONFIG = { damping: 9, mass: 1, stiffness: 120 };
const BUTTON_ORANGE = "#F97316";
const BUTTON_LABEL = "Execute workflow";

/** Cursor wanders in from this absolute frame. */
const CURSOR_START = 238;
const CURSOR_WANDER_DURATION = 45;
const CURSOR_SIZE = 60;
const CLICK_START = CURSOR_START + CURSOR_WANDER_DURATION;
/** Both the cursor and the button squish-and-recover on this same window. */
const CLICK_SQUISH_DURATION = 16;
/** Absolute frame when the click squish finishes — handoff starts here. */
const CLICK_END = CLICK_START + CLICK_SQUISH_DURATION;

/** Execute button + cursor fade out immediately after the click settles. */
const EXECUTE_FADE_DURATION = 10;

/** Manual Trigger pops in the moment the click ends. */
const MANUAL_START = CLICK_END;
const MANUAL_SPRING_CONFIG = { damping: 10, mass: 0.9, stiffness: 140 };
/** Soft bounce after the pop settles. */
const MANUAL_BOUNCE_START = 22;
const MANUAL_BOUNCE_DURATION = 14;
/** Orange pulse rings radiate from the node centre. */
const PULSE_START = MANUAL_BOUNCE_START;
const PULSE_COUNT = 3;
const PULSE_STAGGER = 7;
const PULSE_DURATION = 32;
const PULSE_MAX_SCALE = 4.2;

/** Shared Manual Trigger node box size — reused by the arrow for alignment. */
const MANUAL_NODE_WIDTH = 140;
const MANUAL_NODE_HEIGHT = 120;

/**
 * Beat 5 (MainScene only): two timed phases —
 * 1) REFLOW_START — Manual Trigger slides left to make room.
 * 2) ARROW_START (later) — arrow draws in left → right, traveling light
 *    pulse, and Google Sheets carousel fade-in + spin.
 * Reflow finishes just before the arrow appears so the line can grow from
 * the trigger's settled left edge.
 */
const REFLOW_START = 325;
const REFLOW_DURATION = 20;
const ARROW_START = 342;
/** Fraction of screen width Manual Trigger slides left; the Sheets hub
 * mirrors it on the right so the arrow ends up centred on screen. */
const WORKFLOW_SHIFT_RATIO = 0.26;
const SHEETS_HUB_X_RATIO = 0.5 + WORKFLOW_SHIFT_RATIO;

const ARROW_GAP = 26;
const ARROW_DRAW_DURATION = 22;
const ARROW_HEAD_SIZE = 16;

const CAROUSEL_NODE_LABELS = ["value_bank", "layouts", "assets", "log"] as const;
/**
 * Absolute composition frames when each Sheets node fires its impact
 * pulse (front/centre of the orbit). One-shot only — value_bank →
 * layouts → assets → log — then the wheel freezes. Spacing ≈ 38 frames.
 */
const CAROUSEL_HIT_FRAMES: Record<(typeof CAROUSEL_NODE_LABELS)[number], number> = {
  value_bank: 378,
  layouts: 416,
  assets: 454,
  log: 491,
};
/** Hit order for one-shot travel streaks + carousel passes. */
const CAROUSEL_HIT_ORDER = [
  "value_bank",
  "layouts",
  "assets",
  "log",
] as const satisfies ReadonlyArray<(typeof CAROUSEL_NODE_LABELS)[number]>;

const PULSE_TRAVEL_WIDTH = 90;
/** First streak: abs 372 → 397. Same duration for every later streak,
 * each timed to arrive when its Sheets node hits centre. */
const PULSE_TRAVEL_FIRST_START = 353;
const PULSE_TRAVEL_DURATION =
  CAROUSEL_HIT_FRAMES.value_bank - PULSE_TRAVEL_FIRST_START;
/** Absolute start frame of each one-shot traveling light streak. */
const PULSE_TRAVEL_STARTS = CAROUSEL_HIT_ORDER.map(
  (label) => CAROUSEL_HIT_FRAMES[label] - PULSE_TRAVEL_DURATION,
);

/** Angular speed chosen so the four hit frames sit ~π/2 apart. */
const CAROUSEL_ROTATION_PERIOD = 151;
const CAROUSEL_OMEGA = (2 * Math.PI) / CAROUSEL_ROTATION_PERIOD;
/** Keep spinning past the last hit until this frame, then morph-out. */
const CAROUSEL_SPIN_END = 521;
/** Vertical orbit radius — how far nodes travel above/below centre. */
const CAROUSEL_RADIUS_Y = 220;
/** Horizontal "depth" radius — small on purpose: just enough arc/dial
 * illusion (front node bulges toward the arrow, back node recedes). */
const CAROUSEL_RADIUS_X = 70;
const CAROUSEL_NODE_WIDTH = 210;
const CAROUSEL_NODE_HEIGHT = 92;
const SHEETS_GREEN = "#0F9D58";
/** Once-only ripple as each node crosses centre (no dip/squish). */
const CAROUSEL_RIPPLE_DURATION = 34;
/** Pulse starts this many frames before the node reaches centre — so the
 * ring (drawn behind the node) has already grown past the node's edge by
 * the time the node arrives, and is visible as a halo. */
const CAROUSEL_PULSE_LEAD = 14;

/**
 * Beat 6 — carousel morphs into a single Google Sheets node, Manual
 * Trigger + arrow fade away, Sheets node slides into the trigger's seat.
 */
const CAROUSEL_MORPH_START = CAROUSEL_SPIN_END;
const CAROUSEL_MORPH_DURATION = 22;
const SHEETS_NODE_POP_START = CAROUSEL_MORPH_START + 6;
const SHEETS_NODE_SPRING_CONFIG = { damping: 9, mass: 0.85, stiffness: 140 };
const SHEETS_NODE_SIZE = 128;
const WORKFLOW_LEGACY_FADE_START = SHEETS_NODE_POP_START + 10;
const WORKFLOW_LEGACY_FADE_DURATION = 14;
const SHEETS_SLIDE_START = WORKFLOW_LEGACY_FADE_START + 4;
const SHEETS_SLIDE_DURATION = 22;

/**
 * Beat 7 — settled Sheets node fires 5 green pulse rings (same recipe as
 * Manual Trigger's orange rings), shoots an outbound arrow right, and a
 * code frame pops in at the arrow tip with burst typing of the truncated
 * n8n selection script.
 */
const SHEETS_PULSE_START = SHEETS_SLIDE_START + SHEETS_SLIDE_DURATION + 4;
const SHEETS_PULSE_COUNT = 5;
const SHEETS_PULSE_STAGGER = 7;
const SHEETS_PULSE_DURATION = 32;
const SHEETS_PULSE_MAX_SCALE = 4.2;

const SHEETS_OUT_ARROW_START = SHEETS_PULSE_START;
const SHEETS_OUT_ARROW_DRAW = 22;
const SHEETS_OUT_ARROW_GAP = 26;
const SHEETS_OUT_ARROW_HEAD = 16;
const SHEETS_OUT_PULSE_WIDTH = 90;
const SHEETS_OUT_PULSE_TRAVEL = SHEETS_OUT_ARROW_DRAW;

const CODE_FRAME_POP_START = SHEETS_OUT_ARROW_START + SHEETS_OUT_ARROW_DRAW;
const CODE_FRAME_SPRING = { damping: 10, mass: 0.9, stiffness: 130 };
const CODE_FRAME_WIDTH = SHEETS_NODE_SIZE * 3;
const CODE_FRAME_HEIGHT = SHEETS_NODE_SIZE * 4;
const CODE_TYPE_START = CODE_FRAME_POP_START + 4;
/** Frames per typed character — shared by Loc_phrase + Dung_payload_gemini. */
const CODE_FRAMES_PER_CHAR = 0.91;
/**
 * Truncated ("up up mở mở") version of the real n8n Code node — keeps the
 * recognizable spine, drops the long Vietnamese fatal messages.
 */
const CODE_LINES = [
  "function daysSince(v) {",
  "  if (!v) return 9999;",
  "  …",
  "}",
  "",
  "const values  = $('Doc value_bank').all()…",
  "const layouts = $('Doc layouts').all()…",
  "const assets  = $('Doc assets').all()…",
  "",
  "const poolValues  = values.filter(… > 30)",
  "const poolLayouts = layouts.filter(… > 7)",
  "const poolAssets  = assets.filter(… > 14)",
  "",
  "const byAxis = {};",
  "for (const v of poolValues) { … }",
  "",
  "if (axes.length < 3) {",
  "  return [{ json: { fatal: true, … } }];",
  "}",
  "",
  "return [{ json: { fatal: false, byAxis, axes, … } }];",
] as const;
/**
 * Absolute (composition) frame when each line starts typing — clustered
 * into short bursts so several lines appear nearly at once.
 */
const CODE_LINE_STARTS: number[] = [
  0, 3, 6, 8, // daysSince
  10, // blank
  12, 14, 16, // Doc pulls
  18,
  20, 22, 24, // pools
  26,
  28, 30, // byAxis loop
  32,
  34, 38, // fatal guard
  40,
  42, // blank
  44, // return
];

/**
 * Second code frame — sits behind Loc_phrase, offset up-left on a ~45°
 * diagonal, same pop + burst-typing recipe.
 */
const GEMINI_FRAME_POP_START = 598;
const GEMINI_TYPE_START = GEMINI_FRAME_POP_START + 4;
/** Distance along the 45° up-right diagonal from Loc_phrase's centre. */
const GEMINI_FRAME_DIAGONAL_OFFSET = 150;
const GEMINI_FRAME_LINES = [
  "// Dựng payload gọi Gemini…",
  "const d = $json;",
  "if (d.fatal) throw new Error(…);",
  "",
  "const catalogue = d.axes.map(ax => …)",
  "  .join('\\n\\n');",
  "",
  "const recentLogs = $('Doc log').all()…;",
  "const avoidTitles = recent.map(…);",
  "const avoidEyebrows = recent.map(…);",
  "",
  "const pickAngle = angles[Math.floor(…)];",
  "",
  "const prompt = `Bạn là copywriter…",
  "${catalogue}",
  "${avoidBlock}",
  "NHIỆM VỤ: chọn 3 category…",
  "SCHEMA: { title, eyebrow, cta, … }`;",
  "",
  "return [{ json: { geminiBody: {…}, carry: d } }];",
] as const;
const GEMINI_FRAME_LINE_STARTS: number[] = [
  0, 3, 6, // header + fatal
  8,
  10, 13, // catalogue
  15,
  17, 20, 23, // recent / avoid
  25,
  27, // pickAngle
  29,
  31, 34, 37, 40, 44, // prompt block
  46,
  48, // return
];

/**
 * Beat 8 — both code frames morph out into an n8n Code node (yellow
 * braces icon), Code slides into the Sheets seat, outbound arrow, then
 * a free-floating Gemini mark pops in while spinning (no node chrome).
 */
const CODE_MORPH_START = 628;
const CODE_MORPH_DURATION = 22;
const CODE_NODE_POP_START = CODE_MORPH_START + 6;
const CODE_NODE_SPRING = { damping: 9, mass: 0.85, stiffness: 140 };
const CODE_NODE_SIZE = SHEETS_NODE_SIZE;
/** Warm amber from the n8n Code node reference screenshot. */
const CODE_YELLOW = "#FCAD61";
const CODE_LEGACY_FADE_START = CODE_NODE_POP_START + 10;
const CODE_LEGACY_FADE_DURATION = 14;
const CODE_SLIDE_START = CODE_LEGACY_FADE_START + 4;
const CODE_SLIDE_DURATION = 22;
const CODE_OUT_ARROW_START = CODE_SLIDE_START + CODE_SLIDE_DURATION + 4;
const CODE_OUT_ARROW_DRAW = 22;
const CODE_OUT_ARROW_GAP = 26;
const CODE_OUT_ARROW_HEAD = 16;
const CODE_OUT_PULSE_WIDTH = 90;
const CODE_OUT_PULSE_TRAVEL = CODE_OUT_ARROW_DRAW;
const GEMINI_LOGO_POP_START = CODE_OUT_ARROW_START + CODE_OUT_ARROW_DRAW;
const GEMINI_LOGO_SIZE = 140;
const GEMINI_SPIN_FRAMES = 36;
/** Code node + arrow clear out; Gemini flies hub → left seat (no centre stop). */
const GEMINI_CENTER_START = 704;
const GEMINI_CENTER_DURATION = 28;
const GEMINI_CENTER_SCALE = 2;
const CODE_GEMINI_EXIT_DURATION = 14;
/** Thinking idle: bounce + spin — all cycles at the slow rate (~2s / turn). */
const GEMINI_THINK_INTERVAL = 60;
const GEMINI_THINK_COUNT = 6;
const GEMINI_THINK_START = GEMINI_CENTER_START + GEMINI_CENTER_DURATION;

const geminiThinkCycleDuration = (_cycleIndex: number) => GEMINI_THINK_INTERVAL;

const geminiThinkCycleStart = (cycleIndex: number) => {
  return cycleIndex * GEMINI_THINK_INTERVAL;
};

/** Bounce + full turn used by the idle Gemini (frames 732–1067 recipe).
 *  Scale jumps between two clear sizes while each turn spins — not a soft
 *  ease curve, just big ↔ small. */
const geminiThinkMotion = (thinkLocal: number) => {
  let thinkBounce = 1;
  let thinkSpin = 0;
  let thinkBloomPulse = 0;
  if (thinkLocal < 0) {
    return { thinkBounce, thinkSpin, thinkBloomPulse };
  }

  let cycleIndex = GEMINI_THINK_COUNT;
  let inCycle = 0;
  let cycleDur = GEMINI_THINK_INTERVAL;
  for (let i = 0; i < GEMINI_THINK_COUNT; i++) {
    const start = geminiThinkCycleStart(i);
    const dur = geminiThinkCycleDuration(i);
    if (thinkLocal < start + dur) {
      cycleIndex = i;
      inCycle = thinkLocal - start;
      cycleDur = dur;
      break;
    }
  }

  if (cycleIndex >= GEMINI_THINK_COUNT) {
    return {
      thinkBounce: 1,
      thinkSpin: GEMINI_THINK_COUNT * 360,
      thinkBloomPulse: 0.4,
    };
  }

  // Two plateaus only: big for the first half-turn, small for the second.
  const BIG = 1.18;
  const SMALL = 0.88;
  const half = Math.round(cycleDur / 2);
  const snap = Math.max(3, Math.round(cycleDur * 0.1));
  thinkBounce = interpolate(
    inCycle,
    [0, snap, half - snap, half + snap, cycleDur - snap, cycleDur],
    [BIG, BIG, SMALL, SMALL, BIG, BIG],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  thinkSpin =
    cycleIndex * 360 +
    interpolate(inCycle, [0, cycleDur], [0, 360], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  thinkBloomPulse = interpolate(
    inCycle,
    [0, snap, half - snap, half + snap, cycleDur],
    [1, 1, 0.4, 0.4, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return { thinkBounce, thinkSpin, thinkBloomPulse };
};

/**
 * Beat GeminiCopyEmit — glass frame wipes in first, then each field releases
 * as a loading-bar pill. Order: Headline → Eyebrow → (Main+Sub)×3 → CTA.
 *
 * Gemini sits at the centre of the left half; copy stack at the centre of
 * the right half.
 */
const COPY_BAR_GROW_DURATION = 16;
const COPY_BAR_HOLD_DURATION = 6;
const COPY_BAR_REVEAL_DURATION = 14;
const COPY_SHIMMER_PERIOD = 18;
const COPY_TICK_DELAY = COPY_BAR_GROW_DURATION + COPY_BAR_HOLD_DURATION + 6;
const COPY_BAR_BASE_COLOR = "#2A2A32";
/** CTA fill — purple sampled from the attached swatch. */
const COPY_CTA_PURPLE = "#6C2FCB";
const COPY_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
/** Whole copy cluster scale (title stays single-line inside this). */
const COPY_CLUSTER_SCALE = 1.3;
/** Pre-scale max line width so scaled cluster still fits the right half. */
const COPY_STACK_MAX_WIDTH = 700;

/** Glass frame appears before the headline loading bar. */
const COPY_GLASS_START = 0;
const COPY_GLASS_REVEAL_DURATION = 22;
const COPY_GLASS_PAD = 28;
const COPY_GLASS_RADIUS = 16;
const COPY_GLASS_BORDER = 2.5;
/** Border glow only — 4 colours sampled from logos/gemini.webp. */
const COPY_GLASS_BORDER_COLORS = [
  "#3084FC", // blue
  "#57B97A", // green
  "#C8C42E", // yellow
  "#E44854", // coral / red
] as const;

/**
 * Emit offsets (frames after GEMINI_THINK_START). Headline/Eyebrow/CTA land
 * near think-cycle peaks; each Main→Sub pair staggers tightly (~12f).
 */
const GEMINI_COPY_LINES_BASE = [
  {
    role: "headline",
    text: "THỨC ĐÊM TRẢ LỜI INBOX VẪN MẤT KHÁCH?",
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#F8FAFC",
    thinHeight: 14,
    emitAt: 34,
  },
  {
    role: "eyebrow",
    text: "Khách hỏi 1 câu, ngâm 3 tiếng mới rep",
    fontSize: 20,
    fontWeight: 500,
    letterSpacing: "0",
    color: "rgba(226, 232, 240, 0.88)",
    thinHeight: 10,
    emitAt: 94,
  },
  {
    role: "main1",
    text: "HẠN CHẾ TỐI ĐA AI TỰ CHẾ DỮ LIỆU",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: "#F8FAFC",
    thinHeight: 11,
    emitAt: 154,
  },
  {
    role: "sub1",
    text: "Nhờ cơ chế kiểm tra, đối chiếu trước khi trả lời.",
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: "0",
    color: "rgba(148, 163, 184, 0.95)",
    thinHeight: 8,
    emitAt: 166,
  },
  {
    role: "main2",
    text: "GIÚP CHỐT ĐƠN ĐÊM VÀ CUỐI TUẦN",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: "#F8FAFC",
    thinHeight: 11,
    emitAt: 186,
  },
  {
    role: "sub2",
    text: "Không bỏ lỡ khách nhắn tin ngoài giờ hành chính.",
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: "0",
    color: "rgba(148, 163, 184, 0.95)",
    thinHeight: 8,
    emitAt: 198,
  },
  {
    role: "main3",
    text: "MỘT HỘP THƯ CHO MỌI KÊNH",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: "#F8FAFC",
    thinHeight: 11,
    emitAt: 218,
  },
  {
    role: "sub3",
    text: "Facebook, Instagram, Zalo, website gom về một chỗ.",
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: "0",
    color: "rgba(148, 163, 184, 0.95)",
    thinHeight: 8,
    emitAt: 230,
  },
  {
    role: "cta",
    text: "Dùng thử miễn phí ngay",
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "0",
    color: "#FFFFFF",
    thinHeight: 14,
    ctaHeight: 52,
    isCta: true,
    emitAt: 280,
  },
] as const;

/** Real measured text width per line — the bar grows to exactly this width. */
const GEMINI_COPY_LINES = GEMINI_COPY_LINES_BASE.map((line) => {
  const isCta = "isCta" in line && line.isCta;
  const textWidth = measureText({
    text: line.text,
    fontFamily: COPY_FONT_FAMILY,
    fontSize: line.fontSize,
    fontWeight: line.fontWeight,
    letterSpacing: line.letterSpacing,
  }).width;
  const pad = isCta ? 48 : 4;
  const raw = Math.ceil(textWidth) + pad;
  return { ...line, barWidth: Math.min(raw, COPY_STACK_MAX_WIDTH) };
});

const GEMINI_COPY_STACK_WIDTH = Math.max(
  ...GEMINI_COPY_LINES.map((line) => line.barWidth),
);
/** Room for the green tick that sits to the right of non-CTA lines. */
const GEMINI_COPY_TICK_SLACK = 36;

/** Approximate unscaled content height (rows + gaps) for the fitted glass frame. */
const GEMINI_COPY_CONTENT_HEIGHT = (() => {
  let h = 0;
  GEMINI_COPY_LINES.forEach((line, i) => {
    const isCta = "isCta" in line && line.isCta;
    const isSub = line.role.startsWith("sub");
    const isMain = line.role.startsWith("main");
    const rowH = isCta
      ? ("ctaHeight" in line ? line.ctaHeight : 52)
      : Math.round(line.fontSize * 1.45);
    const margin =
      i === 0
        ? 0
        : line.role === "eyebrow"
          ? 10
          : isSub
            ? 4
            : isCta
              ? 28
              : isMain && line.role === "main1"
                ? 26
                : isMain
                  ? 16
                  : 18;
    h += margin + rowH;
  });
  return h;
})();

const COPY_GLASS_WIDTH = Math.ceil(
  GEMINI_COPY_STACK_WIDTH + GEMINI_COPY_TICK_SLACK + COPY_GLASS_PAD * 2,
);
const COPY_GLASS_HEIGHT = Math.ceil(
  GEMINI_COPY_CONTENT_HEIGHT + COPY_GLASS_PAD * 2,
);

/**
 * Horizontal layout for the Gemini + copy beat:
 *   [screen left]—gap—[Gemini]—gap—[copy frame]—gap—[screen right]
 * so left margin (screen → Gemini) equals right margin (frame → screen).
 */
const geminiCopyLayout = (frameWidth: number) => {
  const geminiRadius = (GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE) / 2;
  const frameHalfVisual = (COPY_GLASS_WIDTH * COPY_CLUSTER_SCALE) / 2;
  const sideGap =
    (frameWidth - 2 * geminiRadius - 2 * frameHalfVisual) / 3;
  return {
    geminiCX: sideGap + geminiRadius,
    clusterCX: frameWidth - sideGap - frameHalfVisual,
  };
};

const geminiCopyLeftX = (frameWidth: number) =>
  geminiCopyLayout(frameWidth).geminiCX;

const geminiCopyClusterCenterX = (frameWidth: number) =>
  geminiCopyLayout(frameWidth).clusterCX;

const copyClusterVisualHalfW = () =>
  (COPY_GLASS_WIDTH * COPY_CLUSTER_SCALE) / 2;
const copyClusterVisualHalfH = () =>
  (COPY_GLASS_HEIGHT * COPY_CLUSTER_SCALE) / 2;

/**
 * After CTA settles: frame slides left so its new left margin equals the
 * old right margin. Gemini shrinks 3× and parks on the frame's top-left
 * corner; the 6 green ticks fade out.
 */
const COPY_DOCK_HOLD = 18;
const COPY_DOCK_START =
  GEMINI_THINK_START +
  GEMINI_COPY_LINES_BASE[GEMINI_COPY_LINES_BASE.length - 1].emitAt +
  COPY_BAR_GROW_DURATION +
  COPY_BAR_HOLD_DURATION +
  COPY_BAR_REVEAL_DURATION +
  COPY_DOCK_HOLD;
const COPY_DOCK_DURATION = 28;
const COPY_TICK_FADE_DURATION = 14;
/** Visual size after dock = current visual / 3 (base scale is already ×2). */
const GEMINI_DOCK_SCALE = GEMINI_CENTER_SCALE / 3;
/** Whole Gemini-frame cluster shrinks by this factor while sliding left. */
const COPY_DOCK_CLUSTER_SHRINK = 1.5;

const copyDockedClusterCX = (frameWidth: number) => {
  const { clusterCX } = geminiCopyLayout(frameWidth);
  const oldRightGap = frameWidth - (clusterCX + copyClusterVisualHalfW());
  const dockedHalfW = copyClusterVisualHalfW() / COPY_DOCK_CLUSTER_SHRINK;
  return oldRightGap + dockedHalfW;
};

const copyDockedGeminiPos = (frameWidth: number, frameHeight: number) => {
  const dockCX = copyDockedClusterCX(frameWidth);
  const dockCY = frameHeight / 2;
  const dockedHalfW = copyClusterVisualHalfW() / COPY_DOCK_CLUSTER_SHRINK;
  const dockedHalfH = copyClusterVisualHalfH() / COPY_DOCK_CLUSTER_SHRINK;
  return {
    x: dockCX - dockedHalfW,
    y: dockCY - dockedHalfH,
  };
};

/**
 * Beat ReviewSplit — two curved arrows fork from the docked Gemini frame
 * into the right half: upper = "Kiem tra noi dung", lower = "Chon layout
 * va asset". Frames match the copy-card shape, 25% smaller than the
 * docked Gemini cluster.
 */
const REVIEW_SPLIT_HOLD = 8;
const REVIEW_ARROW_START = COPY_DOCK_START + COPY_DOCK_DURATION + REVIEW_SPLIT_HOLD;
const REVIEW_ARROW_DRAW = 24;
const REVIEW_ARROW_HEAD_FADE_START = 1123;
const REVIEW_ARROW_HEAD_FADE_DURATION = 8;
const REVIEW_FRAME_POP_START = REVIEW_ARROW_START + REVIEW_ARROW_DRAW;
const REVIEW_TYPE_START = REVIEW_FRAME_POP_START + 4;
const REVIEW_FRAMES_PER_CHAR = 0.55 * 1.15 * 1.15;
const REVIEW_FRAME_SCALE = 0.75;
const REVIEW_FRAME_WIDTH =
  COPY_GLASS_WIDTH * COPY_CLUSTER_SCALE / COPY_DOCK_CLUSTER_SHRINK * REVIEW_FRAME_SCALE;
const REVIEW_FRAME_HEIGHT =
  COPY_GLASS_HEIGHT * COPY_CLUSTER_SCALE / COPY_DOCK_CLUSTER_SHRINK * REVIEW_FRAME_SCALE;
const REVIEW_FRAME_RADIUS = COPY_GLASS_RADIUS * REVIEW_FRAME_SCALE + 4;

const reviewCheckCenter = (frameWidth: number, frameHeight: number) => ({
  x: frameWidth * 0.75,
  y: frameHeight * 0.25,
});
const reviewLayoutCenter = (frameWidth: number, frameHeight: number) => ({
  x: frameWidth * 0.75,
  y: frameHeight * 0.75,
});

const REVIEW_CHECK_LINES = [
  "// Kiểm tra nội dung LLM trả về.",
  "// Feature schema: category + main_line + sub_line.",
  "const LIMITS = { title: 50, eyebrow: 45, cta: 30, main_line: 50, sub_line: 55 };",
  "const len = s => [...String(s || '')].length;",
  "",
  "const errors = [];",
  "let data = null;",
  "",
  "try {",
  "  const raw = $json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';",
  "  const clean = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();",
  "  data = JSON.parse(clean);",
  "} catch (e) {",
  "  return [{ json: { pass: false, errors: ['Khong parse duoc JSON: ' + e.message], data: null } }];",
  "}",
  "",
  "for (const k of ['title', 'eyebrow', 'cta']) {",
  "  if (!data[k]) errors.push(`Thieu ${k}`);",
  "  else if (len(data[k]) > LIMITS[k]) errors.push(`${k} dai ${len(data[k])}/${LIMITS[k]}`);",
  "}",
  "if (!data.caption_facebook) errors.push('Thieu caption_facebook');",
  "",
  "if (!Array.isArray(data.features) || data.features.length !== 3) {",
  "  errors.push('features phai co dung 3 phan tu');",
  "} else {",
  "  data.features = data.features.map(f => ({",
  "    ...f,",
  "    category: f.category || '',",
  "    main_line: f.main_line || f['main line'] || '',",
  "    sub_line: f.sub_line || f['sub line'] || '',",
  "  }));",
  "  const axes = data.features.map(f => String(f.category || '').trim());",
  "  if (new Set(axes).size !== 3) errors.push('3 feature phai thuoc 3 category khac nhau');",
  "  data.features.forEach((f, i) => {",
  "    for (const k of ['main_line', 'sub_line']) {",
  "      if (!f[k]) errors.push(`Feature ${i + 1} thieu ${k}`);",
  "      else if (len(f[k]) > LIMITS[k]) errors.push(`Feature ${i + 1} ${k} dai ${len(f[k])}/${LIMITS[k]}`);",
  "    }",
  "    if (!f.value_id) errors.push(`Feature ${i + 1} thieu value_id`);",
  "  });",
  "}",
  "",
  "return [{ json: { pass: errors.length === 0, errors, data,",
  "  carry: $('Dung payload Gemini').first().json.carry } }];",
] as const;

const REVIEW_LAYOUT_LINES = [
  "// Chọn layout + asset: random CÓ ĐIỀU KIỆN.",
  "// Quét layouts.\"has data?\" và layouts.\"feature frame\".",
  "const d = $json.data;",
  "const pool = $json.carry;",
  "const pick = a => a[Math.floor(Math.random() * a.length)];",
  "const truthy = v => String(v ?? '').trim().toUpperCase() === 'TRUE';",
  "",
  "const allText = [d.title, d.eyebrow, d.cta,",
  "  ...d.features.flatMap(f => [f.main_line, f.sub_line])].join(' ');",
  "const coSoLieu = /\\d/.test(allText);",
  "",
  "let layouts = [...(pool.poolLayouts || [])];",
  "if (!coSoLieu) {",
  "  const filtered = layouts.filter(l => !truthy(l['has data?'] ?? l.co_o_so_lieu));",
  "  if (filtered.length) layouts = filtered;",
  "}",
  "if (!layouts.length) {",
  "  return [{ json: { fatal: true, message: 'Khong con layout nao phu hop.' } }];",
  "}",
  "",
  "const SO_ANH = 1;",
  "const N_VARIANTS = Math.min(SO_ANH, layouts.length);",
  "const chosenLayouts = [];",
  "const bag = [...layouts];",
  "for (let i = 0; i < N_VARIANTS; i++) {",
  "  const idx = Math.floor(Math.random() * bag.length);",
  "  chosenLayouts.push(bag.splice(idx, 1)[0]);",
  "}",
  "",
  "const assetsOf = t => (pool.poolAssets || []).filter(a => String(a.assets || a.loai || '').trim() === t);",
  "const logos = assetsOf('logo');",
  "if (!logos.length) return [{ json: { fatal: true, message: 'Khong tim thay asset assets=logo' } }];",
  "const mascots = assetsOf('mascot');",
  "const bgs = assetsOf('background');",
  "",
  "const variants = chosenLayouts.map((layout, i) => {",
  "  const viTri = String(layout['mascot location'] || layout.vi_tri_mascot || '').trim();",
  "  const featureFrame = String(layout['feature frame'] || layout.kieu_khung_feature || '').trim();",
  "  let mascot = null;",
  "  if (viTri !== 'khong_co') {",
  "    if (!mascots.length) return { fatal: true, message: 'Khong co mascot nao trong pool assets' };",
  "    mascot = pick(mascots);",
  "  }",
  "  return {",
  "    index: i + 1, layout, feature_frame: featureFrame,",
  "    has_data: truthy(layout['has data?'] ?? layout.co_o_so_lieu),",
  "    mascot, logo: pick(logos), background: bgs.length ? pick(bgs) : null,",
  "  };",
  "});",
  "",
  "const bad = variants.find(v => v.fatal);",
  "if (bad) return [{ json: bad }];",
  "",
  "return [{ json: { fatal: false, content: d, variants } }];",
] as const;

const burstLineStarts = (lines: readonly string[]) => {
  const starts: number[] = [];
  let t = 0;
  lines.forEach((line, i) => {
    starts.push(t);
    t += line.length === 0 ? 2 : Math.min(4, 2 + Math.floor(line.length / 40));
    if (i > 0 && i % 4 === 0) t += 1;
  });
  return starts;
};

const REVIEW_CHECK_LINE_STARTS = burstLineStarts(REVIEW_CHECK_LINES);
const REVIEW_LAYOUT_LINE_STARTS = burstLineStarts(REVIEW_LAYOUT_LINES);

/**
 * Beat Illustrate — from frame 1161: fade the Gemini copy cluster + split
 * arrows, slide both review code frames into the left half, then illustrate
 * the running code on the right (content checklist + mascot arc + layout orbit).
 */
const ILLUSTRATE_START = 1161;
const ILLUSTRATE_FADE_DURATION = 16;
const ILLUSTRATE_SLIDE_DURATION = 22;

const reviewCheckLeftCenter = (frameWidth: number, frameHeight: number) => ({
  x: copyDockedClusterCX(frameWidth),
  y: frameHeight * 0.25,
});
const reviewLayoutLeftCenter = (frameWidth: number, frameHeight: number) => ({
  x: copyDockedClusterCX(frameWidth),
  y: frameHeight * 0.75,
});

const illustrateExitOpacity = (absFrame: number) =>
  interpolate(
    absFrame,
    [ILLUSTRATE_START, ILLUSTRATE_START + ILLUSTRATE_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

/** Right-side illustrations + layout orbit begin as the slide settles. */
const ILLUSTRATE_DETAIL_START =
  ILLUSTRATE_START + ILLUSTRATE_SLIDE_DURATION;

/** Per-row loading-bar → tick timing (right-side checklist). */
const ILLUSTRATE_CHECK_STAGGER = 9;
const ILLUSTRATE_CHECK_RISE = 16;
const ILLUSTRATE_BAR_GROW_END = 14;
const ILLUSTRATE_BAR_HOLD_END = 20;
const ILLUSTRATE_BAR_REVEAL_END = 28;
const ILLUSTRATE_BAR_WIDTH = 40;
const ILLUSTRATE_BAR_HEIGHT = 5;
const ILLUSTRATE_INDICATOR_SLOT = 40;
const ILLUSTRATE_TICK_SIZE = Math.round(17 * 1.8);

type IllustrateRole = "headline" | "eyebrow" | "main" | "sub" | "cta";
const ILLUSTRATE_CHECK_ITEMS: { label: string; role: IllustrateRole }[] = [
  { label: "Headline", role: "headline" },
  { label: "Eyebrow", role: "eyebrow" },
  { label: "Main line 1", role: "main" },
  { label: "Sub line 1", role: "sub" },
  { label: "Main line 2", role: "main" },
  { label: "Sub line 2", role: "sub" },
  { label: "Main line 3", role: "main" },
  { label: "Sub line 3", role: "sub" },
  { label: "CTA button", role: "cta" },
];
const ILLUSTRATE_ROLE_STYLE: Record<
  IllustrateRole,
  { fontSize: number; fontWeight: number }
> = {
  headline: { fontSize: 38, fontWeight: 800 },
  eyebrow: { fontSize: 27, fontWeight: 500 },
  main: { fontSize: 21, fontWeight: 700 },
  sub: { fontSize: 18, fontWeight: 400 },
  cta: { fontSize: 21, fontWeight: 600 },
};

const MASCOT_FILES = [
  "mascot/mascot 1.png",
  "mascot/mascot 2.png",
  "mascot/mascot 3.png",
  "mascot/mascot 4.png",
  "mascot/mascot 5.png",
] as const;
const MASCOT_LAST_INDEX = MASCOT_FILES.length - 1;
/** Angular step between mascots — smaller than a right angle so they read
 * as a tighter cluster on the arc; rotation advances by the same step. */
const MASCOT_ANGLE_STEP = (Math.PI / 2) * 0.78;
/** 4 gaps from spin start (detail+8 = 1191) land the pick squat on 1291. */
const MASCOT_HIT_GAP = 25;
const SELECT_HIT_FRAME = 1291;

/**
 * Beat Merge — after the twin select (mascot 5 + layout 1): the layout
 * code frame pops then sucks into layout 1; leftover mascots fade;
 * check-frame + checklist collapse into a shared centre and the original
 * prompt card is reborn there with a solid purple border.
 */
const MERGE_HOLD = 20;
const MERGE_START = SELECT_HIT_FRAME + MERGE_HOLD;
const MERGE_POP = 8;
const MERGE_SUCK = 18;
const MERGE_DURATION = MERGE_POP + MERGE_SUCK;
const PROMPT_REVEAL_START = MERGE_START + MERGE_DURATION - 4;
const PROMPT_REVEAL_DURATION = 20;
const PROMPT_RETURN_SCALE =
  (COPY_CLUSTER_SCALE / COPY_DOCK_CLUSTER_SHRINK) * 1.22 * 0.5;

const promptMergeCenter = (frameWidth: number, frameHeight: number) => ({
  x: (copyDockedClusterCX(frameWidth) + frameWidth * 0.75) / 2,
  y: frameHeight * 0.36,
});

/**
 * Beat ImagePrompt — from 1350 the purple prompt + selected layout +
 * selected mascot huddle on the left. Beside them: "Dung prompt anh"
 * (Loc_phrase-sized), then "Tao Gemini body" peeking like
 * Dung_payload_gemini. Arrow right → Gemini repeats the 697–731 pop/spin/fly.
 */
const IMG_CLUSTER_START = 1350;
const IMG_CLUSTER_DURATION = 22;
const IMG_PROMPT_POP = IMG_CLUSTER_START + 8;
const IMG_PROMPT_TYPE = IMG_PROMPT_POP + 4;
const IMG_BODY_POP = IMG_PROMPT_POP + 12;
const IMG_BODY_TYPE = IMG_BODY_POP + 4;
const IMG_ARROW_START = IMG_BODY_POP + 16;
const IMG_ARROW_DRAW = CODE_OUT_ARROW_DRAW;
const IMG_GEMINI_POP = IMG_ARROW_START + IMG_ARROW_DRAW;
const IMG_GEMINI_FLY = IMG_GEMINI_POP + (GEMINI_CENTER_START - GEMINI_LOGO_POP_START);
const IMG_GEMINI_FLY_DUR = GEMINI_CENTER_DURATION;
const IMG_EXIT_START = IMG_GEMINI_FLY;
const IMG_EXIT_DURATION = CODE_GEMINI_EXIT_DURATION;
const IMG_GEMINI_THINK_START = IMG_GEMINI_FLY + IMG_GEMINI_FLY_DUR;

/** Generated sample — native square photo, reveals left→right beside Gemini. */
const SAMPLE_REVEAL_START = IMG_GEMINI_FLY + IMG_GEMINI_FLY_DUR + 6;
const SAMPLE_FILE = "image/Sample 6.png";
const SAMPLE_MARGIN_RIGHT = 90;
const SAMPLE_MAX_SIZE = 620;
/** Tile grid that materializes the still, wave sweeping left→right. */
const SAMPLE_GRID = 12;
const SAMPLE_WAVE_FRAMES = 58;
const SAMPLE_TILE_POP = 32;
const SAMPLE_REVEAL_DURATION = SAMPLE_WAVE_FRAMES + SAMPLE_TILE_POP;
const SAMPLE_IMAGE_RADIUS = 22;
/** Hollow outline around the still — slightly larger, 1s LTR wipe. */
const SAMPLE_FRAME_PAD = 16;
const SAMPLE_FRAME_REVEAL_DURATION = 30;
const SAMPLE_FRAME_BORDER = 2.5;
const SAMPLE_FRAME_RADIUS = SAMPLE_IMAGE_RADIUS + SAMPLE_FRAME_PAD;
/** Stable per-tile jitter so the wave front never looks mechanical. */
const sampleTileNoise = (seed: number) => {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Gemini sits at the centre of the left half. Sample 6 is centred in
 * the remaining span from Gemini's right edge to the screen's right edge.
 */
const geminiSampleLayout = (frameWidth: number, frameHeight: number) => {
  const geminiCX = frameWidth / 4;
  const geminiR = (GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE) / 2;
  const leftBound = geminiCX + geminiR;
  const rightBound = frameWidth;
  const span = rightBound - leftBound;
  const size = Math.min(
    SAMPLE_MAX_SIZE,
    frameHeight * 0.62,
    span - 2 * SAMPLE_MARGIN_RIGHT,
  );
  return {
    geminiCX,
    sampleCX: (leftBound + rightBound) / 2,
    sampleSize: size,
  };
};

const CLUSTER_TILE_GAP = 12;
const CLUSTER_STACK_GAP = 14;
const CLUSTER_LEFT = 78;

const promptClusterBox = () => ({
  w: COPY_GLASS_WIDTH * PROMPT_RETURN_SCALE,
  h: COPY_GLASS_HEIGHT * PROMPT_RETURN_SCALE,
});
const clusterTileSize = () =>
  (promptClusterBox().w - CLUSTER_TILE_GAP) / 2;

/** Prompt on top; equal layout + mascot tiles below, flush to prompt edges. */
const imgClusterLayout = (_frameWidth: number, frameHeight: number) => {
  const { w: promptW, h: promptH } = promptClusterBox();
  const tile = clusterTileSize();
  const left = CLUSTER_LEFT;
  const totalH = promptH + CLUSTER_STACK_GAP + tile;
  const top = frameHeight * 0.5 - totalH / 2;
  return {
    tile,
    prompt: { x: left + promptW / 2, y: top + promptH / 2 },
    layout: { x: left + tile / 2, y: top + promptH + CLUSTER_STACK_GAP + tile / 2 },
    mascot: {
      x: left + promptW - tile / 2,
      y: top + promptH + CLUSTER_STACK_GAP + tile / 2,
    },
  };
};
const imgClusterPromptSeat = (frameWidth: number, frameHeight: number) =>
  imgClusterLayout(frameWidth, frameHeight).prompt;
const imgClusterLayoutSeat = (frameWidth: number, frameHeight: number) =>
  imgClusterLayout(frameWidth, frameHeight).layout;
const imgClusterMascotSeat = (frameWidth: number, frameHeight: number) =>
  imgClusterLayout(frameWidth, frameHeight).mascot;
const imgPromptCodeAnchorX = (frameWidth: number) => frameWidth * 0.395;

const IMG_ARROW_LENGTH = Math.round(88 * 2.2 * 1.8);
const imgArrowGeometry = (frameWidth: number) => {
  const codeX = imgPromptCodeAnchorX(frameWidth);
  const peek = GEMINI_FRAME_DIAGONAL_OFFSET / Math.SQRT2;
  const backRight = codeX + peek + CODE_FRAME_WIDTH / 2;
  const startX = backRight + 18;
  const endX = startX + IMG_ARROW_LENGTH;
  const geminiX = (endX + frameWidth) / 2;
  return { startX, endX, geminiX };
};

const imgClusterSlide = (absFrame: number) =>
  interpolate(
    absFrame,
    [IMG_CLUSTER_START, IMG_CLUSTER_START + IMG_CLUSTER_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

const imgLeftExitOpacity = (absFrame: number) =>
  interpolate(
    absFrame,
    [IMG_EXIT_START, IMG_EXIT_START + IMG_EXIT_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

const IMG_PROMPT_LINES = [
  "// Dựng prompt ảnh + binary mascot/logo.",
  "// Dùng layout.ratio, description, feature frame; feature main_line + sub_line.",
  "// Khi layout khong_co: node Tai mascot bị skip → không đọc binary mascot.",
  "const d = $json.content;",
  "const variants = $json.variants;",
  "",
  "let mascotBin = null;",
  "try {",
  "  if ($('Tai mascot').isExecuted) {",
  "    mascotBin = $('Tai mascot').first().binary?.data ?? null;",
  "  }",
  "} catch (e) {",
  "  mascotBin = null;",
  "}",
  "const logoBin = $('Tai logo').first().binary?.data ?? null;",
  "if (!logoBin) throw new Error('Khong tai duoc file logo');",
  "",
  "const f = d.features;",
  "const out = [];",
  "",
  "const frameHint = {",
  "  '3_the_ngang': '3 thẻ/feature xếp ngang đều nhau',",
  "  'danh_sach_doc': '3 dòng feature xếp dọc dạng danh sách',",
  "};",
  "",
  "for (const v of variants) {",
  "  const lay = v.layout || {};",
  "  const tiLe = String(lay.ratio || lay.ti_le || '1:1').trim().replace(/\\s/g, '') || '1:1';",
  "  const moTa = lay.description || lay.mo_ta_bo_cuc || '';",
  "  const frame = v.feature_frame || lay['feature frame'] || lay.kieu_khung_feature || '';",
  "  const frameText = frameHint[frame] || frame || 'theo mo ta bo cuc';",
  "  const coMascot = !!(v.mascot && mascotBin);",
  "",
  "  const mascotInstr = coMascot",
  "    ? 'MASCOT: Dùng đúng con robot trong ảnh đính kèm. Giữ nguyên hình dáng, tỉ lệ, màu sắc và logo trên bụng. Không vẽ lại, không thay đổi thiết kế, không sáng tạo thêm chi tiết.'",
  "    : 'MASCOT: Layout này không có mascot. Không vẽ thêm nhân vật, robot hay linh vật.';",
  "",
  "  const prompt = `Tạo một bài post mạng xã hội tỉ lệ ${tiLe} cho thương hiệu công nghệ.",
  "",
  "BỐ CỤC: ${moTa}",
  "KIỂU KHUNG FEATURE (feature frame = ${frame}): ${frameText}. Ba feature phải đúng kiểu khung này.",
  "",
  "${mascotInstr}",
  "",
  "CHỮ — sao chép chính xác từng ký tự, giữ nguyên toàn bộ dấu tiếng Việt:",
  "Title: \"${d.title}\"",
  "Eyebrow: \"${d.eyebrow}\"",
  "Feature 1: \"${f[0].main_line}\" / \"${f[0].sub_line}\"",
  "Feature 2: \"${f[1].main_line}\" / \"${f[1].sub_line}\"",
  "Feature 3: \"${f[2].main_line}\" / \"${f[2].sub_line}\"",
  "CTA: \"${d.cta}\"",
  "",
  "MÀU: tím đậm #6B21C7, tím nhạt #A855F7, nền trắng chuyển tím nhạt. Font sans-serif đậm, hiện đại, dễ đọc.",
  "",
  "Không thêm bất kỳ chữ nào ngoài danh sách trên.`;",
  "",
  "  const expected = [d.title, d.eyebrow, d.cta,",
  "    f[0].main_line, f[0].sub_line,",
  "    f[1].main_line, f[1].sub_line,",
  "    f[2].main_line, f[2].sub_line];",
  "",
  "  const binary = { logo: logoBin };",
  "  if (mascotBin) binary.mascot = mascotBin;",
  "",
  "  out.push({",
  "    json: {",
  "      index: v.index, prompt, expected, content: d,",
  "      layout_id: lay.layout_id,",
  "      ti_le: tiLe,",
  "      ratio: tiLe,",
  "      feature_frame: frame,",
  "      has_data: !!v.has_data,",
  "      asset_ids: [v.mascot?.asset_id, v.logo?.asset_id, v.background?.asset_id].filter(Boolean).join(','),",
  "      value_ids: d.features.map(x => x.value_id).join(','),",
  "      hasMascot: coMascot,",
  "      imageFields: Object.keys(binary).map(name => ({ binaryPropertyName: name })),",
  "    },",
  "    binary,",
  "  });",
  "}",
  "return out;",
] as const;

const IMG_BODY_LINES = [
  "// Build JSON body for Gemini generateContent with inline images.",
  "// QUAN TRONG: binary data mode la filesystem-v2, phai dung getBinaryDataBuffer()",
  "// aspectRatio lấy từ json.ratio / json.ti_le (sheet layouts.ratio).",
  "const items = $input.all();",
  "const out = [];",
  "for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {",
  "  const item = items[itemIndex];",
  "  const json = item.json;",
  "  const binary = item.binary || {};",
  "  const parts = [{ text: json.prompt }];",
  "  for (const f of (json.imageFields || [])) {",
  "    const meta = binary[f.binaryPropertyName];",
  "    if (!meta) throw new Error('Missing binary field: ' + f.binaryPropertyName);",
  "    const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, f.binaryPropertyName);",
  "    const b64 = buffer.toString('base64');",
  "    parts.push({ inlineData: { mimeType: meta.mimeType || 'image/png', data: b64 } });",
  "  }",
  "  const aspectRatio = String(json.ratio || json.ti_le || '1:1').trim().replace(/\\s/g, '') || '1:1';",
  "  const body = {",
  "    contents: [{ role: 'user', parts }],",
  "    generationConfig: {",
  "      responseModalities: ['TEXT', 'IMAGE'],",
  "      imageConfig: { aspectRatio },",
  "    },",
  "  };",
  "  out.push({ json: { ...json, geminiBody: JSON.stringify(body) }, binary: item.binary, pairedItem: { item: itemIndex } });",
  "}",
  "return out;",
] as const;

const IMG_PROMPT_LINE_STARTS = burstLineStarts(IMG_PROMPT_LINES);
const IMG_BODY_LINE_STARTS = burstLineStarts(IMG_BODY_LINES);
const MASCOT_SIZE = Math.round(176 * 1.2);
const MASCOT_RADIUS = Math.round(250 * 1.2);
const MASCOT_TILT = 0.36;
/** Frosted dock panel behind the arc. */
const MASCOT_DOCK_WIDTH = Math.round(620 * 1.2);
const MASCOT_DOCK_HEIGHT = Math.round(300 * 1.2);
/** Front-settle bounce + purple "selected" pulse, slow. */
const MASCOT_SETTLE_WINDOW = 11;
const MASCOT_PULSE_DURATION = 46;

const LAYOUT_FILES = [
  "layout frame/layout 1.png",
  "layout frame/layout 2.png",
  "layout frame/layout 3.png",
  "layout frame/layout 4.png",
] as const;
const LAYOUT_ORBIT_SIZE = Math.round(92 * 1.3 * 1.2);
/** Each square gets its own radius/speed/phase so the four orbits read as
 * independent trajectories rather than one shared ellipse. */
const LAYOUT_ORBIT_ITEMS = [
  { radiusX: 0.55, radiusY: 1.02, phase: 0.2, speed: 0.74 },
  { radiusX: 1.05, radiusY: 0.52, phase: 2.05, speed: 1.22 },
  { radiusX: 0.68, radiusY: 0.94, phase: 3.55, speed: 0.9 },
  { radiusX: 0.98, radiusY: 0.6, phase: 5.15, speed: 1.36 },
] as const;
const LAYOUT_ORBIT_BASE_RADIUS_X = REVIEW_FRAME_WIDTH / 2 + 72;
const LAYOUT_ORBIT_BASE_RADIUS_Y = REVIEW_FRAME_HEIGHT / 2 + 66;
const LAYOUT_ORBIT_OMEGA = (2 * Math.PI) / 130;
/** Stacking: images cross in front of the frame on the near half of their
 * orbit, and are fully hidden behind it on the far half. */
const LAYOUT_ORBIT_FRAME_Z = 5;
const LAYOUT_ORBIT_FRONT_Z = 10;
const LAYOUT_ORBIT_BACK_Z = 1;
const LAYOUT_SELECT_INDEX = 0;
const LAYOUT_FLY_DURATION = 18;
const LAYOUT_SELECT_Z = 16;

/** Simple hex → rgb lerp, used to morph the CTA pill from bar-grey to orange. */
const mixHexColors = (hexA: string, hexB: string, t: number) => {
  const toRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const n = parseInt(clean, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const a = toRgb(hexA);
  const b = toRgb(hexB);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
};

/** Cubic Bézier point evaluator — used for the cursor's curved wander path. */
const cubicBezier1D = (t: number, p0: number, p1: number, p2: number, p3: number) => {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
};

/**
 * Fades + scales down everything passed in (the whole "Introduce" + n8n +
 * pipeline group) starting at EXIT_START — the decisive clear-out before
 * the button beat.
 */
const IntroClearOut: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [EXIT_START, EXIT_START + EXIT_DURATION],
    [0, 1],
    { easing: EXIT_EASING, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = interpolate(progress, [0, 1], [1, 0]);
  const scale = interpolate(progress, [0, 1], [1, 0.85]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * "Execute workflow" button. Pop-in via an underdamped spring (overshoots
 * to ~1.15 then settles to 1.0), then squishes down and back when the
 * cursor "clicks" it — same CLICK_START window as `CursorPointer`.
 */
const ExecuteButton: React.FC = () => {
  const frame = useCurrentFrame() - BUTTON_START;
  const { fps } = useVideoConfig();

  const popScale = spring({ frame, fps, config: BUTTON_SPRING_CONFIG });
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clickFrame = frame - (CLICK_START - BUTTON_START);
  const clickBounce = interpolate(
    clickFrame,
    [0, CLICK_SQUISH_DURATION / 2, CLICK_SQUISH_DURATION],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const clickScale = interpolate(clickBounce, [0, 1], [1, 0.88]);

  // Fade out the moment the click settles — clears the stage for Manual Trigger.
  const fadeFrame = frame - (CLICK_END - BUTTON_START);
  const fadeOut = interpolate(fadeFrame, [0, EXECUTE_FADE_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="flex items-center justify-center">
      <div
        style={{
          transform: `scale(${popScale * clickScale})`,
          opacity: opacity * fadeOut,
          backgroundColor: BUTTON_ORANGE,
          willChange: "transform, opacity",
        }}
        className="flex items-center gap-4 rounded-xl px-12 py-6 shadow-[0_10px_30px_rgba(249,115,22,0.45)]"
      >
        <Img
          src={staticFile("icon/flask-icon.png")}
          style={{ width: 40, height: 40 }}
        />
        <span className="select-none whitespace-nowrap font-sans text-4xl font-semibold text-white">
          {BUTTON_LABEL}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Cursor that wanders in along a curved path (cubic Bézier, not a straight
 * line) from off to the side, arrives at the button's centre, then
 * squishes on click — same CLICK_START window as `ExecuteButton`.
 */
const CursorPointer: React.FC = () => {
  const frame = useCurrentFrame() - CURSOR_START;
  const { width, height } = useVideoConfig();

  const wanderProgress = interpolate(
    frame,
    [0, CURSOR_WANDER_DURATION - 1],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Path in relative (0..1) screen coords. Starts bottom-right, bulges
  // outward, then approaches the button centre from the same quadrant —
  // every control point stays ≥ 0.5 so the tip never overshoots past
  // centre and has to reverse (the previous 0.22 / 0.78 controls did that).
  const relX = cubicBezier1D(wanderProgress, 0.95, 0.98, 0.68, 0.5);
  const relY = cubicBezier1D(wanderProgress, 0.82, 0.95, 0.62, 0.5);
  const x = relX * width;
  const y = relY * height;

  const clickFrame = frame - (CLICK_START - CURSOR_START);
  const enterOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Same post-click fade as the Execute button.
  const fadeFrame = frame - (CLICK_END - CURSOR_START);
  const fadeOut = interpolate(fadeFrame, [0, EXECUTE_FADE_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clickBounce = interpolate(
    clickFrame,
    [0, CLICK_SQUISH_DURATION / 2, CLICK_SQUISH_DURATION],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const clickScale = interpolate(clickBounce, [0, 1], [1, 0.7]);

  return (
    <AbsoluteFill>
      <Img
        src={staticFile("icon/pointer.png")}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          opacity: enterOpacity * fadeOut,
          // No translate offset: the icon's arrow-tip hotspot sits almost
          // exactly at its own top-left corner (verified via pixel bbox),
          // which already lines up with `left`/`top` = the path point.
          transform: `scale(${clickScale})`,
          transformOrigin: "top left",
          willChange: "transform, opacity",
        }}
      />
    </AbsoluteFill>
  );
};

/** Inline so `currentColor` resolves to white (Img + SVG would paint black). */
const ManualTriggerIcon: React.FC<{ size?: number }> = ({ size = 52 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      fill="currentColor"
      d="m20.52 14.248.53.53.872-.871-1.174-.374zm-2.173 2.174-.53-.53-.531.53.53.53zm2.674 2.674.53.53.53-.53-.53-.53zm-1.925 1.925-.53.53.53.53.53-.53zm-2.674-2.675.53-.53-.53-.53-.53.53zm-2.174 2.175-.715.227.373 1.175.872-.872zm-2.925-9.198.227-.714-1.38-.44.438 1.382zm9.197 2.925-.53-.53-2.174 2.173.53.53.53.531 2.175-2.174zm-2.173 2.174-.53.53 2.674 2.674.53-.53.53-.53-2.674-2.675zm2.674 2.674-.53-.53-1.925 1.924.53.53.53.531 1.925-1.924zm-1.925 1.925.53-.53-2.674-2.675-.53.53-.53.53 2.674 2.675zm-2.674-2.675-.53-.53-2.175 2.174.53.53.53.531 2.175-2.174zm-2.174 2.175.714-.227-2.924-9.198-.715.227-.715.228 2.925 9.197zm-2.925-9.198-.227.715 9.197 2.925.227-.715.228-.715-9.198-2.924z"
    />
    <path
      stroke="currentColor"
      strokeWidth="1.5"
      d="M7.625 19.58A8.75 8.75 0 1 1 19.558 7.587"
    />
    <path
      stroke="currentColor"
      strokeWidth="1.5"
      d="M9.624 16.114a4.75 4.75 0 1 1 6.482-6.503"
    />
  </svg>
);

/**
 * n8n-style "Manual Trigger" node: dark body, asymmetric corners
 * (heavy round on the left, slight round on the right — no connector
 * nub on the right edge), white click-trigger icon centred inside.
 *
 * Timeline (relative to MANUAL_START):
 * 1) Spring pop-in (overshoot → settle).
 * 2) Soft bounce + 3 orange glowing pulse rings radiating outward.
 * 3) At REFLOW_START, slides left — independent of (and earlier than)
 *    the arrow / carousel beat at ARROW_START.
 */
/**
 * Manual Trigger node chrome only (pop / bounce / slide) — motion-blurred.
 * Pulse rings live in `ManualTriggerPulses` so they stay sharp.
 */
const ManualTriggerNode: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - MANUAL_START;
  const { fps, width } = useVideoConfig();

  const popScale = spring({
    frame: Math.max(0, frame),
    fps,
    config: MANUAL_SPRING_CONFIG,
  });
  const enterOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bounceFrame = frame - MANUAL_BOUNCE_START;
  const bounce = interpolate(
    bounceFrame,
    [0, MANUAL_BOUNCE_DURATION / 2, MANUAL_BOUNCE_DURATION],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bounceScale = interpolate(bounce, [0, 1], [1, 0.92]);

  const reflowLocal = REFLOW_START - MANUAL_START;
  const reflowProgress = interpolate(
    frame,
    [reflowLocal, reflowLocal + REFLOW_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const shiftX = -width * WORKFLOW_SHIFT_RATIO * reflowProgress;

  const legacyFade = interpolate(
    absFrame,
    [WORKFLOW_LEGACY_FADE_START, WORKFLOW_LEGACY_FADE_START + WORKFLOW_LEGACY_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (frame < 0) {
    return null;
  }

  return (
    <AbsoluteFill
      className="flex items-center justify-center"
      style={{
        transform: `translateX(${shiftX}px)`,
        opacity: legacyFade,
      }}
    >
      <div
        style={{
          width: MANUAL_NODE_WIDTH,
          height: MANUAL_NODE_HEIGHT,
          borderRadius: "60px 10px 10px 60px",
          backgroundColor: "#1E1E24",
          border: "1.5px solid rgba(180, 180, 190, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          opacity: enterOpacity,
          transform: `scale(${popScale * bounceScale})`,
          willChange: "transform, opacity",
          boxShadow: "0 8px 28px rgba(0, 0, 0, 0.45)",
        }}
      >
        <ManualTriggerIcon size={52} />
      </div>
    </AbsoluteFill>
  );
};

/** Orange pulse rings — sharp (no motion blur), tracks the same slide as the node. */
const ManualTriggerPulses: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - MANUAL_START;
  const { width } = useVideoConfig();

  const reflowLocal = REFLOW_START - MANUAL_START;
  const reflowProgress = interpolate(
    frame,
    [reflowLocal, reflowLocal + REFLOW_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const shiftX = -width * WORKFLOW_SHIFT_RATIO * reflowProgress;

  const legacyFade = interpolate(
    absFrame,
    [WORKFLOW_LEGACY_FADE_START, WORKFLOW_LEGACY_FADE_START + WORKFLOW_LEGACY_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (frame < 0) {
    return null;
  }

  return (
    <AbsoluteFill
      className="flex items-center justify-center"
      style={{
        transform: `translateX(${shiftX}px)`,
        opacity: legacyFade,
      }}
    >
      {Array.from({ length: PULSE_COUNT }, (_, i) => {
        const local = frame - PULSE_START - i * PULSE_STAGGER;
        const progress = interpolate(local, [0, PULSE_DURATION], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(progress, [0, 1], [0.35, PULSE_MAX_SCALE]);
        const ringOpacity = interpolate(
          progress,
          [0, 0.12, 1],
          [0, 0.65, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: MANUAL_NODE_WIDTH,
              height: MANUAL_NODE_HEIGHT,
              borderRadius: "60px 10px 10px 60px",
              border: `2px solid ${BUTTON_ORANGE}`,
              boxShadow: `0 0 18px 4px rgba(249, 115, 22, 0.55), 0 0 40px 8px rgba(249, 115, 22, 0.25)`,
              opacity: ringOpacity,
              transform: `scale(${scale})`,
              willChange: "transform, opacity",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const ManualTrigger: React.FC = () => {
  const absFrame = useCurrentFrame();
  const sliding =
    absFrame >= REFLOW_START &&
    absFrame <= REFLOW_START + REFLOW_DURATION;

  return (
    <>
      <ManualTriggerPulses />
      {sliding ? (
        <CameraMotionBlur samples={5} shutterAngle={360}>
          <ManualTriggerNode />
        </CameraMotionBlur>
      ) : (
        <ManualTriggerNode />
      )}
    </>
  );
};

/**
 * Arrow from Manual Trigger's right edge to the Sheets carousel hub.
 * Draws in left → right over ARROW_DRAW_DURATION starting at ARROW_START,
 * then four one-shot traveling light streaks — each runs the same length
 * as the first (372 → 397) and arrives exactly when its Sheets node hits
 * centre (value_bank → layouts → assets → log).
 */
const WorkflowArrow: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - ARROW_START;
  const { width, height } = useVideoConfig();

  if (frame < 0) {
    return null;
  }

  const cy = height / 2;
  const manualCenterX = width * (0.5 - WORKFLOW_SHIFT_RATIO);
  const hubX = width * SHEETS_HUB_X_RATIO;

  const lineStartX = manualCenterX + MANUAL_NODE_WIDTH / 2 + ARROW_GAP;
  const lineEndX =
    hubX - CAROUSEL_RADIUS_X - CAROUSEL_NODE_WIDTH / 2 - ARROW_GAP;
  const fullLength = Math.max(0, lineEndX - lineStartX);

  const drawProgress = interpolate(frame, [0, ARROW_DRAW_DURATION], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentLength = fullLength * drawProgress;

  // Active one-shot streak, if any (start → start + duration inclusive end).
  const travelStart = PULSE_TRAVEL_STARTS.find(
    (start) =>
      absFrame >= start && absFrame <= start + PULSE_TRAVEL_DURATION,
  );
  const travelLocal =
    travelStart === undefined ? -1 : absFrame - travelStart;
  const travelActive = travelLocal >= 0;
  const travelProgress = travelActive
    ? interpolate(travelLocal, [0, PULSE_TRAVEL_DURATION], [0, 1], {
        easing: INTRODUCE_EASING,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const streakX =
    lineStartX + Math.max(0, fullLength - PULSE_TRAVEL_WIDTH) * travelProgress;
  const streakOpacity = travelActive
    ? interpolate(
        travelLocal,
        [0, 4, PULSE_TRAVEL_DURATION - 4, PULSE_TRAVEL_DURATION],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  // Exit with Manual Trigger once the Sheets node takes over.
  const legacyFade = interpolate(
    absFrame,
    [WORKFLOW_LEGACY_FADE_START, WORKFLOW_LEGACY_FADE_START + WORKFLOW_LEGACY_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: legacyFade }}>
      {/* Static line, drawing in left → right */}
      <div
        style={{
          position: "absolute",
          left: lineStartX,
          top: cy - 1.5,
          width: currentLength,
          height: 3,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          willChange: "width",
        }}
      />
      {/* Arrowhead, fades in once the line is fully drawn */}
      <div
        style={{
          position: "absolute",
          left: lineStartX + currentLength - 2,
          top: cy,
          width: 0,
          height: 0,
          borderTop: `${ARROW_HEAD_SIZE / 2}px solid transparent`,
          borderBottom: `${ARROW_HEAD_SIZE / 2}px solid transparent`,
          borderLeft: `${ARROW_HEAD_SIZE}px solid rgba(255, 255, 255, 0.35)`,
          transform: "translateY(-50%)",
          opacity: drawProgress,
        }}
      />
      {/* Traveling light pulse — soft glow only, no hard rectangular body */}
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: cy - 14,
          width: PULSE_TRAVEL_WIDTH,
          height: 28,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accent} 0%, rgba(56,189,248,0.45) 28%, rgba(56,189,248,0) 72%)`,
          filter: "blur(5px)",
          boxShadow: `0 0 22px 6px rgba(56, 189, 248, 0.55)`,
          opacity: streakOpacity,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * "AnimatedSheetCarousel" — 4 Google Sheets nodes on a vertical arc.
 * Positions via sin/cos (nodes stay upright by construction).
 *
 * Spins through each centre hit once (value_bank → layouts → assets →
 * log), keeps rotating until CAROUSEL_SPIN_END, then morphs out with a
 * bouncy shrink (scale up briefly → 0) + fade so a single Sheets node
 * can pop in at the same hub.
 */
const AnimatedSheetCarousel: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - ARROW_START;
  const { width, height } = useVideoConfig();

  if (frame < 0) {
    return null;
  }

  const cy = height / 2;
  const hubX = width * SHEETS_HUB_X_RATIO;
  // Keep orbital motion until SPIN_END, then freeze for the morph.
  const motionAbs = Math.min(absFrame, CAROUSEL_SPIN_END);

  const enterOpacity = interpolate(
    frame,
    [ARROW_DRAW_DURATION - 10, ARROW_DRAW_DURATION + 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Morph-out: slight overshoot scale, then collapse to 0 + fade.
  const morphFrame = absFrame - CAROUSEL_MORPH_START;
  const morphScale = interpolate(
    morphFrame,
    [0, 7, CAROUSEL_MORPH_DURATION],
    [1, 1.14, 0],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const morphOpacity = interpolate(
    morphFrame,
    [0, 10, CAROUSEL_MORPH_DURATION],
    [1, 0.85, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (morphOpacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        opacity: enterOpacity * morphOpacity,
        transform: `scale(${morphScale})`,
        transformOrigin: `${hubX}px ${cy}px`,
      }}
    >
      {CAROUSEL_NODE_LABELS.map((label) => {
        // Angle 0 = front/centre (facing the arrow).
        const hitFrame = CAROUSEL_HIT_FRAMES[label];
        const angle = CAROUSEL_OMEGA * (motionAbs - hitFrame);

        const x = hubX - CAROUSEL_RADIUS_X * Math.cos(angle);
        const y = cy + CAROUSEL_RADIUS_Y * Math.sin(angle);

        // 1 = front (facing the incoming arrow), 0 = back (receded).
        const depthFactor = (Math.cos(angle) + 1) / 2;
        // 1 exactly at the front/back crossing of the centre line, 0 at
        // the top/bottom of the orbit.
        const yProximity = 1 - Math.min(1, Math.abs(Math.sin(angle)));
        const hitWindow = yProximity * depthFactor;

        const baseScale = interpolate(hitWindow, [0, 1], [0.8, 1.15]);
        const baseOpacity = interpolate(hitWindow, [0, 1], [0.3, 1]);

        // One-shot ripple clock — fires PULSE_LEAD frames before the node
        // reaches centre, so the ring is already growing when the node arrives.
        const framesSinceHit = absFrame - (hitFrame - CAROUSEL_PULSE_LEAD);
        const hitActive = framesSinceHit >= 0;

        const rippleProgress = hitActive
          ? interpolate(
              framesSinceHit,
              [0, CAROUSEL_RIPPLE_DURATION],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          : 1;
        const rippleScale = interpolate(rippleProgress, [0, 1], [0.6, 2.2]);
        const rippleOpacity = hitActive
          ? interpolate(rippleProgress, [0, 1], [0.6, 0]) * depthFactor
          : 0;

        const zIndex = Math.round(depthFactor * 100);

        return (
          <React.Fragment key={label}>
            {/* Ripple behind the node */}
            <div
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: CAROUSEL_NODE_WIDTH,
                height: CAROUSEL_NODE_HEIGHT,
                borderRadius: 16,
                border: `2px solid ${SHEETS_GREEN}`,
                boxShadow:
                  "0 0 16px 4px rgba(15, 157, 88, 0.55), 0 0 36px 8px rgba(15, 157, 88, 0.25)",
                opacity: rippleOpacity,
                transform: `translate(-50%, -50%) scale(${rippleScale})`,
                zIndex,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: CAROUSEL_NODE_WIDTH,
                height: CAROUSEL_NODE_HEIGHT,
                borderRadius: 16,
                backgroundColor: "#1E1E24",
                border: "1.5px solid rgba(180, 180, 190, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                paddingLeft: 18,
                opacity: baseOpacity,
                transform: `translate(-50%, -50%) scale(${baseScale})`,
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                zIndex: zIndex + 1,
                willChange: "transform, opacity",
              }}
            >
              <Img
                src={staticFile("logos/googleSheets.svg")}
                style={{ width: 34, height: 34, flexShrink: 0 }}
              />
              <span className="select-none whitespace-nowrap font-sans text-lg font-medium text-white/90">
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Google Sheets node chrome (pop + slide) — motion-blurred.
 * Green pulse rings stay sharp in `GoogleSheetsPulses`.
 */
const GoogleSheetsNodeBody: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - SHEETS_NODE_POP_START;

  const cy = height / 2;
  const hubX = width * SHEETS_HUB_X_RATIO;
  const manualCenterX = width * (0.5 - WORKFLOW_SHIFT_RATIO);

  const popScale = spring({
    frame: Math.max(0, local),
    fps,
    config: SHEETS_NODE_SPRING_CONFIG,
  });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideProgress = interpolate(
    absFrame,
    [SHEETS_SLIDE_START, SHEETS_SLIDE_START + SHEETS_SLIDE_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const x = interpolate(slideProgress, [0, 1], [hubX, manualCenterX]);

  const nub = 14;

  const sheetsExit = interpolate(
    absFrame,
    [CODE_LEGACY_FADE_START, CODE_LEGACY_FADE_START + CODE_LEGACY_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: sheetsExit }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: cy,
          width: SHEETS_NODE_SIZE,
          height: SHEETS_NODE_SIZE,
          transform: `translate(-50%, -50%) scale(${popScale})`,
          opacity: enterOpacity,
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -nub / 2,
            top: "50%",
            width: nub,
            height: nub,
            borderRadius: "50%",
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -nub / 2,
            top: "50%",
            width: nub,
            height: nub,
            borderRadius: "50%",
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 18,
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.45)",
          }}
        >
          <Img
            src={staticFile("logos/googleSheets.svg")}
            style={{ width: 56, height: 56 }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Green pulse rings — sharp (no motion blur), tracks Sheets node position. */
const GoogleSheetsPulses: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = absFrame - SHEETS_NODE_POP_START;

  const cy = height / 2;
  const hubX = width * SHEETS_HUB_X_RATIO;
  const manualCenterX = width * (0.5 - WORKFLOW_SHIFT_RATIO);

  const slideProgress = interpolate(
    absFrame,
    [SHEETS_SLIDE_START, SHEETS_SLIDE_START + SHEETS_SLIDE_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const x = interpolate(slideProgress, [0, 1], [hubX, manualCenterX]);
  const pulseLocal = absFrame - SHEETS_PULSE_START;

  const sheetsExit = interpolate(
    absFrame,
    [CODE_LEGACY_FADE_START, CODE_LEGACY_FADE_START + CODE_LEGACY_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0 || pulseLocal < 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: sheetsExit }}>
      {Array.from({ length: SHEETS_PULSE_COUNT }, (_, i) => {
        const ringLocal = pulseLocal - i * SHEETS_PULSE_STAGGER;
        const progress = interpolate(
          ringLocal,
          [0, SHEETS_PULSE_DURATION],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const scale = interpolate(progress, [0, 1], [0.35, SHEETS_PULSE_MAX_SCALE]);
        const ringOpacity = interpolate(
          progress,
          [0, 0.12, 1],
          [0, 0.65, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: cy,
              width: SHEETS_NODE_SIZE,
              height: SHEETS_NODE_SIZE,
              borderRadius: 18,
              border: `2px solid ${SHEETS_GREEN}`,
              boxShadow: `0 0 18px 4px rgba(15, 157, 88, 0.55), 0 0 40px 8px rgba(15, 157, 88, 0.25)`,
              opacity: ringOpacity,
              transform: `translate(-50%, -50%) scale(${scale})`,
              willChange: "transform, opacity",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const GoogleSheetsNode: React.FC = () => {
  const absFrame = useCurrentFrame();
  const sliding =
    absFrame >= SHEETS_SLIDE_START &&
    absFrame <= SHEETS_SLIDE_START + SHEETS_SLIDE_DURATION;

  return (
    <>
      <GoogleSheetsPulses />
      {sliding ? (
        <CameraMotionBlur samples={5} shutterAngle={360}>
          <GoogleSheetsNodeBody />
        </CameraMotionBlur>
      ) : (
        <GoogleSheetsNodeBody />
      )}
    </>
  );
};

/**
 * Arrow from the settled Sheets node (left) toward the code-frame hub
 * (right). Draws in over SHEETS_OUT_ARROW_DRAW, with one traveling light
 * streak that arrives exactly when the code frame pops.
 */
const SheetsOutboundArrow: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - SHEETS_OUT_ARROW_START;
  const { width, height } = useVideoConfig();

  const cy = height / 2;
  const sheetsCenterX = width * (0.5 - WORKFLOW_SHIFT_RATIO);
  const codeCenterX = width * SHEETS_HUB_X_RATIO;

  const lineStartX = sheetsCenterX + SHEETS_NODE_SIZE / 2 + SHEETS_OUT_ARROW_GAP;
  const lineEndX = codeCenterX - CODE_FRAME_WIDTH / 2 - SHEETS_OUT_ARROW_GAP;
  const fullLength = Math.max(0, lineEndX - lineStartX);

  const drawProgress = interpolate(frame, [0, SHEETS_OUT_ARROW_DRAW], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentLength = fullLength * drawProgress;

  const travelProgress = interpolate(frame, [0, SHEETS_OUT_PULSE_TRAVEL], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streakX =
    lineStartX +
    Math.max(0, fullLength - SHEETS_OUT_PULSE_WIDTH) * travelProgress;
  const streakOpacity = interpolate(
    frame,
    [0, 4, SHEETS_OUT_PULSE_TRAVEL - 3, SHEETS_OUT_PULSE_TRAVEL],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const arrowExit = interpolate(
    absFrame,
    [CODE_MORPH_START, CODE_MORPH_START + 12],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (frame < 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: arrowExit }}>
      <div
        style={{
          position: "absolute",
          left: lineStartX,
          top: cy - 1.5,
          width: currentLength,
          height: 3,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          willChange: "width",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lineStartX + currentLength - 2,
          top: cy,
          width: 0,
          height: 0,
          borderTop: `${SHEETS_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderBottom: `${SHEETS_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderLeft: `${SHEETS_OUT_ARROW_HEAD}px solid rgba(255, 255, 255, 0.35)`,
          transform: "translateY(-50%)",
          opacity: drawProgress,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: cy - 14,
          width: SHEETS_OUT_PULSE_WIDTH,
          height: 28,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accent} 0%, rgba(56,189,248,0.45) 28%, rgba(56,189,248,0) 72%)`,
          filter: "blur(5px)",
          boxShadow: `0 0 22px 6px rgba(56, 189, 248, 0.55)`,
          opacity: streakOpacity,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Reusable mac-style code panel: spring pop-in + burst typing + bottom
 * scroll. Used for Loc_phrase (front) and Dung payload Gemini (behind).
 */
const CodeFramePanel: React.FC<{
  popStart: number;
  typeStart: number;
  title: string;
  lines: readonly string[];
  lineStarts: number[];
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  skipMorph?: boolean;
  exitStart?: number;
  exitDuration?: number;
  /** Grow toward camera while fading (1 = no scale change). */
  exitScaleTo?: number;
  anchorX?: number;
}> = ({
  popStart,
  typeStart,
  title,
  lines,
  lineStarts,
  offsetX = 0,
  offsetY = 0,
  zIndex = 1,
  skipMorph = false,
  exitStart,
  exitDuration = 14,
  exitScaleTo = 1,
  anchorX,
}) => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - popStart;

  const cy = height / 2;
  const codeCenterX = anchorX ?? width * SHEETS_HUB_X_RATIO;

  const popScale = spring({ frame: Math.max(0, local), fps, config: CODE_FRAME_SPRING });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitOpacity = exitStart
    ? interpolate(
        absFrame,
        [exitStart, exitStart + exitDuration],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 1;
  const exitScale = exitStart
    ? interpolate(
        absFrame,
        [exitStart, exitStart + exitDuration],
        [1, exitScaleTo],
        {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      )
    : 1;

  // Morph-out with the sibling code frame → Code node handoff.
  const morphFrame = skipMorph ? -1 : absFrame - CODE_MORPH_START;
  const morphScale = interpolate(
    morphFrame,
    [0, 7, CODE_MORPH_DURATION],
    [1, 1.14, 0],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const morphOpacity = interpolate(
    morphFrame,
    [0, 10, CODE_MORPH_DURATION],
    [1, 0.85, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0 || morphOpacity <= 0.001 || exitOpacity <= 0.001) {
    return null;
  }

  const typeFrame = absFrame - typeStart;
  const titleBarHeight = 36;
  const contentPadY = 14;
  const lineHeight = 26;
  const contentHeight = CODE_FRAME_HEIGHT - titleBarHeight - contentPadY * 2;
  const visibleLines = Math.max(1, Math.floor(contentHeight / lineHeight));

  const rendered = lines.map((full, i) => {
    const lineStart = lineStarts[i] ?? 0;
    const elapsed = typeFrame - lineStart;
    if (elapsed < 0) {
      return null;
    }
    const chars = Math.min(
      full.length,
      Math.floor(elapsed / CODE_FRAMES_PER_CHAR),
    );
    const text = full.slice(0, chars);
    const isActive =
      chars < full.length ||
      (i < lines.length - 1 &&
        typeFrame < (lineStarts[i + 1] ?? lineStart) + 2);
    const cursorOn = isActive && Math.floor(absFrame / 8) % 2 === 0;

    return (
      <div
        key={i}
        style={{
          height: lineHeight,
          lineHeight: `${lineHeight}px`,
          whiteSpace: "pre",
          color:
            full.startsWith("return") ||
            full.includes("fatal") ||
            full.includes("geminiBody")
              ? "#86efac"
              : full.startsWith("const ") ||
                  full.startsWith("function") ||
                  full.startsWith("for ") ||
                  full.startsWith("if ") ||
                  full.startsWith("//")
                ? "#e2e8f0"
                : "#94a3b8",
        }}
      >
        {text}
        {cursorOn ? (
          <span style={{ color: SHEETS_GREEN, marginLeft: 1 }}>▌</span>
        ) : null}
      </div>
    );
  });

  const lastStartedIdx = lineStarts.reduce((acc, start, i) => {
    return typeFrame >= start ? i : acc;
  }, 0);
  const linesShown = lastStartedIdx + 1;
  const scrollY = Math.max(0, linesShown - visibleLines) * lineHeight;

  return (
    <AbsoluteFill style={{ zIndex }}>
      <div
        style={{
          position: "absolute",
          left: codeCenterX + offsetX,
          top: cy + offsetY,
          width: CODE_FRAME_WIDTH,
          height: CODE_FRAME_HEIGHT,
          transform: `translate(-50%, -50%) scale(${popScale * morphScale * exitScale})`,
          opacity: enterOpacity * morphOpacity * exitOpacity,
          borderRadius: 16,
          backgroundColor: "#12141c",
          border: "1.5px solid rgba(180, 180, 190, 0.4)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.55)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            height: titleBarHeight,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 14,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#ff5f57",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#febc2e",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#28c840",
            }}
          />
          <span
            className="select-none font-sans"
            style={{
              marginLeft: 8,
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {title}
          </span>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: `${contentPadY}px 18px`,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 15,
          }}
        >
          <div
            style={{
              transform: `translateY(${-scrollY}px)`,
              willChange: "transform",
            }}
          >
            {rendered}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Front code panel — Loc_phrase (n8n pool selection). */
const CodeFrame: React.FC = () => (
  <CodeFramePanel
    popStart={CODE_FRAME_POP_START}
    typeStart={CODE_TYPE_START}
    title="Loc_phrase"
    lines={CODE_LINES}
    lineStarts={CODE_LINE_STARTS}
    zIndex={2}
  />
);

/**
 * Back code panel — Dung_payload_gemini. Pops at frame 598, offset
 * up-right on a ~45° diagonal so it peeks out from behind Loc_phrase.
 */
const GeminiPayloadFrame: React.FC = () => {
  const diagonal = GEMINI_FRAME_DIAGONAL_OFFSET / Math.SQRT2;
  return (
    <CodeFramePanel
      popStart={GEMINI_FRAME_POP_START}
      typeStart={GEMINI_TYPE_START}
      title="Dung_payload_gemini"
      lines={GEMINI_FRAME_LINES}
      lineStarts={GEMINI_FRAME_LINE_STARTS}
      offsetX={diagonal}
      offsetY={-diagonal}
      zIndex={1}
    />
  );
};

/**
 * n8n Code node — pops at the code-frame hub as the panels morph out,
 * then slides left into the Sheets seat. Rounded square + connector nubs;
 * yellow stroke icon matches the n8n `node:code` glyph.
 */
const CodeNodeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = CODE_YELLOW,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden
    focusable="false"
  >
    <path
      stroke={color}
      strokeWidth="1.5"
      d="M9 3.75H6.25a1.5 1.5 0 0 0-1.5 1.5v4.129a1.5 1.5 0 0 1-.44 1.06L2.75 12l1.56 1.56a1.5 1.5 0 0 1 .44 1.061v4.129a1.5 1.5 0 0 0 1.5 1.5H9M15 3.75h2.75a1.5 1.5 0 0 1 1.5 1.5v4.129c0 .398.158.779.44 1.06L21.25 12l-1.56 1.56a1.5 1.5 0 0 0-.44 1.061v4.129a1.5 1.5 0 0 1-1.5 1.5H15"
    />
  </svg>
);

const CodeNodeBody: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - CODE_NODE_POP_START;

  const cy = height / 2;
  const hubX = width * SHEETS_HUB_X_RATIO;
  const sheetsSeatX = width * (0.5 - WORKFLOW_SHIFT_RATIO);

  const popScale = spring({
    frame: Math.max(0, local),
    fps,
    config: CODE_NODE_SPRING,
  });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideProgress = interpolate(
    absFrame,
    [CODE_SLIDE_START, CODE_SLIDE_START + CODE_SLIDE_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const x = interpolate(slideProgress, [0, 1], [hubX, sheetsSeatX]);

  const exitOpacity = interpolate(
    absFrame,
    [GEMINI_CENTER_START, GEMINI_CENTER_START + CODE_GEMINI_EXIT_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const nub = 14;

  if (local < 0 || exitOpacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: cy,
          width: CODE_NODE_SIZE,
          height: CODE_NODE_SIZE,
          transform: `translate(-50%, -50%) scale(${popScale})`,
          opacity: enterOpacity,
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -nub / 2,
            top: "50%",
            width: nub,
            height: nub,
            borderRadius: "50%",
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -nub / 2,
            top: "50%",
            width: nub,
            height: nub,
            borderRadius: "50%",
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 18,
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.45)",
          }}
        >
          <CodeNodeIcon size={56} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CodeNode: React.FC = () => {
  const absFrame = useCurrentFrame();
  const sliding =
    absFrame >= CODE_SLIDE_START &&
    absFrame <= CODE_SLIDE_START + CODE_SLIDE_DURATION;

  return sliding ? (
    <CameraMotionBlur samples={5} shutterAngle={360}>
      <CodeNodeBody />
    </CameraMotionBlur>
  ) : (
    <CodeNodeBody />
  );
};

/**
 * Arrow from the settled Code node (left) toward the Gemini mark (right hub).
 * Draws left→right with a traveling light streak that lands as Gemini pops.
 */
const CodeOutboundArrow: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - CODE_OUT_ARROW_START;
  const { width, height } = useVideoConfig();

  const cy = height / 2;
  const codeCenterX = width * (0.5 - WORKFLOW_SHIFT_RATIO);
  const geminiCenterX = width * SHEETS_HUB_X_RATIO;

  const lineStartX = codeCenterX + CODE_NODE_SIZE / 2 + CODE_OUT_ARROW_GAP;
  const lineEndX = geminiCenterX - GEMINI_LOGO_SIZE / 2 - CODE_OUT_ARROW_GAP;
  const fullLength = Math.max(0, lineEndX - lineStartX);

  const drawProgress = interpolate(frame, [0, CODE_OUT_ARROW_DRAW], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentLength = fullLength * drawProgress;

  const travelProgress = interpolate(frame, [0, CODE_OUT_PULSE_TRAVEL], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streakX =
    lineStartX + Math.max(0, fullLength - CODE_OUT_PULSE_WIDTH) * travelProgress;
  const streakOpacity = interpolate(
    frame,
    [0, 4, CODE_OUT_PULSE_TRAVEL - 3, CODE_OUT_PULSE_TRAVEL],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const exitOpacity = interpolate(
    absFrame,
    [GEMINI_CENTER_START, GEMINI_CENTER_START + CODE_GEMINI_EXIT_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (frame < 0 || exitOpacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          left: lineStartX,
          top: cy - 1.5,
          width: currentLength,
          height: 3,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          willChange: "width",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lineStartX + currentLength - 2,
          top: cy,
          width: 0,
          height: 0,
          borderTop: `${CODE_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderBottom: `${CODE_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderLeft: `${CODE_OUT_ARROW_HEAD}px solid rgba(255, 255, 255, 0.35)`,
          transform: "translateY(-50%)",
          opacity: drawProgress,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: cy - 14,
          width: CODE_OUT_PULSE_WIDTH,
          height: 28,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accent} 0%, rgba(56,189,248,0.45) 28%, rgba(56,189,248,0) 72%)`,
          filter: "blur(5px)",
          boxShadow: `0 0 22px 6px rgba(56, 189, 248, 0.55)`,
          opacity: streakOpacity,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Free-floating Gemini mark — pop + spin at the hub, then flies straight
 * to the left seat (×2 scale) while Code/arrow fade — no centre pause.
 * Idle "thinking" pulse: bounce + full turn, four times. Copy bars grow
 * in the lane on the right (`GeminiCopyEmit`).
 */
const GeminiLogoReveal: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - GEMINI_LOGO_POP_START;

  const hubX = width * SHEETS_HUB_X_RATIO;
  const leftX = geminiCopyLeftX(width);
  const cy = height / 2;
  const dock = copyDockedGeminiPos(width, height);

  const popScale = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 8, mass: 0.7, stiffness: 165 },
  });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Entry spin (settles before / during the left fly-in).
  const entryRotation = interpolate(local, [0, GEMINI_SPIN_FRAMES], [0, 360], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // One continuous flight: hub → left seat (never parks at centre).
  const travelProgress = interpolate(
    absFrame,
    [GEMINI_CENTER_START, GEMINI_CENTER_START + GEMINI_CENTER_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const logoX = interpolate(travelProgress, [0, 1], [hubX, leftX]);
  const centerScale = interpolate(
    travelProgress,
    [0, 1],
    [1, GEMINI_CENTER_SCALE],
  );

  const dockProgress = interpolate(
    absFrame,
    [COPY_DOCK_START, COPY_DOCK_START + COPY_DOCK_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const logoXNow = interpolate(dockProgress, [0, 1], [logoX, dock.x]);
  const logoYNow = interpolate(dockProgress, [0, 1], [cy, dock.y]);
  const dockScaleMul = interpolate(
    dockProgress,
    [0, 1],
    [1, GEMINI_DOCK_SCALE / GEMINI_CENTER_SCALE / COPY_DOCK_CLUSTER_SHRINK],
  );

  // Thinking cycles: bounce + full turn — 60f (~2s) each.
  const thinkLocal = absFrame - GEMINI_THINK_START;
  const { thinkBounce, thinkSpin, thinkBloomPulse } =
    geminiThinkMotion(thinkLocal);

  const rotation = entryRotation + thinkSpin;
  const scale = popScale * centerScale * thinkBounce * dockScaleMul;
  const dockBloomFade = interpolate(dockProgress, [0, 1], [1, 0.25]);

  const bloomBase = interpolate(local, [0, 6, 18, 36], [0, 1, 0.7, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bloom =
    (thinkLocal >= 0 ? Math.max(bloomBase, thinkBloomPulse) : bloomBase) *
    dockBloomFade;

  const ringScale = interpolate(local, [0, 14], [0.4, 1.35], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(local, [0, 5, 20], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Soft thinking halo while centred.
  const thinkHalo = interpolate(
    absFrame,
    [GEMINI_CENTER_START, GEMINI_CENTER_START + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0) {
    return null;
  }

  const copyExit = illustrateExitOpacity(absFrame);

  return (
    <AbsoluteFill style={{ opacity: copyExit }}>
      <div
        style={{
          position: "absolute",
          left: logoXNow,
          top: logoYNow,
          width: GEMINI_LOGO_SIZE * 1.8,
          height: GEMINI_LOGO_SIZE * 1.8,
          borderRadius: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity * (1 - dockProgress),
          background:
            "radial-gradient(circle, rgba(138,180,248,0.55) 0%, rgba(77,201,240,0.25) 38%, rgba(77,201,240,0) 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: logoXNow,
          top: logoYNow,
          width: GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE * 1.6,
          height: GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE * 1.6,
          borderRadius: "50%",
          transform: `translate(-50%, -50%) scale(${0.85 + 0.2 * thinkBloomPulse})`,
          opacity: thinkHalo * (0.35 + 0.35 * thinkBloomPulse) * (1 - dockProgress),
          background:
            "radial-gradient(circle, rgba(138,180,248,0.4) 0%, rgba(77,201,240,0.18) 42%, rgba(77,201,240,0) 72%)",
          filter: "blur(12px)",
          pointerEvents: "none",
        }}
      />
      <CameraMotionBlur samples={3} shutterAngle={180}>
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: logoXNow,
              top: logoYNow,
              width: GEMINI_LOGO_SIZE,
              height: GEMINI_LOGO_SIZE,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              opacity: enterOpacity,
              willChange: "transform, opacity",
              filter: `drop-shadow(0 0 ${18 * bloom}px rgba(138, 180, 248, 0.85)) drop-shadow(0 0 ${36 * bloom}px rgba(77, 201, 240, 0.45))`,
            }}
          >
            <Img
              src={staticFile("logos/gemini.webp")}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </AbsoluteFill>
      </CameraMotionBlur>
    </AbsoluteFill>
  );
};

/** Green check used when a GeminiCopyEmit line finishes typing. */
const CopyEmitTick: React.FC<{ size?: number; opacity?: number }> = ({
  size = 22,
  opacity = 1,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ opacity, flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10" fill={SHEETS_GREEN} fillOpacity="0.2" />
    <path
      d="M7.5 12.5l3 3 6-7"
      stroke={SHEETS_GREEN}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * GeminiCopyEmit — fitted glass frame wipes in (TL→BR) with a spinning
 * 4-colour border glow (ring only), then each copy field elongates as a
 * loading bar and reveals. Cluster scaled 30%, centred in the right half.
 */
const GeminiCopyEmit: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const clusterCXRest = geminiCopyClusterCenterX(width);
  const clusterCXDocked = copyDockedClusterCX(width);
  const dockProgress = interpolate(
    absFrame,
    [COPY_DOCK_START, COPY_DOCK_START + COPY_DOCK_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const clusterCX = interpolate(
    dockProgress,
    [0, 1],
    [clusterCXRest, clusterCXDocked],
  );
  const clusterScale = interpolate(
    dockProgress,
    [0, 1],
    [COPY_CLUSTER_SCALE, COPY_CLUSTER_SCALE / COPY_DOCK_CLUSTER_SHRINK],
  );
  const cy = height / 2;
  const tickFade = interpolate(
    absFrame,
    [COPY_DOCK_START, COPY_DOCK_START + COPY_TICK_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const glassLocal = absFrame - (GEMINI_THINK_START + COPY_GLASS_START);
  const glassWipe = interpolate(
    glassLocal,
    [0, COPY_GLASS_REVEAL_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const glassOpacity = interpolate(glassLocal, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const borderAngle = Math.max(0, glassLocal) * 7;

  const rows = GEMINI_COPY_LINES.map((line, i) => {
    const isCta = "isCta" in line && line.isCta;
    const isSub = line.role.startsWith("sub");
    const isMain = line.role.startsWith("main");
    const ctaHeight = "ctaHeight" in line ? line.ctaHeight : line.thinHeight;
    const emitStart = GEMINI_THINK_START + line.emitAt;
    const local = absFrame - emitStart;

    const growProgress = interpolate(local, [0, COPY_BAR_GROW_DURATION], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const revealStart = COPY_BAR_GROW_DURATION + COPY_BAR_HOLD_DURATION;
    const revealProgress = interpolate(
      local,
      [revealStart, revealStart + COPY_BAR_REVEAL_DURATION],
      [0, 1],
      {
        easing: INTRODUCE_EASING,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

    const barWidthNow = growProgress * line.barWidth;
    const barHeightNow = isCta
      ? interpolate(revealProgress, [0, 1], [line.thinHeight, ctaHeight])
      : line.thinHeight;
    const barOpacity = isCta ? 1 : interpolate(revealProgress, [0, 1], [1, 0]);
    const barColor = isCta
      ? mixHexColors(COPY_BAR_BASE_COLOR, COPY_CTA_PURPLE, revealProgress)
      : COPY_BAR_BASE_COLOR;

    const shimmerT =
      (Math.max(0, local) % COPY_SHIMMER_PERIOD) / COPY_SHIMMER_PERIOD;
    const shimmerLeft = interpolate(shimmerT, [0, 1], [-45, 130]);
    const shimmerOpacity = interpolate(revealProgress, [0, 1], [1, 0]);

    const textOpacity = interpolate(revealProgress, [0, 1], [0, 1]);

    const tickLocal = local - revealStart - COPY_TICK_DELAY;
    // Ticks on headline / eyebrow / main / CTA — not on sub lines.
    const tickOpacity = isSub
      ? 0
      : interpolate(tickLocal, [0, 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }) * tickFade;

    const rowEnterOpacity = interpolate(local, [0, 4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const rowHeight = isCta ? ctaHeight : Math.round(line.fontSize * 1.45);
    const marginTop =
      i === 0
        ? 0
        : line.role === "eyebrow"
          ? 10
          : isSub
            ? 4
            : isCta
              ? 28
              : isMain && line.role === "main1"
                ? 26
                : isMain
                  ? 16
                  : 18;

    return {
      line,
      local,
      isCta,
      barWidthNow,
      barHeightNow,
      barOpacity,
      barColor,
      shimmerLeft,
      shimmerOpacity,
      textOpacity,
      tickOpacity,
      rowEnterOpacity,
      rowHeight,
      marginTop,
    };
  });

  if (glassLocal < 0) {
    return null;
  }

  const wipePct = glassWipe * 120;
  const [c0, c1, c2, c3] = COPY_GLASS_BORDER_COLORS;

  const copyExit = illustrateExitOpacity(absFrame);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: copyExit }}>
      <div
        style={{
          position: "absolute",
          left: clusterCX,
          top: cy,
          width: COPY_GLASS_WIDTH,
          height: COPY_GLASS_HEIGHT,
          transform: `translate(-50%, -50%) scale(${clusterScale})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        {/* Frame shell — diagonal wipe TL → BR */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: COPY_GLASS_RADIUS,
            opacity: glassOpacity,
            WebkitMaskImage: `linear-gradient(135deg, #000 0%, #000 ${Math.max(0, wipePct - 18)}%, transparent ${wipePct}%)`,
            maskImage: `linear-gradient(135deg, #000 0%, #000 ${Math.max(0, wipePct - 18)}%, transparent ${wipePct}%)`,
          }}
        >
          {/* Rotating 4-colour glow — border ring only (centre punched out) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: COPY_GLASS_RADIUS,
              padding: COPY_GLASS_BORDER,
              background: `conic-gradient(from ${borderAngle}deg, ${c0}, ${c1}, ${c2}, ${c3}, ${c0})`,
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              boxShadow: `0 0 14px 1px rgba(48,132,252,0.45), 0 0 22px 2px rgba(228,72,84,0.28)`,
            }}
          />
          {/* Neutral frosted glass fill — no spectrum colours inside */}
          <div
            style={{
              position: "absolute",
              inset: COPY_GLASS_BORDER,
              borderRadius: COPY_GLASS_RADIUS - 2,
              background: "rgba(255, 255, 255, 0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          />
        </div>

        {/* Copy rows — padded to match the fitted frame */}
        <div
          style={{
            position: "absolute",
            left: COPY_GLASS_PAD,
            top: COPY_GLASS_PAD,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: GEMINI_COPY_STACK_WIDTH + GEMINI_COPY_TICK_SLACK,
          }}
        >
          {rows.map((row) => {
            const {
              line,
              local,
              isCta,
              barWidthNow,
              barHeightNow,
              barOpacity,
              barColor,
              shimmerLeft,
              shimmerOpacity,
              textOpacity,
              tickOpacity,
              rowEnterOpacity,
              rowHeight,
              marginTop,
            } = row;

            if (local < 0) {
              return (
                <div
                  key={line.role}
                  style={{ height: rowHeight, marginTop, opacity: 0 }}
                />
              );
            }

            return (
              <div
                key={line.role}
                style={{
                  position: "relative",
                  height: rowHeight,
                  marginTop,
                  display: "flex",
                  alignItems: "center",
                  opacity: rowEnterOpacity,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    width: Math.max(0, barWidthNow),
                    height: barHeightNow,
                    borderRadius: barHeightNow / 2,
                    backgroundColor: barColor,
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    overflow: "hidden",
                    opacity: barOpacity,
                    transform: "translateY(-50%)",
                    willChange: "width, opacity",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `${shimmerLeft}%`,
                      width: "40%",
                      height: "100%",
                      background:
                        "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0) 100%)",
                      opacity: shimmerOpacity,
                    }}
                  />
                </div>

                {isCta ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: textOpacity,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: Math.max(barWidthNow, line.barWidth * 0.01),
                        height: barHeightNow,
                      }}
                    >
                      <span
                        className="select-none font-sans"
                        style={{
                          fontSize: line.fontSize,
                          fontWeight: line.fontWeight,
                          letterSpacing: line.letterSpacing,
                          color: line.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line.text}
                      </span>
                    </div>
                    {tickOpacity > 0.01 ? (
                      <CopyEmitTick size={18} opacity={tickOpacity} />
                    ) : null}
                  </div>
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: textOpacity,
                    }}
                  >
                    <span
                      className="select-none font-sans"
                      style={{
                        fontSize: line.fontSize,
                        fontWeight: line.fontWeight,
                        letterSpacing: line.letterSpacing,
                        color: line.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {line.text}
                    </span>
                    {tickOpacity > 0.01 ? (
                      <CopyEmitTick size={18} opacity={tickOpacity} />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Landscape review code card — same spring pop + burst typing as
 * Loc_phrase, but sized/shaped like the docked Gemini copy frame
 * (25% smaller) and placed in the right-half upper or lower seat.
 */
const ReviewCodeFrame: React.FC<{
  popStart: number;
  typeStart: number;
  title: string;
  lines: readonly string[];
  lineStarts: number[];
  centerX: number;
  centerY: number;
  zIndex?: number;
  exitScale?: number;
  exitOpacity?: number;
}> = ({
  popStart,
  typeStart,
  title,
  lines,
  lineStarts,
  centerX,
  centerY,
  zIndex = 0,
  exitScale = 1,
  exitOpacity = 1,
}) => {
  const absFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = absFrame - popStart;

  const popScale = spring({
    frame: Math.max(0, local),
    fps,
    config: CODE_FRAME_SPRING,
  });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (local < 0) {
    return null;
  }

  const typeFrame = absFrame - typeStart;
  const titleBarHeight = 28;
  const contentPadY = 8;
  const lineHeight = 16;
  const contentHeight = REVIEW_FRAME_HEIGHT - titleBarHeight - contentPadY * 2;
  const visibleLines = Math.max(1, Math.floor(contentHeight / lineHeight));

  const rendered = lines.map((full, i) => {
    const lineStart = lineStarts[i] ?? 0;
    const elapsed = typeFrame - lineStart;
    if (elapsed < 0) {
      return null;
    }
    const chars = Math.min(
      full.length,
      Math.floor(elapsed / REVIEW_FRAMES_PER_CHAR),
    );
    const text = full.slice(0, chars);
    const isActive =
      chars < full.length ||
      (i < lines.length - 1 &&
        typeFrame < (lineStarts[i + 1] ?? lineStart) + 2);
    const cursorOn = isActive && Math.floor(absFrame / 8) % 2 === 0;

    return (
      <div
        key={i}
        style={{
          height: lineHeight,
          lineHeight: `${lineHeight}px`,
          whiteSpace: "pre",
          overflow: "hidden",
          color:
            full.startsWith("return") ||
            full.includes("fatal") ||
            full.includes("pass:")
              ? "#86efac"
              : full.startsWith("const ") ||
                  full.startsWith("let ") ||
                  full.startsWith("for ") ||
                  full.startsWith("if ") ||
                  full.startsWith("try") ||
                  full.startsWith("} catch") ||
                  full.startsWith("//")
                ? "#e2e8f0"
                : "#94a3b8",
        }}
      >
        {text}
        {cursorOn ? (
          <span style={{ color: SHEETS_GREEN, marginLeft: 1 }}>▌</span>
        ) : null}
      </div>
    );
  });

  const lastStartedIdx = lineStarts.reduce((acc, start, i) => {
    return typeFrame >= start ? i : acc;
  }, 0);
  const linesShown = lastStartedIdx + 1;
  const scrollY = Math.max(0, linesShown - visibleLines) * lineHeight;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        left: centerX,
        top: centerY,
        width: REVIEW_FRAME_WIDTH,
        height: REVIEW_FRAME_HEIGHT,
        transform: `translate(-50%, -50%) scale(${popScale * exitScale})`,
        opacity: enterOpacity * exitOpacity,
        borderRadius: REVIEW_FRAME_RADIUS,
        backgroundColor: "#12141c",
        border: "1.5px solid rgba(180, 180, 190, 0.4)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.55)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        willChange: "transform, opacity",
        zIndex,
      }}
    >
      <div
        style={{
          height: titleBarHeight,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingLeft: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#ff5f57",
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#febc2e",
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#28c840",
          }}
        />
        <span
          className="select-none font-sans"
          style={{
            marginLeft: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: `${contentPadY}px 12px`,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 11,
        }}
      >
        <div
          style={{
            transform: `translateY(${-scrollY}px)`,
            willChange: "transform",
          }}
        >
          {rendered}
        </div>
      </div>
    </div>
    </AbsoluteFill>
  );
};

/**
 * Two S-curve arrows from the docked Gemini frame. Paths leave horizontally,
 * wave toward the upper/lower seats, then flatten so they arrive pointing
 * right. Arrowheads only fade in once the stroke reaches the tip — SVG
 * markers would sit at the destination from frame 0.
 */
const ReviewSplitArrows: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = absFrame - REVIEW_ARROW_START;

  const dockCX = copyDockedClusterCX(width);
  const dockedHalfW = copyClusterVisualHalfW() / COPY_DOCK_CLUSTER_SHRINK;
  const startX = dockCX + dockedHalfW;
  const startY = height / 2;

  const top = reviewCheckCenter(width, height);
  const bot = reviewLayoutCenter(width, height);
  const endTopX = top.x - REVIEW_FRAME_WIDTH / 2 - 8;
  const endBotX = bot.x - REVIEW_FRAME_WIDTH / 2 - 8;
  const endTopY = top.y;
  const endBotY = bot.y;

  const draw = interpolate(local, [0, REVIEW_ARROW_DRAW], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headOpacity = interpolate(
    absFrame,
    [REVIEW_ARROW_HEAD_FADE_START, REVIEW_ARROW_HEAD_FADE_START + REVIEW_ARROW_HEAD_FADE_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0) {
    return null;
  }

  const arrowExit = illustrateExitOpacity(absFrame);

  // Cubic S: leave along +X, arrive along +X (horizontal into the seats).
  const spanTop = endTopX - startX;
  const spanBot = endBotX - startX;
  const dTop = `M ${startX} ${startY} C ${startX + spanTop * 0.38} ${startY}, ${endTopX - spanTop * 0.32} ${endTopY}, ${endTopX} ${endTopY}`;
  const dBot = `M ${startX} ${startY} C ${startX + spanBot * 0.38} ${startY}, ${endBotX - spanBot * 0.32} ${endBotY}, ${endBotX} ${endBotY}`;

  const headW = 14;
  const headH = 11;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: arrowExit }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {[dTop, dBot].map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
          />
        ))}
        {[
          { x: endTopX, y: endTopY },
          { x: endBotX, y: endBotY },
        ].map((tip) => (
          <path
            key={`${tip.x}-${tip.y}`}
            d={`M ${tip.x} ${tip.y - headH / 2} L ${tip.x + headW} ${tip.y} L ${tip.x} ${tip.y + headH / 2} Z`}
            fill="rgba(255,255,255,0.4)"
            opacity={headOpacity}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

const useReviewSlide = (
  startSeat: { x: number; y: number },
  endSeat: { x: number; y: number },
) => {
  const absFrame = useCurrentFrame();
  const progress = interpolate(
    absFrame,
    [ILLUSTRATE_START, ILLUSTRATE_START + ILLUSTRATE_SLIDE_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return {
    x: interpolate(progress, [0, 1], [startSeat.x, endSeat.x]),
    y: interpolate(progress, [0, 1], [startSeat.y, endSeat.y]),
  };
};

const useMergeExit = () => {
  const absFrame = useCurrentFrame();
  const local = absFrame - MERGE_START;
  const exitScale = interpolate(
    local,
    [0, MERGE_POP, MERGE_DURATION],
    [1, 1.16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const exitOpacity = interpolate(
    local,
    [MERGE_POP + 2, MERGE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const travel = interpolate(local, [0, MERGE_DURATION], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { exitScale, exitOpacity, travel };
};

const ReviewCheckFrame: React.FC = () => {
  const { width, height } = useVideoConfig();
  const start = reviewCheckCenter(width, height);
  const end = reviewCheckLeftCenter(width, height);
  const slid = useReviewSlide(start, end);
  const merge = promptMergeCenter(width, height);
  const { exitScale, exitOpacity, travel } = useMergeExit();
  return (
    <ReviewCodeFrame
      popStart={REVIEW_FRAME_POP_START}
      typeStart={REVIEW_TYPE_START}
      title="Kiem tra noi dung"
      lines={REVIEW_CHECK_LINES}
      lineStarts={REVIEW_CHECK_LINE_STARTS}
      centerX={interpolate(travel, [0, 1], [slid.x, merge.x])}
      centerY={interpolate(travel, [0, 1], [slid.y, merge.y])}
      exitScale={exitScale}
      exitOpacity={exitOpacity}
    />
  );
};

const ReviewLayoutFrame: React.FC = () => {
  const { width, height } = useVideoConfig();
  const start = reviewLayoutCenter(width, height);
  const end = reviewLayoutLeftCenter(width, height);
  const { x, y } = useReviewSlide(start, end);
  const { exitScale, exitOpacity } = useMergeExit();
  return (
    <ReviewCodeFrame
      popStart={REVIEW_FRAME_POP_START}
      typeStart={REVIEW_TYPE_START}
      title="Chon layout va asset"
      lines={REVIEW_LAYOUT_LINES}
      lineStarts={REVIEW_LAYOUT_LINE_STARTS}
      centerX={x}
      centerY={y}
      zIndex={LAYOUT_ORBIT_FRAME_Z}
      exitScale={exitScale}
      exitOpacity={exitOpacity}
    />
  );
};

type IllustrateCheckItem = {
  label: string;
  role: IllustrateRole;
  rise: number;
  rowOpacity: number;
  barWidthNow: number;
  barOpacity: number;
  tickOpacity: number;
  shimmerLeft: number;
};

const IllustrateCheckRow: React.FC<{ item: IllustrateCheckItem }> = ({
  item,
}) => {
  const style = ILLUSTRATE_ROLE_STYLE[item.role];
  const isCta = item.role === "cta";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: item.rowOpacity,
        transform: `translateY(${item.rise}px)`,
      }}
    >
      {isCta ? (
        <div
          style={{
            fontFamily: COPY_FONT_FAMILY,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            backgroundColor: COPY_CTA_PURPLE,
            padding: "13px 28px",
            borderRadius: 999,
            boxShadow: "0 6px 16px rgba(108, 47, 203, 0.45)",
          }}
        >
          {item.label}
        </div>
      ) : (
        <span
          style={{
            fontFamily: COPY_FONT_FAMILY,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            color: "#F4F7FB",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </span>
      )}
      <div
        style={{
          width: ILLUSTRATE_INDICATOR_SLOT,
          height: ILLUSTRATE_TICK_SIZE,
          flexShrink: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            width: item.barWidthNow,
            height: ILLUSTRATE_BAR_HEIGHT,
            borderRadius: ILLUSTRATE_BAR_HEIGHT / 2,
            backgroundColor: "#3A3A44",
            opacity: item.barOpacity,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: item.shimmerLeft,
              width: 22,
              height: "100%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))",
            }}
          />
        </div>
        <div style={{ position: "absolute", left: 0 }}>
          <CopyEmitTick size={ILLUSTRATE_TICK_SIZE} opacity={item.tickOpacity} />
        </div>
      </div>
    </div>
  );
};

/** Vertical rule that dissolves at both ends. */
const FadeColumnRule: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      width: 1,
      alignSelf: "stretch",
      flexShrink: 0,
      opacity,
      background:
        "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 18%, rgba(255,255,255,0.34) 82%, rgba(255,255,255,0) 100%)",
    }}
  />
);

/**
 * Right-side content checklist, laid out as 3 columns beside the
 * "Kiem tra noi dung" frame:
 *   [Headline + Eyebrow] | [3× Main/Sub pairs] | [CTA button]
 * Dividers fade out at the top and bottom so they don't read as hard cuts.
 */
const IllustrateCheckList: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = absFrame - ILLUSTRATE_DETAIL_START;

  const items = ILLUSTRATE_CHECK_ITEMS.map(({ label, role }, i) => {
    const itemLocal = local - 4 - i * ILLUSTRATE_CHECK_STAGGER;
    const rise = interpolate(itemLocal, [0, 14], [ILLUSTRATE_CHECK_RISE, 0], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rowOpacity = interpolate(itemLocal, [0, 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const growProgress = interpolate(
      itemLocal,
      [4, ILLUSTRATE_BAR_GROW_END],
      [0, 1],
      {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    const barWidthNow = growProgress * ILLUSTRATE_BAR_WIDTH;
    const barOpacity = interpolate(
      itemLocal,
      [ILLUSTRATE_BAR_HOLD_END, ILLUSTRATE_BAR_REVEAL_END],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    const tickOpacity = interpolate(
      itemLocal,
      [ILLUSTRATE_BAR_HOLD_END + 3, ILLUSTRATE_BAR_REVEAL_END + 3],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    const shimmerT = (Math.max(0, itemLocal) % 26) / 26;
    const shimmerLeft = interpolate(shimmerT, [0, 1], [-30, 70]);

    return {
      label,
      role,
      rise,
      rowOpacity,
      barWidthNow,
      barOpacity,
      tickOpacity,
      shimmerLeft,
    };
  });

  const ruleOpacity = interpolate(local, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mergeLocal = absFrame - MERGE_START;
  const mergeTravel = interpolate(mergeLocal, [0, MERGE_DURATION], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mergeScale = interpolate(
    mergeLocal,
    [0, MERGE_POP, MERGE_DURATION],
    [1, 1.06, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const mergeOpacity = interpolate(
    mergeLocal,
    [MERGE_POP + 2, MERGE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0) {
    return null;
  }

  const col1 = items.filter(
    (item) => item.role === "headline" || item.role === "eyebrow",
  );
  const col2 = items.filter(
    (item) => item.role === "main" || item.role === "sub",
  );
  const col3 = items.filter((item) => item.role === "cta");
  const checkSeat = reviewCheckLeftCenter(width, height);
  const mascotHubX = width * 0.75;
  const merge = promptMergeCenter(width, height);
  const clusterX = interpolate(mergeTravel, [0, 1], [mascotHubX, merge.x]);
  const clusterY = interpolate(mergeTravel, [0, 1], [checkSeat.y, merge.y]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: mergeOpacity }}>
      <div
        style={{
          position: "absolute",
          left: clusterX,
          top: clusterY,
          width: width * 0.48,
          transform: `translate(-50%, -50%) scale(${mergeScale})`,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "stretch",
          columnGap: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "stretch",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
            }}
          >
            {col1.map((item) => (
              <IllustrateCheckRow key={item.label} item={item} />
            ))}
          </div>
          <FadeColumnRule opacity={ruleOpacity} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {[0, 2, 4].map((start) => (
            <div
              key={col2[start]?.label ?? start}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginBottom: start === 4 ? 0 : 8,
              }}
            >
              {col2.slice(start, start + 2).map((item) => (
                <IllustrateCheckRow key={item.label} item={item} />
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "stretch",
            gap: 28,
          }}
        >
          <FadeColumnRule opacity={ruleOpacity} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {col3.map((item) => (
              <IllustrateCheckRow key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Bottom-edge mascot arc: a frosted glass dock (rounded top, bleeding off
 * the bottom edge) houses 5 mascots that rotate through the front seat one
 * at a time. The first 4 pass the centre without a select beat; only
 * mascot 5 dips + radiates a slow purple pulse — "the system picked this".
 */
const MascotArcCarousel: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = absFrame - ILLUSTRATE_DETAIL_START;

  const enter = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leftoverFade = interpolate(
    absFrame,
    [MERGE_START, MERGE_START + 16],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const clusterSlide = imgClusterSlide(absFrame);
  const exitOp = imgLeftExitOpacity(absFrame);
  const mascotSeat = imgClusterMascotSeat(width, height);
  const spinLocal = Math.max(0, local - 8);
  const rotation = interpolate(
    spinLocal,
    [
      0,
      MASCOT_HIT_GAP,
      MASCOT_HIT_GAP * 2,
      MASCOT_HIT_GAP * 3,
      MASCOT_HIT_GAP * 4,
    ],
    [
      0,
      -MASCOT_ANGLE_STEP,
      -MASCOT_ANGLE_STEP * 2,
      -MASCOT_ANGLE_STEP * 3,
      -MASCOT_ANGLE_STEP * 4,
    ],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  if (local < 0 || exitOp <= 0.001) {
    return null;
  }

  const hubX = width * 0.75;
  const hubY = height + 6;

  const nearestStep = Math.min(
    MASCOT_LAST_INDEX,
    Math.max(0, Math.round(spinLocal / MASCOT_HIT_GAP)),
  );
  const isFinalPick = nearestStep === MASCOT_LAST_INDEX;
  const distToSettle = spinLocal - nearestStep * MASCOT_HIT_GAP;
  const settleT = isFinalPick
    ? Math.max(0, 1 - Math.abs(distToSettle) / MASCOT_SETTLE_WINDOW)
    : 0;
  const pulseLocal = isFinalPick ? distToSettle : -1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: enter * exitOp }}>
      {/* Frosted dock panel */}
      <div
        style={{
          position: "absolute",
          left: hubX,
          top: hubY - MASCOT_DOCK_HEIGHT * 0.62,
          width: MASCOT_DOCK_WIDTH,
          height: MASCOT_DOCK_HEIGHT,
          transform: "translate(-50%, 0)",
          borderRadius: `${MASCOT_DOCK_WIDTH / 2}px ${MASCOT_DOCK_WIDTH / 2}px 0 0`,
          backgroundColor: "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderBottom: "none",
          backdropFilter: "blur(18px)",
          boxShadow: "0 -18px 50px rgba(0,0,0,0.25)",
          opacity: leftoverFade,
        }}
      />

      {/* Slow purple "selected" pulse under the front mascot */}
      {pulseLocal >= 0 && pulseLocal <= MASCOT_PULSE_DURATION ? (
        <div
          style={{
            position: "absolute",
            left: hubX,
            top: hubY - MASCOT_RADIUS,
            width: MASCOT_SIZE,
            height: MASCOT_SIZE,
            transform: `translate(-50%, -50%) scale(${interpolate(
              pulseLocal,
              [0, MASCOT_PULSE_DURATION],
              [0.85, 2.1],
              { easing: Easing.out(Easing.cubic) },
            )})`,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(108,47,203,0.95) 0%, rgba(124,58,237,0.7) 28%, rgba(124,58,237,0.35) 52%, rgba(124,58,237,0) 74%)",
            opacity: interpolate(
              pulseLocal,
              [0, 8, MASCOT_PULSE_DURATION],
              [0, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        />
      ) : null}

      {MASCOT_FILES.map((src, i) => {
        const angle = rotation + i * MASCOT_ANGLE_STEP;
        const arcX = hubX + MASCOT_RADIUS * Math.sin(angle);
        const arcY = hubY - MASCOT_RADIUS * Math.cos(angle);
        const isSelected = isFinalPick && i === MASCOT_LAST_INDEX;
        const x = isSelected
          ? interpolate(clusterSlide, [0, 1], [arcX, mascotSeat.x])
          : arcX;
        const y = isSelected
          ? interpolate(clusterSlide, [0, 1], [arcY, mascotSeat.y])
          : arcY;
        const front = (Math.cos(angle) + 1) / 2;
        const squishDip = isSelected ? settleT * 14 : 0;
        const squishScaleY = isSelected ? 1 - settleT * 0.1 : 1;
        const squishScaleX = isSelected ? 1 + settleT * 0.05 : 1;

        const scale = interpolate(front, [0, 1], [0.8, 1.05]);
        const towardCenter = Math.max(0, Math.cos(angle));
        const opacity =
          interpolate(towardCenter, [0.55, 1], [0.22, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * (isSelected ? 1 : leftoverFade);
        const tilt =
          ((angle * 180) / Math.PI) *
          MASCOT_TILT *
          (isSelected ? 1 - clusterSlide : 1);
        const tile = clusterTileSize();
        const boxSize = isSelected
          ? interpolate(clusterSlide, [0, 1], [MASCOT_SIZE, tile])
          : MASCOT_SIZE;
        const visScale = isSelected
          ? interpolate(clusterSlide, [0, 1], [scale, 1])
          : scale;

        return (
          <div
            key={src}
            style={{
              position: "absolute",
              left: x,
              top: y + squishDip,
              width: boxSize,
              height: boxSize,
              transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${
                visScale * squishScaleX
              }, ${visScale * squishScaleY})`,
              opacity,
              borderRadius: 26,
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(2px)",
              boxShadow: isSelected
                ? `0 0 28px rgba(124,58,237,${0.55 + settleT * 0.35}), 0 16px 30px rgba(108,47,203,${0.4 + settleT * 0.3})`
                : `0 12px 24px rgba(0,0,0,${0.22 + front * 0.24})`,
              zIndex: Math.round(front * 20),
            }}
          >
            <Img
              src={staticFile(src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: 10,
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Layout squares orbiting "Chon layout va asset": each of the 4 images
 * runs its own elliptical trajectory (own radius + phase + speed) around
 * the frame, so they read as independent satellites rather than one
 * shared ring. On the near half of its orbit a square renders above the
 * code frame; on the far half it renders fully behind it (hidden).
 */
const LayoutOrbit: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const start = reviewLayoutCenter(width, height);
  const end = reviewLayoutLeftCenter(width, height);
  const hub = useReviewSlide(start, end);
  const local = absFrame - ILLUSTRATE_DETAIL_START;

  const enter = interpolate(local, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const flyStart = SELECT_HIT_FRAME - LAYOUT_FLY_DURATION;
  const flyProgress = interpolate(absFrame, [flyStart, SELECT_HIT_FRAME], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pickLocal = absFrame - SELECT_HIT_FRAME;
  const settleT = Math.max(
    0,
    1 - Math.abs(pickLocal) / MASCOT_SETTLE_WINDOW,
  );
  const pulseLocal = pickLocal;
  const unpickedOpacity = interpolate(
    absFrame,
    [SELECT_HIT_FRAME, SELECT_HIT_FRAME + 14],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const absorbScale = interpolate(
    absFrame,
    [MERGE_START, MERGE_START + MERGE_POP, MERGE_START + MERGE_DURATION],
    [1, 1.14, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const clusterSlide = imgClusterSlide(absFrame);
  const exitOp = imgLeftExitOpacity(absFrame);
  const clusterSeat = imgClusterLayoutSeat(width, height);

  if (local < 0 || exitOp <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: enter * exitOp }}>
      {pulseLocal >= 0 && pulseLocal <= MASCOT_PULSE_DURATION ? (
        <div
          style={{
            position: "absolute",
            left: hub.x,
            top: hub.y,
            width: LAYOUT_ORBIT_SIZE,
            height: LAYOUT_ORBIT_SIZE,
            transform: `translate(-50%, -50%) scale(${interpolate(
              pulseLocal,
              [0, MASCOT_PULSE_DURATION],
              [0.85, 2.1],
              { easing: Easing.out(Easing.cubic) },
            )})`,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(108,47,203,0.95) 0%, rgba(124,58,237,0.7) 28%, rgba(124,58,237,0.35) 52%, rgba(124,58,237,0) 74%)",
            opacity: interpolate(
              pulseLocal,
              [0, 8, MASCOT_PULSE_DURATION],
              [0, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            zIndex: LAYOUT_SELECT_Z,
          }}
        />
      ) : null}

      {LAYOUT_FILES.map((src, i) => {
        const orbit = LAYOUT_ORBIT_ITEMS[i];
        const isPicked = i === LAYOUT_SELECT_INDEX;
        const orbitLocal = isPicked
          ? Math.min(local, flyStart - ILLUSTRATE_DETAIL_START)
          : local;
        const angle =
          LAYOUT_ORBIT_OMEGA * orbit.speed * orbitLocal + orbit.phase;
        const orbitX =
          hub.x + LAYOUT_ORBIT_BASE_RADIUS_X * orbit.radiusX * Math.cos(angle);
        const orbitY =
          hub.y + LAYOUT_ORBIT_BASE_RADIUS_Y * orbit.radiusY * Math.sin(angle);

        const depth = (Math.sin(angle) + 1) / 2;
        const isFront = depth >= 0.5;
        const orbitScale = interpolate(depth, [0, 1], [0.88, 1.06]);

        const parkedX = isPicked
          ? interpolate(flyProgress, [0, 1], [orbitX, hub.x])
          : orbitX;
        const parkedY = isPicked
          ? interpolate(flyProgress, [0, 1], [orbitY, hub.y])
          : orbitY;
        const x = isPicked
          ? interpolate(clusterSlide, [0, 1], [parkedX, clusterSeat.x])
          : parkedX;
        const y = isPicked
          ? interpolate(clusterSlide, [0, 1], [parkedY, clusterSeat.y])
          : parkedY;

        const squishDip = isPicked && pickLocal >= -MASCOT_SETTLE_WINDOW ? settleT * 14 : 0;
        const squishScaleY = isPicked ? 1 - settleT * 0.1 : 1;
        const squishScaleX = isPicked ? 1 + settleT * 0.05 : 1;
        const arriveScale = isPicked
          ? interpolate(flyProgress, [0, 1], [orbitScale, 1.08]) * absorbScale
          : orbitScale;
        const tile = clusterTileSize();
        const boxSize = isPicked
          ? interpolate(clusterSlide, [0, 1], [LAYOUT_ORBIT_SIZE, tile])
          : LAYOUT_ORBIT_SIZE;
        const visScale = isPicked
          ? interpolate(clusterSlide, [0, 1], [arriveScale, 1])
          : arriveScale;

        return (
          <Img
            key={src}
            src={staticFile(src)}
            style={{
              position: "absolute",
              left: x,
              top: y + squishDip,
              width: boxSize,
              height: boxSize,
              objectFit: "cover",
              borderRadius: 12,
              transform: `translate(-50%, -50%) scale(${
                visScale * squishScaleX
              }, ${visScale * squishScaleY})`,
              opacity: isPicked ? 1 : unpickedOpacity,
              boxShadow: isPicked && flyProgress > 0.85
                ? `0 0 28px rgba(124,58,237,${0.55 + settleT * 0.35}), 0 16px 30px rgba(108,47,203,${0.4 + settleT * 0.3})`
                : `0 10px 22px rgba(0,0,0,${0.2 + depth * 0.22})`,
              zIndex: isPicked
                ? LAYOUT_SELECT_Z
                : isFront
                  ? LAYOUT_ORBIT_FRONT_Z
                  : LAYOUT_ORBIT_BACK_Z,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Rebirth of the Gemini prompt card: same copy stack as ~frame 1067,
 * but a solid CTA-purple border instead of the spinning 4-colour glow.
 * Grows out of the check-frame + checklist merge point.
 */
const PromptReturnFrame: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = absFrame - PROMPT_REVEAL_START;

  const appear = interpolate(local, [0, PROMPT_REVEAL_DURATION], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(local, [0, PROMPT_REVEAL_DURATION], [0.72, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slide = imgClusterSlide(absFrame);
  const exitOp = imgLeftExitOpacity(absFrame);

  if (local < 0 || exitOp <= 0.001) {
    return null;
  }

  const from = promptMergeCenter(width, height);
  const to = imgClusterPromptSeat(width, height);
  const seat = {
    x: interpolate(slide, [0, 1], [from.x, to.x]),
    y: interpolate(slide, [0, 1], [from.y, to.y]),
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: appear * exitOp }}>
      <div
        style={{
          position: "absolute",
          left: seat.x,
          top: seat.y,
          width: COPY_GLASS_WIDTH,
          height: COPY_GLASS_HEIGHT,
          transform: `translate(-50%, -50%) scale(${PROMPT_RETURN_SCALE * scale})`,
          transformOrigin: "center center",
          borderRadius: COPY_GLASS_RADIUS,
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `${COPY_GLASS_BORDER}px solid ${COPY_CTA_PURPLE}`,
          boxShadow: `0 0 18px 1px rgba(108, 47, 203, 0.45), 0 16px 40px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: COPY_GLASS_PAD,
            top: COPY_GLASS_PAD,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: GEMINI_COPY_STACK_WIDTH + GEMINI_COPY_TICK_SLACK,
          }}
        >
          {GEMINI_COPY_LINES.map((line, i) => {
            const isCta = "isCta" in line && line.isCta;
            const isSub = line.role.startsWith("sub");
            const isMain = line.role.startsWith("main");
            const rowHeight = isCta
              ? ("ctaHeight" in line ? line.ctaHeight : 52)
              : Math.round(line.fontSize * 1.45);
            const marginTop =
              i === 0
                ? 0
                : line.role === "eyebrow"
                  ? 10
                  : isSub
                    ? 4
                    : isCta
                      ? 28
                      : isMain && line.role === "main1"
                        ? 26
                        : isMain
                          ? 16
                          : 18;

            return (
              <div
                key={line.role}
                style={{
                  height: rowHeight,
                  marginTop,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isCta ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: line.barWidth,
                      height: rowHeight,
                      backgroundColor: COPY_CTA_PURPLE,
                      borderRadius: 999,
                    }}
                  >
                    <span
                      className="select-none font-sans"
                      style={{
                        fontSize: line.fontSize,
                        fontWeight: line.fontWeight,
                        letterSpacing: line.letterSpacing,
                        color: line.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {line.text}
                    </span>
                  </div>
                ) : (
                  <span
                    className="select-none font-sans"
                    style={{
                      fontSize: line.fontSize,
                      fontWeight: line.fontWeight,
                      letterSpacing: line.letterSpacing,
                      color: line.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {line.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ImagePromptCodeFrame: React.FC = () => {
  const { width } = useVideoConfig();
  return (
    <CodeFramePanel
      popStart={IMG_PROMPT_POP}
      typeStart={IMG_PROMPT_TYPE}
      title="Dung prompt anh"
      lines={IMG_PROMPT_LINES}
      lineStarts={IMG_PROMPT_LINE_STARTS}
      skipMorph
      exitStart={IMG_EXIT_START}
      exitDuration={IMG_EXIT_DURATION}
      anchorX={imgPromptCodeAnchorX(width)}
      zIndex={4}
    />
  );
};

const ImageBodyCodeFrame: React.FC = () => {
  const { width } = useVideoConfig();
  const diagonal = GEMINI_FRAME_DIAGONAL_OFFSET / Math.SQRT2;
  return (
    <CodeFramePanel
      popStart={IMG_BODY_POP}
      typeStart={IMG_BODY_TYPE}
      title="Tao Gemini body"
      lines={IMG_BODY_LINES}
      lineStarts={IMG_BODY_LINE_STARTS}
      offsetX={diagonal}
      offsetY={-diagonal}
      skipMorph
      exitStart={IMG_EXIT_START}
      exitDuration={IMG_EXIT_DURATION}
      anchorX={imgPromptCodeAnchorX(width)}
      zIndex={3}
    />
  );
};

/** Arrow left (code frames) → right (Gemini hub), same draw/streak as CodeOutboundArrow. */
const ImageOutboundArrow: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - IMG_ARROW_START;
  const { width, height } = useVideoConfig();

  const cy = height / 2;
  const { startX: lineStartX, endX: lineEndX } = imgArrowGeometry(width);
  const fullLength = Math.max(0, lineEndX - lineStartX);

  const drawProgress = interpolate(frame, [0, IMG_ARROW_DRAW], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentLength = fullLength * drawProgress;
  const travelProgress = interpolate(frame, [0, IMG_ARROW_DRAW], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streakX =
    lineStartX + Math.max(0, fullLength - CODE_OUT_PULSE_WIDTH) * travelProgress;
  const streakOpacity = interpolate(
    frame,
    [0, 4, IMG_ARROW_DRAW - 3, IMG_ARROW_DRAW],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const exitOp = imgLeftExitOpacity(absFrame);

  if (frame < 0 || exitOp <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: exitOp }}>
      <div
        style={{
          position: "absolute",
          left: lineStartX,
          top: cy - 1.5,
          width: currentLength,
          height: 3,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          willChange: "width",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lineStartX + currentLength - 2,
          top: cy,
          width: 0,
          height: 0,
          borderTop: `${CODE_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderBottom: `${CODE_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderLeft: `${CODE_OUT_ARROW_HEAD}px solid rgba(255, 255, 255, 0.35)`,
          transform: "translateY(-50%)",
          opacity: drawProgress,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: cy - 14,
          width: CODE_OUT_PULSE_WIDTH,
          height: 28,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accent} 0%, rgba(56,189,248,0.45) 28%, rgba(56,189,248,0) 72%)`,
          filter: "blur(5px)",
          boxShadow: `0 0 22px 6px rgba(56, 189, 248, 0.55)`,
          opacity: streakOpacity,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Gemini pop + spin at the right hub, then fly left ×2 — same recipe as
 * frames 697–731 (GeminiLogoReveal). After landing, the 732–1067 idle
 * think plays: bounce + a full turn every 60 frames.
 */
const GeminiImageReveal: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - IMG_GEMINI_POP;

  const hubX = imgArrowGeometry(width).geminiX;
  const leftX = geminiSampleLayout(width, height).geminiCX;
  const cy = height / 2;

  const popScale = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 8, mass: 0.7, stiffness: 165 },
  });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entryRotation = interpolate(local, [0, GEMINI_SPIN_FRAMES], [0, 360], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travelProgress = interpolate(
    absFrame,
    [IMG_GEMINI_FLY, IMG_GEMINI_FLY + IMG_GEMINI_FLY_DUR],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const logoX = interpolate(travelProgress, [0, 1], [hubX, leftX]);
  const centerScale = interpolate(
    travelProgress,
    [0, 1],
    [1, GEMINI_CENTER_SCALE],
  );
  const ringScale = interpolate(local, [0, 14], [0.4, 1.35], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(local, [0, 5, 20], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const thinkLocal = absFrame - IMG_GEMINI_THINK_START;
  const { thinkBounce, thinkSpin, thinkBloomPulse } =
    geminiThinkMotion(thinkLocal);

  const bloomBase = interpolate(local, [0, 6, 18, 36], [0, 1, 0.7, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bloom =
    thinkLocal >= 0 ? Math.max(bloomBase, thinkBloomPulse) : bloomBase;
  const thinkHalo = interpolate(
    absFrame,
    [IMG_GEMINI_THINK_START, IMG_GEMINI_THINK_START + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0) {
    return null;
  }

  const scale = popScale * centerScale * thinkBounce;
  const rotation = entryRotation + thinkSpin;
  // Recedes as the Drive light front floods past it.
  const driveExit = interpolate(absFrame, [DRIVE_START - 4, DRIVE_START + 9], [1, 0], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: driveExit }}>
      <div
        style={{
          position: "absolute",
          left: logoX,
          top: cy,
          width: GEMINI_LOGO_SIZE * 1.8,
          height: GEMINI_LOGO_SIZE * 1.8,
          borderRadius: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity * (1 - travelProgress),
          background:
            "radial-gradient(circle, rgba(138,180,248,0.55) 0%, rgba(77,201,240,0.25) 38%, rgba(77,201,240,0) 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: logoX,
          top: cy,
          width: GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE * 1.6,
          height: GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE * 1.6,
          borderRadius: "50%",
          transform: `translate(-50%, -50%) scale(${0.85 + 0.2 * thinkBloomPulse})`,
          opacity: thinkHalo * (0.35 + 0.35 * thinkBloomPulse),
          background:
            "radial-gradient(circle, rgba(138,180,248,0.4) 0%, rgba(77,201,240,0.18) 42%, rgba(77,201,240,0) 72%)",
          filter: "blur(12px)",
          pointerEvents: "none",
        }}
      />
      <CameraMotionBlur samples={3} shutterAngle={180}>
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: logoX,
              top: cy,
              width: GEMINI_LOGO_SIZE,
              height: GEMINI_LOGO_SIZE,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
              opacity: enterOpacity,
              willChange: "transform, opacity",
              filter: `drop-shadow(0 0 ${18 * bloom}px rgba(138, 180, 248, 0.85)) drop-shadow(0 0 ${36 * bloom}px rgba(77, 201, 240, 0.45))`,
            }}
          >
            <Img
              src={staticFile("logos/gemini.webp")}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </AbsoluteFill>
      </CameraMotionBlur>
    </AbsoluteFill>
  );
};

/**
 * Sample 6 materializes tile by tile: a diagonal wave sweeps left→right,
 * each tile snapping in from a hot, displaced state into place behind a
 * glowing scan front, then the settled still gets a gloss sweep and an
 * ambient bloom. Native square ratio, no card chrome. Gemini is centred
 * in the left half; the photo between Gemini and the right edge.
 */
const GeneratedSampleFrame: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - SAMPLE_REVEAL_START;

  const settleSpring = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 200, mass: 1.1, stiffness: 42 },
  });
  const scanProgress = interpolate(local, [0, SAMPLE_WAVE_FRAMES + 5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanFade = interpolate(
    local,
    [SAMPLE_WAVE_FRAMES - 2, SAMPLE_WAVE_FRAMES + 6],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glossSweep = interpolate(
    local,
    [SAMPLE_REVEAL_DURATION - 8, SAMPLE_REVEAL_DURATION + 14],
    [-0.35, 1.35],
    { easing: Easing.inOut(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glossOpacity = interpolate(
    local,
    [SAMPLE_REVEAL_DURATION - 8, SAMPLE_REVEAL_DURATION, SAMPLE_REVEAL_DURATION + 14],
    [0, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bloom = interpolate(
    local,
    [SAMPLE_WAVE_FRAMES, SAMPLE_REVEAL_DURATION + 10],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (local < 0) {
    return null;
  }

  // The generate-border peels off first; the still itself hands over to
  // DriveIntegrationScene on one frame at identical geometry (match cut).
  const outlineHandoff = interpolate(
    absFrame,
    [DRIVE_START - 26, DRIVE_START - 8],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const stillHandoff = absFrame >= DRIVE_START ? 0 : 1;

  const { sampleCX: cx, sampleSize: size } = geminiSampleLayout(width, height);
  const cy = height / 2;
  const tile = size / SAMPLE_GRID;
  const bleed = 0.9;
  const src = staticFile(SAMPLE_FILE);
  const [c0, c1, c2, c3] = COPY_GLASS_BORDER_COLORS;

  const cardScale = interpolate(settleSpring, [0, 1], [0.9, 1]);
  const cardRotate = interpolate(settleSpring, [0, 1], [9, 0]);
  const scanX = scanProgress * size;
  const frameWipe = interpolate(local, [0, SAMPLE_FRAME_REVEAL_DURATION], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const frameWipePct = frameWipe * 120;
  const frameWipeMask = `linear-gradient(90deg, #000 0%, #000 ${Math.max(0, frameWipePct - 16)}%, transparent ${frameWipePct}%)`;
  const borderAngle = Math.max(0, local) * 7;
  const frameSize = size + SAMPLE_FRAME_PAD * 2;

  const tiles = [];
  for (let row = 0; row < SAMPLE_GRID; row += 1) {
    for (let col = 0; col < SAMPLE_GRID; col += 1) {
      const seed = row * SAMPLE_GRID + col;
      const wave =
        (col / (SAMPLE_GRID - 1)) * 0.84 + (row / (SAMPLE_GRID - 1)) * 0.16;
      const start =
        (wave + sampleTileNoise(seed) * 0.07) * SAMPLE_WAVE_FRAMES;
      const t = interpolate(local, [start, start + SAMPLE_TILE_POP], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      if (t <= 0) {
        continue;
      }
      const pop = interpolate(t, [0, 0.6, 1], [0.62, 1.06, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const drift = (1 - t) * 14;
      const dx = (sampleTileNoise(seed + 91) - 0.5) * drift;
      const dy = (sampleTileNoise(seed + 57) - 0.5) * drift;
      const heat = interpolate(t, [0, 0.35, 1], [1.9, 1.25, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const spin = (sampleTileNoise(seed + 13) - 0.5) * (1 - t) * 16;
      const charge = 1 - t;
      tiles.push(
        <div
          key={seed}
          style={{
            position: "absolute",
            left: col * tile,
            top: row * tile,
            width: tile + bleed,
            height: tile + bleed,
            overflow: "hidden",
            opacity: t,
            transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(${pop})`,
            filter: `brightness(${heat}) saturate(${interpolate(t, [0, 1], [1.35, 1])})`,
            boxShadow:
              charge > 0.02
                ? `0 0 ${14 * charge}px ${2 * charge}px rgba(124,92,255,${0.5 * charge})`
                : undefined,
            willChange: "transform, opacity",
          }}
        >
          <Img
            src={src}
            style={{
              position: "absolute",
              left: -col * tile,
              top: -row * tile,
              width: size,
              height: size,
              maxWidth: "none",
              objectFit: "cover",
            }}
          />
          {charge > 0.02 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at 50% 50%, rgba(168,142,255,${0.5 * charge}) 0%, rgba(124,92,255,${0.28 * charge}) 70%, rgba(124,92,255,0) 100%)`,
                mixBlendMode: "screen",
              }}
            />
          ) : null}
        </div>,
      );
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: stillHandoff }}>
      {/* Hollow square outline — LTR wipe in 1s, spinning 4-colour Gemini glow */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: frameSize,
          height: frameSize,
          transform: "translate(-50%, -50%)",
          borderRadius: SAMPLE_FRAME_RADIUS,
          opacity: outlineHandoff,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: SAMPLE_FRAME_RADIUS,
            WebkitMaskImage: frameWipeMask,
            maskImage: frameWipeMask,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: SAMPLE_FRAME_RADIUS,
              padding: SAMPLE_FRAME_BORDER,
              background: `conic-gradient(from ${borderAngle}deg, ${c0}, ${c1}, ${c2}, ${c3}, ${c0})`,
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              boxShadow:
                "0 0 14px 1px rgba(48,132,252,0.45), 0 0 22px 2px rgba(228,72,84,0.28)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: size,
          height: size,
          transform: `translate(-50%, -50%) perspective(1400px) rotateY(${cardRotate}deg) scale(${cardScale})`,
          borderRadius: SAMPLE_IMAGE_RADIUS,
          boxShadow: `0 30px 90px -30px rgba(0,0,0,${0.55 * bloom}), 0 0 ${60 * bloom}px ${6 * bloom}px rgba(124,92,255,${0.3 * bloom})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: SAMPLE_IMAGE_RADIUS,
            overflow: "hidden",
          }}
        >
          {tiles}

          {/* Energy wash just ahead of the wave front */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: scanFade * 0.75,
              background: `radial-gradient(160px 120% at ${scanX}px 50%, rgba(255,255,255,0.28) 0%, rgba(124,92,255,0.18) 40%, rgba(255,255,255,0) 75%)`,
              mixBlendMode: "screen",
            }}
          />

          {/* Gloss sweep once the still has landed */}
          <div
            style={{
              position: "absolute",
              top: -size * 0.3,
              bottom: -size * 0.3,
              left: glossSweep * size,
              width: size * 0.32,
              transform: "rotate(14deg)",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
              filter: "blur(10px)",
              opacity: glossOpacity,
              mixBlendMode: "screen",
            }}
          />
        </div>

        {/* Scan front: white core over a spectral gradient */}
        <div
          style={{
            position: "absolute",
            left: scanX,
            top: -10,
            bottom: -10,
            width: 4,
            transform: "translateX(-50%)",
            borderRadius: 4,
            background: `linear-gradient(180deg, ${c0}, ${c1}, ${c2}, ${c3})`,
            boxShadow:
              "0 0 12px 2px rgba(255,255,255,0.8), 0 0 34px 8px rgba(124,92,255,0.55)",
            opacity: scanFade,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Beat after Drive UI: window morphs into a left Drive node, arrow draws
 * right, then "Gom bien the" code frame pops and types.
 */
const DRIVE_OUT_ARROW_START =
  DRIVE_MORPH_START + DRIVE_MORPH_DURATION + 4;
const DRIVE_OUT_ARROW_DRAW = 22;
const DRIVE_OUT_ARROW_GAP = 26;
const DRIVE_OUT_ARROW_HEAD = 16;
const DRIVE_OUT_PULSE_WIDTH = 90;
const DRIVE_OUT_PULSE_TRAVEL = DRIVE_OUT_ARROW_DRAW;
const GOM_FRAME_POP_START = DRIVE_OUT_ARROW_START + DRIVE_OUT_ARROW_DRAW;
const GOM_TYPE_START = GOM_FRAME_POP_START + 4;

const GOM_LINES = [
  "// Gom biến thể + payload Telegram / log.",
  "const esc = (s) => String(s ?? '')",
  "  .replace(/&/g, '&amp;')",
  "  .replace(/</g, '&lt;')",
  "  .replace(/>/g, '&gt;');",
  "",
  "const items = $('So chuoi').all();",
  "const drive = $('Upload Drive').all();",
  "",
  "const first = items[0].json;",
  "const c = first.content;",
  "",
  "const dong = items.map((it, i) => {",
  "  const link = drive[i]?.json?.webViewLink || drive[i]?.json?.id || '';",
  "  const co = it.json.pass ? '✅' : '⚠️';",
  "  return `${co} Bien the #${it.json.index} — layout ${it.json.layout_id}",
  "    \\n${it.json.pass ? 'Chu OK' : it.json.canh_bao}\\n${link}`;",
  "}).join('\\n\\n');",
  "",
  "const raw = `📅 Bai post ${new Date().toISOString().slice(0, 10)}\\n\\n`",
  "  + `TITLE: ${c.title}\\nEYEBROW: ${c.eyebrow}\\nCTA: ${c.cta}\\n\\n`",
  "  + c.features.map((f, i) =>",
  "      `${i + 1}. [${f.category}] ${f.main_line}\\n   ${f.sub_line}`",
  "    ).join('\\n')",
  "  + `\\n\\n--- CAPTION ---\\n${c.caption_facebook}",
  "\\n\\n--- KIEM TRA ---\\n${dong}`;",
  "",
  "const text = esc(raw).slice(0, 3900);",
  "const logRow = new Date().toISOString();",
  "const stamp = logRow.slice(0, 19);",
  "const tgMedia = items.map((it, i) => ({",
  "  type: 'photo',",
  "  media: drive[i]?.json?.webContentLink",
  "    || drive[i]?.json?.webViewLink || '',",
  "}));",
  "const chiPhi = items.reduce((s, it) => s + 0.04, 0);",
  "",
  "return [{ json: {",
  "  chatId: 'YOUR_CHAT_ID',",
  "  text,",
  "  stamp,",
  "  bienThe: first.index ?? 1,",
  "  tgMedia,",
  "  logRow: {",
  "    date: logRow,",
  "    title: c.title || '',",
  "    eyebrow: c.eyebrow || '',",
  "    layout_id: items.map(i2 => i2.json.layout_id).join(','),",
  "    value_ids: first.value_ids,",
  "    asset_ids: items.map(i2 => i2.json.asset_ids).join(' ; '),",
  "    so_lan_thu: 1,",
  "    drive_links: drive.map(d => d?.json?.webViewLink || '').join(' ; '),",
  "    status: 'pending',",
  "    'cost in usd': chiPhi.toFixed(3),",
  "  },",
  "}, binary: items[0].binary?.data",
  "  ? { data: items[0].binary.data } : {} }];",
] as const;

const GOM_LINE_STARTS = burstLineStarts(GOM_LINES);

const DriveNode: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - DRIVE_NODE_POP_START;

  if (local < 0) {
    return null;
  }

  const popScale = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 9, mass: 0.85, stiffness: 140 },
  });
  const enterOpacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Clears as Gom code frame slides into this seat (TelegramPhoneReveal).
  const exitOpacity = interpolate(
    absFrame,
    [TELEGRAM_SLIDE_START, TELEGRAM_SLIDE_START + 14],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (exitOpacity <= 0.001) {
    return null;
  }

  const x = width * DRIVE_NODE_X_RATIO;
  const cy = height / 2;
  const nub = 14;

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: cy,
          width: DRIVE_NODE_SIZE,
          height: DRIVE_NODE_SIZE,
          transform: `translate(-50%, -50%) scale(${popScale})`,
          opacity: enterOpacity,
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -nub / 2,
            top: "50%",
            width: nub,
            height: nub,
            borderRadius: "50%",
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -nub / 2,
            top: "50%",
            width: nub,
            height: nub,
            borderRadius: "50%",
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 18,
            backgroundColor: "#1E1E24",
            border: "1.5px solid rgba(180, 180, 190, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.45)",
          }}
        >
          <Img
            src={staticFile("logos/googleDrive.webp")}
            style={{ width: 56, height: 56 }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Arrow from Drive node (left) → Gom bien the code frame (right). */
const DriveOutboundArrow: React.FC = () => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - DRIVE_OUT_ARROW_START;
  const { width, height } = useVideoConfig();

  const cy = height / 2;
  const driveCenterX = width * DRIVE_NODE_X_RATIO;
  const codeCenterX = width * SHEETS_HUB_X_RATIO;
  const lineStartX = driveCenterX + DRIVE_NODE_SIZE / 2 + DRIVE_OUT_ARROW_GAP;
  const lineEndX = codeCenterX - CODE_FRAME_WIDTH / 2 - DRIVE_OUT_ARROW_GAP;
  const fullLength = Math.max(0, lineEndX - lineStartX);

  const drawProgress = interpolate(frame, [0, DRIVE_OUT_ARROW_DRAW], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentLength = fullLength * drawProgress;
  const travelProgress = interpolate(frame, [0, DRIVE_OUT_PULSE_TRAVEL], [0, 1], {
    easing: INTRODUCE_EASING,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streakX =
    lineStartX +
    Math.max(0, fullLength - DRIVE_OUT_PULSE_WIDTH) * travelProgress;
  const streakOpacity = interpolate(
    frame,
    [0, 4, DRIVE_OUT_PULSE_TRAVEL - 3, DRIVE_OUT_PULSE_TRAVEL],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const exitOpacity = interpolate(
    absFrame,
    [TELEGRAM_SLIDE_START, TELEGRAM_SLIDE_START + 14],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (frame < 0 || exitOpacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          left: lineStartX,
          top: cy - 1.5,
          width: currentLength,
          height: 3,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          willChange: "width",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: lineStartX + currentLength - 2,
          top: cy,
          width: 0,
          height: 0,
          borderTop: `${DRIVE_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderBottom: `${DRIVE_OUT_ARROW_HEAD / 2}px solid transparent`,
          borderLeft: `${DRIVE_OUT_ARROW_HEAD}px solid rgba(255, 255, 255, 0.35)`,
          transform: "translateY(-50%)",
          opacity: drawProgress,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: cy - 14,
          width: DRIVE_OUT_PULSE_WIDTH,
          height: 28,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accent} 0%, rgba(56,189,248,0.45) 28%, rgba(56,189,248,0) 72%)`,
          opacity: streakOpacity,
          filter: "blur(1px)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const GomBienTheFrame: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width } = useVideoConfig();
  const fromX = width * SHEETS_HUB_X_RATIO;
  const toX = width * DRIVE_NODE_X_RATIO;
  const slide = interpolate(
    absFrame,
    [TELEGRAM_SLIDE_START, TELEGRAM_SLIDE_START + TELEGRAM_SLIDE_DURATION],
    [0, 1],
    {
      easing: INTRODUCE_EASING,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const anchorX = interpolate(slide, [0, 1], [fromX, toX]);

  return (
    <CodeFramePanel
      popStart={GOM_FRAME_POP_START}
      typeStart={GOM_TYPE_START}
      title="Gom bien the"
      lines={GOM_LINES}
      lineStarts={GOM_LINE_STARTS}
      skipMorph
      zIndex={2}
      anchorX={anchorX}
      exitStart={TG_CODE_FADE_START}
      exitDuration={TG_CODE_FADE_DURATION}
      exitScaleTo={TG_FADE_SCALE_TO}
    />
  );
};

/**
 * Main scene content for PortfolioMotion — typewriter → Introduce → n8n →
 * execute → Manual Trigger → Sheets → code frames → GeminiCopyEmit.
 *
 * Each beat is gated by AbsoluteSequence so Remotion unmounts it outside
 * its visible window (keeps Studio preview light). Frame math stays absolute.
 */
export const MainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneEnd = VIDEO.durationInFrames;
  const introClearEnd = EXIT_START + EXIT_DURATION;
  const executeFadeEnd = CLICK_END + EXECUTE_FADE_DURATION;
  const workflowLegacyEnd =
    WORKFLOW_LEGACY_FADE_START + WORKFLOW_LEGACY_FADE_DURATION;
  const carouselMorphEnd = CAROUSEL_MORPH_START + CAROUSEL_MORPH_DURATION;
  const sheetsExitEnd = CODE_LEGACY_FADE_START + CODE_LEGACY_FADE_DURATION;
  const sheetsArrowExitEnd = CODE_MORPH_START + 12;
  const codePanelsMorphEnd = CODE_MORPH_START + CODE_MORPH_DURATION;
  const codeGeminiExitEnd = GEMINI_CENTER_START + CODE_GEMINI_EXIT_DURATION;
  const copyClusterExitEnd = ILLUSTRATE_START + ILLUSTRATE_FADE_DURATION;
  const mergeExitEnd = MERGE_START + MERGE_DURATION;
  const imgLeftExitEnd = IMG_EXIT_START + IMG_EXIT_DURATION;
  const geminiImageExitEnd = DRIVE_START + 9;

  const AUDIO_FADE_START = 1928;
  const AUDIO_FADE_DURATION = 55;
  const audioVolume = interpolate(
    frame,
    [AUDIO_FADE_START, AUDIO_FADE_START + AUDIO_FADE_DURATION],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <>
      <Audio
        src={staticFile(
          "audio/alex-morgan-corporate-business-background-568143.mp3",
        )}
        volume={audioVolume}
      />

      <AbsoluteSequence from={0} durationInFrames={HOOK_CARD_EXIT_END + 1}>
        <HookCard />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={INTRODUCE_START}
        durationInFrames={introClearEnd - INTRODUCE_START + 1}
      >
        <IntroClearOut>
          <CameraMotionBlur samples={8} shutterAngle={360}>
            <IntroduceText />
            <N8nLogoPipeline />
          </CameraMotionBlur>
        </IntroClearOut>
      </AbsoluteSequence>

      <AbsoluteSequence
        from={BUTTON_START}
        durationInFrames={executeFadeEnd - BUTTON_START + 1}
      >
        <ExecuteButton />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={CURSOR_START}
        durationInFrames={executeFadeEnd - CURSOR_START + 1}
      >
        <CursorPointer />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={MANUAL_START}
        durationInFrames={workflowLegacyEnd - MANUAL_START + 1}
      >
        <ManualTrigger />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={ARROW_START}
        durationInFrames={workflowLegacyEnd - ARROW_START + 1}
      >
        <WorkflowArrow />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={ARROW_START}
        durationInFrames={carouselMorphEnd - ARROW_START + 1}
      >
        <AnimatedSheetCarousel />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={SHEETS_NODE_POP_START}
        durationInFrames={sheetsExitEnd - SHEETS_NODE_POP_START + 1}
      >
        <GoogleSheetsNode />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={SHEETS_OUT_ARROW_START}
        durationInFrames={sheetsArrowExitEnd - SHEETS_OUT_ARROW_START + 1}
      >
        <SheetsOutboundArrow />
      </AbsoluteSequence>

      {/* Behind Loc_phrase */}
      <AbsoluteSequence
        from={GEMINI_FRAME_POP_START}
        durationInFrames={codePanelsMorphEnd - GEMINI_FRAME_POP_START + 1}
      >
        <GeminiPayloadFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={CODE_FRAME_POP_START}
        durationInFrames={codePanelsMorphEnd - CODE_FRAME_POP_START + 1}
      >
        <CodeFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={CODE_NODE_POP_START}
        durationInFrames={codeGeminiExitEnd - CODE_NODE_POP_START + 1}
      >
        <CodeNode />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={CODE_OUT_ARROW_START}
        durationInFrames={codeGeminiExitEnd - CODE_OUT_ARROW_START + 1}
      >
        <CodeOutboundArrow />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={GEMINI_THINK_START}
        durationInFrames={copyClusterExitEnd - GEMINI_THINK_START + 1}
      >
        <GeminiCopyEmit />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={GEMINI_LOGO_POP_START}
        durationInFrames={copyClusterExitEnd - GEMINI_LOGO_POP_START + 1}
      >
        <GeminiLogoReveal />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={REVIEW_ARROW_START}
        durationInFrames={copyClusterExitEnd - REVIEW_ARROW_START + 1}
      >
        <ReviewSplitArrows />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={ILLUSTRATE_DETAIL_START}
        durationInFrames={imgLeftExitEnd - ILLUSTRATE_DETAIL_START + 1}
      >
        <LayoutOrbit />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={REVIEW_FRAME_POP_START}
        durationInFrames={mergeExitEnd - REVIEW_FRAME_POP_START + 1}
      >
        <ReviewCheckFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={REVIEW_FRAME_POP_START}
        durationInFrames={mergeExitEnd - REVIEW_FRAME_POP_START + 1}
      >
        <ReviewLayoutFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={ILLUSTRATE_DETAIL_START}
        durationInFrames={mergeExitEnd - ILLUSTRATE_DETAIL_START + 1}
      >
        <IllustrateCheckList />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={ILLUSTRATE_DETAIL_START}
        durationInFrames={imgLeftExitEnd - ILLUSTRATE_DETAIL_START + 1}
      >
        <MascotArcCarousel />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={PROMPT_REVEAL_START}
        durationInFrames={imgLeftExitEnd - PROMPT_REVEAL_START + 1}
      >
        <PromptReturnFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={IMG_BODY_POP}
        durationInFrames={imgLeftExitEnd - IMG_BODY_POP + 1}
      >
        <ImageBodyCodeFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={IMG_PROMPT_POP}
        durationInFrames={imgLeftExitEnd - IMG_PROMPT_POP + 1}
      >
        <ImagePromptCodeFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={IMG_ARROW_START}
        durationInFrames={imgLeftExitEnd - IMG_ARROW_START + 1}
      >
        <ImageOutboundArrow />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={IMG_GEMINI_POP}
        durationInFrames={geminiImageExitEnd - IMG_GEMINI_POP + 1}
      >
        <GeminiImageReveal />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={SAMPLE_REVEAL_START}
        durationInFrames={DRIVE_START - SAMPLE_REVEAL_START + 1}
      >
        <GeneratedSampleFrame />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={DRIVE_START}
        durationInFrames={
          DRIVE_MORPH_START + DRIVE_MORPH_DURATION - DRIVE_START + 1
        }
      >
        <DriveIntegrationScene />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={DRIVE_NODE_POP_START}
        durationInFrames={TELEGRAM_SLIDE_START + 14 - DRIVE_NODE_POP_START + 1}
      >
        <DriveNode />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={DRIVE_OUT_ARROW_START}
        durationInFrames={TELEGRAM_SLIDE_START + 14 - DRIVE_OUT_ARROW_START + 1}
      >
        <DriveOutboundArrow />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={GOM_FRAME_POP_START}
        durationInFrames={TG_CODE_FADE_START + TG_CODE_FADE_DURATION - GOM_FRAME_POP_START + 1}
      >
        <GomBienTheFrame />
      </AbsoluteSequence>

      {/* Scene: TelegramPhoneReveal — undo cue: "undo TelegramPhoneReveal" */}
      <AbsoluteSequence
        from={TG_ARROW_START}
        durationInFrames={TG_SIDE_FADE_END - TG_ARROW_START + 1}
      >
        <TelegramOutboundArrow
          leftNodeSize={CODE_FRAME_WIDTH}
          leftXRatio={DRIVE_NODE_X_RATIO}
        />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={TG_NODE_POP_START}
        durationInFrames={TG_SIDE_FADE_END - TG_NODE_POP_START + 1}
      >
        <TelegramNode />
      </AbsoluteSequence>

      <AbsoluteSequence
        from={TG_NODE_POP_START}
        durationInFrames={sceneEnd - TG_NODE_POP_START}
      >
        {/* Scene: TelegramEndCredit — undo cue: "undo TelegramEndCredit" */}
        <TelegramEndExit>
          <TelegramCameraRig>
            <TelegramLogoFlight />
            <IPhoneTelegramReveal />
          </TelegramCameraRig>
          {/* Scene: TelegramYesConfirm — undo cue: "undo TelegramYesConfirm" */}
          <TelegramTickConfirm />
        </TelegramEndExit>
      </AbsoluteSequence>
    </>
  );
};
