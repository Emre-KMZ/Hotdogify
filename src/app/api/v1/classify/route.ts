import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/apikey";
import { classifyImage, verdictResponse } from "@/lib/classify";

export const maxDuration = 60;

// Free-tier quota: classifications per API key per day.
const DAILY_LIMIT = 100;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function bearer(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim();
}

export async function POST(req: Request) {
  const key = bearer(req);
  if (!key) {
    return json({ error: "Missing 'Authorization: Bearer <api_key>'." }, 401);
  }

  const supabase = await createClient();

  // Verify key + read today's usage via a SECURITY DEFINER RPC (no session).
  const { data: auth, error: authErr } = await supabase
    .rpc("api_authorize", { p_key_hash: hashApiKey(key) })
    .maybeSingle<{ api_key_id: string; user_id: string; used_today: number }>();

  if (authErr) return json({ error: "Auth check failed." }, 500);
  if (!auth) return json({ error: "Invalid or revoked API key." }, 401);

  if (auth.used_today >= DAILY_LIMIT) {
    return json(
      { error: `Daily quota of ${DAILY_LIMIT} reached.`, used_today: auth.used_today },
      429
    );
  }

  // Accept either { image_url } or multipart form-data with an "image" file.
  let image: string | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { image_url?: string; image?: string };
      image = body.image_url ?? body.image;
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image");
      if (file instanceof File) {
        const buf = Buffer.from(await file.arrayBuffer());
        image = `data:${file.type};base64,${buf.toString("base64")}`;
      }
    }
  } catch {
    return json({ error: "Could not parse request body." }, 400);
  }

  if (!image) {
    return json(
      { error: "Provide an image via JSON {image_url} or multipart 'image' file." },
      400
    );
  }

  const started = Date.now();
  let result;
  try {
    result = await classifyImage(image);
  } catch (e) {
    console.error("[classify] failed:", e);
    return json({ error: "Classification failed." }, 502);
  }
  const latency = Date.now() - started;

  // Best-effort usage logging; runs after the response so it never adds latency.
  after(() =>
    supabase.rpc("api_log", {
      p_api_key_id: auth.api_key_id,
      p_user_id: auth.user_id,
      p_verdict: result.verdict,
      p_confidence: result.confidence,
      p_label: result.label,
      p_latency_ms: latency,
    })
  );

  return json({
    ...verdictResponse(result, latency),
    quota: { used_today: auth.used_today + 1, limit: DAILY_LIMIT },
  });
}
