import "./index.css";
import React from "react";
import { Composition } from "remotion";
import { PortfolioVideo } from "./Composition";
import { VIDEO } from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={VIDEO.id}
      component={PortfolioVideo}
      durationInFrames={VIDEO.durationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
