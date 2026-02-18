import { describe, expect, mock, test, spyOn } from "bun:test";
import path from "path";

// ── Mock @remotion/bundler ────────────────────────────────────────────────────

mock.module("@remotion/bundler", () => ({
  bundle: async (_entry: string, _onProgress?: (p: number) => void) => {
    return "/tmp/fake-bundle-dir";
  },
}));

// ── Mock @remotion/renderer ───────────────────────────────────────────────────

const mockSelectComposition = mock(async (_opts: unknown) => ({
  id: "VideoAgent",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 150,
}));

const mockRenderMedia = mock(async (_opts: unknown) => undefined);

mock.module("@remotion/renderer", () => ({
  selectComposition: mockSelectComposition,
  renderMedia: mockRenderMedia,
}));

// ── Import renderer AFTER mocks ───────────────────────────────────────────────

import { renderVideo } from "../renderer.ts";
import { parseScript } from "../schema.ts";

const sampleScript = parseScript({
  fps: 30,
  width: 1920,
  height: 1080,
  output: "out/video.mp4",
  scenes: [
    { type: "text", text: "Hello", duration: 3, transition: "none" },
    { type: "text", text: "World", duration: 2, transition: "fade" },
  ],
});

describe("renderVideo", () => {
  test("calls selectComposition with the script as inputProps", async () => {
    mockSelectComposition.mockClear();
    mockRenderMedia.mockClear();

    await renderVideo(sampleScript);

    expect(mockSelectComposition).toHaveBeenCalledTimes(1);
    const [opts] = mockSelectComposition.mock.calls[0] as [
      { inputProps: unknown },
    ][];
    expect((opts as { inputProps: unknown }).inputProps).toEqual(sampleScript);
  });

  test("calls renderMedia with codec h264", async () => {
    mockSelectComposition.mockClear();
    mockRenderMedia.mockClear();

    await renderVideo(sampleScript);

    expect(mockRenderMedia).toHaveBeenCalledTimes(1);
    const [opts] = mockRenderMedia.mock.calls[0] as [{ codec: string }][];
    expect((opts as { codec: string }).codec).toBe("h264");
  });

  test("calls renderMedia with the output path from script", async () => {
    mockSelectComposition.mockClear();
    mockRenderMedia.mockClear();

    await renderVideo(sampleScript);

    const [opts] = mockRenderMedia.mock.calls[0] as [
      { outputLocation: string },
    ][];
    expect((opts as { outputLocation: string }).outputLocation).toBe(
      "out/video.mp4",
    );
  });

  test("calls renderMedia with inputProps matching the script", async () => {
    mockSelectComposition.mockClear();
    mockRenderMedia.mockClear();

    await renderVideo(sampleScript);

    const [opts] = mockRenderMedia.mock.calls[0] as [{ inputProps: unknown }][];
    expect((opts as { inputProps: unknown }).inputProps).toEqual(sampleScript);
  });

  test("calls renderMedia with a serveUrl string", async () => {
    mockSelectComposition.mockClear();
    mockRenderMedia.mockClear();

    await renderVideo(sampleScript);

    const [opts] = mockRenderMedia.mock.calls[0] as [{ serveUrl: string }][];
    expect(typeof (opts as { serveUrl: string }).serveUrl).toBe("string");
  });
});
