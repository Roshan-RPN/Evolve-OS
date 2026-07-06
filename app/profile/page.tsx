import Link from "next/link";
import { UserRound, LogOut, ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProfileForm, GeminiKeyForm, ModelForm } from "./profile-form";
import { getAppUser } from "@/lib/actions/profile";
import { APP_NAME, COACH_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getAppUser();
  const name = user?.name ?? "You";
  const email = user?.email ?? "";
  const avatar = user?.avatar ?? "";
  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const monogram = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-3.5 lg:space-y-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center corner-cut grad-blue text-white shadow-md lg:size-11">
            <UserRound className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold lg:text-2xl">Profile</h1>
            <p className="text-sm text-muted-foreground">Your account on {APP_NAME}.</p>
          </div>
        </div>

        {/* Identity bar — who's signed in */}
        <section className="card-tint tint-blue corner-cut flex items-center gap-4 p-4 lg:p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-3xl avatar-pro font-display text-xl font-bold text-white">
            {avatar ? <span className="text-3xl leading-none">{avatar}</span> : monogram || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email || "No email added yet"}</p>
            {since && <p className="mt-0.5 text-xs text-muted-foreground/80">Member since {since}</p>}
          </div>
        </section>

        {/* Edit details */}
        <section className="card-elevated p-4 lg:p-5">
          <h2 className="mb-1 font-display text-base font-semibold">Account details</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Your name shows up across the app; email is just for your records.
          </p>
          <ProfileForm name={name} email={email} avatar={avatar} monogram={monogram} />
        </section>

        {/* Leo's brain — this profile's own Gemini key */}
        <section className="card-elevated p-4 lg:p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <Sparkles className="size-4 text-primary" /> {COACH_NAME}&apos;s brain — your Gemini key
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Every profile can plug in its own free Google Gemini API key, so {COACH_NAME}&apos;s
            coaching runs on your quota, private to this profile.
          </p>
          <GeminiKeyForm hasKey={user?.hasGeminiKey ?? false} />

          <div className="mt-5 border-t border-border/60 pt-4">
            <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold">
              Which model {COACH_NAME} thinks with
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Pick the Gemini model for your coaching. Bigger = deeper, but slower and heavier on
              your quota.
            </p>
            <ModelForm current={user?.geminiModel ?? ""} />
          </div>
        </section>

        {/* Questionnaire */}
        <Link
          href="/onboarding"
          className="group card-elevated flex items-center gap-3.5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg lg:p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl grad-violet text-white shadow-md">
            <ClipboardList className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold">Your questionnaire</p>
            <p className="text-xs text-muted-foreground">
              Review or redo the answers Leo uses to coach you.
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </Link>

        {/* Sign out */}
        <section className="card-elevated flex items-center justify-between gap-3 p-4 lg:p-5">
          <div>
            <p className="font-display text-base font-semibold">Switch profile</p>
            <p className="text-xs text-muted-foreground">Sign out and go back to the profile picker.</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
