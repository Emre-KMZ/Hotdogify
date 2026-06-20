import { createOpenAI } from "@ai-sdk/openai";

const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {
  // Fail loud at module load in dev so misconfig is obvious.
  console.warn("[ai] FAL_KEY is not set — model calls will fail.");
}

// fal exposes an OpenAI-compatible gateway to OpenRouter models.
// Auth is sent via the `Authorization: Key <FAL_KEY>` header, not a bearer token.
export const openrouter = createOpenAI({
  baseURL: "https://fal.run/openrouter/router/openai/v1",
  apiKey: "not-needed",
  headers: {
    Authorization: `Key ${FAL_KEY ?? ""}`,
  },
});

// Use .chat() to force the /chat/completions endpoint (not the Responses API).
export const model = (id: string) => openrouter.chat(id);
