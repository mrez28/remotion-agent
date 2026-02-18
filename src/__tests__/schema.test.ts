import { describe, expect, test } from "bun:test";
import { parseScript, totalDurationInFrames } from "../schema.ts";

describe("parseScript", () => {
  test("parses a minimal valid script", () => {
    const raw = {
      fps: 30,
      width: 1920,
      height: 1080,
      output: "out/video.mp4",
      scenes: [{ type: "text", text: "Hello", duration: 3 }],
    };
    const result = parseScript(raw);
    expect(result.fps).toBe(30);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.scenes).toHaveLength(1);
  });

  test("applies default fps of 30 when not provided", () => {
    const raw = {
      width: 1920,
      height: 1080,
      output: "out/video.mp4",
      scenes: [{ type: "text", text: "Hi", duration: 2 }],
    };
    const result = parseScript(raw);
    expect(result.fps).toBe(30);
  });

  test("applies default width/height when not provided", () => {
    const raw = {
      output: "out/video.mp4",
      scenes: [{ type: "text", text: "Hi", duration: 2 }],
    };
    const result = parseScript(raw);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  test("applies default output path when not provided", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hi", duration: 2 }],
    };
    const result = parseScript(raw);
    expect(result.output).toBe("out/video.mp4");
  });

  test("applies default transition 'none' for scenes without transition", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hello", duration: 3 }],
    };
    const result = parseScript(raw);
    expect(result.scenes[0].transition).toBe("none");
  });

  test("preserves explicit transition 'fade'", () => {
    const raw = {
      scenes: [
        { type: "text", text: "Hello", duration: 3, transition: "fade" },
      ],
    };
    const result = parseScript(raw);
    expect(result.scenes[0].transition).toBe("fade");
  });

  test("parses image scene with overlays", () => {
    const raw = {
      scenes: [
        {
          type: "image",
          src: "./assets/photo.jpg",
          duration: 5,
          overlays: [{ text: "Caption", top: "85%", left: "10%" }],
        },
      ],
    };
    const result = parseScript(raw);
    const scene = result.scenes[0];
    if (scene.type !== "image") throw new Error("expected image scene");
    expect(scene.src).toBe("./assets/photo.jpg");
    expect(scene.overlays).toHaveLength(1);
    expect(scene.overlays![0].text).toBe("Caption");
  });

  test("parses video scene", () => {
    const raw = {
      scenes: [{ type: "video", src: "./assets/clip.mp4", duration: 10 }],
    };
    const result = parseScript(raw);
    const scene = result.scenes[0];
    if (scene.type !== "video") throw new Error("expected video scene");
    expect(scene.src).toBe("./assets/clip.mp4");
    expect(scene.duration).toBe(10);
  });

  test("throws ZodError for missing scenes array", () => {
    expect(() => parseScript({})).toThrow();
  });

  test("throws ZodError for scene with unknown type", () => {
    const raw = {
      scenes: [{ type: "unknown", duration: 3 }],
    };
    expect(() => parseScript(raw)).toThrow();
  });

  test("throws ZodError for text scene missing 'text' field", () => {
    const raw = {
      scenes: [{ type: "text", duration: 3 }],
    };
    expect(() => parseScript(raw)).toThrow();
  });

  test("throws ZodError for image scene missing 'src'", () => {
    const raw = {
      scenes: [{ type: "image", duration: 3 }],
    };
    expect(() => parseScript(raw)).toThrow();
  });

  test("throws for negative fps", () => {
    const raw = {
      fps: -1,
      scenes: [{ type: "text", text: "Hi", duration: 2 }],
    };
    expect(() => parseScript(raw)).toThrow();
  });

  test("throws for zero duration", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hi", duration: 0 }],
    };
    expect(() => parseScript(raw)).toThrow();
  });
});

describe("totalDurationInFrames", () => {
  test("sums scene durations multiplied by fps", () => {
    const raw = {
      fps: 30,
      scenes: [
        { type: "text", text: "A", duration: 3 },
        { type: "text", text: "B", duration: 2 },
      ],
    };
    const script = parseScript(raw);
    expect(totalDurationInFrames(script)).toBe(150); // (3+2) * 30
  });

  test("works with custom fps", () => {
    const raw = {
      fps: 24,
      scenes: [{ type: "text", text: "A", duration: 5 }],
    };
    const script = parseScript(raw);
    expect(totalDurationInFrames(script)).toBe(120); // 5 * 24
  });

  test("handles single scene", () => {
    const raw = {
      fps: 60,
      scenes: [{ type: "text", text: "A", duration: 1 }],
    };
    const script = parseScript(raw);
    expect(totalDurationInFrames(script)).toBe(60);
  });
});

