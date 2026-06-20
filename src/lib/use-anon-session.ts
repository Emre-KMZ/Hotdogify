"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Ensures the visitor has a Supabase session, creating an anonymous one if
// needed. Requires "Allow anonymous sign-ins" enabled in the project.
export function useAnonSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        if (active) setUserId(session.user.id);
        return;
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (error) setError(error.message);
      else setUserId(data.user?.id ?? null);
    })();

    return () => {
      active = false;
    };
  }, []);

  return { userId, error };
}
