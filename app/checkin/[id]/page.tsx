import { notFound } from "next/navigation";
import { getCheckin } from "@/lib/actions/checkins";
import { CheckinCard } from "./checkin-card";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checkin = await getCheckin(id);
  if (!checkin) notFound();

  return <CheckinCard checkin={checkin} />;
}
