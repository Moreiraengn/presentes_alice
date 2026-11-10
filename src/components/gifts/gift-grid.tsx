"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { LineArt } from "@/components/line-art";
import { GiftPhotos } from "./gift-photos";
import { createGiftOrder } from "@/lib/actions/public";
import type { PublicGift } from "@/lib/data";
import { brl, cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function GiftGrid({ gifts }: { gifts: PublicGift[] }) {
  const [selected, setSelected] = useState<PublicGift | null>(null);
  const [sort, setSort] = useState<"default" | "asc" | "desc">("default");

  const sorted = [...gifts].sort((a, b) =>
    sort === "asc" ? a.priceCents - b.priceCents : sort === "desc" ? b.priceCents - a.priceCents : 0,
  );

  if (!gifts.length) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg italic tracking-[0.06em] text-primary">Estamos escolhendo com carinho…</p>
        <p className="caps mt-4 text-[0.8rem]">A lista estará disponível em breve.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-16 md:mb-24">
        <div className="flex gap-5">
          {(
            [
              ["default", "Destaques"],
              ["asc", "Menor valor"],
              ["desc", "Maior valor"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={cn("eyebrow text-[0.55rem] tracking-[0.3em] transition-colors", sort === k ? "text-primary" : "text-faint hover:text-muted")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <motion.ul layout className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3 md:gap-x-[clamp(2rem,10vw,9rem)] md:gap-y-24">
        {sorted.map((g, i) => {
          const soldOut = g.remaining <= 0;
          return (
            <motion.li
              layout
              key={g.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease, delay: (i % 3) * 0.08 }}
              className="group flex flex-col text-center"
            >
              <div className="relative overflow-hidden">
                <GiftPhotos images={g.images} alt={g.title} sizes="(max-width: 768px) 50vw, 25vw" className="aspect-[254/357]" zoomOnHover />
                {soldOut && (
                  <span className="eyebrow absolute inset-x-0 bottom-0 bg-primary/90 py-2 text-[0.55rem] text-white">Presenteado</span>
                )}
              </div>
              <h3 className="caps mt-6 text-[0.82rem] leading-snug">{g.title}</h3>
              {g.description && <p className="mt-2 line-clamp-2 text-[0.85rem] italic text-faint">{g.description}</p>}
              <p className="mt-3 tracking-[0.08em] text-primary">{brl(g.priceCents)}</p>
              <div className="mt-auto pt-5">
                <button onClick={() => setSelected(g)} disabled={soldOut} className="btn btn-ghost w-full min-w-0 px-2 py-2.5">
                  {soldOut ? "Já presenteado" : "Presentear"}
                </button>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>

      <AnimatePresence>{selected && <GiftDialog gift={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </>
  );
}

function GiftDialog({ gift, onClose }: { gift: PublicGift; onClose: () => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"form" | "sent">("form");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await createGiftOrder({ giftId: gift.id, buyerName: name, message: message || undefined });
      if (!res.ok) return setError(res.error);
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
      else setState("sent");
    });

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-primary-night/50 backdrop-blur-sm md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
     
    >
      <motion.div
        role="dialog"
        aria-modal
        aria-label={`Presentear: ${gift.title}`}
        className="relative w-full max-w-md bg-paper p-8 md:p-10"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { duration: 0.6, ease } }}
        exit={{ y: 40, opacity: 0, transition: { duration: 0.3 } }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-5 top-5 text-2xl leading-none text-muted hover:text-ink" aria-label="Fechar">
          ×
        </button>

        {state === "form" ? (
          <>
            <p className="eyebrow text-accent">Presentear</p>
            {gift.images.length > 0 && (
              <GiftPhotos images={gift.images} alt={gift.title} sizes="420px" className="mt-6 aspect-[4/3] rounded-sm" />
            )}
            <h3 className="caps mt-6">{gift.title}</h3>
            <p className="mt-2 text-xl tracking-[0.08em] text-primary">{brl(gift.priceCents)}</p>

            <div className="mt-8 space-y-5">
              <input className="field" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <textarea
                className="field min-h-24 resize-none"
                placeholder="Deixe um recado para os noivos (opcional)"
                value={message}
                maxLength={600}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
            <button onClick={submit} disabled={pending || name.trim().length < 2} className="btn btn-solid mt-8 w-full">
              {pending ? "Abrindo o pagamento…" : "Ir para o pagamento"}
            </button>
            <p className="mt-4 text-center text-xs text-muted">Pagamento seguro via Mercado Pago · Pix ou cartão em até 12x</p>
          </>
        ) : (
          <div className="py-4 text-center">
            <LineArt icon="heart" strokeWidth={1.2} className="mx-auto h-20 w-20 text-line" />
            <h3 className="mt-6 font-serif text-[2rem] italic text-primary">Obrigado pelo carinho!</h3>
            <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
              Seu presente ficou registrado e os noivos vão receber o seu recado. 💙
            </p>
            <button onClick={onClose} className="btn btn-ghost mt-8 min-w-0 w-full">
              Voltar à lista
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
