import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { getThoughts } from "@/lib/actions/thoughts";
import { UntangleBoard } from "./untangle-board";

export const dynamic = "force-dynamic";

export default async function UntanglePage() {
  const onboarded = await hasCompletedOnboarding();
  if (!onboarded) redirect("/onboarding");

  const thoughts = await getThoughts();

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl grad-blue text-white shadow-lg">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Untangle</h1>
            <p className="text-sm text-muted-foreground">Dump a confusion — get it untangled on the spot.</p>
          </div>
        </header>

        <UntangleBoard initial={thoughts} />
      </div>
    </AppShell>
  );
}
