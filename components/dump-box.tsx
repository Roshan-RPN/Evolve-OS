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
    <div className="card-elevated corner-cut relative flex h-full flex-col overflow-hidden p-3.5">
      <div className="relative mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <span className="grid size-7 place-items-center rounded-lg grad-blue text-white shadow-md">
            <Sparkles className="size-4" />
          </span>
          Untangle a thought
        </h2>
        {openLoops > 0 && (
          <span className="chip bg-primary/15 text-primary">
            {openLoops} open loop{openLoops === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="relative flex flex-col gap-2 pb-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What's tangling you up right now?"
          className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={submit}
          disabled={!value.trim() || pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl grad-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? "Untangling…" : "Untangle it"}
        </button>
      </div>
    </div>
  );
}
