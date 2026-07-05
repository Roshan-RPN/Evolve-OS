"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Quote } from "lucide-react";
import type { Story } from "@/lib/stories";

function monogram(name: string) {
  return name
    .replace(/['']/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function StoryCard({ story, index }: { story: Story; index: number }) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="card-elevated overflow-hidden"
    >
      {/* Poster — real portrait if present, else a bold monogram */}
      <div className={`relative flex h-40 items-end overflow-hidden ${story.grad}`}>
        <div className="pointer-events-none absolute -right-6 -top-8 size-32 rounded-full bg-white/20 blur-2xl" />
        {!imgFailed && (
          <Image
            src={`/stories/${story.slug}.webp`}
            alt={story.name}
            fill
            unoptimized
            className="object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
        {imgFailed && (
          <span className="pointer-events-none absolute right-4 top-3 font-display text-6xl font-black text-white/25">
            {monogram(story.name)}
          </span>
        )}
        <div className="relative z-10 w-full bg-gradient-to-t from-black/55 to-transparent p-4 pt-10">
          <p className="text-xs font-medium text-white/80">{story.field} · {story.years}</p>
          <h3 className="font-display text-xl font-bold text-white">{story.name}</h3>
        </div>
      </div>

      <div className="p-5">
        <p className="font-display text-base font-semibold leading-snug">{story.headline}</p>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 pt-3 text-sm leading-relaxed text-muted-foreground">
                {story.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-muted/50 p-3">
          <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm font-medium">{story.lesson}</p>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {open ? "Show less" : "Read the story"}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </motion.article>
  );
}
