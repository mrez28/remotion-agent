import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { TextScene, ImageScene, VideoScene } from "./scenes.tsx";
import type { VideoScript, Scene } from "./schema.ts";

// ── Scene dispatcher ──────────────────────────────────────────────────────────

function SceneComponent({ scene }: { scene: Scene }): React.ReactElement {
  if (scene.type === "text") return <TextScene scene={scene} />;
  if (scene.type === "image") return <ImageScene scene={scene} />;
  return <VideoScene scene={scene} />;
}

// ── VideoComposition ──────────────────────────────────────────────────────────

const TRANSITION_DURATION_FRAMES = 15;

interface VideoCompositionProps extends VideoScript {}

export function VideoComposition(props: VideoCompositionProps): React.ReactElement {
  const { scenes, fps } = props;

  // Build TransitionSeries children imperatively to interleave Transition nodes.
  const children: React.ReactElement[] = [];

  scenes.forEach((scene, i) => {
    const durationInFrames = Math.round(scene.duration * fps);

    children.push(
      <TransitionSeries.Sequence key={`scene-${i}`} durationInFrames={durationInFrames}>
        <SceneComponent scene={scene} />
      </TransitionSeries.Sequence>
    );

    // Add transition after every scene except the last.
    if (i < scenes.length - 1 && scene.transition === "fade") {
      children.push(
        <TransitionSeries.Transition
          key={`transition-${i}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION_FRAMES })}
        />
      );
    }
  });

  return (
    <AbsoluteFill>
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
}
