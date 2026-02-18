import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  ImageScene as ImageSceneType,
  TextScene as TextSceneType,
  VideoScene as VideoSceneType,
} from "./schema.ts";
import type { Overlay } from "./schema.ts";

// ── TextScene ─────────────────────────────────────────────────────────────────

interface TextSceneProps {
  scene: TextSceneType;
}

export function TextScene({ scene }: TextSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const anim = scene.textAnimation;
  const dur = anim?.durationFrames ?? 20;

  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };
  const easeOut = { ...clamp, easing: Easing.out(Easing.cubic) };

  const opacity =
    anim && anim.entrance !== "none"
      ? interpolate(frame, [0, dur], [0, 1], easeOut)
      : 1;

  const translateY =
    anim?.entrance === "fadeUp"
      ? interpolate(frame, [0, dur], [30, 0], easeOut)
      : 0;

  const scale =
    anim?.entrance === "scaleIn"
      ? interpolate(frame, [0, dur], [0.85, 1], clamp)
      : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: scene.fontSize,
          color: scene.color,
          fontFamily: "sans-serif",
          textAlign: "center",
          padding: "0 80px",
          display: "block",
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          transformOrigin: "center center",
          willChange: "transform, opacity",
        }}
      >
        {scene.text}
      </span>
    </AbsoluteFill>
  );
}

// ── OverlayItem ───────────────────────────────────────────────────────────────

interface OverlayItemProps {
  overlay: Overlay;
}

function OverlayItem({ overlay }: OverlayItemProps): React.ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        top: overlay.top,
        left: overlay.left,
        color: overlay.color,
        fontSize: overlay.fontSize ?? 48,
        fontFamily: "sans-serif",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
        padding: "8px 16px",
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 4,
      }}
    >
      {overlay.text}
    </div>
  );
}

// ── ImageScene ────────────────────────────────────────────────────────────────

interface ImageSceneProps {
  scene: ImageSceneType;
}

export function ImageScene({ scene }: ImageSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const kb = scene.kenBurns;

  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };

  const scale = kb
    ? interpolate(frame, [0, durationInFrames], [kb.zoomFrom, kb.zoomTo], clamp)
    : 1;

  const translateX = kb
    ? interpolate(frame, [0, durationInFrames], [kb.panXFrom, kb.panXTo], clamp)
    : 0;

  const translateY = kb
    ? interpolate(frame, [0, durationInFrames], [kb.panYFrom, kb.panYTo], clamp)
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000", overflow: "hidden" }}>
      <Img
        src={staticFile(scene.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      />
      {scene.overlays?.map((overlay, i) => (
        <OverlayItem key={i} overlay={overlay} />
      ))}
    </AbsoluteFill>
  );
}

// ── VideoScene ────────────────────────────────────────────────────────────────

interface VideoSceneProps {
  scene: VideoSceneType;
}

export function VideoScene({ scene }: VideoSceneProps): React.ReactElement {
  return (
    <AbsoluteFill>
      <Video
        src={staticFile(scene.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
}
