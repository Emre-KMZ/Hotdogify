import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Smoke-test endpoint: confirms env wiring + Supabase connectivity.
export async function GET() {
  const checks: Record<string, unknown> = {
    fal_key: Boolean(process.env.FAL_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  try {
    const supabase = await createClient();
    // Lightweight call that works even before any tables exist.
    const { error } = await supabase.auth.getSession();
    checks.supabase_reachable = !error;
  } catch (e) {
    checks.supabase_reachable = false;
    checks.supabase_error = (e as Error).message;
  }

  return NextResponse.json({ ok: true, checks });
}
