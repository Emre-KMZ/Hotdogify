import { createClient } from "@/lib/supabase/server";
import { classifyImage, verdictResponse } from "@/lib/classify";

export const maxDuration = 60;

// Session-based classify for the dashboard playground and landing demo.
// Uses the user's session (cookies) — no API key required.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let image: string | undefined;
  try {
    const body = (await req.json()) as { image?: string };
    image = body.image;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!image) return Response.json({ error: "Missing 'image'." }, { status: 400 });

  const started = Date.now();
  let result;
  try {
    result = await classifyImage(image);
  } catch {
    return Response.json({ error: "Classification failed." }, { status: 502 });
  }
  const latency = Date.now() - started;

  const { data: inserted } = await supabase
    .from("classifications")
    .insert({
      user_id: user.id,
      verdict: result.verdict,
      confidence: result.confidence,
      label: result.label,
      latency_ms: latency,
      source: "playground",
    })
    .select("id")
    .single();

  return Response.json({ id: inserted?.id, ...verdictResponse(result, latency) });
}
