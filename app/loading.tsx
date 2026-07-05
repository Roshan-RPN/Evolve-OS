import { Loader2 } from "lucide-react";

// Instant fallback while a route streams in. Home is force-dynamic and can take
// a beat, so this keeps navigations (e.g. closing the morning/evening wizard)
// from feeling frozen.
export default function Loading() {
  return (
    <div className="bg-app grid min-h-dvh place-items-center">
      <Loader2 className="size-7 animate-spin text-primary/70" aria-label="Loading" />
    </div>
  );
}
