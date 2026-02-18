# remotion-agent

A CLI tool that renders MP4 videos from a JSON script using [Remotion](https://www.remotion.dev/) and TypeScript.

## Usage

```bash
# Preview composition in browser (Remotion Studio)
bun run preview

# Render to MP4
bun run render scripts/sample.json
```

Produces `out/video.mp4`.

## Script Format

```json
{
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "output": "out/video.mp4",
  "scenes": [
    { "type": "text", "text": "Hello", "duration": 3, "transition": "fade" },
    { "type": "image", "src": "./assets/photo.jpg", "duration": 5,
      "overlays": [{ "text": "Caption", "top": "85%", "left": "10%" }] },
    { "type": "video", "src": "./assets/clip.mp4", "duration": 10 }
  ]
}
```

### Top-level fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fps` | number | `30` | Frames per second |
| `width` | number | `1920` | Video width in pixels |
| `height` | number | `1080` | Video height in pixels |
| `output` | string | `"out/video.mp4"` | Output file path |
| `scenes` | array | — | List of scenes (required) |

### Scene types

**text**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | — | Text to display |
| `duration` | number | — | Duration in seconds |
| `transition` | `"fade"` \| `"none"` | `"none"` | Transition to next scene |
| `fontSize` | number | `80` | Font size in pixels |
| `color` | string | `"#ffffff"` | Text color |
| `background` | string | `"#000000"` | Background color |

**image**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `src` | string | — | Path to image file |
| `duration` | number | — | Duration in seconds |
| `transition` | `"fade"` \| `"none"` | `"none"` | Transition to next scene |
| `overlays` | array | — | Optional text overlays |

Each overlay: `{ text, top, left, fontSize?, color? }`

**video**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `src` | string | — | Path to video file |
| `duration` | number | — | Duration in seconds |
| `transition` | `"fade"` \| `"none"` | `"none"` | Transition to next scene |
| `volume` | number | `1` | Volume (0–1) |

## Setup

```bash
bun install
```

Place image/video assets in the `assets/` directory.

## Testing

```bash
bun test
```

33 tests across schema validation, React components, and the render pipeline.

## Project Structure

```
src/
├── schema.ts        # Zod types, parseScript(), totalDurationInFrames()
├── cli.ts           # Entry point
├── renderer.ts      # bundle → selectComposition → renderMedia
├── composition.ts   # registerRoot() + calculateMetadata
├── video.tsx        # TransitionSeries composition
├── scenes.tsx       # TextScene, ImageScene, VideoScene components
└── __tests__/       # Test suite
scripts/
└── sample.json      # Demo script
```
