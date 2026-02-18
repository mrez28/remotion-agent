import { z } from "zod";

// ── Overlay ──────────────────────────────────────────────────────────────────

const OverlaySchema = z.object({
  text: z.string(),
  fontSize: z.number().positive().optional(),
  color: z.string().optional().default("#ffffff"),
  top: z.string().optional().default("85%"),
  left: z.string().optional().default("10%"),
});

export type Overlay = z.infer<typeof OverlaySchema>;

// ── Transitions ───────────────────────────────────────────────────────────────

const TransitionSchema = z.enum(["fade", "slide", "wipe", "none"]).default("none");

// ── Ken Burns ─────────────────────────────────────────────────────────────────

const KenBurnsSchema = z.object({
  zoomFrom: z.number().positive().default(1.0),
  zoomTo:   z.number().positive().default(1.08),
  panXFrom: z.number().default(0),
  panXTo:   z.number().default(2),
  panYFrom: z.number().default(0),
  panYTo:   z.number().default(1),
});

export type KenBurns = z.infer<typeof KenBurnsSchema>;

// ── Text Animation ────────────────────────────────────────────────────────────

const TextAnimationSchema = z.object({
  entrance: z.enum(["fadeUp", "scaleIn", "none"]).default("fadeUp"),
  durationFrames: z.number().positive().default(20),
});

export type TextAnimation = z.infer<typeof TextAnimationSchema>;

// ── Scenes ────────────────────────────────────────────────────────────────────

const BaseSceneSchema = z.object({
  duration: z.number().positive(),
  transition: TransitionSchema,
});

const TextSceneSchema = BaseSceneSchema.extend({
  type: z.literal("text"),
  text: z.string().min(1),
  fontSize: z.number().positive().optional().default(80),
  color: z.string().optional().default("#ffffff"),
  background: z.string().optional().default("#000000"),
  textAnimation: TextAnimationSchema.optional(),
});

const ImageSceneSchema = BaseSceneSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1),
  overlays: z.array(OverlaySchema).optional(),
  kenBurns: KenBurnsSchema.optional(),
});

const VideoSceneSchema = BaseSceneSchema.extend({
  type: z.literal("video"),
  src: z.string().min(1),
  volume: z.number().min(0).max(1).optional().default(1),
});

const SceneSchema = z.discriminatedUnion("type", [
  TextSceneSchema,
  ImageSceneSchema,
  VideoSceneSchema,
]);

export type TextScene = z.infer<typeof TextSceneSchema>;
export type ImageScene = z.infer<typeof ImageSceneSchema>;
export type VideoScene = z.infer<typeof VideoSceneSchema>;
export type Scene = z.infer<typeof SceneSchema>;

// ── Script ────────────────────────────────────────────────────────────────────

const ScriptSchema = z.object({
  fps: z.number().positive().default(30),
  width: z.number().positive().default(1920),
  height: z.number().positive().default(1080),
  output: z.string().default("out/video.mp4"),
  cinematic: z.boolean().optional().default(false),
  scenes: z.array(SceneSchema).min(1),
});

export type VideoScript = z.infer<typeof ScriptSchema>;

/**
 * Parse and validate raw JSON input, applying defaults.
 * Throws ZodError on invalid input.
 */
export function parseScript(raw: unknown): VideoScript {
  return ScriptSchema.parse(raw);
}

/**
 * Compute total render duration in frames from a validated script.
 */
export function totalDurationInFrames(script: VideoScript): number {
  const totalSeconds = script.scenes.reduce((sum, s) => sum + s.duration, 0);
  return Math.round(totalSeconds * script.fps);
}
