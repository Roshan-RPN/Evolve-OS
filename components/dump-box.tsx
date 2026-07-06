"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { dumpThought } from "@/lib/actions/thoughts";

/** Compact dump box for the home hub — posts a confusion, then opens /untangle to read the untangle. */
export function DumpBox({ openLoops = 0 }: { openLoops?: number }) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    const content = value.trim();
    if (!content || pending) return;
    setPending(true);
    try {
      await dumpThought(content, "confusion");
      setValue("");
      router.push("/untangle");
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="card-elevated corner-cut relative flex h-full flex-col items-center justify-center overflow-hidden p-4 text-center">
      {openLoops > 0 && (
        <span className="chip absolute right-3 top-3 bg-primary/15 text-primary">
          {openLoops} open loop{openLoops === 1 ? "" : "s"}
        </span>
      )}
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Sparkles className="size-5" />
      </span>
      <h2 className="mt-3 font-display text-base font-semibold">Untangle a thought</h2>
      <p className="mt-1 text-xs text-muted-foreground">Name what&apos;s tangling you — Leo untangles it.</p>
      <div className="mt-3.5 flex w-full flex-col gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What's on your mind?"
          className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2.5 text-center text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={submit}
          disabled={!value.trim() || pending}
          className="btn-solid-emerald inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? "Untangling…" : "Untangle it"}
        </button>
      </div>
    </div>
  );
}
