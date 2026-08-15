import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../constants";

/**
 * Scene name: **TelegramPhoneReveal**
 * Undo cue: say `undo TelegramPhoneReveal`
 *
 * Beat: Gom slides left → arrow → Telegram node holds ~0.5s → code/arrow/
 * node-chrome fade out while the Telegram logo flies to the top-left
 * corner of an iPhone that appears at screen centre.
 */
export const TELEGRAM_SLIDE_START = 1671;
export const TELEGRAM_SLIDE_DURATION = 22;

export const TG_ARROW_START = TELEGRAM_SLIDE_START + 10;
export const TG_ARROW_DRAW = 22;
export const TG_ARROW_GAP = 26;
export const TG_ARROW_HEAD = 16;
export const TG_PULSE_WIDTH = 90;

export const TG_NODE_SIZE = 128;
export const TG_NODE_POP_START = TG_ARROW_START + TG_ARROW_DRAW;
export const TG_NODE_X_RATIO = 0.5 + 0.26;

/** Hold the settled Telegram node, then fade cluster + fly the logo. */
export const TG_FADE_START = 1731;
export const TG_FADE_DURATION = 18;
/** Logo leaves the node and arcs to the iPhone corner. */
export const TG_LOGO_FLY_START = 1737;
/** Slower logo flight so the hand-off reads clearly. */
export const TG_LOGO_FLY_DURATION = 40;

export const TG_PHONE_EXPAND_START = TG_FADE_START;
export const TG_PHONE_EXPAND_DURATION = 26;

export const TG_IMAGE_START = TG_PHONE_EXPAND_START + 18;
export const TG_SCROLL_START = TG_IMAGE_START + 18;
export const TG_SCROLL_DURATION = 55;
export const TG_MSG2_START = TG_SCROLL_START + TG_SCROLL_DURATION + 6;

/**
 * Scene beat: **TelegramYesConfirm** (camera zoom → Yes click → tick).
 * Undo cue: say `undo TelegramYesConfirm`
 */
export const TG_CAMERA_ZOOM_START = 1827;
export const TG_CAMERA_ZOOM_DURATION = 42;
export const TG_YES_CLICK_START =
  TG_CAMERA_ZOOM_START + TG_CAMERA_ZOOM_DURATION - 4;
export const TG_YES_CLICK_DURATION = 14;
export const TG_TICK_START = TG_YES_CLICK_START + 8;
export const TG_TICK_DURATION = 36;

/**
 * Scene beat: **TelegramEndCredit** — phone+tick slide up / fade out,
 * then "Made by Vince." rises a short distance into centre from frame 1908.
 * Undo cue: say `undo TelegramEndCredit`
 */
export const TG_END_START = 1903;
/** Snappy phone wipe; credit then holds through the rest of the composition. */
export const TG_END_DURATION = 28;
/** Credit text animation start. */
export const TG_CREDIT_START = 1908;
export const TG_CREDIT_DURATION = 26;
/** Per-letter pop on "Vince" — domino; "i" anchors at 1922. */
const TG_VINCE_I_START = 1922;
const TG_VINCE_LETTER_STAGGER = 2;
const TG_VINCE_LETTER_START = TG_VINCE_I_START - TG_VINCE_LETTER_STAGGER; // "V"
const TG_VINCE_LETTER_PULSE = 11;
const TG_VINCE_SCALE_PEAK = 1.12;

const SAMPLE_FILE = "image/Sample 6.png";
const COSMIC_ORANGE = "#FF7A3C";
const COSMIC_ORANGE_DARK = "#E85A22";
const TG_BG = "#1b2a24";
const TG_BUBBLE = "#2b5278";
const TICK_GREEN = "#22c55e";
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Zoom camera: longer soft landing than EASE_OUT (brake stretches further). */
const EASE_ZOOM_OUT = Easing.bezier(0.05, 0.7, 0.08, 1);
/**
 * Logo flight: short ease-in for launch (a bit snappier ramp), then the
 * same soft ease-out landing character as EASE_OUT (0.3, 1).
 */
