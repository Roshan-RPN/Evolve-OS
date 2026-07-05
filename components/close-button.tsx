"use client";

import Link, { useLinkStatus } from "next/link";
import { X, Loader2 } from "lucide-react";

// The X on the morning/evening wizards goes home. Home is force-dynamic and can
// take 1–2s to stream in, and the App Router keeps the old URL until it's ready —
// so without feedback the click feels dead. useLinkStatus swaps the X for a
// spinner the instant it's pending; app/loading.tsx covers the rest of the wait.
function CloseIcon() {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="size-[18px] animate-spin" />
  ) : (
    <X className="size-[18px]" />
  );
}

export function CloseButton({ inline = false }: { inline?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Close and go home"
      className={`z-10 grid size-9 shrink-0 place-items-center rounded-full border border-border/60 bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground ${
        inline ? "" : "absolute right-5 top-5"
      }`}
    >
      <CloseIcon />
    </Link>
  );
}
