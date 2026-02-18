import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { TextScene, ImageScene, VideoScene } from "./scenes.tsx";
import type { VideoScript, Scene } from "./schema.ts";

// ── Scene dispatcher ──────────────────────────────────────────────────────────

function SceneComponent({ scene }: { scene: Scene }): React.ReactElement {
  if (scene.type === "text") return <TextScene scene={scene} />;
  if (scene.type === "image") return <ImageScene scene={scene} />;
  return <VideoScene scene={scene} />;
}

// ── Transition resolver ───────────────────────────────────────────────────────

const TRANSITION_DURATION_FRAMES = 15;

function resolveTransition(scene: Scene) {
  const dur = TRANSITION_DURATION_FRAMES;
  switch (scene.transition) {
    case "fade":
      return { presentation: fade(), timing: linearTiming({ durationInFrames: dur }) };
    case "slide":
      return { presentation: slide({ direction: "from-right" }), timing: springTiming({ durationInFrames: dur }) };
    case "wipe":
      return { presentation: wipe({ direction: "from-left" }), timing: linearTiming({ durationInFrames: dur }) };
    default:
      return null;
  }
}

// ── VideoComposition ──────────────────────────────────────────────────────────

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
    if (i < scenes.length - 1) {
      const t = resolveTransition(scene);
      if (t) {
        children.push(
          <TransitionSeries.Transition
            key={`transition-${i}`}
            presentation={t.presentation}
            timing={t.timing}
          />
        );
      }
    }
  });

  return (
    <AbsoluteFill>
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
}
