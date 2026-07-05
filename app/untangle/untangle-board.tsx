"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  Check,
  Trash2,
  RotateCcw,
  CornerDownLeft,
  Loader2,
  MessagesSquare,
  SendHorizonal,
  CalendarDays,
} from "lucide-react";
import { CoachAvatar } from "@/components/coach-avatar";
import {
  dumpThought,
  resolveThought,
  deleteThought,
  discussThought,
  type Thought,
  type ChatMsg,
} from "@/lib/actions/thoughts";

function thoughtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function UntangleBoard({ initial }: { initial: Thought[] }) {
  const [thoughts, setThoughts] = useState<Thought[]>(initial);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const content = value.trim();
    if (!content || pending) return;
    setValue("");
    setPending(true);

    // Optimistic pending bubble
    const tempId = `temp-${Date.now()}`;
    const optimistic: Thought = {
      id: tempId,
      date: new Date().toISOString().slice(0, 10),
      kind: "confusion",
      content,
      ai_response: null,
      resolved: false,
      created_at: new Date().toISOString(),
    };
    setThoughts((prev) => [optimistic, ...prev]);

    try {
      const saved = await dumpThought(content, "confusion");
      setThoughts((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
    } catch {
      setThoughts((prev) => prev.filter((t) => t.id !== tempId));
      setValue(content);
    } finally {
      setPending(false);
      taRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function toggleResolve(t: Thought) {
    setThoughts((prev) => prev.map((x) => (x.id === t.id ? { ...x, resolved: !x.resolved } : x)));
    startTransition(() => {
      resolveThought(t.id, !t.resolved);
    });
  }

  function remove(t: Thought) {
    setThoughts((prev) => prev.filter((x) => x.id !== t.id));
    startTransition(() => {
      deleteThought(t.id);
    });
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Composer */}
      <div className="card-elevated p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <CoachAvatar mood="thinking" size={56} className="hidden shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
            <label htmlFor="dump" className="font-display text-lg font-semibold">
              What&apos;s tangling you up?
            </label>
            <p className="mb-3 text-sm text-muted-foreground">
              Dump it raw. The coach untangles it — reframe, one sharp question, one next move.
            </p>
            <textarea
              id="dump"
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              rows={4}
              placeholder="I keep telling myself I'll start, but I open the file and just… stall."
              className="w-full resize-none rounded-2xl border border-border bg-background/60 p-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘/Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                <span>to untangle</span>
              </span>
              <button
                onClick={submit}
                disabled={!value.trim() || pending}
                className="ml-auto inline-flex items-center gap-2 rounded-full grad-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {pending ? "Untangling…" : "Untangle"}
                {!pending && <CornerDownLeft className="hidden size-3.5 opacity-70 sm:block" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thread */}
      {thoughts.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 rounded-3xl p-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl grad-blue text-white shadow-lg">
            <Sparkles className="size-6" />
          </span>
          <p className="font-display text-lg font-semibold">Nothing tangled — yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When your head&apos;s noisy, drop it here. Every dump gets untangled and kept, so the patterns show up over time.
          </p>
        </div>
      ) : (
        <ul className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4">
          <AnimatePresence initial={false}>
            {thoughts.map((t) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className={`card-elevated break-inside-avoid overflow-hidden p-4 lg:p-5 ${t.resolved ? "opacity-65" : ""}`}
              >
                {/* When it was dumped */}
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <CalendarDays className="size-3" /> {thoughtDate(t.created_at)}
                </p>

                {/* Raw dump */}
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{t.content}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleResolve(t)}
                      title={t.resolved ? "Reopen" : "Mark resolved"}
                      className={`grid size-8 place-items-center rounded-full transition-colors ${
                        t.resolved
                          ? "bg-emerald/15 text-emerald hover:bg-emerald/25"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.resolved ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                    </button>
                    <button
                      onClick={() => remove(t)}
                      title="Delete"
                      className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Coach response */}
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-muted/50 p-3 lg:mt-4 lg:p-4">
                  <CoachAvatar mood={t.resolved ? "proud" : "thinking"} size={40} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    {t.ai_response ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{t.ai_response}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted-foreground/20" />
                        <div className="h-3 w-full animate-pulse rounded-full bg-muted-foreground/20" />
                        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Still confused / disagree? Talk it out — min 10 rounds with Leo */}
                {!t.resolved && t.ai_response && (
                  <ThoughtChat thought={t} onResolved={() => toggleResolve(t)} />
                )}

                {t.resolved && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald">
                    <Check className="size-3.5" /> Untangled
                  </p>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

const MIN_ROUNDS = 10;

/* Follow-up chat with Leo on one thought. Chat lives in component state only —
   the resolution (mark resolved) is what persists, not the transcript. */
function ThoughtChat({ thought, onResolved }: { thought: Thought; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const rounds = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking, open]);

  async function send() {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    const next: ChatMsg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setThinking(true);
    try {
      const reply = await discussThought(thought.id, next);
      setMessages([...next, { role: "coach", text: reply }]);
    } catch {
      setMessages(messages);
      setDraft(text);
    } finally {
      setThinking(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <MessagesSquare className="size-3.5" />
        Still confused or disagree? Talk it out with Leo
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.03] p-3 lg:p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <MessagesSquare className="size-3.5" /> Talking it out with Leo
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
            rounds >= MIN_ROUNDS ? "bg-emerald/15 text-emerald" : "bg-primary/10 text-primary"
          }`}
        >
          round {Math.min(rounds, MIN_ROUNDS)}/{MIN_ROUNDS}
        </span>
      </div>

      {messages.length === 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          Push back, ask why, or say what still doesn&apos;t sit right. Stay in it for at least{" "}
          {MIN_ROUNDS} rounds — that&apos;s usually where it actually clears.
        </p>
      )}

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md grad-blue px-3.5 py-2 text-sm leading-relaxed text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <CoachAvatar mood="thinking" size={28} className="mt-0.5 shrink-0" />
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted/70 px-3.5 py-2 text-sm leading-relaxed text-foreground/90">
                {m.text}
              </p>
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-start gap-2">
            <CoachAvatar mood="thinking" size={28} className="mt-0.5 shrink-0" />
            <div className="rounded-2xl rounded-bl-md bg-muted/70 px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Once past the minimum rounds, offer to close the loop */}
      {rounds >= MIN_ROUNDS && !thinking && (
        <button
          onClick={onResolved}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1.5 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/25"
        >
          <Check className="size-3.5" /> Clear now — mark untangled
        </button>
      )}

      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={rounds === 0 ? "What still doesn't make sense?" : "Keep going…"}
          className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || thinking}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-xl grad-blue text-white shadow-md transition-transform active:scale-90 disabled:opacity-50"
        >
          {thinking ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
        </button>
      </div>
    </div>
  );
}
