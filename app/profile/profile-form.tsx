"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, HelpCircle, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAppUser, updateGeminiKey } from "@/lib/actions/profile";

/** Preset avatars — people first, then animals and symbols. Pick one, or stay with the monogram. */
export const AVATARS = [
  // People
  "🧑", "👨", "👩", "🧔", "👱‍♂️", "👱‍♀️", "👨‍💻", "👩‍💻", "🕵️‍♂️", "🦸‍♂️", "🦸‍♀️", "🥷",
  "🧗‍♂️", "🏃‍♀️", "🏋️‍♂️", "🧘‍♀️",
  // Animals
  "🦁", "🐯", "🦅", "🐺", "🦊", "🐼", "🐘", "🦉", "🐢", "🦈",
  // Symbols
  "🔥", "⚡", "🌊", "🌿", "🏔️", "🌙", "🎯", "🚀",
];

export function ProfileForm({
  name: initialName,
  email: initialEmail,
  avatar: initialAvatar,
  monogram,
}: {
  name: string;
  email: string;
  avatar: string;
  monogram: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateAppUser({ name, email, avatar });
      if (res.ok) {
        setSaved(true);
        // Re-render the server bits (identity bar avatar) with the new value.
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Profile picture</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setAvatar(""); setSaved(false); }}
            aria-label="Use your initials"
            className={`grid size-11 place-items-center rounded-2xl font-display text-sm font-bold transition-all ${
              !avatar
                ? "grad-blue text-white shadow-md ring-2 ring-primary/40 ring-offset-2 ring-offset-card"
                : "border border-border/60 bg-muted/50 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {monogram || "?"}
          </button>
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAvatar(a); setSaved(false); }}
              aria-label={`Use ${a} as avatar`}
              className={`grid size-11 place-items-center rounded-2xl text-xl transition-all ${
                avatar === a
                  ? "bg-primary/10 shadow-md ring-2 ring-primary/40 ring-offset-2 ring-offset-card"
                  : "border border-border/60 bg-muted/40 hover:border-primary/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pick an avatar, or the first tile to use your initials.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          maxLength={40}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="Your name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          placeholder="you@example.com"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-2 rounded-2xl grad-blue px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald">
            <CheckCircle2 className="size-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

/** Per-profile Gemini key — Leo answers with THIS profile's own free Google AI quota. */
export function GeminiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [key, setKey] = useState("");
  const [stored, setStored] = useState(hasKey);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: string) {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateGeminiKey(next);
      if (res.ok) {
        setStored(Boolean(next.trim()));
        setKey("");
        setSaved(true);
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {stored ? (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald">
          <CheckCircle2 className="size-3.5" /> Your key is saved — Leo runs on your own quota.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No key yet — Leo currently uses the app&apos;s shared key (if one is set). Add your own so
          your usage never eats anyone else&apos;s quota.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setSaved(false); }}
          placeholder={stored ? "Paste a new key to replace it" : "AIza…"}
          autoComplete="off"
        />
        <button
          onClick={() => save(key)}
          disabled={pending || !key.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl grad-blue px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Save
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald">
          <CheckCircle2 className="size-4" /> Saved
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowGuide((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <HelpCircle className="size-3.5" /> {showGuide ? "Hide the guide" : "How do I get a key? (free)"}
        </button>
        {stored && (
          <button
            onClick={() => save("")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive/80 transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" /> Remove my key
          </button>
        )}
      </div>

      {showGuide && (
        <ol className="list-decimal space-y-2 rounded-2xl bg-muted/50 p-4 pl-8 text-sm leading-relaxed">
          <li>
            Open{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              aistudio.google.com/apikey <ExternalLink className="size-3" />
            </a>{" "}
            in a new tab.
          </li>
          <li>Sign in with your own Google account (the free tier is enough — no card needed).</li>
          <li>
            Click <strong>Create API key</strong>. If it asks for a project, pick{" "}
            <strong>Create API key in new project</strong>.
          </li>
          <li>
            Copy the key that appears — it starts with <code className="rounded bg-card px-1 py-0.5 text-xs">AIza</code>.
          </li>
          <li>Paste it in the box above and press Save. Done — Leo now thinks with your key.</li>
        </ol>
      )}
    </div>
  );
}
