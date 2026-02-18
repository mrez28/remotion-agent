import { describe, expect, mock, test } from "bun:test";

// ── Minimal OOXML fixtures ────────────────────────────────────────────────────

const PRES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
    <p:sldId id="257" r:id="rId3"/>
  </p:sldIdLst>
</p:presentation>`;

const PRES_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`;

// Slide 1: has an image + text
const SLIDE1_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Slide One Title</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:pic>
        <p:blipFill>
          <a:blip r:embed="rId1"/>
        </p:blipFill>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`;

const SLIDE1_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;

// Slide 2: text only, no image
const SLIDE2_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Slide Two Content</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

const SLIDE2_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

const FAKE_IMAGE_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

// ── Mock pizzip ───────────────────────────────────────────────────────────────

const zipFiles: Record<string, string | Buffer> = {
  "ppt/presentation.xml": PRES_XML,
  "ppt/_rels/presentation.xml.rels": PRES_RELS_XML,
  "ppt/slides/slide1.xml": SLIDE1_XML,
  "ppt/slides/_rels/slide1.xml.rels": SLIDE1_RELS_XML,
  "ppt/slides/slide2.xml": SLIDE2_XML,
  "ppt/slides/_rels/slide2.xml.rels": SLIDE2_RELS_XML,
  "ppt/media/image1.png": FAKE_IMAGE_BUFFER,
};

mock.module("pizzip", () => ({
  default: class MockPizZip {
    constructor(_buf: Buffer) {}
    file(path: string) {
      const content = zipFiles[path];
      if (content === undefined) return null;
      return {
        async: async (_type: string) => content,
      };
    }
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { pptxToScript } from "../pptx-parser.ts";
import { parseScript } from "../schema.ts";

// Fake buffer — pptxToScript accepts Buffer directly, bypassing fs.readFileSync
const FAKE_BUFFER = Buffer.alloc(100);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("pptxToScript", () => {
  test("returns a VideoScript with scenes array", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    expect(script.scenes).toBeDefined();
    expect(script.scenes.length).toBeGreaterThan(0);
  });

  test("produces the correct number of scenes (one per slide)", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    expect(script.scenes.length).toBe(2);
  });

  test("slide 1 (has image) produces an image scene", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    expect(script.scenes[0].type).toBe("image");
  });

  test("slide 2 (text only) produces a text scene", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    expect(script.scenes[1].type).toBe("text");
  });

  test("image scene src points into assets/", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    const scene = script.scenes[0];
    if (scene.type !== "image") throw new Error("expected image");
    expect(scene.src).toMatch(/^assets\//);
  });

  test("slide text is extracted into overlays for image scenes", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    const scene = script.scenes[0];
    if (scene.type !== "image") throw new Error("expected image");
    expect(scene.overlays).toBeDefined();
    expect(scene.overlays!.length).toBeGreaterThan(0);
    expect(scene.overlays![0].text).toContain("Slide One Title");
  });

  test("text scene contains slide text content", async () => {
    const script = await pptxToScript(FAKE_BUFFER);
    const scene = script.scenes[1];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.text).toContain("Slide Two Content");
  });

  test("with cinematic:true image scenes get kenBurns", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { cinematic: true });
    const scene = script.scenes[0];
    if (scene.type !== "image") throw new Error("expected image");
    expect(scene.kenBurns).toBeDefined();
    expect(scene.kenBurns?.zoomTo).toBe(1.08);
  });

  test("with cinematic:true text scenes get textAnimation", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { cinematic: true });
    const scene = script.scenes[1];
    if (scene.type !== "text") throw new Error("expected text");
    expect(scene.textAnimation).toBeDefined();
    expect(scene.textAnimation?.entrance).toBe("fadeUp");
  });

  test("with cinematic:true all scenes get fade transition", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { cinematic: true });
    script.scenes.forEach((s) => expect(s.transition).toBe("fade"));
  });

  test("without cinematic flag, no kenBurns or textAnimation injected", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { cinematic: false });
    const imgScene = script.scenes[0];
    const txtScene = script.scenes[1];
    if (imgScene.type !== "image") throw new Error("wrong type");
    if (txtScene.type !== "text") throw new Error("wrong type");
    expect(imgScene.kenBurns).toBeUndefined();
    expect(txtScene.textAnimation).toBeUndefined();
  });

  test("respects slideDuration option", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { slideDuration: 8 });
    script.scenes.forEach((s) => expect(s.duration).toBe(8));
  });

  test("respects fps option", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { fps: 24 });
    expect(script.fps).toBe(24);
  });

  test("respects outputVideo option", async () => {
    const script = await pptxToScript(FAKE_BUFFER, {
      outputVideo: "out/ad.mp4",
    });
    expect(script.output).toBe("out/ad.mp4");
  });

  test("output script passes parseScript validation", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { cinematic: true });
    expect(() => parseScript(script)).not.toThrow();
  });

  test("cinematic flag is set in output script", async () => {
    const script = await pptxToScript(FAKE_BUFFER, { cinematic: true });
    expect(script.cinematic).toBe(true);
  });
});

describe("pptxToScript error handling", () => {
  test("throws when PizZip throws on invalid buffer", async () => {
    mock.module("pizzip", () => ({
      default: class {
        constructor() {
          throw new Error("invalid zip data");
        }
      },
    }));
    await expect(pptxToScript(FAKE_BUFFER)).rejects.toThrow("invalid zip data");
  });
});
