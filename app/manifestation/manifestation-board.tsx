"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gem,
  Plus,
  Trash2,
  ImagePlus,
  Sparkles,
  MoonStar,
  Quote,
  Eye,
  X,
  Loader2,
  Heart,
  ChevronDown,
  Upload,
  Target,
  ZoomIn,
} from "lucide-react";
import {
  addManifestation,
  deleteManifestation,
  startVisualization,
  saveVisionSession,
  uploadVisionImage,
  setVisionBoard,
  clearVisionBoard,
  clearGoalImage,
  type ManifestEntry,
  type ManifestKind,
  type ManifestationData,
  type VisionSession,
  type VisionFocus,
  type GoalImage,
  type MoodStory,
} from "@/lib/actions/manifestation";

const UPLOAD_ERROR = "Upload failed — use a JPG, PNG, WEBP or GIF under 8MB.";

const KINDS: { key: ManifestKind; label: string; grad: string; help: string }[] = [
  { key: "vision", label: "Vision", grad: "grad-blue", help: "A scene of the life you're building" },
  { key: "proof", label: "Proof", grad: "grad-emerald", help: "A real receipt you're already becoming it" },
  { key: "affirmation", label: "Affirmation", grad: "grad-teal", help: "A present-tense identity line you read back" },
];

const POSTER_GRADS = ["grad-blue", "grad-indigo", "grad-teal", "grad-emerald", "grad-sky", "grad-coral"];
const BODY_SPOTS = ["Chest", "Gut", "Shoulders", "Breath", "Hands", "Whole body"];

function kindGrad(kind: ManifestKind) {
  return KINDS.find((k) => k.key === kind)?.grad ?? "grad-blue";
}

function focusLabel(focus: VisionFocus) {
  return focus === "3yr"
    ? "3-year vision"
    : focus === "1yr"
      ? "1-year vision"
      : focus === "first_move"
        ? "tomorrow's first move"
        : "affirmation";
}

function prettyDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Fisher–Yates — fresh random order each call. Used to shuffle the "Why I'm
// doing this" cards on every page load so the user sees variety.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PAGE_SIZE = 6; // items shown before "Load more" in each collapsible section

