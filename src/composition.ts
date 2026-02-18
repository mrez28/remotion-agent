import { registerRoot, Composition } from "remotion";
import React from "react";
import { VideoScript, parseScript, totalDurationInFrames } from "./schema.ts";
import { VideoComposition } from "./video.tsx";

export const COMPOSITION_ID = "VideoAgent";

/**
 * calculateMetadata receives inputProps at render time and computes
 * durationInFrames dynamically from the script's scenes.
 */
export async function calculateMetadata({
  props,
}: {
  props: VideoScript;
}): Promise<{ durationInFrames: number; fps: number; width: number; height: number }> {
  return {
    durationInFrames: totalDurationInFrames(props),
    fps: props.fps,
    width: props.width,
    height: props.height,
  };
}

function Root() {
  // Placeholder props — real props are injected via inputProps at render time.
  const placeholder: VideoScript = {
    fps: 30,
    width: 1920,
    height: 1080,
    output: "out/video.mp4",
    scenes: [{ type: "text", text: "Loading…", duration: 1, transition: "none", fontSize: 80, color: "#fff", background: "#000" }],
  };

  return React.createElement(Composition, {
    id: COMPOSITION_ID,
    component: VideoComposition,
    durationInFrames: totalDurationInFrames(placeholder),
    fps: placeholder.fps,
    width: placeholder.width,
    height: placeholder.height,
    defaultProps: placeholder,
    calculateMetadata,
  });
}

registerRoot(Root);
