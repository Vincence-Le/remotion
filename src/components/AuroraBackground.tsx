import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type AuroraBackgroundProps = {
  /** Frames over which the blobs complete their drift. */
  driftFrames?: number;
};

/**
 * Shared backdrop layer: dark base + slow-drifting mesh-gradient blobs.
 * Mounted once per scene group so multiple beats share one continuous
 * background instead of each scene painting its own.
 */
export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  driftFrames = 150,
}) => {
  const frame = useCurrentFrame();

  const aura1X = interpolate(frame, [0, driftFrames], [20, 35], {
    extrapolateRight: "clamp",
  });
  const aura1Y = interpolate(frame, [0, driftFrames], [20, 10], {
    extrapolateRight: "clamp",
  });
  const aura2X = interpolate(frame, [0, driftFrames], [80, 65], {
    extrapolateRight: "clamp",
  });
  const aura2Y = interpolate(frame, [0, driftFrames], [70, 85], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute h-[600px] w-[600px] rounded-full opacity-40 blur-[140px]"
        style={{
          background: "radial-gradient(circle, #EA4B71 0%, transparent 70%)",
          left: `${aura1X}%`,
          top: `${aura1Y}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full opacity-35 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #F97316 0%, transparent 70%)",
          left: `${aura2X}%`,
          top: `${aura2Y}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[150px]"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
        }}
      />
    </AbsoluteFill>
  );
};