const EASE_LOGO_FLY = Easing.bezier(0.28, 0, 0.3, 1);
const EASE_TRAVEL = Easing.bezier(0.85, 0, 0.15, 1);
/** Catchy end wipe — accelerates out, lands soft. */
const EASE_END_SLIDE = Easing.bezier(0.55, 0.02, 0.18, 1);

/** Cubic Bézier — curved logo flight (same helper style as cursor wander). */
const cubicBezier1D = (
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
) => {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
};

const PHONE_W = 420;
const PHONE_H = 860;
const PHONE_RADIUS = 48;
/** Half the previous bezel thickness. */
const SCREEN_INSET = 6;
const ISLAND_W = 118;
const ISLAND_H = 34;
const LOGO_IN_NODE = 56;
/** Docked size on the iPhone corner — 2× the previous resting size. */
const LOGO_ON_PHONE = 76;
const COMPOSER_BLOCK_H = 56;
const BUTTON_ROW_H = 42;
const BUTTON_GAP = 6;
const CHAT_PAD_X = 10;

const phoneCenter = (frameWidth: number, frameHeight: number) => ({
  x: frameWidth / 2,
  y: frameHeight / 2,
});

const logoSeatOnPhone = (frameWidth: number, frameHeight: number) => {
  const { x, y } = phoneCenter(frameWidth, frameHeight);
  return {
    x: x - PHONE_W / 2 + 10,
    y: y - PHONE_H / 2 + 10,
  };
};

/** Composition-space focus for the ✅ Yes button (left inline button). */
export const yesButtonFocus = (frameWidth: number, frameHeight: number) => {
  const { x, y } = phoneCenter(frameWidth, frameHeight);
  const phoneLeft = x - PHONE_W / 2;
  const phoneBottom = y + PHONE_H / 2;
  const screenW = PHONE_W - SCREEN_INSET * 2;
  const innerW = screenW - CHAT_PAD_X * 2;
  const yesW = (innerW - BUTTON_GAP) / 2;
  return {
    x: phoneLeft + SCREEN_INSET + CHAT_PAD_X + yesW / 2,
    y:
      phoneBottom -
      SCREEN_INSET -
      COMPOSER_BLOCK_H -
      BUTTON_GAP -
      BUTTON_ROW_H / 2,
  };
};

const POST_TEXT = `📅 Bai post 2026-08-04

TITLE: THỨC ĐÊM TRẢ LỜI INBOX VẪN MẤT KHÁCH?
EYEBROW: Khách hỏi 1 câu, ngâm 3 tiếng mới rep
CTA: Dùng thử miễn phí ngay

1. [Trust] HẠN CHẾ TỐI ĐA AI TỰ CHẾ DỮ LIỆU
   Nhờ cơ chế kiểm tra, đối chiếu trước khi trả lời.
2. [Revenue] GIÚP CHỐT ĐƠN ĐÊM VÀ CUỐI TUẦN
   Không bỏ lỡ khách nhắn tin ngoài giờ hành chính.
3. [Operation] MỘT HỘP THƯ CHO MỌI KÊNH
   Facebook, Instagram, Zalo, website gom về một chỗ.

--- CAPTION ---
Nhìn khách lẳng lặng bỏ đi vì chờ rep inbox quá lâu khiến chủ shop đứng ngồi không yên. Chưa kể những lúc quá tải, nhân viên hay sót tin nhắn hoặc tư vấn sai thông tin làm hỏng luôn uy tín thương hiệu. Đã đến lúc gạt bỏ áp lực trực page, đảm bảo trả lời chuẩn xác 100% dữ liệu shop và tự động giữ chân khách hàng 24/7. #BanHangOnline #QuanLyBanHang #ChotDonGiaTang #ChamSocKhachHang #KinhDoanhOnline

--- KIEM TRA ---
⚠️ Bien the #1 — layout L03`;

const CONFIRM_TEXT = `⏱️ Có update last time used cho layout/value/asset vừa dùng không?

layout: L03
value: V001,V005,V010
asset: A008,A001,A009`;

