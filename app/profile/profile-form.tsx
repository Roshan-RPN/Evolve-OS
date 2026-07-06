"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Cpu, Eye, EyeOff, ExternalLink, HelpCircle, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAppUser, updateGeminiKey, updateGeminiModel } from "@/lib/actions/profile";
import { GEMINI_MODELS } from "@/lib/ai/models";

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
// Validate a Google AI Studio key by SHAPE, not prefix — Google ships several
// families (legacy "AIza…" = 39 chars, newer "AQ.Ab8…" ≈ 53) and adds more over
// time. All use only [A-Za-z0-9._-]. Gate on charset + length so every real key
// passes and only spaces / short / garbage pastes fail.
const GEMINI_KEY_RE = /^[A-Za-z0-9._-]{35,100}$/;

export function GeminiKeyForm({ hasKey }: { hasKey: boolean }) {
  const [key, setKey] = useState("");
  const [stored, setStored] = useState(hasKey);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = key.trim();
  const looksValid = GEMINI_KEY_RE.test(trimmed);

  function save(next: string) {
    setSaved(false);
    setError(null);
    // Empty = "remove my key" (allowed). Otherwise block a bad-shaped paste
    // before it ever hits the server, with a clear reason.
    const value = next.trim();
    if (value && !GEMINI_KEY_RE.test(value)) {
      setError("That doesn't look like a Google AI Studio key. Paste the whole key exactly as Google gave it, with no spaces before or after.");
      return;
    }
    startTransition(async () => {
      const res = await updateGeminiKey(value);
      if (res.ok) {
        setStored(Boolean(value));
        setKey("");
        setReveal(false);
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
        <div className="relative flex-1">
          <Input
            type={reveal ? "text" : "password"}
            value={key}
            // Strip stray spaces/newlines that often ride along on a copy-paste.
            onChange={(e) => { setKey(e.target.value.replace(/\s+/g, "")); setSaved(false); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && trimmed && !pending) save(key); }}
            placeholder={stored ? "Paste a new key to replace it" : "Paste your Google AI Studio key"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="pr-10 font-mono"
          />
          {key && (
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide key" : "Show key"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        <button
          onClick={() => save(key)}
          disabled={pending || !trimmed}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl grad-blue px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Save
        </button>
      </div>
      {/* Live shape hint while typing — green once it matches, so a bad paste is obvious before saving. */}
      {trimmed && !error && (
        looksValid ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald">
            <CheckCircle2 className="size-3.5" /> Looks like a valid key — press Save.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Keep going — paste the full key from Google AI Studio.
          </p>
        )
      )}
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
            Copy the <strong>whole</strong> key that appears — tap the copy button next to it so you
            grab all of it with no spaces. Google&apos;s keys come in a few shapes and any of them work.
          </li>
          <li>Paste it in the box above and press Save. Done — Leo now thinks with your key.</li>
        </ol>
      )}
    </div>
  );
}

/** Per-profile model pick — which Gemini model Leo thinks with. "" = app default. */
export function ModelForm({ current }: { current: string }) {
  const [model, setModel] = useState(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(next: string) {
    if (next === model) return;
    const prev = model;
    setModel(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateGeminiModel(next);
      if (res.ok) setSaved(true);
      else {
        setModel(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {GEMINI_MODELS.map((m) => {
          const active = model === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m.id)}
              disabled={pending}
              className={`rounded-2xl border p-3 text-left transition-all disabled:opacity-70 ${
                active
                  ? "border-primary/50 bg-primary/10 shadow-md ring-2 ring-primary/30"
                  : "border-border/60 bg-muted/40 hover:border-primary/50"
              }`}
            >
              <span className="flex items-center gap-1.5 font-display text-sm font-semibold">
                <Cpu className="size-3.5 text-primary" /> {m.label}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{m.blurb}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => pick("")}
        disabled={pending}
        className={`text-xs font-semibold transition-colors disabled:opacity-70 ${
          model === "" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {model === "" ? "✓ Using the app default model" : "Reset to app default"}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald">
          <CheckCircle2 className="size-4" /> Saved
        </p>
      )}
    </div>
  );
}
