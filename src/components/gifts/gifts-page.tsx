import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Reveal } from "@/components/reveal";
import { giftIllustration, listCopy } from "@/lib/config";
import { getGifts } from "@/lib/data";
import type { GiftList } from "@/lib/db/schema";
import { GiftGrid } from "./gift-grid";

async function List({ list }: { list: GiftList }) {
  const gifts = await getGifts(list);
  return <GiftGrid gifts={gifts} />;
}

function GridSkeleton() {
  return (
    <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-14 md:mt-24 md:grid-cols-3 md:gap-x-[clamp(2rem,10vw,9rem)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[254/357] animate-pulse bg-sand/60" />
      ))}
    </div>
  );
}

export function GiftsPage({ list }: { list: GiftList }) {
  const c = listCopy[list];
  return (
    <>
      <main className="bg-paper">
        <section className="px-6 pb-14 pt-16 md:pt-24">
          <h1 className="mx-auto flex max-w-3xl items-center justify-center gap-[clamp(1rem,4vw,2.6rem)] text-[clamp(0.95rem,1.5vw,1.1rem)] italic tracking-[0.08em] text-primary">
            <Reveal className="text-right" y={10}>
              {c.before}
            </Reveal>
            {/* ilustração animada opcional (config.ts → giftIllustration) */}
            {giftIllustration && (
              <Reveal delay={0.1} className="w-[clamp(110px,11vw,142px)] shrink-0">
                <video className="aspect-[720/660] w-full mix-blend-multiply" autoPlay muted playsInline poster={giftIllustration.poster} aria-hidden>
                  <source src={giftIllustration.webm} type="video/webm" />
                  <source src={giftIllustration.mp4} type="video/mp4" />
                </video>
              </Reveal>
            )}
            <Reveal delay={0.2} y={10}>
              {c.after}
            </Reveal>
          </h1>
        </section>

        <section className="mx-auto max-w-[1100px] px-5 pb-32 md:px-8">
          {/* linha com a ordenação logo abaixo, à esquerda */}
          <div className="border-t border-faint/70 pt-3">
            <Suspense fallback={<GridSkeleton />}>
              <List list={list} />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
