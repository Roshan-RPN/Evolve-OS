"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { COACH_NAME } from "@/lib/brand";

export { COACH_NAME };

export type CoachMood = "happy" | "pushing" | "calm" | "proud" | "thinking";

/**
 * Leo's real portrait lives at `public/coach/leo.webp`. If it ever fails to
 * load we fall back to the animated face so nothing looks broken.
 */
const COACH_IMAGE = "/coach/leo.webp";

const MOOD_COLORS: Record<CoachMood, [string, string]> = {
  happy: ["oklch(0.66 0.2 292)", "oklch(0.62 0.16 250)"],
  pushing: ["oklch(0.7 0.18 42)", "oklch(0.62 0.2 20)"],
  calm: ["oklch(0.72 0.13 195)", "oklch(0.62 0.16 250)"],
  proud: ["oklch(0.74 0.15 162)", "oklch(0.66 0.18 190)"],
  thinking: ["oklch(0.6 0.18 278)", "oklch(0.66 0.17 248)"],
};

export function CoachAvatar({
  mood = "happy",
  size = 96,
  className = "",
}: {
  mood?: CoachMood;
  size?: number;
  className?: string;
}) {
  const [c1, c2] = MOOD_COLORS[mood];
  const gid = `coach-${mood}`;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-label={COACH_NAME}>
      {/* aura */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${c1}, transparent 70%)` }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {!imgFailed ? (
        <motion.div
          className="relative overflow-hidden rounded-full ring-2 ring-white/50 shadow-lg"
          style={{ width: size, height: size }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src={COACH_IMAGE}
            alt={COACH_NAME}
            width={size}
            height={size}
            className="size-full object-cover"
            onError={() => setImgFailed(true)}
            unoptimized
            priority
          />
        </motion.div>
      ) : (
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        animate={{ y: [0, -4, 0], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 120 120" width={size} height={size}>
          <defs>
            <radialGradient id={gid} cx="38%" cy="32%" r="80%">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </radialGradient>
            <linearGradient id={`${gid}-hl`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.55" />
              <stop offset="45%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* headset ring — the "coach" cue */}
          <path
            d="M22 60 a38 38 0 0 1 76 0"
            fill="none"
            stroke={c1}
            strokeOpacity="0.5"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="20" cy="62" r="7" fill={c2} />
          <circle cx="100" cy="62" r="7" fill={c2} />

          {/* head */}
          <circle cx="60" cy="64" r="40" fill={`url(#${gid})`} />
          <ellipse cx="60" cy="50" rx="34" ry="26" fill={`url(#${gid}-hl)`} />

          {/* eyes */}
          <motion.g
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{ duration: 4.2, times: [0, 0.92, 0.95, 0.98, 1], repeat: Infinity }}
            style={{ transformOrigin: "60px 62px" }}
          >
            <Eyes mood={mood} />
          </motion.g>

          {/* mouth */}
          <Mouth mood={mood} />
        </svg>
      </motion.div>
      )}
    </div>
  );
}

function Eyes({ mood }: { mood: CoachMood }) {
  const cy = mood === "thinking" ? 56 : 60;
  const dx = mood === "thinking" ? 4 : 0;
  return (
    <>
      <g>
        <circle cx={46 + dx} cy={cy} r="8" fill="white" />
        <circle cx={47 + dx} cy={cy + 1} r="4" fill="oklch(0.25 0.03 270)" />
      </g>
      <g>
        <circle cx={74 + dx} cy={cy} r="8" fill="white" />
        <circle cx={75 + dx} cy={cy + 1} r="4" fill="oklch(0.25 0.03 270)" />
      </g>
      {mood === "pushing" && (
        <>
          <rect x="38" y="45" width="18" height="4" rx="2" fill="oklch(0.28 0.03 270)" transform="rotate(12 47 47)" />
          <rect x="64" y="45" width="18" height="4" rx="2" fill="oklch(0.28 0.03 270)" transform="rotate(-12 73 47)" />
        </>
      )}
    </>
  );
}

function Mouth({ mood }: { mood: CoachMood }) {
  const stroke = "oklch(0.22 0.03 270)";
  switch (mood) {
    case "proud":
      return <path d="M46 78 q14 16 28 0 q-14 8 -28 0" fill={stroke} />;
    case "pushing":
      return <path d="M48 80 h24" stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" />;
    case "calm":
      return <path d="M48 78 q12 6 24 0" stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" />;
    case "thinking":
      return <circle cx="60" cy="80" r="4" fill={stroke} />;
    default:
      return <path d="M47 77 q13 12 26 0" stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" />;
  }
}
