"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAnonSession } from "@/lib/use-anon-session";
import { Classifier } from "@/components/classifier";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
};

type Usage = {
  id: string;
  verdict: string;
  confidence: number;
  label: string | null;
  latency_ms: number | null;
  source: string;
  created_at: string;
};

export default function DashboardPage() {
  const { userId, error: sessionError } = useAnonSession();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [supabase] = useState(() => createClient());

  const refresh = useCallback(async () => {
    const [{ data: k }, { data: u }] = await Promise.all([
      supabase
        .from("api_keys")
        .select("id, name, prefix, revoked, last_used_at, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("classifications")
        .select("id, verdict, confidence, label, latency_ms, source, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setKeys(k ?? []);
    setUsage(u ?? []);
  }, [supabase]);

  useEffect(() => {
    // Load keys/usage once an (anonymous) session exists. setState runs after
    // the awaited query inside refresh(), not synchronously in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) refresh();
  }, [userId, refresh]);

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setNewKey(json.key);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Key revoked");
      refresh();
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  if (sessionError) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <div className="mx-auto max-w-md p-8 text-sm text-red-500">
          Could not start a session: {sessionError}. Enable “Allow anonymous sign-ins”
          in Supabase → Authentication → Providers.
        </div>
      </div>
    );
  }

  const totalToday = usage.filter(
    (u) => new Date(u.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex items-end justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Issue API keys and review your classification activity.
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {totalToday}
            </div>
            classifications today
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* API keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4" /> API Keys
              </CardTitle>
              <CardDescription>Authenticate requests to the classify API.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {newKey && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="mb-2 font-medium">Copy your key now, shown once.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                      {newKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copy(newKey)}>
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              )}

              {keys.length === 0 && !newKey && (
                <p className="text-sm text-muted-foreground">No keys yet.</p>
              )}

              <ul className="flex flex-col gap-2">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <div className="min-w-0">
                      <code className="text-xs">{k.prefix}…</code>
                      {k.revoked && (
                        <span className="ml-2 rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-600">
                          revoked
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {k.last_used_at
                          ? `last used ${new Date(k.last_used_at).toLocaleString()}`
                          : "never used"}
                      </p>
                    </div>
                    {!k.revoked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeKey(k.id)}
                        aria-label="Revoke key"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>

              <Button onClick={createKey} disabled={creating} className="mt-1">
                <Plus className="size-4" /> {creating ? "Creating…" : "Create key"}
              </Button>
            </CardContent>
          </Card>

          {/* Playground */}
          <Card>
            <CardHeader>
              <CardTitle>Playground</CardTitle>
              <CardDescription>Test the classifier with your own image.</CardDescription>
            </CardHeader>
            <CardContent>
              <Classifier endpoint="/api/playground" onResult={() => refresh()} />
            </CardContent>
          </Card>
        </div>

        {/* Usage log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Last 20 classifications across keys & playground.</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4">Verdict</th>
                      <th className="py-1 pr-4">Label</th>
                      <th className="py-1 pr-4">Confidence</th>
                      <th className="py-1 pr-4">Latency</th>
                      <th className="py-1 pr-4">Source</th>
                      <th className="py-1">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="py-1.5 pr-4">
                          {u.verdict === "hotdog" ? "🌭 hotdog" : "🚫 not hotdog"}
                        </td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{u.label ?? "—"}</td>
                        <td className="py-1.5 pr-4">{Math.round(u.confidence * 100)}%</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">
                          {u.latency_ms ?? "—"} ms
                        </td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{u.source}</td>
                        <td className="py-1.5 text-muted-foreground">
                          {new Date(u.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
