"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CoachAvatar } from "@/components/coach-avatar";
import { StoryCard } from "@/components/story-card";
import { MOODS, storiesForMood } from "@/lib/stories";

/**
 * "How are you feeling?" → matching stories. Pick a feeling and Leo surfaces the
 * stories whose vibe answers it (comeback stories when you've lost belief, a
 * stay-grounded story when you feel victorious).
 */
export function StoryMatcher() {
  const [moodId, setMoodId] = useState<string | null>(null);
  const mood = MOODS.find((m) => m.id === moodId) ?? null;
  const matches = moodId ? storiesForMood(moodId) : [];

  return (
    <div className="space-y-4">
      <div className="card-elevated p-5">
        <div className="flex items-center gap-3">
          <CoachAvatar mood={mood ? "happy" : "pushing"} size={48} className="shrink-0" />
          <div>
            <p className="font-display text-base font-semibold">How are you feeling right now?</p>
            <p className="text-sm text-muted-foreground">Tap it — I&apos;ll pull the story you need.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map((m) => {
            const active = m.id === moodId;
            return (
              <button
                key={m.id}
                onClick={() => setMoodId(active ? null : m.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? "grad-blue text-white shadow-md scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <span>{m.emoji}</span>
                {m.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {mood && (
            <motion.p
              key={mood.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 rounded-2xl bg-muted/50 p-3 text-sm"
            >
              <span className="font-semibold">Leo:</span> {mood.coachLine}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {mood && (
        <div className="grid gap-5 sm:grid-cols-2">
          {matches.map((story, i) => (
            <StoryCard key={story.slug} story={story} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
