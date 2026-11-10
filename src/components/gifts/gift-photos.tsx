"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PhotoSlot } from "@/components/photo-slot";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Fotos do presente: arrastar para o lado (celular) ou setas (computador).
 * Com uma foto só, vira uma imagem comum; sem fotos, o bloco "em breve".
 */
export function GiftPhotos({
  images,
  alt,
  sizes,
  className,
  zoomOnHover,
}: {
  images: string[];
  alt: string;
  sizes: string;
  className?: string;
  zoomOnHover?: boolean;
}) {
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const total = images.length;

  if (!total) return <PhotoSlot className={cn("w-full", className)} alt={alt} />;

  const go = (d: number) => setState(([i]) => [(((i + d) % total) + total) % total, d]);

  return (
    <div className={cn("group/photos relative overflow-hidden bg-mist", className)}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={index}
          custom={dir}
          className="absolute inset-0 touch-pan-y"
          variants={{
            enter: (d: number) => ({ x: d === 0 ? 0 : `${d * 100}%` }),
            center: { x: "0%" },
            exit: (d: number) => ({ x: d === 0 ? 0 : `${d * -100}%` }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease }}
          drag={total > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -40) go(1);
            else if (info.offset.x > 40) go(-1);
          }}
        >
          <Image
            src={images[index]}
            alt={total > 1 ? `${alt} — foto ${index + 1} de ${total}` : alt}
            fill
            sizes={sizes}
            draggable={false}
            className={cn(
              "pointer-events-none select-none object-cover",
              zoomOnHover && "transition-transform duration-[1.2s] ease-[var(--ease-soft)] group-hover/photos:scale-105",
            )}
          />
        </motion.div>
      </AnimatePresence>

      {total > 1 && (
        <>
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(d);
              }}
              aria-label={d < 0 ? "Foto anterior" : "Próxima foto"}
              className={cn(
                "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-paper/85 text-primary shadow-sm backdrop-blur transition",
                "opacity-100 md:opacity-0 md:group-hover/photos:opacity-100",
                d < 0 ? "left-2" : "right-2",
              )}
            >
              <svg viewBox="0 0 16 16" className={cn("size-3.5", d < 0 && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M5 2l6 6l-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setState(([cur]) => [i, i > cur ? 1 : -1]);
                }}
                aria-label={`Foto ${i + 1}`}
                className={cn("h-1.5 rounded-full shadow-sm transition-all", i === index ? "w-4 bg-paper" : "w-1.5 bg-paper/60")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
