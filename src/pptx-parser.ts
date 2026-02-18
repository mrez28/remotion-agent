import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import { XMLParser } from "fast-xml-parser";
import {
  parseScript,
  type VideoScript,
  type ImageScene,
  type TextScene,
} from "./schema.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PptxParseOptions {
  fps?: number;
  slideDuration?: number;
  outputVideo?: string;
  cinematic?: boolean;
  imageDir?: string;
}

interface SlideContent {
  texts: string[];
  imageSrc: string | null;
}

// ── XML parser ────────────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["p:sldId", "Relationship", "p:sp", "p:pic", "a:p", "a:r"].includes(name),
});

function parseXml(xml: string): unknown {
  return xmlParser.parse(xml);
}

/** Recursively collect all values at a given key in an object tree. */
function collectValues(
  obj: unknown,
  key: string,
  results: string[] = [],
): string[] {
  if (obj === null || typeof obj !== "object") return results;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectValues(item, key, results));
    return results;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === key) {
      if (typeof v === "string") results.push(v);
      else if (typeof v === "number") results.push(String(v));
    }
    collectValues(v, key, results);
  }
  return results;
}

/** Read an XML file from a PizZip and parse it. PizZip API is synchronous. */
function readZipXml(zip: PizZip, zipPath: string): unknown {
  const file = zip.file(zipPath);
  if (!file) throw new Error(`Not found in PPTX: ${zipPath}`);
  const xml = file.asText();
  return parseXml(xml);
}

// ── Slide order ───────────────────────────────────────────────────────────────

