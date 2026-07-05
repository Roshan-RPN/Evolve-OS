import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManifestationBoard } from "./manifestation-board";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { getManifestationData } from "@/lib/actions/manifestation";

export const dynamic = "force-dynamic";

export default async function ManifestationPage() {
  if (!(await hasCompletedOnboarding())) redirect("/onboarding");
  const data = await getManifestationData();
  return (
    <AppShell>
      <ManifestationBoard data={data} />
    </AppShell>
  );
}
