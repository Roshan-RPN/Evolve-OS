"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Entrance choreography — staggers direct children up + in on mount (GSAP).
 * Animates transforms/opacity only (gsap-performance rule). Reduced-motion safe.
 */
export function Reveal({
  children,
  className,
  stagger = 0.08,
  y = 16,
  duration = 0.6,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = Array.from(el.children) as HTMLElement[];
      if (targets.length === 0) return;

      if (prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
        return;
      }

      // Small screens scroll a tall single column — travel + long stagger reads as
      // the whole page lurching. Fade only, quick, near-simultaneous.
      const compact = window.matchMedia("(max-width: 1023px)").matches;

      gsap.from(targets, {
        opacity: 0,
        y: compact ? 0 : y,
        duration: compact ? 0.3 : duration,
        delay,
        ease: "power3.out",
        stagger: compact ? 0.03 : stagger,
        clearProps: "transform",
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
