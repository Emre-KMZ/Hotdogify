"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Report = {
  id: string;
  verdict: string;
  confidence: number;
  label: string | null;
  source: string;
  created_at: string;
  reported_at: string | null;
};

type Metrics = {
  total: number;
  today: number;
  last7: number;
  hotdog: number;
  not_hotdog: number;
  from_api: number;
  from_playground: number;
  reported: number;
  avg_confidence: number;
  avg_latency_ms: number;
  total_keys: number;
  active_keys: number;
  visitors: number;
  daily: { day: string; count: number }[];
  recent_reports: Report[];
};

export default function AdminPage() {
  const [supabase] = useState(() => createClient());
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("admin_metrics");
      if (!active) return;
      if (error) setError(error.message);
      else setMetrics(data as Metrics);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Admin · metrics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Service-wide classification activity across all users.
          </p>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading metrics…</p>}

        {error && (
          <p className="text-sm text-red-500">
            Could not load metrics: {error}. Make sure migration{" "}
            <code>0003_feedback_admin.sql</code> has been applied.
          </p>
        )}

        {metrics && <MetricsView metrics={metrics} />}
      </div>
    </div>
  );
}

function MetricsView({ metrics: m }: { metrics: Metrics }) {
  const reportRate = m.total ? (m.reported / m.total) * 100 : 0;
  const maxDaily = Math.max(1, ...m.daily.map((d) => d.count));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total classified" value={m.total.toLocaleString()} />
        <Stat label="Today" value={m.today.toLocaleString()} />
        <Stat label="Last 7 days" value={m.last7.toLocaleString()} />
        <Stat label="Visitors" value={m.visitors.toLocaleString()} />
        <Stat label="Active keys" value={`${m.active_keys}/${m.total_keys}`} />
        <Stat
          label="Reported wrong"
          value={m.reported.toLocaleString()}
          sub={`${reportRate.toFixed(1)}% of all`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verdict split</CardTitle>
            <CardDescription>What the model decided.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Split
              left={{ label: "🌭 hotdog", value: m.hotdog, className: "bg-green-500" }}
              right={{ label: "🚫 not hotdog", value: m.not_hotdog, className: "bg-red-500" }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic source</CardTitle>
            <CardDescription>Where classifications came from.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Split
              left={{ label: "API", value: m.from_api, className: "bg-blue-500" }}
              right={{ label: "Playground", value: m.from_playground, className: "bg-violet-500" }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Avg confidence"
          value={`${Math.round(m.avg_confidence * 100)}%`}
        />
        <Stat label="Avg latency" value={`${Math.round(m.avg_latency_ms)} ms`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily volume</CardTitle>
          <CardDescription>Classifications per day, last 14 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {m.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="flex items-end gap-1">
              {m.daily.map((d) => (
                <div
                  key={d.day}
                  className="group/bar flex flex-1 flex-col items-center gap-1"
                  title={`${d.day}: ${d.count}`}
                >
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover/bar:opacity-100">
                    {d.count}
                  </span>
                  <div className="flex h-32 w-full items-end">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${(d.count / maxDaily) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(d.day).getDate()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reported wrong answers</CardTitle>
          <CardDescription>
            Verdicts users flagged as incorrect, candidates to review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {m.recent_reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-4">Verdict</th>
                    <th className="py-1 pr-4">Label</th>
                    <th className="py-1 pr-4">Confidence</th>
                    <th className="py-1 pr-4">Source</th>
                    <th className="py-1">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recent_reports.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-1.5 pr-4">
                        {r.verdict === "hotdog" ? "🌭 hotdog" : "🚫 not hotdog"}
                      </td>
                      <td className="py-1.5 pr-4 text-muted-foreground">{r.label ?? "—"}</td>
                      <td className="py-1.5 pr-4">{Math.round(r.confidence * 100)}%</td>
                      <td className="py-1.5 pr-4 text-muted-foreground">{r.source}</td>
                      <td className="py-1.5 text-muted-foreground">
                        {r.reported_at
                          ? new Date(r.reported_at).toLocaleString()
                          : new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function Split({
  left,
  right,
}: {
  left: { label: string; value: number; className: string };
  right: { label: string; value: number; className: string };
}) {
  const total = left.value + right.value;
  const leftPct = total ? (left.value / total) * 100 : 0;
  return (
    <>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className={left.className} style={{ width: `${leftPct}%` }} />
        <div className={right.className} style={{ width: `${100 - leftPct}%` }} />
      </div>
      <div className="flex justify-between text-sm">
        <span>
          {left.label}{" "}
          <span className="text-muted-foreground">
            {left.value} ({Math.round(leftPct)}%)
          </span>
        </span>
        <span>
          {right.label}{" "}
          <span className="text-muted-foreground">
            {right.value} ({Math.round(100 - leftPct)}%)
          </span>
        </span>
      </div>
    </>
  );
}
