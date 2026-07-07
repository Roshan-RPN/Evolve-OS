"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessagesSquare, SendHorizonal } from "lucide-react";
import { CoachAvatar } from "@/components/coach-avatar";
import { askLeoFollowUp, type CoachChatMsg } from "@/lib/actions/coach";

const MAX_ROUNDS = 10;

/**
 * Reusable "keep asking Leo" thread. Drops under any Leo read (a vision take, a
 * month/week outlook, a day's schedule critique). `seed` is that first read;
 * `topic` names what it's about so Leo stays grounded. Up to 10 follow-up rounds.
 * State is local — nothing is persisted.
 */
export function LeoFollowup({ topic, seed }: { topic: string; seed: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoachChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [err, setErr] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const rounds = messages.filter((m) => m.role === "user").length;
  const maxed = rounds >= MAX_ROUNDS;

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking, open]);

  async function send() {
    const text = draft.trim();
    if (!text || thinking || maxed) return;
    setDraft("");
    setErr(false);
    const next: CoachChatMsg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setThinking(true);
    try {
      const reply = await askLeoFollowUp(topic, seed, next);
      setMessages([...next, { role: "coach", text: reply }]);
    } catch {
      setMessages(messages);
      setDraft(text);
      setErr(true);
    } finally {
      setThinking(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <MessagesSquare className="size-3.5" />
        Still have questions? Ask Leo a follow-up
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-primary/20 bg-primary/[0.03] p-3 lg:p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <MessagesSquare className="size-3.5" /> Follow up with Leo
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
            maxed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          round {Math.min(rounds, MAX_ROUNDS)}/{MAX_ROUNDS}
        </span>
      </div>

      {messages.length === 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          Push back, ask why, or dig into anything that doesn&apos;t sit right — up to {MAX_ROUNDS} rounds.
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

      {err && <p className="mt-1 text-[11px] text-muted-foreground">Leo couldn&apos;t reach through. Try again.</p>}

      {maxed ? (
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          That&apos;s 10 rounds — you&apos;ve wrung this one out. Act on it.
        </p>
      ) : (
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
            placeholder={rounds === 0 ? "Ask Leo anything about this…" : "Keep going…"}
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
      )}
    </div>
  );
}
