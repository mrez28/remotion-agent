import { describe, expect, mock, test } from "bun:test";
import React from "react";

// ── Mock remotion ────────────────────────────────────────────────────────────
// Use React.createElement (no JSX) in mock factories to avoid parse issues.

mock.module("remotion", () => {
  return {
    AbsoluteFill: (props: { children?: React.ReactNode; style?: React.CSSProperties }) =>
      React.createElement("div", { style: props.style }, props.children),
    Img: (props: { src: string; style?: React.CSSProperties }) =>
      React.createElement("img", { src: props.src, style: props.style, alt: "" }),
    Video: (props: { src: string; style?: React.CSSProperties }) =>
      React.createElement("video", { src: props.src, style: props.style }),
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({ fps: 30, width: 1920, height: 1080, durationInFrames: 90 }),
    interpolate: (v: number, inputRange: number[], outputRange: number[]) => {
      const t = (v - inputRange[0]) / (inputRange[1] - inputRange[0]);
      return outputRange[0] + t * (outputRange[1] - outputRange[0]);
    },
    Easing: { linear: (t: number) => t },
  };
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Import AFTER mock is registered
import { TextScene, ImageScene, VideoScene } from "../scenes.tsx";
import type { TextScene as TextSceneType, ImageScene as ImageSceneType, VideoScene as VideoSceneType } from "../schema.ts";

const baseText: TextSceneType = {
  type: "text",
  text: "Hello World",
  duration: 3,
  transition: "none",
  fontSize: 80,
  color: "#ffffff",
  background: "#000000",
};

const baseImage: ImageSceneType = {
  type: "image",
  src: "./assets/photo.jpg",
  duration: 5,
  transition: "none",
};

const baseVideo: VideoSceneType = {
  type: "video",
  src: "./assets/clip.mp4",
  duration: 10,
  transition: "none",
  volume: 1,
};

describe("TextScene", () => {
  test("renders the text content", () => {
    const html = renderToStaticMarkup(<TextScene scene={baseText} />);
    expect(html).toContain("Hello World");
  });

  test("applies background color style", () => {
    const html = renderToStaticMarkup(<TextScene scene={baseText} />);
    expect(html).toContain("#000000");
  });

  test("applies text color style", () => {
    const html = renderToStaticMarkup(<TextScene scene={baseText} />);
    expect(html).toContain("#ffffff");
  });

  test("applies font size", () => {
    const html = renderToStaticMarkup(<TextScene scene={baseText} />);
    expect(html).toContain("80");
  });

  test("renders custom text", () => {
    const scene = { ...baseText, text: "Custom text here" };
    const html = renderToStaticMarkup(<TextScene scene={scene} />);
    expect(html).toContain("Custom text here");
  });
});

describe("ImageScene", () => {
  test("renders img element with correct src", () => {
    const html = renderToStaticMarkup(<ImageScene scene={baseImage} />);
    expect(html).toContain("./assets/photo.jpg");
  });

  test("renders overlays when provided", () => {
    const scene: ImageSceneType = {
      ...baseImage,
      overlays: [{ text: "My Caption", top: "85%", left: "10%", color: "#ffffff" }],
    };
    const html = renderToStaticMarkup(<ImageScene scene={scene} />);
    expect(html).toContain("My Caption");
  });

  test("renders without overlays when none provided", () => {
    const html = renderToStaticMarkup(<ImageScene scene={baseImage} />);
    // Should render without error and include the img src
    expect(html).toContain("photo.jpg");
  });

  test("renders multiple overlays", () => {
    const scene: ImageSceneType = {
      ...baseImage,
      overlays: [
        { text: "Top text", top: "5%", left: "10%", color: "#fff" },
        { text: "Bottom text", top: "85%", left: "10%", color: "#fff" },
      ],
    };
    const html = renderToStaticMarkup(<ImageScene scene={scene} />);
    expect(html).toContain("Top text");
    expect(html).toContain("Bottom text");
  });
});

describe("VideoScene", () => {
  test("renders video element with correct src", () => {
    const html = renderToStaticMarkup(<VideoScene scene={baseVideo} />);
    expect(html).toContain("./assets/clip.mp4");
  });

  test("renders video element", () => {
    const html = renderToStaticMarkup(<VideoScene scene={baseVideo} />);
    expect(html).toContain("<video");
  });
});
