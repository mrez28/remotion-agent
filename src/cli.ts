import fs from "fs";
import path from "path";
import { parseScript } from "./schema.ts";
import { renderVideo } from "./renderer.ts";

async function main(): Promise<void> {
  const scriptPath = process.argv[2];

  if (!scriptPath) {
    console.error("Usage: bun run render <script.json>");
    process.exit(1);
  }

  const absolutePath = path.resolve(scriptPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Script file not found: ${absolutePath}`);
    process.exit(1);
  }

  let raw: unknown;
  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    raw = JSON.parse(content);
  } catch (err) {
    console.error(`Error: Failed to read or parse JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  let script;
  try {
    script = parseScript(raw);
  } catch (err) {
    console.error(`Error: Invalid script schema:\n${(err as Error).message}`);
    process.exit(1);
  }

  try {
    await renderVideo(script);
  } catch (err) {
    console.error(`Error: Render failed:\n${(err as Error).message}`);
    process.exit(1);
  }
}

main();
