import React from "react";
import { Sequence } from "remotion";
import { AuroraBackground } from "./components/AuroraBackground";
import { SCENES, VIDEO } from "./constants";
import { MainScene } from "./scenes";

/**
 * Main composition: one "Main" beat that spans the whole video.
 * MainScene carries every beat over one shared aurora backdrop.
 *
 * Project uses layout="none" so Remotion does not inject an AbsoluteFill
 * under it — keeps the Studio timeline labeled only with Sequence names.
 */
export const PortfolioVideo: React.FC = () => {
  return (
    <Sequence
      durationInFrames={VIDEO.durationInFrames}
      name="Project"
      layout="none"
    >
      <Sequence
        from={SCENES.intro.from}
        durationInFrames={SCENES.intro.durationInFrames}
        name="Main"
      >
        <Sequence
          durationInFrames={SCENES.intro.durationInFrames}
          name="Background"
        >
          <AuroraBackground driftFrames={SCENES.intro.durationInFrames} />
        </Sequence>
        <Sequence
          durationInFrames={SCENES.intro.durationInFrames}
          name="Scene"
        >
          <MainScene />
        </Sequence>
      </Sequence>
    </Sequence>
  );
};
