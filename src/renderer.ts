import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import type { VideoScript } from "./schema.ts";

const COMPOSITION_ID = "VideoAgent";

// Entry point for the Remotion bundle (composition registry).
const ENTRY = new URL("./composition.ts", import.meta.url).pathname;

/**
 * Bundle the Remotion project, select the composition with inputProps,
 * then render to MP4.
 */
export async function renderVideo(script: VideoScript): Promise<void> {
  console.log("Bundling…");
  const bundleLocation = await bundle(ENTRY, (progress) => {
    process.stdout.write(`\rBundle progress: ${progress}%`);
  });
  process.stdout.write("\n");

  console.log("Selecting composition…");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: COMPOSITION_ID,
    inputProps: script,
  });

  // Ensure output directory exists.
  const outputDir = path.dirname(script.output);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Rendering to ${script.output}…`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: script.output,
    inputProps: script,
    onProgress: ({ renderedFrames, totalFrames }) => {
      const pct =
        totalFrames > 0 ? Math.round((renderedFrames / totalFrames) * 100) : 0;
      process.stdout.write(
        `\rRender progress: ${pct}% (${renderedFrames}/${totalFrames} frames)`,
      );
    },
  });
  process.stdout.write("\n");

  console.log(`Done! Video saved to ${script.output}`);
}
