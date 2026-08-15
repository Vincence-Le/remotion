import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import DriveScene from "./DriveScene.jsx";

/**
 * Beat DriveIntegration — the Drive window flies in as a tilted card.
 *
 * 1. FLY+ZOOM  banks in from the left, untilting and growing in one motion
 *              to ~80% of the frame (never full-bleed).
 * 2. DOCK      the still arcs into the grid slot (match cut to thumbnail).
 * 3. MORPH     the whole window shrinks into a left-side Drive node seat.
 *
 * DriveScene always renders at full composition size and is only ever scaled
 * down (never up), so its type stays sharp at every step.
 */
export const DRIVE_START = 1540;

/** One continuous fly-in that also zooms — no separate settle→expand beat. */
const FLY_DUR = 44;
/** Final window size as a fraction of the composition (not full-screen). */
const FINAL_SCALE = 0.8;
const START_SCALE = 0.11;
/**
 * Still docks during the fly — lands as the window finishes untilting,
 * so the thumbnail is already seated when Drive rests flat.
 */
const LIFT_START = 8;
const LIFT_DUR = 10;
const THROW_START = 14;
const THROW_DUR = 28;
const LAND_LOCAL = THROW_START + THROW_DUR; // 42 ≈ FLY_DUR

/** Frame the still finishes docking into the grid. */
export const DRIVE_FILE_MORPH = DRIVE_START + LAND_LOCAL;

/** Hold admiring the docked Drive UI, then suck it into a workflow node. */
export const DRIVE_HOLD = 18;
export const DRIVE_MORPH_START = DRIVE_FILE_MORPH + DRIVE_HOLD;
export const DRIVE_MORPH_DURATION = 26;
export const DRIVE_NODE_POP_START = DRIVE_MORPH_START + 6;
export const DRIVE_NODE_SIZE = 128;
/** Same left-seat ratio as Manual Trigger / Sheets after reflow. */
export const DRIVE_NODE_X_RATIO = 0.5 - 0.26;

/** DriveScene layout, verified against a render of its own markup. */
const CARD_LEFT = 288;
const CARD_TOP = 248;
const CARD_BORDER = 1;
const CARD_W = 180;
const PREVIEW_H = 120;
const PREVIEW_LEFT = CARD_LEFT + CARD_BORDER;
const PREVIEW_TOP = CARD_TOP + CARD_BORDER;
const PREVIEW_W = CARD_W - CARD_BORDER * 2;

const SAMPLE_FILE = "image/Sample 6.png";
const SAMPLE_MAX_SIZE = 620;
const SAMPLE_MARGIN_RIGHT = 90;
const SAMPLE_IMAGE_RADIUS = 22;
const GEMINI_LOGO_SIZE = 140;
const GEMINI_CENTER_SCALE = 2;
const DRIVE_BLUE = "#1a73e8";

/** Where the still waits while the window takes over the frame. */
const HOVER_X_RATIO = 0.655;
const HOVER_Y_RATIO = 0.42;
const HOVER_SIZE = 330;
/** The still holds briefly, then recedes while Drive is still flying in. */
const RECEDE_DELAY = 4;
const RECEDE_DUR = 14;

const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_THROW_X = Easing.bezier(0.36, 0, 0.2, 1);
const EASE_THROW_Y = Easing.bezier(0.32, 0, 0.36, 1);

/**
 * Preview thumbnail seat in composition space for the Drive window's pose
 * at a given local frame — tracks the moving card while fly + throw overlap.
 */
