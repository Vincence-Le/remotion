// BeatSyncedScene.jsx
// Demo component: đọc beats.json (xuất từ librosa) và điều khiển 3 tầng motion
// theo đúng nguyên tắc hierarchy đã bàn:
//   - accents  -> flash / camera shake (điểm impact lớn nhất)
//   - beats    -> transition cảnh chính / pop nội dung
//   - onsets   -> particle nền nhấp nháy liên tục (nhẹ, không làm rối info chính)
//
// Cách dùng:
// 1. Copy beats.json vào cùng thư mục src/ trong project Remotion
// 2. import BeatSyncedScene từ file này vào Composition của bạn
// 3. Đảm bảo fps Composition khớp với fps trong beats.json (mặc định 30)

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import beats from './beats.json';

// ---- Helpers ----

// Tìm điểm gần nhất trong 1 mảng {frame} quanh frame hiện tại, trong khoảng tolerance
function nearestEvent(events, frame, tolerance = 6) {
  let closest = null;
  let minDist = Infinity;
  for (const e of events) {
    const dist = Math.abs(e.frame - frame);
    if (dist <= tolerance && dist < minDist) {
      minDist = dist;
      closest = e;
    }
  }
  return closest; // null nếu không có event nào gần
}

// Progress 0->1 kể từ lúc 1 event xảy ra, dùng để animate "decay" sau mỗi hit
function framesSinceEvent(events, frame) {
  let best = Infinity;
  for (const e of events) {
    if (e.frame <= frame) {
      const d = frame - e.frame;
      if (d < best) best = d;
    }
  }
  return best === Infinity ? 999 : best;
}

// ---- Layer 1: Background particles (theo onsets - dày, nhẹ) ----

const ONSET_PARTICLES = [
  { x: 12, y: 20, color: '#a78bfa' },
  { x: 82, y: 15, color: '#5eead4' },
  { x: 25, y: 75, color: '#f472b6' },
  { x: 70, y: 70, color: '#a78bfa' },
  { x: 50, y: 40, color: '#5eead4' },
];

const ParticleLayer = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sinceOnset = framesSinceEvent(beats.onsets, frame);
  // mỗi lần có onset, particle "nháy" nhẹ rồi tắt dần trong ~8 frame
  const pulse = interpolate(sinceOnset, [0, 8], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {ONSET_PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 10 + pulse * 14,
            height: 10 + pulse * 14,
            borderRadius: '50%',
            background: p.color,
            opacity: 0.25 + pulse * 0.5,
            filter: 'blur(6px)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ---- Layer 2: Main content (theo beats - transition chính) ----

const beatIndexAtFrame = (frame) => {
  // đếm xem đang ở beat thứ mấy (dùng để đổi nội dung/pose mỗi beat)
  let idx = -1;
  for (let i = 0; i < beats.beats.length; i++) {
    if (beats.beats[i].frame <= frame) idx = i;
  }
  return idx;
};

const MainContent = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatIdx = beatIndexAtFrame(frame);
  const currentBeat = beats.beats[beatIdx];

  // spring "pop" mỗi khi beat mới xảy ra
  const framesSinceBeat = currentBeat ? frame - currentBeat.frame : 999;
  const pop = spring({
    frame: framesSinceBeat,
    fps,
    config: { damping: 10, stiffness: 180, mass: 0.6 },
  });
  const scale = interpolate(pop, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          transform: `scale(${scale})`,
          padding: '28px 40px',
          borderRadius: 18,
          background: 'linear-gradient(160deg,#1c1a2b,#131120)',
          border: '1px solid #2a273f',
          color: '#eae7f5',
          fontFamily: 'sans-serif',
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        Beat #{beatIdx + 1} / {beats.beats.length}
      </div>
    </AbsoluteFill>
  );
};

// ---- Layer 3: Impact overlay (theo accents - flash + shake) ----

const ImpactLayer = () => {
  const frame = useCurrentFrame();
  const sinceAccent = framesSinceEvent(beats.accents, frame);

  // flash trắng decay nhanh trong ~5 frame
  const flashOpacity = interpolate(sinceAccent, [0, 5], [0.6, 0], { extrapolateRight: 'clamp' });

  // camera shake decay trong ~10 frame
  const shakeAmount = interpolate(sinceAccent, [0, 10], [8, 0], { extrapolateRight: 'clamp' });
  const shakeX = sinceAccent < 10 ? Math.sin(sinceAccent * 3) * shakeAmount : 0;
  const shakeY = sinceAccent < 10 ? Math.cos(sinceAccent * 2.4) * shakeAmount : 0;

  return (
    <>
      {/* dùng translate này ở component cha để dịch toàn khung nếu muốn shake cả scene */}
      <AbsoluteFill
        style={{
          background: '#fff',
          opacity: flashOpacity,
          pointerEvents: 'none',
        }}
      />
      {/* export shake offset ra ngoài qua data attribute để component cha dùng nếu cần */}
      <div style={{ display: 'none' }} data-shake-x={shakeX} data-shake-y={shakeY} />
    </>
  );
};

// ---- Scene tổng: gộp 3 layer, áp shake vào toàn cảnh ----

export const BeatSyncedScene = () => {
  const frame = useCurrentFrame();
  const sinceAccent = framesSinceEvent(beats.accents, frame);
  const shakeAmount = interpolate(sinceAccent, [0, 10], [8, 0], { extrapolateRight: 'clamp' });
  const shakeX = sinceAccent < 10 ? Math.sin(sinceAccent * 3) * shakeAmount : 0;
  const shakeY = sinceAccent < 10 ? Math.cos(sinceAccent * 2.4) * shakeAmount : 0;

  return (
    <AbsoluteFill style={{ background: '#0a0a12', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        <ParticleLayer />
        <MainContent />
      </AbsoluteFill>
      <ImpactLayer />
    </AbsoluteFill>
  );
};

export default BeatSyncedScene;
