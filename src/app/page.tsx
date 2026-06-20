"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, Copy, KeyRound, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAnonSession } from "@/lib/use-anon-session";
import { Classifier } from "@/components/classifier";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const VIDEO_SOURCES = [
  "https://v3b.fal.media/files/b/0a9f09da/dMfPjlMdCt2FJH1xdHBG3_output.mp4",
  "https://v3b.fal.media/files/b/0a9f0ad7/S94JE_go2HJLo60rY2UH4_output.mp4",
  "https://v3b.fal.media/files/b/0a9f0ada/Vhji1fAyecCAKfWjeqMbD_7QM7PLZ2.mp4",
];

export default function Home() {
  // Bootstrap an anonymous session so the live demo can classify immediately.
  useAnonSession();
  // Pick a random hero video on each page load.
  const [videoSrc, setVideoSrc] = useState(VIDEO_SOURCES[0]);
  useEffect(() => {
    setVideoSrc(VIDEO_SOURCES[Math.floor(Math.random() * VIDEO_SOURCES.length)]);
  }, []);
  const [origin] = useState(() =>
    typeof window === "undefined" ? "https://hotdogify.app" : window.location.origin
  );

  const curl = `curl -X POST ${origin}/api/v1/classify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"image_url": "https://example.com/lunch.jpg"}'`;

  return (
    <main className="flex flex-col">
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative flex min-h-svh flex-col overflow-hidden bg-neutral-950">
        {/* Looping background video */}
        <video
          key={videoSrc}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        {/* Legibility scrim — even top-to-bottom fade, no center vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-neutral-950" />

        {/* Marketing nav */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 text-white">
          <Link
            href="/"
            aria-label="Hotdogify home"
            className="inline-flex items-center text-2xl leading-none"
          >
            🌭
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-white text-neutral-900 hover:bg-white/90"
            )}
          >
            Dashboard
          </Link>
        </header>

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center text-white">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Tell a hotdog from{" "}
            <span className="text-white/55">not&nbsp;a&nbsp;hotdog</span>.
            <br className="hidden sm:block" /> In a single API call.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-white/70">
            Drop in an image, get an instant verdict.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href="#demo"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-white px-6 text-base text-neutral-900 hover:bg-white/90"
              )}
            >
              Try It Live
            </a>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 border-white/30 bg-white/5 px-6 text-base text-white backdrop-blur hover:bg-white/10 hover:text-white"
              )}
            >
              Get API Key
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Built by talent from */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
              Built by talent from
            </p>
            <GoogleWordmark />
          </div>
        </div>
      </section>

      {/* ─────────────────── Feature strip ─────────────────── */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-px overflow-hidden px-6 py-12 sm:grid-cols-3 sm:gap-8">
          <Feature
            icon={<Zap className="size-5" />}
            title="Sub-second verdicts"
            body="Vision inference returns in milliseconds, with latency reported on every response."
          />
          <Feature
            icon={<Code2 className="size-5" />}
            title="One REST endpoint"
            body="A single authenticated POST. No SDK to learn, no infrastructure to run."
          />
          <Feature
            icon={<KeyRound className="size-5" />}
            title="Metered API keys"
            body="Issue, rotate, and revoke keys from the dashboard. Every call is logged."
          />
        </div>
      </section>

      {/* ─────────────────── Live demo + API ─────────────────── */}
      <section
        id="demo"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Drag in a photo, no signup required.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Try it live</CardTitle>
              <CardDescription>Drop a photo, get a verdict.</CardDescription>
            </CardHeader>
            <CardContent>
              <Classifier endpoint="/api/playground" />
            </CardContent>
          </Card>

          <Card id="api" className="flex scroll-mt-20 flex-col">
            <CardHeader>
              <CardTitle>…the same thing, as an API</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="overflow-hidden rounded-xl border bg-neutral-950">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-yellow-500/70" />
                  <span className="size-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-xs text-white/40">
                    POST /api/v1/classify
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto text-white/60 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(curl);
                      toast.success("Copied curl");
                    }}
                    aria-label="Copy curl command"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-neutral-100">
                  <code suppressHydrationWarning>{curl}</code>
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                Returns{" "}
                <code className="rounded bg-muted px-1">
                  {`{ verdict, is_hotdog, confidence, label, latency_ms }`}
                </code>
              </p>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}
              >
                Create a key in the dashboard
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─────────────────────── Footer ─────────────────────── */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <span>🌭</span> Hotdogify
          </span>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex size-9 items-center justify-center rounded-lg border bg-background text-foreground">
        {icon}
      </div>
      <h3 className="mt-1 font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// Four-color Google "G" + wordmark, shown grayscale for the enterprise
// "built by talent from" strip; colorizes on hover.
function GoogleWordmark() {
  return (
    <div className="flex items-center gap-2 opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
      <svg viewBox="0 0 48 48" className="size-6" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span className="text-xl font-medium tracking-tight text-white">Google</span>
    </div>
  );
}
