import fs from "fs";
import path from "path";
import { pptxToScript } from "../src/pptx-parser.ts";

async function main(): Promise<void> {
  const pptxPath = process.argv[2];
  const outJson = process.argv[3] ?? "assets/script.json";

  if (!pptxPath) {
    console.error("Usage: bun run from-pptx <file.pptx> [output.json]");
    console.error("Example: bun run from-pptx assets/deck.pptx");
    process.exit(1);
  }

  const absPath = path.resolve(pptxPath);

  if (!fs.existsSync(absPath)) {
    console.error(`Error: File not found: ${absPath}`);
    process.exit(1);
  }

  if (!absPath.toLowerCase().endsWith(".pptx")) {
    console.error("Error: File must have a .pptx extension");
    process.exit(1);
  }

  try {
    console.log(`Parsing ${path.basename(absPath)}…`);
    const script = await pptxToScript(absPath, { cinematic: true });

    const outPath = path.resolve(outJson);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(script, null, 2), "utf-8");

    console.log(`✓ ${script.scenes.length} scenes written to ${outJson}`);
    console.log(`\nNext step:`);
    console.log(`  bun run render ${outJson}`);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