export function ManifestationBoard({ data }: { data: ManifestationData }) {
  const [entries, setEntries] = useState<ManifestEntry[]>(data.entries);
  const [sessions, setSessions] = useState<VisionSession[]>(data.sessions);
  const [goalImages, setGoalImages] = useState<GoalImage[]>(data.goalImages);
  const [boardUrl, setBoardUrl] = useState<string | null>(data.visionBoardUrl);
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [goalBusy, setGoalBusy] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [moodDismissed, setMoodDismissed] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [goalId, setGoalId] = useState("");
  const [kind, setKind] = useState<ManifestKind>("vision");
  const [ritualOpen, setRitualOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [expandedKinds, setExpandedKinds] = useState<Record<ManifestKind, boolean>>({
    vision: false,
    proof: false,
    affirmation: false,
  });
  // Random order fixed once per page load — reshuffles on refresh so the 6 shown
  // vary. Stored as ids so later image uploads still reflect (order stays put).
  const [whyOrder] = useState<string[]>(() => shuffle(data.goalImages.map((g) => g.goal_id)));
  const [, startTransition] = useTransition();

  const affirmations = entries.filter((e) => e.kind === "affirmation").map((e) => e.caption);

  // Lock page scroll + close on Escape while the zoom lightbox is open.
  useEffect(() => {
    if (!zoomOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomOpen]);

  const orderedGoalImages = whyOrder
    .map((id) => goalImages.find((g) => g.goal_id === id))
    .filter((g): g is GoalImage => !!g);
  const shownWhy = whyExpanded ? orderedGoalImages : orderedGoalImages.slice(0, PAGE_SIZE);

  async function onHeroFile(file: File | undefined) {
    if (!file) return;
    setHeroError(false);
    setHeroBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const url = await uploadVisionImage(fd);
    if (url) {
      setBoardUrl(url);
      await setVisionBoard(url);
    } else {
      setHeroError(true);
    }
    setHeroBusy(false);
  }

  async function onGoalFile(goal: GoalImage, file: File | undefined) {
    if (!file) return;
    setGoalBusy(goal.goal_id);
    setGoalError(null);
    const fd = new FormData();
    fd.append("file", file);
    const url = await uploadVisionImage(fd);
    if (url) {
      await addManifestation({ caption: goal.content, image_url: url, kind: "vision", goal_id: goal.goal_id });
      setGoalImages((prev) => prev.map((g) => (g.goal_id === goal.goal_id ? { ...g, image_url: url } : g)));
    } else {
      setGoalError(goal.goal_id);
    }
    setGoalBusy(null);
  }

  async function removeGoalImage(goal: GoalImage) {
    if (!goal.image_url) return;
    setGoalBusy(goal.goal_id);
    await clearGoalImage(goal.goal_id);
    const removedUrl = goal.image_url;
    setGoalImages((prev) => prev.map((g) => (g.goal_id === goal.goal_id ? { ...g, image_url: null } : g)));
    setEntries((prev) => prev.filter((e) => !(e.goal_id === goal.goal_id && e.image_url === removedUrl)));
    setGoalBusy(null);
  }

  async function onComposerFile(file: File | undefined) {
    if (!file) return;
    setUploadBusy(true);
    setUploadError(false);
    const fd = new FormData();
    fd.append("file", file);
    const url = await uploadVisionImage(fd);
    if (url) setImageUrl(url);
    else setUploadError(true);
    setUploadBusy(false);
  }

  async function removeVisionBoard() {
    setHeroBusy(true);
    await clearVisionBoard();
    setBoardUrl(null);
    setHeroBusy(false);
  }

  function add() {
    const text = caption.trim();
    if (!text) return;
    const gid = goalId || null;
    setCaption("");
    setImageUrl("");
    setGoalId("");
    const temp: ManifestEntry = {
      id: `temp-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      kind,
      caption: text,
      image_url: imageUrl.trim() || null,
      goal_id: gid,
      created_at: new Date().toISOString(),
    };
    setEntries((e) => [temp, ...e]);
    if (gid && temp.image_url) {
      setGoalImages((prev) => prev.map((g) => (g.goal_id === gid ? { ...g, image_url: temp.image_url } : g)));
    }
    startTransition(async () => {
      const real = await addManifestation({ caption: text, image_url: imageUrl, kind, goal_id: gid });
      if (real) setEntries((e) => e.map((x) => (x.id === temp.id ? real : x)));
    });
  }

  function remove(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    startTransition(() => {
      deleteManifestation(id);
    });
  }

  const activeKind = KINDS.find((k) => k.key === kind)!;
  const moodStory = data.moodStory;

  return (
    <div className="space-y-3.5 lg:space-y-5">
      {/* Vision hero */}
      <header className="card-tint tint-blue corner-cut relative overflow-hidden p-4 lg:p-6">
        <div className="relative flex items-center gap-3 lg:gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl grad-blue text-white shadow-md lg:size-12">
            <Gem className="size-5 lg:size-6" />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold lg:text-2xl">Manifestation</h1>
            <p className="hidden max-w-xl text-sm text-muted-foreground lg:block">
              See it before you live it. Step into the future you&apos;re building until it feels
              inevitable — then act like the person who already lives there.
            </p>
            <p className="text-xs text-muted-foreground lg:hidden">
              See it before you live it — then act like it.
            </p>
          </div>
        </div>

        {/* Guided ritual CTA — the thing that actually does manifesting */}
        <button
          onClick={() => setRitualOpen(true)}
          className="relative mt-3.5 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-card/70 p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5 lg:mt-5 lg:gap-4 lg:p-4"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl grad-blue text-white shadow-md">
            <Eye className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Enter the vision</span>
            <span className="block text-xs text-muted-foreground">
              Leo walks you through it — picture it, feel where it lands in your body, log how real it felt.
            </span>
          </span>
          <Sparkles className="size-4 shrink-0 text-primary" />
        </button>
      </header>

      {/* Composer — pinned to the top so adding to the board is the first thing after the hero */}
      <section className="card-tint tint-blue corner-cut space-y-3 p-4 lg:p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <ImagePlus className="size-4 text-primary" /> Add to your board
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                kind === k.key ? `${k.grad} text-white shadow-sm` : "bg-muted text-muted-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{activeKind.help}.</p>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Caption it in present tense — e.g. I run my own studio and it's thriving"
          className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
        />
        {goalImages.length > 0 && (
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
          >
            <option value="">Tag a goal (optional)…</option>
            {goalImages.map((g) => (
              <option key={g.goal_id} value={g.goal_id}>
                {g.content}
              </option>
            ))}
          </select>
        )}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="preview" className="max-h-40 w-full rounded-2xl object-cover" />
        )}
        {showImage && (
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Paste an image URL"
            className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              {uploadBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onComposerFile(e.target.files?.[0])}
              />
            </label>
            <button
              onClick={() => setShowImage((v) => !v)}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showImage ? "Hide link" : "or paste link"}
            </button>
            {imageUrl && !showImage && (
              <button
                onClick={() => setImageUrl("")}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                Remove image
              </button>
            )}
          </div>
          {uploadError && <p className="text-xs text-destructive">{UPLOAD_ERROR}</p>}
          <button
            onClick={add}
            disabled={!caption.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl grad-blue px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Plus className="size-4" /> Pin it
          </button>
        </div>
      </section>

      {/* Vision-board hero image — the one board the user already made */}
      <section className="space-y-3">
        {boardUrl ? (
          <>
            {/* Premium plaque title — flanked rules, centred, feels like a framed piece */}
            <div className="flex items-center justify-center gap-2.5">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/50 sm:w-12" />
              <Gem className="size-4 text-primary" />
              <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">The life I&apos;m building</h2>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/50 sm:w-12" />
            </div>
            {/* Container hugs the image (w-fit) — no odd letterbox gaps. Gradient mat = premium frame. */}
            <div className="mx-auto w-fit max-w-full">
              <div className="card-elevated relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-primary/10 p-2 shadow-2xl ring-1 ring-primary/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={boardUrl}
                  alt="Your vision board"
                  onClick={() => setZoomOpen(true)}
                  className="block h-auto max-h-[26rem] w-auto max-w-full cursor-zoom-in rounded-2xl object-contain"
                />
                <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  <ZoomIn className="size-3.5" /> Tap to enlarge
                </span>
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button
                    onClick={removeVisionBoard}
                    disabled={heroBusy}
                    aria-label="Remove vision board image"
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-destructive/80 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/70">
                    {heroBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onHeroFile(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : (
          <label className="card-tint tint-blue corner-cut flex cursor-pointer flex-col items-center justify-center gap-2 p-10 text-center transition-transform hover:-translate-y-0.5">
            <span className="grid size-12 place-items-center rounded-2xl grad-blue text-white shadow-md">
              {heroBusy ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
            </span>
            <span className="text-sm font-semibold">Upload your vision board</span>
            <span className="text-xs text-muted-foreground">
              The image you made — put it here so you see the whole life every time you open this.
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onHeroFile(e.target.files?.[0])}
            />
          </label>
        )}
        {heroError && (
          <p className="text-xs text-destructive">Upload failed. Try again, or add an image link below.</p>
        )}
      </section>

      {/* Why I'm doing this — each goal with the picture that reminds you what it's for */}
      {goalImages.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Target className="size-4 text-primary" /> Why I&apos;m doing this
            </h2>
            <p className="text-sm text-muted-foreground">
              Put a picture to each goal — the packed stadium, the six-pack, the office — so you never
              forget what you&apos;re building toward.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shownWhy.map((g) => (
              <div key={g.goal_id} className="card-elevated group relative overflow-hidden">
                {g.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image_url} alt={g.content} className="h-40 w-full object-cover" loading="lazy" />
                    <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <label className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70">
                        {goalBusy === g.goal_id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onGoalFile(g, e.target.files?.[0])}
                        />
                      </label>
                      <button
                        onClick={() => removeGoalImage(g)}
                        disabled={goalBusy === g.goal_id}
                        aria-label="Remove image"
                        className="inline-flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-destructive/80 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 bg-muted/40 text-center transition-colors hover:bg-muted/60">
                    {goalBusy === g.goal_id ? (
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="size-6 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">Add a picture of this</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onGoalFile(g, e.target.files?.[0])}
                    />
                  </label>
                )}
                <div className="p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.level === "three_year" ? "3-year goal" : "This year"}
                  </p>
                  <p className="mt-0.5 text-sm font-medium leading-snug">{g.content}</p>
                  {goalError === g.goal_id && <p className="mt-1 text-[11px] text-destructive">{UPLOAD_ERROR}</p>}
                </div>
              </div>
            ))}
          </div>
          {!whyExpanded && orderedGoalImages.length > PAGE_SIZE && (
            <button
              onClick={() => setWhyExpanded(true)}
              className="mx-auto flex items-center gap-1.5 rounded-full border border-primary/30 bg-card px-5 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10"
            >
              <ChevronDown className="size-4" /> Load more ({orderedGoalImages.length - PAGE_SIZE})
            </button>
          )}
        </section>
      )}

      {/* Auto mood-matched real person — only surfaces when today's logged mood is low. */}
      {moodStory && !moodDismissed && (
        <MoodStoryCard story={moodStory} onDismiss={() => setMoodDismissed(true)} />
      )}

      {/* Felt-sense log — the record that it's starting to feel real */}
      {sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Heart className="size-4 text-primary" /> How real it&apos;s feeling
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <div key={s.id} className="card-tint tint-blue corner-cut p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {focusLabel(s.focus)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{prettyDate(s.date)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full grad-blue" style={{ width: `${s.vividness * 10}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-primary">{s.vividness}/10</span>
                </div>
                {(s.body_location || s.felt_note) && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {s.body_location && <span className="font-medium text-foreground">{s.body_location}. </span>}
                    {s.felt_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Board feed — one titled section per kind, so visions, proof and
          affirmations each get their own room instead of one mixed pile */}
      {entries.length === 0 ? (
        <div className="card-surface rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Your board is empty. Pin the first image or affirmation of the life you&apos;re building.
          </p>
        </div>
      ) : (
        KINDS.map((k) => {
          const kindEntries = entries.filter((e) => e.kind === k.key);
          if (kindEntries.length === 0) return null;
          const expanded = expandedKinds[k.key];
          const shown = expanded ? kindEntries : kindEntries.slice(0, PAGE_SIZE);
          return (
            <section key={k.key} className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span className={`inline-block size-2.5 rounded-full ${k.grad}`} />
                  {k.label}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {kindEntries.length}
                  </span>
                </h2>
                <p className="hidden text-xs text-muted-foreground sm:block">{k.help}.</p>
              </div>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
                <AnimatePresence initial={false}>
                  {shown.map((e, i) => (
                    <motion.div
                      key={e.id}
                      id={`m-${e.id}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="group card-elevated relative break-inside-avoid overflow-hidden scroll-mt-24"
                    >
                      {e.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.image_url} alt={e.caption} className="w-full object-cover" loading="lazy" />
                      ) : (
                        <div className={`flex min-h-32 items-center justify-center p-6 ${POSTER_GRADS[i % POSTER_GRADS.length]}`}>
                          <Quote className="absolute left-3 top-3 size-5 text-white/50" />
                          <p className="text-center font-display text-lg font-semibold leading-snug text-white">
                            {e.caption}
                          </p>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 p-4">
                        <div className="min-w-0">
                          {e.image_url && <p className="text-sm font-medium leading-snug">{e.caption}</p>}
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <span className={`inline-block size-2 rounded-full ${kindGrad(e.kind)}`} />
                            {e.kind} · {prettyDate(e.date)}
                          </p>
                        </div>
                        <button
                          onClick={() => remove(e.id)}
                          aria-label="Remove"
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {!expanded && kindEntries.length > PAGE_SIZE && (
                <button
                  onClick={() => setExpandedKinds((prev) => ({ ...prev, [k.key]: true }))}
                  className="mx-auto flex items-center gap-1.5 rounded-full border border-primary/30 bg-card px-5 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10"
                >
                  <ChevronDown className="size-4" /> Load more ({kindEntries.length - PAGE_SIZE})
                </button>
              )}
            </section>
          );
        })
      )}

      {/* Nightly AI visualizations */}
      {data.nightly.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <MoonStar className="size-4 text-primary" /> Nightly visualizations
          </h2>
          <p className="text-sm text-muted-foreground">
            The guided first-move visualizations Leo wrote you each evening.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.nightly.map((n) => (
              <div key={n.date} className="card-tint tint-blue corner-cut p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(n.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {n.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full-screen zoom of the vision board — tap anywhere / X to close */}
      <AnimatePresence>
        {zoomOpen && boardUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <button
              onClick={() => setZoomOpen(false)}
              aria-label="Close"
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur transition-colors hover:text-white"
            >
              <X className="size-[18px]" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              src={boardUrl}
              alt="Your vision board"
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ritualOpen && (
          <VisionRitual
            vision={data.vision}
            affirmations={affirmations}
            onClose={() => setRitualOpen(false)}
            onSaved={(s) => setSessions((prev) => [s, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Auto-surfaced when today's logged mood is low: a real person who got through
// the same feeling. Dismissable — a quiet nudge, never a lecture that traps you.
function MoodStoryCard({ story, onDismiss }: { story: MoodStory; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-tint tint-blue corner-cut relative overflow-hidden p-5"
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="relative space-y-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" /> Because you&apos;re feeling{" "}
          <span className="lowercase">{story.moodLabel}</span> — someone who&apos;s been there
        </p>
        <p className="text-sm italic text-muted-foreground">&ldquo;{story.coachLine}&rdquo; — Leo</p>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-lg font-semibold">{story.name}</p>
            {story.field && <span className="shrink-0 text-xs text-muted-foreground">{story.field}</span>}
          </div>
          {story.headline && <p className="mt-1 text-sm font-medium text-primary">{story.headline}</p>}
          {story.body.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
          {story.lesson && (
            <p className="mt-3 border-t border-border/50 pt-3 text-sm font-medium">{story.lesson}</p>
          )}
          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {story.source === "leo" ? "Leo picked this for you" : "From your stories"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

type RitualFocus = { key: "3yr" | "1yr" | "affirmation"; label: string; text: string };

function VisionRitual({
  vision,
  affirmations,
  onClose,
  onSaved,
}: {
  vision: ManifestationData["vision"];
  affirmations: string[];
  onClose: () => void;
  onSaved: (s: VisionSession) => void;
}) {
  const focuses: RitualFocus[] = [];
  if (vision.three_year) focuses.push({ key: "3yr", label: "3-year vision", text: vision.three_year });
  if (vision.one_year) focuses.push({ key: "1yr", label: "1-year vision", text: vision.one_year });
  affirmations.slice(0, 4).forEach((a) => focuses.push({ key: "affirmation", label: a, text: a }));

  const [chosen, setChosen] = useState<RitualFocus | null>(focuses.length === 1 ? focuses[0] : null);
  const [script, setScript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [vividness, setVividness] = useState(6);
  const [spot, setSpot] = useState("");
  const [note, setNote] = useState("");
  const [saving, startSave] = useTransition();

  // Lock body scroll while the overlay is open; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function run(f: RitualFocus) {
    setChosen(f);
    setScript(null);
    setFailed(false);
    setLoading(true);
    try {
      const text = await startVisualization(f.key, f.text);
      if (text && text.trim()) setScript(text.trim());
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!chosen) return;
    startSave(async () => {
      const saved = await saveVisionSession({
        focus: chosen.key,
        vividness,
        body_location: spot,
        felt_note: note,
      });
      if (saved) onSaved(saved);
      onClose();
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grad-vision backdrop-blur-sm"
    >
      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-5 p-6">
          <button
            onClick={onClose}
            aria-label="Leave the vision"
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur transition-colors hover:text-white"
          >
            <X className="size-[18px]" />
          </button>

          <div className="flex items-center gap-2 text-white/70">
            <Eye className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Enter the vision</span>
          </div>

          {/* Step 1 — pick focus */}
          {!chosen && (
            <div className="space-y-3">
              <p className="font-display text-xl font-semibold text-white">What are you stepping into?</p>
              {focuses.length === 0 && (
                <p className="text-sm text-white/70">
                  Set your 3-year or 1-year vision first, or pin an affirmation to visualize.
                </p>
              )}
              {focuses.map((f, i) => (
                <button
                  key={`${f.key}-${i}`}
                  onClick={() => run(f)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-left text-white transition-colors hover:bg-white/20"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg grad-blue text-white">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs uppercase tracking-wide text-white/60">
                      {f.key === "affirmation" ? "Affirmation" : f.label}
                    </span>
                    <span className="line-clamp-2 text-sm">{f.text}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Leo's script */}
          {chosen && (
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-wide text-white/60">{focusLabel(chosen.key)}</p>

              {loading && (
                <div className="flex items-center gap-2 text-white/80">
                  <Loader2 className="size-4 animate-spin" /> Leo is guiding you in…
                </div>
              )}

              {failed && !loading && (
                <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-white/80">
                  <p className="text-sm">
                    Couldn&apos;t reach Leo. Read your vision back slowly on your own — then log how it felt.
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white">{chosen.text}</p>
                  <button
                    onClick={() => run(chosen)}
                    className="text-xs font-semibold text-white/70 underline hover:text-white"
                  >
                    Try again
                  </button>
                </div>
              )}

              {script && !loading && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="whitespace-pre-line text-[15px] leading-relaxed text-white"
                >
                  {script}
                </motion.p>
              )}

              {/* Step 3 — sensory capture */}
              {!loading && (
                <div className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-white">How real did that feel?</label>
                      <span className="text-sm font-semibold text-white">{vividness}/10</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={vividness}
                      onChange={(e) => setVividness(Number(e.target.value))}
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white">Where did you feel it?</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BODY_SPOTS.map((b) => (
                        <button
                          key={b}
                          onClick={() => setSpot((s) => (s === b ? "" : b))}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            spot === b ? "grad-blue text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="What did you notice? (optional)"
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
                  />
                  <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl grad-blue px-5 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
                    Log how it felt
                  </button>
                </div>
              )}

              {focuses.length > 1 && (
                <button
                  onClick={() => {
                    setChosen(null);
                    setScript(null);
                    setFailed(false);
                  }}
                  className="mx-auto flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white"
                >
                  <ChevronDown className="size-3.5 rotate-90" /> Pick something else
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
