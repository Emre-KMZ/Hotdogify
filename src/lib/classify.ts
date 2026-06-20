import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";

// Vision-capable model behind the fal → OpenRouter gateway. Cheap + fast and
// plenty for a binary image verdict.
const VISION_MODEL = "google/gemini-2.5-flash";

const verdictSchema = z.object({
  verdict: z.enum(["hotdog", "not_hotdog"]),
  confidence: z.number().min(0).max(1),
  label: z
    .string()
    .describe("Short guess at what the image actually shows, e.g. 'pizza'"),
});

type Verdict = z.infer<typeof verdictSchema>;

const PROMPT =
  "You are a hotdog image classifier. Look at the image and decide: is this a " +
  "hotdog, or not a hotdog? Be strict — only a true hotdog (sausage in a bun) " +
  "counts as 'hotdog'. Report your confidence 0..1 and a short label for what " +
  "the image actually shows.";

/**
 * Classify an image as hotdog / not_hotdog.
 * @param image a data URL (data:image/...;base64,...) or a public image URL.
 */
export async function classifyImage(image: string): Promise<Verdict> {
  const { object } = await generateObject({
    model: model(VISION_MODEL),
    schema: verdictSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image", image },
        ],
      },
    ],
  });
  return object;
}

/**
 * Shape a classification result into the public API response body. Shared by the
 * playground and v1 routes so the contract (incl. `is_hotdog`) lives in one place.
 */
export function verdictResponse(result: Verdict, latency_ms: number) {
  return {
    verdict: result.verdict,
    is_hotdog: result.verdict === "hotdog",
    confidence: result.confidence,
    label: result.label,
    latency_ms,
  };
}
