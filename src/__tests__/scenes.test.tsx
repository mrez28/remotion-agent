import { describe, expect, mock, test } from "bun:test";
import React from "react";

// ── Mock remotion ────────────────────────────────────────────────────────────
// Use React.createElement (no JSX) in mock factories to avoid parse issues.

mock.module("remotion", () => {
  return {
    AbsoluteFill: (props: {
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }) => React.createElement("div", { style: props.style }, props.children),
    Img: (props: { src: string; style?: React.CSSProperties }) =>
      React.createElement("img", {
        src: props.src,
        style: props.style,
        alt: "",
      }),
    Video: (props: { src: string; style?: React.CSSProperties }) =>
      React.createElement("video", { src: props.src, style: props.style }),
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 90,
    }),
    interpolate: (v: number, inputRange: number[], outputRange: number[]) => {
      const t = (v - inputRange[0]) / (inputRange[1] - inputRange[0]);
      return outputRange[0] + t * (outputRange[1] - outputRange[0]);
    },
    Easing: {
      linear: (t: number) => t,
      out: (fn: (t: number) => number) => fn,
      cubic: (t: number) => t,
    },
  };
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Import AFTER mock is registered
import { TextScene, ImageScene, VideoScene } from "../scenes.tsx";
import type {
  TextScene as TextSceneType,
  ImageScene as ImageSceneType,
  VideoScene as VideoSceneType,
} from "../schema.ts";

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
      overlays: [
        { text: "My Caption", top: "85%", left: "10%", color: "#ffffff" },
      ],
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

describe("ImageScene with Ken Burns", () => {
  test("renders with kenBurns config without crashing", () => {
    const scene: ImageSceneType = {
      ...baseImage,
      kenBurns: {
        zoomFrom: 1.0,
        zoomTo: 1.08,
        panXFrom: 0,
        panXTo: 2,
        panYFrom: 0,
        panYTo: 1,
      },
    };
    const html = renderToStaticMarkup(<ImageScene scene={scene} />);
    expect(html).toContain("photo.jpg");
  });

  test("applies scale transform when kenBurns is present", () => {
    const scene: ImageSceneType = {
      ...baseImage,
      kenBurns: {
        zoomFrom: 1.0,
        zoomTo: 1.08,
        panXFrom: 0,
        panXTo: 2,
        panYFrom: 0,
        panYTo: 1,
      },
    };
    const html = renderToStaticMarkup(<ImageScene scene={scene} />);
    expect(html).toContain("scale");
  });

  test("at frame 0 scale equals zoomFrom (1.0) via mocked interpolate", () => {
    // Mocked interpolate is linear: at frame=0, output=outputRange[0] = zoomFrom = 1
    const scene: ImageSceneType = {
      ...baseImage,
      kenBurns: {
        zoomFrom: 1.0,
        zoomTo: 1.08,
        panXFrom: 0,
        panXTo: 2,
        panYFrom: 0,
        panYTo: 1,
      },
    };
    const html = renderToStaticMarkup(<ImageScene scene={scene} />);
    expect(html).toContain("scale(1)");
  });

  test("renders without kenBurns (no crash, shows image)", () => {
    const html = renderToStaticMarkup(<ImageScene scene={baseImage} />);
    expect(html).toContain("photo.jpg");
  });

  test("container has overflow hidden when kenBurns present", () => {
    const scene: ImageSceneType = {
      ...baseImage,
      kenBurns: {
        zoomFrom: 1.0,
        zoomTo: 1.08,
        panXFrom: 0,
        panXTo: 2,
        panYFrom: 0,
        panYTo: 1,
      },
    };
    const html = renderToStaticMarkup(<ImageScene scene={scene} />);
    expect(html).toContain("overflow");
  });
});

describe("TextScene with animation", () => {
  test("renders with fadeUp animation without crashing", () => {
    const scene: TextSceneType = {
      ...baseText,
      textAnimation: { entrance: "fadeUp", durationFrames: 20 },
    };
    const html = renderToStaticMarkup(<TextScene scene={scene} />);
    expect(html).toContain("Hello World");
  });

  test("applies opacity style when animation present", () => {
    const scene: TextSceneType = {
      ...baseText,
      textAnimation: { entrance: "fadeUp", durationFrames: 20 },
    };
    const html = renderToStaticMarkup(<TextScene scene={scene} />);
    expect(html).toContain("opacity");
  });

  test("renders scaleIn entrance without crashing", () => {
    const scene: TextSceneType = {
      ...baseText,
      textAnimation: { entrance: "scaleIn", durationFrames: 15 },
    };
    const html = renderToStaticMarkup(<TextScene scene={scene} />);
    expect(html).toContain("Hello World");
  });

  test("renders none entrance without animation styles", () => {
    const scene: TextSceneType = {
      ...baseText,
      textAnimation: { entrance: "none", durationFrames: 20 },
    };
    const html = renderToStaticMarkup(<TextScene scene={scene} />);
    expect(html).toContain("Hello World");
  });

  test("renders without textAnimation (static, no opacity style injected)", () => {
    const html = renderToStaticMarkup(<TextScene scene={baseText} />);
    expect(html).toContain("Hello World");
    // Static text — opacity should be 1 (either explicit or absent)
    expect(html).not.toContain("opacity:0");
  });

  test("applies translateY for fadeUp at frame 0 (mocked interpolate → 30px start)", () => {
    // At frame=0, interpolate([0,dur],[30,0]) via linear mock = 30
    const scene: TextSceneType = {
      ...baseText,
      textAnimation: { entrance: "fadeUp", durationFrames: 20 },
    };
    const html = renderToStaticMarkup(<TextScene scene={scene} />);
    expect(html).toContain("translateY");
  });
});
