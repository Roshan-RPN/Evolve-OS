"use client";

import { useEffect, useRef } from "react";

/**
 * Rotating scroll-snap time picker — spin hour + minute like an iOS wheel.
 * 24-hour format throughout. Emits "HH:MM".
 */
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

const ITEM_H = 40; // px, must match .h-10

function parse(value: string) {
  const [hStr, mStr] = (value || "09:00").split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h)) h = 9;
  h = Math.max(0, Math.min(23, h));
  // snap minute to nearest 5
  const min = MINUTES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a), 0);
  return { hour: h, minute: min };
}

function build(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimeWheel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const cur = parse(value);

  return (
    <div className="relative flex items-stretch justify-center gap-1 rounded-2xl bg-muted/50 px-2 py-1.5">
      {/* center selection band */}
      <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-xl grad-blue opacity-15" style={{ height: ITEM_H }} />
      <Column
        items={HOURS.map((h) => ({ v: h, label: String(h).padStart(2, "0") }))}
        active={cur.hour}
        onPick={(h) => onChange(build(h, cur.minute))}
      />
      <span className="grid place-items-center px-0.5 text-lg font-bold text-muted-foreground">:</span>
      <Column
        items={MINUTES.map((m) => ({ v: m, label: String(m).padStart(2, "0") }))}
        active={cur.minute}
        onPick={(m) => onChange(build(cur.hour, m))}
      />
    </div>
  );
}

function Column<T extends string | number>({
  items,
  active,
  onPick,
}: {
  items: { v: T; label: string }[];
  active: T;
  onPick: (v: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // center the active value when it changes from outside
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.findIndex((it) => it.v === active);
    if (idx < 0) return;
    el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
  }, [active, items]);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const picked = items[clamped];
      if (picked && picked.v !== active) onPick(picked.v);
    }, 90);
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="no-scrollbar relative h-[120px] snap-y snap-mandatory overflow-y-auto"
      style={{ scrollPaddingTop: ITEM_H, scrollPaddingBottom: ITEM_H }}
    >
      {/* top + bottom spacers so first/last item can center */}
      <div style={{ height: ITEM_H }} />
      {items.map((it) => {
        const on = it.v === active;
        return (
          <button
            key={String(it.v)}
            type="button"
            onClick={() => onPick(it.v)}
            className={`flex h-10 w-11 snap-center items-center justify-center text-sm tabular-nums transition-all ${
              on ? "scale-110 font-bold text-primary" : "font-medium text-muted-foreground/70"
            }`}
          >
            {it.label}
          </button>
        );
      })}
      <div style={{ height: ITEM_H }} />
    </div>
  );
}
