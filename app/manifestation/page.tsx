import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManifestationBoard } from "./manifestation-board";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { getManifestationData } from "@/lib/actions/manifestation";

export const dynamic = "force-dynamic";

export default async function ManifestationPage() {
  const [onboarded, data] = await Promise.all([hasCompletedOnboarding(), getManifestationData()]);
  if (!onboarded) redirect("/onboarding");
  return (
    <AppShell>
      <ManifestationBoard data={data} />
    </AppShell>
  );
}