describe("transitions — slide and wipe", () => {
  test("accepts slide transition", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hi", duration: 3, transition: "slide" }],
    };
    expect(parseScript(raw).scenes[0].transition).toBe("slide");
  });

  test("accepts wipe transition", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hi", duration: 3, transition: "wipe" }],
    };
    expect(parseScript(raw).scenes[0].transition).toBe("wipe");
  });

  test("rejects unknown transition value", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hi", duration: 3, transition: "spin" }],
    };
    expect(() => parseScript(raw)).toThrow();
  });
});

describe("kenBurns on ImageScene", () => {
  test("parses kenBurns config", () => {
    const raw = {
      scenes: [
        {
          type: "image",
          src: "./assets/x.jpg",
          duration: 5,
          kenBurns: {
            zoomFrom: 1.0,
            zoomTo: 1.08,
            panXFrom: 0,
            panXTo: 2,
            panYFrom: 0,
            panYTo: 1,
          },
        },
      ],
    };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "image") throw new Error("expected image");
    expect(scene.kenBurns?.zoomTo).toBe(1.08);
    expect(scene.kenBurns?.panXTo).toBe(2);
  });

  test("applies kenBurns defaults when empty object provided", () => {
    const raw = {
      scenes: [{ type: "image", src: "./x.jpg", duration: 5, kenBurns: {} }],
    };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "image") throw new Error("expected image");
    expect(scene.kenBurns?.zoomFrom).toBe(1.0);
    expect(scene.kenBurns?.zoomTo).toBe(1.08);
    expect(scene.kenBurns?.panXFrom).toBe(0);
    expect(scene.kenBurns?.panYTo).toBe(1);
  });

  test("kenBurns is optional — image scene without it still valid", () => {
    const raw = { scenes: [{ type: "image", src: "./x.jpg", duration: 5 }] };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "image") throw new Error("expected image");
    expect(scene.kenBurns).toBeUndefined();
  });

  test("rejects negative zoomFrom", () => {
    const raw = {
      scenes: [
        {
          type: "image",
          src: "./x.jpg",
          duration: 5,
          kenBurns: { zoomFrom: -1 },
        },
      ],
    };
    expect(() => parseScript(raw)).toThrow();
  });
});

describe("textAnimation on TextScene", () => {
  test("parses textAnimation config", () => {
    const raw = {
      scenes: [
        {
          type: "text",
          text: "Hi",
          duration: 3,
          textAnimation: { entrance: "fadeUp", durationFrames: 20 },
        },
      ],
    };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.textAnimation?.entrance).toBe("fadeUp");
    expect(scene.textAnimation?.durationFrames).toBe(20);
  });

  test("accepts scaleIn entrance", () => {
    const raw = {
      scenes: [
        {
          type: "text",
          text: "Hi",
          duration: 3,
          textAnimation: { entrance: "scaleIn" },
        },
      ],
    };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.textAnimation?.entrance).toBe("scaleIn");
  });

  test("accepts none entrance", () => {
    const raw = {
      scenes: [
        {
          type: "text",
          text: "Hi",
          duration: 3,
          textAnimation: { entrance: "none" },
        },
      ],
    };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.textAnimation?.entrance).toBe("none");
  });

  test("applies default entrance fadeUp when empty object provided", () => {
    const raw = {
      scenes: [{ type: "text", text: "Hi", duration: 3, textAnimation: {} }],
    };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.textAnimation?.entrance).toBe("fadeUp");
    expect(scene.textAnimation?.durationFrames).toBe(20);
  });

  test("rejects invalid entrance value", () => {
    const raw = {
      scenes: [
        {
          type: "text",
          text: "Hi",
          duration: 3,
          textAnimation: { entrance: "spinIn" },
        },
      ],
    };
    expect(() => parseScript(raw)).toThrow();
  });

  test("textAnimation is optional — text scene without it still valid", () => {
    const raw = { scenes: [{ type: "text", text: "Hi", duration: 3 }] };
    const scene = parseScript(raw).scenes[0];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.textAnimation).toBeUndefined();
  });
});

describe("cinematic flag on VideoScript", () => {
  test("parses cinematic: true", () => {
    const raw = {
      cinematic: true,
      scenes: [{ type: "text", text: "Hi", duration: 3 }],
    };
    expect(parseScript(raw).cinematic).toBe(true);
  });

  test("defaults cinematic to false when omitted", () => {
    const raw = { scenes: [{ type: "text", text: "Hi", duration: 3 }] };
    expect(parseScript(raw).cinematic).toBe(false);
  });

  test("parses cinematic: false explicitly", () => {
    const raw = {
      cinematic: false,
      scenes: [{ type: "text", text: "Hi", duration: 3 }],
    };
    expect(parseScript(raw).cinematic).toBe(false);
  });
});
