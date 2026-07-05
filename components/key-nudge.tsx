"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, X } from "lucide-react";
import { CoachAvatar, COACH_NAME } from "@/components/coach-avatar";

// Shown once, on the first visit to home without a Gemini key saved.
// Dismissing (either button) writes the flag so it never comes back.
const STORAGE_KEY = "leo-key-nudge-done";

export function KeyNudge({ hasKey }: { hasKey: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hasKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a persisted flag
    setShow(localStorage.getItem(STORAGE_KEY) !== "1");
  }, [hasKey]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="card-tint tint-blue corner-cut relative overflow-hidden p-3.5 lg:p-4"
        >
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="relative flex items-start gap-3 lg:items-center">
            <CoachAvatar mood="happy" size={48} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {COACH_NAME}: Want me at full power?
              </p>
              <p className="mt-0.5 pr-6 text-xs leading-relaxed text-muted-foreground">
                Add your free Gemini API key and I can plan with you, untangle your thoughts and coach
                you for real. Takes two minutes — there&apos;s a step-by-step guide on the profile page.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <Link
                  href="/profile"
                  onClick={dismiss}
                  className="inline-flex items-center gap-1.5 rounded-full grad-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <KeyRound className="size-3.5" /> Add my key
                </Link>
                <button
                  onClick={dismiss}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
