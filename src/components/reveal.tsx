"use client";

import { motion, type HTMLMotionProps } from "motion/react";

export function Reveal({
  delay = 0,
  y = 28,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    />
  );
}

/** Texto que sobe letra por palavra — para títulos grandes */
export function SplitReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="-mt-[0.25em] inline-block overflow-hidden pb-[0.08em] pt-[0.25em] align-bottom" aria-hidden>
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: delay + i * 0.08 }}
          >
            {word}
            {i < text.split(" ").length - 1 && " "}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