/** Outbound arrow: left (Gom / Drive seat) → right (Telegram seat). */
export const TelegramOutboundArrow: React.FC<{
  leftNodeSize: number;
  leftXRatio: number;
}> = ({ leftNodeSize, leftXRatio }) => {
  const absFrame = useCurrentFrame();
  const frame = absFrame - TG_ARROW_START;
  const { width, height } = useVideoConfig();

  if (frame < 0) {
    return null;
  }

  const cy = height / 2;
  const leftCenterX = width * leftXRatio;
  const rightCenterX = width * TG_NODE_X_RATIO;
  const lineStartX = leftCenterX + leftNodeSize / 2 + TG_ARROW_GAP;
  const lineEndX = rightCenterX - TG_NODE_SIZE / 2 - TG_ARROW_GAP;
  const fullLength = Math.max(0, lineEndX - lineStartX);

  const drawProgress = interpolate(frame, [0, TG_ARROW_DRAW], [0, 1], {
    easing: EASE_TRAVEL,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentLength = fullLength * drawProgress;
  const travelProgress = interpolate(frame, [0, TG_ARROW_DRAW], [0, 1], {
    easing: EASE_TRAVEL,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streakX =
    lineStartX + Math.max(0, fullLength - TG_PULSE_WIDTH) * travelProgress;
  const streakOpacity = interpolate(
    frame,
    [0, 4, TG_ARROW_DRAW - 3, TG_ARROW_DRAW],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Fade with the code cluster (logo is a separate flying layer).
  const exitOp = interpolate(
    absFrame,
    [TG_FADE_START, TG_FADE_START + TG_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
          borderTop: `${TG_ARROW_HEAD / 2}px solid transparent`,
          borderBottom: `${TG_ARROW_HEAD / 2}px solid transparent`,
          borderLeft: `${TG_ARROW_HEAD}px solid rgba(255, 255, 255, 0.35)`,
          transform: "translateY(-50%)",
          opacity: drawProgress,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: cy - 14,
          width: TG_PULSE_WIDTH,
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

/** Node chrome only — logo is rendered by TelegramLogoFlight so it can leave. */
export const TelegramNode: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - TG_NODE_POP_START;

  if (local < 0) {
    return null;
  }

  const enterScale = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 9, mass: 0.85, stiffness: 140 },
  });
  const enterOpacity = interpolate(local, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chromeOpacity = interpolate(
    absFrame,
    [TG_FADE_START, TG_FADE_START + TG_FADE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (chromeOpacity <= 0.001) {
    return null;
  }

  const x = width * TG_NODE_X_RATIO;
  const cy = height / 2;
  const nub = 14;

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * chromeOpacity }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: cy,
          width: TG_NODE_SIZE,
          height: TG_NODE_SIZE,
          transform: `translate(-50%, -50%) scale(${enterScale})`,
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
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.45)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Telegram mark stays solid while chrome fades, then flies to the iPhone's
 * top-left corner (phone is centred on screen).
 */
export const TelegramLogoFlight: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - TG_NODE_POP_START;

  if (local < 0) {
    return null;
  }

  const enterScale = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 9, mass: 0.85, stiffness: 140 },
  });
  const enterOpacity = interpolate(local, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fromX = width * TG_NODE_X_RATIO;
  const fromY = height / 2;
  const seat = logoSeatOnPhone(width, height);

  const fly = interpolate(
    absFrame,
    [TG_LOGO_FLY_START, TG_LOGO_FLY_START + TG_LOGO_FLY_DURATION],
    [0, 1],
    {
      easing: EASE_LOGO_FLY,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // High arc: lift early, then settle into the phone corner from the right
  // (not a straight lerp — reads as a thrown hand-off).
  const cp1x = fromX + (seat.x - fromX) * 0.12;
  const cp1y = fromY - height * 0.28;
  const cp2x = seat.x + (fromX - seat.x) * 0.4;
  const cp2y = seat.y + height * 0.1;
  const x = cubicBezier1D(fly, fromX, cp1x, cp2x, seat.x);
  const y = cubicBezier1D(fly, fromY, cp1y, cp2y, seat.y);
  const size = interpolate(fly, [0, 1], [LOGO_IN_NODE, LOGO_ON_PHONE]);
  const spin = interpolate(fly, [0, 1], [0, -20]);

  return (
    <AbsoluteFill style={{ opacity: enterOpacity, pointerEvents: "none", zIndex: 20 }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          transform: `translate(-50%, -50%) scale(${fly < 0.01 ? enterScale : 1}) rotate(${spin}deg)`,
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.4))",
          willChange: "transform, left, top, width, height",
        }}
      >
        <Img
          src={staticFile("logos/telegram.svg")}
          style={{ width: "100%", height: "100%", maxWidth: "none" }}
        />
      </div>
    </AbsoluteFill>
  );
};

const TelegramChatInner: React.FC = () => {
  const absFrame = useCurrentFrame();
  const imageLocal = absFrame - TG_IMAGE_START;
  const scroll = interpolate(
    absFrame,
    [TG_SCROLL_START, TG_SCROLL_START + TG_SCROLL_DURATION],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const imageOpacity = interpolate(imageLocal, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imageY = interpolate(imageLocal, [0, 12], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const msg1Opacity = interpolate(
    absFrame,
    [TG_SCROLL_START + 8, TG_SCROLL_START + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const msg2Local = absFrame - TG_MSG2_START;
  const msg2Opacity = interpolate(msg2Local, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const msg2Y = interpolate(msg2Local, [0, 12], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const buttonsOpacity = interpolate(msg2Local, [8, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clickLocal = absFrame - TG_YES_CLICK_START;
  const yesSquish = interpolate(
    clickLocal,
    [0, 4, 8, TG_YES_CLICK_DURATION],
    [1, 0.86, 1.04, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const yesGlow = interpolate(clickLocal, [0, 5, 16], [0, 1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scroll enough to clear the image and reveal the long caption + msg2 + buttons.
  const scrollY = interpolate(scroll, [0, 1], [0, -520]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: TG_BG,
        overflow: "hidden",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Segoe UI", sans-serif',
      }}
    >
      {/* Soft wallpaper doodles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.14,
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(212,175,55,0.55) 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(212,175,55,0.4) 0 1px, transparent 2px)",
          backgroundSize: "48px 48px, 64px 64px",
          pointerEvents: "none",
        }}
      />

      {/* Status + Dynamic Island clearance */}
      <div
        style={{
          height: 54,
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "0 18px 6px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          zIndex: 2,
        }}
      >
        <span>17:56</span>
        <span style={{ letterSpacing: 0.5 }}>37%</span>
      </div>

      {/* Telegram header */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          backgroundColor: "rgba(15, 28, 24, 0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#fff",
          }}
        >
          ‹
        </div>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: "#3d7eff",
            color: "#fff",
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          1
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 650,
              lineHeight: 1.15,
            }}
          >
            Preny Social Post
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
            2 members
          </div>
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #7c5cff 0%, #5b3fd4 55%, #2a1b6b 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
          }}
        />
      </div>

      {/* Scrollable chat */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            padding: "12px 10px 20px",
            transform: `translateY(${scrollY}px)`,
            willChange: "transform",
          }}
        >
          {/* Image bubble */}
          <div
            style={{
              opacity: imageOpacity,
              transform: `translateY(${imageY}px)`,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#16352c",
                boxShadow: "0 8px 22px rgba(0,0,0,0.28)",
              }}
            >
              <Img
                src={staticFile(SAMPLE_FILE)}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  maxWidth: "none",
                }}
              />
              <div
                style={{
                  textAlign: "right",
                  padding: "4px 10px 6px",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 11,
                }}
              >
                16:39
              </div>
            </div>
          </div>

          {/* Long post message */}
          <div
            style={{
              opacity: msg1Opacity,
              marginBottom: 10,
              backgroundColor: TG_BUBBLE,
              borderRadius: 14,
              padding: "10px 12px 8px",
              color: "#f3f6f8",
              fontSize: 12.5,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
              boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            }}
          >
            {POST_TEXT}
            <div
              style={{
                textAlign: "right",
                marginTop: 6,
                color: "rgba(255,255,255,0.45)",
                fontSize: 11,
              }}
            >
              16:39
            </div>
          </div>

          {/* Confirm message + inline buttons */}
          <div
            style={{
              opacity: msg2Opacity,
              transform: `translateY(${msg2Y}px)`,
            }}
          >
            <div
              style={{
                backgroundColor: TG_BUBBLE,
                borderRadius: 14,
                padding: "10px 12px 8px",
                color: "#f3f6f8",
                fontSize: 13,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
              }}
            >
              {CONFIRM_TEXT.split(/(last time used)/).map((part, i) =>
                part === "last time used" ? (
                  <strong key={i}>{part}</strong>
                ) : (
                  <React.Fragment key={i}>{part}</React.Fragment>
                ),
              )}
              <div
                style={{
                  textAlign: "right",
                  marginTop: 6,
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 11,
                }}
              >
                16:39
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: BUTTON_GAP,
                marginTop: 6,
                opacity: buttonsOpacity,
              }}
            >
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 8px",
                  borderRadius: 10,
                  backgroundColor: "rgba(35, 58, 52, 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#7dd3fc",
                  fontSize: 14,
                  fontWeight: 600,
                  transform: `scale(${yesSquish})`,
                  transformOrigin: "center center",
                  boxShadow:
                    yesGlow > 0.01
                      ? `0 0 ${18 * yesGlow}px ${6 * yesGlow}px rgba(34,197,94,${0.45 * yesGlow})`
                      : undefined,
                  willChange: "transform",
                }}
              >
                ✅ Yes
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 8px",
                  borderRadius: 10,
                  backgroundColor: "rgba(35, 58, 52, 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#7dd3fc",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ❌ No
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px 14px",
          backgroundColor: "rgba(15, 28, 24, 0.95)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #a78bfa, #7c5cff 50%, #4c1d95)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          V
        </div>
        <div
          style={{
            flex: 1,
            height: 34,
            borderRadius: 17,
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
          }}
        >
          Message
        </div>
      </div>
    </div>
  );
};

/** Cosmic-orange iPhone 17 — appears at screen centre as the cluster fades. */
export const IPhoneTelegramReveal: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - TG_PHONE_EXPAND_START;

  if (local < 0) {
    return null;
  }

  const pop = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 14, mass: 0.85, stiffness: 110 },
  });
  const enterOpacity = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Entrance pop only — camera zoom is handled by TelegramCameraRig.
  const scale = interpolate(pop, [0, 1], [0.78, 1]);
  const { x, y } = phoneCenter(width, height);

  return (
    <AbsoluteFill style={{ opacity: enterOpacity, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: PHONE_W,
          height: PHONE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          borderRadius: PHONE_RADIUS,
          background: `linear-gradient(160deg, ${COSMIC_ORANGE} 0%, ${COSMIC_ORANGE_DARK} 55%, #c44a1a 100%)`,
          boxShadow: `
            0 28px 70px rgba(0,0,0,0.5),
            0 0 28px rgba(255,122,60,0.22),
            0 1px 0 rgba(255,255,255,0.28) inset
          `,
          overflow: "hidden",
          willChange: "transform",
        }}
      >
        {/* Side buttons hint */}
        <div
          style={{
            position: "absolute",
            left: -2,
            top: 160,
            width: 3,
            height: 36,
            borderRadius: 2,
            backgroundColor: COSMIC_ORANGE_DARK,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -2,
            top: 210,
            width: 3,
            height: 64,
            borderRadius: 2,
            backgroundColor: COSMIC_ORANGE_DARK,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -2,
            top: 200,
            width: 3,
            height: 72,
            borderRadius: 2,
            backgroundColor: COSMIC_ORANGE_DARK,
          }}
        />

        {/* Screen — thin bezel + soft inner shadow on the orange rim */}
        <div
          style={{
            position: "absolute",
            left: SCREEN_INSET,
            top: SCREEN_INSET,
            right: SCREEN_INSET,
            bottom: SCREEN_INSET,
            borderRadius: PHONE_RADIUS - 6,
            overflow: "hidden",
            backgroundColor: "#000",
            boxShadow: `
              0 0 0 0.5px rgba(0,0,0,0.35),
              0 1px 4px rgba(0,0,0,0.45),
              0 0 10px rgba(0,0,0,0.25)
            `,
          }}
        >
          <TelegramChatInner />

          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 11,
              left: "50%",
              width: ISLAND_W,
              height: ISLAND_H,
              marginLeft: -ISLAND_W / 2,
              borderRadius: ISLAND_H / 2,
              backgroundColor: "#050505",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
              zIndex: 5,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * AE-style camera null: zooms into the Yes area while keeping the iPhone
 * centred and slightly lower in frame (bottom bezel stays visible).
 * Uses translate+scale from origin (0,0) — not scale-only around Yes —
 * so the phone does not drift to the right.
 */
export const useTelegramCameraZoom = () => {
  const absFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const phone = phoneCenter(width, height);
  const yes = yesButtonFocus(width, height);

  const zoomT = interpolate(
    absFrame,
    [TG_CAMERA_ZOOM_START, TG_CAMERA_ZOOM_START + TG_CAMERA_ZOOM_DURATION],
    [0, 1],
    {
      easing: EASE_ZOOM_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const zoom = interpolate(zoomT, [0, 1], [1, 2.2]);

  // Rest pose must be identity (zoom=1, tx=ty=0). Blend look/target with zoomT.
  const lookX = phone.x;
  const lookYEnd = phone.y * 0.45 + yes.y * 0.55;
  const lookY = interpolate(zoomT, [0, 1], [phone.y, lookYEnd]);
  const targetX = width / 2;
  const targetY = interpolate(zoomT, [0, 1], [phone.y, height * 0.46]);

  const tx = targetX - lookX * zoom;
  const ty = targetY - lookY * zoom;

  // Screen-space right edge of the phone after the camera transform.
  const phoneRightScreen = (phone.x + PHONE_W / 2) * zoom + tx;

  return {
    zoom,
    tx,
    ty,
    phoneRightScreen,
    transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
  };
};

export const TelegramCameraRig: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { transform } = useTelegramCameraZoom();

  return (
    <AbsoluteFill
      style={{
        transformOrigin: "0 0",
        transform,
        willChange: "transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Hand-drawn success tick (Lottie-style): circle draws, then check strokes in.
 * Screen-space, parked in the dark gap to the right of the zoomed phone.
 */
export const TelegramTickConfirm: React.FC = () => {
  const absFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const local = absFrame - TG_TICK_START;
  const { phoneRightScreen } = useTelegramCameraZoom();

  if (local < 0) {
    return null;
  }

  // Badge body: soft overshoot settle instead of a linear pop.
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 110 },
  });
  const opacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ring sweeps closed with an in-out curve so start and finish both glide.
  const circleLen = 2 * Math.PI * 42;
  const circleDraw = interpolate(local, [0, 15], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Tiny counter-rotation that unwinds — makes the draw feel "thrown on".
  const ringSpin = interpolate(local, [0, 20], [-26, 0], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fill washes in only after the ring has nearly closed.
  const fillIn = interpolate(local, [10, 22], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Check is "written": slow start, quick middle, soft landing.
  const checkLen = 72;
  const checkDraw = interpolate(local, [12, 24], [0, 1], {
    easing: Easing.bezier(0.5, 0, 0.2, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Impact accent on the moment the check lands, then a slow breathing glow.
  const impact = interpolate(local, [22, 27, 38], [0, 1, 0], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathe = 0.45 + 0.15 * Math.sin((local / fps) * Math.PI * 1.1);
  const bloom = Math.max(
    impact,
    interpolate(local, [22, 34], [0, breathe], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Shockwave ring that expands past the badge and dissolves.
  const waveT = interpolate(local, [22, 44], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const waveR = interpolate(waveT, [0, 1], [40, 66]);
  const waveOpacity = interpolate(waveT, [0, 0.25, 1], [0, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeScale = 0.78 + 0.22 * enter + 0.05 * impact;

  const size = 200;
  // Sit in the empty band between the phone's right edge and the frame edge.
  const gapLeft = phoneRightScreen + 28;
  const gapRight = width - 36;
  const cx = Math.min(
    Math.max((gapLeft + gapRight) / 2, phoneRightScreen + size / 2 + 16),
    width - size / 2 - 20,
  );
  const cy = height * 0.5;

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          transform: `scale(${badgeScale})`,
          filter: `drop-shadow(0 0 ${30 * bloom}px rgba(34,197,94,${0.6 * bloom}))`,
          willChange: "transform, filter",
        }}
      >
        <svg width={size} height={size} viewBox="0 0 100 100">
          {waveOpacity > 0.005 ? (
            <circle
              cx="50"
              cy="50"
              r={waveR}
              fill="none"
              stroke={TICK_GREEN}
              strokeWidth={interpolate(waveT, [0, 1], [4, 0.6])}
              opacity={waveOpacity}
            />
          ) : null}

          <circle
            cx="50"
            cy="50"
            r="42"
            fill={`rgba(34,197,94,${0.16 * fillIn})`}
            stroke={TICK_GREEN}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circleLen}
            strokeDashoffset={circleLen * (1 - circleDraw)}
            transform={`rotate(${-90 + ringSpin} 50 50)`}
          />
          <path
            d="M30 52 L44 66 L72 36"
            fill="none"
            stroke={TICK_GREEN}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={checkLen}
            strokeDashoffset={checkLen * (1 - checkDraw)}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Final beat: previous Telegram world slides up + fades; credit text then
 * fades/rises in from slightly below centre (not from off-screen).
 */
const VinceLetterPop: React.FC = () => {
  const absFrame = useCurrentFrame();
  const letters = ["V", "i", "n", "c", "e"] as const;

  return (
    <span
      style={{
        color: COSMIC_ORANGE,
        fontStyle: "italic",
        display: "inline-flex",
      }}
    >
      {letters.map((ch, i) => {
        const local =
          absFrame - (TG_VINCE_LETTER_START + i * TG_VINCE_LETTER_STAGGER);
        const scale = interpolate(
          local,
          [0, TG_VINCE_LETTER_PULSE * 0.4, TG_VINCE_LETTER_PULSE],
          [1, TG_VINCE_SCALE_PEAK, 1],
          {
            easing: EASE_OUT,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const glow = interpolate(
          local,
          [0, TG_VINCE_LETTER_PULSE * 0.4, TG_VINCE_LETTER_PULSE],
          [0, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );

        return (
          <span
            key={`${ch}-${i}`}
            style={{
              display: "inline-block",
              transform: `scale(${scale})`,
              transformOrigin: "center bottom",
              textShadow:
                glow > 0.01
                  ? [
                      `0 0 ${12 * glow}px rgba(255,122,60,${0.95 * glow})`,
                      `0 0 ${28 * glow}px rgba(255,122,60,${0.65 * glow})`,
                      `0 0 ${48 * glow}px rgba(255,200,140,${0.4 * glow})`,
                    ].join(", ")
                  : "none",
              willChange: "transform",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

export const TelegramEndExit: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const absFrame = useCurrentFrame();
  const { height } = useVideoConfig();

  const p = interpolate(
    absFrame,
    [TG_END_START, TG_END_START + TG_END_DURATION],
    [0, 1],
    {
      easing: EASE_END_SLIDE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const slideY = -height * p;

  // iPhone/tick opacity hits 0 exactly at frame 1910.
  const sceneOpacity = interpolate(absFrame, [TG_END_START, 1910], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const creditT = interpolate(
    absFrame,
    [TG_CREDIT_START, TG_CREDIT_START + TG_CREDIT_DURATION],
    [0, 1],
    {
      easing: EASE_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const creditOpacity = creditT;
  // Start a touch below centre, settle on centre — short rise, not off-screen.
  const creditOffsetY = interpolate(creditT, [0, 1], [height * 0.06, 0]);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateY(${slideY}px)`,
          opacity: sceneOpacity,
          willChange: "transform, opacity",
        }}
      >
        {children}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: creditOpacity,
          pointerEvents: "none",
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            transform: `translateY(${creditOffsetY}px)`,
            fontFamily:
              'ui-serif, Georgia, "Times New Roman", Times, serif',
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: COLORS.text,
            textAlign: "center",
            textShadow: "0 8px 40px rgba(0,0,0,0.35)",
            willChange: "transform",
          }}
        >
          Made by <VinceLetterPop />
          <span style={{ color: COLORS.text }}>.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
