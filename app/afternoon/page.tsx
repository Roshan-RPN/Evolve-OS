import { AfternoonWizard } from "./afternoon-wizard";
import { getAfternoonContext } from "@/lib/actions/afternoon";

export const dynamic = "force-dynamic";

export default async function AfternoonPage() {
  const { priorities, doneItems, planLocked } = await getAfternoonContext();
  return (
    <div className="bg-app min-h-screen">
      <AfternoonWizard priorities={priorities} doneItems={doneItems} planLocked={planLocked} />
    </div>
  );
}
