"use client";

import { motion } from "motion/react";

/** Ilustrações em traço — desenhadas à mão em SVG, animam o traço ao entrar na tela. */
const ICONS: Record<"rings" | "heart", string[]> = {
  rings: [
    "M26 66a22 22 0 1 0 44 0a22 22 0 1 0 -44 0",
    "M50 66a22 22 0 1 0 44 0a22 22 0 1 0 -44 0",
    "M42 40l6-8l6 8l-6 4z",
    "M60 22v-8M50 25l-4-6M70 25l4-6",
  ],
  heart: ["M60 96C24 72 18 52 28 38c9-12 26-10 32 4c6-14 23-16 32-4c10 14 4 34-32 58z"],
};

export function LineArt({
  icon,
  className,
  strokeWidth = 1.6,
  delay = 0,
}: {
  icon: keyof typeof ICONS;
  className?: string;
  strokeWidth?: number;
  delay?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[icon].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{
            pathLength: { duration: 1.6, ease: [0.65, 0, 0.35, 1], delay: delay + i * 0.12 },
            opacity: { duration: 0.2, delay: delay + i * 0.12 },
          }}
        />
      ))}
    </svg>
  );
}