const previewSeatAt = (
  local: number,
  frameWidth: number,
  frameHeight: number,
) => {
  const fly = interpolate(local, [0, FLY_DUR], [0, 1], {
    easing: EASE_OUT_EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(
    fly,
    [0, 0.88, 1],
    [START_SCALE, FINAL_SCALE * 1.02, FINAL_SCALE],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cardX = interpolate(fly, [0, 1], [frameWidth * 0.42, frameWidth / 2]);
  const cardY = interpolate(fly, [0, 1], [frameHeight * 0.6, frameHeight / 2]);
  const left = cardX - (frameWidth * scale) / 2;
  const top = cardY - (frameHeight * scale) / 2;
  return {
    x: left + (PREVIEW_LEFT + PREVIEW_W / 2) * scale,
    y: top + (PREVIEW_TOP + PREVIEW_H / 2) * scale,
    w: PREVIEW_W * scale,
    h: PREVIEW_H * scale,
  };
};

/** Mirrors Scene 1's sample layout so the hand-off frame is pixel-identical. */
const sampleLayout = (frameWidth: number, frameHeight: number) => {
  const geminiCX = frameWidth / 4;
  const geminiR = (GEMINI_LOGO_SIZE * GEMINI_CENTER_SCALE) / 2;
  const leftBound = geminiCX + geminiR;
  const span = frameWidth - leftBound;
  return {
    sampleCX: (leftBound + frameWidth) / 2,
    sampleCY: frameHeight / 2,
    sampleSize: Math.min(
      SAMPLE_MAX_SIZE,
      frameHeight * 0.62,
      span - 2 * SAMPLE_MARGIN_RIGHT,
    ),
  };
};

/**
 * Still pose at a local frame: brief recede, then arc into the live
 * thumbnail slot (tracks Drive while it is still flying in).
 */
const stillPose = (
  local: number,
  from: { x: number; y: number; size: number },
  frameWidth: number,
  frameHeight: number,
) => {
  const hoverX = frameWidth * HOVER_X_RATIO;
  const hoverY = frameHeight * HOVER_Y_RATIO;
  const seat = previewSeatAt(local, frameWidth, frameHeight);

  const recede = interpolate(
    local,
    [RECEDE_DELAY, RECEDE_DELAY + RECEDE_DUR],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const restX = from.x + (hoverX - from.x) * recede;
  const restY =
    from.y +
    (hoverY - from.y) * recede +
    Math.sin((local - RECEDE_DELAY) * 0.09) * 4 * recede;
  const restSize = from.size + (HOVER_SIZE - from.size) * recede;

  const t = interpolate(local, [THROW_START, THROW_START + THROW_DUR], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tx = EASE_THROW_X(t);
  const ty = EASE_THROW_Y(t);
  // Shrink resolves a touch before the position, so it arrives and settles.
  const ts = interpolate(t, [0, 0.84], [0, 1], {
    easing: EASE_OUT_EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return {
    t,
    x: restX + (seat.x - restX) * tx,
    // Smaller hop — throw overlaps the fly, so keep the arc subtle.
    y: restY + (seat.y - restY) * ty - Math.sin(Math.PI * t) * 48,
    w: restSize + (seat.w - restSize) * ts,
    h: restSize + (seat.h - restSize) * ts,
  };
};

export const DriveIntegrationScene: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = absFrame - DRIVE_START;

  if (local < 0) {
    return null;
  }

  const { sampleCX, sampleCY, sampleSize } = sampleLayout(width, height);
  const from = { x: sampleCX, y: sampleCY, size: sampleSize };

  // --- Beat 1: fly-in + zoom together, land flat at ~80% ---
  const fly = interpolate(local, [0, FLY_DUR], [0, 1], {
    easing: EASE_OUT_EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flyIn = interpolate(local, [0, 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Tilt unwinds on the same curve as travel/zoom.
  const untilt = interpolate(local, [0, FLY_DUR - 2], [0, 1], {
    easing: EASE_OUT_EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Banks in from the left; tilt sign mirrors the travel direction.
  const rotY = interpolate(untilt, [0, 1], [34, 0]);
  const rotX = interpolate(untilt, [0, 1], [17, 0]);
  const rotZ = interpolate(untilt, [0, 1], [6, 0]);

  // Soft overshoot into the 80% resting size — never fills the frame.
  const settledScale = interpolate(
    fly,
    [0, 0.88, 1],
    [START_SCALE, FINAL_SCALE * 1.02, FINAL_SCALE],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const settledX = interpolate(fly, [0, 1], [width * 0.42, width / 2]);
  const settledY = interpolate(fly, [0, 1], [height * 0.6, height / 2]);
  // Stays a floating window: keep radius, rim, and shadow at rest.
  const settledRadius = interpolate(fly, [0, 1], [28, 18]);
  const settledRim = interpolate(fly, [0, 1], [0.22, 0.12]);
  const settledShadow = interpolate(fly, [0, 1], [0.35, 0.42]);
  const flyBlur = (1 - fly) * 3.5;

  // --- Beat 3: suck the window into the left Drive-node seat ---
  const morphLocal = absFrame - DRIVE_MORPH_START;
  const morph = interpolate(morphLocal, [0, DRIVE_MORPH_DURATION], [0, 1], {
    easing: EASE_OUT_EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const nodeX = width * DRIVE_NODE_X_RATIO;
  const nodeY = height / 2;
  const nodeScale = DRIVE_NODE_SIZE / width;
  const scale = interpolate(
    morph,
    [0, 0.28, 1],
    [settledScale, settledScale * 1.05, nodeScale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cardX = interpolate(morph, [0, 1], [settledX, nodeX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(morph, [0, 1], [settledY, nodeY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardW = width * scale;
  const cardH = height * scale;
  const cardRadius = interpolate(morph, [0, 1], [settledRadius, 18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rim = interpolate(morph, [0, 1], [settledRim, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardShadowAlpha = interpolate(morph, [0, 1], [settledShadow, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const uiOpacity = interpolate(morph, [0.4, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Beat 2: still recedes, hovers, then arcs into the slot ---
  const lift = interpolate(local, [LIFT_START, LIFT_START + LIFT_DUR], [0, 1], {
    easing: EASE_OUT_EXPO,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pose = stillPose(local, from, width, height);
  const prev = stillPose(local - 1, from, width, height);
  const speed = Math.hypot(pose.x - prev.x, pose.y - prev.y);
  const throwBlur = Math.min(2.4, speed * 0.038);

  const landLocal = local - LAND_LOCAL;
  const squashX = interpolate(landLocal, [0, 4, 11, 18], [1.07, 0.985, 1.008, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const squashY = interpolate(landLocal, [0, 4, 11, 18], [0.93, 1.015, 0.994, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stillTilt = interpolate(pose.t, [0, 1], [7 * lift, 0]);
  const stillRise = -16 * lift * (1 - pose.t);
  const shadowSpread = interpolate(pose.t, [0, 1], [1, 0]);
  const stillShadow = `0 ${10 + 30 * shadowSpread}px ${18 + 56 * shadowSpread}px rgba(15,23,42,${0.1 + 0.24 * shadowSpread}), 0 0 ${46 * shadowSpread}px ${4 * shadowSpread}px rgba(124,92,255,${0.22 * shadowSpread})`;

  const fileFade = interpolate(landLocal, [-7, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripple = interpolate(landLocal, [0, 15], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rippleOpacity = interpolate(landLocal, [0, 2, 15], [0, 0.45, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stillRadius = `${interpolate(pose.t, [0, 1], [SAMPLE_IMAGE_RADIUS, 11])}px ${interpolate(pose.t, [0, 1], [SAMPLE_IMAGE_RADIUS, 11])}px ${interpolate(pose.t, [0, 1], [SAMPLE_IMAGE_RADIUS, 0])}px ${interpolate(pose.t, [0, 1], [SAMPLE_IMAGE_RADIUS, 0])}px`;

  // During morph, the docked still rides the window into the node seat.
  const stillMorphX = interpolate(morph, [0, 1], [pose.x, nodeX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stillMorphY = interpolate(morph, [0, 1], [pose.y, nodeY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stillMorphW = interpolate(morph, [0, 1], [pose.w, DRIVE_NODE_SIZE * 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stillMorphH = interpolate(morph, [0, 1], [pose.h, DRIVE_NODE_SIZE * 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (uiOpacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: uiOpacity }}>
      {/* Drive window: fly-in + zoom, then morph into the left node seat */}
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: cardW,
          height: cardH,
          transform: `translate(-50%, -50%) perspective(2200px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
          transformStyle: "preserve-3d",
          borderRadius: cardRadius,
          overflow: "hidden",
          opacity: flyIn,
          filter: flyBlur > 0.2 ? `blur(${flyBlur}px)` : undefined,
          boxShadow: `0 ${44 * cardShadowAlpha}px ${96 * cardShadowAlpha}px rgba(2,6,23,${cardShadowAlpha}), 0 0 ${70 * cardShadowAlpha}px ${8 * cardShadowAlpha}px rgba(124,92,255,${0.3 * cardShadowAlpha}), inset 0 0 0 1px rgba(255,255,255,${rim})`,
          willChange: "transform, width, height",
        }}
      >
        {/* Rendered at full size and scaled down — never upscaled */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <AbsoluteFill>
            <DriveScene showFile={false} />
          </AbsoluteFill>
          <AbsoluteFill style={{ opacity: fileFade }}>
            <DriveScene showFile />
          </AbsoluteFill>

          {rippleOpacity > 0.01 ? (
            <div
              style={{
                position: "absolute",
                left: PREVIEW_LEFT + PREVIEW_W / 2,
                top: PREVIEW_TOP + PREVIEW_H / 2,
                width: CARD_W,
                height: CARD_W,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_W / 2,
                borderRadius: "50%",
                border: `1.5px solid ${DRIVE_BLUE}`,
                transform: `scale(${0.55 + ripple * 0.95})`,
                opacity: rippleOpacity,
              }}
            />
          ) : null}
        </div>
      </div>

      {/* The still — docks as thumbnail, then rides the morph into the node */}
      <div
        style={{
          position: "absolute",
          left: stillMorphX - stillMorphW / 2,
          top: stillMorphY - stillMorphH / 2 + stillRise * (1 - morph),
          width: stillMorphW,
          height: stillMorphH,
          borderRadius: stillRadius,
          overflow: "hidden",
          transform: `perspective(1600px) rotateX(${stillTilt * (1 - morph)}deg) scale(${squashX}, ${squashY})`,
          transformOrigin: "center bottom",
          filter: throwBlur > 0.2 ? `blur(${throwBlur}px)` : undefined,
          boxShadow: stillShadow,
          willChange: "transform, left, top, width, height",
        }}
      >
        <Img
          src={staticFile(SAMPLE_FILE)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            maxWidth: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
