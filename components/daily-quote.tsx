"use client";

import { motion } from "motion/react";
import { Quote as QuoteIcon } from "lucide-react";
import type { Quote } from "@/lib/quotes";

/** Daily positive line, shown with a soft draw-in — a fresh card, not a toast. */
export function DailyQuote({ quote }: { quote: Quote }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="card-tint tint-teal corner-alt relative flex h-full items-center overflow-hidden p-3.5 text-left lg:justify-center lg:p-4 lg:text-center"
    >
      <div className="pointer-events-none absolute -right-6 -top-8 opacity-10">
        <QuoteIcon className="size-20 lg:size-32" />
      </div>
      <div className="relative w-full">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 lg:text-[11px]">
          Today&apos;s line
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mt-1 font-display text-sm font-semibold leading-snug lg:mt-2 lg:text-base"
        >
          &ldquo;{quote.text}&rdquo;
        </motion.p>
        <p className="mt-1 text-xs text-muted-foreground lg:mt-2 lg:text-sm">— {quote.author}</p>
      </div>
    </motion.div>
  );
}
