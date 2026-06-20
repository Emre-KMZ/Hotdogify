"use client";

import { useCallback, useRef, useState } from "react";
import { Flag, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Result = {
  id?: string;
  verdict: "hotdog" | "not_hotdog";
  is_hotdog: boolean;
  confidence: number;
  label: string;
  latency_ms: number;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Classifier({
  endpoint = "/api/playground",
  onResult,
}: {
  endpoint?: string;
  onResult?: (r: Result) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() => createClient());

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please drop an image file.");
        return;
      }
      setError(null);
      setResult(null);
      setReported(false);
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      setBusy(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setResult(json);
        onResult?.(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [endpoint, onResult]
  );

  async function report() {
    if (!result?.id || reporting) return;
    setReporting(true);
    const { error } = await supabase.rpc("report_classification", {
      p_id: result.id,
    });
    setReporting(false);
    if (error) {
      toast.error("Could not submit report. Try again.");
      return;
    }
    setReported(true);
    toast.success("Thanks, we’ll review this.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          preview && "border-solid"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="h-full w-full object-contain" />
        ) : (
          <>
            <UploadCloud className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop a photo here, or click to upload
            </p>
          </>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && <Verdict result={result} />}

      {result?.id && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {reported ? (
            <span>Thanks for the feedback, flagged for review. 🙏</span>
          ) : (
            <>
              <span>Wrong verdict?</span>
              <Button size="xs" variant="ghost" disabled={reporting} onClick={report}>
                <Flag className="size-3" />
                {reporting ? "Reporting…" : "Report wrong answer"}
              </Button>
            </>
          )}
        </div>
      )}

      {preview && (
        <Button
          variant="outline"
          onClick={() => {
            setPreview(null);
            setResult(null);
            setError(null);
            setReported(false);
          }}
        >
          Try another
        </Button>
      )}
    </div>
  );
}

function Verdict({ result }: { result: Result }) {
  const pct = Math.round(result.confidence * 100);
  const hot = result.is_hotdog;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        hot ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className={cn("text-2xl font-bold", hot ? "text-green-600" : "text-red-600")}>
          {hot ? "🌭 Hotdog" : "🚫 Not hotdog"}
        </p>
        <span className="text-sm text-muted-foreground">{result.latency_ms} ms</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Looks like: <span className="font-medium text-foreground">{result.label}</span>
      </p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>confidence</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", hot ? "bg-green-500" : "bg-red-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
