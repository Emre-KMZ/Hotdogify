import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/apikey";

// Create a new API key for the current (anonymous or real) user.
// Returns the plaintext key exactly once — only its hash is stored.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let name = "default";
  try {
    const body = (await req.json()) as { name?: string };
    if (body?.name?.trim()) name = body.name.trim().slice(0, 40);
  } catch {
    // no body — use default name
  }

  const { key, hash, prefix } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, name, prefix, key_hash: hash })
    .select("id, name, prefix, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ...data, key }); // `key` plaintext shown once
}
