"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animated number that tweens from 0 → value on mount (GSAP).
 * Respects prefers-reduced-motion by rendering the final value immediately.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 1.1,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const format = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

      if (prefersReducedMotion()) {
        el.textContent = format(value);
        return;
      }

      const obj = { n: 0 };
      gsap.to(obj, {
        n: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = format(obj.n);
        },
      });
    },
    { dependencies: [value, decimals, prefix, suffix], scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {`${prefix}${value.toFixed(decimals)}${suffix}`}
    </span>
  );
}
