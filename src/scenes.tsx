import React from "react";
import { AbsoluteFill, Img, Video } from "remotion";
import type { ImageScene as ImageSceneType, TextScene as TextSceneType, VideoScene as VideoSceneType } from "./schema.ts";
import type { Overlay } from "./schema.ts";

// ── TextScene ─────────────────────────────────────────────────────────────────

interface TextSceneProps {
  scene: TextSceneType;
}

export function TextScene({ scene }: TextSceneProps): React.ReactElement {
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
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <Img
        src={scene.src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
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
        src={scene.src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
}