function readSlideOrder(zip: PizZip): string[] {
  const pres = readZipXml(zip, "ppt/presentation.xml") as Record<
    string,
    unknown
  >;
  const rels = readZipXml(zip, "ppt/_rels/presentation.xml.rels") as Record<
    string,
    unknown
  >;

  // Build rId → slide filename map from relationships
  const rIdMap = new Map<string, string>();
  const relsList = (rels["Relationships"] as Record<string, unknown>)?.[
    "Relationship"
  ] as Array<Record<string, string>> | undefined;

  if (Array.isArray(relsList)) {
    for (const rel of relsList) {
      const id = rel["@_Id"];
      const target = rel["@_Target"] ?? "";
      const type = rel["@_Type"] ?? "";
      if (id && type.includes("slide")) {
        rIdMap.set(id, target.replace(/^\.?\//, ""));
      }
    }
  }

  // Extract ordered sldId list from presentation
  const presRoot = pres["p:presentation"] as Record<string, unknown>;
  const sldIdLst = presRoot?.["p:sldIdLst"] as
    | Record<string, unknown>
    | undefined;
  const sldIds = sldIdLst?.["p:sldId"] as
    | Array<Record<string, string>>
    | undefined;

  if (!Array.isArray(sldIds) || sldIds.length === 0) {
    throw new Error("No slides found in presentation.xml");
  }

  const slideFiles: string[] = [];
  for (const sldId of sldIds) {
    const rId = sldId["@_r:id"];
    if (!rId) continue;
    const target = rIdMap.get(rId);
    if (target) slideFiles.push(`ppt/${target}`);
  }

  return slideFiles;
}

// ── Slide content extraction ──────────────────────────────────────────────────

function extractSlideContent(zip: PizZip, slideFile: string): SlideContent {
  const slideZipFile = zip.file(slideFile);
  if (!slideZipFile) return { texts: [], imageSrc: null };

  const slideDoc = parseXml(slideZipFile.asText());

  // Collect all text runs
  const texts = collectValues(slideDoc, "a:t")
    .map((t) => t.trim())
    .filter(Boolean);

  // Resolve first image embed to a zip media path
  const embedIds = collectValues(slideDoc, "@_r:embed");
  let imageSrc: string | null = null;

  if (embedIds.length > 0) {
    const embedId = embedIds[0];
    const slideName = path.basename(slideFile);
    const slideDir = path.dirname(slideFile);
    const relsPath = `${slideDir}/_rels/${slideName}.rels`;
    const relsZipFile = zip.file(relsPath);

    if (relsZipFile) {
      const relsDoc = parseXml(relsZipFile.asText()) as Record<string, unknown>;
      const slideRelsList = (
        relsDoc["Relationships"] as Record<string, unknown>
      )?.["Relationship"] as Array<Record<string, string>> | undefined;

      if (Array.isArray(slideRelsList)) {
        for (const rel of slideRelsList) {
          if (rel["@_Id"] === embedId) {
            const target = rel["@_Target"] ?? "";
            const mediaName = path.basename(target);
            imageSrc = `ppt/media/${mediaName}`;
            break;
          }
        }
      }
    }
  }

  return { texts, imageSrc };
}

// ── Image extraction ──────────────────────────────────────────────────────────

function copyEmbeddedImage(
  zip: PizZip,
  mediaPath: string,
  imageDir: string,
  slideName: string,
): string {
  const mediaFile = zip.file(mediaPath);
  if (!mediaFile) throw new Error(`Media not found in PPTX: ${mediaPath}`);

  const uint8 = mediaFile.asUint8Array();
  const buffer = Buffer.from(uint8);
  const ext = path.extname(mediaPath) || ".png";
  const filename = `${slideName}${ext}`;
  const destPath = path.join(imageDir, filename);

  fs.mkdirSync(imageDir, { recursive: true });
  fs.writeFileSync(destPath, buffer);

  return filename;
}

// ── Cinematic defaults ────────────────────────────────────────────────────────

const DEFAULT_KEN_BURNS = {
  zoomFrom: 1.0,
  zoomTo: 1.08,
  panXFrom: 0,
  panXTo: 2,
  panYFrom: 0,
  panYTo: 1,
};

const DEFAULT_TEXT_ANIMATION = {
  entrance: "fadeUp" as const,
  durationFrames: 20,
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse a .pptx file path or raw Buffer and convert it to a VideoScript.
 */
export async function pptxToScript(
  input: string | Buffer,
  opts: PptxParseOptions = {},
): Promise<VideoScript> {
  const {
    fps = 30,
    slideDuration = 5,
    outputVideo = "out/video.mp4",
    cinematic = true,
    imageDir = "public",
  } = opts;

  const buffer = typeof input === "string" ? fs.readFileSync(input) : input;
  const zip = new PizZip(buffer);

  const slideFiles = readSlideOrder(zip);
  if (slideFiles.length === 0) throw new Error("No slides found in PPTX file");

  const scenes: Array<ImageScene | TextScene> = [];
  const transition = cinematic ? ("fade" as const) : ("none" as const);

  for (let i = 0; i < slideFiles.length; i++) {
    const slideName = `slide${i + 1}`;
    const content = extractSlideContent(zip, slideFiles[i]);
    const titleText = content.texts.join(" ").trim() || `Slide ${i + 1}`;

    if (content.imageSrc) {
      const src = copyEmbeddedImage(zip, content.imageSrc, imageDir, slideName);
      const scene: ImageScene = {
        type: "image",
        src,
        duration: slideDuration,
        transition,
        overlays: titleText
          ? [{ text: titleText, top: "85%", left: "5%", color: "#ffffff" }]
          : [],
        ...(cinematic ? { kenBurns: DEFAULT_KEN_BURNS } : {}),
      };
      scenes.push(scene);
    } else {
      const scene: TextScene = {
        type: "text",
        text: titleText,
        duration: slideDuration,
        transition,
        fontSize: 80,
        color: "#ffffff",
        background: "#0f0f1a",
        ...(cinematic ? { textAnimation: DEFAULT_TEXT_ANIMATION } : {}),
      };
      scenes.push(scene);
    }
  }

  return parseScript({
    fps,
    width: 1920,
    height: 1080,
    output: outputVideo,
    cinematic,
    scenes,
  });
}
