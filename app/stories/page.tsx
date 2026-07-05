import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StoryCard } from "@/components/story-card";
import { StoryMatcher } from "@/components/story-matcher";
import { Reveal } from "@/components/motion/reveal";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { STORIES } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const onboarded = await hasCompletedOnboarding();
  if (!onboarded) redirect("/onboarding");

  return (
    <AppShell>
      <Reveal className="space-y-3.5 lg:space-y-5" stagger={0.05}>
        <div className="card-tint tint-violet corner-cut relative overflow-hidden p-4 lg:p-6">
          <div className="relative flex items-center gap-3 lg:gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl grad-violet text-white shadow-md lg:size-12">
              <BookOpen className="size-5 lg:size-6" />
            </span>
            <div>
              <h1 className="font-display text-lg font-semibold lg:text-2xl">Willpower, proven</h1>
              <p className="hidden max-w-lg text-sm text-muted-foreground lg:block">
                Real people who actually did it — how they pushed through, in their own facts. Read one
                when the day feels heavy.
              </p>
              <p className="text-xs text-muted-foreground lg:hidden">
                Real people who pushed through — read one when the day feels heavy.
              </p>
            </div>
          </div>
        </div>

        {/* Feeling → matching story */}
        <StoryMatcher />

        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">All stories</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:gap-5">
            {STORIES.map((story, i) => (
              <StoryCard key={story.slug} story={story} index={i} />
            ))}
          </div>
        </div>
      </Reveal>
    </AppShell>
  );
}
